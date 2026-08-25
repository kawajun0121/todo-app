/*
 役割: Firebase SDK（CDN読み込み済み）の初期化。auth/dbをApp.Sync配下に公開する。
 依存: firebaseInit.jsより前にFirebaseのCDN<script>とsrc/firebaseConfig.jsが読み込まれていること。

 Firebase SDK自体の読み込みに失敗した場合（オフラインで初回アクセス等）でもアプリのJS全体が
 止まらないよう、try/catchで囲み、失敗時はApp.Sync.available=falseにしてmain.jsに知らせる。
*/
(function (App) {
  'use strict';
  App.Sync = App.Sync || {};

  try {
    var app = firebase.initializeApp(App.FirebaseConfig);
    App.Sync.auth = firebase.auth();
    App.Sync.db = firebase.firestore();
    App.Sync.db.enablePersistence({ synchronizeTabs: true }).catch(function () {
      // 複数タブを開いている等でオフラインキャッシュが有効化できなくても致命的ではないため無視する
    });
    App.Sync.available = true;
  } catch (e) {
    console.warn('Firebaseの初期化に失敗しました。同期機能なしで起動します。', e);
    App.Sync.available = false;
  }
})(window.TodoApp = window.TodoApp || {});
