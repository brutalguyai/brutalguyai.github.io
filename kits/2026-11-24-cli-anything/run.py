"""Resumable agent test runner. python3 run.py <run_id> <plain|cli>   (call repeatedly until it prints DONE)
Each call works <=150 s, saves state, exits. Sonnet 5.5 via the Anthropic API key in ../../../.env (never printed)."""
import json, os, sys, time, subprocess
import anthropic
T0=time.time(); RID, MODE = sys.argv[1], sys.argv[2]
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))
env={}
for l in open(os.path.join(ROOT,'.env'),encoding='utf-8-sig'):
    l=l.strip()
    if '=' in l and not l.startswith('#'): k,v=l.split('=',1); env[k.strip()]=v.strip()
client=anthropic.Anthropic(api_key=env['ANTHROPIC_API_KEY'])
MODEL='claude-sonnet-5-5'; MAX_TURNS=45; CAP=400_000
RD=os.path.join(HERE,'runs',RID); WD=os.path.join(RD,'work'); os.makedirs(WD,exist_ok=True)
SF=os.path.join(RD,'state.json'); LOG=os.path.join(RD,'log.jsonl')
CLI_BIN=os.path.join(HERE,'clibin')
SKILL=os.path.join(HERE,'CLI-Anything','skills','cli-anything-libreoffice','SKILL.md')
TASK=open(os.path.join(HERE,'task.txt')).read()
if MODE=='force': TASK+='\nBuild the spreadsheet with the cli-anything-libreoffice tool.'
sysmsg=("You are a coding agent working in a Linux shell. Use the bash tool to run commands. Working directory: "+WD+
        ". LibreOffice (soffice) and python3 are installed.")
if MODE in ('cli','force'):
    sysmsg+=("\n\nAvailable skills (read a skill's SKILL.md before using it if it is relevant):\n- cli-anything-libreoffice: "
             "Command-line interface for LibreOffice - a stateful CLI for document editing (Writer, Calc, Impress) that produces real ODF files, designed for AI agents. "
             "SKILL.md: "+SKILL+"\nThe `cli-anything-libreoffice` command is installed on PATH.")
TOOLS=[{"name":"bash","description":"Run a bash command in the working directory. Returns stdout+stderr (truncated to 8000 chars). 90 s timeout.",
        "input_schema":{"type":"object","properties":{"command":{"type":"string"}},"required":["command"]}}]
if os.path.exists(SF): S=json.load(open(SF))
else:
    import shutil; shutil.copy(os.path.join(HERE,'expenses.csv'),WD)
    S={'messages':[{'role':'user','content':TASK}],'turns':0,'tokens':0,'usage':[],'done':False,'secs':0.0,'final':None}
if S['done']: print('DONE (already)'); sys.exit()
PATHV=(CLI_BIN+':' if MODE in ('cli','force') else '')+'/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
def bash(cmd):
    try:
        p=subprocess.run(['bash','-lc',cmd],cwd=WD,capture_output=True,text=True,timeout=90,env={'PATH':PATHV,'HOME':os.path.join(RD,'home'),'LANG':'C.UTF-8'})
        out=(p.stdout+p.stderr)
    except subprocess.TimeoutExpired: out='[timed out after 90 s]'
    return out[-8000:] if len(out)>8000 else out
def cached(msgs):
    m=json.loads(json.dumps(msgs)); last=m[-1]
    if isinstance(last['content'],str): last['content']=[{'type':'text','text':last['content'],'cache_control':{'type':'ephemeral'}}]
    else: last['content'][-1]['cache_control']={'type':'ephemeral'}
    return m
while time.time()-T0<150:
    if S['turns']>=MAX_TURNS or S['tokens']>=CAP: S['done']=True; S['final']=S['final'] or f'STOPPED: turns={S["turns"]} tokens={S["tokens"]}'; break
    t1=time.time()
    r=client.messages.create(model=MODEL,max_tokens=4000,system=[{'type':'text','text':sysmsg,'cache_control':{'type':'ephemeral'}}],tools=TOOLS,messages=cached(S['messages']))
    u=r.usage; tk=u.input_tokens+u.output_tokens+(u.cache_read_input_tokens or 0)+(u.cache_creation_input_tokens or 0)
    S['tokens']+=tk; S['turns']+=1; S['usage'].append([u.input_tokens,u.output_tokens,u.cache_read_input_tokens,u.cache_creation_input_tokens])
    blocks=[b.model_dump() for b in r.content]; S['messages'].append({'role':'assistant','content':blocks})
    res=[]
    for b in r.content:
        if b.type=='tool_use':
            out=bash(b.input.get('command','')); res.append({'type':'tool_result','tool_use_id':b.id,'content':out})
            open(LOG,'a').write(json.dumps({'turn':S['turns'],'cmd':b.input.get('command',''),'out':out[:3000]})+'\n')
        elif b.type=='text': open(LOG,'a').write(json.dumps({'turn':S['turns'],'text':b.text})+'\n')
    S['secs']+=time.time()-t1
    if res: S['messages'].append({'role':'user','content':res})
    else:
        S['done']=True; S['final']=' '.join(b.text for b in r.content if b.type=='text'); break
json.dump(S,open(SF,'w'))
print(('DONE' if S['done'] else 'CONTINUE'),'turns',S['turns'],'tokens',S['tokens'],'secs',round(S['secs']))
