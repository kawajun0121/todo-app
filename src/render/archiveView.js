/*
 役割: アーカイブ済みプロジェクト／TODOの一覧・検索・復元・完全削除。
 依存: render/common.js, store/projectsStore.js, store/todosStore.js
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  var c = App.Render.common;

  function renderProjectRow(p) {
    return (
      '<div class="archive-row">' +
        '<div class="archive-row-main">' +
          '<span class="archive-row-title">' + c.escapeHtml(p.name) + '</span>' +
          (p.category ? '<span class="todo-project-tag">' + c.escapeHtml(p.category) + '</span>' : '') +
        '</div>' +
        '<div class="archive-row-actions">' +
          c.iconButton('project:restore', p.id, '♻ 復元', '復元') +
          c.iconButton('project:removeForever', p.id, '🗑 完全に削除', '完全に削除') +
        '</div>' +
      '</div>'
    );
  }

  function renderTodoRow(t) {
    var proj = t.projectId ? App.Store.projects.getById(t.projectId) : null;
    return (
      '<div class="archive-row">' +
        '<div class="archive-row-main">' +
          '<span class="archive-row-title">' + c.escapeHtml(t.title) + '</span>' +
          '<span class="todo-project-tag">' + (proj ? c.escapeHtml(proj.name) : 'Inbox') + '</span>' +
        '</div>' +
        '<div class="archive-row-actions">' +
          c.iconButton('todo:restore', t.id, '♻ 復元', '復元') +
          c.iconButton('todo:removeForever', t.id, '🗑 完全に削除', '完全に削除') +
        '</div>' +
      '</div>'
    );
  }

  function render(state) {
    var tab = state.archiveTab;
    var projects = App.Store.projects.getAll({ includeArchived: true }).filter(function (p) { return p.archived; });
    var todos = App.Store.todos.getAll({ includeArchived: true }).filter(function (t) { return t.archived; });

    var tabs = (
      '<div class="tab-row">' +
        '<button type="button" class="tab-btn ' + (tab === 'projects' ? 'tab-btn-active' : '') + '" data-action="archive:setTab" data-tab="projects">プロジェクト（' + projects.length + '）</button>' +
        '<button type="button" class="tab-btn ' + (tab === 'todos' ? 'tab-btn-active' : '') + '" data-action="archive:setTab" data-tab="todos">TODO（' + todos.length + '）</button>' +
      '</div>'
    );

    var body = tab === 'projects'
      ? (projects.length ? projects.map(renderProjectRow).join('') : '<div class="empty-state">アーカイブ済みのプロジェクトはありません</div>')
      : (todos.length ? todos.map(renderTodoRow).join('') : '<div class="empty-state">アーカイブ済みのTODOはありません</div>');

    return '<div class="view"><div class="view-toolbar"><h2>🗄 アーカイブ</h2></div>' + tabs + '<div class="archive-list">' + body + '</div></div>';
  }

  App.Render.archiveView = { render: render };

  App.Actions['archive:setTab'] = function (d) { App.Store.ui.setArchiveTab(d.tab); };
  App.Actions['project:restore'] = function (d) { App.Store.projects.restore(d.id); };
  App.Actions['project:removeForever'] = function (d) {
    if (window.confirm('完全に削除します。元に戻せません。よろしいですか？')) {
      App.Store.projects.remove(d.id);
    }
  };
})(window.TodoApp = window.TodoApp || {});
