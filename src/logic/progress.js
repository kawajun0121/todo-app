// 役割: プロジェクトの進捗率・件数集計（純粋関数）。依存: なし
(function (App) {
  'use strict';
  App.Logic = App.Logic || {};
  var du = App.Logic.dateUtils;

  // project配下（archived除く）のtodoから統計を計算
  function computeProjectStats(project, allTodos) {
    var todos = allTodos.filter(function (t) { return t.projectId === project.id && !t.archived; });
    var total = todos.length;
    var completed = todos.filter(function (t) { return t.status === 'completed'; }).length;
    var remaining = total - completed;
    var important = todos.filter(function (t) { return t.importance === 'high' && t.status !== 'completed'; }).length;
    var waiting = todos.filter(function (t) { return t.status === 'waiting'; }).length;
    var overdue = todos.filter(function (t) {
      return t.status !== 'completed' && t.dueDate && du.isPast(t.dueDate);
    }).length;
    var progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total: total,
      completed: completed,
      remaining: remaining,
      important: important,
      waiting: waiting,
      overdue: overdue,
      progressPct: progressPct
    };
  }

  App.Logic.progress = { computeProjectStats: computeProjectStats };
})(window.TodoApp = window.TodoApp || {});
