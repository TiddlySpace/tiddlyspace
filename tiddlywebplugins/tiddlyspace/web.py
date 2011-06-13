"""
Web related utility functions.
"""

from tiddlyweb.model.policy import PermissionsError
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.store import StoreError
from tiddlyweb.web.http import HTTP404

from tiddlywebplugins.tiddlyspace.space import Space


def determine_host(environ):
    """
    Extract the current HTTP host from the environment.
    Return that plus the server_host from config. This is
    used to help calculate what space we are in when HTTP
    requests are made.
    """
    server_host = environ['tiddlyweb.config']['server_host']
    port = int(server_host['port'])
    if port == 80 or port == 443:
        host_url = server_host['host']
    else:
        host_url = '%s:%s' % (server_host['host'], port)

    http_host = environ.get('HTTP_HOST', host_url)
    if ':' in http_host:
        for port in [':80', ':443']:
            if http_host.endswith(port):
                http_host = http_host.replace(port, '')
                break
    return http_host, host_url


def determine_space(environ, http_host):
    """
    Calculate the space associated with a subdomain.
    """
    server_host = environ['tiddlyweb.config']['server_host']['host']
    if '.%s' % server_host in http_host:
        return http_host.rsplit('.', server_host.count('.') + 1)[0]
    else:
        if ':' in http_host:
            http_host = http_host.split(':', 1)[0]
        store = environ['tiddlyweb.store']
        tiddler = Tiddler(http_host, 'MAPSPACE')
        try:
            tiddler = store.get(tiddler)
            return tiddler.fields['mapped_space']
        except (KeyError, StoreError):
            pass
    return None


def determine_space_recipe(environ, space_name):
    """
    Given a space name, check if the current user is a member of that
    named space. If so, use the private recipe.
    """
    store = environ['tiddlyweb.store']
    usersign = environ['tiddlyweb.usersign']
    try:
        space = Space(space_name)
        recipe = Recipe(space.public_recipe())
        recipe = store.get(recipe)
    except (ValueError, StoreError), exc:
        raise HTTP404('Space for %s does not exist: %s' % (space_name, exc))

    try:
        recipe.policy.allows(usersign, 'manage')
        space_type = 'private'
    except PermissionsError:
        space_type = 'public'

    recipe_name_method = getattr(space, '%s_recipe' % space_type)
    recipe_name = recipe_name_method()
    return recipe_name
