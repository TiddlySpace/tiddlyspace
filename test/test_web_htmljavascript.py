import pytest

from test.fixtures import make_test_env, make_fake_space, get_auth

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import simplejson

from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.web.util import encode_name


def setup_module(module):
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('thing.0.0.0.0', 8080, app_fn)

    make_fake_space(store, 'thing')
    module.http = httplib2.Http()

    tiddler = Tiddler('OhHi', 'thing_public')
    tiddler.text = '!Hi\n'
    store.put(tiddler)


def test_nohtmljavascript():
    response, content = http.request('http://thing.0.0.0.0:8080/OhHi')

    assert response['status'] == '200'
    assert 'OhHi' in content
    assert '<script src="/bags/common/tiddlers/jquery.js"></script>' in content
    assert '<script src="/bags/common/tiddlers/_reply-loader.js"></script>' in content
    assert '<script src="/bags/common/tiddlers/backstage.js"></script>' in content
    assert 'src="/foo.js"' not in content
    assert 'src="/bar.js"' not in content


def test_htmljavascript_adds():
    tiddler = Tiddler('HtmlJavascript', 'thing_public')
    tiddler.text = '/foo.js\n/bar.js'
    store.put(tiddler)

    response, content = http.request('http://thing.0.0.0.0:8080/OhHi')

    assert response['status'] == '200'
    assert 'OhHi' in content
    assert '<script src="/bags/common/tiddlers/jquery.js"></script>' in content
    assert '<script src="/bags/common/tiddlers/_reply-loader.js"></script>' in content
    assert '<script src="/bags/common/tiddlers/backstage.js"></script>' in content
    assert 'src="/foo.js"></script>' in content
    assert 'src="/bar.js"></script>' in content

def test_empty_htmljavascript_no_add():
    tiddler = Tiddler('HtmlJavascript', 'thing_public')
    tiddler.text = ' \n\n'
    store.put(tiddler)

    response, content = http.request('http://thing.0.0.0.0:8080/OhHi')

    assert response['status'] == '200'
    assert 'OhHi' in content
    assert '<script src="/bags/common/tiddlers/jquery.js"></script>' in content
    assert '<script src="/bags/common/tiddlers/_reply-loader.js"></script>' in content
    assert '<script src="/bags/common/tiddlers/backstage.js"></script>' in content
    assert 'src="/foo.js"></script>' not in content
    assert 'src="/bar.js"></script>' not in content
    assert 'src=""></script>' not in content
