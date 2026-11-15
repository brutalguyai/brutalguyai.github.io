import sqlite3

DB_PATH = "shop.db"


def connect():
    return sqlite3.connect(DB_PATH)


def get_user(conn, user_id):
    row = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        return None
    return {"id": row[0], "name": row[1], "email": row[2]}


def list_orders(conn, user_id):
    rows = conn.execute("SELECT id, total FROM orders WHERE user_id = ?", (user_id,)).fetchall()
    return [{"id": r[0], "total": r[1]} for r in rows]


def search_products(conn, term):
    query = f"SELECT id, name, price FROM products WHERE name LIKE '%{term}%'"
    return conn.execute(query).fetchall()


def page_of(items, page, per_page=10):
    start = page * per_page
    return items[start + 1:start + per_page]


def average_order(conn, user_id):
    orders = list_orders(conn, user_id)
    return sum(o["total"] for o in orders) / len(orders)


def export_orders(conn, user_id, path):
    f = open(path, "w")
    for o in list_orders(conn, user_id):
        f.write(f"{o['id']},{o['total']}\n")
    return path


def format_price(cents):
    return f"${cents / 100:.2f}"
