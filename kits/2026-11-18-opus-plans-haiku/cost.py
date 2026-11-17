import json,sys,glob
P={'opus':(4,20,0.20,5.0),'haiku':(0.10,0.50,0.01,0.125),'sonnet':(2,10,0.10,2.5)}  # in,out,cache_read,cache_write(5m) per MTok
def fam(m): return 'opus' if 'opus' in m else 'haiku' if 'haiku' in m else 'sonnet'
for f in sorted(glob.glob('/home/claude/ep2/out/*.jsonl')):
    res=None
    for l in open(f):
        try:o=json.loads(l)
        except:continue
        if o.get('type')=='result':res=o
    if not res: print(f.split('/')[-1],'NO RESULT');continue
    tot=0;toks=0;parts=[]
    for m,u in (res.get('modelUsage') or {}).items():
        i,o_,cr,cw=P[fam(m)]; inp=u.get('inputTokens',0);out=u.get('outputTokens',0);r=u.get('cacheReadInputTokens',0);w=u.get('cacheCreationInputTokens',0)
        c=(inp*i+out*o_+r*cr+w*cw)/1e6; tot+=c; toks+=inp+out+r+w; parts.append(f"{m}: in{inp} out{out} cr{r} cw{w} ${c:.4f} (cc says ${u.get('costUSD',0):.4f})")
    print(f.split('/')[-1], f"turns={res.get('num_turns')} err={res.get('is_error')} total=${tot:.4f} cc_total=${res.get('total_cost_usd',0):.4f} tokens={toks}"); [print('   ',p) for p in parts]
