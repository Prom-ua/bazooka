'use strict';

// polyfills
/* eslint-disable no-extend-native, no-undef */
var MutationObserver = window.MutationObserver
  || window.WebKitMutationObserver
  || window.MozMutationObserver;

if (!MutationObserver) {
  MutationObserver = require('mutation-observer');
}

if (!Function.prototype.bind) {
  Function.prototype.bind = require("function-bind");
}
/* eslint-enable no-extend-native, no-undef */
// /polyfills


var _bazId = 0;
var nodesComponentsRegistry = {};
var componentsRegistry = {};
var wrappersRegistry = {};

function _getOrRequireComponent(name) {
  if (componentsRegistry[name] === void 0) {
    componentsRegistry[name] = require(name);
  }

  return componentsRegistry[name];
}

function _bindComponentToNode(wrappedNode, componentName) {
  var bazId = wrappedNode.id;

  if (nodesComponentsRegistry[bazId] === void 0) {
    nodesComponentsRegistry[bazId] = [];
  }

  if (nodesComponentsRegistry[bazId].indexOf(componentName) === -1) {
    nodesComponentsRegistry[bazId].push(componentName);
    var component = _getOrRequireComponent(componentName);
    var bazFunc;

    if (component.bazFunc) {
      bazFunc = component.bazFunc;
    } else {
      bazFunc = component;
    }

    bazFunc(wrappedNode.__wrapped__);
  }
}

function BazookaWrapper(node) {
  var bazId = node.getAttribute('data-bazid');

  if (bazId == null) {
    bazId = (_bazId++).toString();
    node.setAttribute('data-bazid', bazId);
    wrappersRegistry[bazId] = this;
  }

  this.__wrapped__ = node;
  /**
   * Internal id
   * @name Bazooka.id
   * @type {string}
   * @memberof Bazooka
   * @instance
   */
  this.id = bazId;
}

BazookaWrapper.prototype.constructor = BazookaWrapper;

function _wrapAndBindNode(node) {
  var componentName = node.getAttribute('data-bazooka');
  var wrappedNode = new BazookaWrapper(node);

  _bindComponentToNode(wrappedNode, componentName);
}

/** @class Bazooka */

/**
 * @namespace BazComponent
 * @description Interface of component, required by [Bazooka.refresh]{@link module:Bazooka.refresh}
 */

/**
 * @name simple
 * @func
 * @memberof BazComponent
 * @param {node} - bound DOM node
 * @description CommonJS module written only with Bazooka interface to be used with `data-bazooka`
 * @example
 * ```javascript
 *   module.exports = function bazFunc(node) {}
 * ```
 */

/**
 * @name universal
 * @namespace BazComponent.universal
 * @description CommonJS module with Bazooka interface, so it can be used both in `data-bazooka`
 * and in another CommonJS modules via `require()`
 * @example
 * ```javascript
 *   function trackEvent(category, action, label) {}
 *   module.exports = {
 *     bazFunc: function bazFunc(node) { node.onclick = trackEvent.bind(…) },
 *     trackEvent: trackEvent,
 *   }
 * ```
 */

/**
 * @name bazFunc
 * @memberof BazComponent.universal
 * @func
 * @param {node} - bound DOM node
 * @description Component's binding function
 */

/**
 * @func
 * @param {node|BazookaWrapper} value - DOM node or wrapped node
 * @returns {BazookaWrapper}
 * @example
 * ```javascript
 *   var Baz = require('bazooka');
 *   var $baz = Baz(node);
 * ```
 */
var Bazooka = function (value) {
  if (value instanceof BazookaWrapper) {
    return value;
  }

  return new BazookaWrapper(value);
};

/** @module {function} Bazooka */
/**
 * Reference to {@link BazookaWrapper} class
 * @name BazookaWrapper
 */
Bazooka.BazookaWrapper = BazookaWrapper;

Bazooka.h = require('./helpers.js');

/**
 * Parse and bind bazooka components to nodes without bound components
 * @func refresh
 * @param {node} [rootNode=document.body] - DOM node, children of which will be checked for `data-bazooka`
 * @static
 */
Bazooka.refresh = function (rootNode) {
  rootNode = rootNode || document.body;

  for (var bazId in wrappersRegistry) {
    if (wrappersRegistry[bazId] && !wrappersRegistry[bazId].__wrapped__.parentNode) {
      wrappersRegistry[bazId] = null;
      nodesComponentsRegistry[bazId] = [];
    }
  }

  Array.prototype.forEach.call(
    rootNode.querySelectorAll("[data-bazooka]:not([data-bazid])"),
    _wrapAndBindNode
  );
};

function _observedMutationCallback(mutation) {
  Bazooka.refresh(mutation.target);
}

function _MutationObserverCallback(mutations) {
  mutations.forEach(_observedMutationCallback);
}

/**
 * Watch for new nodes with `data-bazooka`. No need to run {@link Bazooka.refresh} before this. It will be called automatically.
 * @func watch
 * @param {node} [rootNode=document.body] - DOM node, children of which will be watched for `data-bazooka`
 * @static
 * @returns {function} Unwatch function
 */
Bazooka.watch = function (rootNode) {
  rootNode = rootNode || document.body;

  Bazooka.refresh(rootNode);

  var observer = new MutationObserver(_MutationObserverCallback);

  observer.observe(rootNode, {childList: true, subtree: true});

  return observer.disconnect.bind(observer);
};

module.exports = Bazooka;
