#!/bin/bash
if which node >/dev/null; then
echo -n node ok:
node --version
else 
echo installing node
curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n
bash n lts
fi
if which uglifyjs >/dev/null; then
echo -n uglifyjs ok:
uglifyjs --version
else
echo installing uglifyjs
which npm && npm install -g uglify-js
fi

npm install uglify-js jshint
