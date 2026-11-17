import subprocess, sys, os
from datetime import date
import pytest
from ledger.models import Transaction as T
from ledger.store import load
from ledger.report import summarize, find_duplicates

DATA = os.path.join(os.getcwd(), "data.json")
def tx(i, d, p, c, a): return T(i, date.fromisoformat(d), p, c, a)

def test_month_boundaries():
    s = summarize(load(DATA), "2026-10")
    assert s["Housing"] == 900.0  # Sep 30 and Nov 1 excluded

def test_refund_reduces_total():
    assert summarize(load(DATA), "2026-10")["Groceries"] == 98.4

def test_rounding():
    t = [tx("a", "2026-10-01", "x", "C", 0.1), tx("b", "2026-10-02", "y", "C", 0.2)]
    assert summarize(t, "2026-10") == {"C": 0.3}

def test_zero_category_dropped():
    t = [tx("a", "2026-10-01", "x", "C", 5), tx("b", "2026-10-02", "x", "C", -5), tx("c", "2026-10-02", "x", "D", 1)]
    assert summarize(t, "2026-10") == {"D": 1.0}

def test_other_year_same_month_excluded():
    t = [tx("a", "2025-10-01", "x", "C", 5), tx("b", "2026-10-02", "x", "C", 1)]
    assert summarize(t, "2026-10") == {"C": 1.0}

def test_duplicates_basic():
    assert ("t3", "t4") in find_duplicates(load(DATA))

def test_duplicates_window_inclusive_2_days():
    t = [tx("a", "2026-10-01", "P", "C", 9), tx("b", "2026-10-03", "P", "C", 9), tx("c", "2026-10-06", "P", "C", 9)]
    assert find_duplicates(t) == [("a", "b")]

def test_duplicates_across_month_end():
    assert ("t1", "t2") in find_duplicates(load(DATA))

def test_refund_never_duplicate():
    t = [tx("a", "2026-10-01", "P", "C", -9), tx("b", "2026-10-02", "P", "C", -9)]
    assert find_duplicates(t) == []

def test_duplicates_sorted():
    t = [tx("z", "2026-10-05", "Q", "C", 1), tx("y", "2026-10-06", "Q", "C", 1), tx("b", "2026-10-01", "P", "C", 2), tx("a", "2026-10-01", "P", "C", 2)]
    assert find_duplicates(t) == [("a", "b"), ("z", "y")]

def test_cinema_not_duplicate():
    assert not any(set(p) == {"t5", "t8"} for p in find_duplicates(load(DATA)))

def test_cli_output():
    out = subprocess.run([sys.executable, "-m", "ledger", "report", DATA, "--month", "2026-10"], capture_output=True, text=True, timeout=30).stdout.strip().splitlines()
    assert out == ["Housing: 900.00", "Groceries: 98.40", "Transport: 45.00", "Fun: 37.00", "Possible duplicates: 1"]
