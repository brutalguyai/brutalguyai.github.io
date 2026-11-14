import sys,os,json,time
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
res=[]
for run in range(3):
    row={"run":run}
    for name,cmd in [("agent-browser",[AB,"mcp"]),("playwright-mcp",["node",f"{ROOT}/ab/node_modules/@playwright/mcp/cli.js","--headless","--no-sandbox"])]:
        try:
            m=MCP(cmd)
            tl=m.send("tools/list")["result"]["tools"]
            row[name]=dict(n_tools=len(tl),def_chars=len(json.dumps(tl)),names=[t["name"] for t in tl][:60])
            if name=="agent-browser":
                n=[t["name"] for t in tl]
                r1=m.send("tools/call",{"name":[x for x in n if "navigate" in x or "open" in x][0],"arguments":{"url":"https://example.com"}})
                t2=[x for x in n if "snapshot" in x][0]
                r2=m.send("tools/call",{"name":t2,"arguments":{}})
                txt="".join(c.get("text","") for c in r2["result"]["content"] if c.get("type")=="text")
                row[name].update(call_ok=not r2["result"].get("isError"),open_resp=json.dumps(r1)[:200],snap_chars=len(txt),snap_head=txt[:200],tools_used=[[x for x in n if "navigate" in x or "open" in x][0],t2])
            else:
                r1,_=m.call("browser_navigate",{"url":"https://example.com"}); r2,res2=m.call("browser_snapshot",{})
                row[name].update(call_ok=not res2.get("isError"),snap_chars=len(r2))
            m.close()
        except Exception as ex:
            row[name]=dict(error=str(ex)[:200])
        subprocess.run([AB,"close","--all"],capture_output=True,env=ENV) if False else None
    res.append(row); print(json.dumps({k:({kk:vv for kk,vv in v.items() if kk not in('names','snap_head','open_resp')} if isinstance(v,dict) else v) for k,v in row.items()}),flush=True)
json.dump(res,open(f"{ROOT}/outputs/c11.json","w"),indent=1)
