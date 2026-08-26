---
applyTo: "**"
description: "Always maintain a dated session summary for this project before ending every Copilot session."
---

# Session Summary Rule

Before sending the final response of every Copilot session in this workspace, create or update `SESSION_SUMMARY_YYYY-MM-DD.md`, using the current local date.

Requirements:
- If today's summary file does not exist, create it.
- If it exists, append a new clearly dated session section; do not overwrite earlier entries.
- Record only facts from the current session:
  - work completed and important decisions
  - files created or changed
  - validation or tests run and their results
  - remaining work, blockers, and operational follow-up
- Keep the summary concise and useful for resuming work later.
- Mention explicitly when no files were changed or no tests were run.
- Update the summary before the final response, even when the user did not request a summary.
- Do not claim deployment, external Google Sheets changes, or GitHub pushes unless they were actually verified.
- Treat the summary as project memory, not as a replacement for source code or formal documentation.
