import sys,os,json,statistics as st,time
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
PAGES=["https://example.com","https://en.wikipedia.org/wiki/Web_browser","https://developer.mozilla.org/en-US/docs/Web/HTML","https://docs.python.org/3/tutorial/index.html","http://127.0.0.1:8801/index.html"]
res=[]
for u in PAGES:
    ab("open",u,session="t"); time.sleep(1)
    s=[];c=[];sz=[]
    for i in range(5):
        rc,o,e,t=ab("snapshot","-i",session="t"); s.append(t); sz.append(len(o))
        rc,o,e,t=ab("screenshot","/tmp/x.png",session="t"); c.append(t)
    p95=lambda a:sorted(a)[-1]
    r=dict(url=u,snap_ms_med=st.median(s),shot_ms_med=st.median(c),snap_ms_max=max(s),shot_ms_max=max(c),snap_tokens=st.median(sz)/4,shot_tokens_est=1280*577/750)
    r["snap_faster"]=r["snap_ms_med"]<r["shot_ms_med"]; r["snap_fewer_tokens"]=r["snap_tokens"]<r["shot_tokens_est"]
    res.append(r); print(json.dumps({k:(round(v,1) if isinstance(v,float) else v) for k,v in r.items()}))
    ab("close",session="t")
json.dump(res,open(f"{ROOT}/outputs/c23.json","w"),indent=1)
