#!/usr/bin/env sh

cd `dirname $0`/kopfloss
./run.sh $@ fixtures/browser.js \
	../lib/jquery.js ../fixtures/kopfloss.js ../lib/jquery-json.js \
	../../lib/chrjs.js ../../lib/chrjs.space.js ../space.js \
	../fixtures/tiddlywiki.js ../fixtures/tiddlyweb.js ../fixtures/tiddlyspace.js \
	../../plugins/TiddlySpaceConfig.js ../../test/config.js \
	../../plugins/TiddlySpaceInit.js ../../test/init.js \
	#../../plugins/TiddlySpaceSpaces.js ../../test/test_TiddlySpaceSpaces.js
