from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Transaction:
    id: str
    day: date
    payee: str
    category: str
    amount: float  # positive = money spent, negative = refund
