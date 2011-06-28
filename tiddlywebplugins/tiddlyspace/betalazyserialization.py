"""
Combine the betaserialization and the lazy serialization.
This allows twrelease:alpha and lazy: True to work together.
"""

from tiddlywebplugins.tiddlyspace.betaserialization import (
        Serialization as BetaSerialization)
from tiddlywebplugins.lazy.serialization import (
        Serialization as LazySerialization)


class Serialization(LazySerialization, BetaSerialization):
    pass
