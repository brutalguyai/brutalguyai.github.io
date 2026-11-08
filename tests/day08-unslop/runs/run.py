import anthropic, sys, re, time, json
key=open("/tmp/claude-0/k").read().strip()
c=anthropic.Anthropic(api_key=key)
mode, src_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
src=open(src_path).read() if src_path!="-" else ""
S="unslop/skills/unslop/"
if mode=="skill":
    sysm="You are Claude Code with this skill installed. Follow it.\n\n"+open(S+"SKILL.md").read()+"\n\n"+"\n\n".join(open(S+"references/"+f).read() for f in ["signs.md","tokens.md","visuals.md"])
    user="/unslop this page. No image generation tool is available, no video. Skip asking questions: pick the direction yourself, then output ONLY the full final single-file HTML in one ```html block.\n\n"+src
elif mode=="control":
    sysm="You are Claude Code."
    user="Make this page look less AI-generated and more like a designed interface. Output ONLY the full final single-file HTML in one ```html block.\n\n"+src
elif mode=="make":
    sysm="You are Claude Code."
    user=open(src_path.replace(".html",".prompt")).read() if False else sys.argv[4]
t=time.time()
with c.messages.stream(model="claude-sonnet-5-5",max_tokens=64000,system=sysm,messages=[{"role":"user","content":user}]) as s:
    r=s.get_final_message()
txt="".join(b.text for b in r.content if b.type=="text")
m=re.search(r"```html\n(.*?)```",txt,re.S)
open(out,"w").write(m.group(1) if m else txt)
log={"mode":mode,"src":src_path,"model":r.model,"in":r.usage.input_tokens,"out":r.usage.output_tokens,"secs":round(time.time()-t,1),"stop":r.stop_reason}
open("log.jsonl","a").write(json.dumps(log)+"\n"); open(out+".transcript.json","w").write(json.dumps({"system":sysm[:500]+"...","user":user[:3000],"response":txt}))
print(log)
