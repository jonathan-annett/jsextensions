

module.exports = function(WS_PATH,ws_static_path,WS_PORT,cpArgs) {


    var
    nodeGetPath=function (mod) {
        try {
            return require.resolve(mod);
        } catch (e) {
            return false;
        }
    },
    isCBToken=function(CB) {
        return Array.isArray(CB) &&
        CB.length===1&&
        typeof CB[0]==='object'&&
        CB[0].cb===null;
    };

    function nodeSockeServer(cb) {

        if (!nodeGetPath('express') || !nodeGetPath ('express-ws')) return false;

        var node = {
            express : require('express'),
            path : require("path")

        };

        var app = node.express();
        var expressWs = require('express-ws')(app);


        var statics = {};
        var cached  = {};

        function load (name,cb) {

            if (typeof name!=='string') return;
            if (typeof cb!=='function') return;

            var src,textContent,path = nodeGetPath(name);

            if (typeof path!=='string') return;


            src=statics[path];
            if (src) {
                return cb ({mode:"src",data:src});
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
                    return cb ({mode:"src",data:(statics[path]=src)});

                }  else {

                    if (typeof mod._script_textContent==='string') {
                        return cb({mode:"textContent",data:(cached[path]=mod._script_textContent)});
                    }

                }
            }

            src = ws_static_path+name+'/'+name+'.js';
            app.use(src,node.express.static(path));
            app.use(ws_static_path+name+'/',node.express.static(node.path.dirname(path)));

            return cb ({mode:"src",data:(statics[path]=src)});

        }


        app.ws(WS_PATH, function(ws, req) {

          ws.on('message', function(msg) {
            var payload = JSON.parse(msg.data);
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
            }

          });
        });

        app.listen(WS_PORT,cb);


        load ("jspolyfills",function(mod){
            var pf_path = Object.keys(statics)[0];
            statics[pf_path]=ws_static_path+"polyfills.js";
            statics[__filename] = ws_static_path+'extensions.js';
            app.use(ws_static_path+'extensions.js',node.express.static(__filename));
            console.log("jspolyfills,jsextensions loaded. available from",Object.values(statics));
        });

        return {
            app : app,
            path : WS_PATH,
            port : WS_PORT
        };

    }

    return {
            nodeGetPath  : nodeGetPath,
            nodeSockeServer : nodeSockeServer
    };

};
