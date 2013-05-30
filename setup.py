AUTHOR = 'Osmosoft'
AUTHOR_EMAIL = 'tiddlyspace@osmosoft.com'
NAME = 'tiddlywebplugins.tiddlyspace'
DESCRIPTION = 'A discoursive social model for Tiddlers'
VERSION = '1.2.9' # NB: duplicate of tiddlywebplugins.tiddlyspace.__init__


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
    platforms = 'Posix; MacOS X; Windows',
    packages = find_packages(exclude=['test']),
    scripts = ['tiddlyspace'],
    install_requires = [
        'setuptools',
        'tiddlyweb>=1.4.4',
        'tiddlywebwiki>=0.62.0',
        'tiddlywebplugins.status>=0.6',
        'tiddlywebplugins.utils>=1.0',
        'tiddlywebplugins.logout>=0.6',
        'tiddlywebplugins.virtualhosting',
        'tiddlywebplugins.hashmaker>=0.3',
        'tiddlywebplugins.socialusers>=0.6',
        'tiddlywebplugins.magicuser>=0.3',
        'tiddlywebplugins.openid2>=0.5',
        'tiddlywebplugins.cookiedomain>=0.6',
        'tiddlywebplugins.mselect',
        'tiddlywebplugins.oom',
        'tiddlywebplugins.prettyerror>=0.9.2',
        'tiddlywebplugins.pathinfohack>=0.9.1',
        'tiddlywebplugins.form',
        'tiddlywebplugins.reflector>=0.6',
        'tiddlywebplugins.atom>=1.3.7',
        'tiddlywebplugins.mysql3>=3.0.11',
        'tiddlywebplugins.sqlalchemy3>=3.0.10',
        'tiddlywebplugins.privateer',
        'tiddlywebplugins.relativetime',
        'tiddlywebplugins.jsonp>=0.4',
        'tiddlywebplugins.templates',
        'tiddlywebplugins.csrf',
        'tiddlywebplugins.whoosher',
        'tiddlywebplugins.markdown',
        'tiddlywebplugins.imaker',
        'httpexceptor',
    ],
    include_package_data = True,
    zip_safe = False,
    license = 'BSD',
)
