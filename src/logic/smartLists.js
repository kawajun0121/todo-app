/*
 役割: スマート一覧（条件に応じた自動抽出）の定義。
 依存: logic/dateUtils.js, logic/waitingStatus.js
 同じTODOが複数のスマート一覧に重複表示されるのは仕様通り。
*/
(function (App) {
  'use strict';
  App.Logic = App.Logic || {};
  var du = App.Logic.dateUtils;
  var ws = App.Logic.waitingStatus;

  function notCompleted(t) { return t.status !== 'completed'; }

  var DEFS = [
    {
      key: 'today',
      label: '今日',
      icon: '☀️',
      filter: function (todos) {
        return todos.filter(function (t) { return notCompleted(t) && t.dueDate === du.todayISO(); });
      }
    },
    {
      key: 'overdue',
      label: '期限切れ',
      icon: '⏰',
      filter: function (todos) {
        return todos.filter(function (t) { return notCompleted(t) && t.dueDate && du.isPast(t.dueDate); });
      }
    },
    {
      key: 'thisWeek',
      label: '今週',
      icon: '📅',
      filter: function (todos) {
        var end = du.endOfWeekISO();
        var today = du.todayISO();
        return todos.filter(function (t) {
          return notCompleted(t) && t.dueDate && t.dueDate >= today && t.dueDate <= end;
        });
      }
    },
    {
      key: 'important',
      label: '重要',
      icon: '❗',
      filter: function (todos) {
        return todos.filter(function (t) { return notCompleted(t) && t.importance === 'high'; });
      }
    },
    {
      key: 'waiting',
      label: '待機中',
      icon: '⏳',
      filter: function (todos) {
        return todos.filter(function (t) { return t.status === 'waiting'; });
      }
    },
    {
      key: 'followUp',
      label: 'フォローアップ必要',
      icon: '⚠️',
      filter: function (todos) {
        return todos.filter(ws.needsFollowUp);
      }
    },
    {
      key: 'inbox',
      label: 'Inbox',
      icon: '📥',
      filter: function (todos) {
        return todos.filter(function (t) { return notCompleted(t) && !t.projectId; });
      }
    },
    {
      key: 'recurring',
      label: '繰り返しTODO',
      icon: '🔁',
      filter: function (todos) {
        return todos.filter(function (t) { return notCompleted(t) && !!t.recurrence; });
      }
    },
    {
      key: 'completed',
      label: '完了済み',
      icon: '✅',
      filter: function (todos) {
        return todos.filter(function (t) { return t.status === 'completed'; });
      }
    }
  ];

  var BY_KEY = {};
  DEFS.forEach(function (d) { BY_KEY[d.key] = d; });

  function getList(key, todos) {
    var def = BY_KEY[key];
    if (!def) return [];
    return def.filter(todos);
  }

  // ダッシュボード専用: 明日から7日以内が期限のTODO（今日が期限のものは「今日」欄と重複するため除く）。
  // サイドバーのスマート一覧には出さず、ダッシュボードの「7日以内」セクションだけで使う。
  function getNext7Days(todos) {
    var today = du.todayISO();
    var start = du.addDays(today, 1);
    var end = du.addDays(today, 7);
    return todos.filter(function (t) {
      return notCompleted(t) && t.dueDate && t.dueDate >= start && t.dueDate <= end;
    });
  }

  App.Logic.smartLists = { DEFS: DEFS, BY_KEY: BY_KEY, getList: getList, getNext7Days: getNext7Days };
})(window.TodoApp = window.TodoApp || {});
