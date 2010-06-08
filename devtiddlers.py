instance_tiddlers = {
    'tiddlyspace': [
        '../src/controls/index.recipe',
        '../src/lib/index.recipe',
        '../src/model/index.recipe',
        '../src/external.recipe'
    ],
    'frontpage_public': [
        '../src/frontpage/index.recipe'
    ]
}


def update_config(config, set_host=True):
    for bag, uris in instance_tiddlers.items():
        config['local_instance_tiddlers'][bag] = uris
    if set_host:
        config['server_host'] = {
            'scheme': 'http',
            'host': 'tiddlyspace.org',
            'port': '8080'
        }
