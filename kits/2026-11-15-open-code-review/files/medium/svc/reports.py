from statistics import median


def daily_totals(orders):
    """orders: list of dicts with 'day' and 'amount'. Returns {day: total}."""
    totals = {}
    for o in orders:
        totals[o["day"]] = totals.get(o["day"], 0) + o["amount"]
    return totals


def revenue(amounts):
    total = 0
    for i in range(1, len(amounts)):
        total += amounts[i]
    return total


def median_order(amounts):
    return median(amounts) if amounts else 0


def top_customers(orders, n=5):
    by_customer = {}
    for o in orders:
        by_customer[o["customer"]] = by_customer.get(o["customer"], 0) + o["amount"]
    return sorted(by_customer.items(), key=lambda kv: kv[1], reverse=True)[:n]
