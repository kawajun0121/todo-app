// 役割: 待機中TODOの待機期限ラベル（今日/明日/○日超過）を計算。依存: logic/dateUtils.js
(function (App) {
  'use strict';
  App.Logic = App.Logic || {};
  var du = App.Logic.dateUtils;

  // 戻り値: null または { type: 'today'|'tomorrow'|'overdue'|'upcoming', text, daysOver }
  function getWaitingLabel(todo) {
    if (todo.status !== 'waiting' || !todo.waitingDeadline) return null;
    var today = du.todayISO();
    var diff = du.diffDays(today, todo.waitingDeadline); // 正=未来, 負=過去

    if (diff === 0) return { type: 'today', text: '今日が待機期限', daysOver: 0 };
    if (diff === 1) return { type: 'tomorrow', text: '明日が待機期限', daysOver: 0 };
    if (diff < 0) return { type: 'overdue', text: Math.abs(diff) + '日超過', daysOver: Math.abs(diff) };
    return { type: 'upcoming', text: du.formatDateJP(todo.waitingDeadline) + 'までに回答', daysOver: 0 };
  }

  function needsFollowUp(todo) {
    return todo.status === 'waiting' && todo.waitingDeadline && du.isPast(todo.waitingDeadline);
  }

  App.Logic.waitingStatus = { getWaitingLabel: getWaitingLabel, needsFollowUp: needsFollowUp };
})(window.TodoApp = window.TodoApp || {});
