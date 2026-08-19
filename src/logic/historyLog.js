// 役割: 履歴の日本語説明文を組み立てる純粋関数。依存: logic/dateUtils.js
(function (App) {
  'use strict';
  App.Logic = App.Logic || {};

  var STATUS_LABEL = {
    not_started: '未着手',
    in_progress: '進行中',
    waiting: '待機中',
    completed: '完了'
  };
  var PROJECT_STATUS_LABEL = {
    active: '進行中',
    on_hold: '保留',
    completed: '完了'
  };
  var IMPORTANCE_LABEL = { high: '高', medium: '中', low: '低' };

  function fmtDate(iso) {
    return App.Logic.dateUtils.formatDateJP(iso) || '未設定';
  }

  // action: 'created' | 'status_changed' | 'due_changed' | 'waiting_deadline_changed'
  //       | 'project_changed' | 'importance_changed' | 'archived' | 'restored' | 'completed' | 'updated'
  function buildDescription(action, ctx) {
    ctx = ctx || {};
    switch (action) {
      case 'created':
        return '作成しました';
      case 'completed':
        return '完了しました';
      case 'status_changed':
        return (STATUS_LABEL[ctx.oldValue] || ctx.oldValue || '(未設定)') + ' → ' + (STATUS_LABEL[ctx.newValue] || ctx.newValue);
      case 'project_status_changed':
        return (PROJECT_STATUS_LABEL[ctx.oldValue] || ctx.oldValue) + ' → ' + (PROJECT_STATUS_LABEL[ctx.newValue] || ctx.newValue);
      case 'due_changed':
        return '期限を ' + fmtDate(ctx.newValue) + ' に変更しました';
      case 'start_changed':
        return '開始日を ' + fmtDate(ctx.newValue) + ' に変更しました';
      case 'waiting_deadline_changed':
        return '待機期限を ' + fmtDate(ctx.newValue) + ' に変更しました';
      case 'project_changed':
        return 'プロジェクトを「' + (ctx.newValue || 'Inbox') + '」に変更しました';
      case 'importance_changed':
        return '重要度を ' + (IMPORTANCE_LABEL[ctx.oldValue] || ctx.oldValue || '未設定') + ' → ' + IMPORTANCE_LABEL[ctx.newValue] + ' に変更しました';
      case 'delegated_changed':
        return ctx.newValue ? '先行依頼を設定しました' : '先行依頼を解除しました';
      case 'archived':
        return 'アーカイブしました';
      case 'restored':
        return 'アーカイブから復元しました';
      case 'recurrence_generated':
        return '繰り返しにより次回分（期限 ' + fmtDate(ctx.newValue) + '）を自動生成しました';
      case 'follow_up_done':
        return 'フォローアップを実施しました';
      case 'updated':
      default:
        return ctx.description || '内容を更新しました';
    }
  }

  App.Logic.historyLog = { buildDescription: buildDescription };
})(window.TodoApp = window.TodoApp || {});
