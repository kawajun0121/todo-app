// 役割: localStorageへの実際の読み書き。依存: なし。
(function (App) {
  'use strict';
  App.Storage = App.Storage || {};

  var localStorageAdapter = {
    load: function (key, defaultValue) {
      try {
        var raw = window.localStorage.getItem(key);
        if (raw === null) return defaultValue;
        return JSON.parse(raw);
      } catch (e) {
        console.warn('storage load failed for ' + key, e);
        return defaultValue;
      }
    },
    save: function (key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn('storage save failed for ' + key, e);
      }
    }
  };

  App.Storage.localStorageAdapter = localStorageAdapter;
})(window.TodoApp = window.TodoApp || {});
