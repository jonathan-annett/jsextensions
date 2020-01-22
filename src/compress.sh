#!/bin/bash
echo "compressing extensions.js to extensions.min.js"
echo "/* jshint ignore:start */" > ./extensions.min.js
uglifyjs extensions.js -c >> ./extensions.min.js
echo "/* jshint ignore:end */" >> ./extensions.min.js
cd ..
if [[ "$1" == "push" ]]; then
git add src/extensions.js src/extensions.min.js src/extensions-node-functions.js
./update_git_repos.sh push || (git commit -m "auto update"; git push)
echo -n current commit hash :
git rev-parse HEAD
fi
