/* non-minified concatenated source, built Thu Feb  6 08:40:12 AEDT 2020 from extensions.js */
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
/* browser-fs.pkg.js */
(function($N){

/*jszip.js*/
$N[0][$N[1]]=(function($N,$E){$N[$E]={};(function(module,exports,window){
/* jshint ignore:start */
/*pre-packaged jszip.js begin*/
/*!

JSZip v3.2.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/master/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/master/LICENSE
*/

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.JSZip = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var utils = require('./utils');
var support = require('./support');
// private property
var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";


// public method for encoding
exports.encode = function(input) {
    var output = [];
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0, len = input.length, remainingBytes = len;

    var isArray = utils.getTypeOf(input) !== "string";
    while (i < input.length) {
        remainingBytes = len - i;

        if (!isArray) {
            chr1 = input.charCodeAt(i++);
            chr2 = i < len ? input.charCodeAt(i++) : 0;
            chr3 = i < len ? input.charCodeAt(i++) : 0;
        } else {
            chr1 = input[i++];
            chr2 = i < len ? input[i++] : 0;
            chr3 = i < len ? input[i++] : 0;
        }

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = remainingBytes > 1 ? (((chr2 & 15) << 2) | (chr3 >> 6)) : 64;
        enc4 = remainingBytes > 2 ? (chr3 & 63) : 64;

        output.push(_keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4));

    }

    return output.join("");
};

// public method for decoding
exports.decode = function(input) {
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0, resultIndex = 0;

    var dataUrlPrefix = "data:";

    if (input.substr(0, dataUrlPrefix.length) === dataUrlPrefix) {
        // This is a common error: people give a data url
        // (data:image/png;base64,iVBOR...) with a {base64: true} and
        // wonders why things don't work.
        // We can detect that the string input looks like a data url but we
        // *can't* be sure it is one: removing everything up to the comma would
        // be too dangerous.
        throw new Error("Invalid base64 input, it looks like a data url.");
    }

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    var totalLength = input.length * 3 / 4;
    if(input.charAt(input.length - 1) === _keyStr.charAt(64)) {
        totalLength--;
    }
    if(input.charAt(input.length - 2) === _keyStr.charAt(64)) {
        totalLength--;
    }
    if (totalLength % 1 !== 0) {
        // totalLength is not an integer, the length does not match a valid
        // base64 content. That can happen if:
        // - the input is not a base64 content
        // - the input is *almost* a base64 content, with a extra chars at the
        //   beginning or at the end
        // - the input uses a base64 variant (base64url for example)
        throw new Error("Invalid base64 input, bad content length.");
    }
    var output;
    if (support.uint8array) {
        output = new Uint8Array(totalLength|0);
    } else {
        output = new Array(totalLength|0);
    }

    while (i < input.length) {

        enc1 = _keyStr.indexOf(input.charAt(i++));
        enc2 = _keyStr.indexOf(input.charAt(i++));
        enc3 = _keyStr.indexOf(input.charAt(i++));
        enc4 = _keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output[resultIndex++] = chr1;

        if (enc3 !== 64) {
            output[resultIndex++] = chr2;
        }
        if (enc4 !== 64) {
            output[resultIndex++] = chr3;
        }

    }

    return output;
};

},{"./support":30,"./utils":32}],2:[function(require,module,exports){
'use strict';

var external = require("./external");
var DataWorker = require('./stream/DataWorker');
var DataLengthProbe = require('./stream/DataLengthProbe');
var Crc32Probe = require('./stream/Crc32Probe');
var DataLengthProbe = require('./stream/DataLengthProbe');

/**
 * Represent a compressed object, with everything needed to decompress it.
 * @constructor
 * @param {number} compressedSize the size of the data compressed.
 * @param {number} uncompressedSize the size of the data after decompression.
 * @param {number} crc32 the crc32 of the decompressed file.
 * @param {object} compression the type of compression, see lib/compressions.js.
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the compressed data.
 */
function CompressedObject(compressedSize, uncompressedSize, crc32, compression, data) {
    this.compressedSize = compressedSize;
    this.uncompressedSize = uncompressedSize;
    this.crc32 = crc32;
    this.compression = compression;
    this.compressedContent = data;
}

CompressedObject.prototype = {
    /**
     * Create a worker to get the uncompressed content.
     * @return {GenericWorker} the worker.
     */
    getContentWorker : function () {
        var worker = new DataWorker(external.Promise.resolve(this.compressedContent))
        .pipe(this.compression.uncompressWorker())
        .pipe(new DataLengthProbe("data_length"));

        var that = this;
        worker.on("end", function () {
            if(this.streamInfo['data_length'] !== that.uncompressedSize) {
                throw new Error("Bug : uncompressed data size mismatch");
            }
        });
        return worker;
    },
    /**
     * Create a worker to get the compressed content.
     * @return {GenericWorker} the worker.
     */
    getCompressedWorker : function () {
        return new DataWorker(external.Promise.resolve(this.compressedContent))
        .withStreamInfo("compressedSize", this.compressedSize)
        .withStreamInfo("uncompressedSize", this.uncompressedSize)
        .withStreamInfo("crc32", this.crc32)
        .withStreamInfo("compression", this.compression)
        ;
    }
};

/**
 * Chain the given worker with other workers to compress the content with the
 * given compresion.
 * @param {GenericWorker} uncompressedWorker the worker to pipe.
 * @param {Object} compression the compression object.
 * @param {Object} compressionOptions the options to use when compressing.
 * @return {GenericWorker} the new worker compressing the content.
 */
CompressedObject.createWorkerFrom = function (uncompressedWorker, compression, compressionOptions) {
    return uncompressedWorker
    .pipe(new Crc32Probe())
    .pipe(new DataLengthProbe("uncompressedSize"))
    .pipe(compression.compressWorker(compressionOptions))
    .pipe(new DataLengthProbe("compressedSize"))
    .withStreamInfo("compression", compression);
};

module.exports = CompressedObject;

},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(require,module,exports){
'use strict';

var GenericWorker = require("./stream/GenericWorker");

exports.STORE = {
    magic: "\x00\x00",
    compressWorker : function (compressionOptions) {
        return new GenericWorker("STORE compression");
    },
    uncompressWorker : function () {
        return new GenericWorker("STORE decompression");
    }
};
exports.DEFLATE = require('./flate');

},{"./flate":7,"./stream/GenericWorker":28}],4:[function(require,module,exports){
'use strict';

var utils = require('./utils');

/**
 * The following functions come from pako, from pako/lib/zlib/crc32.js
 * released under the MIT license, see pako https://github.com/nodeca/pako/
 */

// Use ordinary array, since untyped makes no boost here
function makeTable() {
    var c, table = [];

    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++){
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }

    return table;
}

// Create table on load. Just 255 signed longs. Not a problem.
var crcTable = makeTable();


function crc32(crc, buf, len, pos) {
    var t = crcTable, end = pos + len;

    crc = crc ^ (-1);

    for (var i = pos; i < end; i++ ) {
        crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
    }

    return (crc ^ (-1)); // >>> 0;
}

// That's all for the pako functions.

/**
 * Compute the crc32 of a string.
 * This is almost the same as the function crc32, but for strings. Using the
 * same function for the two use cases leads to horrible performances.
 * @param {Number} crc the starting value of the crc.
 * @param {String} str the string to use.
 * @param {Number} len the length of the string.
 * @param {Number} pos the starting position for the crc32 computation.
 * @return {Number} the computed crc32.
 */
function crc32str(crc, str, len, pos) {
    var t = crcTable, end = pos + len;

    crc = crc ^ (-1);

    for (var i = pos; i < end; i++ ) {
        crc = (crc >>> 8) ^ t[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)); // >>> 0;
}

module.exports = function crc32wrapper(input, crc) {
    if (typeof input === "undefined" || !input.length) {
        return 0;
    }

    var isArray = utils.getTypeOf(input) !== "string";

    if(isArray) {
        return crc32(crc|0, input, input.length, 0);
    } else {
        return crc32str(crc|0, input, input.length, 0);
    }
};

},{"./utils":32}],5:[function(require,module,exports){
'use strict';
exports.base64 = false;
exports.binary = false;
exports.dir = false;
exports.createFolders = true;
exports.date = null;
exports.compression = null;
exports.compressionOptions = null;
exports.comment = null;
exports.unixPermissions = null;
exports.dosPermissions = null;

},{}],6:[function(require,module,exports){
/* global Promise */
'use strict';

// load the global object first:
// - it should be better integrated in the system (unhandledRejection in node)
// - the environment may have a custom Promise implementation (see zone.js)
var ES6Promise = null;
if (typeof Promise !== "undefined") {
    ES6Promise = Promise;
} else {
    ES6Promise = require("lie");
}

/**
 * Let the user use/change some implementations.
 */
module.exports = {
    Promise: ES6Promise
};

},{"lie":37}],7:[function(require,module,exports){
'use strict';
var USE_TYPEDARRAY = (typeof Uint8Array !== 'undefined') && (typeof Uint16Array !== 'undefined') && (typeof Uint32Array !== 'undefined');

var pako = require("pako");
var utils = require("./utils");
var GenericWorker = require("./stream/GenericWorker");

var ARRAY_TYPE = USE_TYPEDARRAY ? "uint8array" : "array";

exports.magic = "\x08\x00";

/**
 * Create a worker that uses pako to inflate/deflate.
 * @constructor
 * @param {String} action the name of the pako function to call : either "Deflate" or "Inflate".
 * @param {Object} options the options to use when (de)compressing.
 */
function FlateWorker(action, options) {
    GenericWorker.call(this, "FlateWorker/" + action);

    this._pako = null;
    this._pakoAction = action;
    this._pakoOptions = options;
    // the `meta` object from the last chunk received
    // this allow this worker to pass around metadata
    this.meta = {};
}

utils.inherits(FlateWorker, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
FlateWorker.prototype.processChunk = function (chunk) {
    this.meta = chunk.meta;
    if (this._pako === null) {
        this._createPako();
    }
    this._pako.push(utils.transformTo(ARRAY_TYPE, chunk.data), false);
};

/**
 * @see GenericWorker.flush
 */
FlateWorker.prototype.flush = function () {
    GenericWorker.prototype.flush.call(this);
    if (this._pako === null) {
        this._createPako();
    }
    this._pako.push([], true);
};
/**
 * @see GenericWorker.cleanUp
 */
FlateWorker.prototype.cleanUp = function () {
    GenericWorker.prototype.cleanUp.call(this);
    this._pako = null;
};

/**
 * Create the _pako object.
 * TODO: lazy-loading this object isn't the best solution but it's the
 * quickest. The best solution is to lazy-load the worker list. See also the
 * issue #446.
 */
FlateWorker.prototype._createPako = function () {
    this._pako = new pako[this._pakoAction]({
        raw: true,
        level: this._pakoOptions.level || -1 // default compression
    });
    var self = this;
    this._pako.onData = function(data) {
        self.push({
            data : data,
            meta : self.meta
        });
    };
};

exports.compressWorker = function (compressionOptions) {
    return new FlateWorker("Deflate", compressionOptions);
};
exports.uncompressWorker = function () {
    return new FlateWorker("Inflate", {});
};

},{"./stream/GenericWorker":28,"./utils":32,"pako":38}],8:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var GenericWorker = require('../stream/GenericWorker');
var utf8 = require('../utf8');
var crc32 = require('../crc32');
var signature = require('../signature');

/**
 * Transform an integer into a string in hexadecimal.
 * @private
 * @param {number} dec the number to convert.
 * @param {number} bytes the number of bytes to generate.
 * @returns {string} the result.
 */
var decToHex = function(dec, bytes) {
    var hex = "", i;
    for (i = 0; i < bytes; i++) {
        hex += String.fromCharCode(dec & 0xff);
        dec = dec >>> 8;
    }
    return hex;
};

/**
 * Generate the UNIX part of the external file attributes.
 * @param {Object} unixPermissions the unix permissions or null.
 * @param {Boolean} isDir true if the entry is a directory, false otherwise.
 * @return {Number} a 32 bit integer.
 *
 * adapted from http://unix.stackexchange.com/questions/14705/the-zip-formats-external-file-attribute :
 *
 * TTTTsstrwxrwxrwx0000000000ADVSHR
 * ^^^^____________________________ file type, see zipinfo.c (UNX_*)
 *     ^^^_________________________ setuid, setgid, sticky
 *        ^^^^^^^^^________________ permissions
 *                 ^^^^^^^^^^______ not used ?
 *                           ^^^^^^ DOS attribute bits : Archive, Directory, Volume label, System file, Hidden, Read only
 */
var generateUnixExternalFileAttr = function (unixPermissions, isDir) {

    var result = unixPermissions;
    if (!unixPermissions) {
        // I can't use octal values in strict mode, hence the hexa.
        //  040775 => 0x41fd
        // 0100664 => 0x81b4
        result = isDir ? 0x41fd : 0x81b4;
    }
    return (result & 0xFFFF) << 16;
};

/**
 * Generate the DOS part of the external file attributes.
 * @param {Object} dosPermissions the dos permissions or null.
 * @param {Boolean} isDir true if the entry is a directory, false otherwise.
 * @return {Number} a 32 bit integer.
 *
 * Bit 0     Read-Only
 * Bit 1     Hidden
 * Bit 2     System
 * Bit 3     Volume Label
 * Bit 4     Directory
 * Bit 5     Archive
 */
var generateDosExternalFileAttr = function (dosPermissions, isDir) {

    // the dir flag is already set for compatibility
    return (dosPermissions || 0)  & 0x3F;
};

/**
 * Generate the various parts used in the construction of the final zip file.
 * @param {Object} streamInfo the hash with informations about the compressed file.
 * @param {Boolean} streamedContent is the content streamed ?
 * @param {Boolean} streamingEnded is the stream finished ?
 * @param {number} offset the current offset from the start of the zip file.
 * @param {String} platform let's pretend we are this platform (change platform dependents fields)
 * @param {Function} encodeFileName the function to encode the file name / comment.
 * @return {Object} the zip parts.
 */
var generateZipParts = function(streamInfo, streamedContent, streamingEnded, offset, platform, encodeFileName) {
    var file = streamInfo['file'],
    compression = streamInfo['compression'],
    useCustomEncoding = encodeFileName !== utf8.utf8encode,
    encodedFileName = utils.transformTo("string", encodeFileName(file.name)),
    utfEncodedFileName = utils.transformTo("string", utf8.utf8encode(file.name)),
    comment = file.comment,
    encodedComment = utils.transformTo("string", encodeFileName(comment)),
    utfEncodedComment = utils.transformTo("string", utf8.utf8encode(comment)),
    useUTF8ForFileName = utfEncodedFileName.length !== file.name.length,
    useUTF8ForComment = utfEncodedComment.length !== comment.length,
    dosTime,
    dosDate,
    extraFields = "",
    unicodePathExtraField = "",
    unicodeCommentExtraField = "",
    dir = file.dir,
    date = file.date;


    var dataInfo = {
        crc32 : 0,
        compressedSize : 0,
        uncompressedSize : 0
    };

    // if the content is streamed, the sizes/crc32 are only available AFTER
    // the end of the stream.
    if (!streamedContent || streamingEnded) {
        dataInfo.crc32 = streamInfo['crc32'];
        dataInfo.compressedSize = streamInfo['compressedSize'];
        dataInfo.uncompressedSize = streamInfo['uncompressedSize'];
    }

    var bitflag = 0;
    if (streamedContent) {
        // Bit 3: the sizes/crc32 are set to zero in the local header.
        // The correct values are put in the data descriptor immediately
        // following the compressed data.
        bitflag |= 0x0008;
    }
    if (!useCustomEncoding && (useUTF8ForFileName || useUTF8ForComment)) {
        // Bit 11: Language encoding flag (EFS).
        bitflag |= 0x0800;
    }


    var extFileAttr = 0;
    var versionMadeBy = 0;
    if (dir) {
        // dos or unix, we set the dos dir flag
        extFileAttr |= 0x00010;
    }
    if(platform === "UNIX") {
        versionMadeBy = 0x031E; // UNIX, version 3.0
        extFileAttr |= generateUnixExternalFileAttr(file.unixPermissions, dir);
    } else { // DOS or other, fallback to DOS
        versionMadeBy = 0x0014; // DOS, version 2.0
        extFileAttr |= generateDosExternalFileAttr(file.dosPermissions, dir);
    }

    // date
    // @see http://www.delorie.com/djgpp/doc/rbinter/it/52/13.html
    // @see http://www.delorie.com/djgpp/doc/rbinter/it/65/16.html
    // @see http://www.delorie.com/djgpp/doc/rbinter/it/66/16.html

    dosTime = date.getUTCHours();
    dosTime = dosTime << 6;
    dosTime = dosTime | date.getUTCMinutes();
    dosTime = dosTime << 5;
    dosTime = dosTime | date.getUTCSeconds() / 2;

    dosDate = date.getUTCFullYear() - 1980;
    dosDate = dosDate << 4;
    dosDate = dosDate | (date.getUTCMonth() + 1);
    dosDate = dosDate << 5;
    dosDate = dosDate | date.getUTCDate();

    if (useUTF8ForFileName) {
        // set the unicode path extra field. unzip needs at least one extra
        // field to correctly handle unicode path, so using the path is as good
        // as any other information. This could improve the situation with
        // other archive managers too.
        // This field is usually used without the utf8 flag, with a non
        // unicode path in the header (winrar, winzip). This helps (a bit)
        // with the messy Windows' default compressed folders feature but
        // breaks on p7zip which doesn't seek the unicode path extra field.
        // So for now, UTF-8 everywhere !
        unicodePathExtraField =
            // Version
            decToHex(1, 1) +
            // NameCRC32
            decToHex(crc32(encodedFileName), 4) +
            // UnicodeName
            utfEncodedFileName;

        extraFields +=
            // Info-ZIP Unicode Path Extra Field
            "\x75\x70" +
            // size
            decToHex(unicodePathExtraField.length, 2) +
            // content
            unicodePathExtraField;
    }

    if(useUTF8ForComment) {

        unicodeCommentExtraField =
            // Version
            decToHex(1, 1) +
            // CommentCRC32
            decToHex(crc32(encodedComment), 4) +
            // UnicodeName
            utfEncodedComment;

        extraFields +=
            // Info-ZIP Unicode Path Extra Field
            "\x75\x63" +
            // size
            decToHex(unicodeCommentExtraField.length, 2) +
            // content
            unicodeCommentExtraField;
    }

    var header = "";

    // version needed to extract
    header += "\x0A\x00";
    // general purpose bit flag
    header += decToHex(bitflag, 2);
    // compression method
    header += compression.magic;
    // last mod file time
    header += decToHex(dosTime, 2);
    // last mod file date
    header += decToHex(dosDate, 2);
    // crc-32
    header += decToHex(dataInfo.crc32, 4);
    // compressed size
    header += decToHex(dataInfo.compressedSize, 4);
    // uncompressed size
    header += decToHex(dataInfo.uncompressedSize, 4);
    // file name length
    header += decToHex(encodedFileName.length, 2);
    // extra field length
    header += decToHex(extraFields.length, 2);


    var fileRecord = signature.LOCAL_FILE_HEADER + header + encodedFileName + extraFields;

    var dirRecord = signature.CENTRAL_FILE_HEADER +
        // version made by (00: DOS)
        decToHex(versionMadeBy, 2) +
        // file header (common to file and central directory)
        header +
        // file comment length
        decToHex(encodedComment.length, 2) +
        // disk number start
        "\x00\x00" +
        // internal file attributes TODO
        "\x00\x00" +
        // external file attributes
        decToHex(extFileAttr, 4) +
        // relative offset of local header
        decToHex(offset, 4) +
        // file name
        encodedFileName +
        // extra field
        extraFields +
        // file comment
        encodedComment;

    return {
        fileRecord: fileRecord,
        dirRecord: dirRecord
    };
};

/**
 * Generate the EOCD record.
 * @param {Number} entriesCount the number of entries in the zip file.
 * @param {Number} centralDirLength the length (in bytes) of the central dir.
 * @param {Number} localDirLength the length (in bytes) of the local dir.
 * @param {String} comment the zip file comment as a binary string.
 * @param {Function} encodeFileName the function to encode the comment.
 * @return {String} the EOCD record.
 */
var generateCentralDirectoryEnd = function (entriesCount, centralDirLength, localDirLength, comment, encodeFileName) {
    var dirEnd = "";
    var encodedComment = utils.transformTo("string", encodeFileName(comment));

    // end of central dir signature
    dirEnd = signature.CENTRAL_DIRECTORY_END +
        // number of this disk
        "\x00\x00" +
        // number of the disk with the start of the central directory
        "\x00\x00" +
        // total number of entries in the central directory on this disk
        decToHex(entriesCount, 2) +
        // total number of entries in the central directory
        decToHex(entriesCount, 2) +
        // size of the central directory   4 bytes
        decToHex(centralDirLength, 4) +
        // offset of start of central directory with respect to the starting disk number
        decToHex(localDirLength, 4) +
        // .ZIP file comment length
        decToHex(encodedComment.length, 2) +
        // .ZIP file comment
        encodedComment;

    return dirEnd;
};

/**
 * Generate data descriptors for a file entry.
 * @param {Object} streamInfo the hash generated by a worker, containing informations
 * on the file entry.
 * @return {String} the data descriptors.
 */
var generateDataDescriptors = function (streamInfo) {
    var descriptor = "";
    descriptor = signature.DATA_DESCRIPTOR +
        // crc-32                          4 bytes
        decToHex(streamInfo['crc32'], 4) +
        // compressed size                 4 bytes
        decToHex(streamInfo['compressedSize'], 4) +
        // uncompressed size               4 bytes
        decToHex(streamInfo['uncompressedSize'], 4);

    return descriptor;
};


/**
 * A worker to concatenate other workers to create a zip file.
 * @param {Boolean} streamFiles `true` to stream the content of the files,
 * `false` to accumulate it.
 * @param {String} comment the comment to use.
 * @param {String} platform the platform to use, "UNIX" or "DOS".
 * @param {Function} encodeFileName the function to encode file names and comments.
 */
function ZipFileWorker(streamFiles, comment, platform, encodeFileName) {
    GenericWorker.call(this, "ZipFileWorker");
    // The number of bytes written so far. This doesn't count accumulated chunks.
    this.bytesWritten = 0;
    // The comment of the zip file
    this.zipComment = comment;
    // The platform "generating" the zip file.
    this.zipPlatform = platform;
    // the function to encode file names and comments.
    this.encodeFileName = encodeFileName;
    // Should we stream the content of the files ?
    this.streamFiles = streamFiles;
    // If `streamFiles` is false, we will need to accumulate the content of the
    // files to calculate sizes / crc32 (and write them *before* the content).
    // This boolean indicates if we are accumulating chunks (it will change a lot
    // during the lifetime of this worker).
    this.accumulate = false;
    // The buffer receiving chunks when accumulating content.
    this.contentBuffer = [];
    // The list of generated directory records.
    this.dirRecords = [];
    // The offset (in bytes) from the beginning of the zip file for the current source.
    this.currentSourceOffset = 0;
    // The total number of entries in this zip file.
    this.entriesCount = 0;
    // the name of the file currently being added, null when handling the end of the zip file.
    // Used for the emited metadata.
    this.currentFile = null;



    this._sources = [];
}
utils.inherits(ZipFileWorker, GenericWorker);

/**
 * @see GenericWorker.push
 */
ZipFileWorker.prototype.push = function (chunk) {

    var currentFilePercent = chunk.meta.percent || 0;
    var entriesCount = this.entriesCount;
    var remainingFiles = this._sources.length;

    if(this.accumulate) {
        this.contentBuffer.push(chunk);
    } else {
        this.bytesWritten += chunk.data.length;

        GenericWorker.prototype.push.call(this, {
            data : chunk.data,
            meta : {
                currentFile : this.currentFile,
                percent : entriesCount ? (currentFilePercent + 100 * (entriesCount - remainingFiles - 1)) / entriesCount : 100
            }
        });
    }
};

/**
 * The worker started a new source (an other worker).
 * @param {Object} streamInfo the streamInfo object from the new source.
 */
ZipFileWorker.prototype.openedSource = function (streamInfo) {
    this.currentSourceOffset = this.bytesWritten;
    this.currentFile = streamInfo['file'].name;

    var streamedContent = this.streamFiles && !streamInfo['file'].dir;

    // don't stream folders (because they don't have any content)
    if(streamedContent) {
        var record = generateZipParts(streamInfo, streamedContent, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
        this.push({
            data : record.fileRecord,
            meta : {percent:0}
        });
    } else {
        // we need to wait for the whole file before pushing anything
        this.accumulate = true;
    }
};

/**
 * The worker finished a source (an other worker).
 * @param {Object} streamInfo the streamInfo object from the finished source.
 */
ZipFileWorker.prototype.closedSource = function (streamInfo) {
    this.accumulate = false;
    var streamedContent = this.streamFiles && !streamInfo['file'].dir;
    var record = generateZipParts(streamInfo, streamedContent, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);

    this.dirRecords.push(record.dirRecord);
    if(streamedContent) {
        // after the streamed file, we put data descriptors
        this.push({
            data : generateDataDescriptors(streamInfo),
            meta : {percent:100}
        });
    } else {
        // the content wasn't streamed, we need to push everything now
        // first the file record, then the content
        this.push({
            data : record.fileRecord,
            meta : {percent:0}
        });
        while(this.contentBuffer.length) {
            this.push(this.contentBuffer.shift());
        }
    }
    this.currentFile = null;
};

/**
 * @see GenericWorker.flush
 */
ZipFileWorker.prototype.flush = function () {

    var localDirLength = this.bytesWritten;
    for(var i = 0; i < this.dirRecords.length; i++) {
        this.push({
            data : this.dirRecords[i],
            meta : {percent:100}
        });
    }
    var centralDirLength = this.bytesWritten - localDirLength;

    var dirEnd = generateCentralDirectoryEnd(this.dirRecords.length, centralDirLength, localDirLength, this.zipComment, this.encodeFileName);

    this.push({
        data : dirEnd,
        meta : {percent:100}
    });
};

/**
 * Prepare the next source to be read.
 */
ZipFileWorker.prototype.prepareNextSource = function () {
    this.previous = this._sources.shift();
    this.openedSource(this.previous.streamInfo);
    if (this.isPaused) {
        this.previous.pause();
    } else {
        this.previous.resume();
    }
};

/**
 * @see GenericWorker.registerPrevious
 */
ZipFileWorker.prototype.registerPrevious = function (previous) {
    this._sources.push(previous);
    var self = this;

    previous.on('data', function (chunk) {
        self.processChunk(chunk);
    });
    previous.on('end', function () {
        self.closedSource(self.previous.streamInfo);
        if(self._sources.length) {
            self.prepareNextSource();
        } else {
            self.end();
        }
    });
    previous.on('error', function (e) {
        self.error(e);
    });
    return this;
};

/**
 * @see GenericWorker.resume
 */
ZipFileWorker.prototype.resume = function () {
    if(!GenericWorker.prototype.resume.call(this)) {
        return false;
    }

    if (!this.previous && this._sources.length) {
        this.prepareNextSource();
        return true;
    }
    if (!this.previous && !this._sources.length && !this.generatedError) {
        this.end();
        return true;
    }
};

/**
 * @see GenericWorker.error
 */
ZipFileWorker.prototype.error = function (e) {
    var sources = this._sources;
    if(!GenericWorker.prototype.error.call(this, e)) {
        return false;
    }
    for(var i = 0; i < sources.length; i++) {
        try {
            sources[i].error(e);
        } catch(e) {
            // the `error` exploded, nothing to do
        }
    }
    return true;
};

/**
 * @see GenericWorker.lock
 */
ZipFileWorker.prototype.lock = function () {
    GenericWorker.prototype.lock.call(this);
    var sources = this._sources;
    for(var i = 0; i < sources.length; i++) {
        sources[i].lock();
    }
};

module.exports = ZipFileWorker;

},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(require,module,exports){
'use strict';

var compressions = require('../compressions');
var ZipFileWorker = require('./ZipFileWorker');

/**
 * Find the compression to use.
 * @param {String} fileCompression the compression defined at the file level, if any.
 * @param {String} zipCompression the compression defined at the load() level.
 * @return {Object} the compression object to use.
 */
var getCompression = function (fileCompression, zipCompression) {

    var compressionName = fileCompression || zipCompression;
    var compression = compressions[compressionName];
    if (!compression) {
        throw new Error(compressionName + " is not a valid compression method !");
    }
    return compression;
};

/**
 * Create a worker to generate a zip file.
 * @param {JSZip} zip the JSZip instance at the right root level.
 * @param {Object} options to generate the zip file.
 * @param {String} comment the comment to use.
 */
exports.generateWorker = function (zip, options, comment) {

    var zipFileWorker = new ZipFileWorker(options.streamFiles, comment, options.platform, options.encodeFileName);
    var entriesCount = 0;
    try {

        zip.forEach(function (relativePath, file) {
            entriesCount++;
            var compression = getCompression(file.options.compression, options.compression);
            var compressionOptions = file.options.compressionOptions || options.compressionOptions || {};
            var dir = file.dir, date = file.date;

            file._compressWorker(compression, compressionOptions)
            .withStreamInfo("file", {
                name : relativePath,
                dir : dir,
                date : date,
                comment : file.comment || "",
                unixPermissions : file.unixPermissions,
                dosPermissions : file.dosPermissions
            })
            .pipe(zipFileWorker);
        });
        zipFileWorker.entriesCount = entriesCount;
    } catch (e) {
        zipFileWorker.error(e);
    }

    return zipFileWorker;
};

},{"../compressions":3,"./ZipFileWorker":8}],10:[function(require,module,exports){
'use strict';

/**
 * Representation a of zip file in js
 * @constructor
 */
function JSZip() {
    // if this constructor is used without `new`, it adds `new` before itself:
    if(!(this instanceof JSZip)) {
        return new JSZip();
    }

    if(arguments.length) {
        throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
    }

    // object containing the files :
    // {
    //   "folder/" : {...},
    //   "folder/data.txt" : {...}
    // }
    this.files = {};

    this.comment = null;

    // Where we are in the hierarchy
    this.root = "";
    this.clone = function() {
        var newObj = new JSZip();
        for (var i in this) {
            if (typeof this[i] !== "function") {
                newObj[i] = this[i];
            }
        }
        return newObj;
    };
}
JSZip.prototype = require('./object');
JSZip.prototype.loadAsync = require('./load');
JSZip.support = require('./support');
JSZip.defaults = require('./defaults');

// TODO find a better way to handle this version,
// a require('package.json').version doesn't work with webpack, see #327
JSZip.version = "3.2.0";

JSZip.loadAsync = function (content, options) {
    return new JSZip().loadAsync(content, options);
};

JSZip.external = require("./external");
module.exports = JSZip;

},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(require,module,exports){
'use strict';
var utils = require('./utils');
var external = require("./external");
var utf8 = require('./utf8');
var utils = require('./utils');
var ZipEntries = require('./zipEntries');
var Crc32Probe = require('./stream/Crc32Probe');
var nodejsUtils = require("./nodejsUtils");

/**
 * Check the CRC32 of an entry.
 * @param {ZipEntry} zipEntry the zip entry to check.
 * @return {Promise} the result.
 */
function checkEntryCRC32(zipEntry) {
    return new external.Promise(function (resolve, reject) {
        var worker = zipEntry.decompressed.getContentWorker().pipe(new Crc32Probe());
        worker.on("error", function (e) {
            reject(e);
        })
        .on("end", function () {
            if (worker.streamInfo.crc32 !== zipEntry.decompressed.crc32) {
                reject(new Error("Corrupted zip : CRC32 mismatch"));
            } else {
                resolve();
            }
        })
        .resume();
    });
}

module.exports = function(data, options) {
    var zip = this;
    options = utils.extend(options || {}, {
        base64: false,
        checkCRC32: false,
        optimizedBinaryString: false,
        createFolders: false,
        decodeFileName: utf8.utf8decode
    });

    if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
        return external.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file."));
    }

    return utils.prepareContent("the loaded zip file", data, true, options.optimizedBinaryString, options.base64)
    .then(function(data) {
        var zipEntries = new ZipEntries(options);
        zipEntries.load(data);
        return zipEntries;
    }).then(function checkCRC32(zipEntries) {
        var promises = [external.Promise.resolve(zipEntries)];
        var files = zipEntries.files;
        if (options.checkCRC32) {
            for (var i = 0; i < files.length; i++) {
                promises.push(checkEntryCRC32(files[i]));
            }
        }
        return external.Promise.all(promises);
    }).then(function addFiles(results) {
        var zipEntries = results.shift();
        var files = zipEntries.files;
        for (var i = 0; i < files.length; i++) {
            var input = files[i];
            zip.file(input.fileNameStr, input.decompressed, {
                binary: true,
                optimizedBinaryString: true,
                date: input.date,
                dir: input.dir,
                comment : input.fileCommentStr.length ? input.fileCommentStr : null,
                unixPermissions : input.unixPermissions,
                dosPermissions : input.dosPermissions,
                createFolders: options.createFolders
            });
        }
        if (zipEntries.zipComment.length) {
            zip.comment = zipEntries.zipComment;
        }

        return zip;
    });
};

},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(require,module,exports){
"use strict";

var utils = require('../utils');
var GenericWorker = require('../stream/GenericWorker');

/**
 * A worker that use a nodejs stream as source.
 * @constructor
 * @param {String} filename the name of the file entry for this stream.
 * @param {Readable} stream the nodejs stream.
 */
function NodejsStreamInputAdapter(filename, stream) {
    GenericWorker.call(this, "Nodejs stream input adapter for " + filename);
    this._upstreamEnded = false;
    this._bindStream(stream);
}

utils.inherits(NodejsStreamInputAdapter, GenericWorker);

/**
 * Prepare the stream and bind the callbacks on it.
 * Do this ASAP on node 0.10 ! A lazy binding doesn't always work.
 * @param {Stream} stream the nodejs stream to use.
 */
NodejsStreamInputAdapter.prototype._bindStream = function (stream) {
    var self = this;
    this._stream = stream;
    stream.pause();
    stream
    .on("data", function (chunk) {
        self.push({
            data: chunk,
            meta : {
                percent : 0
            }
        });
    })
    .on("error", function (e) {
        if(self.isPaused) {
            this.generatedError = e;
        } else {
            self.error(e);
        }
    })
    .on("end", function () {
        if(self.isPaused) {
            self._upstreamEnded = true;
        } else {
            self.end();
        }
    });
};
NodejsStreamInputAdapter.prototype.pause = function () {
    if(!GenericWorker.prototype.pause.call(this)) {
        return false;
    }
    this._stream.pause();
    return true;
};
NodejsStreamInputAdapter.prototype.resume = function () {
    if(!GenericWorker.prototype.resume.call(this)) {
        return false;
    }

    if(this._upstreamEnded) {
        this.end();
    } else {
        this._stream.resume();
    }

    return true;
};

module.exports = NodejsStreamInputAdapter;

},{"../stream/GenericWorker":28,"../utils":32}],13:[function(require,module,exports){
'use strict';

var Readable = require('readable-stream').Readable;

var utils = require('../utils');
utils.inherits(NodejsStreamOutputAdapter, Readable);

/**
* A nodejs stream using a worker as source.
* @see the SourceWrapper in http://nodejs.org/api/stream.html
* @constructor
* @param {StreamHelper} helper the helper wrapping the worker
* @param {Object} options the nodejs stream options
* @param {Function} updateCb the update callback.
*/
function NodejsStreamOutputAdapter(helper, options, updateCb) {
    Readable.call(this, options);
    this._helper = helper;

    var self = this;
    helper.on("data", function (data, meta) {
        if (!self.push(data)) {
            self._helper.pause();
        }
        if(updateCb) {
            updateCb(meta);
        }
    })
    .on("error", function(e) {
        self.emit('error', e);
    })
    .on("end", function () {
        self.push(null);
    });
}


NodejsStreamOutputAdapter.prototype._read = function() {
    this._helper.resume();
};

module.exports = NodejsStreamOutputAdapter;

},{"../utils":32,"readable-stream":16}],14:[function(require,module,exports){
'use strict';

module.exports = {
    /**
     * True if this is running in Nodejs, will be undefined in a browser.
     * In a browser, browserify won't include this file and the whole module
     * will be resolved an empty object.
     */
    isNode : typeof Buffer !== "undefined",
    /**
     * Create a new nodejs Buffer from an existing content.
     * @param {Object} data the data to pass to the constructor.
     * @param {String} encoding the encoding to use.
     * @return {Buffer} a new Buffer.
     */
    newBufferFrom: function(data, encoding) {
        if (Buffer.from && Buffer.from !== Uint8Array.from) {
            return Buffer.from(data, encoding);
        } else {
            if (typeof data === "number") {
                // Safeguard for old Node.js versions. On newer versions,
                // Buffer.from(number) / Buffer(number, encoding) already throw.
                throw new Error("The \"data\" argument must not be a number");
            }
            return new Buffer(data, encoding);
        }
    },
    /**
     * Create a new nodejs Buffer with the specified size.
     * @param {Integer} size the size of the buffer.
     * @return {Buffer} a new Buffer.
     */
    allocBuffer: function (size) {
        if (Buffer.alloc) {
            return Buffer.alloc(size);
        } else {
            var buf = new Buffer(size);
            buf.fill(0);
            return buf;
        }
    },
    /**
     * Find out if an object is a Buffer.
     * @param {Object} b the object to test.
     * @return {Boolean} true if the object is a Buffer, false otherwise.
     */
    isBuffer : function(b){
        return Buffer.isBuffer(b);
    },

    isStream : function (obj) {
        return obj &&
            typeof obj.on === "function" &&
            typeof obj.pause === "function" &&
            typeof obj.resume === "function";
    }
};

},{}],15:[function(require,module,exports){
'use strict';
var utf8 = require('./utf8');
var utils = require('./utils');
var GenericWorker = require('./stream/GenericWorker');
var StreamHelper = require('./stream/StreamHelper');
var defaults = require('./defaults');
var CompressedObject = require('./compressedObject');
var ZipObject = require('./zipObject');
var generate = require("./generate");
var nodejsUtils = require("./nodejsUtils");
var NodejsStreamInputAdapter = require("./nodejs/NodejsStreamInputAdapter");


/**
 * Add a file in the current folder.
 * @private
 * @param {string} name the name of the file
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data of the file
 * @param {Object} originalOptions the options of the file
 * @return {Object} the new file.
 */
var fileAdd = function(name, data, originalOptions) {
    // be sure sub folders exist
    var dataType = utils.getTypeOf(data),
        parent;


    /*
     * Correct options.
     */

    var o = utils.extend(originalOptions || {}, defaults);
    o.date = o.date || new Date();
    if (o.compression !== null) {
        o.compression = o.compression.toUpperCase();
    }

    if (typeof o.unixPermissions === "string") {
        o.unixPermissions = parseInt(o.unixPermissions, 8);
    }

    // UNX_IFDIR  0040000 see zipinfo.c
    if (o.unixPermissions && (o.unixPermissions & 0x4000)) {
        o.dir = true;
    }
    // Bit 4    Directory
    if (o.dosPermissions && (o.dosPermissions & 0x0010)) {
        o.dir = true;
    }

    if (o.dir) {
        name = forceTrailingSlash(name);
    }
    if (o.createFolders && (parent = parentFolder(name))) {
        folderAdd.call(this, parent, true);
    }

    var isUnicodeString = dataType === "string" && o.binary === false && o.base64 === false;
    if (!originalOptions || typeof originalOptions.binary === "undefined") {
        o.binary = !isUnicodeString;
    }


    var isCompressedEmpty = (data instanceof CompressedObject) && data.uncompressedSize === 0;

    if (isCompressedEmpty || o.dir || !data || data.length === 0) {
        o.base64 = false;
        o.binary = true;
        data = "";
        o.compression = "STORE";
        dataType = "string";
    }

    /*
     * Convert content to fit.
     */

    var zipObjectContent = null;
    if (data instanceof CompressedObject || data instanceof GenericWorker) {
        zipObjectContent = data;
    } else if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
        zipObjectContent = new NodejsStreamInputAdapter(name, data);
    } else {
        zipObjectContent = utils.prepareContent(name, data, o.binary, o.optimizedBinaryString, o.base64);
    }

    var object = new ZipObject(name, zipObjectContent, o);
    this.files[name] = object;
    /*
    TODO: we can't throw an exception because we have async promises
    (we can have a promise of a Date() for example) but returning a
    promise is useless because file(name, data) returns the JSZip
    object for chaining. Should we break that to allow the user
    to catch the error ?

    return external.Promise.resolve(zipObjectContent)
    .then(function () {
        return object;
    });
    */
};

/**
 * Find the parent folder of the path.
 * @private
 * @param {string} path the path to use
 * @return {string} the parent folder, or ""
 */
var parentFolder = function (path) {
    if (path.slice(-1) === '/') {
        path = path.substring(0, path.length - 1);
    }
    var lastSlash = path.lastIndexOf('/');
    return (lastSlash > 0) ? path.substring(0, lastSlash) : "";
};

/**
 * Returns the path with a slash at the end.
 * @private
 * @param {String} path the path to check.
 * @return {String} the path with a trailing slash.
 */
var forceTrailingSlash = function(path) {
    // Check the name ends with a /
    if (path.slice(-1) !== "/") {
        path += "/"; // IE doesn't like substr(-1)
    }
    return path;
};

/**
 * Add a (sub) folder in the current folder.
 * @private
 * @param {string} name the folder's name
 * @param {boolean=} [createFolders] If true, automatically create sub
 *  folders. Defaults to false.
 * @return {Object} the new folder.
 */
var folderAdd = function(name, createFolders) {
    createFolders = (typeof createFolders !== 'undefined') ? createFolders : defaults.createFolders;

    name = forceTrailingSlash(name);

    // Does this folder already exist?
    if (!this.files[name]) {
        fileAdd.call(this, name, null, {
            dir: true,
            createFolders: createFolders
        });
    }
    return this.files[name];
};

/**
* Cross-window, cross-Node-context regular expression detection
* @param  {Object}  object Anything
* @return {Boolean}        true if the object is a regular expression,
* false otherwise
*/
function isRegExp(object) {
    return Object.prototype.toString.call(object) === "[object RegExp]";
}

// return the actual prototype of JSZip
var out = {
    /**
     * @see loadAsync
     */
    load: function() {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    },


    /**
     * Call a callback function for each entry at this folder level.
     * @param {Function} cb the callback function:
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     */
    forEach: function(cb) {
        var filename, relativePath, file;
        for (filename in this.files) {
            if (!this.files.hasOwnProperty(filename)) {
                continue;
            }
            file = this.files[filename];
            relativePath = filename.slice(this.root.length, filename.length);
            if (relativePath && filename.slice(0, this.root.length) === this.root) { // the file is in the current root
                cb(relativePath, file); // TODO reverse the parameters ? need to be clean AND consistent with the filter search fn...
            }
        }
    },

    /**
     * Filter nested files/folders with the specified function.
     * @param {Function} search the predicate to use :
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     * @return {Array} An array of matching elements.
     */
    filter: function(search) {
        var result = [];
        this.forEach(function (relativePath, entry) {
            if (search(relativePath, entry)) { // the file matches the function
                result.push(entry);
            }

        });
        return result;
    },

    /**
     * Add a file to the zip file, or search a file.
     * @param   {string|RegExp} name The name of the file to add (if data is defined),
     * the name of the file to find (if no data) or a regex to match files.
     * @param   {String|ArrayBuffer|Uint8Array|Buffer} data  The file data, either raw or base64 encoded
     * @param   {Object} o     File options
     * @return  {JSZip|Object|Array} this JSZip object (when adding a file),
     * a file (when searching by string) or an array of files (when searching by regex).
     */
    file: function(name, data, o) {
        if (arguments.length === 1) {
            if (isRegExp(name)) {
                var regexp = name;
                return this.filter(function(relativePath, file) {
                    return !file.dir && regexp.test(relativePath);
                });
            }
            else { // text
                var obj = this.files[this.root + name];
                if (obj && !obj.dir) {
                    return obj;
                } else {
                    return null;
                }
            }
        }
        else { // more than one argument : we have data !
            name = this.root + name;
            fileAdd.call(this, name, data, o);
        }
        return this;
    },

    /**
     * Add a directory to the zip file, or search.
     * @param   {String|RegExp} arg The name of the directory to add, or a regex to search folders.
     * @return  {JSZip} an object with the new directory as the root, or an array containing matching folders.
     */
    folder: function(arg) {
        if (!arg) {
            return this;
        }

        if (isRegExp(arg)) {
            return this.filter(function(relativePath, file) {
                return file.dir && arg.test(relativePath);
            });
        }

        // else, name is a new folder
        var name = this.root + arg;
        var newFolder = folderAdd.call(this, name);

        // Allow chaining by returning a new object with this folder as the root
        var ret = this.clone();
        ret.root = newFolder.name;
        return ret;
    },

    /**
     * Delete a file, or a directory and all sub-files, from the zip
     * @param {string} name the name of the file to delete
     * @return {JSZip} this JSZip object
     */
    remove: function(name) {
        name = this.root + name;
        var file = this.files[name];
        if (!file) {
            // Look for any folders
            if (name.slice(-1) !== "/") {
                name += "/";
            }
            file = this.files[name];
        }

        if (file && !file.dir) {
            // file
            delete this.files[name];
        } else {
            // maybe a folder, delete recursively
            var kids = this.filter(function(relativePath, file) {
                return file.name.slice(0, name.length) === name;
            });
            for (var i = 0; i < kids.length; i++) {
                delete this.files[kids[i].name];
            }
        }

        return this;
    },

    /**
     * Generate the complete zip file
     * @param {Object} options the options to generate the zip file :
     * - compression, "STORE" by default.
     * - type, "base64" by default. Values are : string, base64, uint8array, arraybuffer, blob.
     * @return {String|Uint8Array|ArrayBuffer|Buffer|Blob} the zip file
     */
    generate: function(options) {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    },

    /**
     * Generate the complete zip file as an internal stream.
     * @param {Object} options the options to generate the zip file :
     * - compression, "STORE" by default.
     * - type, "base64" by default. Values are : string, base64, uint8array, arraybuffer, blob.
     * @return {StreamHelper} the streamed zip file.
     */
    generateInternalStream: function(options) {
      var worker, opts = {};
      try {
          opts = utils.extend(options || {}, {
              streamFiles: false,
              compression: "STORE",
              compressionOptions : null,
              type: "",
              platform: "DOS",
              comment: null,
              mimeType: 'application/zip',
              encodeFileName: utf8.utf8encode
          });

          opts.type = opts.type.toLowerCase();
          opts.compression = opts.compression.toUpperCase();

          // "binarystring" is prefered but the internals use "string".
          if(opts.type === "binarystring") {
            opts.type = "string";
          }

          if (!opts.type) {
            throw new Error("No output type specified.");
          }

          utils.checkSupport(opts.type);

          // accept nodejs `process.platform`
          if(
              opts.platform === 'darwin' ||
              opts.platform === 'freebsd' ||
              opts.platform === 'linux' ||
              opts.platform === 'sunos'
          ) {
              opts.platform = "UNIX";
          }
          if (opts.platform === 'win32') {
              opts.platform = "DOS";
          }

          var comment = opts.comment || this.comment || "";
          worker = generate.generateWorker(this, opts, comment);
      } catch (e) {
        worker = new GenericWorker("error");
        worker.error(e);
      }
      return new StreamHelper(worker, opts.type || "string", opts.mimeType);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateAsync: function(options, onUpdate) {
        return this.generateInternalStream(options).accumulate(onUpdate);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateNodeStream: function(options, onUpdate) {
        options = options || {};
        if (!options.type) {
            options.type = "nodebuffer";
        }
        return this.generateInternalStream(options).toNodejsStream(onUpdate);
    }
};
module.exports = out;

},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(require,module,exports){
/*
 * This file is used by module bundlers (browserify/webpack/etc) when
 * including a stream implementation. We use "readable-stream" to get a
 * consistent behavior between nodejs versions but bundlers often have a shim
 * for "stream". Using this shim greatly improve the compatibility and greatly
 * reduce the final size of the bundle (only one stream implementation, not
 * two).
 */
module.exports = require("stream");

},{"stream":undefined}],17:[function(require,module,exports){
'use strict';
var DataReader = require('./DataReader');
var utils = require('../utils');

function ArrayReader(data) {
    DataReader.call(this, data);
	for(var i = 0; i < this.data.length; i++) {
		data[i] = data[i] & 0xFF;
	}
}
utils.inherits(ArrayReader, DataReader);
/**
 * @see DataReader.byteAt
 */
ArrayReader.prototype.byteAt = function(i) {
    return this.data[this.zero + i];
};
/**
 * @see DataReader.lastIndexOfSignature
 */
ArrayReader.prototype.lastIndexOfSignature = function(sig) {
    var sig0 = sig.charCodeAt(0),
        sig1 = sig.charCodeAt(1),
        sig2 = sig.charCodeAt(2),
        sig3 = sig.charCodeAt(3);
    for (var i = this.length - 4; i >= 0; --i) {
        if (this.data[i] === sig0 && this.data[i + 1] === sig1 && this.data[i + 2] === sig2 && this.data[i + 3] === sig3) {
            return i - this.zero;
        }
    }

    return -1;
};
/**
 * @see DataReader.readAndCheckSignature
 */
ArrayReader.prototype.readAndCheckSignature = function (sig) {
    var sig0 = sig.charCodeAt(0),
        sig1 = sig.charCodeAt(1),
        sig2 = sig.charCodeAt(2),
        sig3 = sig.charCodeAt(3),
        data = this.readData(4);
    return sig0 === data[0] && sig1 === data[1] && sig2 === data[2] && sig3 === data[3];
};
/**
 * @see DataReader.readData
 */
ArrayReader.prototype.readData = function(size) {
    this.checkOffset(size);
    if(size === 0) {
        return [];
    }
    var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
    this.index += size;
    return result;
};
module.exports = ArrayReader;

},{"../utils":32,"./DataReader":18}],18:[function(require,module,exports){
'use strict';
var utils = require('../utils');

function DataReader(data) {
    this.data = data; // type : see implementation
    this.length = data.length;
    this.index = 0;
    this.zero = 0;
}
DataReader.prototype = {
    /**
     * Check that the offset will not go too far.
     * @param {string} offset the additional offset to check.
     * @throws {Error} an Error if the offset is out of bounds.
     */
    checkOffset: function(offset) {
        this.checkIndex(this.index + offset);
    },
    /**
     * Check that the specified index will not be too far.
     * @param {string} newIndex the index to check.
     * @throws {Error} an Error if the index is out of bounds.
     */
    checkIndex: function(newIndex) {
        if (this.length < this.zero + newIndex || newIndex < 0) {
            throw new Error("End of data reached (data length = " + this.length + ", asked index = " + (newIndex) + "). Corrupted zip ?");
        }
    },
    /**
     * Change the index.
     * @param {number} newIndex The new index.
     * @throws {Error} if the new index is out of the data.
     */
    setIndex: function(newIndex) {
        this.checkIndex(newIndex);
        this.index = newIndex;
    },
    /**
     * Skip the next n bytes.
     * @param {number} n the number of bytes to skip.
     * @throws {Error} if the new index is out of the data.
     */
    skip: function(n) {
        this.setIndex(this.index + n);
    },
    /**
     * Get the byte at the specified index.
     * @param {number} i the index to use.
     * @return {number} a byte.
     */
    byteAt: function(i) {
        // see implementations
    },
    /**
     * Get the next number with a given byte size.
     * @param {number} size the number of bytes to read.
     * @return {number} the corresponding number.
     */
    readInt: function(size) {
        var result = 0,
            i;
        this.checkOffset(size);
        for (i = this.index + size - 1; i >= this.index; i--) {
            result = (result << 8) + this.byteAt(i);
        }
        this.index += size;
        return result;
    },
    /**
     * Get the next string with a given byte size.
     * @param {number} size the number of bytes to read.
     * @return {string} the corresponding string.
     */
    readString: function(size) {
        return utils.transformTo("string", this.readData(size));
    },
    /**
     * Get raw data without conversion, <size> bytes.
     * @param {number} size the number of bytes to read.
     * @return {Object} the raw data, implementation specific.
     */
    readData: function(size) {
        // see implementations
    },
    /**
     * Find the last occurence of a zip signature (4 bytes).
     * @param {string} sig the signature to find.
     * @return {number} the index of the last occurence, -1 if not found.
     */
    lastIndexOfSignature: function(sig) {
        // see implementations
    },
    /**
     * Read the signature (4 bytes) at the current position and compare it with sig.
     * @param {string} sig the expected signature
     * @return {boolean} true if the signature matches, false otherwise.
     */
    readAndCheckSignature: function(sig) {
        // see implementations
    },
    /**
     * Get the next date.
     * @return {Date} the date.
     */
    readDate: function() {
        var dostime = this.readInt(4);
        return new Date(Date.UTC(
        ((dostime >> 25) & 0x7f) + 1980, // year
        ((dostime >> 21) & 0x0f) - 1, // month
        (dostime >> 16) & 0x1f, // day
        (dostime >> 11) & 0x1f, // hour
        (dostime >> 5) & 0x3f, // minute
        (dostime & 0x1f) << 1)); // second
    }
};
module.exports = DataReader;

},{"../utils":32}],19:[function(require,module,exports){
'use strict';
var Uint8ArrayReader = require('./Uint8ArrayReader');
var utils = require('../utils');

function NodeBufferReader(data) {
    Uint8ArrayReader.call(this, data);
}
utils.inherits(NodeBufferReader, Uint8ArrayReader);

/**
 * @see DataReader.readData
 */
NodeBufferReader.prototype.readData = function(size) {
    this.checkOffset(size);
    var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
    this.index += size;
    return result;
};
module.exports = NodeBufferReader;

},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(require,module,exports){
'use strict';
var DataReader = require('./DataReader');
var utils = require('../utils');

function StringReader(data) {
    DataReader.call(this, data);
}
utils.inherits(StringReader, DataReader);
/**
 * @see DataReader.byteAt
 */
StringReader.prototype.byteAt = function(i) {
    return this.data.charCodeAt(this.zero + i);
};
/**
 * @see DataReader.lastIndexOfSignature
 */
StringReader.prototype.lastIndexOfSignature = function(sig) {
    return this.data.lastIndexOf(sig) - this.zero;
};
/**
 * @see DataReader.readAndCheckSignature
 */
StringReader.prototype.readAndCheckSignature = function (sig) {
    var data = this.readData(4);
    return sig === data;
};
/**
 * @see DataReader.readData
 */
StringReader.prototype.readData = function(size) {
    this.checkOffset(size);
    // this will work because the constructor applied the "& 0xff" mask.
    var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
    this.index += size;
    return result;
};
module.exports = StringReader;

},{"../utils":32,"./DataReader":18}],21:[function(require,module,exports){
'use strict';
var ArrayReader = require('./ArrayReader');
var utils = require('../utils');

function Uint8ArrayReader(data) {
    ArrayReader.call(this, data);
}
utils.inherits(Uint8ArrayReader, ArrayReader);
/**
 * @see DataReader.readData
 */
Uint8ArrayReader.prototype.readData = function(size) {
    this.checkOffset(size);
    if(size === 0) {
        // in IE10, when using subarray(idx, idx), we get the array [0x00] instead of [].
        return new Uint8Array(0);
    }
    var result = this.data.subarray(this.zero + this.index, this.zero + this.index + size);
    this.index += size;
    return result;
};
module.exports = Uint8ArrayReader;

},{"../utils":32,"./ArrayReader":17}],22:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var support = require('../support');
var ArrayReader = require('./ArrayReader');
var StringReader = require('./StringReader');
var NodeBufferReader = require('./NodeBufferReader');
var Uint8ArrayReader = require('./Uint8ArrayReader');

/**
 * Create a reader adapted to the data.
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data to read.
 * @return {DataReader} the data reader.
 */
module.exports = function (data) {
    var type = utils.getTypeOf(data);
    utils.checkSupport(type);
    if (type === "string" && !support.uint8array) {
        return new StringReader(data);
    }
    if (type === "nodebuffer") {
        return new NodeBufferReader(data);
    }
    if (support.uint8array) {
        return new Uint8ArrayReader(utils.transformTo("uint8array", data));
    }
    return new ArrayReader(utils.transformTo("array", data));
};

},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(require,module,exports){
'use strict';
exports.LOCAL_FILE_HEADER = "PK\x03\x04";
exports.CENTRAL_FILE_HEADER = "PK\x01\x02";
exports.CENTRAL_DIRECTORY_END = "PK\x05\x06";
exports.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x06\x07";
exports.ZIP64_CENTRAL_DIRECTORY_END = "PK\x06\x06";
exports.DATA_DESCRIPTOR = "PK\x07\x08";

},{}],24:[function(require,module,exports){
'use strict';

var GenericWorker = require('./GenericWorker');
var utils = require('../utils');

/**
 * A worker which convert chunks to a specified type.
 * @constructor
 * @param {String} destType the destination type.
 */
function ConvertWorker(destType) {
    GenericWorker.call(this, "ConvertWorker to " + destType);
    this.destType = destType;
}
utils.inherits(ConvertWorker, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
ConvertWorker.prototype.processChunk = function (chunk) {
    this.push({
        data : utils.transformTo(this.destType, chunk.data),
        meta : chunk.meta
    });
};
module.exports = ConvertWorker;

},{"../utils":32,"./GenericWorker":28}],25:[function(require,module,exports){
'use strict';

var GenericWorker = require('./GenericWorker');
var crc32 = require('../crc32');
var utils = require('../utils');

/**
 * A worker which calculate the crc32 of the data flowing through.
 * @constructor
 */
function Crc32Probe() {
    GenericWorker.call(this, "Crc32Probe");
    this.withStreamInfo("crc32", 0);
}
utils.inherits(Crc32Probe, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
Crc32Probe.prototype.processChunk = function (chunk) {
    this.streamInfo.crc32 = crc32(chunk.data, this.streamInfo.crc32 || 0);
    this.push(chunk);
};
module.exports = Crc32Probe;

},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var GenericWorker = require('./GenericWorker');

/**
 * A worker which calculate the total length of the data flowing through.
 * @constructor
 * @param {String} propName the name used to expose the length
 */
function DataLengthProbe(propName) {
    GenericWorker.call(this, "DataLengthProbe for " + propName);
    this.propName = propName;
    this.withStreamInfo(propName, 0);
}
utils.inherits(DataLengthProbe, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
DataLengthProbe.prototype.processChunk = function (chunk) {
    if(chunk) {
        var length = this.streamInfo[this.propName] || 0;
        this.streamInfo[this.propName] = length + chunk.data.length;
    }
    GenericWorker.prototype.processChunk.call(this, chunk);
};
module.exports = DataLengthProbe;


},{"../utils":32,"./GenericWorker":28}],27:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var GenericWorker = require('./GenericWorker');

// the size of the generated chunks
// TODO expose this as a public variable
var DEFAULT_BLOCK_SIZE = 16 * 1024;

/**
 * A worker that reads a content and emits chunks.
 * @constructor
 * @param {Promise} dataP the promise of the data to split
 */
function DataWorker(dataP) {
    GenericWorker.call(this, "DataWorker");
    var self = this;
    this.dataIsReady = false;
    this.index = 0;
    this.max = 0;
    this.data = null;
    this.type = "";

    this._tickScheduled = false;

    dataP.then(function (data) {
        self.dataIsReady = true;
        self.data = data;
        self.max = data && data.length || 0;
        self.type = utils.getTypeOf(data);
        if(!self.isPaused) {
            self._tickAndRepeat();
        }
    }, function (e) {
        self.error(e);
    });
}

utils.inherits(DataWorker, GenericWorker);

/**
 * @see GenericWorker.cleanUp
 */
DataWorker.prototype.cleanUp = function () {
    GenericWorker.prototype.cleanUp.call(this);
    this.data = null;
};

/**
 * @see GenericWorker.resume
 */
DataWorker.prototype.resume = function () {
    if(!GenericWorker.prototype.resume.call(this)) {
        return false;
    }

    if (!this._tickScheduled && this.dataIsReady) {
        this._tickScheduled = true;
        utils.delay(this._tickAndRepeat, [], this);
    }
    return true;
};

/**
 * Trigger a tick a schedule an other call to this function.
 */
DataWorker.prototype._tickAndRepeat = function() {
    this._tickScheduled = false;
    if(this.isPaused || this.isFinished) {
        return;
    }
    this._tick();
    if(!this.isFinished) {
        utils.delay(this._tickAndRepeat, [], this);
        this._tickScheduled = true;
    }
};

/**
 * Read and push a chunk.
 */
DataWorker.prototype._tick = function() {

    if(this.isPaused || this.isFinished) {
        return false;
    }

    var size = DEFAULT_BLOCK_SIZE;
    var data = null, nextIndex = Math.min(this.max, this.index + size);
    if (this.index >= this.max) {
        // EOF
        return this.end();
    } else {
        switch(this.type) {
            case "string":
                data = this.data.substring(this.index, nextIndex);
            break;
            case "uint8array":
                data = this.data.subarray(this.index, nextIndex);
            break;
            case "array":
            case "nodebuffer":
                data = this.data.slice(this.index, nextIndex);
            break;
        }
        this.index = nextIndex;
        return this.push({
            data : data,
            meta : {
                percent : this.max ? this.index / this.max * 100 : 0
            }
        });
    }
};

module.exports = DataWorker;

},{"../utils":32,"./GenericWorker":28}],28:[function(require,module,exports){
'use strict';

/**
 * A worker that does nothing but passing chunks to the next one. This is like
 * a nodejs stream but with some differences. On the good side :
 * - it works on IE 6-9 without any issue / polyfill
 * - it weights less than the full dependencies bundled with browserify
 * - it forwards errors (no need to declare an error handler EVERYWHERE)
 *
 * A chunk is an object with 2 attributes : `meta` and `data`. The former is an
 * object containing anything (`percent` for example), see each worker for more
 * details. The latter is the real data (String, Uint8Array, etc).
 *
 * @constructor
 * @param {String} name the name of the stream (mainly used for debugging purposes)
 */
function GenericWorker(name) {
    // the name of the worker
    this.name = name || "default";
    // an object containing metadata about the workers chain
    this.streamInfo = {};
    // an error which happened when the worker was paused
    this.generatedError = null;
    // an object containing metadata to be merged by this worker into the general metadata
    this.extraStreamInfo = {};
    // true if the stream is paused (and should not do anything), false otherwise
    this.isPaused = true;
    // true if the stream is finished (and should not do anything), false otherwise
    this.isFinished = false;
    // true if the stream is locked to prevent further structure updates (pipe), false otherwise
    this.isLocked = false;
    // the event listeners
    this._listeners = {
        'data':[],
        'end':[],
        'error':[]
    };
    // the previous worker, if any
    this.previous = null;
}

GenericWorker.prototype = {
    /**
     * Push a chunk to the next workers.
     * @param {Object} chunk the chunk to push
     */
    push : function (chunk) {
        this.emit("data", chunk);
    },
    /**
     * End the stream.
     * @return {Boolean} true if this call ended the worker, false otherwise.
     */
    end : function () {
        if (this.isFinished) {
            return false;
        }

        this.flush();
        try {
            this.emit("end");
            this.cleanUp();
            this.isFinished = true;
        } catch (e) {
            this.emit("error", e);
        }
        return true;
    },
    /**
     * End the stream with an error.
     * @param {Error} e the error which caused the premature end.
     * @return {Boolean} true if this call ended the worker with an error, false otherwise.
     */
    error : function (e) {
        if (this.isFinished) {
            return false;
        }

        if(this.isPaused) {
            this.generatedError = e;
        } else {
            this.isFinished = true;

            this.emit("error", e);

            // in the workers chain exploded in the middle of the chain,
            // the error event will go downward but we also need to notify
            // workers upward that there has been an error.
            if(this.previous) {
                this.previous.error(e);
            }

            this.cleanUp();
        }
        return true;
    },
    /**
     * Add a callback on an event.
     * @param {String} name the name of the event (data, end, error)
     * @param {Function} listener the function to call when the event is triggered
     * @return {GenericWorker} the current object for chainability
     */
    on : function (name, listener) {
        this._listeners[name].push(listener);
        return this;
    },
    /**
     * Clean any references when a worker is ending.
     */
    cleanUp : function () {
        this.streamInfo = this.generatedError = this.extraStreamInfo = null;
        this._listeners = [];
    },
    /**
     * Trigger an event. This will call registered callback with the provided arg.
     * @param {String} name the name of the event (data, end, error)
     * @param {Object} arg the argument to call the callback with.
     */
    emit : function (name, arg) {
        if (this._listeners[name]) {
            for(var i = 0; i < this._listeners[name].length; i++) {
                this._listeners[name][i].call(this, arg);
            }
        }
    },
    /**
     * Chain a worker with an other.
     * @param {Worker} next the worker receiving events from the current one.
     * @return {worker} the next worker for chainability
     */
    pipe : function (next) {
        return next.registerPrevious(this);
    },
    /**
     * Same as `pipe` in the other direction.
     * Using an API with `pipe(next)` is very easy.
     * Implementing the API with the point of view of the next one registering
     * a source is easier, see the ZipFileWorker.
     * @param {Worker} previous the previous worker, sending events to this one
     * @return {Worker} the current worker for chainability
     */
    registerPrevious : function (previous) {
        if (this.isLocked) {
            throw new Error("The stream '" + this + "' has already been used.");
        }

        // sharing the streamInfo...
        this.streamInfo = previous.streamInfo;
        // ... and adding our own bits
        this.mergeStreamInfo();
        this.previous =  previous;
        var self = this;
        previous.on('data', function (chunk) {
            self.processChunk(chunk);
        });
        previous.on('end', function () {
            self.end();
        });
        previous.on('error', function (e) {
            self.error(e);
        });
        return this;
    },
    /**
     * Pause the stream so it doesn't send events anymore.
     * @return {Boolean} true if this call paused the worker, false otherwise.
     */
    pause : function () {
        if(this.isPaused || this.isFinished) {
            return false;
        }
        this.isPaused = true;

        if(this.previous) {
            this.previous.pause();
        }
        return true;
    },
    /**
     * Resume a paused stream.
     * @return {Boolean} true if this call resumed the worker, false otherwise.
     */
    resume : function () {
        if(!this.isPaused || this.isFinished) {
            return false;
        }
        this.isPaused = false;

        // if true, the worker tried to resume but failed
        var withError = false;
        if(this.generatedError) {
            this.error(this.generatedError);
            withError = true;
        }
        if(this.previous) {
            this.previous.resume();
        }

        return !withError;
    },
    /**
     * Flush any remaining bytes as the stream is ending.
     */
    flush : function () {},
    /**
     * Process a chunk. This is usually the method overridden.
     * @param {Object} chunk the chunk to process.
     */
    processChunk : function(chunk) {
        this.push(chunk);
    },
    /**
     * Add a key/value to be added in the workers chain streamInfo once activated.
     * @param {String} key the key to use
     * @param {Object} value the associated value
     * @return {Worker} the current worker for chainability
     */
    withStreamInfo : function (key, value) {
        this.extraStreamInfo[key] = value;
        this.mergeStreamInfo();
        return this;
    },
    /**
     * Merge this worker's streamInfo into the chain's streamInfo.
     */
    mergeStreamInfo : function () {
        for(var key in this.extraStreamInfo) {
            if (!this.extraStreamInfo.hasOwnProperty(key)) {
                continue;
            }
            this.streamInfo[key] = this.extraStreamInfo[key];
        }
    },

    /**
     * Lock the stream to prevent further updates on the workers chain.
     * After calling this method, all calls to pipe will fail.
     */
    lock: function () {
        if (this.isLocked) {
            throw new Error("The stream '" + this + "' has already been used.");
        }
        this.isLocked = true;
        if (this.previous) {
            this.previous.lock();
        }
    },

    /**
     *
     * Pretty print the workers chain.
     */
    toString : function () {
        var me = "Worker " + this.name;
        if (this.previous) {
            return this.previous + " -> " + me;
        } else {
            return me;
        }
    }
};

module.exports = GenericWorker;

},{}],29:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var ConvertWorker = require('./ConvertWorker');
var GenericWorker = require('./GenericWorker');
var base64 = require('../base64');
var support = require("../support");
var external = require("../external");

