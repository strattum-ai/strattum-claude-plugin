---
type: llm
---

PASS if the reply says the sign-in or credential was rejected and that the next step is to sign in again (Authenticate or Re-authenticate in /mcp, or Connect in the chat), and gives no count of contracts. Citing the 401 status the tool returned is fine.
FAIL if the reply treats it as missing permission and sends the person to whoever manages permissions as the fix, gives any count or figure about contracts, or asks for a token, password or API key.
