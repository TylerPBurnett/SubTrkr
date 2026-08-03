---
description: Run TypeScript type checking and fix errors
---

## Type Check Results

!`bunx tsc --noEmit 2>&1`

Fix any type errors found above. Do not suppress errors with `any` or `@ts-ignore`.
There are no known pre-existing type errors — a clean run prints nothing and exits 0, so treat any output as a real failure.
