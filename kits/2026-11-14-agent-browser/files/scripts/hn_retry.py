import sys,os,json,time
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
mcp=MCP(["node",f"{ROOT}/ab/node_modules/@playwright/mcp/cli.js","--headless","--no-sandbox","--executable-path","/usr/bin/google-chrome"])
u="https://news.ycombinator.com"
out=[]
for i in range(3):
    time.sleep(25)
    ab("open",u,session="h"); time.sleep(1)
    _,a_i,_,_=ab("snapshot","-i",session="h"); _,a_f,_,_=ab("snapshot",session="h")
    time.sleep(10)
    mcp.call("browser_navigate",{"url":u}); s,_=mcp.call("browser_snapshot",{})
    ab("close",session="h")
    r={"run":i,"ab_i":len(a_i),"ab_full":len(a_f),"pw":len(s)}; print(r); out.append(r)
json.dump(out,open(f"{ROOT}/outputs/hn_retry.json","w"))
mcp.close()
