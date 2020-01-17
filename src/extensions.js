/*jshint maxerr:10000*/
/*jshint shadow:false*/
/*jshint undef:true*/
/*jshint devel:true*/
/*jshint browser:true*/
/*jshint node:true*/

/* global Proxy,performance */

var inclusionsBegin;
(function(extensions,isNode){

    loadExtensions("boot");
    function loadExtensions (e) {
        if (typeof Object.polyfill === 'function') {
            if (e!=="boot"&&!isNode) {
                window.removeEventListener("polyfills",loadExtensions);
            }
            if (Object.env.verbose) console.log("loading extensions");
            extensions(Object.polyfill);
            String.extensionsTest(Object.env.verbose);
            console.log("self tests passed");// we would have hit throw otherwise



            if (!isNode) window.dispatchEvent(new CustomEvent('extensions', { file: 'extensions.js' }));
        } else {
            if (e==="boot"&&!isNode) {
                if (Object.env.verbose) console.log("waiting for polyfills...");
                window.addEventListener("polyfills",loadExtensions);
            }
        }
    }

})
(
    function(extend){
    var
    jsClass  = Object.jsClass,
    isString = jsClass.getTest(""),
    cpArgs   = Function.args;

    extend(Object,Object_extensions);
    extend(Array,Array_extensions);
    extend(String,String_extensions);

    function isEmpty(x){
       return ([null,undefined].indexOf(x)>=0||x.length===0||x.constructor===Object&&Object.keys(x).length===0);
    }

    function Object_extensions(object){

        object("isEmpty",isEmpty);

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
                           sampleSet  = sampleSet.filter(function(x){return x!==null});
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




    /*
    stringifyPathArray([0,1,0,'hello-there']) --> '[0][1][0]["hello-there"]'

    stringifyPathArray([0,0,0,'hello','there']) --> '[0][0][0].hello.there'

    stringifyPathArray([2,0,0,'hello','there',3,5]) --> '[2][0][0].hello.there[3][5]'

    */

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


    /*
    parsePathString('[4][5][3].this.then.that') --->[ 4, 5, 3, 'this', 'then', 'that' ]
    parsePathString('[4][5][3].thing["tha\\u0022ng"]')---> [ 4, 5, 3, 'thing', 'tha"ng' ]

    */
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
        function camelCaseWords(s){return camelCaseArray(s.split(" "));}




        string("toCamelCase",function toCamelCase() {
            return camelCaseWords(this);
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
            isMulti= lines.map(function(){return false}),

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
                        toks2.push(tok)
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
                         if (      line.endsWith("=")
                                || line.endsWith("{")
                                || next_line.startsWith("}")
                                || (
                                      line.endsWith(";")
                                      && !( next_line.startsWith("function ")
                                            || next_line.startsWith("var ")
                                      )
                                  )



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
        function ArraySplitViaWhitespaceComments(code,needle,limit,map) {
            // the idea is to be able to ignore any commented out tokens in the split
            // but still return those comments verbatim in the between-the-valid-splits text output

            // step 1:replace any embedded comments with char 255
            // (we don't use actual whitespace as that might what they are splitting on)
            var
            c255=String.fromCharCode(255),
            stripped = whiteOutComments(code,c255,c255);
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

        string.prototype("ArraySplitCode",function ArraySplitCode(needle,limit,map){
            return ArraySplitViaWhitespaceComments(this,needle,limit,map);
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
                lines=this.lines;
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

        string.prototype("reindent",function indent(spaces,tabs,nl){
            var current = this.indentLevel(true,tabs);
            if (current===spaces) return String(this);
            var
            filler = new Array(1+spaces).join(" ");
            nl=nl||"\n";
            return this.indentLevel(true,tabs,true).split(nl).map(function(line){
                return filler + line.substr(current);
            }).join(nl);
        });

        string.prototype("load",function indent(filename){
            return require("fs").readFileSync(filename,"utf8");
        });
        string("load",function indent(filename){
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

    Date_toJSON();


},
    (!!Object.env && Object.env.isNode)||(!!Object.polyfills || (typeof process==='object' && typeof module==='object' && typeof require==='function' && !!require("./polyfills.js")))

);


var inclusionsEnd;
