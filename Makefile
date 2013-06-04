.PHONY: test remotes jslib qunit get_phantomjs get_jshint jshint jstest pytest dist release deploy pypi dev clean purge

wrap_jslib = curl -L -s $(2) | \
	{ \
		echo "/***"; echo $(2); echo "***/"; \
		echo "//{{{"; cat -; echo "//}}}"; \
	} > $(1)

download = \
	curl --location --output $(1) --time-cond $(1) --remote-time $(2); echo

pytest:
	py.test -x test

test: pytest jstest

tiddlywiki:
	mkdir src/externals || true
	mkdir tiddlywebplugins/tiddlyspace/resources || true
	$(call download, "tiddlywebplugins/tiddlyspace/resources/beta.html", \
		"http://tiddlywiki.com/beta/empty.html")
	$(call download, "tiddlywebplugins/tiddlyspace/resources/external_beta.html", \
		"http://tiddlywiki.github.com/beta/tiddlywiki_externaljs_tiddlyspace.html")
	$(call download, "src/externals/beta_jquery.js.js", \
		"http://tiddlywiki.github.com/beta/jquery.js")
	$(call download, "src/externals/beta_jQuery.twStylesheet.js.js", \
		"http://tiddlywiki.github.com/beta/jQuery.twStylesheet.js")
	$(call download, "src/externals/beta_twcore.js.js", \
		"http://tiddlywiki.github.com/beta/twcore.js")

remotes: tiddlywiki jslib
	twibuilder tiddlywebplugins.tiddlyspace

jslib: qunit
	$(call wrap_jslib, "src/lib/chrjs.js", \
		"https://github.com/tiddlyweb/chrjs/raw/master/main.js")
	$(call wrap_jslib, "src/lib/chrjs.users.js", \
		"https://github.com/tiddlyweb/chrjs/raw/master/users.js")
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
		"https://raw.github.com/malsup/form/master/jquery.form.js")
	$(call wrap_jslib, "src/lib/jquery.timeago.js.js", \
		"http://timeago.yarp.com/jquery.timeago.js")

qunit:
	mkdir -p src/test/qunit
	mkdir -p src/test/lib
	$(call download, "src/test/qunit/qunit.js", \
		"https://github.com/jquery/qunit/raw/master/qunit/qunit.js")
	$(call download, "src/test/lib/jquery.js", \
		"http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.js")
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

dist: clean remotes test
	python setup.py sdist

release: dist pypi

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
	rm -f src/externals/* || true
	rm -r test_instance || true

purge: clean
	cat .gitignore | while read -r entry; do rm -r $$entry; done || true
