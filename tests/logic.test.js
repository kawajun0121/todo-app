/*
 役割: logic層（純粋関数）の検証テスト本体。tests/logic.test.htmlから読み込む。
 依存: src/logic/*.js, tests/testRunner.js
 日付は実行日に依存しないよう、すべて dateUtils.todayISO() からの相対日付で組み立てる。
*/
(function () {
  'use strict';
  var App = window.TodoApp;
  var du = App.Logic.dateUtils;
  var T = window.TestRunner;

  var today = du.todayISO();
  var yesterday = du.addDays(today, -1);
  var tomorrow = du.addDays(today, 1);

  function todo(overrides) {
    return Object.assign({
      id: App.Logic.id.generateId(),
      title: 'テスト用TODO',
      projectId: 'p1',
      importance: 'medium',
      startDate: null,
      dueDate: null,
      status: 'not_started',
      memo: '',
      isDelegated: false,
      delegateTo: '',
      delegatedAt: null,
      waitingDeadline: null,
      reminderAt: null,
      recurrence: null,
      recurrenceParentId: null,
      subtasks: [],
      archived: false
    }, overrides);
  }

  // --- progress.js ---
  T.test('進捗計算: 完了/残り/重要/待機中/期限切れを正しく集計する', function () {
    var project = { id: 'p1' };
    var todos = [
      todo({ status: 'completed', importance: 'low' }),
      todo({ status: 'not_started', importance: 'high', dueDate: yesterday }),
      todo({ status: 'waiting', importance: 'medium' }),
      todo({ status: 'in_progress', importance: 'high' })
    ];
    var stats = App.Logic.progress.computeProjectStats(project, todos);
    T.assertEqual(stats.total, 4, 'total');
    T.assertEqual(stats.completed, 1, 'completed');
    T.assertEqual(stats.remaining, 3, 'remaining');
    T.assertEqual(stats.important, 2, 'important（完了除く重要度高）');
    T.assertEqual(stats.waiting, 1, 'waiting');
    T.assertEqual(stats.overdue, 1, 'overdue');
    T.assertEqual(stats.progressPct, 25, 'progressPct');
  });

  T.test('進捗計算: TODOが0件のプロジェクトは進捗0%', function () {
    var stats = App.Logic.progress.computeProjectStats({ id: 'p2' }, []);
    T.assertEqual(stats.progressPct, 0, 'progressPct');
    T.assertEqual(stats.total, 0, 'total');
  });

  // --- smartLists.js ---
  T.test('スマート一覧「今日」: 今日期限かつ未完了のみ抽出する', function () {
    var todos = [
      todo({ dueDate: today, status: 'not_started' }),
      todo({ dueDate: today, status: 'completed' }),
      todo({ dueDate: tomorrow, status: 'not_started' })
    ];
    var result = App.Logic.smartLists.getList('today', todos);
    T.assertEqual(result.length, 1, '今日期限で未完了は1件のはず');
  });

  T.test('スマート一覧「期限切れ」: 期限が過去かつ未完了のみ抽出する', function () {
    var todos = [
      todo({ dueDate: yesterday, status: 'not_started' }),
      todo({ dueDate: yesterday, status: 'completed' }),
      todo({ dueDate: tomorrow, status: 'not_started' })
    ];
    var result = App.Logic.smartLists.getList('overdue', todos);
    T.assertEqual(result.length, 1, '期限切れ未完了は1件のはず');
  });

  T.test('スマート一覧「先行依頼」: isDelegated=trueかつ未完了のみ抽出する', function () {
    var todos = [
      todo({ isDelegated: true, status: 'waiting' }),
      todo({ isDelegated: true, status: 'completed' }),
      todo({ isDelegated: false, status: 'not_started' })
    ];
    var result = App.Logic.smartLists.getList('delegated', todos);
    T.assertEqual(result.length, 1, '未実行の先行依頼は1件のはず');
  });

  T.test('スマート一覧「Inbox」: projectIdがnullのTODOのみ抽出する', function () {
    var todos = [
      todo({ projectId: null, status: 'not_started' }),
      todo({ projectId: 'p1', status: 'not_started' })
    ];
    var result = App.Logic.smartLists.getList('inbox', todos);
    T.assertEqual(result.length, 1, 'Inboxは1件のはず');
  });

  // --- waitingStatus.js ---
  T.test('待機期限ラベル: 待機期限が今日なら today', function () {
    var t = todo({ status: 'waiting', waitingDeadline: today });
    var label = App.Logic.waitingStatus.getWaitingLabel(t);
    T.assertEqual(label.type, 'today', 'type');
  });

  T.test('待機期限ラベル: 待機期限が明日なら tomorrow', function () {
    var t = todo({ status: 'waiting', waitingDeadline: tomorrow });
    var label = App.Logic.waitingStatus.getWaitingLabel(t);
    T.assertEqual(label.type, 'tomorrow', 'type');
  });

  T.test('待機期限ラベル: 待機期限を過ぎていたら overdue かつ超過日数が正しい', function () {
    var twoDaysAgo = du.addDays(today, -2);
    var t = todo({ status: 'waiting', waitingDeadline: twoDaysAgo });
    var label = App.Logic.waitingStatus.getWaitingLabel(t);
    T.assertEqual(label.type, 'overdue', 'type');
    T.assertEqual(label.daysOver, 2, 'daysOver');
  });

  T.test('フォローアップ必要判定: 待機期限超過の待機中TODOのみtrue', function () {
    T.assertTrue(App.Logic.waitingStatus.needsFollowUp(todo({ status: 'waiting', waitingDeadline: yesterday })), '超過は必要');
    T.assertTrue(!App.Logic.waitingStatus.needsFollowUp(todo({ status: 'waiting', waitingDeadline: tomorrow })), '未到達は不要');
    T.assertTrue(!App.Logic.waitingStatus.needsFollowUp(todo({ status: 'not_started', waitingDeadline: yesterday })), '待機中でなければ不要');
  });

  // --- recurrence.js ---
  T.test('繰り返し計算: 毎日・開始日と期限の間隔を保ったまま次回分を計算する', function () {
    var dueDate = du.addDays(today, 2);
    var t = todo({ startDate: today, dueDate: dueDate, recurrence: { freq: 'daily', interval: 1 } });
    var next = App.Logic.recurrence.buildNextOccurrence(t);
    T.assertEqual(next.dueDate, du.addDays(dueDate, 1), '次回の期限');
    T.assertEqual(next.startDate, du.addDays(today, 1), '次回の開始日（間隔を維持）');
    T.assertEqual(next.status, 'not_started', '次回は未着手から始まる');
  });

  T.test('繰り返し計算: recurrenceがなければnullを返す', function () {
    var t = todo({ recurrence: null });
    T.assertEqual(App.Logic.recurrence.buildNextOccurrence(t), null, 'null');
  });

  // --- search.js ---
  T.test('横断検索: プロジェクト名・TODOメモの両方から一致するものを返す', function () {
    var projects = [{ name: '民泊2軒目', category: '民泊', memo: '' }];
    var todos = [{ title: '見積依頼', memo: '工務店へ確認', delegateTo: '' }];
    var byProjectName = App.Logic.search.searchAll(projects, todos, '民泊');
    T.assertEqual(byProjectName.projects.length, 1, 'プロジェクト名で一致');
    var byMemo = App.Logic.search.searchAll(projects, todos, '工務店');
    T.assertEqual(byMemo.todos.length, 1, 'TODOメモで一致');
  });

  function showReport() {
    T.report('results');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showReport);
  } else {
    showReport();
  }
})();
