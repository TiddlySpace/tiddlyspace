"""
Encapsulate server-side understanding of a space.

This code doesn't actually do much with a space, instead
it provides methods to present the defaults of a space,
based on the name provided when the space is created.
"""

import re

SPACE_NAME_PATTERN = re.compile(r"^[a-z][0-9a-z\-]*[0-9a-z]$")


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
        return '%s_private' % self.name

    def _public_name(self):
        return '%s_public' % self.name

    @classmethod
    def name_from_recipe(cls, recipe):
        """
        Given a recipe name, return the space name.
        Raise ValueError if it doesn't appear to be a space recipe.
        """
        return cls._name_from_entity(recipe, ['_public', '_private'])

    @classmethod
    def name_from_bag(cls, bag):
        """
        Given a bag name, return the space name.
        Raise ValueError if it doesn't appear to be a space bag.
        """
        endings = ['_public', '_private'] + ['_%s' % name for
                name in Space.ASSOCIATED_BAG_MAP]
        return cls._name_from_entity(bag, endings)

    @staticmethod
    def _name_from_entity(name, endings):
        for ending in endings:
            if name.endswith(ending):
                name = name.rsplit(ending, 1)[0]
                return name
        raise ValueError('entity has wrong form')
