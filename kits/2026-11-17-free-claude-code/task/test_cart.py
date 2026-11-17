from cart import cart_total

ITEMS = [{"price": 20.0, "qty": 2}, {"price": 5.5, "qty": 4}]


def test_no_coupon():
    assert cart_total(ITEMS) == 62.0


def test_save10():
    assert cart_total(ITEMS, "SAVE10") == 55.8


def test_half_lowercase():
    assert cart_total(ITEMS, "half") == 31.0


def test_unknown_coupon():
    assert cart_total(ITEMS, "NOPE") == 62.0
