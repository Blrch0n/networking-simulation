"""5. Round Robin: пакетуудыг замуудад ээлжлэн хуваарилах.

Dijkstra finds routes; this scheduler only chooses which route gets each packet.
The cursor belongs to the request, never to a global shared server variable.
"""


def round_robin(path_ids, packet_count, start_index=0):
    if not isinstance(path_ids, list) or any(not isinstance(path, str) or not path for path in path_ids):
        raise ValueError('Path IDs must be a list of nonempty strings')
    if len(set(path_ids)) != len(path_ids):
        raise ValueError('Path IDs must be unique')
    if type(packet_count) is not int or not 0 <= packet_count <= 1000:
        raise ValueError('Packet count must be an integer from 0 to 1000')
    if type(start_index) is not int or not 0 <= start_index <= 1_000_000_000:
        raise ValueError('Start index must be a nonnegative integer up to 1000000000')

    packets = []
    counts = {path: 0 for path in path_ids}
    if not path_ids:
        return {'packets': packets, 'counts': counts, 'next_index': 0}

    # 1. Өмнөх batch-ийн үргэлжлэх замаас эхэлнэ.
    index = start_index % len(path_ids)
    for number in range(1, packet_count + 1):
        # 2. Одоогийн замд нэг пакет өгнө.
        path = path_ids[index]
        packets.append({'packet': number, 'path_id': path, 'path_index': index})
        counts[path] += 1
        # 3. Дараагийн зам руу шилжинэ. Сүүлийн замын дараа эхнийх рүү буцна.
        index = (index + 1) % len(path_ids)

    return {'packets': packets, 'counts': counts, 'next_index': index}
