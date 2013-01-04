"""
subclass the cookie_form challenger to add csrf-awareness
"""
from tiddlyweb.web.challengers import cookie_form

FORM_FINISH = """
<input type="hidden" id="csrf_token" name="csrf_token" />
<input type="submit" value="submit" />
</form>
<script type="text/javascript"
        src="/bags/tiddlyspace/tiddlers/TiddlySpaceCSRF"></script>
<script type="text/javascript">
    var csrfToken = window.getCSRFToken(),
        el = null;

    if (csrfToken) {
        el = document.getElementById('csrf_token');
        el.value = csrfToken;
    }
</script>
"""


class Challenger(cookie_form.Challenger):
    """
    Override the cookie_form Challenger to add CSRF
    handling.
    """
    def _send_cookie_form(self, environ, start_response, redirect,
            status='401 Unauthorized', message=''):
        """
        Send a simple form to the client asking for a username
        and password.
        """
        start_response(status, [('Content-Type', 'text/html')])
        environ['tiddlyweb.title'] = 'Cookie Based Login'
        return ["""
<pre>
%s
<form action="" method="POST">
User: <input name="user" size="40" />
Password <input type="password" name="password" size="40" />
<input type="hidden" name="tiddlyweb_redirect" value="%s" />
%s
</pre>
""" % (message, redirect, FORM_FINISH)]
