import sys,json,statistics as st,time,os
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
PAGES=["https://example.com","https://news.ycombinator.com","https://en.wikipedia.org/wiki/Web_browser","https://developer.mozilla.org/en-US/docs/Web/HTML","https://docs.python.org/3/tutorial/index.html","https://the-internet.herokuapp.com/login","https://pypi.org/project/requests/","http://127.0.0.1:8801/index.html"]
R=int(sys.argv[1]) if len(sys.argv)>1 else 3
rows=[]
mcp=MCP(["node",f"{ROOT}/ab/node_modules/@playwright/mcp/cli.js","--headless","--no-sandbox","--executable-path","/usr/bin/google-chrome"])
tl=mcp.send("tools/list")
for run in range(R):
  for u in PAGES:
    row={"run":run,"url":u}
    rc,o,e,t=ab("open",u,session="m"); row["open_ms"]=t; row["open_rc"]=rc
    time.sleep(1.0)
    rc,o,e,t=ab("snapshot","-i",session="m"); row["ab_i"]=len(o); row["ab_i_ms"]=t
    rc,o,e,t=ab("snapshot",session="m"); row["ab_full"]=len(o)
    rc,o,e,t=ab("snapshot","-c",session="m"); row["ab_c"]=len(o)
    rc,o,e,t=ab("snapshot","-i","-c",session="m"); row["ab_ic"]=len(o)
    rc,o,e,t=ab("eval","document.documentElement.outerHTML.length",session="m"); row["html"]=int(o.strip() or 0)
    t0=time.perf_counter(); rc,o,e,t=ab("screenshot","/tmp/s.png",session="m"); row["shot_ms"]=t
    row["shot_bytes"]=os.path.getsize("/tmp/s.png")
    rc,o,e,t=ab("eval","[innerWidth,innerHeight].join('x')",session="m"); row["viewport"]=o.strip().strip('"')
    # playwright
    nav,_=mcp.call("browser_navigate",{"url":u}); row["pw_nav"]=len(nav)
    snap,_=mcp.call("browser_snapshot",{}); row["pw_snap"]=len(snap)
    row["pw_nav_has_snapshot"]="### Snapshot" in nav and "```yaml" in nav
    ab("close",session="m")
    rows.append(row); print(json.dumps(row),flush=True)
mcp.close()
json.dump(rows,open(f"{ROOT}/outputs/c1_c2_c23_raw.json","w"),indent=1)