var NodejsStreamOutputAdapter = null;
if (support.nodestream) {
    try {
        NodejsStreamOutputAdapter = require('../nodejs/NodejsStreamOutputAdapter');
    } catch(e) {}
}

/**
 * Apply the final transformation of the data. If the user wants a Blob for
 * example, it's easier to work with an U8intArray and finally do the
 * ArrayBuffer/Blob conversion.
 * @param {String} type the name of the final type
 * @param {String|Uint8Array|Buffer} content the content to transform
 * @param {String} mimeType the mime type of the content, if applicable.
 * @return {String|Uint8Array|ArrayBuffer|Buffer|Blob} the content in the right format.
 */
function transformZipOutput(type, content, mimeType) {
    switch(type) {
        case "blob" :
            return utils.newBlob(utils.transformTo("arraybuffer", content), mimeType);
        case "base64" :
            return base64.encode(content);
        default :
            return utils.transformTo(type, content);
    }
}

/**
 * Concatenate an array of data of the given type.
 * @param {String} type the type of the data in the given array.
 * @param {Array} dataArray the array containing the data chunks to concatenate
 * @return {String|Uint8Array|Buffer} the concatenated data
 * @throws Error if the asked type is unsupported
 */
function concat (type, dataArray) {
    var i, index = 0, res = null, totalLength = 0;
    for(i = 0; i < dataArray.length; i++) {
        totalLength += dataArray[i].length;
    }
    switch(type) {
        case "string":
            return dataArray.join("");
          case "array":
            return Array.prototype.concat.apply([], dataArray);
        case "uint8array":
            res = new Uint8Array(totalLength);
            for(i = 0; i < dataArray.length; i++) {
                res.set(dataArray[i], index);
                index += dataArray[i].length;
            }
            return res;
        case "nodebuffer":
            return Buffer.concat(dataArray);
        default:
            throw new Error("concat : unsupported type '"  + type + "'");
    }
}

/**
 * Listen a StreamHelper, accumulate its content and concatenate it into a
 * complete block.
 * @param {StreamHelper} helper the helper to use.
 * @param {Function} updateCallback a callback called on each update. Called
 * with one arg :
 * - the metadata linked to the update received.
 * @return Promise the promise for the accumulation.
 */
function accumulate(helper, updateCallback) {
    return new external.Promise(function (resolve, reject){
        var dataArray = [];
        var chunkType = helper._internalType,
            resultType = helper._outputType,
            mimeType = helper._mimeType;
        helper
        .on('data', function (data, meta) {
            dataArray.push(data);
            if(updateCallback) {
                updateCallback(meta);
            }
        })
        .on('error', function(err) {
            dataArray = [];
            reject(err);
        })
        .on('end', function (){
            try {
                var result = transformZipOutput(resultType, concat(chunkType, dataArray), mimeType);
                resolve(result);
            } catch (e) {
                reject(e);
            }
            dataArray = [];
        })
        .resume();
    });
}

/**
 * An helper to easily use workers outside of JSZip.
 * @constructor
 * @param {Worker} worker the worker to wrap
 * @param {String} outputType the type of data expected by the use
 * @param {String} mimeType the mime type of the content, if applicable.
 */
function StreamHelper(worker, outputType, mimeType) {
    var internalType = outputType;
    switch(outputType) {
        case "blob":
        case "arraybuffer":
            internalType = "uint8array";
        break;
        case "base64":
            internalType = "string";
        break;
    }

    try {
        // the type used internally
        this._internalType = internalType;
        // the type used to output results
        this._outputType = outputType;
        // the mime type
        this._mimeType = mimeType;
        utils.checkSupport(internalType);
        this._worker = worker.pipe(new ConvertWorker(internalType));
        // the last workers can be rewired without issues but we need to
        // prevent any updates on previous workers.
        worker.lock();
    } catch(e) {
        this._worker = new GenericWorker("error");
        this._worker.error(e);
    }
}

