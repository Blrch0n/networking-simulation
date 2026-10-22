"""Small, hand-checkable classroom example using the real planner algorithms.

Run from the project root:
    .venv/bin/python -m backend.app.algorithms.demo
    .venv/bin/python -m backend.app.algorithms.demo --algorithm tarjan

Lengths below are teaching examples, not geographic measurements.
"""

import argparse

from .kruskal import kruskal_mst
from .tarjan import tarjan_bridges
from .dijkstra import dijkstra
from .greedy_augmentation import augment_to_two_edge_connected

NODES = [{'id': city} for city in ('a', 'b', 'c')]
EDGES = [
    {'id': 'a--b', 'u': 'a', 'v': 'b', 'length_km': 2},
    {'id': 'b--c', 'u': 'b', 'v': 'c', 'length_km': 3},
    {'id': 'a--c', 'u': 'a', 'v': 'c', 'length_km': 4},
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--algorithm', choices=['all', 'kruskal', 'tarjan', 'dijkstra', 'greedy'], default='all')
    choice = parser.parse_args().algorithm
    tree = kruskal_mst(NODES, EDGES)
    print('Жишээ: A--B = 2 км, B--C = 3 км, A--C = 4 км.\n')

    if choice in ('all', 'kruskal'):
        print('1. Kruskal — бага нийт урттай сүлжээ байгуулах')
        print('Сонгосон:', ', '.join(edge['id'] for edge in tree))
        print('Нийт урт:', sum(edge['length_km'] for edge in tree), 'км\n')

    if choice in ('all', 'tarjan'):
        print('2. Tarjan — тасарвал сүлжээ салгах кабель олох')
        print('MST-ийн гүүрүүд:', tarjan_bridges(NODES, tree)['bridges'])
        print('Бүтэн гурвалжны гүүрүүд:', tarjan_bridges(NODES, EDGES)['bridges'], '\n')

    if choice in ('all', 'dijkstra'):
        print('3. Dijkstra — A-аас C хүрэх хамгийн богино зам')
        normal = dijkstra(NODES, EDGES, 'a', 'c')
        after_cut = dijkstra(NODES, [e for e in EDGES if e['id'] != 'a--c'], 'a', 'c')
        print('Хэвийн:', ' → '.join(normal['route']), '=', normal['length_km'], 'км')
        print('A--C тасарсны дараа:', ' → '.join(after_cut['route']), '=', after_cut['length_km'], 'км\n')

    if choice in ('all', 'greedy'):
        print('4. Greedy augmentation — MST-д нөөц кабель нэмэх')
        result = augment_to_two_edge_connected(NODES, EDGES, tree)
        for addition in result['additions']:
            print('Нэмсэн:', addition['edge_id'])
            print('Арилгасан гүүр:', addition['eliminated'])
            print('Оноо (км/гүүр):', addition['score'])
        print('Үлдсэн гүүр:', tarjan_bridges(NODES, result['edges'])['bridges'])
        print('Гурван хот холбоотой, нэг кабелийн тасралтад тэсвэртэй.')
        print('Энэ нь heuristic; глобал minimum cost баталгаа биш.')


if __name__ == '__main__':
    main()
