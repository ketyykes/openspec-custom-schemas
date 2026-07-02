<!--
This file is a mandatory schema output; the apply phase dispatches implementers
in parallel and uses this file for integration verification.
**Critical**: do NOT add Spec Reviewer / Code-Quality Reviewer sections —
the parallel variant intentionally omits two-stage review by design.
-->

# Execution Plan: <change-id>

## Mode

parallel-batches

## Batch definition

| Batch | Tasks | Rationale |
|-------|-------|-----------|
| 1 | 1.1, 1.2, 1.3, 1.4 | <why these can run in the same batch> |
| 2 | 2.1, 2.2 | <why this batch must wait for batch 1> |
| ... | ... | ... |

## Independence proof

For each batch, prove the tasks within can run in parallel:

### Batch 1

**Dependency matrix**:

| Task | Depends on | Files touched |
|------|------------|---------------|
| 1.1 | (none) | `src/a.ts`, `tests/a.test.ts` |
| 1.2 | (none) | `src/b.ts`, `tests/b.test.ts` |
| 1.3 | (none) | `src/c.ts`, `tests/c.test.ts` |
| 1.4 | (none) | `src/d.ts`, `tests/d.test.ts` |

**File intersection**: (empty / list shared files)

**Conclusion**: Files touched within the batch are disjoint; parallel-safe.

### Batch 2

...

## Per-implementer model assignment

| Task | Model | Reason |
|------|-------|--------|
| 1.1 | haiku  | Mechanical, 1 file, spec is unambiguous |
| 1.2 | sonnet | Crosses 2 files; pattern reading needed |
| 1.3 | haiku  | Mechanical |
| 1.4 | opus   | Architecture-level judgment |

Upgrade rules:
- Context gap → add context, redispatch with the **same model**
- Reasoning gap → **upgrade model**
- Task too large → split
- Plan itself is wrong → escalate to a human

## Failure policy

When a task within the batch fails:
- **abort batch**: stop the whole batch immediately; rollback already-committed parts.
- **continue others**: mark the failed task BLOCKED; let other tasks continue;
  revisit at batch end.
- **rollback all**: revert every commit made within the batch; redispatch the entire batch.

**Default**: continue others (matches the spirit of dispatching-parallel-agents —
independent failures should not block independent progress).

## Integration verification (batch-end)

Per dispatching-parallel-agents SKILL.md:78-83:
1. Read each implementer subagent's summary.
2. Check whether any subagent touched a file not listed in the Independence proof.
3. Run the full test suite.
4. Spot check: pick 1-2 task diffs at random and verify by hand.
