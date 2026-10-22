"""Shared ordering helpers; these are not additional graph algorithms."""


def pair(u, v):
    """A--B and B--A are the same undirected connection."""
    return '--'.join(sorted((u, v)))


def edge_order(edge):
    """Length first; stable city/edge IDs break ties, matching TypeScript."""
    return (edge['length_km'], pair(edge['u'], edge['v']), edge['id'])
