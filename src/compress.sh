#!/bin/bash
echo "compressing polyfills.js to polyfills.min.js"
echo "/* jshint ignore:start */" > ./polyfills.min.js
uglifyjs polyfills.js -c >> ./polyfills.min.js
echo "/* jshint ignore:end */" >> ./polyfills.min.js

echo "compressing extensions.js to extensions.temp.js"
echo "/* jshint ignore:start */" > ./extensions.temp.js
uglifyjs extensions.js -c >> ./extensions.temp.js
echo "/* jshint ignore:end */" >> ./extensions.temp.js

echo "patching extensions.temp.js to extensions.min.js"
node - << NODE
var fs=require("fs");
var src=fs.readFileSync("./extensions.temp.js","utf8");
src=src.replace(/\.\/polyfills\.js/g,"./polyfills.min.js");
fs.writeFileSync("./extensions.min.js",src);
NODE

node ./extensions.min.js --verbose
uglifyjs ./extensions.min.js -b > ./extensions.min.fmt.js
if [[ "$1" == "push" ]]; then
cd ..
git add src/extensions.js src/polyfills.js src/extensions.min.js src/polyfills.min.js  src/extensions.min.fmt.js
git commit -m "updated polyfills.js and extensions.js"
git push
fi
