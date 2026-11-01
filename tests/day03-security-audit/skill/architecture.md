# Ledgerly — architecture summary (run 1, commit 8a21cc4)

## 1. Product, principals, resources
Ledgerly 1.4.2 is a small-business invoicing HTTP API (Express 4 + `node:sqlite`). Principals:
- **Anonymous internet client** — may call `POST /api/auth/register`, `POST /api/auth/login`, and the public invoice page `GET /i/:token`.
- **Member** (`role='member'`, default at registration) — owns invoices (`invoices.owner_id`), may read/update own profile.
- **Admin** (`role='admin'`, created only by `src/seed.js`) — may call `/api/tools/diagnostics/*`.
- **Invoice recipient (customer)** — unauthenticated browser holding a share token URL.

Protected resources: other owners' invoices, user rows (incl. `password_hash`), the admin role, the server process/filesystem/network position, JWT signing key.

## 2. Comparable baseline
No source-grounded comparable; omitted.

## 3. Stack and local limits
Node v22 (`node:sqlite` built-in), `express ^4.21.2`, `jsonwebtoken ^9.0.2`, `node_modules/` present locally. No tests. `npm start` / `npm run seed` would execute target code. The OS sandbox required by the skill (network/mount namespaces, rlimits, empty env) could not be launched in this environment, so **no target-controlled code is executed**. Local checks are self-authored Node built-in harnesses with verbatim-copied source expressions and in-memory dummy data.

## 4. Entry surfaces and source-to-sink paths
- `src/server.js:5-11` mounts JSON body parser (100kb) and routers.
- `src/routes/auth.js:5-16` register/login → `src/lib/auth.js` scrypt hash, HS256 JWT `{sub, role}`.
- `src/routes/users.js:5-17` `GET/PATCH /api/users/me` → dynamic `UPDATE users SET <allowlisted fields>` including `role`.
- `src/routes/invoices.js:10-39` list (sort allowlist), `/search` (template-literal SQL), `/:id` (lookup by id), create, delete (owner-scoped).
- `src/routes/share.js:7-15` public `/i/:token` → HTML template; `customer` escaped, `notes` raw.
- `src/routes/files.js:10-23` `attachments?name=` → `path.join(uploadDir, name)` → `res.sendFile`; `exports/:name` → basename + prefix + `.csv` check → `res.download`.
- `src/routes/tools.js:9-41` `preview?url=` → `fetch(url, redirect: follow)`; admin `diagnostics/ping` → `exec("ping -c 1 " + host)`; admin `diagnostics/git` → `execFile` with fixed allowlist; `status` → fixed URL fetch.
- `src/seed.js:4-7` seed admin/member and fixed share token.

## 5. Trust boundaries and strongest visible control
- Authentication: `requireAuth` (`src/lib/auth.js:17-25`) verifies HS256 JWT with `config.jwtSecret`, a string literal in `src/config.js:3` with no environment override.
- Role: `requireAdmin` (`src/lib/auth.js:26-29`) trusts the `role` claim, which is minted from the DB row at login (`src/lib/auth.js:15`).
- Invoice ownership: `owner_id = ?` bound in list/delete; absent in `GET /:id`; interpolated in `/search`.
- Public share: unguessable 24-byte `share_token`; HTML escaping via `esc()` only for `customer`.
- Filesystem: `exportDir` prefix check; no check for `uploadDir`.
- Process/network: admin gate only on `ping`/`git`; none on `preview`.
- Deployment (proxy, TLS, egress filtering, CSP headers, frontend token storage) is not in the repository.

## 6. Starting paths
`src/lib/auth.js`, `src/config.js`, `src/routes/*.js`, `src/seed.js`, `src/lib/db.js`, `package.json`, `package-lock.json`, `.gitignore`.

## 7. Prior coverage
None. No compatible prior ledger exists; this is a first pass.

## 8. Companion selection
- **WEB-PROTOCOL-AND-AUTH.md** — selected for the JWT bearer-auth boundary (`JWT verification and claim binding`, `Session fixation and invalidation` for role/token lifecycle). Framing/cache, CSRF (bearer header, no cookies), OAuth/SAML/MFA/passkey/API-key/mTLS classes excluded: no such code.
- **DATA-ISOLATION-AND-LIFECYCLE.md** — selected for owner-scoped invoice store and share-token object links (`Missing tenant or owner enforcement`, `Blob and signed-reference overreach`, `Export and backup scope expansion`).
- **RESOURCE-EXHAUSTION-AND-AVAILABILITY.md** — added after the wave-1 critic: anonymous register/login run synchronous `crypto.scryptSync` on the single event loop (`src/lib/auth.js:6,11`), and `/api/tools/preview` buffers unbounded upstream bodies with no timeout (`src/routes/tools.js:11-12`). The original exclusion was not supported by source.
- Excluded: CLIENT-SIDE (no client JS shipped; server-rendered HTML covered by ordinary Injection), CLOUD-AND-DEPLOYMENT (no IaC/containers), SUPPLY-CHAIN (lockfile only; no CI/release), PROTOCOLS, MEMORY-SAFETY, AI-AND-LLM, DESKTOP-MOBILE.
