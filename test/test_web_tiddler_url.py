"""
Watch out for presentation bugs with bags that are not
considered valid.
"""

from tiddlywebplugins.tiddlyspace.fixups import web_tiddler_url
from tiddlyweb.model.tiddler import Tiddler

ENVIRON = {
        'tiddlyweb.config': {
            'server_host': {
                'host': 'tiddlyspace.com',
                'port': '80',
            }
        },
        'HTTP_HOST': 'tapas.tiddlyspace.com',
        'wsgi.url_scheme': 'http'
}

def test_space_bag():
    tiddler = Tiddler('monkey', 'tapas_public')

    uri = web_tiddler_url(ENVIRON, tiddler)

    assert uri == 'http://tapas.tiddlyspace.com/bags/tapas_public/tiddlers/monkey'

def test_nonspace_bag():
    tiddler = Tiddler('monkey', 'tapas_extra')
    uri = web_tiddler_url(ENVIRON, tiddler)

    assert uri == 'http://tiddlyspace.com/bags/tapas_extra/tiddlers/monkey'

def test_core_bag():
    tiddler = Tiddler('monkey', 'common')
    uri = web_tiddler_url(ENVIRON, tiddler)

    assert uri == 'http://tiddlyspace.com/bags/common/tiddlers/monkey'
