/*
 役割: アプリ全体の骨組み（サイドバー・ヘッダー・メインエリア・各種オーバーレイ）を1画面内で
      組み立てる最上位モジュール。イベント委譲リスナーもここで#appに1回だけ設置する。
 依存: render/配下のすべてのモジュール, store/配下のすべてのストア

 【再描画の考え方】
 ストア（projects/todos/templates/history/ui）のどれかが変化するたびに main.js から
 renderAll() が呼ばれ、#app の中身を丸ごと作り直す。個人のTODO・プロジェクト管理という
 規模（多くて数百件）では、部分更新の複雑さよりも「常に状態通りの画面になる」単純さを
 優先している。
 ただし丸ごと作り直すと入力中の要素のフォーカスや.main-content/.sidebarのスクロール位置が
 失われるため、withUiStatePreserved() で再描画の前後にそれらを覚えておき・復元している。
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};

  // 端末が最新版を読み込めているか画面から目視確認できるようにするための表示用バージョン番号。
  // sw.jsのCACHE_NAMEを上げるときはこちらの数字も一緒に上げること。
  var APP_VERSION = 'v17';

  var SMART_NAV_ORDER = ['today', 'overdue', 'thisWeek', 'important', 'waiting', 'followUp', 'recurring', 'completed'];

  function navBadge(count, danger) {
    if (!count) return '';
    return '<span class="nav-badge ' + (danger ? 'nav-badge-danger' : '') + '">' + count + '</span>';
  }

  function renderSidebar(state) {
    var allTodos = App.Store.todos.getAll();
    var lists = App.Logic.smartLists.BY_KEY;
    var inboxCount = lists.inbox.filter(allTodos).length;
    var overdueCount = lists.overdue.filter(allTodos).length;
    var followUpCount = lists.followUp.filter(allTodos).length;

    function navItem(view, icon, label, badgeHtml) {
      var active = state.currentView === view;
      return '<button type="button" class="nav-item ' + (active ? 'nav-item-active' : '') + '" data-action="nav:setView" data-view="' + view + '">' +
        '<span class="nav-icon">' + icon + '</span><span class="nav-label">' + label + '</span>' + (badgeHtml || '') +
        '</button>';
    }

    var smartNav = SMART_NAV_ORDER.map(function (key) {
      var def = lists[key];
      var count = def.filter(allTodos).length;
      var danger = key === 'overdue' || key === 'followUp';
      return navItem('smart:' + key, def.icon, def.label, navBadge(count, danger));
    }).join('');

    return (
      '<nav class="sidebar ' + (state.sidebarOpen ? 'sidebar-open' : '') + '">' +
        '<div class="sidebar-group">' +
          navItem('dashboard', '🏠', 'ダッシュボード', '') +
          navItem('projects', '📁', 'プロジェクト一覧', '') +
          navItem('smart:inbox', '📥', 'Inbox', navBadge(inboxCount, false)) +
        '</div>' +
        '<div class="sidebar-group">' +
          '<div class="sidebar-group-label">スマート一覧</div>' +
          smartNav +
        '</div>' +
        '<div class="sidebar-group">' +
          navItem('templates', '🗂', 'テンプレート管理', '') +
          navItem('archive', '🗄', 'アーカイブ', '') +
        '</div>' +
        renderAccountSection() +
      '</nav>' +
      '<div class="sidebar-backdrop ' + (state.sidebarOpen ? 'sidebar-backdrop-show' : '') + '" data-action="ui:closeSidebar"></div>'
    );
  }

  // 同期が有効な場合だけ、ログイン中のメールアドレスとログアウトボタンを表示する
  function renderAccountSection() {
    if (!App.Sync || !App.Sync.available || !App.Sync.auth || !App.Sync.auth.currentUser) return '';
    var email = App.Sync.auth.currentUser.email || '';
    return (
      '<div class="sidebar-group sidebar-account">' +
        '<div class="sidebar-account-email" title="' + App.Render.common.escapeHtml(email) + '">🔗 ' + App.Render.common.escapeHtml(email) + '</div>' +
        '<button type="button" class="btn-text" data-action="account:signOut">ログアウト</button>' +
        '<div class="sidebar-app-version">' + APP_VERSION + '</div>' +
      '</div>'
    );
  }

  function renderHeader(state) {
    return (
      '<header class="app-header">' +
        '<button type="button" class="header-icon-btn mobile-only" data-action="ui:toggleSidebar" title="メニュー">☰</button>' +
        '<div class="app-title">個人TODO</div>' +
        App.Render.searchOverlay.renderTrigger() +
      '</header>'
    );
  }

  function renderMainContent(state) {
    var view = state.currentView || 'dashboard';
    if (view === 'dashboard') return App.Render.dashboard.render(state);
    if (view === 'projects') return App.Render.projectCard.renderListView(state);
    if (view === 'templates') return App.Render.templateManager.renderList();
    if (view === 'archive') return App.Render.archiveView.render(state);
    if (view.indexOf('smart:') === 0) return App.Render.smartListView.render(view.slice(6), state);
    return App.Render.dashboard.render(state);
  }

  function renderOverlays(state) {
    var html = '';
    if (state.todoDetailId) {
      var todo = App.Store.todos.getById(state.todoDetailId);
      if (todo) html += App.Render.todoDetail.render(todo);
    }
    if (state.projectFormId) html += App.Render.projectForm.render(state.projectFormId);
    if (state.templateFormId) html += App.Render.templateManager.renderEditor(state.templateFormId);
    html += App.Render.searchOverlay.renderOverlay(state.searchOpen);
    return html;
  }

  function renderAll() {
    var container = document.getElementById('app');
    withUiStatePreserved(container, function () {
      var state = App.Store.ui.getState();
      container.innerHTML = (
        renderHeader(state) +
        '<div class="app-body">' +
          renderSidebar(state) +
          '<main class="main-content">' + renderMainContent(state) + '</main>' +
        '</div>' +
        App.Render.bulkActionBar.render(state) +
        App.Render.quickAdd.renderBar() +
        renderOverlays(state)
      );
      if (state.searchOpen) App.Render.searchOverlay.mount();
    });
  }

  // --- フォーカス・スクロール位置の保持ヘルパー ---
  // renderAll()は毎回#appの中身を丸ごと作り直す（.main-contentや.sidebarも新しいDOM要素になる）ため、
  // 何もしないとプロジェクトを開いたり並び替えたりするたびにスクロール位置が先頭に戻ってしまう。
  // 再描画の前後で.main-content/.sidebarのscrollTopを覚えておき、新しい要素に描画直後に復元する。
  function describeFocus(el) {
    if (!el || !el.dataset) return null;
    var parts = [];
    if (el.dataset.actionKeydown) parts.push('[data-action-keydown="' + el.dataset.actionKeydown + '"]');
    if (el.dataset.field) parts.push('[data-field="' + el.dataset.field + '"]');
    if (el.dataset.id) parts.push('[data-id="' + el.dataset.id + '"]');
    if (el.dataset.entityId) parts.push('[data-entity-id="' + el.dataset.entityId + '"]');
    if (el.id) parts.push('#' + el.id);
    if (parts.length === 0) return null;
    return el.tagName.toLowerCase() + parts.join('');
  }

  // selectionStart/setSelectionRangeは <textarea> と一部のinput type（text/search/url/tel/password）
  // にしか存在しない。'selectionStart' in el 自体は type="date" 等でもtrueを返してしまい、
  // 実際に読み書きすると例外を投げて再描画全体（スクロール位置の復元も含む）が止まってしまうため、
  // 対応しているタイプかどうかを明示的に確認してから触る。
  var TEXT_SELECTION_INPUT_TYPES = { text: true, search: true, url: true, tel: true, password: true };
  function supportsTextSelection(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') return TEXT_SELECTION_INPUT_TYPES[el.type] === true;
    return false;
  }

  // 同じTODOがダッシュボード上の複数箇所（例: 「7日以内」欄とプロジェクト展開パネル）に
  // 同時に描画されていると、data-field/data-entity-idだけのセレクタでは複数の要素にヒットする。
  // querySelector()は常に最初の1件しか返さないため、編集した場所と違う（ページ上部の）要素を
  // 誤って再フォーカスしてしまうことがあった。同じセレクタに一致する要素の中で何番目だったかを
  // 覚えておき、再描画後も同じ順番の要素を選び直すことで、常に「実際に操作していた方」に戻す。
  function indexAmongMatches(container, selector, el) {
    var matches = container.querySelectorAll(selector);
    for (var i = 0; i < matches.length; i++) {
      if (matches[i] === el) return i;
    }
    return 0;
  }

  function withUiStatePreserved(container, renderFn) {
    var active = document.activeElement;
    var selector = container.contains(active) ? describeFocus(active) : null;
    var matchIndex = selector ? indexAmongMatches(container, selector, active) : 0;
    var selectionStart = supportsTextSelection(active) ? active.selectionStart : null;

    var mainContentBefore = container.querySelector('.main-content');
    var mainScrollTop = mainContentBefore ? mainContentBefore.scrollTop : 0;
    var sidebarBefore = container.querySelector('.sidebar');
    var sidebarScrollTop = sidebarBefore ? sidebarBefore.scrollTop : 0;

    renderFn();

    var mainContentAfter = container.querySelector('.main-content');
    if (mainContentAfter) mainContentAfter.scrollTop = mainScrollTop;
    var sidebarAfter = container.querySelector('.sidebar');
    if (sidebarAfter) sidebarAfter.scrollTop = sidebarScrollTop;

    if (selector) {
      try {
        var matches = container.querySelectorAll(selector);
        var el = matches[Math.min(matchIndex, matches.length - 1)] || null;
        if (el) {
          // preventScroll必須: 編集によって行の並びが変わった場合など、
          // フォーカス先の位置がずれているとブラウザが「見える位置まで」勝手にスクロールしてしまい、
          // 上で復元したスクロール位置が台無しになる（これが「編集すると上に戻る」不具合の原因）。
          el.focus({ preventScroll: true });
          if (selectionStart !== null && supportsTextSelection(el)) {
            el.setSelectionRange(selectionStart, selectionStart);
          }
        }
      } catch (e) { /* 不正なセレクタは無視 */ }
    }
  }

  // --- イベント委譲（#appに1回だけ設置） ---
  function handleClick(evt) {
    var target = evt.target.closest('[data-action]');
    if (!target) return;
    var fn = App.Actions[target.dataset.action];
    if (fn) fn(target.dataset, evt, target);
  }

  function handleChange(evt) {
    var target = evt.target;
    if (!target.dataset) return;
    if (target.dataset.field) {
      handleFieldChange(target);
    }
    if (target.dataset.actionChange) {
      var fn = App.Actions[target.dataset.actionChange];
      if (fn) fn(target.dataset, evt, target);
    }
  }

  function handleFieldChange(target) {
    var field = target.dataset.field;
    var entity = target.dataset.entity;
    var entityId = target.dataset.entityId;
    if (!field || !entity || !entityId) return;
    var value;
    if (target.type === 'checkbox') value = target.checked;
    else if (target.type === 'date' || target.type === 'datetime-local') value = target.value || null;
    else if (field === 'projectId') value = target.value || null; // ""(Inbox選択)はnullに正規化する
    else value = target.value;

    var patch = {};
    patch[field] = value;
    if (entity === 'todo') App.Store.todos.update(entityId, patch);
    else if (entity === 'project') App.Store.projects.update(entityId, patch);
    else if (entity === 'template') App.Store.templates.update(entityId, patch);
  }

  function handleKeydown(evt) {
    if (evt.key === 'Escape') {
      closeTopOverlay();
      return;
    }
    if (evt.key !== 'Enter') return;
    var target = evt.target;
    if (target.dataset && target.dataset.actionKeydown) {
      evt.preventDefault();
      var fn = App.Actions[target.dataset.actionKeydown];
      if (fn) fn(target.dataset, evt, target);
    }
  }

  function closeTopOverlay() {
    var state = App.Store.ui.getState();
    if (state.searchOpen) return App.Store.ui.closeSearch();
    if (state.templateFormId) return App.Store.ui.closeTemplateForm();
    if (state.projectFormId) return App.Store.ui.closeProjectForm();
    if (state.todoDetailId) return App.Store.ui.closeTodoDetail();
  }

  /*
   --- ドラッグ&ドロップ ---
   3種類のドラッグを1組の委譲リスナーで扱う。
   1) Inboxの行 → プロジェクトカード（[data-drop-target="project"]）… プロジェクトへ移動
   2) 並び替え可能な行（data-list-key付き） → 同じlistKeyの別の行 … その一覧内での並び替え
      （Inbox／プロジェクト内／「未完了のTODO」など、listKeyを振ってあるどの一覧でも同じ仕組みで並び替えられる。
      判定はTODO自身の所属プロジェクトではなく「どのlistKeyの行としてドラッグを開始したか」で行うため、
      「未完了のTODO」のように複数プロジェクトを横断する一覧でもその場の表示順を並び替えられる）
   3) プロジェクトの⠿ハンドル（[data-drag-project]） → 別のプロジェクトカード … ダッシュボード等でのプロジェクト並び替え
   種類の判別は dataTransfer の型名（'text/plain'=TODOのid、'application/x-project-id'=プロジェクトのid、
   'application/x-todo-list-key'=ドラッグ元のlistKey）で行う。
   dragover中はgetData()の値を読めないブラウザがあるため、判別には.types（型名一覧）だけを使う。
   タッチ端末ではdragstart/drop系イベントが発火しないため、todoRow.jsの
   「プロジェクトへ移動」セレクトを常に併用できるようにしてある（そちらが正の代替手段）。
  */
  function handleDragStart(evt) {
    var row = evt.target.closest('.todo-row-draggable[draggable="true"]');
    if (row) {
      evt.dataTransfer.setData('text/plain', row.dataset.id);
      // 並び替え可否は「TODO自身が所属するプロジェクト」ではなく「どのリストからドラッグしたか」で
      // 判定する。これにより「未完了のTODO」のような複数プロジェクトを横断する一覧でも、
      // Inbox/プロジェクト内と同じ仕組みでその場の表示順を並び替えられる。
      evt.dataTransfer.setData('application/x-todo-list-key', row.dataset.listKey || '');
      evt.dataTransfer.effectAllowed = 'move';
      row.classList.add('dragging');
      return;
    }
    var projectHandle = evt.target.closest('[data-drag-project]');
    if (projectHandle) {
      evt.dataTransfer.setData('application/x-project-id', projectHandle.dataset.id);
      evt.dataTransfer.effectAllowed = 'move';
      var card = projectHandle.closest('.project-card');
      if (card) card.classList.add('dragging');
    }
  }

  function handleDragEnd(evt) {
    var row = evt.target.closest('.todo-row-draggable');
    if (row) row.classList.remove('dragging');
    var card = evt.target.closest('.project-card');
    if (card) card.classList.remove('dragging');
    stopAutoScroll();
  }

  function removeClasses(el, classNames) {
    classNames.forEach(function (name) { el.classList.remove(name); });
  }

  // targetElの中でカーソルが前半/後半どちらにあるかを見て、挿入位置が「対象の前」か「後」かを判定する。
  // rowは縦並びなのでY座標、プロジェクトカードは横に並ぶグリッドなのでX座標で判定する。
  function isInsertAfter(evt, targetEl, horizontal) {
    var rect = targetEl.getBoundingClientRect();
    return horizontal
      ? evt.clientX > rect.left + rect.width / 2
      : evt.clientY > rect.top + rect.height / 2;
  }

  function handleDragOver(evt) {
    var isProjectDrag = evt.dataTransfer.types.indexOf('application/x-project-id') >= 0;
    var rowTarget = evt.target.closest('.todo-row[data-list-key]');
    var projectTarget = evt.target.closest('[data-drop-target="project"]');

    if (isProjectDrag) {
      if (projectTarget) {
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'move';
        var afterProject = isInsertAfter(evt, projectTarget, true);
        removeClasses(projectTarget, ['drop-target-before', 'drop-target-after']);
        projectTarget.classList.add(afterProject ? 'drop-target-after' : 'drop-target-before');
      }
    } else {
      if (rowTarget) {
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'move';
        var afterRow = isInsertAfter(evt, rowTarget, false);
        removeClasses(rowTarget, ['reorder-hover-before', 'reorder-hover-after']);
        rowTarget.classList.add(afterRow ? 'reorder-hover-after' : 'reorder-hover-before');
      }
      if (projectTarget) {
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'move';
        projectTarget.classList.add('drop-target-hover');
      }
    }
    updateAutoScroll(evt);
  }

  function handleDragLeave(evt) {
    var rowTarget = evt.target.closest('.todo-row[data-list-key]');
    if (rowTarget && !rowTarget.contains(evt.relatedTarget)) {
      removeClasses(rowTarget, ['reorder-hover-before', 'reorder-hover-after']);
    }
    var projectTarget = evt.target.closest('[data-drop-target="project"]');
    if (projectTarget && !projectTarget.contains(evt.relatedTarget)) {
      removeClasses(projectTarget, ['drop-target-hover', 'drop-target-before', 'drop-target-after']);
    }
  }

  function handleDrop(evt) {
    stopAutoScroll();
    var rowTarget = evt.target.closest('.todo-row[data-list-key]');
    var projectTarget = evt.target.closest('[data-drop-target="project"]');

    var projectDragId = evt.dataTransfer.getData('application/x-project-id');
    if (projectDragId) {
      evt.preventDefault();
      if (projectTarget) {
        removeClasses(projectTarget, ['drop-target-before', 'drop-target-after']);
        if (projectTarget.dataset.id !== projectDragId) {
          reorderProjectsViaDrop(projectDragId, projectTarget.dataset.id, isInsertAfter(evt, projectTarget, true));
        }
      }
      return;
    }

    var todoId = evt.dataTransfer.getData('text/plain');
    if (!todoId) return;
    evt.preventDefault();

    if (rowTarget) removeClasses(rowTarget, ['reorder-hover-before', 'reorder-hover-after']);
    if (projectTarget) projectTarget.classList.remove('drop-target-hover');

    if (rowTarget && rowTarget.dataset.id !== todoId) {
      var draggedListKey = evt.dataTransfer.getData('application/x-todo-list-key');
      if (draggedListKey && draggedListKey === rowTarget.dataset.listKey) {
        reorderTodosViaDrop(rowTarget.dataset.listKey, todoId, rowTarget.dataset.id, isInsertAfter(evt, rowTarget, false));
        return;
      }
    }

    if (projectTarget) {
      App.Store.todos.update(todoId, { projectId: projectTarget.dataset.id });
    }
  }

  // 同じlistKeyの行を現在の表示順どおりに読み取り、draggedIdをtargetIdの前後どちらかへ差し込む
  function reorderTodosViaDrop(listKey, draggedId, targetId, insertAfter) {
    var rows = document.querySelectorAll('.todo-row[data-list-key="' + listKey + '"]');
    var orderedIds = Array.prototype.map.call(rows, function (el) { return el.dataset.id; });
    var fromIndex = orderedIds.indexOf(draggedId);
    if (fromIndex === -1) return;
    orderedIds.splice(fromIndex, 1);
    var toIndex = orderedIds.indexOf(targetId);
    if (toIndex === -1) { orderedIds.push(draggedId); }
    else { orderedIds.splice(insertAfter ? toIndex + 1 : toIndex, 0, draggedId); }
    App.Store.todos.reorderTodos(orderedIds);
  }

  function reorderProjectsViaDrop(draggedId, targetId, insertAfter) {
    var cards = document.querySelectorAll('.project-card');
    var orderedIds = Array.prototype.map.call(cards, function (el) { return el.dataset.id; });
    var fromIndex = orderedIds.indexOf(draggedId);
    if (fromIndex === -1) return;
    orderedIds.splice(fromIndex, 1);
    var toIndex = orderedIds.indexOf(targetId);
    if (toIndex === -1) { orderedIds.push(draggedId); }
    else { orderedIds.splice(insertAfter ? toIndex + 1 : toIndex, 0, draggedId); }
    App.Store.projects.reorderProjects(orderedIds);
  }

  // --- ドラッグ中の自動スクロール ---
  // ドラッグ中にカーソルが.main-contentの上端/下端に近づいたら自動でスクロールする。
  // dragoverは委譲で#app全体を拾うので、サイドバー上にいる間も判定は動き続ける。
  var autoScroll = { direction: 0, rafId: null };
  var AUTO_SCROLL_EDGE = 60;
  var AUTO_SCROLL_SPEED = 16;

  function updateAutoScroll(evt) {
    var container = document.querySelector('.main-content');
    if (!container) return;
    var rect = container.getBoundingClientRect();
    var y = evt.clientY;
    var direction = 0;
    if (y < rect.top + AUTO_SCROLL_EDGE) direction = -1;
    else if (y > rect.bottom - AUTO_SCROLL_EDGE) direction = 1;

    autoScroll.direction = direction;
    if (direction !== 0 && autoScroll.rafId === null) {
      autoScroll.rafId = requestAnimationFrame(function step() {
        if (autoScroll.direction === 0) { autoScroll.rafId = null; return; }
        container.scrollTop += autoScroll.direction * AUTO_SCROLL_SPEED;
        autoScroll.rafId = requestAnimationFrame(step);
      });
    }
  }

  function stopAutoScroll() {
    autoScroll.direction = 0;
    if (autoScroll.rafId !== null) {
      cancelAnimationFrame(autoScroll.rafId);
      autoScroll.rafId = null;
    }
  }

  function init() {
    var app = document.getElementById('app');
    app.addEventListener('click', handleClick);
    app.addEventListener('change', handleChange);
    app.addEventListener('keydown', handleKeydown);
    app.addEventListener('dragstart', handleDragStart);
    app.addEventListener('dragend', handleDragEnd);
    app.addEventListener('dragover', handleDragOver);
    app.addEventListener('dragleave', handleDragLeave);
    app.addEventListener('drop', handleDrop);
  }

  App.Render.appShell = { renderAll: renderAll, init: init };

  App.Actions['nav:setView'] = function (d) { App.Store.ui.setView(d.view); };
  App.Actions['ui:toggleSidebar'] = function () { App.Store.ui.toggleSidebar(); };
  App.Actions['ui:closeSidebar'] = function () { App.Store.ui.toggleSidebar(); };
  App.Actions['account:signOut'] = function () {
    if (window.confirm('ログアウトします。よろしいですか？')) {
      App.Sync.auth.signOut();
    }
  };
})(window.TodoApp = window.TodoApp || {});
