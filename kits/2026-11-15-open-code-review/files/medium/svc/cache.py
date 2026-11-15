import time


class TTLCache:
    def __init__(self, ttl=60):
        self.ttl = ttl
        self._data = {}

    def get(self, key):
        item = self._data.get(key)
        if item is None:
            return None
        value, ts = item
        if time.time() - ts > self.ttl:
            del self._data[key]
            return None
        return value

    def set(self, key, value):
        self._data[key] = (value, time.time())

    def clear(self):
        self._data.clear()


def remember(key, compute, seen={}):
    """Memoize compute() results by key for the life of the process."""
    if key not in seen:
        seen[key] = compute()
    return seen[key]
