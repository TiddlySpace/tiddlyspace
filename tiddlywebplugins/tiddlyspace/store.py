"""
Local overrides and extensions to tiddlywebplugins.mysql2
to provide special optimized functionality.
"""

from tiddlywebplugins.sqlalchemy2 import (sRecipe, sPolicy,
        recipe_policy_table)
from tiddlywebplugins.mysql2 import Store as MySQLStore
from tiddlywebplugins.hashmaker import hash_tiddler


class Store(MySQLStore):
    """
    Override the default MySQL store to a) put a hash on each
    saved tiddler, b) get a list of user's spaces.
    """

    def user_spaces(self, username):
        """
        Make a query directly into the database to get a username's
        list of spaces. More correctly: Get those public recipes on which
        this user passes the manage constraint.
        """
        try:
            query = (self.session.query(sRecipe.name)
                    .join((recipe_policy_table,
                        sRecipe.id == recipe_policy_table.c.recipe_id))
                    .join((sPolicy,
                        recipe_policy_table.c.policy_id == sPolicy.id))
                    .filter(sPolicy.principal_name == username)
                    .filter(sPolicy.constraint == 'manage')
                    .filter(sRecipe.name.like('%_public')))
            for name in query.all():
                yield name[0]
            self.session.close()
        except:
            self.session.rollback()
            raise

    def tiddler_put(self, tiddler):
        """
        Write a _hash field on the tiddler, then store it.
        """
        hash_tiddler(self.environ, tiddler, overwrite=True)
        return MySQLStore.tiddler_put(self, tiddler)
