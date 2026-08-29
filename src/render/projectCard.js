/*
 役割: プロジェクトカード（折りたたみ表示＋クリックでその場にTODO一覧をインライン展開）。
 依存: render/common.js, render/todoRow.js, logic/progress.js

 プロジェクトカードは data-drag-project="true" を持つ⠿ハンドルからドラッグでき、
 他のカードにドロップすると並び順（order）が変わる（appShell.jsが処理）。
 カード自体（.project-card）は data-drop-target="project" も持っており、
 Inbox等のTODOをドロップするとそのプロジェクトへ移動する（既存機能）。

 タイトル行右端のゴミ箱アイコンは確認ダイアログなしの1クリック削除。所属TODOはInboxへ戻る
 （projectsStore.remove参照）。元に戻す手段は無いため、誤操作が心配な場合はプロジェクト編集の
 「アーカイブ」を使う。
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  var c = App.Render.common;

  function byOrder(a, b) {
    return (a.order || 0) - (b.order || 0);
  }

  function sortProjectTodos(a, b) {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return byOrder(a, b);
  }

  function renderCard(project, allTodos, expanded, bulkMode, bulkSelection) {
    var stats = App.Logic.progress.computeProjectStats(project, allTodos);
    var deadlineText = project.deadline ? App.Logic.dateUtils.formatDateJP(project.deadline) : '未設定';
    var overdueClass = stats.overdue > 0 ? 'stat-danger' : '';
    var followupCount = allTodos.filter(function (t) {
      return t.projectId === project.id && !t.archived && App.Logic.waitingStatus.needsFollowUp(t);
    }).length;

    var body = '';
    if (expanded) {
      var todos = allTodos
        .filter(function (t) { return t.projectId === project.id && !t.archived; })
        .sort(sortProjectTodos);
      body = (
        '<div class="project-card-expanded">' +
          '<input type="text" class="project-quickadd-input" placeholder="＋ このプロジェクトにTODOを追加してEnter" data-action-keydown="quickadd:submitForProject" data-id="' + project.id + '" autocomplete="off" />' +
          '<div class="project-expanded-toolbar">' +
            '<button type="button" class="btn-text" data-action="project:openForm" data-id="' + project.id + '">✎ プロジェクト編集</button>' +
            '<button type="button" class="btn-text" data-action="bulk:toggleMode">' + (bulkMode ? '選択を終了' : '複数選択') + '</button>' +
          '</div>' +
          App.Render.todoRow.renderList(todos, {
            bulkMode: bulkMode,
            isSelected: function (id) { return bulkSelection.indexOf(id) >= 0; },
            emptyText: 'このプロジェクトにはまだTODOがありません',
            listKey: 'project:' + project.id
          }) +
        '</div>'
      );
    }

    return (
      '<div class="project-card ' + (expanded ? 'project-card-open' : '') + '" data-id="' + project.id + '" data-drop-target="project">' +
        '<div class="project-card-head" data-action="project:toggleExpand" data-id="' + project.id + '">' +
          '<span class="drag-handle project-drag-handle" draggable="true" data-drag-project="true" data-id="' + project.id + '" title="ドラッグして並び替え">⠿</span>' +
          '<div class="project-card-head-main">' +
            '<div class="project-card-title-row">' +
              '<span class="project-card-name">' + c.escapeHtml(project.name) + '</span>' +
              c.projectStatusBadge(project.status) +
              c.iconButton('project:deleteNow', project.id, '🗑', '削除') +
            '</div>' +
            (project.category ? '<div class="project-card-category">' + c.escapeHtml(project.category) + '</div>' : '') +
            '<div class="progress-bar"><div class="progress-bar-fill" style="width:' + stats.progressPct + '%"></div></div>' +
            '<div class="project-card-progress-text">進捗 ' + stats.progressPct + '％　完了 ' + stats.completed + ' / ' + stats.total + '</div>' +
            '<div class="project-card-stats">' +
              '残り' + stats.remaining + '｜重要' + stats.important + '｜待機中' + stats.waiting + '｜<span class="' + overdueClass + '">期限切れ' + stats.overdue + '</span>' +
              (followupCount > 0 ? '｜<span class="stat-warning">⚠ フォローアップ' + followupCount + '</span>' : '') +
            '</div>' +
            '<div class="project-card-deadline">期限：' + deadlineText + '</div>' +
          '</div>' +
        '</div>' +
        body +
      '</div>'
    );
  }

  function renderGrid(projects, allTodos, expandedIds, bulkMode, bulkSelection) {
    if (projects.length === 0) {
      return '<div class="empty-state">プロジェクトがありません。「＋ 新規プロジェクト」から作成してください</div>';
    }
    var sorted = projects.slice().sort(byOrder);
    return '<div class="project-grid">' + sorted.map(function (p) {
      return renderCard(p, allTodos, expandedIds.indexOf(p.id) >= 0, bulkMode, bulkSelection);
    }).join('') + '</div>';
  }

  var UNCATEGORIZED_LABEL = '未分類';

  // プロジェクトをカテゴリごとにまとめる（初出順を維持し、未分類は末尾に回す）
  function groupByCategory(projects) {
    var groups = {};
    var order = [];
    projects.forEach(function (p) {
      var key = p.category || UNCATEGORIZED_LABEL;
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(p);
    });
    var uncategorizedIndex = order.indexOf(UNCATEGORIZED_LABEL);
    if (uncategorizedIndex >= 0) {
      order.splice(uncategorizedIndex, 1);
      order.push(UNCATEGORIZED_LABEL);
    }
    return order.map(function (key) { return { category: key, projects: groups[key] }; });
  }

  // 「プロジェクト一覧」画面：ステータスタブで絞り込み、その中をさらにカテゴリごとにグループ表示する
  function renderListView(state) {
    var allTodos = App.Store.todos.getAll();
    var allProjects = App.Store.projects.getAll();
    var filterValue = state.projectListFilter;
    var counts = {
      active: allProjects.filter(function (p) { return p.status === 'active'; }).length,
      on_hold: allProjects.filter(function (p) { return p.status === 'on_hold'; }).length,
      completed: allProjects.filter(function (p) { return p.status === 'completed'; }).length,
      all: allProjects.length
    };
    var filtered = filterValue === 'all' ? allProjects : allProjects.filter(function (p) { return p.status === filterValue; });

    var tabs = ['active', 'on_hold', 'completed', 'all'].map(function (key) {
      var label = { active: '進行中', on_hold: '保留', completed: '完了', all: 'すべて' }[key];
      return '<button type="button" class="tab-btn ' + (filterValue === key ? 'tab-btn-active' : '') + '" data-action="projectlist:setTab" data-tab="' + key + '">' + label + '（' + counts[key] + '）</button>';
    }).join('');

    var groups = groupByCategory(filtered);
    var body = groups.length
      ? groups.map(function (g) {
          return (
            '<div class="category-group">' +
              '<h3 class="category-group-title">' + c.escapeHtml(g.category) + '<span class="count-pill">' + g.projects.length + '</span></h3>' +
              renderGrid(g.projects, allTodos, state.expandedProjectIds, state.bulkMode, state.bulkSelection) +
            '</div>'
          );
        }).join('')
      : '<div class="empty-state">該当するプロジェクトがありません</div>';

    return (
      '<div class="view">' +
        '<div class="view-toolbar"><h2>📁 プロジェクト一覧</h2>' +
          '<button type="button" class="btn-primary" data-action="projectform:open">＋ 新規プロジェクト</button>' +
        '</div>' +
        '<div class="tab-row">' + tabs + '</div>' +
        body +
      '</div>'
    );
  }

  App.Render.projectCard = { render: renderCard, renderGrid: renderGrid, renderListView: renderListView };

  App.Actions['project:toggleExpand'] = function (d) { App.Store.ui.toggleProjectExpanded(d.id); };
  App.Actions['projectlist:setTab'] = function (d) { App.Store.ui.setProjectListFilter(d.tab); };
  // カード右上のゴミ箱アイコンからの1クリック削除（確認ダイアログなし）。
  // 所属していたTODOはInboxへ戻る（projectsStore.remove参照）。
  App.Actions['project:deleteNow'] = function (d) { App.Store.projects.remove(d.id); };
  App.Actions['quickadd:submitForProject'] = function (d, evt, target) {
    var title = target.value.trim();
    if (!title) return;
    App.Store.todos.create({ title: title, projectId: d.id });
  };
})(window.TodoApp = window.TodoApp || {});
