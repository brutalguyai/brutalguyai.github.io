import os

UPLOAD_DIR = "/srv/uploads"
MAX_BYTES = 5 * 1024 * 1024


def save_upload(filename, data):
    if len(data) > MAX_BYTES:
        raise ValueError("file too large")
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(data)
    return path


def list_uploads():
    return sorted(os.listdir(UPLOAD_DIR))


def human_size(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"
