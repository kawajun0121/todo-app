// 役割: プロジェクト名・TODO名・メモの横断検索。依存: なし
(function (App) {
  'use strict';
  App.Logic = App.Logic || {};

  function matches(text, query) {
    return !!text && text.toLowerCase().indexOf(query) >= 0;
  }

  function searchAll(projects, todos, query) {
    var q = (query || '').trim().toLowerCase();
    if (!q) return { projects: [], todos: [] };
    return {
      projects: projects.filter(function (p) {
        return matches(p.name, q) || matches(p.category, q) || matches(p.memo, q);
      }),
      todos: todos.filter(function (t) {
        return matches(t.title, q) || matches(t.memo, q) || matches(t.delegateTo, q);
      })
    };
  }

  App.Logic.search = { searchAll: searchAll };
})(window.TodoApp = window.TodoApp || {});
