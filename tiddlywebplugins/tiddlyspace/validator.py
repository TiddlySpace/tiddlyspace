"""
Input validation routines for TiddlySpace.
"""


import Cookie

from tiddlyweb.util import sha
from tiddlyweb.web.validator import TIDDLER_VALIDATORS, InvalidTiddlerError

from tiddlywebplugins.tiddlyspace.web import (determine_host,
        determine_space, determine_space_recipe)


def validate_mapuser(tiddler, environ):
    """
    If a tiddler is put to the MAPUSER bag clear
    out the tiddler and set fields['mapped_user']
    to the current username. There will always be
    a current username because the create policy
    for the bag is set to ANY.
    """
    if tiddler.bag == 'MAPUSER':
        try:
            user_cookie = environ['HTTP_COOKIE']
            cookie = Cookie.SimpleCookie()
            cookie.load(user_cookie)
            cookie_value = cookie['tiddlyweb_secondary_user'].value
            secret = environ['tiddlyweb.config']['secret']
            usersign, cookie_secret = cookie_value.rsplit(':', 1)
        except KeyError:
            raise InvalidTiddlerError('secondary cookie not present')

        if cookie_secret != sha('%s%s' % (usersign, secret)).hexdigest():
            raise InvalidTiddlerError('secondary cookie invalid')

        if usersign != tiddler.title:
            raise InvalidTiddlerError('secondary cookie mismatch')

        store = environ['tiddlyweb.store']
        # XXX this is a potentially expensive operation but let's not
        # early optimize
        if tiddler.title in (user.usersign for user in store.list_users()):
            raise InvalidTiddlerError('username exists')
        tiddler.text = ''
        tiddler.tags = []
        tiddler.fields = {}
        tiddler.fields['mapped_user'] = environ['tiddlyweb.usersign']['name']
    return tiddler


def validate_mapspace(tiddler, environ):
    """
    If a tiddler is put to the MAPSPACE bag clear
    out the tiddler and set fields['mapped_space']
    to the current space.

    Elsewhere in the space the mapped_space can map
    a alien domain to space.
    """
    if tiddler.bag == 'MAPSPACE':
        current_space = determine_space(environ, determine_host(environ)[0])
        recipe_name = determine_space_recipe(environ, current_space)
        if recipe_name != '%s_private' % current_space:
            raise InvalidTiddlerError('non member may not map space')

        tiddler.text = ''
        tiddler.tags = []
        tiddler.fields = {}
        tiddler.fields['mapped_space'] = current_space
    return tiddler


TIDDLER_VALIDATORS.append(validate_mapuser)
TIDDLER_VALIDATORS.append(validate_mapspace)
