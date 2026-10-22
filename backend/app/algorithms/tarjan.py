"""2. Tarjan: тасарвал сүлжээг салгах кабелиуд (гүүр)-ыг олох.

Returns bridge edge IDs and DFS discovery / low values. Visits every component.
"""


def tarjan_bridges(nodes, edges):
    adjacency = {node['id']: [] for node in nodes}
    for edge in edges:
        adjacency[edge['u']].append((edge['v'], edge['id']))
        adjacency[edge['v']].append((edge['u'], edge['id']))
    for neighbours in adjacency.values():
        neighbours.sort()

    discovery = {}  # Хотод анх очсон дараалал.
    low = {}        # Энэ дэд модноос буцаж хүрэх хамгийн эртний өвөг.
    bridges = []
    clock = 0

    def visit(city, parent_edge=None):
        nonlocal clock
        clock += 1
        discovery[city] = clock
        low[city] = clock

        for neighbour, edge_id in adjacency[city]:
            if edge_id == parent_edge:
                continue

            if neighbour not in discovery:
                visit(neighbour, edge_id)
                low[city] = min(low[city], low[neighbour])

                # Хөршийн дэд мод өөр замаар дээш буцаж чадахгүй бол гүүр.
                if low[neighbour] > discovery[city]:
                    bridges.append(edge_id)
            else:
                low[city] = min(low[city], discovery[neighbour])

    # Салангид графын бүх хэсгийг ч шалгана.
    for city in sorted(adjacency):
        if city not in discovery:
            visit(city)

    return {'bridges': sorted(bridges), 'discovery': discovery, 'low': low}
