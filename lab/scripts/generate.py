#!/usr/bin/env python3
from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
routers=['ulaanbaatar','darkhan','erdenet','bulgan']
links=[('ub-dar',0,1,'eth1','eth1',10),('dar-erd',1,2,'eth2','eth1',10),('erd-bul',2,3,'eth2','eth1',10),('bul-ub',3,0,'eth2','eth2',50)]
services={};networks={};mapping={r:[] for r in routers}
for idx,(lid,a,b,ia,ib,cost) in enumerate(links,1):
 networks[lid]={'internal':True,'driver':'bridge','ipam':{'config':[{'subnet':f'10.230.{idx}.0/29'}]}}
 for r,interface,host in [(a,ia,2),(b,ib,3)]:mapping[routers[r]].append((lid,interface,f'10.230.{idx}.{host}',cost))
for i,r in enumerate(routers,1):
 folder=root/'lab/configs'/r;folder.mkdir(parents=True,exist_ok=True)
 (folder/'daemons').write_text('zebra=yes\nospfd=yes\nbgpd=no\nstaticd=no\nvtysh_enable=yes\nzebra_options=" -A 127.0.0.1 -s 90000000"\nospfd_options=" -A 127.0.0.1"\n')
 config=f'frr defaults traditional\nhostname {r}\nservice integrated-vtysh-config\ninterface lo\n ip address 10.255.0.{i}/32\nexit\n'
 for _,interface,ip,cost in mapping[r]:config+=f'interface {interface}\n ip ospf area 0\n ip ospf network point-to-point\n ip ospf cost {cost}\n ip ospf hello-interval 1\n ip ospf dead-interval 4\nexit\n'
 config+=f'router ospf\n ospf router-id 10.255.0.{i}\n network 10.255.0.{i}/32 area 0\n passive-interface lo\nexit\n'
 (folder/'frr.conf').write_text(config)
 services[r]={'image':'quay.io/frrouting/frr:10.5.5','container_name':'mnfiber-'+r,'profiles':['lab'],'cap_add':['NET_ADMIN','NET_RAW','SYS_ADMIN'],'sysctls':{'net.ipv4.ip_forward':'1','net.ipv4.conf.all.rp_filter':'0','net.ipv4.conf.default.rp_filter':'0'},'volumes':[f'./lab/configs/{r}/daemons:/etc/frr/daemons:ro',f'./lab/configs/{r}/frr.conf:/etc/frr/frr.conf:ro'],'networks':{lid:{'interface_name':interface,'ipv4_address':ip} for lid,interface,ip,cost in mapping[r]},'mem_limit':'256m','cpus':1}
(root/'compose.yaml').write_text(json.dumps({'name':'mnfiber','services':services,'networks':networks},indent=2)+'\n')
(root/'lab/addressing.json').write_text(json.dumps(mapping,indent=2))
