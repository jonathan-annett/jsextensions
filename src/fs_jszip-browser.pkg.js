(function(x){x[0][x[1]]=(function()    {
    
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
                    window.zipWrap,
                    window.JSZip,
                    window.path,
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
    })();})(typeof process+typeof module+typeof require==='objectobjectfunction'?[module,"exports"]:[window,"startFSJSZip"]);