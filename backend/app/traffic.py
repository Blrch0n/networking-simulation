"""Latency routing and Round Robin for the local planning API.

Temporary latency weights never change the physical graph, costs or bridges.
The static deployment uses parity-tested TypeScript equivalents.
"""

from . import planning
from .algorithms.dijkstra import dijkstra
from .algorithms.round_robin import round_robin


def load_balance(data, topology, source, destination, failed_id=None,
                 congestion=None, packet_count=2, start_index=0):
    data = planning.validate(data)
    if topology not in planning.KINDS:
        raise ValueError('Invalid topology')
    cities = {node['id'] for node in data['nodes']}
    if cities and (source not in cities or destination not in cities):
        raise ValueError('Invalid route city')
    installed = planning.designs(data)[topology]
    installed_ids = {edge['id'] for edge in installed}
    failures = failed_id if isinstance(failed_id, list) else [failed_id] if failed_id is not None else []
    if any(not isinstance(edge, str) or edge not in installed_ids for edge in failures):
        raise ValueError('Cable not installed in selected topology')
    delays = {} if congestion is None else congestion
    if not isinstance(delays, dict) or any(
        edge not in installed_ids or not planning.finite(delay) or not 0 <= delay <= 1000
        for edge, delay in delays.items()
    ):
        raise ValueError('Congestion must map installed cables to finite RTT delays from 0 to 1000 ms')
    # Copies of edges carry RTT weights; length_km on the supplied graph stays intact.
    healthy = [edge for edge in installed if edge['id'] not in failures]
    weighted = [{**edge, 'length_km': edge['length_km'] * .01 + delays.get(edge['id'], 0)} for edge in healthy]
    first = dijkstra(data['nodes'], weighted, source, destination)
    candidates = []
    if first['route_edges']:
        candidates.append(first)
        second = None
        for excluded in first['route_edges']:
            alternative = dijkstra(data['nodes'], [edge for edge in weighted if edge['id'] != excluded], source, destination)
            if alternative['length_km'] is None:
                continue
            rank = (alternative['length_km'], '|'.join(alternative['route_edges']))
            if second is None or rank < (second['length_km'], '|'.join(second['route_edges'])):
                second = alternative
        if second is not None:
            candidates.append(second)

    physical = {edge['id']: edge for edge in healthy}
    weights = {edge['id']: edge['length_km'] for edge in weighted}
    paths = []
    for index, candidate in enumerate(candidates):
        rtt = 0
        length = 0
        hops = {}
        for hop, edge_id in enumerate(candidate['route_edges']):
            length += physical[edge_id]['length_km']
            rtt += weights[edge_id]
            hops[candidate['route'][hop + 1]] = rtt
        paths.append({'id': f'path-{index + 1}', 'route': candidate['route'],
                      'route_edges': candidate['route_edges'], 'rtt_ms': rtt,
                      'length_km': length, 'hop_rtts': hops})

    # The actual fifth algorithm schedules packets onto the routes above.
    schedule = round_robin([path['id'] for path in paths], packet_count, start_index)
    return {'policy': 'round_robin', 'available': bool(paths), 'paths': paths, **schedule}
