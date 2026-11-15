import json,os,sys
L=[json.loads(l) for l in open(os.path.expanduser(f'~/work/runs/cc{sys.argv[1]}.jsonl')) if l.strip()]
for x in L:
    if x.get('type')=='system' and x.get('subtype')=='init': print('apiKeySource',x.get('apiKeySource'),'model',x.get('model'))
    if x.get('type')=='rate_limit_event': print('RATE LIMIT EVENT', str(x)[:200])
r=[x for x in L if x.get('type')=='result']
if not r: print('no result'); sys.exit()
r=r[-1]; u=r.get('usage',{})
tot=sum(u.get(k,0) for k in ['input_tokens','output_tokens','cache_read_input_tokens','cache_creation_input_tokens'])
print(json.dumps({k:r.get(k) for k in ['subtype','num_turns','duration_ms']}), 'usage',{k:u.get(k) for k in ['input_tokens','output_tokens','cache_read_input_tokens','cache_creation_input_tokens']},'TOTAL',tot)
print(r.get('result','')[:3000])
