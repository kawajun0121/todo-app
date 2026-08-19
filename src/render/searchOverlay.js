/*
 役割: ヘッダー常設の横断検索（プロジェクト名・TODO名・メモ）。オーバーレイ表示でページ遷移なし。
 依存: render/common.js, render/todoRow.js, logic/search.js, store/uiStore.js

 検索入力は「1文字ごとに全体再描画」すると入力中にカーソルが飛んでしまうため、
 開いている間だけ直接addEventListenerして#search-resultsだけを部分更新する
 （common.jsのdata-field委譲パターンとは別の、検索専用の軽量な仕組み）。
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  var c = App.Render.common;

  function renderTrigger() {
    return '<button type="button" class="header-icon-btn" data-action="search:open" title="検索">🔍</button>';
  }

  function renderOverlay(isOpen) {
    if (!isOpen) return '';
    return (
      '<div class="search-overlay">' +
        '<div class="search-overlay-backdrop" data-action="search:close"></div>' +
        '<div class="search-panel">' +
          '<div class="search-panel-head">' +
            '<input type="text" id="search-input" placeholder="プロジェクト名・TODO名・メモで検索" autocomplete="off" />' +
            '<button type="button" class="icon-btn" data-action="search:close" title="閉じる">×</button>' +
          '</div>' +
          '<div id="search-results" class="search-results"></div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderResults(query) {
    var result = App.Logic.search.searchAll(App.Store.projects.getAll(), App.Store.todos.getAll(), query);
    if (!query.trim()) return '<div class="empty-state-small">キーワードを入力してください</div>';
    if (result.projects.length === 0 && result.todos.length === 0) {
      return '<div class="empty-state-small">「' + c.escapeHtml(query) + '」に一致する結果はありません</div>';
    }
    var html = '';
    if (result.projects.length) {
      html += '<div class="search-section-label">プロジェクト</div>';
      html += result.projects.map(function (p) {
        return '<div class="search-result-row" data-action="search:openProject" data-id="' + p.id + '">' + c.escapeHtml(p.name) + '</div>';
      }).join('');
    }
    if (result.todos.length) {
      html += '<div class="search-section-label">TODO</div>';
      html += App.Render.todoRow.renderList(result.todos, { showProject: true });
    }
    return html;
  }

  // appShellが再描画のたびに呼ぶ。開いている間だけ入力欄にリスナーを付け直す。
  function mount() {
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    if (!input || !results) return;
    input.focus();
    input.addEventListener('input', function () {
      results.innerHTML = renderResults(input.value);
      // 検索結果内のクリックは通常のdata-action委譲(#appの委譲リスナー)がそのまま拾う
    });
  }

  App.Render.searchOverlay = {
    renderTrigger: renderTrigger,
    renderOverlay: renderOverlay,
    mount: mount
  };

  App.Actions['search:open'] = function () { App.Store.ui.openSearch(); };
  App.Actions['search:close'] = function () { App.Store.ui.closeSearch(); };
  App.Actions['search:openProject'] = function (d) {
    App.Store.ui.closeSearch();
    App.Store.ui.setView('projects');
    App.Store.ui.toggleProjectExpanded(d.id);
  };
})(window.TodoApp = window.TodoApp || {});
