/*
 役割: プロジェクト作成／編集モーダル。新規作成時はテンプレート選択でTODOを一括生成できる。
 依存: render/common.js, store/projectsStore.js, store/templatesStore.js
*/
(function (App) {
  'use strict';
  App.Render = App.Render || {};
  var c = App.Render.common;

  var CATEGORY_SUGGESTIONS = ['民泊', '不動産仲介', '空き家管理', 'Instagram運用', '新規事業'];

  function templateOptions() {
    var templates = App.Store.templates.getAll();
    var options = '<option value="">テンプレートを使わない</option>';
    templates.forEach(function (t) {
      options += '<option value="' + t.id + '">' + c.escapeHtml(t.name) + '（TODO ' + t.todoTemplates.length + '件）</option>';
    });
    return options;
  }

  function render(projectFormId) {
    var isNew = projectFormId === 'new';
    var project = isNew ? { id: null, name: '', category: '', deadline: null, status: 'active', memo: '' } : App.Store.projects.getById(projectFormId);
    if (!project) return '';

    var entityAttr = isNew ? '' : 'data-entity="project" data-entity-id="' + project.id + '"';

    return (
      '<div class="modal-overlay" data-action="projectform:close"></div>' +
      '<div class="modal">' +
        '<div class="modal-header">' +
          '<h3>' + (isNew ? '新規プロジェクト' : 'プロジェクト編集') + '</h3>' +
          '<button type="button" class="icon-btn" data-action="projectform:close" title="閉じる">×</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<label>プロジェクト名<input type="text" id="pf-name" value="' + c.escapeHtml(project.name) + '" ' + (isNew ? '' : 'data-field="name" ' + entityAttr) + ' placeholder="例: 民泊2軒目" autofocus /></label>' +
          '<label>カテゴリ<input type="text" id="pf-category" value="' + c.escapeHtml(project.category) + '" list="category-suggestions" ' + (isNew ? '' : 'data-field="category" ' + entityAttr) + ' placeholder="例: 民泊" />' +
            '<datalist id="category-suggestions">' + CATEGORY_SUGGESTIONS.map(function (s) { return '<option value="' + s + '"></option>'; }).join('') + '</datalist>' +
          '</label>' +
          '<div class="field-grid">' +
            '<label>プロジェクト期限<input type="date" id="pf-deadline" value="' + (project.deadline || '') + '" ' + (isNew ? '' : 'data-field="deadline" ' + entityAttr) + ' /></label>' +
            '<label>ステータス<select id="pf-status" ' + (isNew ? '' : 'data-field="status" ' + entityAttr) + '>' +
              Object.keys(c.PROJECT_STATUS_LABEL).map(function (k) {
                return '<option value="' + k + '" ' + (k === project.status ? 'selected' : '') + '>' + c.PROJECT_STATUS_LABEL[k] + '</option>';
              }).join('') +
            '</select></label>' +
          '</div>' +
          '<label>メモ<textarea id="pf-memo" rows="3" ' + (isNew ? '' : 'data-field="memo" ' + entityAttr) + ' placeholder="補足情報など">' + c.escapeHtml(project.memo) + '</textarea></label>' +
          (isNew ? '<label>テンプレートから作成<select id="pf-template">' + templateOptions() + '</select></label>' : '') +
        '</div>' +
        '<div class="modal-footer">' +
          (isNew
            ? '<button type="button" class="btn-primary" data-action="project:create">作成</button>'
            : '<button type="button" class="btn-text" data-action="project:archive" data-id="' + project.id + '">🗄 アーカイブ</button>') +
        '</div>' +
      '</div>'
    );
  }

  App.Render.projectForm = { render: render };

  App.Actions['projectform:open'] = function () { App.Store.ui.openProjectForm(null); };
  App.Actions['project:openForm'] = function (d) { App.Store.ui.openProjectForm(d.id); };
  App.Actions['projectform:close'] = function () { App.Store.ui.closeProjectForm(); };
  App.Actions['project:archive'] = function (d) { App.Store.projects.archive(d.id); App.Store.ui.closeProjectForm(); };

  App.Actions['project:create'] = function () {
    var name = document.getElementById('pf-name').value.trim();
    if (!name) { window.alert('プロジェクト名を入力してください'); return; }
    var category = document.getElementById('pf-category').value.trim();
    var deadline = document.getElementById('pf-deadline').value || null;
    var status = document.getElementById('pf-status').value;
    var memo = document.getElementById('pf-memo').value;
    var templateId = document.getElementById('pf-template').value;

    var project = App.Store.projects.create({ name: name, category: category, deadline: deadline, status: status, memo: memo });
    if (templateId) {
      App.Store.templates.applyToProject(templateId, project.id);
    }
    App.Store.ui.closeProjectForm();
    App.Store.ui.toggleProjectExpanded(project.id);
  };
})(window.TodoApp = window.TodoApp || {});
