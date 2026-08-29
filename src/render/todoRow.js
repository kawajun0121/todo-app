/*
 役割: TODO1件分の行HTMLを組み立てる（ダッシュボード/スマート一覧/プロジェクト展開パネル/Inboxで共用）。
 依存: render/common.js, logic/dateUtils.js

 行の中に「重要度・開始日・期限・ステータス（先行依頼を含む）」の編集コントロールを
 常設し、ドロワーを開かなくてもその場で設定変更できるようにしている。
 これらのコントロールは todo-row-main（クリックでドロワーを開く領域）の外側に置くことで、
 セレクトや日付入力を操作したときに誤ってドロワーが開かないようにしている。

 options.listKey を渡すと、その行はドラッグで並び替え可能になる
 （'inbox' または 'project:<プロジェクトid>'。同じlistKeyの行同士でのみ並び替えできる。
 実際のドラッグ処理は appShell.js が #app への委譲イベントで行う）。

 行右端のゴミ箱アイコンは確認ダイアログなしの1クリック削除（アーカイブを経由しない）。
 元に戻す手段は無いため、誤操作が心配な場合はドロワーの「アーカイブ」を使う。

 重要度はバッジのような別要素ではなく、行そのものの左端の色帯（todo-row-importance-*）と
 タイトル文字の背景色（todo-title-importance-*。マーカーで線を引いたような見た目）で表す。
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  var c = App.Render.common;

  // ステータスと先行依頼は本来別々のデータだが、行内の簡易編集では
  // 1つのセレクトにまとめて扱う（依頼中は他のステータスより優先して表示する）。
  var STATUS_OR_DELEGATE_LABEL = {
    not_started: '未着手',
    delegated: '先行依頼',
    waiting: '待機中',
    in_progress: '進行中',
    completed: '完了'
  };

  // options: { bulkMode, isSelected(id)->bool, showProject, emptyText, listKey }
  function renderTodoRow(todo, options) {
    options = options || {};
    var checked = todo.status === 'completed' ? 'checked' : '';
    var rowClasses = ['todo-row', 'todo-row-importance-' + todo.importance];
    if (todo.status === 'completed') rowClasses.push('todo-row-done');

    var projectTag = '';
    if (options.showProject) {
      var proj = todo.projectId ? App.Store.projects.getById(todo.projectId) : null;
      projectTag = '<span class="todo-project-tag">' + (proj ? c.escapeHtml(proj.name) : 'Inbox') + '</span>';
    }

    var subtaskProgress = '';
    if (todo.subtasks && todo.subtasks.length > 0) {
      var done = todo.subtasks.filter(function (s) { return s.done; }).length;
      subtaskProgress = '<span class="todo-subtask-count">☑ ' + done + '/' + todo.subtasks.length + '</span>';
    }

    var isSelected = options.bulkMode && typeof options.isSelected === 'function' && options.isSelected(todo.id);
    var bulkCheckbox = options.bulkMode
      ? '<input type="checkbox" class="bulk-check" data-action="bulk:toggle" data-id="' + todo.id + '" ' + (isSelected ? 'checked' : '') + ' />'
      : '';

    var badges = [
      c.overdueBadge(todo),
      c.followUpBadge(todo)
    ].filter(Boolean).join('');

    // Inboxの項目はドロワーを開かなくても、行から直接プロジェクトへ移動できるようにする
    // （ドラッグ操作が使えないタッチ端末等でも移動できるよう、セレクトも併用する）
    var isUnassigned = !todo.projectId;
    var moveToProject = isUnassigned ? renderMoveToProjectSelect(todo) : '';
    var isDraggable = isUnassigned || !!options.listKey;
    if (isDraggable) rowClasses.push('todo-row-draggable');
    var dragHandle = isDraggable
      ? '<span class="drag-handle" title="' + (isUnassigned ? 'ドラッグしてプロジェクトへ移動・並び替え' : 'ドラッグして並び替え') + '">⠿</span>'
      : '';
    var listKeyAttr = options.listKey ? 'data-list-key="' + options.listKey + '"' : '';

    return (
      '<div class="' + rowClasses.join(' ') + '" data-id="' + todo.id + '" ' + listKeyAttr + ' ' + (isDraggable ? 'draggable="true"' : '') + '>' +
        '<div class="todo-row-top-line">' +
          bulkCheckbox +
          dragHandle +
          '<input type="checkbox" class="todo-check" data-action="todo:toggleComplete" data-id="' + todo.id + '" ' + checked + ' title="完了にする" />' +
          '<div class="todo-row-main" data-action="todo:openDetail" data-id="' + todo.id + '">' +
            '<div class="todo-row-top">' +
              '<span class="todo-title todo-title-importance-' + todo.importance + '">' + c.escapeHtml(todo.title) + '</span>' +
              projectTag +
            '</div>' +
            '<div class="todo-badges">' + badges + subtaskProgress + '</div>' +
          '</div>' +
          c.iconButton('todo:deleteNow', todo.id, '🗑', '削除') +
        '</div>' +
        renderQuickEdit(todo) +
        moveToProject +
      '</div>'
    );
  }

  function renderQuickEdit(todo) {
    var statusValue = todo.isDelegated ? 'delegated' : todo.status;
    var statusOptions = Object.keys(STATUS_OR_DELEGATE_LABEL).map(function (key) {
      return '<option value="' + key + '" ' + (key === statusValue ? 'selected' : '') + '>' + STATUS_OR_DELEGATE_LABEL[key] + '</option>';
    }).join('');
    var importanceOptions = Object.keys(c.IMPORTANCE_LABEL).map(function (key) {
      return '<option value="' + key + '" ' + (key === todo.importance ? 'selected' : '') + '>重要度:' + c.IMPORTANCE_LABEL[key] + '</option>';
    }).join('');

    return (
      '<div class="todo-quick-edit">' +
        '<select class="qe-field" data-field="importance" data-entity="todo" data-entity-id="' + todo.id + '" title="重要度">' + importanceOptions + '</select>' +
        '<span class="qe-date-group" title="開始日">' +
          '<span class="qe-label">開始</span>' +
          '<input type="date" class="qe-field" data-field="startDate" data-entity="todo" data-entity-id="' + todo.id + '" value="' + (todo.startDate || '') + '" />' +
        '</span>' +
        '<span class="qe-date-group" title="期限">' +
          '<span class="qe-label">期限</span>' +
          '<input type="date" class="qe-field" data-field="dueDate" data-entity="todo" data-entity-id="' + todo.id + '" value="' + (todo.dueDate || '') + '" />' +
        '</span>' +
        '<select class="qe-field" data-action-change="todo:setStatusOrDelegate" data-id="' + todo.id + '" title="ステータス">' + statusOptions + '</select>' +
      '</div>'
    );
  }

  function renderMoveToProjectSelect(todo) {
    var projects = App.Store.projects.getAll();
    if (projects.length === 0) return '';
    var optionsHtml = '<option value="">プロジェクトへ移動…</option>' + projects.map(function (p) {
      return '<option value="' + p.id + '">' + c.escapeHtml(p.name) + '</option>';
    }).join('');
    return '<select class="todo-move-select" data-field="projectId" data-entity="todo" data-entity-id="' + todo.id + '">' + optionsHtml + '</select>';
  }

  function renderTodoList(todos, options) {
    if (todos.length === 0) {
      return '<div class="empty-state">' + (options && options.emptyText ? options.emptyText : '該当するTODOはありません') + '</div>';
    }
    return todos.map(function (t) { return renderTodoRow(t, options); }).join('');
  }

  App.Render.todoRow = { render: renderTodoRow, renderList: renderTodoList };

  // --- アクション登録 ---
  App.Actions['todo:toggleComplete'] = function (dataset) {
    var todo = App.Store.todos.getById(dataset.id);
    if (!todo) return;
    if (todo.status === 'completed') {
      App.Store.todos.reopen(dataset.id);
    } else {
      App.Store.todos.complete(dataset.id);
    }
  };

  App.Actions['todo:openDetail'] = function (dataset) {
    App.Store.ui.openTodoDetail(dataset.id);
  };

  // 行のゴミ箱アイコンからの1クリック削除（確認ダイアログなし。アーカイブを経由しなくても削除できる）
  App.Actions['todo:deleteNow'] = function (dataset) {
    App.Store.todos.remove(dataset.id);
  };

  // ステータス（先行依頼を含む）の行内クイック編集
  App.Actions['todo:setStatusOrDelegate'] = function (dataset, evt, target) {
    var value = target.value;
    if (value === 'delegated') {
      App.Store.todos.update(dataset.id, { isDelegated: true });
      return;
    }
    if (value === 'completed') {
      App.Store.todos.complete(dataset.id);
      return;
    }
    var current = App.Store.todos.getById(dataset.id);
    var patch = { status: value, isDelegated: false };
    if (current && current.completedAt) patch.completedAt = null; // 完了から他ステータスへ戻す場合
    App.Store.todos.update(dataset.id, patch);
  };
})(window.TodoApp = window.TodoApp || {});
