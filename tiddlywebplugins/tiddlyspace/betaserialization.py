"""
extend TiddlyWiki serialization to optionally use beta or externalized
releases

activated via "twrelease=beta" URL parameter
"""


import logging

from tiddlyweb.control import filter_tiddlers
from tiddlyweb.util import read_utf8_file

from tiddlywebwiki.serialization import Serialization as WikiSerialization

from tiddlywebplugins.tiddlyspace.space import Space

def build_config_var(alpha=False, beta=False, external=False):
    base = 'base_tiddlywiki'
    if external:
        base += '_external'
    if beta:
        base += '_beta'
    elif alpha:
        base += '_alpha'
    return base


class Serialization(WikiSerialization):

    def list_tiddlers(self, tiddlers):
        """
        Push out a wiki. Filter out the system- bags, if we are
        download only.
        """
        download = self.environ.get('tiddlyweb.query', {}).get(
                'download', [False])[0]
        if download:
            filter_string = ';'.join(
                    ['select=bag:!%s' % bag for bag, _ in Space.CORE_RECIPE if
                        bag.endswith('_public')])
            tiddlers = filter_tiddlers(tiddlers, filter_string,
                    environ=self.environ)
        return self._put_tiddlers_in_tiddlywiki(tiddlers)

    def _get_wiki(self):
        alpha = beta = external = False

        release = self.environ.get('tiddlyweb.query', {}).get(
                'twrelease', [False])[0]
        externalize = self.environ.get('tiddlyweb.query', {}).get(
                'external', [False])[0]
        download = self.environ.get('tiddlyweb.query', {}).get(
                'download', [False])[0]

        if release == 'beta':
            beta = True
        if release == 'alpha':
            alpha = True
        if externalize:
            external = True

        # If somebody is downloading, don't allow them to
        # externalize.
        if download:
            external = False

        wiki = None
        if alpha or beta or external:
            config_var = build_config_var(alpha, beta, external)
            logging.debug('looking for %s', config_var)
            file = self.environ.get('tiddlyweb.config', {}).get(config_var, '')
            if file:
                logging.debug('using %s as base_tiddlywiki', file)
                wiki = read_utf8_file(file)
        if not wiki:
            wiki = WikiSerialization._get_wiki(self)
        tag = "<!--POST-SCRIPT-START-->"
        if not download:
            wiki = wiki.replace(tag,
'''<script type="text/javascript" src="/bags/common/tiddlers/backstage.js"></script>
%s''' % tag)
        return wiki
