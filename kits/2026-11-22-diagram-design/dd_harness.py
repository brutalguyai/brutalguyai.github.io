#!/usr/bin/env python3
"""brutal guy.ai - diagram-design test harness (direct Anthropic API, resumable).

Emulates how Claude Code exposes a skill: in `skill` mode the system prompt lists the
diagram-design skill (name + its own frontmatter description + SKILL.md location), and the
model decides itself whether to read it. In `plain` mode no skill is listed. Everything else
(prompt, tools, model, limits) is identical.

Each invocation advances one run for at most --seconds, saving state after every API turn,
so it survives a shell that kills processes when a call returns.

usage: python3 dd_harness.py RUN_ID --mode skill|plain --prompt-file P.txt [--seconds 150]
"""
import argparse, json, os, re, subprocess, sys, time, urllib.request, urllib.error

EP = os.path.dirname(os.path.abspath(__file__))            # episode/harness
EPISODE = os.path.dirname(EP)
PROJECT = os.path.dirname(os.path.dirname(EPISODE))         # D:\brutal-guy-ai
SKILL = os.path.join(EPISODE, "repo", "skills", "diagram-design")
MODEL = "claude-sonnet-5-5"
RUN_TOKEN_CAP = 450_000
EPISODE_TOKEN_CAP = 2_000_000
MAX_TURNS = 30
AUTO_REPLY = "Proceed with the default style."

def key():
    for line in open(os.path.join(PROJECT, ".env"), encoding="utf-8"):
        if line.startswith("ANTHROPIC_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("no key")

def skill_desc():
    s = open(os.path.join(SKILL, "SKILL.md"), encoding="utf-8").read()
    m = re.search(r"^description:\s*(.+)$", s, re.M)
    return m.group(1).strip()

def inside(p, roots):
    rp = os.path.realpath(p)
    return any(rp == os.path.realpath(r) or rp.startswith(os.path.realpath(r) + os.sep) for r in roots)

TOOLS = [
    {"name": "list_dir", "description": "List a directory.", "input_schema": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}},
    {"name": "read_file", "description": "Read a text file. Optional 1-based line offset and limit.", "input_schema": {"type": "object", "properties": {"path": {"type": "string"}, "offset": {"type": "integer"}, "limit": {"type": "integer"}}, "required": ["path"]}},
    {"name": "write_file", "description": "Create or overwrite a file in the project directory.", "input_schema": {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}},
    {"name": "run_python", "description": "Run a Python script with arguments, e.g. a helper script shipped with a skill. Working directory is the script's folder. 90 s timeout.", "input_schema": {"type": "object", "properties": {"script": {"type": "string"}, "args": {"type": "array", "items": {"type": "string"}}}, "required": ["script"]}},
    {"name": "fetch_url", "description": "HTTP GET a public URL and return the text (first 150 KB).", "input_schema": {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}},
]

def tool(name, inp, work, mode):
    read_roots = [work] + ([SKILL] if mode == "skill" else [])
    try:
        if name == "list_dir":
            p = inp["path"]
            if not inside(p, read_roots): return "error: outside allowed folders"
            return "\n".join(sorted(e + ("/" if os.path.isdir(os.path.join(p, e)) else "") for e in os.listdir(p)))
        if name == "read_file":
            p = inp["path"]
            if not inside(p, read_roots): return "error: outside allowed folders"
            lines = open(p, encoding="utf-8", errors="replace").read().split("\n")
            o = max(1, inp.get("offset", 1)); l = inp.get("limit", 2000)
            return "\n".join(lines[o - 1:o - 1 + l])
        if name == "write_file":
            p = inp["path"]
            if not os.path.isabs(p): p = os.path.join(work, p)
            if not inside(p, [work]): return "error: can only write inside the project directory " + work
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "w", encoding="utf-8").write(inp["content"])
            return f"wrote {len(inp['content'])} chars to {p}"
        if name == "run_python":
            s = inp["script"]
            if not inside(s, read_roots): return "error: outside allowed folders"
            args = [a for a in inp.get("args", [])]
            r = subprocess.run([sys.executable, "-I", s] + args, cwd=os.path.dirname(s), capture_output=True, text=True, timeout=90)
            return (f"exit {r.returncode}\n" + r.stdout[-6000:] + r.stderr[-3000:])
        if name == "fetch_url":
            req = urllib.request.Request(inp["url"], headers={"User-Agent": "Mozilla/5.0"})
            return urllib.request.urlopen(req, timeout=30).read(150_000).decode("utf-8", "replace")
    except Exception as e:
        return f"error: {type(e).__name__}: {e}"
    return "error: unknown tool"

