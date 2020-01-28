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


            Stats = function Stats(size, when,inode) {
              this.ino=inode;
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
                   throw file.error(
                       new Error (
                           "Callback must be a function. Received "+typeof options.callback),
                           'ERR_INVALID_CALLBACK'
                    );
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

            tests = function (cb) {


                console.log({testing_with:wrapped.view_dir("/",true).listing});

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
                                if (!err) {
                                    throw new Error("rmdir on deep path - non recursive should have failed");
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
                        "value": function access(path, mode = F_OK) {
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

            tests(function(){
                console.log("tests passed");
                cb({fs:Object.defineProperties({},fs),process:fs_process,wrapped:wrapped});
            });

        });

    }).catch(function(e){ throw(e);});


}

function zipWrap(zip,nodePath,cb){
    var
    join=nodePath.join,
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
                    path = join(cwd,path.substr(2));
                } else {
                    path = join(cwd,path);
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
    var inodes = {};
    var getInode = function getInode(true_path){
        var result = inodes[true_path];
        if (!result) {
            result = getInode.next || 1000;
            getInode.next = result+1;
            inodes[true_path] = result;
        }
        return result;
    };
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
            //console.log({loading:fn});
            wrap.string[fn](function(err,data){

            //console.log(err?{error:err.messsage,fn:fn}:{loaded:fn,bytes:data.length});

            var ix=loading.indexOf(fn);
            loading.splice(ix,1);
            bytes += err ? 0 : data.length;
            if (loading.length===0) {
                return cb(wrap,bytes);
            }
        });
            return fn;
        });
    }

    return wrap;

    function reread(){

        zip_fns.splice.apply(zip_fns,[0,zip_fns.length].concat(Object.keys(zip.files)));// what the zip object calls the file
        listing.splice.apply(listing,[0,listing.length].concat(zip_fns.map(true_path_from_path)));// the file name in our virtual fs (under "/")

        // ensure each file has an inode, and retire any stale inodes
        var current_inodes = listing.map(getInode);
        Object.keys(inodes).forEach(function(fn){
            var inode = inodes[fn];
            if (current_inodes.indexOf(inode)<0) {
                delete inodes[fn];
            }
        });

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
                           watch_message=["rename","change"];
                       }

                       zip.file(zip_fn,data,opts);
                       set_cache(zip.files[zip_fn],data);
                       if (!(obj&&obj.async)) obj=zip.files[zip_fn];

                       var
                       inode = getInode(true_path),
                       basename = nodePath.basename(true_path),
                       notify = function(watch_path){
                           if(watchers[watch_path]){
                              watch_messages.forEach(function(watch_message){
                                  watchers[watch_path].forEach(
                                      function(fn){fn(watch_message,fn.encode(basename),new Stats(data.length, obj.date,inode));}
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
        var obj = get_object(zip_fn);
        if (!obj) console.log({isFile_undefined:zip_fn});

        return !!obj && !obj.dir;
    }

    function isDir( zip_fn ) {
        var obj = get_object(zip_fn);
        if (!obj) console.log({isDir_undefined:zip_fn});

        return !!obj && obj.dir;
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
        var
        mine_true = true_path_from_path(under),
        mine_from = mine_true=== "/"?1 : mine_true.length+1;
        return function filtered_top_object (obj) {return filtered_top_path(true_path_from_path(obj.name).substr(mine_from));};
    }

    // view_chdir returns a view of the wrapped zip, with MOST of the methods,
    // but rooted under s specific path
    // specifying recursive as true will mean affect the format of the listing and files and dirs arrays
    // (ie any subdirectories and files are included as full paths relative to the root)
    // not specifying recursive (or supplying a falsey value) will mean mean only
    // the top level files and dirs are included in listing, only top level dirs in dirs, and files in files
    /* eg given a zip with

        /dir0/dir1/subdir1/file1.ext
        /dir0/file2.ext

                 view_chdir("/dir0",{recursive:true})     vs view_chdir("/dir0")

     listing === [ "dir1/subdir1/file1.ext","file2.ext" ] vs [ "dir1","file2.ext" ]
     dirs    === [ "dir1/subdir1" ]                       vs [ "dir1" ]
     files   === [ "dir1/subdir1/file1.ext","file2.ext" ] vs [ "file2.ext" ]

    */

    function view_chdir(path,recursive) {

        var true_path =true_path_from_path(path);

        //if (true_path==="/") return wrap;

        if (true_path!=="/" && !zip.files[ directory[ true_path ] ]) {
            throw new Error (path+" not found");
        }

        var

        view={},

        my_true_path_prefix = true_path==="/" ? "/" : true_path+"/",
        mine_from           = my_true_path_prefix.length,

        filtered        = !!recursive ? filtered_always : filtered_top_path,

        filtered_object = !!recursive ? filtered_always : filtered_top_object_under(true_path);

        return Object.defineProperties(view,getViewProperties() );

        function GET(what){return properties[what].get(filtered_always);}

        function make_mine (path) {

            if (path.startsWith("..")) return "///badpath!";

            var mine = path.replace(/^(\.|\/)*/,my_true_path_prefix);
            return mine;

        }

        function my_part (path) {
            return path.substr(mine_from);
        }

        function is_my_true_path(fn) {
            return fn.startsWith(my_true_path_prefix);
        }

        function is_my_object(obj) {
            return true_path_from_path(obj.name).startsWith(my_true_path_prefix);
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

        function getViewProperties() {

            return augmentProps(
                      ["listing","files","dirs"],
                      ["mkdir","mkdirp","rmdir","rm","exists","stat","mv","cp"],
                      true_path,
                      {
                       get_listing     : { value : function(recursive){ return ; } },
                       listing         : { get : listing_view },
                       files           : { get : files_view },
                       dirs            : { get : dirs_view },
                       listing_objects : { get : listing_objects_view },
                       files_objects   : { get : files_objects_view },
                       dirs_objects    : { get : dirs_objects_view },

                       string          : { value : file_proxy_view("string")},
                       arraybuffer     : { value : file_proxy_view("arraybuffer")},
                       object          : { value : function subview_object (path) {
                                                       return zip.file( directory [ make_mine(path) ]  );
                                                   }},
                       addWatcher      : { value : function addWatcher (path,options,listener)  {
                                               return addWatcher (make_mine(path),options,listener);
                       }},
                       view_dir        : { value : function view_dir(path,recursive) {
                                               return view_chdir(make_mine(path),recursive);
                                           }
                       },
                       chdir           : {
                           value : function chdir(path) {
                               wrap.chdir(true_path_from_relative_path(true_path,path));
                           }
                       },
                       reread          : {
                           value : reread
                       },
                       toJSON          : {
                           value : function() {
                               var
                               j = { dirs : {}, files:{}},
                               dirs=view.dirs,
                               files=view.files;

                               dirs.forEach(function(dir){
                                   j.dirs[dir] = view.view_dir(dir).toJSON();
                               });
                               files.forEach(function(fn,ix){
                                   j.files[fn]=view.string[fn]();
                                   j.dirs[fn] = {
                                       date    : view.files_objects[ix].date,
                                       size    : j.files[fn].size
                                   };
                               });
                               return j;
                           }
                       },
                   });
        }


    }

    function augmentProps(recursive,pathwraps,true_path,props) {

        var
        path_fixer = true_path_from_relative_path.bind(this,true_path),
        cpArgs = (function(s) { return s.call.bind(s); })(Array.prototype.slice);

        recursive.forEach(add_getters);
        pathwraps.forEach(add_parent_wrap);

        return props;

        function add_getters(cmd){
            props["get_"+cmd] = {
                value : function(recursive) {
                    return props[cmd].get(recursive?filtered_always:undefined);
                },
                enumerable:false,
                configurable:true,
            };
            props[cmd].enumerable=true;
            props[cmd].configurable=true;
        }



        function add_parent_wrap(cmd){
            var

            parent_handler = wrap[cmd],
            child_handler = {};// wrapper to ensure child_handler gets namded cmd

            child_handler[cmd]=function () {
                var
                args = cpArgs(arguments),
                cb = args[args.length-1];

                if (typeof cb==="function") args.pop();
                args =args.map(path_fixer);
                if (typeof cb==="function") args.push(cb);

                return parent_handler.apply(this,args);
            };

            props[cmd]={
                value : child_handler[cmd],
                enumerable:true,
                configurable:true,
            };

        }
    }

    function getProperties() {


        var

        listing_true_path_filter = filtered_root_path,
        listing_object_filter    = filtered_top_root_object;


        function errback (cb,err,data) {
            if (err) {
                if (cb) return cb(err);
                throw (err);
            } else {
                return cb ? cb(null,data) : data;
            }
        }


        function exists(true_path) {
            return !!zip.files [ directory [ true_path ] ];
        }

        function isDir(true_path) {
            var entry = zip.files [ directory [ true_path ] ];
            return entry && entry.dir;
        }

        function isEmptyDir(true_path) {
            if (!isDir(true_path)) return false;
            return (view_chdir(true_path).length===0);
        }


        function mkdir (path,cb) {

            var
            true_path = true_path_from_relative_path(cwd,path);
            if ( true_path === "/" || zip.files [ directory [ true_path ] ] ) {
                return errback(cb,new Error("can't mkdir "+path + "already exists" +

                    (zip.files [ directory [ true_path ] ].dir?"":" (a file)")
                ));
            }
            var
            parent_path = nodePath.dirname(true_path),
            parent_dir = zip.files [ directory [ parent_path ] ];
            if ( parent_path === "/"  || parent_dir ) {
                 if ( parent_path === "/" || parent_dir.dir ) {
                     var zip_fn=true_path.substr(1);
                     zip.folder(zip_fn);
                     reread();
                     return errback(cb);
                 } else {
                     return errback(cb,new Error ("can't mkdir '"+path+"' - '"+parent_dir.name + "' is not a directory"));
                 }
             } else {
                 return errback(cb,new Error ("can't mkdir '"+path+"' - '"+parent_path + "' not found"));
             }


        }

        function mkdirp (path,cb) {

            var true_path = true_path_from_relative_path(cwd,path);
            if ( zip.files [ directory [ true_path ] ] ) {
                return errback(cb,new Error("can't mkdir "+path + "already exists" +

                    (zip.files [ directory [ true_path ] ].dir?"":" (a file)")
                ));
            }
            var zip_fn=true_path.substr(1);
            zip.folder(zip_fn);
            reread();
            return errback(cb);


        }



        function rm (path,cb) {
            var
            true_path = true_path_from_relative_path(cwd,path);
            if (!!zip.files [ directory [ true_path ] ]) {
                zip.remove(directory [ true_path ]);
                reread();
                return errback(cb);
            } else {
                return errback(cb,new Error(path+" not found"));
            }
        }

        function rmdir (path,cb) {
            var
            true_path = true_path_from_relative_path(cwd,path);

            if (exists(true_path)){
                if (isDir(true_path)) {
                    if (isEmptyDir(true_path)) {
                        return rm (path,cb);
                    } else {
                        return errback(cb,new Error(path+" is not empty"));
                    }
                } else {
                    return errback(cb,new Error(path+" is not a directory"));
                }
            } else {
                return errback(cb,new Error(path+" not found"));
            }
        }


        function do_exists(path,cb){
            var
            true_path = true_path_from_relative_path(cwd,path),
            answer = true_path === "/" || exists(true_path);
            return cb ? cb (answer) : answer;
        }


        function Stats(size, when) {
          this.size = size;
          this.atimeMs = when.getTime();
          this.mtimeMs = this.atimeMs;
          this.ctimeMs = this.atimeMs;
          this.birthtimeMs = this.atimeMs;
          this.atime = when;
          this.mtime = this.atime;
          this.ctime = this.atime;
          this.birthtime = this.atime;
        }

        function stat(path,cb) {
            var
            true_path = true_path_from_relative_path(cwd,path);

            if (exists(true_path)){

                var
                zip_fn = directory [ true_path],
                ino = getInode(true_path),
                obj = zip.file ( zip_fn );
                if (obj) {

                    if (obj._data && typeof obj._data.uncompressedSize === 'number') {
                        return errback(cb,null,new Stats(obj._data.uncompressedSize, obj.date,ino));
                    }  else {

                        if (cb) {
                            obj.async("string").then(function(data){
                                return errback(cb,null,new Stats(data.length, obj.date,ino));
                            }).catch(function(err){
                                return errback(cb,err);
                            });
                        } else {
                            var ignore=function(){};
                            obj.async("string").then(ignore).catch(ignore);
                            return errback (undefined,new Error(path+" not ready. try later"));
                        }
                    }

                } else {
                    return errback (cb,new Error(path+" not found"));
                }
            }

        }

        function cp (src,dest,cb,_is_mv) {
            var
            true_src  = true_path_from_relative_path(cwd,src),
            true_dest = true_path_from_relative_path(cwd,dest);


            if (exists(true_src)){

                if (true_src===true_dest) {
                    return errback(cb,new Error("source and destination are the same"));
                }

                var zip_fn_src = directory [true_src];

                if (exists(true_dest)){

                    var zip_fn_dest = directory [true_src];

                    if (isDir(true_dest)){
                        return errback(cb,new Error(dest+" is a directory. mv failed"));
                    }

                    // trash the existing file/dir tree that is in the zip
                    zip.remove(zip_fn_dest);
                    // reuse existing dest name that was in zip
                    return do_mv(zip_fn_src,zip_fn_dest);

                } else {
                    // invent a dest name (eg true without leading slash)
                    return do_mv(zip_fn_src,true_dest.substr(1));
                }

            } else {
                return errback (cb, new Error(src+" not found"));
            }

            function do_mv_file(zip_fn_src,zip_fn_dest) {
                if (cb) {

                    wrap.arraybuffer[true_src](function(err,data){
                        if (err) return errback(cb,err);
                        wrap.arraybuffer[true_dest] = data;
                        if (_is_mv) zip.remove(zip_fn_src);
                        reread();
                        return cb(null);
                    });

                } else {
                    // this may throw if src is still compressed - them's the break with sync ops.
                    wrap.arraybuffer[true_dest] = wrap.arraybuffer[true_src]();
                    if (_is_mv) zip.remove(zip_fn_src);
                    reread();
                }
            }

            function do_mv_dir(zip_fn_src,zip_fn_dest) {

                var
                dir_to_move = wrap.view_dir(true_src,true),
                files_to_move;
                if (cb) {

                    files_to_move = files_to_move = dir_to_move.files_objects;
                    var

                    source_files  = files_to_move.map(function(obj){
                        return true_path_from_path (obj.name);
                    }),
                    offset = true_src.length+1,
                    dest_files  = source_files.map(function(fn){
                        return true_dest + "/" + fn.substr(offset);
                    });

                    Promise.all(

                        files_to_move.map(function(obj,ix){
                            return obj.async("arraybuffer").catch(function(err){
                                                               return err;
                                                           });
                        })

                    ).then(function(buffers){

                        var errors = buffers.filter(function(buf){
                            return typeof buf==='object'&&buf.constructor===Error;
                        });

                        if (errors.length>0){

                            var err = new Error("errors while reading source files");
                            err.errors = errors;
                            return cb(err);

                        } else {

                            buffers.forEach(function(buf,ix){
                                var zip_dest = directory [ dest_files[ix] ] || dest_files[ix].substr(1);
                                zip.file( zip_dest  ,buf , {binary:true} );
                            });

                            if (_is_mv) zip.remove(zip_fn_src);

                            reread();

                            return cb();
                        }



                    }).catch (function(err ){
                        console.log({err});
                    });



                } else {
                    // get files to move as an array of relative paths
                    files_to_move = dir_to_move.files;
                    var moved_ok=[];
                    // attempt to move each file - if any are still compresed, this will throw
                    try {

                        files_to_move.forEach(function(fn){
                            var true_path_src  = true_src  +"/" + fn;
                            var true_path_dest = true_dest +"/" + fn;
                            wrap.arraybuffer[true_path_dest] = wrap.arraybuffer[true_path_src]();
                            moved_ok.push(true_path_dest);
                        });

                         // ok all files copied ok, so we can trash the orignal files and we a re done
                        if (_is_mv) zip.remove(zip_fn_src);

                        // clear the moved list, as we don't want to rollback the move
                        moved_ok.splice(0,moved_ok.length);

                    } finally {
                        moved_ok.forEach(function(true_fn){
                            zip.remove( directory [true_fn] );
                        });
                        reread();
                    }
                }
            }

            function do_mv(zip_fn_src,zip_fn_dest) {
                if (isDir(true_src)) {
                    return do_mv_dir(zip_fn_src,zip_fn_dest);
                } else {
                    return do_mv_file(zip_fn_src,zip_fn_dest);
                }
            }

        }

        function mv (src,dest,cb,_is_mv) {
            return cp (src,dest,cb,true);
        }


        return augmentProps(
            ["listing","files","dirs"],
            [],'',
            {

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

            mkdir           : { value : mkdir},
            mkdirp          : { value : mkdirp},
            rmdir           : { value : rmdir},
            rm        : { value : rm },

            exists          : { value : do_exists},

            stat            : { value : stat },

            mv              : { value : mv },
            cp              : { value : cp },

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
                    return zip.file( directory [ true_path_from_path(path) ]  );
                }
            },
            addWatcher      : {
                value : addWatcher
            },
            view_dir        : {
                value : function view_dir(path,recursive){
                    return view_chdir(path,recursive);
                }
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
                    var j = {
                        dir   : getDir(wrap),
                        files : getFiles(wrap)
                    };

                    function getDir(z) {
                        var r={};
                        z.get_dirs(false).forEach(function(d){
                            r[d.replace(/^\/{1}/,'')]=getDir(z.view_dir(d,false));
                        });

                        z.files_objects.forEach(function(f){
                            r[nodePath.basename(f.name)]=f.date;
                        });
                        return r;
                    }

                    function getFiles(z) {
                        var r={};
                        z.get_files(true).forEach(function(f){
                            var obj = zip.files[ directory [f] ];
                            r[f]={
                                size:obj._data.uncompressedSize,
                                text:z.string[f]()
                            };
                        });
                        return r;
                    }

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
