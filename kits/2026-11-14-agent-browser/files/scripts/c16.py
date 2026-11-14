import sys,os,json,re,time
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
U="http://127.0.0.1:8801/index.html"; S="c16"
def refs(t): return {m.group(1):m.group(2) for m in re.finditer(r'(\w+) "([^"]*)"[^\n]*?ref=(e\d+)',t) for m in [re.match(r'(.*)',m.group(3)) and type('M',(),{'group':lambda s,i,a=m0 if False else None:None})()]} if False else None
def refmap(t): return {m.group(3):(m.group(1),m.group(2)) for m in re.finditer(r'(\w+) "([^"]*)"[^\n]*?ref=(e\d+)',t)}
def counts(): return ab("eval","JSON.stringify(window.counts)",session=S)[1].strip()
out=[]
for run in range(3):
    ab("open",U,session=S); time.sleep(.5)
    a=refmap(ab("snapshot","-i",session=S)[1]); b=refmap(ab("snapshot","-i",session=S)[1])
    out.append(dict(run=run,case="1_two_snapshots_same",same=a==b,n=len(a)))
    # 2 add element at top
    ab("click",[k for k,v in a.items() if v[1]=="AddTop"][0] if False else "@"+[k for k,v in a.items() if v[1]=="AddTop"][0],session=S)
    c=refmap(ab("snapshot","-i",session=S)[1])
    old_kept={k:(c.get(k)==v) for k,v in a.items()}
    newrefs={k:v for k,v in c.items() if k not in a}
    out.append(dict(run=run,case="2_add_top_old_refs_unchanged",all_old_same=all(old_kept.values()),changed=[k for k,v in old_kept.items() if not v],new=newrefs))
    # click an old ref (Alpha) -> should hit Alpha
    ralpha=[k for k,v in a.items() if v[1]=="Alpha"][0]
    rc,o,e,_=ab("click","@"+ralpha,session=S); out.append(dict(run=run,case="2b_click_old_ref_after_insert",exit=rc,counts=counts()))
    # 4 replace element then old ref
    rswap=[k for k,v in a.items() if v[1]=="SwapMe"][0]; rrep=[k for k,v in a.items() if v[1]=="ReplaceBtn"][0]
    ab("click","@"+rrep,session=S)
    rc,o,e,_=ab("click","@"+rswap,session=S)
    d=refmap(ab("snapshot","-i",session=S)[1])
    out.append(dict(run=run,case="4_replaced_element_old_ref",exit=rc,stdout=o.strip(),stderr=e.strip()[:200],counts=counts(),swapme_after=[(k,v) for k,v in d.items() if v[1]=="SwapMe"],old_ref=rswap))
    # 3 navigate then old ref
    ab("click","@"+[k for k,v in a.items() if v[1]=="Go other"][0],session=S); time.sleep(.5)
    url=ab("get","url",session=S)[1].strip()
    rc,o,e,_=ab("click","@"+ralpha,session=S)
    out.append(dict(run=run,case="3_after_navigation_old_ref",url=url,exit=rc,stdout=o.strip(),stderr=e.strip()[:200]))
    # full snapshot then -i numbering
    ab("open",U,session=S); time.sleep(.5)
    ab("snapshot",session=S)
    t=ab("snapshot","-i",session=S)[1]; first=re.findall(r"ref=(e\d+)",t)[:3]
    rc,o,e,_=ab("click","@e2",session=S)
    out.append(dict(run=run,case="5_full_then_i_numbering",first_refs=first,click_e2_exit=rc,msg=(o+e).strip()[:150]))
    ab("close",session=S)
for r in out: print(json.dumps(r))
json.dump(out,open(f"{ROOT}/outputs/c16.json","w"),indent=1)
