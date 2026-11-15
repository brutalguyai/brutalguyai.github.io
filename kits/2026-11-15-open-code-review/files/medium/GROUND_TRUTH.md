Medium PR (target2, feature vs main): 8 files, 250 added lines. 8 planted bugs:
M1 svc/users.py list_users: SQL injection via ORDER BY `sort` (ALLOWED_SORT defined but never used)
M2 svc/auth.py user_for_token: expiry check inverted (expires < now+TTL is always true -> expired tokens accepted)
M3 svc/cache.py remember: mutable default `seen={}` (cache shared across all callers forever)
M4 svc/billing.py apply_discount: subtracts the percent as an amount (price - percent) instead of price*(1-percent/100)
M5 svc/files.py save_upload: path traversal (user filename joined into UPLOAD_DIR unchecked)
M6 svc/worker.py send_with_retry: `tries` never incremented -> infinite retry loop
M7 svc/reports.py revenue: range(1, ...) skips the first amount
M8 svc/api.py delete_user_endpoint: any logged-in user can delete any user (no is_admin check)
