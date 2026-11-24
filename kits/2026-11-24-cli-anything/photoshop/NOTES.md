# Agent test notes (Nov 24 2026)
- ps_1 attempt A (log turns 1-24): Photoshop was closed partway (Swapnil confirmed), and the script was restarted. Attempt B reuses the same work dir; its log is appended after attempt A's in log.jsonl. Treat ps_1 as contaminated: it found attempt A's clean.png/cutout.png. ps_2 and ps_3 start clean.
- 12:55 IST: modal "Couldn't find a subject to select" blocked automation. Claude clicked OK (human intervention #1).
- ps_1 attempt B: Select Subject modal again around 13:04 (intervention #2). Finished at 31 turns / 617,587 tokens. Select Subject made no selection, so it used OpenCV GrabCut to compute the outline and fed it to Photoshop as a selection. That bends the "no pixel editing in Python" rule.
- ps_2 13:13 IST: modal "Couldn't find background to remove" (Remove Background AI), intervention #3. QUESTION: are Photoshop's AI selection features failing because of this environment (cloud/sign-in/network)? Test Select > Subject by hand after the runs.
- ps_3 turn 5: a bare `echo` made PowerShell prompt for input. That's a runner bug: stdin wasn't closed, so it waited on the console. Fixed in ps_agent.py for future runs. Swapnil pressed Enter (intervention #4).
- ps_3 13:38 IST: Select Subject modal again (intervention #5). Afterwards Photoshop showed 'Finding objects in your image', so its object finder does run.
- ps_3 13:41 IST: Select Subject modal (intervention #6).
- ps_3 13:44 IST: Select Subject modal again, this time on a cropped 966x1342 image (intervention #7).
- ps_3 13:48 IST: Remove Background modal (intervention #8).
