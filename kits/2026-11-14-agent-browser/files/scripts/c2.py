import json,statistics as st,collections
rows=json.load(open("outputs/c1_c2_c23_raw.json"))
by=collections.defaultdict(list)
for r in rows:
    if "ycombinator" in r["url"] and (r["pw_snap"]<5000 or r["ab_full"]<5000 or r["ab_i"]<5000): continue
    by[r["url"]].append(r)
print("C2: tokens ~ chars/4. snapshot -i tokens vs outerHTML tokens vs screenshot est (w*h/750, viewport 1280x577 -> %d)"%(1280*577/750))
inr=0
for u,rs in by.items():
    m=lambda k:st.median(r[k] for r in rs)
    ti=m("ab_i")/4; th=m("html")/4; ok=800<=m("ab_i")<=1600
    inr+=ok
    print(f"{u[:46]:47} n={len(rs)} snap-i {m('ab_i'):>7.0f} chars ~{ti:>6.0f} tok | html {m('html'):>7.0f} chars ~{th:>6.0f} tok | in 800-1600 chars? {ok} | PNG {m('shot_bytes'):.0f} B")
print("pages in range:",inr,"/",len(by))