StreamHelper.prototype = {
    /**
     * Listen a StreamHelper, accumulate its content and concatenate it into a
     * complete block.
     * @param {Function} updateCb the update callback.
     * @return Promise the promise for the accumulation.
     */
    accumulate : function (updateCb) {
        return accumulate(this, updateCb);
    },
    /**
     * Add a listener on an event triggered on a stream.
     * @param {String} evt the name of the event
     * @param {Function} fn the listener
     * @return {StreamHelper} the current helper.
     */
    on : function (evt, fn) {
        var self = this;

        if(evt === "data") {
            this._worker.on(evt, function (chunk) {
                fn.call(self, chunk.data, chunk.meta);
            });
        } else {
            this._worker.on(evt, function () {
                utils.delay(fn, arguments, self);
            });
        }
        return this;
    },
    /**
     * Resume the flow of chunks.
     * @return {StreamHelper} the current helper.
     */
    resume : function () {
        utils.delay(this._worker.resume, [], this._worker);
        return this;
    },
    /**
     * Pause the flow of chunks.
     * @return {StreamHelper} the current helper.
     */
    pause : function () {
        this._worker.pause();
        return this;
    },
    /**
     * Return a nodejs stream for this helper.
     * @param {Function} updateCb the update callback.
     * @return {NodejsStreamOutputAdapter} the nodejs stream.
     */
    toNodejsStream : function (updateCb) {
        utils.checkSupport("nodestream");
        if (this._outputType !== "nodebuffer") {
            // an object stream containing blob/arraybuffer/uint8array/string
            // is strange and I don't know if it would be useful.
            // I you find this comment and have a good usecase, please open a
            // bug report !
            throw new Error(this._outputType + " is not supported by this method");
        }

        return new NodejsStreamOutputAdapter(this, {
            objectMode : this._outputType !== "nodebuffer"
        }, updateCb);
    }
};


module.exports = StreamHelper;

},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(require,module,exports){
'use strict';

exports.base64 = true;
exports.array = true;
exports.string = true;
exports.arraybuffer = typeof ArrayBuffer !== "undefined" && typeof Uint8Array !== "undefined";
exports.nodebuffer = typeof Buffer !== "undefined";
// contains true if JSZip can read/generate Uint8Array, false otherwise.
exports.uint8array = typeof Uint8Array !== "undefined";

if (typeof ArrayBuffer === "undefined") {
    exports.blob = false;
}
else {
    var buffer = new ArrayBuffer(0);
    try {
        exports.blob = new Blob([buffer], {
            type: "application/zip"
        }).size === 0;
    }
    catch (e) {
        try {
            var Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
            var builder = new Builder();
            builder.append(buffer);
            exports.blob = builder.getBlob('application/zip').size === 0;
        }
        catch (e) {
            exports.blob = false;
        }
    }
}

try {
    exports.nodestream = !!require('readable-stream').Readable;
} catch(e) {
    exports.nodestream = false;
}

},{"readable-stream":16}],31:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var support = require('./support');
var nodejsUtils = require('./nodejsUtils');
var GenericWorker = require('./stream/GenericWorker');

/**
 * The following functions come from pako, from pako/lib/utils/strings
 * released under the MIT license, see pako https://github.com/nodeca/pako/
 */

// Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff
var _utf8len = new Array(256);
for (var i=0; i<256; i++) {
  _utf8len[i] = (i >= 252 ? 6 : i >= 248 ? 5 : i >= 240 ? 4 : i >= 224 ? 3 : i >= 192 ? 2 : 1);
}
_utf8len[254]=_utf8len[254]=1; // Invalid sequence start

// convert string to array (typed, when possible)
var string2buf = function (str) {
    var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

    // count binary size
    for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
            c2 = str.charCodeAt(m_pos+1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }

    // allocate buffer
    if (support.uint8array) {
        buf = new Uint8Array(buf_len);
    } else {
        buf = new Array(buf_len);
    }

    // convert
    for (i=0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
            c2 = str.charCodeAt(m_pos+1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        if (c < 0x80) {
            /* one byte */
            buf[i++] = c;
        } else if (c < 0x800) {
            /* two bytes */
            buf[i++] = 0xC0 | (c >>> 6);
            buf[i++] = 0x80 | (c & 0x3f);
        } else if (c < 0x10000) {
            /* three bytes */
            buf[i++] = 0xE0 | (c >>> 12);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        } else {
            /* four bytes */
            buf[i++] = 0xf0 | (c >>> 18);
            buf[i++] = 0x80 | (c >>> 12 & 0x3f);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        }
    }

    return buf;
};

// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
var utf8border = function(buf, max) {
    var pos;

    max = max || buf.length;
    if (max > buf.length) { max = buf.length; }

    // go back from last position, until start of sequence found
    pos = max-1;
    while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

    // Fuckup - very small and broken sequence,
    // return max, because we should return something anyway.
    if (pos < 0) { return max; }

    // If we came to start of buffer - that means vuffer is too small,
    // return max too.
    if (pos === 0) { return max; }

    return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};

// convert array to string
var buf2string = function (buf) {
    var str, i, out, c, c_len;
    var len = buf.length;

    // Reserve max possible length (2 words per char)
    // NB: by unknown reasons, Array is significantly faster for
    //     String.fromCharCode.apply than Uint16Array.
    var utf16buf = new Array(len*2);

    for (out=0, i=0; i<len;) {
        c = buf[i++];
        // quick process ascii
        if (c < 0x80) { utf16buf[out++] = c; continue; }

        c_len = _utf8len[c];
        // skip 5 & 6 byte codes
        if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len-1; continue; }

        // apply mask on first byte
        c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
        // join the rest
        while (c_len > 1 && i < len) {
            c = (c << 6) | (buf[i++] & 0x3f);
            c_len--;
        }

        // terminated by end of string?
        if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

        if (c < 0x10000) {
            utf16buf[out++] = c;
        } else {
            c -= 0x10000;
            utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
            utf16buf[out++] = 0xdc00 | (c & 0x3ff);
        }
    }

    // shrinkBuf(utf16buf, out)
    if (utf16buf.length !== out) {
        if(utf16buf.subarray) {
            utf16buf = utf16buf.subarray(0, out);
        } else {
            utf16buf.length = out;
        }
    }

    // return String.fromCharCode.apply(null, utf16buf);
    return utils.applyFromCharCode(utf16buf);
};


// That's all for the pako functions.


/**
 * Transform a javascript string into an array (typed if possible) of bytes,
 * UTF-8 encoded.
 * @param {String} str the string to encode
 * @return {Array|Uint8Array|Buffer} the UTF-8 encoded string.
 */
exports.utf8encode = function utf8encode(str) {
    if (support.nodebuffer) {
        return nodejsUtils.newBufferFrom(str, "utf-8");
    }

    return string2buf(str);
};


/**
 * Transform a bytes array (or a representation) representing an UTF-8 encoded
 * string into a javascript string.
 * @param {Array|Uint8Array|Buffer} buf the data de decode
 * @return {String} the decoded string.
 */
exports.utf8decode = function utf8decode(buf) {
    if (support.nodebuffer) {
        return utils.transformTo("nodebuffer", buf).toString("utf-8");
    }

    buf = utils.transformTo(support.uint8array ? "uint8array" : "array", buf);

    return buf2string(buf);
};

/**
 * A worker to decode utf8 encoded binary chunks into string chunks.
 * @constructor
 */
function Utf8DecodeWorker() {
    GenericWorker.call(this, "utf-8 decode");
    // the last bytes if a chunk didn't end with a complete codepoint.
    this.leftOver = null;
}
utils.inherits(Utf8DecodeWorker, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
Utf8DecodeWorker.prototype.processChunk = function (chunk) {

    var data = utils.transformTo(support.uint8array ? "uint8array" : "array", chunk.data);

    // 1st step, re-use what's left of the previous chunk
    if (this.leftOver && this.leftOver.length) {
        if(support.uint8array) {
            var previousData = data;
            data = new Uint8Array(previousData.length + this.leftOver.length);
            data.set(this.leftOver, 0);
            data.set(previousData, this.leftOver.length);
        } else {
            data = this.leftOver.concat(data);
        }
        this.leftOver = null;
    }

    var nextBoundary = utf8border(data);
    var usableData = data;
    if (nextBoundary !== data.length) {
        if (support.uint8array) {
            usableData = data.subarray(0, nextBoundary);
            this.leftOver = data.subarray(nextBoundary, data.length);
        } else {
            usableData = data.slice(0, nextBoundary);
            this.leftOver = data.slice(nextBoundary, data.length);
        }
    }

    this.push({
        data : exports.utf8decode(usableData),
        meta : chunk.meta
    });
};

/**
 * @see GenericWorker.flush
 */
Utf8DecodeWorker.prototype.flush = function () {
    if(this.leftOver && this.leftOver.length) {
        this.push({
            data : exports.utf8decode(this.leftOver),
            meta : {}
        });
        this.leftOver = null;
    }
};
exports.Utf8DecodeWorker = Utf8DecodeWorker;

/**
 * A worker to endcode string chunks into utf8 encoded binary chunks.
 * @constructor
 */
function Utf8EncodeWorker() {
    GenericWorker.call(this, "utf-8 encode");
}
utils.inherits(Utf8EncodeWorker, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
Utf8EncodeWorker.prototype.processChunk = function (chunk) {
    this.push({
        data : exports.utf8encode(chunk.data),
        meta : chunk.meta
    });
};
exports.Utf8EncodeWorker = Utf8EncodeWorker;

},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(require,module,exports){
'use strict';

var support = require('./support');
var base64 = require('./base64');
var nodejsUtils = require('./nodejsUtils');
var setImmediate = require('set-immediate-shim');
var external = require("./external");


/**
 * Convert a string that pass as a "binary string": it should represent a byte
 * array but may have > 255 char codes. Be sure to take only the first byte
 * and returns the byte array.
 * @param {String} str the string to transform.
 * @return {Array|Uint8Array} the string in a binary format.
 */
function string2binary(str) {
    var result = null;
    if (support.uint8array) {
      result = new Uint8Array(str.length);
    } else {
      result = new Array(str.length);
    }
    return stringToArrayLike(str, result);
}

/**
 * Create a new blob with the given content and the given type.
 * @param {String|ArrayBuffer} part the content to put in the blob. DO NOT use
 * an Uint8Array because the stock browser of android 4 won't accept it (it
 * will be silently converted to a string, "[object Uint8Array]").
 *
 * Use only ONE part to build the blob to avoid a memory leak in IE11 / Edge:
 * when a large amount of Array is used to create the Blob, the amount of
 * memory consumed is nearly 100 times the original data amount.
 *
 * @param {String} type the mime type of the blob.
 * @return {Blob} the created blob.
 */
exports.newBlob = function(part, type) {
    exports.checkSupport("blob");

    try {
        // Blob constructor
        return new Blob([part], {
            type: type
        });
    }
    catch (e) {

        try {
            // deprecated, browser only, old way
            var Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
            var builder = new Builder();
            builder.append(part);
            return builder.getBlob(type);
        }
        catch (e) {

            // well, fuck ?!
            throw new Error("Bug : can't construct the Blob.");
        }
    }


};
/**
 * The identity function.
 * @param {Object} input the input.
 * @return {Object} the same input.
 */
function identity(input) {
    return input;
}

/**
 * Fill in an array with a string.
 * @param {String} str the string to use.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to fill in (will be mutated).
 * @return {Array|ArrayBuffer|Uint8Array|Buffer} the updated array.
 */
function stringToArrayLike(str, array) {
    for (var i = 0; i < str.length; ++i) {
        array[i] = str.charCodeAt(i) & 0xFF;
    }
    return array;
}

/**
 * An helper for the function arrayLikeToString.
 * This contains static informations and functions that
 * can be optimized by the browser JIT compiler.
 */
var arrayToStringHelper = {
    /**
     * Transform an array of int into a string, chunk by chunk.
     * See the performances notes on arrayLikeToString.
     * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
     * @param {String} type the type of the array.
     * @param {Integer} chunk the chunk size.
     * @return {String} the resulting string.
     * @throws Error if the chunk is too big for the stack.
     */
    stringifyByChunk: function(array, type, chunk) {
        var result = [], k = 0, len = array.length;
        // shortcut
        if (len <= chunk) {
            return String.fromCharCode.apply(null, array);
        }
        while (k < len) {
            if (type === "array" || type === "nodebuffer") {
                result.push(String.fromCharCode.apply(null, array.slice(k, Math.min(k + chunk, len))));
            }
            else {
                result.push(String.fromCharCode.apply(null, array.subarray(k, Math.min(k + chunk, len))));
            }
            k += chunk;
        }
        return result.join("");
    },
    /**
     * Call String.fromCharCode on every item in the array.
     * This is the naive implementation, which generate A LOT of intermediate string.
     * This should be used when everything else fail.
     * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
     * @return {String} the result.
     */
    stringifyByChar: function(array){
        var resultStr = "";
        for(var i = 0; i < array.length; i++) {
            resultStr += String.fromCharCode(array[i]);
        }
        return resultStr;
    },
    applyCanBeUsed : {
        /**
         * true if the browser accepts to use String.fromCharCode on Uint8Array
         */
        uint8array : (function () {
            try {
                return support.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
            } catch (e) {
                return false;
            }
        })(),
        /**
         * true if the browser accepts to use String.fromCharCode on nodejs Buffer.
         */
        nodebuffer : (function () {
            try {
                return support.nodebuffer && String.fromCharCode.apply(null, nodejsUtils.allocBuffer(1)).length === 1;
            } catch (e) {
                return false;
            }
        })()
    }
};

/**
 * Transform an array-like object to a string.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
 * @return {String} the result.
 */
function arrayLikeToString(array) {
    // Performances notes :
    // --------------------
    // String.fromCharCode.apply(null, array) is the fastest, see
    // see http://jsperf.com/converting-a-uint8array-to-a-string/2
    // but the stack is limited (and we can get huge arrays !).
    //
    // result += String.fromCharCode(array[i]); generate too many strings !
    //
    // This code is inspired by http://jsperf.com/arraybuffer-to-string-apply-performance/2
    // TODO : we now have workers that split the work. Do we still need that ?
    var chunk = 65536,
        type = exports.getTypeOf(array),
        canUseApply = true;
    if (type === "uint8array") {
        canUseApply = arrayToStringHelper.applyCanBeUsed.uint8array;
    } else if (type === "nodebuffer") {
        canUseApply = arrayToStringHelper.applyCanBeUsed.nodebuffer;
    }

    if (canUseApply) {
        while (chunk > 1) {
            try {
                return arrayToStringHelper.stringifyByChunk(array, type, chunk);
            } catch (e) {
                chunk = Math.floor(chunk / 2);
            }
        }
    }

    // no apply or chunk error : slow and painful algorithm
    // default browser on android 4.*
    return arrayToStringHelper.stringifyByChar(array);
}

exports.applyFromCharCode = arrayLikeToString;


/**
 * Copy the data from an array-like to an other array-like.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} arrayFrom the origin array.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} arrayTo the destination array which will be mutated.
 * @return {Array|ArrayBuffer|Uint8Array|Buffer} the updated destination array.
 */
function arrayLikeToArrayLike(arrayFrom, arrayTo) {
    for (var i = 0; i < arrayFrom.length; i++) {
        arrayTo[i] = arrayFrom[i];
    }
    return arrayTo;
}

// a matrix containing functions to transform everything into everything.
var transform = {};

// string to ?
transform["string"] = {
    "string": identity,
    "array": function(input) {
        return stringToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return transform["string"]["uint8array"](input).buffer;
    },
    "uint8array": function(input) {
        return stringToArrayLike(input, new Uint8Array(input.length));
    },
    "nodebuffer": function(input) {
        return stringToArrayLike(input, nodejsUtils.allocBuffer(input.length));
    }
};

// array to ?
transform["array"] = {
    "string": arrayLikeToString,
    "array": identity,
    "arraybuffer": function(input) {
        return (new Uint8Array(input)).buffer;
    },
    "uint8array": function(input) {
        return new Uint8Array(input);
    },
    "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(input);
    }
};

// arraybuffer to ?
transform["arraybuffer"] = {
    "string": function(input) {
        return arrayLikeToString(new Uint8Array(input));
    },
    "array": function(input) {
        return arrayLikeToArrayLike(new Uint8Array(input), new Array(input.byteLength));
    },
    "arraybuffer": identity,
    "uint8array": function(input) {
        return new Uint8Array(input);
    },
    "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(new Uint8Array(input));
    }
};

// uint8array to ?
transform["uint8array"] = {
    "string": arrayLikeToString,
    "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return input.buffer;
    },
    "uint8array": identity,
    "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(input);
    }
};

// nodebuffer to ?
transform["nodebuffer"] = {
    "string": arrayLikeToString,
    "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return transform["nodebuffer"]["uint8array"](input).buffer;
    },
    "uint8array": function(input) {
        return arrayLikeToArrayLike(input, new Uint8Array(input.length));
    },
    "nodebuffer": identity
};

/**
 * Transform an input into any type.
 * The supported output type are : string, array, uint8array, arraybuffer, nodebuffer.
 * If no output type is specified, the unmodified input will be returned.
 * @param {String} outputType the output type.
 * @param {String|Array|ArrayBuffer|Uint8Array|Buffer} input the input to convert.
 * @throws {Error} an Error if the browser doesn't support the requested output type.
 */
exports.transformTo = function(outputType, input) {
    if (!input) {
        // undefined, null, etc
        // an empty string won't harm.
        input = "";
    }
    if (!outputType) {
        return input;
    }
    exports.checkSupport(outputType);
    var inputType = exports.getTypeOf(input);
    var result = transform[inputType][outputType](input);
    return result;
};

/**
 * Return the type of the input.
 * The type will be in a format valid for JSZip.utils.transformTo : string, array, uint8array, arraybuffer.
 * @param {Object} input the input to identify.
 * @return {String} the (lowercase) type of the input.
 */
exports.getTypeOf = function(input) {
    if (typeof input === "string") {
        return "string";
    }
    if (Object.prototype.toString.call(input) === "[object Array]") {
        return "array";
    }
    if (support.nodebuffer && nodejsUtils.isBuffer(input)) {
        return "nodebuffer";
    }
    if (support.uint8array && input instanceof Uint8Array) {
        return "uint8array";
    }
    if (support.arraybuffer && input instanceof ArrayBuffer) {
        return "arraybuffer";
    }
};

/**
 * Throw an exception if the type is not supported.
 * @param {String} type the type to check.
 * @throws {Error} an Error if the browser doesn't support the requested type.
 */
exports.checkSupport = function(type) {
    var supported = support[type.toLowerCase()];
    if (!supported) {
        throw new Error(type + " is not supported by this platform");
    }
};

exports.MAX_VALUE_16BITS = 65535;
exports.MAX_VALUE_32BITS = -1; // well, "\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF" is parsed as -1

/**
 * Prettify a string read as binary.
 * @param {string} str the string to prettify.
 * @return {string} a pretty string.
 */
exports.pretty = function(str) {
    var res = '',
        code, i;
    for (i = 0; i < (str || "").length; i++) {
        code = str.charCodeAt(i);
        res += '\\x' + (code < 16 ? "0" : "") + code.toString(16).toUpperCase();
    }
    return res;
};

/**
 * Defer the call of a function.
 * @param {Function} callback the function to call asynchronously.
 * @param {Array} args the arguments to give to the callback.
 */
exports.delay = function(callback, args, self) {
    setImmediate(function () {
        callback.apply(self || null, args || []);
    });
};

/**
 * Extends a prototype with an other, without calling a constructor with
 * side effects. Inspired by nodejs' `utils.inherits`
 * @param {Function} ctor the constructor to augment
 * @param {Function} superCtor the parent constructor to use
 */
exports.inherits = function (ctor, superCtor) {
    var Obj = function() {};
    Obj.prototype = superCtor.prototype;
    ctor.prototype = new Obj();
};

/**
 * Merge the objects passed as parameters into a new one.
 * @private
 * @param {...Object} var_args All objects to merge.
 * @return {Object} a new object with the data of the others.
 */
exports.extend = function() {
    var result = {}, i, attr;
    for (i = 0; i < arguments.length; i++) { // arguments is not enumerable in some browsers
        for (attr in arguments[i]) {
            if (arguments[i].hasOwnProperty(attr) && typeof result[attr] === "undefined") {
                result[attr] = arguments[i][attr];
            }
        }
    }
    return result;
};

/**
 * Transform arbitrary content into a Promise.
 * @param {String} name a name for the content being processed.
 * @param {Object} inputData the content to process.
 * @param {Boolean} isBinary true if the content is not an unicode string
 * @param {Boolean} isOptimizedBinaryString true if the string content only has one byte per character.
 * @param {Boolean} isBase64 true if the string content is encoded with base64.
 * @return {Promise} a promise in a format usable by JSZip.
 */
exports.prepareContent = function(name, inputData, isBinary, isOptimizedBinaryString, isBase64) {

    // if inputData is already a promise, this flatten it.
    var promise = external.Promise.resolve(inputData).then(function(data) {
        
        
        var isBlob = support.blob && (data instanceof Blob || ['[object File]', '[object Blob]'].indexOf(Object.prototype.toString.call(data)) !== -1);

        if (isBlob && typeof FileReader !== "undefined") {
            return new external.Promise(function (resolve, reject) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    resolve(e.target.result);
                };
                reader.onerror = function(e) {
                    reject(e.target.error);
                };
                reader.readAsArrayBuffer(data);
            });
        } else {
            return data;
        }
    });

    return promise.then(function(data) {
        var dataType = exports.getTypeOf(data);

        if (!dataType) {
            return external.Promise.reject(
                new Error("Can't read the data of '" + name + "'. Is it " +
                          "in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?")
            );
        }
        // special case : it's way easier to work with Uint8Array than with ArrayBuffer
        if (dataType === "arraybuffer") {
            data = exports.transformTo("uint8array", data);
        } else if (dataType === "string") {
            if (isBase64) {
                data = base64.decode(data);
            }
            else if (isBinary) {
                // optimizedBinaryString === true means that the file has already been filtered with a 0xFF mask
                if (isOptimizedBinaryString !== true) {
                    // this is a string, not in a base64 format.
                    // Be sure that this is a correct "binary string"
                    data = string2binary(data);
                }
            }
        }
        return data;
    });
};

},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,"set-immediate-shim":54}],33:[function(require,module,exports){
'use strict';
var readerFor = require('./reader/readerFor');
var utils = require('./utils');
var sig = require('./signature');
var ZipEntry = require('./zipEntry');
var utf8 = require('./utf8');
var support = require('./support');
//  class ZipEntries {{{
/**
 * All the entries in the zip file.
 * @constructor
 * @param {Object} loadOptions Options for loading the stream.
 */
function ZipEntries(loadOptions) {
    this.files = [];
    this.loadOptions = loadOptions;
}
ZipEntries.prototype = {
    /**
     * Check that the reader is on the specified signature.
     * @param {string} expectedSignature the expected signature.
     * @throws {Error} if it is an other signature.
     */
    checkSignature: function(expectedSignature) {
        if (!this.reader.readAndCheckSignature(expectedSignature)) {
            this.reader.index -= 4;
            var signature = this.reader.readString(4);
            throw new Error("Corrupted zip or bug: unexpected signature " + "(" + utils.pretty(signature) + ", expected " + utils.pretty(expectedSignature) + ")");
        }
    },
    /**
     * Check if the given signature is at the given index.
     * @param {number} askedIndex the index to check.
     * @param {string} expectedSignature the signature to expect.
     * @return {boolean} true if the signature is here, false otherwise.
     */
    isSignature: function(askedIndex, expectedSignature) {
        var currentIndex = this.reader.index;
        this.reader.setIndex(askedIndex);
        var signature = this.reader.readString(4);
        var result = signature === expectedSignature;
        this.reader.setIndex(currentIndex);
        return result;
    },
    /**
     * Read the end of the central directory.
     */
    readBlockEndOfCentral: function() {
        this.diskNumber = this.reader.readInt(2);
        this.diskWithCentralDirStart = this.reader.readInt(2);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(2);
        this.centralDirRecords = this.reader.readInt(2);
        this.centralDirSize = this.reader.readInt(4);
        this.centralDirOffset = this.reader.readInt(4);

        this.zipCommentLength = this.reader.readInt(2);
        // warning : the encoding depends of the system locale
        // On a linux machine with LANG=en_US.utf8, this field is utf8 encoded.
        // On a windows machine, this field is encoded with the localized windows code page.
        var zipComment = this.reader.readData(this.zipCommentLength);
        var decodeParamType = support.uint8array ? "uint8array" : "array";
        // To get consistent behavior with the generation part, we will assume that
        // this is utf8 encoded unless specified otherwise.
        var decodeContent = utils.transformTo(decodeParamType, zipComment);
        this.zipComment = this.loadOptions.decodeFileName(decodeContent);
    },
    /**
     * Read the end of the Zip 64 central directory.
     * Not merged with the method readEndOfCentral :
     * The end of central can coexist with its Zip64 brother,
     * I don't want to read the wrong number of bytes !
     */
    readBlockZip64EndOfCentral: function() {
        this.zip64EndOfCentralSize = this.reader.readInt(8);
        this.reader.skip(4);
        // this.versionMadeBy = this.reader.readString(2);
        // this.versionNeeded = this.reader.readInt(2);
        this.diskNumber = this.reader.readInt(4);
        this.diskWithCentralDirStart = this.reader.readInt(4);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(8);
        this.centralDirRecords = this.reader.readInt(8);
        this.centralDirSize = this.reader.readInt(8);
        this.centralDirOffset = this.reader.readInt(8);

        this.zip64ExtensibleData = {};
        var extraDataSize = this.zip64EndOfCentralSize - 44,
            index = 0,
            extraFieldId,
            extraFieldLength,
            extraFieldValue;
        while (index < extraDataSize) {
            extraFieldId = this.reader.readInt(2);
            extraFieldLength = this.reader.readInt(4);
            extraFieldValue = this.reader.readData(extraFieldLength);
            this.zip64ExtensibleData[extraFieldId] = {
                id: extraFieldId,
                length: extraFieldLength,
                value: extraFieldValue
            };
        }
    },
    /**
     * Read the end of the Zip 64 central directory locator.
     */
    readBlockZip64EndOfCentralLocator: function() {
        this.diskWithZip64CentralDirStart = this.reader.readInt(4);
        this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8);
        this.disksCount = this.reader.readInt(4);
        if (this.disksCount > 1) {
            throw new Error("Multi-volumes zip are not supported");
        }
    },
    /**
     * Read the local files, based on the offset read in the central part.
     */
    readLocalFiles: function() {
        var i, file;
        for (i = 0; i < this.files.length; i++) {
            file = this.files[i];
            this.reader.setIndex(file.localHeaderOffset);
            this.checkSignature(sig.LOCAL_FILE_HEADER);
            file.readLocalPart(this.reader);
            file.handleUTF8();
            file.processAttributes();
        }
    },
    /**
     * Read the central directory.
     */
    readCentralDir: function() {
        var file;

        this.reader.setIndex(this.centralDirOffset);
        while (this.reader.readAndCheckSignature(sig.CENTRAL_FILE_HEADER)) {
            file = new ZipEntry({
                zip64: this.zip64
            }, this.loadOptions);
            file.readCentralPart(this.reader);
            this.files.push(file);
        }

        if (this.centralDirRecords !== this.files.length) {
            if (this.centralDirRecords !== 0 && this.files.length === 0) {
                // We expected some records but couldn't find ANY.
                // This is really suspicious, as if something went wrong.
                throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
            } else {
                // We found some records but not all.
                // Something is wrong but we got something for the user: no error here.
                // console.warn("expected", this.centralDirRecords, "records in central dir, got", this.files.length);
            }
        }
    },
    /**
     * Read the end of central directory.
     */
    readEndOfCentral: function() {
        var offset = this.reader.lastIndexOfSignature(sig.CENTRAL_DIRECTORY_END);
        if (offset < 0) {
            // Check if the content is a truncated zip or complete garbage.
            // A "LOCAL_FILE_HEADER" is not required at the beginning (auto
            // extractible zip for example) but it can give a good hint.
            // If an ajax request was used without responseType, we will also
            // get unreadable data.
            var isGarbage = !this.isSignature(0, sig.LOCAL_FILE_HEADER);

            if (isGarbage) {
                throw new Error("Can't find end of central directory : is this a zip file ? " +
                                "If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
            } else {
                throw new Error("Corrupted zip: can't find end of central directory");
            }

        }
        this.reader.setIndex(offset);
        var endOfCentralDirOffset = offset;
        this.checkSignature(sig.CENTRAL_DIRECTORY_END);
        this.readBlockEndOfCentral();


        /* extract from the zip spec :
            4)  If one of the fields in the end of central directory
                record is too small to hold required data, the field
                should be set to -1 (0xFFFF or 0xFFFFFFFF) and the
                ZIP64 format record should be created.
            5)  The end of central directory record and the
                Zip64 end of central directory locator record must
                reside on the same disk when splitting or spanning
                an archive.
         */
        if (this.diskNumber === utils.MAX_VALUE_16BITS || this.diskWithCentralDirStart === utils.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === utils.MAX_VALUE_16BITS || this.centralDirRecords === utils.MAX_VALUE_16BITS || this.centralDirSize === utils.MAX_VALUE_32BITS || this.centralDirOffset === utils.MAX_VALUE_32BITS) {
            this.zip64 = true;

            /*
            Warning : the zip64 extension is supported, but ONLY if the 64bits integer read from
            the zip file can fit into a 32bits integer. This cannot be solved : JavaScript represents
            all numbers as 64-bit double precision IEEE 754 floating point numbers.
            So, we have 53bits for integers and bitwise operations treat everything as 32bits.
            see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Operators/Bitwise_Operators
            and http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf section 8.5
            */

            // should look for a zip64 EOCD locator
            offset = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
            if (offset < 0) {
                throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
            }
            this.reader.setIndex(offset);
            this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
            this.readBlockZip64EndOfCentralLocator();

            // now the zip64 EOCD record
            if (!this.isSignature(this.relativeOffsetEndOfZip64CentralDir, sig.ZIP64_CENTRAL_DIRECTORY_END)) {
                // console.warn("ZIP64 end of central directory not where expected.");
                this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
                if (this.relativeOffsetEndOfZip64CentralDir < 0) {
                    throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
                }
            }
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir);
            this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
            this.readBlockZip64EndOfCentral();
        }

        var expectedEndOfCentralDirOffset = this.centralDirOffset + this.centralDirSize;
        if (this.zip64) {
            expectedEndOfCentralDirOffset += 20; // end of central dir 64 locator
            expectedEndOfCentralDirOffset += 12 /* should not include the leading 12 bytes */ + this.zip64EndOfCentralSize;
        }

        var extraBytes = endOfCentralDirOffset - expectedEndOfCentralDirOffset;

        if (extraBytes > 0) {
            // console.warn(extraBytes, "extra bytes at beginning or within zipfile");
            if (this.isSignature(endOfCentralDirOffset, sig.CENTRAL_FILE_HEADER)) {
                // The offsets seem wrong, but we have something at the specified offset.
                // So… we keep it.
            } else {
                // the offset is wrong, update the "zero" of the reader
                // this happens if data has been prepended (crx files for example)
                this.reader.zero = extraBytes;
            }
        } else if (extraBytes < 0) {
            throw new Error("Corrupted zip: missing " + Math.abs(extraBytes) + " bytes.");
        }
    },
    prepareReader: function(data) {
        this.reader = readerFor(data);
    },
    /**
     * Read a zip file and create ZipEntries.
     * @param {String|ArrayBuffer|Uint8Array|Buffer} data the binary string representing a zip file.
     */
    load: function(data) {
        this.prepareReader(data);
        this.readEndOfCentral();
        this.readCentralDir();
        this.readLocalFiles();
    }
};
// }}} end of ZipEntries
module.exports = ZipEntries;

},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utf8":31,"./utils":32,"./zipEntry":34}],34:[function(require,module,exports){
'use strict';
var readerFor = require('./reader/readerFor');
var utils = require('./utils');
var CompressedObject = require('./compressedObject');
var crc32fn = require('./crc32');
var utf8 = require('./utf8');
var compressions = require('./compressions');
var support = require('./support');

var MADE_BY_DOS = 0x00;
var MADE_BY_UNIX = 0x03;

/**
 * Find a compression registered in JSZip.
 * @param {string} compressionMethod the method magic to find.
 * @return {Object|null} the JSZip compression object, null if none found.
 */
var findCompression = function(compressionMethod) {
    for (var method in compressions) {
        if (!compressions.hasOwnProperty(method)) {
            continue;
        }
        if (compressions[method].magic === compressionMethod) {
            return compressions[method];
        }
    }
    return null;
};

// class ZipEntry {{{
/**
 * An entry in the zip file.
 * @constructor
 * @param {Object} options Options of the current file.
 * @param {Object} loadOptions Options for loading the stream.
 */
