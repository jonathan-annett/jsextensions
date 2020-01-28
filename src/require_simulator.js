module.exports = requireSimModule() ;

function requireSimModule() {

    var browser_changeouts = {};
    var browser_aliased = [
        "punycode",
        "url",
        "querystring",
        "util",
        "path"
    ];
    browser_aliased.forEach(function(k){browser_changeouts[k]="browser-"+k;});

    var sandboxes = {
        "browser-path" : {process:{env:{},cwd:function(){ return "/";}}},
        "browser-util" : {process:{env:{},cwd:function(){ return "/";}}}
    };

    var template = template_source.toString()
        .replace(new RegExp('.*{',''),'')
        .replace(new RegExp('return\\ acme;.*','s'),'')
        .replace(new RegExp('\\/\\/\\$\\{','sg'),'${');

    var widget_re = new RegExp('(?<widget>"\\$\\{widgets\\.require_clause\\}".*\\$\\{widgets\\.dirname\\}"\\)\\},)','s');
    var widget_match =template.match(widget_re);
    var widget_template = widget_match.groups.widget;
    var json_re = new RegExp('(?<json>"\\$\\{widgets\\.load_json_clause\\}".*(;\\},))','s');
    var json_match =template.match(json_re);
    var json_template = json_match.groups.json;

    var template2 = template.replace(widget_re,'${widgets}').replace(json_re,'');

    var path = require("path"),
        fs =require("fs"),
        UglifyJS     = require("uglify-js"),
        babel = require("babel-core"),
        minifyJS = function minifyJS( js_src ) {
           var result= UglifyJS.minify(js_src, {
               parse: {},
               compress: {},
               mangle: false,
               output: {
                   code: true
               }
           });
           if (result.code) return result.code;

           result = babel.transform(js_src,{minified:true});


          return result.code;
        },
        vm = require('vm');

    if (fs.existsSync("./js_zipWrap.js","utf8")){
        (function () {
            var js_zipWrap_js = fs.readFileSync("./js_zipWrap.js","utf8");
            js_zipWrap_js = makePackage("zipWrap",js_zipWrap_js);
            fs.writeFileSync("./js_zipWrap.pkg.js",js_zipWrap_js);
            js_zipWrap_js = minifyJS(js_zipWrap_js);
            fs.writeFileSync("./js_zipWrap.min.js",js_zipWrap_js);

            var fs_jszip_js = fs.readFileSync("./fs_jszip.js","utf8");
            fs_jszip_js      = makePackage("fsJSZip",fs_jszip_js);
            fs.writeFileSync("./fs_jszip.pkg.js",fs_jszip_js);
            fs_jszip_js     = minifyJS(fs_jszip_js);
            fs.writeFileSync("./fs_jszip.min.js",fs_jszip_js);

            var fs_jszip_browser_js = fs.readFileSync("./fs_jszip-browser.js","utf8");
            fs_jszip_browser_js     = makePackage("startFSJSZip",fs_jszip_browser_js);
            fs.writeFileSync("./fs_jszip-browser.pkg.js",fs_jszip_browser_js);
            fs_jszip_browser_js     = minifyJS(fs_jszip_browser_js);
            fs.writeFileSync("./fs_jszip-browser.min.js",fs_jszip_browser_js);

        })();
    }

    require("..");

    function loadPrevious() {
        try {
            var lib = JSON.parse(fs.readFileSync(__filename+"on"));
            return Object.keys(lib.files).some(function(file) {
                var sha1=fs.readFileSync(file,"utf-8").sha1;
                if (typeof sha1!=='string') return true;
                console.log("checking:",sha1,lib.files[file].name);
                if (sha1 !== lib.files[file].sha1) return true;
            }) ? undefined : lib;

        } catch (e) {

        }
    }

    var self = {
        render:render,
        lib : loadPrevious()
    };

    if (self.lib) return self;

    self.lib = render ({
        name : "browser-internal",
        require_clause : "./browser-internal.js",
        url  : 'http://npmjs.com',
        code : 'module.exports = (function(){var res={};'+JSON.stringify(browser_aliased)+'.forEach(function(m){res[m]=require(m);});return res;})();',
        file : './browser-internal.js'
    },'simRequire');

    //delete self.lib.pkg.src;
    delete self.lib.code;
    delete self.lib.min_code;
    delete self.lib.skipped;
    fs.writeFileSync(__filename+"on",JSON.stringify(self.lib));

    return self;


    function isNative(mod) {
        var result = process.moduleLoadList.filter(function(x) {return x.indexOf(" "+mod)>=0;}).length>0;
        if (result ) result = !browser_changeouts[mod];
        return result;
    }

    function render(mod,renamed,submodules,previous) {
        if (typeof mod!=='object') return;
        submodules=submodules || [];

        //console.log('[');

        var here,root;
        function relative(fn) {
            var rel = path.relative(here,fn);
            if (!rel.startsWith(".")) rel= "./"+rel;
            return rel;
        }

        function find_node_modules_parent(resolved_path){
            var dir = resolved_path==="."?path.resolve("."):path.dirname(resolved_path);
            if (path.basename(dir)==="node_modules") return path.dirname(dir);
            return dir==="/"?false:find_node_modules_parent(dir);
        }


        function package_name(assumed,resolved_path){
            if (assumed===resolved_path) return assumed;

            var dir = path.dirname(resolved_path);
            var package_json_file = path.join(dir,"package.json");
            try {
                return JSON.parse(fs.readFileSync(package_json_file)).name;
            } catch(e) {
                if (resolved_path.endsWith("/index.js")) {
                    var base;
                    while (dir && dir!=="/") {
                        base = path.basename(dir);
                        dir  = path.dirname(dir);
                        if(["lib","src"].indexOf(base)<0) return base;
                    }
                    return assumed;
                } else {
                    return path.basename(resolved_path).split(".js")[0];
                }
            }
        }


        function add_submod(dir,name) {


            var sub;
            /*
            if (!!Function.browserInternalRequire.resolve(name)) {
                sub = {
                    name : name,
                    require_clause : name,
                    url  : "internal:"+name,
                    code : "("+Function.browserInternalRequire.resolve(name).toString()+")()"
                };
                console.log({internal:sub});
                submodules.push(sub);
                return ;
            }
            */

            if (!name||isNative(name)) {
                if (skipped.indexOf(name)<0) {
                    console.log("skipping:",name);
                    skipped.push(name);
                }
                return;
            }



            try {
                var subfile = require.resolve(name.search(/^\./)===0? path.resolve(dir,name) : browser_changeouts[name]||name);
                sub =  {
                    name           : browser_changeouts[name] || package_name(name,subfile),
                    require_clause : name,
                    url            : "file:"+subfile,
                    file           : subfile,
                    rel_file       : relative(subfile),
                };

                submodules.push(sub);

            } catch(e) {
               // console.log(e);
            }
        }

        function submod_exists(mod) {
                return submodules.some(function(sub){ return sub.require_clause === mod;});
        }

        function findSubmodules(inCode) {
                var list = inCode.ArraySplitCode({requires: /(require\s*\(\s*("|'))(?<fname>.*)(\2\s*\))/g} );
            if (!list) return [];
            return list.token_distribution.paths.requires.indexes.map(function(ix){
                return list.tokens[ix].groups.fname;
            }).filter(function(req){
                return !submod_exists(req);
            });
        }
        var cache={};
        var aliases={};
        var skipped=[];
        var requireFuncName,requiredModName;
        function attempt() {
            var

            filename,
            code,
            name            = mod.name,
            url             = mod.url,
            require_clause  = mod.require_clause;

            if (typeof name           !== 'string') return true;
            if (typeof url            !== 'string') return true;
            if (typeof require_clause !== 'string') return true;

            try {

                filename        = mod.file || require.resolve(require_clause);
                here            = path.dirname(filename);
                root            = find_node_modules_parent(filename);
                code            = mod.code || fs.readFileSync(filename,"utf-8");

                mod.file        = filename;
                mod.code        = code;
                mod.sha1        = code.sha1;

                findSubmodules(code).forEach(add_submod.bind(this,here));


            } catch (e) {
                console.log(e);
                return true;
            }

            var submodule_data=[],jsonmodule_data=[];

            if (submodules.some(function(sub){
                var
                name            = sub.name,
                url             = sub.url,
                require_clause  = sub.require_clause;
                if (typeof name!=='string') return true;
                if (typeof url!=='string') return true;
                if (typeof require_clause!=='string') return true;
                try {
                var

                    filename        = sub.file || require.resolve(require_clause),
                    rel_filename    = relative(filename),
                    code            = sub.code || fs.readFileSync(filename,"utf-8");

                    if (!(require_clause.startsWith(".")||require_clause.startsWith("/")) ) {
                        aliases[rel_filename]=require_clause;
                        //console.log({alias:{rel_filename,require_clause}},',');
                    }

                    sub.file = filename;
                    sub.code = code;
                    sub.sha1 = code.sha1;

                    var sandboxText = 'var exports = module.exports;';


                    if(filename.endsWith(".json")) {
                        jsonmodule_data.push({
                           "widgets.name"           : name,
                           "widgets.path"           : rel_filename,
                           "widgets.url"            : url,
                           "widgets.load_json_clause" : require_clause,
                           "widgets.filename"       : path.basename(filename),
                           "widgets.dirname"        : root?path.relative(root,path.dirname(filename)):path.dirname(filename),
                           "widgets.code"           : code.reindent(12),
                           "widgets.sandbox"        : sandboxText,
                           "widgets.sha1"           : sub.sha1,

                       });

                       if (!cache[require_clause]) {
                           cache[require_clause]=true;
                           console.log("processed:",sub.sha1,name);
                       }

                    } else {

                        findSubmodules(code).forEach(add_submod.bind(this,path.dirname(filename)));

                        if (sandboxes[name]) {    //    obj,            var_,     equals,   comma,    semi
                            sandboxText = Object.varify(sandboxes[name],undefined,undefined,undefined,',exports = module.exports;');
                        }

                        submodule_data.push({
                            "widgets.name"           : name,
                            "widgets.path"           : rel_filename,
                            "widgets.url"            : url,
                            "widgets.require_clause" : require_clause,
                            "widgets.filename"       : path.basename(filename),
                            "widgets.dirname"        : root?path.relative(root,path.dirname(filename)):path.dirname(filename),
                            "widgets.code"           : code.reindent(12),
                            "widgets.sandbox"        : sandboxText,
                            "widgets.sha1"           : sub.sha1,
                        });

                        if (!cache[require_clause]) {
                            cache[require_clause]=true;
                            console.log("processed:",sub.sha1,name);
                        }
                    }

                } catch (e) {
                    console.log(e);
                    return true;
                }

            })){
                return;
            }

            var src = template2.renderWithObject({
                "acme.code"     : code.reindent(12),
                "widgets"       :
                submodule_data.renderWithTemplate(widget_template)+
                jsonmodule_data.renderWithTemplate(json_template),
                "acme.url"      : url,
                "acme.filename" : path.basename(filename),
                "acme.dirname"  : root? path.relative(root,path.dirname(filename)):path.dirname(filename),
                acme : {
                    sandbox : sandboxes[name] ? Object.varify(sandboxes[name]) : ''
                }
            });

            requireFuncName = ('require-'+name+'-sim').toCamelCase();
            requiredModName = name.toCamelCase();



            src = src.replace(/^(\s*function\s*acme\s*\()/ ,'function '+requireFuncName+'(') ;

            if (Object.keys(aliases).length>0) {
                src = src.split('dir,cache={},aliases={},').join(
                    'dir,\ncache={},\naliases='+JSON.stringify(aliases,undefined,4)+','
                );
            }

            vm.runInContext(

                src+
                "\nvar "+requiredModName+" = "+requireFuncName+"();", sandbox
            );

            var pkg_src = makePackage(renamed||name.toCamelCase(),src);

            return {
                src : src,
                pkg_src : pkg_src
            };
        }

        var attempting = true;
        var result;
        var update_result  = function (file){
            result.files[file.file]= {
                name : file.name,
                sha1 : file.sha1
            };
        };

        while (attempting) {

            try {

                var sandbox = {};
                vm.createContext(sandbox);
                var output = attempt();
                if (
                    typeof output.src==='string' &&
                    typeof sandbox[requireFuncName] === 'function' &&
                    typeof sandbox[requiredModName] !== 'undefined'

                ) {


                    result = {
                            code       : output.src,
                            sha1       : mod.sha1,
                            min_code   : minifyJS(output.src),
                            pkg  : {
                                src      : output.pkg_src,
                                min_src  : minifyJS(output.pkg_src),
                            },
                            skipped    : skipped,

                            files:{},
                    };

                    submodules.forEach(update_result);

                    //console.log('{done:true}]');

                    return result;
                }
                attempting = false;


            } catch(e){
                if (typeof e==='string' && e.startsWith('{') && e.endsWith('}') ) {
                    var err = JSON.parse(e);
                    add_submod(err.dirname,err.filename);
                } else {
                   console.log(e);
                    attempting = false;
                }
            }
        }



    }

    function makePackage(name,pkg_fn){

        var pkg_bare = pkg_fn.toString().trimEnd();

        var template = packageTemplate.toString().trimEnd();
        template = template.substring(template.indexOf('{')+1,template.length-1).trim().split('function acme_package(){}');
        template.push(template.pop().split('${acme}').join(name));

        return template.join(('function()'+pkg_bare.substring(pkg_bare.indexOf('{')).reindent(4)));
    }

}

function template_source(){
function acme(){
    var
    dir,cache={},aliases={},
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

    //${acme.sandbox}

    dir = {
         "${widgets.require_clause}" : {
        name:"${widgets.name}",
        path:"${widgets.path}",
        load: (function (module,require,__filename,__dirname){//${widgets.sandbox}
         // paste begin:${widgets.url}
//${widgets.code}
         // paste end:${widgets.url} sha1 = ${widgets.sha1}
         return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"${widgets.dirname}"),"${widgets.filename}","${widgets.dirname}")},
        "${widgets.load_json_clause}" :
                 function (){ return [
                 // paste begin:${widgets.url} sha1 = ${widgets.sha1}
        //${widgets.code}
                 // paste end:${widgets.url}
                 ][0];},
         ___the___:"end"
    };


    var mod=function (module,require,__filename,__dirname) {var exports=module.exports;
        //paste-begin: ${acme.url}
 //${acme.code}
        //paste-end: ${acme.url}
        return module.exports;
    };

    return mod({exports:{}},__sim_require.bind(this,"${acme.dirname}"),"${acme.filename}","${acme.dirname}");

}
return acme;
}

function packageTemplate(){(function(x){x[0][x[1]]=(function acme_package(){})();})(typeof process+typeof module+typeof require==='objectobjectfunction'?[module,"exports"]:[window,"${acme}"]);}
