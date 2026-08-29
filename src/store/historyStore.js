/*
 役割: TODO/プロジェクトの変更履歴を自動記録する追記専用ログ。
 依存: store/state.js, storage/storageAdapter.js, storage/keys.js,
      logic/id.js, logic/dateUtils.js, logic/historyLog.js

 【件数の上限】ほぼ全ての操作で1件ずつ追記されるため、上限なく増やすと配列がどんどん大きくなり、
 クラウド同期のたびに（毎回全件書き込み方式のため）そのまま同期が重くなっていく。
 MAX_ENTRIES件を超えたら古いものから捨てる（trim参照）。履歴タブは直近の変更を確認する用途で、
 恒久的な監査ログとしては使っていないため、古い記録を捨てても実用上問題ない。
*/
(function (App) {
  'use strict';
  App.Store = App.Store || {};

  var KEYS = App.Storage.KEYS;
  var adapter = App.Storage.adapter;
  var MAX_ENTRIES = 500;
  var initial = trim(adapter.load(KEYS.HISTORY, []));
  var store = App.Store.createStore({ items: initial });

  function trim(items) {
    if (items.length <= MAX_ENTRIES) return items;
    return items.slice()
      .sort(function (a, b) { return a.timestamp < b.timestamp ? 1 : -1; })
      .slice(0, MAX_ENTRIES);
  }

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
      return { items: trim(s.items.concat([entry])) };
    });
    persist();
    return entry;
  }

  // クラウド同期がリモートとマージした結果をまるごと反映する時に使う。
  function replaceAll(items) {
    store.setState({ items: trim(items) });
    persist();
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
    replaceAll: replaceAll,
    subscribe: store.subscribe
  };
})(window.TodoApp = window.TodoApp || {});
