"""Deterministic academic planner. Definitions/tie-breaking match frontend/src/graph.ts.
NetworkX is independently used for components, Dijkstra distances and reference tests.
"""
import math
import re
import networkx as nx

KINDS=('mst','resilient','mesh')
def pair(u,v):return '--'.join(sorted((u,v)))
def order(e):return (e['length_km'],pair(e['u'],e['v']),e['id'])
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
def tarjan(nodes,edges):
    adj={n['id']:[] for n in nodes}
    for e in edges:
        adj[e['u']].append((e['v'],e['id']));adj[e['v']].append((e['u'],e['id']))
    for ns in adj.values():ns.sort()
    discovery={};low={};bridges=[];clock=0
    def visit(u,parent=None):
        nonlocal clock
        clock+=1;discovery[u]=low[u]=clock
        for v,eid in adj[u]:
            if eid==parent:continue
            if v not in discovery:
                visit(v,eid);low[u]=min(low[u],low[v])
                if low[v]>discovery[u]:bridges.append(eid)
            else:low[u]=min(low[u],discovery[v])
    for u in sorted(adj):
        if u not in discovery:visit(u)
    return dict(bridges=sorted(bridges),discovery=discovery,low=low)
def mst(nodes,edges):
    parent={n['id']:n['id'] for n in nodes}
    def find(x):
        if parent[x]!=x:parent[x]=find(parent[x])
        return parent[x]
    out=[]
    for e in sorted(edges,key=order):
        a,b=find(e['u']),find(e['v'])
        if a!=b:parent[a]=b;out.append(e)
    return out
def designs(data):
    nodes,edges=data['nodes'],data['edges'];tree=mst(nodes,edges);selected=list(tree);used={e['id'] for e in tree};bridges=tarjan(nodes,selected)['bridges'];additions=[]
    while bridges:
        best=None
        for e in sorted(edges,key=order):
            if e['id'] in used:continue
            eliminated=len(bridges)-len(tarjan(nodes,selected+[e])['bridges'])
            if eliminated<=0:continue
            candidate=(e['length_km']/eliminated,*order(e))
            if best is None or candidate<best[0]:best=(candidate,e,eliminated)
        if best is None:break
        score,e,eliminated=best;selected.append(e);used.add(e['id']);additions.append(dict(edge_id=e['id'],eliminated=eliminated,score=score[0]));bridges=tarjan(nodes,selected)['bridges']
    return dict(mst=sorted(tree,key=lambda e:e['id']),resilient=sorted(selected,key=lambda e:e['id']),mesh=list(edges),additions=additions)
def shortest(nodes,edges,source,destination=None):
    # Explicit stable Dijkstra predecessor policy matches the browser; reference
    # distances are cross-checked against NetworkX in the test suite.
    adj={n['id']:[] for n in nodes}
    for e in edges:
        adj[e['u']].append((e['v'],e['id'],e['length_km']));adj[e['v']].append((e['u'],e['id'],e['length_km']))
    for ns in adj.values():ns.sort()
    ids=sorted(adj);dist={sid:math.inf for sid in ids};previous={};todo=set(ids)
    if source in adj:dist[source]=0
    while todo:
        u=min(todo,key=lambda sid:(dist[sid],sid))
        if not math.isfinite(dist[u]):break
        todo.remove(u)
        for v,eid,length in adj[u]:
            new=dist[u]+length
            if new<dist[v]:dist[v]=new;previous[v]=(u,eid)
    route=[];route_edges=[]
    if destination in dist and math.isfinite(dist[destination]):
        u=destination;route=[u]
        while u!=source:
            u,eid=previous[u];route.insert(0,u);route_edges.insert(0,eid)
    return dict(dist=dist,route=route,route_edges=route_edges,length_km=dist[destination] if destination in dist and math.isfinite(dist[destination]) else None)
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
