"""
Input validation routines for TiddlySpace.
"""


import Cookie

from tiddlyweb.util import sha
from tiddlyweb.web.validator import TIDDLER_VALIDATORS, InvalidTiddlerError
from tiddlyweb.store import NoTiddlerError
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.web.http import HTTP400

# XXX: importing private members, so they should probably not be private
from tiddlywebplugins.tiddlyspace.handler import (_determine_host,
        _determine_space, _determine_space_recipe)

class InvalidNonceError(Exception):
    pass

class CsrfProtector(object):
    """
    check for a nonce value if we are POSTing form data
    reject if it doesn't match
    """
    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):
        def app():
            output = self.application(environ, start_response)
            return output
        if environ['REQUEST_METHOD'] != 'POST':
            return app()
        if environ['tiddlyweb.usersign']['name'] == 'GUEST':
            return app()
        if environ['tiddlyweb.type'] not in [
                'application/x-www-form-urlencoded',
                'multipart/form-data']:
            return app()
        store = environ['tiddlyweb.store']
        space = environ['tiddlyweb.usersign']['name']
        form = environ['tiddlyweb.query']
        nonce = form.pop('nonce', [''])[0]
        try:
            self.check_csrf(store, space, nonce)
        except InvalidNonceError, exc:
            raise HTTP400(exc)

        return app()

    def check_csrf(self, store, space, nonce):
        """
        Check to ensure that the incoming request isn't a csrf attack.
        Do this by expecting a nonce value that corresponds to a random hash
        in a tiddler in the private bag of a space.

        Returns True
        """
        if not nonce:
            raise InvalidNonceError('No nonce supplied')

        tiddler = Tiddler('nonce') #TODO: change this name to something else
        tiddler.bag = '%s_private' % space
        try:
            tiddler = store.get(tiddler)
        except NoTiddlerError:
            raise InvalidNonceError('No nonce found in %s space' % space)

        try:
            assert tiddler.fields['nonce'] == nonce
        except AssertionError:
            raise InvalidNonceError('Nonce doesn\'t match')

        return True


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
        current_space = _determine_space(environ, _determine_host(environ)[0])
        recipe_name = _determine_space_recipe(environ, current_space)
        if recipe_name != '%s_private' % current_space:
            raise InvalidTiddlerError('non member may not map space')

        tiddler.text = ''
        tiddler.tags = []
        tiddler.fields = {}
        tiddler.fields['mapped_space'] = current_space
    return tiddler


TIDDLER_VALIDATORS.append(validate_mapuser)
TIDDLER_VALIDATORS.append(validate_mapspace)
