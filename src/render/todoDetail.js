/*
 役割: TODO詳細ドロワー（全項目編集・サブタスク・履歴タイムライン）。
 依存: render/common.js, store/todosStore.js, store/projectsStore.js, store/historyStore.js
 フォーム項目は data-field/data-entity/data-entity-id を付ければ appShell が自動保存する。
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  var c = App.Render.common;

  var FREQ_LABEL = { none: '繰り返しなし', daily: '毎日', weekly: '毎週', monthly: '毎月', yearly: '毎年' };

  function projectOptions(selectedId) {
    var options = '<option value="">Inbox（未割当）</option>';
    App.Store.projects.getAll().forEach(function (p) {
      options += '<option value="' + p.id + '" ' + (p.id === selectedId ? 'selected' : '') + '>' + c.escapeHtml(p.name) + '</option>';
    });
    return options;
  }

  function selectOptions(map, selected) {
    return Object.keys(map).map(function (key) {
      return '<option value="' + key + '" ' + (key === selected ? 'selected' : '') + '>' + map[key] + '</option>';
    }).join('');
  }

  function renderSubtasks(todo) {
    var rows = (todo.subtasks || []).map(function (st) {
      return (
        '<li class="subtask-row ' + (st.done ? 'subtask-done' : '') + '">' +
          '<input type="checkbox" data-action="subtask:toggle" data-id="' + todo.id + '" data-subtask-id="' + st.id + '" ' + (st.done ? 'checked' : '') + ' />' +
          '<span>' + c.escapeHtml(st.title) + '</span>' +
          '<button type="button" class="icon-btn" data-action="subtask:remove" data-id="' + todo.id + '" data-subtask-id="' + st.id + '" title="削除">×</button>' +
        '</li>'
      );
    }).join('');
    return (
      '<ul class="subtask-list">' + rows + '</ul>' +
      '<input type="text" class="subtask-add-input" placeholder="＋ サブタスクを追加してEnter" data-action-keydown="subtask:add" data-id="' + todo.id + '" />'
    );
  }

  function renderHistory(todo) {
    var entries = App.Store.history.getForEntity('todo', todo.id);
    if (entries.length === 0) return '<div class="empty-state-small">履歴はまだありません</div>';
    return '<ul class="history-list">' + entries.map(function (h) {
      var d = new Date(h.timestamp);
      var dateStr = (d.getMonth() + 1) + '/' + d.getDate();
      return '<li class="history-row"><span class="history-date">' + dateStr + '</span><span class="history-desc">' + c.escapeHtml(h.description) + '</span></li>';
    }).join('') + '</ul>';
  }

  function renderDelegateFields(todo) {
    if (!todo.isDelegated) return '';
    return (
      '<div class="field-grid">' +
        '<label>依頼先<input type="text" value="' + c.escapeHtml(todo.delegateTo) + '" data-field="delegateTo" data-entity="todo" data-entity-id="' + todo.id + '" placeholder="例: ○○工務店" /></label>' +
        '<label>依頼日<input type="date" value="' + (todo.delegatedAt || '') + '" data-field="delegatedAt" data-entity="todo" data-entity-id="' + todo.id + '" /></label>' +
        '<label>待機期限（回答希望日）<input type="date" value="' + (todo.waitingDeadline || '') + '" data-field="waitingDeadline" data-entity="todo" data-entity-id="' + todo.id + '" /></label>' +
      '</div>'
    );
  }

  function render(todo) {
    var recurrence = todo.recurrence || {};
    var freqValue = todo.recurrence ? todo.recurrence.freq : 'none';
    var archiveButton = todo.archived
      ? c.iconButton('todo:restore', todo.id, '♻ 復元', 'アーカイブから復元')
      : c.iconButton('todo:archive', todo.id, '🗄 アーカイブ', 'アーカイブする');
    var removeButton = todo.archived ? c.iconButton('todo:removeForever', todo.id, '🗑 完全に削除', '完全に削除（元に戻せません）') : '';

    return (
      '<div class="drawer-overlay" data-action="drawer:close"></div>' +
      '<div class="drawer">' +
        '<div class="drawer-header">' +
          '<input type="text" class="drawer-title-input" value="' + c.escapeHtml(todo.title) + '" data-field="title" data-entity="todo" data-entity-id="' + todo.id + '" />' +
          '<button type="button" class="icon-btn" data-action="drawer:close" title="閉じる">×</button>' +
        '</div>' +
        '<div class="drawer-body">' +
          '<div class="field-grid">' +
            '<label>プロジェクト<select data-field="projectId" data-entity="todo" data-entity-id="' + todo.id + '">' + projectOptions(todo.projectId) + '</select></label>' +
            '<label>重要度<select data-field="importance" data-entity="todo" data-entity-id="' + todo.id + '">' + selectOptions(c.IMPORTANCE_LABEL, todo.importance) + '</select></label>' +
            '<label>ステータス<select data-field="status" data-entity="todo" data-entity-id="' + todo.id + '">' + selectOptions(c.STATUS_LABEL, todo.status) + '</select></label>' +
          '</div>' +
          '<div class="field-grid">' +
            '<label>開始日<input type="date" value="' + (todo.startDate || '') + '" data-field="startDate" data-entity="todo" data-entity-id="' + todo.id + '" /></label>' +
            '<label>期限<input type="date" value="' + (todo.dueDate || '') + '" data-field="dueDate" data-entity="todo" data-entity-id="' + todo.id + '" /></label>' +
            '<label>リマインダー<input type="datetime-local" value="' + (todo.reminderAt || '') + '" data-field="reminderAt" data-entity="todo" data-entity-id="' + todo.id + '" /></label>' +
          '</div>' +
          '<label class="checkbox-line"><input type="checkbox" ' + (todo.isDelegated ? 'checked' : '') + ' data-field="isDelegated" data-entity="todo" data-entity-id="' + todo.id + '" /> 先行依頼（他者へ依頼して回答待ち）</label>' +
          renderDelegateFields(todo) +
          '<div class="field-grid recurrence-row" data-todo-id="' + todo.id + '">' +
            '<label>繰り返し<select data-action-change="recurrence:setFreq" data-id="' + todo.id + '">' + selectOptions(FREQ_LABEL, freqValue) + '</select></label>' +
            (todo.recurrence ? '<label>間隔<input type="number" min="1" value="' + (recurrence.interval || 1) + '" data-action-change="recurrence:setInterval" data-id="' + todo.id + '" /></label>' : '') +
          '</div>' +
          '<label>メモ<textarea rows="3" data-field="memo" data-entity="todo" data-entity-id="' + todo.id + '" placeholder="補足・連絡内容など">' + c.escapeHtml(todo.memo) + '</textarea></label>' +
          '<div class="drawer-section">' +
            '<h4>サブタスク</h4>' +
            renderSubtasks(todo) +
          '</div>' +
          '<div class="drawer-section">' +
            '<h4>履歴</h4>' +
            renderHistory(todo) +
          '</div>' +
        '</div>' +
        '<div class="drawer-footer">' +
          archiveButton + removeButton +
        '</div>' +
      '</div>'
    );
  }

  App.Render.todoDetail = { render: render };

  // --- アクション ---
  App.Actions['drawer:close'] = function () { App.Store.ui.closeTodoDetail(); };
  App.Actions['todo:archive'] = function (d) { App.Store.todos.archive(d.id); App.Store.ui.closeTodoDetail(); };
  App.Actions['todo:restore'] = function (d) { App.Store.todos.restore(d.id); };
  App.Actions['todo:removeForever'] = function (d) {
    if (window.confirm('完全に削除します。元に戻せません。よろしいですか？')) {
      App.Store.todos.remove(d.id);
      App.Store.ui.closeTodoDetail();
    }
  };
  App.Actions['subtask:toggle'] = function (d) { App.Store.todos.toggleSubtask(d.id, d.subtaskId); };
  App.Actions['subtask:remove'] = function (d) { App.Store.todos.removeSubtask(d.id, d.subtaskId); };
  App.Actions['subtask:add'] = function (d, evt, target) {
    var title = target.value.trim();
    if (!title) return;
    App.Store.todos.addSubtask(d.id, title);
  };
  App.Actions['recurrence:setFreq'] = function (d, evt, target) {
    var freq = target.value;
    if (freq === 'none') {
      App.Store.todos.update(d.id, { recurrence: null });
    } else {
      var todo = App.Store.todos.getById(d.id);
      var interval = todo.recurrence ? todo.recurrence.interval : 1;
      App.Store.todos.update(d.id, { recurrence: { freq: freq, interval: interval } });
    }
  };
  App.Actions['recurrence:setInterval'] = function (d, evt, target) {
    var todo = App.Store.todos.getById(d.id);
    if (!todo || !todo.recurrence) return;
    var n = Math.max(1, Number(target.value) || 1);
    App.Store.todos.update(d.id, { recurrence: { freq: todo.recurrence.freq, interval: n } });
  };
})(window.TodoApp = window.TodoApp || {});
