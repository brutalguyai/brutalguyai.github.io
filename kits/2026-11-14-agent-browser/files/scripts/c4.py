import sys,os,json,re,time
sys.path.insert(0,os.path.dirname(__file__))
from lib import *
S="c4"
def find(snap,role,name,exact=True):
    for m in re.finditer(r'- (\w+) "([^"]*)"[^\n]*?ref=(e\d+)',snap):
        if m.group(1)==role and (m.group(2).strip()==name.strip() if exact else name in m.group(2)): return "@"+m.group(3)
log=[]
def step(case,*a):
    rc,o,e,t=ab(*a,session=S); log.append(dict(case=case,cmd=" ".join(a),exit=rc,ms=round(t),out=o.strip()[:120],err=e.strip()[:120] if rc else "")); return rc,o,e
def snap(case): return step(case,"snapshot","-i")[1]
def case_link(name,url,role,label,expect):
    step(name,"open",url); s=snap(name); r=find(s,role,label)
    if not r: return False
    step(name,"click",r); time.sleep(1); _,o,_=step(name,"get","url"); return expect in o
def case_login(name,pw,expect):
    step(name,"open","https://the-internet.herokuapp.com/login"); s=snap(name)
    ru=find(s,"textbox","Username"); rp=find(s,"textbox","Password"); rb=find(s,"button","Login",exact=False)
    if not (ru and rp and rb): return False
    step(name,"fill",ru,"tomsmith"); step(name,"fill",rp,pw); step(name,"click",rb); time.sleep(1)
    _,o,_=step(name,"get","text","#flash"); return expect in o
def case_form(name):
    step(name,"open","http://127.0.0.1:8801/index.html"); s=snap(name)
    ri=find(s,"textbox","Name"); rc=find(s,"checkbox"," Agree"); rs=find(s,"combobox","Color")
    if not(ri and rc and rs): return False
    step(name,"fill",ri,"Brutal"); step(name,"check",rc); step(name,"select",rs,"green")
    v=step(name,"get","value",ri)[1].strip(); c=step(name,"is","checked",rc)[1].strip(); sv=step(name,"get","value",rs)[1].strip()
    return "Brutal" in v and "true" in c.lower() and "green" in sv
CASES=[
 ("example_learn_more",lambda:case_link("example_learn_more","https://example.com","link","Learn more","iana.org")),
 ("hn_new",lambda:case_link("hn_new","https://news.ycombinator.com","link","new","newest")),
 ("wiki_mosaic",lambda:case_link("wiki_mosaic","https://en.wikipedia.org/wiki/Web_browser","link","Mosaic","Mosaic")),
 ("pydocs_appetite",lambda:case_link("pydocs_appetite","https://docs.python.org/3/tutorial/index.html","link","1. Whetting Your Appetite","appetite.html")),
 ("fixture_go_other",lambda:case_link("fixture_go_other","http://127.0.0.1:8801/index.html","link","Go other","other.html")),
 ("fixture_form",lambda:case_form("fixture_form")),
 ("login_ok",lambda:case_login("login_ok","SuperSecretPassword!","You logged into a secure area!")),
 ("login_bad",lambda:case_login("login_bad","wrongpass","Your password is invalid!")),
]
res=[]
for run in range(3):
    for n,f in CASES:
        try: ok=f()
        except Exception as ex: ok=False; log.append(dict(case=n,err=str(ex)))
        res.append(dict(run=run,case=n,pass_=bool(ok))); print(run,n,"PASS" if ok else "FAIL",flush=True)
        ab("close",session=S)
print("pass",sum(r["pass_"] for r in res),"/",len(res))
json.dump(dict(results=res,log=log),open(f"{ROOT}/outputs/c4.json","w"),indent=1)
