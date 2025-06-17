def split(data: list, count: int) -> list:
    return [data[i:i + count] for i in range(0, len(data), count)]


def chunky(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]