function ZipEntry(options, loadOptions) {
    this.options = options;
    this.loadOptions = loadOptions;
}
ZipEntry.prototype = {
    /**
     * say if the file is encrypted.
     * @return {boolean} true if the file is encrypted, false otherwise.
     */
    isEncrypted: function() {
        // bit 1 is set
        return (this.bitFlag & 0x0001) === 0x0001;
    },
    /**
     * say if the file has utf-8 filename/comment.
     * @return {boolean} true if the filename/comment is in utf-8, false otherwise.
     */
    useUTF8: function() {
        // bit 11 is set
        return (this.bitFlag & 0x0800) === 0x0800;
    },
    /**
     * Read the local part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readLocalPart: function(reader) {
        var compression, localExtraFieldsLength;

        // we already know everything from the central dir !
        // If the central dir data are false, we are doomed.
        // On the bright side, the local part is scary  : zip64, data descriptors, both, etc.
        // The less data we get here, the more reliable this should be.
        // Let's skip the whole header and dash to the data !
        reader.skip(22);
        // in some zip created on windows, the filename stored in the central dir contains \ instead of /.
        // Strangely, the filename here is OK.
        // I would love to treat these zip files as corrupted (see http://www.info-zip.org/FAQ.html#backslashes
        // or APPNOTE#4.4.17.1, "All slashes MUST be forward slashes '/'") but there are a lot of bad zip generators...
        // Search "unzip mismatching "local" filename continuing with "central" filename version" on
        // the internet.
        //
        // I think I see the logic here : the central directory is used to display
        // content and the local directory is used to extract the files. Mixing / and \
        // may be used to display \ to windows users and use / when extracting the files.
        // Unfortunately, this lead also to some issues : http://seclists.org/fulldisclosure/2009/Sep/394
        this.fileNameLength = reader.readInt(2);
        localExtraFieldsLength = reader.readInt(2); // can't be sure this will be the same as the central dir
        // the fileName is stored as binary data, the handleUTF8 method will take care of the encoding.
        this.fileName = reader.readData(this.fileNameLength);
        reader.skip(localExtraFieldsLength);

        if (this.compressedSize === -1 || this.uncompressedSize === -1) {
            throw new Error("Bug or corrupted zip : didn't get enough informations from the central directory " + "(compressedSize === -1 || uncompressedSize === -1)");
        }

        compression = findCompression(this.compressionMethod);
        if (compression === null) { // no compression found
            throw new Error("Corrupted zip : compression " + utils.pretty(this.compressionMethod) + " unknown (inner file : " + utils.transformTo("string", this.fileName) + ")");
        }
        this.decompressed = new CompressedObject(this.compressedSize, this.uncompressedSize, this.crc32, compression, reader.readData(this.compressedSize));
    },

    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readCentralPart: function(reader) {
        this.versionMadeBy = reader.readInt(2);
        reader.skip(2);
        // this.versionNeeded = reader.readInt(2);
        this.bitFlag = reader.readInt(2);
        this.compressionMethod = reader.readString(2);
        this.date = reader.readDate();
        this.crc32 = reader.readInt(4);
        this.compressedSize = reader.readInt(4);
        this.uncompressedSize = reader.readInt(4);
        var fileNameLength = reader.readInt(2);
        this.extraFieldsLength = reader.readInt(2);
        this.fileCommentLength = reader.readInt(2);
        this.diskNumberStart = reader.readInt(2);
        this.internalFileAttributes = reader.readInt(2);
        this.externalFileAttributes = reader.readInt(4);
        this.localHeaderOffset = reader.readInt(4);

        if (this.isEncrypted()) {
            throw new Error("Encrypted zip are not supported");
        }

        // will be read in the local part, see the comments there
        reader.skip(fileNameLength);
        this.readExtraFields(reader);
        this.parseZIP64ExtraField(reader);
        this.fileComment = reader.readData(this.fileCommentLength);
    },

    /**
     * Parse the external file attributes and get the unix/dos permissions.
     */
    processAttributes: function () {
        this.unixPermissions = null;
        this.dosPermissions = null;
        var madeBy = this.versionMadeBy >> 8;

        // Check if we have the DOS directory flag set.
        // We look for it in the DOS and UNIX permissions
        // but some unknown platform could set it as a compatibility flag.
        this.dir = this.externalFileAttributes & 0x0010 ? true : false;

        if(madeBy === MADE_BY_DOS) {
            // first 6 bits (0 to 5)
            this.dosPermissions = this.externalFileAttributes & 0x3F;
        }

        if(madeBy === MADE_BY_UNIX) {
            this.unixPermissions = (this.externalFileAttributes >> 16) & 0xFFFF;
            // the octal permissions are in (this.unixPermissions & 0x01FF).toString(8);
        }

        // fail safe : if the name ends with a / it probably means a folder
        if (!this.dir && this.fileNameStr.slice(-1) === '/') {
            this.dir = true;
        }
    },

    /**
     * Parse the ZIP64 extra field and merge the info in the current ZipEntry.
     * @param {DataReader} reader the reader to use.
     */
    parseZIP64ExtraField: function(reader) {

        if (!this.extraFields[0x0001]) {
            return;
        }

        // should be something, preparing the extra reader
        var extraReader = readerFor(this.extraFields[0x0001].value);

        // I really hope that these 64bits integer can fit in 32 bits integer, because js
        // won't let us have more.
        if (this.uncompressedSize === utils.MAX_VALUE_32BITS) {
            this.uncompressedSize = extraReader.readInt(8);
        }
        if (this.compressedSize === utils.MAX_VALUE_32BITS) {
            this.compressedSize = extraReader.readInt(8);
        }
        if (this.localHeaderOffset === utils.MAX_VALUE_32BITS) {
            this.localHeaderOffset = extraReader.readInt(8);
        }
        if (this.diskNumberStart === utils.MAX_VALUE_32BITS) {
            this.diskNumberStart = extraReader.readInt(4);
        }
    },
    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readExtraFields: function(reader) {
        var end = reader.index + this.extraFieldsLength,
            extraFieldId,
            extraFieldLength,
            extraFieldValue;

        if (!this.extraFields) {
            this.extraFields = {};
        }

        while (reader.index < end) {
            extraFieldId = reader.readInt(2);
            extraFieldLength = reader.readInt(2);
            extraFieldValue = reader.readData(extraFieldLength);

            this.extraFields[extraFieldId] = {
                id: extraFieldId,
                length: extraFieldLength,
                value: extraFieldValue
            };
        }
    },
    /**
     * Apply an UTF8 transformation if needed.
     */
    handleUTF8: function() {
        var decodeParamType = support.uint8array ? "uint8array" : "array";
        if (this.useUTF8()) {
            this.fileNameStr = utf8.utf8decode(this.fileName);
            this.fileCommentStr = utf8.utf8decode(this.fileComment);
        } else {
            var upath = this.findExtraFieldUnicodePath();
            if (upath !== null) {
                this.fileNameStr = upath;
            } else {
                // ASCII text or unsupported code page
                var fileNameByteArray =  utils.transformTo(decodeParamType, this.fileName);
                this.fileNameStr = this.loadOptions.decodeFileName(fileNameByteArray);
            }

            var ucomment = this.findExtraFieldUnicodeComment();
            if (ucomment !== null) {
                this.fileCommentStr = ucomment;
            } else {
                // ASCII text or unsupported code page
                var commentByteArray =  utils.transformTo(decodeParamType, this.fileComment);
                this.fileCommentStr = this.loadOptions.decodeFileName(commentByteArray);
            }
        }
    },

    /**
     * Find the unicode path declared in the extra field, if any.
     * @return {String} the unicode path, null otherwise.
     */
    findExtraFieldUnicodePath: function() {
        var upathField = this.extraFields[0x7075];
        if (upathField) {
            var extraReader = readerFor(upathField.value);

            // wrong version
            if (extraReader.readInt(1) !== 1) {
                return null;
            }

            // the crc of the filename changed, this field is out of date.
            if (crc32fn(this.fileName) !== extraReader.readInt(4)) {
                return null;
            }

            return utf8.utf8decode(extraReader.readData(upathField.length - 5));
        }
        return null;
    },

    /**
     * Find the unicode comment declared in the extra field, if any.
     * @return {String} the unicode comment, null otherwise.
     */
    findExtraFieldUnicodeComment: function() {
        var ucommentField = this.extraFields[0x6375];
        if (ucommentField) {
            var extraReader = readerFor(ucommentField.value);

            // wrong version
            if (extraReader.readInt(1) !== 1) {
                return null;
            }

            // the crc of the comment changed, this field is out of date.
            if (crc32fn(this.fileComment) !== extraReader.readInt(4)) {
                return null;
            }

            return utf8.utf8decode(extraReader.readData(ucommentField.length - 5));
        }
        return null;
    }
};
module.exports = ZipEntry;

},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(require,module,exports){
'use strict';

var StreamHelper = require('./stream/StreamHelper');
var DataWorker = require('./stream/DataWorker');
var utf8 = require('./utf8');
var CompressedObject = require('./compressedObject');
var GenericWorker = require('./stream/GenericWorker');

/**
 * A simple object representing a file in the zip file.
 * @constructor
 * @param {string} name the name of the file
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data
 * @param {Object} options the options of the file
 */
var ZipObject = function(name, data, options) {
    this.name = name;
    this.dir = options.dir;
    this.date = options.date;
    this.comment = options.comment;
    this.unixPermissions = options.unixPermissions;
    this.dosPermissions = options.dosPermissions;

    this._data = data;
    this._dataBinary = options.binary;
    // keep only the compression
    this.options = {
        compression : options.compression,
        compressionOptions : options.compressionOptions
    };
};

ZipObject.prototype = {
    /**
     * Create an internal stream for the content of this object.
     * @param {String} type the type of each chunk.
     * @return StreamHelper the stream.
     */
    internalStream: function (type) {
        var result = null, outputType = "string";
        try {
            if (!type) {
                throw new Error("No output type specified.");
            }
            outputType = type.toLowerCase();
            var askUnicodeString = outputType === "string" || outputType === "text";
            if (outputType === "binarystring" || outputType === "text") {
                outputType = "string";
            }
            result = this._decompressWorker();

            var isUnicodeString = !this._dataBinary;

            if (isUnicodeString && !askUnicodeString) {
                result = result.pipe(new utf8.Utf8EncodeWorker());
            }
            if (!isUnicodeString && askUnicodeString) {
                result = result.pipe(new utf8.Utf8DecodeWorker());
            }
        } catch (e) {
            result = new GenericWorker("error");
            result.error(e);
        }

        return new StreamHelper(result, outputType, "");
    },

    /**
     * Prepare the content in the asked type.
     * @param {String} type the type of the result.
     * @param {Function} onUpdate a function to call on each internal update.
     * @return Promise the promise of the result.
     */
    async: function (type, onUpdate) {
        return this.internalStream(type).accumulate(onUpdate);
    },

    /**
     * Prepare the content as a nodejs stream.
     * @param {String} type the type of each chunk.
     * @param {Function} onUpdate a function to call on each internal update.
     * @return Stream the stream.
     */
    nodeStream: function (type, onUpdate) {
        return this.internalStream(type || "nodebuffer").toNodejsStream(onUpdate);
    },

    /**
     * Return a worker for the compressed content.
     * @private
     * @param {Object} compression the compression object to use.
     * @param {Object} compressionOptions the options to use when compressing.
     * @return Worker the worker.
     */
    _compressWorker: function (compression, compressionOptions) {
        if (
            this._data instanceof CompressedObject &&
            this._data.compression.magic === compression.magic
        ) {
            return this._data.getCompressedWorker();
        } else {
            var result = this._decompressWorker();
            if(!this._dataBinary) {
                result = result.pipe(new utf8.Utf8EncodeWorker());
            }
            return CompressedObject.createWorkerFrom(result, compression, compressionOptions);
        }
    },
    /**
     * Return a worker for the decompressed content.
     * @private
     * @return Worker the worker.
     */
    _decompressWorker : function () {
        if (this._data instanceof CompressedObject) {
            return this._data.getContentWorker();
        } else if (this._data instanceof GenericWorker) {
            return this._data;
        } else {
            return new DataWorker(this._data);
        }
    }
};

var removedMethods = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"];
var removedFn = function () {
    throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
};

for(var i = 0; i < removedMethods.length; i++) {
    ZipObject.prototype[removedMethods[i]] = removedFn;
}
module.exports = ZipObject;

},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(require,module,exports){
(function (global){
'use strict';
var Mutation = global.MutationObserver || global.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = global.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
    var channel = new global.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = global.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      global.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

module.exports = immediate;
function immediate(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],37:[function(require,module,exports){
'use strict';
var immediate = require('immediate');

/* istanbul ignore next */
function INTERNAL() {}

var handlers = {};

var REJECTED = ['REJECTED'];
var FULFILLED = ['FULFILLED'];
var PENDING = ['PENDING'];

module.exports = Promise;

function Promise(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING;
  this.queue = [];
  this.outcome = void 0;
  if (resolver !== INTERNAL) {
    safelyResolveThenable(this, resolver);
  }
}

Promise.prototype["finally"] = function (callback) {
  if (typeof callback !== 'function') {
    return this;
  }
  var p = this.constructor;
  return this.then(resolve, reject);

  function resolve(value) {
    function yes () {
      return value;
    }
    return p.resolve(callback()).then(yes);
  }
  function reject(reason) {
    function no () {
      throw reason;
    }
    return p.resolve(callback()).then(no);
  }
};
Promise.prototype["catch"] = function (onRejected) {
  return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
    typeof onRejected !== 'function' && this.state === REJECTED) {
    return this;
  }
  var promise = new this.constructor(INTERNAL);
  if (this.state !== PENDING) {
    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
    unwrap(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem.prototype.callFulfilled = function (value) {
  handlers.resolve(this.promise, value);
};
QueueItem.prototype.otherCallFulfilled = function (value) {
  unwrap(this.promise, this.onFulfilled, value);
};
QueueItem.prototype.callRejected = function (value) {
  handlers.reject(this.promise, value);
};
QueueItem.prototype.otherCallRejected = function (value) {
  unwrap(this.promise, this.onRejected, value);
};

function unwrap(promise, func, value) {
  immediate(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers.resolve(promise, returnValue);
    }
  });
}

handlers.resolve = function (self, value) {
  var result = tryCatch(getThen, value);
  if (result.status === 'error') {
    return handlers.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable(self, thenable);
  } else {
    self.state = FULFILLED;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers.reject = function (self, error) {
  self.state = REJECTED;
  self.outcome = error;
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && (typeof obj === 'object' || typeof obj === 'function') && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

Promise.resolve = resolve;
function resolve(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers.resolve(new this(INTERNAL), value);
}

Promise.reject = reject;
function reject(reason) {
  var promise = new this(INTERNAL);
  return handlers.reject(promise, reason);
}

Promise.all = all;
function all(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers.resolve(promise, values);
      }
    }
  }
}

Promise.race = race;
function race(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
  }
}

},{"immediate":36}],38:[function(require,module,exports){
// Top level file is just a mixin of submodules & constants
'use strict';

var assign    = require('./lib/utils/common').assign;

var deflate   = require('./lib/deflate');
var inflate   = require('./lib/inflate');
var constants = require('./lib/zlib/constants');

var pako = {};

assign(pako, deflate, inflate, constants);

module.exports = pako;

},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(require,module,exports){
'use strict';


var zlib_deflate = require('./zlib/deflate');
var utils        = require('./utils/common');
var strings      = require('./utils/strings');
var msg          = require('./zlib/messages');
var ZStream      = require('./zlib/zstream');

var toString = Object.prototype.toString;

/* Public constants ==========================================================*/
/* ===========================================================================*/

var Z_NO_FLUSH      = 0;
var Z_FINISH        = 4;

var Z_OK            = 0;
var Z_STREAM_END    = 1;
var Z_SYNC_FLUSH    = 2;

var Z_DEFAULT_COMPRESSION = -1;

var Z_DEFAULT_STRATEGY    = 0;

var Z_DEFLATED  = 8;

/* ===========================================================================*/


/**
 * class Deflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[deflate]],
 * [[deflateRaw]] and [[gzip]].
 **/

/* internal
 * Deflate.chunks -> Array
 *
 * Chunks of output data, if [[Deflate#onData]] not overriden.
 **/

/**
 * Deflate.result -> Uint8Array|Array
 *
 * Compressed result, generated by default [[Deflate#onData]]
 * and [[Deflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Deflate#push]] with `Z_FINISH` / `true` param)  or if you
 * push a chunk with explicit flush (call [[Deflate#push]] with
 * `Z_SYNC_FLUSH` param).
 **/

/**
 * Deflate.err -> Number
 *
 * Error code after deflate finished. 0 (Z_OK) on success.
 * You will not need it in real life, because deflate errors
 * are possible only on wrong options or bad `onData` / `onEnd`
 * custom handlers.
 **/

/**
 * Deflate.msg -> String
 *
 * Error message, if [[Deflate.err]] != 0
 **/


/**
 * new Deflate(options)
 * - options (Object): zlib deflate options.
 *
 * Creates new deflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `level`
 * - `windowBits`
 * - `memLevel`
 * - `strategy`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw deflate
 * - `gzip` (Boolean) - create gzip wrapper
 * - `to` (String) - if equal to 'string', then result will be "binary string"
 *    (each char code [0..255])
 * - `header` (Object) - custom header for gzip
 *   - `text` (Boolean) - true if compressed data believed to be text
 *   - `time` (Number) - modification time, unix timestamp
 *   - `os` (Number) - operation system code
 *   - `extra` (Array) - array of bytes with extra data (max 65536)
 *   - `name` (String) - file name (binary string)
 *   - `comment` (String) - comment (binary string)
 *   - `hcrc` (Boolean) - true if header crc should be added
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * var deflate = new pako.Deflate({ level: 3});
 *
 * deflate.push(chunk1, false);
 * deflate.push(chunk2, true);  // true -> last chunk
 *
 * if (deflate.err) { throw new Error(deflate.err); }
 *
 * console.log(deflate.result);
 * ```
 **/
function Deflate(options) {
  if (!(this instanceof Deflate)) return new Deflate(options);

  this.options = utils.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY,
    to: ''
  }, options || {});

  var opt = this.options;

  if (opt.raw && (opt.windowBits > 0)) {
    opt.windowBits = -opt.windowBits;
  }

  else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
    opt.windowBits += 16;
  }

  this.err    = 0;      // error code, if happens (0 = Z_OK)
  this.msg    = '';     // error message
  this.ended  = false;  // used to avoid multiple onEnd() calls
  this.chunks = [];     // chunks of compressed data

  this.strm = new ZStream();
  this.strm.avail_out = 0;

  var status = zlib_deflate.deflateInit2(
    this.strm,
    opt.level,
    opt.method,
    opt.windowBits,
    opt.memLevel,
    opt.strategy
  );

  if (status !== Z_OK) {
    throw new Error(msg[status]);
  }

  if (opt.header) {
    zlib_deflate.deflateSetHeader(this.strm, opt.header);
  }

  if (opt.dictionary) {
    var dict;
    // Convert data if needed
    if (typeof opt.dictionary === 'string') {
      // If we need to compress text, change encoding to utf8.
      dict = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
      dict = new Uint8Array(opt.dictionary);
    } else {
      dict = opt.dictionary;
    }

    status = zlib_deflate.deflateSetDictionary(this.strm, dict);

    if (status !== Z_OK) {
      throw new Error(msg[status]);
    }

    this._dict_set = true;
  }
}

/**
 * Deflate#push(data[, mode]) -> Boolean
 * - data (Uint8Array|Array|ArrayBuffer|String): input data. Strings will be
 *   converted to utf8 byte sequence.
 * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
 *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` meansh Z_FINISH.
 *
 * Sends input data to deflate pipe, generating [[Deflate#onData]] calls with
 * new compressed chunks. Returns `true` on success. The last data block must have
 * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
 * [[Deflate#onEnd]]. For interim explicit flushes (without ending the stream) you
 * can use mode Z_SYNC_FLUSH, keeping the compression context.
 *
 * On fail call [[Deflate#onEnd]] with error code and return false.
 *
 * We strongly recommend to use `Uint8Array` on input for best speed (output
 * array format is detected automatically). Also, don't skip last param and always
 * use the same type in your code (boolean or number). That will improve JS speed.
 *
 * For regular `Array`-s make sure all elements are [0..255].
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/
Deflate.prototype.push = function (data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var status, _mode;

  if (this.ended) { return false; }

  _mode = (mode === ~~mode) ? mode : ((mode === true) ? Z_FINISH : Z_NO_FLUSH);

  // Convert data if needed
  if (typeof data === 'string') {
    // If we need to compress text, change encoding to utf8.
    strm.input = strings.string2buf(data);
  } else if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new utils.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = zlib_deflate.deflate(strm, _mode);    /* no bad return value */

    if (status !== Z_STREAM_END && status !== Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }
    if (strm.avail_out === 0 || (strm.avail_in === 0 && (_mode === Z_FINISH || _mode === Z_SYNC_FLUSH))) {
      if (this.options.to === 'string') {
        this.onData(strings.buf2binstring(utils.shrinkBuf(strm.output, strm.next_out)));
      } else {
        this.onData(utils.shrinkBuf(strm.output, strm.next_out));
      }
    }
  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END);

  // Finalize on the last chunk.
  if (_mode === Z_FINISH) {
    status = zlib_deflate.deflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === Z_OK;
  }

  // callback interim results if Z_SYNC_FLUSH.
  if (_mode === Z_SYNC_FLUSH) {
    this.onEnd(Z_OK);
    strm.avail_out = 0;
    return true;
  }

  return true;
};


/**
 * Deflate#onData(chunk) -> Void
 * - chunk (Uint8Array|Array|String): ouput data. Type of array depends
 *   on js engine support. When string output requested, each chunk
 *   will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/
Deflate.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};


/**
 * Deflate#onEnd(status) -> Void
 * - status (Number): deflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called once after you tell deflate that the input stream is
 * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
 * or if an error happened. By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/
Deflate.prototype.onEnd = function (status) {
  // On success - join
  if (status === Z_OK) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = utils.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};


/**
 * deflate(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * Compress `data` with deflate algorithm and `options`.
 *
 * Supported options are:
 *
 * - level
 * - windowBits
 * - memLevel
 * - strategy
 * - dictionary
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be "binary string"
 *    (each char code [0..255])
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , data = Uint8Array([1,2,3,4,5,6,7,8,9]);
 *
 * console.log(pako.deflate(data));
 * ```
 **/
function deflate(input, options) {
  var deflator = new Deflate(options);

  deflator.push(input, true);

  // That will never happens, if you don't cheat with options :)
  if (deflator.err) { throw deflator.msg || msg[deflator.err]; }

  return deflator.result;
}


/**
 * deflateRaw(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function deflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return deflate(input, options);
}


/**
 * gzip(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but create gzip wrapper instead of
 * deflate one.
 **/
function gzip(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate(input, options);
}


exports.Deflate = Deflate;
exports.deflate = deflate;
exports.deflateRaw = deflateRaw;
exports.gzip = gzip;

},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(require,module,exports){
'use strict';


var zlib_inflate = require('./zlib/inflate');
var utils        = require('./utils/common');
var strings      = require('./utils/strings');
var c            = require('./zlib/constants');
var msg          = require('./zlib/messages');
var ZStream      = require('./zlib/zstream');
var GZheader     = require('./zlib/gzheader');

var toString = Object.prototype.toString;

/**
 * class Inflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[inflate]]
 * and [[inflateRaw]].
 **/

/* internal
 * inflate.chunks -> Array
 *
 * Chunks of output data, if [[Inflate#onData]] not overriden.
 **/

/**
 * Inflate.result -> Uint8Array|Array|String
 *
 * Uncompressed result, generated by default [[Inflate#onData]]
 * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Inflate#push]] with `Z_FINISH` / `true` param) or if you
 * push a chunk with explicit flush (call [[Inflate#push]] with
 * `Z_SYNC_FLUSH` param).
 **/

/**
 * Inflate.err -> Number
 *
 * Error code after inflate finished. 0 (Z_OK) on success.
 * Should be checked if broken data possible.
 **/

/**
 * Inflate.msg -> String
 *
 * Error message, if [[Inflate.err]] != 0
 **/


/**
 * new Inflate(options)
 * - options (Object): zlib inflate options.
 *
 * Creates new inflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `windowBits`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw inflate
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 * By default, when no options set, autodetect deflate/gzip data format via
 * wrapper header.
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * var inflate = new pako.Inflate({ level: 3});
 *
 * inflate.push(chunk1, false);
 * inflate.push(chunk2, true);  // true -> last chunk
 *
 * if (inflate.err) { throw new Error(inflate.err); }
 *
 * console.log(inflate.result);
 * ```
 **/
function Inflate(options) {
  if (!(this instanceof Inflate)) return new Inflate(options);

  this.options = utils.assign({
    chunkSize: 16384,
    windowBits: 0,
    to: ''
  }, options || {});

  var opt = this.options;

  // Force window size for `raw` data, if not set directly,
  // because we have no header for autodetect.
  if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) { opt.windowBits = -15; }
  }

  // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate
  if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
      !(options && options.windowBits)) {
    opt.windowBits += 32;
  }

  // Gzip header has no info about windows size, we can do autodetect only
  // for deflate. So, if window size not set, force it to max when gzip possible
  if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
    // bit 3 (16) -> gzipped data
    // bit 4 (32) -> autodetect gzip/deflate
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }

  this.err    = 0;      // error code, if happens (0 = Z_OK)
  this.msg    = '';     // error message
  this.ended  = false;  // used to avoid multiple onEnd() calls
  this.chunks = [];     // chunks of compressed data

  this.strm   = new ZStream();
  this.strm.avail_out = 0;

  var status  = zlib_inflate.inflateInit2(
    this.strm,
    opt.windowBits
  );

  if (status !== c.Z_OK) {
    throw new Error(msg[status]);
  }

  this.header = new GZheader();

  zlib_inflate.inflateGetHeader(this.strm, this.header);
}

/**
 * Inflate#push(data[, mode]) -> Boolean
 * - data (Uint8Array|Array|ArrayBuffer|String): input data
 * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
 *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` meansh Z_FINISH.
 *
 * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
 * new output chunks. Returns `true` on success. The last data block must have
 * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
 * [[Inflate#onEnd]]. For interim explicit flushes (without ending the stream) you
 * can use mode Z_SYNC_FLUSH, keeping the decompression context.
 *
 * On fail call [[Inflate#onEnd]] with error code and return false.
 *
 * We strongly recommend to use `Uint8Array` on input for best speed (output
 * format is detected automatically). Also, don't skip last param and always
 * use the same type in your code (boolean or number). That will improve JS speed.
 *
 * For regular `Array`-s make sure all elements are [0..255].
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/
Inflate.prototype.push = function (data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var dictionary = this.options.dictionary;
  var status, _mode;
  var next_out_utf8, tail, utf8str;
  var dict;

  // Flag to properly process Z_BUF_ERROR on testing inflate call
  // when we check that all output data was flushed.
  var allowBufError = false;

  if (this.ended) { return false; }
  _mode = (mode === ~~mode) ? mode : ((mode === true) ? c.Z_FINISH : c.Z_NO_FLUSH);

  // Convert data if needed
  if (typeof data === 'string') {
    // Only binary strings can be decompressed on practice
    strm.input = strings.binstring2buf(data);
  } else if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new utils.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }

    status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);    /* no bad return value */

    if (status === c.Z_NEED_DICT && dictionary) {
      // Convert data if needed
      if (typeof dictionary === 'string') {
        dict = strings.string2buf(dictionary);
      } else if (toString.call(dictionary) === '[object ArrayBuffer]') {
        dict = new Uint8Array(dictionary);
      } else {
        dict = dictionary;
      }

      status = zlib_inflate.inflateSetDictionary(this.strm, dict);

    }

    if (status === c.Z_BUF_ERROR && allowBufError === true) {
      status = c.Z_OK;
      allowBufError = false;
    }

    if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }

    if (strm.next_out) {
      if (strm.avail_out === 0 || status === c.Z_STREAM_END || (strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH))) {

        if (this.options.to === 'string') {

          next_out_utf8 = strings.utf8border(strm.output, strm.next_out);

          tail = strm.next_out - next_out_utf8;
          utf8str = strings.buf2string(strm.output, next_out_utf8);

          // move tail
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) { utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0); }

          this.onData(utf8str);

        } else {
          this.onData(utils.shrinkBuf(strm.output, strm.next_out));
        }
      }
    }

    // When no more input data, we should check that internal inflate buffers
    // are flushed. The only way to do it when avail_out = 0 - run one more
    // inflate pass. But if output data not exists, inflate return Z_BUF_ERROR.
    // Here we set flag to process this error properly.
    //
    // NOTE. Deflate does not return error in this case and does not needs such
    // logic.
    if (strm.avail_in === 0 && strm.avail_out === 0) {
      allowBufError = true;
    }

  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);

  if (status === c.Z_STREAM_END) {
    _mode = c.Z_FINISH;
  }

  // Finalize on the last chunk.
  if (_mode === c.Z_FINISH) {
    status = zlib_inflate.inflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === c.Z_OK;
  }

  // callback interim results if Z_SYNC_FLUSH.
  if (_mode === c.Z_SYNC_FLUSH) {
    this.onEnd(c.Z_OK);
    strm.avail_out = 0;
    return true;
  }

  return true;
};


/**
 * Inflate#onData(chunk) -> Void
 * - chunk (Uint8Array|Array|String): ouput data. Type of array depends
 *   on js engine support. When string output requested, each chunk
 *   will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/
Inflate.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};


/**
 * Inflate#onEnd(status) -> Void
 * - status (Number): inflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called either after you tell inflate that the input stream is
 * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
 * or if an error happened. By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/
Inflate.prototype.onEnd = function (status) {
  // On success - join
  if (status === c.Z_OK) {
    if (this.options.to === 'string') {
      // Glue & convert here, until we teach pako to send
      // utf8 alligned strings to onData
      this.result = this.chunks.join('');
    } else {
      this.result = utils.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};


/**
 * inflate(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Decompress `data` with inflate/ungzip and `options`. Autodetect
 * format via wrapper header by default. That's why we don't provide
 * separate `ungzip` method.
 *
 * Supported options are:
 *
 * - windowBits
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , input = pako.deflate([1,2,3,4,5,6,7,8,9])
 *   , output;
 *
 * try {
 *   output = pako.inflate(input);
 * } catch (err)
 *   console.log(err);
 * }
 * ```
 **/
function inflate(input, options) {
  var inflator = new Inflate(options);

  inflator.push(input, true);

  // That will never happens, if you don't cheat with options :)
  if (inflator.err) { throw inflator.msg || msg[inflator.err]; }

  return inflator.result;
}


/**
 * inflateRaw(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * The same as [[inflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function inflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return inflate(input, options);
}


/**
 * ungzip(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Just shortcut to [[inflate]], because it autodetects format
 * by header.content. Done for convenience.
 **/


exports.Inflate = Inflate;
exports.inflate = inflate;
exports.inflateRaw = inflateRaw;
exports.ungzip  = inflate;

},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(require,module,exports){
'use strict';


var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
                (typeof Uint16Array !== 'undefined') &&
                (typeof Int32Array !== 'undefined');


exports.assign = function (obj /*from1, from2, from3, ...*/) {
  var sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    var source = sources.shift();
    if (!source) { continue; }

    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }

    for (var p in source) {
      if (source.hasOwnProperty(p)) {
        obj[p] = source[p];
      }
    }
  }

  return obj;
};


// reduce buffer size, avoiding mem copy
exports.shrinkBuf = function (buf, size) {
  if (buf.length === size) { return buf; }
  if (buf.subarray) { return buf.subarray(0, size); }
  buf.length = size;
  return buf;
};


var fnTyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    if (src.subarray && dest.subarray) {
      dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
      return;
    }
    // Fallback to ordinary array
    for (var i = 0; i < len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function (chunks) {
    var i, l, len, pos, chunk, result;

    // calculate data length
    len = 0;
    for (i = 0, l = chunks.length; i < l; i++) {
      len += chunks[i].length;
    }

    // join chunks
    result = new Uint8Array(len);
    pos = 0;
    for (i = 0, l = chunks.length; i < l; i++) {
      chunk = chunks[i];
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return result;
  }
};

var fnUntyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    for (var i = 0; i < len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function (chunks) {
    return [].concat.apply([], chunks);
  }
};


// Enable/Disable typed arrays use, for testing
//
exports.setTyped = function (on) {
  if (on) {
    exports.Buf8  = Uint8Array;
    exports.Buf16 = Uint16Array;
    exports.Buf32 = Int32Array;
    exports.assign(exports, fnTyped);
  } else {
    exports.Buf8  = Array;
    exports.Buf16 = Array;
    exports.Buf32 = Array;
    exports.assign(exports, fnUntyped);
  }
};

exports.setTyped(TYPED_OK);

},{}],42:[function(require,module,exports){
// String encode/decode helpers
'use strict';


var utils = require('./common');


// Quick check if we can use fast array to bin string conversion
//
// - apply(Array) can fail on Android 2.2
// - apply(Uint8Array) can fail on iOS 5.1 Safary
//
var STR_APPLY_OK = true;
var STR_APPLY_UIA_OK = true;

try { String.fromCharCode.apply(null, [ 0 ]); } catch (__) { STR_APPLY_OK = false; }
try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch (__) { STR_APPLY_UIA_OK = false; }


// Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff
var _utf8len = new utils.Buf8(256);
for (var q = 0; q < 256; q++) {
  _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
}
_utf8len[254] = _utf8len[254] = 1; // Invalid sequence start


// convert string to array (typed, when possible)
exports.string2buf = function (str) {
  var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

  // count binary size
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  // allocate buffer
  buf = new utils.Buf8(buf_len);

  // convert
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    if (c < 0x80) {
      /* one byte */
      buf[i++] = c;
    } else if (c < 0x800) {
      /* two bytes */
      buf[i++] = 0xC0 | (c >>> 6);
      buf[i++] = 0x80 | (c & 0x3f);
    } else if (c < 0x10000) {
      /* three bytes */
      buf[i++] = 0xE0 | (c >>> 12);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    } else {
      /* four bytes */
      buf[i++] = 0xf0 | (c >>> 18);
      buf[i++] = 0x80 | (c >>> 12 & 0x3f);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    }
  }

  return buf;
};

// Helper (used in 2 places)
function buf2binstring(buf, len) {
  // use fallback for big arrays to avoid stack overflow
  if (len < 65537) {
    if ((buf.subarray && STR_APPLY_UIA_OK) || (!buf.subarray && STR_APPLY_OK)) {
      return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len));
    }
  }

  var result = '';
  for (var i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
}


// Convert byte array to binary string
exports.buf2binstring = function (buf) {
  return buf2binstring(buf, buf.length);
};


// Convert binary string (typed, when possible)
exports.binstring2buf = function (str) {
  var buf = new utils.Buf8(str.length);
  for (var i = 0, len = buf.length; i < len; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
};


// convert array to string
exports.buf2string = function (buf, max) {
  var i, out, c, c_len;
  var len = max || buf.length;

  // Reserve max possible length (2 words per char)
  // NB: by unknown reasons, Array is significantly faster for
  //     String.fromCharCode.apply than Uint16Array.
  var utf16buf = new Array(len * 2);

  for (out = 0, i = 0; i < len;) {
    c = buf[i++];
    // quick process ascii
    if (c < 0x80) { utf16buf[out++] = c; continue; }

    c_len = _utf8len[c];
    // skip 5 & 6 byte codes
    if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len - 1; continue; }

    // apply mask on first byte
    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
    // join the rest
    while (c_len > 1 && i < len) {
      c = (c << 6) | (buf[i++] & 0x3f);
      c_len--;
    }

    // terminated by end of string?
    if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

    if (c < 0x10000) {
      utf16buf[out++] = c;
    } else {
      c -= 0x10000;
      utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
      utf16buf[out++] = 0xdc00 | (c & 0x3ff);
    }
  }

  return buf2binstring(utf16buf, out);
};


// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
exports.utf8border = function (buf, max) {
  var pos;

  max = max || buf.length;
  if (max > buf.length) { max = buf.length; }

  // go back from last position, until start of sequence found
  pos = max - 1;
  while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

  // Fuckup - very small and broken sequence,
  // return max, because we should return something anyway.
  if (pos < 0) { return max; }

  // If we came to start of buffer - that means vuffer is too small,
  // return max too.
  if (pos === 0) { return max; }

  return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};

},{"./common":41}],43:[function(require,module,exports){
'use strict';

// Note: adler32 takes 12% for level 0 and 2% for level 6.
// It doesn't worth to make additional optimizationa as in original.
// Small size is preferable.

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function adler32(adler, buf, len, pos) {
  var s1 = (adler & 0xffff) |0,
      s2 = ((adler >>> 16) & 0xffff) |0,
      n = 0;

  while (len !== 0) {
    // Set limit ~ twice less than 5552, to keep
    // s2 in 31-bits, because we force signed ints.
    // in other case %= will fail.
    n = len > 2000 ? 2000 : len;
    len -= n;

    do {
      s1 = (s1 + buf[pos++]) |0;
      s2 = (s2 + s1) |0;
    } while (--n);

    s1 %= 65521;
    s2 %= 65521;
  }

  return (s1 | (s2 << 16)) |0;
}


module.exports = adler32;

},{}],44:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

module.exports = {

  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH:         0,
  Z_PARTIAL_FLUSH:    1,
  Z_SYNC_FLUSH:       2,
  Z_FULL_FLUSH:       3,
  Z_FINISH:           4,
  Z_BLOCK:            5,
  Z_TREES:            6,

  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK:               0,
  Z_STREAM_END:       1,
  Z_NEED_DICT:        2,
  Z_ERRNO:           -1,
  Z_STREAM_ERROR:    -2,
  Z_DATA_ERROR:      -3,
  //Z_MEM_ERROR:     -4,
  Z_BUF_ERROR:       -5,
  //Z_VERSION_ERROR: -6,

  /* compression levels */
  Z_NO_COMPRESSION:         0,
  Z_BEST_SPEED:             1,
  Z_BEST_COMPRESSION:       9,
  Z_DEFAULT_COMPRESSION:   -1,


  Z_FILTERED:               1,
  Z_HUFFMAN_ONLY:           2,
  Z_RLE:                    3,
  Z_FIXED:                  4,
  Z_DEFAULT_STRATEGY:       0,

  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY:                 0,
  Z_TEXT:                   1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN:                2,

  /* The deflate compression method */
  Z_DEFLATED:               8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};

},{}],45:[function(require,module,exports){
'use strict';

// Note: we can't get significant speed boost here.
// So write code to minimize size - no pregenerated tables
// and array tools dependencies.

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// Use ordinary array, since untyped makes no boost here
function makeTable() {
  var c, table = [];

  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }

  return table;
}

// Create table on load. Just 255 signed longs. Not a problem.
var crcTable = makeTable();


function crc32(crc, buf, len, pos) {
  var t = crcTable,
      end = pos + len;

  crc ^= -1;

  for (var i = pos; i < end; i++) {
    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  }

  return (crc ^ (-1)); // >>> 0;
}


module.exports = crc32;

},{}],46:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var utils   = require('../utils/common');
var trees   = require('./trees');
var adler32 = require('./adler32');
var crc32   = require('./crc32');
var msg     = require('./messages');

