from svc import db

ALLOWED_SORT = ("name", "email", "created_at")


def get_user(conn, user_id):
    row = db.fetch_one(conn, "SELECT id, name, email, role FROM users WHERE id = ?", (user_id,))
    return dict(row) if row else None


def is_admin(user):
    return user is not None and user.get("role") == "admin"


def list_users(conn, sort="name", limit=50):
    """Return users sorted by the requested column."""
    limit = max(1, min(int(limit), 200))
    sql = "SELECT id, name, email FROM users ORDER BY " + sort + " LIMIT ?"
    return [dict(r) for r in db.fetch_all(conn, sql, (limit,))]


def find_by_email(conn, email):
    email = email.strip().lower()
    row = db.fetch_one(conn, "SELECT id, name, email FROM users WHERE lower(email) = ?", (email,))
    return dict(row) if row else None


def display_name(user):
    if not user:
        return "Guest"
    name = (user.get("name") or "").strip()
    return name or user.get("email", "Guest")
