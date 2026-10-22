"""3. Dijkstra: ажиллаж буй кабелиудаар хамгийн богино замыг олох.

Positive edge lengths are validated by the planner. Unreachable route length is
None, never zero. Stable tie-breaking matches the browser implementation.
"""

import math


def dijkstra(nodes, edges, source, destination=None):
    adjacency = {node['id']: [] for node in nodes}
    for edge in edges:
        adjacency[edge['u']].append((edge['v'], edge['id'], edge['length_km']))
        adjacency[edge['v']].append((edge['u'], edge['id'], edge['length_km']))
    for neighbours in adjacency.values():
        neighbours.sort()

    cities = sorted(adjacency)
    distance = {city: math.inf for city in cities}
    previous = {}
    remaining = set(cities)
    if source in adjacency:
        distance[source] = 0

    while remaining:
        # 1. Баталгаажаагүй хотуудаас хамгийн бага зайтайг сонгоно.
        city = min(remaining, key=lambda item: (distance[item], item))
        if not math.isfinite(distance[city]):
            break
        remaining.remove(city)

        # 2. Энэ хотоор дамжвал хөршдөө илүү богино хүрэх үү?
        for neighbour, edge_id, length in adjacency[city]:
            candidate = distance[city] + length
            if candidate < distance[neighbour]:
                distance[neighbour] = candidate
                previous[neighbour] = (city, edge_id)

    # 3. Хүрэх хотоос эхлэх хот хүртэл буцаж замыг сэргээнэ.
    route = []
    route_edges = []
    reachable = destination in distance and math.isfinite(distance[destination])
    if reachable:
        city = destination
        route = [city]
        while city != source:
            city, edge_id = previous[city]
            route.insert(0, city)
            route_edges.insert(0, edge_id)

    return {
        'dist': distance,
        'route': route,
        'route_edges': route_edges,
        'length_km': distance[destination] if reachable else None,
    }
