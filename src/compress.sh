#!/bin/bash
echo "creating fresh internal require sim modules for browser..."
[[ -e ./require_simulator.json ]] && rm ./require_simulator.json
node ..
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
cat ./fs_jszip.min.js >> ../extensions.min.js
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
echo "/* extensions.js */" >> ./jsextensions.js
cat extensions.js >> ./jsextensions.js
echo "/* internalRequire files */" >> ./jsextensions.js
node -e 'console.log(JSON.parse(require("fs").readFileSync("./require_simulator.json","utf-8")).pkg.src);' >> ./jsextensions.js

cd ..
if [[ "$1" == "push" ]]; then

    git add \
        src/extensions.js src/extensions.min.js \
        src/jsextensions.js \
        src/extensions-node-functions.js \
        src/compress.sh \
        src/require_simulator.js src/require_simulator.json

    ./update_git_repos.sh push || (git commit -m "auto update"; git push)
    echo -n current commit hash :
    git rev-parse HEAD
fi
