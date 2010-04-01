.PHONY: clean test remotes jslib dist release pypi dev

clean:
	find . -name "*.pyc" | xargs rm || true
	rm -r dist || true
	rm -r build || true
	rm -r *.egg-info || true
	rm -r tiddlywebplugins/tiddlyspace/resources || true
	rm src/frontpage/*.tid || true

test:
	py.test -x test

remotes: jslib
	./cacher

jslib:
	mkdir -p "src/lib"
	curl -o "src/lib/chrjs.js" \
		"http://github.com/tiddlyweb/chrjs/raw/master/main.js"
	curl -o "src/lib/users.js" \
		"http://github.com/tiddlyweb/chrjs/raw/master/users.js"

dist: clean remotes test
	python setup.py sdist

release: dist pypi

pypi: test
	python setup.py sdist upload

dev: remotes
	@twinstance_dev tiddlywebplugins.tiddlyspace dev_instance
	@echo "from devtiddlers import update_config; update_config(config)" \
		>> dev_instance/tiddlywebconfig.py
	@echo "INFO development instance created in dev_instance," \
		"using tiddler locations defined in devtiddlers.py"
