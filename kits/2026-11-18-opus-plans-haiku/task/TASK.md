# Feature: monthly report

Add these to the `ledger` package. Keep the existing files working.

1. `ledger/report.py` with `summarize(transactions, month)`:
   - `month` is a string like `"2026-10"`; include only transactions dated in that calendar month.
   - Return a dict mapping category -> net total for the month (refunds are negative amounts and reduce the total), rounded to 2 decimals.
   - Categories whose net total is exactly 0 are left out.

2. In the same file, `find_duplicates(transactions)`:
   - Return a list of `(earlier_id, later_id)` tuples for pairs with the same payee and the same amount whose dates are at most 2 days apart (inclusive).
   - Refunds (negative amounts) are never duplicates.
   - Sort the list by the earlier transaction's date, then by its id.

3. A command line: `python -m ledger report <data.json> --month 2026-10` prints one line per category as `<Category>: <total>` with the total formatted to 2 decimals, sorted by total descending (ties: category name A-Z), then a final line `Possible duplicates: <n>` counting duplicate pairs among that month's transactions.

Do not change `models.py` or `store.py`.
