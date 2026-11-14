import sys,os,json,time,subprocess,statistics as st
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
def timeit(cmd,n,env=None):
    ts=[]
    for _ in range(n):
        t=time.perf_counter(); subprocess.run(cmd,capture_output=True,env=env or ENV); ts.append((time.perf_counter()-t)*1000)
    ts.sort(); return dict(n=n,median=round(st.median(ts),2),p95=round(ts[int(n*.95)-1],2),min=round(ts[0],2),max=round(ts[-1],2))
out={}
# C7
cold=[]
for i in range(5):
    subprocess.run([AB,"--session","c7","close"],capture_output=True,env=ENV); time.sleep(1)
    rc,o,e,t=ab("open","about:blank",session="c7"); cold.append(round(t))
    rc,o,e,t2=ab("snapshot","-i",session="c7")
    out.setdefault("warm_after_cold",[]).append(round(t2,1))
ab("close",session="c7")
out["c7_cold_open_about_blank_ms"]=cold
# second open on warm browser
ab("open","about:blank",session="c7"); rc,o,e,t=ab("open","about:blank",session="c7"); out["c7_warm_open_about_blank_ms"]=round(t); ab("close",session="c7")
# C8
out["c8_version"]=timeit([AB,"--version"],200)
out["c8_snapshot_help"]=timeit([AB,"snapshot","--help"],200)
out["c8_bin_true"]=timeit(["/bin/true"],200)
out["c8_node_e0"]=timeit(["node","-e","0"],50)
print(json.dumps(out,indent=1)); json.dump(out,open(f"{ROOT}/outputs/c7_c8.json","w"),indent=1)
