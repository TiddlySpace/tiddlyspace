"""
Input validation routines for TiddlySpace.
"""


import Cookie
from datetime import datetime, timedelta

from tiddlyweb.util import sha
from tiddlyweb.web.validator import TIDDLER_VALIDATORS, InvalidTiddlerError
from tiddlyweb.web.http import HTTP400

# XXX: importing private members, so they should probably not be private
from tiddlywebplugins.tiddlyspace.web import (determine_host,
        determine_space, determine_space_recipe)

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
        def fake_start_response(status, headers, exc_info=None):
            """
            add a csrf_token header (if we need to)
            """
            if environ['tiddlyweb.usersign']['name'] == 'GUEST':
                start_response(status, headers, exc_info)
                return
            user_cookie = Cookie.SimpleCookie()
            user_cookie.load(environ.get('HTTP_COOKIE', {}))
            csrf_cookie = user_cookie.get('csrf_token')
            timestamp = ''
            if csrf_cookie:
                timestamp = csrf_cookie.value.rsplit(':', 1)[0]
            now = datetime.now().strftime('%Y%m%d%H')
            if now != timestamp:
                user, space, secret = self.get_nonce_components(environ)
                nonce = gen_nonce(user, space, now, secret)
                set_cookie = 'csrf_token=%s' % nonce
                headers.append(('Set-Cookie', set_cookie))
            start_response(status, headers, exc_info)
        def app():
            output = self.application(environ, fake_start_response)
            return output
        if environ['REQUEST_METHOD'] != 'POST':
            return app()
        if environ['tiddlyweb.usersign']['name'] == 'GUEST':
            return app()
        if environ['tiddlyweb.type'] not in [
                'application/x-www-form-urlencoded',
                'multipart/form-data']:
            return app()
        form = environ['tiddlyweb.query']
        nonce = form.pop('csrf_token', [''])[0]
        try:
            self.check_csrf(environ, nonce)
        except InvalidNonceError, exc:
            raise HTTP400(exc)

        return app()

    def check_csrf(self, environ, nonce):
        """
        Check to ensure that the incoming request isn't a csrf attack.
        Do this by expecting a nonce that is made up of timestamp:hash
        where hash is the hash of username:timestamp:spacename:secret

        Returns True
        """
        if not nonce:
            raise InvalidNonceError('No csrf_token supplied')

        user, space, secret = self.get_nonce_components(environ)
        time = datetime.now().strftime('%Y%m%d%H')
        nonce_time = nonce.rsplit(':', 1)[0]
        if time != nonce_time:
            date = datetime.strptime(time, '%Y%m%d%H')
            date -= timedelta(hours=1)
            time = date.strftime('%Y%m%d%H')
        new_nonce = gen_nonce(user, space, time, secret)

        try:
            assert new_nonce == nonce
        except AssertionError:
            raise InvalidNonceError('Nonce doesn\'t match')

        return True

    def get_nonce_components(self, environ):
        """
        return username, spacename, timestamp (from cookie) and secret
        """
        username = environ['tiddlyweb.usersign']['name']
        http_host = determine_host(environ)[0]
        spacename = determine_space(environ, http_host) or ''
        secret = environ['tiddlyweb.config']['secret']
        return (username, spacename, secret)

def gen_nonce(username, spacename, timestamp, secret):
    """
    generate a hash suitable for using as a nonce.

    the hash is: timestamp:hash(user:time:space:secret)
    """
    return '%s:%s' % (timestamp,
        sha('%s:%s:%s:%s' % (username, timestamp, spacename, secret)).
        hexdigest())

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
