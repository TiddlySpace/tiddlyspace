.PHONY: clean test remotes dist release pypi

clean:
	find . -name "*.pyc" | xargs rm || true
	rm -r dist || true
	rm -r build || true
	rm -r *.egg-info || true
	rm -r tiddlywebplugins/tiddlyspace/resources || true

test:
	py.test -x test

remotes:
	./cacher

dist: clean remotes test
	python setup.py sdist

release: dist pypi

pypi: test
	python setup.py sdist upload