def call(k, body):
    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps(body).encode(),
        headers={"x-api-key": k, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=170) as r:
        return json.load(r)

def cached(msgs):
    msgs = json.loads(json.dumps(msgs))
    last = msgs[-1]
    if isinstance(last["content"], str):
        last["content"] = [{"type": "text", "text": last["content"]}]
    last["content"][-1]["cache_control"] = {"type": "ephemeral"}
    return msgs

def episode_tokens():
    p = os.path.join(EPISODE, "logs", "tokens.jsonl"); t = 0
    if os.path.exists(p):
        for l in open(p): t += json.loads(l)["total"]
    return t

def main():
    a = argparse.ArgumentParser(); a.add_argument("run"); a.add_argument("--mode", required=True)
    a.add_argument("--prompt-file"); a.add_argument("--seconds", type=float, default=150)
    a = a.parse_args()
    rdir = os.path.join(EPISODE, "runs", a.run); work = os.path.join(rdir, "project")
    os.makedirs(work, exist_ok=True); os.makedirs(os.path.join(EPISODE, "logs"), exist_ok=True)
    sp = os.path.join(rdir, "state.json")
    if os.path.exists(sp):
        st = json.load(open(sp))
    else:
        prompt = open(a.prompt_file, encoding="utf-8").read().strip()
        st = {"run": a.run, "mode": a.mode, "model": MODEL, "prompt": prompt, "messages": [{"role": "user", "content": prompt}],
              "turns": 0, "tokens": 0, "done": False, "auto_replies": 0, "skill_read": False, "files_read": [], "t0": time.time()}
    if st["done"]: print("DONE already", st.get("stop")); return
    system = (f"You are Claude Code, an interactive agent that helps users with software engineering tasks. "
              f"The user's project directory is {work}. Use the tools to read and write files there.")
    if st["mode"] == "skill":
        system += (f"\n\n<available_skills>\n<skill name=\"diagram-design\" location=\"{os.path.join(SKILL, 'SKILL.md')}\">\n{skill_desc()}\n</skill>\n</available_skills>\n"
                   "When a task matches an available skill, read that skill's SKILL.md before doing the task and follow it.")
    k = key(); start = time.time()
    while time.time() - start < a.seconds:
        if st["turns"] >= MAX_TURNS or st["tokens"] >= RUN_TOKEN_CAP or episode_tokens() >= EPISODE_TOKEN_CAP:
            st["done"] = True; st["stop"] = "cap"; break
        body = {"model": MODEL, "max_tokens": 16000, "system": [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
                "tools": TOOLS, "messages": cached(st["messages"])}
        t1 = time.time()
        try: r = call(k, body)
        except urllib.error.HTTPError as e:
            print("HTTP", e.code, e.read()[:500]); break
        u = r["usage"]; tot = u.get("input_tokens", 0) + u.get("output_tokens", 0) + u.get("cache_read_input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
        st["tokens"] += tot; st["turns"] += 1
        open(os.path.join(EPISODE, "logs", "tokens.jsonl"), "a").write(json.dumps({"agent": "tester", "run": st["run"], "usage": u, "total": tot, "secs": round(time.time() - t1, 1)}) + "\n")
        st["messages"].append({"role": "assistant", "content": r["content"]})
        uses = [b for b in r["content"] if b["type"] == "tool_use"]
        if uses:
            res = []
            for b in uses:
                if b["name"] == "read_file":
                    st["files_read"].append(b["input"].get("path", ""))
                    if b["input"].get("path", "").endswith("SKILL.md"): st["skill_read"] = True
                out = tool(b["name"], b["input"], work, st["mode"])
                res.append({"type": "tool_result", "tool_use_id": b["id"], "content": out[:60000]})
            st["messages"].append({"role": "user", "content": res})
        else:
            made = [f for f in os.listdir(work) if f.endswith((".html", ".svg", ".md", ".mmd"))] if os.path.isdir(work) else []
            txt = " ".join(b.get("text", "") for b in r["content"] if b["type"] == "text")
            if not made and st["auto_replies"] == 0 and "?" in txt:
                st["auto_replies"] = 1; st["messages"].append({"role": "user", "content": AUTO_REPLY})
            else:
                st["done"] = True; st["stop"] = r.get("stop_reason"); st["final_text"] = txt
                break
        json.dump(st, open(sp, "w"))
    st["secs_total"] = round(time.time() - st["t0"], 1)
    json.dump(st, open(sp, "w"))
    print(json.dumps({k2: st[k2] for k2 in ("run", "mode", "turns", "tokens", "done", "skill_read", "auto_replies")}), "| episode tokens", episode_tokens())

if __name__ == "__main__":
    main()
