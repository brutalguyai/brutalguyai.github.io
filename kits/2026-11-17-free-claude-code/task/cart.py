from pricing import line_total, apply_discount


def cart_total(items, coupon=None):
    """items: list of dicts with price (float), qty (int). Returns total rounded to 2 dp."""
    subtotal = sum(line_total(i["price"], i["qty"]) for i in items)
    return round(apply_discount(subtotal, coupon), 2)
