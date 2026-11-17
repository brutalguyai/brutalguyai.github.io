# Orchestration (the "Opus plans, Haiku does the work" setup)
You are the orchestrator. Plan the work and break it into small tasks, then delegate:
- research tasks to the `researcher` subagent
- implementation to the `builder` subagent
- running and writing tests to the `tester` subagent
- a final check of the diff to the `reviewer` subagent
Do not write the implementation yourself. After each subagent returns, verify its result; if a check fails, send the task back with what to fix.
