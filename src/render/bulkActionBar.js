/*
 役割: 複数TODO選択時に画面下部へ表示するフローティング一括操作バー。
 依存: render/common.js, store/todosStore.js, store/uiStore.js
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  var c = App.Render.common;

  function projectOptions() {
    var options = '<option value="">プロジェクト変更…</option><option value="__inbox__">Inbox（未割当）</option>';
    App.Store.projects.getAll().forEach(function (p) {
      options += '<option value="' + p.id + '">' + c.escapeHtml(p.name) + '</option>';
    });
    return options;
  }

  function render(state) {
    if (!state.bulkMode || state.bulkSelection.length === 0) return '';
    return (
      '<div class="bulk-bar">' +
        '<span class="bulk-count">' + state.bulkSelection.length + '件選択中</span>' +
        '<button type="button" class="btn-text" data-action="bulk:complete">✓ 完了にする</button>' +
        '<select id="bulk-status"><option value="">ステータス変更…</option>' +
          Object.keys(c.STATUS_LABEL).map(function (k) { return '<option value="' + k + '">' + c.STATUS_LABEL[k] + '</option>'; }).join('') +
        '</select><button type="button" class="btn-text" data-action="bulk:applyStatus">適用</button>' +
        '<select id="bulk-project">' + projectOptions() + '</select><button type="button" class="btn-text" data-action="bulk:applyProject">適用</button>' +
        '<select id="bulk-importance"><option value="">重要度変更…</option>' +
          Object.keys(c.IMPORTANCE_LABEL).map(function (k) { return '<option value="' + k + '">' + c.IMPORTANCE_LABEL[k] + '</option>'; }).join('') +
        '</select><button type="button" class="btn-text" data-action="bulk:applyImportance">適用</button>' +
        '<input type="date" id="bulk-due" title="期限を一括変更" /><button type="button" class="btn-text" data-action="bulk:applyDue">適用</button>' +
        '<button type="button" class="btn-text" data-action="bulk:archive">🗄 アーカイブ</button>' +
        '<button type="button" class="btn-text" data-action="bulk:clear">選択解除</button>' +
      '</div>'
    );
  }

  App.Render.bulkActionBar = { render: render };

  App.Actions['bulk:toggleMode'] = function () {
    var on = !App.Store.ui.getState().bulkMode;
    App.Store.ui.setBulkMode(on);
  };
  App.Actions['bulk:toggle'] = function (d) { App.Store.ui.toggleBulkSelect(d.id); };
  App.Actions['bulk:clear'] = function () { App.Store.ui.clearBulkSelection(); };

  App.Actions['bulk:complete'] = function () {
    var ids = App.Store.ui.getState().bulkSelection;
    ids.forEach(function (id) { App.Store.todos.complete(id); });
    App.Store.ui.clearBulkSelection();
  };
  App.Actions['bulk:archive'] = function () {
    var ids = App.Store.ui.getState().bulkSelection;
    App.Store.todos.bulkArchive(ids);
    App.Store.ui.clearBulkSelection();
  };
  App.Actions['bulk:applyStatus'] = function () {
    var value = document.getElementById('bulk-status').value;
    if (!value) return;
    App.Store.todos.bulkUpdate(App.Store.ui.getState().bulkSelection, { status: value });
    App.Store.ui.clearBulkSelection();
  };
  App.Actions['bulk:applyProject'] = function () {
    var value = document.getElementById('bulk-project').value;
    if (!value) return;
    App.Store.todos.bulkUpdate(App.Store.ui.getState().bulkSelection, { projectId: value === '__inbox__' ? null : value });
    App.Store.ui.clearBulkSelection();
  };
  App.Actions['bulk:applyImportance'] = function () {
    var value = document.getElementById('bulk-importance').value;
    if (!value) return;
    App.Store.todos.bulkUpdate(App.Store.ui.getState().bulkSelection, { importance: value });
    App.Store.ui.clearBulkSelection();
  };
  App.Actions['bulk:applyDue'] = function () {
    var value = document.getElementById('bulk-due').value;
    if (!value) return;
    App.Store.todos.bulkUpdate(App.Store.ui.getState().bulkSelection, { dueDate: value });
    App.Store.ui.clearBulkSelection();
  };
})(window.TodoApp = window.TodoApp || {});
