"""
Override behaviors from other modules.
"""

import tiddlyweb.web.util

from tiddlywebplugins.tiddlyspace.space import Space



original_tiddler_url = tiddlyweb.web.util.tiddler_url


def web_tiddler_url(environ, tiddler, container='bags', full=True):
    """
    Override default tiddler_url to be space+host aware.

    If the bag or recipe of the tiddler is of a space, switch to
    that space's host for the duration of uri creation.

    Do this all the time, so that we get the right URIs even
    when working around ControlView.
    """
    if '_canonical_uri' in tiddler.fields:
        return tiddler.fields['_canonical_uri']

    saved_host = environ.get('HTTP_HOST', '')
    try:
        if container == 'recipes':
            space_name = Space.name_from_recipe(tiddler.recipe)
        else:
            space_name = Space.name_from_bag(tiddler.bag)

        host = environ['tiddlyweb.config']['server_host']['host']
        port = environ['tiddlyweb.config']['server_host']['port']
        if port is '443' or port is '80':
            port = ''
        else:
            port = ':%s' % port
        environ['HTTP_HOST'] = '%s.%s%s' % (space_name.encode('utf-8'),
            host, port)
    except ValueError:
        pass
    url = original_tiddler_url(environ, tiddler, container, full)
    if saved_host:
        environ['HTTP_HOST'] = saved_host
    elif 'HTTP_HOST' in environ:
        del environ['HTTP_HOST']
    return url


tiddlyweb.web.util.tiddler_url = web_tiddler_url
