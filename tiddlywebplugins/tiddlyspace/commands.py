"""
Establish the twanager commands made for TiddlySpace.
"""
from tiddlyweb.manage import make_command
from tiddlywebplugins.utils import get_store

from tiddlywebplugins.tiddlyspace.spaces import change_space_member


def establish_commands(config):
    """
    Establish the twanager commands made for TiddlySpace.
    """

    @make_command()
    def addmember(args):
        """Add a member to a space: <space name> <user name>"""
        store = get_store(config)
        space_name, username = args
        change_space_member(store, space_name, add=username)
        return True

    @make_command()
    def delmember(args):
        """Delete a member from a space: <space name> <user name>"""
        store = get_store(config)
        space_name, username = args
        change_space_member(store, space_name, remove=username)
        return True

    @make_command()
    def deltiddler(args):
        """Delete a tiddler from a bag: <bag> <title>"""
        from tiddlyweb.model.tiddler import Tiddler
        from tiddlyweb.store import NoTiddlerError
        from tiddlyweb.util import std_error_message
        bag, title = args
        prompt = 'deleting tiddler %s from bag %s - enter "yes" to confirm' % (
                title, bag)
        if raw_input('%s\n' % prompt) == 'yes':
            store = get_store(config)
            tiddler = Tiddler(title, bag)
            try:
                store.delete(tiddler)
            except NoTiddlerError:
                std_error_message(
                        'error deleting tiddler %s from bag %s: %s' % (
                            title, bag, 'no such tiddler'))
            return True
        else:
            std_error_message('aborted')
            return False
