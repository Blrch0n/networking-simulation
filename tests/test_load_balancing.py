"""Backend Round Robin scheduling and latency-route API behaviour."""

import copy
import json

import pytest
from fastapi.testclient import TestClient

from backend.app.algorithms.round_robin import round_robin
from backend.app.main import app
from backend.app.traffic import load_balance


def triangle():
    return {
        'nodes': [
            {'id': city, 'name': city.upper(), 'lat': 47, 'lon': 100 + index}
            for index, city in enumerate('abc')
        ],
        'edges': [
            {'id': 'ab', 'u': 'a', 'v': 'b', 'length_km': 2},
            {'id': 'bc', 'u': 'b', 'v': 'c', 'length_km': 3},
            {'id': 'ac', 'u': 'a', 'v': 'c', 'length_km': 8},
        ],
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    from backend.app import main
    monkeypatch.setattr(main, 'DB', tmp_path / 'load-balancing.sqlite')
    with TestClient(app) as test_client:
        yield test_client


def request_body(**overrides):
    return dict(graph=triangle(), topology='mesh', source='a', destination='c',
                **overrides)


def test_round_robin_alternates_and_continues_without_global_state():
    paths = ['path-1', 'path-2']
    first = round_robin(paths, 5)
    assert first['packets'] == [
        {'packet': index + 1, 'path_id': paths[index % 2], 'path_index': index % 2}
        for index in range(5)
    ]
    assert first['counts'] == {'path-1': 3, 'path-2': 2}
    assert first['next_index'] == 1

    continued = round_robin(paths, 3, first['next_index'])
    assert [packet['path_id'] for packet in continued['packets']] == [
        'path-2', 'path-1', 'path-2',
    ]
    assert continued['next_index'] == 0
    assert round_robin(paths, 5) == first  # Other callers cannot advance a cursor.
    assert paths == ['path-1', 'path-2']


def test_round_robin_empty_single_and_zero_packet_batches():
    assert round_robin([], 5, 10) == {
        'packets': [], 'counts': {}, 'next_index': 0,
    }
    single = round_robin(['only'], 3, 10)
    assert [packet['path_id'] for packet in single['packets']] == ['only'] * 3
    assert single['counts'] == {'only': 3}
    assert single['next_index'] == 0
    zero = round_robin(['first', 'second'], 0, 9)
    assert zero == {'packets': [], 'counts': {'first': 0, 'second': 0},
                    'next_index': 1}


@pytest.mark.parametrize('count,start', [
    (-1, 0), (1001, 0), (1.5, 0), (True, 0), ('2', 0),
    (2, -1), (2, 1_000_000_001), (2, 0.5), (2, False), (2, '0'),
])
def test_round_robin_rejects_invalid_batch_arguments(count, start):
    with pytest.raises(ValueError):
        round_robin(['path-1', 'path-2'], count, start)


def test_load_balance_selects_latency_routes_and_preserves_cable_lengths():
    graph = triangle()
    before = copy.deepcopy(graph)
    result = load_balance(graph, 'mesh', 'a', 'c', congestion={'ab': 20},
                          packet_count=5, start_index=1)
    assert graph == before
    assert result['policy'] == 'round_robin'
    assert result['available'] is True
    assert result['packets'][0] == {
        'packet': 1, 'path_id': 'path-2', 'path_index': 1,
    }
    assert result['counts'] == {'path-1': 2, 'path-2': 3}
    assert result['next_index'] == 0
    direct, alternate = result['paths']
    assert direct['id'] == 'path-1'
    assert direct['route'] == ['a', 'c']
    assert direct['route_edges'] == ['ac']
    assert direct['length_km'] == 8
    assert direct['rtt_ms'] == pytest.approx(.08)
    assert direct['hop_rtts'] == {'c': pytest.approx(.08)}
    assert alternate['id'] == 'path-2'
    assert alternate['route'] == ['a', 'b', 'c']
    assert alternate['route_edges'] == ['ab', 'bc']
    assert alternate['length_km'] == 5
    assert alternate['rtt_ms'] == pytest.approx(20.05)
    assert alternate['hop_rtts'] == {
        'b': pytest.approx(20.02), 'c': pytest.approx(20.05),
    }
    # Clearing the delays restores the physically shortest path as the first.
    normal = load_balance(graph, 'mesh', 'a', 'c')
    assert normal['paths'][0]['route'] == ['a', 'b', 'c']
    assert normal['paths'][0]['rtt_ms'] == pytest.approx(.05)


def test_load_balance_cuts_single_path_and_unreachable_cases():
    graph = triangle()
    result = load_balance(graph, 'mesh', 'a', 'c', failed_id=['ab', 'ab'],
                          congestion={'ab': 30}, packet_count=4)
    assert len(result['paths']) == 1
    assert result['counts'] == {'path-1': 4}
    assert result['paths'][0]['route_edges'] == ['ac']
    assert result['paths'][0]['rtt_ms'] == pytest.approx(.08)
    assert all('ab' not in path['route_edges'] for path in result['paths'])

    for failures, source, destination in [(['ab', 'ac'], 'a', 'c'),
                                           (None, 'a', 'a')]:
        empty = load_balance(graph, 'mesh', source, destination,
                             failed_id=failures, packet_count=4, start_index=1)
        assert empty['paths'] == []
        assert empty['packets'] == []
        assert empty['counts'] == {}
        assert empty['next_index'] == 0
        assert empty['available'] is False


def test_route_selection_is_stable_and_allows_shared_trunks():
    graph = triangle()
    graph['nodes'].append({'id': 'd', 'name': 'D', 'lat': 47, 'lon': 103})
    graph['edges'] = [
        {'id': 'ab', 'u': 'a', 'v': 'b', 'length_km': 1},
        {'id': 'bc', 'u': 'b', 'v': 'c', 'length_km': 1},
        {'id': 'bd', 'u': 'b', 'v': 'd', 'length_km': 1},
        {'id': 'dc', 'u': 'd', 'v': 'c', 'length_km': 1},
    ]
    result = load_balance(graph, 'mesh', 'a', 'c', congestion={'ab': 10})
    assert len(result['paths']) == 2
    assert result['paths'][0]['route'] == ['a', 'b', 'c']
    assert result['paths'][1]['route'] == ['a', 'b', 'd', 'c']
    assert all('ab' in path['route_edges'] for path in result['paths'])
    assert all(len(set(path['route'])) == len(path['route'])
               for path in result['paths'])
    reversed_graph = {'nodes': list(reversed(graph['nodes'])),
                      'edges': list(reversed(graph['edges']))}
    assert load_balance(reversed_graph, 'mesh', 'a', 'c',
                        congestion={'ab': 10}) == result


@pytest.mark.parametrize('value', [-1, 1000.1, True, float('nan'),
                                  float('inf'), float('-inf'), '20'])
def test_backend_helper_rejects_invalid_congestion(value):
    with pytest.raises(ValueError):
        load_balance(triangle(), 'mesh', 'a', 'c', congestion={'ab': value})


def test_load_balance_api_uses_round_robin_backend(client):
    body = request_body(congestion={'ab': 20}, packet_count=5, start_index=1)
    response = client.post('/api/planning/load-balance', json=body)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result == load_balance(triangle(), 'mesh', 'a', 'c',
                                  congestion={'ab': 20}, packet_count=5,
                                  start_index=1)
    assert [packet['path_index'] for packet in result['packets']] == [1, 0, 1, 0, 1]
    # The next independent request starts at its own default cursor.
    normal = client.post('/api/planning/load-balance', json=request_body())
    assert normal.status_code == 200
    assert normal.json()['packets'][0]['path_index'] == 0


def test_load_balance_api_filters_cuts_and_zero_batches(client):
    response = client.post('/api/planning/load-balance',
                           json=request_body(failed_id='ab'))
    assert response.status_code == 200, response.text
    assert response.json()['paths'][0]['route_edges'] == ['ac']
    assert response.json()['counts'] == {'path-1': 2}
    response = client.post('/api/planning/load-balance',
                           json=request_body(failed_id=['ab', 'ac']))
    assert response.status_code == 200
    assert response.json()['paths'] == []
    assert response.json()['packets'] == []
    response = client.post('/api/planning/load-balance',
                           json=request_body(packet_count=0, start_index=1))
    assert response.status_code == 200
    assert len(response.json()['paths']) == 2
    assert response.json()['packets'] == []
    assert response.json()['counts'] == {'path-1': 0, 'path-2': 0}


@pytest.mark.parametrize('field,value', [
    ('packet_count', -1), ('packet_count', 1001), ('packet_count', True),
    ('packet_count', 2.0), ('packet_count', '2'),
    ('start_index', -1), ('start_index', 1_000_000_001),
    ('start_index', False), ('start_index', 1.0), ('start_index', '0'),
    ('source', 'missing'), ('destination', 'missing'),
    ('topology', 'starlink'), ('failed_id', 'missing'),
    ('congestion', {'missing': 20}), ('congestion', {'ab': -1}),
    ('congestion', {'ab': 1000.1}), ('congestion', {'ab': True}),
    ('congestion', {'ab': '20'}), ('congestion', {'ab': float('nan')}),
    ('congestion', {'ab': float('inf')}),
])
def test_load_balance_api_rejects_invalid_inputs(client, field, value):
    body = request_body()
    body[field] = value
    # Raw JSON lets the API itself reject NaN/Infinity, rather than httpx.
    response = client.post('/api/planning/load-balance',
                           content=json.dumps(body),
                           headers={'Content-Type': 'application/json'})
    assert response.status_code == 422, response.text


def test_load_balance_api_checks_installed_cables_and_origin(client):
    body = request_body()
    body['topology'] = 'mst'
    body['congestion'] = {'ac': 10}  # Candidate cable is absent from this MST.
    response = client.post('/api/planning/load-balance', json=body)
    assert response.status_code == 422
    body.pop('congestion')
    body['failed_id'] = 'ac'
    assert client.post('/api/planning/load-balance', json=body).status_code == 422
    assert client.post('/api/planning/load-balance', json=request_body(),
                       headers={'origin': 'https://untrusted.example'}).status_code == 403
