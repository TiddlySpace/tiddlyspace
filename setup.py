AUTHOR = 'Osmosoft'
AUTHOR_EMAIL = 'tiddlyspace@osmosoft.com'
NAME = 'tiddlywebplugins.tiddlyspace'
DESCRIPTION = 'A discoursive social model for TiddlyWiki'
VERSION = '0.2.2' # N.B.: duplicate of tiddlywebplugins.tiddlyspace.__init__


import os

from setuptools import setup, find_packages


setup(
    namespace_packages = ['tiddlywebplugins'],
    name = NAME,
    version = VERSION,
    description = DESCRIPTION,
    long_description = open(os.path.join(os.path.dirname(__file__), 'README')).read(),
    author = AUTHOR,
    author_email = AUTHOR_EMAIL,
    url = 'http://pypi.python.org/pypi/%s' % NAME,
    packages = find_packages(exclude=['test']),
    platforms = 'Posix; MacOS X; Windows',
    scripts = ['tiddlyspace'],
    install_requires = [
        'setuptools',
        'tiddlyweb',
        'tiddlywebwiki',
        'tiddlywebplugins.utils>=1.0',
        'tiddlywebplugins.logout',
        'tiddlywebplugins.virtualhosting',
        'tiddlywebplugins.socialusers',
        'tiddlywebplugins.geofilters'
    ],
    include_package_data = True,
    zip_safe = False
)
