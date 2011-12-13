"""
Test web utillity functions that aren't otherwise covered.
"""

from tiddlywebplugins.tiddlyspace.web import determine_host

def test_determine_host_common_port():
    server_host = {}
    config = {'server_host': server_host}
    environ = {'tiddlyweb.config': config}

    server_host.update({
            'scheme': 'http',
            'host': 'example.com',
            'port': '80',
            })

    http_host, host_url = determine_host(environ)
    assert http_host == 'example.com'
    assert host_url == 'example.com'

    environ['HTTP_HOST'] = 'something.example.com'

    http_host, host_url = determine_host(environ)
    assert http_host == 'something.example.com'
    assert host_url == 'example.com'

    server_host['port'] = '443'

    http_host, host_url = determine_host(environ)
    assert http_host == 'something.example.com'
    assert host_url == 'example.com'

    environ['HTTP_HOST'] = 'something.example.com:8080'
    server_host['port'] = '8080'

    http_host, host_url = determine_host(environ)
    assert http_host == 'something.example.com:8080'
    assert host_url == 'example.com:8080'
        
    environ['HTTP_HOST'] = 'something.example.com:8080'
    server_host['port'] = '80'

    http_host, host_url = determine_host(environ)
    assert http_host == 'something.example.com:8080'
    assert host_url == 'example.com'

    environ['HTTP_HOST'] = 'something.example.com:80'
    server_host['port'] = '80'

    http_host, host_url = determine_host(environ)
    assert http_host == 'something.example.com'
    assert host_url == 'example.com'
