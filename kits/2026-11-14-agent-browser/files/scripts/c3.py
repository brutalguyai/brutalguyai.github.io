import sys,os,json,re,time
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
PAGES=["http://127.0.0.1:8801/index.html","https://example.com","https://the-internet.herokuapp.com/login","https://docs.python.org/3/tutorial/index.html","https://developer.mozilla.org/en-US/docs/Web/HTML"]
SEL="a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link]"
out=[]
for run in range(3):
  for u in PAGES:
    ab("open",u,session="c3"); time.sleep(1)
    _,txt,_,_=ab("snapshot","-i",session="c3")
    _,js,_,_=ab("snapshot","-i","--json",session="c3")
    refs=re.findall(r"ref=(e\d+)",txt)
    _,n,_,_=ab("eval",f"document.querySelectorAll('{SEL}').length",session="c3")
    try: j=json.loads(js); jr=list(j.get("data",{}).get("refs",{}).keys())
    except Exception as e: jr=None
    # resolve up to 40 refs
    bad=[];tested=refs[:40]
    for r in tested:
        rc,o,e,_=ab("is","visible","@"+r,session="c3")
        rc2,o2,e2,_=ab("get","text","@"+r,session="c3")
        if rc!=0 or rc2!=0: bad.append((r,e.strip()[:80] or e2.strip()[:80]))
    row=dict(run=run,url=u,refs=len(refs),unique=len(set(refs)),json_refs=None if jr is None else len(jr),dom=int(n.strip() or 0),tested=len(tested),unresolved=len(bad),bad=bad[:3])
    out.append(row);print(json.dumps(row),flush=True)
    ab("close",session="c3")
json.dump(out,open(f"{ROOT}/outputs/c3.json","w"),indent=1)
