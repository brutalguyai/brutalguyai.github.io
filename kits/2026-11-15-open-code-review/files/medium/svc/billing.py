from decimal import Decimal, ROUND_HALF_UP

TAX_RATE = Decimal("0.18")


def to_money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def apply_discount(price, percent):
    """Apply a percentage discount (0-100) to a price."""
    if not 0 <= percent <= 100:
        raise ValueError("percent must be between 0 and 100")
    return to_money(Decimal(price) - Decimal(percent))


def add_tax(amount):
    return to_money(Decimal(amount) * (1 + TAX_RATE))


def invoice_total(lines):
    """lines: list of (unit_price, qty)."""
    subtotal = sum(Decimal(p) * q for p, q in lines)
    return add_tax(subtotal)


def split_evenly(total, people):
    if people <= 0:
        raise ValueError("people must be positive")
    share = to_money(Decimal(total) / people)
    return [share] * people
