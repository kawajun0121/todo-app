// 役割: 日付関連の共通処理。依存: なし。
(function (App) {
  'use strict';
  App.Logic = App.Logic || {};

  // ローカルタイムゾーンで 'YYYY-MM-DD' を返す
  function toDateStr(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function todayISO() {
    return toDateStr(new Date());
  }

  function nowISO() {
    return new Date().toISOString();
  }

  // 'YYYY-MM-DD' -> Date（ローカル midnight）
  function parseDate(iso) {
    if (!iso) return null;
    var parts = iso.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  // ISO日付文字列は辞書順=時系列順なので単純比較でOK
  function isBefore(a, b) {
    if (!a || !b) return false;
    return a < b;
  }

  function isAfter(a, b) {
    if (!a || !b) return false;
    return a > b;
  }

  function isToday(iso) {
    return !!iso && iso === todayISO();
  }

  function isPast(iso) {
    return !!iso && iso < todayISO();
  }

  function diffDays(fromISO, toISO) {
    if (!fromISO || !toISO) return null;
    var from = parseDate(fromISO);
    var to = parseDate(toISO);
    var ms = to.getTime() - from.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  function addDays(iso, days) {
    var d = parseDate(iso);
    d.setDate(d.getDate() + days);
    return toDateStr(d);
  }

  function addMonths(iso, months) {
    var d = parseDate(iso);
    var day = d.getDate();
    d.setMonth(d.getMonth() + months);
    // 月末をまたぐ場合のズレを防止（例: 1/31 + 1か月 = 2/28）
    if (d.getDate() !== day) {
      d.setDate(0);
    }
    return toDateStr(d);
  }

  function addYears(iso, years) {
    var d = parseDate(iso);
    d.setFullYear(d.getFullYear() + years);
    return toDateStr(d);
  }

  // 今日から今週の日曜日までの範囲かどうか
  function endOfWeekISO() {
    var d = new Date();
    var day = d.getDay(); // 0=日
    var diff = 6 - day + (day === 0 ? 0 : 0);
    var daysUntilSunday = (7 - day) % 7;
    d.setDate(d.getDate() + daysUntilSunday);
    return toDateStr(d);
  }

  function formatDateJP(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    return Number(parts[1]) + '/' + Number(parts[2]);
  }

  function formatDateTimeJP(isoDateTime) {
    if (!isoDateTime) return '';
    var d = new Date(isoDateTime);
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return m + '/' + day + ' ' + h + ':' + min;
  }

  App.Logic.dateUtils = {
    todayISO: todayISO,
    nowISO: nowISO,
    parseDate: parseDate,
    isBefore: isBefore,
    isAfter: isAfter,
    isToday: isToday,
    isPast: isPast,
    diffDays: diffDays,
    addDays: addDays,
    addMonths: addMonths,
    addYears: addYears,
    endOfWeekISO: endOfWeekISO,
    formatDateJP: formatDateJP,
    formatDateTimeJP: formatDateTimeJP
  };
})(window.TodoApp = window.TodoApp || {});
