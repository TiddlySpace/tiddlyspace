


def test_compile():
    try:
        import tiddlywebplugins.tiddlyspace
        assert True
    except ImportError, exc:
        assert False, exc
