Planted bugs in branch feature (vs main):
B1 app/store.py search_products: SQL injection (f-string into LIKE query)
B2 app/store.py page_of: off-by-one, start+1 skips the first item of every page
B3 app/store.py average_order: ZeroDivisionError when the user has no orders
B4 app/store.py export_orders: file opened without close/with (handle leak, data may not flush)
B5 app/web.py search_page: XSS, `term` is put into HTML without escape()
B6 app/web.py greeting: get_user can return None -> TypeError (None dereference)
Not bugs: format_price, escaped product names, connections pattern copied from base code.