/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
var Z_NO_FLUSH      = 0;
var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
var Z_FULL_FLUSH    = 3;
var Z_FINISH        = 4;
var Z_BLOCK         = 5;
//var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK            = 0;
var Z_STREAM_END    = 1;
//var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
//var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;


/* compression levels */
//var Z_NO_COMPRESSION      = 0;
//var Z_BEST_SPEED          = 1;
//var Z_BEST_COMPRESSION    = 9;
var Z_DEFAULT_COMPRESSION = -1;


var Z_FILTERED            = 1;
var Z_HUFFMAN_ONLY        = 2;
var Z_RLE                 = 3;
var Z_FIXED               = 4;
var Z_DEFAULT_STRATEGY    = 0;

/* Possible values of the data_type field (though see inflate()) */
//var Z_BINARY              = 0;
//var Z_TEXT                = 1;
//var Z_ASCII               = 1; // = Z_TEXT
var Z_UNKNOWN             = 2;


/* The deflate compression method */
var Z_DEFLATED  = 8;

/*============================================================================*/


var MAX_MEM_LEVEL = 9;
/* Maximum value for memLevel in deflateInit2 */
var MAX_WBITS = 15;
/* 32K LZ77 window */
var DEF_MEM_LEVEL = 8;


var LENGTH_CODES  = 29;
/* number of length codes, not counting the special END_BLOCK code */
var LITERALS      = 256;
/* number of literal bytes 0..255 */
var L_CODES       = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */
var D_CODES       = 30;
/* number of distance codes */
var BL_CODES      = 19;
/* number of codes used to transfer the bit lengths */
var HEAP_SIZE     = 2 * L_CODES + 1;
/* maximum heap size */
var MAX_BITS  = 15;
/* All codes must not exceed MAX_BITS bits */

var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

var PRESET_DICT = 0x20;

var INIT_STATE = 42;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;

var BS_NEED_MORE      = 1; /* block not completed, need more input or more output */
var BS_BLOCK_DONE     = 2; /* block flush performed */
var BS_FINISH_STARTED = 3; /* finish started, need only more output at next deflate */
var BS_FINISH_DONE    = 4; /* finish done, accept no more input or output */

var OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

function err(strm, errorCode) {
  strm.msg = msg[errorCode];
  return errorCode;
}

function rank(f) {
  return ((f) << 1) - ((f) > 4 ? 9 : 0);
}

function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }


/* =========================================================================
 * Flush as much pending output as possible. All deflate() output goes
 * through this function so some applications may wish to modify it
 * to avoid allocating a large strm->output buffer and copying into it.
 * (See also read_buf()).
 */
function flush_pending(strm) {
  var s = strm.state;

  //_tr_flush_bits(s);
  var len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) { return; }

  utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
}


function flush_block_only(s, last) {
  trees._tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
}


function put_byte(s, b) {
  s.pending_buf[s.pending++] = b;
}


/* =========================================================================
 * Put a short in the pending buffer. The 16-bit value is put in MSB order.
 * IN assertion: the stream state is correct and there is enough room in
 * pending_buf.
 */
function putShortMSB(s, b) {
//  put_byte(s, (Byte)(b >> 8));
//  put_byte(s, (Byte)(b & 0xff));
  s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
  s.pending_buf[s.pending++] = b & 0xff;
}


/* ===========================================================================
 * Read a new buffer from the current input stream, update the adler32
 * and total number of bytes read.  All deflate() input goes through
 * this function so some applications may wish to modify it to avoid
 * allocating a large strm->input buffer and copying from it.
 * (See also flush_pending()).
 */
function read_buf(strm, buf, start, size) {
  var len = strm.avail_in;

  if (len > size) { len = size; }
  if (len === 0) { return 0; }

  strm.avail_in -= len;

  // zmemcpy(buf, strm->next_in, len);
  utils.arraySet(buf, strm.input, strm.next_in, len, start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32(strm.adler, buf, len, start);
  }

  else if (strm.state.wrap === 2) {
    strm.adler = crc32(strm.adler, buf, len, start);
  }

  strm.next_in += len;
  strm.total_in += len;

  return len;
}


/* ===========================================================================
 * Set match_start to the longest match starting at the given string and
 * return its length. Matches shorter or equal to prev_length are discarded,
 * in which case the result is equal to prev_length and match_start is
 * garbage.
 * IN assertions: cur_match is the head of the hash chain for the current
 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
 * OUT assertion: the match length is not greater than s->lookahead.
 */
function longest_match(s, cur_match) {
  var chain_length = s.max_chain_length;      /* max hash chain length */
  var scan = s.strstart; /* current string */
  var match;                       /* matched string */
  var len;                           /* length of current match */
  var best_len = s.prev_length;              /* best match length so far */
  var nice_match = s.nice_match;             /* stop if match long enough */
  var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
      s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0/*NIL*/;

  var _win = s.window; // shortcut

  var wmask = s.w_mask;
  var prev  = s.prev;

  /* Stop when cur_match becomes <= limit. To simplify the code,
   * we prevent matches with the string of window index 0.
   */

  var strend = s.strstart + MAX_MATCH;
  var scan_end1  = _win[scan + best_len - 1];
  var scan_end   = _win[scan + best_len];

  /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
   * It is easy to get rid of this optimization if necessary.
   */
  // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

  /* Do not waste too much time if we already have a good match: */
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  /* Do not look for matches beyond the end of the input. This is necessary
   * to make deflate deterministic.
   */
  if (nice_match > s.lookahead) { nice_match = s.lookahead; }

  // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");

  do {
    // Assert(cur_match < s->strstart, "no future");
    match = cur_match;

    /* Skip to next match if the match length cannot increase
     * or if the match length is less than 2.  Note that the checks below
     * for insufficient lookahead only occur occasionally for performance
     * reasons.  Therefore uninitialized memory will be accessed, and
     * conditional jumps will be made that depend on those values.
     * However the length of the match is limited to the lookahead, so
     * the output of deflate is not affected by the uninitialized values.
     */

    if (_win[match + best_len]     !== scan_end  ||
        _win[match + best_len - 1] !== scan_end1 ||
        _win[match]                !== _win[scan] ||
        _win[++match]              !== _win[scan + 1]) {
      continue;
    }

    /* The check at best_len-1 can be removed because it will be made
     * again later. (This heuristic is not always a win.)
     * It is not necessary to compare scan[2] and match[2] since they
     * are always equal when the other bytes match, given that
     * the hash keys are equal and that HASH_BITS >= 8.
     */
    scan += 2;
    match++;
    // Assert(*scan == *match, "match[2]?");

    /* We check for insufficient lookahead only every 8th comparison;
     * the 256th check will be made at strstart+258.
     */
    do {
      /*jshint noempty:false*/
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             scan < strend);

    // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");

    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;

    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1  = _win[scan + best_len - 1];
      scan_end   = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
}


/* ===========================================================================
 * Fill the window when the lookahead becomes insufficient.
 * Updates strstart and lookahead.
 *
 * IN assertion: lookahead < MIN_LOOKAHEAD
 * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
 *    At least one byte has been read, or avail_in == 0; reads are
 *    performed for at least two bytes (required for the zip translate_eol
 *    option -- not supported here).
 */
function fill_window(s) {
  var _w_size = s.w_size;
  var p, n, m, more, str;

  //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

  do {
    more = s.window_size - s.lookahead - s.strstart;

    // JS ints have 32 bit, block below not needed
    /* Deal with !@#$% 64K limit: */
    //if (sizeof(int) <= 2) {
    //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
    //        more = wsize;
    //
    //  } else if (more == (unsigned)(-1)) {
    //        /* Very unlikely, but possible on 16 bit machine if
    //         * strstart == 0 && lookahead == 1 (input done a byte at time)
    //         */
    //        more--;
    //    }
    //}


    /* If the window is almost full and there is insufficient lookahead,
     * move the upper half to the lower one to make room in the upper half.
     */
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

      utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      /* we now have strstart >= MAX_DIST */
      s.block_start -= _w_size;

      /* Slide the hash table (could be avoided with 32 bit values
       at the expense of memory usage). We slide even when level == 0
       to keep the hash table consistent if we switch back to level > 0
       later. (Using level 0 permanently is not an optimal usage of
       zlib, so we don't care about this pathological case.)
       */

      n = s.hash_size;
      p = n;
      do {
        m = s.head[--p];
        s.head[p] = (m >= _w_size ? m - _w_size : 0);
      } while (--n);

      n = _w_size;
      p = n;
      do {
        m = s.prev[--p];
        s.prev[p] = (m >= _w_size ? m - _w_size : 0);
        /* If n is not on any hash chain, prev[n] is garbage but
         * its value will never be used.
         */
      } while (--n);

      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }

    /* If there was no sliding:
     *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
     *    more == window_size - lookahead - strstart
     * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
     * => more >= window_size - 2*WSIZE + 2
     * In the BIG_MEM or MMAP case (not yet supported),
     *   window_size == input_size + MIN_LOOKAHEAD  &&
     *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
     * Otherwise, window_size == 2*WSIZE so more >= 2.
     * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
     */
    //Assert(more >= 2, "more < 2");
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;

    /* Initialize the hash value now that we have some input: */
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];

      /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;
//#if MIN_MATCH != 3
//        Call update_hash() MIN_MATCH-3 more times
//#endif
      while (s.insert) {
        /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;

        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
    /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
     * but this is not important since only literal bytes will be emitted.
     */

  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

  /* If the WIN_INIT bytes after the end of the current data have never been
   * written, then zero those bytes in order to avoid memory check reports of
   * the use of uninitialized (or uninitialised as Julian writes) bytes by
   * the longest match routines.  Update the high water mark for the next
   * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
   * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
   */
//  if (s.high_water < s.window_size) {
//    var curr = s.strstart + s.lookahead;
//    var init = 0;
//
//    if (s.high_water < curr) {
//      /* Previous high water mark below current data -- zero WIN_INIT
//       * bytes or up to end of window, whichever is less.
//       */
//      init = s.window_size - curr;
//      if (init > WIN_INIT)
//        init = WIN_INIT;
//      zmemzero(s->window + curr, (unsigned)init);
//      s->high_water = curr + init;
//    }
//    else if (s->high_water < (ulg)curr + WIN_INIT) {
//      /* High water mark at or above current data, but below current data
//       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
//       * to end of window, whichever is less.
//       */
//      init = (ulg)curr + WIN_INIT - s->high_water;
//      if (init > s->window_size - s->high_water)
//        init = s->window_size - s->high_water;
//      zmemzero(s->window + s->high_water, (unsigned)init);
//      s->high_water += init;
//    }
//  }
//
//  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
//    "not enough room for search");
}

/* ===========================================================================
 * Copy without compression as much as possible from the input stream, return
 * the current block state.
 * This function does not insert new strings in the dictionary since
 * uncompressible data is probably not useful. This function is used
 * only for the level=0 compression option.
 * NOTE: this function should be optimized to avoid extra copying from
 * window to pending_buf.
 */
function deflate_stored(s, flush) {
  /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
   * to pending_buf_size, and each stored block has a 5 byte header:
   */
  var max_block_size = 0xffff;

  if (max_block_size > s.pending_buf_size - 5) {
    max_block_size = s.pending_buf_size - 5;
  }

  /* Copy as much as possible from input to output: */
  for (;;) {
    /* Fill the window as much as possible: */
    if (s.lookahead <= 1) {

      //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
      //  s->block_start >= (long)s->w_size, "slide too late");
//      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
//        s.block_start >= s.w_size)) {
//        throw  new Error("slide too late");
//      }

      fill_window(s);
      if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
      }
      /* flush the current block */
    }
    //Assert(s->block_start >= 0L, "block gone");
//    if (s.block_start < 0) throw new Error("block gone");

    s.strstart += s.lookahead;
    s.lookahead = 0;

    /* Emit a stored block if pending_buf will be full: */
    var max_start = s.block_start + max_block_size;

    if (s.strstart === 0 || s.strstart >= max_start) {
      /* strstart == 0 is possible when wraparound on 16-bit machine */
      s.lookahead = s.strstart - max_start;
      s.strstart = max_start;
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/


    }
    /* Flush if we may have to slide, otherwise block_start may become
     * negative and the data will be gone:
     */
    if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }

  s.insert = 0;

  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }

  if (s.strstart > s.block_start) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_NEED_MORE;
}

/* ===========================================================================
 * Compress as much as possible from the input stream, return the current
 * block state.
 * This function does not perform lazy evaluation of matches and inserts
 * new strings in the dictionary only for unmatched strings or for short
 * matches. It is used only for the fast compression options.
 */
function deflate_fast(s, flush) {
  var hash_head;        /* head of the hash chain */
  var bflush;           /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break; /* flush the current block */
      }
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     * At this point we have always match_length < MIN_MATCH
     */
    if (hash_head !== 0/*NIL*/ && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */
    }
    if (s.match_length >= MIN_MATCH) {
      // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

      /*** _tr_tally_dist(s, s.strstart - s.match_start,
                     s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;

      /* Insert new strings in the hash table only if the match length
       * is not too large. This saves time but degrades compression.
       */
      if (s.match_length <= s.max_lazy_match/*max_insert_length*/ && s.lookahead >= MIN_MATCH) {
        s.match_length--; /* string at strstart already in table */
        do {
          s.strstart++;
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
          /* strstart never exceeds WSIZE-MAX_MATCH, so there are
           * always MIN_MATCH bytes ahead.
           */
        } while (--s.match_length !== 0);
        s.strstart++;
      } else
      {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask;

//#if MIN_MATCH != 3
//                Call UPDATE_HASH() MIN_MATCH-3 more times
//#endif
        /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
         * matter since it will be recomputed at next deflate call.
         */
      }
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s.window[s.strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = ((s.strstart < (MIN_MATCH - 1)) ? s.strstart : MIN_MATCH - 1);
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * Same as above, but achieves better compression. We use a lazy
 * evaluation for matches: a match is finally adopted only if there is
 * no better match at the next window position.
 */
function deflate_slow(s, flush) {
  var hash_head;          /* head of hash chain */
  var bflush;              /* set if current block must be flushed */

  var max_insert;

  /* Process the input block. */
  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     */
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH - 1;

    if (hash_head !== 0/*NIL*/ && s.prev_length < s.max_lazy_match &&
        s.strstart - hash_head <= (s.w_size - MIN_LOOKAHEAD)/*MAX_DIST(s)*/) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */

      if (s.match_length <= 5 &&
         (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096/*TOO_FAR*/))) {

        /* If prev_match is also MIN_MATCH, match_start is garbage
         * but we will ignore the current match anyway.
         */
        s.match_length = MIN_MATCH - 1;
      }
    }
    /* If there was a match at the previous step and the current
     * match is not better, output the previous match:
     */
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      /* Do not insert strings in hash table beyond this. */

      //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

      /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
                     s.prev_length - MIN_MATCH, bflush);***/
      bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
      /* Insert in hash table all strings up to the end of the match.
       * strstart-1 and strstart are already inserted. If there is not
       * enough lookahead, the last two strings are not inserted in
       * the hash table.
       */
      s.lookahead -= s.prev_length - 1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH - 1;
      s.strstart++;

      if (bflush) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

    } else if (s.match_available) {
      /* If there was no match at the previous position, output a
       * single literal. If there was a match but the current match
       * is longer, truncate the previous match to a single literal.
       */
      //Tracevv((stderr,"%c", s->window[s->strstart-1]));
      /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

      if (bflush) {
        /*** FLUSH_BLOCK_ONLY(s, 0) ***/
        flush_block_only(s, false);
        /***/
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      /* There is no previous match to compare with, wait for
       * the next step to decide.
       */
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  //Assert (flush != Z_NO_FLUSH, "no flush?");
  if (s.match_available) {
    //Tracevv((stderr,"%c", s->window[s->strstart-1]));
    /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_BLOCK_DONE;
}


/* ===========================================================================
 * For Z_RLE, simply look for runs of bytes, generate matches only of distance
 * one.  Do not maintain a hash table.  (It will be regenerated if this run of
 * deflate switches away from Z_RLE.)
 */
function deflate_rle(s, flush) {
  var bflush;            /* set if current block must be flushed */
  var prev;              /* byte at distance one to match */
  var scan, strend;      /* scan goes up to strend for length of run */

  var _win = s.window;

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the longest run, plus one for the unrolled loop.
     */
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* See how many times the previous byte repeats */
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
          /*jshint noempty:false*/
        } while (prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
      //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");
    }

    /* Emit match if have run of MIN_MATCH or longer, else emit literal */
    if (s.match_length >= MIN_MATCH) {
      //check_match(s, s.strstart, s.strstart - 1, s.match_length);

      /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s->window[s->strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
 * (It will be regenerated if this run of deflate switches away from Huffman.)
 */
function deflate_huff(s, flush) {
  var bflush;             /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we have a literal to write. */
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        break;      /* flush the current block */
      }
    }

    /* Output a literal byte */
    s.match_length = 0;
    //Tracevv((stderr,"%c", s->window[s->strstart]));
    /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* Values for max_lazy_match, good_match and max_chain_length, depending on
 * the desired pack level (0..9). The values given below have been tuned to
 * exclude worst case performance for pathological files. Better values may be
 * found for specific files.
 */
function Config(good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
}

var configuration_table;

configuration_table = [
  /*      good lazy nice chain */
  new Config(0, 0, 0, 0, deflate_stored),          /* 0 store only */
  new Config(4, 4, 8, 4, deflate_fast),            /* 1 max speed, no lazy matches */
  new Config(4, 5, 16, 8, deflate_fast),           /* 2 */
  new Config(4, 6, 32, 32, deflate_fast),          /* 3 */

  new Config(4, 4, 16, 16, deflate_slow),          /* 4 lazy matches */
  new Config(8, 16, 32, 32, deflate_slow),         /* 5 */
  new Config(8, 16, 128, 128, deflate_slow),       /* 6 */
  new Config(8, 32, 128, 256, deflate_slow),       /* 7 */
  new Config(32, 128, 258, 1024, deflate_slow),    /* 8 */
  new Config(32, 258, 258, 4096, deflate_slow)     /* 9 max compression */
];


/* ===========================================================================
 * Initialize the "longest match" routines for a new zlib stream
 */
function lm_init(s) {
  s.window_size = 2 * s.w_size;

  /*** CLEAR_HASH(s); ***/
  zero(s.head); // Fill with NIL (= 0);

  /* Set the default configuration parameters:
   */
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;

  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
}


function DeflateState() {
  this.strm = null;            /* pointer back to this zlib stream */
  this.status = 0;            /* as the name implies */
  this.pending_buf = null;      /* output still pending */
  this.pending_buf_size = 0;  /* size of pending_buf */
  this.pending_out = 0;       /* next pending byte to output to the stream */
  this.pending = 0;           /* nb of bytes in the pending buffer */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.gzhead = null;         /* gzip header information to write */
  this.gzindex = 0;           /* where in extra, name, or comment */
  this.method = Z_DEFLATED; /* can only be DEFLATED */
  this.last_flush = -1;   /* value of flush param for previous deflate call */

  this.w_size = 0;  /* LZ77 window size (32K by default) */
  this.w_bits = 0;  /* log2(w_size)  (8..16) */
  this.w_mask = 0;  /* w_size - 1 */

  this.window = null;
  /* Sliding window. Input bytes are read into the second half of the window,
   * and move to the first half later to keep a dictionary of at least wSize
   * bytes. With this organization, matches are limited to a distance of
   * wSize-MAX_MATCH bytes, but this ensures that IO is always
   * performed with a length multiple of the block size.
   */

  this.window_size = 0;
  /* Actual size of window: 2*wSize, except when the user input buffer
   * is directly used as sliding window.
   */

  this.prev = null;
  /* Link to older string with same hash index. To limit the size of this
   * array to 64K, this link is maintained only for the last 32K strings.
   * An index in this array is thus a window index modulo 32K.
   */

  this.head = null;   /* Heads of the hash chains or NIL. */

  this.ins_h = 0;       /* hash index of string to be inserted */
  this.hash_size = 0;   /* number of elements in hash table */
  this.hash_bits = 0;   /* log2(hash_size) */
  this.hash_mask = 0;   /* hash_size-1 */

  this.hash_shift = 0;
  /* Number of bits by which ins_h must be shifted at each input
   * step. It must be such that after MIN_MATCH steps, the oldest
   * byte no longer takes part in the hash key, that is:
   *   hash_shift * MIN_MATCH >= hash_bits
   */

  this.block_start = 0;
  /* Window position at the beginning of the current output block. Gets
   * negative when the window is moved backwards.
   */

  this.match_length = 0;      /* length of best match */
  this.prev_match = 0;        /* previous match */
  this.match_available = 0;   /* set if previous match exists */
  this.strstart = 0;          /* start of string to insert */
  this.match_start = 0;       /* start of matching string */
  this.lookahead = 0;         /* number of valid bytes ahead in window */

  this.prev_length = 0;
  /* Length of the best match at previous step. Matches not greater than this
   * are discarded. This is used in the lazy match evaluation.
   */

  this.max_chain_length = 0;
  /* To speed up deflation, hash chains are never searched beyond this
   * length.  A higher limit improves compression ratio but degrades the
   * speed.
   */

  this.max_lazy_match = 0;
  /* Attempt to find a better match only when the current match is strictly
   * smaller than this value. This mechanism is used only for compression
   * levels >= 4.
   */
  // That's alias to max_lazy_match, don't use directly
  //this.max_insert_length = 0;
  /* Insert new strings in the hash table only if the match length is not
   * greater than this length. This saves time but degrades compression.
   * max_insert_length is used only for compression levels <= 3.
   */

  this.level = 0;     /* compression level (1..9) */
  this.strategy = 0;  /* favor or force Huffman coding*/

  this.good_match = 0;
  /* Use a faster search when the previous match is longer than this */

  this.nice_match = 0; /* Stop searching when current match exceeds this */

              /* used by trees.c: */

  /* Didn't use ct_data typedef below to suppress compiler warning */

  // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
  // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
  // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */

  // Use flat array of DOUBLE size, with interleaved fata,
  // because JS does not support effective
  this.dyn_ltree  = new utils.Buf16(HEAP_SIZE * 2);
  this.dyn_dtree  = new utils.Buf16((2 * D_CODES + 1) * 2);
  this.bl_tree    = new utils.Buf16((2 * BL_CODES + 1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);

  this.l_desc   = null;         /* desc. for literal tree */
  this.d_desc   = null;         /* desc. for distance tree */
  this.bl_desc  = null;         /* desc. for bit length tree */

  //ush bl_count[MAX_BITS+1];
  this.bl_count = new utils.Buf16(MAX_BITS + 1);
  /* number of codes at each bit length for an optimal tree */

  //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */
  this.heap = new utils.Buf16(2 * L_CODES + 1);  /* heap used to build the Huffman trees */
  zero(this.heap);

  this.heap_len = 0;               /* number of elements in the heap */
  this.heap_max = 0;               /* element of largest frequency */
  /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
   * The same heap array is used to build all trees.
   */

  this.depth = new utils.Buf16(2 * L_CODES + 1); //uch depth[2*L_CODES+1];
  zero(this.depth);
  /* Depth of each subtree used as tie breaker for trees of equal frequency
   */

  this.l_buf = 0;          /* buffer index for literals or lengths */

  this.lit_bufsize = 0;
  /* Size of match buffer for literals/lengths.  There are 4 reasons for
   * limiting lit_bufsize to 64K:
   *   - frequencies can be kept in 16 bit counters
   *   - if compression is not successful for the first block, all input
   *     data is still in the window so we can still emit a stored block even
   *     when input comes from standard input.  (This can also be done for
   *     all blocks if lit_bufsize is not greater than 32K.)
   *   - if compression is not successful for a file smaller than 64K, we can
   *     even emit a stored file instead of a stored block (saving 5 bytes).
   *     This is applicable only for zip (not gzip or zlib).
   *   - creating new Huffman trees less frequently may not provide fast
   *     adaptation to changes in the input data statistics. (Take for
   *     example a binary file with poorly compressible code followed by
   *     a highly compressible string table.) Smaller buffer sizes give
   *     fast adaptation but have of course the overhead of transmitting
   *     trees more frequently.
   *   - I can't count above 4
   */

  this.last_lit = 0;      /* running index in l_buf */

  this.d_buf = 0;
  /* Buffer index for distances. To simplify the code, d_buf and l_buf have
   * the same number of elements. To use different lengths, an extra flag
   * array would be necessary.
   */

  this.opt_len = 0;       /* bit length of current block with optimal trees */
  this.static_len = 0;    /* bit length of current block with static trees */
  this.matches = 0;       /* number of string matches in current block */
  this.insert = 0;        /* bytes at end of window left to insert */


  this.bi_buf = 0;
  /* Output buffer. bits are inserted starting at the bottom (least
   * significant bits).
   */
  this.bi_valid = 0;
  /* Number of valid bits in bi_buf.  All bits above the last valid bit
   * are always zero.
   */

  // Used for window memory init. We safely ignore it for JS. That makes
  // sense only for pointers and memory check tools.
  //this.high_water = 0;
  /* High water mark offset in window for initialized bytes -- bytes above
   * this are set to zero in order to avoid memory check warnings when
   * longest match routines access bytes past the input.  This is then
   * updated to the new high water mark.
   */
}


function deflateResetKeep(strm) {
  var s;

  if (!strm || !strm.state) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;

  s = strm.state;
  s.pending = 0;
  s.pending_out = 0;

  if (s.wrap < 0) {
    s.wrap = -s.wrap;
    /* was made negative by deflate(..., Z_FINISH); */
  }
  s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
  strm.adler = (s.wrap === 2) ?
    0  // crc32(0, Z_NULL, 0)
  :
    1; // adler32(0, Z_NULL, 0)
  s.last_flush = Z_NO_FLUSH;
  trees._tr_init(s);
  return Z_OK;
}


function deflateReset(strm) {
  var ret = deflateResetKeep(strm);
  if (ret === Z_OK) {
    lm_init(strm.state);
  }
  return ret;
}


function deflateSetHeader(strm, head) {
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  if (strm.state.wrap !== 2) { return Z_STREAM_ERROR; }
  strm.state.gzhead = head;
  return Z_OK;
}


function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
  if (!strm) { // === Z_NULL
    return Z_STREAM_ERROR;
  }
  var wrap = 1;

  if (level === Z_DEFAULT_COMPRESSION) {
    level = 6;
  }

  if (windowBits < 0) { /* suppress zlib wrapper */
    wrap = 0;
    windowBits = -windowBits;
  }

  else if (windowBits > 15) {
    wrap = 2;           /* write gzip wrapper instead */
    windowBits -= 16;
  }


  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED ||
    windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
    strategy < 0 || strategy > Z_FIXED) {
    return err(strm, Z_STREAM_ERROR);
  }


  if (windowBits === 8) {
    windowBits = 9;
  }
  /* until 256-byte window bug fixed */

  var s = new DeflateState();

  strm.state = s;
  s.strm = strm;

  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;

  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);

  s.window = new utils.Buf8(s.w_size * 2);
  s.head = new utils.Buf16(s.hash_size);
  s.prev = new utils.Buf16(s.w_size);

  // Don't need mem init magic for JS.
  //s.high_water = 0;  /* nothing written to s->window yet */

  s.lit_bufsize = 1 << (memLevel + 6); /* 16K elements by default */

  s.pending_buf_size = s.lit_bufsize * 4;

  //overlay = (ushf *) ZALLOC(strm, s->lit_bufsize, sizeof(ush)+2);
  //s->pending_buf = (uchf *) overlay;
  s.pending_buf = new utils.Buf8(s.pending_buf_size);

  // It is offset from `s.pending_buf` (size is `s.lit_bufsize * 2`)
  //s->d_buf = overlay + s->lit_bufsize/sizeof(ush);
  s.d_buf = 1 * s.lit_bufsize;

  //s->l_buf = s->pending_buf + (1+sizeof(ush))*s->lit_bufsize;
  s.l_buf = (1 + 2) * s.lit_bufsize;

  s.level = level;
  s.strategy = strategy;
  s.method = method;

  return deflateReset(strm);
}

function deflateInit(strm, level) {
  return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
}


function deflate(strm, flush) {
  var old_flush, s;
  var beg, val; // for gzip header write only

  if (!strm || !strm.state ||
    flush > Z_BLOCK || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
  }

  s = strm.state;

  if (!strm.output ||
      (!strm.input && strm.avail_in !== 0) ||
      (s.status === FINISH_STATE && flush !== Z_FINISH)) {
    return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR : Z_STREAM_ERROR);
  }

  s.strm = strm; /* just in case */
  old_flush = s.last_flush;
  s.last_flush = flush;

  /* Write the header */
  if (s.status === INIT_STATE) {

    if (s.wrap === 2) { // GZIP header
      strm.adler = 0;  //crc32(0L, Z_NULL, 0);
      put_byte(s, 31);
      put_byte(s, 139);
      put_byte(s, 8);
      if (!s.gzhead) { // s->gzhead == Z_NULL
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, OS_CODE);
        s.status = BUSY_STATE;
      }
      else {
        put_byte(s, (s.gzhead.text ? 1 : 0) +
                    (s.gzhead.hcrc ? 2 : 0) +
                    (!s.gzhead.extra ? 0 : 4) +
                    (!s.gzhead.name ? 0 : 8) +
                    (!s.gzhead.comment ? 0 : 16)
                );
        put_byte(s, s.gzhead.time & 0xff);
        put_byte(s, (s.gzhead.time >> 8) & 0xff);
        put_byte(s, (s.gzhead.time >> 16) & 0xff);
        put_byte(s, (s.gzhead.time >> 24) & 0xff);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, s.gzhead.os & 0xff);
        if (s.gzhead.extra && s.gzhead.extra.length) {
          put_byte(s, s.gzhead.extra.length & 0xff);
          put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
        }
        if (s.gzhead.hcrc) {
          strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
        }
        s.gzindex = 0;
        s.status = EXTRA_STATE;
      }
    }
    else // DEFLATE header
    {
      var header = (Z_DEFLATED + ((s.w_bits - 8) << 4)) << 8;
      var level_flags = -1;

      if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
        level_flags = 0;
      } else if (s.level < 6) {
        level_flags = 1;
      } else if (s.level === 6) {
        level_flags = 2;
      } else {
        level_flags = 3;
      }
      header |= (level_flags << 6);
      if (s.strstart !== 0) { header |= PRESET_DICT; }
      header += 31 - (header % 31);

      s.status = BUSY_STATE;
      putShortMSB(s, header);

      /* Save the adler32 of the preset dictionary: */
      if (s.strstart !== 0) {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
      }
      strm.adler = 1; // adler32(0L, Z_NULL, 0);
    }
  }

//#ifdef GZIP
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */

      while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            break;
          }
        }
        put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
        s.gzindex++;
      }
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (s.gzindex === s.gzhead.extra.length) {
        s.gzindex = 0;
        s.status = NAME_STATE;
      }
    }
    else {
      s.status = NAME_STATE;
    }
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.gzindex = 0;
        s.status = COMMENT_STATE;
      }
    }
    else {
      s.status = COMMENT_STATE;
    }
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.status = HCRC_STATE;
      }
    }
    else {
      s.status = HCRC_STATE;
    }
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
      }
      if (s.pending + 2 <= s.pending_buf_size) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        strm.adler = 0; //crc32(0L, Z_NULL, 0);
        s.status = BUSY_STATE;
      }
    }
    else {
      s.status = BUSY_STATE;
    }
  }
//#endif

  /* Flush as much pending output as possible */
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      /* Since avail_out is 0, deflate will be called again with
       * more output space, but possibly with both pending and
       * avail_in equal to zero. There won't be anything to do,
       * but this is not an error situation so make sure we
       * return OK instead of BUF_ERROR at next call of deflate:
       */
      s.last_flush = -1;
      return Z_OK;
    }

    /* Make sure there is something to do and avoid duplicate consecutive
     * flushes. For repeated and useless calls with Z_FINISH, we keep
     * returning Z_STREAM_END instead of Z_BUF_ERROR.
     */
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
    flush !== Z_FINISH) {
    return err(strm, Z_BUF_ERROR);
  }

  /* User must not provide more input after the first FINISH: */
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR);
  }

  /* Start a new block or continue the current one.
   */
  if (strm.avail_in !== 0 || s.lookahead !== 0 ||
    (flush !== Z_NO_FLUSH && s.status !== FINISH_STATE)) {
    var bstate = (s.strategy === Z_HUFFMAN_ONLY) ? deflate_huff(s, flush) :
      (s.strategy === Z_RLE ? deflate_rle(s, flush) :
        configuration_table[s.level].func(s, flush));

    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        /* avoid BUF_ERROR next call, see above */
      }
      return Z_OK;
      /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
       * of deflate should use the same flush parameter to make sure
       * that the flush is complete. So we don't have to output an
       * empty block here, this will be done at next call. This also
       * ensures that for a very small output buffer, we emit at most
       * one empty block.
       */
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        trees._tr_align(s);
      }
      else if (flush !== Z_BLOCK) { /* FULL_FLUSH or SYNC_FLUSH */

        trees._tr_stored_block(s, 0, 0, false);
        /* For a full flush, this empty block will be recognized
         * as a special marker by inflate_sync().
         */
        if (flush === Z_FULL_FLUSH) {
          /*** CLEAR_HASH(s); ***/             /* forget history */
          zero(s.head); // Fill with NIL (= 0);

          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1; /* avoid BUF_ERROR at next call, see above */
        return Z_OK;
      }
    }
  }
  //Assert(strm->avail_out > 0, "bug2");
  //if (strm.avail_out <= 0) { throw new Error("bug2");}

  if (flush !== Z_FINISH) { return Z_OK; }
  if (s.wrap <= 0) { return Z_STREAM_END; }

  /* Write the trailer */
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 0xff);
    put_byte(s, (strm.adler >> 8) & 0xff);
    put_byte(s, (strm.adler >> 16) & 0xff);
    put_byte(s, (strm.adler >> 24) & 0xff);
    put_byte(s, strm.total_in & 0xff);
    put_byte(s, (strm.total_in >> 8) & 0xff);
    put_byte(s, (strm.total_in >> 16) & 0xff);
    put_byte(s, (strm.total_in >> 24) & 0xff);
  }
  else
  {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 0xffff);
  }

  flush_pending(strm);
  /* If avail_out is zero, the application will call deflate again
   * to flush the rest.
   */
  if (s.wrap > 0) { s.wrap = -s.wrap; }
  /* write the trailer only once! */
  return s.pending !== 0 ? Z_OK : Z_STREAM_END;
}

function deflateEnd(strm) {
  var status;

  if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
    return Z_STREAM_ERROR;
  }

  status = strm.state.status;
  if (status !== INIT_STATE &&
    status !== EXTRA_STATE &&
    status !== NAME_STATE &&
    status !== COMMENT_STATE &&
    status !== HCRC_STATE &&
    status !== BUSY_STATE &&
    status !== FINISH_STATE
  ) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.state = null;

  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
}


/* =========================================================================
 * Initializes the compression dictionary from the given byte
 * sequence without producing any compressed output.
 */
