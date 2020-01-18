#!/bin/bash
echo "compressing extensions.js to extensions.min.js"
echo "/* jshint ignore:start */" > ./extensions.min.js
uglifyjs extensions.js -c >> ./extensions.min.js
echo "/* jshint ignore:end */" >> ./extensions.min.js
cd ..
NEW_POLY=0
./get-latest-github.sh "https://github.com/jonathan-annett/jspolyfills.git" && NEW_POLY=1
if [[ "${NEW_POLY}" == "1" ]]; then
npm install
fi
if [[ "$1" == "push" ]]; then
git add src/extensions.js src/extensions.min.js
if [[ "${NEW_POLY}" == "1" ]]; then
git add package.json
fi
git commit -m "updated extensions.js"
git push
echo -n current commit hash :
git rev-parse HEAD
fi
