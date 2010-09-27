"""
Test so-called "friendly" uris: links to tiddlers
in the current space from the root.
"""

from fixtures import make_test_env

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.bag import Bag


def setup_module(module):
    make_test_env(module)
    # we have to have a function that returns the callable,
    # Selector just _is_ the callable
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    module.http = httplib2.Http()


def teardown_module(module):
    import os
    os.chdir('..')


def test_hash():
    bag = Bag('one')
    store.put(bag)
    tiddler = Tiddler('hi', 'one')
    tiddler.text = 'fancy'
    store.put(tiddler)

    tiddler = store.get(tiddler)

    assert '_hash' in tiddler.fields

    response, content = http.request('http://0.0.0.0:8080/bags/one/tiddlers/hi.json',
            method='GET')
    assert response['status'] == '200'
    
    info = simplejson.loads(content)
    assert info['fields']['_hash'] == tiddler.fields['_hash']

    info['text'] = 'not fancy'
    body = simplejson.dumps(info)

    response, content = http.request('http://0.0.0.0:8080/bags/one/tiddlers/hi',
            headers={'Content-type': 'application/json'},
            body=body,
            method='PUT')
    assert response['status'] == '204'

    tiddler = Tiddler('hi', 'one')
    tiddler = store.get(tiddler)

    assert tiddler.text == info['text']
    assert tiddler.fields['_hash'] != info['fields']['_hash']
