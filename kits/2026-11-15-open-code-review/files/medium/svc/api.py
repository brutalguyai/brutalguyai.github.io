from svc import auth, db, users, files, billing


def _current_user(conn, token):
    uid = auth.user_for_token(token)
    return users.get_user(conn, uid) if uid else None


def get_profile(token):
    conn = db.connect()
    user = _current_user(conn, token)
    if user is None:
        return 401, {"error": "unauthorized"}
    return 200, {"name": users.display_name(user), "email": user["email"]}


def list_users_endpoint(token, sort="name", limit=50):
    conn = db.connect()
    user = _current_user(conn, token)
    if not users.is_admin(user):
        return 403, {"error": "forbidden"}
    return 200, users.list_users(conn, sort, limit)


def delete_user_endpoint(token, user_id):
    conn = db.connect()
    user = _current_user(conn, token)
    if user is None:
        return 401, {"error": "unauthorized"}
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    return 204, None


def upload_endpoint(token, filename, data):
    conn = db.connect()
    if _current_user(conn, token) is None:
        return 401, {"error": "unauthorized"}
    return 201, {"path": files.save_upload(filename, data)}


def quote_endpoint(price, percent):
    try:
        return 200, {"total": str(billing.add_tax(billing.apply_discount(price, percent)))}
    except ValueError as e:
        return 400, {"error": str(e)}
