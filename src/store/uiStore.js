/*
 役割: 画面の表示状態（現在のビュー・開いているドロワー/モーダル・一括選択など）。
 永続化はしない（アプリを開き直したらダッシュボードに戻る）。
 依存: store/state.js
*/
(function (App) {
  'use strict';
  App.Store = App.Store || {};

  var store = App.Store.createStore({
    currentView: 'dashboard', // 'dashboard' | 'projects' | 'inbox' | 'smart:<key>' | 'templates' | 'archive'
    expandedProjectIds: [],
    todoDetailId: null,
    projectFormId: null, // 'new' | id | null
    templateFormId: null, // 'new' | id | null
    bulkMode: false,
    bulkSelection: [],
    archiveTab: 'projects', // 'projects' | 'todos'
    projectListFilter: 'active', // 'active' | 'on_hold' | 'completed' | 'all'
    sidebarOpen: false, // モバイル用
    searchOpen: false,
    dashboardInboxOpen: false,
    dashboardIncompleteOpen: true, // 未完了のTODOは常に全件表示がデフォルト（トグルボタンで非表示にはできる）
    pendingTodoProjectAssignId: null // 新規プロジェクト作成モーダルを閉じた後、このTODOへ自動でprojectIdを割り当てる
  });

  function setView(view) {
    store.setState({ currentView: view, bulkMode: false, bulkSelection: [], sidebarOpen: false });
  }

  function toggleProjectExpanded(id) {
    var ids = store.getState().expandedProjectIds;
    var next = ids.indexOf(id) >= 0 ? ids.filter(function (x) { return x !== id; }) : ids.concat([id]);
    store.setState({ expandedProjectIds: next });
  }

  function openTodoDetail(id) {
    store.setState({ todoDetailId: id });
  }
  function closeTodoDetail() {
    store.setState({ todoDetailId: null });
  }

  function openProjectForm(id) {
    store.setState({ projectFormId: id || 'new' });
  }
  function closeProjectForm() {
    // pendingTodoProjectAssignIdもここでまとめて消す。作成成功時はprojectForm.js側で使い終わってから
    // closeProjectForm()を呼ぶので問題なく、キャンセル時は次に別のプロジェクトを作った時に
    // 古いTODOへ誤って割り当てられてしまうのを防ぐ。
    store.setState({ projectFormId: null, pendingTodoProjectAssignId: null });
  }
  function setPendingTodoProjectAssignId(id) {
    store.setState({ pendingTodoProjectAssignId: id });
  }

  function openTemplateForm(id) {
    store.setState({ templateFormId: id || 'new' });
  }
  function closeTemplateForm() {
    store.setState({ templateFormId: null });
  }

  function setBulkMode(on) {
    store.setState({ bulkMode: on, bulkSelection: on ? store.getState().bulkSelection : [] });
  }
  function toggleBulkSelect(id) {
    var sel = store.getState().bulkSelection;
    var next = sel.indexOf(id) >= 0 ? sel.filter(function (x) { return x !== id; }) : sel.concat([id]);
    store.setState({ bulkSelection: next });
  }
  function clearBulkSelection() {
    store.setState({ bulkSelection: [], bulkMode: false });
  }

  function setArchiveTab(tab) {
    store.setState({ archiveTab: tab });
  }

  function setProjectListFilter(filter) {
    store.setState({ projectListFilter: filter });
  }

  function toggleSidebar() {
    store.setState({ sidebarOpen: !store.getState().sidebarOpen });
  }

  function openSearch() {
    store.setState({ searchOpen: true });
  }
  function closeSearch() {
    store.setState({ searchOpen: false });
  }

  function toggleDashboardInbox() {
    store.setState({ dashboardInboxOpen: !store.getState().dashboardInboxOpen });
  }

  function toggleDashboardIncomplete() {
    store.setState({ dashboardIncompleteOpen: !store.getState().dashboardIncompleteOpen });
  }

  App.Store.ui = {
    getState: store.getState,
    setView: setView,
    toggleProjectExpanded: toggleProjectExpanded,
    openTodoDetail: openTodoDetail,
    closeTodoDetail: closeTodoDetail,
    openProjectForm: openProjectForm,
    closeProjectForm: closeProjectForm,
    setPendingTodoProjectAssignId: setPendingTodoProjectAssignId,
    openTemplateForm: openTemplateForm,
    closeTemplateForm: closeTemplateForm,
    setBulkMode: setBulkMode,
    toggleBulkSelect: toggleBulkSelect,
    clearBulkSelection: clearBulkSelection,
    setArchiveTab: setArchiveTab,
    setProjectListFilter: setProjectListFilter,
    toggleSidebar: toggleSidebar,
    openSearch: openSearch,
    closeSearch: closeSearch,
    toggleDashboardInbox: toggleDashboardInbox,
    toggleDashboardIncomplete: toggleDashboardIncomplete,
    subscribe: store.subscribe
  };
})(window.TodoApp = window.TodoApp || {});
