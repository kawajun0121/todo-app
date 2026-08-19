/*
 役割: プロジェクトテンプレートの作成・編集・削除（TODOひな形の管理）。
 依存: render/common.js, store/templatesStore.js
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  var c = App.Render.common;

  function renderList() {
    var templates = App.Store.templates.getAll();
    var cards = templates.map(function (t) {
      return (
        '<div class="template-card">' +
          '<div class="template-card-main" data-action="template:openForm" data-id="' + t.id + '">' +
            '<div class="template-card-name">' + c.escapeHtml(t.name) + '</div>' +
            (t.category ? '<div class="template-card-category">' + c.escapeHtml(t.category) + '</div>' : '') +
            '<div class="template-card-count">TODO ' + t.todoTemplates.length + '件</div>' +
          '</div>' +
          '<div class="template-card-actions">' +
            c.iconButton('template:duplicate', t.id, '⧉', '複製') +
            c.iconButton('template:delete', t.id, '🗑', '削除') +
          '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="view">' +
        '<div class="view-toolbar"><h2>🗂 テンプレート管理</h2>' +
          '<button type="button" class="btn-primary" data-action="template:createNew">＋ 新規テンプレート</button>' +
        '</div>' +
        (templates.length ? '<div class="template-grid">' + cards + '</div>' : '<div class="empty-state">テンプレートがありません</div>') +
      '</div>'
    );
  }

  function renderEditor(templateId) {
    var t = App.Store.templates.getById(templateId);
    if (!t) return '';
    var items = t.todoTemplates.map(function (item, index) {
      return (
        '<li class="template-item-row">' +
          '<span>' + c.escapeHtml(item.title) + '</span>' +
          c.importanceBadge(item.importance) +
          '<button type="button" class="icon-btn" data-action="templateitem:remove" data-id="' + t.id + '" data-item-index="' + index + '" title="削除">×</button>' +
        '</li>'
      );
    }).join('');

    return (
      '<div class="modal-overlay" data-action="template:closeForm"></div>' +
      '<div class="modal">' +
        '<div class="modal-header">' +
          '<h3>テンプレート編集</h3>' +
          '<button type="button" class="icon-btn" data-action="template:closeForm" title="閉じる">×</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<label>テンプレート名<input type="text" value="' + c.escapeHtml(t.name) + '" data-field="name" data-entity="template" data-entity-id="' + t.id + '" /></label>' +
          '<label>カテゴリ<input type="text" value="' + c.escapeHtml(t.category) + '" data-field="category" data-entity="template" data-entity-id="' + t.id + '" /></label>' +
          '<div class="drawer-section">' +
            '<h4>TODOひな形</h4>' +
            '<ul class="template-item-list">' + items + '</ul>' +
            '<div class="field-grid">' +
              '<input type="text" id="template-item-title" placeholder="TODO名を入力してEnter" data-action-keydown="templateitem:add" data-id="' + t.id + '" />' +
              '<select id="template-item-importance">' +
                Object.keys(c.IMPORTANCE_LABEL).map(function (k) { return '<option value="' + k + '" ' + (k === 'medium' ? 'selected' : '') + '>' + c.IMPORTANCE_LABEL[k] + '</option>'; }).join('') +
              '</select>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  App.Render.templateManager = { renderList: renderList, renderEditor: renderEditor };

  App.Actions['template:createNew'] = function () {
    var t = App.Store.templates.create({ name: '新しいテンプレート', category: '', todoTemplates: [] });
    App.Store.ui.openTemplateForm(t.id);
  };
  App.Actions['template:openForm'] = function (d) { App.Store.ui.openTemplateForm(d.id); };
  App.Actions['template:closeForm'] = function () { App.Store.ui.closeTemplateForm(); };
  App.Actions['template:duplicate'] = function (d) {
    var t = App.Store.templates.getById(d.id);
    if (!t) return;
    App.Store.templates.create({ name: t.name + 'のコピー', category: t.category, todoTemplates: t.todoTemplates.slice() });
  };
  App.Actions['template:delete'] = function (d) {
    if (window.confirm('このテンプレートを削除します。よろしいですか？')) {
      App.Store.templates.remove(d.id);
    }
  };
  App.Actions['templateitem:add'] = function (d, evt, target) {
    var title = target.value.trim();
    if (!title) return;
    var importance = document.getElementById('template-item-importance').value;
    var t = App.Store.templates.getById(d.id);
    App.Store.templates.update(d.id, { todoTemplates: t.todoTemplates.concat([{ title: title, importance: importance }]) });
  };
  App.Actions['templateitem:remove'] = function (d) {
    var t = App.Store.templates.getById(d.id);
    if (!t) return;
    var index = Number(d.itemIndex);
    App.Store.templates.update(d.id, { todoTemplates: t.todoTemplates.filter(function (_, i) { return i !== index; }) });
  };
})(window.TodoApp = window.TodoApp || {});
