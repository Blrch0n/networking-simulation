"""1. Kruskal: бүх хотыг хамгийн бага нийт урттай кабелиар холбох.

Returns selected edge dictionaries. Disconnected input produces a forest.
Run the classroom example: python -m backend.app.algorithms.demo
"""

from .common import edge_order


def kruskal_mst(nodes, edges):
    # Эхэндээ хот бүр тусдаа бүлэг.
    parent = {node['id']: node['id'] for node in nodes}

    def find(city):
        """Find the representative of this city's connected group."""
        if parent[city] != city:
            parent[city] = find(parent[city])
        return parent[city]

    selected = []

    # 1. Богино кабелиас эхэлж шалгана.
    for edge in sorted(edges, key=edge_order):
        group_u = find(edge['u'])
        group_v = find(edge['v'])

        # 2. Нэг бүлэгт байвал цикл үүсгэнэ: алгасана.
        if group_u == group_v:
            continue

        # 3. Өөр бүлгүүдийг холбож байгаа кабелийг нэмнэ.
        parent[group_u] = group_v
        selected.append(edge)

    return selected
