.PHONY: test remotes jslib qunit dist release deploy pypi dev clean purge

wrap_jslib = curl -L -s $(2) | \
	{ \
		echo "/***"; echo $(2); echo "***/"; \
		echo "//{{{"; cat -; echo "//}}}"; \
	} > $(1)

test:
	py.test -x test

tiddlywiki:
	mkdir src/externals || true
	mkdir tiddlywebplugins/tiddlyspace/resources || true
	wget http://tiddlywiki.com/beta/empty.html \
		-O tiddlywebplugins/tiddlyspace/resources/beta.html
	wget http://tiddlywiki.com/alpha/empty.html \
		-O tiddlywebplugins/tiddlyspace/resources/alpha.html
	wget http://tiddlywiki.com/alpha/tiddlywiki_externaljs_tiddlyspace.html \
		-O tiddlywebplugins/tiddlyspace/resources/external_alpha.html
	wget http://tiddlywiki.com/alpha/jquery.js \
		-O src/externals/alpha_jquery.js.js
	wget http://tiddlywiki.com/alpha/jQuery.twStylesheet.js \
		-O src/externals/alpha_jQuery.twStylesheet.js.js
	wget http://tiddlywiki.com/alpha/twcore.js \
		-O src/externals/alpha_twcore.js.js


remotes: tiddlywiki jslib
	./cacher

jslib: qunit
	$(call wrap_jslib, src/lib/chrjs.js, \
		https://github.com/tiddlyweb/chrjs/raw/master/main.js)
	$(call wrap_jslib, src/lib/chrjs.users.js, \
		https://github.com/tiddlyweb/chrjs/raw/master/users.js)
	$(call wrap_jslib, src/lib/jquery.js.js, \
		http://code.jquery.com/jquery-1.6.3.min.js)
	$(call wrap_jslib, src/lib/ts.js.js, \
		https://raw.github.com/TiddlySpace/ts.js/master/src/ts.js)
	$(call wrap_jslib, src/lib/chrjs-store.js.js, \
		https://raw.github.com/bengillies/chrjs.store/master/dist/chrjs-store-latest.js)
	$(call wrap_jslib, src/lib/bookmark_bubble.js.js, \
		http://mobile-bookmark-bubble.googlecode.com/hg/bookmark_bubble.js)
	$(call wrap_jslib, src/lib/jquery-json.js.js, \
		http://jquery-json.googlecode.com/files/jquery.json-2.3.min.js)
	$(call wrap_jslib, src/lib/jquery-form.js.js, \
		https://raw.github.com/malsup/form/master/jquery.form.js)

qunit:
	mkdir -p src/test/qunit
	mkdir -p src/test/lib
	curl -Lo src/test/qunit/qunit.js \
		https://github.com/jquery/qunit/raw/master/qunit/qunit.js
	curl -Lo src/test/qunit/qunit.css \
		https://github.com/jquery/qunit/raw/master/qunit/qunit.css
	curl -Lo src/test/lib/jquery.js \
		http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.js
	curl -Lo src/test/lib/jquery-json.js \
		http://jquery-json.googlecode.com/files/jquery.json-2.2.js

dist: clean remotes test
	python setup.py sdist

release: dist pypi

deploy: release
	./deploy.sh $(ARGS)

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
