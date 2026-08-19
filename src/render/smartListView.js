/*
 役割: スマート一覧・Inbox共通の一覧ビュー（条件で抽出したTODOを表示、一括選択に対応）。
 依存: render/common.js, render/todoRow.js, logic/smartLists.js
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};

  function render(key, state) {
    var def = App.Logic.smartLists.BY_KEY[key];
    if (!def) return '<div class="empty-state">不明なスマート一覧です</div>';
    var allTodos = App.Store.todos.getAll();
    // Inboxだけはドラッグ並び替え対応のため、期限ではなく手動順(order)でソートする
    var list = key === 'inbox' ? def.filter(allTodos).sort(sortByOrder) : def.filter(allTodos).sort(sortByDueDate);

    var toolbar = (
      '<div class="view-toolbar">' +
        '<h2>' + def.icon + ' ' + def.label + '<span class="count-pill">' + list.length + '</span></h2>' +
        '<button type="button" class="btn-text" data-action="bulk:toggleMode">' + (state.bulkMode ? '選択を終了' : '複数選択') + '</button>' +
      '</div>'
    );

    var list_html = App.Render.todoRow.renderList(list, {
      bulkMode: state.bulkMode,
      showProject: true,
      isSelected: function (id) { return state.bulkSelection.indexOf(id) >= 0; },
      emptyText: emptyTextFor(key),
      listKey: key === 'inbox' ? 'inbox' : null
    });

    return '<div class="view smart-list-view">' + toolbar + list_html + '</div>';
  }

  function emptyTextFor(key) {
    var texts = {
      today: '今日期限のTODOはありません。落ち着いて他の作業を進めましょう',
      overdue: '期限切れのTODOはありません👍',
      thisWeek: '今週期限のTODOはありません',
      important: '重要TODOはありません',
      delegated: '未実行の先行依頼はありません',
      waiting: '待機中のTODOはありません',
      followUp: 'フォローアップが必要なTODOはありません👍',
      inbox: 'Inboxは空です',
      recurring: '繰り返し設定されたTODOはありません',
      completed: '完了済みのTODOはまだありません'
    };
    return texts[key] || '該当するTODOはありません';
  }

  function sortByDueDate(a, b) {
    var ad = a.dueDate || '9999-99-99';
    var bd = b.dueDate || '9999-99-99';
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  }

  function sortByOrder(a, b) {
    return (a.order || 0) - (b.order || 0);
  }

  App.Render.smartListView = { render: render };
})(window.TodoApp = window.TodoApp || {});
