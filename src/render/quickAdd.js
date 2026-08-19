/*
 役割: どの画面でも常時表示されているクイック追加バー（クリック不要で即入力できる）。
 依存: render/common.js, store/todosStore.js

 以前はボタンを押してからポップオーバーを開く2段階だったが、
 「入力の手間を減らす」ため常時表示の入力欄に変更した。
 画面下部に固定表示され、Enterを押すだけでInboxにTODOが追加される。
 （プロジェクトに直接追加する入力欄は render/projectCard.js の展開パネル側にある）
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};

  function renderBar() {
    return (
      '<div class="quickadd-bar">' +
        '<span class="quickadd-bar-icon">＋</span>' +
        '<input type="text" class="quickadd-bar-input" placeholder="タスクを入力してEnter（Inboxに追加）" data-action-keydown="quickadd:submit" autocomplete="off" />' +
      '</div>'
    );
  }

  App.Render.quickAdd = { renderBar: renderBar };

  App.Actions['quickadd:submit'] = function (d, evt, target) {
    var title = target.value.trim();
    if (!title) return;
    App.Store.todos.create({ title: title, projectId: null });
    // 保存後は再描画で入力欄が新しいDOMに置き換わり自動的に空になる（appShellがフォーカスも復元する）
  };
})(window.TodoApp = window.TodoApp || {});
