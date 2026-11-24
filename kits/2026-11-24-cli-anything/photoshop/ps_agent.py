"""brutal guy.ai - Windows agent tester for the generated Photoshop CLI.
usage: python ps_agent.py <run_id>   (no token cap for this test; turn safety limit 80)
Sonnet 5.5 via the API key in D:/brutal-guy-ai/.env (never printed)."""
import json, os, sys, time, subprocess, shutil
import anthropic
RID=sys.argv[1]
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'..','..','..','..'))
env={}
for l in open(os.path.join(ROOT,'.env'),encoding='utf-8-sig'):
    l=l.strip()
    if '=' in l and not l.startswith('#'): k,v=l.split('=',1); env[k.strip()]=v.strip()
client=anthropic.Anthropic(api_key=env['ANTHROPIC_API_KEY'])
MODEL='claude-sonnet-5-5'; MAX_TURNS=80
RD=os.path.join(HERE,'runs',RID); WD=os.path.join(RD,'work'); os.makedirs(WD,exist_ok=True)
shutil.copy(os.path.join(HERE,'mona_task.jpg'),os.path.join(WD,'mona_task.jpg'))
LOG=os.path.join(RD,'log.jsonl'); SF=os.path.join(RD,'state.json')
SKILL=os.path.abspath(os.path.join(HERE,'..','skills','cli-anything-photoshop','SKILL.md'))
TASK=open(os.path.join(HERE,'task_ps.txt'),encoding='utf-8').read()
sysmsg=("You are a coding agent on Windows. Use the powershell tool to run commands (Windows PowerShell 5.1). Working directory: "+WD+
        ". The `cli-anything-photoshop` command is installed on PATH; it drives the real Adobe Photoshop 2026. Its agent skill file is: "+SKILL+" (read it first).")
TOOLS=[{"name":"powershell","description":"Run a PowerShell command in the working directory. Returns stdout+stderr (truncated to 8000 chars). 10 minute timeout.",
        "input_schema":{"type":"object","properties":{"command":{"type":"string"}},"required":["command"]}}]
def run(cmd):
    try:
        p=subprocess.run(['powershell','-NoProfile','-ExecutionPolicy','Bypass','-Command',cmd],cwd=WD,stdin=subprocess.DEVNULL,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=600)
        out=(p.stdout or '')+(p.stderr or '')+f'\n[exit {p.returncode}]'
    except subprocess.TimeoutExpired: out='[timed out after 600 s]'
    return out[-8000:] if len(out)>8000 else out
def cached(msgs):
    m=json.loads(json.dumps(msgs)); last=m[-1]
    if isinstance(last['content'],str): last['content']=[{'type':'text','text':last['content'],'cache_control':{'type':'ephemeral'}}]
    else: last['content'][-1]['cache_control']={'type':'ephemeral'}
    return m
S={'messages':[{'role':'user','content':TASK}],'turns':0,'tokens':0,'usage':[],'secs':0,'final':''}
T0=time.time()
while True:
    if S['turns']>=MAX_TURNS: S['final']=S['final'] or f'STOPPED at turn limit {MAX_TURNS}'; break
    for attempt in range(5):
        try:
            r=client.messages.create(model=MODEL,max_tokens=8000,system=[{'type':'text','text':sysmsg,'cache_control':{'type':'ephemeral'}}],tools=TOOLS,messages=cached(S['messages'])); break
        except Exception as e:
            print('API error, retrying:',type(e).__name__); time.sleep(10*(attempt+1))
    else: S['final']='STOPPED: API errors'; break
    u=r.usage; tk=u.input_tokens+u.output_tokens+(u.cache_read_input_tokens or 0)+(u.cache_creation_input_tokens or 0)
    S['tokens']+=tk; S['turns']+=1; S['usage'].append([u.input_tokens,u.output_tokens,u.cache_read_input_tokens,u.cache_creation_input_tokens])
    S['messages'].append({'role':'assistant','content':[b.model_dump(exclude_none=True) for b in r.content]})
    res=[]
    for b in r.content:
        if b.type=='tool_use':
            c=b.input.get('command',''); print(f'[{RID} t{S["turns"]}] > {c[:150]}')
            out=run(c); res.append({'type':'tool_result','tool_use_id':b.id,'content':out})
            open(LOG,'a',encoding='utf-8').write(json.dumps({'turn':S['turns'],'cmd':c,'out':out[:4000]})+'\n')
        elif b.type=='text': open(LOG,'a',encoding='utf-8').write(json.dumps({'turn':S['turns'],'text':b.text})+'\n')
    if res: S['messages'].append({'role':'user','content':res})
    else: S['final']=' '.join(b.text for b in r.content if b.type=='text'); break
    json.dump(S,open(SF,'w',encoding='utf-8'))
S['secs']=round(time.time()-T0); json.dump(S,open(SF,'w',encoding='utf-8'))
print(f'{RID} DONE turns={S["turns"]} tokens={S["tokens"]} secs={S["secs"]}')
