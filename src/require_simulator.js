
var template = template_source.toString()
    .replace(/.*{/,'')
    .replace(/return\ acme;.*/s,'')
    .replace(/\/\/\$\{/sg,'${');

var widget_re = /(?<widget>"\$\{widgets\.require_clause\}".*\$\{widgets\.dirname\}"\),)/s;
var widget_match =template.match(widget_re);
var widget_template = widget_match.groups.widget;
var json_re = /(?<json>"\$\{widgets\.load_json_clause\}".*(;\},))/s;
var json_match =template.match(json_re);
var json_template = json_match.groups.json;

var template2 = template.replace(widget_re,'${widgets}').replace(json_re,'');

var path = require("path"),fs =require("fs");

require("..");


function isNative(mod) {
    return process.moduleLoadList.indexOf("NativeModule "+mod)>=0;
}

function render(mod,submodules) {
    if (typeof mod!=='object') return;
    submodules=submodules || [];


    function add_submod(dir,name) {
        if (!name||isNative(name)) {
            if (skipped.indexOf(name)<0) {
                console.log("skipping:",name);
                skipped.push(name);
            }
            return;
        }

        try {
            var subfile = require.resolve(name.search(/^\./)===0? path.resolve(dir,name) : name);
            var sub =  {
                name : name,
                require_clause : name,
                url  : "file:/"+subfile
            };
            console.log({sub});
            submodules.push(sub);

        } catch(e) {
            console.log(e);
        }
    }

    function findSubmodules(inCode) {
            var list = inCode.ArraySplitCode({requires: /(require\s*\(\s*("|'))(?<fname>.*)(\2\s*\))/g} );
        if (!list) return [];
        return list.token_distribution.paths.requires.indexes.map(function(ix){
            return list.tokens[ix].groups.fname;
        }).filter(function(req){
            return !submodules.some(function(sub){ return sub.require_clause === req});
        });
    }
    var cache={};
    var skipped=[];
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

            filename        = require.resolve(require_clause);
            code            = fs.readFileSync(filename,"utf-8");

            findSubmodules(code).forEach(add_submod.bind(this,path.dirname(filename)));


        } catch (e) {
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

                filename        = require.resolve(require_clause),
                code            = fs.readFileSync(filename,"utf-8");


                if(filename.endsWith(".json")) {
                    jsonmodule_data.push({
                       "widgets.name"           : name,
                       "widgets.url"            : url,
                       "widgets.load_json_clause" : require_clause,
                       "widgets.filename"       : path.basename(filename),
                       "widgets.dirname"        : path.dirname(filename),
                       "widgets.code"           : code.reindent(12),
                   })
                } else {

                    findSubmodules(code).forEach(add_submod.bind(this,path.dirname(filename)));

                    submodule_data.push({
                        "widgets.name"           : name,
                        "widgets.url"            : url,
                        "widgets.require_clause" : require_clause,
                        "widgets.filename"       : path.basename(filename),
                        "widgets.dirname"        : path.dirname(filename),
                        "widgets.code"           : code.reindent(12),
                    });
                }

            } catch (e) {
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
            "acme.dirname"  : path.dirname(filename),
        });

        src = src.replace(/^(\s*function\s*acme\s*\()/ ,'function '+name.toCamelCase()+'(') ;

        fs.writeFileSync("./attempt.js",src);


        var fn = new Function ("("+src+")();");

        fn();

        return src;
    }

    var attempting = true;
    while (attempting) {

        try {
            var output = attempt();
            return {
                code : typeof output==='string' ? output: false,
                skipped : skipped
            };
        } catch(e){
            if (typeof e==='string' && e.startsWith('{') && e.endsWith('}') ) {
                var err = JSON.parse(e);

                add_submod(err.file);

            } else {
                console.log(e);
                attempting = false;
            }
        }
    }

}

if (process.mainModule===module) {
    console.log(render({name:process.argv[2],url:"file:"+process.argv[2],require_clause:process.argv[2]}));
}

module.exports = {
    render:render
}

function template_source(){

function acme() {

    var
    dir,
    cache={},
    __sim_require = function require(dirname,file) {
      file = file.search(/^\.{1}/) ===0 ? file.replace(/^\.{1}/,dirname) : file;
      var mod = cache[file];
      if (mod) return mod;
      if (dir [file]) {
        cache[file] = mod = dir[file]();
        return mod;
      }
      throw JSON.stringify({error:"file not found",file:file});
    };

    dir = {
         "${widgets.require_clause}" :
         (function (module,require,__filename,__dirname){var exports = module.exports;
         // paste begin:${widgets.url}
//${widgets.code}
         // paste end:${widgets.url}
         return module.exports;}).bind(this,{exports:{}},__sim_require.bind(this,"${widgets.dirname}"),"${widgets.filename}","${widgets.dirname}"),
        "${widgets.load_json_clause}" :
                 function (){ return [
                 // paste begin:${widgets.url}
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
