/*
 役割: アプリの起動処理。
 依存: すべてのstore/*.js, render/*.js（index.htmlでこれより先に読み込まれている前提）

 起動時にやること:
 1. 初回起動ならデフォルトのプロジェクトテンプレートを投入する
 2. 各ストアの変更を購読し、変化のたびに画面全体を再描画する
 3. #app にイベント委譲リスナーを設置する
 4. 最初の描画を行う
*/
(function (App) {
  'use strict';

  function boot() {
    App.Store.templates.seedDefaultsIfEmpty();

    App.Render.appShell.init();

    var rerender = function () { App.Render.appShell.renderAll(); };
    App.Store.projects.subscribe(rerender);
    App.Store.todos.subscribe(rerender);
    App.Store.templates.subscribe(rerender);
    App.Store.history.subscribe(rerender);
    App.Store.ui.subscribe(rerender);

    App.Render.appShell.renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.TodoApp = window.TodoApp || {});
