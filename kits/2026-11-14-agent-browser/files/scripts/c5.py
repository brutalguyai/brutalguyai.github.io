import sys,os,json,re,time
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
U="http://127.0.0.1:8801/index.html"
def ref(txt,name):
    m=re.search(r'button "%s"[^\n]*?ref=(e\d+)'%name,txt); return "@"+m.group(1) if m else None
def counts(s): 
    _,o,_,_=ab("eval","JSON.stringify(window.counts)",session=s); return o.strip()
out=[]
for run in range(3):
  for case,btn,pre in [("hidden","HiddenBtn",None),("disabled","DisabledBtn",None),("below_fold","FarBelow",None),("covered_by_banner","CoveredBtn","showBanner()"),("control","Alpha",None)]:
    s="c5"; ab("open",U,session=s); time.sleep(.5)
    if pre: ab("eval",pre,session=s)
    _,snap,_,_=ab("snapshot","-i",session=s)
    r=ref(snap,btn)
    target=r if r else "#hidden"
    rc,o,e,t=ab("click",target,session=s)
    row=dict(run=run,case=case,target=target,had_ref=bool(r),exit=rc,stdout=o.strip()[:200],stderr=e.strip()[:300],counts_after=counts(s),ms=round(t))
    if case=="below_fold":
        _,y,_,_=ab("eval","window.scrollY",session=s); row["scrollY_after"]=y.strip()
    out.append(row); print(json.dumps(row),flush=True)
    if case=="covered_by_banner":
        # recovery: dismiss, re-snapshot, retry
        _,snap2,_,_=ab("snapshot","-i",session=s); ra=ref(snap2,"Accept cookies"); 
        rc1,o1,e1,_=ab("click",ra,session=s)
        _,snap3,_,_=ab("snapshot","-i",session=s); rc_,o_,e_,_=ab("click",ref(snap3,"CoveredBtn"),session=s)
        row2=dict(run=run,case="covered_recovery",accept_ref=ra,accept_exit=rc1,retry_exit=rc_,counts_after=counts(s)); out.append(row2); print(json.dumps(row2),flush=True)
    ab("close",session=s)
json.dump(out,open(f"{ROOT}/outputs/c5.json","w"),indent=1)
