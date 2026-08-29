/*
 役割: Firestoreとローカル(localStorage)の間でTODO/プロジェクト/テンプレート/履歴を同期する。
 依存: src/sync/firebaseInit.js, store/todosStore.js, store/projectsStore.js,
      store/templatesStore.js, store/historyStore.js

 【同期の考え方】
 - 各コレクション(todos/projects/templates/history)ごとに、Firestore上の1つのドキュメント
   （users/{uid}/data/{コレクション名}）に配列をまるごと保存する（1件=1ドキュメントにはしない）。
 - ローカルが変化したら、そのままFirestoreへ書き込む（各storeのsubscribeで変化を検知する）。
 - Firestoreが変化したら（＝別端末での変更）、ローカルの内容とid単位でマージしてから反映する。
   マージ規則:「同じidが両方にあれば更新日時が新しい方を採用。片方にしかなければそのまま残す」。
   これにより、同期を有効にする前からある端末側のデータが消えることはない。
 - 【削除の伝え方＝トゥームストーン】削除は配列からの除去ではなく deleted:true を付けるだけ
   （各store.remove()参照）。ここでは store.getAll({ includeDeleted: true }) で削除済み項目も
   含めて読み込み、削除フラグごとマージ・アップロードすることで、他端末にも「削除された」という
   事実そのものを伝搬させている（含めないと、削除した項目が復活する不具合になる。実際に
   一度発生したため、この対応を入れた）。画面上はどのstoreも通常のgetAll()で
   deleted:trueを除外するので、削除済み項目が表示されることはない。
   なお両端末でほぼ同時に同じ項目を編集した場合は、更新日時が新しい方（後から保存した方）で
   上書きされる。個人の1〜2台での利用を想定した簡易な同期のため、この制限は許容している。
 - 【書き込みの間引き】一括操作（複数選択して一括完了 等）や、完了時の繰り返しTODO自動生成のように、
   短時間に何度も連続してローカルの変更が起きる場面がある。素直に毎回Firestoreへ書き込むと、
   両端末を同時に開いているときにその都度もう片方の端末で再描画が走ってしまい動作が重く感じられる。
   そのため、ローカル変更のFirestore書き込みは少し（UPLOAD_DEBOUNCE_MS）待ってから行い、
   待っている間にさらに変更があれば1回にまとめて書き込む（scheduleUpload参照）。
   ローカルのlocalStorage保存自体（各storeのpersist()）は待たずに毎回即時に行われるため、
   この間引きによってローカルでの動作やデータの保存が遅れることはない。
*/
(function (App) {
  'use strict';
  App.Sync = App.Sync || {};

  var COLLECTIONS = [
    { name: 'todos', timeField: 'updatedAt' },
    { name: 'projects', timeField: 'updatedAt' },
    { name: 'templates', timeField: 'updatedAt' },
    { name: 'history', timeField: 'timestamp' }
  ];

  var unsubscribeFns = [];
  var uploadTimers = {};
  var UPLOAD_DEBOUNCE_MS = 400; // 短時間に連続する変更を1回のFirestore書き込みにまとめるまでの待ち時間

  // 指定コレクションのFirestore書き込みを少し遅らせて予約する。待っている間に同じコレクションで
  // 再度呼ばれたら前の予約は取り消して延長する（＝一番最後の状態だけを1回書き込む）。
  function scheduleUpload(name, docRef, items) {
    if (uploadTimers[name]) clearTimeout(uploadTimers[name]);
    uploadTimers[name] = setTimeout(function () {
      uploadTimers[name] = null;
      docRef.set({ items: items });
    }, UPLOAD_DEBOUNCE_MS);
  }

  function storeFor(name) {
    return { todos: App.Store.todos, projects: App.Store.projects, templates: App.Store.templates, history: App.Store.history }[name];
  }

  function mergeById(localItems, remoteItems, timeField) {
    var map = {};
    localItems.forEach(function (item) { map[item.id] = item; });
    remoteItems.forEach(function (remoteItem) {
      var localItem = map[remoteItem.id];
      if (!localItem || (remoteItem[timeField] || '') >= (localItem[timeField] || '')) {
        map[remoteItem.id] = remoteItem;
      }
    });
    return Object.keys(map).map(function (id) { return map[id]; });
  }

  function sameItems(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function start(onFirstSyncComplete) {
    stop(); // 二重起動防止（呼び出し前に必ず一度リセットする）

    var user = App.Sync.auth.currentUser;
    if (!user) return;
    var uid = user.uid;

    var pendingFirst = COLLECTIONS.length;
    var firstDone = false;

    function handleFirstSyncTick() {
      pendingFirst--;
      if (pendingFirst > 0 || firstDone) return;
      firstDone = true;
      App.Store.templates.seedDefaultsIfEmpty();
      if (typeof onFirstSyncComplete === 'function') onFirstSyncComplete();
    }

    COLLECTIONS.forEach(function (col) {
      var store = storeFor(col.name);
      var docRef = App.Sync.db.collection('users').doc(uid).collection('data').doc(col.name);
      var applyingRemote = false;
      var gotFirstSnapshot = false;

      var unsubSnapshot = docRef.onSnapshot(function (snap) {
        var data = snap.data();
        var remoteItems = (data && data.items) || [];
        var localItems = store.getAll({ includeArchived: true });
        var merged = mergeById(localItems, remoteItems, col.timeField);

        if (!sameItems(merged, localItems)) {
          applyingRemote = true;
          store.replaceAll(merged);
          applyingRemote = false;
        }
        if (!sameItems(merged, remoteItems)) {
          docRef.set({ items: merged });
        }

        if (!gotFirstSnapshot) {
          gotFirstSnapshot = true;
          handleFirstSyncTick();
        }
      }, function (err) {
        console.warn('同期エラー(' + col.name + ')', err);
        if (!gotFirstSnapshot) {
          gotFirstSnapshot = true;
          handleFirstSyncTick();
        }
      });

      var unsubLocal = store.subscribe(function (state) {
        if (applyingRemote) return;
        scheduleUpload(col.name, docRef, state.items);
      });

      unsubscribeFns.push(unsubSnapshot, unsubLocal);
    });
  }

  function stop() {
    unsubscribeFns.forEach(function (fn) {
      try { fn(); } catch (e) { /* 無視 */ }
    });
    unsubscribeFns = [];
    Object.keys(uploadTimers).forEach(function (name) {
      if (uploadTimers[name]) clearTimeout(uploadTimers[name]);
    });
    uploadTimers = {};
  }

  App.Sync.cloudSync = { start: start, stop: stop };
})(window.TodoApp = window.TodoApp || {});
