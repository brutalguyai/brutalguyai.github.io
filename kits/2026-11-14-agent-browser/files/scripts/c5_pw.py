import sys,os,json,re,time
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
U="http://127.0.0.1:8801/index.html"
m=MCP(["node",f"{ROOT}/ab/node_modules/@playwright/mcp/cli.js","--headless","--no-sandbox","--executable-path","/usr/bin/google-chrome"])
out=[]
for case,btn,pre in [("disabled","DisabledBtn",None),("below_fold","FarBelow",None),("covered_by_banner","CoveredBtn","() => showBanner()"),("control","Alpha",None)]:
    m.call("browser_navigate",{"url":U})
    if pre: m.call("browser_evaluate",{"function":pre})
    snap,_=m.call("browser_snapshot",{})
    mm=re.search(r"button \"%s\"[^\n]*\[ref=([a-z0-9]+)\]"%btn,snap)
    if not mm: print(snap[:600])
    t=time.perf_counter()
    txt,res=m.call("browser_click",{"element":btn,"target":mm.group(1) if mm else "none"})
    dt=time.perf_counter()-t
    c,_=m.call("browser_evaluate",{"function":"() => JSON.stringify(window.counts||{})"})
    row=dict(case=case,isError=res.get("isError"),secs=round(dt,1),resp=txt[:260].replace("\n"," | "),counts=c[:150].replace("\n"," "))
    out.append(row);print(json.dumps(row),flush=True)
m.close()
json.dump(out,open(f"{ROOT}/outputs/c5_playwright.json","w"),indent=1)
