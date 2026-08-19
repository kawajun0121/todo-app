/*
 役割: 最小限のpub-subストア生成関数。すべてのstore/*.jsの土台。
 依存: なし。
*/
(function (App) {
  'use strict';
  App.Store = App.Store || {};

  function createStore(initialState) {
    var state = initialState;
    var listeners = [];

    function getState() {
      return state;
    }

    // patch: オブジェクト（浅いマージ） または (state)=>オブジェクト の関数
    function setState(patch) {
      var partial = typeof patch === 'function' ? patch(state) : patch;
      state = Object.assign({}, state, partial);
      listeners.forEach(function (fn) {
        fn(state);
      });
    }

    function subscribe(listener) {
      listeners.push(listener);
      return function unsubscribe() {
        listeners = listeners.filter(function (fn) {
          return fn !== listener;
        });
      };
    }

    return { getState: getState, setState: setState, subscribe: subscribe };
  }

  App.Store.createStore = createStore;
})(window.TodoApp = window.TodoApp || {});
