"""
Test so-called "friendly" uris: links to tiddlers
in the current space from the root.
"""


from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2

from tiddlyweb.model.tiddler import Tiddler


def setup_module(module):
    make_test_env(module)
    # we have to have a function that returns the callable,
    # Selector just _is_ the callable
    make_fake_space(module.store, 'cdent')
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)


def teardown_module(module):
    import os
    os.chdir('..')


def test_space_link():
    tiddler = Tiddler('HouseHold', 'cdent_public')
    store.put(tiddler)
    http = httplib2.Http()
    urls = [
        ('http://cdent.0.0.0.0:8080/recipes/cdent_public/tiddlers/HouseHold',
            '"/#%5B%5BHouseHold%5D%5D"'),
        ('http://cdent.0.0.0.0:8080/bags/cdent_public/tiddlers/HouseHold',
            '"http://cdent.0.0.0.0:8080/#%5B%5BHouseHold%5D%5D"'),
        ('http://cdent.0.0.0.0:8080/HouseHold',
            '"/#%5B%5BHouseHold%5D%5D"'),
        ('http://0.0.0.0:8080/bags/cdent_public/tiddlers/HouseHold',
            '"http://cdent.0.0.0.0:8080/#%5B%5BHouseHold%5D%5D"'),
        ]
    for url, expected in urls:
        response, content = http.request(url, method='GET')
        assert response['status'] == '200'
        assert expected in content, content

    url = 'http://0.0.0.0:8080/bags/tiddlyspace/tiddlers/Backstage'
    response, content = http.request(url, method='GET')
    assert response['status'] == '200'
    assert '/#%5B%5BBackstage%5D%5D' not in content, content
