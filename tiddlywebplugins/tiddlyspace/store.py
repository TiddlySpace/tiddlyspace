"""
Local overrides and extensions to tiddlywebplugins.mysql
to provide special optimized functionality.
"""

from tiddlywebplugins.sqlalchemy import (sRecipe, sPolicy,
        text_, recipe_policy_table)
from tiddlywebplugins.mysql import Store as MySQLStore


class Store(MySQLStore):

    def user_spaces(self, username):
        """
        Make a query directly into the database to get a username's
        list of spaces. More correctly: Get those public recipes on which
        this user passes the manage constraint.
        """
        query = (self.session.query(sRecipe.name)
                .join((recipe_policy_table,
                    sRecipe.id==recipe_policy_table.c.recipe_id))
                .join((sPolicy, recipe_policy_table.c.policy_id==sPolicy.id))
                .filter(sPolicy.principal_name==username)
                .filter(sPolicy.constraint=='manage')
                .filter(sRecipe.name.like('%_public')))
        return (name[0] for name in query.all())
