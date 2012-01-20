"""
Override behaviors from other modules.
"""

import tiddlyweb.web.util
from tiddlyweb.web.http import HTTP404
import tiddlywebplugins.status

from tiddlywebplugins.tiddlyspace.space import Space
from tiddlywebplugins.tiddlyspace.web import (determine_host,
        determine_space, determine_space_recipe)

from tiddlyweb.model.user import User
from tiddlyweb.store import NoUserError


original_tiddler_url = tiddlyweb.web.util.tiddler_url
original_gather_data = tiddlywebplugins.status._gather_data


def _status_gather_data(environ):
    """
    Monkey patch twp.status to add additional information
    specific to TiddlySpace.
    """
    data = original_gather_data(environ)
    data['server_host'] = environ['tiddlyweb.config']['server_host']
    data['tiddlyspace_version'] = environ['tiddlyweb.config'][
            'tiddlyspace.version']

    # gather space data
    http_host, host_url = determine_host(environ)
    if http_host != host_url:
        space_name = determine_space(environ, http_host)
        try:
            recipe_name = determine_space_recipe(environ, space_name)
            data['space'] = {'name': space_name, 'recipe': recipe_name}
        except HTTP404:
            pass

    # ensure user is known
    usersign = environ['tiddlyweb.usersign']['name']
    store = environ['tiddlyweb.store']
    try:
        store.get(User(usersign))
    except NoUserError:
        data['username'] = 'GUEST'
        if usersign != 'GUEST':
            data['identity'] = usersign
    return data


tiddlywebplugins.status._gather_data = _status_gather_data


def web_tiddler_url(environ, tiddler, container='bags', full=True):
    """
    Override default tiddler_url to be space+host aware.

    If the bag or recipe of the tiddler is of a space, switch to
    that space's host for the duration of uri creation.

    Do this all the time, so that we get the right URIs even
    when working around ControlView.

    If the bag does not fit in a space, then make is URI be at
    the server_host domain. If/when auxbags are made to work this
    will need to be reviewed.
    """
    if '_canonical_uri' in tiddler.fields:
        return tiddler.fields['_canonical_uri']

    saved_host = environ.get('HTTP_HOST', '')
    try:
        if container == 'recipes':
            space_name = Space.name_from_recipe(tiddler.recipe)
        else:
            space_name = Space.name_from_bag(tiddler.bag)
        space_name = space_name + '.'
    except ValueError, exc:
        space_name = ''

    host = environ['tiddlyweb.config']['server_host']['host']
    port = environ['tiddlyweb.config']['server_host']['port']
    if port is '443' or port is '80':
        port = ''
    else:
        port = ':%s' % port
    environ['HTTP_HOST'] = '%s%s%s' % (space_name.encode('utf-8'),
        host, port)

    url = original_tiddler_url(environ, tiddler, container, full)
    if saved_host:
        environ['HTTP_HOST'] = saved_host
    elif 'HTTP_HOST' in environ:
        del environ['HTTP_HOST']
    return url


tiddlyweb.web.util.tiddler_url = web_tiddler_url
