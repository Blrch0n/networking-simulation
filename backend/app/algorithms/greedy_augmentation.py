"""4. Greedy augmentation: MST-д нөөц кабель нэмж гүүрүүдийг арилгах.

Score = added length / number of bridges eliminated. This is a deterministic
heuristic, not a proof of globally minimum construction cost. A disconnected
input remains disconnected; zero bridges alone does not guarantee protection.
"""

from .common import edge_order
from .tarjan import tarjan_bridges


def augment_to_two_edge_connected(nodes, candidates, tree):
    selected = list(tree)  # Өгөгдсөн MST-г өөрчлөхгүй, хуулж эхэлнэ.
    used = {edge['id'] for edge in selected}
    bridges = tarjan_bridges(nodes, selected)['bridges']
    additions = []

    while bridges:
        best = None

        for edge in sorted(candidates, key=edge_order):
            if edge['id'] in used:
                continue

            # 1. Энэ кабелийг нэмбэл хэдэн гүүр арилахыг түр шалгана.
            trial_bridges = tarjan_bridges(nodes, selected + [edge])['bridges']
            eliminated = len(bridges) - len(trial_bridges)
            if eliminated <= 0:
                continue

            # 2. Нэг гүүр арилгахад шаардах урт бага байх тусмаа сайн.
            score = edge['length_km'] / eliminated
            rank = (score, *edge_order(edge))
            if best is None or rank < best[0]:
                best = (rank, edge, eliminated)

        # Байгаа кабелиудаар хамгаалалт гүйцээх боломжгүй.
        if best is None:
            break

        # 3. Хамгийн сайн кабелийг нэмээд дахин шалгана.
        rank, edge, eliminated = best
        selected.append(edge)
        used.add(edge['id'])
        additions.append({
            'edge_id': edge['id'],
            'eliminated': eliminated,
            'score': rank[0],
        })
        bridges = tarjan_bridges(nodes, selected)['bridges']

    return {'edges': selected, 'additions': additions}
