/*
 役割: プロジェクトテンプレートのCRUDと、テンプレートからのTODO一括生成。
 依存: store/state.js, storage/storageAdapter.js, storage/keys.js,
      logic/id.js, store/todosStore.js
*/
(function (App) {
  'use strict';
  App.Store = App.Store || {};

  var KEYS = App.Storage.KEYS;
  var adapter = App.Storage.adapter;
  var initial = adapter.load(KEYS.TEMPLATES, []);
  var store = App.Store.createStore({ items: initial });

  function persist() {
    adapter.save(KEYS.TEMPLATES, store.getState().items);
  }

  function getAll() {
    return store.getState().items;
  }

  function getById(id) {
    return store.getState().items.find(function (t) { return t.id === id; }) || null;
  }

  function create(partial) {
    partial = partial || {};
    var template = {
      id: App.Logic.id.generateId(),
      name: partial.name || '新しいテンプレート',
      category: partial.category || '',
      todoTemplates: partial.todoTemplates || []
    };
    store.setState(function (s) { return { items: s.items.concat([template]) }; });
    persist();
    return template;
  }

  function update(id, patch) {
    var current = getById(id);
    if (!current) return null;
    var updated = Object.assign({}, current, patch);
    store.setState(function (s) {
      return { items: s.items.map(function (t) { return t.id === id ? updated : t; }) };
    });
    persist();
    return updated;
  }

  function remove(id) {
    store.setState(function (s) {
      return { items: s.items.filter(function (t) { return t.id !== id; }) };
    });
    persist();
  }

  // テンプレートのTODOひな形を指定プロジェクトへ一括生成
  function applyToProject(templateId, projectId) {
    var template = getById(templateId);
    if (!template) return [];
    return template.todoTemplates.map(function (tt) {
      return App.Store.todos.create({
        title: tt.title,
        projectId: projectId,
        importance: tt.importance || 'medium'
      });
    });
  }

  function seedDefaultsIfEmpty() {
    if (getAll().length > 0) return;
    create({
      name: '不動産売却仲介',
      category: '不動産仲介',
      todoTemplates: [
        { title: '相談受付', importance: 'medium' },
        { title: '物件情報確認', importance: 'medium' },
        { title: '現地確認', importance: 'medium' },
        { title: '査定', importance: 'high' },
        { title: '査定書作成', importance: 'medium' },
        { title: '媒介契約', importance: 'high' },
        { title: '販売活動開始', importance: 'medium' },
        { title: '問い合わせ対応', importance: 'medium' },
        { title: '売買契約', importance: 'high' },
        { title: '決済準備', importance: 'high' },
        { title: '決済・引渡し', importance: 'high' }
      ]
    });
    create({
      name: '民泊新規開業',
      category: '民泊',
      todoTemplates: [
        { title: '物件選定', importance: 'high' },
        { title: '許認可・届出確認', importance: 'high' },
        { title: '内装・備品準備', importance: 'medium' },
        { title: '写真撮影', importance: 'medium' },
        { title: '掲載ページ作成', importance: 'medium' },
        { title: '清掃・運営体制の確立', importance: 'medium' },
        { title: '価格設定', importance: 'low' },
        { title: '公開・運用開始', importance: 'high' }
      ]
    });
    create({
      name: '空き家管理',
      category: '空き家管理',
      todoTemplates: [
        { title: '現地状況確認', importance: 'medium' },
        { title: '所有者へ状況報告', importance: 'medium' },
        { title: '清掃・通風・通水', importance: 'low' },
        { title: '郵便物確認', importance: 'low' },
        { title: '外構・庭木確認', importance: 'low' },
        { title: '次回巡回日設定', importance: 'medium' }
      ]
    });
  }

  App.Store.templates = {
    getAll: getAll,
    getById: getById,
    create: create,
    update: update,
    remove: remove,
    applyToProject: applyToProject,
    seedDefaultsIfEmpty: seedDefaultsIfEmpty,
    subscribe: store.subscribe
  };
})(window.TodoApp = window.TodoApp || {});
