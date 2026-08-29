/*
 役割: PWA用のサービスワーカー。アプリ本体（HTML/CSS/JS/アイコン）をオフラインでも
 開けるようキャッシュする。TODOデータ自体はlocalStorageに保存されており、
 このファイルとは無関係にオフラインでも読み書きできる。

 【注意】新しいJSファイルをindex.htmlに追加したときは、下のASSETSにも同じパスを
 追記すること（キャッシュに含まれないと更新後に404になる場合がある）。
 CACHE_NAMEのバージョン番号は、キャッシュの中身を入れ替えたいとき（ファイルを追加/削除したとき）
 に上げる。中身を変えずにバージョンだけ上げても更新はされない点に注意。
*/
var CACHE_NAME = 'todo-app-cache-v8';

var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/styles/base.css',
  './src/styles/layout.css',
  './src/styles/components.css',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js',
  './src/firebaseConfig.js',
  './src/sync/firebaseInit.js',
  './src/types/typedefs.js',
  './src/logic/id.js',
  './src/logic/dateUtils.js',
  './src/storage/keys.js',
  './src/storage/localStorageAdapter.js',
  './src/storage/storageAdapter.js',
  './src/store/state.js',
  './src/logic/historyLog.js',
  './src/store/historyStore.js',
  './src/logic/recurrence.js',
  './src/store/projectsStore.js',
  './src/store/todosStore.js',
  './src/store/templatesStore.js',
  './src/store/uiStore.js',
  './src/logic/progress.js',
  './src/logic/waitingStatus.js',
  './src/logic/smartLists.js',
  './src/logic/search.js',
  './src/render/common.js',
  './src/render/todoRow.js',
  './src/render/todoDetail.js',
  './src/render/quickAdd.js',
  './src/render/projectCard.js',
  './src/render/projectForm.js',
  './src/render/smartListView.js',
  './src/render/bulkActionBar.js',
  './src/render/dashboard.js',
  './src/render/templateManager.js',
  './src/render/archiveView.js',
  './src/render/searchOverlay.js',
  './src/render/appShell.js',
  './src/sync/authUI.js',
  './src/sync/cloudSync.js',
  './src/main.js',
  './src/pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// キャッシュ優先、なければネットワーク（オフラインでもアプリ本体は開けるようにする）
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});
