import json,statistics as st,collections
rows=json.load(open("outputs/c1_c2_c23_raw.json"))
by=collections.defaultdict(list)
for r in rows:
    if "ycombinator" in r["url"] and (r["pw_snap"]<5000 or r["ab_full"]<5000): continue
    by[r["url"]].append(r)
# add HN valid from retry (run2)
out=[];
print(f"{'page':48}{'n':>2}{'html':>8}{'ab-i':>7}{'ab-full':>8}{'PW':>8}{'red-i%':>7}{'red-full%':>10}{'png B':>8}")
for u,rs in by.items():
    m=lambda k:int(st.median(r[k] for r in rs))
    d=dict(url=u,n=len(rs),html=m("html"),ab_i=m("ab_i"),ab_full=m("ab_full"),pw=m("pw_snap"),png=m("shot_bytes"))
    d["red_i"]=100*(1-d["ab_i"]/d["pw"]); d["red_full"]=100*(1-d["ab_full"]/d["pw"]); out.append(d)
    print(f"{u[:47]:48}{d['n']:>2}{d['html']:>8}{d['ab_i']:>7}{d['ab_full']:>8}{d['pw']:>8}{d['red_i']:>7.1f}{d['red_full']:>10.1f}{d['png']:>8}")
print("median red-i",st.median(d['red_i'] for d in out),"median red-full",st.median(d['red_full'] for d in out))
print("max red-i",max(d['red_i'] for d in out),"min",min(d['red_i'] for d in out))
print("sum ab_i",sum(d['ab_i'] for d in out),"sum pw",sum(d['pw'] for d in out),"=> overall red",100*(1-sum(d['ab_i'] for d in out)/sum(d['pw'] for d in out)))
json.dump(out,open("outputs/c1_summary.json","w"),indent=1)
