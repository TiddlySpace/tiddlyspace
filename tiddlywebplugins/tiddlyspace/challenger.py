from Cookie import SimpleCookie

from tiddlyweb.model.user import User
from tiddlyweb.store import NoUserError
from tiddlyweb.web.util import server_host_url, make_cookie
from tiddlyweb.web.challengers import cookie_form


class Challenger(cookie_form.Challenger):
    """
    extends the TiddlyWeb core's cookie_form challenger to set the cookie domain
    """

    def _validate_and_redirect(self, environ, start_response, username,
            password, redirect):
        """
        Check a username and password. If valid, send a cookie
        to the client. If it is not, send the form again.
        """
        status = '401 Unauthorized'
        try:
            store = environ['tiddlyweb.store']
            secret = environ['tiddlyweb.config']['secret']
            cookie_age = environ['tiddlyweb.config'].get('cookie_age', None)
            user = User(username)
            user = store.get(user)
            if user.check_password(password):
                uri = '%s%s' % (server_host_url(environ), redirect)
                cookie_header_string = make_cookie('tiddlyweb_user',
                        user.usersign, mac_key=secret,
                        path=self._cookie_path(environ), expires=cookie_age)
                cookie_header_string = _extend_cookie('tiddlyweb_user',
                    cookie_header_string, environ)
                #logging.debug('303 to %s', uri)
                start_response('303 Other',
                        [('Set-Cookie', cookie_header_string),
                            ('Content-Type', 'text/plain'),
                            ('Location', uri.encode('utf-8'))])
                return [uri]
        except KeyError:
            pass
        except NoUserError:
            pass
        return self._send_cookie_form(environ, start_response, redirect,
                status, 'User or Password no good')


def _extend_cookie(name, cookie_string, environ):
    """
    adds domain to cookie
    """
    cookie = SimpleCookie()
    cookie.load(cookie_string)
    domain = environ['tiddlyweb.config']['server_host']['host']
    cookie[name]['domain'] = domain
    return cookie.output(header='')
