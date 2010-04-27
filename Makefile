.PHONY: clean purge test remotes jslib qunit dist release deploy pypi dev

clean:
	find . -name "*.pyc" | xargs rm || true
	rm -r dist || true
	rm -r build || true
	rm -r *.egg-info || true
	rm -r tiddlywebplugins/tiddlyspace/resources || true

purge: clean
	cat .gitignore | while read -r entry; do rm -r "$$entry"; done || true

test:
	py.test -x test

remotes: jslib
	./cacher

jslib: qunit
	mkdir -p "src/lib"
	curl -o "src/lib/chrjs.js" \
		"http://github.com/tiddlyweb/chrjs/raw/master/main.js"
	curl -o "src/lib/users.js" \
		"http://github.com/tiddlyweb/chrjs/raw/master/users.js"

qunit:
	mkdir -p src/test/qunit
	curl -o "src/test/qunit/qunit.js" \
		"http://github.com/jquery/qunit/raw/master/qunit/qunit.js"
	curl -o "src/test/qunit/qunit.css" \
		"http://github.com/jquery/qunit/raw/master/qunit/qunit.css"

dist: clean remotes test
	python setup.py sdist

release: dist pypi

deploy: dist
	./deploy.sh nodist $(ARGS)

pypi: test
	python setup.py sdist upload

dev: remotes
	@twinstance_dev tiddlywebplugins.tiddlyspace dev_instance
	@echo "from devtiddlers import update_config; update_config(config)" \
		>> dev_instance/tiddlywebconfig.py
	@echo "INFO development instance created in dev_instance," \
		"using tiddler locations defined in devtiddlers.py"
