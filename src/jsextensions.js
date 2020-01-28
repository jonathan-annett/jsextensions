/* non-minified concatenated source, built Tue Jan 28 18:37:06 AEDT 2020 from extensions.js */
/* js-sha1 */
/*
 * [js-sha1]{@link https://github.com/emn178/js-sha1}
 *
 * @version 0.6.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2017
 * @license MIT
 */
/*jslint bitwise: true */
(function() {
  'use strict';

  var root = typeof window === 'object' ? window : {};
  var NODE_JS = !root.JS_SHA1_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = global;
  }
  var COMMON_JS = !root.JS_SHA1_NO_COMMON_JS && typeof module === 'object' && module.exports;
  var AMD = typeof define === 'function' && define.amd;
  var HEX_CHARS = '0123456789abcdef'.split('');
  var EXTRA = [-2147483648, 8388608, 32768, 128];
  var SHIFT = [24, 16, 8, 0];
  var OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];

  var blocks = [];

  var createOutputMethod = function (outputType) {
    return function (message) {
      return new Sha1(true).update(message)[outputType]();
    };
  };

  var createMethod = function () {
    var method = createOutputMethod('hex');
    if (NODE_JS) {
      method = nodeWrap(method);
    }
    method.create = function () {
      return new Sha1();
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createOutputMethod(type);
    }
    return method;
  };

  var nodeWrap = function (method) {
    var crypto = eval("require('crypto')");
    var Buffer = eval("require('buffer').Buffer");
    var nodeMethod = function (message) {
      if (typeof message === 'string') {
        return crypto.createHash('sha1').update(message, 'utf8').digest('hex');
      } else if (message.constructor === ArrayBuffer) {
        message = new Uint8Array(message);
      } else if (message.length === undefined) {
        return method(message);
      }
      return crypto.createHash('sha1').update(new Buffer(message)).digest('hex');
    };
    return nodeMethod;
  };

  function Sha1(sharedMemory) {
    if (sharedMemory) {
      blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
      blocks[4] = blocks[5] = blocks[6] = blocks[7] =
      blocks[8] = blocks[9] = blocks[10] = blocks[11] =
      blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      this.blocks = blocks;
    } else {
      this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    this.h0 = 0x67452301;
    this.h1 = 0xEFCDAB89;
    this.h2 = 0x98BADCFE;
    this.h3 = 0x10325476;
    this.h4 = 0xC3D2E1F0;

    this.block = this.start = this.bytes = this.hBytes = 0;
    this.finalized = this.hashed = false;
    this.first = true;
  }

  Sha1.prototype.update = function (message) {
    if (this.finalized) {
      return;
    }
    var notString = typeof(message) !== 'string';
    if (notString && message.constructor === root.ArrayBuffer) {
      message = new Uint8Array(message);
    }
    var code, index = 0, i, length = message.length || 0, blocks = this.blocks;

    while (index < length) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = this.block;
        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }

      if(notString) {
        for (i = this.start; index < length && i < 64; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < 64; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }

      this.lastByteIndex = i;
      this.bytes += i - this.start;
      if (i >= 64) {
        this.block = blocks[16];
        this.start = i - 64;
        this.hash();
        this.hashed = true;
      } else {
        this.start = i;
      }
    }
    if (this.bytes > 4294967295) {
      this.hBytes += this.bytes / 4294967296 << 0;
      this.bytes = this.bytes % 4294967296;
    }
    return this;
  };

  Sha1.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex;
    blocks[16] = this.block;
    blocks[i >> 2] |= EXTRA[i & 3];
    this.block = blocks[16];
    if (i >= 56) {
      if (!this.hashed) {
        this.hash();
      }
      blocks[0] = this.block;
      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
      blocks[4] = blocks[5] = blocks[6] = blocks[7] =
      blocks[8] = blocks[9] = blocks[10] = blocks[11] =
      blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
    blocks[15] = this.bytes << 3;
    this.hash();
  };

  Sha1.prototype.hash = function () {
    var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4;
    var f, j, t, blocks = this.blocks;

    for(j = 16; j < 80; ++j) {
      t = blocks[j - 3] ^ blocks[j - 8] ^ blocks[j - 14] ^ blocks[j - 16];
      blocks[j] =  (t << 1) | (t >>> 31);
    }

    for(j = 0; j < 20; j += 5) {
      f = (b & c) | ((~b) & d);
      t = (a << 5) | (a >>> 27);
      e = t + f + e + 1518500249 + blocks[j] << 0;
      b = (b << 30) | (b >>> 2);

      f = (a & b) | ((~a) & c);
      t = (e << 5) | (e >>> 27);
      d = t + f + d + 1518500249 + blocks[j + 1] << 0;
      a = (a << 30) | (a >>> 2);

      f = (e & a) | ((~e) & b);
      t = (d << 5) | (d >>> 27);
      c = t + f + c + 1518500249 + blocks[j + 2] << 0;
      e = (e << 30) | (e >>> 2);

      f = (d & e) | ((~d) & a);
      t = (c << 5) | (c >>> 27);
      b = t + f + b + 1518500249 + blocks[j + 3] << 0;
      d = (d << 30) | (d >>> 2);

      f = (c & d) | ((~c) & e);
      t = (b << 5) | (b >>> 27);
      a = t + f + a + 1518500249 + blocks[j + 4] << 0;
      c = (c << 30) | (c >>> 2);
    }

    for(; j < 40; j += 5) {
      f = b ^ c ^ d;
      t = (a << 5) | (a >>> 27);
      e = t + f + e + 1859775393 + blocks[j] << 0;
      b = (b << 30) | (b >>> 2);

      f = a ^ b ^ c;
      t = (e << 5) | (e >>> 27);
      d = t + f + d + 1859775393 + blocks[j + 1] << 0;
      a = (a << 30) | (a >>> 2);

      f = e ^ a ^ b;
      t = (d << 5) | (d >>> 27);
      c = t + f + c + 1859775393 + blocks[j + 2] << 0;
      e = (e << 30) | (e >>> 2);

      f = d ^ e ^ a;
      t = (c << 5) | (c >>> 27);
      b = t + f + b + 1859775393 + blocks[j + 3] << 0;
      d = (d << 30) | (d >>> 2);

      f = c ^ d ^ e;
      t = (b << 5) | (b >>> 27);
      a = t + f + a + 1859775393 + blocks[j + 4] << 0;
      c = (c << 30) | (c >>> 2);
    }

    for(; j < 60; j += 5) {
      f = (b & c) | (b & d) | (c & d);
      t = (a << 5) | (a >>> 27);
      e = t + f + e - 1894007588 + blocks[j] << 0;
      b = (b << 30) | (b >>> 2);

      f = (a & b) | (a & c) | (b & c);
      t = (e << 5) | (e >>> 27);
      d = t + f + d - 1894007588 + blocks[j + 1] << 0;
      a = (a << 30) | (a >>> 2);

      f = (e & a) | (e & b) | (a & b);
      t = (d << 5) | (d >>> 27);
      c = t + f + c - 1894007588 + blocks[j + 2] << 0;
      e = (e << 30) | (e >>> 2);

      f = (d & e) | (d & a) | (e & a);
      t = (c << 5) | (c >>> 27);
      b = t + f + b - 1894007588 + blocks[j + 3] << 0;
      d = (d << 30) | (d >>> 2);

      f = (c & d) | (c & e) | (d & e);
      t = (b << 5) | (b >>> 27);
      a = t + f + a - 1894007588 + blocks[j + 4] << 0;
      c = (c << 30) | (c >>> 2);
    }

    for(; j < 80; j += 5) {
      f = b ^ c ^ d;
      t = (a << 5) | (a >>> 27);
      e = t + f + e - 899497514 + blocks[j] << 0;
      b = (b << 30) | (b >>> 2);

      f = a ^ b ^ c;
      t = (e << 5) | (e >>> 27);
      d = t + f + d - 899497514 + blocks[j + 1] << 0;
      a = (a << 30) | (a >>> 2);

      f = e ^ a ^ b;
      t = (d << 5) | (d >>> 27);
      c = t + f + c - 899497514 + blocks[j + 2] << 0;
      e = (e << 30) | (e >>> 2);

      f = d ^ e ^ a;
      t = (c << 5) | (c >>> 27);
      b = t + f + b - 899497514 + blocks[j + 3] << 0;
      d = (d << 30) | (d >>> 2);

      f = c ^ d ^ e;
      t = (b << 5) | (b >>> 27);
      a = t + f + a - 899497514 + blocks[j + 4] << 0;
      c = (c << 30) | (c >>> 2);
    }

    this.h0 = this.h0 + a << 0;
    this.h1 = this.h1 + b << 0;
    this.h2 = this.h2 + c << 0;
    this.h3 = this.h3 + d << 0;
    this.h4 = this.h4 + e << 0;
  };

  Sha1.prototype.hex = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;

    return HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
           HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
           HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
           HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
           HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
           HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
           HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
           HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
           HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
           HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
           HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
           HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
           HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] +
           HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
           HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
           HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
           HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] +
           HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] +
           HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] +
           HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F];
  };

  Sha1.prototype.toString = Sha1.prototype.hex;

  Sha1.prototype.digest = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;

    return [
      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,
      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,
      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,
      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,
      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF
    ];
  };

  Sha1.prototype.array = Sha1.prototype.digest;

  Sha1.prototype.arrayBuffer = function () {
    this.finalize();

    var buffer = new ArrayBuffer(20);
    var dataView = new DataView(buffer);
    dataView.setUint32(0, this.h0);
    dataView.setUint32(4, this.h1);
    dataView.setUint32(8, this.h2);
    dataView.setUint32(12, this.h3);
    dataView.setUint32(16, this.h4);
    return buffer;
  };

  var exports = createMethod();

  if (COMMON_JS) {
    module.exports = exports;
  } else {
    root.sha1 = exports;
    if (AMD) {
      define(function () {
        return exports;
      });
    }
  }
})();
/* extensions.js */
/*jshint maxerr:10000*/
/*jshint shadow:false*/
/*jshint undef:true*/
/*jshint devel:true*/
/*jshint browser:true*/
/*jshint node:true*/

/* global Proxy,performance,Symbol,Promise */

var inclusionsBegin;

