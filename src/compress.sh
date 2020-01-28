#!/bin/bash
echo "creating fresh internal require sim modules for browser..."
[[ -e ./require_simulator.json ]] && rm ./require_simulator.json
node ..

node - <<NODE

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


NODE

echo "compressing extensions.js to extensions.min.js"
echo "/* minified concatenated sources, built $(date) from extensions.js */" > ./extensions.min.js
echo "/* jshint ignore:start */" > ./extensions.min.js
echo "/* js-sha1 */" >> ./extensions.min.js
cat ../node_modules/js-sha1/build/sha1.min.js >> ./extensions.min.js
echo "/* jszip-utils.min.js */" >> ./extensions.min.js
cat ../node_modules/jszip-utils/dist/jszip-utils.min.js  >> ./extensions.min.js
echo "/* jszip.min.js */" >> ./extensions.min.js
cat ../node_modules/jszip/dist/jszip.min.js >> ./extensions.min.js
echo "/* js_zipWrap.min.js */" >> ./extensions.min.js
cat ./js_zipWrap.min.js >> ./extensions.min.js
echo "/* fs_jszip.min.js */" >> ./extensions.min.js
cat ./fs_jszip.min.js >> ./extensions.min.js
echo "/* fs_jszip-browser.min.js */" >> ./extensions.min.js
cat ./fs_jszip-browser.min.js >> ./extensions.min.js
echo "/* extensions.js */" >> ./extensions.min.js

uglifyjs extensions.js -c >> ./extensions.min.js
echo "/* (ex) ./require_simulator.json */" >> ./extensions.min.js
node -e 'console.log(JSON.parse(require("fs").readFileSync("./require_simulator.json","utf-8")).pkg.min_src);' >> ./extensions.min.js
echo "/* jshint ignore:end */" >> ./extensions.min.js

echo "/* non-minified concatenated source, built $(date) from extensions.js */" > ./jsextensions.js
echo "/* js-sha1 */" >> ./jsextensions.js
cat ../node_modules/js-sha1/src/sha1.js >> ./jsextensions.js

echo "/* jszip-utils.js */" >> ./jsextensions.js
cat ../node_modules/jszip-utils/dist/jszip-utils.js  >> ./jsextensions.js
echo "/* jszip.js */" >> ./jsextensions.js
cat ../node_modules/jszip/dist/jszip.js >> ./jsextensions.js
echo "/* js_zipWrap.pkg.js */" >> ./jsextensions.js
cat ./js_zipWrap.pkg.js >> ./jsextensions.js
echo "/* fs_jszip.pkg.js */" >> ./jsextensions.js
cat ./fs_jszip.pkg.js >> ./jsextensions.js
echo "/* fs_jszip-browser.pkg.js */" >> ./jsextensions.js
cat ./fs_jszip-browser.pkg.js >> ./jsextensions.js
echo "/* extensions.js */" >> ./jsextensions.js
cat extensions.js >> ./jsextensions.js
echo "/* internalRequire files */" >> ./jsextensions.js
node -e 'console.log(JSON.parse(require("fs").readFileSync("./require_simulator.json","utf-8")).pkg.src);' >> ./jsextensions.js

cd ..
if [[ "$1" == "push" ]]; then

    git add \
        src/extensions.js \
        src/extensions.min.js \
        src/jsextensions.js \
        src/js_zipWrap.pkg.js \
        src/js_zipWrap.min.js \
        src/fs_jszip.pkg.js \
        src/fs_jszip.min.js \
        src/fs_jszip-browser.pkg.js \
        src/fs_jszip-browser.min.js \
        src/extensions-node-functions.js \
        src/compress.sh \
        src/require_simulator.js \
        src/require_simulator.json

    ./update_git_repos.sh push || (git commit -m "auto update"; git push)
    echo -n current commit hash :
    git rev-parse HEAD
fi
