---
description: Review uncommitted changes on the current branch for accuracy and improvements
---

## Staged Changes

!`git diff --cached`

## Unstaged Changes

!`git diff`

## Untracked Files

!`git status --short`

Review the above uncommitted changes for:
1. Bugs and logic errors
2. Accuracy — does the code do what it intends to?
3. Improvements — cleaner patterns, better naming, simpler logic
4. Type safety issues
5. Anything that looks unfinished or accidentally included

Give specific, actionable recommendations per file. Keep suggestions proportional — don't nitpick if the change is solid.
