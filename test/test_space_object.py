
import py.test

from tiddlywebplugins.tiddlyspace.space import Space


def test_private_bag():
    space = Space('cat')
    assert space.private_bag() == 'cat_private'

def test_public_bag():
    space = Space('cat')
    assert space.public_bag() == 'cat_public'

def test_private_recipe():
    space = Space('cat')
    assert space.private_recipe() == 'cat_private'

def test_public_recipe():
    space = Space('cat')
    assert space.public_recipe() == 'cat_public'

def test_list_bags():
    space = Space('cat')
    assert sorted(space.list_bags()) == ['cat_archive', 'cat_private',
            'cat_public']

def test_list_recipes():
    space = Space('cat')
    assert sorted(space.list_recipes()) == ['cat_private', 'cat_public']

def test_name_from_recipe():
    assert Space.name_from_recipe('cat_private') == 'cat'
    py.test.raises(ValueError, 'Space.name_from_recipe("cat_ball")')

def test_name_from_bag():
    assert Space.name_from_bag('cat_private') == 'cat'
    py.test.raises(ValueError, 'Space.name_from_bag("cat_ball")')

def test_bag_is():
    assert Space.bag_is_public('cat_public')
    assert not Space.bag_is_public('cat_private')
    assert not Space.bag_is_public('_public')
    assert Space.bag_is_private('cat_private')
    assert not Space.bag_is_private('cat_public')
    assert not Space.bag_is_private('_private')

def test_recipe_is():
    assert Space.recipe_is_public('cat_public')
    assert not Space.recipe_is_public('cat_private')
    assert Space.recipe_is_private('cat_private')
    assert not Space.recipe_is_private('cat_public')

def test_bag_is_associate():
    assert Space.bag_is_associate('cat_archive')
    assert not Space.bag_is_associate('cat_poo')
    assert not Space.bag_is_associate('_archive')
