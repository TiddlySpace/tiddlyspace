"""
Middleware to protect against cross site request forgery attacks
"""
import Cookie
from datetime import datetime, timedelta
import time

from tiddlyweb.util import sha
from tiddlyweb.web.http import HTTP400

from tiddlywebplugins.tiddlyspace.web import (determine_host,
        determine_space)


class InvalidNonceError(Exception):
    pass


class CSRFProtector(object):
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
            user_cookie = Cookie.SimpleCookie()
            user_cookie.load(environ.get('HTTP_COOKIE', {}))
            csrf_cookie = user_cookie.get('csrf_token')
            timestamp = ''
            cookie_user = None
            if csrf_cookie:
                try:
                    timestamp, cookie_user, _ = csrf_cookie.value.split(':', 2)
                except ValueError:
                    timestamp = ''
                    cookie_user = ''
            username = environ['tiddlyweb.usersign']['name']
            now = datetime.utcnow().strftime('%Y%m%d%H')
            if username == 'GUEST':
                if cookie_user:
                    if 'MSIE' in environ.get('HTTP_USER_AGENT', ''):
                        expires = 'Expires=%s;' % datetime.strftime(
                                datetime.utcnow() - timedelta(hours=1),
                                '%a, %d-%m-%y %H:%M:%S GMT')
                    else:
                        expires = 'Max-Age=0;'
                    set_cookie = 'csrf_token=; %s' % expires
                    headers.append(('Set-Cookie', set_cookie))
                else:
                    start_response(status, headers, exc_info)
                    return
            elif now != timestamp or cookie_user != username:
                user, space, secret = get_nonce_components(environ)
                nonce = gen_nonce(user, space, now, secret)
                set_cookie = 'csrf_token=%s' % nonce
                headers.append(('Set-Cookie', set_cookie.encode()))
            start_response(status, headers, exc_info)

        def app():
            output = self.application(environ, fake_start_response)
            return output

        if environ['REQUEST_METHOD'] != 'POST':
            return app()
        if environ['tiddlyweb.usersign']['name'] == 'GUEST':
            return app()
        if environ.get('tiddlyweb.type', '') not in [
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
        Do this by expecting a nonce that is made up of timestamp:user:hash
        where hash is the hash of username:timestamp:spacename:secret

        Returns True
        """
        if not nonce:
            raise InvalidNonceError('No csrf_token supplied')

        user, space, secret = get_nonce_components(environ)
        time = datetime.utcnow().strftime('%Y%m%d%H')
        nonce_time = nonce.split(':', 1)[0]
        if time != nonce_time:
            date = datetime.strptime(time, '%Y%m%d%H')
            date -= timedelta(hours=1)
            time = date.strftime('%Y%m%d%H')
        new_nonce = gen_nonce(user, space, time, secret)

        try:
            assert new_nonce == nonce
        except AssertionError:
            raise InvalidNonceError('CSRF token does not match')

        return True


def get_nonce_components(environ):
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

    the hash is: timestamp:username:hash(user:time:space:secret)
    """
    return '%s:%s:%s' % (timestamp, username,
        sha('%s:%s:%s:%s' % (username, timestamp, spacename, secret)).
        hexdigest())
