COUPONS = {"SAVE10": 0.10, "HALF": 0.50}


def line_total(price, qty):
    return price * qty


def apply_discount(subtotal, coupon):
    if coupon is None:
        return subtotal
    rate = COUPONS.get(coupon.upper(), 0)
    return subtotal - rate
