import sys,os,json,re,time,subprocess,statistics as st
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
S="c6"
def chrome_main():
    o=subprocess.run("ps -eo pid,ppid,args | grep -E 'google-chrome|chrome ' | grep -v -E 'grep|--type=' | grep -E -- '--remote-debugging|user-data-dir' | awk '{print $1}'",shell=True,capture_output=True,text=True).stdout.split()
    return o
def procs():
    return subprocess.run("ps -eo pid,comm | grep -E 'node|agent-browser|chrome' | awk '{print $2}' | sort | uniq -c | tr '\\n' ' '",shell=True,capture_output=True,text=True).stdout
res=[]
for run in range(3):
    pids=[];lat=[];ok=True;cmds=[]
    seq=[("open","http://127.0.0.1:8801/index.html"),("snapshot","-i"),("get","title"),
         ("eval","localStorage.setItem('k','v-"+str(run)+"');document.cookie='c=1';'set'"),
         ("click","@e8"),("snapshot","-i"),("get","url"),("click","@e2"),("get","url"),("back",),("get","title"),
         ("eval","localStorage.getItem('k')+'|'+document.cookie"),("snapshot","-i"),("get","title"),("eval","'done'")]
    out12=None
    for i,a in enumerate(seq):
        rc,o,e,t=ab(*a,session=S); lat.append(t); pids.append(tuple(chrome_main())); cmds.append(dict(cmd=" ".join(a),exit=rc,ms=round(t),out=o.strip()[:60]))
        if i==11: out12=o.strip()
        if i==4: ps_mid=procs()
    same=len(set(pids))==1 and len(pids[0])>=1
    persisted=f"v-{run}" in (out12 or "")
    row=dict(run=run,steps=len(seq),same_chrome_pids=same,pids=sorted(set(p for t in pids for p in t))[:6],state_persisted=persisted,read_back=out12,cold_open_ms=round(lat[0]),warm_median_ms=round(st.median(lat[1:])),warm_max_ms=round(max(lat[1:])),warm_p95_ms=round(sorted(lat[1:])[int(len(lat[1:])*.95)-1]),ps_counts=ps_mid,cmds=cmds)
    res.append(row); print(json.dumps({k:v for k,v in row.items() if k!="cmds"}),flush=True)
    ab("close",session=S)
json.dump(res,open(f"{ROOT}/outputs/c6.json","w"),indent=1)
