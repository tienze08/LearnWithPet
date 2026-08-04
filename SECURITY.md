# Security policy

## Reporting a vulnerability

Do not open a public issue for a security problem or an exposed credential.
Contact the project owner privately, include the affected URL or file, and do
not include live passwords, API keys, tokens, or personal data in the report.

## Secrets

Secrets belong in the deployment provider's environment variables, never in
source code, `.env` files, or VS Code launch configurations. If a secret is
ever committed, revoke it immediately and create a replacement before any
further deployment.
