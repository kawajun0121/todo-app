/*
 役割: プロジェクトのCRUDと変更履歴の記録。
 依存: store/state.js, storage/storageAdapter.js, storage/keys.js,
      logic/id.js, logic/dateUtils.js, store/historyStore.js
*/
(function (App) {
  'use strict';
  App.Store = App.Store || {};

  var KEYS = App.Storage.KEYS;
  var adapter = App.Storage.adapter;
  var initial = adapter.load(KEYS.PROJECTS, []);
  var store = App.Store.createStore({ items: initial });

  function persist() {
    adapter.save(KEYS.PROJECTS, store.getState().items);
  }

  function getAll(opts) {
    opts = opts || {};
    var items = store.getState().items;
    if (!opts.includeArchived) {
      items = items.filter(function (p) { return !p.archived; });
    }
    return items;
  }

  function getById(id) {
    return store.getState().items.find(function (p) { return p.id === id; }) || null;
  }

  function create(partial) {
    var now = App.Logic.dateUtils.nowISO();
    var project = {
      id: App.Logic.id.generateId(),
      name: (partial && partial.name) || '新しいプロジェクト',
      category: (partial && partial.category) || '',
      deadline: (partial && partial.deadline) || null,
      status: (partial && partial.status) || 'active',
      memo: (partial && partial.memo) || '',
      order: (partial && partial.order !== undefined) ? partial.order : Date.now(), // ドラッグ並び替え用
      archived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now
    };
    store.setState(function (s) { return { items: s.items.concat([project]) }; });
    persist();
    App.Store.history.add('project', project.id, 'created', {});
    return project;
  }

  function update(id, patch) {
    var current = getById(id);
    if (!current) return null;
    var updated = Object.assign({}, current, patch, { updatedAt: App.Logic.dateUtils.nowISO() });

    store.setState(function (s) {
      return {
        items: s.items.map(function (p) { return p.id === id ? updated : p; })
      };
    });
    persist();
    logChanges(current, patch);
    return updated;
  }

  function logChanges(before, patch) {
    if ('status' in patch && patch.status !== before.status) {
      App.Store.history.add('project', before.id, 'project_status_changed', { oldValue: before.status, newValue: patch.status });
    }
    if ('deadline' in patch && patch.deadline !== before.deadline) {
      App.Store.history.add('project', before.id, 'due_changed', { newValue: patch.deadline });
    }
    if ('name' in patch && patch.name !== before.name) {
      App.Store.history.add('project', before.id, 'updated', { description: 'プロジェクト名を変更しました' });
    }
    if ('category' in patch && patch.category !== before.category) {
      App.Store.history.add('project', before.id, 'updated', { description: 'カテゴリを変更しました' });
    }
    if ('memo' in patch && patch.memo !== before.memo) {
      App.Store.history.add('project', before.id, 'updated', { description: 'メモを更新しました' });
    }
  }

  function archive(id) {
    var result = update(id, { archived: true, archivedAt: App.Logic.dateUtils.nowISO() });
    if (result) App.Store.history.add('project', id, 'archived', {});
    return result;
  }

  function restore(id) {
    var result = update(id, { archived: false, archivedAt: null });
    if (result) App.Store.history.add('project', id, 'restored', {});
    return result;
  }

  // アーカイブ済みのものだけ完全削除できる（誤操作防止）
  function remove(id) {
    var current = getById(id);
    if (!current || !current.archived) return false;
    store.setState(function (s) {
      return { items: s.items.filter(function (p) { return p.id !== id; }) };
    });
    persist();
    return true;
  }

  // ダッシュボード等でのドラッグ並び替え。orderedIdsの並び順どおりにorderを振り直す。履歴には記録しない。
  function reorderProjects(orderedIds) {
    var now = App.Logic.dateUtils.nowISO();
    var orderMap = {};
    orderedIds.forEach(function (id, index) { orderMap[id] = index; });
    store.setState(function (s) {
      return {
        items: s.items.map(function (p) {
          if (!(p.id in orderMap)) return p;
          return Object.assign({}, p, { order: orderMap[p.id], updatedAt: now });
        })
      };
    });
    persist();
  }

  App.Store.projects = {
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    archive: archive,
    restore: restore,
    remove: remove,
    reorderProjects: reorderProjects,
    subscribe: store.subscribe
  };
})(window.TodoApp = window.TodoApp || {});
