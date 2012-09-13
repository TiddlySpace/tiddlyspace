"""
Test the search interface.
"""
from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlyweb.model.user import User
from tiddlyweb.model.tiddler import Tiddler


def setup_module(module):
    make_test_env(module, hsearch=True)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('fnd.0.0.0.0', 8080, app_fn)
    make_fake_space(module.store, 'cdent')
    make_fake_space(module.store, 'fnd')
    user = User('cdent')
    user.set_password('cow')
    module.store.put(user)
    module.http = httplib2.Http()


def teardown_module(module):
    import os
    os.chdir('..')

def test_basic_search():
    response, content = http.request(
            'http://0.0.0.0:8080/search.json?q=title:TiddlyWebAdaptor')
    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert info[0]['title'] == 'TiddlyWebAdaptor'

def test_wildcard_search():
    response, content = http.request(
            'http://0.0.0.0:8080/search.json?q=ftitle:TiddlyWebA*')
    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert info[0]['title'] == 'TiddlyWebAdaptor'

def test_multiword_phrase_search():
    tiddler = Tiddler('one', 'cdent_public')
    tiddler.text = 'monkeys are fun!'
    store.put(tiddler)
    tiddler = Tiddler('one two', 'cdent_public')
    tiddler.text = 'monkeys are fun!'
    store.put(tiddler)
    tiddler = Tiddler('one two three', 'cdent_public')
    tiddler.text = 'monkeys are fun!'
    store.put(tiddler)
    tiddler = Tiddler('three two one', 'cdent_public')
    tiddler.text = 'monkeys are fun!'
    store.put(tiddler)

    response, content = http.request(
            'http://0.0.0.0:8080/search.json?q=ftitle:one')
    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert len(info) == 1, info

    response, content = http.request(
            'http://0.0.0.0:8080/search.json?q=ftitle:one%20two')
    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert len(info) == 0, info

    response, content = http.request(
            'http://0.0.0.0:8080/search.json?q=ftitle:one%20two%20three')
    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert len(info) == 0, info

    response, content = http.request(
            'http://0.0.0.0:8080/search.json?q=ftitle:%22one%20two%20three%22')
    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert len(info) == 1, info

def test_multibag_search():
    tiddler = Tiddler('one two', 'fnd_public')
    tiddler.text = 'monkeys are not fun!'
    store.put(tiddler)

    response, content = http.request(
            'http://0.0.0.0:8080/search.json?q=ftitle:%22one%20two%22%20fbag:cdent_public')
    info = simplejson.loads(content)
    assert len(info) == 1, info
    assert info[0]['bag'] == 'cdent_public', info

    response, content = http.request(
            'http://0.0.0.0:8080/search.json?q=ftitle:%22one%20two%22%20(fbag:cdent_public%20OR%20fbag:fnd_public)')
    info = simplejson.loads(content)
    assert len(info) == 2, info

def test_cased_search():
    tiddler = Tiddler('One Two', 'fnd_public')
    tiddler.text = 'monkeys are not fun!'
    store.put(tiddler)

    response, content = http.request(
            'http://0.0.0.0:8080/search.json?q=ftitle:%22one%20two%22%20fbag:fnd_public')
    info = simplejson.loads(content)
    assert len(info) == 1, info # don't get the new tiddler because of case

def test_search_no_args():
    """a no args search is like recent changes, this test confirms
    controlview"""
    response, content = http.request('http://0.0.0.0:8080/search.json')
    # a search with no query string is invalid
    assert response['status'] == '400'

    response, content = http.request('http://0.0.0.0:8080/search.json?q=_limit:999')
    assert response['status'] == '200'
    allinfo = simplejson.loads(content)
    assert len(allinfo) == 168

    response, content = http.request('http://fnd.0.0.0.0:8080/search.json')
    assert response['status'] == '200'
    fndinfo = simplejson.loads(content)
    assert len(fndinfo) == 20

    response, content = http.request('http://fnd.0.0.0.0:8080/search.json?q=_limit:999')
    assert response['status'] == '200'
    fndinfo = simplejson.loads(content)
    assert len(fndinfo) == 149

    assert len(allinfo) > len(fndinfo)

def test_hsearch():
    response, content = http.request('http://0.0.0.0:8080/hsearch.json?q=monkeys')

    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert len(info) == 6, len(info)

    response, content = http.request('http://0.0.0.0:8080/hsearch.json?q=bag:cdent_public%20monkeys')

    assert response['status'] == '200'
    info = simplejson.loads(content)
    assert len(info) == 4, len(info)

def test_search_html():
    response, content = http.request('http://0.0.0.0:8080/search?q=monkeys')

    assert response['status'] == '200', content

    assert 'http://fnd.0.0.0.0:8080/One%20Two' in content
    assert 'http://cdent.0.0.0.0:8080/three%20two%20one' in content

    assert '<a class="space" href="http://fnd.0.0.0.0:8080/">' in content

    assert '<img alt="space icon" src="http://fnd.0.0.0.0:8080/SiteIcon"/>' in content

    tiddler = store.get(Tiddler('One Two', 'fnd_public'))
    tiddler.modifier = 'cowboy'
    store.put(tiddler)

    response, content = http.request('http://0.0.0.0:8080/search?q=monkeys')
    assert response['status'] == '200', content
    assert '<a class="modifier" href="http://fnd.0.0.0.0:8080/">' not in content
    assert '<a class="modifier" href="http://cowboy.0.0.0.0:8080/">' in content
    # tiddlers that do not come from a space should show the default tiddlyspace site icon.
    tiddler = Tiddler('commoner', 'common')
    tiddler.text = 'I want to live like common people.'
    store.put(tiddler)

    response, content = http.request('http://0.0.0.0:8080/search?q=title:commoner')
    assert response['status'] == '200', content
    assert '<img alt="space icon" src="http://0.0.0.0:8080/SiteIcon"/>' in content
