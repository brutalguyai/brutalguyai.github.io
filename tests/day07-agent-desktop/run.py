import anthropic, subprocess, json, sys, os, base64, time, shlex

MODE = sys.argv[1]  # "ad" (agent-desktop) or "shot" (screenshot)
OUT = sys.argv[2]
LOG = sys.argv[3]
MAXT = 30
key = os.environ["ANTHROPIC_API_KEY"]  # set your own key
client = anthropic.Anthropic(api_key=key)
ENV = dict(os.environ, DISPLAY=":99")
for l in open("/home/claude/d7/dbus.env"):
    if l.startswith("DBUS_SESSION_BUS_ADDRESS="):
        ENV["DBUS_SESSION_BUS_ADDRESS"] = l.split("=", 1)[1].strip().rstrip(";").strip("'")

TASK = (f"The Mousepad text editor is open on this Linux desktop. Type exactly this text into the document: "
        f"Brutal guy was here\nThen save the document as the file {OUT} (use the app's own Save dialog). "
        f"When the file is saved, reply DONE.")

def sh(cmd, timeout=40):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, env=ENV, timeout=timeout)
    return (r.stdout + r.stderr)[-60000:]

if MODE in ("ad","lean"):
    skill = open("/home/claude/agent-desktop/skills/agent-desktop/SKILL.md").read()
    system = "You operate the desktop ONLY through the agent-desktop CLI via the run tool.\n\n" + skill
    if MODE == "lean":
        system += "\n\nTOKEN BUDGET RULE: never take full snapshots and do not load extra skills. Use `agent-desktop find` with --role/--name to get only the refs you need, and keyboard shortcuts via `agent-desktop press`."
    tools = [{"name": "run", "description": "Run one agent-desktop command (must start with 'agent-desktop ').",
              "input_schema": {"type": "object", "properties": {"cmd": {"type": "string"}}, "required": ["cmd"]}}]
else:
    system = ("You operate the desktop ONLY by looking at screenshots and sending xdotool input. "
              "Screen is 1440x900. Use the screenshot tool to see, and the xdotool tool for input, e.g. "
              "'mousemove 100 200 click 1', 'type --delay 20 \"text\"', 'key ctrl+s'.")
    tools = [{"name": "screenshot", "description": "Take a screenshot of the whole screen.",
              "input_schema": {"type": "object", "properties": {}}},
             {"name": "xdotool", "description": "Run xdotool with these arguments.",
              "input_schema": {"type": "object", "properties": {"args": {"type": "string"}}, "required": ["args"]}}]

msgs = [{"role": "user", "content": TASK}]
log = open(LOG, "w")
tot_in = tot_out = 0
t0 = time.time()
for turn in range(MAXT):
    r = client.messages.create(model="claude-sonnet-5-5", max_tokens=1500, system=system, tools=tools, messages=msgs)
    tot_in += r.usage.input_tokens; tot_out += r.usage.output_tokens
    msgs.append({"role": "assistant", "content": r.content})
    results = []
    for b in r.content:
        if b.type == "text":
            log.write(json.dumps({"t": round(time.time() - t0, 1), "type": "text", "text": b.text}) + "\n")
        if b.type == "tool_use":
            if MODE in ("ad","lean"):
                cmd = b.input.get("cmd", "")
                out = sh(cmd) if cmd.strip().startswith("agent-desktop ") else "REFUSED: only agent-desktop commands"
                log.write(json.dumps({"t": round(time.time() - t0, 1), "type": "cmd", "cmd": cmd, "out": out[:4000], "out_chars": len(out)}) + "\n")
                results.append({"type": "tool_result", "tool_use_id": b.id, "content": out})
            elif b.name == "screenshot":
                sh("import -window root /tmp/s.png && convert /tmp/s.png -resize 1440x900 /tmp/s.png")
                data = base64.b64encode(open("/tmp/s.png", "rb").read()).decode()
                log.write(json.dumps({"t": round(time.time() - t0, 1), "type": "screenshot"}) + "\n")
                results.append({"type": "tool_result", "tool_use_id": b.id,
                                "content": [{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": data}}]})
            else:
                a = b.input.get("args", "")
                out = sh("xdotool " + a)
                log.write(json.dumps({"t": round(time.time() - t0, 1), "type": "cmd", "cmd": "xdotool " + a, "out": out[:500]}) + "\n")
                results.append({"type": "tool_result", "tool_use_id": b.id, "content": out or "ok"})
    log.write(json.dumps({"turn": turn + 1, "in": r.usage.input_tokens, "out": r.usage.output_tokens}) + "\n"); log.flush()
    if not results:
        break
    msgs.append({"role": "user", "content": results})

ok = os.path.exists(OUT) and open(OUT).read().strip() == "Brutal guy was here"
summary = {"mode": MODE, "turns": turn + 1, "input_tokens": tot_in, "output_tokens": tot_out,
           "seconds": round(time.time() - t0, 1), "file_ok": ok,
           "file_content": open(OUT).read() if os.path.exists(OUT) else None}
log.write(json.dumps({"summary": summary}) + "\n")
print(json.dumps(summary))