(function(extensions,isNode){

    loadExtensions("boot");
    function loadExtensions (e) {
        if (typeof Object.polyfill === 'function') {
            if (e!=="boot"&&!isNode) {
                window.removeEventListener("polyfills",loadExtensions);
            }
            extensions(Object.polyfill);
            String.extensionsTest(Object.env.verbose);
            Object.notifyPollyfill('extensions.js','extensions');
        } else {
            if (e==="boot"&&!isNode) {
                window.addEventListener("polyfills",loadExtensions);
            }
        }
    }

})
(

    function extensions(extend){
        var
        jsClass  = Object.jsClass,
        isString = jsClass.getTest(""),
        cpArgs   = Function.args;

        var util     = Object.env.isNode ? require ("util") : window.util ? window.util :  (window.util=getUtil());


        Date_toJSON();

        var nodeExts,fs_extensions,Module_extensions;

        if (Object.env.isNode) {
            nodeExts = require("./extensions-node-functions.js");
            fs_extensions = nodeExts.fs_extensions;
            Module_extensions = nodeExts.Module_extensions;
        }


        extend(Object,Object_extensions);
        extend(Array,Array_extensions);
        extend(String,String_extensions);
        extend(Function,Function_extensions);
        if (Object.env.isNode) {
            extend(require("module"),Module_extensions);
            extend('fs',fs_extensions);
        }


        if (Object.env.isNode && process.argv.indexOf("--Function.startServer")>0) { Function.startServer(); }

        function isEmpty(x){
           return ([null,undefined].indexOf(x)>=0||x.length===0||x.constructor===Object&&Object.keys(x).length===0);
        }

        function getUtil() {

            return (function(require_simulator,util){
                return util({exports:{}},require_simulator);
            }) (
                /*require*/(function (dir) {


                    dir['./support/isBuffer']=dir["./isBuffer"];

                    return function require(file) {
                        return dir[file];
                    };

                })({

                       "inherits" :
                       (function (module){var exports = module.exports;
                       // paste begin:https://raw.githubusercontent.com/isaacs/inherits/master/inherits_browser.js
                           if (typeof Object.create === 'function') {
                             // implementation from standard node.js 'util' module
                             module.exports = function inherits(ctor, superCtor) {
                               if (superCtor) {
                                 ctor.super_ = superCtor
                                 ctor.prototype = Object.create(superCtor.prototype, {
                                   constructor: {
                                     value: ctor,
                                     enumerable: false,
                                     writable: true,
                                     configurable: true
                                   }
                                 })
                               }
                             };
                           } else {
                             // old school shim for old browsers
                             module.exports = function inherits(ctor, superCtor) {
                               if (superCtor) {
                                 ctor.super_ = superCtor
                                 var TempCtor = function () {}
                                 TempCtor.prototype = superCtor.prototype
                                 ctor.prototype = new TempCtor()
                                 ctor.prototype.constructor = ctor
                               }
                             }
                           }
                       // paste end:https://raw.githubusercontent.com/isaacs/inherits/master/inherits_browser.js
                       return module.exports;})({exports:{}}),
                       'is-generator-function':
                       (function (module){var exports = module.exports;
                           //paste begin:https://raw.githubusercontent.com/inspect-js/is-generator-function/master/index.js
                           'use strict';

                           var toStr = Object.prototype.toString;
                           var fnToStr = Function.prototype.toString;
                           var isFnRegex = /^\s*(?:function)?\*/;
                           var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
                           var getProto = Object.getPrototypeOf;
                           var getGeneratorFunc = function () { // eslint-disable-line consistent-return
                               if (!hasToStringTag) {
                                   return false;
                               }
                               try {
                                   return Function('return function*() {}')();
                               } catch (e) {
                               }
                           };
                           var generatorFunc = getGeneratorFunc();
                           var GeneratorFunction = generatorFunc ? getProto(generatorFunc) : {};

                           module.exports = function isGeneratorFunction(fn) {
                               if (typeof fn !== 'function') {
                                   return false;
                               }
                               if (isFnRegex.test(fnToStr.call(fn))) {
                                   return true;
                               }
                               if (!hasToStringTag) {
                                   var str = toStr.call(fn);
                                   return str === '[object GeneratorFunction]';
                               }
                               return getProto(fn) === GeneratorFunction;
                           };
                           //paste end:https://raw.githubusercontent.com/inspect-js/is-generator-function/master/index.js
                       return module.exports;})({exports :{}}),
                       "is-arguments":
                       (function (module){var exports = module.exports;
                           //paste begin: https://raw.githubusercontent.com/inspect-js/is-arguments/master/index.js
                           'use strict';

                           var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
                           var toStr = Object.prototype.toString;

                           var isStandardArguments = function isArguments(value) {
                               if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
                                   return false;
                               }
                               return toStr.call(value) === '[object Arguments]';
                           };

                           var isLegacyArguments = function isArguments(value) {
                               if (isStandardArguments(value)) {
                                   return true;
                               }
                               return value !== null &&
                                   typeof value === 'object' &&
                                   typeof value.length === 'number' &&
                                   value.length >= 0 &&
                                   toStr.call(value) !== '[object Array]' &&
                                   toStr.call(value.callee) === '[object Function]';
                           };

                           var supportsStandardArguments = (function () {
                               return isStandardArguments(arguments);
                           }());

                           isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

                           module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;
                           //paste end: https://raw.githubusercontent.com/inspect-js/is-arguments/master/index.js
                       return module.exports;})({exports :{}}),

                       "./isBuffer":
                       (function (module){var exports = module.exports;
                       // paste begin:
                           module.exports = function isBuffer(arg) {
                             return arg && typeof arg === 'object'
                               && typeof arg.copy === 'function'
                               && typeof arg.fill === 'function'
                               && typeof arg.readUInt8 === 'function';
                           }
                       // paste end:
                       return module.exports;})({exports:{}})


                   }),

                function (module,require) {var exports=module.exports;
                    //paste-begin: https://raw.githubusercontent.com/browserify/node-util/master/util.js


                    // Copyright Joyent, Inc. and other Node contributors.
                    //
                    // Permission is hereby granted, free of charge, to any person obtaining a
                    // copy of this software and associated documentation files (the
                    // "Software"), to deal in the Software without restriction, including
                    // without limitation the rights to use, copy, modify, merge, publish,
                    // distribute, sublicense, and/or sell copies of the Software, and to permit
                    // persons to whom the Software is furnished to do so, subject to the
                    // following conditions:
                    //
                    // The above copyright notice and this permission notice shall be included
                    // in all copies or substantial portions of the Software.
                    //
                    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
                    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
                    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
                    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
                    // USE OR OTHER DEALINGS IN THE SOFTWARE.

                    var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
                      function getOwnPropertyDescriptors(obj) {
                        var keys = Object.keys(obj);
                        var descriptors = {};
                        for (var i = 0; i < keys.length; i++) {
                          descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
                        }
                        return descriptors;
                      };

                    var formatRegExp = /%[sdj%]/g;
                    exports.format = function(f) {
                      var i;
                      if (!isString(f)) {
                        var objects = [];
                        for (i = 0; i < arguments.length; i++) {
                          objects.push(inspect(arguments[i]));
                        }
                        return objects.join(' ');
                      }

                      i = 1;
                      var args = arguments;
                      var len = args.length;
                      var str = String(f).replace(formatRegExp, function(x) {
                        if (x === '%%') return '%';
                        if (i >= len) return x;
                        switch (x) {
                          case '%s': return String(args[i++]);
                          case '%d': return Number(args[i++]);
                          case '%j':
                            try {
                              return JSON.stringify(args[i++]);
                            } catch (_) {
                              return '[Circular]';
                            }
                            break;
                          default:
                            return x;
                        }
                      });
                      for (var x = args[i]; i < len; x = args[++i]) {
                        if (isNull(x) || !isObject(x)) {
                          str += ' ' + x;
                        } else {
                          str += ' ' + inspect(x);
                        }
                      }
                      return str;
                    };


                    // Mark that a method should not be used.
                    // Returns a modified function which warns once by default.
                    // If --no-deprecation is set, then it is a no-op.
                    exports.deprecate = function(fn, msg) {
                      if (typeof process !== 'undefined' && process.noDeprecation === true) {
                        return fn;
                      }

                      // Allow for deprecating things in the process of starting up.
                      if (typeof process === 'undefined') {
                        return function() {
                          return exports.deprecate(fn, msg).apply(this, arguments);
                        };
                      }

                      var warned = false;
                      function deprecated() {
                        if (!warned) {
                          if (process.throwDeprecation) {
                            throw new Error(msg);
                          } else if (process.traceDeprecation) {
                            console.trace(msg);
                          } else {
                            console.error(msg);
                          }
                          warned = true;
                        }
                        return fn.apply(this, arguments);
                      }

                      return deprecated;
                    };


                    var debugs = {};
                    var debugEnvRegex = /^$/;

                    if (typeof process !=='undefined' && process.env && process.env.NODE_DEBUG) {
                      var debugEnv = process.env.NODE_DEBUG;
                      debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
                        .replace(/\*/g, '.*')
                        .replace(/,/g, '$|^')
                        .toUpperCase();
                      debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
                    }
                    exports.debuglog = function(set) {
                      set = set.toUpperCase();
                      if (!debugs[set]) {
                        if (debugEnvRegex.test(set)) {
                          var pid = process.pid;
                          debugs[set] = function() {
                            var msg = exports.format.apply(exports, arguments);
                            console.error('%s %d: %s', set, pid, msg);
                          };
                        } else {
                          debugs[set] = function() {};
                        }
                      }
                      return debugs[set];
                    };


                    /**
                     * Echos the value of a value. Trys to print the value out
                     * in the best way possible given the different types.
                     *
                     * @param {Object} obj The object to print out.
                     * @param {Object} opts Optional options object that alters the output.
                     */
                    /* legacy: obj, showHidden, depth, colors*/
                    function inspect(obj, opts) {
                      // default options
                      var ctx = {
                        seen: [],
                        stylize: stylizeNoColor
                      };
                      // legacy...
                      if (arguments.length >= 3) ctx.depth = arguments[2];
                      if (arguments.length >= 4) ctx.colors = arguments[3];
                      if (isBoolean(opts)) {
                        // legacy...
                        ctx.showHidden = opts;
                      } else if (opts) {
                        // got an "options" object
                        exports._extend(ctx, opts);
                      }
                      // set default options
                      if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
                      if (isUndefined(ctx.depth)) ctx.depth = 2;
                      if (isUndefined(ctx.colors)) ctx.colors = false;
                      if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
                      if (ctx.colors) ctx.stylize = stylizeWithColor;
                      return formatValue(ctx, obj, ctx.depth);
                    }
                    exports.inspect = inspect;


                    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
                    inspect.colors = {
                      'bold' : [1, 22],
                      'italic' : [3, 23],
                      'underline' : [4, 24],
                      'inverse' : [7, 27],
                      'white' : [37, 39],
                      'grey' : [90, 39],
                      'black' : [30, 39],
                      'blue' : [34, 39],
                      'cyan' : [36, 39],
                      'green' : [32, 39],
                      'magenta' : [35, 39],
                      'red' : [31, 39],
                      'yellow' : [33, 39]
                    };

                    // Don't use 'blue' not visible on cmd.exe
                    inspect.styles = {
                      'special': 'cyan',
                      'number': 'yellow',
                      'boolean': 'yellow',
                      'undefined': 'grey',
                      'null': 'bold',
                      'string': 'green',
                      'date': 'magenta',
                      // "name": intentionally not styling
                      'regexp': 'red'
                    };


                    function stylizeWithColor(str, styleType) {
                      var style = inspect.styles[styleType];

                      if (style) {
                        return '\u001b[' + inspect.colors[style][0] + 'm' + str +
                               '\u001b[' + inspect.colors[style][1] + 'm';
                      } else {
                        return str;
                      }
                    }


                    function stylizeNoColor(str, styleType) {
                      return str;
                    }


                    function arrayToHash(array) {
                      var hash = {};

                      array.forEach(function(val, idx) {
                        hash[val] = true;
                      });

                      return hash;
                    }


                    function formatValue(ctx, value, recurseTimes) {
                      // Provide a hook for user-specified inspect functions.
                      // Check that value is an object with an inspect function on it
                      if (ctx.customInspect &&
                          value &&
                          isFunction(value.inspect) &&
                          // Filter out the util module, it's inspect function is special
                          value.inspect !== exports.inspect &&
                          // Also filter out any prototype objects using the circular check.
                          !(value.constructor && value.constructor.prototype === value)) {
                        var ret = value.inspect(recurseTimes, ctx);
                        if (!isString(ret)) {
                          ret = formatValue(ctx, ret, recurseTimes);
                        }
                        return ret;
                      }

                      // Primitive types cannot have properties
                      var primitive = formatPrimitive(ctx, value);
                      if (primitive) {
                        return primitive;
                      }

                      // Look up the keys of the object.
                      var keys = Object.keys(value);
                      var visibleKeys = arrayToHash(keys);

                      if (ctx.showHidden) {
                        keys = Object.getOwnPropertyNames(value);
                      }

                      // IE doesn't make error fields non-enumerable
                      // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
                      if ( isError(value) &&
                           (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
                        return formatError(value);
                      }

                      // Some type of object without properties can be shortcutted.
                      if (keys.length === 0) {
                        if (isFunction(value)) {
                          var name = value.name ? ': ' + value.name : '';
                          return ctx.stylize('[Function' + name + ']', 'special');
                        }
                        if (isRegExp(value)) {
                          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
                        }
                        if (isDate(value)) {
                          return ctx.stylize(Date.prototype.toString.call(value), 'date');
                        }
                        if (isError(value)) {
                          return formatError(value);
                        }
                      }

                      var base = '', array = false, braces = ['{', '}'];

                      // Make Array say that they are Array
                      if (isArray(value)) {
                        array = true;
                        braces = ['[', ']'];
                      }

                      // Make functions say that they are functions
                      if (isFunction(value)) {
                        var n = value.name ? ': ' + value.name : '';
                        base = ' [Function' + n + ']';
                      }

                      // Make RegExps say that they are RegExps
                      if (isRegExp(value)) {
                        base = ' ' + RegExp.prototype.toString.call(value);
                      }

                      // Make dates with properties first say the date
                      if (isDate(value)) {
                        base = ' ' + Date.prototype.toUTCString.call(value);
                      }

                      // Make error with message first say the error
                      if (isError(value)) {
                        base = ' ' + formatError(value);
                      }

                      if (keys.length === 0 && (!array || value.length === 0)) {
                        return braces[0] + base + braces[1];
                      }

                      if (recurseTimes < 0) {
                        if (isRegExp(value)) {
                          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
                        } else {
                          return ctx.stylize('[Object]', 'special');
                        }
                      }

                      ctx.seen.push(value);

                      var output;
                      if (array) {
                        output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
                      } else {
                        output = keys.map(function(key) {
                          return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
                        });
                      }

                      ctx.seen.pop();

                      return reduceToSingleString(output, base, braces);
                    }


                    function formatPrimitive(ctx, value) {
                      if (isUndefined(value))
                        return ctx.stylize('undefined', 'undefined');
                      if (isString(value)) {
                        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                                 .replace(/'/g, "\\'")
                                                                 .replace(/\\"/g, '"') + '\'';
                        return ctx.stylize(simple, 'string');
                      }
                      if (isNumber(value))
                        return ctx.stylize('' + value, 'number');
                      if (isBoolean(value))
                        return ctx.stylize('' + value, 'boolean');
                      // For some reason typeof null is "object", so special case here.
                      if (isNull(value))
                        return ctx.stylize('null', 'null');
                    }


                    function formatError(value) {
                      return '[' + Error.prototype.toString.call(value) + ']';
                    }


                    function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
                      var output = [];
                      for (var i = 0, l = value.length; i < l; ++i) {
                        if (hasOwnProperty(value, String(i))) {
                          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                              String(i), true));
                        } else {
                          output.push('');
                        }
                      }
                      keys.forEach(function(key) {
                        if (!key.match(/^\d+$/)) {
                          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                              key, true));
                        }
                      });
                      return output;
                    }


                    function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
                      var name, str, desc;
                      desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
                      if (desc.get) {
                        if (desc.set) {
                          str = ctx.stylize('[Getter/Setter]', 'special');
                        } else {
                          str = ctx.stylize('[Getter]', 'special');
                        }
                      } else {
                        if (desc.set) {
                          str = ctx.stylize('[Setter]', 'special');
                        }
                      }
                      if (!hasOwnProperty(visibleKeys, key)) {
                        name = '[' + key + ']';
                      }
                      if (!str) {
                        if (ctx.seen.indexOf(desc.value) < 0) {
                          if (isNull(recurseTimes)) {
                            str = formatValue(ctx, desc.value, null);
                          } else {
                            str = formatValue(ctx, desc.value, recurseTimes - 1);
                          }
                          if (str.indexOf('\n') > -1) {
                            if (array) {
                              str = str.split('\n').map(function(line) {
                                return '  ' + line;
                              }).join('\n').substr(2);
                            } else {
                              str = '\n' + str.split('\n').map(function(line) {
                                return '   ' + line;
                              }).join('\n');
                            }
                          }
                        } else {
                          str = ctx.stylize('[Circular]', 'special');
                        }
                      }
                      if (isUndefined(name)) {
                        if (array && key.match(/^\d+$/)) {
                          return str;
                        }
                        name = JSON.stringify('' + key);
                        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
                          name = name.substr(1, name.length - 2);
                          name = ctx.stylize(name, 'name');
                        } else {
                          name = name.replace(/'/g, "\\'")
                                     .replace(/\\"/g, '"')
                                     .replace(/(^"|"$)/g, "'");
                          name = ctx.stylize(name, 'string');
                        }
                      }

                      return name + ': ' + str;
                    }


                    function reduceToSingleString(output, base, braces) {
                      var numLinesEst = 0;
                      var length = output.reduce(function(prev, cur) {
                        numLinesEst++;
                        if (cur.indexOf('\n') >= 0) numLinesEst++;
                        return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
                      }, 0);

                      if (length > 60) {
                        return braces[0] +
                               (base === '' ? '' : base + '\n ') +
                               ' ' +
                               output.join(',\n  ') +
                               ' ' +
                               braces[1];
                      }

                      return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
                    }


                    // NOTE: These type checking functions intentionally don't use `instanceof`
                    // because it is fragile and can be easily faked with `Object.create()`.
                    exports.types = //require('./support/types');
                    (function (module){var exports = module.exports;
        // Currently in sync with Node.js lib/internal/util/types.js

                        // https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9

                        'use strict';

                        var isBuffer = require('./isBuffer');


                        var isArgumentsObject = require('is-arguments');


                        var isGeneratorFunction = require('is-generator-function');

                        function uncurryThis(f) {
                          return f.call.bind(f);
                        }

                        var BigIntSupported = typeof BigInt !== 'undefined';
                        var SymbolSupported = typeof Symbol !== 'undefined';
                        var SymbolToStringTagSupported = SymbolSupported && typeof Symbol.toStringTag !== 'undefined';
                        var Uint8ArraySupported = typeof Uint8Array !== 'undefined';
                        var ArrayBufferSupported = typeof ArrayBuffer !== 'undefined';

                        if (Uint8ArraySupported && SymbolToStringTagSupported) {
                          var TypedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);

                          var TypedArrayProto_toStringTag =
                              uncurryThis(
                                Object.getOwnPropertyDescriptor(TypedArrayPrototype,
                                                                Symbol.toStringTag).get);

                        }

                        var ObjectToString = uncurryThis(Object.prototype.toString);

                        var numberValue = uncurryThis(Number.prototype.valueOf);
                        var stringValue = uncurryThis(String.prototype.valueOf);
                        var booleanValue = uncurryThis(Boolean.prototype.valueOf);

                        if (BigIntSupported) {
                          var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
                        }

                        if (SymbolSupported) {
                          var symbolValue = uncurryThis(Symbol.prototype.valueOf);
                        }

                        function checkBoxedPrimitive(value, prototypeValueOf) {
                          if (typeof value !== 'object') {
                            return false;
                          }
                          try {
                            prototypeValueOf(value);
                            return true;
                          } catch(e) {
                            return false;
                          }
                        }

                        exports.isArgumentsObject = isArgumentsObject;

                        exports.isGeneratorFunction = isGeneratorFunction;

                        // Taken from here and modified for better browser support
                        // https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
                        function isPromise(input) {
                            return (
                                (
                                    typeof Promise !== 'undefined' &&
                                    input instanceof Promise
                                ) ||
                                (
                                    input !== null &&
                                    typeof input === 'object' &&
                                    typeof input.then === 'function' &&
                                    typeof input.catch === 'function'
                                )
                            );
                        }
                        exports.isPromise = isPromise;

                        function isArrayBufferView(value) {
                          if (ArrayBufferSupported && ArrayBuffer.isView) {
                            return ArrayBuffer.isView(value);
                          }

                          return (
                            isTypedArray(value) ||
                            isDataView(value)
                          );
                        }
                        exports.isArrayBufferView = isArrayBufferView;

                        function isTypedArray(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) !== undefined;
                          } else {
                            return (
                              isUint8Array(value) ||
                              isUint8ClampedArray(value) ||
                              isUint16Array(value) ||
                              isUint32Array(value) ||
                              isInt8Array(value) ||
                              isInt16Array(value) ||
                              isInt32Array(value) ||
                              isFloat32Array(value) ||
                              isFloat64Array(value) ||
                              isBigInt64Array(value) ||
                              isBigUint64Array(value)
                            );
                          }
                        }
                        exports.isTypedArray = isTypedArray;

                        function isUint8Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'Uint8Array';
                          } else {
                            return (
                              ObjectToString(value) === '[object Uint8Array]' ||
                              // If it's a Buffer instance _and_ has a `.buffer` property,
                              // this is an ArrayBuffer based buffer; thus it's an Uint8Array
                              // (Old Node.js had a custom non-Uint8Array implementation)
                              isBuffer(value) && value.buffer !== undefined
                            );
                          }
                        }
                        exports.isUint8Array = isUint8Array;

                        function isUint8ClampedArray(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'Uint8ClampedArray';
                          } else {
                            return ObjectToString(value) === '[object Uint8ClampedArray]';
                          }
                        }
                        exports.isUint8ClampedArray = isUint8ClampedArray;

                        function isUint16Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'Uint16Array';
                          } else {
                            return ObjectToString(value) === '[object Uint16Array]';
                          }
                        }
                        exports.isUint16Array = isUint16Array;

                        function isUint32Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'Uint32Array';
                          } else {
                            return ObjectToString(value) === '[object Uint32Array]';
                          }
                        }
                        exports.isUint32Array = isUint32Array;

                        function isInt8Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'Int8Array';
                          } else {
                            return ObjectToString(value) === '[object Int8Array]';
                          }
                        }
                        exports.isInt8Array = isInt8Array;

                        function isInt16Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'Int16Array';
                          } else {
                            return ObjectToString(value) === '[object Int16Array]';
                          }
                        }
                        exports.isInt16Array = isInt16Array;

                        function isInt32Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'Int32Array';
                          } else {
                            return ObjectToString(value) === '[object Int32Array]';
                          }
                        }
                        exports.isInt32Array = isInt32Array;

                        function isFloat32Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'Float32Array';
                          } else {
                            return ObjectToString(value) === '[object Float32Array]';
                          }
                        }
                        exports.isFloat32Array = isFloat32Array;

                        function isFloat64Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'Float64Array';
                          } else {
                            return ObjectToString(value) === '[object Float64Array]';
                          }
                        }
                        exports.isFloat64Array = isFloat64Array;

                        function isBigInt64Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'BigInt64Array';
                          } else {
                            return ObjectToString(value) === '[object BigInt64Array]';
                          }
                        }
                        exports.isBigInt64Array = isBigInt64Array;

                        function isBigUint64Array(value) {
                          if (Uint8ArraySupported && SymbolToStringTagSupported) {
                            return TypedArrayProto_toStringTag(value) === 'BigUint64Array';
                          } else {
                            return ObjectToString(value) === '[object BigUint64Array]';
                          }
                        }
                        exports.isBigUint64Array = isBigUint64Array;

                        function isMapToString(value) {
                          return ObjectToString(value) === '[object Map]';
                        }
                        isMapToString.working = (
                          typeof Map !== 'undefined' &&
                          isMapToString(new Map())
                        );

                        function isMap(value) {
                          if (typeof Map === 'undefined') {
                            return false;
                          }

                          return isMapToString.working
                            ? isMapToString(value)
                            : value instanceof Map;
                        }
                        exports.isMap = isMap;

                        function isSetToString(value) {
                          return ObjectToString(value) === '[object Set]';
                        }
                        isSetToString.working = (
                          typeof Set !== 'undefined' &&
                          isSetToString(new Set())
                        );
                        function isSet(value) {
                          if (typeof Set === 'undefined') {
                            return false;
                          }

                          return isSetToString.working
                            ? isSetToString(value)
                            : value instanceof Set;
                        }
                        exports.isSet = isSet;

                        function isWeakMapToString(value) {
                          return ObjectToString(value) === '[object WeakMap]';
                        }
                        isWeakMapToString.working = (
                          typeof WeakMap !== 'undefined' &&
                          isWeakMapToString(new WeakMap())
                        );
                        function isWeakMap(value) {
                          if (typeof WeakMap === 'undefined') {
                            return false;
                          }

                          return isWeakMapToString.working
                            ? isWeakMapToString(value)
                            : value instanceof WeakMap;
                        }
                        exports.isWeakMap = isWeakMap;

                        function isWeakSetToString(value) {
                          return ObjectToString(value) === '[object WeakSet]';
                        }
                        isWeakSetToString.working = (
                          typeof WeakSet !== 'undefined' &&
                          isWeakSetToString(new WeakSet())
                        );
                        function isWeakSet(value) {
                          return isWeakSetToString(value);
                          if (typeof WeakSet === 'undefined') {
                            return false;
                          }

                          return isWeakSetToString.working
                            ? isWeakSetToString(value)
                            : value instanceof WeakSet;
                        }
                        exports.isWeakSet = isWeakSet;

                        function isArrayBufferToString(value) {
                          return ObjectToString(value) === '[object ArrayBuffer]';
                        }
                        isArrayBufferToString.working = (
                          typeof ArrayBuffer !== 'undefined' &&
                          isArrayBufferToString(new ArrayBuffer())
                        );
                        function isArrayBuffer(value) {
                          if (typeof ArrayBuffer === 'undefined') {
                            return false;
                          }

                          return isArrayBufferToString.working
                            ? isArrayBufferToString(value)
                            : value instanceof ArrayBuffer;
                        }
                        exports.isArrayBuffer = isArrayBuffer;

                        function isDataViewToString(value) {
                          return ObjectToString(value) === '[object DataView]';
                        }
                        isDataViewToString.working = (
                          typeof ArrayBuffer !== 'undefined' &&
                          typeof DataView !== 'undefined' &&
                          isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
                        );
                        function isDataView(value) {
                          if (typeof DataView === 'undefined') {
                            return false;
                          }

                          return isDataViewToString.working
                            ? isDataViewToString(value)
                            : value instanceof DataView;
                        }
                        exports.isDataView = isDataView;

                        function isSharedArrayBufferToString(value) {
                          return ObjectToString(value) === '[object SharedArrayBuffer]';
                        }
                        isSharedArrayBufferToString.working = (
                          typeof SharedArrayBuffer !== 'undefined' &&
                          isSharedArrayBufferToString(new SharedArrayBuffer())
                        );
                        function isSharedArrayBuffer(value) {
                          if (typeof SharedArrayBuffer === 'undefined') {
                            return false;
                          }

                          return isSharedArrayBufferToString.working
                            ? isSharedArrayBufferToString(value)
                            : value instanceof SharedArrayBuffer;
                        }
                        exports.isSharedArrayBuffer = isSharedArrayBuffer;

                        function isAsyncFunction(value) {
                          return ObjectToString(value) === '[object AsyncFunction]';
                        }
                        exports.isAsyncFunction = isAsyncFunction;

                        function isMapIterator(value) {
                          return ObjectToString(value) === '[object Map Iterator]';
                        }
                        exports.isMapIterator = isMapIterator;

                        function isSetIterator(value) {
                          return ObjectToString(value) === '[object Set Iterator]';
                        }
                        exports.isSetIterator = isSetIterator;

                        function isGeneratorObject(value) {
                          return ObjectToString(value) === '[object Generator]';
                        }
                        exports.isGeneratorObject = isGeneratorObject;

                        function isWebAssemblyCompiledModule(value) {
                          return ObjectToString(value) === '[object WebAssembly.Module]';
                        }
                        exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

                        function isNumberObject(value) {
                          return checkBoxedPrimitive(value, numberValue);
                        }
                        exports.isNumberObject = isNumberObject;

                        function isStringObject(value) {
                          return checkBoxedPrimitive(value, stringValue);
                        }
                        exports.isStringObject = isStringObject;

                        function isBooleanObject(value) {
                          return checkBoxedPrimitive(value, booleanValue);
                        }
                        exports.isBooleanObject = isBooleanObject;

                        function isBigIntObject(value) {
                          return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
                        }
                        exports.isBigIntObject = isBigIntObject;

                        function isSymbolObject(value) {
                          return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
                        }
                        exports.isSymbolObject = isSymbolObject;

                        function isBoxedPrimitive(value) {
                          return (
                            isNumberObject(value) ||
                            isStringObject(value) ||
                            isBooleanObject(value) ||
                            isBigIntObject(value) ||
                            isSymbolObject(value)
                          );
                        }
                        exports.isBoxedPrimitive = isBoxedPrimitive;

                        function isAnyArrayBuffer(value) {
                          return Uint8ArraySupported && (
                            isArrayBuffer(value) ||
                            isSharedArrayBuffer(value)
                          );
                        }
                        exports.isAnyArrayBuffer = isAnyArrayBuffer;

                        ['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
                          Object.defineProperty(exports, method, {
                            enumerable: false,
                            value: function() {
                              throw new Error(method + ' is not supported in userland');
                            }
                          });
                        });


                    return module.exports;})({exports:{}});

                    (function (module){var exports = module.exports;
                    // paste begin:

                    // paste end:
                    return module.exports;})({exports:{}});

                    function isArray(ar) {
                      return Array.isArray(ar);
                    }
                    exports.isArray = isArray;

                    function isBoolean(arg) {
                      return typeof arg === 'boolean';
                    }
                    exports.isBoolean = isBoolean;

                    function isNull(arg) {
                      return arg === null;
                    }
                    exports.isNull = isNull;

                    function isNullOrUndefined(arg) {
                      return arg === null;
                    }
                    exports.isNullOrUndefined = isNullOrUndefined;

                    function isNumber(arg) {
                      return typeof arg === 'number';
                    }
                    exports.isNumber = isNumber;

                    function isString(arg) {
                      return typeof arg === 'string';
                    }
                    exports.isString = isString;

                    function isSymbol(arg) {
                      //jshint -W122
                      return typeof arg === 'symbol';
                      //jshint +W122
                    }
                    exports.isSymbol = isSymbol;

                    function isUndefined(arg) {
                      return arg === void 0;
                    }
                    exports.isUndefined = isUndefined;

                    function isRegExp(re) {
                      return isObject(re) && objectToString(re) === '[object RegExp]';
                    }
                    exports.isRegExp = isRegExp;
                    exports.types.isRegExp = isRegExp;

                    function isObject(arg) {
                      return typeof arg === 'object' && arg !== null;
                    }
                    exports.isObject = isObject;

                    function isDate(d) {
                      return isObject(d) && objectToString(d) === '[object Date]';
                    }
                    exports.isDate = isDate;
                    exports.types.isDate = isDate;

                    function isError(e) {
                      return isObject(e) &&
                          (objectToString(e) === '[object Error]' || e instanceof Error);
                    }
                    exports.isError = isError;
                    exports.types.isNativeError = isError;

                    function isFunction(arg) {
                      return typeof arg === 'function';
                    }
                    exports.isFunction = isFunction;

                    function isPrimitive(arg) {
                      //jshint -W122
                      return arg === null ||
                             typeof arg === 'boolean' ||
                             typeof arg === 'number' ||
                             typeof arg === 'string' ||
                             typeof arg === 'symbol' ||  // ES6 symbol
                             typeof arg === 'undefined';

                       //jshint +W122
                    }
                    exports.isPrimitive = isPrimitive;

                    exports.isBuffer = require('./support/isBuffer');

                    function objectToString(o) {
                      return Object.prototype.toString.call(o);
                    }


                    function pad(n) {
                      return n < 10 ? '0' + n.toString(10) : n.toString(10);
                    }


                    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                                  'Oct', 'Nov', 'Dec'];

                    // 26 Feb 16:19:34
                    function timestamp() {
                      var d = new Date();
                      var time = [pad(d.getHours()),
                                  pad(d.getMinutes()),
                                  pad(d.getSeconds())].join(':');
                      return [d.getDate(), months[d.getMonth()], time].join(' ');
                    }


                    // log is just a thin wrapper to console.log that prepends a timestamp
                    exports.log = function() {
                      console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
                    };


                    /**
                     * Inherit the prototype methods from one constructor into another.
                     *
                     * The Function.prototype.inherits from lang.js rewritten as a standalone
                     * function (not on Function.prototype). NOTE: If this file is to be loaded
                     * during bootstrapping this function needs to be rewritten using some native
                     * functions as prototype setup using normal JavaScript does not work as
                     * expected during bootstrapping (see mirror.js in r114903).
                     *
                     * @param {function} ctor Constructor function which needs to inherit the
                     *     prototype.
                     * @param {function} superCtor Constructor function to inherit prototype from.
                     */
                    exports.inherits = require('inherits');


                    exports._extend = function(origin, add) {
                      // Don't do anything if add isn't an object
                      if (!add || !isObject(add)) return origin;

                      var keys = Object.keys(add);
                      var i = keys.length;
                      while (i--) {
                        origin[keys[i]] = add[keys[i]];
                      }
                      return origin;
                    };

                    function hasOwnProperty(obj, prop) {
                      return Object.prototype.hasOwnProperty.call(obj, prop);
                    }

                    var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

                    exports.promisify = function promisify(original) {
                      if (typeof original !== 'function')
                        throw new TypeError('The "original" argument must be of type Function');

                      if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
                        var fn1 = original[kCustomPromisifiedSymbol];
                        if (typeof fn1 !== 'function') {
                          throw new TypeError('The "util.promisify.custom" argument must be of type Function');
                        }
                        Object.defineProperty(fn1, kCustomPromisifiedSymbol, {
                          value: fn1, enumerable: false, writable: false, configurable: true
                        });
                        return fn1;
                      }

                      function fn() {
                        var promiseResolve, promiseReject;
                        var promise = new Promise(function (resolve, reject) {
                          promiseResolve = resolve;
                          promiseReject = reject;
                        });

                        var args = [];
                        for (var i = 0; i < arguments.length; i++) {
                          args.push(arguments[i]);
                        }
                        args.push(function (err, value) {
                          if (err) {
                            promiseReject(err);
                          } else {
                            promiseResolve(value);
                          }
                        });

                        try {
                          original.apply(this, args);
                        } catch (err) {
                          promiseReject(err);
                        }

                        return promise;
                      }

                      Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

                      if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
                        value: fn, enumerable: false, writable: false, configurable: true
                      });
                      return Object.defineProperties(
                        fn,
                        getOwnPropertyDescriptors(original)
                      );
                    };

                    exports.promisify.custom = kCustomPromisifiedSymbol;

                    function callbackifyOnRejected(reason, cb) {
                      // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
                      // Because `null` is a special error value in callbacks which means "no error
                      // occurred", we error-wrap so the callback consumer can distinguish between
                      // "the promise rejected with null" or "the promise fulfilled with undefined".
                      if (!reason) {
                        var newReason = new Error('Promise was rejected with a falsy value');
                        newReason.reason = reason;
                        reason = newReason;
                      }
                      return cb(reason);
                    }

                    function callbackify(original) {
                      if (typeof original !== 'function') {
                        throw new TypeError('The "original" argument must be of type Function');
                      }

                      // We DO NOT return the promise as it gives the user a false sense that
                      // the promise is actually somehow related to the callback's execution
                      // and that the callback throwing will reject the promise.
                      function callbackified() {
                        var args = [];
                        for (var i = 0; i < arguments.length; i++) {
                          args.push(arguments[i]);
                        }

                        var maybeCb = args.pop();
                        if (typeof maybeCb !== 'function') {
                          throw new TypeError('The last argument must be of type Function');
                        }
                        var self = this;
                        var cb = function() {
                          return maybeCb.apply(self, arguments);
                        };
                        // In true node style we process the callback on `nextTick` with all the
                        // implications (stack, `uncaughtException`, `async_hooks`)
                        original.apply(this, args)
                          .then(function(ret) { process.nextTick(cb.bind(null, null, ret)); },
                                function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)); });
                      }

                      Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
                      Object.defineProperties(callbackified,
                                              getOwnPropertyDescriptors(original));
                      return callbackified;
                    }
                    exports.callbackify = callbackify;

                    //paste-end: https://raw.githubusercontent.com/browserify/node-util/master/util.js
                    return module.exports;
                }

            );

        }

        function Object_extensions(object){

            object("isEmpty",isEmpty);

            // similar to JSON.stringify, varify converts the enumerable keys of an object
            // to javascript source that defines each key as a discrete variables
            // second option argument can be one of "var","let", or "const"

            object("varify",function varify(obj,var_,equals,comma,semi,indents,debug) {

                var

                fn_id_magic='fn_'+Math.round(Math.random()*Number.MAX_SAFE_INTEGER).toString(36),
                fn_cleanup_re=new RegExp("(?<=function anonymous\\(.*)(\\n)(?=\\))","sg"),
                fn_cleanup_re_with ='',
                fn_cleanup2_re=new RegExp("(function anonymous\\()","sg"),
                fn_cleanup2_re_with = "function (",
                fns = {},
                fn_id=function(){
                    return fn_id_magic+'.'+Object.keys(fns).length;
                },
                quoteIn='*<<',      quoteOut=">>*",
                deQuoteIn=/"\*<</g, deQuoteOut=/>>\*"/g,
                //bsEncode='{*-bs-$-bs!*}',bsDecode=/\{\*-bs-\$-bs!\*\}/g,
                bsDetect=/\\/g,bs='\\',
                unquoted=function(s) {return quoteIn+s+quoteOut;},
                resolve_unquoted=function(s) {
                    return s.replace(deQuoteIn,'')
                            .replace(deQuoteOut,'')/*
                            .replace(bsDecode,bs)*/;},
                keys = Object.keys(obj).filter(function(key){
                    return  ([null,undefined].indexOf(obj[key])<0);
                }),
                html_script_fixups = [
                    {source:"<", flags:"g", repWith:"\\u003c"},
                    {source:">", flags:"g", repWith:"\\u003e"}
                ],

                json_replacer = function(k,v) {
                    if (typeof v ==='function') {
                        var
                        id = fn_id(),
                        header = v.name==='anonymous' ? fn_cleanup2_re_with : 'function '+v.name+'(',
                        str =v.toString()
                                     .replace(fn_cleanup_re,fn_cleanup_re_with)
                                     .replace(fn_cleanup2_re,header) ;
                        fns[id]= str;

                        return unquoted('${'+id+'}');
                    }

                    if (typeof v==='object'&& v.constructor===Date) {
                        return unquoted("new Date("+v.getTime()+")");
                    }

                    if (typeof v==='object'&& v.constructor===RegExp) {
                        return unquoted("new RegExp('"+v.source.replace(bsDetect,bs)+"','"+v.flags+"')");
                    }

                    return v;
                },
                fixup_object=function(key){
                    if (debug) {
                        console.log({fixup_object:key});
                    }
                    var
                    fixed = resolve_unquoted(JSON.stringify_dates(obj[key],json_replacer,indents)),
                    re_replacer = function(re){
                        fixed=fixed.replace(new RegExp (re.source,re.flags),re.repWith);
                    },
                    inject_function = function(fn,ix){
                        if (debug) {
                            console.log({inject_function:fn_names[ix],length:fixed.length});
                        }
                        [
                            { source:"\"\\{\\$!func\\["+ix+"\\]tion!\\$\\}\"",   flags:"s",  repWith:fn },
                            { source:"(?<=function anonymous\\(.*)(\\n)(?=\\))",  flags:"sg", repWith:"" },
                            { source:"(function anonymous\\()",                  flags:"sg", repWith:"function (" }
                        ].forEach(re_replacer);
                    };

                    html_script_fixups.forEach(re_replacer);

                    //fns.forEach(inject_function);
                    fixed = fixed.renderWithObject(fns);
                    return key + equals + fixed;

                };

                if (keys.length===0) return '';


                if (var_===undefined) var_ = "var ";
                if (equals===undefined) equals = " = ";
                if (comma===undefined) comma = ',\n';
                if (semi===undefined) semi = ";";
                indents = indents===null?undefined:4;

                return var_+keys.map(fixup_object).join(comma)+semi;


            });

            object("scriptify",function scriptify(obj,name) {
                var self = {},proto={};
                var template = function scriptified() {
                    var
                    /*internal vars*/
                    self = {self:"self"};
                    return Object.defineProperties(self,proto);
                };
                var selfKeys=Object.keys(obj);
                var selfVars=selfKeys.filter(function(key){return typeof obj[key]!=='function';});
                var selfFns=selfKeys.filter(function(key){return typeof obj[key]==='function';});

                selfVars.forEach(function(key){
                    self[key]=obj[key];
                    var FN = Function;
                    proto[key]={
                        get: new FN('    return '+key+';'),
                        set: new FN('val','   '+key+'=val;'),
                        enumerable:true,
                        configurable:true
                    };
                });

                selfFns.forEach(function(key){
                    proto[key]={
                        value: obj[key],
                        enumerable:true,
                        configurable:true
                    };
                });

                return (
                    new Array (13).join(" ")+template.toString()).reindent(0)
                   .replace(/scriptified/,name)
                   .replace(/\{self:"self"\}/,

                       (
                       Object.varify(self,'{},',undefined,undefined,'')+
                       Object.varify(proto,',\n\n/*properties*/\nproto={',':',',\n','}',null)
                       ).reindent(4).trim()
                   );
            });

            object("keyCount",function keyCount(o) {
                  if (o !== Object(o))
                    throw new TypeError('Object.keyCount called on a non-object');
                  var p,c=0,isKey=Object.prototype.hasOwnProperty.bind(o);
                  for (p in o) if (isKey(p)) c++;
                  return c;
            });

            object("removeKey",function removeKey(obj,k){
                var res = obj[k];
                if (res!==undefined) {
                    delete obj[k];
                    return res;
                }
            });

            object("replaceKey",function replaceKey(obj,k,v){
                var res = obj[k];
                obj[k]=v;
                return res;
            });

            object("removeAllKeys",function removeAllKeys(obj){
                var res = Object.keys(obj);
                res.forEach(function(k){
                    delete obj[k];
                });
                return res;
            });

            object("mergeKeys",function mergeKeys(obj1,obj2,keys,keep){
                keys = keys||Object.keys(obj2);
                keys.forEach(function(k){
                    if (keep && obj1[k]!==undefined) return;
                    obj1[k]=obj2[k];
                });
                return obj1;
            });

            object("subtractKeys",function subtractKeys (obj,keys,isObject){
                var res={};
                keys = isObject ? Object.keys(keys) : keys;
                keys.forEach(function(k){
                    if (obj[k]) {
                        res[k]=obj[k];
                        delete obj[k];
                    }
                });
                return res;
            });

            object("iterateKeys",function iterateKeys(obj,fn){
                    Object.keys(obj).some(function(k,i,ks){
                        try {
                            fn(k,obj[k],i,ks);
                            return false;
                        } catch (e) {
                            return true;
                        }
                    });
                });

            var iterator = function(o,cb,k,i,ks) {
              var v = o[k];
              return cb.apply(o,[k,v,i,ks,o,typeof v]);
            },

            iterator2 = function(o,cb,k,i,ks) {
              var v = o[k];
              return cb.apply(o,[{key:k,value:v,index:i,keys:ks,obj:o,type:typeof v}]);
            };

            object("keyLoop",function keyLoop (obj,cb,m) {
                return Object.keys(obj).forEach((m?iterator2:iterator).bind(obj,obj,cb));
            });

            object("keyMap",function keyMap (obj,cb,m) {
                return Object.keys(obj).map((m?iterator2:iterator).bind(obj,obj,cb));
            });

            object("keyFilter",function keyFilter (obj,cb,m) {
              var r={},o=obj;
              Object.keys(o).filter((m?iterator2:iterator).bind(o,o,cb)).forEach(function(k){
                  r[k]=o[k];
               });
              return r;
            });

            /*
            Object_polyfills.OK=Object.keys.bind(Object);
            Object_polyfills.DP=Object.defineProperties.bind(Object);
            Object_polyfills.HIDE=function (o,x,X){
                  Object.defineProperty(o,x,{
                      enumerable:false,
                      configurable:true,
                      writable:false,
                      value : X
                  });
                  return X;
            };
            return {
                OK   : Object_polyfills.OK,
                DP   : Object_polyfills.DP,
                HIDE : Object_polyfills.HIDE
            };
            */
            var ab_now =(function(){

                if (Object.env.isNode) {
                    var perf_hooks = require("perf_hooks");
                    return perf_hooks.performance.now.bind(perf_hooks.performance);
                }

                if (typeof performance==='object') {
                    if (typeof performance.now==='function') {
                        return performance.now.bind(performance);
                    }
                }
                return Date.now.bind(Date);
            })();

            (function(obj,obj2,myfunc_a,myfunc_b){if (true) return;
                // function modeS:
                // false - unbound global, but lives in obj[fn]
                // eg
                Object.a_b_test(obj,"myfunc",10,1,false, myfunc_a, myfunc_b);
                // true      - object bound to obj, lives in obj[fn]
                // eg
                Object.a_b_test(obj,"myfunc",10,1,true, myfunc_a, myfunc_b);
                // obj2 (an object instance) - bound to obj2, but lives in obj[fn]
                // eg
                Object.a_b_test(obj,"myfunc",10,1,obj2, myfunc_a, myfunc_b);
                // Class (eg String) - fn resides in Class.prototype[fn], fn is applied/called ad hoc
            })();

            Object.a_b_test_logging=false;

            object("a_b_test",function(obj,fn,trials,loops,mode){

                if (arguments.length<6) return false;
                if (typeof fn!=='string') return false;
                if (["number","undefined"].indexOf(typeof trials)<0) return false;
                if (["number","undefined"].indexOf(typeof loops)<0) return false;
                var THIS=false,logging=Object.a_b_test_logging;
                if (typeof obj==='object') {
                    switch (mode) {
                        case false : THIS=undefined;break;
                        case true  : THIS=undefined;break;
                        default:
                        if (['function','undefined'].indexOf(typeof mode) <0 ) {
                            THIS = mode; break;
                        } else {
                            if ((obj.constructor===mode) && (typeof mode==='function')) {
                                THIS=undefined;
                            }
                        }
                    }
                }
                if (THIS===false) return false;
                var config = Object.getOwnPropertyDescriptor(obj,fn);
                if (!config) return false;
                if (!(config.writable && config.configurable) ) return false;

                var native = obj[fn];

                if (typeof native!=='function') return false;
                trials = trials || 100;
                loops = loops || 1;

                var fns=cpArgs(arguments).slice(5);
                if (fns.some(function(fn){return typeof fn !=='function';})) {
                    return false;
                }

                fns.push(native);

                var
                count    = 0,
                a_b      = 0,
                totals   = fns.map(function(){return 0;}),
                ab_count = fns.length,
                obj2     = mode,
                next_trial=function() {
                    count++;
                    if (count>=trials) {
                        use_best();
                    }
                },
                next = function (inc) {
                    a_b++;
                    if (a_b>=ab_count) {
                        a_b=0;

                    }
                    if (inc) {
                         next_trial();
                    }
                },
                names = fns.map(function(x){return x.name;}).join(",");

                function shim ()
                {
                    var
                    this_=THIS||this,
                    result,
                    start,start_,
                    finish,elapsed,compare,
                    do_loops=loops,
                    args=cpArgs(arguments),
                    err=loops===1?false:new Error ("inconsistent results");
                    try {
                        start=ab_now();
                        result=fns[a_b].apply(this_,args);
                        finish=ab_now();
                        elapsed=(finish-start);
                        totals[a_b] += elapsed;
                        if (do_loops===1){
                            console.log("trial #"+count+": invoked",fns[a_b].name,args.length,"args returning",result,"took",elapsed.toFixed(3),"msec");
                            next(true);
                        } else {
                            start_=start;
                            next(false);
                            while (--do_loops > 0) {
                                start=ab_now();
                                compare=fns[a_b].apply(this_,args);
                                finish=ab_now();
                                if (result!==compare){
                                    throw err;
                                }
                                elapsed=(finish-start);
                                totals[a_b] += elapsed;
                                next(false);
                            }
                            elapsed = finish-start_;
                            console.log("trial #"+count+": invoked",names,"(",args.length,"args)",loops,"times, returning",result,"took",elapsed.toFixed(3),"msec (",(elapsed/loops).toFixed(3),"msec per invoke)");
                            next_trial();
                        }

                    } catch (e) {
                        if (fns[a_b]!==native) {
                            //was external a/b - abandon trials
                            obj[fn]=native;//forced unhook
                            return native.apply(this_,args);
                        } else {
                            // was native
                            throw e;
                        }
                    }

                    return result;

                }

                function shim_quiet ()
                {
                    var
                    this_=THIS||this,
                    result,
                    start,start_,
                    finish,elapsed,compare,
                    do_loops=loops,
                    args=cpArgs(arguments),
                    err=loops===1?false:new Error ("inconsistent results");
                    try {
                        start=ab_now();
                        result=fns[a_b].apply(this_,args);
                        finish=ab_now();
                        elapsed=(finish-start);
                        totals[a_b] += elapsed;
                        if (do_loops===1){
                            next(true);
                        } else {
                            start_=start;
                            next(false);
                            while (--do_loops > 0) {
                                start=ab_now();
                                compare=fns[a_b].apply(this_,args);
                                finish=ab_now();
                                if (result!==compare){
                                    throw err;
                                }
                                elapsed=(finish-start);
                                totals[a_b] += elapsed;
                                next(false);
                            }
                            elapsed = finish-start_;
                            next_trial();
                        }

                    } catch (e) {
                        if (fns[a_b]!==native) {
                            //was external a/b - abandon trials
                            obj[fn]=native;//forced unhook
                            return native.apply(this_,args);
                        } else {
                            // was native
                            throw e;
                        }
                    }

                    return result;

                }


                function use_best() {
                    var
                    chr_a=97,//"a".charCodeAt(0),
                    best=Infinity,best_ix=-1;
                    for (var i=0;i<ab_count;i++) {
                        if (totals[i]<best) {
                            best=totals[i];
                            best_ix=i;
                        }
                    }
                    var average=totals[best_ix]/count;
                    if (logging) {
                        console.log(totals.map(function(total,ix){
                            return {
                                name        : fns[ix].name,
                                total       : Number(total.toFixed(3)),
                                per_trial   : Number((total/count).toFixed(3)),
                                per_invoke  : Number((total/(count*loops)).toFixed(4)),
                            };
                        }));

                        if (fns[best_ix]===native) {
                            console.log("reverting to native mode for",fn,"after",count,"tests",average,"average msec");
                        } else {
                            console.log("selected mode",String.fromCharCode(chr_a+best_ix),"for",fn,"after",count,"tests",average,"average msec");
                        }
                    }
                    config.value = fns[best_ix];
                    delete obj[fn];
                    Object.defineProperty(obj,fn,config);
                }

                config.value =logging ? shim : shim_quiet;
                delete obj[fn];
                Object.defineProperty(obj,fn,config);

            });

            object("a_b_test_async",function(obj,fn,trials,mode){

                if (arguments.length<5) return false;
                if (typeof fn!=='string') return false;
                if (["number","undefined"].indexOf(typeof trials)<0) return false;
                if (["number","undefined"].indexOf(typeof loops)<0) return false;
                var THIS=false,logging=Object.a_b_test_logging;
                if (typeof obj==='object') {
                    switch (mode) {
                        case false : THIS=undefined;break;
                        case true  : THIS=undefined;break;
                        default:
                        if (['function','undefined'].indexOf(typeof mode) <0 ) {
                            THIS = mode; break;
                        } else {
                            if ((obj.constructor===mode) && (typeof mode==='function')) {
                                THIS=undefined;
                            }
                        }
                    }
                }
                if (THIS===false) return false;
                var config = Object.getOwnPropertyDescriptor(obj,fn);
                if (!config) return false;
                if (!(config.writable && config.configurable) ) return false;

                var native = obj[fn];

                if (typeof native!=='function') return false;
                trials = trials || 100;

                var fns=cpArgs(arguments).slice(4);
                if (fns.some(function(fn){return typeof fn !=='function';})) {
                    return false;
                }

                fns.push(native);

                var
                count    = 0,
                a_b      = 0,
                totals   = fns.map(function(){return 0;}),
                ab_count = fns.length,
                obj2     = mode,
                next_trial=function() {
                    count++;
                    if (count>=trials) {
                        use_best();
                    }
                },
                next = function (inc) {
                    a_b++;
                    if (a_b>=ab_count) {
                        a_b=0;

                    }
                    if (inc) {
                         next_trial();
                    }
                },
                names = fns.map(function(x){return x.name;}).join(",");


                function shim_sync(args,this_)
                {
                    var
                    result,
                    start,start_,
                    finish,elapsed,compare;

                    try {
                        start=ab_now();
                        result=fns[a_b].apply(this_,args);
                        finish=ab_now();
                        elapsed=(finish-start);
                        totals[a_b] += elapsed;

                        console.log("trial #"+count+": invoked",fns[a_b].name,args.length,"args returning",result,"took",elapsed.toFixed(3),"msec");
                        next(true);


                    } catch (e) {
                        if (fns[a_b]!==native) {
                            //was external a/b - abandon trials
                            obj[fn]=native;//forced unhook
                            return native.apply(this_,args);
                        } else {
                            // was native
                            throw e;
                        }
                    }

                    return result;
                }

                function shim ()
                {
                    var
                    this_=THIS||this,args=cpArgs(arguments),
                    cb = args.length>0 && typeof args[args.length-1]==='function' ? args[args.length-1] : false;
                    if (!cb) return shim_sync(args,this_);

                    var
                    result,
                    start,start_,
                    finish,elapsed,compare;

                    args[args.length-1]=function() {
                        finish=ab_now();
                        elapsed=(finish-start);
                        totals[a_b] += elapsed;
                        console.log("trial #"+count+": invoked",fns[a_b].name,args.length,"args returning",result,"took",elapsed.toFixed(3),"msec");
                        next(true);
                        cb.apply(this_,cpArgs(arguments));
                    };

                    start=ab_now();
                    return fns[a_b].apply(this_,args);
                }

                function shim_sync_quiet(args,this_)
                {
                    var
                    result,
                    start,start_,
                    finish,elapsed,compare;

                    try {
                        start=ab_now();
                        result=fns[a_b].apply(this_,args);
                        finish=ab_now();
                        elapsed=(finish-start);
                        totals[a_b] += elapsed;

                        next(true);


                    } catch (e) {
                        if (fns[a_b]!==native) {
                            //was external a/b - abandon trials
                            obj[fn]=native;//forced unhook
                            return native.apply(this_,args);
                        } else {
                            // was native
                            throw e;
                        }
                    }

                    return result;
                }

                function shim_quiet ()
                {
                    var
                    this_=THIS||this,args=cpArgs(arguments),
                    cb = args.length>0 && typeof args[args.length-1]==='function' ? args[args.length-1] : false;
                    if (!cb) return shim_sync_quiet(args,this_);

                    var
                    result,
                    start,start_,
                    finish,elapsed,compare;

                    args[args.length-1]=function() {
                        finish=ab_now();
                        elapsed=(finish-start);
                        totals[a_b] += elapsed;
                        next(true);
                        cb.apply(this_,cpArgs(arguments));
                    };

                    start=ab_now();
                    return fns[a_b].apply(this_,args);
                }

                function use_best() {
                    var
                    chr_a=97,//"a".charCodeAt(0),
                    best=Infinity,best_ix=-1;
                    for (var i=0;i<ab_count;i++) {
                        if (totals[i]<best) {
                            best=totals[i];
                            best_ix=i;
                        }
                    }
                    var average=totals[best_ix]/count;
                    if (logging) {
                        console.log(totals.map(function(total,ix){
                            return {
                                name        : fns[ix].name,
                                total       : Number(total.toFixed(3)),
                                per_invoke   : Number((total/count).toFixed(3))
                            };
                        }));

                        if (fns[best_ix]===native) {
                            console.log("reverting to native mode for",fn,"after",count,"tests",average,"average msec");
                        } else {
                            console.log("selected mode",String.fromCharCode(chr_a+best_ix),"for",fn,"after",count,"tests",average,"average msec");
                        }
                    }
                    config.value = fns[best_ix];
                    delete obj[fn];
                    Object.defineProperty(obj,fn,config);
                }

                config.value =logging ? shim : shim_quiet;
                delete obj[fn];
                Object.defineProperty(obj,fn,config);

            });

            object("a_b_test_tester",function(loops,quick){

                loops=loops||1;

                var logging_backup = Object.a_b_test_logging;
                Object.a_b_test_logging=true;

                var String_prototype_indexOf=String.prototype.indexOf;

                var sample = quick ? "the quick brown fox jumps over the lazy dog" : require("fs").readFileSync("./words.txt","utf8");
                var indexOfC_lookups = (function(sep){
                    var d = {},c=0;
                    console.log("preparing lookups...");
                    var r,k,sampleSet = sample.split(sep);
                    var max = Math.min(25000,sampleSet.length);

                    while (c<max) {
                        r = Math.floor(Math.random()*sampleSet.length);
                        k = sampleSet[r];
                        if (k) {
                           sampleSet[r]=null;
                           k=k.trim();
                           d[k]=sample.indexOf(k);
                           c++;
                           if (c % 500 ===0) {
                               sampleSet  = sampleSet.filter(function(x){return x!==null;});
                               console.log("added",c,"random words, just added  [",k.padStart(20),"]",(c/(max/100)).toFixed(1),"% complete");

                           }
                        }
                    }

                    var keys= Object.keys(d),first=keys.shift(),last=keys.pop();
                    keys.splice(0,keys.length);
                    console.log("prepared",c,"lookups",first,"thru",last);
                    return d;
                })(quick ? " " : "\n");



                function indexOf_a(str) {
                    var s = this;
                    var c = s.length,l=str.length;
                    for (var i = 0; i < c ; i ++ ) {
                      if (s.substr(i,l)===str) {
                        return i;
                        }
                      }
                    return -1;
                }

                function indexOf_b(str) {
                    var s = this;
                    var c = s.length,l=str.length;
                    for (var i = 0; i < c ; i ++ ) {
                      if (s.substr(i).startsWith(str)) {
                        return i;
                        }
                      }
                    return -1;
                }

                function indexOf_c(str) {
                    var x = indexOfC_lookups[str];
                    if (x===undefined) x = String_prototype_indexOf.call(this,str);
                    return x;
                }

                Object.a_b_test(String.prototype,"indexOf",10,loops,String, indexOf_a, indexOf_b, indexOf_c);



                for(var i = 0; i < 10; i++) {
                    sample.indexOf("fox");
                    sample.indexOf("jumps");
                    sample.indexOf("notFound");
                    sample.indexOf("abacinate");
                    sample.indexOf("dog");
                    sample.indexOf("lazy");
                    sample.indexOf("quick");
                    sample.indexOf("zebra");
                    sample.indexOf("the");
                }




                var tester = {

                    test : function tester_native (a,b) {
                        return a.indexOf(b);
                    }

                };

                Object.a_b_test(tester,"test",10,loops,false,
                    function tester_testA(a,b) {
                        return indexOf_a.call(a,b);
                    },
                    function tester_testB(a,b) {
                        return indexOf_b.call(a,b);
                    },
                    function tester_testC(a,b) {
                        return indexOf_c.call(a,b);
                    }

                );

                for(i = 0; i < 10; i++) {
                    tester.test(sample,"fox");
                    tester.test(sample,"jumps");
                    tester.test(sample,"notFound");
                    tester.test(sample,"abacinate");
                    tester.test(sample,"dog");
                    tester.test(sample,"lazy");
                    tester.test(sample,"quick");
                    tester.test(sample,"zebra");
                    tester.test(sample,"the");
                }



                var tester2 = {
                    test : sample.indexOf
                };


                Object.a_b_test(tester2,"test",10,loops,sample,
                    indexOf_a,
                    indexOf_b,
                    indexOf_c
                );


                for(i = 0; i < 10; i++) {
                    tester2.test("fox");
                    tester2.test("jumps");
                    tester2.test("notFound");
                    tester2.test("abacinate");
                    tester2.test("dog");
                    tester2.test("lazy");
                    tester2.test("quick");
                    tester2.test("zebra");
                    tester2.test("the");
                }

                var tester3 = {
                    data : sample,
                };
                Object.defineProperties(tester3,{
                   test : {
                       value : function tester3_native(str) {
                           return this.data.indexOf(str);
                       },
                       configurable : true,
                       writable: true
                   },

                   test_a : {
                       value : function tester3_testA(str) {
                           return indexOf_a.call(this.data,str);
                       }
                   },
                   test_b : {
                       value : function tester3_testB(str) {
                           return indexOf_b.call(this.data,str);
                       }
                   },
                   test_c : {
                       value : function tester3_testC(str) {
                           return indexOf_c.call(this.data,str);
                       }
                   }
                });


                Object.a_b_test(tester3,"test",10,loops,true,
                    tester3.test_a,
                    tester3.test_b,
                    tester3.test_c
                );



                for(i = 0; i < 10; i++) {
                    tester3.test("fox");
                    tester3.test("jumps");
                    tester3.test("notFound");
                    tester3.test("abacinate");
                    tester3.test("dog");
                    tester3.test("lazy");
                    tester3.test("quick");
                    tester3.test("zebra");
                    tester3.test("the");
                }

                Object.a_b_test_logging =logging_backup;

            });

            object("a_b_test_async_tester",function(trials){

                trials=trials||10;
                var logging_backup = Object.a_b_test_logging;
                Object.a_b_test_logging=true;

                var fs= require("fs");

                var readFileNative = fs.readFile.bind(fs);

                function readFile_a () {
                    var delay = Math.floor(100+(Math.random()*900));
                    var args=[readFileNative,delay].concat(cpArgs(arguments));
                    return setTimeout.apply (global,args);
                }

                var count = trials+10;

                function afterRead(err,data){
                    console.log({afterRead:{err:err,
                            data:typeof data,
                            length:data?data.length:undefined,
                            count:count
                    }});
                    if (!err && data.indexOf("fs.readFile")>0) {



                        if (count-->0) {
                           console.log("looping");
                           fs.readFile(__filename,"utf8",afterRead);
                        } else {
                            Object.a_b_test_logging =logging_backup;
                        }

                    } else {
                        console.log("???");
                    }
                }


                fs.readFile(__filename,"utf8",function(err,data){

                    console.log({err:err,
                            data:typeof data,
                            length:data?data.length:undefined
                    });


                    if (!err && data.indexOf("fs.readFile")>0) {

                        console.log("native fs.readFile looks ok");

                        readFile_a(__filename,"utf8",function(err,data){

                            console.log({readFile_a:{err:err,
                                    data:typeof data,
                                    length:data?data.length:undefined
                            }});

                            if (!err && data.indexOf("fs.readFile")>0) {

                                console.log("delayed fs.readFile stub looks ok");

                                Object.a_b_test_async(
                                    fs,"readFile",trials,true,
                                    readFile_a.bind(fs)
                                );

                                fs.readFile(__filename,"utf8",afterRead);


                            }
                        });
                    }


                });


            });

        }

        function trimTopTail(s) {return s.substr(1,s.length-2);}

        function stringifyPathNode(n) {
            if (n.charAt(0)+n.charAt(n.length-1)==='""') {
                n=n.replace(/\./g,'\\u002E').replace(/\\"/g,'\\u0022');
                var n2=trimTopTail(n);
                if (n2.split('').some(function(c,ix){
                    if (c>='A' && c<='Z') return false;
                    if (c>='a' && c<='z') return false;
                    if (c>='0' && c<=9) {
                        return ix===0;
                    }
                    return ('_$'.indexOf(c)<0);
                })){
                    return '['+n+']';
                }
                return '.'+n2;
            } else {
                return '['+n+']';// numeric
            }
        }

        function stringifyPathArray(p) {
            return p.map(JSON.stringify).map(stringifyPathNode).join('');
        }

        function parsePathString(p) {

            var arr = [];

            p.split("[").forEach(function(chunk){
                chunk.split(']').forEach(function(chunk){
                    arr.push.apply(arr,chunk.split('.'));
                });
            });

            arr=arr.filter(function(chunk){return chunk!=='';}).map(function(chunk){
                if (chunk.charAt(0)==='"') return JSON.parse(chunk);
                var num = Number.parseInt(chunk);
                if (isNaN(chunk)) return chunk;
                return num;
            });
            return arr;
        }

        function Array_extensions(array){

            array.prototype("remove",function remove(o) {
               // remove all instances of o from the array
               var ix;
               while ( (ix=this.indexOf(o)) >= 0 ) {
                   this.splice(ix,1);
               }
            });

            array.prototype("contains",function contains(o) {
                // return true if o exists (somewhere, at least once) in the array
                return this.lastIndexOf(o) >= 0;
            });

            array.prototype("add",function add(o) {
                // if o does not exist in the array, add it to the end
                if (this.indexOf(o) < 0) {
                    this.push(o);
                }
            });

            array.prototype("toggle",function toggle(o) {
               // if o does not exist in the array, add it to the end and return true
               // if o exists in the array, remove ALL instances and return false
               var ix,result = (ix=this.indexOf(o)) < 0;
               if (result) {
                   this.push(o);
               } else {
                   while ( ix >= 0 ) {
                       this.splice(ix,1);
                       ix=this.indexOf(o);
                   }
               }
               return result;
            });

            array.prototype("replace",function replace(oldValue,newValue) {
                // replace all instances of oldValue in the array with newValue
                if (!oldValue || oldValue===newValue) return;// idiot checks

                var ix;
                while ( (ix=this.indexOf(oldValue)) >=0 ) {
                    this.splice(ix,1,newValue);
                }
            });

            array.prototype("item",function item(ix) {
                 return this[ix];
            });

            array("flattenArray",function flattenArray (input,fn_bind_context,minArgs) {
                // returns an array of strings,regexs or functions
                // (explodes nested arrays or objects into single elements)
                var
                output=[],
                has_objects=false,
                getValues=function (x,ix){
                 switch (jsClass(x)) {
                    case 'String' :
                    case 'RegExp' :
                        return output.push(x);
                    case 'Array' :
                        has_objects=true;
                        return output.push.apply(output,x);
                    case 'Object'  :
                        has_objects=true;
                        return output.push.apply(output,Object.values(x));

                     case 'Number' :
                        return output.push(x.toString());
                     case 'Function' : {
                         var keys;
                         if (!!fn_bind_context &&
                             ( (x.length===1) || x.length >= (minArgs||1) )&&
                             ( (keys=Object.keys(x)).length >= 0 ) ) {

                             var bound_fns = [];

                             Object.keys(x)
                               .forEach(function(k){
                                    Array.flattenArray (x[k],fn_bind_context,minArgs)
                                       .forEach(function(term,term_ix){
                                         var fn_x = x.length ===1 ? x(term) :  x.bind(fn_bind_context,term);
                                         Object.defineProperties(fn_x,{
                                             name : {
                                                 value : ("fn "+x.name+" "+k+" "+term+" "+(term_ix===0?'':' '+term_ix.toString(36))).split(" ").map(function(camel,ix){
                                                     if (ix===0) return camel.toLowerCase();
                                                     return camel.charAt(0).toUpperCase()+camel.substr(1).toLowerCase();
                                                 }).join('')
                                             }
                                         });
                                         bound_fns.push(fn_x);
                                     });

                                });


                             return output.push.apply(output,bound_fns);
                         } else {
                             return output.push(x);
                         }
                     }
                 }
                };
                getValues(input);
                while (has_objects){
                     input = output;
                     output=[];
                     has_objects=false;
                     input.forEach(getValues);
                }
                return output;
            });

            array("flattenArrayWithPaths",function flattenArrayWithPaths (input,fn_bind_context,minArgs) {
                // returns an array of strings,regexs or functions
                // (explodes nested arrays or objects into single elements)
                var
                output=[],
                paths=[],
                dir=[],
                save_dir,
                getValues=function (x,ix){
                     var here = ix===undefined?[]:[ix];
                     switch (jsClass(x)) {
                        case 'String' :
                        case 'RegExp' :
                            paths.push(dir.concat(here));
                            return output.push(x);
                        case 'Array' :
                            save_dir=dir;
                            dir=dir.concat(here);
                            x.forEach(getValues);
                            dir=save_dir;
                            return;
                        case 'Object'  :
                            save_dir=dir;
                            dir=dir.concat(here);
                            Object.keys(x).forEach(function(key){
                                return getValues(x[key],key);
                            });
                            dir=save_dir;
                            return;

                         case 'Number' :
                            paths.push(dir.concat(here));
                            return output.push(x.toString());
                     }
                };
                getValues(input);
                return {
                    arr   : output,
                    paths : paths.map(stringifyPathArray)
                };
            });

            array("followArrayPath",function followArrayPath(arr,path){

                parsePathString(path).some(function(p){
                    arr=arr[p];
                    return !arr;
                });
                return arr;
            });

            array("setArrayPath",function setArrayPath(arr,path,value){
                parsePathString(path).some(function(p,ix,keys){
                    if (arr[p]) {
                        if (ix+1===keys.length) {
                            arr[p]=value;
                            return true;
                        }
                    } else {
                        if (ix+1<keys.length) {
                            if (typeof keys[ix+1]==='string') {
                                arr[p]={};
                            } else {
                                arr[p]=[];
                            }
                        } else {
                            arr[p]=value;
                            return true;
                        }
                    }
                    arr=arr[p];
                    return false;
                });

                return arr;
            });

            array.prototype("atPath",function followArrayPath(path){
                return Array.followArrayPath(this,path);
            });

            array("proxifyArray",function proxifyArray(wrapped,console) {

                     wrapped = typeof wrapped==='object'&& wrapped.constructor===Array ?
                            wrapped :  typeof wrapped==='string'&&
                                       wrapped.length>2&&
                                       wrapped.charAt(0)==='[' &&
                                       wrapped.substr(-1)===']' ? JSON.parse(wrapped) : [];

                     var
                     sysConsole=console||{log:function(){}};
                     console=sysConsole;

                     var
                     events = {
                         push:[],
                         pop:[],
                         shift:[],
                         unshift:[],
                         splice:[]
                     },
                     event_props = {
                     },
                     event_cmd=function(fn) {
                         event_props[fn.name] = { value : fn, enumerable: false, configurable:true};
                     };
                     event_cmd(function consoleOff(){console={log:function(){}};});
                     event_cmd(function consoleOn(con){console=con||sysConsole;});
                     event_cmd(function addEventListener (ev,fn){
                         if (typeof fn==='function' && typeof events[ev]==='object') {
                             var ix = events[ev].indexOf(fn);
                             if (ix<0) events[ev].push(fn);
                         }
                     });
                     event_cmd(function removeEventListener (ev,fn){
                         if (typeof fn==='function' && typeof events[ev]==='object') {
                             var ix = events[ev].indexOf(fn);
                             if (ix>=0) {
                                 console.log("removing event",ev);
                                 events[ev].splice(ix,1);
                             }
                         } else {
                             if (fn==="all" && typeof events[ev]==='object') {
                                 console.log("removing",events[ev].length,"events from",ev);
                                 events[ev].splice(0,events[ev].length);
                             } else {
                                 if (ev==="all" && fn===undefined) {
                                     Object.keys(events).forEach(function(ev){
                                         console.log("removing",events[ev].length,"events from",ev);
                                         events[ev].splice(0,events[ev].length);
                                     });
                                 }
                             }
                         }
                     });

                     var
                     hookEventProp,
                     handlers={},
                     wrapped_props,
                     original_props={
                         hook   : {
                             value : function (){
                                 delete wrapped.hook;
                                 delete wrapped.unhook;
                                 Object.defineProperties(wrapped,wrapped_props);
                                 return wrapped;
                             },
                              enumerable: false,
                              configurable:true
                         },
                         unhook : {
                             value : function (){
                                 return wrapped;
                             },
                              enumerable: false,
                              configurable:true
                         }
                     };
                     wrapped_props={
                         hook   : {
                             value : function (){
                                 return wrapped;
                             },
                             enumerable: false,
                             configurable:true
                         },
                         unhook : {
                             value : function (){
                                 delete wrapped.hook;
                                 delete wrapped.unhook;
                                 Object.defineProperties(wrapped,original_props);
                                 return wrapped;
                             },
                              enumerable: false,
                              configurable:true
                         }
                     };
                     var event_trigger = function(ev,target, thisArg, argumentsList) {
                             var payload= {event:ev,target:target};
                             payload[ev]= {
                                 wrapped:wrapped,
                                 thisArg:thisArg,
                                 argumentsList:argumentsList,
                                 result:target.apply(wrapped,argumentsList)
                             };
                             if (events[ev].length) {
                                events[ev].forEach(function(fn){fn(payload);});
                             } else {
                                 if (events.change.length) {
                                     events.change.forEach(function(fn){fn(payload);});
                                 } else {
                                     console.log({event:payload});
                                 }
                             }
                             return payload[ev].result;
                         };

                     hookEventProp=function(ev) {
                          handlers[ev] = {
                            apply: event_trigger.bind(this,ev)/*function(target, thisArg, argumentsList) {
                                var payload= {};
                                payload[ev]= {
                                    wrapped:wrapped,
                                    thisArg:thisArg,
                                    argumentsList:argumentsList,
                                    result:target.apply(wrapped,argumentsList)
                                };
                                if (events[ev].length) {
                                   events[ev].forEach(function(fn){fn(payload);});
                                } else {
                                    if (events.change.length) {
                                        events.change.forEach(function(fn){fn(payload);});
                                    } else {
                                        console.log({event:payload});
                                    }
                                }
                                return payload[ev].result;
                            }*/
                          };
                          original_props[ev] = {
                              value : wrapped[ev],
                              enumerable: false,
                              configurable:true
                          };
                          wrapped_props[ev] = {
                              value : new Proxy(original_props[ev].value, handlers[ev]),
                              enumerable: false,
                              configurable:true
                          };

                     };

                     Object.keys(events).forEach(hookEventProp);
                     events.change=[];
                     Object.defineProperties(wrapped,wrapped_props);
                     Object.defineProperties(wrapped,event_props);
                     return wrapped;
                 });

            array.prototype("proxify",function proxify() {
                return Array.proxifyArray(this);
            });

            array.prototype("renderWithTemplate",function(template) {
                return String.stringRenderer(template,this);
            });

        }

        function String_extensions(string){
            /*
            string.prototype("contains",function contains(s) {
                 // return true if s exists (somewhere, at least once) in the string
                 switch (typeof s) {
                     case 'string' : return this.lastIndexOf(s) >= 0;
                     case 'number' : return this.lastIndexOf(s.toString()) >= 0;
                     case 'object' :
                         if (s.constructor===RegExp) {
                             return this.search(s)>=0;
                         }
                 }
                 return false;
            });*/

            string.prototype("contains",function contains(s) {
                return String.prototype.includes.call(this,s);
            });

            // creates a standard empty array
            // and returns either the bound .push funcs
            // or a wrapper that calls map() for each element
            // function cb (text,index,array, /**-->extra args*/  start,end,delimit, match ) {...}
            var getOutput = RegExp.split.getOutput;

            // a wrapper around nativeSplit to give the same mapping functionaly
            // as used in RegExpSplit
            string("StringSplit",function StringSplit(haystack, needle, limit, map) {
                if (isEmpty(needle)||!isString(needle)) return null;

                var
                haystack_length = haystack.length,
                splits = String.split(haystack,needle, limit),
                splits_length = splits.length;
                if (!map||!splits) {
                    if (!splits || splits[0].length===haystack_length) return null;
                    return splits;
                }
                var output_push,
                output=getOutput(map,function(push){
                    output_push=push;
                });
                if (splits_length <= 1) {
                    output_push (
                        /*text*/splits[0],
                        /*atIndex*/0,
                        null,//*toIndex*/splits[0].length + (haystack.substr(splits[0].length,needle.length)===needle?1:0 ) ,
                        null);//*match*/ needle);
                    /*
                    output_push(splits[0], output.length, output,
                                        0, haystack_length,undefined,false);
                    */
                    return output;
                }


                var atIndex=0,needle_length=needle.length;
                splits.forEach(function(text,ix){

                    var
                    tail        = ix===splits.length-1 ?  null : needle ;
                    //if (limit!==undefined && splits.length===limit) tail=null;
                    output_push (
                        text,
                        atIndex,
                        tail===null?null:atIndex+text.length+tail.length,
                        tail );

                    /*
                    output_push(str, output.length, output,
                                     atIndex, toIndex,undefined,ix<splits.length?[needle]:false);

                    */
                    atIndex=atIndex+text.length+(tail===null?0:tail.length);
                });
                splits.splice(0,splits.length);
                return output;
                });

            function wrapStringMethod(method,checkEmpty) {
                string.prototype(method,function (needle,limit,map) {
                    if (checkEmpty && checkEmpty(needle)) return null;
                    var res = String[method](this,needle,limit,map);
                    return res;
                });
            }

            wrapStringMethod("StringSplit");

            /*
              camelCaseWord is called repeatedly over an array of words
              the first iteration is lower case.
              every other iteration capitalizes the first letter.
              note that sometimes this function is called to capialize the first letter
              by simply not supplying the index.
            */
            function camelCaseWord (s,ix){
               s=s.trim().toLowerCase();
               if (ix===0) return s;
               return s.charAt(0).toUpperCase()+s.substr(1);
            }

            /* converts the supplied array of words to a camel cased string*/
            function camelCaseArray(a){return a.map(camelCaseWord).join('');}

            /* splits the supplied string with embedded spaces to each word camleCased  in a single word*/
            function camelCaseWords(s){return camelCaseArray(s.replace(/-|\/|\+|_|\./g," ").split(" ").filter(function(x){return x!=='';}));}

            string.prototype("toCamelCase",function toCamelCase() {
                return camelCaseWords(this);
            });

            function sha1Browser() {

                return typeof window.sha1==='function' ? sha1Wrap : function(){};

                function sha1Wrap(str,cb) {
                    var hex = window.sha1(str);
                    return (typeof cb==='function') ? cb(hex) : hex;
                }

            }

            function sha1Node () {
                var crypto = require('crypto');
                return function sha1 (str,cb) {
                      var shasum = crypto.createHash('sha1');
                      shasum.update(str);
                      var hex = shasum.digest('hex');
                      return typeof cb==='function' ? setImmediate(cb,hex) : hex;
                };
            }

            string("sha1", Object.env.isNode ? sha1Node() : sha1Browser());
            string.prototype("@sha1",function getSha1(){return  String.sha1(""+this); });


            string("htmlGenerator",function htmlGenerator(template) {
                  /*

                  htmlGenerator() is a SINGLE use wrapper around a string, used to manipulate existing html code
                  to reflect subtle changes.  it is intended for lightweight use, not for composing large complex pages

                  'template' is a string which by itself is at the very least one valid <html></html> paring.
                  ideally it is a fully formed html page with head & body populated

                  returns an object with
                     html - a string containing the original template which has been modified by calls to:

                       append (something,where)
                      - or -
                       replace(something,withSomething)

                       append()

                         'something' describes what is to be appended to an area described by 'where'
                           - a string containing valid html to be appended
                           - a javascript function(){} object , which is converted to a string
                              - the header and opening/closing braces are removed) and it is wrapped in script tags
                          - a string starting with '/' and ending with ".js", which refers to a script to be added to the head or body (as set by 'where')
                          - a string starting with '/' and ending with '.css', which refers to a css file to be appended to the head as a link

                         'where' is a string and can be one of
                            "body" (the default value if 'where' is left undefined)
                            "head"
                            (any valid htlm tag)
                            the first endcounteed "</where>" tag is used as the insertion point
                            eg if 'where' is "body" the html will be appended to the end of the body
                               ie inserted just before "</body>"
                            eg if 'where' is 'title' and there is an empty title tag in the head section
                               the title would be set there.

                      replace
                          - something can be a string or a RegExp eg 'src="/mypath"' or /<title.*<\\title>/
                          - withSomething must be a valid html string. (NOT a function or filename like append)


                  */
                  var html = isString(template)&&template.length>0 ? ""+template : "<!doctype html><html><head><title></title><style></style></head><body></body></html>";
                  var self = {};

                  function append (h,where){
                      where = "</"+(where || "body")+">";

                      switch (true) {

                          case typeof h==='function' :
                              h = h.toString();
                              h = "<script>"+h.substring(h.search(/{/)+1,h.length-1)+"</script>";
                              break;

                          case typeof h==='object' :
                              h = "<script>\n"+ Object.varify(h)+"</script>";
                              break;
                          case (h.search(/^(\/[a-z]|[A-Z]|[0-9])*.*\.js/) ===0) &&
                               (h.search(/\s/)===-1) :

                               h = '<script src="'+h+'"></script>';
                               break;

                          case (h.search(/^(\/[a-z]|[A-Z]|[0-9])*.*\.css/) ===0) &&
                               (h.search(/\s/)===-1) :

                            where = '</head>';// force css to be in head.
                            h = '<link href="'+h+'" rel="stylesheet"\\>';

                          break;
                      }


                      html = html.replace(where,h+"\n"+where);
                      return self;
                  }

                  function replace (a,b) {
                          html = html.replace(a,b);
                          return self;
                  }


                  var handler = function (req,res) {res.send(html);};
                  return Object.defineProperties(self,{
                      html: {
                          get : function (){ return html.replace(/(?<!<script.*src.*>)<\/script>\s*<script>/g,'');},
                          set : function (h) { html = h; },
                          enumerable:true,configurable:true
                      },
                      append: {
                          value      : append,
                          enumerable : true,
                          configurable:true
                      },
                      replace : {
                          value : replace,
                          enumerable:true,
                          configurable:true
                      }

                  });
              });

            string.prototype("htmlGenerator",function() {
                  return String.htmlGenerator(this);
             });

            string("stringRenderer",function stringRenderer(template,obj) {

                function escapeRegExp(text) {
                    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                }


                function render(temp,obj,ix) {
                    function getAllProperties(obj){
                        var allProps = [], curr = obj,
                        fetch = function(prop){
                            if (allProps.indexOf(prop) <0) {
                                allProps.push(prop);
                            }
                        };

                        do{
                            Object.getOwnPropertyNames(curr).forEach(fetch);
                        }while((curr = Object.getPrototypeOf(curr)));

                        return allProps;
                    }
                    function zapRegExp(prefix,obj) {
                        getAllProperties(obj).forEach(function(key){
                            var
                            re = new RegExp('\\$\\{'+escapeRegExp(prefix)+key+'\\}','g'),
                            val=obj[key];
                            if (typeof val === 'object') {
                                if (val!==null) zap(prefix+key+".",val);
                            } else {

                                if (typeof val === 'function') {
                                    if (temp.search(re)>=0) {
                                        temp=temp.replace(re,val.apply(obj,[temp,ix,template]));
                                    }
                                } else {
                                    if (temp.search(re)>=0) {
                                        temp=temp.replace(re,val);
                                    }
                                }
                            }
                        });
                    }
                    function zap(prefix,obj) {
                        getAllProperties(obj).forEach(function(key){
                            var
                            splitter = '${'+prefix+key+'}',
                            val=obj[key];
                            if (typeof val === 'object') {
                                if (val!==null) zap(prefix+key+".",val);
                            } else {
                                var splits = temp.split(splitter);
                                if (splits.length>1) {
                                    if (typeof val === 'function') {
                                        temp=splits.join(val.apply(obj,[temp,ix,template]));
                                    } else {
                                        temp=splits.join(val);
                                    }
                                }

                            }
                        });
                    }
                    zap('',obj);
                    return temp;
                }

                if (Array.isArray(obj)) {
                    return obj.map(render.bind(this,template)).join('\n');
                } else {
                    return render(template,obj);
                }
            }
           );

            string.prototype("renderWithObject",function(obj) {
                return String.stringRenderer(this,obj);
            });

            string("customNeedleString",function customNeedleString(s,name,props){
                switch (jsClass(s)){
                    case "String" :
                        var S=String;
                        s = typeof s==='string'? new S(s) : s;
                        if (typeof s.__CustomSplit!=='undefined') {
                            if (s.__CustomSplit==name) return s;
                            delete s.__CustomSplit;
                        }

                        props= props || {};
                        props.__CustomSplit = {
                            value : camelCaseWord(name),
                            enumerable : false,
                            configurable:true
                        };
                        Object.defineProperties(s,props);

                        return s;
                    case "Object":
                    case "Array" :
                        var r = Array.flattenArray(s).map (function(e){
                            var r = String.customNeedleString(e,name,props);
                            return r;
                            });
                        return r;
                    default ://function () {
                        return s;
                }

            });

            function makeTextToken(x){
                var t={text:x.text};
                Object.defineProperties(t,{
                    toString:{
                        value:function(){return this.text;},
                        enumerable:false,configurable:true}
                });
                return t;
            }

            function makeToken(x){
                var t={split:x.delimit,mode:x.mode};
                if (x.groups) t.groups=x.groups;
                if (x.delimit_src) t.src=x.delimit_src;
                Object.defineProperties(t,{
                    toString:{
                        value:function(){return this.text || this.split;},
                        enumerable:false,configurable:true}
                });
                return t;
            }

            string("makeTextToken",makeTextToken);

            string("makeToken",makeToken);

            string("ArraySplit",(function (){

                    /*used in the registration of functions*/
                    var
                    needleFunctionName = (function() {
                        var s = Object.prototype.toString.call.bind(Object.prototype.toString),
                            c,c2, m, m2, re= /(\[object)\s{1}/g;

                        return function(haystack,needle) {
                            m = (c = s(haystack)).match(re);
                            m2 = (c2 = s(needle)).match(re);
                            if (!m||!m2) return "";

                            return camelCaseArray([
                                c.substring(m[0].length, c.length - 1),
                                c2.substring(m2[0].length, c2.length - 1),
                                needle.__CustomSplit || ''
                            ]) + "Split";

                        };
                    })();

                    /*
                        needleToString is used to disambiguate search terms
                    */

                    var splitters = {
                        stringRegexpSplit     : stringRegexpSplit,
                        stringStringSplit     : stringStringSplit,
                        stringArraySplit      : stringArraySplit,
                        stringObjectSplit     : stringObjectSplit,
                        stringStringWordsearchSplit : stringStringWordsearchSplit,
                    };

                    string("needleFunction",function needleFunction (haystack, needle){
                        return splitters[ needleFunctionName(haystack, needle)];
                    });


                    function needleToString (needle) {
                        var result = needle.toString();
                        if (needle.__CustomSplit) {
                            return needle.__CustomSplit +'('+result+')';
                        }
                        return result;
                    }



                    /*
                        stringStringSplit - mainly an internal function used by stringArraySplit()
                        if you don't pass a map callback, will return an array of
                          splits in the format
                          [
                            {start,end,length,text,prev,next,delimit,delimit_length,index,mode}
                         ]
                        this the same format as returned by stringStringSplit()
                        ( it has information about the length of each detected delimiter,
                          as it is possible for RegExp to detect variable length delimiters )

                        however - is also called by mapSplit() as it is easily indexed via needleFunction()
                        to acheive polymorphic selection of the apropriate splitter function
                        when mapSplit calls it, it passes in a map callback, which allows the return results to differ
                        in that case, it returns an array of whatever that function returns.
                        the default for mapSplit (ie if mapSplits' called did not suppy a callback) is to simply return the text element
                        - making mapSplit() without a callback identical to split()
                    */

                    function stringRegexpSplit(haystack, needle, limit, map) {
                        var check_fn = needleFunctionName(haystack,needle) ;
                        if (check_fn.startsWith("stringRegexp" )) {
                            var haystack_length = haystack.length,
                            mode = needle.__CustomSplit ? needle.__CustomSplit :'RegExp',
                            delimit_src=needle,
                            splits = String.RegExpSplit(haystack, needle, limit, map ? map : stringRegExp_cb.bind(this,mode));
                            splits[splits.length - 1].next = false;
                            return splits;
                        } else {
                            var msg = "stringRegexpSplit called - should it not be "+check_fn+" ?";
                            throw console.log (msg);
                        }

                        return null;

                        function stringRegExp_single_cb(text, index, theArray, start, end, delimit, mode) {
                            var at_start = index === 0,
                                prev     = theArray[index - 1],
                                at_end   = !delimit,
                                text_length = text.length,
                                text_start  = at_end  ? (at_start ? 0 : prev.next)  : start,
                                text_end    = text_start+text_length;

                            return {
                                start:   text_start,
                                end:     text_end,
                                text:    text,
                                length:  text_length,
                                prev:    at_start      ? false : prev.next,
                                next:    at_end        ? false : end,
                                delimit: at_end        ? false : delimit,
                                delimit_src: at_end    ? false : delimit_src,
                                delimit_length: at_end ? false : delimit.length,
                                index:   index,
                                mode :   mode
                            };
                        }

                        function stringRegExp_cb(mode,text, index, theArray, start, end, delimit,match,strings) {
                            if (  text!==false ) {
                                return stringRegExp_single_cb(text, index, theArray, start, end, delimit,mode) ;
                            }
                            if (theArray.length===0) return;
                            var last = theArray[theArray.length-1];
                            if (last.start===start && strings&&strings.groups) {
                                last.groups = strings.groups;
                            }
                        }

                    }


                    /*
                        stringStringSplit - mainly an internal function used by stringArraySplit()
                        if you don't pass a map callback, will return an array of
                          splits in the format
                          [
                            {start,end,length,text,prev,next,delimit,delimit_length,index,mode}
                         ]
                        this the same format as returned by stringRegexpSplit()
                        ( which explains why it has redundant infomation, simply to be
                          comptabile with stringRegexpSplit when merging happens in stringArraySplit() )

                        however - is also called by mapSplit() as it is easily indexed via needleFunction()
                        to acheive polymorphic selection of the apropriate splitter function
                        when mapSplit calls it, it passes in a map callback, which allows the return results to differ
                        in that case, it returns an array of whatever that function returns.
                        the default for mapSplit (ie if mapSplits' called did not suppy a callback) is to simply return the text element
                        - making mapSplit() without a callback identical to split()
                    */

                    function stringStringSplit(haystack, needle, limit, map) {
                        var check_fn = needleFunctionName(haystack,needle) ;
                        if (check_fn === "stringStringSplit"  ) {
                            if (needle.length===0) return  null;
                            var haystack_length = haystack.length,
                                splits          = haystack.split(needle, limit),
                                splits_length   = splits.length;

                            if (splits_length <= 1) {
                                // no data
                                return null;
                            }
                            var
                            out=[],
                            remap=function(el,ix) {
                                //         text,    index, array, start,    end,     delimit,                         match
                                return map(el.text, ix,    out,   el.start, el.next, ix<splits_length-1?needle:null,  null);
                            },
                            needle_len = needle.length,
                            str_0 = splits[0],
                            s0_len = str_0.length,
                            el0 = {
                                start: 0,
                                end: s0_len,
                                length: s0_len,
                                text: str_0,
                                prev: false,
                                next: s0_len + needle_len,
                                delimit: needle,
                                delimit_length:needle_len,
                                index: 0,
                                mode : "String"
                            },
                            el_n_minus_1 = el0,
                            get_el_n = function(str_n, n,els) {
                                switch (n) {
                                    case 0:
                                        return out.push(!!map ? remap(el0,n,els) : el0);
                                }
                                var
                                str_n_len = str_n.length,
                                    str_n_end = el_n_minus_1.next + str_n_len,
                                    el_n = {
                                        start: el_n_minus_1.next,
                                        end: str_n_end,
                                        length: str_n_len,
                                        text: str_n,
                                        prev: el_n_minus_1.start,
                                        next: n < splits_length - 1 ? str_n_end + needle_len : false,
                                        delimit: n < splits_length - 1 ? needle : false,
                                        delimit_length:n < splits_length - 1 ? needle_len : false,
                                        index: n,
                                        mode : "String"
                                    };

                                el_n_minus_1 = el_n;
                                out.push(!!map ? remap( el_n,n,els ) : el_n);
                            };

                            if (splits_length === 2) {
                                if (!!map) {
                                    out.push(remap(el0,0));
                                    get_el_n(splits[1], 1);
                                } else {
                                    out.push(el0);
                                    get_el_n(splits[1],1);
                                }
                                return out;
                            }

                            splits.forEach(get_el_n);
                            return out;

                        }
                        else {

                            var msg = "stringRegexpSplit called - should it not be "+check_fn+" ?";
                            throw console.log (msg);
                        }

                        return null;
                    }

                    function stringStringWordsearchSplit(haystack, needle, limit, map) {
                        var
                        word=needle.toString(),
                        customNeedle = RegExp("(?<!\[\\w\\d\])"+word+"(?!\[\\w\\d\])");
                        customNeedle.__CustomSplit='Wordsearch('+word+')';
                        customNeedle.__CustomSplit_src = needle;
                        return stringRegexpSplit (haystack, customNeedle, limit);
                    }

                    function sortOnDelimitStart(lowest, highest) {
                        return lowest.delimit_start - highest.delimit_start;
                    }

                    function checkOverlaps(inst1,ix1,ar){
                        ar.forEach(function(inst2,ix2){
                           if (ix2===ix1) return;
                           if (inst2.delimit_start>inst1.delimit_start) {

                                if (inst2.delimit_start<inst1.delimit_end) {
                                         console.log({inst1:inst1,inst2:inst2});
                                        throw new Error("overlapping split terms");

                                }

                           } else {
                                if (inst2.delimit_end>inst1.delimit_start) {
                                    if (inst2.delimit_start<inst1.delimit_start) {

                                            console.log({inst1:inst1,inst2:inst2});
                                            throw new Error("overlapping split terms");

                                    }
                                }  else {
                                    if (inst2.delimit_end<inst1.delimit_end) {
                                         if (inst2.delimit_end>inst1.delimit_start) {
                                             console.log({inst1:inst1,inst2:inst2});
                                             throw new Error("overlapping split terms");

                                         }
                                    }
                                }
                           }

                           if (inst1!==inst2 && inst1.next !==false && inst2.next !==false) {
                               if (
                                   (inst1.delimit_start!==false && inst1.delimit_start===inst2.delimit_start) ||
                                  ( inst1.delimit_end  !==false && inst1.delimit_end===inst2.delimit_end )
                               ) {
                                   console.log({inst1:inst1,inst2:inst2});
                                   throw new Error("overlapping split terms");

                               }
                           }
                        });
                    }

                    function stringArraySplit(haystack, needles, limit, map) {
                        if ( isString(haystack) && typeof needles === 'object' && needles.constructor === Array) {
                            var haystack_length = haystack.length;

                            var needle_descs =  needles.map(function(n){return needleToString(n);});
                            needles= needles.filter(function(ignore,ix){
                                return needle_descs.indexOf(needle_descs[ix])===ix;
                            });
                            if (needle_descs.length!==needles.length) {
                                //console.log({pruned:{needle_descs:needle_descs,needles:needles}});
                            }
                            needle_descs.splice(0,needle_descs.length);

                            var
                            splits = needles.map(function(needle) {
                                var fn = String.needleFunction(haystack, needle);
                                if (fn) return fn.call(this,haystack, needle,limit);
                                return null;
                            });

                            var out=[],
                            remap=function(el,ix) {
                                //         text,    index, array, start,    end,     delimit,     match
                                return map(el.text, ix,    out,   el.start, el.next, el.delimit,  null);
                            };
                            var work = splits.map(function(arr, ix) {
                                if (arr === null) {
                                    return null;
                                }
                                if (arr.length === 1) return null;
                                return {
                                    ix: ix,
                                    splits: arr
                                };
                            }).filter(function(x) {
                                return x !== null;
                            });
                            if (work.length === 0) return null;
                            if (work.length === 1) {
                                return map ? work[0].splits.map(remap) : work[0].splits;
                            }
                            var
                            stamp_first = function(delim) {
                                delim.start   = delim.splits[0].start;
                                delim.text    = delim.splits[0].text;
                                delim.delimit = delim.splits[0].delimit;
                                delim.delimit_start = delim.splits[0].end;
                                delim.delimit_end = delim.splits[0].next;
                                delim.end = delim.splits[0].next;
                                delim.splits.forEach(

                                function(inst) {
                                    inst.delimit_start = inst.end;
                                    inst.delimit_end   = inst.next;
                                    Object.defineProperties(inst, {
                                        delim: {
                                            value: delim,
                                            enumerable: false,
                                            configurable: true
                                        }
                                    });
                                });
                                return delim;
                            };
                            work = work.map(stamp_first);

                            var pending = [];
                            work.forEach(function(delim) {
                                delim.splits.forEach(function(inst) {
                                    pending.push(inst);
                                });
                            });

                            pending.sort(sortOnDelimitStart);

                            pending.forEach(checkOverlaps);

                            pending = pending.filter(function(inst,ix){
                                return (inst!==null && !!inst.delimit) &&
                                       (limit===undefined || ix <limit) ;
                            });


                            pending.forEach(function(inst,ix,ar){
                                if (ix===0) {
                                    inst.start=0;
                                } else {
                                    inst.start=ar[ix-1].delimit_end;
                                }
                                inst.end=ix<ar.length||inst.delimit_end===haystack.length?inst.delimit_start:haystack.length;
                                inst.length=inst.end-inst.start;
                                inst.text=haystack.substring(inst.start,inst.end);
                                delete inst.index;
                                delete inst.prev;
                                delete inst.next;
                                inst.index=ix;
                                out.push(map?remap(inst,ix):inst);
                            });

                            var last =out[out.length-1];
                            if ((last.delimit_end<haystack.length) && (limit===undefined || out.length<limit)) {
                                var final={
                                             start         : last.delimit_end,
                                             end           : haystack.length,
                                             length        : haystack.length-last.delimit_end,
                                             text          : haystack.substring(last.delimit_end,haystack.length),
                                             delimit       : false,
                                             delimit_start : false,
                                             delimit_end   : false,
                                             index         : out.length};


                                out.push(map?remap(final,out.length):final);
                            }
                            return out;
                        }
                        return null;
                    }


                    function ArraySplit(haystack, needles,limit,map) {

                        if (isEmpty(needles)) return null;

                        var
                        tokens = [],
                        flattened = Array.flattenArrayWithPaths(needles),
                        flat=flattened.arr,
                        raw = stringArraySplit(haystack, flat, limit);
                        if (raw===null) return raw;

                        var
                        out = [],falseToNull=function(x,ix){return x===false||(limit && ix>=limit-1)?null:x;};

                        raw.some(function(x,index){
                            if ((x.length!==0)) tokens.push(makeTextToken(x));
                            //if ((x.start!==0 && x.length!==0)) tokens.push(makeTextToken(x));
                            if (x.delimit) tokens.push(makeToken(x));
                            out.push( map ? map(x.text, index, out, x.start, falseToNull(x.next,index), falseToNull(x.delimit,index)) : x.text );
                            return limit!==undefined&& index ===limit-1;
                        });
                        var td_cache,
                        token_distribution = function(){
                            if (!td_cache){
                               td_cache={};
                               tokens.forEach(function(x,ix){
                                   if (x.split) {
                                       var split=x.src? (x.src.__CustomSplit ? x.mode  : x.mode+"("+x.src.toString()+")") :x.mode+"("+x.split+")";
                                       if (td_cache[split]) {
                                          td_cache[split].indexes.push(ix);
                                       } else {
                                          flat.some(function(needle){
                                              if (x.src) {
                                                  if (x.src.__CustomSplit) {
                                                      if (needle.__CustomSplit+"("+needle+")"  === x.src.__CustomSplit){
                                                           td_cache[split]={split:x.src,indexes:[ix],custom_data:x.src.__CustomSplit_src};
                                                           return true;
                                                      }
                                                  } else {
                                                      if (needle===x.src) {
                                                          td_cache[split]={split:x.src,indexes:[ix]};
                                                          return true;
                                                      }
                                                  }
                                              } else {
                                                  td_cache[split]={split:x.split,indexes:[ix]};
                                                  return true;
                                              }
                                          });
                                      }
                                   }
                               });
                               var keys = Object.keys(td_cache);
                               td_cache = {
                                   splits : new Array(flat.length),
                                   named : td_cache,
                                   paths : {}
                               };
                               keys.forEach(function(k){
                                   var
                                   split=td_cache.named[k],
                                   src = split.custom_data || split.src ||  split.split,
                                   ix=flat.indexOf(src);
                                   split.path = flattened.paths[ix];

                                   split.indexes.forEach(function(tokIx){
                                       tokens[tokIx].path=split.path;
                                   });
                                   td_cache.splits[ix] = split;
                                   Array.setArrayPath(td_cache.paths,split.path,split);
                                   if (split.custom_data) {
                                       var custom_data=split.split;
                                       split.split=src;
                                       split.custom_data=custom_data;
                                   }
                               });
                               td_cache.splits=td_cache.splits.filter(function(el){return el!==null;});
                            }
                            return td_cache;
                        };
                        Object.defineProperties(out,{
                            all_needles:{enumerable:false,configurable:true,writable:true,value : needles},
                            needles:{enumerable:false,configurable:true,writable:true,value : flat},
                            raw:{enumerable:false,configurable:true,writable:true,value : raw},
                            tokens:{enumerable:false,configurable:true,writable:true,value : tokens},
                            token_distribution:{enumerable:false,configurable:true,get : token_distribution}
                        });
                        return out;

                    }

                    function stringObjectSplit(haystack,needles,limit,map) {
                        return ArraySplit(haystack,Array.flattenArray(needles),limit,map);
                    }

                    string.prototype("toWordsearch",function toWordsearch(props){
                            return String.customNeedleString(this+"",'Wordsearch',props);
                        });

                    string("Wordsearch",function Wordsearch(needle,props){
                            return String.customNeedleString(needle,'Wordsearch',props);
                        });

                    return ArraySplit;

                })());

            string.prototype("ArraySplit",function ArraySplit (needle,limit,map) {
                return String.ArraySplit(this,needle,limit,map);
            });

            function whiteOutComments(src,singleChar,multiChar) {
            /*
            if wc === false removes all comments and empty lines
            if wc === undefined replaces all comments with same amount of spaces
            (eg so tokens appear in same positions in source string)
            this ways the string without comments can be scanned for valid code/tokens
            once found, the source string can be sliced accordingly.

            */

               // console.log("whiteOutComments:begin",(new Error()).stack.split("\n").slice(3))
                var

                out = [],
                number=singleChar==="number",
                num_prefix=multiChar||'',
                w1=number?' ' : singleChar || ' ',//unless otherwise specified, white out single lime comments with a space
                w2=number?' ' : multiChar  || ' ',//unless otherwise specified, white out multi lime comments with a space
                // note: supply false in lei of a character in either mode will  cause comments to be removed entirely
                // AND (see last line of this function) specifying both as false will remove all blank lines from output also
                white1=singleChar ===false ? function(){return '';} : function(x){return new Array(x.length+1).join(w1);},
                white2=multiChar  ===false ? function(){return '';} : function(x){return new Array(x.length+1).join(w2);},
                singleStart=w1===' '?'  ':'//',
                multiStart=w2===' '?'  ':'/*',
                multiEnd=w2===' '?'  ':'*/',

                lines = src.split("\n"),
                isMulti= lines.map(function(){return false;}),

                regex = /(?<=(\(|=|;|,|^)\s*)\/((?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/((?:g(?:im?|mi?)?|i(?:gm?|mg?)?|m(?:gi?|ig?)?)?)/,

                escapes  = {
                   escapedSingleQuote : /\\'/g,
                   escapedDoubleQuote : /\\"/g,
                   escapedNewLine:      /\\\n/g,
                },

                regexps  = {
                   singleLine: /\/\//g,
                   newLine  : /\n/g,
                   multiLineStart:  /(?<!\/)\/\*/g,
                   multiLineEnd:  /\*\//g,
                   singleQuote: /\'/g,
                   doubleQuote: /\"/g,
                },

                inMultiLineComment=false;


                lines.forEach(function(line,ix){

                    var
                    OUT="",
                    toks0 = line.ArraySplit(regex),
                    toks1 = [],
                    toks2 = [];

                    if (toks0) {

                        toks0.tokens.forEach(function (tok){
                            if (tok.text) {
                                var sub = tok.text.ArraySplit(escapes);
                                if (sub) {
                                    sub.tokens.forEach(function(tok){
                                        toks2.push(tok);
                                    });
                                } else {
                                    toks1.push(tok);
                                }
                            } else {
                                toks1.push(tok);
                            }
                        });

                    } else {

                        toks1=line.ArraySplit(escapes);
                        if (toks1) toks1=toks1.tokens;
                        else toks1 = [{text : line}];

                    }

                    toks1.forEach(function (tok){
                        if (tok.text) {
                            var sub = tok.text.ArraySplit(regexps);
                            if (sub) {
                                sub.tokens.forEach(function(tok){
                                    toks2.push(tok);
                                });
                            } else {
                                toks2.push(tok);
                            }
                        } else {
                            toks2.push(tok);
                        }
                    });

                    toks0=null;
                    toks1=null;

                    var inSingleLineComment = false,
                        inSingleQuote=false,
                        inDoubleQuote=false;

                    isMulti[ix]=inMultiLineComment;

                    toks2.forEach(function(x){
                        switch (true) {

                            case inSingleLineComment :

                                switch (x.src) {
                                               case regex :
                                               case regexps.singleQuote:
                                               case regexps.doubleQuote:
                                               case escapes.escapedSingleQuote:
                                               case escapes.escapedDoubleQuote:
                                               case regexps.singleLine :
                                               case regexps.multiLineStart:
                                               case regexps.multiLineEnd:
                                                    OUT += white1(x.split);
                                                    break;
                                               case escapes.escapedNewLine:
                                                    OUT +=white1(' ')+'\n';
                                                    break;
                                               case regexps.newLine:
                                                   inSingleLineComment=false;
                                                   OUT += x.split;
                                                   break;
                                            default :
                                            if (x.text) {
                                                OUT +=white1(x.text);
                                            }
                                        }

                                break;
                            case inMultiLineComment :
                                        switch (x.src) {
                                               case regex :
                                               case regexps.doubleQuote:
                                               case regexps.singleQuote:
                                               case escapes.escapedSingleQuote:
                                               case escapes.escapedDoubleQuote:
                                               case regexps.singleLine :
                                               case regexps.multiLineStart:
                                                    OUT += white2(x.split);
                                                    break;
                                               case escapes.escapedNewLine:
                                                    OUT +=white2(' ')+'\n';
                                                    break;
                                               case regexps.multiLineEnd:
                                                    OUT += multiEnd;
                                                    inMultiLineComment=false;
                                                    break;

                                           case regexps.newLine:
                                                   OUT += x.split;
                                                   break;
                                            default :
                                            if (x.text) {
                                                OUT += white2(x.text);
                                            }
                                        }

                                break;
                            case inSingleQuote :
                                        switch (x.src) {

                                               case regex:

                                               case escapes.escapedSingleQuote:
                                               case escapes.escapedDoubleQuote:
                                               case regexps.singleLine :
                                               case regexps.multiLineStart:
                                               case regexps.multiLineEnd:
                                               case escapes.escapedNewLine:
                                               case regexps.doubleQuote:
                                                    OUT += x.split;
                                                    break;
                                               case regexps.singleQuote:
                                                    OUT += x.split;
                                                    inSingleQuote=false;
                                                    break;
                                               case regexps.newLine:
                                                    throw new Error("unterminated string");

                                            default :
                                            if (x.text) {
                                                OUT += x.text;
                                            }
                                        }
                                        break;
                            case inDoubleQuote :
                                        switch (x.src) {

                                               case regex:
                                               case escapes.escapedSingleQuote:
                                               case escapes.escapedDoubleQuote:
                                               case regexps.singleLine :
                                               case regexps.multiLineStart:
                                               case regexps.multiLineEnd:
                                               case escapes.escapedNewLine:
                                               case regexps.singleQuote:
                                                    OUT += x.split;
                                                    break;
                                               case regexps.doubleQuote:
                                                    OUT += x.split;
                                                    inDoubleQuote=false;
                                                    break;
                                               case regexps.newLine:
                                                    throw new Error("unterminated string");
                                            default :
                                            if (x.text) {
                                                OUT += x.text;
                                            }
                                        }
                                        break;

                            default :
                                       if (x.text) {
                                           OUT += x.text;
                                           break;
                                       }

                               switch (x.src) {
                                           case regexps.singleLine :
                                                 OUT += singleStart;
                                                 inSingleLineComment=true;
                                                 break;
                                           case regexps.multiLineStart:
                                                OUT += multiStart;
                                                inMultiLineComment=true;
                                                break;
                                           case regexps.multiLineEnd:
                                                throw new Error (" OUT of place *"+"/");

                                            case regexps.singleQuote:
                                                inSingleQuote=true;
                                                OUT += x.split;
                                                break;
                                           case regexps.doubleQuote:
                                                inDoubleQuote=true;
                                                OUT += x.split;
                                                break;

                                           case regex:
                                           case regexps.newLine:
                                               OUT += x.split;
                                               break;

                            }
                                }

                    });

                    out.push(OUT);

                });

                if (lines.length!==out.length) throw new Error ("internal error - out.length !== lines.length !");

                if ((singleChar===false)&&(multiChar===false)) {
                    // remove empty lines and collapse braces
                    var
                    fix_needed=true,
                    trim_top_tail=function(line){return line.trim();},
                    empty_lines=function(x){return x.length>0;},
                    collapse_line_ends=function(line,ix,ar) {
                         if (ix<ar.length-1) {
                             var next_line=ar[ix+1];
                             if (      line.endsWith("=") ||
                                       line.endsWith("{") ||
                                       next_line.startsWith("}" )
                                /*    || (
                                          line.endsWith(";")
                                          && !( next_line.startsWith("function ")
                                                || next_line.startsWith("var ")
                                          )
                                      )*/



                                ) {
                                 line+=next_line;
                                 ar[ix+1]='';
                                 fix_needed=true;
                             }
                         }
                         return line;
                     };

                    out = out
                       .map(trim_top_tail)
                        .filter(empty_lines);

                    while (fix_needed) {
                        fix_needed=false;
                        out = out.map(collapse_line_ends).filter(empty_lines);
                    }
                }

                if (!number) {
                    //console.log("whiteOutComments:end");

                    return out.join("\n");
                }

                var pad = 2 + (1+lines.length).toString().length;


                //console.log("whiteOutComments:end(number)");


                return lines.map(function(line,ix){
                    if (isMulti[ix]){
                        return  ' *'+num_prefix+(1+ix).toString().padStart(pad) + ' *  ' +line;
                    }
                   return  '/*'+num_prefix+(1+ix).toString().padStart(pad) + ' */ '+line;
                }).join("\n");

            }

            function ArraySplitViaWhitespaceComments(code,needle,limit,map,wc) {
                // the idea is to be able to ignore any commented out tokens in the split
                // but still return those comments verbatim in the between-the-valid-splits text output

                // step 1:replace any embedded comments with char 255
                // (we don't use actual whitespace as that might what they are splitting on)
                wc=wc||String.fromCharCode(255);
                var
                stripped = whiteOutComments(code,wc,wc);
                // step 2: split the whitespaced code using the needle,limit criteria
                var split = stripped.ArraySplit(needle,limit);
                // if no splits were found, return null as per usual
                if (!split) return split;

                //patch split.raw,split.tokens and split[...] with text from code instead of stripped
                var tok_ix=0,falseToNull=function(x,ix){return x===false||(limit && ix>=limit-1)?null:x;};
                split.raw.forEach(function(x,ix){
                    x.text = x.length ? code.substr(x.start,x.length) : '';
                    // if map was provided, call it, otherwise update split[ix]
                    split[ix] = map ? map(x.text, ix, split, x.start, falseToNull(x.next,ix), falseToNull(x.delimit,ix)) :x.text;
                    if ((x.length!==0)) split.tokens[tok_ix++]=makeTextToken(x);
                    if (x.delimit) split.tokens[tok_ix++]=makeToken(x);
                });
                // internally, token_distribution should behave the same if invoked.
                return split;
            }

            string("whiteOutComments",whiteOutComments);

            string.prototype("whiteOutComments",function (singleChar,multiChar){
                return whiteOutComments(this,singleChar,multiChar);
            });

            string.prototype("@codeStripped",function getcodeStripped(){
                return whiteOutComments(this,false,false);
            });

            string.prototype("@codeSpaced",function getCodeSpaced(){
                return whiteOutComments(this);
            });

            string.prototype("@codeNumbered",function getCodeNumbered(){
                return whiteOutComments(this,"number");
            });

            string.prototype("ArraySplitCode",function ArraySplitCode(needle,limit,map,wc){
                return ArraySplitViaWhitespaceComments(this,needle,limit,map,wc);
            });

            string("RegExpSplit",RegExp.split);
            wrapStringMethod("RegExpSplit");

            string("mapSplit",function mapSplit(haystack,needle,limit,map) {
                if (isEmpty(needle)) return null;

                var handler;
                if (String.needleFunction && String.ArraySplit) {
                    return String.ArraySplit(haystack,[needle],limit,map);
                }

                if (!handler) {

                    handler=String.split;
                    if (!!map){
                        switch (jsClass(needle)){
                            // we need RegExp.split if either mapping or it is not supported natively
                            case "RegExp":handler=RegExp.split;break;
                            // we only need StringSplit if mapping
                            case "String":
                                handler=String.StringSplit;
                                break;
                        }
                    }
                }
                return handler(haystack,needle,limit,map);
            });
            wrapStringMethod("mapSplit",isEmpty);

            string.prototype("@lines",function getLines(nl){
               return this.split(nl||"\n");
            });

            string.prototype("indent",function indent(spaces,nl){
                switch (typeof spaces) {
                    case 'string': break;
                    case 'number' : spaces = Array(1+spaces).join(' ');break;
                    default : spaces='    ';
                }
                nl=nl||"\n";
                return this.split(nl).map(function(x){return spaces+x;}).join(nl);
            });

            string.prototype("indentLevel",function indentLevel(lines,tabs,reindent){
                var i;
                if (!!lines) {
                    lines=this.replace(/\r/g,'').lines;
                    if (reindent) {
                        return lines.map(function(line){return line.indentLevel(false,tabs,true);}).join("\n");
                    }
                    var min = this.indentLevel(false,tabs);
                    if (lines.length>0) {
                        for(i = 1; i < lines.length; i++) {
                            if (lines[i].trim().length!==0) {
                                min = Math.min(min,lines[i].indentLevel(false,tabs));
                            }
                        }
                    }
                    return min;
                }
                var
                remain=(this.trimLeft || this.trimStart).bind(this)(),
                chars  = this.length-remain.length;
                if (chars===0) {
                    return reindent ? this : 0;
                }
                tabs = tabs||4;
                var indented=this.substr(0,chars);
                chars = 0;
                for(i = 0; i < indented.length; i++) {
                    switch (indented.charAt(i)) {
                        case '\t' :
                            chars += (tabs-(chars % tabs));
                            continue;
                        case '\r':
                        case '\n': return 0;
                        default :
                        chars ++;
                    }
                }

                return reindent ? new Array(1+chars).join(" ")+remain  : chars;
            });

            string.prototype("reindent",function reindent(spaces,tabs,nl){
                var current = this.indentLevel(true,tabs||4);
                if (current===spaces) return String(this);
                var
                filler = new Array(1+spaces).join(" ");
                nl=nl||"\n";
                return this.indentLevel(true,tabs||4,true).split(nl).map(function(line){
                    return filler + line.substr(current);
                }).join(nl);
            });

            string.prototype("load",function load(filename){
                return require("fs").readFileSync(filename,"utf8");
            });

            string("load",function load(filename){
                return require("fs").readFileSync(filename,"utf8");
            });

            string("extensionsTest",function(verbose) {

                var

                StringMappedSampleJSON = getSafeJson(testMappedSampleData()),
                RegExpMappedSample = testMappedSampleData(true),
                RegExpMappedSampleJSON = getSafeJson(RegExpMappedSample),
                ArrayMapSample = ArrayMapSampleData(),
                ArrayMapSampleJSON     = getSafeJson(ArrayMapSample);



                testBasic("String.split(String)",
                    "one two three".split(" ")
                );
                testBasicLimit("String.split(String,1)",
                      "one two three".split(" ",1),1
                );

                testBasicLimit("String.split(String,2)",
                      "one two three".split(" ",2),2
                );
                testBasic("String.split(String,3)",
                    "one two three".split(" ")
                );
                testBasic("String.split(String,99)",
                    "one two three".split(" ")
                );




                testBasic("String.split(RegExp)",
                    "one two three".split(/\s/)
                );
                testBasicLimit("String.split(RegExp,1)",
                      "one two three".split(/\s/,1),1
                );
                testBasicLimit("String.split(RegExp,2)",
                      "one two three".split(/\s/,2),2
                );

                testBasic("String.split(RegExp,3)",
                    "one two three".split(/\s/,3)
                );
                testBasic("String.split(RegExp,99)",
                    "one two three".split(/\s/,99)
                );





                testBasic("String.StringSplit(String)",
                    "one two three".StringSplit(" ")
                );
                testBasicLimit("String.StringSplit(RegExp,1)",
                      "one two three".StringSplit(" ",1),1
                );
                testBasicLimit("String.StringSplit(RegExp,2)",
                      "one two three".StringSplit(" ",2),2
                );
                testBasic("String.StringSplit(String)",
                    "one two three".StringSplit(" ",3)
                );
                testBasic("String.StringSplit(String)",
                    "one two three".StringSplit(" ",99)
                );


                testMapped2(
                    "String.StringSplit(String,map)",
                    testMappedSampleData(),
                    "one two three",
                    "StringSplit",
                    [" ",undefined,mappedResult]
                );
                testMapped2(
                    "String.StringSplit(String,map, limit 1)",
                    testMappedSampleData(),
                    "one two three",
                    "StringSplit",
                    [" ",1,mappedResult],
                    1
                );

                testMapped2(
                    "String.StringSplit(String,map, limit 2)",
                    testMappedSampleData(),
                    "one two three",
                    "StringSplit",
                    [" ",2,mappedResult],
                    2
                );


                testMapped2(
                    "String.StringSplit(String,map, limit 99)",
                    testMappedSampleData(),
                    "one two three",
                    "StringSplit",
                    [" ",99,mappedResult],
                    99
                );

                testBasic("String.RegExpSplit(RegExp)",
                    "one two three"
                    .RegExpSplit(/\s/)
                );


                testBasicLimit("String.RegExpSplit(RegExp, limit 1)",
                    "one two three"
                    .RegExpSplit(/\s/,1),1
                );

                testBasicLimit("String.RegExpSplit(RegExp limit 2)",
                    "one two three"
                    .RegExpSplit(/\s/,2),2
                );

                testBasic("String.RegExpSplit(RegExp, limit 3)",
                    "one two three"
                    .RegExpSplit(/\s/,3)
                );

                testBasic("String.RegExpSplit(RegExp, limit 99)",
                    "one two three"
                    .RegExpSplit(/\s/,99)
                );

                testMapped2(
                    "String.RegExpSplit(RegExp,map)",
                    testMappedSampleData(),
                    "one two three",
                    "RegExpSplit",
                    [/\s/,undefined,mappedResult]
                );


                testBasic("String.mapSplit(String)",
                    "one two three"
                    .mapSplit(" ")
                );

                testBasic("String.mapSplit(/\\s/)",
                    "one two three"
                    .mapSplit(/\s/)
                );

                testBasic("String.mapSplit([/\\s/])",
                    "one two three"
                    .mapSplit([/\s/])
                );


                testBasic("String.mapSplit([' '])",
                    "one two three"
                    .mapSplit([" "])
                );

                testMapped2(
                    "String.mapSplit(String,map)",
                    testMappedSampleData(),
                    "one two three",
                    "mapSplit",
                    [" ",undefined,mappedResult]
                );

                testMapped2(
                    "String.mapSplit(String,map limit 1)",
                    testMappedSampleData(),
                    "one two three",
                    "mapSplit",
                    [" ",1,mappedResult],1
                );

                testMapped2(
                    "String.mapSplit(String,map limit 2)",
                    testMappedSampleData(),
                    "one two three",
                    "mapSplit",
                    [" ",2,mappedResult],2
                );


                testMapped2(
                    "String.mapSplit(String,map limit 3)",
                    testMappedSampleData(),
                    "one two three",
                    "mapSplit",
                    [" ",3,mappedResult],3
                );

                testMapped2(
                    "String.mapSplit(String,map limit 99)",
                    testMappedSampleData(),
                    "one two three",
                    "mapSplit",
                    [" ",99,mappedResult],99
                );

                testBasic("String.mapSplit(RegExp)",
                    "one two three"
                    .mapSplit(/\s/)
                );

                testMapped2(
                    "String.mapSplit(RegExp,map)",
                    testMappedSampleData(),
                    "one two three",
                    "mapSplit",
                    [/\s/,undefined,mappedResult]
                );


                testNotFound("notFound returns null:ArraySplit(null)",
                    "i searched all around the world".ArraySplit(null)
                );

                testNotFound("notFound returns null:ArraySplit(null- false positive)",
                    "i searched all around the world for a null token".ArraySplit(null)
                );

                testNotFound("notFound returns null:ArraySplit(undefined)",
                    "i searched all around the world".ArraySplit()
                );

                testNotFound("notFound returns null:ArraySplit(undefined- false positive)",
                    "i searched all around the world for a an undefined item".ArraySplit()
                );

                testNotFound("notFound returns null:ArraySplit([])",
                    "i searched all around the world".ArraySplit([])
                );

                testNotFound("notFound returns null:ArraySplit({})",
                    "i searched all around the world".ArraySplit({})
                );

                testNotFound("notFound returns null:ArraySplit('')",
                    "i searched all around the world".ArraySplit('')
                );

                testNotFound("notFound returns null:ArraySplit('')",
                    "i searched all around the world".ArraySplit(['pigs','fly'])
                );

                testNotFound("notFound returns null:ArraySplit('')",
                    "i searched all around the world".ArraySplit('pigs')
                );

                testTokensRejoin(
                    "String.ArraySplit(Strings x 4 hits)",
                    "the quick brown fox jumps over the lazy dog",
                    String.ArraySplit("the quick brown fox jumps over the lazy dog",
                    ["the","jumps","lazy","dog"]));

                testTokensRejoin(
                    "String.ArraySplit(Strings 4 misses)",
                    "the quick brown fox jumps over the lazy dog",
                    String.ArraySplit("the quick brown fox jumps over the lazy dog",
                    ["jumper","jumping","lazier","wolf"]));

                testTokensRejoin(
                    "String.ArraySplit(Strings x 4 hits + 4 misses)",
                    "the quick brown fox jumps over the lazy dog",
                    String.ArraySplit("the quick brown fox jumps over the lazy dog",
                    ["the","jumper","jumping","jumps","lazier","lazy","wolf","dog"]));


                StringTests(String,"String","ArraySplit");
                StringTests(String,"String","mapSplit");

                StringTests(false,'"string literal"',"ArraySplit");
                StringTests(false,'"string literal"',"mapSplit");
                StringTests(false,'"string literal"',"StringSplit","String");
                StringTests(false,'"string literal"',"RegExpSplit","RegExp");

                function testNotFound (name,data) {
                    if (data===null) {
                        if (verbose) console.log("PASS: > "+name);

                        return true;
                    } else {
                        console.log("FAIL: > "+name);
                        console.log({testBasic:{got:data,expected:null}});
                        throw new Error("test failed");
                    }

                }

                function testBasic(name,data) {

                    var sample = ["one","two","three"],
                        sample_json=getSafeJson(sample);

                    if (data && getSafeJson(data)===sample_json) {
                        if (verbose) console.log("PASS: > "+name);

                        return true;
                    }
                    console.log("FAIL: > "+name);
                    console.log({testBasic:{got:data,expected:sample}});
                    throw new Error("test failed");
                }

                function testBasicLimit(name,data,limit) {

                    var sample = ["one","two","three"].slice(0,limit),
                        sample_json=getSafeJson(sample);

                    if (data && getSafeJson(data)===sample_json) {
                        if (verbose) console.log("PASS: > "+name);

                        return true;
                    }
                    console.log("FAIL: > "+name);
                    console.log({testBasicLimit:{got:data,expected:sample,limit:limit}});
                    throw new Error("test failed");
                }

                function testWords(name,data){
                    var
                    WordsSample = [ '', ' quick brown ', ' jumps over ', ' lazy ' ],
                    WordsSampleJSON = getSafeJson(WordsSample) ;

                    if (
                         data && getSafeJson(data) === WordsSampleJSON
                      )  {
                            if (verbose) console.log("PASS: > "+name);

                            return true;
                        }
                    console.log("FAIL: > "+name);
                    console.dir({testWords:{got:data,expected:WordsSample}},{depth:null});
                    throw new Error("test failed");
                }

                function testMappedSampleData(isRegExp) {

                    var
                    src = "one two three",
                    ix1 = src.indexOf("one"),
                    ix2 = src.indexOf("two"),
                    ix3 = src.indexOf("three"),


                    //    01234567890123
                    //   "one two three"
                    //
                    //              0       1     2            3       4        5
                    //              text    index array        start   end      delimit
                    row1=reparse([ 'one',   0,    [],          ix1,    ix1+3+1,   ' ']),
                    row2=reparse([ 'two',   1,    [row1],      ix2,    ix2+3+1,   ' ']),
                    row3=reparse([ 'three', 2,    [row1,row2], ix3,    null,     null]);

                    /*if (isRegExp) {
                        row1[6]={ exec: [ ' ' ], index: 3, input: 'one two three' };
                        row2[2]=[row1];
                        row2[6]={ exec: [ ' ' ], index: 7, input: 'one two three' };
                        row2=reparse(row2);
                        row3[2]=reparse([row1,row2]);
                    }*/
                    return reparse([row1,row2,row3]);
                }

                function testMapped(name,data,sample) {
                    var json= getSafeJson(data);
                    if (data && sample===json) {
                        if (verbose) console.log("PASS: > "+name);

                        return true;
                    }
                    console.dir({testMapped:{got:JSON.parse(json),expected:JSON.parse(sample)}},{depth:null});
                    console.log("FAIL: > "+name);
                    throw new Error("test failed");
                }

                function testMapped2(name,sample,obj,fn,args,limit) {
                    var history=[];
                    var FN=obj[fn];
                    var cb = args.pop();
                    args.push (mycb);
                    var ix = 0;
                    if (limit && (limit <= sample.length)) {
                        sample.splice(limit,sample.length);
                        sample[limit-1][4]=null;
                        sample[limit-1][5]=null;
                    }

                    if (limit ) {
                        if  (limit > sample.length)  {
                            limit = sample.length;
                        }
                    }
                    return FN.apply(obj,args);

                    function mycb() {
                        var cb_args = cpArgs(arguments);
                        if (ix> sample.length) {
                            if (history.length>0){
                                console.log({prev_:history});
                            }
                            console.log({extra:cb_args,callNo:ix,limit:limit});
                            throw new Error ("too many calls to callback");
                        }
                        if (getArrayJson(sample[ix])!==getArrayJson(cb_args)) {
                            if (history.length>0){
                                history.forEach(function(h,ix){
                                    console.log({ix:ix,good:h});
                                });
                            }
                            console.log({ix:ix,got_____:cb_args});
                            console.log({ix:ix,expected:sample[ix]});
                            console.log({limit:limit});
                            throw new Error ("incorrect args");
                        }
                        history.push(cb_args);
                        ix++;
                        return cb.apply(this,cb_args);
                    }
                }

                function mappedResult(){
                    return reparse(cpArgs(arguments));
                }

                function mappedTextResult(x,ix,ar){
                    return reparse({x :x,ix: ix, ar:ar});
                }

                function ArrayMapSampleData() {

                    var
                    array_call0=reparse({ ar: [], ix: 0, x: ''/*the*/ }),
                    array_call1=reparse({ ar: [ array_call0 ], ix: 1, x: ' quick brown '/*fox*/ }),
                    array_call2=reparse({ ar: [ array_call0,array_call1 ], ix: 2, x: ' jumps over '/*the*/ }),
                    array_call3=reparse({ ar: [ array_call0,array_call1,array_call2 ], ix: 3, x: ' lazy '/*dog*/ }),

                    ArrayMapSample =
                    [
                        array_call0,
                        array_call1,
                        array_call2,
                        array_call3
                    ];
                    return ArrayMapSample;
                }

                function testArrayMap(name,data){
                    var json = getArrayJson(data);
                    if (
                         json === ArrayMapSampleJSON
                      )  {
                            if (verbose) console.log("PASS: > "+name);
                            return true;
                        }
                    console.dir({testArrayMap:{got__raw:data,got_sort:JSON.parse(json),expected:ArrayMapSample,got_json:json,expt_json:ArrayMapSampleJSON}},{depth:null});
                    console.log("FAIL: > "+name);
                    throw new Error("test failed");
                }

                function testTokensRejoin (name,source,data) {

                    if (data===null) {
                        if (verbose) console.log("PASS: > "+name+" (barely - data is null)");
                        return true;
                    }
                    var
                    tokens = data.tokens,
                    rejoined=tokens.map(function(e){return e.split||e.text;}).join('');

                    if (rejoined===source) {
                        if (verbose) console.log("PASS: > "+name);

                        return true;
                    } else {
                        console.log("FAIL: > "+name);
                        console.log({testTokensRejoin:{got:data,rejoined:rejoined,expected:source}});
                        throw new Error("test failed");
                    }
                }

                function StringTestsWrap(obj,objName,func,objFunc,filter){



                    testNotFound("notFound returns null:"+objName+"."+func+"(null)",
                        //obj[func](source,
                        objFunc(
                            null)
                    );

                    testNotFound("notFound returns null:"+objName+"."+func+"(null- false positive)",
                        //obj[func](source,
                        objFunc.call(this+" null token",null)
                    );

                    testNotFound("notFound returns null:"+objName+"."+func+"(undefined)",
                        //obj[func](source,
                        objFunc()
                    );

                    testNotFound("notFound returns null:"+objName+"."+func+"(undefined - false positive)",
                        //obj[func](source,
                        objFunc.call(this+" was undefined.")
                    );

                    testNotFound("notFound returns null:"+objName+"."+func+"([])",
                        //obj[func](source,
                        objFunc(
                            [])
                    );

                    testNotFound("notFound returns null:"+objName+"."+func+"({})",
                        //obj[func](source,
                        objFunc(
                            {})
                    );

                    if (!filter || filter.indexOf("Array")>=0 ) {

                        testNotFound("notFound returns null:"+objName+"."+func+"(String,String)",
                            //obj[func](source,
                            objFunc(
                                ["pigs","fly"])
                        );

                        testNotFound("notFound returns null:"+objName+"."+func+"(RegExp,RegExp)",
                            //obj[func](source,
                            objFunc(
                                [/pigs/,/fly/])
                        );

                        testNotFound("notFound returns null:"+objName+"."+func+"(Wordsearch,Wordsearch)",
                            //obj[func](source,
                            objFunc(
                                [String.Wordsearch("pigs"),String.Wordsearch("fly")])
                        );

                    }

                    if (!filter || filter.indexOf("String")>=0 ) {


                        testNotFound("notFound returns null:"+objName+"."+func+"(Wordsearch([String,String]))",
                            //obj[func](source,
                            objFunc(
                                String.Wordsearch(["pigs","fly"]))
                        );
                    }

                    if (!filter || filter.indexOf("Array")>=0 ) {

                        testNotFound("notFound returns null:"+objName+"."+func+"(String,RegExp,Wordsearch)",
                            //obj[func](source,
                            objFunc(
                                ["pigs",/fly/,String.Wordsearch("quickly")])
                        );


                        testWords(
                            objName+"."+func+"([String,String,String])",
                            //obj[func](source,
                            objFunc(
                                ["the","fox","dog"])
                        );

                        testWords(
                            objName+"."+func+"([RegExp,RegExp,RegExp])",
                            //obj[func](source,
                            objFunc(
                                [/the/,/fox/,/dog/])
                        );



                        testWords(
                            objName+"."+func+"([Wordsearch,Wordsearch,Wordsearch])",
                            //obj[func](source,
                            objFunc(
                                [String.Wordsearch("the"),
                                    String.Wordsearch("fox"),
                                        String.Wordsearch("dog")])
                        );

                        testWords(
                            objName+"."+func+"(WordsSearch([String,String,String]))",
                            //obj[func](source,
                            objFunc(
                                String.Wordsearch(["the","fox","dog"]))
                        );

                        testWords(
                            objName+"."+func+"([Wordsearch(String),String,RegExp])",
                            //obj[func](source,
                            objFunc(
                                [String.Wordsearch("the"),"fox",/dog/])
                        );

                        testWords(
                            objName+"."+func+"([String,String,String,notfound])",
                            //obj[func](source,
                            objFunc(
                                ["the","fox","dog","extra"])
                        );

                        testWords(
                            objName+"."+func+"([RegExp,RegExp,RegExp,notfound])",
                            //obj[func](source,
                            objFunc(
                                [/the/,/fox/,/dog/,/extra/])
                        );

                        testWords(
                            objName+"."+func+"([Wordsearch,Wordsearch,Wordsearch,notfound])",
                            //obj[func](source,
                            objFunc(
                                [String.Wordsearch("the"),
                                    String.Wordsearch("fox"),
                                        String.Wordsearch("dog"),
                                            String.Wordsearch("extra")])
                        );


                        testWords(
                            objName+"."+func+"(WordsSearch([String,String,String,notfound]))",
                            //obj[func](source,
                            objFunc(
                                String.Wordsearch(["the","fox","dog","extra"]))
                        );

                        testWords(
                            objName+"."+func+"([Wordsearch(String),String,RegExp,notfound])",
                            //obj[func](source,
                            objFunc(
                                [String.Wordsearch("the"),"fox",/dog/,"extra"])
                        );
                    }

                    if (!filter || filter.indexOf("Array")>=0 || filter.indexOf("Object")>=0 ) {

                        testWords(
                            objName+"."+func+"({assorted keys})",
                            //obj[func](source,
                            objFunc(
                                {
                                    stupidKey:"the",
                                    dumbKey:/fox/,
                                    crazyKey :["dog".toWordsearch()],
                                    missingKey:String.Wordsearch([{gone:"cat"}])} )
                        );

                    }

                    if (!filter || filter.indexOf("Array")>=0 ) {

                        testArrayMap(
                            objName+"."+func+"([String,String,String])",
                            //obj[func](source,
                            objFunc(
                                ["the","fox","dog"],
                                undefined,mappedTextResult)
                        );

                        testArrayMap(
                            objName+"."+func+"([RegExp,RegExp,RegExp])",
                            //obj[func](source,
                            objFunc(
                                    [/the/,/fox/,/dog/],
                                    undefined,mappedTextResult)
                        );

                        testArrayMap(
                            objName+"."+func+"([Wordsearch,Wordsearch,Wordsearch])",
                            //obj[func](source,
                            objFunc(
                                [String.Wordsearch("the"),
                                    String.Wordsearch("fox"),
                                        String.Wordsearch("dog")],
                                undefined,mappedTextResult)
                            );

                        testArrayMap(
                            objName+"."+func+"(WordsSearch([String,String,String]))",
                            //obj[func](source,
                            objFunc(
                                String.Wordsearch(["the","fox","dog"]),
                                undefined,mappedTextResult)
                        );

                        testArrayMap(
                            objName+"."+func+"([Wordsearch(String),String,RegExp])",
                            //obj[func](source,
                            objFunc(
                                [String.Wordsearch("the"),"fox",/dog/],
                                undefined,mappedTextResult)
                        );

                        testArrayMap(
                            objName+"."+func+"([String,String,String,notfound])",
                            //obj[func](source,
                            objFunc(
                                ["the","fox","dog","extra"],
                                undefined,mappedTextResult)
                        );

                        testArrayMap(
                            objName+"."+func+"([RegExp,RegExp,RegExp,notfound])",
                            //obj[func](source,
                            objFunc(
                                [/the/,/fox/,/dog/,/extra/],
                                undefined,mappedTextResult)
                        );

                        testArrayMap(
                            objName+"."+func+"([Wordsearch,Wordsearch,Wordsearch,notfound])",
                            //obj[func](source,
                            objFunc(
                                [String.Wordsearch("the"),
                                    String.Wordsearch("fox"),
                                        String.Wordsearch("dog"),
                                            String.Wordsearch("extra")],
                                undefined,mappedTextResult)
                        );

                        testArrayMap(
                            objName+"."+func+"(WordsSearch([String,String,String,notfound]))",
                            //obj[func](source,
                            objFunc(
                                String.Wordsearch(["the","fox","dog","extra"]),
                                undefined,mappedTextResult)
                        );

                        testArrayMap(
                            objName+"."+func+"([Wordsearch(String),String,RegExp,notfound])",
                            //obj[func](source,
                            objFunc(
                            [String.Wordsearch("the"),"fox",/dog/,"extra"],
                            undefined,mappedTextResult)
                        );
                    }

                    if (!filter || filter.indexOf("Array")>=0 || filter.indexOf("Object")>=0 ) {

                        testArrayMap(
                            objName+"."+func+"([asorted keys via testArrayMap ])",
                            //obj[func](source,
                            objFunc(
                            {
                            stupidKey:"the",
                            dumbKey:/fox/,
                            crazyKey :["dog".toWordsearch()],
                            missingKey:String.Wordsearch([{gone:"cat"}])},
                            undefined,mappedTextResult)
                        );

                    }

                }

                function StringTests(obj,objName,func,filter){

                    var source = "the quick brown fox jumps over the lazy dog";
                    var theObj=(obj?obj:source);
                    var objFunc = theObj[func];
                    if (obj) {
                        objFunc = objFunc.bind(theObj,source) ;
                    } else {
                        objFunc = objFunc.bind(source) ;
                    }
                    return StringTestsWrap.bind(source)(theObj,objName,func,objFunc,filter);

                }

                function getSafeJson(x){
                    /*
                      replaces:

                        - circular Array references with {circular:"Array"}
                        - circular Object references with {circular:"Object"}
                        - the result of RegExp.exec with { exec:[], index:0, input:''  } etc

                       mainly used for speedy object equivalence testing
                    */
                    var
                    cache = [],output = JSON.stringify(x, replacer);
                    cache.splice(0,cache.length);
                    return output;

                    function replacer (key, value) {

                        if (typeof value === 'object' && value !== null) {

                            if (isExec(value)) {
                                return execToJson(value);
                            }

                            if (cache.indexOf(value) !== -1) {
                                // Circular reference found, discard key
                                return {circular : jsClass(value)};
                            }
                            // Store value in our collection
                            cache.push(value);
                        }


                        return value;
                    }

                    function execToJson (e) {
                        var r={exec:e.slice(0)};Object.keys(e).filter(function(x,ix){
                            return x != ix.toString();})
                            .forEach(function(k){r[k]=e[k];});
                        return r;
                    }

                    function isExec (e) {
                        return typeof e==='object' &&
                        e.constructor===Array&&
                        typeof e.index==='number'&&
                        typeof e.input==='string';
                    }

                }

                function reparse (x) {
                    //creates cloned copy of the passed in object
                    return JSON.parse(getSafeJson(x));
                }

                function sortKeys (db){
                    switch (jsClass(db)){
                        case "Array":return db.map(sortKeys);
                        case "Object":
                            var k = Object.keys(db);
                            k.sort();
                            var r = {};
                            k.forEach(function(K){
                                r[K]=sortKeys(db[K]);
                            });
                            return r;
                        default: return db;
                    }

                }

                function getArrayJson (A) {
                    return getSafeJson(sortKeys (A));
                }

            });

        }

        function Function_extensions (func) {

                    var
                    nodeExtsMod,
                    nodeGetPath,
                    CB_TOKEN=[{cb:null}],
                    WS_PATH = "/javascript.Function.load",
                    ws_static_path = "/js/",
                    WS_PORT = 3029;

                    if (Object.env.isNode) {
                        nodeExtsMod = nodeExts(WS_PATH,ws_static_path,WS_PORT,cpArgs,__filename);
                        nodeGetPath=nodeExtsMod.nodeGetPath;
                        func("startServer",nodeExtsMod.nodeWSServer);
                    }

                    /*
                    function getNodeHandlers(root,files,app) {

                        var index={},urls,
                            node= {fs:require("fs"),path:require("path")};

                            Object.keys(files).forEach(function(uri){
                                index[node.path.join(root,uri)]=files[uri];
                            });
                            urls=Object.keys(index);

                            if (  typeof app==='object' &&
                                  app.use &&
                                  app.get &&
                                  app.route ) {
                                  var express=require("express");
                                  urls.forEach(function(url){
                                      app.use(url,express.static(urls[url]));
                                  });
                            } else {



                                return function(req,res,next) {

                                    var check=function(i,cb) {
                                        if (i<urls.length) {

                                            var url=urls[i],pth=urls[url];
                                            if (url && pth && req.url===url) {
                                                return node.fs.stat(pth,function(err,stat){
                                                    if (err) return cb(err);
                                                    res.writeHead(200, {
                                                        'Content-Type': 'application/javascript',
                                                        'Content-Length': stat.size
                                                    });
                                                    node.fs.createReadStream(pth).pipe(res);
                                                    return cb();
                                                });
                                            }

                                            return check(++i);
                                        }
                                        cb(true);
                                    };

                                    if (req && req.url && res && res.send) {

                                        check (0,function(err){
                                            if (err) {
                                                if(typeof next==='function') {
                                                    return next();
                                                } else {
                                                    res.writeHead(404, {
                                                        'Content-Type': 'text/html',
                                                        'Content-Length': 0
                                                    });
                                                }
                                            }
                                        });

                                    }

                                };

                            }
                        }

                    function nodeHandlers(app){
                        return getNodeHandlers("/",{"/jsextensions.js":__filename},app);
                    }
        */
                    function browserSocketConnection() {

                        if (browserSocketConnection.singleton) {
                            return browserSocketConnection.singleton;
                        }

                        // Create WebSocket connection.
                        var

                        WSS = location.protocol.startsWith("https")?"wss":"ws",
                        SERVER = location.hostname,
                        WS_URL = WSS+"://" + SERVER + ":" + WS_PORT + WS_PATH,

                        ws = new WebSocket(WS_URL),

                        notifier = function (ev) {
                            var events=[],execute=Function.prototype.call.call.bind(Function.prototype.call);
                            ws.addEventListener(ev, function (event) {
                                var count=events?events.length:0;
                                if (count>0) {
                                    events.forEach(execute);
                                    events.splice(1,count);
                                }
                                events=null;
                            });
                            return {
                                fired : function(){ return events===null;},
                                add : function(fn) {
                                    if (events) events.push(fn);
                                },
                                run : function(fn) {
                                    if (events) events.push(fn); else fn();
                                },
                                remove : function(fn) {
                                    if (!events) return;
                                    if (!fn) return !events.splice(0,events.length);
                                    var ix = events.indexOf(fn);
                                    if (ix>=0)events.splice(fn,1);
                                }
                            };
                        },

                        events = {
                            open:notifier("open"),
                            close:notifier("close")
                        };

                        events.close.add(function(){
                            events.open.remove();
                        });

                        // Listen for messages
                        var callbacks={};
                        ws.addEventListener('message', function (event) {
                            var payload=JSON.parse(event.data);
                            var callback = callbacks[payload.id];
                            if (callback) {
                                callback.fn.apply(callback.THIS,payload.args);
                                events.close.remove(callback.cleanup);
                                callback.cleanup();
                            }
                        });

                        browserSocketConnection.singleton = {
                            call : function () {
                                var args = cpArgs(arguments);
                                var fn = args.shift();
                                var cb = (typeof args[args.length-1]==='function') ? args.pop() : undefined;
                                if (cb) {
                                    args.push(CB_TOKEN);
                                    var id = (Math.random()*1024).toString(36) + Date.now().toString(36);
                                    var cleanup = function(){delete callbacks[id];};
                                    events.close.add(cleanup);
                                    callbacks[id]={fn:cb,THIS:this,cleanup:cleanup};
                                    events.open.run(function () {ws.send(JSON.stringify({fn:fn,id:id,args:args}));});
                                } else {
                                    events.open.run(function () {ws.send(JSON.stringify({fn:fn,args:args}));});
                                }
                            }
                        };
                        return browserSocketConnection.singleton;
                    }

                    // if function /module name is available you get a callback
                    // if not, you don't (ever) get a callback
                    func("load",function(name,cb){

                        if (Object.env.isNode) {

                            return nodeGetPath(name) ? cb(require(name)) : undefined;

                        } else {
                            var winName = name.toCamelCase();
                            return window[winName] ? cb(window[winName])

                            : browserSocketConnection().call("load",name,location.protocol, location.hostname,function(payload){

                                var script = document.createElement("script");
                                script.onload = script.onreadystatechange = function(_, isAbort) {
                                    if (isAbort || !script.readyState || script.readyState == "loaded" || script.readyState == "complete") {
                                        script = script.onload = script.onreadystatechange = null;
                                        if (window[winName]) {
                                            cb(window[winName]);
                                        }
                                    }
                                };
                                script[payload.mode] = payload.data;
                                document.head.appendChild(script);

                            });

                        }
                    });
                    func("browserInternalRequire",(function(){
                    var cache={},
                        factories={
                            util : getUtil
                        };
                        function browserInternalRequire(mod){
                            if (cache[mod]) return cache[mod];
                            if (!!factories[mod]) return (cache[mod]=factories[mod]());
                        }
                        browserInternalRequire.resolve= function browserInternalResolve(mod){
                            return factories[mod]||false;
                        };

                        return browserInternalRequire;
                    })());

                }

        function Date_toJSON(){
            // this is NOT a polyfill in the normal sense
            // instead it installs to additional methods to Date:
            // JSON_on and JSON_off, to allow disabling the normal JSON.stringify behaviour
            // this is needed if have to use a replacer function that wishses to encode Date differnently
            // otherwise you are simply given a preencoded date as a string, and would need to parse every
            // string to determine if it was in fact a date. by deleting the toJSON method before calling
            // JSON.stringify() you are instead presented with a normal Date instance (an Object with constructor Date)
            // this is far quicker to detect. to acheive this quickly, the original toJson prototype
            // is backed up into a defineProperties payload ready to be shimmed at will

            // for convenience, a JSON.stringify_dates wrapper function is added
            // to allow calling of JSON.stringify with Date.JSON_off() called first
            if (typeof JSON.stringify_dates === 'undefined') {
                Object.defineProperties(JSON,{
                    stringify_dates : {
                        value : function (obj,replacer,spaces) {
                            if (typeof Date.prototype.toJSON==='undefined') {
                                // already turned off
                                return JSON.stringify(obj,replacer,spaces);
                            }
                            try {
                                Date.JSON_off();
                                return JSON.stringify(obj,replacer,spaces);
                            } finally {
                                Date.JSON_on();
                            }
                        }
                    }
                });
            }

            // we only want to invoke the following backup code once, so exit early if we
            // have called this function before.
            if (typeof Date.JSON_off==='function') return true;

            var restore_Date_prototype_toJSON = typeof Date.prototype.toJSON==='function' ? {
                toJSON: {
                    value        : Date.prototype.toJSON,
                    enumerable   : false,
                    configurable : true,
                    writable     : true
                }
            } : false;

            // note - we are extending the Date class here, not Date.prototype (ie not instances of Date but Date itself)
            Object.defineProperties(Date,{
                JSON_off : {
                    enumerable   : false,
                    configurable : true,
                    writable     : true,
                    value : function () {
                            if (restore_Date_prototype_toJSON) {
                                // we need stringify to let functionArgReplacer have the date object verbatim
                                // so delete toJSON from Date.prototype
                                delete Date.prototype.toJSON;
                            }

                    }
                },
                JSON_on : {
                    enumerable   : false,
                    configurable : true,
                    writable     : true,
                    value : function () {
                            if (restore_Date_prototype_toJSON) {
                                Object.defineProperties(Date.prototype,restore_Date_prototype_toJSON);
                            }
                    }
                }
            });

            return true;
        }










    },

    /*isNode=*/
    (
        (!!Object.env && Object.env.isNode) ||

        ( typeof process==='object' &&
          typeof module==='object' &&
          typeof require==='function' &&
          !!require("jspolyfills")
        )

    )
);

var inclusionsEnd;
/* internalRequire files */
(function(x){x[0][x[1]]=(function()    {
        var
        dir,
    cache={},
    aliases={
        "../node_modules/browser-punycode/punycode.js": "punycode",
        "../node_modules/browser-url/url.js": "url",
        "../node_modules/browser-querystring/index.js": "querystring",
        "../node_modules/browser-util/util.js": "util",
        "../node_modules/inherits/inherits.js": "inherits",
        "../node_modules/is-arguments/index.js": "is-arguments",
        "../node_modules/is-generator-function/index.js": "is-generator-function",
        "../node_modules/browser-path/path.js": "path"
    },
        __sim_require = function require(dirname,file) {
          //file = file.search(/^\.{1}/) ===0 ? file.replace(/^\.{1}/,dirname) : file;
          file=aliases[file]||file;
          var mod = cache[file];
          if (mod) return mod;
          if (dir [file]) {
            cache[file] = mod = dir[file].load();
            return mod;
          }
          throw JSON.stringify({error:"file not found",filename:file,dirname : dirname});
        };
    
        
    
        dir = {
             "punycode" : {
            name:"browser-punycode",
            path:"../node_modules/browser-punycode/punycode.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-punycode/punycode.js
                'use strict';
                
                /** Highest positive signed 32-bit float value */
                const maxInt = 2147483647; // aka. 0x7FFFFFFF or 2^31-1
                
                /** Bootstring parameters */
                const base = 36;
                const tMin = 1;
                const tMax = 26;
                const skew = 38;
                const damp = 700;
                const initialBias = 72;
                const initialN = 128; // 0x80
                const delimiter = '-'; // '\x2D'
                
                /** Regular expressions */
                const regexPunycode = /^xn--/;
                const regexNonASCII = /[^\0-\x7E]/; // non-ASCII chars
                const regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g; // RFC 3490 separators
                
                /** Error messages */
                const errors = {
                    'overflow': 'Overflow: input needs wider integers to process',
                    'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
                    'invalid-input': 'Invalid input'
                };
                
                /** Convenience shortcuts */
                const baseMinusTMin = base - tMin;
                const floor = Math.floor;
                const stringFromCharCode = String.fromCharCode;
                
                /*--------------------------------------------------------------------------*/
                
                /**
                 * A generic error utility function.
                 * @private
                 * @param {String} type The error type.
                 * @returns {Error} Throws a `RangeError` with the applicable error message.
                 */
                function error(type) {
                    throw new RangeError(errors[type]);
                }
                
                /**
                 * A generic `Array#map` utility function.
                 * @private
                 * @param {Array} array The array to iterate over.
                 * @param {Function} callback The function that gets called for every array
                 * item.
                 * @returns {Array} A new array of values returned by the callback function.
                 */
                function map(array, fn) {
                    const result = [];
                    let length = array.length;
                    while (length--) {
                        result[length] = fn(array[length]);
                    }
                    return result;
                }
                
                /**
                 * A simple `Array#map`-like wrapper to work with domain name strings or email
                 * addresses.
                 * @private
                 * @param {String} domain The domain name or email address.
                 * @param {Function} callback The function that gets called for every
                 * character.
                 * @returns {Array} A new string of characters returned by the callback
                 * function.
                 */
                function mapDomain(string, fn) {
                    const parts = string.split('@');
                    let result = '';
                    if (parts.length > 1) {
                        // In email addresses, only the domain name should be punycoded. Leave
                        // the local part (i.e. everything up to `@`) intact.
                        result = parts[0] + '@';
                        string = parts[1];
                    }
                    // Avoid `split(regex)` for IE8 compatibility. See #17.
                    string = string.replace(regexSeparators, '\x2E');
                    const labels = string.split('.');
                    const encoded = map(labels, fn).join('.');
                    return result + encoded;
                }
                
                /**
                 * Creates an array containing the numeric code points of each Unicode
                 * character in the string. While JavaScript uses UCS-2 internally,
                 * this function will convert a pair of surrogate halves (each of which
                 * UCS-2 exposes as separate characters) into a single code point,
                 * matching UTF-16.
                 * @see `punycode.ucs2.encode`
                 * @see <https://mathiasbynens.be/notes/javascript-encoding>
                 * @memberOf punycode.ucs2
                 * @name decode
                 * @param {String} string The Unicode input string (UCS-2).
                 * @returns {Array} The new array of code points.
                 */
                function ucs2decode(string) {
                    const output = [];
                    let counter = 0;
                    const length = string.length;
                    while (counter < length) {
                        const value = string.charCodeAt(counter++);
                        if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
                            // It's a high surrogate, and there is a next character.
                            const extra = string.charCodeAt(counter++);
                            if ((extra & 0xFC00) == 0xDC00) { // Low surrogate.
                                output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
                            } else {
                                // It's an unmatched surrogate; only append this code unit, in case the
                                // next code unit is the high surrogate of a surrogate pair.
                                output.push(value);
                                counter--;
                            }
                        } else {
                            output.push(value);
                        }
                    }
                    return output;
                }
                
                /**
                 * Creates a string based on an array of numeric code points.
                 * @see `punycode.ucs2.decode`
                 * @memberOf punycode.ucs2
                 * @name encode
                 * @param {Array} codePoints The array of numeric code points.
                 * @returns {String} The new Unicode string (UCS-2).
                 */
                const ucs2encode = array => String.fromCodePoint(...array);
                
                /**
                 * Converts a basic code point into a digit/integer.
                 * @see `digitToBasic()`
                 * @private
                 * @param {Number} codePoint The basic numeric code point value.
                 * @returns {Number} The numeric value of a basic code point (for use in
                 * representing integers) in the range `0` to `base - 1`, or `base` if
                 * the code point does not represent a value.
                 */
                const basicToDigit = function(codePoint) {
                    if (codePoint - 0x30 < 0x0A) {
                        return codePoint - 0x16;
                    }
                    if (codePoint - 0x41 < 0x1A) {
                        return codePoint - 0x41;
                    }
                    if (codePoint - 0x61 < 0x1A) {
                        return codePoint - 0x61;
                    }
                    return base;
                };
                
                /**
                 * Converts a digit/integer into a basic code point.
                 * @see `basicToDigit()`
                 * @private
                 * @param {Number} digit The numeric value of a basic code point.
                 * @returns {Number} The basic code point whose value (when used for
                 * representing integers) is `digit`, which needs to be in the range
                 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
                 * used; else, the lowercase form is used. The behavior is undefined
                 * if `flag` is non-zero and `digit` has no uppercase form.
                 */
                const digitToBasic = function(digit, flag) {
                    //  0..25 map to ASCII a..z or A..Z
                    // 26..35 map to ASCII 0..9
                    return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
                };
                
                /**
                 * Bias adaptation function as per section 3.4 of RFC 3492.
                 * https://tools.ietf.org/html/rfc3492#section-3.4
                 * @private
                 */
                const adapt = function(delta, numPoints, firstTime) {
                    let k = 0;
                    delta = firstTime ? floor(delta / damp) : delta >> 1;
                    delta += floor(delta / numPoints);
                    for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
                        delta = floor(delta / baseMinusTMin);
                    }
                    return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
                };
                
                /**
                 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
                 * symbols.
                 * @memberOf punycode
                 * @param {String} input The Punycode string of ASCII-only symbols.
                 * @returns {String} The resulting string of Unicode symbols.
                 */
                const decode = function(input) {
                    // Don't use UCS-2.
                    const output = [];
                    const inputLength = input.length;
                    let i = 0;
                    let n = initialN;
                    let bias = initialBias;
                
                    // Handle the basic code points: let `basic` be the number of input code
                    // points before the last delimiter, or `0` if there is none, then copy
                    // the first basic code points to the output.
                
                    let basic = input.lastIndexOf(delimiter);
                    if (basic < 0) {
                        basic = 0;
                    }
                
                    for (let j = 0; j < basic; ++j) {
                        // if it's not a basic code point
                        if (input.charCodeAt(j) >= 0x80) {
                            error('not-basic');
                        }
                        output.push(input.charCodeAt(j));
                    }
                
                    // Main decoding loop: start just after the last delimiter if any basic code
                    // points were copied; start at the beginning otherwise.
                
                    for (let index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {
                
                        // `index` is the index of the next character to be consumed.
                        // Decode a generalized variable-length integer into `delta`,
                        // which gets added to `i`. The overflow checking is easier
                        // if we increase `i` as we go, then subtract off its starting
                        // value at the end to obtain `delta`.
                        let oldi = i;
                        for (let w = 1, k = base; /* no condition */; k += base) {
                
                            if (index >= inputLength) {
                                error('invalid-input');
                            }
                
                            const digit = basicToDigit(input.charCodeAt(index++));
                
                            if (digit >= base || digit > floor((maxInt - i) / w)) {
                                error('overflow');
                            }
                
                            i += digit * w;
                            const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
                
                            if (digit < t) {
                                break;
                            }
                
                            const baseMinusT = base - t;
                            if (w > floor(maxInt / baseMinusT)) {
                                error('overflow');
                            }
                
                            w *= baseMinusT;
                
                        }
                
                        const out = output.length + 1;
                        bias = adapt(i - oldi, out, oldi == 0);
                
                        // `i` was supposed to wrap around from `out` to `0`,
                        // incrementing `n` each time, so we'll fix that now:
                        if (floor(i / out) > maxInt - n) {
                            error('overflow');
                        }
                
                        n += floor(i / out);
                        i %= out;
                
                        // Insert `n` at position `i` of the output.
                        output.splice(i++, 0, n);
                
                    }
                
                    return String.fromCodePoint(...output);
                };
                
                /**
                 * Converts a string of Unicode symbols (e.g. a domain name label) to a
                 * Punycode string of ASCII-only symbols.
                 * @memberOf punycode
                 * @param {String} input The string of Unicode symbols.
                 * @returns {String} The resulting Punycode string of ASCII-only symbols.
                 */
                const encode = function(input) {
                    const output = [];
                
                    // Convert the input in UCS-2 to an array of Unicode code points.
                    input = ucs2decode(input);
                
                    // Cache the length.
                    let inputLength = input.length;
                
                    // Initialize the state.
                    let n = initialN;
                    let delta = 0;
                    let bias = initialBias;
                
                    // Handle the basic code points.
                    for (const currentValue of input) {
                        if (currentValue < 0x80) {
                            output.push(stringFromCharCode(currentValue));
                        }
                    }
                
                    let basicLength = output.length;
                    let handledCPCount = basicLength;
                
                    // `handledCPCount` is the number of code points that have been handled;
                    // `basicLength` is the number of basic code points.
                
                    // Finish the basic string with a delimiter unless it's empty.
                    if (basicLength) {
                        output.push(delimiter);
                    }
                
                    // Main encoding loop:
                    while (handledCPCount < inputLength) {
                
                        // All non-basic code points < n have been handled already. Find the next
                        // larger one:
                        let m = maxInt;
                        for (const currentValue of input) {
                            if (currentValue >= n && currentValue < m) {
                                m = currentValue;
                            }
                        }
                
                        // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
                        // but guard against overflow.
                        const handledCPCountPlusOne = handledCPCount + 1;
                        if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
                            error('overflow');
                        }
                
                        delta += (m - n) * handledCPCountPlusOne;
                        n = m;
                
                        for (const currentValue of input) {
                            if (currentValue < n && ++delta > maxInt) {
                                error('overflow');
                            }
                            if (currentValue == n) {
                                // Represent delta as a generalized variable-length integer.
                                let q = delta;
                                for (let k = base; /* no condition */; k += base) {
                                    const t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
                                    if (q < t) {
                                        break;
                                    }
                                    const qMinusT = q - t;
                                    const baseMinusT = base - t;
                                    output.push(
                                        stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
                                    );
                                    q = floor(qMinusT / baseMinusT);
                                }
                
                                output.push(stringFromCharCode(digitToBasic(q, 0)));
                                bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
                                delta = 0;
                                ++handledCPCount;
                            }
                        }
                
                        ++delta;
                        ++n;
                
                    }
                    return output.join('');
                };
                
                /**
                 * Converts a Punycode string representing a domain name or an email address
                 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
                 * it doesn't matter if you call it on a string that has already been
                 * converted to Unicode.
                 * @memberOf punycode
                 * @param {String} input The Punycoded domain name or email address to
                 * convert to Unicode.
                 * @returns {String} The Unicode representation of the given Punycode
                 * string.
                 */
                const toUnicode = function(input) {
                    return mapDomain(input, function(string) {
                        return regexPunycode.test(string)
                            ? decode(string.slice(4).toLowerCase())
                            : string;
                    });
                };
                
                /**
                 * Converts a Unicode string representing a domain name or an email address to
                 * Punycode. Only the non-ASCII parts of the domain name will be converted,
                 * i.e. it doesn't matter if you call it with a domain that's already in
                 * ASCII.
                 * @memberOf punycode
                 * @param {String} input The domain name or email address to convert, as a
                 * Unicode string.
                 * @returns {String} The Punycode representation of the given domain name or
                 * email address.
                 */
                const toASCII = function(input) {
                    return mapDomain(input, function(string) {
                        return regexNonASCII.test(string)
                            ? 'xn--' + encode(string)
                            : string;
                    });
                };
                
                /*--------------------------------------------------------------------------*/
                
                /** Define the public API */
                const punycode = {
                    /**
                     * A string representing the current Punycode.js version number.
                     * @memberOf punycode
                     * @type String
                     */
                    'version': '2.1.0',
                    /**
                     * An object of methods to convert from JavaScript's internal character
                     * representation (UCS-2) to Unicode code points, and back.
                     * @see <https://mathiasbynens.be/notes/javascript-encoding>
                     * @memberOf punycode
                     * @type Object
                     */
                    'ucs2': {
                        'decode': ucs2decode,
                        'encode': ucs2encode
                    },
                    'decode': decode,
                    'encode': encode,
                    'toASCII': toASCII,
                    'toUnicode': toUnicode
                };
                
                module.exports = punycode;
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-punycode/punycode.js sha1 = 39ab3964d954c66ab440a590444fd7dd3493be37
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-punycode"),"punycode.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-punycode")},
    "url" : {
            name:"browser-url",
            path:"../node_modules/browser-url/url.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-url/url.js
                // Copyright Joyent, Inc. and other Node contributors.
                //
                // Permission is hereby granted, free of charge, to any person obtaining a
                // copy of this software and associated documentation files (the
                // "Software"), to deal in the Software without restriction, including
                // without limitation the rights to use, copy, modify, merge, publish,
                // distribute, sublicense, and/or sell copies of the Software, and to permit
                // persons to whom the Software is furnished to do so, subject to the
                // following conditions:
                //
                // The above copyright notice and this permission notice shall be included
                // in all copies or substantial portions of the Software.
                //
                // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
                // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
                // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
                // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
                // USE OR OTHER DEALINGS IN THE SOFTWARE.
                
                'use strict';
                
                var punycode = require('punycode');
                var util = require('./util');
                
                exports.parse = urlParse;
                exports.resolve = urlResolve;
                exports.resolveObject = urlResolveObject;
                exports.format = urlFormat;
                
                exports.Url = Url;
                
                function Url() {
                  this.protocol = null;
                  this.slashes = null;
                  this.auth = null;
                  this.host = null;
                  this.port = null;
                  this.hostname = null;
                  this.hash = null;
                  this.search = null;
                  this.query = null;
                  this.pathname = null;
                  this.path = null;
                  this.href = null;
                }
                
                // Reference: RFC 3986, RFC 1808, RFC 2396
                
                // define these here so at least they only have to be
                // compiled once on the first module load.
                var protocolPattern = /^([a-z0-9.+-]+:)/i,
                    portPattern = /:[0-9]*$/,
                
                    // Special case for a simple path URL
                    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,
                
                    // RFC 2396: characters reserved for delimiting URLs.
                    // We actually just auto-escape these.
                    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],
                
                    // RFC 2396: characters not allowed for various reasons.
                    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),
                
                    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
                    autoEscape = ['\''].concat(unwise),
                    // Characters that are never ever allowed in a hostname.
                    // Note that any invalid chars are also handled, but these
                    // are the ones that are *expected* to be seen, so we fast-path
                    // them.
                    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
                    hostEndingChars = ['/', '?', '#'],
                    hostnameMaxLen = 255,
                    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
                    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
                    // protocols that can allow "unsafe" and "unwise" chars.
                    unsafeProtocol = {
                      'javascript': true,
                      'javascript:': true
                    },
                    // protocols that never have a hostname.
                    hostlessProtocol = {
                      'javascript': true,
                      'javascript:': true
                    },
                    // protocols that always contain a // bit.
                    slashedProtocol = {
                      'http': true,
                      'https': true,
                      'ftp': true,
                      'gopher': true,
                      'file': true,
                      'http:': true,
                      'https:': true,
                      'ftp:': true,
                      'gopher:': true,
                      'file:': true
                    },
                    querystring = require('querystring');
                
                function urlParse(url, parseQueryString, slashesDenoteHost) {
                  if (url && util.isObject(url) && url instanceof Url) return url;
                
                  var u = new Url;
                  u.parse(url, parseQueryString, slashesDenoteHost);
                  return u;
                }
                
                Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
                  if (!util.isString(url)) {
                    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
                  }
                
                  // Copy chrome, IE, opera backslash-handling behavior.
                  // Back slashes before the query string get converted to forward slashes
                  // See: https://code.google.com/p/chromium/issues/detail?id=25916
                  var queryIndex = url.indexOf('?'),
                      splitter =
                          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
                      uSplit = url.split(splitter),
                      slashRegex = /\\/g;
                  uSplit[0] = uSplit[0].replace(slashRegex, '/');
                  url = uSplit.join(splitter);
                
                  var rest = url;
                
                  // trim before proceeding.
                  // This is to support parse stuff like "  http://foo.com  \n"
                  rest = rest.trim();
                
                  if (!slashesDenoteHost && url.split('#').length === 1) {
                    // Try fast path regexp
                    var simplePath = simplePathPattern.exec(rest);
                    if (simplePath) {
                      this.path = rest;
                      this.href = rest;
                      this.pathname = simplePath[1];
                      if (simplePath[2]) {
                        this.search = simplePath[2];
                        if (parseQueryString) {
                          this.query = querystring.parse(this.search.substr(1));
                        } else {
                          this.query = this.search.substr(1);
                        }
                      } else if (parseQueryString) {
                        this.search = '';
                        this.query = {};
                      }
                      return this;
                    }
                  }
                
                  var proto = protocolPattern.exec(rest);
                  if (proto) {
                    proto = proto[0];
                    var lowerProto = proto.toLowerCase();
                    this.protocol = lowerProto;
                    rest = rest.substr(proto.length);
                  }
                
                  // figure out if it's got a host
                  // user@server is *always* interpreted as a hostname, and url
                  // resolution will treat //foo/bar as host=foo,path=bar because that's
                  // how the browser resolves relative URLs.
                  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
                    var slashes = rest.substr(0, 2) === '//';
                    if (slashes && !(proto && hostlessProtocol[proto])) {
                      rest = rest.substr(2);
                      this.slashes = true;
                    }
                  }
                
                  if (!hostlessProtocol[proto] &&
                      (slashes || (proto && !slashedProtocol[proto]))) {
                
                    // there's a hostname.
                    // the first instance of /, ?, ;, or # ends the host.
                    //
                    // If there is an @ in the hostname, then non-host chars *are* allowed
                    // to the left of the last @ sign, unless some host-ending character
                    // comes *before* the @-sign.
                    // URLs are obnoxious.
                    //
                    // ex:
                    // http://a@b@c/ => user:a@b host:c
                    // http://a@b?@c => user:a host:c path:/?@c
                
                    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
                    // Review our test case against browsers more comprehensively.
                
                    // find the first instance of any hostEndingChars
                    var hostEnd = -1;
                    for (var i = 0; i < hostEndingChars.length; i++) {
                      var hec = rest.indexOf(hostEndingChars[i]);
                      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                        hostEnd = hec;
                    }
                
                    // at this point, either we have an explicit point where the
                    // auth portion cannot go past, or the last @ char is the decider.
                    var auth, atSign;
                    if (hostEnd === -1) {
                      // atSign can be anywhere.
                      atSign = rest.lastIndexOf('@');
                    } else {
                      // atSign must be in auth portion.
                      // http://a@b/c@d => host:b auth:a path:/c@d
                      atSign = rest.lastIndexOf('@', hostEnd);
                    }
                
                    // Now we have a portion which is definitely the auth.
                    // Pull that off.
                    if (atSign !== -1) {
                      auth = rest.slice(0, atSign);
                      rest = rest.slice(atSign + 1);
                      this.auth = decodeURIComponent(auth);
                    }
                
                    // the host is the remaining to the left of the first non-host char
                    hostEnd = -1;
                    for (var i = 0; i < nonHostChars.length; i++) {
                      var hec = rest.indexOf(nonHostChars[i]);
                      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                        hostEnd = hec;
                    }
                    // if we still have not hit it, then the entire thing is a host.
                    if (hostEnd === -1)
                      hostEnd = rest.length;
                
                    this.host = rest.slice(0, hostEnd);
                    rest = rest.slice(hostEnd);
                
                    // pull out port.
                    this.parseHost();
                
                    // we've indicated that there is a hostname,
                    // so even if it's empty, it has to be present.
                    this.hostname = this.hostname || '';
                
                    // if hostname begins with [ and ends with ]
                    // assume that it's an IPv6 address.
                    var ipv6Hostname = this.hostname[0] === '[' &&
                        this.hostname[this.hostname.length - 1] === ']';
                
                    // validate a little.
                    if (!ipv6Hostname) {
                      var hostparts = this.hostname.split(/\./);
                      for (var i = 0, l = hostparts.length; i < l; i++) {
                        var part = hostparts[i];
                        if (!part) continue;
                        if (!part.match(hostnamePartPattern)) {
                          var newpart = '';
                          for (var j = 0, k = part.length; j < k; j++) {
                            if (part.charCodeAt(j) > 127) {
                              // we replace non-ASCII char with a temporary placeholder
                              // we need this to make sure size of hostname is not
                              // broken by replacing non-ASCII by nothing
                              newpart += 'x';
                            } else {
                              newpart += part[j];
                            }
                          }
                          // we test again with ASCII char only
                          if (!newpart.match(hostnamePartPattern)) {
                            var validParts = hostparts.slice(0, i);
                            var notHost = hostparts.slice(i + 1);
                            var bit = part.match(hostnamePartStart);
                            if (bit) {
                              validParts.push(bit[1]);
                              notHost.unshift(bit[2]);
                            }
                            if (notHost.length) {
                              rest = '/' + notHost.join('.') + rest;
                            }
                            this.hostname = validParts.join('.');
                            break;
                          }
                        }
                      }
                    }
                
                    if (this.hostname.length > hostnameMaxLen) {
                      this.hostname = '';
                    } else {
                      // hostnames are always lower case.
                      this.hostname = this.hostname.toLowerCase();
                    }
                
                    if (!ipv6Hostname) {
                      // IDNA Support: Returns a punycoded representation of "domain".
                      // It only converts parts of the domain name that
                      // have non-ASCII characters, i.e. it doesn't matter if
                      // you call it with a domain that already is ASCII-only.
                      this.hostname = punycode.toASCII(this.hostname);
                    }
                
                    var p = this.port ? ':' + this.port : '';
                    var h = this.hostname || '';
                    this.host = h + p;
                    this.href += this.host;
                
                    // strip [ and ] from the hostname
                    // the host field still retains them, though
                    if (ipv6Hostname) {
                      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
                      if (rest[0] !== '/') {
                        rest = '/' + rest;
                      }
                    }
                  }
                
                  // now rest is set to the post-host stuff.
                  // chop off any delim chars.
                  if (!unsafeProtocol[lowerProto]) {
                
                    // First, make 100% sure that any "autoEscape" chars get
                    // escaped, even if encodeURIComponent doesn't think they
                    // need to be.
                    for (var i = 0, l = autoEscape.length; i < l; i++) {
                      var ae = autoEscape[i];
                      if (rest.indexOf(ae) === -1)
                        continue;
                      var esc = encodeURIComponent(ae);
                      if (esc === ae) {
                        esc = escape(ae);
                      }
                      rest = rest.split(ae).join(esc);
                    }
                  }
                
                
                  // chop off from the tail first.
                  var hash = rest.indexOf('#');
                  if (hash !== -1) {
                    // got a fragment string.
                    this.hash = rest.substr(hash);
                    rest = rest.slice(0, hash);
                  }
                  var qm = rest.indexOf('?');
                  if (qm !== -1) {
                    this.search = rest.substr(qm);
                    this.query = rest.substr(qm + 1);
                    if (parseQueryString) {
                      this.query = querystring.parse(this.query);
                    }
                    rest = rest.slice(0, qm);
                  } else if (parseQueryString) {
                    // no query string, but parseQueryString still requested
                    this.search = '';
                    this.query = {};
                  }
                  if (rest) this.pathname = rest;
                  if (slashedProtocol[lowerProto] &&
                      this.hostname && !this.pathname) {
                    this.pathname = '/';
                  }
                
                  //to support http.request
                  if (this.pathname || this.search) {
                    var p = this.pathname || '';
                    var s = this.search || '';
                    this.path = p + s;
                  }
                
                  // finally, reconstruct the href based on what has been validated.
                  this.href = this.format();
                  return this;
                };
                
                // format a parsed object into a url string
                function urlFormat(obj) {
                  // ensure it's an object, and not a string url.
                  // If it's an obj, this is a no-op.
                  // this way, you can call url_format() on strings
                  // to clean up potentially wonky urls.
                  if (util.isString(obj)) obj = urlParse(obj);
                  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
                  return obj.format();
                }
                
                Url.prototype.format = function() {
                  var auth = this.auth || '';
                  if (auth) {
                    auth = encodeURIComponent(auth);
                    auth = auth.replace(/%3A/i, ':');
                    auth += '@';
                  }
                
                  var protocol = this.protocol || '',
                      pathname = this.pathname || '',
                      hash = this.hash || '',
                      host = false,
                      query = '';
                
                  if (this.host) {
                    host = auth + this.host;
                  } else if (this.hostname) {
                    host = auth + (this.hostname.indexOf(':') === -1 ?
                        this.hostname :
                        '[' + this.hostname + ']');
                    if (this.port) {
                      host += ':' + this.port;
                    }
                  }
                
                  if (this.query &&
                      util.isObject(this.query) &&
                      Object.keys(this.query).length) {
                    query = querystring.stringify(this.query);
                  }
                
                  var search = this.search || (query && ('?' + query)) || '';
                
                  if (protocol && protocol.substr(-1) !== ':') protocol += ':';
                
                  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
                  // unless they had them to begin with.
                  if (this.slashes ||
                      (!protocol || slashedProtocol[protocol]) && host !== false) {
                    host = '//' + (host || '');
                    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
                  } else if (!host) {
                    host = '';
                  }
                
                  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
                  if (search && search.charAt(0) !== '?') search = '?' + search;
                
                  pathname = pathname.replace(/[?#]/g, function(match) {
                    return encodeURIComponent(match);
                  });
                  search = search.replace('#', '%23');
                
                  return protocol + host + pathname + search + hash;
                };
                
                function urlResolve(source, relative) {
                  return urlParse(source, false, true).resolve(relative);
                }
                
                Url.prototype.resolve = function(relative) {
                  return this.resolveObject(urlParse(relative, false, true)).format();
                };
                
                function urlResolveObject(source, relative) {
                  if (!source) return relative;
                  return urlParse(source, false, true).resolveObject(relative);
                }
                
                Url.prototype.resolveObject = function(relative) {
                  if (util.isString(relative)) {
                    var rel = new Url();
                    rel.parse(relative, false, true);
                    relative = rel;
                  }
                
                  var result = new Url();
                  var tkeys = Object.keys(this);
                  for (var tk = 0; tk < tkeys.length; tk++) {
                    var tkey = tkeys[tk];
                    result[tkey] = this[tkey];
                  }
                
                  // hash is always overridden, no matter what.
                  // even href="" will remove it.
                  result.hash = relative.hash;
                
                  // if the relative url is empty, then there's nothing left to do here.
                  if (relative.href === '') {
                    result.href = result.format();
                    return result;
                  }
                
                  // hrefs like //foo/bar always cut to the protocol.
                  if (relative.slashes && !relative.protocol) {
                    // take everything except the protocol from relative
                    var rkeys = Object.keys(relative);
                    for (var rk = 0; rk < rkeys.length; rk++) {
                      var rkey = rkeys[rk];
                      if (rkey !== 'protocol')
                        result[rkey] = relative[rkey];
                    }
                
                    //urlParse appends trailing / to urls like http://www.example.com
                    if (slashedProtocol[result.protocol] &&
                        result.hostname && !result.pathname) {
                      result.path = result.pathname = '/';
                    }
                
                    result.href = result.format();
                    return result;
                  }
                
                  if (relative.protocol && relative.protocol !== result.protocol) {
                    // if it's a known url protocol, then changing
                    // the protocol does weird things
                    // first, if it's not file:, then we MUST have a host,
                    // and if there was a path
                    // to begin with, then we MUST have a path.
                    // if it is file:, then the host is dropped,
                    // because that's known to be hostless.
                    // anything else is assumed to be absolute.
                    if (!slashedProtocol[relative.protocol]) {
                      var keys = Object.keys(relative);
                      for (var v = 0; v < keys.length; v++) {
                        var k = keys[v];
                        result[k] = relative[k];
                      }
                      result.href = result.format();
                      return result;
                    }
                
                    result.protocol = relative.protocol;
                    if (!relative.host && !hostlessProtocol[relative.protocol]) {
                      var relPath = (relative.pathname || '').split('/');
                      while (relPath.length && !(relative.host = relPath.shift()));
                      if (!relative.host) relative.host = '';
                      if (!relative.hostname) relative.hostname = '';
                      if (relPath[0] !== '') relPath.unshift('');
                      if (relPath.length < 2) relPath.unshift('');
                      result.pathname = relPath.join('/');
                    } else {
                      result.pathname = relative.pathname;
                    }
                    result.search = relative.search;
                    result.query = relative.query;
                    result.host = relative.host || '';
                    result.auth = relative.auth;
                    result.hostname = relative.hostname || relative.host;
                    result.port = relative.port;
                    // to support http.request
                    if (result.pathname || result.search) {
                      var p = result.pathname || '';
                      var s = result.search || '';
                      result.path = p + s;
                    }
                    result.slashes = result.slashes || relative.slashes;
                    result.href = result.format();
                    return result;
                  }
                
                  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
                      isRelAbs = (
                          relative.host ||
                          relative.pathname && relative.pathname.charAt(0) === '/'
                      ),
                      mustEndAbs = (isRelAbs || isSourceAbs ||
                                    (result.host && relative.pathname)),
                      removeAllDots = mustEndAbs,
                      srcPath = result.pathname && result.pathname.split('/') || [],
                      relPath = relative.pathname && relative.pathname.split('/') || [],
                      psychotic = result.protocol && !slashedProtocol[result.protocol];
                
                  // if the url is a non-slashed url, then relative
                  // links like ../.. should be able
                  // to crawl up to the hostname, as well.  This is strange.
                  // result.protocol has already been set by now.
                  // Later on, put the first path part into the host field.
                  if (psychotic) {
                    result.hostname = '';
                    result.port = null;
                    if (result.host) {
                      if (srcPath[0] === '') srcPath[0] = result.host;
                      else srcPath.unshift(result.host);
                    }
                    result.host = '';
                    if (relative.protocol) {
                      relative.hostname = null;
                      relative.port = null;
                      if (relative.host) {
                        if (relPath[0] === '') relPath[0] = relative.host;
                        else relPath.unshift(relative.host);
                      }
                      relative.host = null;
                    }
                    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
                  }
                
                  if (isRelAbs) {
                    // it's absolute.
                    result.host = (relative.host || relative.host === '') ?
                                  relative.host : result.host;
                    result.hostname = (relative.hostname || relative.hostname === '') ?
                                      relative.hostname : result.hostname;
                    result.search = relative.search;
                    result.query = relative.query;
                    srcPath = relPath;
                    // fall through to the dot-handling below.
                  } else if (relPath.length) {
                    // it's relative
                    // throw away the existing file, and take the new path instead.
                    if (!srcPath) srcPath = [];
                    srcPath.pop();
                    srcPath = srcPath.concat(relPath);
                    result.search = relative.search;
                    result.query = relative.query;
                  } else if (!util.isNullOrUndefined(relative.search)) {
                    // just pull out the search.
                    // like href='?foo'.
                    // Put this after the other two cases because it simplifies the booleans
                    if (psychotic) {
                      result.hostname = result.host = srcPath.shift();
                      //occationaly the auth can get stuck only in host
                      //this especially happens in cases like
                      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
                      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                                       result.host.split('@') : false;
                      if (authInHost) {
                        result.auth = authInHost.shift();
                        result.host = result.hostname = authInHost.shift();
                      }
                    }
                    result.search = relative.search;
                    result.query = relative.query;
                    //to support http.request
                    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
                      result.path = (result.pathname ? result.pathname : '') +
                                    (result.search ? result.search : '');
                    }
                    result.href = result.format();
                    return result;
                  }
                
                  if (!srcPath.length) {
                    // no path at all.  easy.
                    // we've already handled the other stuff above.
                    result.pathname = null;
                    //to support http.request
                    if (result.search) {
                      result.path = '/' + result.search;
                    } else {
                      result.path = null;
                    }
                    result.href = result.format();
                    return result;
                  }
                
                  // if a url ENDs in . or .., then it must get a trailing slash.
                  // however, if it ends in anything else non-slashy,
                  // then it must NOT get a trailing slash.
                  var last = srcPath.slice(-1)[0];
                  var hasTrailingSlash = (
                      (result.host || relative.host || srcPath.length > 1) &&
                      (last === '.' || last === '..') || last === '');
                
                  // strip single dots, resolve double dots to parent dir
                  // if the path tries to go above the root, `up` ends up > 0
                  var up = 0;
                  for (var i = srcPath.length; i >= 0; i--) {
                    last = srcPath[i];
                    if (last === '.') {
                      srcPath.splice(i, 1);
                    } else if (last === '..') {
                      srcPath.splice(i, 1);
                      up++;
                    } else if (up) {
                      srcPath.splice(i, 1);
                      up--;
                    }
                  }
                
                  // if the path is allowed to go above the root, restore leading ..s
                  if (!mustEndAbs && !removeAllDots) {
                    for (; up--; up) {
                      srcPath.unshift('..');
                    }
                  }
                
                  if (mustEndAbs && srcPath[0] !== '' &&
                      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
                    srcPath.unshift('');
                  }
                
                  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
                    srcPath.push('');
                  }
                
                  var isAbsolute = srcPath[0] === '' ||
                      (srcPath[0] && srcPath[0].charAt(0) === '/');
                
                  // put the host back
                  if (psychotic) {
                    result.hostname = result.host = isAbsolute ? '' :
                                                    srcPath.length ? srcPath.shift() : '';
                    //occationaly the auth can get stuck only in host
                    //this especially happens in cases like
                    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
                    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                                     result.host.split('@') : false;
                    if (authInHost) {
                      result.auth = authInHost.shift();
                      result.host = result.hostname = authInHost.shift();
                    }
                  }
                
                  mustEndAbs = mustEndAbs || (result.host && srcPath.length);
                
                  if (mustEndAbs && !isAbsolute) {
                    srcPath.unshift('');
                  }
                
                  if (!srcPath.length) {
                    result.pathname = null;
                    result.path = null;
                  } else {
                    result.pathname = srcPath.join('/');
                  }
                
                  //to support request.http
                  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
                    result.path = (result.pathname ? result.pathname : '') +
                                  (result.search ? result.search : '');
                  }
                  result.auth = relative.auth || result.auth;
                  result.slashes = result.slashes || relative.slashes;
                  result.href = result.format();
                  return result;
                };
                
                Url.prototype.parseHost = function() {
                  var host = this.host;
                  var port = portPattern.exec(host);
                  if (port) {
                    port = port[0];
                    if (port !== ':') {
                      this.port = port.substr(1);
                    }
                    host = host.substr(0, host.length - port.length);
                  }
                  if (host) this.hostname = host;
                };
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-url/url.js sha1 = 78d0ac233252dbbecf7afc93c2c3ad56965f53e2
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-url"),"url.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-url")},
    "./util" : {
            name:"url",
            path:"../node_modules/browser-url/util.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-url/util.js
                'use strict';
                
                module.exports = {
                  isString: function(arg) {
                    return typeof(arg) === 'string';
                  },
                  isObject: function(arg) {
                    return typeof(arg) === 'object' && arg !== null;
                  },
                  isNull: function(arg) {
                    return arg === null;
                  },
                  isNullOrUndefined: function(arg) {
                    return arg == null;
                  }
                };
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-url/util.js sha1 = b83cee072b6381001e94414862d934d65004d92b
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-url"),"util.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-url")},
    "querystring" : {
            name:"browser-querystring",
            path:"../node_modules/browser-querystring/index.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring/index.js
                'use strict';
                
                exports.decode = exports.parse = require('./decode');
                exports.encode = exports.stringify = require('./encode');
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring/index.js sha1 = cb7fd2835f652938cfe501f3f0c225e2646eb801
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring"),"index.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring")},
    "./util" : {
            name:"url",
            path:"../node_modules/browser-url/util.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-url/util.js
                'use strict';
                
                module.exports = {
                  isString: function(arg) {
                    return typeof(arg) === 'string';
                  },
                  isObject: function(arg) {
                    return typeof(arg) === 'object' && arg !== null;
                  },
                  isNull: function(arg) {
                    return arg === null;
                  },
                  isNullOrUndefined: function(arg) {
                    return arg == null;
                  }
                };
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-url/util.js sha1 = b83cee072b6381001e94414862d934d65004d92b
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-url"),"util.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-url")},
    "./decode" : {
            name:"querystring",
            path:"../node_modules/browser-querystring/decode.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring/decode.js
                // Copyright Joyent, Inc. and other Node contributors.
                //
                // Permission is hereby granted, free of charge, to any person obtaining a
                // copy of this software and associated documentation files (the
                // "Software"), to deal in the Software without restriction, including
                // without limitation the rights to use, copy, modify, merge, publish,
                // distribute, sublicense, and/or sell copies of the Software, and to permit
                // persons to whom the Software is furnished to do so, subject to the
                // following conditions:
                //
                // The above copyright notice and this permission notice shall be included
                // in all copies or substantial portions of the Software.
                //
                // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
                // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
                // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
                // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
                // USE OR OTHER DEALINGS IN THE SOFTWARE.
                
                'use strict';
                
                // If obj.hasOwnProperty has been overridden, then calling
                // obj.hasOwnProperty(prop) will break.
                // See: https://github.com/joyent/node/issues/1707
                function hasOwnProperty(obj, prop) {
                  return Object.prototype.hasOwnProperty.call(obj, prop);
                }
                
                module.exports = function(qs, sep, eq, options) {
                  sep = sep || '&';
                  eq = eq || '=';
                  var obj = {};
                
                  if (typeof qs !== 'string' || qs.length === 0) {
                    return obj;
                  }
                
                  var regexp = /\+/g;
                  qs = qs.split(sep);
                
                  var maxKeys = 1000;
                  if (options && typeof options.maxKeys === 'number') {
                    maxKeys = options.maxKeys;
                  }
                
                  var len = qs.length;
                  // maxKeys <= 0 means that we should not limit keys count
                  if (maxKeys > 0 && len > maxKeys) {
                    len = maxKeys;
                  }
                
                  for (var i = 0; i < len; ++i) {
                    var x = qs[i].replace(regexp, '%20'),
                        idx = x.indexOf(eq),
                        kstr, vstr, k, v;
                
                    if (idx >= 0) {
                      kstr = x.substr(0, idx);
                      vstr = x.substr(idx + 1);
                    } else {
                      kstr = x;
                      vstr = '';
                    }
                
                    k = decodeURIComponent(kstr);
                    v = decodeURIComponent(vstr);
                
                    if (!hasOwnProperty(obj, k)) {
                      obj[k] = v;
                    } else if (Array.isArray(obj[k])) {
                      obj[k].push(v);
                    } else {
                      obj[k] = [obj[k], v];
                    }
                  }
                
                  return obj;
                };
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring/decode.js sha1 = 78c13537ae65852bb6b1df4563ced3a27f848376
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring"),"decode.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring")},
    "./encode" : {
            name:"querystring",
            path:"../node_modules/browser-querystring/encode.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring/encode.js
                // Copyright Joyent, Inc. and other Node contributors.
                //
                // Permission is hereby granted, free of charge, to any person obtaining a
                // copy of this software and associated documentation files (the
                // "Software"), to deal in the Software without restriction, including
                // without limitation the rights to use, copy, modify, merge, publish,
                // distribute, sublicense, and/or sell copies of the Software, and to permit
                // persons to whom the Software is furnished to do so, subject to the
                // following conditions:
                //
                // The above copyright notice and this permission notice shall be included
                // in all copies or substantial portions of the Software.
                //
                // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
                // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
                // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
                // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
                // USE OR OTHER DEALINGS IN THE SOFTWARE.
                
                'use strict';
                
                var stringifyPrimitive = function(v) {
                  switch (typeof v) {
                    case 'string':
                      return v;
                
                    case 'boolean':
                      return v ? 'true' : 'false';
                
                    case 'number':
                      return isFinite(v) ? v : '';
                
                    default:
                      return '';
                  }
                };
                
                module.exports = function(obj, sep, eq, name) {
                  sep = sep || '&';
                  eq = eq || '=';
                  if (obj === null) {
                    obj = undefined;
                  }
                
                  if (typeof obj === 'object') {
                    return Object.keys(obj).map(function(k) {
                      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
                      if (Array.isArray(obj[k])) {
                        return obj[k].map(function(v) {
                          return ks + encodeURIComponent(stringifyPrimitive(v));
                        }).join(sep);
                      } else {
                        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
                      }
                    }).join(sep);
                
                  }
                
                  if (!name) return '';
                  return encodeURIComponent(stringifyPrimitive(name)) + eq +
                         encodeURIComponent(stringifyPrimitive(obj));
                };
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring/encode.js sha1 = bc42441192cea9de787398850f1d308980421017
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring"),"encode.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring")},
    "./decode" : {
            name:"querystring",
            path:"../node_modules/browser-querystring/decode.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring/decode.js
                // Copyright Joyent, Inc. and other Node contributors.
                //
                // Permission is hereby granted, free of charge, to any person obtaining a
                // copy of this software and associated documentation files (the
                // "Software"), to deal in the Software without restriction, including
                // without limitation the rights to use, copy, modify, merge, publish,
                // distribute, sublicense, and/or sell copies of the Software, and to permit
                // persons to whom the Software is furnished to do so, subject to the
                // following conditions:
                //
                // The above copyright notice and this permission notice shall be included
                // in all copies or substantial portions of the Software.
                //
                // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
                // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
                // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
                // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
                // USE OR OTHER DEALINGS IN THE SOFTWARE.
                
                'use strict';
                
                // If obj.hasOwnProperty has been overridden, then calling
                // obj.hasOwnProperty(prop) will break.
                // See: https://github.com/joyent/node/issues/1707
                function hasOwnProperty(obj, prop) {
                  return Object.prototype.hasOwnProperty.call(obj, prop);
                }
                
                module.exports = function(qs, sep, eq, options) {
                  sep = sep || '&';
                  eq = eq || '=';
                  var obj = {};
                
                  if (typeof qs !== 'string' || qs.length === 0) {
                    return obj;
                  }
                
                  var regexp = /\+/g;
                  qs = qs.split(sep);
                
                  var maxKeys = 1000;
                  if (options && typeof options.maxKeys === 'number') {
                    maxKeys = options.maxKeys;
                  }
                
                  var len = qs.length;
                  // maxKeys <= 0 means that we should not limit keys count
                  if (maxKeys > 0 && len > maxKeys) {
                    len = maxKeys;
                  }
                
                  for (var i = 0; i < len; ++i) {
                    var x = qs[i].replace(regexp, '%20'),
                        idx = x.indexOf(eq),
                        kstr, vstr, k, v;
                
                    if (idx >= 0) {
                      kstr = x.substr(0, idx);
                      vstr = x.substr(idx + 1);
                    } else {
                      kstr = x;
                      vstr = '';
                    }
                
                    k = decodeURIComponent(kstr);
                    v = decodeURIComponent(vstr);
                
                    if (!hasOwnProperty(obj, k)) {
                      obj[k] = v;
                    } else if (Array.isArray(obj[k])) {
                      obj[k].push(v);
                    } else {
                      obj[k] = [obj[k], v];
                    }
                  }
                
                  return obj;
                };
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring/decode.js sha1 = 78c13537ae65852bb6b1df4563ced3a27f848376
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring"),"decode.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-querystring")},
    "util" : {
            name:"browser-util",
            path:"../node_modules/browser-util/util.js",
            load: (function (module,require,__filename,__dirname){var process = {
        "env": {},
        "cwd": function(){ return "/";}
    },exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/util.js
                // Copyright Joyent, Inc. and other Node contributors.
                //
                // Permission is hereby granted, free of charge, to any person obtaining a
                // copy of this software and associated documentation files (the
                // "Software"), to deal in the Software without restriction, including
                // without limitation the rights to use, copy, modify, merge, publish,
                // distribute, sublicense, and/or sell copies of the Software, and to permit
                // persons to whom the Software is furnished to do so, subject to the
                // following conditions:
                //
                // The above copyright notice and this permission notice shall be included
                // in all copies or substantial portions of the Software.
                //
                // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
                // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
                // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
                // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
                // USE OR OTHER DEALINGS IN THE SOFTWARE.
                
                var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
                  function getOwnPropertyDescriptors(obj) {
                    var keys = Object.keys(obj);
                    var descriptors = {};
                    for (var i = 0; i < keys.length; i++) {
                      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
                    }
                    return descriptors;
                  };
                
                var formatRegExp = /%[sdj%]/g;
                exports.format = function(f) {
                  if (!isString(f)) {
                    var objects = [];
                    for (var i = 0; i < arguments.length; i++) {
                      objects.push(inspect(arguments[i]));
                    }
                    return objects.join(' ');
                  }
                
                  var i = 1;
                  var args = arguments;
                  var len = args.length;
                  var str = String(f).replace(formatRegExp, function(x) {
                    if (x === '%%') return '%';
                    if (i >= len) return x;
                    switch (x) {
                      case '%s': return String(args[i++]);
                      case '%d': return Number(args[i++]);
                      case '%j':
                        try {
                          return JSON.stringify(args[i++]);
                        } catch (_) {
                          return '[Circular]';
                        }
                      default:
                        return x;
                    }
                  });
                  for (var x = args[i]; i < len; x = args[++i]) {
                    if (isNull(x) || !isObject(x)) {
                      str += ' ' + x;
                    } else {
                      str += ' ' + inspect(x);
                    }
                  }
                  return str;
                };
                
                
                // Mark that a method should not be used.
                // Returns a modified function which warns once by default.
                // If --no-deprecation is set, then it is a no-op.
                exports.deprecate = function(fn, msg) {
                  if (typeof process !== 'undefined' && process.noDeprecation === true) {
                    return fn;
                  }
                
                  // Allow for deprecating things in the process of starting up.
                  if (typeof process === 'undefined') {
                    return function() {
                      return exports.deprecate(fn, msg).apply(this, arguments);
                    };
                  }
                
                  var warned = false;
                  function deprecated() {
                    if (!warned) {
                      if (process.throwDeprecation) {
                        throw new Error(msg);
                      } else if (process.traceDeprecation) {
                        console.trace(msg);
                      } else {
                        console.error(msg);
                      }
                      warned = true;
                    }
                    return fn.apply(this, arguments);
                  }
                
                  return deprecated;
                };
                
                
                var debugs = {};
                var debugEnvRegex = /^$/;
                
                if (process.env.NODE_DEBUG) {
                  var debugEnv = process.env.NODE_DEBUG;
                  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
                    .replace(/\*/g, '.*')
                    .replace(/,/g, '$|^')
                    .toUpperCase();
                  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
                }
                exports.debuglog = function(set) {
                  set = set.toUpperCase();
                  if (!debugs[set]) {
                    if (debugEnvRegex.test(set)) {
                      var pid = process.pid;
                      debugs[set] = function() {
                        var msg = exports.format.apply(exports, arguments);
                        console.error('%s %d: %s', set, pid, msg);
                      };
                    } else {
                      debugs[set] = function() {};
                    }
                  }
                  return debugs[set];
                };
                
                
                /**
                 * Echos the value of a value. Trys to print the value out
                 * in the best way possible given the different types.
                 *
                 * @param {Object} obj The object to print out.
                 * @param {Object} opts Optional options object that alters the output.
                 */
                /* legacy: obj, showHidden, depth, colors*/
                function inspect(obj, opts) {
                  // default options
                  var ctx = {
                    seen: [],
                    stylize: stylizeNoColor
                  };
                  // legacy...
                  if (arguments.length >= 3) ctx.depth = arguments[2];
                  if (arguments.length >= 4) ctx.colors = arguments[3];
                  if (isBoolean(opts)) {
                    // legacy...
                    ctx.showHidden = opts;
                  } else if (opts) {
                    // got an "options" object
                    exports._extend(ctx, opts);
                  }
                  // set default options
                  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
                  if (isUndefined(ctx.depth)) ctx.depth = 2;
                  if (isUndefined(ctx.colors)) ctx.colors = false;
                  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
                  if (ctx.colors) ctx.stylize = stylizeWithColor;
                  return formatValue(ctx, obj, ctx.depth);
                }
                exports.inspect = inspect;
                
                
                // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
                inspect.colors = {
                  'bold' : [1, 22],
                  'italic' : [3, 23],
                  'underline' : [4, 24],
                  'inverse' : [7, 27],
                  'white' : [37, 39],
                  'grey' : [90, 39],
                  'black' : [30, 39],
                  'blue' : [34, 39],
                  'cyan' : [36, 39],
                  'green' : [32, 39],
                  'magenta' : [35, 39],
                  'red' : [31, 39],
                  'yellow' : [33, 39]
                };
                
                // Don't use 'blue' not visible on cmd.exe
                inspect.styles = {
                  'special': 'cyan',
                  'number': 'yellow',
                  'boolean': 'yellow',
                  'undefined': 'grey',
                  'null': 'bold',
                  'string': 'green',
                  'date': 'magenta',
                  // "name": intentionally not styling
                  'regexp': 'red'
                };
                
                
                function stylizeWithColor(str, styleType) {
                  var style = inspect.styles[styleType];
                
                  if (style) {
                    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
                           '\u001b[' + inspect.colors[style][1] + 'm';
                  } else {
                    return str;
                  }
                }
                
                
                function stylizeNoColor(str, styleType) {
                  return str;
                }
                
                
                function arrayToHash(array) {
                  var hash = {};
                
                  array.forEach(function(val, idx) {
                    hash[val] = true;
                  });
                
                  return hash;
                }
                
                
                function formatValue(ctx, value, recurseTimes) {
                  // Provide a hook for user-specified inspect functions.
                  // Check that value is an object with an inspect function on it
                  if (ctx.customInspect &&
                      value &&
                      isFunction(value.inspect) &&
                      // Filter out the util module, it's inspect function is special
                      value.inspect !== exports.inspect &&
                      // Also filter out any prototype objects using the circular check.
                      !(value.constructor && value.constructor.prototype === value)) {
                    var ret = value.inspect(recurseTimes, ctx);
                    if (!isString(ret)) {
                      ret = formatValue(ctx, ret, recurseTimes);
                    }
                    return ret;
                  }
                
                  // Primitive types cannot have properties
                  var primitive = formatPrimitive(ctx, value);
                  if (primitive) {
                    return primitive;
                  }
                
                  // Look up the keys of the object.
                  var keys = Object.keys(value);
                  var visibleKeys = arrayToHash(keys);
                
                  if (ctx.showHidden) {
                    keys = Object.getOwnPropertyNames(value);
                  }
                
                  // IE doesn't make error fields non-enumerable
                  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
                  if (isError(value)
                      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
                    return formatError(value);
                  }
                
                  // Some type of object without properties can be shortcutted.
                  if (keys.length === 0) {
                    if (isFunction(value)) {
                      var name = value.name ? ': ' + value.name : '';
                      return ctx.stylize('[Function' + name + ']', 'special');
                    }
                    if (isRegExp(value)) {
                      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
                    }
                    if (isDate(value)) {
                      return ctx.stylize(Date.prototype.toString.call(value), 'date');
                    }
                    if (isError(value)) {
                      return formatError(value);
                    }
                  }
                
                  var base = '', array = false, braces = ['{', '}'];
                
                  // Make Array say that they are Array
                  if (isArray(value)) {
                    array = true;
                    braces = ['[', ']'];
                  }
                
                  // Make functions say that they are functions
                  if (isFunction(value)) {
                    var n = value.name ? ': ' + value.name : '';
                    base = ' [Function' + n + ']';
                  }
                
                  // Make RegExps say that they are RegExps
                  if (isRegExp(value)) {
                    base = ' ' + RegExp.prototype.toString.call(value);
                  }
                
                  // Make dates with properties first say the date
                  if (isDate(value)) {
                    base = ' ' + Date.prototype.toUTCString.call(value);
                  }
                
                  // Make error with message first say the error
                  if (isError(value)) {
                    base = ' ' + formatError(value);
                  }
                
                  if (keys.length === 0 && (!array || value.length == 0)) {
                    return braces[0] + base + braces[1];
                  }
                
                  if (recurseTimes < 0) {
                    if (isRegExp(value)) {
                      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
                    } else {
                      return ctx.stylize('[Object]', 'special');
                    }
                  }
                
                  ctx.seen.push(value);
                
                  var output;
                  if (array) {
                    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
                  } else {
                    output = keys.map(function(key) {
                      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
                    });
                  }
                
                  ctx.seen.pop();
                
                  return reduceToSingleString(output, base, braces);
                }
                
                
                function formatPrimitive(ctx, value) {
                  if (isUndefined(value))
                    return ctx.stylize('undefined', 'undefined');
                  if (isString(value)) {
                    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                             .replace(/'/g, "\\'")
                                                             .replace(/\\"/g, '"') + '\'';
                    return ctx.stylize(simple, 'string');
                  }
                  if (isNumber(value))
                    return ctx.stylize('' + value, 'number');
                  if (isBoolean(value))
                    return ctx.stylize('' + value, 'boolean');
                  // For some reason typeof null is "object", so special case here.
                  if (isNull(value))
                    return ctx.stylize('null', 'null');
                }
                
                
                function formatError(value) {
                  return '[' + Error.prototype.toString.call(value) + ']';
                }
                
                
                function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
                  var output = [];
                  for (var i = 0, l = value.length; i < l; ++i) {
                    if (hasOwnProperty(value, String(i))) {
                      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                          String(i), true));
                    } else {
                      output.push('');
                    }
                  }
                  keys.forEach(function(key) {
                    if (!key.match(/^\d+$/)) {
                      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                          key, true));
                    }
                  });
                  return output;
                }
                
                
                function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
                  var name, str, desc;
                  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
                  if (desc.get) {
                    if (desc.set) {
                      str = ctx.stylize('[Getter/Setter]', 'special');
                    } else {
                      str = ctx.stylize('[Getter]', 'special');
                    }
                  } else {
                    if (desc.set) {
                      str = ctx.stylize('[Setter]', 'special');
                    }
                  }
                  if (!hasOwnProperty(visibleKeys, key)) {
                    name = '[' + key + ']';
                  }
                  if (!str) {
                    if (ctx.seen.indexOf(desc.value) < 0) {
                      if (isNull(recurseTimes)) {
                        str = formatValue(ctx, desc.value, null);
                      } else {
                        str = formatValue(ctx, desc.value, recurseTimes - 1);
                      }
                      if (str.indexOf('\n') > -1) {
                        if (array) {
                          str = str.split('\n').map(function(line) {
                            return '  ' + line;
                          }).join('\n').substr(2);
                        } else {
                          str = '\n' + str.split('\n').map(function(line) {
                            return '   ' + line;
                          }).join('\n');
                        }
                      }
                    } else {
                      str = ctx.stylize('[Circular]', 'special');
                    }
                  }
                  if (isUndefined(name)) {
                    if (array && key.match(/^\d+$/)) {
                      return str;
                    }
                    name = JSON.stringify('' + key);
                    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
                      name = name.substr(1, name.length - 2);
                      name = ctx.stylize(name, 'name');
                    } else {
                      name = name.replace(/'/g, "\\'")
                                 .replace(/\\"/g, '"')
                                 .replace(/(^"|"$)/g, "'");
                      name = ctx.stylize(name, 'string');
                    }
                  }
                
                  return name + ': ' + str;
                }
                
                
                function reduceToSingleString(output, base, braces) {
                  var numLinesEst = 0;
                  var length = output.reduce(function(prev, cur) {
                    numLinesEst++;
                    if (cur.indexOf('\n') >= 0) numLinesEst++;
                    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
                  }, 0);
                
                  if (length > 60) {
                    return braces[0] +
                           (base === '' ? '' : base + '\n ') +
                           ' ' +
                           output.join(',\n  ') +
                           ' ' +
                           braces[1];
                  }
                
                  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
                }
                
                
                // NOTE: These type checking functions intentionally don't use `instanceof`
                // because it is fragile and can be easily faked with `Object.create()`.
                exports.types = require('./support/types');
                
                function isArray(ar) {
                  return Array.isArray(ar);
                }
                exports.isArray = isArray;
                
                function isBoolean(arg) {
                  return typeof arg === 'boolean';
                }
                exports.isBoolean = isBoolean;
                
                function isNull(arg) {
                  return arg === null;
                }
                exports.isNull = isNull;
                
                function isNullOrUndefined(arg) {
                  return arg == null;
                }
                exports.isNullOrUndefined = isNullOrUndefined;
                
                function isNumber(arg) {
                  return typeof arg === 'number';
                }
                exports.isNumber = isNumber;
                
                function isString(arg) {
                  return typeof arg === 'string';
                }
                exports.isString = isString;
                
                function isSymbol(arg) {
                  return typeof arg === 'symbol';
                }
                exports.isSymbol = isSymbol;
                
                function isUndefined(arg) {
                  return arg === void 0;
                }
                exports.isUndefined = isUndefined;
                
                function isRegExp(re) {
                  return isObject(re) && objectToString(re) === '[object RegExp]';
                }
                exports.isRegExp = isRegExp;
                exports.types.isRegExp = isRegExp;
                
                function isObject(arg) {
                  return typeof arg === 'object' && arg !== null;
                }
                exports.isObject = isObject;
                
                function isDate(d) {
                  return isObject(d) && objectToString(d) === '[object Date]';
                }
                exports.isDate = isDate;
                exports.types.isDate = isDate;
                
                function isError(e) {
                  return isObject(e) &&
                      (objectToString(e) === '[object Error]' || e instanceof Error);
                }
                exports.isError = isError;
                exports.types.isNativeError = isError;
                
                function isFunction(arg) {
                  return typeof arg === 'function';
                }
                exports.isFunction = isFunction;
                
                function isPrimitive(arg) {
                  return arg === null ||
                         typeof arg === 'boolean' ||
                         typeof arg === 'number' ||
                         typeof arg === 'string' ||
                         typeof arg === 'symbol' ||  // ES6 symbol
                         typeof arg === 'undefined';
                }
                exports.isPrimitive = isPrimitive;
                
                exports.isBuffer = require('./support/isBuffer');
                
                function objectToString(o) {
                  return Object.prototype.toString.call(o);
                }
                
                
                function pad(n) {
                  return n < 10 ? '0' + n.toString(10) : n.toString(10);
                }
                
                
                var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
                              'Oct', 'Nov', 'Dec'];
                
                // 26 Feb 16:19:34
                function timestamp() {
                  var d = new Date();
                  var time = [pad(d.getHours()),
                              pad(d.getMinutes()),
                              pad(d.getSeconds())].join(':');
                  return [d.getDate(), months[d.getMonth()], time].join(' ');
                }
                
                
                // log is just a thin wrapper to console.log that prepends a timestamp
                exports.log = function() {
                  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
                };
                
                
                /**
                 * Inherit the prototype methods from one constructor into another.
                 *
                 * The Function.prototype.inherits from lang.js rewritten as a standalone
                 * function (not on Function.prototype). NOTE: If this file is to be loaded
                 * during bootstrapping this function needs to be rewritten using some native
                 * functions as prototype setup using normal JavaScript does not work as
                 * expected during bootstrapping (see mirror.js in r114903).
                 *
                 * @param {function} ctor Constructor function which needs to inherit the
                 *     prototype.
                 * @param {function} superCtor Constructor function to inherit prototype from.
                 */
                exports.inherits = require('inherits');
                
                exports._extend = function(origin, add) {
                  // Don't do anything if add isn't an object
                  if (!add || !isObject(add)) return origin;
                
                  var keys = Object.keys(add);
                  var i = keys.length;
                  while (i--) {
                    origin[keys[i]] = add[keys[i]];
                  }
                  return origin;
                };
                
                function hasOwnProperty(obj, prop) {
                  return Object.prototype.hasOwnProperty.call(obj, prop);
                }
                
                var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;
                
                exports.promisify = function promisify(original) {
                  if (typeof original !== 'function')
                    throw new TypeError('The "original" argument must be of type Function');
                
                  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
                    var fn = original[kCustomPromisifiedSymbol];
                    if (typeof fn !== 'function') {
                      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
                    }
                    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
                      value: fn, enumerable: false, writable: false, configurable: true
                    });
                    return fn;
                  }
                
                  function fn() {
                    var promiseResolve, promiseReject;
                    var promise = new Promise(function (resolve, reject) {
                      promiseResolve = resolve;
                      promiseReject = reject;
                    });
                
                    var args = [];
                    for (var i = 0; i < arguments.length; i++) {
                      args.push(arguments[i]);
                    }
                    args.push(function (err, value) {
                      if (err) {
                        promiseReject(err);
                      } else {
                        promiseResolve(value);
                      }
                    });
                
                    try {
                      original.apply(this, args);
                    } catch (err) {
                      promiseReject(err);
                    }
                
                    return promise;
                  }
                
                  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));
                
                  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
                    value: fn, enumerable: false, writable: false, configurable: true
                  });
                  return Object.defineProperties(
                    fn,
                    getOwnPropertyDescriptors(original)
                  );
                }
                
                exports.promisify.custom = kCustomPromisifiedSymbol
                
                function callbackifyOnRejected(reason, cb) {
                  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
                  // Because `null` is a special error value in callbacks which means "no error
                  // occurred", we error-wrap so the callback consumer can distinguish between
                  // "the promise rejected with null" or "the promise fulfilled with undefined".
                  if (!reason) {
                    var newReason = new Error('Promise was rejected with a falsy value');
                    newReason.reason = reason;
                    reason = newReason;
                  }
                  return cb(reason);
                }
                
                function callbackify(original) {
                  if (typeof original !== 'function') {
                    throw new TypeError('The "original" argument must be of type Function');
                  }
                
                  // We DO NOT return the promise as it gives the user a false sense that
                  // the promise is actually somehow related to the callback's execution
                  // and that the callback throwing will reject the promise.
                  function callbackified() {
                    var args = [];
                    for (var i = 0; i < arguments.length; i++) {
                      args.push(arguments[i]);
                    }
                
                    var maybeCb = args.pop();
                    if (typeof maybeCb !== 'function') {
                      throw new TypeError('The last argument must be of type Function');
                    }
                    var self = this;
                    var cb = function() {
                      return maybeCb.apply(self, arguments);
                    };
                    // In true node style we process the callback on `nextTick` with all the
                    // implications (stack, `uncaughtException`, `async_hooks`)
                    original.apply(this, args)
                      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)) },
                            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)) });
                  }
                
                  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
                  Object.defineProperties(callbackified,
                                          getOwnPropertyDescriptors(original));
                  return callbackified;
                }
                exports.callbackify = callbackify;
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/util.js sha1 = 6c4ffc8c5c96de1ecf5d8fe3422e9cd99f3b5200
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-util"),"util.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-util")},
    "./support/types" : {
            name:"types",
            path:"../node_modules/browser-util/support/types.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/types.js
                // Currently in sync with Node.js lib/internal/util/types.js
                // https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9
                
                'use strict';
                
                var isBuffer = require('./isBuffer');
                
                var isArgumentsObject = require('is-arguments');
                var isGeneratorFunction = require('is-generator-function');
                
                function uncurryThis(f) {
                  return f.call.bind(f);
                }
                
                var BigIntSupported = typeof BigInt !== 'undefined';
                var SymbolSupported = typeof Symbol !== 'undefined';
                var SymbolToStringTagSupported = SymbolSupported && typeof Symbol.toStringTag !== 'undefined';
                var Uint8ArraySupported = typeof Uint8Array !== 'undefined';
                var ArrayBufferSupported = typeof ArrayBuffer !== 'undefined';
                
                if (Uint8ArraySupported && SymbolToStringTagSupported) {
                  var TypedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
                
                  var TypedArrayProto_toStringTag =
                      uncurryThis(
                        Object.getOwnPropertyDescriptor(TypedArrayPrototype,
                                                        Symbol.toStringTag).get);
                
                }
                
                var ObjectToString = uncurryThis(Object.prototype.toString);
                
                var numberValue = uncurryThis(Number.prototype.valueOf);
                var stringValue = uncurryThis(String.prototype.valueOf);
                var booleanValue = uncurryThis(Boolean.prototype.valueOf);
                
                if (BigIntSupported) {
                  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
                }
                
                if (SymbolSupported) {
                  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
                }
                
                function checkBoxedPrimitive(value, prototypeValueOf) {
                  if (typeof value !== 'object') {
                    return false;
                  }
                  try {
                    prototypeValueOf(value);
                    return true;
                  } catch(e) {
                    return false;
                  }
                }
                
                exports.isArgumentsObject = isArgumentsObject;
                
                exports.isGeneratorFunction = isGeneratorFunction;
                
                // Taken from here and modified for better browser support
                // https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
                function isPromise(input) {
                    return (
                        (
                            typeof Promise !== 'undefined' &&
                            input instanceof Promise
                        ) ||
                        (
                            input !== null &&
                            typeof input === 'object' &&
                            typeof input.then === 'function' &&
                            typeof input.catch === 'function'
                        )
                    );
                }
                exports.isPromise = isPromise;
                
                function isArrayBufferView(value) {
                  if (ArrayBufferSupported && ArrayBuffer.isView) {
                    return ArrayBuffer.isView(value);
                  }
                
                  return (
                    isTypedArray(value) ||
                    isDataView(value)
                  );
                }
                exports.isArrayBufferView = isArrayBufferView;
                
                function isTypedArray(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) !== undefined;
                  } else {
                    return (
                      isUint8Array(value) ||
                      isUint8ClampedArray(value) ||
                      isUint16Array(value) ||
                      isUint32Array(value) ||
                      isInt8Array(value) ||
                      isInt16Array(value) ||
                      isInt32Array(value) ||
                      isFloat32Array(value) ||
                      isFloat64Array(value) ||
                      isBigInt64Array(value) ||
                      isBigUint64Array(value)
                    );
                  }
                }
                exports.isTypedArray = isTypedArray;
                
                function isUint8Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Uint8Array';
                  } else {
                    return (
                      ObjectToString(value) === '[object Uint8Array]' ||
                      // If it's a Buffer instance _and_ has a `.buffer` property,
                      // this is an ArrayBuffer based buffer; thus it's an Uint8Array
                      // (Old Node.js had a custom non-Uint8Array implementation)
                      isBuffer(value) && value.buffer !== undefined
                    );
                  }
                }
                exports.isUint8Array = isUint8Array;
                
                function isUint8ClampedArray(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Uint8ClampedArray';
                  } else {
                    return ObjectToString(value) === '[object Uint8ClampedArray]';
                  }
                }
                exports.isUint8ClampedArray = isUint8ClampedArray;
                
                function isUint16Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Uint16Array';
                  } else {
                    return ObjectToString(value) === '[object Uint16Array]';
                  }
                }
                exports.isUint16Array = isUint16Array;
                
                function isUint32Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Uint32Array';
                  } else {
                    return ObjectToString(value) === '[object Uint32Array]';
                  }
                }
                exports.isUint32Array = isUint32Array;
                
                function isInt8Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Int8Array';
                  } else {
                    return ObjectToString(value) === '[object Int8Array]';
                  }
                }
                exports.isInt8Array = isInt8Array;
                
                function isInt16Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Int16Array';
                  } else {
                    return ObjectToString(value) === '[object Int16Array]';
                  }
                }
                exports.isInt16Array = isInt16Array;
                
                function isInt32Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Int32Array';
                  } else {
                    return ObjectToString(value) === '[object Int32Array]';
                  }
                }
                exports.isInt32Array = isInt32Array;
                
                function isFloat32Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Float32Array';
                  } else {
                    return ObjectToString(value) === '[object Float32Array]';
                  }
                }
                exports.isFloat32Array = isFloat32Array;
                
                function isFloat64Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Float64Array';
                  } else {
                    return ObjectToString(value) === '[object Float64Array]';
                  }
                }
                exports.isFloat64Array = isFloat64Array;
                
                function isBigInt64Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'BigInt64Array';
                  } else {
                    return ObjectToString(value) === '[object BigInt64Array]';
                  }
                }
                exports.isBigInt64Array = isBigInt64Array;
                
                function isBigUint64Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'BigUint64Array';
                  } else {
                    return ObjectToString(value) === '[object BigUint64Array]';
                  }
                }
                exports.isBigUint64Array = isBigUint64Array;
                
                function isMapToString(value) {
                  return ObjectToString(value) === '[object Map]';
                }
                isMapToString.working = (
                  typeof Map !== 'undefined' &&
                  isMapToString(new Map())
                );
                
                function isMap(value) {
                  if (typeof Map === 'undefined') {
                    return false;
                  }
                
                  return isMapToString.working
                    ? isMapToString(value)
                    : value instanceof Map;
                }
                exports.isMap = isMap;
                
                function isSetToString(value) {
                  return ObjectToString(value) === '[object Set]';
                }
                isSetToString.working = (
                  typeof Set !== 'undefined' &&
                  isSetToString(new Set())
                );
                function isSet(value) {
                  if (typeof Set === 'undefined') {
                    return false;
                  }
                
                  return isSetToString.working
                    ? isSetToString(value)
                    : value instanceof Set;
                }
                exports.isSet = isSet;
                
                function isWeakMapToString(value) {
                  return ObjectToString(value) === '[object WeakMap]';
                }
                isWeakMapToString.working = (
                  typeof WeakMap !== 'undefined' &&
                  isWeakMapToString(new WeakMap())
                );
                function isWeakMap(value) {
                  if (typeof WeakMap === 'undefined') {
                    return false;
                  }
                
                  return isWeakMapToString.working
                    ? isWeakMapToString(value)
                    : value instanceof WeakMap;
                }
                exports.isWeakMap = isWeakMap;
                
                function isWeakSetToString(value) {
                  return ObjectToString(value) === '[object WeakSet]';
                }
                isWeakSetToString.working = (
                  typeof WeakSet !== 'undefined' &&
                  isWeakSetToString(new WeakSet())
                );
                function isWeakSet(value) {
                  return isWeakSetToString(value);
                  if (typeof WeakSet === 'undefined') {
                    return false;
                  }
                
                  return isWeakSetToString.working
                    ? isWeakSetToString(value)
                    : value instanceof WeakSet;
                }
                exports.isWeakSet = isWeakSet;
                
                function isArrayBufferToString(value) {
                  return ObjectToString(value) === '[object ArrayBuffer]';
                }
                isArrayBufferToString.working = (
                  typeof ArrayBuffer !== 'undefined' &&
                  isArrayBufferToString(new ArrayBuffer())
                );
                function isArrayBuffer(value) {
                  if (typeof ArrayBuffer === 'undefined') {
                    return false;
                  }
                
                  return isArrayBufferToString.working
                    ? isArrayBufferToString(value)
                    : value instanceof ArrayBuffer;
                }
                exports.isArrayBuffer = isArrayBuffer;
                
                function isDataViewToString(value) {
                  return ObjectToString(value) === '[object DataView]';
                }
                isDataViewToString.working = (
                  typeof ArrayBuffer !== 'undefined' &&
                  typeof DataView !== 'undefined' &&
                  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
                );
                function isDataView(value) {
                  if (typeof DataView === 'undefined') {
                    return false;
                  }
                
                  return isDataViewToString.working
                    ? isDataViewToString(value)
                    : value instanceof DataView;
                }
                exports.isDataView = isDataView;
                
                function isSharedArrayBufferToString(value) {
                  return ObjectToString(value) === '[object SharedArrayBuffer]';
                }
                isSharedArrayBufferToString.working = (
                  typeof SharedArrayBuffer !== 'undefined' &&
                  isSharedArrayBufferToString(new SharedArrayBuffer())
                );
                function isSharedArrayBuffer(value) {
                  if (typeof SharedArrayBuffer === 'undefined') {
                    return false;
                  }
                
                  return isSharedArrayBufferToString.working
                    ? isSharedArrayBufferToString(value)
                    : value instanceof SharedArrayBuffer;
                }
                exports.isSharedArrayBuffer = isSharedArrayBuffer;
                
                function isAsyncFunction(value) {
                  return ObjectToString(value) === '[object AsyncFunction]';
                }
                exports.isAsyncFunction = isAsyncFunction;
                
                function isMapIterator(value) {
                  return ObjectToString(value) === '[object Map Iterator]';
                }
                exports.isMapIterator = isMapIterator;
                
                function isSetIterator(value) {
                  return ObjectToString(value) === '[object Set Iterator]';
                }
                exports.isSetIterator = isSetIterator;
                
                function isGeneratorObject(value) {
                  return ObjectToString(value) === '[object Generator]';
                }
                exports.isGeneratorObject = isGeneratorObject;
                
                function isWebAssemblyCompiledModule(value) {
                  return ObjectToString(value) === '[object WebAssembly.Module]';
                }
                exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;
                
                function isNumberObject(value) {
                  return checkBoxedPrimitive(value, numberValue);
                }
                exports.isNumberObject = isNumberObject;
                
                function isStringObject(value) {
                  return checkBoxedPrimitive(value, stringValue);
                }
                exports.isStringObject = isStringObject;
                
                function isBooleanObject(value) {
                  return checkBoxedPrimitive(value, booleanValue);
                }
                exports.isBooleanObject = isBooleanObject;
                
                function isBigIntObject(value) {
                  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
                }
                exports.isBigIntObject = isBigIntObject;
                
                function isSymbolObject(value) {
                  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
                }
                exports.isSymbolObject = isSymbolObject;
                
                function isBoxedPrimitive(value) {
                  return (
                    isNumberObject(value) ||
                    isStringObject(value) ||
                    isBooleanObject(value) ||
                    isBigIntObject(value) ||
                    isSymbolObject(value)
                  );
                }
                exports.isBoxedPrimitive = isBoxedPrimitive;
                
                function isAnyArrayBuffer(value) {
                  return Uint8ArraySupported && (
                    isArrayBuffer(value) ||
                    isSharedArrayBuffer(value)
                  );
                }
                exports.isAnyArrayBuffer = isAnyArrayBuffer;
                
                ['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
                  Object.defineProperty(exports, method, {
                    enumerable: false,
                    value: function() {
                      throw new Error(method + ' is not supported in userland');
                    }
                  });
                });
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/types.js sha1 = 3bfa608d786eeb0caad9f69079a1a13006fd50a9
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support"),"types.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support")},
    "./support/isBuffer" : {
            name:"isBuffer",
            path:"../node_modules/browser-util/support/isBuffer.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/isBuffer.js
                module.exports = function isBuffer(arg) {
                  return arg instanceof Buffer;
                }
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/isBuffer.js sha1 = ab526fa0e6a7e7f560d2126a632cc8342158334d
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support"),"isBuffer.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support")},
    "inherits" : {
            name:"inherits",
            path:"../node_modules/inherits/inherits.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/inherits/inherits.js
                try {
                  var util = require('util');
                  if (typeof util.inherits !== 'function') throw '';
                  module.exports = util.inherits;
                } catch (e) {
                  module.exports = require('./inherits_browser.js');
                }
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/inherits/inherits.js sha1 = 491caba7b70590f6dcbe37d7edccd9f89ac1b9fd
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/inherits"),"inherits.js","/home/jonathanmaxannett/jsextensions/node_modules/inherits")},
    "./support/types" : {
            name:"types",
            path:"../node_modules/browser-util/support/types.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/types.js
                // Currently in sync with Node.js lib/internal/util/types.js
                // https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9
                
                'use strict';
                
                var isBuffer = require('./isBuffer');
                
                var isArgumentsObject = require('is-arguments');
                var isGeneratorFunction = require('is-generator-function');
                
                function uncurryThis(f) {
                  return f.call.bind(f);
                }
                
                var BigIntSupported = typeof BigInt !== 'undefined';
                var SymbolSupported = typeof Symbol !== 'undefined';
                var SymbolToStringTagSupported = SymbolSupported && typeof Symbol.toStringTag !== 'undefined';
                var Uint8ArraySupported = typeof Uint8Array !== 'undefined';
                var ArrayBufferSupported = typeof ArrayBuffer !== 'undefined';
                
                if (Uint8ArraySupported && SymbolToStringTagSupported) {
                  var TypedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
                
                  var TypedArrayProto_toStringTag =
                      uncurryThis(
                        Object.getOwnPropertyDescriptor(TypedArrayPrototype,
                                                        Symbol.toStringTag).get);
                
                }
                
                var ObjectToString = uncurryThis(Object.prototype.toString);
                
                var numberValue = uncurryThis(Number.prototype.valueOf);
                var stringValue = uncurryThis(String.prototype.valueOf);
                var booleanValue = uncurryThis(Boolean.prototype.valueOf);
                
                if (BigIntSupported) {
                  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
                }
                
                if (SymbolSupported) {
                  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
                }
                
                function checkBoxedPrimitive(value, prototypeValueOf) {
                  if (typeof value !== 'object') {
                    return false;
                  }
                  try {
                    prototypeValueOf(value);
                    return true;
                  } catch(e) {
                    return false;
                  }
                }
                
                exports.isArgumentsObject = isArgumentsObject;
                
                exports.isGeneratorFunction = isGeneratorFunction;
                
                // Taken from here and modified for better browser support
                // https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
                function isPromise(input) {
                    return (
                        (
                            typeof Promise !== 'undefined' &&
                            input instanceof Promise
                        ) ||
                        (
                            input !== null &&
                            typeof input === 'object' &&
                            typeof input.then === 'function' &&
                            typeof input.catch === 'function'
                        )
                    );
                }
                exports.isPromise = isPromise;
                
                function isArrayBufferView(value) {
                  if (ArrayBufferSupported && ArrayBuffer.isView) {
                    return ArrayBuffer.isView(value);
                  }
                
                  return (
                    isTypedArray(value) ||
                    isDataView(value)
                  );
                }
                exports.isArrayBufferView = isArrayBufferView;
                
                function isTypedArray(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) !== undefined;
                  } else {
                    return (
                      isUint8Array(value) ||
                      isUint8ClampedArray(value) ||
                      isUint16Array(value) ||
                      isUint32Array(value) ||
                      isInt8Array(value) ||
                      isInt16Array(value) ||
                      isInt32Array(value) ||
                      isFloat32Array(value) ||
                      isFloat64Array(value) ||
                      isBigInt64Array(value) ||
                      isBigUint64Array(value)
                    );
                  }
                }
                exports.isTypedArray = isTypedArray;
                
                function isUint8Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Uint8Array';
                  } else {
                    return (
                      ObjectToString(value) === '[object Uint8Array]' ||
                      // If it's a Buffer instance _and_ has a `.buffer` property,
                      // this is an ArrayBuffer based buffer; thus it's an Uint8Array
                      // (Old Node.js had a custom non-Uint8Array implementation)
                      isBuffer(value) && value.buffer !== undefined
                    );
                  }
                }
                exports.isUint8Array = isUint8Array;
                
                function isUint8ClampedArray(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Uint8ClampedArray';
                  } else {
                    return ObjectToString(value) === '[object Uint8ClampedArray]';
                  }
                }
                exports.isUint8ClampedArray = isUint8ClampedArray;
                
                function isUint16Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Uint16Array';
                  } else {
                    return ObjectToString(value) === '[object Uint16Array]';
                  }
                }
                exports.isUint16Array = isUint16Array;
                
                function isUint32Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Uint32Array';
                  } else {
                    return ObjectToString(value) === '[object Uint32Array]';
                  }
                }
                exports.isUint32Array = isUint32Array;
                
                function isInt8Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Int8Array';
                  } else {
                    return ObjectToString(value) === '[object Int8Array]';
                  }
                }
                exports.isInt8Array = isInt8Array;
                
                function isInt16Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Int16Array';
                  } else {
                    return ObjectToString(value) === '[object Int16Array]';
                  }
                }
                exports.isInt16Array = isInt16Array;
                
                function isInt32Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Int32Array';
                  } else {
                    return ObjectToString(value) === '[object Int32Array]';
                  }
                }
                exports.isInt32Array = isInt32Array;
                
                function isFloat32Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Float32Array';
                  } else {
                    return ObjectToString(value) === '[object Float32Array]';
                  }
                }
                exports.isFloat32Array = isFloat32Array;
                
                function isFloat64Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'Float64Array';
                  } else {
                    return ObjectToString(value) === '[object Float64Array]';
                  }
                }
                exports.isFloat64Array = isFloat64Array;
                
                function isBigInt64Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'BigInt64Array';
                  } else {
                    return ObjectToString(value) === '[object BigInt64Array]';
                  }
                }
                exports.isBigInt64Array = isBigInt64Array;
                
                function isBigUint64Array(value) {
                  if (Uint8ArraySupported && SymbolToStringTagSupported) {
                    return TypedArrayProto_toStringTag(value) === 'BigUint64Array';
                  } else {
                    return ObjectToString(value) === '[object BigUint64Array]';
                  }
                }
                exports.isBigUint64Array = isBigUint64Array;
                
                function isMapToString(value) {
                  return ObjectToString(value) === '[object Map]';
                }
                isMapToString.working = (
                  typeof Map !== 'undefined' &&
                  isMapToString(new Map())
                );
                
                function isMap(value) {
                  if (typeof Map === 'undefined') {
                    return false;
                  }
                
                  return isMapToString.working
                    ? isMapToString(value)
                    : value instanceof Map;
                }
                exports.isMap = isMap;
                
                function isSetToString(value) {
                  return ObjectToString(value) === '[object Set]';
                }
                isSetToString.working = (
                  typeof Set !== 'undefined' &&
                  isSetToString(new Set())
                );
                function isSet(value) {
                  if (typeof Set === 'undefined') {
                    return false;
                  }
                
                  return isSetToString.working
                    ? isSetToString(value)
                    : value instanceof Set;
                }
                exports.isSet = isSet;
                
                function isWeakMapToString(value) {
                  return ObjectToString(value) === '[object WeakMap]';
                }
                isWeakMapToString.working = (
                  typeof WeakMap !== 'undefined' &&
                  isWeakMapToString(new WeakMap())
                );
                function isWeakMap(value) {
                  if (typeof WeakMap === 'undefined') {
                    return false;
                  }
                
                  return isWeakMapToString.working
                    ? isWeakMapToString(value)
                    : value instanceof WeakMap;
                }
                exports.isWeakMap = isWeakMap;
                
                function isWeakSetToString(value) {
                  return ObjectToString(value) === '[object WeakSet]';
                }
                isWeakSetToString.working = (
                  typeof WeakSet !== 'undefined' &&
                  isWeakSetToString(new WeakSet())
                );
                function isWeakSet(value) {
                  return isWeakSetToString(value);
                  if (typeof WeakSet === 'undefined') {
                    return false;
                  }
                
                  return isWeakSetToString.working
                    ? isWeakSetToString(value)
                    : value instanceof WeakSet;
                }
                exports.isWeakSet = isWeakSet;
                
                function isArrayBufferToString(value) {
                  return ObjectToString(value) === '[object ArrayBuffer]';
                }
                isArrayBufferToString.working = (
                  typeof ArrayBuffer !== 'undefined' &&
                  isArrayBufferToString(new ArrayBuffer())
                );
                function isArrayBuffer(value) {
                  if (typeof ArrayBuffer === 'undefined') {
                    return false;
                  }
                
                  return isArrayBufferToString.working
                    ? isArrayBufferToString(value)
                    : value instanceof ArrayBuffer;
                }
                exports.isArrayBuffer = isArrayBuffer;
                
                function isDataViewToString(value) {
                  return ObjectToString(value) === '[object DataView]';
                }
                isDataViewToString.working = (
                  typeof ArrayBuffer !== 'undefined' &&
                  typeof DataView !== 'undefined' &&
                  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
                );
                function isDataView(value) {
                  if (typeof DataView === 'undefined') {
                    return false;
                  }
                
                  return isDataViewToString.working
                    ? isDataViewToString(value)
                    : value instanceof DataView;
                }
                exports.isDataView = isDataView;
                
                function isSharedArrayBufferToString(value) {
                  return ObjectToString(value) === '[object SharedArrayBuffer]';
                }
                isSharedArrayBufferToString.working = (
                  typeof SharedArrayBuffer !== 'undefined' &&
                  isSharedArrayBufferToString(new SharedArrayBuffer())
                );
                function isSharedArrayBuffer(value) {
                  if (typeof SharedArrayBuffer === 'undefined') {
                    return false;
                  }
                
                  return isSharedArrayBufferToString.working
                    ? isSharedArrayBufferToString(value)
                    : value instanceof SharedArrayBuffer;
                }
                exports.isSharedArrayBuffer = isSharedArrayBuffer;
                
                function isAsyncFunction(value) {
                  return ObjectToString(value) === '[object AsyncFunction]';
                }
                exports.isAsyncFunction = isAsyncFunction;
                
                function isMapIterator(value) {
                  return ObjectToString(value) === '[object Map Iterator]';
                }
                exports.isMapIterator = isMapIterator;
                
                function isSetIterator(value) {
                  return ObjectToString(value) === '[object Set Iterator]';
                }
                exports.isSetIterator = isSetIterator;
                
                function isGeneratorObject(value) {
                  return ObjectToString(value) === '[object Generator]';
                }
                exports.isGeneratorObject = isGeneratorObject;
                
                function isWebAssemblyCompiledModule(value) {
                  return ObjectToString(value) === '[object WebAssembly.Module]';
                }
                exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;
                
                function isNumberObject(value) {
                  return checkBoxedPrimitive(value, numberValue);
                }
                exports.isNumberObject = isNumberObject;
                
                function isStringObject(value) {
                  return checkBoxedPrimitive(value, stringValue);
                }
                exports.isStringObject = isStringObject;
                
                function isBooleanObject(value) {
                  return checkBoxedPrimitive(value, booleanValue);
                }
                exports.isBooleanObject = isBooleanObject;
                
                function isBigIntObject(value) {
                  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
                }
                exports.isBigIntObject = isBigIntObject;
                
                function isSymbolObject(value) {
                  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
                }
                exports.isSymbolObject = isSymbolObject;
                
                function isBoxedPrimitive(value) {
                  return (
                    isNumberObject(value) ||
                    isStringObject(value) ||
                    isBooleanObject(value) ||
                    isBigIntObject(value) ||
                    isSymbolObject(value)
                  );
                }
                exports.isBoxedPrimitive = isBoxedPrimitive;
                
                function isAnyArrayBuffer(value) {
                  return Uint8ArraySupported && (
                    isArrayBuffer(value) ||
                    isSharedArrayBuffer(value)
                  );
                }
                exports.isAnyArrayBuffer = isAnyArrayBuffer;
                
                ['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
                  Object.defineProperty(exports, method, {
                    enumerable: false,
                    value: function() {
                      throw new Error(method + ' is not supported in userland');
                    }
                  });
                });
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/types.js sha1 = 3bfa608d786eeb0caad9f69079a1a13006fd50a9
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support"),"types.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support")},
    "./isBuffer" : {
            name:"isBuffer",
            path:"../node_modules/browser-util/support/isBuffer.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/isBuffer.js
                module.exports = function isBuffer(arg) {
                  return arg instanceof Buffer;
                }
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/isBuffer.js sha1 = ab526fa0e6a7e7f560d2126a632cc8342158334d
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support"),"isBuffer.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support")},
    "is-arguments" : {
            name:"is-arguments",
            path:"../node_modules/is-arguments/index.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/is-arguments/index.js
                'use strict';
                
                var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
                var toStr = Object.prototype.toString;
                
                var isStandardArguments = function isArguments(value) {
                    if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
                        return false;
                    }
                    return toStr.call(value) === '[object Arguments]';
                };
                
                var isLegacyArguments = function isArguments(value) {
                    if (isStandardArguments(value)) {
                        return true;
                    }
                    return value !== null &&
                        typeof value === 'object' &&
                        typeof value.length === 'number' &&
                        value.length >= 0 &&
                        toStr.call(value) !== '[object Array]' &&
                        toStr.call(value.callee) === '[object Function]';
                };
                
                var supportsStandardArguments = (function () {
                    return isStandardArguments(arguments);
                }());
                
                isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests
                
                module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/is-arguments/index.js sha1 = 03e026d417599e244476071ea2b165c63bb647a5
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/is-arguments"),"index.js","/home/jonathanmaxannett/jsextensions/node_modules/is-arguments")},
    "is-generator-function" : {
            name:"is-generator-function",
            path:"../node_modules/is-generator-function/index.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/is-generator-function/index.js
                'use strict';
                
                var toStr = Object.prototype.toString;
                var fnToStr = Function.prototype.toString;
                var isFnRegex = /^\s*(?:function)?\*/;
                var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
                var getProto = Object.getPrototypeOf;
                var getGeneratorFunc = function () { // eslint-disable-line consistent-return
                    if (!hasToStringTag) {
                        return false;
                    }
                    try {
                        return Function('return function*() {}')();
                    } catch (e) {
                    }
                };
                var generatorFunc = getGeneratorFunc();
                var GeneratorFunction = generatorFunc ? getProto(generatorFunc) : {};
                
                module.exports = function isGeneratorFunction(fn) {
                    if (typeof fn !== 'function') {
                        return false;
                    }
                    if (isFnRegex.test(fnToStr.call(fn))) {
                        return true;
                    }
                    if (!hasToStringTag) {
                        var str = toStr.call(fn);
                        return str === '[object GeneratorFunction]';
                    }
                    return getProto(fn) === GeneratorFunction;
                };
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/is-generator-function/index.js sha1 = aa4dacfbf2826bea0fdfb40c9e566137f53456b9
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/is-generator-function"),"index.js","/home/jonathanmaxannett/jsextensions/node_modules/is-generator-function")},
    "./inherits_browser.js" : {
            name:"inherits",
            path:"../node_modules/inherits/inherits_browser.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/inherits/inherits_browser.js
                if (typeof Object.create === 'function') {
                  // implementation from standard node.js 'util' module
                  module.exports = function inherits(ctor, superCtor) {
                    ctor.super_ = superCtor
                    ctor.prototype = Object.create(superCtor.prototype, {
                      constructor: {
                        value: ctor,
                        enumerable: false,
                        writable: true,
                        configurable: true
                      }
                    });
                  };
                } else {
                  // old school shim for old browsers
                  module.exports = function inherits(ctor, superCtor) {
                    ctor.super_ = superCtor
                    var TempCtor = function () {}
                    TempCtor.prototype = superCtor.prototype
                    ctor.prototype = new TempCtor()
                    ctor.prototype.constructor = ctor
                  }
                }
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/inherits/inherits_browser.js sha1 = 7c13eacf36e79e5e7dd257d80ec25846e4df7eb3
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/inherits"),"inherits_browser.js","/home/jonathanmaxannett/jsextensions/node_modules/inherits")},
    "./isBuffer" : {
            name:"isBuffer",
            path:"../node_modules/browser-util/support/isBuffer.js",
            load: (function (module,require,__filename,__dirname){var exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/isBuffer.js
                module.exports = function isBuffer(arg) {
                  return arg instanceof Buffer;
                }
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support/isBuffer.js sha1 = ab526fa0e6a7e7f560d2126a632cc8342158334d
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support"),"isBuffer.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-util/support")},
    "path" : {
            name:"browser-path",
            path:"../node_modules/browser-path/path.js",
            load: (function (module,require,__filename,__dirname){var process = {
        "env": {},
        "cwd": function(){ return "/";}
    },exports = module.exports;
             // paste begin:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-path/path.js
                // Copyright Joyent, Inc. and other Node contributors.
                //
                // Permission is hereby granted, free of charge, to any person obtaining a
                // copy of this software and associated documentation files (the
                // "Software"), to deal in the Software without restriction, including
                // without limitation the rights to use, copy, modify, merge, publish,
                // distribute, sublicense, and/or sell copies of the Software, and to permit
                // persons to whom the Software is furnished to do so, subject to the
                // following conditions:
                //
                // The above copyright notice and this permission notice shall be included
                // in all copies or substantial portions of the Software.
                //
                // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
                // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
                // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
                // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
                // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
                // USE OR OTHER DEALINGS IN THE SOFTWARE.
                
                'use strict';
                
                
                var isWindows = process.platform === 'win32';
                var util = require('util');
                
                
                // resolves . and .. elements in a path array with directory names there
                // must be no slashes or device names (c:\) in the array
                // (so also no leading and trailing slashes - it does not distinguish
                // relative and absolute paths)
                function normalizeArray(parts, allowAboveRoot) {
                  var res = [];
                  for (var i = 0; i < parts.length; i++) {
                    var p = parts[i];
                
                    // ignore empty parts
                    if (!p || p === '.')
                      continue;
                
                    if (p === '..') {
                      if (res.length && res[res.length - 1] !== '..') {
                        res.pop();
                      } else if (allowAboveRoot) {
                        res.push('..');
                      }
                    } else {
                      res.push(p);
                    }
                  }
                
                  return res;
                }
                
                // returns an array with empty elements removed from either end of the input
                // array or the original array if no elements need to be removed
                function trimArray(arr) {
                  var lastIndex = arr.length - 1;
                  var start = 0;
                  for (; start <= lastIndex; start++) {
                    if (arr[start])
                      break;
                  }
                
                  var end = lastIndex;
                  for (; end >= 0; end--) {
                    if (arr[end])
                      break;
                  }
                
                  if (start === 0 && end === lastIndex)
                    return arr;
                  if (start > end)
                    return [];
                  return arr.slice(start, end + 1);
                }
                
                // Regex to split a windows path into three parts: [*, device, slash,
                // tail] windows-only
                var splitDeviceRe =
                    /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
                
                // Regex to split the tail part of the above into [*, dir, basename, ext]
                var splitTailRe =
                    /^([\s\S]*?)((?:\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))(?:[\\\/]*)$/;
                
                var win32 = {};
                
                // Function to split a filename into [root, dir, basename, ext]
                function win32SplitPath(filename) {
                  // Separate device+slash from tail
                  var result = splitDeviceRe.exec(filename),
                      device = (result[1] || '') + (result[2] || ''),
                      tail = result[3] || '';
                  // Split the tail into dir, basename and extension
                  var result2 = splitTailRe.exec(tail),
                      dir = result2[1],
                      basename = result2[2],
                      ext = result2[3];
                  return [device, dir, basename, ext];
                }
                
                function win32StatPath(path) {
                  var result = splitDeviceRe.exec(path),
                      device = result[1] || '',
                      isUnc = !!device && device[1] !== ':';
                  return {
                    device: device,
                    isUnc: isUnc,
                    isAbsolute: isUnc || !!result[2], // UNC paths are always absolute
                    tail: result[3]
                  };
                }
                
                function normalizeUNCRoot(device) {
                  return '\\\\' + device.replace(/^[\\\/]+/, '').replace(/[\\\/]+/g, '\\');
                }
                
                // path.resolve([from ...], to)
                win32.resolve = function() {
                  var resolvedDevice = '',
                      resolvedTail = '',
                      resolvedAbsolute = false;
                
                  for (var i = arguments.length - 1; i >= -1; i--) {
                    var path;
                    if (i >= 0) {
                      path = arguments[i];
                    } else if (!resolvedDevice) {
                      path = process.cwd();
                    } else {
                      // Windows has the concept of drive-specific current working
                      // directories. If we've resolved a drive letter but not yet an
                      // absolute path, get cwd for that drive. We're sure the device is not
                      // an unc path at this points, because unc paths are always absolute.
                      path = process.env['=' + resolvedDevice];
                      // Verify that a drive-local cwd was found and that it actually points
                      // to our drive. If not, default to the drive's root.
                      if (!path || path.substr(0, 3).toLowerCase() !==
                          resolvedDevice.toLowerCase() + '\\') {
                        path = resolvedDevice + '\\';
                      }
                    }
                
                    // Skip empty and invalid entries
                    if (!util.isString(path)) {
                      throw new TypeError('Arguments to path.resolve must be strings');
                    } else if (!path) {
                      continue;
                    }
                
                    var result = win32StatPath(path),
                        device = result.device,
                        isUnc = result.isUnc,
                        isAbsolute = result.isAbsolute,
                        tail = result.tail;
                
                    if (device &&
                        resolvedDevice &&
                        device.toLowerCase() !== resolvedDevice.toLowerCase()) {
                      // This path points to another device so it is not applicable
                      continue;
                    }
                
                    if (!resolvedDevice) {
                      resolvedDevice = device;
                    }
                    if (!resolvedAbsolute) {
                      resolvedTail = tail + '\\' + resolvedTail;
                      resolvedAbsolute = isAbsolute;
                    }
                
                    if (resolvedDevice && resolvedAbsolute) {
                      break;
                    }
                  }
                
                  // Convert slashes to backslashes when `resolvedDevice` points to an UNC
                  // root. Also squash multiple slashes into a single one where appropriate.
                  if (isUnc) {
                    resolvedDevice = normalizeUNCRoot(resolvedDevice);
                  }
                
                  // At this point the path should be resolved to a full absolute path,
                  // but handle relative paths to be safe (might happen when process.cwd()
                  // fails)
                
                  // Normalize the tail path
                  resolvedTail = normalizeArray(resolvedTail.split(/[\\\/]+/),
                                                !resolvedAbsolute).join('\\');
                
                  return (resolvedDevice + (resolvedAbsolute ? '\\' : '') + resolvedTail) ||
                         '.';
                };
                
                
                win32.normalize = function(path) {
                  var result = win32StatPath(path),
                      device = result.device,
                      isUnc = result.isUnc,
                      isAbsolute = result.isAbsolute,
                      tail = result.tail,
                      trailingSlash = /[\\\/]$/.test(tail);
                
                  // Normalize the tail path
                  tail = normalizeArray(tail.split(/[\\\/]+/), !isAbsolute).join('\\');
                
                  if (!tail && !isAbsolute) {
                    tail = '.';
                  }
                  if (tail && trailingSlash) {
                    tail += '\\';
                  }
                
                  // Convert slashes to backslashes when `device` points to an UNC root.
                  // Also squash multiple slashes into a single one where appropriate.
                  if (isUnc) {
                    device = normalizeUNCRoot(device);
                  }
                
                  return device + (isAbsolute ? '\\' : '') + tail;
                };
                
                
                win32.isAbsolute = function(path) {
                  return win32StatPath(path).isAbsolute;
                };
                
                win32.join = function() {
                  var paths = [];
                  for (var i = 0; i < arguments.length; i++) {
                    var arg = arguments[i];
                    if (!util.isString(arg)) {
                      throw new TypeError('Arguments to path.join must be strings');
                    }
                    if (arg) {
                      paths.push(arg);
                    }
                  }
                
                  var joined = paths.join('\\');
                
                  // Make sure that the joined path doesn't start with two slashes, because
                  // normalize() will mistake it for an UNC path then.
                  //
                  // This step is skipped when it is very clear that the user actually
                  // intended to point at an UNC path. This is assumed when the first
                  // non-empty string arguments starts with exactly two slashes followed by
                  // at least one more non-slash character.
                  //
                  // Note that for normalize() to treat a path as an UNC path it needs to
                  // have at least 2 components, so we don't filter for that here.
                  // This means that the user can use join to construct UNC paths from
                  // a server name and a share name; for example:
                  //   path.join('//server', 'share') -> '\\\\server\\share\')
                  if (!/^[\\\/]{2}[^\\\/]/.test(paths[0])) {
                    joined = joined.replace(/^[\\\/]{2,}/, '\\');
                  }
                
                  return win32.normalize(joined);
                };
                
                
                // path.relative(from, to)
                // it will solve the relative path from 'from' to 'to', for instance:
                // from = 'C:\\orandea\\test\\aaa'
                // to = 'C:\\orandea\\impl\\bbb'
                // The output of the function should be: '..\\..\\impl\\bbb'
                win32.relative = function(from, to) {
                  from = win32.resolve(from);
                  to = win32.resolve(to);
                
                  // windows is not case sensitive
                  var lowerFrom = from.toLowerCase();
                  var lowerTo = to.toLowerCase();
                
                  var toParts = trimArray(to.split('\\'));
                
                  var lowerFromParts = trimArray(lowerFrom.split('\\'));
                  var lowerToParts = trimArray(lowerTo.split('\\'));
                
                  var length = Math.min(lowerFromParts.length, lowerToParts.length);
                  var samePartsLength = length;
                  for (var i = 0; i < length; i++) {
                    if (lowerFromParts[i] !== lowerToParts[i]) {
                      samePartsLength = i;
                      break;
                    }
                  }
                
                  if (samePartsLength == 0) {
                    return to;
                  }
                
                  var outputParts = [];
                  for (var i = samePartsLength; i < lowerFromParts.length; i++) {
                    outputParts.push('..');
                  }
                
                  outputParts = outputParts.concat(toParts.slice(samePartsLength));
                
                  return outputParts.join('\\');
                };
                
                
                win32._makeLong = function(path) {
                  // Note: this will *probably* throw somewhere.
                  if (!util.isString(path))
                    return path;
                
                  if (!path) {
                    return '';
                  }
                
                  var resolvedPath = win32.resolve(path);
                
                  if (/^[a-zA-Z]\:\\/.test(resolvedPath)) {
                    // path is local filesystem path, which needs to be converted
                    // to long UNC path.
                    return '\\\\?\\' + resolvedPath;
                  } else if (/^\\\\[^?.]/.test(resolvedPath)) {
                    // path is network UNC path, which needs to be converted
                    // to long UNC path.
                    return '\\\\?\\UNC\\' + resolvedPath.substring(2);
                  }
                
                  return path;
                };
                
                
                win32.dirname = function(path) {
                  var result = win32SplitPath(path),
                      root = result[0],
                      dir = result[1];
                
                  if (!root && !dir) {
                    // No dirname whatsoever
                    return '.';
                  }
                
                  if (dir) {
                    // It has a dirname, strip trailing slash
                    dir = dir.substr(0, dir.length - 1);
                  }
                
                  return root + dir;
                };
                
                
                win32.basename = function(path, ext) {
                  var f = win32SplitPath(path)[2];
                  // TODO: make this comparison case-insensitive on windows?
                  if (ext && f.substr(-1 * ext.length) === ext) {
                    f = f.substr(0, f.length - ext.length);
                  }
                  return f;
                };
                
                
                win32.extname = function(path) {
                  return win32SplitPath(path)[3];
                };
                
                win32.format = function(pathObject) {
                  if (!util.isObject(pathObject)) {
                    throw new TypeError(
                        "Parameter 'pathObject' must be an object, not " + typeof pathObject
                    );
                  }
                
                  var root = pathObject.root || '';
                
                  if (!util.isString(root)) {
                    throw new TypeError(
                        "'pathObject.root' must be a string or undefined, not " +
                        typeof pathObject.root
                    );
                  }
                
                  var dir = pathObject.dir;
                  var base = pathObject.base || '';
                  if (!dir) {
                    return base;
                  }
                  if (dir[dir.length - 1] === win32.sep) {
                    return dir + base;
                  }
                  return dir + win32.sep + base;
                };
                
                
                win32.parse = function(pathString) {
                  if (!util.isString(pathString)) {
                    throw new TypeError(
                        "Parameter 'pathString' must be a string, not " + typeof pathString
                    );
                  }
                  var allParts = win32SplitPath(pathString);
                  if (!allParts || allParts.length !== 4) {
                    throw new TypeError("Invalid path '" + pathString + "'");
                  }
                  return {
                    root: allParts[0],
                    dir: allParts[0] + allParts[1].slice(0, -1),
                    base: allParts[2],
                    ext: allParts[3],
                    name: allParts[2].slice(0, allParts[2].length - allParts[3].length)
                  };
                };
                
                
                win32.sep = '\\';
                win32.delimiter = ';';
                
                
                // Split a filename into [root, dir, basename, ext], unix version
                // 'root' is just a slash, or nothing.
                var splitPathRe =
                    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
                var posix = {};
                
                
                function posixSplitPath(filename) {
                  return splitPathRe.exec(filename).slice(1);
                }
                
                
                // path.resolve([from ...], to)
                // posix version
                posix.resolve = function() {
                  var resolvedPath = '',
                      resolvedAbsolute = false;
                
                  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
                    var path = (i >= 0) ? arguments[i] : process.cwd();
                
                    // Skip empty and invalid entries
                    if (!util.isString(path)) {
                      throw new TypeError('Arguments to path.resolve must be strings');
                    } else if (!path) {
                      continue;
                    }
                
                    resolvedPath = path + '/' + resolvedPath;
                    resolvedAbsolute = path[0] === '/';
                  }
                
                  // At this point the path should be resolved to a full absolute path, but
                  // handle relative paths to be safe (might happen when process.cwd() fails)
                
                  // Normalize the path
                  resolvedPath = normalizeArray(resolvedPath.split('/'),
                                                !resolvedAbsolute).join('/');
                
                  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
                };
                
                // path.normalize(path)
                // posix version
                posix.normalize = function(path) {
                  var isAbsolute = posix.isAbsolute(path),
                      trailingSlash = path && path[path.length - 1] === '/';
                
                  // Normalize the path
                  path = normalizeArray(path.split('/'), !isAbsolute).join('/');
                
                  if (!path && !isAbsolute) {
                    path = '.';
                  }
                  if (path && trailingSlash) {
                    path += '/';
                  }
                
                  return (isAbsolute ? '/' : '') + path;
                };
                
                // posix version
                posix.isAbsolute = function(path) {
                  return path.charAt(0) === '/';
                };
                
                // posix version
                posix.join = function() {
                  var path = '';
                  for (var i = 0; i < arguments.length; i++) {
                    var segment = arguments[i];
                    if (!util.isString(segment)) {
                      throw new TypeError('Arguments to path.join must be strings');
                    }
                    if (segment) {
                      if (!path) {
                        path += segment;
                      } else {
                        path += '/' + segment;
                      }
                    }
                  }
                  return posix.normalize(path);
                };
                
                
                // path.relative(from, to)
                // posix version
                posix.relative = function(from, to) {
                  from = posix.resolve(from).substr(1);
                  to = posix.resolve(to).substr(1);
                
                  var fromParts = trimArray(from.split('/'));
                  var toParts = trimArray(to.split('/'));
                
                  var length = Math.min(fromParts.length, toParts.length);
                  var samePartsLength = length;
                  for (var i = 0; i < length; i++) {
                    if (fromParts[i] !== toParts[i]) {
                      samePartsLength = i;
                      break;
                    }
                  }
                
                  var outputParts = [];
                  for (var i = samePartsLength; i < fromParts.length; i++) {
                    outputParts.push('..');
                  }
                
                  outputParts = outputParts.concat(toParts.slice(samePartsLength));
                
                  return outputParts.join('/');
                };
                
                
                posix._makeLong = function(path) {
                  return path;
                };
                
                
                posix.dirname = function(path) {
                  var result = posixSplitPath(path),
                      root = result[0],
                      dir = result[1];
                
                  if (!root && !dir) {
                    // No dirname whatsoever
                    return '.';
                  }
                
                  if (dir) {
                    // It has a dirname, strip trailing slash
                    dir = dir.substr(0, dir.length - 1);
                  }
                
                  return root + dir;
                };
                
                
                posix.basename = function(path, ext) {
                  var f = posixSplitPath(path)[2];
                  // TODO: make this comparison case-insensitive on windows?
                  if (ext && f.substr(-1 * ext.length) === ext) {
                    f = f.substr(0, f.length - ext.length);
                  }
                  return f;
                };
                
                
                posix.extname = function(path) {
                  return posixSplitPath(path)[3];
                };
                
                
                posix.format = function(pathObject) {
                  if (!util.isObject(pathObject)) {
                    throw new TypeError(
                        "Parameter 'pathObject' must be an object, not " + typeof pathObject
                    );
                  }
                
                  var root = pathObject.root || '';
                
                  if (!util.isString(root)) {
                    throw new TypeError(
                        "'pathObject.root' must be a string or undefined, not " +
                        typeof pathObject.root
                    );
                  }
                
                  var dir = pathObject.dir ? pathObject.dir + posix.sep : '';
                  var base = pathObject.base || '';
                  return dir + base;
                };
                
                
                posix.parse = function(pathString) {
                  if (!util.isString(pathString)) {
                    throw new TypeError(
                        "Parameter 'pathString' must be a string, not " + typeof pathString
                    );
                  }
                  var allParts = posixSplitPath(pathString);
                  if (!allParts || allParts.length !== 4) {
                    throw new TypeError("Invalid path '" + pathString + "'");
                  }
                  allParts[1] = allParts[1] || '';
                  allParts[2] = allParts[2] || '';
                  allParts[3] = allParts[3] || '';
                
                  return {
                    root: allParts[0],
                    dir: allParts[0] + allParts[1].slice(0, -1),
                    base: allParts[2],
                    ext: allParts[3],
                    name: allParts[2].slice(0, allParts[2].length - allParts[3].length)
                  };
                };
                
                
                posix.sep = '/';
                posix.delimiter = ':';
                
                
                if (isWindows)
                  module.exports = win32;
                else /* posix */
                  module.exports = posix;
                
                module.exports.posix = posix;
                module.exports.win32 = win32;
                
             // paste end:file:/home/jonathanmaxannett/jsextensions/node_modules/browser-path/path.js sha1 = f14f27107c2666c5ea412b37e34ab947ec3d2453
             return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"/home/jonathanmaxannett/jsextensions/node_modules/browser-path"),"path.js","/home/jonathanmaxannett/jsextensions/node_modules/browser-path")},
            
             ___the___:"end"
        };
    
    
        var mod=function (module,require,__filename,__dirname) {var exports=module.exports;
            //paste-begin: http://npmjs.com
                 module.exports = (function(){var res={};["punycode","url","querystring","util","path"].forEach(function(m){res[m]=require(m);});return res;})();
            //paste-end: http://npmjs.com
            return module.exports;
        };
    
        return mod({exports:{}},__sim_require.bind(this,"."),"browser-internal.js",".");
    
    })();})(typeof process+typeof module+typeof require==='objectobjectfunction'?[module,"exports"]:[window,"simRequire"]);
