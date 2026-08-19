/*
 役割: 画面描画で共通に使うHTML部品・ヘルパー・アクション登録レジストリ。
 依存: logic/dateUtils.js, logic/waitingStatus.js

 【操作の統一ルール】
 - クリックは data-action="xxx" 属性 + App.Actions['xxx'] へ登録した関数で処理する
   （1つの委譲リスナーをappShellが#appに1回だけ設置し、再描画があってもリスナーが失われない）
 - フォーム項目は data-field="fieldName" data-entity="todo|project|template" data-entity-id="ID" を付けるだけで
   appShellの共通changeリスナーが自動保存する。text/textareaの'change'イベントはフォーカスが外れた
   時にしか発火しないため、入力中に毎回再描画されてカーソル位置が飛ぶ問題は起きない
 - select/checkbox/日付/数値inputで「複数の値をまとめて1つのオブジェクトに組み立てる」等
   data-fieldでは表現しにくい保存処理が必要な場合は、data-action-change="xxx" + App.Actions['xxx']
   を使う（clickではなくchangeイベントで発火する点以外はdata-actionと同じ仕組み）
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  App.Actions = App.Actions || {}; // data-action名 -> function(dataset, event, target)

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var IMPORTANCE_LABEL = { high: '高', medium: '中', low: '低' };
  var STATUS_LABEL = { not_started: '未着手', in_progress: '進行中', waiting: '待機中', completed: '完了' };
  var PROJECT_STATUS_LABEL = { active: '進行中', on_hold: '保留', completed: '完了' };

  function importanceBadge(importance) {
    if (!importance) return '';
    return '<span class="badge badge-importance-' + importance + '">重要度:' + IMPORTANCE_LABEL[importance] + '</span>';
  }

  function projectStatusBadge(status) {
    return '<span class="badge badge-status-' + (status === 'active' ? 'in_progress' : status === 'on_hold' ? 'waiting' : 'completed') + '">' + PROJECT_STATUS_LABEL[status] + '</span>';
  }

  function overdueBadge(todo) {
    var du = App.Logic.dateUtils;
    if (todo.status !== 'completed' && todo.dueDate && du.isPast(todo.dueDate)) {
      return '<span class="badge badge-overdue">⏰ 期限切れ</span>';
    }
    return '';
  }

  function followUpBadge(todo) {
    var label = App.Logic.waitingStatus.getWaitingLabel(todo);
    if (!label) return '';
    var cls = label.type === 'overdue' ? 'badge-followup' : 'badge-waiting-soon';
    return '<span class="badge ' + cls + '">' + (label.type === 'overdue' ? '⚠ ' : '⏳ ') + escapeHtml(label.text) + '</span>';
  }

  function dueDateText(todo) {
    if (!todo.dueDate) return '';
    return App.Logic.dateUtils.formatDateJP(todo.dueDate);
  }

  function iconButton(action, id, icon, title, extra) {
    return '<button type="button" class="icon-btn" data-action="' + action + '" data-id="' + id + '" title="' + escapeHtml(title) + '" ' + (extra || '') + '>' + icon + '</button>';
  }

  App.Render.common = {
    escapeHtml: escapeHtml,
    IMPORTANCE_LABEL: IMPORTANCE_LABEL,
    STATUS_LABEL: STATUS_LABEL,
    PROJECT_STATUS_LABEL: PROJECT_STATUS_LABEL,
    importanceBadge: importanceBadge,
    projectStatusBadge: projectStatusBadge,
    overdueBadge: overdueBadge,
    followUpBadge: followUpBadge,
    dueDateText: dueDateText,
    iconButton: iconButton
  };
})(window.TodoApp = window.TodoApp || {});
