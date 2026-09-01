/*
 役割: トップ画面（重要度が高いTODO／今日／7日以内／待機中／Inbox／未完了のTODOを1画面で表示）。
 期限切れ・フォローアップ必要は要確認欄としては出さず、サイドバーのスマート一覧から確認する
 （「重要」「待機中」は要望により最上部付近にセクションとして常設している）。
 「先行依頼」(isDelegated)は「待機中」(status==='waiting')と同じ使われ方だったため統合済み
 （store/todosStore.jsのmigrateLegacyDelegated参照）。
 プロジェクトはダッシュボードには表示しない。プロジェクト自体の確認は「プロジェクト一覧」画面
 （render/projectCard.js）で行う。
 依存: render/common.js, render/todoRow.js, logic/smartLists.js
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  var c = App.Render.common;

  function render(state) {
    var allTodos = App.Store.todos.getAll();
    var lists = App.Logic.smartLists.BY_KEY;
    var important = lists.important.filter(allTodos);
    var today = lists.today.filter(allTodos);
    var next7Days = App.Logic.smartLists.getNext7Days(allTodos);
    var waiting = lists.waiting.filter(allTodos);
    var inboxTodos = lists.inbox.filter(allTodos).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    // ドラッグで並び替えられるよう、Inbox/プロジェクト内と同じくorderで並べる（期限順ではない）。
    // 待機中のものは「待機中」欄に一本化し、ここには出さない（待機中を解除すれば戻ってくる）。
    var incompleteTodos = allTodos.filter(function (t) { return t.status !== 'completed' && t.status !== 'waiting'; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    return (
      '<div class="view dashboard">' +
        '<section class="dashboard-section">' +
          '<h2>❗ 重要度が高いTODO</h2>' +
          App.Render.todoRow.renderList(important, { showProject: true, emptyText: '重要度が高いTODOはありません' }) +
        '</section>' +
        '<section class="dashboard-section">' +
          '<h2>☀️ 今日</h2>' +
          App.Render.todoRow.renderList(today, { showProject: true, emptyText: '今日期限のTODOはありません' }) +
        '</section>' +
        '<section class="dashboard-section">' +
          '<h2>📆 7日以内が期限</h2>' +
          App.Render.todoRow.renderList(next7Days, { showProject: true, emptyText: '7日以内が期限のTODOはありません' }) +
        '</section>' +
        '<section class="dashboard-section">' +
          '<h2>⏳ 待機中</h2>' +
          App.Render.todoRow.renderList(waiting, { showProject: true, emptyText: '待機中のTODOはありません' }) +
        '</section>' +
        '<section class="dashboard-section">' +
          '<button type="button" class="inbox-toggle-header" data-action="dashboard:toggleInbox">' +
            '<span class="inbox-toggle-arrow">' + (state.dashboardInboxOpen ? '▼' : '▶') + '</span>' +
            '<span class="inbox-toggle-title">📥 Inbox<span class="count-pill">' + inboxTodos.length + '</span></span>' +
          '</button>' +
          (state.dashboardInboxOpen
            ? '<div class="inbox-panel">' +
                (inboxTodos.length ? '<div class="inbox-hint">セレクトから移動先のプロジェクトを選べます（新規作成も可）</div>' : '') +
                App.Render.todoRow.renderList(inboxTodos, { emptyText: 'Inboxは空です。お疲れさまです！', listKey: 'inbox' }) +
              '</div>'
            : '') +
        '</section>' +
        '<section class="dashboard-section">' +
          '<button type="button" class="inbox-toggle-header" data-action="dashboard:toggleIncomplete">' +
            '<span class="inbox-toggle-arrow">' + (state.dashboardIncompleteOpen ? '▼' : '▶') + '</span>' +
            '<span class="inbox-toggle-title">📝 未完了のTODO<span class="count-pill">' + incompleteTodos.length + '</span></span>' +
          '</button>' +
          (state.dashboardIncompleteOpen
            ? '<div class="inbox-panel">' + App.Render.todoRow.renderList(incompleteTodos, { showProject: true, emptyText: '未完了のTODOはありません', listKey: 'incomplete' }) + '</div>'
            : '') +
        '</section>' +
      '</div>'
    );
  }

  App.Render.dashboard = { render: render };

  App.Actions['dashboard:toggleInbox'] = function () { App.Store.ui.toggleDashboardInbox(); };
  App.Actions['dashboard:toggleIncomplete'] = function () { App.Store.ui.toggleDashboardIncomplete(); };
})(window.TodoApp = window.TodoApp || {});
