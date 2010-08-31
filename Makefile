.PHONY: test remotes jslib qunit dist release deploy pypi dev clean purge

wrap_jslib = curl -s $(2) | \
	{ \
		echo "/***"; echo $(2); echo "***/"; \
		echo "//{{{"; cat -; echo "//}}}"; \
	} > $(1)

test:
	src/test/run.sh
	py.test -x test

remotes: jslib
	./cacher

jslib: qunit
	$(call wrap_jslib, src/lib/chrjs.js, \
		http://github.com/tiddlyweb/chrjs/raw/master/main.js)
	$(call wrap_jslib, src/lib/chrjs.users.js, \
		http://github.com/tiddlyweb/chrjs/raw/master/users.js)

qunit:
	mkdir -p src/test/qunit
	mkdir -p src/test/lib
	curl -o src/test/qunit/qunit.js \
		http://github.com/jquery/qunit/raw/master/qunit/qunit.js
	curl -o src/test/qunit/qunit.css \
		http://github.com/jquery/qunit/raw/master/qunit/qunit.css
	curl -o src/test/lib/jquery.js \
		http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.js
	curl -o src/test/lib/jquery-json.js \
		http://jquery-json.googlecode.com/files/jquery.json-2.2.js

kopfloss: qunit
	git clone git://github.com/FND/kopfloss.git src/test/kopfloss || true
	{ \
		cd src/test/kopfloss; \
		pwd || true; \
		git pull origin master; \
		ln -s ../../qunit/qunit.js lib/qunit.js; \
		cd -; \
	}

dist: clean remotes test
	python setup.py sdist

release: dist pypi

deploy: release
	./deploy.sh $(ARGS)

pypi: test
	python setup.py sdist upload

dev: remotes dev_local

dev_local:
	@mysqladmin -f drop tiddlyspace create tiddlyspace
	@PYTHONPATH="." ./tiddlyspace dev_instance
	( cd dev_instance && \
		ln -s ../devconfig.py && \
		ln -s ../mangler.py && \
		ln -s ../tiddlywebplugins )
	@echo "from devconfig import update_config; update_config(config)" \
		>> dev_instance/tiddlywebconfig.py
	@echo "INFO development instance created in dev_instance"

clean:
	find . -name "*.pyc" | xargs rm || true
	rm -rf dist || true
	rm -rf build || true
	rm -rf *.egg-info || true
	rm -rf tiddlywebplugins/tiddlyspace/resources || true

purge: clean
	cat .gitignore | while read -r entry; do rm -r $$entry; done || true
