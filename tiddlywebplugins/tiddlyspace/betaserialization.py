"""
extend TiddlyWiki serialization to optionally use alpha, beta or
externalized releases and add the UniversalBackstage.

activated via "twrelease=beta" URL parameter, see build_config_var
"""


import logging

from tiddlyweb.util import read_utf8_file

from tiddlywebwiki.serialization import Serialization as WikiSerialization


def build_config_var(alpha=False, beta=False, external=False):
    """
    Create the configuration key which will be used to locate
    the base tiddlywiki file.
    """
    base = 'base_tiddlywiki'
    if external:
        base += '_external'
    if beta:
        base += '_beta'
    elif alpha:
        base += '_alpha'
    return base


class Serialization(WikiSerialization):
    """
    Subclass of the standard TiddlyWiki serialization to allow
    choosing other, alpha, beta or externalized versions of
    the base empty.html in which the tiddlers will be servered.

    Also, if the TiddlyWiki is not being downloaded, add
    the UniversalBackstage by injecting a script tag.
    """
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
            base_wiki_file = self.environ.get('tiddlyweb.config',
                    {}).get(config_var, '')
            if base_wiki_file:
                logging.debug('using %s as base_tiddlywiki', base_wiki_file)
                wiki = read_utf8_file(base_wiki_file)
        if not wiki:
            wiki = WikiSerialization._get_wiki(self)
        tag = "<!--POST-SCRIPT-START-->"
        if not download:
            wiki = wiki.replace(tag,
'''<script type="text/javascript" src="/bags/common/tiddlers/backstage.js"></script>
%s''' % tag)
        return wiki
