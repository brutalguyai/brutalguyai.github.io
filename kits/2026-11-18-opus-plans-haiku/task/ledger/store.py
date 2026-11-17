import json
from datetime import date

from .models import Transaction


def load(path):
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    return [
        Transaction(r["id"], date.fromisoformat(r["day"]), r["payee"], r["category"], float(r["amount"]))
        for r in raw
    ]
