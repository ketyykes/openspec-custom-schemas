<!--
This file is a mandatory schema output; it records the isolated work environment.
The apply phase reads it on every start to confirm work is happening in the
correct worktree.
-->

# Environment: <change-id>

## Branch

- **Branch name**: `change/<change-id>`
- **Base branch**: <main | master | other>

## Setup commands

```bash
git worktree add <path> -b change/<change-id> <base-branch>
cd <path>
<dependency install command, e.g., pnpm install>
<baseline test command, e.g., pnpm test>
```

## Verification

- **Baseline tests**: PASS / FAIL — <result of the run>
- **Initial commit hash**: `<sha>`
- **Worktree path** (absolute): `<path>`

## Teardown

```bash
cd <repo-root>
git worktree remove <path>
git branch -D change/<change-id>   # only if the branch is no longer needed
```
