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

        console.log("decompressing");
        zipWrap(zip,function(wrapped,totalBytes){

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


            Stats = function Stats(size, when) {
              this.size = size;
              this.atimeMs = when.getTime();
              this.mtimeMs = this.atimeMs;
              this.ctimeMs = this.atimeMs;
              this.birthtimeMs = this.atimeMs;
              this.atime = when;
              this.mtime = this.atime;
              this.ctime = this.atime;
              this.birthtime = this.atime;
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
                   throw file.error(
                       new Error (
                           "Callback must be a function. Received "+typeof options.callback),
                           'ERR_INVALID_CALLBACK'
                    );
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

            readdir_flat      = function readdir_flat(path,options) {

                var
                err,
                lookup    = zip_resolve(path);

                if (!lookup.found) {
                    throw file.error (
                        new Error("ENOENT: no such file or directory, scandir '"+lookup.path+"'"),
                        'ENOENT',
                        -2,
                        'scandir'
                    );
                }
                if (!lookup.found.dir) {
                    throw lookup.error (
                        new Error("ENOTDIR: not a directory, scandir '"+lookup.path+"'"),
                        'ENOTDIR',
                        -20,
                        'scandir'
                    );
                }

                var
                resultMap = options&&options.encoding ==='buffer' ? str2ab : function(x){return x;},
                files     = Object.keys(zip.files),
                dir_list  = {};

                // normalize the paths into dir_list
                // (add "/"  to any paths that don't have it, remove trailing / from all dirs)
                files.forEach(function(f){
                    var root_f = f.startsWith("/")?f:"/"+f;
                    dir_list[root_f.replace(wrapped.trailing_slashes_re,'')]=zip.files[f];
                });
                files = Object.keys(dir_list);
                if (lookup.true_path !== "/") {
                    // anything "under" root is filtered
                    files = files.filter(function(p) {
                        return p.startsWith(lookup.dir_filter);
                    }).map(function(p){ return p.substr(lookup.dir_filter.length);});
                }

                var from = lookup.true_path==="/"?1:0;
                files =
                    files
                        .map(function(f){ return f.split("/")[from];})

                       .filter(function(f,i,ar){
                          return f && f.length && ar.indexOf(f)===i;
                       })

                    .map(resultMap);

                return files;
            },
            readdir_recursive = function readdir_recursive(path,options){

                if (options) {
                    delete options.recursive;
                } else {
                    options = {};
                }


                var
                err,
                lookup    = zip_resolve(path);

                if (!lookup.found) {
                    throw file.error (
                        new Error("ENOENT: no such file or directory, scandir '"+lookup.path+"'"),
                        'ENOENT',
                        -2,
                        'scandir'
                    );
                }
                if (!lookup.found.dir) {
                    throw lookup.error (
                        new Error("ENOTDIR: not a directory, scandir '"+lookup.path+"'"),
                        'ENOTDIR',
                        -20,
                        'scandir'
                    );
                }

                var
                files     = Object.keys(zip.files),
                dir_list  = {},
                resultMap = options&&options.encoding ==='buffer' ? str2ab : options && options.dirObjs ? function(x) { return dir_list[x]; } :  function(x){return x;};

                // normalize the paths into dir_list
                // (add "/"  to any paths that don't have it, remove trailing / from all dirs)
                files.forEach(function(f){
                    var root_f = f.startsWith("/")?f:"/"+f;
                    dir_list[root_f.replace(trailing_slashes_re,'')]=zip.files[f];
                });
                files = Object.keys(dir_list);

                files = files.filter(function(p) {
                        return p.startsWith(lookup.dir_filter);
                    }).map(function(p){ return p.substr(lookup.dir_filter.length);});
                return files;

            },

            readdir           = function readdir(path, options, callback) {
                if (typeof options==='function') {
                    callback=options;
                    options={};
                }
                try {
                    setTimeout(callback,0,null,wrapped.view_dir(path).get_listing(options&&options.recursive));
                } catch (e) {
                    return callback(err);
                }
            },
            readdirSync       = function readdirSync(path,options){
                return wrapped.view_dir(path).get_listing(options&&options.recursive);
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
                var lookup = zip_resolve(path);
                switch (typeof options) {
                    case 'function':
                        callback = options;
                        options = {};
                        break;
                    case 'undefined':
                        options = {};
                        break;
                    case 'object':break;
                    default:
                        throw lookup.error(
                           new Error (
                               'The "options" argument must be one of type string or Object. Received type '+typeof options),
                               'ERR_INVALID_ARG_TYPE'
                        );
                }

                if (typeof callback!=='function') {
                   throw lookup.error(
                       new Error (
                           "Callback must be a function. Received "+typeof callback),
                           'ERR_INVALID_CALLBACK'
                    );
                }


                if (path==="/" || lookup.found) {
                    return callback(lookup.error(
                       new Error (
                           "EEXIST: file already exists, mkdir '"+path+"'"),
                           'EEXIST',
                           -17
                    ));
                }



                if (options.recursive) {
                    zip.folder(lookup.true_path);
                    return callback(null);
                } else {
                    var parent = zip_resolve(lookup.dirname);
                    if (lookup.dirname!=="/" && !parent.found){
                        return callback(lookup.error(
                           new Error (
                               "ENOENT: no such file or directory, mkdir mkdir '"+path+"'"),
                               'ENOENT',
                               -2
                        ));
                    } else {
                        zip.folder(lookup.true_path);
                        return callback(null);
                    }
                }

            },
            mkdirSync         = function mkdirSync(path, options) {
                // becasue the mkdir implementation is actually sync anyway, a wrap is fine.
                mkdir(path,options,function(err){
                    if (err) throw err;
                });
            },
            exists            = function exists(path, callback) {
                if (typeof callback!=='function') {
                   throw lookup.error(
                       new Error (
                           "Callback must be a function. Received "+typeof callback),
                           'ERR_INVALID_CALLBACK'
                    );
                }
                callback(!!zip_resolve(path).found);
            },
            existsSync        = function exists(path) {
                return (!!zip_resolve(path).found);
            },
            rmdir             = function rmdir(path, options, callback) {
                if (typeof options==='function') {
                    callback=options;
                    options=undefined;
                }
                var file =  zip_resolve(path);
                if (file.found) {

                    if (options && options.recursive) {
                        zip.remove(file.zip_fn);
                        return callback(null);
                    } else {
                        var files = readdir_flat(file.zip_fn);
                        if (files.length>0) {
                           return callback(file.error(
                                new Error("ENOTEMPTY: directory not empty, rmdir '"+file.errpath+"'"),
                                    'ENOTEMPTY',
                                    -39
                                ));

                        }

                        zip.remove(file.zip_fn);
                        return callback(null);
                    }
                } else {
                   return callback(file.error(
                       new Error("ENOENT: no such file or directory, rmdir '"+file.errpath+"'"),
                           'ENOENT',
                           -2
                       ));
                }
            },
            rmdirSync         = function rmdir(path, options) {
                var file =  zip_resolve(path);
                if (file.found) {

                    if (options && options.recursive) {
                        zip.remove(file.zip_fn);
                        return ;
                    } else {
                        var files = readdir_flat(file.zip_fn);
                        if (files.length>0) {
                           throw file.error(
                                new Error("ENOTEMPTY: directory not empty, rmdir '"+file.errpath+"'"),
                                    'ENOTEMPTY',
                                    -39
                                );

                        }

                        zip.remove(file.zip_fn);
                        return;
                    }
                } else {
                   throw file.error(
                       new Error("ENOENT: no such file or directory, rmdir '"+file.errpath+"'"),
                           'ENOENT',
                           -2
                       );
                }
            },
            unlink            = function unlink(path, callback) {
                var file =  zip_resolve(path);
                if (file.found) {

                    if (file.found.dir) {
                        return callback(file.error(
                        new Error("EISDIR: illegal operation on a directory, unlink '"+file.errpath+"'"),
                            'EISDIR',
                            21
                        ));
                    } else {
                        zip.remove(file.zip_fn);
                    }

                } else {
                   return callback(file.error(
                       new Error("ENOENT: no such file or directory, rmdir '"+file.errpath+"'"),
                           'ENOENT',
                           -2
                       ));
                }
            },
            unlinkSync        = function unlinkSync(path) {
                var file =  zip_resolve(path);
                if (file.found) {

                    if (file.found.dir) {
                        throw file.error(
                        new Error("EISDIR: illegal operation on a directory, unlink '"+file.errpath+"'"),
                            'EISDIR',
                            21
                        );
                    } else {
                        zip.remove(file.zip_fn);
                    }

                } else {
                   throw file.error(
                       new Error("ENOENT: no such file or directory, rmdir '"+file.errpath+"'"),
                           'ENOENT',
                           -2
                       );
                }
            },
            stat              = function stat(path, options, callback) {
                if (typeof options === 'function') {
                  callback = options;
                  options = {};
                }

                var file =  zip_resolve(path);
                if (file.found) {
                    return callback(null,new Stats(
                        file.found.size,
                        file.found.date
                    ));
                } else {
                    return callback(file.error(
                    new Error("ENOENT: no such file or directory, stat '"+file.errpath+"'"),
                        'ENOENT',
                        -2,
                        'stat'
                    ));
                }


            },
            statSync          = function stat(path, options) {
                if (typeof options === 'function') {
                  callback = options;
                  options = {};
                }

                var file =  zip_resolve(path);
                if (file.found) {
                    return new Stats(
                        file.found.size,
                        file.found.date
                    );
                } else {
                    throw file.error(
                    new Error("ENOENT: no such file or directory, stat '"+file.errpath+"'"),
                        'ENOENT',
                        -2,
                        'stat'
                    );
                }
            },
            appendFile        = function appendFile(path, data, options, callback){
                if (typeof options==='function') {
                    callback=options;
                    options={};
                }
                readFile(path,options.encoding||"utf8",function(err,existing_data){
                    if (err) return callback (err);
                    if (typeof data==='string') {
                        return writeFile(path,existing_data+data,callback);
                    } else {
                        return writeFile(path,existing_data+ab2str(data),callback);
                    }
                });
            },
            appendFileSync    = function appendFileSync(path, data, options) {
                writeFileSync(
                    path,
                    readFileSync(path,"utf8") +
                    (typeof data==='string' ? data : ab2str(data))
                );
            },
            rename            = function rename(oldPath, newPath, callback) {
                if (typeof callback!=='function') {
                   throw lookup.error(
                       new Error ("Callback must be a function. Received "+typeof callback),
                       'ERR_INVALID_CALLBACK'
                    );
                }

                // verify source exists
                var source =  zip_resolve(oldPath);
                if (!source.found) {
                    return callback(source.error(
                       new Error ("ENOENT: no such file or directory, rename '"+oldPath+"' -> '"+newPath+"'"),
                           'ENOENT',
                           -2,
                           'rename'
                    ));
                }

                // verify dest is not a directory
                var dest =  zip_resolve(newPath);
                if (dest.found && dest.found.dir) {
                    return callback(source.error(
                       new Error ("EISDIR: illegal operation on a directory, rename '"+oldPath+"' -> '"+newPath+"'"),
                           'EISDIR',
                           -21,
                           'rename'
                    ));
                }

                // don't try to rename to the same logical place
                if (source.true_path===dest.true_path) {
                    return callback(null);
                }

                if (source.found.dir) {
                    // different logic for renaming a directory
                    var
                    // get a list of filenames, relative to source
                    // these will be relative "true_paths" (ie they won't start or end in a slash)
                    base_paths = readdir_recursive(source.use_dir),
                    // and a list (index mapped to base_paths) of the underlying objects
                    fileObjs   = readdir_recursive(file.use_dir,{dirObjs:true});

                    // fetch all the data in one fell swoop as an array
                    Promise.all(fileObjs.map(function(obj){
                        return async("buffer");
                    }))
                        .then(function(data){
                            // and write each file to it's new sub tree
                            data.forEach(function(fileData,ix){
                               var true_path = dest.true_path + "/" + base_paths[ix];
                               zip.file(true_path,fileData,{buffer:true});
                            });

                            // and remove the original folder
                            zip.remove(file.zip_fn);
                        });

                } else {
                    // rename a file, basically copy it then delete it.
                    if (dest.found) zip.remove(dest.found.use_file);
                    zip.file(source.use_file).async("buffer").then(
                        function(data) {
                            zip.file(dest.true_path,data,{buffer});
                            zip.remove(source.use_file);
                            callback(null);
                        }
                    ).catch(callback);

                }



            },
            renameSync        = function renameSync(oldPath, newPath) {

            },
            watching          = {},
            watch             = function watch(filename, options, listener) {
                if (typeof options === 'function') {
                    listener = options;
                    options = {};
                }


                var lookup = zip_resolve(path);

                if (!!lookup.found) {
                    var watcher = {};

                    watching[lookup.true_path] = watcher;

                    return Object.defineProperties(watcher,{
                        close : function() {
                            delete watching[lookup.true_path];
                        },
                    });

                }
            },
            watchFile         = function watchFile(filename, options, listener) {

            },
            unwatchFile       = function unwatchFile(filename, listener) {

            },

            tests = function (cb) {

                test_mkdir(function(){
                    console.log("test_mkdir passes");
                    test_mkdirSync();
                    console.log("test_mkdirSync passes");
                    test_exists(function(){
                        console.log("test_exists passes");
                        test_existsSync();
                        console.log("test_existsSync passes");
                        test_rmdir(function(){
                            console.log("test_rmdir passes");

                            test_readFile(function(){
                                console.log("test_readFile passes");
                                test_writeFile(function(){
                                    console.log("test_writeFile passes");
                                    cb();
                                });
                            });

                        });
                    });
                });

                try {
                    readFileSync("/jszip_test/hello-world.txt","utf8");
                } catch (e) {
                    console.log(e.message);
                }



                function test_mkdirSync() {
                    mkdirSync ("newdir");
                    mkdirSync ("newdir/more/paths/here",{recursive:true});
                    var erred;
                    try {
                        mkdirSync ("badroot/more/paths/here");
                        erred=new Error("non recursive deep shoukd have failed");
                    } catch (e) {

                    }
                    if (erred) {
                        throw erred;
                    }

                    try {
                        mkdirSync ("newdir");
                        erred=new Error("already exist should have failed");
                    } catch (e) {

                    }
                    if (erred) {
                        throw erred;
                    }

                    try {
                        mkdirSync ("/");
                        erred=new Error("/ should have failed");
                    } catch (e) {

                    }
                    if (erred) {
                        throw erred;
                    }

                }

                function test_mkdir(cb) {

                    mkdir("newdir2",function(err){
                        if (err) {
                            throw err;
                        }
                         mkdir("newdir2",function(err){
                            if (!err) {
                               throw new Error("already exist should have failed");
                            }
                            mkdir ("newdir2/more/paths/here",{recursive:true},function(err){
                                if (err) {
                                    throw err;
                                }

                                mkdir ("badroot/more/paths/here",function(err){
                                     if (!err) {
                                        throw new Error("non recursive deep shoukd have failed");
                                     }
                                     setTimeout(cb,1);
                                });
                            });

                        });
                    });

                }

                function test_exists(cb) {
                    exists("thisshouldnotexist",function(EXISTS){
                        if (EXISTS) {
                            throw new Error ("file should not exist");
                        }

                        exists(".",function(EXISTS){


                          if (!EXISTS) {
                                throw new Error ("file . should exist");
                            }


                           exists("/",function(EXISTS){
                               if (!EXISTS) {
                                   throw new Error ("file / should exist");
                               }

                               exists("newdir",function(EXISTS){
                                   if (!EXISTS) {
                                       throw new Error ("file newdir should exist");
                                   }

                                   exists("newdir2/more/paths/here",function(EXISTS){
                                       if (!EXISTS) {
                                           throw new Error ("file newdir2/more/paths/here should exist");
                                       }
                                       exists("badroot/more/paths/here",function(EXISTS){
                                           if (EXISTS) {
                                               throw new Error ("file badroot/more/paths/here should not exist");
                                           }

                                           setTimeout(cb,1);
                                       });
                                   });
                               });
                           });

                        });
                    });
                }

                function test_existsSync() {


                    if (existsSync("thisshouldnotexist")) {
                            throw new Error ("file should not exist");
                        }

                    if (!existsSync(".")){
                        throw new Error ("file . should exist");
                    }


                    if (!existsSync("/")){
                       throw new Error ("file / should exist");
                    }

                    if (!existsSync("newdir")){
                           throw new Error ("file newdir should exist");
                    }

                    if (!existsSync("newdir2/more/paths/here")){
                        throw new Error ("file newdir2/more/paths/here should exist");
                    }
                    if (existsSync("badroot/more/paths/here")){
                        throw new Error ("file badroot/more/paths/here should not exist");
                    }
                }

                function test_rmdir(cb) {

                    rmdir("this-path-should-not-exist",function(err){
                        if (!err) {
                            throw new Error("rmdir on non existant path shoud fail");
                        }
                        rmdir("newdir",function(err){
                            if (!err) {
                                throw new Error("rmdir on non empty path should fail");
                            }


                            rmdir("newdir2/more/paths/here",function(err){
                                if (err) {
                                    throw new Error("rmdir failed");
                                }

                                rmdir("newdir2/more/paths",{recursive:true},function(err){
                                    if (err) {
                                        throw new Error("recursive rmdir failed");
                                    }


                                    setTimeout(cb,1);


                                });


                            });


                        });

                    });


                }

                function test_readFile(cb){
                    readFile("jszip_test/hello-world.txt","utf8",function(err,data){
                        if (err) throw err;
                        if (data.trim()!=="hello world") throw "readFile test 1 failed";

                        readFile("./jszip_test/hello-world.txt","utf8",function(err,data){
                            if (err) throw err;

                            if (data.trim()!=="hello world") throw "readFile test 2 failed";

                            readFile("jszip_test/hello-world.txt","utf-8",function(err,data){
                                if (err) throw err;

                                if (data.trim()!=="hello world") throw "readFile test 3 failed";

                                readFile("./jszip_test/hello-world.txt","utf-8",function(err,data){
                                    if (err) throw err;

                                    if (data.trim()!=="hello world") throw "readFile test 4 failed";

                                    readFile("/jszip_test/hello-world.txt","utf8",function(err,data){
                                        if (err) throw err;

                                        if (data.trim()!=="hello world") throw "readFile test 5 failed";

                                        readFile("/jszip_test/hello-world.txt","utf-8",function(err,data){
                                            if (err) throw err;

                                            if (data.trim()!=="hello world") throw "readFile test 6 failed";

                                            readFile("jszip_test/subdir/under/the/main/directory/harry_potter.txt","utf-8",function(err,data){
                                                if (err) throw err;

                                                if (data.trim()!=="ok it should be under the stairs.") throw "readFile test 7 failed";

                                                setTimeout(cb,1);

                                            });

                                        });

                                    });

                                });

                            });


                        });

                    });
                }

                function test_writeFile(cb) {

                    console.log(readdirSync("/"));


                    writeFile("test.txt","utf8","yeah",function(err){
                        if (err) throw err;

                        console.log(readdirSync("/"));
                        cb(err);

                    });
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
                        var __native = function access(path, mode, callback) {
                          if (typeof mode === 'function') {
                            callback = mode;
                            mode = F_OK;
                          }

                          path = getValidatedPath(path);

                          mode = mode | 0;
                          const req = new FSReqCallback();
                          req.oncomplete = makeCallback(callback);
                          binding.access(pathModule.toNamespacedPath(path), mode, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "accessSync": {
                    "value": function accessSync(path, mode) {
                        var __native = function accessSync(path, mode) {
                          path = getValidatedPath(path);

                          if (mode === undefined)
                            mode = F_OK;
                          else
                            mode = mode | 0;

                          const ctx = { path };
                          binding.access(pathModule.toNamespacedPath(path), mode, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "chown": {
                    "value": function chown(path, uid, gid, callback) {
                        var __native = function chown(path, uid, gid, callback) {
                          callback = makeCallback(callback);
                          path = getValidatedPath(path);
                          validateUint32(uid, 'uid');
                          validateUint32(gid, 'gid');

                          const req = new FSReqCallback();
                          req.oncomplete = callback;
                          binding.chown(pathModule.toNamespacedPath(path), uid, gid, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "chownSync": {
                    "value": function chownSync(path, uid, gid) {
                        var __native = function chownSync(path, uid, gid) {
                          path = getValidatedPath(path);
                          validateUint32(uid, 'uid');
                          validateUint32(gid, 'gid');
                          const ctx = { path };
                          binding.chown(pathModule.toNamespacedPath(path), uid, gid, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "chmod": {
                    "value": function chmod(path, mode, callback) {
                        var __native = function chmod(path, mode, callback) {
                          path = getValidatedPath(path);
                          mode = parseMode(mode, 'mode');
                          callback = makeCallback(callback);

                          const req = new FSReqCallback();
                          req.oncomplete = callback;
                          binding.chmod(pathModule.toNamespacedPath(path), mode, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "chmodSync": {
                    "value": function chmodSync(path, mode) {
                        var __native = function chmodSync(path, mode) {
                          path = getValidatedPath(path);
                          mode = parseMode(mode, 'mode');

                          const ctx = { path };
                          binding.chmod(pathModule.toNamespacedPath(path), mode, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "close": {
                    "value": function close(fd, callback) {
                        var __native = function close(fd, callback) {
                          validateInt32(fd, 'fd', 0);
                          const req = new FSReqCallback();
                          req.oncomplete = makeCallback(callback);
                          binding.close(fd, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "closeSync": {
                    "value": function closeSync(fd) {
                        var __native = function closeSync(fd) {
                          validateInt32(fd, 'fd', 0);

                          const ctx = {};
                          binding.close(fd, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "copyFile": {
                    "value": function copyFile(src, dest, flags, callback) {
                        var __native = function copyFile(src, dest, flags, callback) {
                          if (typeof flags === 'function') {
                            callback = flags;
                            flags = 0;
                          } else if (typeof callback !== 'function') {
                            throw new ERR_INVALID_CALLBACK(callback);
                          }

                          src = getValidatedPath(src, 'src');
                          dest = getValidatedPath(dest, 'dest');

                          src = pathModule._makeLong(src);
                          dest = pathModule._makeLong(dest);
                          flags = flags | 0;
                          const req = new FSReqCallback();
                          req.oncomplete = makeCallback(callback);
                          binding.copyFile(src, dest, flags, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "copyFileSync": {
                    "value": function copyFileSync(src, dest, flags) {
                        var __native = function copyFileSync(src, dest, flags) {
                          src = getValidatedPath(src, 'src');
                          dest = getValidatedPath(dest, 'dest');

                          const ctx = { path: src, dest };  // non-prefixed

                          src = pathModule._makeLong(src);
                          dest = pathModule._makeLong(dest);
                          flags = flags | 0;
                          binding.copyFile(src, dest, flags, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "createReadStream": {
                    "value": function createReadStream(path, options) {
                        var __native = function createReadStream(path, options) {
                          lazyLoadStreams();
                          return new ReadStream(path, options);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "createWriteStream": {
                    "value": function createWriteStream(path, options) {
                        var __native = function createWriteStream(path, options) {
                          lazyLoadStreams();
                          return new WriteStream(path, options);
                        };
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
                        var __native = function fchown(fd, uid, gid, callback) {
                          validateInt32(fd, 'fd', 0);
                          validateUint32(uid, 'uid');
                          validateUint32(gid, 'gid');

                          const req = new FSReqCallback();
                          req.oncomplete = makeCallback(callback);
                          binding.fchown(fd, uid, gid, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "fchownSync": {
                    "value": function fchownSync(fd, uid, gid) {
                        var __native = function fchownSync(fd, uid, gid) {
                          validateInt32(fd, 'fd', 0);
                          validateUint32(uid, 'uid');
                          validateUint32(gid, 'gid');

                          const ctx = {};
                          binding.fchown(fd, uid, gid, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "fchmod": {
                    "value": function fchmod(fd, mode, callback) {
                        var __native = function fchmod(fd, mode, callback) {
                          validateInt32(fd, 'fd', 0);
                          mode = parseMode(mode, 'mode');
                          callback = makeCallback(callback);

                          const req = new FSReqCallback();
                          req.oncomplete = callback;
                          binding.fchmod(fd, mode, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "fchmodSync": {
                    "value": function fchmodSync(fd, mode) {
                        var __native = function fchmodSync(fd, mode) {
                          validateInt32(fd, 'fd', 0);
                          mode = parseMode(mode, 'mode');
                          const ctx = {};
                          binding.fchmod(fd, mode, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "fdatasync": {
                    "value": function fdatasync(fd, callback) {
                        var __native = function fdatasync(fd, callback) {
                          validateInt32(fd, 'fd', 0);
                          const req = new FSReqCallback();
                          req.oncomplete = makeCallback(callback);
                          binding.fdatasync(fd, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "fdatasyncSync": {
                    "value": function fdatasyncSync(fd) {
                        var __native = function fdatasyncSync(fd) {
                          validateInt32(fd, 'fd', 0);
                          const ctx = {};
                          binding.fdatasync(fd, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "fstat": {
                    "value": function fstat(fd, options, callback) {
                        /*var __native = function fstat(fd, options = { bigint: false }, callback) {
                          if (typeof options === 'function') {
                            callback = options;
                            options = {};
                          }
                          validateInt32(fd, 'fd', 0);
                          const req = new FSReqCallback(options.bigint);
                          req.oncomplete = makeStatsCallback(callback);
                          binding.fstat(fd, options.bigint, req);
                        };*/
            },
                    "configurable": true,
                    "enumerable": true
                },
                "fstatSync": {
                    "value": function fstatSync(fd, options = {}) {
                        var __native = function fstatSync(fd, options = {}) {
                          validateInt32(fd, 'fd', 0);
                          const ctx = { fd };
                          const stats = binding.fstat(fd, options.bigint, undefined, ctx);
                          handleErrorFromBinding(ctx);
                          return getStatsFromBinding(stats);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "fsync": {
                    "value": function fsync(fd, callback) {
                        var __native = function fsync(fd, callback) {
                          validateInt32(fd, 'fd', 0);
                          const req = new FSReqCallback();
                          req.oncomplete = makeCallback(callback);
                          binding.fsync(fd, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "fsyncSync": {
                    "value": function fsyncSync(fd) {
                        var __native = function fsyncSync(fd) {
                          validateInt32(fd, 'fd', 0);
                          const ctx = {};
                          binding.fsync(fd, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "ftruncate": {
                    "value": function ftruncate(fd, len, callback) {
                        /*
                        var __native = function ftruncate(fd, len = 0, callback) {
                          if (typeof len === 'function') {
                            callback = len;
                            len = 0;
                          }
                          validateInt32(fd, 'fd', 0);
                          validateInteger(len, 'len');
                          len = Math.max(0, len);
                          const req = new FSReqCallback();
                          req.oncomplete = makeCallback(callback);
                          binding.ftruncate(fd, len, req);
                        };
                        */
            },
                    "configurable": true,
                    "enumerable": true
                },
                "ftruncateSync": {
                    "value": function ftruncateSync(fd, len = 0) {
                        var __native = function ftruncateSync(fd, len = 0) {
                          validateInt32(fd, 'fd', 0);
                          validateInteger(len, 'len');
                          len = Math.max(0, len);
                          const ctx = {};
                          binding.ftruncate(fd, len, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "futimes": {
                    "value": function futimes(fd, atime, mtime, callback) {
                        var __native = function futimes(fd, atime, mtime, callback) {
                          validateInt32(fd, 'fd', 0);
                          atime = toUnixTimestamp(atime, 'atime');
                          mtime = toUnixTimestamp(mtime, 'mtime');
                          const req = new FSReqCallback();
                          req.oncomplete = makeCallback(callback);
                          binding.futimes(fd, atime, mtime, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "futimesSync": {
                    "value": function futimesSync(fd, atime, mtime) {
                        var __native = function futimesSync(fd, atime, mtime) {
                          validateInt32(fd, 'fd', 0);
                          atime = toUnixTimestamp(atime, 'atime');
                          mtime = toUnixTimestamp(mtime, 'mtime');
                          const ctx = {};
                          binding.futimes(fd, atime, mtime, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "lchown": {
                    "value": function lchown(path, uid, gid, callback) {
                        var __native = function lchown(path, uid, gid, callback) {
                          callback = makeCallback(callback);
                          path = getValidatedPath(path);
                          validateUint32(uid, 'uid');
                          validateUint32(gid, 'gid');
                          const req = new FSReqCallback();
                          req.oncomplete = callback;
                          binding.lchown(pathModule.toNamespacedPath(path), uid, gid, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "lchownSync": {
                    "value": function lchownSync(path, uid, gid) {
                        var __native = function lchownSync(path, uid, gid) {
                          path = getValidatedPath(path);
                          validateUint32(uid, 'uid');
                          validateUint32(gid, 'gid');
                          const ctx = { path };
                          binding.lchown(pathModule.toNamespacedPath(path), uid, gid, undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "link": {
                    "value": function link(existingPath, newPath, callback) {
                        var __native = function link(existingPath, newPath, callback) {
                          callback = makeCallback(callback);

                          existingPath = getValidatedPath(existingPath, 'existingPath');
                          newPath = getValidatedPath(newPath, 'newPath');

                          const req = new FSReqCallback();
                          req.oncomplete = callback;

                          binding.link(pathModule.toNamespacedPath(existingPath),
                                       pathModule.toNamespacedPath(newPath),
                                       req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "linkSync": {
                    "value": function linkSync(existingPath, newPath) {
                        var __native = function linkSync(existingPath, newPath) {
                          existingPath = getValidatedPath(existingPath, 'existingPath');
                          newPath = getValidatedPath(newPath, 'newPath');

                          const ctx = { path: existingPath, dest: newPath };
                          const result = binding.link(pathModule.toNamespacedPath(existingPath),
                                                      pathModule.toNamespacedPath(newPath),
                                                      undefined, ctx);
                          handleErrorFromBinding(ctx);
                          return result;
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "lstat": {
                    "value": function lstat(path, options, callback) {
                       /* var __native = function lstat(path, options = { bigint: false }, callback) {
                          if (typeof options === 'function') {
                            callback = options;
                            options = {};
                          }
                          callback = makeStatsCallback(callback);
                          path = getValidatedPath(path);
                          const req = new FSReqCallback(options.bigint);
                          req.oncomplete = callback;
                          binding.lstat(pathModule.toNamespacedPath(path), options.bigint, req);
                        };*/
            },
                    "configurable": true,
                    "enumerable": true
                },
                "lstatSync": {
                    "value": function lstatSync(path, options = {}) {
                        var __native = function lstatSync(path, options = {}) {
                          path = getValidatedPath(path);
                          const ctx = { path };
                          const stats = binding.lstat(pathModule.toNamespacedPath(path),
                                                      options.bigint, undefined, ctx);
                          handleErrorFromBinding(ctx);
                          return getStatsFromBinding(stats);
                        };
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
                        var __native = function mkdtemp(prefix, options, callback) {
                          callback = makeCallback(typeof options === 'function' ? options : callback);
                          options = getOptions(options, {});
                          if (!prefix || typeof prefix !== 'string') {
                            throw new ERR_INVALID_ARG_TYPE('prefix', 'string', prefix);
                          }
                          nullCheck(prefix, 'prefix');
                          warnOnNonPortableTemplate(prefix);
                          const req = new FSReqCallback();
                          req.oncomplete = callback;
                          binding.mkdtemp(`${prefix}XXXXXX`, options.encoding, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "mkdtempSync": {
                    "value": function mkdtempSync(prefix, options) {
                        var __native = function mkdtempSync(prefix, options) {
                          options = getOptions(options, {});
                          if (!prefix || typeof prefix !== 'string') {
                            throw new ERR_INVALID_ARG_TYPE('prefix', 'string', prefix);
                          }
                          nullCheck(prefix, 'prefix');
                          warnOnNonPortableTemplate(prefix);
                          const path = `${prefix}XXXXXX`;
                          const ctx = { path };
                          const result = binding.mkdtemp(path, options.encoding,
                                                         undefined, ctx);
                          handleErrorFromBinding(ctx);
                          return result;
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "open": {
                    "value": function open(path, flags, mode, callback) {
                        var __native = function open(path, flags, mode, callback) {
                          path = getValidatedPath(path);
                          if (arguments.length < 3) {
                            callback = flags;
                            flags = 'r';
                            mode = 0o666;
                          } else if (typeof mode === 'function') {
                            callback = mode;
                            mode = 0o666;
                          }
                          const flagsNumber = stringToFlags(flags);
                          if (arguments.length >= 4) {
                            mode = parseMode(mode, 'mode', 0o666);
                          }
                          callback = makeCallback(callback);

                          const req = new FSReqCallback();
                          req.oncomplete = callback;

                          binding.open(pathModule.toNamespacedPath(path),
                                       flagsNumber,
                                       mode,
                                       req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "openSync": {
                    "value": function openSync(path, flags, mode) {
                        var __native = function openSync(path, flags, mode) {
                          path = getValidatedPath(path);
                          const flagsNumber = stringToFlags(flags || 'r');
                          mode = parseMode(mode, 'mode', 0o666);

                          const ctx = { path };
                          const result = binding.open(pathModule.toNamespacedPath(path),
                                                      flagsNumber, mode,
                                                      undefined, ctx);
                          handleErrorFromBinding(ctx);
                          return result;
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "opendir": {
                    "value": function opendir(path, options, callback) {
                        var __native = function opendir(path, options, callback) {
                          callback = typeof options === 'function' ? options : callback;
                          if (typeof callback !== 'function') {
                            throw new ERR_INVALID_CALLBACK(callback);
                          }
                          path = getValidatedPath(path);
                          options = getOptions(options, {
                            encoding: 'utf8'
                          });

                          function opendirCallback(error, handle) {
                            if (error) {
                              callback(error);
                            } else {
                              callback(null, new Dir(handle, path, options));
                            }
                          }

                          const req = new FSReqCallback();
                          req.oncomplete = opendirCallback;

                          dirBinding.opendir(
                            pathModule.toNamespacedPath(path),
                            options.encoding,
                            req
                          );
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "opendirSync": {
                    "value": function opendirSync(path, options) {
                        var __native = function opendirSync(path, options) {
                          path = getValidatedPath(path);
                          options = getOptions(options, {
                            encoding: 'utf8'
                          });

                          const ctx = { path };
                          const handle = dirBinding.opendir(
                            pathModule.toNamespacedPath(path),
                            options.encoding,
                            undefined,
                            ctx
                          );
                          handleErrorFromBinding(ctx);

                          return new Dir(handle, path, options);
                        };
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
                        var __native = function read(fd, buffer, offset, length, position, callback) {
                          validateInt32(fd, 'fd', 0);
                          validateBuffer(buffer);
                          callback = maybeCallback(callback);

                          offset |= 0;
                          length |= 0;

                          if (length === 0) {
                            return process.nextTick(function tick() {
                              callback(null, 0, buffer);
                            });
                          }

                          if (buffer.byteLength === 0) {
                            throw new ERR_INVALID_ARG_VALUE('buffer', buffer,
                                                            'is empty and cannot be written');
                          }

                          validateOffsetLengthRead(offset, length, buffer.byteLength);

                          if (!Number.isSafeInteger(position))
                            position = -1;

                          function wrapper(err, bytesRead) {
                            // Retain a reference to buffer so that it can't be GC'ed too soon.
                            callback(err, bytesRead || 0, buffer);
                          }

                          const req = new FSReqCallback();
                          req.oncomplete = wrapper;

                          binding.read(fd, buffer, offset, length, position, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "readSync": {
                    "value": function readSync(fd, buffer, offset, length, position) {
                        var __native = function readSync(fd, buffer, offset, length, position) {
                          validateInt32(fd, 'fd', 0);
                          validateBuffer(buffer);

                          offset |= 0;
                          length |= 0;

                          if (length === 0) {
                            return 0;
                          }

                          if (buffer.byteLength === 0) {
                            throw new ERR_INVALID_ARG_VALUE('buffer', buffer,
                                                            'is empty and cannot be written');
                          }

                          validateOffsetLengthRead(offset, length, buffer.byteLength);

                          if (!Number.isSafeInteger(position))
                            position = -1;

                          const ctx = {};
                          const result = binding.read(fd, buffer, offset, length, position,
                                                      undefined, ctx);
                          handleErrorFromBinding(ctx);
                          return result;
                        };
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
                        var __native = function readlink(path, options, callback) {
                          callback = makeCallback(typeof options === 'function' ? options : callback);
                          options = getOptions(options, {});
                          path = getValidatedPath(path, 'oldPath');
                          const req = new FSReqCallback();
                          req.oncomplete = callback;
                          binding.readlink(pathModule.toNamespacedPath(path), options.encoding, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "readlinkSync": {
                    "value": function readlinkSync(path, options) {
                        var __native = function readlinkSync(path, options) {
                          options = getOptions(options, {});
                          path = getValidatedPath(path, 'oldPath');
                          const ctx = { path };
                          const result = binding.readlink(pathModule.toNamespacedPath(path),
                                                          options.encoding, undefined, ctx);
                          handleErrorFromBinding(ctx);
                          return result;
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "realpath": {
                    "value": function realpath(p, options, callback) {
                        var __native = function realpath(p, options, callback) {
                          callback = typeof options === 'function' ? options : maybeCallback(callback);
                          options = getOptions(options, {});
                          p = toPathIfFileURL(p);

                          if (typeof p !== 'string') {
                            p += '';
                          }
                          validatePath(p);
                          p = pathModule.resolve(p);

                          const seenLinks = Object.create(null);
                          const knownHard = Object.create(null);

                          // Current character position in p
                          let pos;
                          // The partial path so far, including a trailing slash if any
                          let current;
                          // The partial path without a trailing slash (except when pointing at a root)
                          let base;
                          // The partial path scanned in the previous round, with slash
                          let previous;

                          current = base = splitRoot(p);
                          pos = current.length;

                          // On windows, check that the root exists. On unix there is no need.
                          if (isWindows && !knownHard[base]) {
                            fs.lstat(base, (err, stats) => {
                              if (err) return callback(err);
                              knownHard[base] = true;
                              LOOP();
                            });
                          } else {
                            process.nextTick(LOOP);
                          }

                          // Walk down the path, swapping out linked path parts for their real
                          // values
                          function LOOP() {
                            // Stop if scanned past end of path
                            if (pos >= p.length) {
                              return callback(null, encodeRealpathResult(p, options));
                            }

                            // find the next part
                            const result = nextPart(p, pos);
                            previous = current;
                            if (result === -1) {
                              const last = p.slice(pos);
                              current += last;
                              base = previous + last;
                              pos = p.length;
                            } else {
                              current += p.slice(pos, result + 1);
                              base = previous + p.slice(pos, result);
                              pos = result + 1;
                            }

                            // Continue if not a symlink, break if a pipe/socket
                            if (knownHard[base]) {
                              if (isFileType(statValues, S_IFIFO) ||
                                  isFileType(statValues, S_IFSOCK)) {
                                return callback(null, encodeRealpathResult(p, options));
                              }
                              return process.nextTick(LOOP);
                            }

                            return fs.lstat(base, gotStat);
                          }

                          function gotStat(err, stats) {
                            if (err) return callback(err);

                            // If not a symlink, skip to the next path part
                            if (!stats.isSymbolicLink()) {
                              knownHard[base] = true;
                              return process.nextTick(LOOP);
                            }

                            // Stat & read the link if not read before.
                            // Call `gotTarget()` as soon as the link target is known.
                            // `dev`/`ino` always return 0 on windows, so skip the check.
                            let id;
                            if (!isWindows) {
                              const dev = stats.dev.toString(32);
                              const ino = stats.ino.toString(32);
                              id = `${dev}:${ino}`;
                              if (seenLinks[id]) {
                                return gotTarget(null, seenLinks[id], base);
                              }
                            }
                            fs.stat(base, (err) => {
                              if (err) return callback(err);

                              fs.readlink(base, (err, target) => {
                                if (!isWindows) seenLinks[id] = target;
                                gotTarget(err, target);
                              });
                            });
                          }

                          function gotTarget(err, target, base) {
                            if (err) return callback(err);

                            gotResolvedLink(pathModule.resolve(previous, target));
                          }

                          function gotResolvedLink(resolvedLink) {
                            // Resolve the link, then start over
                            p = pathModule.resolve(resolvedLink, p.slice(pos));
                            current = base = splitRoot(p);
                            pos = current.length;

                            // On windows, check that the root exists. On unix there is no need.
                            if (isWindows && !knownHard[base]) {
                              fs.lstat(base, (err) => {
                                if (err) return callback(err);
                                knownHard[base] = true;
                                LOOP();
                              });
                            } else {
                              process.nextTick(LOOP);
                            }
                          }
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "realpathSync": {
                    "value": function realpathSync(p, options) {
                        var __native = function realpathSync(p, options) {
                          if (!options)
                            options = emptyObj;
                          else
                            options = getOptions(options, emptyObj);
                          p = toPathIfFileURL(p);
                          if (typeof p !== 'string') {
                            p += '';
                          }
                          validatePath(p);
                          p = pathModule.resolve(p);

                          const cache = options[realpathCacheKey];
                          const maybeCachedResult = cache && cache.get(p);
                          if (maybeCachedResult) {
                            return maybeCachedResult;
                          }

                          const seenLinks = Object.create(null);
                          const knownHard = Object.create(null);
                          const original = p;

                          // Current character position in p
                          let pos;
                          // The partial path so far, including a trailing slash if any
                          let current;
                          // The partial path without a trailing slash (except when pointing at a root)
                          let base;
                          // The partial path scanned in the previous round, with slash
                          let previous;

                          // Skip over roots
                          current = base = splitRoot(p);
                          pos = current.length;

                          // On windows, check that the root exists. On unix there is no need.
                          if (isWindows && !knownHard[base]) {
                            const ctx = { path: base };
                            binding.lstat(pathModule.toNamespacedPath(base), false, undefined, ctx);
                            handleErrorFromBinding(ctx);
                            knownHard[base] = true;
                          }

                          // Walk down the path, swapping out linked path parts for their real
                          // values
                          // NB: p.length changes.
                          while (pos < p.length) {
                            // find the next part
                            const result = nextPart(p, pos);
                            previous = current;
                            if (result === -1) {
                              const last = p.slice(pos);
                              current += last;
                              base = previous + last;
                              pos = p.length;
                            } else {
                              current += p.slice(pos, result + 1);
                              base = previous + p.slice(pos, result);
                              pos = result + 1;
                            }

                            // Continue if not a symlink, break if a pipe/socket
                            if (knownHard[base] || (cache && cache.get(base) === base)) {
                              if (isFileType(statValues, S_IFIFO) ||
                                  isFileType(statValues, S_IFSOCK)) {
                                break;
                              }
                              continue;
                            }

                            let resolvedLink;
                            const maybeCachedResolved = cache && cache.get(base);
                            if (maybeCachedResolved) {
                              resolvedLink = maybeCachedResolved;
                            } else {
                              // Use stats array directly to avoid creating an fs.Stats instance just
                              // for our internal use.

                              const baseLong = pathModule.toNamespacedPath(base);
                              const ctx = { path: base };
                              const stats = binding.lstat(baseLong, false, undefined, ctx);
                              handleErrorFromBinding(ctx);

                              if (!isFileType(stats, S_IFLNK)) {
                                knownHard[base] = true;
                                if (cache) cache.set(base, base);
                                continue;
                              }

                              // Read the link if it wasn't read before
                              // dev/ino always return 0 on windows, so skip the check.
                              let linkTarget = null;
                              let id;
                              if (!isWindows) {
                                const dev = stats[0].toString(32);
                                const ino = stats[7].toString(32);
                                id = `${dev}:${ino}`;
                                if (seenLinks[id]) {
                                  linkTarget = seenLinks[id];
                                }
                              }
                              if (linkTarget === null) {
                                const ctx = { path: base };
                                binding.stat(baseLong, false, undefined, ctx);
                                handleErrorFromBinding(ctx);
                                linkTarget = binding.readlink(baseLong, undefined, undefined, ctx);
                                handleErrorFromBinding(ctx);
                              }
                              resolvedLink = pathModule.resolve(previous, linkTarget);

                              if (cache) cache.set(base, resolvedLink);
                              if (!isWindows) seenLinks[id] = linkTarget;
                            }

                            // Resolve the link, then start over
                            p = pathModule.resolve(resolvedLink, p.slice(pos));

                            // Skip over roots
                            current = base = splitRoot(p);
                            pos = current.length;

                            // On windows, check that the root exists. On unix there is no need.
                            if (isWindows && !knownHard[base]) {
                              const ctx = { path: base };
                              binding.lstat(pathModule.toNamespacedPath(base), false, undefined, ctx);
                              handleErrorFromBinding(ctx);
                              knownHard[base] = true;
                            }
                          }

                          if (cache) cache.set(original, p);
                          return encodeRealpathResult(p, options);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "rename": {
                    "value": function rename(oldPath, newPath, callback) {
                        var __native = function rename(oldPath, newPath, callback) {
                          callback = makeCallback(callback);
                          oldPath = getValidatedPath(oldPath, 'oldPath');
                          newPath = getValidatedPath(newPath, 'newPath');
                          const req = new FSReqCallback();
                          req.oncomplete = callback;
                          binding.rename(pathModule.toNamespacedPath(oldPath),
                                         pathModule.toNamespacedPath(newPath),
                                         req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "renameSync": {
                    "value": function renameSync(oldPath, newPath) {
                        var __native = function renameSync(oldPath, newPath) {
                          oldPath = getValidatedPath(oldPath, 'oldPath');
                          newPath = getValidatedPath(newPath, 'newPath');
                          const ctx = { path: oldPath, dest: newPath };
                          binding.rename(pathModule.toNamespacedPath(oldPath),
                                         pathModule.toNamespacedPath(newPath), undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "rmdir": {
                    "value": function rmdir(path, options, callback) {
                        var __native = function rmdir(path, options, callback) {
                          if (typeof options === 'function') {
                            callback = options;
                            options = undefined;
                          }

                          callback = makeCallback(callback);
                          path = pathModule.toNamespacedPath(getValidatedPath(path));
                          options = validateRmdirOptions(options);

                          if (options.recursive) {
                            lazyLoadRimraf();
                            return rimraf(path, options, callback);
                          }

                          const req = new FSReqCallback();
                          req.oncomplete = callback;
                          binding.rmdir(path, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "rmdirSync": {
                    "value": function rmdirSync(path, options) {
                        var __native = function rmdirSync(path, options) {
                          path = getValidatedPath(path);
                          options = validateRmdirOptions(options);

                          if (options.recursive) {
                            lazyLoadRimraf();
                            return rimrafSync(pathModule.toNamespacedPath(path), options);
                          }

                          const ctx = { path };
                          binding.rmdir(pathModule.toNamespacedPath(path), undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
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
                        /*
                        var __native = function symlink(target, path, type_, callback_) {
                          const type = (typeof type_ === 'string' ? type_ : null);
                          const callback = makeCallback(arguments[arguments.length - 1]);

                          target = getValidatedPath(target, 'target');
                          path = getValidatedPath(path);

                          const req = new FSReqCallback();
                          req.oncomplete = callback;

                          if (isWindows && type === null) {
                            let absoluteTarget;
                            try {
                              // Symlinks targets can be relative to the newly created path.
                              // Calculate absolute file name of the symlink target, and check
                              // if it is a directory. Ignore resolve error to keep symlink
                              // errors consistent between platforms if invalid path is
                              // provided.
                              absoluteTarget = pathModule.resolve(path, '..', target);
                            } catch { }
                            if (absoluteTarget !== undefined) {
                              stat(absoluteTarget, (err, stat) => {
                                const resolvedType = !err && stat.isDirectory() ? 'dir' : 'file';
                                const resolvedFlags = stringToSymlinkType(resolvedType);
                                binding.symlink(preprocessSymlinkDestination(target,
                                                                             resolvedType,
                                                                             path),
                                                pathModule.toNamespacedPath(path), resolvedFlags, req);
                              });
                              return;
                            }
                          }

                          const flags = stringToSymlinkType(type);
                          binding.symlink(preprocessSymlinkDestination(target, type, path),
                                          pathModule.toNamespacedPath(path), flags, req);
                        };
                        */
            },
                    "configurable": true,
                    "enumerable": true
                },
                "symlinkSync": {
                    "value": function symlinkSync(target, path, type) {
                        /*var __native = function symlinkSync(target, path, type) {
                          type = (typeof type === 'string' ? type : null);
                          if (isWindows && type === null) {
                            try {
                              const absoluteTarget = pathModule.resolve(path, '..', target);
                              if (statSync(absoluteTarget).isDirectory()) {
                                type = 'dir';
                              }
                            } catch { }
                          }
                          target = getValidatedPath(target, 'target');
                          path = getValidatedPath(path);
                          const flags = stringToSymlinkType(type);

                          const ctx = { path: target, dest: path };
                          binding.symlink(preprocessSymlinkDestination(target, type, path),
                                          pathModule.toNamespacedPath(path), flags, undefined, ctx);

                          handleErrorFromBinding(ctx);
                        };*/
            },
                    "configurable": true,
                    "enumerable": true
                },
                "truncate": {
                    "value": function truncate(path, len, callback) {
                        var __native = function truncate(path, len, callback) {
                          if (typeof path === 'number') {
                            showTruncateDeprecation();
                            return fs.ftruncate(path, len, callback);
                          }
                          if (typeof len === 'function') {
                            callback = len;
                            len = 0;
                          } else if (len === undefined) {
                            len = 0;
                          }

                          validateInteger(len, 'len');
                          callback = maybeCallback(callback);
                          fs.open(path, 'r+', (er, fd) => {
                            if (er) return callback(er);
                            const req = new FSReqCallback();
                            req.oncomplete = function oncomplete(er) {
                              fs.close(fd, (er2) => {
                                callback(er || er2);
                              });
                            };
                            binding.ftruncate(fd, len, req);
                          });
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "truncateSync": {
                    "value": function truncateSync(path, len) {
                        var __native = function truncateSync(path, len) {
                          if (typeof path === 'number') {
                            // legacy
                            showTruncateDeprecation();
                            return fs.ftruncateSync(path, len);
                          }
                          if (len === undefined) {
                            len = 0;
                          }
                          // Allow error to be thrown, but still close fd.
                          const fd = fs.openSync(path, 'r+');
                          let ret;

                          try {
                            ret = fs.ftruncateSync(fd, len);
                          } finally {
                            fs.closeSync(fd);
                          }
                          return ret;
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "unwatchFile": {
                    "value": function unwatchFile(filename, listener) {
                        var __native = function unwatchFile(filename, listener) {
                          filename = getValidatedPath(filename);
                          filename = pathModule.resolve(filename);
                          const stat = statWatchers.get(filename);

                          if (stat === undefined) return;

                          if (typeof listener === 'function') {
                            stat.removeListener('change', listener);
                          } else {
                            stat.removeAllListeners('change');
                          }

                          if (stat.listenerCount('change') === 0) {
                            stat.stop();
                            statWatchers.delete(filename);
                          }
                        };
            },
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
                        var __native = function utimes(path, atime, mtime, callback) {
                          callback = makeCallback(callback);
                          path = getValidatedPath(path);

                          const req = new FSReqCallback();
                          req.oncomplete = callback;
                          binding.utimes(pathModule.toNamespacedPath(path),
                                         toUnixTimestamp(atime),
                                         toUnixTimestamp(mtime),
                                         req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "utimesSync": {
                    "value": function utimesSync(path, atime, mtime) {
                        var __native = function utimesSync(path, atime, mtime) {
                          path = getValidatedPath(path);
                          const ctx = { path };
                          binding.utimes(pathModule.toNamespacedPath(path),
                                         toUnixTimestamp(atime), toUnixTimestamp(mtime),
                                         undefined, ctx);
                          handleErrorFromBinding(ctx);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "watch": {
                    "value": function watch(filename, options, listener) {
                        var __native = function watch(filename, options, listener) {
                          if (typeof options === 'function') {
                            listener = options;
                          }
                          options = getOptions(options, {});

                          // Don't make changes directly on options object
                          options = copyObject(options);

                          if (options.persistent === undefined) options.persistent = true;
                          if (options.recursive === undefined) options.recursive = false;

                          if (!watchers)
                            watchers = require('internal/fs/watchers');
                          const watcher = new watchers.FSWatcher();
                          watcher.start(filename,
                                        options.persistent,
                                        options.recursive,
                                        options.encoding);

                          if (listener) {
                            watcher.addListener('change', listener);
                          }

                          return watcher;
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "watchFile": {
                    "value": function watchFile(filename, options, listener) {
                        var __native = function watchFile(filename, options, listener) {
                          filename = getValidatedPath(filename);
                          filename = pathModule.resolve(filename);
                          let stat;

                          if (options === null || typeof options !== 'object') {
                            listener = options;
                            options = null;
                          }

                          options = {
                            // Poll interval in milliseconds. 5007 is what libev used to use. It's
                            // a little on the slow side but let's stick with it for now to keep
                            // behavioral changes to a minimum.
                            interval: 5007,
                            persistent: true,
                            ...options
                          };

                          if (typeof listener !== 'function') {
                            throw new ERR_INVALID_ARG_TYPE('listener', 'Function', listener);
                          }

                          stat = statWatchers.get(filename);

                          if (stat === undefined) {
                            if (!watchers)
                              watchers = require('internal/fs/watchers');
                            stat = new watchers.StatWatcher(options.bigint);
                            stat.start(filename, options.persistent, options.interval);
                            statWatchers.set(filename, stat);
                          }

                          stat.addListener('change', listener);
                          return stat;
                        };
            },
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
                        var __native = function write(fd, buffer, offset, length, position, callback) {
                          function wrapper(err, written) {
                            // Retain a reference to buffer so that it can't be GC'ed too soon.
                            callback(err, written || 0, buffer);
                          }

                          validateInt32(fd, 'fd', 0);

                          const req = new FSReqCallback();
                          req.oncomplete = wrapper;

                          if (isArrayBufferView(buffer)) {
                            callback = maybeCallback(callback || position || length || offset);
                            if (typeof offset !== 'number')
                              offset = 0;
                            if (typeof length !== 'number')
                              length = buffer.length - offset;
                            if (typeof position !== 'number')
                              position = null;
                            validateOffsetLengthWrite(offset, length, buffer.byteLength);
                            return binding.writeBuffer(fd, buffer, offset, length, position, req);
                          }

                          if (typeof buffer !== 'string')
                            buffer += '';
                          if (typeof position !== 'function') {
                            if (typeof offset === 'function') {
                              position = offset;
                              offset = null;
                            } else {
                              position = length;
                            }
                            length = 'utf8';
                          }
                          callback = maybeCallback(position);
                          return binding.writeString(fd, buffer, offset, length, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "writeSync": {
                    "value": function writeSync(fd, buffer, offset, length, position) {
                        var __native = function writeSync(fd, buffer, offset, length, position) {
                          validateInt32(fd, 'fd', 0);
                          const ctx = {};
                          let result;
                          if (isArrayBufferView(buffer)) {
                            if (position === undefined)
                              position = null;
                            if (typeof offset !== 'number')
                              offset = 0;
                            if (typeof length !== 'number')
                              length = buffer.byteLength - offset;
                            validateOffsetLengthWrite(offset, length, buffer.byteLength);
                            result = binding.writeBuffer(fd, buffer, offset, length, position,
                                                         undefined, ctx);
                          } else {
                            if (typeof buffer !== 'string')
                              buffer += '';
                            if (offset === undefined)
                              offset = null;
                            result = binding.writeString(fd, buffer, offset, length,
                                                         undefined, ctx);
                          }
                          handleErrorFromBinding(ctx);
                          return result;
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "writev": {
                    "value": function writev(fd, buffers, position, callback) {
                        var __native = function writev(fd, buffers, position, callback) {
                          function wrapper(err, written) {
                            callback(err, written || 0, buffers);
                          }

                          validateInt32(fd, 'fd', 0);
                          validateBufferArray(buffers);

                          const req = new FSReqCallback();
                          req.oncomplete = wrapper;

                          callback = maybeCallback(callback || position);

                          if (typeof position !== 'number')
                            position = null;

                          return binding.writeBuffers(fd, buffers, position, req);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "writevSync": {
                    "value": function writevSync(fd, buffers, position) {
                        var __native = function writevSync(fd, buffers, position) {
                          validateInt32(fd, 'fd', 0);
                          validateBufferArray(buffers);

                          const ctx = {};

                          if (typeof position !== 'number')
                            position = null;

                          const result = binding.writeBuffers(fd, buffers, position, undefined, ctx);

                          handleErrorFromBinding(ctx);
                          return result;
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "Dir": {
                    "value": function Dir(handle, path, options) {
                        var __native = class Dir {
                          constructor(handle, path, options) {
                            if (handle == null) throw new ERR_MISSING_ARGS('handle');
                            this[kDirHandle] = handle;
                            this[kDirBufferedEntries] = [];
                            this[kDirPath] = path;
                            this[kDirClosed] = false;

                            this[kDirOptions] = getOptions(options, {
                              encoding: 'utf8'
                            });

                            this[kDirReadPromisified] =
                                internalUtil.promisify(this[kDirReadImpl]).bind(this, false);
                            this[kDirClosePromisified] = internalUtil.promisify(this.close).bind(this);
                          }

                          get path() {
                            return this[kDirPath];
                          }

                          read(callback) {
                            return this[kDirReadImpl](true, callback);
                          }

                          [kDirReadImpl](maybeSync, callback) {
                            if (this[kDirClosed] === true) {
                              throw new ERR_DIR_CLOSED();
                            }

                            if (callback === undefined) {
                              return this[kDirReadPromisified]();
                            } else if (typeof callback !== 'function') {
                              throw new ERR_INVALID_CALLBACK(callback);
                            }

                            if (this[kDirBufferedEntries].length > 0) {
                              const [ name, type ] = this[kDirBufferedEntries].splice(0, 2);
                              if (maybeSync)
                                process.nextTick(getDirent, this[kDirPath], name, type, callback);
                              else
                                getDirent(this[kDirPath], name, type, callback);
                              return;
                            }

                            const req = new FSReqCallback();
                            req.oncomplete = (err, result) => {
                              if (err || result === null) {
                                return callback(err, result);
                              }

                              this[kDirBufferedEntries] = result.slice(2);
                              getDirent(this[kDirPath], result[0], result[1], callback);
                            };

                            this[kDirHandle].read(
                              this[kDirOptions].encoding,
                              req
                            );
                          }

                          readSync(options) {
                            if (this[kDirClosed] === true) {
                              throw new ERR_DIR_CLOSED();
                            }

                            if (this[kDirBufferedEntries].length > 0) {
                              const [ name, type ] = this[kDirBufferedEntries].splice(0, 2);
                              return getDirent(this[kDirPath], name, type);
                            }

                            const ctx = { path: this[kDirPath] };
                            const result = this[kDirHandle].read(
                              this[kDirOptions].encoding,
                              undefined,
                              ctx
                            );
                            handleErrorFromBinding(ctx);

                            if (result === null) {
                              return result;
                            }

                            this[kDirBufferedEntries] = result.slice(2);
                            return getDirent(this[kDirPath], result[0], result[1]);
                          }

                          close(callback) {
                            if (this[kDirClosed] === true) {
                              throw new ERR_DIR_CLOSED();
                            }

                            if (callback === undefined) {
                              return this[kDirClosePromisified]();
                            } else if (typeof callback !== 'function') {
                              throw new ERR_INVALID_CALLBACK(callback);
                            }

                            this[kDirClosed] = true;
                            const req = new FSReqCallback();
                            req.oncomplete = callback;
                            this[kDirHandle].close(req);
                          }

                          closeSync() {
                            if (this[kDirClosed] === true) {
                              throw new ERR_DIR_CLOSED();
                            }

                            this[kDirClosed] = true;
                            const ctx = { path: this[kDirPath] };
                            const result = this[kDirHandle].close(undefined, ctx);
                            handleErrorFromBinding(ctx);
                            return result;
                          }

                          async* entries() {
                            try {
                              while (true) {
                                const result = await this[kDirReadPromisified]();
                                if (result === null) {
                                  break;
                                }
                                yield result;
                              }
                            } finally {
                              await this[kDirClosePromisified]();
                            }
                          }
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "Dirent": {
                    "value": function Dirent(name, type) {
                        var __native = class Dirent {
                          constructor(name, type) {
                            this.name = name;
                            this[kType] = type;
                          }

                          isDirectory() {
                            return this[kType] === UV_DIRENT_DIR;
                          }

                          isFile() {
                            return this[kType] === UV_DIRENT_FILE;
                          }

                          isBlockDevice() {
                            return this[kType] === UV_DIRENT_BLOCK;
                          }

                          isCharacterDevice() {
                            return this[kType] === UV_DIRENT_CHAR;
                          }

                          isSymbolicLink() {
                            return this[kType] === UV_DIRENT_LINK;
                          }

                          isFIFO() {
                            return this[kType] === UV_DIRENT_FIFO;
                          }

                          isSocket() {
                            return this[kType] === UV_DIRENT_SOCKET;
                          }
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "Stats": {
                    "value": function Stats(dev, mode, nlink, uid, gid, rdev, blksize,
                           ino, size, blocks,
                           atimeMs, mtimeMs, ctimeMs, birthtimeMs) {
                        var __native = function Stats(dev, mode, nlink, uid, gid, rdev, blksize,
                                       ino, size, blocks,
                                       atimeMs, mtimeMs, ctimeMs, birthtimeMs) {
                          StatsBase.call(this, dev, mode, nlink, uid, gid, rdev, blksize,
                                         ino, size, blocks);
                          this.atimeMs = atimeMs;
                          this.mtimeMs = mtimeMs;
                          this.ctimeMs = ctimeMs;
                          this.birthtimeMs = birthtimeMs;
                          this.atime = dateFromMs(atimeMs);
                          this.mtime = dateFromMs(mtimeMs);
                          this.ctime = dateFromMs(ctimeMs);
                          this.birthtime = dateFromMs(birthtimeMs);
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "ReadStream": {
                    "value": function ReadStream(path, options) {
                        var __native = function ReadStream(path, options) {
                          if (!(this instanceof ReadStream))
                            return new ReadStream(path, options);

                          // A little bit bigger buffer and water marks by default
                          options = copyObject(getOptions(options, {}));
                          if (options.highWaterMark === undefined)
                            options.highWaterMark = 64 * 1024;

                          // For backwards compat do not emit close on destroy.
                          if (options.emitClose === undefined) {
                            options.emitClose = false;
                          }

                          Readable.call(this, options);

                          // Path will be ignored when fd is specified, so it can be falsy
                          this.path = toPathIfFileURL(path);
                          this.fd = options.fd === undefined ? null : options.fd;
                          this.flags = options.flags === undefined ? 'r' : options.flags;
                          this.mode = options.mode === undefined ? 0o666 : options.mode;

                          this.start = options.start;
                          this.end = options.end;
                          this.autoClose = options.autoClose === undefined ? true : options.autoClose;
                          this.pos = undefined;
                          this.bytesRead = 0;
                          this.closed = false;

                          if (this.start !== undefined) {
                            checkPosition(this.start, 'start');

                            this.pos = this.start;
                          }

                          if (this.end === undefined) {
                            this.end = Infinity;
                          } else if (this.end !== Infinity) {
                            checkPosition(this.end, 'end');

                            if (this.start !== undefined && this.start > this.end) {
                              throw new ERR_OUT_OF_RANGE(
                                'start',
                                `<= "end" (here: ${this.end})`,
                                this.start
                              );
                            }
                          }

                          if (typeof this.fd !== 'number')
                            this.open();

                          this.on('end', function() {
                            if (this.autoClose) {
                              this.destroy();
                            }
                          });
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "WriteStream": {
                    "value": function WriteStream(path, options) {
                        var __native = function WriteStream(path, options) {
                          if (!(this instanceof WriteStream))
                            return new WriteStream(path, options);

                          options = copyObject(getOptions(options, {}));

                          // Only buffers are supported.
                          options.decodeStrings = true;

                          // For backwards compat do not emit close on destroy.
                          if (options.emitClose === undefined) {
                            options.emitClose = false;
                          }

                          Writable.call(this, options);

                          // Path will be ignored when fd is specified, so it can be falsy
                          this.path = toPathIfFileURL(path);
                          this.fd = options.fd === undefined ? null : options.fd;
                          this.flags = options.flags === undefined ? 'w' : options.flags;
                          this.mode = options.mode === undefined ? 0o666 : options.mode;

                          this.start = options.start;
                          this.autoClose = options.autoClose === undefined ? true : !!options.autoClose;
                          this.pos = undefined;
                          this.bytesWritten = 0;
                          this.closed = false;

                          if (this.start !== undefined) {
                            checkPosition(this.start, 'start');

                            this.pos = this.start;
                          }

                          if (options.encoding)
                            this.setDefaultEncoding(options.encoding);

                          if (typeof this.fd !== 'number')
                            this.open();
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "FileReadStream": {
                    "value": function FileReadStream(path, options) {
                        var __native = function ReadStream(path, options) {
                          if (!(this instanceof ReadStream))
                            return new ReadStream(path, options);

                          // A little bit bigger buffer and water marks by default
                          options = copyObject(getOptions(options, {}));
                          if (options.highWaterMark === undefined)
                            options.highWaterMark = 64 * 1024;

                          // For backwards compat do not emit close on destroy.
                          if (options.emitClose === undefined) {
                            options.emitClose = false;
                          }

                          Readable.call(this, options);

                          // Path will be ignored when fd is specified, so it can be falsy
                          this.path = toPathIfFileURL(path);
                          this.fd = options.fd === undefined ? null : options.fd;
                          this.flags = options.flags === undefined ? 'r' : options.flags;
                          this.mode = options.mode === undefined ? 0o666 : options.mode;

                          this.start = options.start;
                          this.end = options.end;
                          this.autoClose = options.autoClose === undefined ? true : options.autoClose;
                          this.pos = undefined;
                          this.bytesRead = 0;
                          this.closed = false;

                          if (this.start !== undefined) {
                            checkPosition(this.start, 'start');

                            this.pos = this.start;
                          }

                          if (this.end === undefined) {
                            this.end = Infinity;
                          } else if (this.end !== Infinity) {
                            checkPosition(this.end, 'end');

                            if (this.start !== undefined && this.start > this.end) {
                              throw new ERR_OUT_OF_RANGE(
                                'start',
                                `<= "end" (here: ${this.end})`,
                                this.start
                              );
                            }
                          }

                          if (typeof this.fd !== 'number')
                            this.open();

                          this.on('end', function() {
                            if (this.autoClose) {
                              this.destroy();
                            }
                          });
                        };
            },
                    "configurable": true,
                    "enumerable": true
                },
                "FileWriteStream": {
                    "value": function FileWriteStream(path, options) {
                        var __native = function WriteStream(path, options) {
                          if (!(this instanceof WriteStream))
                            return new WriteStream(path, options);

                          options = copyObject(getOptions(options, {}));

                          // Only buffers are supported.
                          options.decodeStrings = true;

                          // For backwards compat do not emit close on destroy.
                          if (options.emitClose === undefined) {
                            options.emitClose = false;
                          }

                          Writable.call(this, options);

                          // Path will be ignored when fd is specified, so it can be falsy
                          this.path = toPathIfFileURL(path);
                          this.fd = options.fd === undefined ? null : options.fd;
                          this.flags = options.flags === undefined ? 'w' : options.flags;
                          this.mode = options.mode === undefined ? 0o666 : options.mode;

                          this.start = options.start;
                          this.autoClose = options.autoClose === undefined ? true : !!options.autoClose;
                          this.pos = undefined;
                          this.bytesWritten = 0;
                          this.closed = false;

                          if (this.start !== undefined) {
                            checkPosition(this.start, 'start');

                            this.pos = this.start;
                          }

                          if (options.encoding)
                            this.setDefaultEncoding(options.encoding);

                          if (typeof this.fd !== 'number')
                            this.open();
                        };
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
                        "value": function access(path, mode = F_OK) {
                        var __native = async function access(path, mode = F_OK) {
                          path = getValidatedPath(path);

                          mode = mode | 0;
                          return binding.access(pathModule.toNamespacedPath(path), mode,
                                                kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "copyFile": {
                        "value": function copyFile(src, dest, flags) {
                        var __native = async function copyFile(src, dest, flags) {
                          src = getValidatedPath(src, 'src');
                          dest = getValidatedPath(dest, 'dest');
                          flags = flags | 0;
                          return binding.copyFile(pathModule.toNamespacedPath(src),
                                                  pathModule.toNamespacedPath(dest),
                                                  flags, kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "open": {
                        "value": function open(path, flags, mode) {
                        var __native = async function open(path, flags, mode) {
                          path = getValidatedPath(path);
                          if (arguments.length < 2) flags = 'r';
                          const flagsNumber = stringToFlags(flags);
                          mode = parseMode(mode, 'mode', 0o666);
                          return new FileHandle(
                            await binding.openFileHandle(pathModule.toNamespacedPath(path),
                                                         flagsNumber, mode, kUsePromises));
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "opendir": {
                        "value": function opendir(...args) {
                        var __native = function fn(...args) {
                            return new Promise((resolve, reject) => {
                              original.call(this, ...args, (err, ...values) => {
                                if (err) {
                                  return reject(err);
                                }
                                if (argumentNames !== undefined && values.length > 1) {
                                  const obj = {};
                                  for (let i = 0; i < argumentNames.length; i++)
                                    obj[argumentNames[i]] = values[i];
                                  resolve(obj);
                                } else {
                                  resolve(values[0]);
                                }
                              });
                            });
                          };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "rename": {
                        "value": function rename(oldPath, newPath) {
                        var __native = async function rename(oldPath, newPath) {
                          oldPath = getValidatedPath(oldPath, 'oldPath');
                          newPath = getValidatedPath(newPath, 'newPath');
                          return binding.rename(pathModule.toNamespacedPath(oldPath),
                                                pathModule.toNamespacedPath(newPath),
                                                kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "truncate": {
                        "value": function truncate(path, len = 0) {
                        var __native = async function truncate(path, len = 0) {
                          return ftruncate(await open(path, 'r+'), len);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "rmdir": {
                        "value": function rmdir(path, options) {
                        var __native = async function rmdir(path, options) {
                          path = pathModule.toNamespacedPath(getValidatedPath(path));
                          options = validateRmdirOptions(options);

                          if (options.recursive) {
                            return rimrafPromises(path, options);
                          }

                          return binding.rmdir(path, kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "mkdir": {
                        "value": function mkdir(path, options) {
                        var __native = async function mkdir(path, options) {
                          if (typeof options === 'number' || typeof options === 'string') {
                            options = { mode: options };
                          }
                          const {
                            recursive = false,
                            mode = 0o777
                          } = options || {};
                          path = getValidatedPath(path);
                          if (typeof recursive !== 'boolean')
                            throw new ERR_INVALID_ARG_TYPE('recursive', 'boolean', recursive);

                          return binding.mkdir(pathModule.toNamespacedPath(path),
                                               parseMode(mode, 'mode', 0o777), recursive,
                                               kUsePromises);
                        };
            },
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
                        var __native = async function readlink(path, options) {
                          options = getOptions(options, {});
                          path = getValidatedPath(path, 'oldPath');
                          return binding.readlink(pathModule.toNamespacedPath(path),
                                                  options.encoding, kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "symlink": {
                        "value": function symlink(target, path, type_) {
                        var __native = async function symlink(target, path, type_) {
                          const type = (typeof type_ === 'string' ? type_ : null);
                          target = getValidatedPath(target, 'target');
                          path = getValidatedPath(path);
                          return binding.symlink(preprocessSymlinkDestination(target, type, path),
                                                 pathModule.toNamespacedPath(path),
                                                 stringToSymlinkType(type),
                                                 kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "lstat": {
                        "value": function lstat(path, options = { bigint: false }) {
                        var __native = async function lstat(path, options = { bigint: false }) {
                          path = getValidatedPath(path);
                          const result = await binding.lstat(pathModule.toNamespacedPath(path),
                                                             options.bigint, kUsePromises);
                          return getStatsFromBinding(result);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "stat": {
                        "value": function stat(path, options = { bigint: false }) {
                        var __native = async function stat(path, options = { bigint: false }) {
                          path = getValidatedPath(path);
                          const result = await binding.stat(pathModule.toNamespacedPath(path),
                                                            options.bigint, kUsePromises);
                          return getStatsFromBinding(result);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "link": {
                        "value": function link(existingPath, newPath) {
                        var __native = async function link(existingPath, newPath) {
                          existingPath = getValidatedPath(existingPath, 'existingPath');
                          newPath = getValidatedPath(newPath, 'newPath');
                          return binding.link(pathModule.toNamespacedPath(existingPath),
                                              pathModule.toNamespacedPath(newPath),
                                              kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "unlink": {
                        "value": function unlink(path) {
                        var __native = async function unlink(path) {
                          path = getValidatedPath(path);
                          return binding.unlink(pathModule.toNamespacedPath(path), kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "chmod": {
                        "value": function chmod(path, mode) {
                        var __native = async function chmod(path, mode) {
                          path = getValidatedPath(path);
                          mode = parseMode(mode, 'mode');
                          return binding.chmod(pathModule.toNamespacedPath(path), mode, kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "lchmod": {
                        "value": function lchmod(path, mode) {
                        var __native = async function lchmod(path, mode) {
                          if (O_SYMLINK === undefined)
                            throw new ERR_METHOD_NOT_IMPLEMENTED('lchmod()');

                          const fd = await open(path, O_WRONLY | O_SYMLINK);
                          return fchmod(fd, mode).finally(fd.close.bind(fd));
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "lchown": {
                        "value": function lchown(path, uid, gid) {
                        var __native = async function lchown(path, uid, gid) {
                          path = getValidatedPath(path);
                          validateUint32(uid, 'uid');
                          validateUint32(gid, 'gid');
                          return binding.lchown(pathModule.toNamespacedPath(path),
                                                uid, gid, kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "chown": {
                        "value": function chown(path, uid, gid) {
                        var __native = async function chown(path, uid, gid) {
                          path = getValidatedPath(path);
                          validateUint32(uid, 'uid');
                          validateUint32(gid, 'gid');
                          return binding.chown(pathModule.toNamespacedPath(path),
                                               uid, gid, kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "utimes": {
                        "value": function utimes(path, atime, mtime) {
                        var __native = async function utimes(path, atime, mtime) {
                          path = getValidatedPath(path);
                          return binding.utimes(pathModule.toNamespacedPath(path),
                                                toUnixTimestamp(atime),
                                                toUnixTimestamp(mtime),
                                                kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "realpath": {
                        "value": function realpath(path, options) {
                        var __native = async function realpath(path, options) {
                          options = getOptions(options, {});
                          path = getValidatedPath(path);
                          return binding.realpath(path, options.encoding, kUsePromises);
                        };
            },
                        "configurable": true,
                        "enumerable": true
                    },
                    "mkdtemp": {
                        "value": function mkdtemp(prefix, options) {
                        var __native = async function mkdtemp(prefix, options) {
                          options = getOptions(options, {});
                          if (!prefix || typeof prefix !== 'string') {
                            throw new ERR_INVALID_ARG_TYPE('prefix', 'string', prefix);
                          }
                          nullCheck(prefix);
                          warnOnNonPortableTemplate(prefix);
                          return binding.mkdtemp(`${prefix}XXXXXX`, options.encoding, kUsePromises);
                        };
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
                        var __native = async function appendFile(path, data, options) {
                          options = getOptions(options, { encoding: 'utf8', mode: 0o666, flag: 'a' });
                          options = copyObject(options);
                          options.flag = options.flag || 'a';
                          return writeFile(path, data, options);
                        };
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

            tests(function(){
                console.log("tests passed");
                cb({fs:Object.defineProperties({},fs),process:fs_process,wrapped:wrapped});
            });

        });

    }).catch(function(e){ throw(e);});


}

function zipWrap(zip,cb){
    var

    trailing_slashes_re=/(\/*)$/g,
    double_slash_re=/(\/\/+)/g,
    double_dot_parent_re=/(?<=\/)([^/]*\/\.\.\/)(?=)/;


    function true_path_from_path(path) {
        // remove traiing backslash from path
        path = path.replace(trailing_slashes_re,'')
        // remove double slashes ie // in path
                   .replace(double_slash_re,'');

        if (["/",""].indexOf(path)>=0) return "/";

        return path[0]==="/" ? path : "/"+path;
    }

    function true_path_from_relative_path(cwd,path) {
        if ([".","",cwd].indexOf(path)>=0) {
            path  = cwd;
        } else {
            if (!path.startsWith("/")) {
                if (path.startsWith("./")) {
                    path = cwd+path.substr(2);
                } else {
                    path = cwd+path;
                }
            }
        }

        // remove traiing backslash from path
        path = path.replace(trailing_slashes_re,'')
        // remove double slashes ie // in path
                   .replace(double_slash_re,'')
        // resolve the first .. parent dir fixup (if present)
                   .replace(double_dot_parent_re,'');

        // resolve any more parent dir fixups
        while (path.search(double_dot_parent_re)>=0)
            path =path.replace(double_dot_parent_re,'');


        return path === ""  ? "/" : path;

    }

    function ab2str(buf) {
      return String.fromCharCode.apply(null, new Uint16Array(buf));
    }

    function str2ab(str) {
      var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
      var bufView = new Uint16Array(buf);
      for (var i=0, strLen=str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }

    var wrap = {};

    // since we are "managing" the zip, we can maintain our own directory
    // to speedup and facilitate watching etc
    var zip_fns=[];// what the zip object calls the file
    var listing=[];// the file name in our virtual fs (under "/")
    var directory = {};
    var watchers  = {};
    var cwd = "/" ;
    var cwd_view  = wrap;

    var properties;

    function utf8Encoding(str) {return str;}
    var bufferEncoding = typeof process==='object'&&typeof Buffer==='function'? function bufferEncoding(str){return Buffer.from(str);} : str2ab;

    reread();

    properties = getProperties();

    Object.defineProperties(wrap,properties);

    if (typeof cb==='function') {
        var

        file_list = wrap.get_files(true),
        bytes=0,
        loading = file_list.map(function(fn){
            console.log({loading:fn});
            wrap.string[fn](function(err,data){

            console.log(err?{error:err.messsage,fn:fn}:{loaded:fn,bytes:data.length});

            var ix=loading.indexOf(fn);
            loading.splice(ix,1);
            bytes += err ? 0 : data.length;
            if (loading.length===0) {
                return cb(wrap,bytes);
            }
        });
            return fn;
        });
        console.log({decompressing:file_list});
    }

    return wrap;

    function reread(){
        zip_fns.splice.apply(zip_fns,[0,zip_fns.length].concat(Object.keys(zip.files)));// what the zip object calls the file
        listing.splice.apply(listing,[0,listing.length].concat(zip_fns.map(true_path_from_path)));// the file name in our virtual fs (under "/")


        // build zip_fns to listing map (lives in 'directory')
        Object.keys(directory).forEach(function(fn){delete directory[fn];});
        zip_fns.forEach(function(zip_fn,ix){
           directory[ listing[ix] ]=zip_fn;
        });

        // helper function fetch the internal object for a file, from either true_path or zip_fn
        // eg get_object("/myfile.js")===get_object("myfile.js")
        // eg get_object("dir/mysubdir") === get_object("/dir/mysubdir") === get_object("dir/mysubdir/")===get_object("/dir/mysubdir/")
    }

    function get_object(path) {
        // since zip.files [ directory[true_path] ] ---> object
        // and zip.files [ zip_fn ] ---> object
        // and true_path_from_path(zip_fn) ---> true_path
        // and true_path_from_path(true_path) ---> true_path
        // we can assume the following
        return zip.files[ directory[ true_path_from_path(path) ] ];
    }

    function file_proxy(dtype,opts) {
        var
        cache_name = "__cache_"+dtype,
        get_cache = function (obj) {
            // first try type asked for
            if (obj[cache_name]) return obj[cache_name];

            // now see if we can convert from another type
            if (obj.__cache_string && dtype==="arraybuffer") {
                obj.__cache_arraybuffer = str2ab(obj.__cache_string);
                return obj.__cache_arraybuffer;
            }
            if (obj.__cache_arraybuffer && dtype==="string") {
                obj.__cache_string = ab2str(obj.__cache_arraybuffer);
                return obj.__cache_string;
            }
        },
        set_cache = function (obj,data) {
            // when setting, clear all cached types first, so we don't have legacy issues
            delete obj.__cache_string;
            delete obj.__cache_arraybuffer;
            obj[cache_name]=data;
            return data;
        };
        return {
                   get : function (x,path) {
                       var errpath=path;
                       path = path.replace(/\$_/g,'.').replace(/\$/g,'/');
                       var
                       true_path = true_path_from_relative_path(cwd,path),
                       zip_fn = directory[true_path],
                       obj=zip.files[zip_fn];
                       if (obj&&obj.async) {
                            if (obj.dir) {
                                throw new Error("not a file:"+errpath+" ( "+path+" ) is a directory");
                            } else {
                                var try_cache=function() {
                                    var data = get_cache(obj);
                                    if (data) {
                                        // we don't need to decompress
                                        // because we either just read or wrote it
                                        // note whilst the zib object also maintains a cache on write, it does
                                        // not do so on read.
                                        // also, when writing, it keeps reference to same object
                                        // so there is no memory overhead by caching it twice.
                                        return function (cb) {
                                            return cb?cb(null,data):data;
                                        };
                                    }
                                    return false;
                                };

                                var cacheAvail = try_cache();
                                if (cacheAvail) return cacheAvail;

                                if (obj.__pending) {
                                    return function (cb) {
                                        return not_ready_yet(cb);
                                    };
                                }

                                obj.__pending = [];

                                var
                                resolve = function (data){
                                    set_cache(obj,data);
                                    if (obj.__pending) {
                                        obj.__pending.forEach(function(cb){
                                            cb(null,data);
                                        });
                                        obj.__pending.splice(0,obj.__pending.length);
                                        delete obj.__pending;
                                    }
                                },
                                reject  = function(newErr) {
                                    if (obj.__pending) {
                                        obj.__pending.forEach(function(cb){
                                            cb(newErr);
                                        });
                                        obj.__pending.splice(0,obj.__pending.length);
                                        delete obj.__pending;
                                    }
                                };
                                obj.async(dtype).then(resolve).catch(reject);

                                return not_ready_yet;




                            }
                       } else {
                           // create the error object early
                           var err = new Error("not found:"+errpath+" ( "+path+" )");
                           return function (cb) {
                              if (typeof cb==='function') {
                                  return cb(err);
                              } else {
                                  throw err;
                              }
                           };
                       }

                       function not_ready_yet(cb) {
                           var cacheAvail = try_cache();
                           if (cacheAvail) return cacheAvail(cb);

                           if (cb) {
                               if (obj.__pending) {
                                   return obj.__pending.push(cb);
                               }
                               cb (new Error("internal read error"));
                           } else {
                               if (obj.__pending) {
                                   err = new Error(path+" not ready. retry later");
                                   err.data=null;
                                   err.busy=true;
                                   err.code="ENOTREADY";
                                   obj.__pending.push(function(data){
                                       err.data=data;
                                       err.busy=false;
                                   });
                                   throw err;
                               } else {
                                   throw new Error("internal read error");
                               }
                           }
                       }
                   },
                   set : function (x,path,data) {
                       var errpath=path;
                       path = path.replace(/\$_/g,'.').replace(/\$/g,'/');

                       var
                       watch_messages,
                       true_path = true_path_from_relative_path(cwd,path),
                       zip_fn = directory[true_path],
                       obj=zip.files[zip_fn];

                       if (obj&&obj.async) {
                            //  updating an existing file
                            watch_messages=["change"];
                       } else {
                           // creating a new file
                           zip_fn = true_path.substr(1);
                           directory[true_path]=zip_fn;
                           zip_fns.push(zip_fn);
                           listing.push(true_path);
                           watch_message=["srename","change"];
                       }

                       zip.file(zip_fn,data,opts);
                       set_cache(zip.files[zip_fn],data);

                       var
                       basename = nodePath.basename(true_path),
                       notify = function(watch_path){
                           if(watchers[watch_path]){
                              watch_messages.forEach(function(watch_message){
                                  watchers[watch_path].forEach(
                                      function(fn){fn(watch_message,fn.encode(basename));}
                                  );
                              });
                           }
                       };

                       notify(true_path);
                       notify(nodePath.dirname(true_path));

                       return true;
                   }
               };
    }

    function isFile( zip_fn ) {
        return !get_object(zip_fn).dir;
    }

    function isDir( zip_fn ) {
        return get_object(zip_fn).dir;
    }

    function isUnique ( str, ix, arr) {
        return arr.indexOf(str)===ix;
    }

    function addWatcher (path,options,listener) {
        if (typeof path !=='string') {
            if (typeof path !=='object' &&
                typeof path.constructor.name==='string' &&
                       path.constructor.name.endsWith('Buffer') ) {
                path = path.toString('utf8');
            } else {
                throw new Error ("expecting a string or buffer for path");
            }
        }


        if (typeof options==='function' ) {
            listener = options;
            options = {};
        }

        if (typeof listener !=='function') {


        }

        if (options.encoding) {
            listener.encode=['utf8','utf-8'].indexOf(options.encoding)>=0?utf8Encoding:bufferEncoding;
        } else {
            listener.encode = utf8Encoding;
        }

        var
        true_path = true_path_from_relative_path(cwd,path),
        listeners = [],
        notify_listeners = function(ev,file){
             listeners.forEach(function(fn){
                 fn(ev,file);
             });
        },
        watcher = {
        },
        watch_stack = watchers[true_path] || (watchers[true_path]=[]);

        watch_stack.push(notify_listeners);

        return Object.defineProperties(watcher,{
            close : {
                value : function () {
                    var index = watch_stack.indexOf(notify_listeners);
                    if (index>=0) {
                        watch_stack.splice(index,1);
                        if (watch_stack.length===0) {
                            delete watchers[true_path];
                        }
                    }
                }
            },
            addListener : {
                value: function (listener) {
                    if (typeof listener !=='function') {
                        throw new Error("invalid arg type");
                    }
                    listeners.add(listener);
                }
            },
            removeListener : {
                value : function (listener) {
                    var ix = listeners.indexOf(listener);
                    if (ix>=0) {
                        listeners.splice(ix,1);
                    }
                }
            }
        });
    }

    function filtered_always   (file)  {return true;}
    function filtered_root_path (file) {return file.substr(1).indexOf("/")<0;}
    function filtered_top_root_object (obj) {
        return filtered_root_path(true_path_from_path(obj.name).substr(1));
    }

    function filtered_top_path (file)  {return file.indexOf("/")<0;}

    function filtered_top_object_under(under) {
        var mine_from = true_path_from_path(under).length+1;
        return function filtered_top_object (obj) {return filtered_top_path(true_path_from_path(obj.name).substr(mine_from));};
    }

    function view_chdir(path,recursive) {

        var true_path =true_path_from_path(path);

        if (true_path==="/") return wrap;

        if (!zip.files[ directory[ true_path ] ]) {
            throw new Error (path+" not found");
        }

        var
        view={},
        mine_from =true_path.length+1,
        GET=function(what){return properties[what].get(filtered_always);};


        function make_mine (path) {

            if (path.startsWith("..")) return "///badpath!";

            return path.replace(/^(\.|\/)*/,true_path+"/");

        }

        function my_part (path) {
            return path.substr(mine_from);
        }

        function is_my_true_path(fn) {
            return fn.startsWith(true_path+"/");
        }

        var

        filtered        = !!recursive ? filtered_always : filtered_top_path,
        filtered_object = !!recursive ? filtered_always : filtered_top_object_under(true_path);


        function is_my_object(obj) {
            return true_path_from_path(obj.name).startsWith(true_path+"/");
        }

        function listing_view (filterMode) {
            return listing.filter(is_my_true_path).map(my_part).filter(filterMode||filtered);
        }

        function files_view (filterMode) {
            return GET("files").filter(is_my_true_path).map(my_part).filter(filterMode||filtered);
        }

        function dirs_view (filterMode) {
            return GET("dirs").filter(is_my_true_path).map(my_part).filter(filterMode||filtered);
        }

        function listing_objects_view () {
            return GET("listing_objects").filter(is_my_object).filter(filtered_object);
        }

        function files_objects_view () {
            return GET("files_objects").filter(is_my_object).filter(filtered_object);
        }

        function dirs_objects_view () {
            return GET("dirs_objects").filter(is_my_object).filter(filtered_object);
        }

        function file_proxy_view(name) {
            var parent_proxy = properties[name].value;
            return new Proxy({},{
                get : function (x,path) {
                    return parent_proxy[ make_mine(path) ];
                },
                set : function (x,path,data) {
                    parent_proxy[ make_mine(path) ]=data;
                    return true;
                }
            });

        }

        console.log({new_view:true_path,dirs:dirs_view()});


        return Object.defineProperties(view,addRecursiveListings({
             get_listing     : { value : function(recursive){ return ; } },
             listing         : { get : listing_view },
             files           : { get : files_view },
             dirs            : { get : dirs_view },
             listing_objects : { get : listing_objects_view },
             files_objects   : { get : files_objects_view },
             dirs_objects    : { get : dirs_objects_view },

             mkdir           : { value : function mkdir (path) {
                    wrap.mkdir(true_path_from_relative_path(true_path,path));
                }
             },

             string          : { value : file_proxy_view("string")},
             arraybuffer     : { value : file_proxy_view("arraybuffer")},
             object          : { value : function subview_object (path) {
                                             return zip.file( make_mine(path) );
                                         }},
             addWatcher      : { value : function addWatcher (path,options,listener)  {
                                     return addWatcher (make_mine(path),options,listener);
             }},
             view_dir        : { value : function subview_chdir(path) {
                                     return view_chdir(make_mine(path));
                                 }
             },
             chdir           : {
                 value : function chdir(path) {
                     wrap.chdir(true_path_from_relative_path(true_path,path));
                 }
             },
             reread            : {
                 value : reread
             },
             toJSON          : {
                 value : function() {
                     var
                     j = {},
                     dirs=view.dirs,
                     files=view.files;

                     dirs.forEach(function(dir){
                         j[dir]= view.view_dir(dir).toJSON();
                     });
                     files.forEach(function(fn,ix){
                         j[fn]={
                             date    : view.files_objects[ix].date,
                             content : view.string[fn]()
                         };
                     });
                     return j;
                 }
             },
         }));


    }

    function addRecursiveListings(props) {
        ["listing","files","dirs"].forEach(function(cmd){
            props["get_"+cmd] = {
                value : function(recursive) {
                    return props[cmd].get(recursive?filtered_always:undefined);
                },
                enumerable:false,
                configurable:true,
            };
            props[cmd].enumerable=true;
            props[cmd].configurable=true;
        });

        return props;
    }

    function getProperties() {


        var

        listing_true_path_filter = filtered_root_path,
        listing_object_filter    = filtered_top_root_object;

        return addRecursiveListings({

            recursive       : {
                get : function () {
                    return listing_true_path_filter === filtered_always;
                },
                set : function (value) {
                    listing_true_path_filter = value ? filtered_always : filtered_root_path;
                    listing_object_filter    = value ? filtered_always : filtered_top_root_object;
                }
            },

            listing         : {
                get : function (filtermode) {
                    return listing.filter(filtermode||listing_true_path_filter);
                },
            },// filesnames in the zip, adjusted to be based under /
            files           : {
                get : function (filtermode) {
                    return listing.filter(filtermode||listing_true_path_filter)
                       .filter(isFile);
                },
            },// listing with dirs removed
            dirs            : {
                get : function (filtermode) {
                    return listing.filter(filtermode||listing_true_path_filter)
                        .filter(isDir);

                },
            },// listing with files removed

            mkdir           : { value : function mkdir (path) {

                   var true_path = true_path_from_relative_path(cwd,path);
                   if ( zip.files [ directory [ true_path ] ] ) {
                       throw new Error("can't mkdir "+path + "already exists" +

                           (zip.files [ directory [ true_path ] ].dir?"":" (a file)")
                       );
                   }
                   var zip_fn=true_path.substr(1);
                   zip.folder(zip_fn);
                   reread();


               }
            },

            listing_objects : {
                get : function (filtermode) {
                    return listing.filter(filtermode||listing_true_path_filter)
                        .map(get_object);
                },
            },// array of zipObjects, index mapped to listing
            files_objects   : {
                get : function (filtermode) {
                    return listing.filter(filtermode||listing_true_path_filter)
                       .filter(isFile)
                         .map(get_object);
                },
            },// array of zipObjects, index mapped to files
            dirs_objects    : {
                get : function (filtermode) {
                    return listing.filter(filtermode||listing_true_path_filter)
                        .filter(isDir)
                          .map(get_object);
                },
            },// array of zipObjects, index mapped to dirs
            string          : {
                value : new Proxy ({},file_proxy("string"))
            },// proxy accessor
            arraybuffer     : {
                value : new Proxy ({},file_proxy("arraybuffer",{binary:true}))
            },
            object          : {
                value : function (path) {
                    return zip.file(path);
                }
            },
            addWatcher      : {
                value : addWatcher
            },
            view_dir        : {
                value : view_chdir
            },
            chdir           : {
                value : function chdir(path) {
                    var new_path = true_path_from_relative_path(cwd,path);
                    cwd_view = view_chdir(new_path);
                    // note - if view_chdir() throws (ie bad path) we don't update either cwd or cwd_view
                    // this is "by design"
                    cwd = new_path;
                }
            },
            reread          : {
                value : reread,
            },
            toJSON          : {
                value : function() {
                    var j = {};
                    wrap.get_dirs().forEach(function(dir){
                        j[dir]= wrap.view_dir(dir).toJSON();
                    });
                    wrap.get_files().forEach(function(fn,ix){
                        j[fn]={
                                  date   : wrap.files_objects[ix].date,
                                  content : view.string[fn]()
                              };

                    });
                    return j;
                }
            },

            //util exports

            ab2str                       : {value : ab2str},
            str2ab                       : {value : str2ab},
            trailing_slashes_re          : {value : trailing_slashes_re},
            double_slash_re              : {value : double_slash_re},
            double_dot_parent_re         : {value : double_dot_parent_re},
            true_path_from_path          : {value : true_path_from_path},
            true_path_from_relative_path : {value : true_path_from_relative_path},
        });

    }

}

module.exports  = {
    ready   : false,
    fs      : null,
    process : null
};

require("fs").readFile("./jszip_test.zip", function(err, data) {
    if (err) throw err;

    fs_JSZip (exports,data,zipWrap,require("jszip"),require("path"),function(mod){

        module.exports.process = mod.process;
        module.exports.fs = mod.fs;
        module.exports.ready = true;
        global.test=mod;
        if (module.exports.onload) {
            module.exports.onload();
            delete module.exports.onload;
        }

    });
});
// or
