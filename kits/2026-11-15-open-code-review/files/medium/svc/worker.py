import logging
import time

log = logging.getLogger(__name__)


def send_with_retry(send, payload, attempts=3, delay=0.5):
    """Call send(payload), retrying up to `attempts` times on failure."""
    tries = 0
    while tries < attempts:
        try:
            return send(payload)
        except ConnectionError as e:
            log.warning("send failed: %s", e)
            time.sleep(delay)
    raise RuntimeError("giving up after retries")


def chunked(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def process_batch(items, handler, size=100):
    done = 0
    for chunk in chunked(items, size):
        for item in chunk:
            handler(item)
            done += 1
    return done
