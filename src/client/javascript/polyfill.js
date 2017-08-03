/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2017, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

module.exports = function() {

  //
  // For browsers without "console" for some reason
  //
  (function() {
    window.console    = window.console    || {};
    console.log       = console.log       || function() {};
    console.debug     = console.debug     || console.log;
    console.error     = console.error     || console.log;
    console.warn      = console.warn      || console.log;
    console.group     = console.group     || console.log;
    console.groupEnd  = console.groupEnd  || console.log;
  })();

  //
  // Add certain methods to global objects
  //
  (['forEach', 'every', 'map']).forEach(function(n) {
    (['HTMLCollection', 'NodeList', 'FileList']).forEach(function(p) {
      if ( window[p] ) {
        window[p].prototype[n] = Array.prototype[n];
      }
    });
  });

  //
  // CustomEvent for IE
  //
  (function() {
    function CustomEvent(event, params) {
      params = params || {bubbles: false, cancelable: false, detail: window.undefined};

      var evt = document.createEvent( 'CustomEvent' );
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    }

    if ( window.navigator.userAgent.match(/MSIE|Edge|Trident/) ) {
      CustomEvent.prototype = window.Event.prototype;
      window.CustomEvent = CustomEvent;
    }
  })();

  //
  // MouseEvent
  //
  (function() {
    /*eslint no-new: 0*/
    try {
      new window.MouseEvent('test');
      return;
    } catch (e) {
    }

    function MouseEvent(eventType, params) {
      params = params || {bubbles: false, cancelable: false};

      var mouseEvent = document.createEvent('MouseEvent');
      mouseEvent.initMouseEvent(eventType, params.bubbles, params.cancelable, window, 0, 0, 0, 0, 0, false, false, false, false, 0, params.relatedTarget);
      return mouseEvent;
    }

    MouseEvent.prototype = Event.prototype;
    window.MouseEvent = MouseEvent;
  })();

  //
  // Object(s)
  //
  (function() {
    if ( typeof Object.assign !== 'function' ) {
      Object.assign = function(target, varArgs) { // .length of function is 2
        if ( target === null ) { // TypeError if undefined or null
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var to = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];
          if ( nextSource !== null ) { // Skip over if undefined or null
            for (var nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      };
    }

  })();

  //
  // Arrays
  //
  (function() {
    // https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
    if ( !Array.prototype.findIndex ) {
      Object.defineProperty(Array.prototype, 'findIndex', {
        value: function(predicate) {
          // 1. Let O be ? ToObject(this value).
          if ( !this ) {
            throw new TypeError('"this" is null or not defined');
          }

          var o = Object(this);

          // 2. Let len be ? ToLength(? Get(O, "length")).
          var len = o.length >>> 0;

          // 3. If IsCallable(predicate) is false, throw a TypeError exception.
          if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
          }

          // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
          var thisArg = arguments[1];

          // 5. Let k be 0.
          var k = 0;

          // 6. Repeat, while k < len
          while (k < len) {
            // a. Let Pk be ! ToString(k).
            // b. Let kValue be ? Get(O, Pk).
            // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
            // d. If testResult is true, return k.
            var kValue = o[k];
            if (predicate.call(thisArg, kValue, k, o)) {
              return k;
            }
            // e. Increase k by 1.
            k++;
          }

          // 7. Return -1.
          return -1;
        }
      });
    }
  })();

};
