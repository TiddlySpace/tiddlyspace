import pytest

from test.fixtures import make_test_env, make_fake_space, get_auth

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlywebplugins.templates import rfc3339, format_modified

from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.web.util import encode_name


def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('thing.0.0.0.0', 8080, app_fn)

    make_fake_space(store, 'thing')
    tiddler = Tiddler('ServerSettings', 'thing_public')
    tiddler.text = 'htmltemplate: clean1\n'
    store.put(tiddler)

    tiddler = Tiddler('TestMe', 'thing_public')
    tiddler.text = '# Hi\n\n# one\n# two'
    tiddler.tags = ['alpha', 'beta', '12th monkey']
    store.put(tiddler)

    module.tiddler_modified = tiddler.modified
    
    module.http = httplib2.Http()


def test_clean1_present():
    match_tiddlers('clean1 template')


def test_clean1_no_core():
    match_tiddlers('TiddlyWebAdaptors', neg=True)


def test_tiddler_modified():
    rfc_time = rfc3339(tiddler_modified)
    http_time = format_modified(tiddler_modified)
    match_tiddler('TestMe', '<time class="modified" datetime="%s">%s</time>'
            % (rfc_time, http_time))


def test_tag_list():
    match_tiddler('TestMe', '<ul class="tags">')

    tiddler = Tiddler('TestMe2', 'thing_public')
    tiddler.text = '# Hi\n\n# one\n# two'
    store.put(tiddler)

    match_tiddler('TestMe2', '<ul class="tags">', neg=True)


def match_tiddler(title, match_string, neg=False):
    response, content = http.request('http://thing.0.0.0.0:8080/%s' % (
        encode_name(title)), method='GET')

    assert response['status'] == '200'
    if neg:
        assert match_string not in content
    else:
        assert match_string in content



def match_tiddlers(match_string, neg=False):
    response, content = http.request('http://thing.0.0.0.0:8080/tiddlers',
            method='GET')

    assert response['status'] == '200'
    if neg:
        assert match_string not in content
    else:
        assert match_string in content
