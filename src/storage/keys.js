// 役割: localStorageで使うキー定数。依存: なし。
(function (App) {
  'use strict';
  App.Storage = App.Storage || {};

  App.Storage.KEYS = {
    PROJECTS: 'todoapp.projects.v1',
    TODOS: 'todoapp.todos.v1',
    TEMPLATES: 'todoapp.templates.v1',
    HISTORY: 'todoapp.history.v1',
    SEEDED: 'todoapp.seeded.v1'
  };
})(window.TodoApp = window.TodoApp || {});
