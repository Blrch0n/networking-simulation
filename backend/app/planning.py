"""Deterministic academic planner. Definitions/tie-breaking match frontend/src/graph.ts.
NetworkX is independently used for components, Dijkstra distances and reference tests.
"""
import math
import re
import networkx as nx

# Public aliases preserve existing API callers while the actual algorithms live
# in four readable modules used by this planner (not duplicate demonstration code).
from .algorithms.common import pair, edge_order as order
from .algorithms.kruskal import kruskal_mst as mst
from .algorithms.tarjan import tarjan_bridges as tarjan
from .algorithms.dijkstra import dijkstra as shortest
from .algorithms.greedy_augmentation import augment_to_two_edge_connected

KINDS=('mst','resilient','mesh')
def finite(x):return isinstance(x,(float,int)) and not isinstance(x,bool) and math.isfinite(x)
def validate(data):
    if not isinstance(data,dict) or not isinstance(data.get('nodes'),list) or not isinstance(data.get('edges'),list):raise ValueError('Хот ба кабелийн жагсаалт шаардлагатай.')
    nodes,edges=data['nodes'],data['edges']
    if len(nodes)>100 or len(edges)>4950:raise ValueError('Maximum 100 cities / 4950 cables')
    ids=set()
    for n in nodes:
        sid=n.get('id') if isinstance(n,dict) else None
        if not isinstance(sid,str) or not re.fullmatch(r'[a-z0-9_]+(?:-[a-z0-9_]+)*',sid) or len(sid)>64 or sid in ids:raise ValueError('Invalid or duplicate city ID')
        ids.add(sid)
        if not isinstance(n.get('name'),str) or not n['name'].strip() or len(n['name'])>80:raise ValueError('Invalid city name')
        if not finite(n.get('lat')) or not -90<=n['lat']<=90 or not finite(n.get('lon')) or not -180<=n['lon']<=180:raise ValueError('Invalid coordinates')
    edge_ids=set();pairs=set()
    for e in edges:
        if not isinstance(e,dict) or not isinstance(e.get('id'),str) or not e['id'] or len(e['id'])>160 or e['id'] in edge_ids:raise ValueError('Invalid or duplicate cable ID')
        edge_ids.add(e['id']);u,v=e.get('u'),e.get('v')
        if u==v or u not in ids or v not in ids:raise ValueError('Invalid cable endpoints')
        key=pair(u,v)
        if key in pairs:raise ValueError('Duplicate undirected cable')
        pairs.add(key)
        if not finite(e.get('length_km')) or e['length_km']<=0:raise ValueError('Cable length must be positive and finite')
        if e.get('geometry') is not None:
            if not isinstance(e['geometry'],dict) or e['geometry'].get('type')!='LineString':raise ValueError('Invalid geometry object')
            pts=e['geometry'].get('coordinates')
            if not isinstance(pts,list) or len(pts)<2 or any(not isinstance(p,list) or len(p)!=2 or not all(finite(x) for x in p) or abs(p[0])>180 or abs(p[1])>90 for p in pts):raise ValueError('Invalid cable geometry')
    return dict(nodes=sorted(nodes,key=lambda n:n['id']),edges=sorted(edges,key=lambda e:e['id']))
def graph(nodes,edges):
    g=nx.Graph();g.add_nodes_from(sorted(n['id'] for n in nodes))
    for e in sorted(edges,key=lambda e:e['id']):g.add_edge(e['u'],e['v'],length=e['length_km'],id=e['id'])
    return g
def designs(data):
    """Combine the four algorithms into the three comparison topologies."""
    nodes, edges = data['nodes'], data['edges']
    tree = mst(nodes, edges)
    protected = augment_to_two_edge_connected(nodes, edges, tree)
    return {
        'mst': sorted(tree, key=lambda edge: edge['id']),
        'resilient': sorted(protected['edges'], key=lambda edge: edge['id']),
        'mesh': list(edges),
        'additions': protected['additions'],
    }


def metrics(nodes,edges,source,destination):
    g=graph(nodes,edges);connected=len(nodes)>0 and nx.number_connected_components(g)==1;dfs=tarjan(nodes,edges);ids=sorted(g);max_distance=0;max_pair=None;unreachable_pairs=0
    # NetworkX provides the all-pairs shortest distances; positive edge lengths.
    paths=dict(nx.all_pairs_dijkstra_path_length(g,weight='length'))
    for i,u in enumerate(ids):
        for v in ids[i+1:]:
            if v not in paths[u]:unreachable_pairs+=1;continue
            distance=paths[u][v]
            if max_pair is None or distance>max_distance:max_distance=distance;max_pair=[u,v]
    route=shortest(nodes,edges,source,destination)
    return dict(connected=connected,components=nx.number_connected_components(g),protected=connected and not dfs['bridges'],bridge_ids=dfs['bridges'],edge_count=len(edges),length_km=sum(e['length_km'] for e in edges),max_rtt_ms=max_distance*.01 if connected else None,reachable_max_rtt_ms=max_distance*.01 if max_pair else None,max_pair=max_pair,unreachable_pairs=unreachable_pairs,unreachable=[sid for sid in ids if sid not in paths.get(source,{})],route=route['route'],route_edges=route['route_edges'],route_length_km=route['length_km'],route_rtt_ms=route['length_km']*.01 if route['length_km'] is not None else None)
def verify_failures(nodes,edges):
    source=nodes[0]['id'] if nodes else '';destination=nodes[1]['id'] if len(nodes)>1 else source;baseline=metrics(nodes,edges,source,destination);cases=[]
    for e in edges:
        m=metrics(nodes,[x for x in edges if x['id']!=e['id']],source,destination);cases.append(dict(edge_id=e['id'],connected=m['connected'],max_rtt_ms=m['max_rtt_ms'],max_pair=m['max_pair']))
    connected=[c for c in cases if c['connected']];worst=min(connected,key=lambda c:(-(c['max_rtt_ms'] or 0),c['edge_id'])) if connected else None
    return dict(baseline_connected=baseline['connected'],tests=len(cases),connected=len(connected),disconnected=len(cases)-len(connected),worst_rtt_ms=worst['max_rtt_ms'] if worst else None,worst_edge=worst['edge_id'] if worst else None,all_passed=baseline['connected'] and len(cases)>0 and all(c['connected'] and c['max_rtt_ms'] is not None and c['max_rtt_ms']<=50 for c in cases),cases=cases)
def analyze(data,topology,source,destination,failed_id=None,verify=False):
    data=validate(data)
    if topology not in KINDS:raise ValueError('Invalid topology')
    ids={n['id'] for n in data['nodes']}
    if ids and (source not in ids or destination not in ids):raise ValueError('Invalid route city')
    ds=designs(data);rows=[dict(kind=kind,metrics=metrics(data['nodes'],ds[kind],source,destination)) for kind in KINDS];installed=ds[topology]
    failed_ids=sorted(set(failed_id if isinstance(failed_id,list) else [failed_id] if failed_id is not None else []))
    if any(not any(e['id']==fid for e in installed) for fid in failed_ids):raise ValueError('Cable not installed in selected topology')
    valid_failed=failed_ids[0] if failed_ids else None
    return dict(designs=ds,comparison=rows,baseline=next(r['metrics'] for r in rows if r['kind']==topology),current=metrics(data['nodes'],[e for e in installed if e['id'] not in failed_ids],source,destination),failed_id=valid_failed,failed_ids=failed_ids,verification=verify_failures(data['nodes'],installed) if verify else None)
