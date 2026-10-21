import random,time
import networkx as nx
import pytest
from fastapi.testclient import TestClient
from backend.app import planning,engine
from backend.app.main import app

def dataset(n,edges):
    return planning.validate({'nodes':[{'id':str(i),'name':str(i),'lat':47,'lon':100+i/100} for i in range(n)],'edges':[{'id':f'{u}--{v}','u':str(u),'v':str(v),'length_km':w} for u,v,w in edges]})

def test_hand_checked():
    d=dataset(3,[(0,1,1),(1,2,2),(0,2,4)])
    assert sum(e['length_km'] for e in planning.mst(d['nodes'],d['edges']))==3
    a=planning.analyze(d,'resilient','0','2','0--1',True)
    assert a['current']['route']==['0','2'] and a['current']['route_rtt_ms']==.04
    assert a['verification']['connected']==3

def test_tarjan_against_networkx():
    rng=random.Random(20261021)
    for n in range(1,11):
        for _ in range(12):
            d=dataset(n,[(u,v,rng.randint(1,20)) for u in range(n) for v in range(u+1,n) if rng.random()<.3])
            g=planning.graph(d['nodes'],d['edges']);expected=sorted(g[u][v]['id'] for u,v in nx.bridges(g))
            dfs=planning.tarjan(d['nodes'],d['edges']);assert dfs['bridges']==expected
            p=planning.shortest(d['nodes'],d['edges'],'0')
            ref=nx.single_source_dijkstra_path_length(g,'0',weight='length')
            for sid,length in ref.items():assert p['dist'][sid]==length

def test_original_exhaustive():
    n=engine.load_nodes();d=planning.validate({'nodes':n,'edges':engine.candidates(n)})
    ds=planning.designs(d)
    assert len(ds['mst'])==21 and len(planning.tarjan(n,ds['mst'])['bridges'])==21
    for kind in ['resilient','mesh']:
        report=planning.verify_failures(n,ds[kind]);assert report['tests']==len(ds[kind]);assert report['connected']==report['tests'];assert report['disconnected']==0
    assert planning.verify_failures(n,ds['mst'])['disconnected']==21

def test_unaugmentable_and_disconnected():
    d=dataset(4,[(0,1,1),(1,2,1)])
    a=planning.analyze(d,'resilient','0','3',verify=True)
    assert not a['baseline']['protected'] and not a['baseline']['connected']
    assert a['current']['max_rtt_ms'] is None and a['current']['route_rtt_ms'] is None
    assert not a['verification']['all_passed']
    d=dataset(3,[(0,1,1),(1,2,1)])
    assert len(planning.analyze(d,'resilient','0','2')['baseline']['bridge_ids'])==2
    assert not planning.verify_failures([],[])['all_passed']

@pytest.mark.parametrize('change',[
    lambda d:d['nodes'].append(d['nodes'][0]),
    lambda d:d['nodes'][0].update(lat=91),
    lambda d:d['edges'][0].update(length_km=0),
    lambda d:d['edges'][0].update(length_km=float('inf')),
    lambda d:d['edges'][0].update(v='missing'),
    lambda d:d['edges'][0].update(v='0'),
    lambda d:d['edges'].append({**d['edges'][0],'id':'other'}),
])
def test_invalid_graph(change):
    d=dataset(2,[(0,1,1)]);change(d)
    with pytest.raises(ValueError):planning.validate(d)

def test_edited_api_and_boundaries(tmp_path,monkeypatch):
    from backend.app import main
    monkeypatch.setattr(main,'DB',tmp_path/'test.sqlite')
    d=dataset(23,[(u,v,1+v-u) for u in range(23) for v in range(u+1,23)])
    with TestClient(app) as c:
        start=time.perf_counter();r=c.post('/api/planning/analyze',json={'graph':d,'topology':'resilient','source':'0','destination':'22'});assert r.status_code==200
        assert r.json()['current']['connected'];assert time.perf_counter()-start<1
        bad=c.post('/api/planning/analyze',json={'graph':d,'source':'missing','destination':'0'});assert bad.status_code==422
        assert c.post('/api/planning/analyze',json={'graph':d,'source':'0','destination':'22'},headers={'origin':'https://evil.example'}).status_code==403


def test_multiple_failures_and_independent_verification():
    d=dataset(3,[(0,1,1),(1,2,2),(0,2,4)])
    result=planning.analyze(d,'mesh','0','2',['0--1','0--2','0--1'],True)
    assert result['failed_ids']==['0--1','0--2']
    assert not result['current']['connected']
    assert result['current']['max_rtt_ms'] is None
    assert result['current']['route_length_km'] is None
    assert result['baseline']['edge_count']==3
    assert result['verification']['connected']==3
    assert planning.analyze(d,'mesh','0','2',['0--1'])['current']['connected']
    assert planning.analyze(d,'mesh','0','2',[])['current']['edge_count']==3
    with pytest.raises(ValueError):planning.analyze(d,'mesh','0','2',['missing'])
    with TestClient(app,base_url='http://127.0.0.1:8000') as client:
        response=client.post('/api/planning/analyze',json=dict(graph=d,topology='mesh',source='0',destination='2',failed_id=['0--1','0--2']))
        assert response.status_code==200 and not response.json()['current']['connected']
