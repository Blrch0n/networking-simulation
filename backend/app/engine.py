"""Geodesic planning and deterministic aggregate-flow model; never FRR telemetry."""
import json, itertools
from pathlib import Path
import networkx as nx
from pyproj import Geod
ROOT = Path(__file__).resolve().parents[2]
GEOD = Geod(ellps='WGS84')

def load_nodes():
    return json.loads((ROOT/'data/processed/nodes.json').read_text())

def candidates(nodes):
    edges=[]
    for a,b in itertools.combinations(nodes,2):
        coords=[[a['lon'],a['lat']], *[list(p) for p in GEOD.npts(a['lon'],a['lat'],b['lon'],b['lat'],12)], [b['lon'],b['lat']]]
        length=GEOD.line_length(*zip(*coords))/1000
        eid='--'.join(sorted([a['id'],b['id']]))
        edges.append(dict(id=eid,u=a['id'],v=b['id'],length_km=length,estimated_cost=length,capacity_gbps=100,geometry={'type':'LineString','coordinates':coords},physical_segment_ids=[eid],corridor_ids=[eid],elevation_profile=None,slope_summary=None,crossing_count=None,confidence='approximate',distance_basis='WGS84 geodesic — road alignment unverified',provenance='geonames',legal_access='unverified'))
    return edges

def graph(nodes,edges):
    g=nx.Graph();g.add_nodes_from(n['id'] for n in nodes)
    for e in edges:g.add_edge(e['u'],e['v'],weight=e['estimated_cost'],length=e['length_km'],id=e['id'])
    return g

def design(nodes,edges,kind):
    full=graph(nodes,edges)
    if kind=='mesh':return edges,'theoretical'
    # Four nearest neighbors per site form the explicitly approximate candidate set.
    allowed=set()
    for n in full:
        allowed.update(tuple(sorted((n,v))) for v in sorted(full[n],key=lambda v:full[n][v]['weight'])[:4])
    c=nx.Graph();c.add_nodes_from(full)
    for u,v in sorted(allowed):c.add_edge(u,v,**full[u][v])
    if not nx.is_connected(c):raise ValueError('Candidate graph disconnected')
    t=nx.minimum_spanning_tree(c)
    if kind=='resilient':
        avail=[(u,v,d['weight']) for u,v,d in c.edges(data=True) if not t.has_edge(u,v)]
        for u,v in nx.k_edge_augmentation(t,2,avail=avail):t.add_edge(u,v,**full[u][v])
        if list(nx.bridges(t)):raise ValueError('2-edge connectivity infeasible')
    ids={d['id'] for _,_,d in t.edges(data=True)}
    return [e for e in edges if e['id'] in ids], 'heuristic' if kind=='resilient' else 'optimal_mst_for_candidates'

def metrics(nodes,edges,run):
    failed=set(run.get('failed',[])); down=set(run.get('down_nodes',[]))
    active=[e for e in edges if e['id'] not in failed and e['u'] not in down and e['v'] not in down]
    g=graph(nodes,active); src=run.get('source','ulaanbaatar');dst=run.get('destination','khovd')
    paths=dict(nx.all_pairs_dijkstra_path_length(g,weight='length'))
    rtts=[d*.01 for a,vals in paths.items() for b,d in vals.items() if a<b]
    route=nx.shortest_path(g,src,dst,weight='weight') if nx.has_path(g,src,dst) else []
    route_edges=[g[u][v]['id'] for u,v in zip(route,route[1:])]
    distance=sum(g[u][v]['length'] for u,v in zip(route,route[1:])) if route else None
    loads={e['id']:0 for e in active}
    # Explicit assumed hub demand: each of the other 21 cities sends 2 Gbps to UB.
    for n in g:
        if n!='ulaanbaatar' and nx.has_path(g,n,'ulaanbaatar'):
            p=nx.shortest_path(g,n,'ulaanbaatar',weight='weight')
            for u,v in zip(p,p[1:]):loads[g[u][v]['id']]+=2*run.get('surge',1)
    if route:
        for eid in route_edges:loads[eid]+=run.get('demand_gbps',10)
    util={e['id']:loads[e['id']]/e['capacity_gbps'] for e in active}
    return dict(edge_count=len(edges),installed_length_km=sum(e['length_km'] for e in edges),relative_cost=sum(e['estimated_cost'] for e in edges),bridges=len(list(nx.bridges(g))),components=nx.number_connected_components(g),reachable_cities=len(nx.node_connected_component(g,src)),unreachable_pairs=231-len(rtts),max_rtt_ms=max(rtts,default=None),rtt_violations=sum(x>50 for x in rtts),route=route,route_edges=route_edges,route_length_km=distance,rtt_ms=distance*.01 if distance is not None else None,max_utilization=max(util.values(),default=0),overloaded_links=[k for k,v in util.items() if v>1],utilization=util,active_edges=[e['id'] for e in active])
