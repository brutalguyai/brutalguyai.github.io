from html import escape
from app import store


def profile_page(user_id):
    conn = store.connect()
    user = store.get_user(conn, user_id)
    if user is None:
        return "<p>Not found</p>"
    return "<h1>" + escape(user["name"]) + "</h1>"


def search_page(term):
    conn = store.connect()
    rows = store.search_products(conn, term)
    items = "".join("<li>" + escape(r[1]) + " " + store.format_price(r[2]) + "</li>" for r in rows)
    return "<h2>Results for " + term + "</h2><ul>" + items + "</ul>"


def greeting(user_id):
    conn = store.connect()
    user = store.get_user(conn, user_id)
    return "Welcome back, " + escape(user["name"])
