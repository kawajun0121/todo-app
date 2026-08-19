/*
 役割: データ永続化の唯一の窓口。
 依存: storage/localStorageAdapter.js
 将来クラウド同期・ログインに対応する際は、この App.Storage.adapter を
 差し替える（または条件分岐する）だけで済むようにしている。
*/
(function (App) {
  'use strict';
  App.Storage = App.Storage || {};

  // 今は localStorage 版のみ。将来 remoteAdapter.js 等を追加してここで切り替える。
  App.Storage.adapter = App.Storage.localStorageAdapter;
})(window.TodoApp = window.TodoApp || {});
