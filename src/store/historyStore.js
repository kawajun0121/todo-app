/*
 役割: TODO/プロジェクトの変更履歴を自動記録する追記専用ログ。
 依存: store/state.js, storage/storageAdapter.js, storage/keys.js,
      logic/id.js, logic/dateUtils.js, logic/historyLog.js
*/
(function (App) {
  'use strict';
  App.Store = App.Store || {};

  var KEYS = App.Storage.KEYS;
  var adapter = App.Storage.adapter;
  var initial = adapter.load(KEYS.HISTORY, []);
  var store = App.Store.createStore({ items: initial });

  function persist() {
    adapter.save(KEYS.HISTORY, store.getState().items);
  }

  // entityType: 'todo' | 'project', action/ctx は logic/historyLog.js 参照
  function add(entityType, entityId, action, ctx) {
    var entry = {
      id: App.Logic.id.generateId(),
      entityType: entityType,
      entityId: entityId,
      timestamp: App.Logic.dateUtils.nowISO(),
      action: action,
      description: App.Logic.historyLog.buildDescription(action, ctx)
    };
    store.setState(function (s) {
      return { items: s.items.concat([entry]) };
    });
    persist();
    return entry;
  }

  function getForEntity(entityType, entityId) {
    return store.getState().items
      .filter(function (h) {
        return h.entityType === entityType && h.entityId === entityId;
      })
      .sort(function (a, b) {
        return a.timestamp < b.timestamp ? 1 : -1;
      });
  }

  App.Store.history = {
    add: add,
    getForEntity: getForEntity,
    getAll: function () { return store.getState().items; },
    subscribe: store.subscribe
  };
})(window.TodoApp = window.TodoApp || {});
