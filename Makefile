.PHONY: test remotes jslib qunit dist release deploy pypi dev clean purge

test:
	py.test -x test

remotes: jslib
	./cacher

jslib: qunit
	curl -o src/lib/chrjs.js \
		http://github.com/tiddlyweb/chrjs/raw/master/main.js
	curl -o src/lib/users.js \
		http://github.com/tiddlyweb/chrjs/raw/master/users.js

qunit:
	mkdir -p src/test/qunit
	curl -o src/test/qunit/qunit.js \
		http://github.com/jquery/qunit/raw/master/qunit/qunit.js
	curl -o src/test/qunit/qunit.css \
		http://github.com/jquery/qunit/raw/master/qunit/qunit.css
	curl -o src/test/qunit/jquery.min.js \
		http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.min.js
	curl -o src/test/qunit/jquery-json.min.js \
		http://jquery-json.googlecode.com/files/jquery.json-2.2.min.js

dist: clean remotes test
	python setup.py sdist

release: dist pypi

deploy: dist
	./deploy.sh nodist $(ARGS)

pypi: test
	python setup.py sdist upload

dev: remotes dev_local

dev_local:
	@twinstance_dev tiddlywebplugins.tiddlyspace dev_instance
	@echo "from devtiddlers import update_config; update_config(config)" \
		>> dev_instance/tiddlywebconfig.py
	@echo "INFO development instance created in dev_instance," \
		"using tiddler locations defined in devtiddlers.py"

clean:
	find . -name "*.pyc" | xargs rm || true
	rm -r dist || true
	rm -r build || true
	rm -r *.egg-info || true
	rm -r tiddlywebplugins/tiddlyspace/resources || true

purge: clean
	cat .gitignore | while read -r entry; do rm -r $$entry; done || true
