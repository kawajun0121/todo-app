/*
 役割: データ構造のドキュメント（JSDoc型定義のみ。実行時の処理は何もない）。
 VSCode等のエディタがこれを読み込むと、他のファイルで補完・型チェックのヒントに使える。
 依存: なし

 【Claude Codeへ機能追加を頼むときのヒント】
 「Todoにタグを追加したい」のように項目を増やしたい場合は、
 まずこのファイルの型定義に項目を足すよう伝えると、変更範囲を把握しやすくなります。
*/

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string|null} deadline - 'YYYY-MM-DD'
 * @property {'active'|'on_hold'|'completed'} status
 * @property {string} memo
 * @property {number} order - ダッシュボード等でのドラッグ並び替え用（小さいほど先）
 * @property {boolean} archived
 * @property {string|null} archivedAt - ISO datetime
 * @property {boolean} [deleted] - true ならトゥームストーン（削除済み）。クラウド同期で他端末に削除を伝えるための目印
 * @property {string|null} [deletedAt] - ISO datetime
 * @property {string} createdAt - ISO datetime
 * @property {string} updatedAt - ISO datetime
 */

/**
 * @typedef {Object} SubTask
 * @property {string} id
 * @property {string} title
 * @property {boolean} done
 */

/**
 * @typedef {Object} RecurrenceRule
 * @property {'daily'|'weekly'|'monthly'|'yearly'} freq
 * @property {number} interval
 * @property {number[]} [byWeekday] - 将来「毎週月曜」等に対応するための予約フィールド
 * @property {number|'last'} [byMonthday] - 将来「毎月末」等に対応するための予約フィールド
 */

/**
 * @typedef {Object} Todo
 * @property {string} id
 * @property {string} title
 * @property {string|null} projectId - nullはInbox
 * @property {'high'|'medium'|'low'} importance
 * @property {string|null} startDate - 'YYYY-MM-DD'
 * @property {string|null} dueDate - 'YYYY-MM-DD'
 * @property {'not_started'|'in_progress'|'waiting'|'completed'} status
 * @property {string} memo
 * @property {boolean} isDelegated - 先行依頼（重要度とは独立した属性）
 * @property {string} delegateTo
 * @property {string|null} delegatedAt - 'YYYY-MM-DD'
 * @property {string|null} waitingDeadline - 'YYYY-MM-DD'（回答希望日）
 * @property {string|null} reminderAt - ISO datetime（将来のブラウザ通知用）
 * @property {RecurrenceRule|null} recurrence
 * @property {string|null} recurrenceParentId
 * @property {SubTask[]} subtasks
 * @property {number} order - Inbox／プロジェクト内でのドラッグ並び替え用（小さいほど先）
 * @property {boolean} archived
 * @property {string|null} archivedAt
 * @property {boolean} [deleted] - true ならトゥームストーン（削除済み）。クラウド同期で他端末に削除を伝えるための目印
 * @property {string|null} [deletedAt] - ISO datetime
 * @property {string|null} completedAt
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ProjectTemplateItem
 * @property {string} title
 * @property {'high'|'medium'|'low'} importance
 */

/**
 * @typedef {Object} ProjectTemplate
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {ProjectTemplateItem[]} todoTemplates
 * @property {boolean} [deleted] - true ならトゥームストーン（削除済み）。クラウド同期で他端末に削除を伝えるための目印
 * @property {string|null} [deletedAt] - ISO datetime
 * @property {string} createdAt
 * @property {string} updatedAt - クラウド同期のマージ判定にも使う
 */

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {'todo'|'project'} entityType
 * @property {string} entityId
 * @property {string} timestamp - ISO datetime
 * @property {string} action
 * @property {string} description - 日本語の完成文
 */
