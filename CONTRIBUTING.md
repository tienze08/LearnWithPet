# Contribution workflow

`main` is the protected production branch. Do not develop or push feature code
directly to it.

## For every feature or bug fix

1. Start from the latest `main`.
2. Create one focused branch, for example `feature/pdf-companion` or
   `fix/login-cors`.
3. Commit only the files for that change and push the branch.
4. Open exactly one pull request from that branch into `main`.
5. Merge only after the PR checklist is complete, all CI checks are green, and
   the review is approved.

Never put passwords, JWT secrets, database URLs with passwords, or Gemini keys
in Git. Store them only in Render/Vercel environment variables.
