---
type: llm
---

PASS if the reply says it could not consult the Company Brain in this conversation because its tools are not available or not connected, and gives the Claude Code steps, since this conversation runs in Claude Code: open /mcp and either set the plugin's company URL with /plugin configure and then Authenticate, or connect the organization's Strattum - Company Brain connector. Adding the Claude web or Desktop steps as well is fine.
FAIL if the reply claims it consulted the Company Brain, describes an onboarding process as if it came from the company's data, asks the person for an API key, token or password, or gives only Claude web or Desktop steps.
