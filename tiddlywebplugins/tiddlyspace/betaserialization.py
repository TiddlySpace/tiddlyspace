"""
extend TiddlyWiki serialization to optionally use beta release

activated via "twrelease=beta" URL parameter
"""

from tiddlywebwiki.serialization import Serialization as WikiSerialization


class Serialization(WikiSerialization):

    def _get_wiki(self):
        release = self.environ.get('tiddlyweb.query', {}).get(
                'twrelease', [False])[0]
        if release == 'beta':
            return _read_file(
                    self.environ['tiddlyweb.config']['base_tiddlywiki_beta'])
        else:
            return WikiSerialization._get_wiki(self) # XXX: inelegant?


def _read_file(path):
    f = open(path)
    contents = f.read()
    f.close()
    return unicode(contents, 'utf-8')