function deflateSetDictionary(strm, dictionary) {
  var dictLength = dictionary.length;

  var s;
  var str, n;
  var wrap;
  var avail;
  var next;
  var input;
  var tmpDict;

  if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
    return Z_STREAM_ERROR;
  }

  s = strm.state;
  wrap = s.wrap;

  if (wrap === 2 || (wrap === 1 && s.status !== INIT_STATE) || s.lookahead) {
    return Z_STREAM_ERROR;
  }

  /* when using zlib wrappers, compute Adler-32 for provided dictionary */
  if (wrap === 1) {
    /* adler32(strm->adler, dictionary, dictLength); */
    strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
  }

  s.wrap = 0;   /* avoid computing Adler-32 in read_buf */

  /* if dictionary would fill window, just replace the history */
  if (dictLength >= s.w_size) {
    if (wrap === 0) {            /* already empty otherwise */
      /*** CLEAR_HASH(s); ***/
      zero(s.head); // Fill with NIL (= 0);
      s.strstart = 0;
      s.block_start = 0;
      s.insert = 0;
    }
    /* use the tail */
    // dictionary = dictionary.slice(dictLength - s.w_size);
    tmpDict = new utils.Buf8(s.w_size);
    utils.arraySet(tmpDict, dictionary, dictLength - s.w_size, s.w_size, 0);
    dictionary = tmpDict;
    dictLength = s.w_size;
  }
  /* insert dictionary into window and hash */
  avail = strm.avail_in;
  next = strm.next_in;
  input = strm.input;
  strm.avail_in = dictLength;
  strm.next_in = 0;
  strm.input = dictionary;
  fill_window(s);
  while (s.lookahead >= MIN_MATCH) {
    str = s.strstart;
    n = s.lookahead - (MIN_MATCH - 1);
    do {
      /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;

      s.prev[str & s.w_mask] = s.head[s.ins_h];

      s.head[s.ins_h] = str;
      str++;
    } while (--n);
    s.strstart = str;
    s.lookahead = MIN_MATCH - 1;
    fill_window(s);
  }
  s.strstart += s.lookahead;
  s.block_start = s.strstart;
  s.insert = s.lookahead;
  s.lookahead = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  strm.next_in = next;
  strm.input = input;
  strm.avail_in = avail;
  s.wrap = wrap;
  return Z_OK;
}


exports.deflateInit = deflateInit;
exports.deflateInit2 = deflateInit2;
exports.deflateReset = deflateReset;
exports.deflateResetKeep = deflateResetKeep;
exports.deflateSetHeader = deflateSetHeader;
exports.deflate = deflate;
exports.deflateEnd = deflateEnd;
exports.deflateSetDictionary = deflateSetDictionary;
exports.deflateInfo = 'pako deflate (from Nodeca project)';

/* Not implemented
exports.deflateBound = deflateBound;
exports.deflateCopy = deflateCopy;
exports.deflateParams = deflateParams;
exports.deflatePending = deflatePending;
exports.deflatePrime = deflatePrime;
exports.deflateTune = deflateTune;
*/

},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function GZheader() {
  /* true if compressed data believed to be text */
  this.text       = 0;
  /* modification time */
  this.time       = 0;
  /* extra flags (not used when writing a gzip file) */
  this.xflags     = 0;
  /* operating system */
  this.os         = 0;
  /* pointer to extra field or Z_NULL if none */
  this.extra      = null;
  /* extra field length (valid if extra != Z_NULL) */
  this.extra_len  = 0; // Actually, we don't need it in JS,
                       // but leave for few code modifications

  //
  // Setup limits is not necessary because in js we should not preallocate memory
  // for inflate use constant limit in 65536 bytes
  //

  /* space at extra (only when reading header) */
  // this.extra_max  = 0;
  /* pointer to zero-terminated file name or Z_NULL */
  this.name       = '';
  /* space at name (only when reading header) */
  // this.name_max   = 0;
  /* pointer to zero-terminated comment or Z_NULL */
  this.comment    = '';
  /* space at comment (only when reading header) */
  // this.comm_max   = 0;
  /* true if there was or will be a header crc */
  this.hcrc       = 0;
  /* true when done reading gzip header (not used when writing a gzip file) */
  this.done       = false;
}

module.exports = GZheader;

},{}],48:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// See state defs from inflate.js
var BAD = 30;       /* got a data error -- remain here until reset */
var TYPE = 12;      /* i: waiting for type bits, including last-flag bit */

/*
   Decode literal, length, and distance codes and write out the resulting
   literal and match bytes until either not enough input or output is
   available, an end-of-block is encountered, or a data error is encountered.
   When large enough input and output buffers are supplied to inflate(), for
   example, a 16K input buffer and a 64K output buffer, more than 95% of the
   inflate execution time is spent in this routine.

   Entry assumptions:

        state.mode === LEN
        strm.avail_in >= 6
        strm.avail_out >= 258
        start >= strm.avail_out
        state.bits < 8

   On return, state.mode is one of:

        LEN -- ran out of enough output space or enough available input
        TYPE -- reached end of block code, inflate() to interpret next block
        BAD -- error in block data

   Notes:

    - The maximum input bits used by a length/distance pair is 15 bits for the
      length code, 5 bits for the length extra, 15 bits for the distance code,
      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
      Therefore if strm.avail_in >= 6, then there is enough input to avoid
      checking for available input while decoding.

    - The maximum bytes that a single length/distance pair can output is 258
      bytes, which is the maximum length that can be coded.  inflate_fast()
      requires strm.avail_out >= 258 for each loop to avoid checking for
      output space.
 */
module.exports = function inflate_fast(strm, start) {
  var state;
  var _in;                    /* local strm.input */
  var last;                   /* have enough input while in < last */
  var _out;                   /* local strm.output */
  var beg;                    /* inflate()'s initial strm.output */
  var end;                    /* while out < end, enough space available */
//#ifdef INFLATE_STRICT
  var dmax;                   /* maximum distance from zlib header */
//#endif
  var wsize;                  /* window size or zero if not using window */
  var whave;                  /* valid bytes in the window */
  var wnext;                  /* window write index */
  // Use `s_window` instead `window`, avoid conflict with instrumentation tools
  var s_window;               /* allocated sliding window, if wsize != 0 */
  var hold;                   /* local strm.hold */
  var bits;                   /* local strm.bits */
  var lcode;                  /* local strm.lencode */
  var dcode;                  /* local strm.distcode */
  var lmask;                  /* mask for first level of length codes */
  var dmask;                  /* mask for first level of distance codes */
  var here;                   /* retrieved table entry */
  var op;                     /* code bits, operation, extra bits, or */
                              /*  window position, window bytes to copy */
  var len;                    /* match length, unused bytes */
  var dist;                   /* match distance */
  var from;                   /* where to copy match from */
  var from_source;


  var input, output; // JS specific, because we have no pointers

  /* copy state to local variables */
  state = strm.state;
  //here = state.here;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
//#ifdef INFLATE_STRICT
  dmax = state.dmax;
//#endif
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;


  /* decode literals and length/distances until end-of-block or not enough
     input data or output space */

  top:
  do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }

    here = lcode[hold & lmask];

    dolen:
    for (;;) { // Goto emulation
      op = here >>> 24/*here.bits*/;
      hold >>>= op;
      bits -= op;
      op = (here >>> 16) & 0xff/*here.op*/;
      if (op === 0) {                          /* literal */
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        output[_out++] = here & 0xffff/*here.val*/;
      }
      else if (op & 16) {                     /* length base */
        len = here & 0xffff/*here.val*/;
        op &= 15;                           /* number of extra bits */
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & ((1 << op) - 1);
          hold >>>= op;
          bits -= op;
        }
        //Tracevv((stderr, "inflate:         length %u\n", len));
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];

        dodist:
        for (;;) { // goto emulation
          op = here >>> 24/*here.bits*/;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff/*here.op*/;

          if (op & 16) {                      /* distance base */
            dist = here & 0xffff/*here.val*/;
            op &= 15;                       /* number of extra bits */
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & ((1 << op) - 1);
//#ifdef INFLATE_STRICT
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break top;
            }
//#endif
            hold >>>= op;
            bits -= op;
            //Tracevv((stderr, "inflate:         distance %u\n", dist));
            op = _out - beg;                /* max distance in output */
            if (dist > op) {                /* see if copy from window */
              op = dist - op;               /* distance back in window */
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD;
                  break top;
                }

// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//                if (len <= op - whave) {
//                  do {
//                    output[_out++] = 0;
//                  } while (--len);
//                  continue top;
//                }
//                len -= op - whave;
//                do {
//                  output[_out++] = 0;
//                } while (--op > whave);
//                if (op === 0) {
//                  from = _out - dist;
//                  do {
//                    output[_out++] = output[from++];
//                  } while (--len);
//                  continue top;
//                }
//#endif
              }
              from = 0; // window index
              from_source = s_window;
              if (wnext === 0) {           /* very common case */
                from += wsize - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              else if (wnext < op) {      /* wrap around window */
                from += wsize + wnext - op;
                op -= wnext;
                if (op < len) {         /* some from end of window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = 0;
                  if (wnext < len) {  /* some from start of window */
                    op = wnext;
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = _out - dist;      /* rest from output */
                    from_source = output;
                  }
                }
              }
              else {                      /* contiguous in window */
                from += wnext - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from++];
                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            }
            else {
              from = _out - dist;          /* copy direct from output */
              do {                        /* minimum length is three */
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from++];
                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          }
          else if ((op & 64) === 0) {          /* 2nd level distance code */
            here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
            continue dodist;
          }
          else {
            strm.msg = 'invalid distance code';
            state.mode = BAD;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      }
      else if ((op & 64) === 0) {              /* 2nd level length code */
        here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
        continue dolen;
      }
      else if (op & 32) {                     /* end-of-block */
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.mode = TYPE;
        break top;
      }
      else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break top;
      }

      break; // need to emulate goto via "continue"
    }
  } while (_in < last && _out < end);

  /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;

  /* update state and return */
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
  strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
  state.hold = hold;
  state.bits = bits;
  return;
};

},{}],49:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var utils         = require('../utils/common');
var adler32       = require('./adler32');
var crc32         = require('./crc32');
var inflate_fast  = require('./inffast');
var inflate_table = require('./inftrees');

var CODES = 0;
var LENS = 1;
var DISTS = 2;

/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
//var Z_NO_FLUSH      = 0;
//var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
//var Z_FULL_FLUSH    = 3;
var Z_FINISH        = 4;
var Z_BLOCK         = 5;
var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK            = 0;
var Z_STREAM_END    = 1;
var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;

/* The deflate compression method */
var Z_DEFLATED  = 8;


/* STATES ====================================================================*/
/* ===========================================================================*/


var    HEAD = 1;       /* i: waiting for magic header */
var    FLAGS = 2;      /* i: waiting for method and flags (gzip) */
var    TIME = 3;       /* i: waiting for modification time (gzip) */
var    OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
var    EXLEN = 5;      /* i: waiting for extra length (gzip) */
var    EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
var    NAME = 7;       /* i: waiting for end of file name (gzip) */
var    COMMENT = 8;    /* i: waiting for end of comment (gzip) */
var    HCRC = 9;       /* i: waiting for header crc (gzip) */
var    DICTID = 10;    /* i: waiting for dictionary check value */
var    DICT = 11;      /* waiting for inflateSetDictionary() call */
var        TYPE = 12;      /* i: waiting for type bits, including last-flag bit */
var        TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
var        STORED = 14;    /* i: waiting for stored size (length and complement) */
var        COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
var        COPY = 16;      /* i/o: waiting for input or output to copy stored block */
var        TABLE = 17;     /* i: waiting for dynamic block table lengths */
var        LENLENS = 18;   /* i: waiting for code length code lengths */
var        CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
var            LEN_ = 20;      /* i: same as LEN below, but only first time in */
var            LEN = 21;       /* i: waiting for length/lit/eob code */
var            LENEXT = 22;    /* i: waiting for length extra bits */
var            DIST = 23;      /* i: waiting for distance code */
var            DISTEXT = 24;   /* i: waiting for distance extra bits */
var            MATCH = 25;     /* o: waiting for output space to copy string */
var            LIT = 26;       /* o: waiting for output space to write literal */
var    CHECK = 27;     /* i: waiting for 32-bit check value */
var    LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
var    DONE = 29;      /* finished check, done -- remain here until reset */
var    BAD = 30;       /* got a data error -- remain here until reset */
var    MEM = 31;       /* got an inflate() memory error -- remain here until reset */
var    SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

/* ===========================================================================*/



var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
//var ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

var MAX_WBITS = 15;
/* 32K LZ77 window */
var DEF_WBITS = MAX_WBITS;


function zswap32(q) {
  return  (((q >>> 24) & 0xff) +
          ((q >>> 8) & 0xff00) +
          ((q & 0xff00) << 8) +
          ((q & 0xff) << 24));
}


function InflateState() {
  this.mode = 0;             /* current inflate mode */
  this.last = false;          /* true if processing last block */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.havedict = false;      /* true if dictionary provided */
  this.flags = 0;             /* gzip header method and flags (0 if zlib) */
  this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
  this.check = 0;             /* protected copy of check value */
  this.total = 0;             /* protected copy of output count */
  // TODO: may be {}
  this.head = null;           /* where to save gzip header information */

  /* sliding window */
  this.wbits = 0;             /* log base 2 of requested window size */
  this.wsize = 0;             /* window size or zero if not using window */
  this.whave = 0;             /* valid bytes in the window */
  this.wnext = 0;             /* window write index */
  this.window = null;         /* allocated sliding window, if needed */

  /* bit accumulator */
  this.hold = 0;              /* input bit accumulator */
  this.bits = 0;              /* number of bits in "in" */

  /* for string and stored block copying */
  this.length = 0;            /* literal or length of data to copy */
  this.offset = 0;            /* distance back to copy string from */

  /* for table and code decoding */
  this.extra = 0;             /* extra bits needed */

  /* fixed and dynamic code tables */
  this.lencode = null;          /* starting table for length/literal codes */
  this.distcode = null;         /* starting table for distance codes */
  this.lenbits = 0;           /* index bits for lencode */
  this.distbits = 0;          /* index bits for distcode */

  /* dynamic table building */
  this.ncode = 0;             /* number of code length code lengths */
  this.nlen = 0;              /* number of length code lengths */
  this.ndist = 0;             /* number of distance code lengths */
  this.have = 0;              /* number of code lengths in lens[] */
  this.next = null;              /* next available space in codes[] */

  this.lens = new utils.Buf16(320); /* temporary storage for code lengths */
  this.work = new utils.Buf16(288); /* work area for code table building */

  /*
   because we don't have pointers in js, we use lencode and distcode directly
   as buffers so we don't need codes
  */
  //this.codes = new utils.Buf32(ENOUGH);       /* space for code tables */
  this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
  this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
  this.sane = 0;                   /* if false, allow invalid distance too far */
  this.back = 0;                   /* bits back of last unprocessed length/lit */
  this.was = 0;                    /* initial length of match */
}

function inflateResetKeep(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = ''; /*Z_NULL*/
  if (state.wrap) {       /* to support ill-conceived Java test suite */
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null/*Z_NULL*/;
  state.hold = 0;
  state.bits = 0;
  //state.lencode = state.distcode = state.next = state.codes;
  state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
  state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);

  state.sane = 1;
  state.back = -1;
  //Tracev((stderr, "inflate: reset\n"));
  return Z_OK;
}

function inflateReset(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);

}

function inflateReset2(strm, windowBits) {
  var wrap;
  var state;

  /* get the state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;

  /* extract wrap request from windowBits parameter */
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  }
  else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }

  /* set number of window bits, free window if different */
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }

  /* update state and reset the rest of it */
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
}

function inflateInit2(strm, windowBits) {
  var ret;
  var state;

  if (!strm) { return Z_STREAM_ERROR; }
  //strm.msg = Z_NULL;                 /* in case we return an error */

  state = new InflateState();

  //if (state === Z_NULL) return Z_MEM_ERROR;
  //Tracev((stderr, "inflate: allocated\n"));
  strm.state = state;
  state.window = null/*Z_NULL*/;
  ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK) {
    strm.state = null/*Z_NULL*/;
  }
  return ret;
}

function inflateInit(strm) {
  return inflateInit2(strm, DEF_WBITS);
}


/*
 Return state with length and distance decoding tables and index sizes set to
 fixed code decoding.  Normally this returns fixed tables from inffixed.h.
 If BUILDFIXED is defined, then instead this routine builds the tables the
 first time it's called, and returns those tables the first time and
 thereafter.  This reduces the size of the code by about 2K bytes, in
 exchange for a little execution time.  However, BUILDFIXED should not be
 used for threaded applications, since the rewriting of the tables and virgin
 may not be thread-safe.
 */
var virgin = true;

var lenfix, distfix; // We have no pointers in JS, so keep tables separate

function fixedtables(state) {
  /* build fixed huffman tables if first call (may not be thread safe) */
  if (virgin) {
    var sym;

    lenfix = new utils.Buf32(512);
    distfix = new utils.Buf32(32);

    /* literal/length table */
    sym = 0;
    while (sym < 144) { state.lens[sym++] = 8; }
    while (sym < 256) { state.lens[sym++] = 9; }
    while (sym < 280) { state.lens[sym++] = 7; }
    while (sym < 288) { state.lens[sym++] = 8; }

    inflate_table(LENS,  state.lens, 0, 288, lenfix,   0, state.work, { bits: 9 });

    /* distance table */
    sym = 0;
    while (sym < 32) { state.lens[sym++] = 5; }

    inflate_table(DISTS, state.lens, 0, 32,   distfix, 0, state.work, { bits: 5 });

    /* do this just once */
    virgin = false;
  }

  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
}


/*
 Update the window with the last wsize (normally 32K) bytes written before
 returning.  If window does not exist yet, create it.  This is only called
 when a window is already in use, or when output has been written during this
 inflate call, but the end of the deflate stream has not been reached yet.
 It is also called to create a window for dictionary data when a dictionary
 is loaded.

 Providing output buffers larger than 32K to inflate() should provide a speed
 advantage, since only the last 32K of output is copied to the sliding window
 upon return from inflate(), and since all distances after the first 32K of
 output will fall in the output data, making match copies simpler and faster.
 The advantage may be dependent on the size of the processor's data caches.
 */
function updatewindow(strm, src, end, copy) {
  var dist;
  var state = strm.state;

  /* if it hasn't been done already, allocate space for the window */
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;

    state.window = new utils.Buf8(state.wsize);
  }

  /* copy state->wsize or less output bytes into the circular window */
  if (copy >= state.wsize) {
    utils.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
    state.wnext = 0;
    state.whave = state.wsize;
  }
  else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    //zmemcpy(state->window + state->wnext, end - copy, dist);
    utils.arraySet(state.window, src, end - copy, dist, state.wnext);
    copy -= dist;
    if (copy) {
      //zmemcpy(state->window, end - copy, copy);
      utils.arraySet(state.window, src, end - copy, copy, 0);
      state.wnext = copy;
      state.whave = state.wsize;
    }
    else {
      state.wnext += dist;
      if (state.wnext === state.wsize) { state.wnext = 0; }
      if (state.whave < state.wsize) { state.whave += dist; }
    }
  }
  return 0;
}

function inflate(strm, flush) {
  var state;
  var input, output;          // input/output buffers
  var next;                   /* next input INDEX */
  var put;                    /* next output INDEX */
  var have, left;             /* available input and output */
  var hold;                   /* bit buffer */
  var bits;                   /* bits in bit buffer */
  var _in, _out;              /* save starting available input and output */
  var copy;                   /* number of stored or match bytes to copy */
  var from;                   /* where to copy match bytes from */
  var from_source;
  var here = 0;               /* current decoding table entry */
  var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
  //var last;                   /* parent table entry */
  var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
  var len;                    /* length to copy for repeats, bits to drop */
  var ret;                    /* return code */
  var hbuf = new utils.Buf8(4);    /* buffer for gzip header crc calculation */
  var opts;

  var n; // temporary var for NEED_BITS

  var order = /* permutation of code lengths */
    [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ];


  if (!strm || !strm.state || !strm.output ||
      (!strm.input && strm.avail_in !== 0)) {
    return Z_STREAM_ERROR;
  }

  state = strm.state;
  if (state.mode === TYPE) { state.mode = TYPEDO; }    /* skip check */


  //--- LOAD() ---
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  //---

  _in = have;
  _out = left;
  ret = Z_OK;

  inf_leave: // goto emulation
  for (;;) {
    switch (state.mode) {
    case HEAD:
      if (state.wrap === 0) {
        state.mode = TYPEDO;
        break;
      }
      //=== NEEDBITS(16);
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
        state.check = 0/*crc32(0L, Z_NULL, 0)*/;
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0);
        //===//

        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = FLAGS;
        break;
      }
      state.flags = 0;           /* expect zlib header */
      if (state.head) {
        state.head.done = false;
      }
      if (!(state.wrap & 1) ||   /* check if zlib header allowed */
        (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
        strm.msg = 'incorrect header check';
        state.mode = BAD;
        break;
      }
      if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      //--- DROPBITS(4) ---//
      hold >>>= 4;
      bits -= 4;
      //---//
      len = (hold & 0x0f)/*BITS(4)*/ + 8;
      if (state.wbits === 0) {
        state.wbits = len;
      }
      else if (len > state.wbits) {
        strm.msg = 'invalid window size';
        state.mode = BAD;
        break;
      }
      state.dmax = 1 << len;
      //Tracev((stderr, "inflate:   zlib header ok\n"));
      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
      state.mode = hold & 0x200 ? DICTID : TYPE;
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      break;
    case FLAGS:
      //=== NEEDBITS(16); */
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.flags = hold;
      if ((state.flags & 0xff) !== Z_DEFLATED) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      if (state.flags & 0xe000) {
        strm.msg = 'unknown header flags set';
        state.mode = BAD;
        break;
      }
      if (state.head) {
        state.head.text = ((hold >> 8) & 1);
      }
      if (state.flags & 0x0200) {
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0);
        //===//
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = TIME;
      /* falls through */
    case TIME:
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if (state.head) {
        state.head.time = hold;
      }
      if (state.flags & 0x0200) {
        //=== CRC4(state.check, hold)
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        hbuf[2] = (hold >>> 16) & 0xff;
        hbuf[3] = (hold >>> 24) & 0xff;
        state.check = crc32(state.check, hbuf, 4, 0);
        //===
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = OS;
      /* falls through */
    case OS:
      //=== NEEDBITS(16); */
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if (state.head) {
        state.head.xflags = (hold & 0xff);
        state.head.os = (hold >> 8);
      }
      if (state.flags & 0x0200) {
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0);
        //===//
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = EXLEN;
      /* falls through */
    case EXLEN:
      if (state.flags & 0x0400) {
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.length = hold;
        if (state.head) {
          state.head.extra_len = hold;
        }
        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32(state.check, hbuf, 2, 0);
          //===//
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
      }
      else if (state.head) {
        state.head.extra = null/*Z_NULL*/;
      }
      state.mode = EXTRA;
      /* falls through */
    case EXTRA:
      if (state.flags & 0x0400) {
        copy = state.length;
        if (copy > have) { copy = have; }
        if (copy) {
          if (state.head) {
            len = state.head.extra_len - state.length;
            if (!state.head.extra) {
              // Use untyped array for more conveniend processing later
              state.head.extra = new Array(state.head.extra_len);
            }
            utils.arraySet(
              state.head.extra,
              input,
              next,
              // extra field is limited to 65536 bytes
              // - no need for additional size check
              copy,
              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
              len
            );
            //zmemcpy(state.head.extra + len, next,
            //        len + copy > state.head.extra_max ?
            //        state.head.extra_max - len : copy);
          }
          if (state.flags & 0x0200) {
            state.check = crc32(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          state.length -= copy;
        }
        if (state.length) { break inf_leave; }
      }
      state.length = 0;
      state.mode = NAME;
      /* falls through */
    case NAME:
      if (state.flags & 0x0800) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          // TODO: 2 or 1 bytes?
          len = input[next + copy++];
          /* use constant limit because in js we should not preallocate memory */
          if (state.head && len &&
              (state.length < 65536 /*state.head.name_max*/)) {
            state.head.name += String.fromCharCode(len);
          }
        } while (len && copy < have);

        if (state.flags & 0x0200) {
          state.check = crc32(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.name = null;
      }
      state.length = 0;
      state.mode = COMMENT;
      /* falls through */
    case COMMENT:
      if (state.flags & 0x1000) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          len = input[next + copy++];
          /* use constant limit because in js we should not preallocate memory */
          if (state.head && len &&
              (state.length < 65536 /*state.head.comm_max*/)) {
            state.head.comment += String.fromCharCode(len);
          }
        } while (len && copy < have);
        if (state.flags & 0x0200) {
          state.check = crc32(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.comment = null;
      }
      state.mode = HCRC;
      /* falls through */
    case HCRC:
      if (state.flags & 0x0200) {
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (hold !== (state.check & 0xffff)) {
          strm.msg = 'header crc mismatch';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
      }
      if (state.head) {
        state.head.hcrc = ((state.flags >> 9) & 1);
        state.head.done = true;
      }
      strm.adler = state.check = 0;
      state.mode = TYPE;
      break;
    case DICTID:
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      strm.adler = state.check = zswap32(hold);
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = DICT;
      /* falls through */
    case DICT:
      if (state.havedict === 0) {
        //--- RESTORE() ---
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        //---
        return Z_NEED_DICT;
      }
      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
      state.mode = TYPE;
      /* falls through */
    case TYPE:
      if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case TYPEDO:
      if (state.last) {
        //--- BYTEBITS() ---//
        hold >>>= bits & 7;
        bits -= bits & 7;
        //---//
        state.mode = CHECK;
        break;
      }
      //=== NEEDBITS(3); */
      while (bits < 3) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.last = (hold & 0x01)/*BITS(1)*/;
      //--- DROPBITS(1) ---//
      hold >>>= 1;
      bits -= 1;
      //---//

      switch ((hold & 0x03)/*BITS(2)*/) {
      case 0:                             /* stored block */
        //Tracev((stderr, "inflate:     stored block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = STORED;
        break;
      case 1:                             /* fixed block */
        fixedtables(state);
        //Tracev((stderr, "inflate:     fixed codes block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = LEN_;             /* decode codes */
        if (flush === Z_TREES) {
          //--- DROPBITS(2) ---//
          hold >>>= 2;
          bits -= 2;
          //---//
          break inf_leave;
        }
        break;
      case 2:                             /* dynamic block */
        //Tracev((stderr, "inflate:     dynamic codes block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = TABLE;
        break;
      case 3:
        strm.msg = 'invalid block type';
        state.mode = BAD;
      }
      //--- DROPBITS(2) ---//
      hold >>>= 2;
      bits -= 2;
      //---//
      break;
    case STORED:
      //--- BYTEBITS() ---// /* go to byte boundary */
      hold >>>= bits & 7;
      bits -= bits & 7;
      //---//
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
        strm.msg = 'invalid stored block lengths';
        state.mode = BAD;
        break;
      }
      state.length = hold & 0xffff;
      //Tracev((stderr, "inflate:       stored length %u\n",
      //        state.length));
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = COPY_;
      if (flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case COPY_:
      state.mode = COPY;
      /* falls through */
    case COPY:
      copy = state.length;
      if (copy) {
        if (copy > have) { copy = have; }
        if (copy > left) { copy = left; }
        if (copy === 0) { break inf_leave; }
        //--- zmemcpy(put, next, copy); ---
        utils.arraySet(output, input, next, copy, put);
        //---//
        have -= copy;
        next += copy;
        left -= copy;
        put += copy;
        state.length -= copy;
        break;
      }
      //Tracev((stderr, "inflate:       stored end\n"));
      state.mode = TYPE;
      break;
    case TABLE:
      //=== NEEDBITS(14); */
      while (bits < 14) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
      //--- DROPBITS(5) ---//
      hold >>>= 5;
      bits -= 5;
      //---//
      state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
      //--- DROPBITS(5) ---//
      hold >>>= 5;
      bits -= 5;
      //---//
      state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
      //--- DROPBITS(4) ---//
      hold >>>= 4;
      bits -= 4;
      //---//
//#ifndef PKZIP_BUG_WORKAROUND
      if (state.nlen > 286 || state.ndist > 30) {
        strm.msg = 'too many length or distance symbols';
        state.mode = BAD;
        break;
      }
//#endif
      //Tracev((stderr, "inflate:       table sizes ok\n"));
      state.have = 0;
      state.mode = LENLENS;
      /* falls through */
    case LENLENS:
      while (state.have < state.ncode) {
        //=== NEEDBITS(3);
        while (bits < 3) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
        //--- DROPBITS(3) ---//
        hold >>>= 3;
        bits -= 3;
        //---//
      }
      while (state.have < 19) {
        state.lens[order[state.have++]] = 0;
      }
      // We have separate tables & no pointers. 2 commented lines below not needed.
      //state.next = state.codes;
      //state.lencode = state.next;
      // Switch to use dynamic table
      state.lencode = state.lendyn;
      state.lenbits = 7;

      opts = { bits: state.lenbits };
      ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
      state.lenbits = opts.bits;

      if (ret) {
        strm.msg = 'invalid code lengths set';
        state.mode = BAD;
        break;
      }
      //Tracev((stderr, "inflate:       code lengths ok\n"));
      state.have = 0;
      state.mode = CODELENS;
      /* falls through */
    case CODELENS:
      while (state.have < state.nlen + state.ndist) {
        for (;;) {
          here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        if (here_val < 16) {
          //--- DROPBITS(here.bits) ---//
          hold >>>= here_bits;
          bits -= here_bits;
          //---//
          state.lens[state.have++] = here_val;
        }
        else {
          if (here_val === 16) {
            //=== NEEDBITS(here.bits + 2);
            n = here_bits + 2;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            if (state.have === 0) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD;
              break;
            }
            len = state.lens[state.have - 1];
            copy = 3 + (hold & 0x03);//BITS(2);
            //--- DROPBITS(2) ---//
            hold >>>= 2;
            bits -= 2;
            //---//
          }
          else if (here_val === 17) {
            //=== NEEDBITS(here.bits + 3);
            n = here_bits + 3;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            len = 0;
            copy = 3 + (hold & 0x07);//BITS(3);
            //--- DROPBITS(3) ---//
            hold >>>= 3;
            bits -= 3;
            //---//
          }
          else {
            //=== NEEDBITS(here.bits + 7);
            n = here_bits + 7;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            len = 0;
            copy = 11 + (hold & 0x7f);//BITS(7);
            //--- DROPBITS(7) ---//
            hold >>>= 7;
            bits -= 7;
            //---//
          }
          if (state.have + copy > state.nlen + state.ndist) {
            strm.msg = 'invalid bit length repeat';
            state.mode = BAD;
            break;
          }
          while (copy--) {
            state.lens[state.have++] = len;
          }
        }
      }

      /* handle error breaks in while */
      if (state.mode === BAD) { break; }

      /* check for end-of-block code (better have one) */
      if (state.lens[256] === 0) {
        strm.msg = 'invalid code -- missing end-of-block';
        state.mode = BAD;
        break;
      }

      /* build code tables -- note: do not change the lenbits or distbits
         values here (9 and 6) without reading the comments in inftrees.h
         concerning the ENOUGH constants, which depend on those values */
      state.lenbits = 9;

      opts = { bits: state.lenbits };
      ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
      // We have separate tables & no pointers. 2 commented lines below not needed.
      // state.next_index = opts.table_index;
      state.lenbits = opts.bits;
      // state.lencode = state.next;

      if (ret) {
        strm.msg = 'invalid literal/lengths set';
        state.mode = BAD;
        break;
      }

      state.distbits = 6;
      //state.distcode.copy(state.codes);
      // Switch to use dynamic table
      state.distcode = state.distdyn;
      opts = { bits: state.distbits };
      ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
      // We have separate tables & no pointers. 2 commented lines below not needed.
      // state.next_index = opts.table_index;
      state.distbits = opts.bits;
      // state.distcode = state.next;

      if (ret) {
        strm.msg = 'invalid distances set';
        state.mode = BAD;
        break;
      }
      //Tracev((stderr, 'inflate:       codes ok\n'));
      state.mode = LEN_;
      if (flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case LEN_:
      state.mode = LEN;
      /* falls through */
    case LEN:
      if (have >= 6 && left >= 258) {
        //--- RESTORE() ---
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        //---
        inflate_fast(strm, _out);
        //--- LOAD() ---
        put = strm.next_out;
        output = strm.output;
        left = strm.avail_out;
        next = strm.next_in;
        input = strm.input;
        have = strm.avail_in;
        hold = state.hold;
        bits = state.bits;
        //---

        if (state.mode === TYPE) {
          state.back = -1;
        }
        break;
      }
      state.back = 0;
      for (;;) {
        here = state.lencode[hold & ((1 << state.lenbits) - 1)];  /*BITS(state.lenbits)*/
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if (here_bits <= bits) { break; }
        //--- PULLBYTE() ---//
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
        //---//
      }
      if (here_op && (here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.lencode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        //--- DROPBITS(last.bits) ---//
        hold >>>= last_bits;
        bits -= last_bits;
        //---//
        state.back += last_bits;
      }
      //--- DROPBITS(here.bits) ---//
      hold >>>= here_bits;
      bits -= here_bits;
      //---//
      state.back += here_bits;
      state.length = here_val;
      if (here_op === 0) {
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        state.mode = LIT;
        break;
      }
      if (here_op & 32) {
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.back = -1;
        state.mode = TYPE;
        break;
      }
      if (here_op & 64) {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break;
      }
      state.extra = here_op & 15;
      state.mode = LENEXT;
      /* falls through */
    case LENEXT:
      if (state.extra) {
        //=== NEEDBITS(state.extra);
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.length += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
        //--- DROPBITS(state.extra) ---//
        hold >>>= state.extra;
        bits -= state.extra;
        //---//
        state.back += state.extra;
      }
      //Tracevv((stderr, "inflate:         length %u\n", state.length));
      state.was = state.length;
      state.mode = DIST;
      /* falls through */
    case DIST:
      for (;;) {
        here = state.distcode[hold & ((1 << state.distbits) - 1)];/*BITS(state.distbits)*/
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if ((here_bits) <= bits) { break; }
        //--- PULLBYTE() ---//
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
        //---//
      }
      if ((here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.distcode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        //--- DROPBITS(last.bits) ---//
        hold >>>= last_bits;
        bits -= last_bits;
        //---//
        state.back += last_bits;
      }
      //--- DROPBITS(here.bits) ---//
      hold >>>= here_bits;
      bits -= here_bits;
      //---//
      state.back += here_bits;
      if (here_op & 64) {
        strm.msg = 'invalid distance code';
        state.mode = BAD;
        break;
      }
      state.offset = here_val;
      state.extra = (here_op) & 15;
      state.mode = DISTEXT;
      /* falls through */
    case DISTEXT:
      if (state.extra) {
        //=== NEEDBITS(state.extra);
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.offset += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
        //--- DROPBITS(state.extra) ---//
        hold >>>= state.extra;
        bits -= state.extra;
        //---//
        state.back += state.extra;
      }
//#ifdef INFLATE_STRICT
      if (state.offset > state.dmax) {
        strm.msg = 'invalid distance too far back';
        state.mode = BAD;
        break;
      }
//#endif
      //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
      state.mode = MATCH;
      /* falls through */
    case MATCH:
      if (left === 0) { break inf_leave; }
      copy = _out - left;
      if (state.offset > copy) {         /* copy from window */
        copy = state.offset - copy;
        if (copy > state.whave) {
          if (state.sane) {
            strm.msg = 'invalid distance too far back';
            state.mode = BAD;
            break;
          }
// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//          Trace((stderr, "inflate.c too far\n"));
//          copy -= state.whave;
//          if (copy > state.length) { copy = state.length; }
//          if (copy > left) { copy = left; }
//          left -= copy;
//          state.length -= copy;
//          do {
//            output[put++] = 0;
//          } while (--copy);
//          if (state.length === 0) { state.mode = LEN; }
//          break;
//#endif
        }
        if (copy > state.wnext) {
          copy -= state.wnext;
          from = state.wsize - copy;
        }
        else {
          from = state.wnext - copy;
        }
        if (copy > state.length) { copy = state.length; }
        from_source = state.window;
      }
      else {                              /* copy from output */
        from_source = output;
        from = put - state.offset;
        copy = state.length;
      }
      if (copy > left) { copy = left; }
      left -= copy;
      state.length -= copy;
      do {
        output[put++] = from_source[from++];
      } while (--copy);
      if (state.length === 0) { state.mode = LEN; }
      break;
    case LIT:
      if (left === 0) { break inf_leave; }
      output[put++] = state.length;
      left--;
      state.mode = LEN;
      break;
    case CHECK:
      if (state.wrap) {
        //=== NEEDBITS(32);
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          // Use '|' insdead of '+' to make sure that result is signed
          hold |= input[next++] << bits;
          bits += 8;
        }
        //===//
        _out -= left;
        strm.total_out += _out;
        state.total += _out;
        if (_out) {
          strm.adler = state.check =
              /*UPDATE(state.check, put - _out, _out);*/
              (state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out));

        }
        _out = left;
        // NB: crc32 stored as signed 32-bit int, zswap32 returns signed too
        if ((state.flags ? hold : zswap32(hold)) !== state.check) {
          strm.msg = 'incorrect data check';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        //Tracev((stderr, "inflate:   check matches trailer\n"));
      }
      state.mode = LENGTH;
      /* falls through */
    case LENGTH:
      if (state.wrap && state.flags) {
        //=== NEEDBITS(32);
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (hold !== (state.total & 0xffffffff)) {
          strm.msg = 'incorrect length check';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        //Tracev((stderr, "inflate:   length matches trailer\n"));
      }
      state.mode = DONE;
      /* falls through */
    case DONE:
      ret = Z_STREAM_END;
      break inf_leave;
    case BAD:
      ret = Z_DATA_ERROR;
      break inf_leave;
    case MEM:
      return Z_MEM_ERROR;
    case SYNC:
      /* falls through */
    default:
      return Z_STREAM_ERROR;
    }
  }

  // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

  /*
     Return from inflate(), updating the total counts and the check value.
     If there was no progress during the inflate() call, return a buffer
     error.  Call updatewindow() to create and/or update the window state.
     Note: a memory error from inflate() is non-recoverable.
   */

  //--- RESTORE() ---
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  //---

  if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
                      (state.mode < CHECK || flush !== Z_FINISH))) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
      state.mode = MEM;
      return Z_MEM_ERROR;
    }
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
      (state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out));
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) +
                    (state.mode === TYPE ? 128 : 0) +
                    (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if (((_in === 0 && _out === 0) || flush === Z_FINISH) && ret === Z_OK) {
    ret = Z_BUF_ERROR;
  }
  return ret;
}

function inflateEnd(strm) {

  if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
    return Z_STREAM_ERROR;
  }

  var state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK;
}

function inflateGetHeader(strm, head) {
  var state;

  /* check state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR; }

  /* save header structure */
  state.head = head;
  head.done = false;
  return Z_OK;
}

function inflateSetDictionary(strm, dictionary) {
  var dictLength = dictionary.length;

  var state;
  var dictid;
  var ret;

  /* check state */
  if (!strm /* == Z_NULL */ || !strm.state /* == Z_NULL */) { return Z_STREAM_ERROR; }
  state = strm.state;

  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR;
  }

  /* check for correct dictionary identifier */
  if (state.mode === DICT) {
    dictid = 1; /* adler32(0, null, 0)*/
    /* dictid = adler32(dictid, dictionary, dictLength); */
    dictid = adler32(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR;
    }
  }
  /* copy dictionary to window using updatewindow(), which will amend the
   existing dictionary if appropriate */
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR;
  }
  state.havedict = 1;
  // Tracev((stderr, "inflate:   dictionary set\n"));
  return Z_OK;
}

