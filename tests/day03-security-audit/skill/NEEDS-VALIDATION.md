# Ledgerly: leads that need validation

These are source-grounded hypotheses about a boundary. Each one is blocked on a specific fact that this run could not observe. They are **not** confirmed vulnerabilities and carry **no severity**. Deployment checks are configuration reviews for the owner to perform. Do not send audit traffic to a live system.

## N1. Anonymous register/login run synchronous scrypt on the single event loop with no rate or concurrency gate

**Fingerprint:** `ledgerly/auth/scryptSync-preauth-event-loop-blocking` · linked units: avail-scrypt

Every anonymous POST /api/auth/register whose password has 10 or more characters runs crypto.scryptSync on the main thread of the only Node process. So does every POST /api/auth/login for an email that exists, and an attacker can create such an email through /register. On register, the hash is computed before the INSERT, so a duplicate email still costs one full scrypt call before the UNIQUE constraint rejects it. The hunter's built-in harness (agents/hunter-w2-avail/artifacts/check-01.txt) copied the verbatim src/lib/auth.js expressions and measured about 77-86 ms per call. An already-due 0 ms timer was delayed 89.4 ms, so the event loop is blocked for the whole call. It is not an execution of the target. src/ has no rate limiter, lockout, concurrency cap, worker offload, or cluster: grep for rate, limit, cluster, worker and throttl finds only the 100kb body limit and an unrelated SQL LIMIT. In principle, about a dozen anonymous requests per second could keep the loop busy and delay every other user's traffic, including authenticated invoice requests and public share pages. Whether that is reachable depends on deployment controls (rate-limiting proxy or gateway, replica count, CPU) that the repository does not show. The running service's latency impact was not observed.

**Claimed root cause:** hashPassword and checkPassword (src/lib/auth.js:6 and :11) use the blocking crypto.scryptSync instead of async crypto.scrypt. The anonymous auth routes (src/routes/auth.js:5-16) call them with no per-IP or per-account rate limit and no concurrency limit. The only earlier control is express.json({limit:'100kb'}) at src/server.js:5. It caps body size, not request count, and the harness showed password length does not materially change the cost.

### Trace

1. **entrypoint** `src/server.js:6` `app.use('/api/auth')`: The anonymous auth router is mounted. The only earlier middleware is express.json({limit:'100kb'}) at line 5. There is no rate limiter, and line 13 runs a single app.listen with no cluster.
2. **propagation** `src/routes/auth.js:7` `POST /register`: The only check is that email and password are truthy and password.length >= 10.
3. **propagation** `src/routes/auth.js:8` `POST /register`: hashPassword(password) is evaluated as an argument to .run(), before the INSERT executes. The scrypt cost is therefore paid even when the email is a duplicate and the insert then fails.
4. **propagation** `src/routes/auth.js:14` `POST /login`: checkPassword runs whenever the SELECT at line 13 finds the email. The attacker can make that true by registering the email first.
5. **sink** `src/lib/auth.js:6` `hashPassword`: crypto.scryptSync(pw, salt, 32), with Node defaults N=16384, r=8, p=1, blocks the shared event loop for the full KDF computation. checkPassword does the same at line 11.

### Evidence

- `src/lib/auth.js:6`: Synchronous scryptSync in hashPassword. The hunter's built-in harness (agents/hunter-w2-avail/artifacts/check-01.txt), not a target execution, measured 85.8 ms per call and an 89.4 ms delay of an already-due 0 ms timer.
- `src/lib/auth.js:11`: Synchronous scryptSync in checkPassword. The same harness measured 77.2 ms for one call.
- `src/server.js:5`: The only request gate is the 100kb JSON body limit. src/ has no rate limiter, concurrency limit, or cluster/worker setup (line 13 is a single app.listen).
- `src/routes/auth.js:8`: scrypt runs before the INSERT, so repeated register requests with the same email still cost one scrypt call each.

### Blockers

