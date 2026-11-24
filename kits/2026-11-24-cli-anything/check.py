"""python3 check.py <run_id> : recalculates the agent's files with LibreOffice and compares to truth.json"""
import json, os, sys, subprocess, zipfile, re, glob, csv, io
HERE=os.path.dirname(os.path.abspath(__file__)); RID=sys.argv[1]; WD=os.path.join(HERE,'runs',RID,'work'); T=json.load(open(os.path.join(HERE,'truth.json')))
R={'files':{f:os.path.exists(os.path.join(WD,f)) for f in ['flat_expenses.ods','flat_expenses.xlsx','flat_expenses.pdf']}}
ods=os.path.join(WD,'flat_expenses.ods')
if os.path.exists(ods):
    z=zipfile.ZipFile(ods); x=z.read('content.xml').decode('utf-8','ignore')
    R['sheets']=re.findall(r'<table:table table:name="([^"]+)"',x); R['formula_cells']=len(re.findall(r'table:formula=',x))
    out=os.path.join(HERE,'runs',RID,'chk'); os.makedirs(out,exist_ok=True)
    # export every sheet to csv after recalculation
    subprocess.run(['soffice','--headless','--convert-to','csv:Text - txt - csv (StarCalc):44,34,76,1,,0,false,true,false,false,false,-1','--outdir',out,ods],capture_output=True,timeout=120)
    txt=''
    for f in sorted(glob.glob(out+'/*.csv')): txt+=f'## {os.path.basename(f)}\n'+open(f,encoding='utf-8',errors='ignore').read()+'\n'
    R['csv']=txt[:4000]
    nums=[]
    for row in csv.reader(io.StringIO(txt)):
        for cell in row:
            try: nums.append(float(cell.replace(',','').replace('₹','').strip()))
            except ValueError: pass
    def has(v): return any(abs(n-v)<0.02 for n in nums)
    R['truth_match']={'total':has(T['total']),'share':has(round(T['share'],2)),**{f'paid_{p}':has(v) for p,v in T['paid'].items()},**{f'bal_{p}':has(v) for p,v in T['balance'].items()}}
S=json.load(open(os.path.join(HERE,'runs',RID,'state.json'))); R['turns']=S['turns']; R['tokens']=S['tokens']; R['api_secs']=round(S['secs']); R['final']=S['final']
log=[json.loads(l) for l in open(os.path.join(HERE,'runs',RID,'log.jsonl'))]
cmds=[l['cmd'] for l in log if 'cmd' in l]
R['cmd_count']=len(cmds); R['used_cli']=sum('cli-anything-libreoffice' in c for c in cmds); R['read_skill']=any('SKILL.md' in c for c in cmds)
R['errors']=sum(bool(re.search(r'Error|Traceback|No such option|not found',l.get('out',''))) for l in log if 'cmd' in l)
json.dump(R,open(os.path.join(HERE,'runs',RID,'check.json'),'w'),indent=1); print(json.dumps({k:v for k,v in R.items() if k!='csv'},indent=1))