exports.inflateReset = inflateReset;
exports.inflateReset2 = inflateReset2;
exports.inflateResetKeep = inflateResetKeep;
exports.inflateInit = inflateInit;
exports.inflateInit2 = inflateInit2;
exports.inflate = inflate;
exports.inflateEnd = inflateEnd;
exports.inflateGetHeader = inflateGetHeader;
exports.inflateSetDictionary = inflateSetDictionary;
exports.inflateInfo = 'pako inflate (from Nodeca project)';

/* Not implemented
exports.inflateCopy = inflateCopy;
exports.inflateGetDictionary = inflateGetDictionary;
exports.inflateMark = inflateMark;
exports.inflatePrime = inflatePrime;
exports.inflateSync = inflateSync;
exports.inflateSyncPoint = inflateSyncPoint;
exports.inflateUndermine = inflateUndermine;
*/

},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var utils = require('../utils/common');

var MAXBITS = 15;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
//var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

var CODES = 0;
var LENS = 1;
var DISTS = 2;

var lbase = [ /* Length codes 257..285 base */
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
];

var lext = [ /* Length codes 257..285 extra */
  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
  19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
];

var dbase = [ /* Distance codes 0..29 base */
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577, 0, 0
];

var dext = [ /* Distance codes 0..29 extra */
  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
  23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
  28, 28, 29, 29, 64, 64
];

module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
{
  var bits = opts.bits;
      //here = opts.here; /* table entry for duplication */

  var len = 0;               /* a code's length in bits */
  var sym = 0;               /* index of code symbols */
  var min = 0, max = 0;          /* minimum and maximum code lengths */
  var root = 0;              /* number of index bits for root table */
  var curr = 0;              /* number of index bits for current table */
  var drop = 0;              /* code bits to drop for sub-table */
  var left = 0;                   /* number of prefix codes available */
  var used = 0;              /* code entries in table used */
  var huff = 0;              /* Huffman code */
  var incr;              /* for incrementing code, index */
  var fill;              /* index for replicating entries */
  var low;               /* low bits for current root entry */
  var mask;              /* mask for low root bits */
  var next;             /* next available space in table */
  var base = null;     /* base value table to use */
  var base_index = 0;
//  var shoextra;    /* extra bits table to use */
  var end;                    /* use base and extra for symbol > end */
  var count = new utils.Buf16(MAXBITS + 1); //[MAXBITS+1];    /* number of codes of each length */
  var offs = new utils.Buf16(MAXBITS + 1); //[MAXBITS+1];     /* offsets in table for each length */
  var extra = null;
  var extra_index = 0;

  var here_bits, here_op, here_val;

  /*
   Process a set of code lengths to create a canonical Huffman code.  The
   code lengths are lens[0..codes-1].  Each length corresponds to the
   symbols 0..codes-1.  The Huffman code is generated by first sorting the
   symbols by length from short to long, and retaining the symbol order
   for codes with equal lengths.  Then the code starts with all zero bits
   for the first code of the shortest length, and the codes are integer
   increments for the same length, and zeros are appended as the length
   increases.  For the deflate format, these bits are stored backwards
   from their more natural integer increment ordering, and so when the
   decoding tables are built in the large loop below, the integer codes
   are incremented backwards.

   This routine assumes, but does not check, that all of the entries in
   lens[] are in the range 0..MAXBITS.  The caller must assure this.
   1..MAXBITS is interpreted as that code length.  zero means that that
   symbol does not occur in this code.

   The codes are sorted by computing a count of codes for each length,
   creating from that a table of starting indices for each length in the
   sorted table, and then entering the symbols in order in the sorted
   table.  The sorted table is work[], with that space being provided by
   the caller.

   The length counts are used for other purposes as well, i.e. finding
   the minimum and maximum length codes, determining if there are any
   codes at all, checking for a valid set of lengths, and looking ahead
   at length counts to determine sub-table sizes when building the
   decoding tables.
   */

  /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }

  /* bound code lengths, force root to be within code lengths */
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) { break; }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {                     /* no symbols to code at all */
    //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
    //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
    //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;


    //table.op[opts.table_index] = 64;
    //table.bits[opts.table_index] = 1;
    //table.val[opts.table_index++] = 0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;

    opts.bits = 1;
    return 0;     /* no symbols, but wait for decoding to report error */
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) { break; }
  }
  if (root < min) {
    root = min;
  }

  /* check for an over-subscribed or incomplete set of lengths */
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }        /* over-subscribed */
  }
  if (left > 0 && (type === CODES || max !== 1)) {
    return -1;                      /* incomplete set */
  }

  /* generate offsets into symbol table for each length for sorting */
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }

  /* sort symbols by length, by symbol order within each length */
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }

  /*
   Create and fill in decoding tables.  In this loop, the table being
   filled is at next and has curr index bits.  The code being used is huff
   with length len.  That code is converted to an index by dropping drop
   bits off of the bottom.  For codes where len is less than drop + curr,
   those top drop + curr - len bits are incremented through all values to
   fill the table with replicated entries.

   root is the number of index bits for the root table.  When len exceeds
   root, sub-tables are created pointed to by the root entry with an index
   of the low root bits of huff.  This is saved in low to check for when a
   new sub-table should be started.  drop is zero when the root table is
   being filled, and drop is root when sub-tables are being filled.

   When a new sub-table is needed, it is necessary to look ahead in the
   code lengths to determine what size sub-table is needed.  The length
   counts are used for this, and so count[] is decremented as codes are
   entered in the tables.

   used keeps track of how many table entries have been allocated from the
   provided *table space.  It is checked for LENS and DIST tables against
   the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
   the initial root table size constants.  See the comments in inftrees.h
   for more information.

   sym increments through all symbols, and the loop terminates when
   all codes of length max, i.e. all codes, have been processed.  This
   routine permits incomplete codes, so another loop after this one fills
   in the rest of the decoding tables with invalid code markers.
   */

  /* set up for code type */
  // poor man optimization - use if-else instead of switch,
  // to avoid deopts in old v8
  if (type === CODES) {
    base = extra = work;    /* dummy value--not used */
    end = 19;

  } else if (type === LENS) {
    base = lbase;
    base_index -= 257;
    extra = lext;
    extra_index -= 257;
    end = 256;

  } else {                    /* DISTS */
    base = dbase;
    extra = dext;
    end = -1;
  }

  /* initialize opts for loop */
  huff = 0;                   /* starting code */
  sym = 0;                    /* starting code symbol */
  len = min;                  /* starting code length */
  next = table_index;              /* current table to fill in */
  curr = root;                /* current table index bits */
  drop = 0;                   /* current bits to drop from code for index */
  low = -1;                   /* trigger new sub-table when len > root */
  used = 1 << root;          /* use root table entries */
  mask = used - 1;            /* mask for comparing low */

  /* check available table space */
  if ((type === LENS && used > ENOUGH_LENS) ||
    (type === DISTS && used > ENOUGH_DISTS)) {
    return 1;
  }

  /* process all codes and make table entries */
  for (;;) {
    /* create table entry */
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    }
    else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    }
    else {
      here_op = 32 + 64;         /* end of block */
      here_val = 0;
    }

    /* replicate for those indices with low len bits equal to huff */
    incr = 1 << (len - drop);
    fill = 1 << curr;
    min = fill;                 /* save offset to next table */
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
    } while (fill !== 0);

    /* backwards increment the len-bit code huff */
    incr = 1 << (len - 1);
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }

    /* go to next symbol, update count, len */
    sym++;
    if (--count[len] === 0) {
      if (len === max) { break; }
      len = lens[lens_index + work[sym]];
    }

    /* create new sub-table if needed */
    if (len > root && (huff & mask) !== low) {
      /* if first time, transition to sub-tables */
      if (drop === 0) {
        drop = root;
      }

      /* increment past last table */
      next += min;            /* here min is 1 << curr */

      /* determine length of next table */
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) { break; }
        curr++;
        left <<= 1;
      }

      /* check for enough space */
      used += 1 << curr;
      if ((type === LENS && used > ENOUGH_LENS) ||
        (type === DISTS && used > ENOUGH_DISTS)) {
        return 1;
      }

      /* point entry in root table to sub-table */
      low = huff & mask;
      /*table.op[low] = curr;
      table.bits[low] = root;
      table.val[low] = next - opts.table_index;*/
      table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
    }
  }

  /* fill in remaining table entry if code is incomplete (guaranteed to have
   at most one remaining entry, since if the code is incomplete, the
   maximum code length that was allowed to get this far is one bit) */
  if (huff !== 0) {
    //table.op[next + huff] = 64;            /* invalid code marker */
    //table.bits[next + huff] = len - drop;
    //table.val[next + huff] = 0;
    table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
  }

  /* set return parameters */
  //opts.table_index += used;
  opts.bits = root;
  return 0;
};

},{"../utils/common":41}],51:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

module.exports = {
  2:      'need dictionary',     /* Z_NEED_DICT       2  */
  1:      'stream end',          /* Z_STREAM_END      1  */
  0:      '',                    /* Z_OK              0  */
  '-1':   'file error',          /* Z_ERRNO         (-1) */
  '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
  '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
  '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
  '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
  '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
};

},{}],52:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var utils = require('../utils/common');

/* Public constants ==========================================================*/
/* ===========================================================================*/


//var Z_FILTERED          = 1;
//var Z_HUFFMAN_ONLY      = 2;
//var Z_RLE               = 3;
var Z_FIXED               = 4;
//var Z_DEFAULT_STRATEGY  = 0;

/* Possible values of the data_type field (though see inflate()) */
var Z_BINARY              = 0;
var Z_TEXT                = 1;
//var Z_ASCII             = 1; // = Z_TEXT
var Z_UNKNOWN             = 2;

/*============================================================================*/


function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }

// From zutil.h

var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES    = 2;
/* The three kinds of block type */

var MIN_MATCH    = 3;
var MAX_MATCH    = 258;
/* The minimum and maximum match lengths */

// From deflate.h
/* ===========================================================================
 * Internal compression state.
 */

var LENGTH_CODES  = 29;
/* number of length codes, not counting the special END_BLOCK code */

var LITERALS      = 256;
/* number of literal bytes 0..255 */

var L_CODES       = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */

var D_CODES       = 30;
/* number of distance codes */

var BL_CODES      = 19;
/* number of codes used to transfer the bit lengths */

var HEAP_SIZE     = 2 * L_CODES + 1;
/* maximum heap size */

var MAX_BITS      = 15;
/* All codes must not exceed MAX_BITS bits */

var Buf_size      = 16;
/* size of bit buffer in bi_buf */


/* ===========================================================================
 * Constants
 */

var MAX_BL_BITS = 7;
/* Bit length codes must not exceed MAX_BL_BITS bits */

var END_BLOCK   = 256;
/* end of block literal code */

var REP_3_6     = 16;
/* repeat previous bit length 3-6 times (2 bits of repeat count) */

var REPZ_3_10   = 17;
/* repeat a zero length 3-10 times  (3 bits of repeat count) */

var REPZ_11_138 = 18;
/* repeat a zero length 11-138 times  (7 bits of repeat count) */

/* eslint-disable comma-spacing,array-bracket-spacing */
var extra_lbits =   /* extra bits for each length code */
  [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

var extra_dbits =   /* extra bits for each distance code */
  [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

var extra_blbits =  /* extra bits for each bit length code */
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];

var bl_order =
  [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
/* eslint-enable comma-spacing,array-bracket-spacing */

/* The lengths of the bit length codes are sent in order of decreasing
 * probability, to avoid transmitting the lengths for unused bit length codes.
 */

/* ===========================================================================
 * Local data. These are initialized only once.
 */

// We pre-fill arrays with 0 to avoid uninitialized gaps

var DIST_CODE_LEN = 512; /* see definition of array dist_code below */

// !!!! Use flat array insdead of structure, Freq = i*2, Len = i*2+1
var static_ltree  = new Array((L_CODES + 2) * 2);
zero(static_ltree);
/* The static literal tree. Since the bit lengths are imposed, there is no
 * need for the L_CODES extra codes used during heap construction. However
 * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
 * below).
 */

var static_dtree  = new Array(D_CODES * 2);
zero(static_dtree);
/* The static distance tree. (Actually a trivial tree since all codes use
 * 5 bits.)
 */

var _dist_code    = new Array(DIST_CODE_LEN);
zero(_dist_code);
/* Distance codes. The first 256 values correspond to the distances
 * 3 .. 258, the last 256 values correspond to the top 8 bits of
 * the 15 bit distances.
 */

var _length_code  = new Array(MAX_MATCH - MIN_MATCH + 1);
zero(_length_code);
/* length code for each normalized match length (0 == MIN_MATCH) */

var base_length   = new Array(LENGTH_CODES);
zero(base_length);
/* First normalized length for each code (0 = MIN_MATCH) */

var base_dist     = new Array(D_CODES);
zero(base_dist);
/* First normalized distance for each code (0 = distance of 1) */


function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {

  this.static_tree  = static_tree;  /* static tree or NULL */
  this.extra_bits   = extra_bits;   /* extra bits for each code or NULL */
  this.extra_base   = extra_base;   /* base index for extra_bits */
  this.elems        = elems;        /* max number of elements in the tree */
  this.max_length   = max_length;   /* max bit length for the codes */

  // show if `static_tree` has data or dummy - needed for monomorphic objects
  this.has_stree    = static_tree && static_tree.length;
}


var static_l_desc;
var static_d_desc;
var static_bl_desc;


function TreeDesc(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;     /* the dynamic tree */
  this.max_code = 0;            /* largest code with non zero frequency */
  this.stat_desc = stat_desc;   /* the corresponding static tree */
}



function d_code(dist) {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
}


/* ===========================================================================
 * Output a short LSB first on the stream.
 * IN assertion: there is enough room in pendingBuf.
 */
function put_short(s, w) {
//    put_byte(s, (uch)((w) & 0xff));
//    put_byte(s, (uch)((ush)(w) >> 8));
  s.pending_buf[s.pending++] = (w) & 0xff;
  s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
}


/* ===========================================================================
 * Send a value on a given number of bits.
 * IN assertion: length <= 16 and value fits in length bits.
 */
function send_bits(s, value, length) {
  if (s.bi_valid > (Buf_size - length)) {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> (Buf_size - s.bi_valid);
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    s.bi_valid += length;
  }
}


function send_code(s, c, tree) {
  send_bits(s, tree[c * 2]/*.Code*/, tree[c * 2 + 1]/*.Len*/);
}


/* ===========================================================================
 * Reverse the first len bits of a code, using straightforward code (a faster
 * method would use a table)
 * IN assertion: 1 <= len <= 15
 */
function bi_reverse(code, len) {
  var res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
}


/* ===========================================================================
 * Flush the bit buffer, keeping at most 7 bits in it.
 */
function bi_flush(s) {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;

  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 0xff;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
}


/* ===========================================================================
 * Compute the optimal bit lengths for a tree and update the total bit length
 * for the current block.
 * IN assertion: the fields freq and dad are set, heap[heap_max] and
 *    above are the tree nodes sorted by increasing frequency.
 * OUT assertions: the field len is set to the optimal bit length, the
 *     array bl_count contains the frequencies for each bit length.
 *     The length opt_len is updated; static_len is also updated if stree is
 *     not null.
 */
function gen_bitlen(s, desc)
//    deflate_state *s;
//    tree_desc *desc;    /* the tree descriptor */
{
  var tree            = desc.dyn_tree;
  var max_code        = desc.max_code;
  var stree           = desc.stat_desc.static_tree;
  var has_stree       = desc.stat_desc.has_stree;
  var extra           = desc.stat_desc.extra_bits;
  var base            = desc.stat_desc.extra_base;
  var max_length      = desc.stat_desc.max_length;
  var h;              /* heap index */
  var n, m;           /* iterate over the tree elements */
  var bits;           /* bit length */
  var xbits;          /* extra bits */
  var f;              /* frequency */
  var overflow = 0;   /* number of elements with bit length too large */

  for (bits = 0; bits <= MAX_BITS; bits++) {
    s.bl_count[bits] = 0;
  }

  /* In a first pass, compute the optimal bit lengths (which may
   * overflow in the case of the bit length tree).
   */
  tree[s.heap[s.heap_max] * 2 + 1]/*.Len*/ = 0; /* root of the heap */

  for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
    n = s.heap[h];
    bits = tree[tree[n * 2 + 1]/*.Dad*/ * 2 + 1]/*.Len*/ + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n * 2 + 1]/*.Len*/ = bits;
    /* We overwrite tree[n].Dad which is no longer needed */

    if (n > max_code) { continue; } /* not a leaf node */

    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) {
      xbits = extra[n - base];
    }
    f = tree[n * 2]/*.Freq*/;
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n * 2 + 1]/*.Len*/ + xbits);
    }
  }
  if (overflow === 0) { return; }

  // Trace((stderr,"\nbit length overflow\n"));
  /* This happens for example on obj2 and pic of the Calgary corpus */

  /* Find the first bit length which could increase: */
  do {
    bits = max_length - 1;
    while (s.bl_count[bits] === 0) { bits--; }
    s.bl_count[bits]--;      /* move one leaf down the tree */
    s.bl_count[bits + 1] += 2; /* move one overflow item as its brother */
    s.bl_count[max_length]--;
    /* The brother of the overflow item also moves one step up,
     * but this does not affect bl_count[max_length]
     */
    overflow -= 2;
  } while (overflow > 0);

  /* Now recompute all bit lengths, scanning in increasing frequency.
   * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
   * lengths instead of fixing only the wrong ones. This idea is taken
   * from 'ar' written by Haruhiko Okumura.)
   */
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) { continue; }
      if (tree[m * 2 + 1]/*.Len*/ !== bits) {
        // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
        s.opt_len += (bits - tree[m * 2 + 1]/*.Len*/) * tree[m * 2]/*.Freq*/;
        tree[m * 2 + 1]/*.Len*/ = bits;
      }
      n--;
    }
  }
}


/* ===========================================================================
 * Generate the codes for a given tree and bit counts (which need not be
 * optimal).
 * IN assertion: the array bl_count contains the bit length statistics for
 * the given tree and the field len is set for all tree elements.
 * OUT assertion: the field code is set for all tree elements of non
 *     zero code length.
 */
function gen_codes(tree, max_code, bl_count)
//    ct_data *tree;             /* the tree to decorate */
//    int max_code;              /* largest code with non zero frequency */
//    ushf *bl_count;            /* number of codes at each bit length */
{
  var next_code = new Array(MAX_BITS + 1); /* next code value for each bit length */
  var code = 0;              /* running code value */
  var bits;                  /* bit index */
  var n;                     /* code index */

  /* The distribution counts are first used to generate the code values
   * without bit reversal.
   */
  for (bits = 1; bits <= MAX_BITS; bits++) {
    next_code[bits] = code = (code + bl_count[bits - 1]) << 1;
  }
  /* Check that the bit counts in bl_count are consistent. The last code
   * must be all ones.
   */
  //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
  //        "inconsistent bit counts");
  //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

  for (n = 0;  n <= max_code; n++) {
    var len = tree[n * 2 + 1]/*.Len*/;
    if (len === 0) { continue; }
    /* Now reverse the bits */
    tree[n * 2]/*.Code*/ = bi_reverse(next_code[len]++, len);

    //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
    //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
  }
}


/* ===========================================================================
 * Initialize the various 'constant' tables.
 */
function tr_static_init() {
  var n;        /* iterates over tree elements */
  var bits;     /* bit counter */
  var length;   /* length value */
  var code;     /* code value */
  var dist;     /* distance index */
  var bl_count = new Array(MAX_BITS + 1);
  /* number of codes at each bit length for an optimal tree */

  // do check in _tr_init()
  //if (static_init_done) return;

  /* For some embedded targets, global variables are not initialized: */
/*#ifdef NO_INIT_GLOBAL_POINTERS
  static_l_desc.static_tree = static_ltree;
  static_l_desc.extra_bits = extra_lbits;
  static_d_desc.static_tree = static_dtree;
  static_d_desc.extra_bits = extra_dbits;
  static_bl_desc.extra_bits = extra_blbits;
#endif*/

  /* Initialize the mapping length (0..255) -> length code (0..28) */
  length = 0;
  for (code = 0; code < LENGTH_CODES - 1; code++) {
    base_length[code] = length;
    for (n = 0; n < (1 << extra_lbits[code]); n++) {
      _length_code[length++] = code;
    }
  }
  //Assert (length == 256, "tr_static_init: length != 256");
  /* Note that the length 255 (match length 258) can be represented
   * in two different ways: code 284 + 5 bits or code 285, so we
   * overwrite length_code[255] to use the best encoding:
   */
  _length_code[length - 1] = code;

  /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
  dist = 0;
  for (code = 0; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < (1 << extra_dbits[code]); n++) {
      _dist_code[dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: dist != 256");
  dist >>= 7; /* from now on, all distances are divided by 128 */
  for (; code < D_CODES; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
      _dist_code[256 + dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: 256+dist != 512");

  /* Construct the codes of the static literal tree */
  for (bits = 0; bits <= MAX_BITS; bits++) {
    bl_count[bits] = 0;
  }

  n = 0;
  while (n <= 143) {
    static_ltree[n * 2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n * 2 + 1]/*.Len*/ = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n * 2 + 1]/*.Len*/ = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n * 2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  /* Codes 286 and 287 do not exist, but we must include them in the
   * tree construction to get a canonical Huffman tree (longest code
   * all ones)
   */
  gen_codes(static_ltree, L_CODES + 1, bl_count);

  /* The static distance tree is trivial: */
  for (n = 0; n < D_CODES; n++) {
    static_dtree[n * 2 + 1]/*.Len*/ = 5;
    static_dtree[n * 2]/*.Code*/ = bi_reverse(n, 5);
  }

  // Now data ready and we can init static trees
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES, MAX_BITS);
  static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES, MAX_BL_BITS);

  //static_init_done = true;
}


/* ===========================================================================
 * Initialize a new block.
 */
function init_block(s) {
  var n; /* iterates over tree elements */

  /* Initialize the trees. */
  for (n = 0; n < L_CODES;  n++) { s.dyn_ltree[n * 2]/*.Freq*/ = 0; }
  for (n = 0; n < D_CODES;  n++) { s.dyn_dtree[n * 2]/*.Freq*/ = 0; }
  for (n = 0; n < BL_CODES; n++) { s.bl_tree[n * 2]/*.Freq*/ = 0; }

  s.dyn_ltree[END_BLOCK * 2]/*.Freq*/ = 1;
  s.opt_len = s.static_len = 0;
  s.last_lit = s.matches = 0;
}


/* ===========================================================================
 * Flush the bit buffer and align the output on a byte boundary
 */
function bi_windup(s)
{
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    //put_byte(s, (Byte)s->bi_buf);
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
}

/* ===========================================================================
 * Copy a stored block, storing first the length and its
 * one's complement if requested.
 */
function copy_block(s, buf, len, header)
//DeflateState *s;
//charf    *buf;    /* the input data */
//unsigned len;     /* its length */
//int      header;  /* true if block header must be written */
{
  bi_windup(s);        /* align on byte boundary */

  if (header) {
    put_short(s, len);
    put_short(s, ~len);
  }
//  while (len--) {
//    put_byte(s, *buf++);
//  }
  utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
  s.pending += len;
}

/* ===========================================================================
 * Compares to subtrees, using the tree depth as tie breaker when
 * the subtrees have equal frequency. This minimizes the worst case length.
 */
function smaller(tree, n, m, depth) {
  var _n2 = n * 2;
  var _m2 = m * 2;
  return (tree[_n2]/*.Freq*/ < tree[_m2]/*.Freq*/ ||
         (tree[_n2]/*.Freq*/ === tree[_m2]/*.Freq*/ && depth[n] <= depth[m]));
}

/* ===========================================================================
 * Restore the heap property by moving down the tree starting at node k,
 * exchanging a node with the smallest of its two sons if necessary, stopping
 * when the heap property is re-established (each father smaller than its
 * two sons).
 */
function pqdownheap(s, tree, k)
//    deflate_state *s;
//    ct_data *tree;  /* the tree to restore */
//    int k;               /* node to move down */
{
  var v = s.heap[k];
  var j = k << 1;  /* left son of k */
  while (j <= s.heap_len) {
    /* Set j to the smallest of the two sons: */
    if (j < s.heap_len &&
      smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
      j++;
    }
    /* Exit if v is smaller than both sons */
    if (smaller(tree, v, s.heap[j], s.depth)) { break; }

    /* Exchange v with the smallest son */
    s.heap[k] = s.heap[j];
    k = j;

    /* And continue down the tree, setting j to the left son of k */
    j <<= 1;
  }
  s.heap[k] = v;
}


// inlined manually
// var SMALLEST = 1;

/* ===========================================================================
 * Send the block data compressed using the given Huffman trees
 */
function compress_block(s, ltree, dtree)
//    deflate_state *s;
//    const ct_data *ltree; /* literal tree */
//    const ct_data *dtree; /* distance tree */
{
  var dist;           /* distance of matched string */
  var lc;             /* match length or unmatched char (if dist == 0) */
  var lx = 0;         /* running index in l_buf */
  var code;           /* the code to send */
  var extra;          /* number of extra bits to send */

  if (s.last_lit !== 0) {
    do {
      dist = (s.pending_buf[s.d_buf + lx * 2] << 8) | (s.pending_buf[s.d_buf + lx * 2 + 1]);
      lc = s.pending_buf[s.l_buf + lx];
      lx++;

      if (dist === 0) {
        send_code(s, lc, ltree); /* send a literal byte */
        //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
      } else {
        /* Here, lc is the match length - MIN_MATCH */
        code = _length_code[lc];
        send_code(s, code + LITERALS + 1, ltree); /* send the length code */
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);       /* send the extra length bits */
        }
        dist--; /* dist is now the match distance - 1 */
        code = d_code(dist);
        //Assert (code < D_CODES, "bad d_code");

        send_code(s, code, dtree);       /* send the distance code */
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);   /* send the extra distance bits */
        }
      } /* literal or match pair ? */

      /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
      //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
      //       "pendingBuf overflow");

    } while (lx < s.last_lit);
  }

  send_code(s, END_BLOCK, ltree);
}


/* ===========================================================================
 * Construct one Huffman tree and assigns the code bit strings and lengths.
 * Update the total bit length for the current block.
 * IN assertion: the field freq is set for all tree elements.
 * OUT assertions: the fields len and code are set to the optimal bit length
 *     and corresponding code. The length opt_len is updated; static_len is
 *     also updated if stree is not null. The field max_code is set.
 */
function build_tree(s, desc)
//    deflate_state *s;
//    tree_desc *desc; /* the tree descriptor */
{
  var tree     = desc.dyn_tree;
  var stree    = desc.stat_desc.static_tree;
  var has_stree = desc.stat_desc.has_stree;
  var elems    = desc.stat_desc.elems;
  var n, m;          /* iterate over heap elements */
  var max_code = -1; /* largest code with non zero frequency */
  var node;          /* new node being created */

  /* Construct the initial heap, with least frequent element in
   * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
   * heap[0] is not used.
   */
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE;

  for (n = 0; n < elems; n++) {
    if (tree[n * 2]/*.Freq*/ !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;

    } else {
      tree[n * 2 + 1]/*.Len*/ = 0;
    }
  }

  /* The pkzip format requires that at least one distance code exists,
   * and that at least one bit should be sent even if there is only one
   * possible code. So to avoid special checks later on we force at least
   * two codes of non zero frequency.
   */
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
    tree[node * 2]/*.Freq*/ = 1;
    s.depth[node] = 0;
    s.opt_len--;

    if (has_stree) {
      s.static_len -= stree[node * 2 + 1]/*.Len*/;
    }
    /* node is 0 or 1 so it does not have extra bits */
  }
  desc.max_code = max_code;

  /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
   * establish sub-heaps of increasing lengths:
   */
  for (n = (s.heap_len >> 1/*int /2*/); n >= 1; n--) { pqdownheap(s, tree, n); }

  /* Construct the Huffman tree by repeatedly combining the least two
   * frequent nodes.
   */
  node = elems;              /* next internal node of the tree */
  do {
    //pqremove(s, tree, n);  /* n = node of least frequency */
    /*** pqremove ***/
    n = s.heap[1/*SMALLEST*/];
    s.heap[1/*SMALLEST*/] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1/*SMALLEST*/);
    /***/

    m = s.heap[1/*SMALLEST*/]; /* m = node of next least frequency */

    s.heap[--s.heap_max] = n; /* keep the nodes sorted by frequency */
    s.heap[--s.heap_max] = m;

    /* Create a new node father of n and m */
    tree[node * 2]/*.Freq*/ = tree[n * 2]/*.Freq*/ + tree[m * 2]/*.Freq*/;
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n * 2 + 1]/*.Dad*/ = tree[m * 2 + 1]/*.Dad*/ = node;

    /* and insert the new node in the heap */
    s.heap[1/*SMALLEST*/] = node++;
    pqdownheap(s, tree, 1/*SMALLEST*/);

  } while (s.heap_len >= 2);

  s.heap[--s.heap_max] = s.heap[1/*SMALLEST*/];

  /* At this point, the fields freq and dad are set. We can now
   * generate the bit lengths.
   */
  gen_bitlen(s, desc);

  /* The field len is now set, we can generate the bit codes */
  gen_codes(tree, max_code, s.bl_count);
}


/* ===========================================================================
 * Scan a literal or distance tree to determine the frequencies of the codes
 * in the bit length tree.
 */
function scan_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree;   /* the tree to be scanned */
//    int max_code;    /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0 * 2 + 1]/*.Len*/; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code + 1) * 2 + 1]/*.Len*/ = 0xffff; /* guard */

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      s.bl_tree[curlen * 2]/*.Freq*/ += count;

    } else if (curlen !== 0) {

      if (curlen !== prevlen) { s.bl_tree[curlen * 2]/*.Freq*/++; }
      s.bl_tree[REP_3_6 * 2]/*.Freq*/++;

    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10 * 2]/*.Freq*/++;

    } else {
      s.bl_tree[REPZ_11_138 * 2]/*.Freq*/++;
    }

    count = 0;
    prevlen = curlen;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Send a literal or distance tree in compressed form, using the codes in
 * bl_tree.
 */
function send_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree; /* the tree to be scanned */
//    int max_code;       /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0 * 2 + 1]/*.Len*/; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  /* tree[max_code+1].Len = -1; */  /* guard already set */
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);

    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      //Assert(count >= 3 && count <= 6, " 3_6?");
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count - 3, 2);

    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count - 3, 3);

    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count - 11, 7);
    }

    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Construct the Huffman tree for the bit lengths and return the index in
 * bl_order of the last bit length code to send.
 */
function build_bl_tree(s) {
  var max_blindex;  /* index of last bit length code of non zero freq */

  /* Determine the bit length frequencies for literal and distance trees */
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

  /* Build the bit length tree: */
  build_tree(s, s.bl_desc);
  /* opt_len now includes the length of the tree representations, except
   * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
   */

  /* Determine the number of bit length codes to send. The pkzip format
   * requires that at least 4 bit length codes be sent. (appnote.txt says
   * 3 but the actual value used is 4.)
   */
  for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex] * 2 + 1]/*.Len*/ !== 0) {
      break;
    }
  }
  /* Update opt_len to include the bit length tree and counts */
  s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
  //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
  //        s->opt_len, s->static_len));

  return max_blindex;
}


/* ===========================================================================
 * Send the header for a block using dynamic Huffman trees: the counts, the
 * lengths of the bit length codes, the literal tree and the distance tree.
 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
 */
function send_all_trees(s, lcodes, dcodes, blcodes)
//    deflate_state *s;
//    int lcodes, dcodes, blcodes; /* number of codes for each tree */
{
  var rank;                    /* index in bl_order */

  //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
  //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
  //        "too many codes");
  //Tracev((stderr, "\nbl counts: "));
  send_bits(s, lcodes - 257, 5); /* not +255 as stated in appnote.txt */
  send_bits(s, dcodes - 1,   5);
  send_bits(s, blcodes - 4,  4); /* not -3 as stated in appnote.txt */
  for (rank = 0; rank < blcodes; rank++) {
    //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
    send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1]/*.Len*/, 3);
  }
  //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_ltree, lcodes - 1); /* literal tree */
  //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_dtree, dcodes - 1); /* distance tree */
  //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
}


/* ===========================================================================
 * Check if the data type is TEXT or BINARY, using the following algorithm:
 * - TEXT if the two conditions below are satisfied:
 *    a) There are no non-portable control characters belonging to the
 *       "black list" (0..6, 14..25, 28..31).
 *    b) There is at least one printable character belonging to the
 *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
 * - BINARY otherwise.
 * - The following partially-portable control characters form a
 *   "gray list" that is ignored in this detection algorithm:
 *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
 * IN assertion: the fields Freq of dyn_ltree are set.
 */
function detect_data_type(s) {
  /* black_mask is the bit mask of black-listed bytes
   * set bits 0..6, 14..25, and 28..31
   * 0xf3ffc07f = binary 11110011111111111100000001111111
   */
  var black_mask = 0xf3ffc07f;
  var n;

  /* Check for non-textual ("black-listed") bytes. */
  for (n = 0; n <= 31; n++, black_mask >>>= 1) {
    if ((black_mask & 1) && (s.dyn_ltree[n * 2]/*.Freq*/ !== 0)) {
      return Z_BINARY;
    }
  }

  /* Check for textual ("white-listed") bytes. */
  if (s.dyn_ltree[9 * 2]/*.Freq*/ !== 0 || s.dyn_ltree[10 * 2]/*.Freq*/ !== 0 ||
      s.dyn_ltree[13 * 2]/*.Freq*/ !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS; n++) {
    if (s.dyn_ltree[n * 2]/*.Freq*/ !== 0) {
      return Z_TEXT;
    }
  }

  /* There are no "black-listed" or "white-listed" bytes:
   * this stream either is empty or has tolerated ("gray-listed") bytes only.
   */
  return Z_BINARY;
}


