"""
TiddlySpace
A discoursive social model for TiddlyWiki

website: http://tiddlyspace.com
repository: http://github.com/TiddlySpace/tiddlyspace
"""

from tiddlywebplugins.tiddlyspace.plugin import init_plugin


__version__ = '1.0.84'


def init(config):
    """
    Establish required plugins and HTTP routes.
    """
    config['tiddlyspace.version'] = __version__
    if 'selector' in config:
        import tiddlywebplugins.tiddlyspace.fixups
    init_plugin(config)
