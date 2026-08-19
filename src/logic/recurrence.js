/*
 役割: 繰り返しTODOの次回日付計算。
 依存: logic/dateUtils.js
 v1で公開するのは freq: daily/weekly/monthly/yearly のみ。
 byWeekday / byMonthday は将来「毎週月曜」「毎月末」等に対応するための予約フィールド。
*/
(function (App) {
  'use strict';
  App.Logic = App.Logic || {};
  var du = App.Logic.dateUtils;

  function shiftDate(iso, rule) {
    var interval = rule.interval || 1;
    switch (rule.freq) {
      case 'daily':
        return du.addDays(iso, interval);
      case 'weekly':
        return du.addDays(iso, 7 * interval);
      case 'monthly':
        return du.addMonths(iso, interval);
      case 'yearly':
        return du.addYears(iso, interval);
      default:
        return iso;
    }
  }

  // 完了したTODOから、次回分のTODO（未保存オブジェクト）を組み立てる
  function buildNextOccurrence(todo) {
    if (!todo.recurrence) return null;
    var baseForShift = todo.dueDate || todo.startDate || du.todayISO();
    var nextDue = todo.dueDate ? shiftDate(todo.dueDate, todo.recurrence) : null;
    var nextStart = null;
    if (todo.startDate) {
      if (todo.dueDate) {
        var gapDays = du.diffDays(todo.startDate, todo.dueDate);
        nextStart = nextDue ? du.addDays(nextDue, -gapDays) : shiftDate(todo.startDate, todo.recurrence);
      } else {
        nextStart = shiftDate(todo.startDate, todo.recurrence);
      }
    }
    if (!nextDue && !nextStart) {
      nextDue = shiftDate(baseForShift, todo.recurrence);
    }

    return {
      title: todo.title,
      projectId: todo.projectId,
      importance: todo.importance,
      startDate: nextStart,
      dueDate: nextDue,
      status: 'not_started',
      memo: todo.memo,
      isDelegated: false,
      delegateTo: '',
      delegatedAt: null,
      waitingDeadline: null,
      reminderAt: null,
      recurrence: todo.recurrence,
      recurrenceParentId: todo.recurrenceParentId || todo.id,
      subtasks: (todo.subtasks || []).map(function (st) {
        return { id: App.Logic.id.generateId(), title: st.title, done: false };
      })
    };
  }

  App.Logic.recurrence = { buildNextOccurrence: buildNextOccurrence, shiftDate: shiftDate };
})(window.TodoApp = window.TodoApp || {});
