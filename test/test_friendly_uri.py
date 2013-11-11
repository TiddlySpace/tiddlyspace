"""
Test so-called "friendly" uris: links to tiddlers
in the current space from the root.
"""


from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlyweb.model.tiddler import Tiddler


def setup_module(module):
    make_test_env(module)
    # we have to have a function that returns the callable,
    # Selector just _is_ the callable
    make_fake_space(module.store, 'cdent')
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)


def test_friendly():
    tiddler = Tiddler('HouseHold', 'cdent_public')
    store.put(tiddler)
    http = httplib2.Http()
    response, content_core = http.request(
            'http://cdent.0.0.0.0:8080/recipes/cdent_public/tiddlers/HouseHold',
            method='GET')
        
    assert response['status'] == '200', content_core

    response, content_friendly = http.request(
            'http://cdent.0.0.0.0:8080/HouseHold',
            method='GET')
    assert response['status'] == '200', content_friendly
    assert 'text/html' in response['content-type']
    assert 'href="/#%5B%5BHouseHold%5D%5D"' in content_friendly

    response, content_friendly = http.request(
            'http://0.0.0.0:8080/HouseHold',
            method='GET')
    assert response['status'] == '404', content_friendly

def test_friendly_encoded():
    tiddler = Tiddler('House Hold', 'cdent_public')
    store.put(tiddler)
    http = httplib2.Http()
    response, content_friendly = http.request(
            'http://cdent.0.0.0.0:8080/House%20Hold',
            method='GET')
    assert response['status'] == '200', content_friendly
    assert 'text/html' in response['content-type']
    assert 'href="/#%5B%5BHouse%20Hold%5D%5D"' in content_friendly

def test_markdown_support():
    tiddler = Tiddler('Markdown Test', 'cdent_public')
    tiddler.text = '_No Way_'
    tiddler.type = 'text/x-markdown'
    store.put(tiddler)
    http = httplib2.Http()
    response, content = http.request(
            'http://cdent.0.0.0.0:8080/Markdown%20Test',
            method='GET')
    assert response['status'] == '200', content
    assert 'text/html' in response['content-type']
    assert '<em>No Way</em>' in content

def test_tiddlywikitext_support():
    tiddler = Tiddler('TiddlyWiki Test', 'cdent_public')
    tiddler.text = '//No Way//'
    store.put(tiddler)
    http = httplib2.Http()
    response, content = http.request(
            'http://cdent.0.0.0.0:8080/TiddlyWiki%20Test',
            method='GET')
    assert response['status'] == '200', content
    assert 'text/html' in response['content-type']
    assert '<i class="">No Way</i>' in content

    # set the type
    tiddler = Tiddler('TiddlyWiki Test', 'cdent_public')
    tiddler.text = '//No Way//'
    tiddler.type = 'text/x-tiddlywiki'
    store.put(tiddler)
    http = httplib2.Http()
    response, content = http.request(
            'http://cdent.0.0.0.0:8080/TiddlyWiki%20Test',
            method='GET')
    assert response['status'] == '200', content
    assert 'text/html' in response['content-type']
    assert '<i class="">No Way</i>' in content

def test_root_tiddlers():
    http = httplib2.Http()
    response, content = http.request(
            'http://cdent.0.0.0.0:8080/tiddlers.wiki',
            method='GET')
    assert response['status'] == '200', content
    assert 'Jeremy Ruston' in content

    response, content = http.request(
            'http://cdent.0.0.0.0:8080/tiddlers',
            method='GET')
    assert response['status'] == '200', content
    assert '/HouseHold">HouseHold' in content, content
    assert '/BinaryTiddlersPlugin">BinaryTiddlersPlugin' not in content

def test_root_tiddlers_filter():
    """
    Test filtering the in space tiddlers.

    TiddlyWiki Test
    Markdown Test
    House Hold
    HouseHold
    SiteInfo
    GettingStarted
    """
    http = httplib2.Http()

    response, content = http.request(
            'http://cdent.0.0.0.0:8080/tiddlers.json',
            method='GET')
    assert response['status'] == '200', content
    tiddlers = simplejson.loads(content)
    assert len(tiddlers) == 6, tiddlers

    response, content = http.request(
            'http://cdent.0.0.0.0:8080/tiddlers.json?limit=4',
            method='GET')
    assert response['status'] == '200', content
    tiddlers = simplejson.loads(content)
    assert len(tiddlers) == 4, tiddlers

    response, content = http.request(
            'http://cdent.0.0.0.0:8080/tiddlers.json',
            method='GET')
    assert response['status'] == '200', content
    tiddlers = simplejson.loads(content)
    last_tiddler = tiddlers[-1]

    response, content = http.request(
            'http://cdent.0.0.0.0:8080/tiddlers.json?sort=modified',
            method='GET')
    assert response['status'] == '200', content
    tiddlers = simplejson.loads(content)
    first_tiddler = tiddlers[0]

    assert first_tiddler['title'] == last_tiddler['title']


def test_open_graph():
    """
    Make sure the open graph stuff is present in the right places.
    """
    http = httplib2.Http()
    tiddler = Tiddler('Open Graph', 'cdent_public')
    tiddler.text = 'I am the text'
    tiddler.modifier = 'cdent'
    tiddler.tags = ['alpha', 'beta', 'cat dog']
    store.put(tiddler)

    response, content = http.request('http://cdent.0.0.0.0:8080/Open%20Graph')
    assert response['status'] == '200'
    assert '<html prefix="og: http://ogp.me/ns#' in content
    assert '<meta property="og:title" content="Open Graph" />' in content
    assert '<meta property="og:url" content="http://cdent.0.0.0.0:8080/Open%20Graph" />' in content
    assert '<meta property="og:image" content="http://cdent.0.0.0.0:8080/SiteIcon" />' in content
    assert '<meta property="article:tag" content="alpha" />' in content
    assert '<meta property="article:modified_time"' in content
    assert '<meta property="article:published_time"' in content
    assert '<meta property="article:author"' in content
    assert '<meta property="og:site_name" content="TiddlySpace" />' in content

    response, content = http.request(
            'http://cdent.0.0.0.0:8080/bags/cdent_public/tiddlers/Open%20Graph')
    assert response['status'] == '200'
    assert '<html>' in content
    assert '<html prefix>' not in content

    # clean1 frields gets ogp too
    tiddler = Tiddler('ServerSettings', 'cdent_public')
    tiddler.text = 'htmltemplate: clean1\n'
    store.put(tiddler)
    response, content = http.request('http://cdent.0.0.0.0:8080/Open%20Graph')
    assert response['status'] == '200'
    assert '<html prefix="og: http://ogp.me/ns#' in content
