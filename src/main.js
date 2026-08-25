/*
 役割: アプリの起動処理。ログイン状態に応じて「アプリ本体」と「ログイン画面」を切り替える。
 依存: すべてのstore/*.js, render/*.js, src/sync/*.js（index.htmlでこれより先に読み込まれている前提）

 起動の流れ:
 - Firebase(同期機能)が使える場合: ログイン状態を見て、未ログインならログイン画面を、
   ログイン済みならクラウドとの初回同期を待ってからアプリ本体を表示する。
 - Firebaseが使えない場合（SDK読み込み失敗等）: 同期なしでこれまで通りローカルのみで起動する
   （オフラインで初めて開いた時など、アプリ自体は使えなくならないようにするため）。
*/
(function (App) {
  'use strict';

  var mainAppInitialized = false;

  // 一度きりのセットアップ（購読・イベント委譲の設置）と、毎回の再描画を分けておく。
  // ログアウト→再ログインでbootMainAppが複数回呼ばれても、購読やリスナーが二重登録されないようにする。
  function bootMainApp() {
    if (!mainAppInitialized) {
      mainAppInitialized = true;
      App.Render.appShell.init();
      var rerender = function () { App.Render.appShell.renderAll(); };
      App.Store.projects.subscribe(rerender);
      App.Store.todos.subscribe(rerender);
      App.Store.templates.subscribe(rerender);
      App.Store.history.subscribe(rerender);
      App.Store.ui.subscribe(rerender);
    }
    App.Render.appShell.renderAll();
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
