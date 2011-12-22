
from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlywebplugins.utils import get_store
from tiddlyweb.config import config
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.user import User

def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)

    module.http = httplib2.Http()

    make_fake_space(module.store, 'cdent')
    module.store.put(User('cdent'))

def teardown_module(module):
    import os
    os.chdir('..')

def test_for_meta():
    response, content = http.request('http://0.0.0.0:8080/.well-known/host-meta')
    assert response['status'] == '200'
    assert 'rel="lrdd" template="http://0.0.0.0:8080/webfinger?q={uri}"' in content

    response, content = http.request('http://cdent.0.0.0.0:8080/.well-known/host-meta')
    assert response['status'] == '404'
    assert 'No host-meta at this host:' in content

def test_get_webfinger():
    response, content = http.request('http://0.0.0.0:8080/webfinger?q=cdent@0.0.0.0:8080')
    response2, content2 = http.request('http://0.0.0.0:8080/webfinger?q=acct:cdent@0.0.0.0:8080')

    assert response['status'] == response2['status']
    assert content == content2

    assert response['status'] == '200'
    assert '<Alias>http://0.0.0.0:8080/profiles/cdent</Alias>' in content
    assert 'href="http://0.0.0.0:8080/profiles/cdent"' in content
    assert 'href="http://0.0.0.0:8080/profiles/cdent.atom"' in content

    response, content = http.request('http://cdent.0.0.0.0:8080/webfinger?q=cdent@0.0.0.0:8080')
    assert response['status'] == '404'
    assert 'No webfinger at this host:' in content

    response, content = http.request('http://0.0.0.0:8080/webfinger')
    assert response['status'] == '400'
    assert 'No account provided to webfinger query' in content


def test_get_profile_html():
    response, content = http.request('http://0.0.0.0:8080/profiles/cdent')
    # the lack of a profile tiddler indicates you don't want to
    # participate
    assert response['status'] == '404', content

    tiddler = Tiddler('profile', 'cdent_public')
    tiddler.text = '!Hello There'
    tiddler.modifier = 'cdent'
    store.put(tiddler)

    response, content = http.request('http://0.0.0.0:8080/profiles/cdent')
    assert response['status'] == '200', content

    assert 'Hello There' in content
    assert '/cdent_public/tiddlers/profile' in content

    response, content = http.request('http://cdent.0.0.0.0:8080/profiles/cdent')
    assert response['status'] == '404', content
    assert 'No profiles at this host' in content

    response, content = http.request('http://0.0.0.0:8080/profiles/notexist')
    assert response['status'] == '404', content
    assert 'Profile not found for notexist' in content

def test_get_profile_atom():
    response, content = http.request('http://0.0.0.0:8080/profiles/cdent',
            headers={'Accept': 'application/atom+xml'})
    assert response['status'] == '200'

    assert 'Hello There' in content
    assert 'href="http://cdent.0.0.0.0:8080/bags/cdent_public/tiddlers/profile" rel="alternate"' in content

def test_get_profile_atom_format():
    response, content = http.request('http://0.0.0.0:8080/profiles/cdent.atom')
    assert response['status'] == '200'

    assert 'Hello There' in content
    assert 'href="http://cdent.0.0.0.0:8080/bags/cdent_public/tiddlers/profile" rel="alternate"' in content

def test_get_profile_json():
    response, content = http.request('http://0.0.0.0:8080/profiles/cdent',
            headers={'Accept': 'application/json'})
    assert response['status'] == '415', content

def test_vcard():
    response, content = http.request('http://0.0.0.0:8080/profiles/cdent')
    assert response['status'] == '200'

    assert '<h1 id="hcard-cdent" class="vcard"' in content
    assert 'src="/recipes/cdent_public/tiddlers/SiteIcon" alt="avatar" class="photo"' in content
    assert '<a href="http://cdent.0.0.0.0:8080/" class="fn url">cdent</a>' in content


