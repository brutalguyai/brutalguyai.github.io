import subprocess, os, json, time, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AB=f"{ROOT}/ab/node_modules/.bin/agent-browser"
ENV=dict(os.environ, AGENT_BROWSER_EXECUTABLE_PATH="/usr/bin/google-chrome", AGENT_BROWSER_ARGS="--no-sandbox")
def ab(*args, session=None, timeout=90, env=None, extra=()):
    cmd=[AB]+list(extra)
    if session: cmd+=["--session",session]
    cmd+=list(args)
    t=time.perf_counter()
    p=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout,env=env or ENV)
    return p.returncode,p.stdout,p.stderr,(time.perf_counter()-t)*1000
class MCP:
    def __init__(self,cmd,env=None):
        self.p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,env=env or ENV)
        self.id=0
        self.send("initialize",{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"1"}})
        self.p.stdin.write(json.dumps({"jsonrpc":"2.0","method":"notifications/initialized"})+"\n");self.p.stdin.flush()
    def send(self,m,params=None):
        self.id+=1
        self.p.stdin.write(json.dumps({"jsonrpc":"2.0","id":self.id,"method":m,"params":params or {}})+"\n");self.p.stdin.flush()
        while True:
            l=self.p.stdout.readline()
            if not l: raise RuntimeError("eof")
            try: r=json.loads(l)
            except: continue
            if r.get("id")==self.id: return r
    def call(self,name,args):
        r=self.send("tools/call",{"name":name,"arguments":args})
        res=r.get("result",r)
        txt="".join(c.get("text","") for c in res.get("content",[]) if c.get("type")=="text")
        return txt,res
    def close(self):
        try:self.p.stdin.close();self.p.terminate()
        except:pass
