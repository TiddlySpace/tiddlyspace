"""
Subclass of tiddlywebplugins.openid2 to support
tiddlyweb_secondary_user cookie.
"""


import urlparse

from tiddlyweb.web.util import server_host_url, make_cookie

from tiddlywebplugins.openid2 import Challenger as OpenID

from tiddlywebplugins.tiddlyspace.cookie_form import FORM_FINISH


FRAGMENT_PREFIX = 'auth:OpenID:'


class Challenger(OpenID):
    """
    Subclass the default openid challenger to facilitate mapping
    openids to users.
    """

    def __init__(self):
        self.name = __name__

    def _domain_path(self, environ):
        """
        Set the path of the cookie being created. In TiddlySpace
        we want the domain of the server. Thus the leading '.'.
        """
        return "." + environ['tiddlyweb.config']['server_host']['host']

    def _success(self, environ, start_response, info):
        """
        After successful validation of an openid generate
        and send a cookie with the value of that openid.
        If this is a normal auth scenario make the name
        of the cookie the normal 'tiddlyweb_user'. If this
        is auth addition, where a fragment of 'auth:OpenID' is
        set on the redirect uri, then name the cookie
        'tiddlyweb_secondary_user'.
        """
        usersign = info.getDisplayIdentifier()
        if info.endpoint.canonicalID:
            usersign = info.endpoint.canonicalID
        # canonicolize usersign to tiddlyweb form
        if usersign.startswith('http'):
            usersign = usersign.split('://', 1)[1]
        usersign = usersign.rstrip('/')
        redirect = environ['tiddlyweb.query'].get(
            'tiddlyweb_redirect', ['/'])[0]
        uri = urlparse.urljoin(server_host_url(environ), redirect)

        cookie_age = environ['tiddlyweb.config'].get('cookie_age', None)

        secondary_cookie_only = False
        try:
            fragment = uri.rsplit('#', 1)[1]
        except (ValueError, IndexError):
            pass
        else:
            openid = fragment[len(FRAGMENT_PREFIX):]
            uri = uri.replace(FRAGMENT_PREFIX + openid,
                    FRAGMENT_PREFIX + usersign)
            secondary_cookie_only = True

        secret = environ['tiddlyweb.config']['secret']
        secondary_cookie_header_string = make_cookie(
                'tiddlyweb_secondary_user', usersign,
                mac_key=secret, path=self._cookie_path(environ),
                expires=cookie_age, domain=self._domain_path(environ))

        headers = [('Location', uri.encode('utf-8')),
                    ('Content-Type', 'text/plain'),
                    ('Set-Cookie', secondary_cookie_header_string)]

        if not secondary_cookie_only:
            cookie_header_string = make_cookie('tiddlyweb_user', usersign,
                    mac_key=secret, path=self._cookie_path(environ),
                    expires=cookie_age)
            headers.append(('Set-Cookie', cookie_header_string))

        start_response('303 See Other', headers)
        return [uri]

    def _render_form(self, environ, start_response, openid='',
            message='', form=''):
        """
        Send out a CSRF protected form for doing openid login.
        This isn't generally used in TiddlySpace, client side
        interfaces POST their own data.
        """
        redirect = environ['tiddlyweb.query'].get(
            'tiddlyweb_redirect', ['/'])[0]
        start_response('200 OK', [(
            'Content-Type', 'text/html')])
        environ['tiddlyweb.title'] = 'OpenID Login'
        return ["""
<div id='content'>
    <div class='message'>%s</div>
    <pre>
    <form action="" method="POST">
    OpenID: <input name="openid" size="60" value="%s"/>
    <input type="hidden" name="tiddlyweb_redirect" value="%s" />
    %s
    </pre>
</div>""" % (message, openid, redirect, FORM_FINISH)]
