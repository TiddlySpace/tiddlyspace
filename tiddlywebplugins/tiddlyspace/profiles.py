"""
Start at the infrastructure for OStatus, including webfinger,
user profiles, etc.
"""

import logging
import urllib
import urllib2

from tiddlyweb.control import readable_tiddlers_by_bag
from tiddlyweb.store import StoreError, NoUserError
from tiddlyweb.model.tiddler import Tiddler
from tiddlyweb.model.user import User
from tiddlyweb.web.handler.search import get as search
from tiddlyweb.web.http import HTTP404, HTTP400, HTTP415
from tiddlyweb.web.util import (server_host_url, encode_name,
        get_serialize_type, tiddler_url)
from tiddlywebplugins.tiddlyspace.spaces import space_uri
from tiddlywebplugins.tiddlyspace.web import determine_host
from tiddlyweb.wikitext import render_wikitext
from tiddlywebplugins.utils import get_store
from tiddlywebplugins.tiddlyspace.template import send_template


def add_profile_routes(selector):
    """
    Add the necessary routes for profiles and webfinger.
    """
    selector.add('/.well-known/host-meta', GET=host_meta)
    selector.add('/webfinger', GET=webfinger)
    selector.add('/profiles/{username}[.{format}]', GET=profile)


def profile(environ, start_response):
    """
    Choose between an atom or html profile.
    """
    http_host, host_url = determine_host(environ)
    if http_host != host_url:
        # Or should it be a 302?
        raise HTTP404('No profiles at this host: %s' % http_host)

    _, mime_type = get_serialize_type(environ)
    if 'atom' in mime_type:
        return atom_profile(environ, start_response)
    elif 'html' in mime_type:
        return html_profile(environ, start_response)
    else:
        raise HTTP415('Atom and HTML only')


def atom_profile(environ, start_response):
    """
    Send the atom profile, which is actually a search
    for tiddlers modified by the user.
    """
    username = environ['wsgiorg.routing_args'][1]['username']
    search_string = _search_string(username)
    environ['tiddlyweb.query']['q'] = [search_string]
    return search(environ, start_response)


def html_profile(environ, start_response):
    """
    Send the HTML profile, made up for the user's SiteIcon,
    their profile from their space, and their most recently
    modified tiddlers.
    """
    username = environ['wsgiorg.routing_args'][1]['username']
    usersign = environ['tiddlyweb.usersign']

    store = environ['tiddlyweb.store']

    try:
        _ = store.get(User(username))
    except NoUserError:
        raise HTTP404('Profile not found for %s' % username)

    activity_feed = profile_atom_url(environ, username)

    profile_tiddler = Tiddler('profile', '%s_public' % username)
    try:
        profile_tiddler = store.get(profile_tiddler)
    except StoreError, exc:
        raise HTTP404('No profile for %s: %s' % (username, exc))

    profile_text = render_wikitext(profile_tiddler, environ)

    tiddlers = store.search(_search_string(username))
    tiddlers_list = readable_tiddlers_by_bag(store, tiddlers, usersign)

    avatar_path = '/recipes/%s_public/tiddlers/SiteIcon' % username

    start_response('200 OK', [
        ('Content-Type', 'text/html; charset=UTF-8')])

    return send_template(environ, 'tsprofile.html', {
        'css': ['/bags/common/tiddlers/profile.css'],
        'username': username,
        'activity_feed': activity_feed,
        'avatar_path': avatar_path,
        'space_uri': space_uri(environ, username),
        'profile': profile_text,
        'tiddler_url': tiddler_url,
        'environ': environ,
        'tiddlers': tiddlers_list})


def host_meta(environ, start_response):
    """
    Send the host_meta information, so webfinger info can be found.
    """
    http_host, host_url = determine_host(environ)
    if http_host != host_url:
        # Or should it be a 302?
        raise HTTP404('No host-meta at this host: %s' % http_host)

    start_response('200 OK', [
        ('Content-Type', 'application/xrd+xml')])

    return send_template(environ, 'hostmeta.xml', {'host': http_host})


def profile_atom_url(environ, username):
    """
    The atom url of a profile, given a username.
    """
    return (server_host_url(environ) +
            '/profiles/%s.atom' % encode_name(username))


def webfinger(environ, start_response):
    """
    Display the webfinger information for a given user.
    """
    http_host, host_url = determine_host(environ)
    if http_host != host_url:
        raise HTTP404('No webfinger at this host: %s' % http_host)

    username = environ['tiddlyweb.query'].get('q', [None])[0]

    if not username:
        raise HTTP400('No account provided to webfinger query')

    if username.startswith('acct:'):
        username = username.split(':', 1)[1]
    username = username.split('@', 1)[0]

    start_response('200 OK', [
        ('Content-Type', 'application/xrd+xml')])

    return send_template(environ, 'webfinger.xml', {
        'username': username,
        'host': http_host})


try:
    from tiddlywebplugins.dispatcher.listener import Listener as BaseListener

    class Listener(BaseListener):
        """
        Define a dispatcher listener that sends a PuSH ping.
        """

        TUBE = 'pushping'
        STORE = None

        def _act(self, job):
            """
            Do the action of sending the ping when a job (a tiddler)
            is received from the queue.
            """
            if not self.STORE:
                self.STORE = get_store(self.config)
            info = self._unpack(job)

            tiddler = Tiddler(info['tiddler'], info['bag'])
            try:
                self.STORE.get(tiddler)
            except StoreError:
                return None  # Tiddler's not there, no need to notify
            user = tiddler.modifier
            if self._user_has_profile(user):
                self._send_ping(user)

        def _user_has_profile(self, user):
            """
            True if the user has opted in for profiles by creating
            a profile tiddler in their public bag.
            """
            try:
                tiddler = Tiddler('profile', '%s_public' % user)
                self.STORE.get(tiddler)
            except StoreError:
                return False
            return True

        def _send_ping(self, user):
            """
            Formulate and send the PuSH ping.
            """
            data = {
                    'hub.mode': 'publish',
                    'hub.url': profile_atom_url(
                        {'tiddlyweb.config': self.config}, user),
                    }

            try:
                target = self.config['atom.hub']
            except KeyError:
                return None
            encoded_data = urllib.urlencode(data)

            try:
                response = urllib2.urlopen(target, encoded_data)
                status = response.getcode()
                logging.warn('sent %s to %s got %s',
                        encoded_data, target, status)
                if status != '204':
                    logging.warn('non 204 response from hub: %s', status)
            except urllib2.HTTPError, exc:
                if exc.code != 204:
                    logging.warn(
                            'urlopen errored with %s when publishing to hub',
                            exc)
            except urllib2.URLError, exc:
                logging.warn(
                        'urlopen errored with %s when publishing to hub', exc)
            except AttributeError, exc:
                logging.warn('error when publishing to hub: %s, %s',
                        exc, response.info())
except ImportError:
    pass


def _search_string(username):
    """
    Construct the search string to be used for creating
    the recent tiddlers for this username.
    """
    return 'modifier:%s _limit:20' % username
