.PHONY: clean purge test remotes jslib dist release deploy pypi dev

clean:
	find . -name "*.pyc" | xargs rm || true
	rm -r dist || true
	rm -r build || true
	rm -r *.egg-info || true
	rm -r tiddlywebplugins/tiddlyspace/resources || true
	rm src/frontpage/*.tid || true

purge: clean
	cat .gitignore | while read -r entry; do rm "$$entry"; done || true

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
	# front page
	curl -o "src/frontpage/static/loadScript.js" \
		"http://github.com/FND/jsutil/raw/master/loadScript.js"
	curl -o "src/frontpage/static/jquery.min.js" \
		"http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.min.js"
	curl -o "src/frontpage/static/jquery-json.min.js" \
		"http://jquery-json.googlecode.com/files/jquery.json-2.2.min.js"

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
	@sed -e "s/\(system_plugins.*'tiddlywebplugins\.tiddlyspace'\)/\1, 'tiddlywebplugins.static'/" \
		-i dev_instance/tiddlywebconfig.py
	@ln -s ../src/frontpage/static dev_instance/static
	@echo "INFO development instance created in dev_instance," \
		"using tiddler locations defined in devtiddlers.py"
