.PHONY: test remotes jslib qunit get_phantomjs get_jshint jshint jstest pytest dist release deploy pypi dev clean purge tagv

wrap_jslib = { \
		echo "/***" &&  echo $(2) && echo "***/" && \
		echo "//{{{" && \
		curl --location -f -s $(2) && \
		echo "//}}}"; \
	} > $(1)

download = \
	curl --location -f --output $(1) --time-cond $(1) --remote-time $(2)

pytest:
	py.test -x test

tagv: version = $(shell python -c 'import mangler; \
	import tiddlywebplugins.tiddlyspace; \
	print "v" + tiddlywebplugins.tiddlyspace.__version__')

tagv:
	git tag -a -m $(version) $(version) && \
		git push origin master --tags

test: pytest jstest

tiddlywiki:
	mkdir tiddlywebplugins/tiddlyspace/resources || true
	$(call download, "tiddlywebplugins/tiddlyspace/resources/beta.html", \
		"http://classic.tiddlywiki.com/beta/empty.html")
	$(call download, "tiddlywebplugins/tiddlyspace/resources/external_beta.html", \
		"http://classic.tiddlywiki.com/beta/tiddlywiki_externaljs_tiddlyspace.html")
	$(call download, "src/externals/beta_jquery.js.js", \
		"http://classic.tiddlywiki.com/beta/jquery.js")
	$(call download, "src/externals/beta_jQuery.twStylesheet.js.js", \
		"http://classic.tiddlywiki.com/beta/jQuery.twStylesheet.js")
	$(call download, "src/externals/beta_twcore.js.js", \
		"http://classic.tiddlywiki.com/beta/twcore.js")
	$(call download, "tiddlywebplugins/tiddlyspace/resources/external.html.wrongbag", \
		"http://classic.tiddlywiki.com/tiddlywiki_externaljs_tiddlyspace.html")
	$(call download, "src/externals/jQuery.twStylesheet.js.js", \
		"http://classic.tiddlywiki.com/jQuery.twStylesheet.js")
	$(call download, "src/externals/twcore.js.js", \
		"http://classic.tiddlywiki.com/twcore.js")
	$(call download, "src/externals/twjquery.js.js", \
		"http://classic.tiddlywiki.com/jquery.js")
	# Fix up path to jquery to avoid collision with main hosted
	# jquery.
	sed -e 's|/bags/common/tiddlers/jquery.js|/bags/common/tiddlers/twjquery.js|;' < \
		tiddlywebplugins/tiddlyspace/resources/external.html.wrongbag > \
		tiddlywebplugins/tiddlyspace/resources/external.html && \
		rm tiddlywebplugins/tiddlyspace/resources/external.html.wrongbag


remotes: tiddlywiki jslib csslib
	twibuilder tiddlywebplugins.tiddlyspace

jslib: qunit remotejs

csslib:
	$(call download, "src/lib/normalize.css", \
		"https://raw.github.com/necolas/normalize.css/master/normalize.css")

remotejs:
	$(call wrap_jslib, "src/lib/chrjs.js", \
		"https://raw.github.com/tiddlyweb/chrjs/master/main.js")
	$(call wrap_jslib, "src/lib/chrjs.users.js", \
		"https://raw.github.com/tiddlyweb/chrjs/master/users.js")
	$(call wrap_jslib, "src/lib/jquery.js.js", \
		"http://code.jquery.com/jquery.min.js")
	$(call wrap_jslib, "src/lib/ts.js.js", \
		"https://raw.github.com/TiddlySpace/ts.js/master/src/ts.js")
	$(call wrap_jslib, "src/lib/chrjs-store.js.js", \
		"https://raw.github.com/bengillies/chrjs.store/master/dist/chrjs-store-latest.js")
	$(call wrap_jslib, "src/lib/bookmark_bubble.js.js", \
		"http://mobile-bookmark-bubble.googlecode.com/hg/bookmark_bubble.js")
	$(call wrap_jslib, "src/lib/jquery-json.js.js", \
		"http://jquery-json.googlecode.com/files/jquery.json-2.3.min.js")
	$(call wrap_jslib, "src/lib/jquery-form.js.js", \
		"http://malsup.github.io/jquery.form.js")
	$(call wrap_jslib, "src/lib/jquery.timeago.js.js", \
		"http://timeago.yarp.com/jquery.timeago.js")
	$(call wrap_jslib, "src/lib/html5.js.js", \
		"http://html5shiv.googlecode.com/svn/trunk/html5.js")

qunit:
	mkdir -p src/test/qunit
	mkdir -p src/test/lib
	cp src/lib/json2.js.js src/test/lib/json2.js
	$(call download, "src/test/qunit/qunit.js", \
		"http://code.jquery.com/qunit/qunit-1.12.0.js")
	$(call download, "src/test/qunit/qunit.css", \
		"http://code.jquery.com/qunit/qunit-1.12.0.css")
	$(call download, "src/test/lib/jquery.js", \
		"http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.js")
	$(call download, "src/test/lib/jquery-json.js", \
		"http://jquery-json.googlecode.com/files/jquery.json-2.2.js")
	$(call download, "src/test/lib/jquery.mockjax.js", \
		"https://raw.github.com/appendto/jquery-mockjax/master/jquery.mockjax.js")
	$(call download, "src/test/run-qunit.js", \
		"https://raw.github.com/ariya/phantomjs/1.6/examples/run-qunit.js")

get_phantomjs:
	npm install -g phantomjs

jstest:
	phantomjs src/test/run-qunit.js src/test/index.html

get_jshint:
	npm install -g jshint

jshint:
	jshint src/**/*.js

saucelabs_deps:
	npm install -g grunt-cli
	npm install

saucelabs_test:
	grunt test

jstest_browser:
	grunt dev

dist: clean remotes test
	python setup.py sdist

release: tagv dist pypi

deploy: release
	@echo "Go to tiddlyspace.com to run tsupdate."

pypi: test
	python setup.py sdist upload

dev: remotes dev_local

dev_local:
	@mysqladmin -f drop tiddlyspace || true
	@mysqladmin create tiddlyspace
	@PYTHONPATH="." ./tiddlyspace dev_instance
	( cd dev_instance && \
		ln -s ../devconfig.py && \
		ln -s ../mangler.py && \
		ln -s ../tiddlywebplugins && \
		ln -s ../tiddlywebplugins/templates )
	@echo "from devconfig import update_config; update_config(config)" \
		>> dev_instance/tiddlywebconfig.py
	@echo "INFO development instance created in dev_instance"

clean:
	find . -name "*.pyc" | xargs rm || true
	rm -rf dist || true
	rm -rf build || true
	rm -rf *.egg-info || true
	rm -rf tiddlywebplugins/tiddlyspace/resources || true
	rm -f src/externals/*js || true
	rm -r test_instance || true

purge: clean
	cat .gitignore | while read -r entry; do rm -r $$entry; done || true
