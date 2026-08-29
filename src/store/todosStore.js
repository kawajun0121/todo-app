/*
 役割: TODOのCRUD、サブタスク、一括操作、完了時の繰り返し生成、変更履歴の記録。
 依存: store/state.js, storage/storageAdapter.js, storage/keys.js,
      logic/id.js, logic/dateUtils.js, logic/recurrence.js, store/historyStore.js
*/
(function (App) {
  'use strict';
  App.Store = App.Store || {};

  var KEYS = App.Storage.KEYS;
  var adapter = App.Storage.adapter;
  var initial = adapter.load(KEYS.TODOS, []);
  var store = App.Store.createStore({ items: initial });

  function persist() {
    adapter.save(KEYS.TODOS, store.getState().items);
  }

  function getAll(opts) {
    opts = opts || {};
    var items = store.getState().items;
    if (!opts.includeArchived) {
      items = items.filter(function (t) { return !t.archived; });
    }
    if (!opts.includeDeleted) {
      items = items.filter(function (t) { return !t.deleted; });
    }
    return items;
  }

  function getById(id) {
    return store.getState().items.find(function (t) { return t.id === id; }) || null;
  }

  function getByProject(projectId, opts) {
    return getAll(opts).filter(function (t) { return t.projectId === projectId; });
  }

  function create(partial) {
    partial = partial || {};
    var now = App.Logic.dateUtils.nowISO();
    var todo = {
      id: App.Logic.id.generateId(),
      title: partial.title || '無題のタスク',
      projectId: partial.projectId || null,
      importance: partial.importance || 'medium',
      startDate: partial.startDate || null,
      dueDate: partial.dueDate || null,
      status: partial.status || 'not_started',
      memo: partial.memo || '',
      isDelegated: !!partial.isDelegated,
      delegateTo: partial.delegateTo || '',
      delegatedAt: partial.delegatedAt || null,
      waitingDeadline: partial.waitingDeadline || null,
      reminderAt: partial.reminderAt || null,
      recurrence: partial.recurrence || null,
      recurrenceParentId: partial.recurrenceParentId || null,
      subtasks: partial.subtasks || [],
      order: partial.order !== undefined ? partial.order : Date.now(), // Inbox/プロジェクト内でのドラッグ並び替え用
      archived: false,
      archivedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now
    };
    store.setState(function (s) { return { items: s.items.concat([todo]) }; });
    persist();
    App.Store.history.add('todo', todo.id, 'created', {});
    return todo;
  }

  function applyUpdate(id, updated) {
    store.setState(function (s) {
      return { items: s.items.map(function (t) { return t.id === id ? updated : t; }) };
    });
    persist();
  }

  function update(id, patch) {
    var current = getById(id);
    if (!current) return null;
    var updated = Object.assign({}, current, patch, { updatedAt: App.Logic.dateUtils.nowISO() });
    applyUpdate(id, updated);
    logChanges(current, patch);
    return updated;
  }

  function logChanges(before, patch) {
    var h = App.Store.history;
    if ('status' in patch && patch.status !== before.status) {
      h.add('todo', before.id, 'status_changed', { oldValue: before.status, newValue: patch.status });
    }
    if ('dueDate' in patch && patch.dueDate !== before.dueDate) {
      h.add('todo', before.id, 'due_changed', { newValue: patch.dueDate });
    }
    if ('startDate' in patch && patch.startDate !== before.startDate) {
      h.add('todo', before.id, 'start_changed', { newValue: patch.startDate });
    }
    if ('waitingDeadline' in patch && patch.waitingDeadline !== before.waitingDeadline) {
      h.add('todo', before.id, 'waiting_deadline_changed', { newValue: patch.waitingDeadline });
    }
    if ('projectId' in patch && patch.projectId !== before.projectId) {
      var proj = patch.projectId ? App.Store.projects.getById(patch.projectId) : null;
      h.add('todo', before.id, 'project_changed', { newValue: proj ? proj.name : null });
    }
    if ('importance' in patch && patch.importance !== before.importance) {
      h.add('todo', before.id, 'importance_changed', { oldValue: before.importance, newValue: patch.importance });
    }
    if ('isDelegated' in patch && patch.isDelegated !== before.isDelegated) {
      h.add('todo', before.id, 'delegated_changed', { newValue: patch.isDelegated });
    }
  }

  // 完了。繰り返し設定があれば次回分を自動生成する。
  function complete(id) {
    var current = getById(id);
    if (!current) return null;
    var updated = Object.assign({}, current, {
      status: 'completed',
      completedAt: App.Logic.dateUtils.nowISO(),
      updatedAt: App.Logic.dateUtils.nowISO()
    });
    applyUpdate(id, updated);
    App.Store.history.add('todo', id, 'completed', {});

    if (current.recurrence) {
      var nextData = App.Logic.recurrence.buildNextOccurrence(current);
      if (nextData) {
        var nextTodo = create(nextData);
        App.Store.history.add('todo', id, 'recurrence_generated', { newValue: nextTodo.dueDate });
      }
    }
    return updated;
  }

  function reopen(id) {
    return update(id, { status: 'not_started', completedAt: null });
  }

  function archive(id) {
    var result = update(id, { archived: true, archivedAt: App.Logic.dateUtils.nowISO() });
    if (result) App.Store.history.add('todo', id, 'archived', {});
    return result;
  }

  function restore(id) {
    var result = update(id, { archived: false, archivedAt: null });
    if (result) App.Store.history.add('todo', id, 'restored', {});
    return result;
  }

  // 完全に削除する。アーカイブ経由（archiveView）でも、行のゴミ箱アイコンからの
  // 1クリック削除（todoRow）でも、どちらからでも呼べるようアーカイブ状態は問わない。
  //
  // 【重要】配列から取り除くのではなく deleted:true の目印（トゥームストーン）を付けるだけにしている。
  // 完全に取り除いてしまうと、他端末と同期した時に「削除された」のか「まだ向こうで作られていない」のか
  // 区別できず、マージ処理が復活させてしまう（実際に他端末で削除したはずのTODOが復活する不具合が起きた）。
  // deleted:trueのTODOはgetAll()で自動的に除外されるので、画面上は削除と同じに見える。
  function remove(id) {
    var current = getById(id);
    if (!current) return false;
    update(id, { deleted: true, deletedAt: App.Logic.dateUtils.nowISO() });
    return true;
  }

  function bulkUpdate(ids, patch) {
    ids.forEach(function (id) { update(id, patch); });
  }

  function bulkArchive(ids) {
    ids.forEach(function (id) { archive(id); });
  }

  // クラウド同期がリモートとマージした結果をまるごと反映する時に使う。
  // 通常のcreate/updateと違い履歴には記録しない（マージ処理自体は「変更」ではないため）。
  function replaceAll(items) {
    store.setState({ items: items });
    persist();
  }

  // Inbox／プロジェクト内でのドラッグ並び替え。orderedIdsの並び順どおりにorderを振り直す。
  // 履歴には記録しない（並び替えは変更履歴として残す対象外）。1回のsetStateで反映するので再描画も1回で済む。
  function reorderTodos(orderedIds) {
    var now = App.Logic.dateUtils.nowISO();
    var orderMap = {};
    orderedIds.forEach(function (id, index) { orderMap[id] = index; });
    store.setState(function (s) {
      return {
        items: s.items.map(function (t) {
          if (!(t.id in orderMap)) return t;
          return Object.assign({}, t, { order: orderMap[t.id], updatedAt: now });
        })
      };
    });
    persist();
  }

  // --- サブタスク ---
  function addSubtask(todoId, title) {
    var current = getById(todoId);
    if (!current) return null;
    var subtasks = current.subtasks.concat([{ id: App.Logic.id.generateId(), title: title, done: false }]);
    return update(todoId, { subtasks: subtasks });
  }

  function toggleSubtask(todoId, subtaskId) {
    var current = getById(todoId);
    if (!current) return null;
    var subtasks = current.subtasks.map(function (st) {
      return st.id === subtaskId ? Object.assign({}, st, { done: !st.done }) : st;
    });
    return update(todoId, { subtasks: subtasks });
  }

  function removeSubtask(todoId, subtaskId) {
    var current = getById(todoId);
    if (!current) return null;
    var subtasks = current.subtasks.filter(function (st) { return st.id !== subtaskId; });
    return update(todoId, { subtasks: subtasks });
  }

  App.Store.todos = {
    getAll: getAll,
    getById: getById,
    getByProject: getByProject,
    create: create,
    update: update,
    complete: complete,
    reopen: reopen,
    archive: archive,
    restore: restore,
    remove: remove,
    bulkUpdate: bulkUpdate,
    bulkArchive: bulkArchive,
    replaceAll: replaceAll,
    reorderTodos: reorderTodos,
    addSubtask: addSubtask,
    toggleSubtask: toggleSubtask,
    removeSubtask: removeSubtask,
    subscribe: store.subscribe
  };
})(window.TodoApp = window.TodoApp || {});
