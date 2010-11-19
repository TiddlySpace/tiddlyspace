"""
serializations using TiddlyWiki beta or nightly builds
"""

from tiddlywebwiki.serialization import Serialization as WikiSerialization


class Serialization(WikiSerialization):

    def _get_wiki(self):
        return _read_file(
                self.environ['tiddlyweb.config']['base_tiddlywiki_beta'])


def _read_file(path):
    f = open(path)
    contents = f.read()
    f.close()
    return unicode(contents, 'utf-8')
