/*
 役割: アプリの起動処理。ログイン状態に応じて「アプリ本体」と「ログイン画面」を切り替える。
 依存: すべてのstore/*.js, render/*.js, src/sync/*.js（index.htmlでこれより先に読み込まれている前提）

 起動の流れ:
 - Firebase(同期機能)が使える場合: ログイン状態を見て、未ログインならログイン画面を、
   ログイン済みならクラウドとの初回同期を待ってからアプリ本体を表示する。
 - Firebaseが使えない場合（SDK読み込み失敗等）: 同期なしでこれまで通りローカルのみで起動する
   （オフラインで初めて開いた時など、アプリ自体は使えなくならないようにするため）。

 【再描画のまとめ打ち】projects/todos/templates/history/uiの5つのストアを個別にsubscribeしており、
 1回のユーザー操作でも複数のストアがまとめて変化することが多い（例:
 TODOを1件完了する→todosストアの変化＋履歴記録でhistoryストアの変化、の2回）。
 素直に毎回renderAll()（画面全体の作り直し）を呼ぶと、1回の操作なのに何度も連続で
 全体を作り直すことになり、特にクラウド同期で他端末の変更を受け取った直後
 （複数のコレクションがほぼ同時に変化する）はもたつきの原因になっていた。
 そのため直接renderAll()を呼ばず、scheduleRender()経由で「次の描画タイミングで1回だけ」に
 まとめる（同じタスク内で何度呼ばれても1回分にしかならない）。
*/
(function (App) {
  'use strict';

  var mainAppInitialized = false;
  var renderScheduled = false;

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(function () {
      renderScheduled = false;
      App.Render.appShell.renderAll();
    });
  }

  // 一度きりのセットアップ（購読・イベント委譲の設置）と、毎回の再描画を分けておく。
  // ログアウト→再ログインでbootMainAppが複数回呼ばれても、購読やリスナーが二重登録されないようにする。
  function bootMainApp() {
    if (!mainAppInitialized) {
      mainAppInitialized = true;
      App.Render.appShell.init();
      App.Store.projects.subscribe(scheduleRender);
      App.Store.todos.subscribe(scheduleRender);
      App.Store.templates.subscribe(scheduleRender);
      App.Store.history.subscribe(scheduleRender);
      App.Store.ui.subscribe(scheduleRender);
    }
    App.Render.appShell.renderAll(); // 最初の1回は即座に描画する
  }

  function bootStandalone() {
    App.Store.templates.seedDefaultsIfEmpty();
    bootMainApp();
  }

  function boot() {
    if (!App.Sync || !App.Sync.available) {
      bootStandalone();
      return;
    }
    App.Sync.auth.onAuthStateChanged(function (user) {
      if (user) {
        // 初回同期（クラウドとローカルのマージ）が終わってからアプリ本体を表示する
        App.Sync.cloudSync.start(bootMainApp);
      } else {
        App.Sync.cloudSync.stop();
        App.Sync.authUI.render();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.TodoApp = window.TodoApp || {});