- The repository does not show whether a reverse proxy, WAF, or API gateway applies per-IP rate limits to /api/auth/*. It also does not show how many replicas or cluster workers run, or how much CPU each instance has. These decide whether an anonymous client can sustain the needed request rate against the shared loop.
- The target server was not run, because the required OS sandbox was unavailable and the run constraint forbids executing target code. The verifier's own single-call harness could not be run either: the host permission system denied Bash execution, so check-01.txt in v3-13 scratch was not produced and nothing is offered for promotion. The cost figures rest on the hunter's promoted harness artifact plus source review. The running service's request-latency impact was not observed.

### Resolution plan

- **Local (bounded, sandboxed):** In an approved OS sandbox with CPU, memory and wall-clock limits and no network, start the target against a :memory: or scratch DB. Send exactly one POST /api/auth/register {email:'a@example.test', password:'0123456789'}. While it is in flight, send one GET /i/<seeded share token>, and check that the GET's latency rises by about one scrypt duration (about 80 ms). Use one pair of requests only, no load test. Regression test: after switching hashPassword and checkPassword to async crypto.scrypt (or a worker pool) and adding a per-IP and per-account limiter on /api/auth, a 0 ms timer scheduled before the hash call must fire before the KDF completes. The (N+1)th register or login request inside the limiter window must get 429.
- **Owner-observed:** The owner should check the ingress, proxy or gateway config for per-IP request limits on POST /api/auth/register and POST /api/auth/login (requests per IP per second, and any global cap). They should also record the Node process or replica count and the CPU allocated to each instance. If no limit exists and a single process serves all traffic, the shared-loop delay applies to every user.

---

## N2. Attachment download checks authentication only, with no per-owner or per-invoice authorization

**Fingerprint:** `ledgerly/files-attachments-missing-owner-binding` · linked units: attach-owner

Any authenticated principal, including a self-registered member, can call GET /api/files/attachments?name=<file> and receive any file in the single shared config.uploadDir by name. The route comment says the endpoint serves an 'attachment uploaded to an invoice', but the handler never links the requested name to an invoice owned by req.user.sub. It does not read req.user, does not query the database, and takes no invoice id. This root cause is separate from the uploadDir path-traversal candidate. Even after a correct basename/containment fix, other owners' files inside uploadDir would still be readable. Whether this causes a real cross-owner disclosure depends on facts the repository does not show: what writes to uploadDir, whether files from several owners share it, and whether their names can be guessed.

**Claimed root cause:** src/routes/files.js:11-13 resolves req.query.name directly against the single shared config.uploadDir (src/config.js:5) and calls res.sendFile. It never consults req.user or any record that maps an attachment to an invoice and an owner. The schema (src/lib/db.js:4-7) defines only the users and invoices tables, so there is no attachment ownership data to check. The only gate is router.use(requireAuth) at src/routes/files.js:7, which proves identity, not ownership.

### Trace

1. **entrypoint** `src/server.js:9` `app.use('/api/files', require('./routes/files'))`: The files router is mounted at /api/files with no extra authorization middleware; the only global middleware is express.json at line 5.
2. **propagation** `src/routes/files.js:7` `router.use(requireAuth)`: The only control on the router: a valid HS256 JWT for any user, including a freshly self-registered member.
3. **propagation** `src/lib/auth.js:20` `requireAuth`: Sets req.user = jwt.verify(...) payload {sub, role} and calls next(); it does no resource-level authorization.
4. **propagation** `src/routes/files.js:11` `GET /attachments handler`: path.join(config.uploadDir, req.query.name || '') joins the caller-supplied name to the shared uploadDir with no owner or invoice predicate.
5. **sink** `src/routes/files.js:13` `GET /attachments handler`: res.sendFile(file) returns the file contents to the caller whichever owner's invoice the file belongs to; the only precondition is fs.existsSync at line 12.

### Evidence

- `src/routes/files.js:9`: The comment 'Download an attachment uploaded to an invoice' states that the files are scoped to invoices, and therefore to owners.
- `src/routes/files.js:11`: The handler body (lines 10-14) never references req.user, the DB, or an invoice id. files.js imports only express, path, fs, ../config and ../lib/auth, not ../lib/db.
- `src/config.js:5`: uploadDir is one flat directory (<repo>/uploads) shared by all principals, with no per-owner namespace.
- `src/lib/db.js:6`: The invoices table has no attachment column, and no attachments table exists (lines 4-7), so the source has no ownership record that could be enforced.
- `src/routes/invoices.js:37`: DELETE /api/invoices/:id binds owner_id = req.user.sub, and the list at line 13 does the same. The attachment path for the same invoice data has no equivalent check.

### Blockers

- No in-repository code writes to uploadDir. A grep of the repo outside node_modules finds no upload route, multipart parser, writeFile or createWriteStream aimed at uploads. The uploads/ directory has no files in the checkout. Which process fills uploadDir, its naming scheme (guessable or random), and whether files from several owners share the directory in a deployment cannot be seen in source, and these facts decide whether a cross-owner read exists.

### Resolution plan

- **Local (bounded, sandboxed):** Write a self-authored harness that uses only Node built-ins in agents/v3-11/scratch, with no require of target files. Under scratch, create a fixture directory holding 'inv-1-receipt.pdf' (dummy owner 2, content 'OWNER2') and 'inv-7-contract.pdf' (dummy owner 3). Copy the files.js:11-13 expression verbatim into a stub handler, using path.join and fs.existsSync with a stub res.sendFile that reads the file into the output. Set req.user = {sub: 3, role: 'member'} and req.query.name = 'inv-1-receipt.pdf', and confirm the output is 'OWNER2'. Repeat with a basename/containment-fixed variant to show the cross-owner read survives the traversal fix. Write the harness source and stdout to check-01.txt. Also confirm statically that files.js lines 10-14 contain no req.user, db, or owner_id reference.
- **Owner-observed:** Owner-observed and non-destructive: identify the process that fills <repo>/uploads (or the configured uploadDir) in production, whether an out-of-repo uploader, admin tooling, or a migration. List the directory's filenames without reading their contents. Record whether files from different owners share the flat directory and whether the names are predictable (sequential invoice ids, original client filenames) or unguessable random tokens. With two dummy test accounts, upload an attachment as account A through the real upload flow, then request GET /api/files/attachments?name=<that name> with account B's bearer token. A 200 response with A's dummy content confirms cross-owner disclosure.

---

## N3. ALLOWED_GIT lookup accepts Object.prototype keys, so admins can hang the request or crash the process

**Fingerprint:** `ledgerly/tools-git-allowlist-prototype-lookup` · linked units: tools-git

GET /api/tools/diagnostics/git (src/routes/tools.js:27-31, mounted at src/server.js:10, behind requireAuth and requireAdmin) picks its argv with ALLOWED_GIT[req.query.what]. ALLOWED_GIT is a plain object literal, and the only guard is a truthiness check. Inherited names pass that guard because they resolve to truthy Object.prototype functions. Examples are hasOwnProperty, valueOf, isPrototypeOf, propertyIsEnumerable, toLocaleString, toString and constructor. Node v22's normalizeExecFileArgs takes the 'typeof args === function' branch for these values. It sets callback to the prototype function, sets options to null and args to [], and drops both the route callback and the {timeout:3000} options. execFile then runs 'git' with no arguments and no timeout, and the route never sends a response. Inside Node's strict-mode child_process module, exithandler calls the callback as a plain call (`callback(ex, stdout, stderr)`), so this=undefined. Two harnesses reproduced this call shape. Under it, hasOwnProperty, valueOf, isPrototypeOf, propertyIsEnumerable and toLocaleString throw a TypeError inside the 'close' listener, or inside the 'error' listener through errorhandler. Nothing catches that throw at process level, and the repository installs no process 'uncaughtException' handler. The expected result is that the whole shared Node process terminates. toString and constructor do not throw; they only leave the request hanging. what=__proto__ throws ERR_INVALID_ARG_TYPE synchronously, which Express turns into a 500. The attacker cannot control argv, so this is not command injection. Context: the precondition is an admin token. Note that PATCH /api/users/me (src/routes/users.js:12) lets a user write the 'role' field, and that is tracked as a separate root cause. For isPrototypeOf only, the throw also requires git to exit non-zero, or to fail to spawn, so that the first callback argument is an Error object. git run with no arguments normally exits non-zero, but no run here observed that.

**Claimed root cause:** src/routes/tools.js:28 indexes ALLOWED_GIT, a plain object literal that inherits from Object.prototype (tools.js:26), with untrusted req.query.what. tools.js:29 checks only truthiness, not own-property membership or Array.isArray. So inherited functions reach execFile at tools.js:30 in the args position.

### Trace

1. **entrypoint** `src/routes/tools.js:27` `GET /api/tools/diagnostics/git`: Admin-gated route (requireAuth at tools.js:6, requireAdmin at tools.js:27). The query parameter 'what' comes from the request.
2. **propagation** `src/routes/tools.js:28` `git handler`: ALLOWED_GIT[req.query.what] with what=hasOwnProperty resolves to Object.prototype.hasOwnProperty. The truthiness guard at line 29 lets it through.
3. **sink** `src/routes/tools.js:30` `git handler`: execFile('git', <function>, {timeout:3000}, routeCb). normalizeExecFileArgs makes the function the callback and nulls the options, which drops the timeout and the route callback. exithandler later calls the prototype function plainly with this=undefined, and that throws inside a child-process event listener.

### Evidence

- `src/routes/tools.js:26`: ALLOWED_GIT is a plain object literal with Object.prototype as its prototype, not a null-prototype object or a Map.
- `src/routes/tools.js:29`: The guard is `if (!args)`, a truthiness check only. It does not check hasOwnProperty or Array.isArray.
- `src/routes/tools.js:30`: The route callback and the {timeout:3000} options are positional. A function in the args position displaces both.
- `src/server.js:10`: The tools router is mounted at /api/tools in the single shared server process. The repository source installs no process-level uncaughtException handler (grep of the repo outside node_modules found none).
- `src/lib/auth.js:27`: requireAdmin trusts the role claim in the JWT, so the precondition is an admin token.

### Blockers

- The decisive end effect is a real ChildProcess emitting 'close' or 'error' and then the Node process exiting on the uncaught TypeError. Observing it requires spawning a child process, which this run prohibited because no OS-enforced sandbox was available. Verifier harness check-01 (agents/v3-05/artifacts/check-01.txt) is a self-authored built-in harness, not an execution of the target. It read Node v22.23.4's child_process natives and showed that the module is strict mode and that exithandler is registered via child.addListener('close'/'error') and calls `callback(ex, stdout, stderr)` plainly. It reproduced tools.js:26-29 verbatim inside an asynchronously emitted EventEmitter 'close' listener. There, hasOwnProperty, valueOf, isPrototypeOf, propertyIsEnumerable and toLocaleString reached process 'uncaughtException', while toString and constructor returned without throwing. That harness did not observe a real spawned git process or an actual process exit. It also did not observe git's exit code with no arguments, which matters for the isPrototypeOf case only.

### Resolution plan

- **Local (bounded, sandboxed):** Use an approved sandbox with no network, an empty environment, a read-only target and rlimits. (1) From a throwaway script, call child_process.execFile('git', Object.prototype.hasOwnProperty, {timeout:3000}, () => {}) with no uncaughtException handler, and confirm the process exits with 'TypeError: Cannot convert undefined or null to object' when the child closes. Repeat with git absent from PATH to cover the 'error' path. (2) Seed a dummy database, start the server, and log in as the seeded dummy admin. Send GET /api/tools/diagnostics/git?what=hasOwnProperty with that bearer token, and confirm the server process terminates and a later GET /api/tools/status fails to connect. (3) Send what=toString, and confirm the request never gets a response and the git child has no 3000 ms timeout. (4) Confirm that what=rev still returns the fixed rev-parse output.
- **Owner-observed:** Owner check, non-destructive: confirm whether production runs under a supervisor that auto-restarts on crash (pm2, systemd or container restart policy), and whether the production entrypoint adds a process.on('uncaughtException') handler. Both settle the availability impact without sending the payload to the live service.

---

## N4. Link preview buffers an attacker-chosen upstream response with no size cap, deadline, or cancellation

**Fingerprint:** `ledgerly/tools-preview-unbounded-response-buffering` · linked units: avail-tools

Any authenticated member can call GET /api/tools/preview?url=<attacker-run host>. Open registration makes anyone a member: POST /api/auth/register creates a role='member' account, and POST /api/auth/login issues a token that passes requireAuth. The handler calls fetch(req.query.url, {redirect:'follow'}) with no AbortSignal or timeout. It then calls await r.text(), which reads the whole response body into one in-process string with no byte limit. Nothing stops the fetch when the client disconnects, and there is no per-user or global concurrency limit. A host the attacker controls can return a very large body, which uses Node process memory shared by all tenants. It can also send headers and then feed the body very slowly, which keeps the socket, the buffered data, and the pending handler alive until undici's own network timeouts fire. The source and a built-in harness (hunter check-02, reviewed independently) show that this consumer has no bound. What is not shown is that this actually crashes or degrades the shared service. That depends on process and container memory limits, the supervisor setup, and egress controls that are not in the repository. This root cause is separate from the destination SSRF candidate ledgerly/tools-preview-unrestricted-fetch. That candidate is about which hosts the server may reach. This one is about how much response data and time the server will spend on a host it is allowed to reach. An allowlist that bans internal addresses would still let a public attacker host serve a huge or never-ending body, so each needs its own fix.

**Claimed root cause:** src/routes/tools.js:11 calls fetch(req.query.url, { redirect: 'follow' }) with no signal, timeout, or AbortController, and does not tie the fetch to the request's 'close' event. src/routes/tools.js:12 then calls await r.text(), which reads the full body with no Content-Length check, streaming byte cap, or truncation. No concurrency limit is applied to outbound previews. The only size limit in the app is express.json({ limit: '100kb' }) at src/server.js:5, and it applies only to inbound request bodies.

### Trace

1. **entrypoint** `src/routes/tools.js:9` `GET /api/tools/preview`: The url query parameter is chosen by the attacker. The only gate is router.use(requireAuth) at line 6. Any member token from open registration (src/routes/auth.js:5) and login (src/routes/auth.js:12-16) passes it. No admin check applies to this route.
2. **propagation** `src/routes/tools.js:11` `fetch(req.query.url, { redirect: 'follow' })`: The outbound fetch follows redirects and has no AbortSignal, timeout, or concurrency limit. Nothing cancels it if the client disconnects.
3. **sink** `src/routes/tools.js:12` `await r.text()`: The whole upstream body is buffered into process memory and decoded to a string with no byte limit. Line 13 then runs a regex over the full string.

### Evidence

- `src/routes/tools.js:6`: router.use(requireAuth) is the only control on /preview. requireAdmin is applied only to the diagnostics routes (lines 21 and 27).
- `src/routes/tools.js:11`: The fetch options contain only redirect:'follow', with no signal or timeout. The file has no AbortController and no req.on('close') handler.
- `src/routes/tools.js:12`: await r.text() has no size cap. Hunter artifact agents/hunter-w2-avail/artifacts/check-02.txt, which this verifier reviewed independently, contains a built-in harness that copies tools.js:12-13 verbatim onto a local WHATWG Response. It shows an 8 MiB body buffered in full (8388608 chars) and a stalled stream still unsettled after 301 ms. This is not an execution of the target, and no network was used.
- `src/server.js:5`: express.json({ limit: '100kb' }) limits only inbound JSON request bodies. It does not limit outbound fetch responses.
- `src/routes/auth.js:5`: Open self-registration has no invite or approval step, so the member precondition costs an attacker nothing.

### Blockers

- The shared-service impact (process OOM, event-loop or memory pressure on other tenants, socket exhaustion) cannot be observed without running the target. The required OS sandbox (network/mount namespaces, rlimits) is unavailable on this host, and this verifier's own built-in harness run was also denied by the host permission system, so no new check-NN.txt was produced. The outcome depends on the Node heap and container RSS limits and on the supervisor or restart policy, none of which are in the repository.
- Real-network undici behavior could not be exercised because no network is permitted. That includes the default headersTimeout and bodyTimeout (300 s), whether a slow drip that stays under the idle timeout holds the request open indefinitely, and redirect-following limits. Any deployment egress proxy or gateway caps on response size or duration are also outside the repository.

### Resolution plan

- **Local (bounded, sandboxed):** In an approved sandbox (isolated loopback only, memory rlimit e.g. 512 MiB, empty environment, wall-clock limit), start the target with a seeded member account. Run two fixture servers on 127.0.0.1. Fixture A returns a 64 MiB text/html body with no <title>. Fixture B sends 200 headers plus '<title>x' and then writes one byte every 10 s. Step 1: issue one GET /api/tools/preview?url=http://127.0.0.1:<A>/ with the member bearer token, and record the server's RSS and arrayBuffers before and after; expect growth of at least 64 MiB with no 413 or abort. Step 2: issue one request to fixture B, abort the client after 1 s, and confirm that fixture B's socket stays open and the handler stays pending past 60 s. Make no more than these two requests. Regression test for the fix: AbortSignal.any([AbortSignal.timeout(5000), signal aborted on req 'close']) passed to fetch, plus a streaming reader that rejects a Content-Length above 512 KiB and stops reading after 512 KiB. Both fixtures should then return promptly with bounded RSS, and fixture B's socket should close when the client aborts.
- **Owner-observed:** The owner should check the API container's memory limit and the Node --max-old-space-size setting, and the supervisor or orchestrator restart policy and replica count (to know whether one OOM drops all tenants). They should also check whether an egress proxy or NAT gateway enforces response-size, duration, or connection limits on outbound HTTP from the API service, and whether a reverse proxy cancels upstream work when a client disconnects. These checks are read-only configuration review, not load testing.

---

## N5. SSRF: GET /api/tools/preview fetches any URL a member supplies from the server and returns the status, the page title and fetch errors

**Fingerprint:** `ledgerly/tools-preview-unrestricted-fetch` · linked units: tools-preview

Anyone can register as a member (src/routes/auth.js:5-9) and log in to get a bearer token (auth.js:12-16). Any member can then call GET /api/tools/preview?url=<anything>. The handler passes req.query.url unchanged to Node's global fetch with redirect:'follow' (src/routes/tools.js:11). Nothing checks the scheme, host, resolved IP range or redirect target, and there is no timeout or size limit. It returns the upstream HTTP status and the first <title> text (tools.js:14). When the fetch fails it returns e.message with a 502 (tools.js:16). This is a server-side request forgery primitive. A member can make the API process send GET requests to loopback, link-local or internal hosts from the server's network position. The member learns whether a host and port is reachable (200/status compared with 502). Title text and status reveal some internal content. The request is blind beyond the title, and only GET is possible. Two caveats on the error oracle. First, whether e.message tells refused, timed-out and unresolvable apart depends on the runtime: Node's undici usually reports a generic 'fetch failed', with the detail in e.cause, which is not returned. Second, success versus failure plus the status is still a reliable reachability oracle. How much is reachable from production is a deployment fact.

**Claimed root cause:** src/routes/tools.js:11 calls fetch(req.query.url, { redirect: 'follow' }) on a value fully controlled by the caller. There is no scheme allowlist, no DNS or IP-range check against loopback, private or link-local ranges, no re-validation of each redirect hop, and no timeout or response-size limit. Lines 13-14 return the matched <title> and r.status, and line 16 returns e.message. The only gate is router.use(requireAuth) at tools.js:6, and requireAuth (src/lib/auth.js:17-25) only verifies a JWT that any self-registered member can get.

### Trace

1. **entrypoint** `src/routes/tools.js:9` `GET /api/tools/preview (mounted at /api/tools in src/server.js:10)`: A route reachable by any authenticated member. The only gate is router.use(requireAuth) at tools.js:6. Membership is open through POST /api/auth/register (src/routes/auth.js:5-9) and login (auth.js:12-16).
2. **propagation** `src/routes/tools.js:11` `preview handler`: req.query.url goes to the global fetch unchanged with { redirect: 'follow' }. No scheme, host, IP-range or redirect-hop validation comes first.
3. **sink** `src/routes/tools.js:14` `preview handler`: The server makes an outbound request from its own network position, and the response's <title> and HTTP status go back to the member. On failure, line 16 returns e.message with a 502, which tells the caller whether the request succeeded.

### Evidence

- `src/routes/tools.js:6`: router.use(requireAuth) is the only control on /preview. There is no requireAdmin, unlike /diagnostics/ping (line 21) and /diagnostics/git (line 27).
- `src/routes/tools.js:11`: Unvalidated fetch of a URL from the query string with redirect:'follow'.
- `src/routes/tools.js:14`: The upstream <title> text and status code are returned to the caller.
- `src/routes/tools.js:16`: e.message is returned with a 502, so the caller can tell a reachable destination from an unreachable one.
- `src/routes/auth.js:5`: Open self-registration creates a member account. Login at line 12 issues that member a JWT, which requireAuth accepts.
- `src/lib/auth.js:17`: requireAuth only verifies the HS256 JWT. It applies no role or destination policy.

### Blockers

- The OS-enforced sandbox could not be set up, and network and loopback connections are banned in this run. The real Node/undici fetch was therefore not seen reaching an internal-only listener or following a redirect to one. The hunter's check-04 replaces fetch with an in-memory stub. It shows that the URL reaches fetch unchanged and that title, status and error are returned, but it does not observe real network behavior. This verifier was not allowed to run even a non-network harness, so this verification relies on source only.
- Which internal services, metadata endpoints (for example 169.254.169.254) and private networks the production API process can reach is a deployment fact, as is whether an egress proxy or firewall limits outbound requests. Neither is in the repository, and together they decide the real impact.

### Resolution plan

- **Local (bounded, sandboxed):** In an approved sandbox with an isolated loopback and no external network: (1) Start fixture A on 127.0.0.1:<pA> that returns 200 with <title>INTERNAL-A</title>. Start fixture B on 127.0.0.1:<pB> that returns 302 Location: http://127.0.0.1:<pA>/. (2) Start Ledgerly against a fresh in-memory or scratch DB. Register a dummy member (verifier-member@example.test) and log in to get a token. (3) GET /api/tools/preview?url=http://127.0.0.1:<pA>/ with Authorization: Bearer <token>. Expect {"title":"INTERNAL-A","status":200}. (4) Repeat with url=http://127.0.0.1:<pB>/ and expect the same, which shows the redirect is followed. (5) Repeat with url=http://127.0.0.1:<closed port>/ and record the exact 502 body, so the error oracle's granularity is known. Make only GET requests and touch nothing outside the fixtures.
- **Owner-observed:** The owner should check, without sending attacker traffic, whether the production API process can open outbound connections to 169.254.169.254 or another cloud metadata endpoint, to loopback admin ports, to the database or other internal services, or to private RFC1918 ranges. They should also say whether an egress proxy, firewall or IMDSv2 hop-limit restricts those requests, and whether any reverse proxy restricts access to /api/tools/preview.

---
