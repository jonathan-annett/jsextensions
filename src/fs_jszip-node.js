module.exports  = {
    ready   : false,
    fs      : null,
    process : null
};

require("fs").readFile("./jszip_test.zip", function(err, data) {
    if (err) throw err;

    var fs_JSZip = require("./fs_jszip.min.js");

    fs_JSZip (exports,data,require("./js_zipWrap.min.js"),require("jszip"),require("path"),function(mod){

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
