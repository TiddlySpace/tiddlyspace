"""
Encapsulate server-side understanding of a space.

This code doesn't actually do much with a space, instead
it provides methods to present the defaults of a space,
based on the name provided when the space is created.
"""

import re

SPACE_NAME_PATTERN = re.compile(r"^[0-9a-z][0-9a-z\-]*[0-9a-z]$")

PUBLIC = '_public'
PRIVATE = '_private'


class Space(object):
    """
    A class to encapsulte server-side understanding of a space.

    A space has a name. From that public and private bags
    and recipes can be deduced.
    """

    ASSOCIATED_BAG_MAP = [
            'archive',
            ]

    CORE_RECIPE = [
        ('system', ''),
        ('tiddlyspace', ''),
        ('system-plugins_public', ''),
        ('system-info_public', ''),
        ('system-images_public', ''),
        ('system-theme_public', ''),
        ]

    def __init__(self, name):
        """
        Name must be plain ascii and match SPACE_NAME_PATTERN.
        """
        try:
            name = str(name)
        except UnicodeEncodeError:
            raise ValueError('Invalid space name, ascii required: %s' %
                name.encode('UTF-8'))
        if not SPACE_NAME_PATTERN.match(name):
            raise ValueError(
                    'Invalid space name, must be valid host name (RFC 1035)' +
                    ': %s' % name)
        self.name = name

    def extra_bags(self):
        """
        List the bags from ASSOCIATED_BAG_MAP, mapping in the space name.
        """
        return ['%s_%s' % (self.name, bag_name) for
                bag_name in Space.ASSOCIATED_BAG_MAP]

    def private_bag(self):
        return self._private_name()

    def private_recipe(self):
        return self._private_name()

    def public_bag(self):
        return self._public_name()

    def public_recipe(self):
        return self._public_name()

    def list_bags(self):
        """
        List all the bags in a default space.
        """
        return [self.public_bag(), self.private_bag()] + self.extra_bags()

    def list_recipes(self):
        """
        List all the recipes in a default space.
        """
        return [self.public_recipe(), self.private_recipe()]

    def public_recipe_list(self):
        """
        List the bags and filters that make up the default
        public recipe for the current space.
        """
        return self.CORE_RECIPE + [(self.public_recipe(), '')]

    def private_recipe_list(self):
        """
        List the bags and filters that make up the default
        private recipe for the current space.
        """
        return self.CORE_RECIPE + [(self.public_recipe(), ''),
                (self.private_recipe(), '')]

    def _private_name(self):
        return '%s%s' % (self.name, PRIVATE)

    def _public_name(self):
        return '%s%s' % (self.name, PUBLIC)

    @classmethod
    def name_from_recipe(cls, recipe):
        """
        Given a recipe name, return the space name.
        Raise ValueError if it doesn't appear to be a space recipe.
        """
        return cls._name_from_entity(recipe, [PUBLIC, PRIVATE])

    @classmethod
    def name_from_bag(cls, bag):
        """
        Given a bag name, return the space name.
        Raise ValueError if it doesn't appear to be a space bag.
        """
        endings = [PUBLIC, PRIVATE] + ['_%s' % name for
                name in Space.ASSOCIATED_BAG_MAP]
        return cls._name_from_entity(bag, endings)

    @classmethod
    def bag_is_public(cls, bag_name):
        """
        Given a bag name determine if it is public.
        """
        return cls._is_public(bag_name)

    @classmethod
    def bag_is_private(cls, bag_name):
        """
        Given a bag name determine if it is private.
        """
        return cls._is_private(bag_name)

    @classmethod
    def bag_is_associate(cls, bag_name):
        """
        Given a bag name determine if it is private.
        """
        try:
            prefix, suffix = bag_name.rsplit('_', 1)
            return prefix and suffix in cls.ASSOCIATED_BAG_MAP
        except ValueError:
            return False

    @classmethod
    def recipe_is_public(cls, recipe_name):
        """
        Given a recipe name determine if it is public.
        """
        return cls._is_public(recipe_name)

    @classmethod
    def recipe_is_private(cls, recipe_name):
        """
        Given a recipe name determine if it is private.
        """
        return cls._is_private(recipe_name)

    @staticmethod
    def _is_private(name):
        return _has_ending(name, PRIVATE)

    @staticmethod
    def _is_public(name):
        return _has_ending(name, PUBLIC)

    @staticmethod
    def _name_from_entity(name, endings):
        for ending in endings:
            if name.endswith(ending):
                name = name.rsplit(ending, 1)[0]
                return name
        raise ValueError('entity has wrong form')


def _has_ending(name, ending):
    try:
        prefix, suffix = name.rsplit('_', 1)
        suffix = '_%s' % suffix
        return prefix and suffix == ending
    except ValueError:
        return False
