
from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from base64 import b64encode

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.user import User

def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('bar.example.com', 8080, app_fn)
    make_fake_space(module.store, 'cdent')
    user = User('cdent')
    user.set_password('cow')
    module.store.put(user)
    module.auth = b64encode('cdent:cow')
    user = User('fnd')
    user.set_password('pig')
    module.store.put(user)
    module.badauth = b64encode('fnd:pig')
    module.http = httplib2.Http()

def teardown_module(module):
    import os
    os.chdir('..')

def test_mapspace_bag_correct():
    bag = store.get(Bag('MAPSPACE'))

    assert bag.name == 'MAPSPACE'
    assert bag.policy.create == ['ANY']
    assert bag.policy.write == ['NONE']

def test_mapspace_validator():
    response, content = http.request(
            'http://cdent.0.0.0.0:8080/bags/MAPSPACE/tiddlers/foo.example.com',
            method='PUT',
            headers={'Content-Type': 'application/json'},
            body='{"text": ""}')

    # cannot create without user
    assert response['status'] == '403'

    # can create with user
    response, content = http.request(
            'http://cdent.0.0.0.0:8080/bags/MAPSPACE/tiddlers/foo.example.com',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Authorization': 'Basic %s' % auth},
            body='{"text": ""}')

    assert response['status'] == '204'

    # cannot write even with user
    response, content = http.request(
            'http://cdent.0.0.0.0:8080/bags/MAPSPACE/tiddlers/foo.example.com',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Authorization': 'Basic %s' % auth},
            body='{"text": ""}')

    assert response['status'] == '403'

    tiddler = store.get(Tiddler('foo.example.com', 'MAPSPACE'))

    assert tiddler.fields['mapped_space'] == 'cdent'

def test_mapspace_non_member():
    response, content = http.request(
            'http://cdent.0.0.0.0:8080/bags/MAPSPACE/tiddlers/bar.example.com',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Authorization': 'Basic %s' % badauth},
            body='{"text": ""}')

    assert response['status'] == '409'
    assert 'non member may not map space'

def test_mapspace_twice():
    response, content = http.request(
            'http://cdent.0.0.0.0:8080/bags/MAPSPACE/tiddlers/bar.example.com',
            method='PUT',
            headers={'Content-Type': 'application/json',
                'Authorization': 'Basic %s' % auth},
            body='{"text": ""}')

    assert response['status'] == '204'
    tiddler = store.get(Tiddler('bar.example.com', 'MAPSPACE'))

    assert tiddler.fields['mapped_space'] == 'cdent'

def test_mapspace_maps():
    response, content = http.request('http://cdent.0.0.0.0:8080/bags.json')

    assert response['status'] == '200', content
    info = simplejson.loads(content)
    assert 'cdent_public' in info

    response, content = http.request('http://bar.example.com:8080/bags.json')

    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert 'cdent_public' in info

