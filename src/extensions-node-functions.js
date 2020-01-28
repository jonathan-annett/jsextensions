

module.exports = function(WS_PATH,ws_static_path,WS_PORT,cpArgs,ext_path) {


    var
    // returns false if module is not available
    // othwewise returns path to the main javascript file
    nodeGetPath=function (mod) {
        try {
            return require.resolve(mod);
        } catch (e) {
            return false;
        }
    },
    // if the last argument of a function call is a callback, it gets replaced
    // with [{cb:null}] in the transmitted json
    // this is basically a stripped down "tabcalls" concept, used as a bootloader
    isCBToken=function(CB) {
        return Array.isArray(CB) &&
        CB.length===1&&
        typeof CB[0]==='object'&&
        CB[0].cb===null;
    };




    function nodeWSServer(main_app,cb) {

        if (!nodeGetPath('express') || !nodeGetPath ('express-ws')) return false;

        var node = {
            express : require('express'),
            path    : require("path")
        };

        var app = node.express();
        var expressWs = require('express-ws')(app);

        var statics = {};
        var cached  = {};

        function load (name,proto,hostname,cb) {

            var URL_PREFIX = proto.split(":")[0]+"://"+hostname+":"+WS_PORT;

            if (typeof name!=='string') return;
            if (typeof cb!=='function') return;

            var src,textContent,path = nodeGetPath(name);

            if (typeof path!=='string') return;


            src=statics[path];
            if (src) {
                return cb ({mode:"src",data:URL_PREFIX+src});
            }
            textContent=cached[path];
            if (textContent) {
                return cb ({mode:"textContent",data:textContent});
            }

            var mod = require(name);

            if (["object","function"].indexOf(typeof mod)>=0) {
                if (typeof mod._script_src_file==='string') {

                    src = ws_static_path + mod._script_src ? mod._script_src : (name +'.js');
                    app.use(src,node.express.static(mod._script_src_dir || mod._script_src_file));
                    return cb ({mode:"src",data:URL_PREFIX+ (statics[path]=src)});

                }  else {

                    if (typeof mod._script_textContent==='string') {
                        return cb({mode:"textContent",data:(cached[path]=mod._script_textContent)});
                    }

                }
            }

            src = ws_static_path+name+'/'+name+'.js';
            app.use(src,node.express.static(path));
            app.use(ws_static_path+name+'/',node.express.static(node.path.dirname(path)));

            return cb ({mode:"src",data: URL_PREFIX + (statics[path]=src)});

        }



        // we need to manually bootstrap the server for the polyfills and extensions files.
        // mainly as they are on a different port.
        // once loaded, they autoload over the WS PORT.
        // (otherwise the outer html needs to know the port number, which breaks the concept)
        load ("jspolyfills","http:","somehost",function(got_src){
            console.log({got_src:got_src});
            var
            pf_path      = Object.keys(statics)[0],
            pf_url       = ws_static_path+"polyfills.js",
            ext_url      = ws_static_path+'extensions.js',
            pf_min_url   = ws_static_path+"polyfills.min.js",
            ext_min_url  = ws_static_path+'extensions.min.js',
            ext_alt_url  = ws_static_path+'jsextensions.js',
            pf_min_path  = node.path.join(node.path.dirname(pf_path),"polyfills.min.js"),
            ext_min_path = node.path.join(node.path.dirname(ext_path),"extensions.min.js"),
            ext_alt_path = node.path.join(node.path.dirname(ext_path),"jsextensions.js");

            statics[pf_path]      = pf_url;
            statics[ext_path]     = ext_url;
            statics[pf_min_path]  = pf_min_url;
            statics[ext_min_path] = ext_min_url;
            statics[ext_alt_path] = ext_alt_url;

            if (main_app) {
                main_app.use (pf_url,      node.express.static(pf_path) );
                main_app.use (ext_url,     node.express.static(ext_path) );
                main_app.use (pf_min_url,  node.express.static(pf_min_path) );
                main_app.use (ext_min_url, node.express.static(ext_min_path) );
                main_app.use (ext_alt_url, node.express.static(ext_alt_path) );
            }

            app.use(pf_url,node.express.static(pf_path));
            app.use(ext_url,node.express.static(ext_path));
            app.use (pf_min_url,  node.express.static(pf_min_path) );
            app.use (ext_min_url, node.express.static(ext_min_path) );
            app.use (ext_alt_url, node.express.static(ext_alt_path) );

            console.log("jspolyfills,jsextensions loaded. available from",Object.values(statics));

            app.ws(WS_PATH, function(ws, req) {

              ws.on('message', function(msg) {

                var payload
                try {
                    payload = JSON.parse(msg);
                } catch (e) {
                    console.log({error_parsing:{msg:msg,error:e}});
                }
                var fn = {
                    load : load
                }[payload.fn];

                if (fn) {
                    var
                    ID=payload.id,
                    ARGS_IN=payload.args;

                    if ( typeof ID==='string' &&

                         isCBToken(ARGS_IN[ARGS_IN.length-1]) ) {

                         ARGS_IN[ARGS_IN.length-1]=function () {
                            var ARGS_OUT = cpArgs(arguments);
                            ws.send (JSON.stringify({id:ID,args:ARGS_OUT}));
                         };

                    }

                    fn.apply(this,ARGS_IN);
                } else {

                }

              });

            });

            app.listen(WS_PORT,cb);
        });

        return {
            app : app,
            path : WS_PATH,
            port : WS_PORT
        };

    }

    return {
            nodeGetPath  : nodeGetPath,
            nodeWSServer : nodeWSServer
    };

};

function Module_extensions(mod) {
    if (Object.env.isNode){
        mod.prototype("exportSimulation",require("./require_simulator.js").render);
    }
}

function fs_extensions (fs) {
    var path = require("path");// used by readdirSync




    /*with readdirSync honors 'recursive:true' option*/
    function readdirSync(outer_dir,options) {
        if (!options || !options.recursive) return readdirSync.__native(outer_dir,options);

        var flat = [];

        options = options || {};
        options.withFileTypes=true;
        function parse(dir,root) {
            var top = readdirSync.__native(dir,options);

            top.forEach(function(file){
                var here = path.join(root,file.name);
                if (file.isDirectory()) {
                    parse( path.join(outer_dir,here),here);
                } else {
                    flat.push(here);
                }
            });
        }

        parse(outer_dir,'');

        return flat;

    }
    fs.singleton.shim("readdirSync",readdirSync);

    function readdir(path,options,cb) {
        if (!options || !options.recursive) return readdir.__native(outer_dir,options,cb);

        //truly a kludge...

        if (typeof options==='function') {
            setTimeout(function(path,options,cb){
                try {
                    setTimeout(cb,0,null,readdirSync(path,options));
                } catch (e) {
                    setTimeout(cb,0,e);
                }
            },0,path,options,cb);
        }


    }
}

module.exports.Module_extensions = Module_extensions;
module.exports.fs_extensions = fs_extensions;