var static_init_done = false;

/* ===========================================================================
 * Initialize the tree data structures for a new zlib stream.
 */
function _tr_init(s)
{

  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }

  s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

  s.bi_buf = 0;
  s.bi_valid = 0;

  /* Initialize the first block of the first file: */
  init_block(s);
}


/* ===========================================================================
 * Send a stored block
 */
function _tr_stored_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);    /* send block type */
  copy_block(s, buf, stored_len, true); /* with header */
}


/* ===========================================================================
 * Send one empty static block to give enough lookahead for inflate.
 * This takes 10 bits, of which 7 may remain in the bit buffer.
 */
function _tr_align(s) {
  send_bits(s, STATIC_TREES << 1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
}


/* ===========================================================================
 * Determine the best encoding for the current block: dynamic trees, static
 * trees or store, and output the encoded block to the zip file.
 */
function _tr_flush_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block, or NULL if too old */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  var opt_lenb, static_lenb;  /* opt_len and static_len in bytes */
  var max_blindex = 0;        /* index of last bit length code of non zero freq */

  /* Build the Huffman trees unless a stored block is forced */
  if (s.level > 0) {

    /* Check if the file is binary or text */
    if (s.strm.data_type === Z_UNKNOWN) {
      s.strm.data_type = detect_data_type(s);
    }

    /* Construct the literal and distance trees */
    build_tree(s, s.l_desc);
    // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));

    build_tree(s, s.d_desc);
    // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));
    /* At this point, opt_len and static_len are the total bit lengths of
     * the compressed block data, excluding the tree representations.
     */

    /* Build the bit length tree for the above two trees, and get the index
     * in bl_order of the last bit length code to send.
     */
    max_blindex = build_bl_tree(s);

    /* Determine the best encoding. Compute the block lengths in bytes. */
    opt_lenb = (s.opt_len + 3 + 7) >>> 3;
    static_lenb = (s.static_len + 3 + 7) >>> 3;

    // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
    //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
    //        s->last_lit));

    if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }

  } else {
    // Assert(buf != (char*)0, "lost buf");
    opt_lenb = static_lenb = stored_len + 5; /* force a stored block */
  }

  if ((stored_len + 4 <= opt_lenb) && (buf !== -1)) {
    /* 4: two words for the lengths */

    /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
     * Otherwise we can't have processed more than WSIZE input bytes since
     * the last block flush, because compression would have been
     * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
     * transform a block into a stored block.
     */
    _tr_stored_block(s, buf, stored_len, last);

  } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {

    send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);

  } else {
    send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  // Assert (s->compressed_len == s->bits_sent, "bad compressed size");
  /* The above check is made mod 2^32, for files larger than 512 MB
   * and uLong implemented on 32 bits.
   */
  init_block(s);

  if (last) {
    bi_windup(s);
  }
  // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
  //       s->compressed_len-7*last));
}

/* ===========================================================================
 * Save the match info and tally the frequency counts. Return true if
 * the current block must be flushed.
 */
function _tr_tally(s, dist, lc)
//    deflate_state *s;
//    unsigned dist;  /* distance of matched string */
//    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
{
  //var out_length, in_length, dcode;

  s.pending_buf[s.d_buf + s.last_lit * 2]     = (dist >>> 8) & 0xff;
  s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

  s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
  s.last_lit++;

  if (dist === 0) {
    /* lc is the unmatched char */
    s.dyn_ltree[lc * 2]/*.Freq*/++;
  } else {
    s.matches++;
    /* Here, lc is the match length - MIN_MATCH */
    dist--;             /* dist = match distance - 1 */
    //Assert((ush)dist < (ush)MAX_DIST(s) &&
    //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
    //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

    s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]/*.Freq*/++;
    s.dyn_dtree[d_code(dist) * 2]/*.Freq*/++;
  }

// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility

//#ifdef TRUNCATE_BLOCK
//  /* Try to guess if it is profitable to stop the current block here */
//  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
//    /* Compute an upper bound for the compressed length */
//    out_length = s.last_lit*8;
//    in_length = s.strstart - s.block_start;
//
//    for (dcode = 0; dcode < D_CODES; dcode++) {
//      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
//    }
//    out_length >>>= 3;
//    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
//    //       s->last_lit, in_length, out_length,
//    //       100L - out_length*100L/in_length));
//    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
//      return true;
//    }
//  }
//#endif

  return (s.last_lit === s.lit_bufsize - 1);
  /* We avoid equality with lit_bufsize because of wraparound at 64K
   * on 16 bit machines and because stored blocks are restricted to
   * 64K-1 bytes.
   */
}

exports._tr_init  = _tr_init;
exports._tr_stored_block = _tr_stored_block;
exports._tr_flush_block  = _tr_flush_block;
exports._tr_tally = _tr_tally;
exports._tr_align = _tr_align;

},{"../utils/common":41}],53:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function ZStream() {
  /* next input byte */
  this.input = null; // JS specific, because we have no pointers
  this.next_in = 0;
  /* number of bytes available at input */
  this.avail_in = 0;
  /* total number of input bytes read so far */
  this.total_in = 0;
  /* next output byte should be put there */
  this.output = null; // JS specific, because we have no pointers
  this.next_out = 0;
  /* remaining free space at output */
  this.avail_out = 0;
  /* total number of bytes output so far */
  this.total_out = 0;
  /* last error message, NULL if no error */
  this.msg = ''/*Z_NULL*/;
  /* not visible by applications */
  this.state = null;
  /* best guess about the data type: binary or text */
  this.data_type = 2/*Z_UNKNOWN*/;
  /* adler32 value of the uncompressed data */
  this.adler = 0;
}

module.exports = ZStream;

},{}],54:[function(require,module,exports){
'use strict';
module.exports = typeof setImmediate === 'function' ? setImmediate :
	function setImmediate() {
		var args = [].slice.apply(arguments);
		args.splice(1, 0, 0);
		setTimeout.apply(null, args);
	};

},{}]},{},[10])(10)
});
/* jshint ignore:end */
})($N,$N[$E],$N[$E]);return $N[$E];})({},'exports');


/*jszip-utils.min.js*/
$N[0][$N[2]]=(function($N,$E){$N[$E]={};(function(module,exports,window){
/* jshint ignore:start */
!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.JSZipUtils=e():"undefined"!=typeof global?global.JSZipUtils=e():"undefined"!=typeof self&&(self.JSZipUtils=e())}(function(){return function o(i,f,u){function s(n,e){if(!f[n]){if(!i[n]){var t="function"==typeof require&&require;if(!e&&t)return t(n,!0);if(a)return a(n,!0);throw new Error("Cannot find module '"+n+"'")}var r=f[n]={exports:{}};i[n][0].call(r.exports,function(e){var t=i[n][1][e];return s(t||e)},r,r.exports,o,i,f,u)}return f[n].exports}for(var a="function"==typeof require&&require,e=0;e<u.length;e++)s(u[e]);return s}({1:[function(e,t,n){"use strict";var u={};function r(){try{return new window.XMLHttpRequest}catch(e){}}u._getBinaryFromXHR=function(e){return e.response||e.responseText};var s="undefined"!=typeof window&&window.ActiveXObject?function(){return r()||function(){try{return new window.ActiveXObject("Microsoft.XMLHTTP")}catch(e){}}()}:r;u.getBinaryContent=function(t,n){var e,r,o,i;"function"==typeof(n=n||{})?(i=n,n={}):"function"==typeof n.callback&&(i=n.callback),i||"undefined"==typeof Promise?(r=function(e){i(null,e)},o=function(e){i(e,null)}):e=new Promise(function(e,t){r=e,o=t});try{var f=s();f.open("GET",t,!0),"responseType"in f&&(f.responseType="arraybuffer"),f.overrideMimeType&&f.overrideMimeType("text/plain; charset=x-user-defined"),f.onreadystatechange=function(e){if(4===f.readyState)if(200===f.status||0===f.status)try{r(u._getBinaryFromXHR(f))}catch(e){o(new Error(e))}else o(new Error("Ajax error for "+t+" : "+this.status+" "+this.statusText))},n.progress&&(f.onprogress=function(e){n.progress({path:t,originalEvent:e,percent:e.loaded/e.total*100,loaded:e.loaded,total:e.total})}),f.send()}catch(e){o(new Error(e),null)}return e},t.exports=u},{}]},{},[1])(1)});
/* jshint ignore:end */
})($N,$N[$E],$N[$E]);return $N[$E];})({},'exports');


/*fs_jszip.js*/
$N[0][$N[3]]=(function($N){
//jshint -W104
//jshint -W119

function fs_JSZip (exports,data,zipWrap,JSZip,nodePath,cb) {

    if (!(typeof JSZip!=='undefined' && typeof JSZip.loadAsync === 'function' ) ) return;

    JSZip.loadAsync(data).then(function (zip) {
        var
        ab2str            = function ab2str(buf) {
          return String.fromCharCode.apply(null, new Uint16Array(buf));
        },
        str2ab            = function str2ab(str) {
          var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
          var bufView = new Uint16Array(buf);
          for (var i=0, strLen=str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
          }
          return buf;
        },
        cwd               = "/";

        zipWrap(zip,nodePath,function(wrapped,totalBytes){

            var
            find_entry_from_path=function find_entry_from_path(path){
                var

                zip_fn = path,
                found  = zip.files[zip_fn];

                if (!found) {
                    if (!(found = zip.files[(zip_fn = path+"/")])) {
                        if (!(found = zip.files[(zip_fn = path.substr(1))] )) {
                            if (!(found = zip.files[(zip_fn = zip_fn+"/")])){
                                zip_fn=path;
                                if (zip_fn==="/") {
                                    found = {
                                        name : "/",
                                        dir  : true
                                    };
                                }
                            }
                        }
                    }
                }

                return {
                    found  : found,
                    zip_fn : zip_fn
                };
            },

            zip_fn_from_path = function zip_fn_from_path(path){return find_entry_from_path(path).zip_fn;},

            zip_resolve=function zip_resolve(path) {
                // 1) resolve true_path (reduce any double slashes to single slashes:
                // "." --> cwd (default "/")
                // "./file.ext" --> cwd/file.ext ( default "/file.ext")
                // "file.text" --> cwd/file.ext  ( default "/file.ext")
                // "/some/other/path/file.ext" --> "/some/other/path/file.ext"
                // "/some///other/path/file.ext" --> "/some/other/path/file.ext"
                // 2) get full file list from zip.files, and fixup any entries that don't have leading /
                // "path/file.ext" --> "/path/file.ext"
                // "file.ext" --> "/file.ext"
                // "/some/other/path/file.ext" --> "/some/other/path/file.ext"
                // 3) lookup true_path in fixed file list, call any match "found"
                // 4) return all this info to caller in standardzed format

                var errpath = path;

                path = wrapped.true_path_from_relative_path(cwd,path);

                var
                dir_basename = path.split("/"),
                basename = dir_basename.pop(),
                dirname  = '/'+dir_basename.filter(function(f){return f.length>0;}).join("/"),
                find     = find_entry_from_path(path);
                return {
                    path      : errpath,                     // what user passed in
                    true_path : path,                        // force "path/to/sub/file.ext" ---> "/path/to/sub/file.ext"
                    zip_fn    : find.zip_fn,                 // what the file is called in the zip
                                                             // (in some cases files won't have leading slash, and may have trailing slash. true_path is normalized, zip_fn is actual fn in the zip)
                    basename  : basename,                    // "/path/to/sub"
                    dirname   : dirname,                     // "file.ext"
                    ext       : basename.split(".").pop(),   //"ext"
                    found     : find.found,                  // directory entry (if path exists in zip)
                    dir_filter: find.found && find.found.dir ? (path === "/" ? path:path + "/") : undefined,
                    error : function(err,code,errno,syscall) {
                        err.code    = code;
                        err.errno   = errno;
                        err.syscall = syscall;
                        err.path    = errpath;
                        return err;
                    }
                };

            },


            fs_process = {
                cwd : function getCwd(path) {
                    return cwd;
                },
                chdir : function (path) {
                    var lookup = zip_resolve(path);
                    console.log({lookup});

                    if (lookup.found && lookup.found.dir) {
                        cwd=lookup.dir_filter;
                    } else {
                        throw lookup.error(
                           new Error ("ENOENT: no such file or directory, chdir '"+path+"'"),
                               'ENOENT',
                               -2,
                               'chdir'
                        );
                    }
                }
            },

            fs_constants = {
                 UV_FS_SYMLINK_DIR: 1,
                 UV_FS_SYMLINK_JUNCTION: 2,
                 O_RDONLY: 0,
                 O_WRONLY: 1,
                 O_RDWR: 2,
                 UV_DIRENT_UNKNOWN: 0,
                 UV_DIRENT_FILE: 1,
                 UV_DIRENT_DIR: 2,
                 UV_DIRENT_LINK: 3,
                 UV_DIRENT_FIFO: 4,
                 UV_DIRENT_SOCKET: 5,
                 UV_DIRENT_CHAR: 6,
                 UV_DIRENT_BLOCK: 7,
                 S_IFMT: 61440,
                 S_IFREG: 32768,
                 S_IFDIR: 16384,
                 S_IFCHR: 8192,
                 S_IFBLK: 24576,
                 S_IFIFO: 4096,
                 S_IFLNK: 40960,
                 S_IFSOCK: 49152,
                 O_CREAT: 64,
                 O_EXCL: 128,
                 UV_FS_O_FILEMAP: 0,
                 O_NOCTTY: 256,
                 O_TRUNC: 512,
                 O_APPEND: 1024,
                 O_DIRECTORY: 65536,
                 O_NOATIME: 262144,
                 O_NOFOLLOW: 131072,
                 O_SYNC: 1052672,
                 O_DSYNC: 4096,
                 O_DIRECT: 16384,
                 O_NONBLOCK: 2048,
                 S_IRWXU: 448,
                 S_IRUSR: 256,
                 S_IWUSR: 128,
                 S_IXUSR: 64,
                 S_IRWXG: 56,
                 S_IRGRP: 32,
                 S_IWGRP: 16,
                 S_IXGRP: 8,
                 S_IRWXO: 7,
                 S_IROTH: 4,
                 S_IWOTH: 2,
                 S_IXOTH: 1,
                 F_OK: 0,
                 R_OK: 4,
                 W_OK: 2,
                 X_OK: 1,
                 UV_FS_COPYFILE_EXCL: 1,
                 COPYFILE_EXCL: 1,
                 UV_FS_COPYFILE_FICLONE: 2,
                 COPYFILE_FICLONE: 2,
                 UV_FS_COPYFILE_FICLONE_FORCE: 4,
                 COPYFILE_FICLONE_FORCE: 4
            },

            getOptionsWithEncodingCallback = function getOptionsWithEncodingCallback(options,callback) {
                function throwOpts(){
                    return new Error ( 'The "options" argument must be one of type string or Object. Received type '+typeof options);
                }
                switch (typeof options) {
                    case 'function':
                        if (callback===false) {
                            throw throwOpts();
                        }
                        callback = options;
                        options = {
                            callback : callback
                        };
                        break;
                    case 'undefined':
                        options = {
                            callback : callback
                        };
                        break;
                    case 'string':
                        options = {
                            encoding : options,
                            callback : callback
                        };
                        break;
                    case 'object':
                        options.callback = callback;
                        break;
                    default:
                        throw throwOpts();
                }

                if (callback!==false && typeof options.callback!=='function') {
                   throw new Error ("Callback must be a function. Received "+typeof options.callback);
                }

                options.__zipWrap_opts   = {binary:["utf8","utf-8"].indexOf(options.encoding)<0};
                options.__zipWrap_method = options.__zipWrap_opts.binary?"arraybuffer":"string";

                return options;
            },
            getPromiserForOptionsWithEncodingCallback = function getPromiserForOptionsWithEncodingCallback (requester) {
                var promiser = function (path, options) {
                    return new Promise(function(resolve,reject){
                          options = getOptionsWithCallback(options,function(err,result){
                                if (err) return reject(err);
                                return resolve(result);
                          });
                          setTimeout(requester,0,path,options,options.callback);
                    });
                };
                promiser.name=requester.name;
                return promiser;
            },
            getOptionsWithCallback = function getOptionsWithCallback(options,callback) {
                function throwOpts(){
                    return new Error ( 'The "options" argument must be one of type string or Object. Received type '+typeof options);
                }
                switch (typeof options) {
                    case 'function':
                        if (callback===false) {
                            throw throwOpts();
                        }
                        callback = options;
                        options = {
                            callback : callback
                        };
                        break;
                    case 'undefined':
                        options = {
                            callback : callback
                        };
                        break;
                    case 'object':
                        options.callback = callback;
                        break;
                    default:
                        throw throwOpts();
                }

                if (callback!==false && typeof options.callback!=='function') {
                   throw new Error ( "Callback must be a function. Received "+typeof options.callback);
                }

                return options;
            },
            getPromiserForOptionsWithCallback = function getPromiserForOptionsWithCallback (requester) {
                var promiser = function (path, options) {
                    return new Promise(function(resolve,reject){
                          options = getOptionsWithCallback(options,function(err,result){
                                if (err) return reject(err);
                                return resolve(result);
                          });
                          setTimeout(requester,0,path,options,options.callback);
                    });
                };
                promiser.name=requester.name;
                return promiser;
            },
            getFlagsWithCallback = function getFlagsWithCallback(flags,callback) {
                function throwOpts(){
                    return new Error ( 'The "flags" argument must be number. Received type '+typeof options);
                }
                var options = {
                    callback : callback
                };
                switch (typeof flags) {
                    case 'function':
                        if (callback===false) {
                            throw throwOpts();
                        }
                        callback = flags;
                        options.callback = callback;
                        break;
                    case 'number':
                        options.COPYFILE_EXCL = (flags & fs_constants.COPYFILE_EXCL)!==0;
                        break;
                    default:
                        throw throwOpts();
                }

                if (callback!==false && typeof options.callback!=='function') {
                   throw new Error (
                           "Callback must be a function. Received "+typeof options.callback);
                }

                return options;
            },
            getPromiserForCopyFile = function getPromiserForCopyFile (requester) {
                var promiser = function (src,dest,flags) {
                    return new Promise(function(resolve,reject){
                          var options = getFlagsWithCallback(flags,function(err,result){
                                if (err) return reject(err);
                                return resolve(result);
                          });
                          setTimeout(requester,0,src,dest,flags,options.callback);
                    });
                };
                promiser.name=requester.name;
                return promiser;
            },
            getPromiserForRename = function getPromiserForRename (requester) {
                var promiser = function (oldName,newName) {
                    return new Promise(function(resolve,reject){
                          setTimeout(requester,0,oldName,newName,function(err,result){
                            if (err) return reject(err);
                            return resolve(result);
                          });
                    });
                };
                promiser.name=requester.name;
                return promiser;
            },
            getPromiserForCallback =function getPromiserForCallback (requester) {
                var promiser = function (path) {
                    return new Promise(function(resolve,reject){
                          setTimeout(requester,0,path,function(err,result){
                            if (err) return reject(err);
                            return resolve(result);
                          });
                    });
                };
                promiser.name=requester.name;
                return promiser;
            },


            readdir           = function readdir(path, options, callback) {
                if (typeof options==='function') {
                    callback=options;
                    options={};
                }
                try {
                    setTimeout(callback,0,null,wrapped.view_dir(path).get_listing(options&&options.recursive));
                } catch (err) {
                    return callback(err);
                }
            },
            readdirSync       = function readdirSync(path,options){
                return wrapped.view_dir(path).get_listing( options && options.recursive );
            },

            readFile          = function readFile(path, options, callback) {
                options = getOptionsWithEncodingCallback(options,callback);
                wrapped[ options.__zipWrap_method ][path](options.callback);
            },
            readFileSync      = function readFileSync(path, options){
                options = getOptionsWithEncodingCallback(options,false);
                return wrapped[ options.__zipWrap_method ][path]();
            },

            writeFile         = function writeFile(path, data, options, callback) {
                options = getOptionsWithEncodingCallback(options,callback);
                wrapped[ options.__zipWrap_method ] = data;
                setTimeout(options.callback,0,null);
            },
            writeFileSync     = function writeFileSync(path, data, options) {
                options = getOptionsWithEncodingCallback(options,false);
                wrapped[ options.__zipWrap_method ] = data;
            },

            mkdir             = function mkdir(path, options, callback){
                options = getOptionsWithCallback(options,callback);

                if (options.recursive) {
                    wrapped.mkdirp(path,options.callback);
                } else {
                    wrapped.mkdir(path,options.callback);
                }
            },
            mkdirSync         = function mkdirSync(path, options) {
                options = getOptionsWithCallback(options,false);

                if (options.recursive) {
                    wrapped.mkdirp(path);
                } else {
                    wrapped.mkdir(path);
                }
            },
            exists            = function exists(path, callback) {
                 return wrapped.exists(path,callback );
            },
            existsSync        = function exists(path) {
                return wrapped.exists(path);
            },

            rmdir             = function rmdir(path, options, callback) {
                options = getOptionsWithCallback(options,callback);

                if (options.recursive) {
                    wrapped.rm(path,options.callback);
                } else {
                    wrapped.rmdir(path,options.callback);
                }
            },
            rmdirSync         = function rmdir(path, options) {
                options = getOptionsWithCallback(options,false);
                if (options.recursive) {
                    wrapped.rm(path);
                } else {
                    wrapped.rmdir(path);
                }
            },
            unlink            = function unlink(path, callback) {
                wrapped.rm(path,callback);
            },
            unlinkSync        = function unlinkSync(path) {
               wrapped.rm(path);
            },
            stat              = function stat(path, options, callback) {
                options = getOptionsWithCallback(options,callback);
                return  wrapped.stat(path,options.callback);
            },
            statSync          = function stat(path, options) {
                options = getOptionsWithCallback(options,false);
                return  wrapped.stat(path);
            },
            appendFile        = function appendFile(path, data, options, callback){

                options = getOptionsWithEncodingCallback(options,callback);
                wrapped.string[path](
                    function (err,existingData) {
                        if (err) return options.callback(err);
                        if (options.__zipWrap_method!=="string") {
                            data = ab2str(data);
                        }
                        wrapped.string[path] = existingData + data;
                        options.callback();
                    }
                );

            },
            appendFileSync    = function appendFileSync(path, data, options) {
                options = getOptionsWithEncodingCallback(options,false);
                if (options.__zipWrap_method!=="string") {
                    data = ab2str(data);
                }
                wrapped.string[path] = wrapped.string[path]() + data;
            },
            rename            = function rename(oldPath, newPath, callback) {
                return wrapped.mv(oldPath,newPath,callback);
            },
            renameSync        = function renameSync(oldPath, newPath) {
                return wrapped.mv(oldPath,newPath);
            },
            copyFile            = function copyFile(src, dest, flags, callback) {
                var options = getFlagsWithCallback(flags,callback);
                if (options.COPYFILE_EXCL && wrapped.exists(dest)) {
                    return options.callback(new Error(dest+" exists (options.COPYFILE_EXCL set)"));
                }
                return wrapped.cp(src,dest,options.callback);
            },
            copyFileSync        = function copyFileSync(src, dest, flags ) {
                var options = getFlagsWithCallback(flags,false);
                if (options.COPYFILE_EXCL && wrapped.exists(dest)) {
                    throw new Error(dest+" exists (options.COPYFILE_EXCL set)");
                }
                return wrapped.cp(src,dest);
            },
            watching          = {},
            watch             = function watch(filename, options, listener) {
                return wrapped.addWatcher(filename, options, function(a,b) {
                    listener(a,b);
                });
            },
            watchFile         = function watchFile(filename, options, listener) {
                if (typeof options === 'function') {
                    listener = options;
                    options = {
                        interval : 5007
                    };
                }
                watchFile.watchers = watchFile.watchers || {};
                var watchers = watchFile.watchers[filename]||[];
                watchFile.watchers[filename]=watchers;

                wrapped.stat(filename,function(err,firstStat) {

                    var prev= firstStat;
                    listener.watcher = wrapped.addWatcher(filename, options, function(a,b,curr){
                        listener(curr,prev);
                        prev=curr;
                    });

                    watchers.push(listener);

                });
            },
            unwatchFile       = function unwatchFile(filename, listener) {
                if (watchFile.watchers) {
                    var watchers = watchFile.watchers[filename];
                    if (watchers) {
                        if (listener){
                            if (listener.watcher) {
                                listener.watcher.close();
                                delete listener.watcher;
                            }
                            var index = watchers.indexOf(listener);
                            if (index>=0) watchers.splice(index,1);
                            if (watchers.length===0) {
                                delete watchFile.watchers[filename];
                            }
                        } else {
                            // remove all listeners
                            while (watchers.length>0) {
                                var list = watchers.shift();
                                if (list.watcher) {
                                    list.watcher.close();
                                    delete list.watcher;
                                }
                            }
                            delete watchFile.watchers[filename];
                        }
                    }
                }
            },


            fs = {
        /*impl*/"appendFile": {
                    "value": appendFile,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"appendFileSync": {
                    "value": appendFileSync,
                    "configurable": true,
                    "enumerable": true
                },
                "access": {
                    "value": function access(path, mode, callback) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "accessSync": {
                    "value": function accessSync(path, mode) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "chown": {
                    "value": function chown(path, uid, gid, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "chownSync": {
                    "value": function chownSync(path, uid, gid) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "chmod": {
                    "value": function chmod(path, mode, callback) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "chmodSync": {
                    "value": function chmodSync(path, mode) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "close": {
                    "value": function close(fd, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "closeSync": {
                    "value": function closeSync(fd) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"copyFile": {
                    "value": copyFile,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"copyFileSync": {
                    "value": copyFileSync,
                    "configurable": true,
                    "enumerable": true
                },
                "createReadStream": {
                    "value": function createReadStream(path, options) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "createWriteStream": {
                    "value": function createWriteStream(path, options) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"exists": {
                    "value": exists,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"existsSync": {
                    "value": existsSync,
                    "configurable": true,
                    "enumerable": true
                },
                "fchown": {
                    "value": function fchown(fd, uid, gid, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "fchownSync": {
                    "value": function fchownSync(fd, uid, gid) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "fchmod": {
                    "value": function fchmod(fd, mode, callback) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "fchmodSync": {
                    "value": function fchmodSync(fd, mode) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "fdatasync": {
                    "value": function fdatasync(fd, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "fdatasyncSync": {
                    "value": function fdatasyncSync(fd) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "fstat": {
                    "value": function fstat(fd, options, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "fstatSync": {
                    "value": function fstatSync(fd, options = {}) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "fsync": {
                    "value": function fsync(fd, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "fsyncSync": {
                    "value": function fsyncSync(fd) {
                        throw new Error ("not implemented");
                     },
                    "configurable": true,
                    "enumerable": true
                },
                "ftruncate": {
                    "value": function ftruncate(fd, len, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "ftruncateSync": {
                    "value": function ftruncateSync(fd, len = 0) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "futimes": {
                    "value": function futimes(fd, atime, mtime, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "futimesSync": {
                    "value": function futimesSync(fd, atime, mtime) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "lchown": {
                    "value": function lchown(path, uid, gid, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "lchownSync": {
                    "value": function lchownSync(path, uid, gid) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "link": {
                    "value": function link(existingPath, newPath, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "linkSync": {
                    "value": function linkSync(existingPath, newPath) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "lstat": {
                    "value": function lstat(path, options, callback) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "lstatSync": {
                    "value": function lstatSync(path, options = {}) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"mkdir": {
                    "value": mkdir,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"mkdirSync": {
                    "value": mkdirSync,
                    "configurable": true,
                    "enumerable": true
                },
                "mkdtemp": {
                    "value": function mkdtemp(prefix, options, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "mkdtempSync": {
                    "value": function mkdtempSync(prefix, options) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "open": {
                    "value": function open(path, flags, mode, callback) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "openSync": {
                    "value": function openSync(path, flags, mode) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "opendir": {
                    "value": function opendir(path, options, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "opendirSync": {
                    "value": function opendirSync(path, options) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"readdir": {
                    "value": readdir,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"readdirSync": {
                    "value": readdirSync,
                    "configurable": true,
                    "enumerable": true
                },
                "read": {
                    "value": function read(fd, buffer, offset, length, position, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "readSync": {
                    "value": function readSync(fd, buffer, offset, length, position) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"readFile": {
                    "value": readFile,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"readFileSync": {
                    "value": readFileSync,
                    "configurable": true,
                    "enumerable": true
                },
                "readlink": {
                    "value": function readlink(path, options, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "readlinkSync": {
                    "value": function readlinkSync(path, options) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "realpath": {
                    "value": function realpath(p, options, callback) {
                        throw new Error ("not implemented");
                     },
                    "configurable": true,
                    "enumerable": true
                },
                "realpathSync": {
                    "value": function realpathSync(p, options) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "rename": {
                    "value": rename,
                    "configurable": true,
                    "enumerable": true
                },
                "renameSync": {
                    "value": renameSync,
                    "configurable": true,
                    "enumerable": true
                },
                "rmdir": {
                    "value": rmdir,
                    "configurable": true,
                    "enumerable": true
                },
                "rmdirSync": {
                    "value": rmdirSync,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"stat": {
                    "value": stat,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"statSync": {
                    "value": statSync,
                    "configurable": true,
                    "enumerable": true
                },
                "symlink": {
                    "value": function symlink(target, path, type_, callback_) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "symlinkSync": {
                    "value": function symlinkSync(target, path, type) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "truncate": {
                    "value": function truncate(path, len, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "truncateSync": {
                    "value": function truncateSync(path, len) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"unwatchFile": {
                    "value": unwatchFile,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"unlink": {
                    "value": unlink,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"unlinkSync": {
                    "value": unlinkSync,
                    "configurable": true,
                    "enumerable": true
                },
                "utimes": {
                    "value": function utimes(path, atime, mtime, callback) {
                        throw new Error ("not implemented");
                },
                    "configurable": true,
                    "enumerable": true
                },
                "utimesSync": {
                    "value": function utimesSync(path, atime, mtime) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "watch": {
                    "value": watch,
                    "configurable": true,
                    "enumerable": true
                },
                "watchFile": {
                    "value": watchFile,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"writeFile": {
                    "value": writeFile,
                    "configurable": true,
                    "enumerable": true
                },
        /*impl*/"writeFileSync": {
                    "value": writeFileSync,
                    "configurable": true,
                    "enumerable": true
                },
                "write": {
                    "value": function write(fd, buffer, offset, length, position, callback) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "writeSync": {
                    "value": function writeSync(fd, buffer, offset, length, position) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "writev": {
                    "value": function writev(fd, buffers, position, callback) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "writevSync": {
                    "value": function writevSync(fd, buffers, position) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "Dir": {
                    "value": function Dir(handle, path, options) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "Dirent": {
                    "value": function Dirent(name, type) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "Stats": {
                    "value": function Stats(dev, mode, nlink, uid, gid, rdev, blksize,
                           ino, size, blocks,
                           atimeMs, mtimeMs, ctimeMs, birthtimeMs) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "ReadStream": {
                    "value": function ReadStream(path, options) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "WriteStream": {
                    "value": function WriteStream(path, options) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "FileReadStream": {
                    "value": function FileReadStream(path, options) {
                       throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "FileWriteStream": {
                    "value": function FileWriteStream(path, options) {
                        throw new Error ("not implemented");
                    },
                    "configurable": true,
                    "enumerable": true
                },
                "_toUnixTimestamp": {
                    "value": function _toUnixTimestamp(time, name = 'time') {
                        var __native = function toUnixTimestamp(time, name = 'time') {
                          // eslint-disable-next-line eqeqeq
                          if (typeof time === 'string' && +time == time) {
                            return +time;
                          }
                          if (Number.isFinite(time)) {
                            if (time < 0) {
                              return Date.now() / 1000;
                            }
                            return time;
                          }
                          if (isDate(time)) {
                            // Convert to 123.456 UNIX timestamp
                            return time.getTime() / 1000;
                          }
                          throw new ERR_INVALID_ARG_TYPE(name, ['Date', 'Time in seconds'], time);
                        };
                },
                    "configurable": true,
                    "enumerable": true
                },
                "promises": {
                    "access": {
                        "value": function access(path, mode ) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "copyFile": {
                        "value": getPromiserForCopyFile (copyFile),
                        "configurable": true,
                        "enumerable": true
                    },
                    "open": {
                        "value": function open(path, flags, mode) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "opendir": {
                        "value": function opendir(...args) {
                                throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "rename": {
                        "value": getPromiserForRename(rename),
                        "configurable": true,
                        "enumerable": true
                    },
                    "truncate": {
                        "value": function truncate(path, len = 0) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "rmdir": {
                        "value": getPromiserForOptionsWithCallback(rmdir),
                        "configurable": true,
                        "enumerable": true
                    },
                    "mkdir": {
                        "value": getPromiserForOptionsWithCallback(mkdir),
                        "configurable": true,
                        "enumerable": true
                    },
                    "readdir": {
                        "value": getPromiserForOptionsWithCallback(readdir),
                        "configurable": true,
                        "enumerable": true
                    },
                    "readlink": {
                        "value": function readlink(path, options) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "symlink": {
                        "value": function symlink(target, path, type_) {
                            throw new Error ("not implemented");
                    },
                        "configurable": true,
                        "enumerable": true
                    },
                    "lstat": {
                        "value": function lstat(path, options = { bigint: false }) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "stat": {
                        "value": getPromiserForOptionsWithCallback(stat),
                        "configurable": true,
                        "enumerable": true
                    },
                    "link": {
                        "value": function link(existingPath, newPath) {
                           throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "unlink": {
                        "value": getPromiserForCallback(unlink),
                        "configurable": true,
                        "enumerable": true
                    },
                    "chmod": {
                        "value": function chmod(path, mode) {
                               throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "lchmod": {
                        "value": function lchmod(path, mode) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "lchown": {
                        "value": function lchown(path, uid, gid) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "chown": {
                        "value": function chown(path, uid, gid) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "utimes": {
                        "value": function utimes(path, atime, mtime) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "realpath": {
                        "value": function realpath(path, options) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "mkdtemp": {
                        "value": function mkdtemp(prefix, options) {
                                throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "writeFile": {
                        "value": getPromiserForOptionsWithEncodingCallback(readFile),
                        "configurable": true,
                        "enumerable": true
                    },
                    "appendFile": {
                        "value": function appendFile(path, data, options) {
                            throw new Error ("not implemented");
                        },
                        "configurable": true,
                        "enumerable": true
                    },
                    "readFile": {
                        "value": getPromiserForOptionsWithEncodingCallback(readFile),
                        "configurable": true,
                        "enumerable": true
                    }
                }
            };

            cb({fs:Object.defineProperties({},fs),process:fs_process,wrapped:wrapped});

        });

    }).catch(function(e){ throw(e);});


}

return fs_JSZip;
})(!$N[0].Document);


/*fs_jszip-browser.js*/
$N[0][$N[4]]=(function($N){
function start_fs_jszip(url,cb) {

        var self = {
             ready   : false,
             fs      : null,
             process : null
        };

        window.JSZipUtils.getBinaryContent(url, function(err, data) {
            if (err) return cb(err);

            window.fsJSZip(
                self,
                data,
                window.zipFsWrap,
                window.JSZip,
                window.simRequire.path,
                function(mod){
                    self.fs=mod.fs;
                    self.process=mod.process;
                    self.ready=true;
                    cb(null,self.fs,self.process);
                }
            );
        });

        return self;

    }

    return start_fs_jszip;
})(!$N[0].Document);
})([typeof process+typeof module+typeof require==="objectobjectfunction"?module.exports:window,"JSZip","JSUtils","fs_js_zip","start_fs"]);/* extensions.js */
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
