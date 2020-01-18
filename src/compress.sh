#!/bin/bash
echo "compressing extensions.js to extensions.min.js"
echo "/* jshint ignore:start */" > ./extensions.min.js
uglifyjs extensions.js -c >> ./extensions.min.js
echo "/* jshint ignore:end */" >> ./extensions.min.js

if [[ "$1" == "push" ]]; then
cd ..
git add src/extensions.js src/extensions.min.js
git commit -m "updated extensions.js"
git push
fi
