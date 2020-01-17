/*jshint maxerr:10000*/
/*jshint shadow:false*/
/*jshint undef:true*/
/*jshint devel:true*/
/*jshint browser:true*/
/*jshint node:true*/

/* global Proxy */

var inclusionsBegin;

(function(jsClass){

    Object.polyfill(Object,Object_polyfills);
    Object.polyfill(Error,Error_Polyfills);
    Object.polyfill(Array,Array_polyfills);
    Object.polyfill(RegExp,RegExp_polyfills);
    Object.polyfill(String,String_polyfills);
    Object.polyfill(Function,Function_polyfills);

    Proxy_polyfill();

    if (!Object.env.isNode) {
        window.dispatchEvent(new CustomEvent('polyfills', { file: 'polyfills.js' }));
    }


    function Object_polyfills(object){


        object("keys",function keys(o) {
            if (o !== Object(o))
                throw new TypeError('Object.keys called on a non-object');
            var p,k=[],isKey=Object.prototype.hasOwnProperty.bind(o);
            for (p in o) if (isKey(p)) k.push(p);
            return k;
        });

        object("values",function values(o) {
            if (o !== Object(o))
                throw new TypeError('Object.values called on a non-object');
            var p,v=[],isKey=Object.prototype.hasOwnProperty.bind(o);
            for (p in o) if (isKey(p)) v.push(o[p]);
            return v;
        });

    }

    function Function_polyfills(func) {
        func("args",(function(s) {


          function useArrayFrom () {
              try {
                  if (typeof Array.from==='function'){
                      var x = (function (){return Array.from(arguments);})(1,2,3);
                      if (x.length===3) {
                         return x[0]===1 && x[1]===2 && x[2]===3;
                      }
                  }
              } catch (e) {

              }
              return false;
          }
          if (useArrayFrom()) {
              return Array.from;
          }

          return s.call.bind(s);
      })(Array.prototype.slice));
    }

    function Error_Polyfills(error){
        error.prototype("toJSON",
            function toJSON() {
                var alt = {};

                Object.getOwnPropertyNames(this).forEach(function (key) {
                    alt[key] = this[key];
                }, this);

                return alt;
            }
        );
    }

    function Array_polyfills(array){

         array("isArray",
            function isArray(arr) {
                return Object.prototype.toString.call(arr) === '[object Array]';
            }
        );

        array.prototype("flat",
            (function() {

                function flattenDeep(arr, depth) {
                   depth=depth||1;
                   return depth > 0 ? arr.reduce(function(acc, val) { acc.concat(Array.isArray(val) ? flattenDeep(val, depth - 1) : val);}, [])
                                    : arr.slice();
                }

                function flatten(arr) {

                    return arr.reduce(function(acc, val) { return acc.concat(val),[];});
                }

                function flat(depth) {
                    return depth===undefined?flatten(this):flattenDeep(this,depth);
                }

                return flat;

            })()
        );
    }

    function RegExp_polyfills(regexp) {

        var compliantExecNpcg = /()??/.exec("")[1]===undefined,undef;

        regexp.class("split",RegExpSplit);

        function RegExpSplit(haystack, needle, limit, map) {

                    // if you pass a string in, make a word search for that string
                    switch (jsClass(needle)) {
                        case "RegExp":break;
                        case "String" : needle = new RegExp("(?<!\[\\w\\d\])"+needle.toString()+"(?!\[\\w\\d\])");
                            break;
                        default :
                            return null;
                    }

                    var
                    output_push,       // output.push analog
                    output_push_array, // array version
                    // if map is undefined, these will will be
                    // bound to object.push() and object.push.apply(object)
                    // if map is defined, the pass additional arguments to map()
                    // which will allow custom objects to be returned instead of
                    // the string split parts.
                    // this is useful mainly for regex where you might need
                    // info about the match in each case (eg what exacty was matched)
                    output=getOutput(map,function(push,arr){
                        output_push=push;
                        output_push_array=arr;
                    }),
                    lastLastIndex = 0,
                    separator2, match, lastIndex, lastLength,
                    flags = (needle.ignoreCase ? "i" : "") +
                            (needle.multiline  ? "m" : "") +
                            (needle.dotAll     ? "s" : "") +
                            (needle.extended   ? "x" : "") + // Proposed for ES6
                            (needle.sticky     ? "y" : "") ; // Firefox 3+

                    // Make `global` and avoid `lastIndex` issues by working with a copy
                    needle = new RegExp(needle.source, flags + "g");


                    // compliance_replacer is pulled from inline code
                    // to avoid creating the internal same function object every
                    // interation of the loop. since it operates entirely on
                    //arguments passed in, and match (which is outside of the loop)
                    // it might as well be defined only once, and live out here.
                    var compliance_replacer = function() {
                        for (var i = 1; i < arguments.length - 2; i++) {
                            if (arguments[i] === undef) {
                                match[i] = undef;
                            }
                        }
                    };

                haystack += ""; // Type-convert
                if (!compliantExecNpcg) {
                    // Doesn't need flags gy, but they don't hurt
                    separator2 = new RegExp("^" + needle.source + "$(?!\\s)", flags);
                }
                /* Values for `limit`, per the spec:
                 * If undefined: 4294967295 // Math.pow(2, 32) - 1
                 * If 0, Infinity, or NaN: 0
                 * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
                 * If negative number: 4294967296 - Math.floor(Math.abs(limit))
                 * If other: Type-convert, then use the above rules
                 */
                limit = limit === undef ?
                    -1 >>> 0 : // Math.pow(2, 32) - 1
                    limit >>> 0; // ToUint32(limit)
                while ((match = needle.exec(haystack))) {
                    // `needle.lastIndex` is not reliable cross-browser
                    lastIndex = match.index + match[0].length;
                    if (lastIndex > lastLastIndex) {
                        output_push(
                            haystack.slice(lastLastIndex, match.index),
                            lastLastIndex,lastIndex,match[0]
                        );
                        // Fix browsers whose `exec` methods don't consistently return `undefined` for
                        // nonparticipating capturing groups
                        if (!compliantExecNpcg && match.length > 1) {
                            match[0].replace(compliance_replacer);
                        }
                        if (match.length > 1 && match.index < haystack.length) {
                            output_push_array(
                                match,
                                lastLastIndex,lastIndex,match[0]
                            );
                        }
                        lastLength = match[0].length;
                        lastLastIndex = lastIndex;
                        if (output.length >= limit) {
                            break;
                        }
                    }
                    if (needle.lastIndex === match.index) {
                        needle.lastIndex++; // Avoid an infinite loop
                    }
                }
                if (lastLastIndex === haystack.length) {
                    if (lastLength || !needle.test("")) {
                        output_push("",lastLastIndex,null,null);
                    }
                } else {
                    output_push(haystack.slice(lastLastIndex),lastLastIndex,null,null);
                }
                return output.length > limit ? output.slice(0, limit) : output;

        }

        function getOutput(map,cb) {
            var output = [],
            output_push_ = Array.prototype.push.bind(output);
            if ('function'===typeof cb) {
                cb( map ? function(text, atIndex, toIndex, delim) {
                        // call map with text, and some other detailed info about the match
                        // it is in the same format as Array.prototype.map, with extra args at the end
                        output_push_(  map( text, output.length, output,
                                           atIndex, toIndex, delim)
                                     );
                    } : function(text){ return output_push_(text);},
                     map ? function (strings, atIndex, toIndex, match) {
                        // call map with entire pushed array as an array,
                        // note the str parameter is false
                        //output_push_(
                            map( false, output.length, output,
                              atIndex, toIndex, match[0], match, strings);
                        //);
                     } : output_push_.apply.bind(output_push_,output)
                );
            }
            return output;
        }

        RegExpSplit.getOutput = getOutput;
    }

    function String_polyfills(string){
         (function(

         compliantExecNpcg,   // a boolean
         nativeInPrototype,   // true if String.prototype.split native code
         nativeREUnsupported, // true if String.split does not support RegExp
         nativeSplit          // expects (str,sep,limit) - str becomes 'this'

         ){


            string.prototype("includes",function includes(search, start) {
                   'use strict';

                   if (search instanceof RegExp) {
                     throw new TypeError('first argument must not be a RegExp');
                   }
                   if (start === undefined) { start = 0; }
                   return this.indexOf(search, start) !== -1;
                });

            string.class("!split",nativeSplit);


            var isRegExp=jsClass.getTest(/\s/);

            if (nativeREUnsupported) {
                string.prototype("!split",function split (needle,limit) {
                     var handler = isRegExp(needle) ? RegExp.split : nativeSplit;
                     return handler(this,needle,limit) ;
                 });
            }
        })(
              //compliantExecNpcg
              /()??/.exec("")[1]===undefined,

              //nativeInPrototype
              ("".split+"").search(/(?=\W(split))(.*)(?=\[native\scode\])/)>0,

              //nativeREUnsupported
              "\n".split(/\n/).length===0,

              //nativeSplit
              typeof String.split==='function'&&
                     (""+String.split).search(/\[native\scode\]/)>0 ?
                     String.split : "".split.call.bind ("".split)

              //undef
          );
    }


    function Proxy_polyfill(){
        /**
         * ES6 Proxy Polyfill
         * @version 1.2.1
         * @author Ambit Tsai <ambit_tsai@qq.com>
         * @license Apache-2.0
         * @see {@link https://github.com/ambit-tsai/es6-proxy-polyfill}
         */

        (function (context) {
            if (context.Proxy) return; // return if Proxy already exist

            var

            noop = function () {},
            assign = Object.assign || noop,
            getProto = Object.getPrototypeOf || noop,
            setProto = Object.setPrototypeOf || noop;

            /**
             * Throw a type error
             * @param {String} message
             */
            function throwTypeError(message) {
                throw new TypeError(message);
            }

            /**
             * The internal member constructor
             * @constructor
             * @param {Function} target
             * @param {Object} handler
             */
            function InternalMember(target, handler) {
                this.target = target; // [[ProxyTarget]]
                this.handler = handler; // [[ProxyHandler]]
            }

            /**
             * The [[Call]] internal method
             * @param {Object} thisArg
             * @param {Object} argsList
             */
            InternalMember.prototype.$call = function (thisArg, argsList) {
                var target = this.target,
                    handler = this.handler;
                if (!handler) {
                    throwTypeError('Cannot perform \'call\' on a proxy that has been revoked');
                }
                if (handler.apply === null) {
                    return target.apply(thisArg, argsList);
                } else if (typeof handler.apply === 'function') {
                    return handler.apply(target, thisArg, argsList);
                } else {
                    throwTypeError('Proxy handler\'s apply trap must be a function');
                }
            };

            /**
             * The [[Construct]] internal method
             * @param {Object} thisArg
             * @param {Object} argsList
             * @returns {Object}
             */
            InternalMember.prototype.$construct = function (thisArg, argsList) {
                var target = this.target,
                    handler = this.handler,
                    result;
                if (!handler) {
                    throwTypeError('Cannot perform \'construct\' on a proxy that has been revoked');
                }
                if (handler.construct === null) {
                    result = target.apply(thisArg, argsList);
                    return result instanceof Object ? result : thisArg;
                } else if (typeof handler.construct === 'function') {
                    result = handler.construct(target, argsList);
                    if (result instanceof Object) {
                        return result;
                    } else {
                        throwTypeError('Proxy handler\'s construct trap must return an object');
                    }
                } else {
                    throwTypeError('Proxy handler\'s construct trap must be a function');
                }
            };

            /**
             * Create a Proxy object
             * @param {Function} target
             * @param {Object} handler
             * @param {Object} revokeResult
             * @returns {Function}
             */
            function createProxy(target, handler, revokeResult) {
                // Check the type of arguments
                if (typeof target !== 'function') {
                    throwTypeError('Proxy polyfill only support function target');
                } else if (!(handler instanceof Object)) {
                    throwTypeError('Cannot create proxy with a non-object handler');
                }

                // Create an internal member object
                var member = new InternalMember(target, handler);

                // Create a proxy object - `P`
                function P() {
                    return this instanceof P ?
                        member.$construct(this, arguments) :
                        member.$call(this, arguments);
                }

                assign(P, target); // copy target's properties
                P.prototype = target.prototype; // copy target's prototype
                setProto(P, getProto(target)); // copy target's [[Prototype]]

                if (revokeResult) {
                    // Set the revocation function
                    revokeResult.revoke = function () {
                        member.target = null;
                        member.handler = null;
                        for (var key in P) { // delete proxy's properties
                            if(P.hasOwnProperty(key)) delete P[key];
                        }
                        P.prototype = {}; // reset proxy's prototype
                        setProto(P, {}); // reset proxy's [[Prototype]]
                    };
                }

                return P;
            }

            /**
             * The Proxy constructor
             * @constructor
             * @param {Function} target
             * @param {Object} handler
             * @returns {Function}
             */
            function Proxy(target, handler) {
                if (this instanceof Proxy) {
                    return createProxy(target, handler);
                } else {
                    throwTypeError('Constructor Proxy requires \'new\'');
                }
            }

            /**
             * Create a revocable Proxy object
             * @param {Function} target
             * @param {Object} handler
             * @returns {{proxy, revoke}}
             */
            Proxy.revocable = function (target, handler) {
                var result = {};
                result.proxy = createProxy(target, handler, result);
                return result;
            };

            context.Proxy = Proxy;
        }(
            typeof window === 'object' ?
                window :
                typeof global === 'object' ? global : this // using `this` for web workers & supports Browserify / Webpack
        ));

    }


})(
        (function (s,r,l,C,isNode,cl,v,c,m,R,jsClass,L) {
        //save Object.prototype.toString as a bound function
        //ie s({}) ---> [object Object], s([]) ---> [object Array] etc
        s=s.call.bind(s);
        //wrap this to strip out the className
        jsClass = function jsClass(x) {
             R=C[c=s(x)];// test cache
             if(R) return R;// return cache
             if ((m=(c).match(r))) //validate start and locate classname
                 return (C[c]=c.substring(m[0][l],c[l]-1));// update cache and return
             // fallthrough=undefined.
        };
        jsClass.text=s;//jsClass.text("") ---> [object String],jsClass.text(/a/) ---> [object RegExp],
        jsClass.getTest=function(o){
            var txt=s(o),test=txt.startsWith.bind(txt);
            return function(x) {return test(s(x));};
        };//var isRE=jsClass.getTest(/\s/); isRE("some string")===true
        jsClass.is=function (x,c){return s(x).search(c)>0;};//jsClass.is([],'Array')---> true
        //bootstap the polyfiller by adding polyfill and jsClass to Object
        cl=isNode && ["polyfills","extensions"].some(function(file){
            return module.filename.endsWith("/"+file+".js")||
                   module.filename.endsWith("/"+file+".min.js")

            ;});
        v=isNode && (cl||!process.mainModule)  && process.argv.indexOf("--verbose")>=0;
        L=v?console.log.bind(console):function(){};
        polyfills(Object,function(object){
            object("polyfill",polyfills);
            object("jsClass",jsClass);
            object("@env",
            function getEnv (){
                return {
                    isNode : isNode,
                    cmdLine: cl,
                    verbose: v
                };
            });
        });
        return jsClass;

        function polyfills(c,fn) {
            var p=poly(c);
            fn(p);
            p.install();
        }

        function polyfill_define(polyfills,name,fn,tgt) {
            if (typeof polyfills!=='object') throw new Error('invalid polyfills wrapper');
            if (typeof tgt!=='undefined') Object.defineProperties(polyfills,{_target:{value:tgt,configurable:true,enumerable:false}});
            if (typeof polyfills._target==='undefined') throw new Error('missing polyfills target');


            var jsClass = (function/*jsClass*/(s,r,l,c,m) {
                s = s.call.bind(s);
                return function(x) {
                    if ((m=(c=s(x)).match(r))) return c.substring(m[0][l],c[l]-1);
                };
            })({}.toString,/(\[object)\s{1}/g,"length");

            var obj_name=polyfills._name || (typeof polyfills._target==='function'?polyfills._target.name:jsClass(polyfills._target));

            if (typeof name==='object') {
                var key0 = function (o) {
                    var p,isKey=Object.prototype.hasOwnProperty.bind(o);
                    for (p in o) if (isKey(p)) return p;
                };
                var nm=key0(name);
                if (typeof name[nm]==='function') {
                    fn=name[nm];
                    name=nm;
                } else {
                    throw new Error('invalid polyfill name/function');
                }
            } else {
                if (typeof name==='function' && typeof fn==='undefined' && name.name!=='') {
                    fn = name;
                    name=fn.name;
                } else {
                    if (typeof name!=='string') {
                        if(v)L('invalid polyfill name:'+typeof name);
                        throw new Error('invalid polyfill name:'+typeof name);
                    }

                    if (typeof fn!=='function') {
                        if(v)L('invalid polyfill function:'+typeof fn);
                        throw new Error('invalid polyfill function:'+typeof fn);
                    }
                }
            }

            if (typeof polyfills._count==='undefined') {
                Object.defineProperties(polyfills,{_count:{value:0,configurable:true,writable:true,enumerable:false}});
            }

            var force = name.split("!");
            if (force.length>1) name = force.join('');force=force.length>1;
            var enumerable = name.split("#");
            if (enumerable.length>1) name = enumerable.join('');enumerable=enumerable.length>1;

            var
            fn_name = name.split("@");
            if (fn_name.length>1) name = fn_name.join('');

            var getterName = "get"+name.charAt(0).toUpperCase()+name.substr(1);
            fn_name=fn_name.length>1?getterName:fn.name;

            if (force || !polyfills._target[name]) {


                if ( fn_name === getterName) {
                          if (v)L((force?"replacing":"defining")+" polyfill :"+obj_name+"."+name+" (getter)");

                          polyfills[name]= {
                              get : fn,
                              configurable:true,
                              enumerable:enumerable
                          };
                      } else {
                         if (v)L((force?"replacing":"defining")+" polyfill :"+obj_name+"."+name);

                         polyfills[name]= {
                             value : fn,
                             configurable:true,
                             enumerable:enumerable
                         };
                      }
                 polyfills._count++;
            } else {
                if(v)L("skipping polyfill(exists already):"+obj_name+"."+name);
            }

        }

        function polyfill_install(polyfills,prefix) {
            if (typeof polyfills!=='object') throw new Error('invalid polyfills wrapper');
            if (typeof polyfills._target==='undefined') throw new Error('missing polyfills target');
            if (typeof polyfills._count==='undefined') return;
            if (polyfills._count===0) return;
            var target = polyfills._target;
            delete polyfills._target;
            delete polyfills._count;
            delete polyfills._name;

            var name,ispolyfill=Object.prototype.hasOwnProperty.bind(polyfills);
            for (name in polyfills) {
                if (ispolyfill(name)) {
                    if (target[name]) {
                        delete target[name];
                        if(v)L("replacing",(prefix?prefix:'')+name);
                    } else {
                        if(v)L("installing",(prefix?prefix:'')+name);
                    }
                }
            }

            Object.defineProperties(target,polyfills);
        }

        function poly(c) {
            var proto,cls = {
              _target: c,
              _name:c.name,
              _proto : function() {
                  proto =  {
                      _target: c.prototype,
                      _name:c.name + ".prototype"
                  };
                  delete cls._proto;
                  return proto;
              },
              _install : function (){
                  delete cls._install;
                  delete cls._proto;
                  polyfill_install(cls,c.name+".");
                  if (proto) {
                    polyfill_install(proto,c.name+".prototype.");
                  }
              }
            };
            function polyfill (name,fn){ return polyfill_define(cls,name,fn); }
            polyfill.prototype = function (name,fn) {
                if (!!cls._proto) {cls._proto();}
                polyfill.prototype = polyfill_define.bind(this,proto);
                return polyfill.prototype(name,fn);
            };
            polyfill.install=cls._install;
            polyfill.class=polyfill;
            return polyfill;
        }
    })({}.toString,/(\[object)\s{1}/g,"length",{},typeof process==='object' && typeof module==='object' && typeof window==='undefined')
);



var inclusionsEnd;
