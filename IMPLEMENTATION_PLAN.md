# Implementation Plan — Build 5 Remaining TDD Schema Variants

> **Audience**: a fresh subagent dispatched in a new session.
> **Read this whole file before touching anything.** It is self-contained —
> all design decisions are baked in. **Do not invent or "improve"**;
> the user has explicitly chosen faithful replication of superpowers over
> creative redesign.

---

## 1. Goal

Build 5 sibling schema variants inside `openspec-custom-schemas/`. The base variant
`tdd-sequential/` is already complete and is the reference for everything else.

Final layout (you will create the 5 new folders):

```
openspec-custom-schemas/
├── README.md                                    [exists; update at end]
├── IMPLEMENTATION_PLAN.md                       [this file]
├── tdd-sequential/                              [DONE — do not modify]
│   ├── schema.yaml
│   └── templates/{proposal,spec,design,test-plan,overview,tasks}.md
├── tdd-sequential-worktree/                     [TO BUILD]
├── tdd-subagent/                                [TO BUILD]
├── tdd-subagent-worktree/                       [TO BUILD]
├── tdd-parallel/                                [TO BUILD]
└── tdd-parallel-worktree/                       [TO BUILD]
```

---

## 2. Files You Must Read First

Read these in order before writing anything:

1. `openspec-custom-schemas/tdd-sequential/schema.yaml` — base structure to overlay onto.
2. `openspec-custom-schemas/tdd-sequential/templates/*.md` — 6 shared templates; will be copied verbatim to every variant.
3. `openspec-custom-schemas/README.md` — family overview, artifact matrix.
4. `superpowers/skills/subagent-driven-development/SKILL.md` — verbatim source for subagent variants' two-stage review and Model Selection.
5. `superpowers/skills/dispatching-parallel-agents/SKILL.md` — verbatim source for parallel variants' batch dispatch. **Note: no per-task review by design.**
6. `superpowers/skills/using-git-worktrees/SKILL.md` — source for worktree variants' environment setup.
7. `superpowers/skills/test-driven-development/SKILL.md` — RED→GREEN→REFACTOR discipline (already baked into base apply.instruction; reference only).

Path note: `superpowers/` is a sibling of `openspec-custom-schemas/` at `combin-sp-opsecp/superpowers/`.

---

## 3. Design Constraints (hard rules — violating any of these = wrong output)

1. **Faithfully replicate superpowers; do not invent.** When a design choice has two paths ("verbatim from SKILL.md" vs. "my improvement"), pick verbatim. This applies to the three superpowers skills the variants inline (subagent-driven, dispatching-parallel, using-git-worktrees); the OpenSpec schema scaffolding itself is already a customised version of `spec-driven` and is NOT under the "verbatim" rule.
2. **Subagent variants MUST have two-stage review** (Stage 1: spec compliance, Stage 2: code quality, in this order, with fix-loops) — per `subagent-driven-development/SKILL.md`.
3. **Parallel variants MUST NOT have two-stage review.** They follow `dispatching-parallel-agents/SKILL.md`: parallel dispatch → batch-level integration verification (read summaries + run full test suite + spot-check). Adding per-task spec/quality reviewers to parallel variants is explicitly rejected.
4. **Worktree variants MUST include `environment.md` artifact** and `apply.instruction` MUST start by verifying / entering the worktree before any task work.
5. **All ASCII goes in `overview.md`**, never in `specs/**/*.md` (would break OpenSpec's spec parser).
6. **Model selection is per-role**, baked into each variant's `execution-plan.md` and apply.instruction. Use the table in §6 verbatim.
7. **Do not modify `tdd-sequential/` or its templates.** The base is frozen.
8. **All `instruction:` blocks in schema.yaml are written in English** to match the base. The single exception is the `overview` artifact's `instruction:`, which is kept in Traditional Chinese (Taiwan) for personal-use reasons. All `templates/**/*.md` content is also English, with the same `overview.md` exception. Final output language is controlled by `openspec/config.yaml` `context:` injection (see `OpenSpec/docs/multi-language.md`), not by this schema. Field names, identifiers, and code remain English regardless.

---

## 4. Variant Specifications

For each variant: list of artifacts, what's new vs base, and exactly how `apply.instruction` differs.

### 4.1 `tdd-sequential-worktree`

**Artifacts** (7): proposal, specs, design, test-plan, overview, tasks, **+ environment**.

**Diff from base**:
- Add `environment` artifact with `requires: [proposal]` (see §5.1 for template spec).
- Prepend the following block to `apply.instruction` (before the existing "─── For each RED task ───" sequence, after the opening line and the commit-permission preamble):

```text
─── Step 0: Worktree pre-flight check ───
0a. Read environment.md; obtain the worktree path and base branch.
0b. Verify the current cwd is inside the worktree path declared in
    environment.md. If not, run the setup commands listed in
    environment.md to enter the worktree.
0c. Run the full test suite to confirm the baseline is green.
    If not green, stop, report, and do not start any task.
0d. Record the baseline commit hash into environment.md's Verification
    section (if not already recorded).
```

Everything else identical to base.

---

### 4.2 `tdd-subagent`

**Artifacts** (7): proposal, specs, design, test-plan, overview, tasks, **+ execution-plan**.

**Diff from base**:
- Add `execution-plan` artifact with `requires: [test-plan]` (see §5.2 for template spec — **subagent version**).
- Update `tasks` artifact's `requires:` to `[specs, test-plan, execution-plan, design]`.
- **Replace** the entire `─── For each RED task ───` through `─── For each REFACTOR task ───` body of `apply.instruction` with the subagent dispatch flow below. Keep the opening "Process every unchecked checkbox in tasks.md in order" line and the commit-permission preamble (the "Commit behavior assumes the agent host has git permission ..." paragraph). Keep the closing `─── When blocked ───` section. Replace the `─── Forbidden ───` list with the version below.

```text
Process every unchecked checkbox in tasks.md in order.
**Every task runs the full three-role flow; do not reorder, skip, or merge.**

─── Per Task: dispatch Implementer ───
1. Read execution-plan.md for the Implementer's default_model and upgrade triggers.
2. Dispatch a fresh subagent as Implementer with:
   - The complete text of the task from tasks.md (the RED + GREEN pair)
   - The matching entry from test-plan.md (test name / scenario / assertion / why first)
   - The relevant spec.md section (only the capability this task touches)
   - The relevant design.md section (decisions and constraints affecting this task)
   - Explicit instruction: write the RED test → run tests, see it fail
     → write minimum GREEN implementation → run tests, see it pass
     → self-review → commit
3. Implementer reports status:
   - DONE: proceed to Step 4 (Stage 1)
   - DONE_WITH_CONCERNS: read concerns. If they are about correctness or scope,
     resolve before Stage 1. If they are observational (e.g., "this file grew big"),
     log and continue.
   - NEEDS_CONTEXT: supply the missing context; redispatch with the same model.
   - BLOCKED: follow escalation rules — context gap → add context;
     reasoning gap → upgrade model; task too big → split; plan wrong → escalate.
     Never redispatch the same model under the same conditions.

─── Per Task: Stage 1 — Spec Compliance Review ───
4. Dispatch a fresh subagent as Spec Reviewer (model per execution-plan.md).
5. Sole task: compare code against spec and test-plan; answer
   "does the code match the spec?"
   - Look at: requirement coverage, scope creep, RED → Scenario mapping.
   - Do NOT look at: naming, structure, quality (that is Stage 2's job).
6. ❌ Stage 1 fails → Implementer (same role, fresh subagent) fixes → back to Step 4.
   ✅ Stage 1 passes → proceed to Step 7.

─── Per Task: Stage 2 — Code Quality Review ───
7. Dispatch a fresh subagent as Code-Quality Reviewer (model per execution-plan.md).
8. Sole task: review implementation quality.
   - Look at: naming, duplication, edge cases, error handling, readability,
     consistency with existing style.
   - Do NOT re-litigate whether the spec is right (Stage 1 already covered that).
9. ❌ Stage 2 fails → Implementer fixes → back to Step 7.
   ✅ Stage 2 passes → check off the box; proceed to the next task.

─── After all tasks complete ───
10. Dispatch a final Code Reviewer over the full set of commits to confirm
    cross-task integration is consistent.
11. All green → apply done.
```

Replace `─── Forbidden ───` list with this **superpowers-faithful** version:
```text
─── Forbidden ───
- Dispatching multiple Implementer subagents in parallel (they will conflict)
- Skipping Stage 1 or Stage 2
- Starting Stage 2 before Stage 1 failures are resolved
- Moving to the next task without running the fix-loop on reviewer findings
- Letting the Implementer's self-review replace reviewer review (both are required)
- Waving through "close enough" spec deviations
- Redispatching a BLOCKED task with the same model under the same conditions
- Letting any subagent read plan files directly (always paste the full task text)
```

---

### 4.3 `tdd-subagent-worktree`

**Artifacts** (8): all of `tdd-subagent` + **environment**.

**Diff**: union of §4.1 and §4.2.
- Add `environment` artifact (`requires: [proposal]`).
- Add `execution-plan` artifact (subagent version, `requires: [test-plan]`).
- `tasks` requires `[specs, test-plan, execution-plan, design]`.
- `apply.instruction` starts with §4.1's "─── Step 0: Worktree pre-flight check ───" block (English version above), then §4.2's subagent dispatch flow.
- All dispatched subagents share the same worktree as the main agent (the one validated in Step 0). Do NOT create per-subagent worktrees.

---

### 4.4 `tdd-parallel`

**Artifacts** (7): proposal, specs, design, test-plan, overview, tasks, **+ execution-plan** (parallel version, see §5.3).

**Diff from base**:
- Add `execution-plan` artifact with `requires: [test-plan]` (parallel version — no reviewer roles).
- Update `tasks` `requires:` to `[specs, test-plan, execution-plan, design]`.
- **Replace** the entire per-task RED/GREEN/REFACTOR body of `apply.instruction` with the batch dispatch flow below. Keep the opening "Process every unchecked checkbox in tasks.md in order" line and the commit-permission preamble. Keep the closing `─── When blocked ───` section. Replace the `─── Forbidden ───` list with the version below.

```text
Read execution-plan.md for batch definitions and Independence proofs.
**Batches run sequentially; tasks within a batch run in parallel.**

─── Per Batch ───
1. Confirm the Independence proof for this batch still holds (no file or
   module overlap). If manual edits since the plan invalidate it, stop and
   request replanning.
2. Dispatch Implementer subagents in parallel, one per (RED, GREEN) pair
   inside the batch:
   - Each subagent uses the model assigned in execution-plan.md
     (can be fine-tuned per task).
   - Each subagent receives: the full task text from tasks.md, the matching
     entry from test-plan.md, the relevant spec / design sections,
     and explicit RED → GREEN → commit instructions.
3. Wait for all subagents in the batch to report.
4. Integration verification (per dispatching-parallel-agents SKILL.md:78-83):
   a. Read each subagent's summary (what was done, which files changed, why).
   b. Conflict check: did any subagent touch a file not listed in the
      Independence proof? If so, log and follow the Failure policy.
   c. Run the full test suite; confirm no cross-contamination.
   d. Spot check: pick 1-2 subagent diffs at random and review by hand to
      catch systemic errors.
5. Any check fails → follow execution-plan.md's Failure policy
   (abort batch / continue others / rollback).
6. All green → check off every box in the batch; proceed to the next batch.
7. After all batches complete → run the full test suite again and dispatch
   a final Reviewer over the whole change.
```

Replace `─── Forbidden ───` list with:
```text
─── Forbidden ───
- Adding per-task two-stage review "for safety" (that belongs to tdd-subagent;
  it violates the design intent of tdd-parallel)
- Running batches in parallel (batches must be sequential)
- Dispatching subagents before verifying the Independence proof
- Skipping batch-end integration verification and moving to the next batch
- Letting a subagent touch a file not listed in the Independence proof
  without handling it
- Bundling an entire batch into one mega-task for a single subagent
  (defeats the parallel value)
```

**Key constraint**: parallel variants **do not have reviewer subagents**. Quality is gated by:
- TDD discipline (RED first, GREEN must pass test)
- Batch-level integration verification (full test suite + spot check)
- Final reviewer at end of all batches

This is the **superpowers canonical design** for parallel; do not change it.

---

### 4.5 `tdd-parallel-worktree`

**Artifacts** (8): all of `tdd-parallel` + **environment**.

**Diff**: union of §4.1 and §4.4.
- Add `environment` artifact (`requires: [proposal]`).
- Add `execution-plan` artifact (parallel version, `requires: [test-plan]`).
- `tasks` requires `[specs, test-plan, execution-plan, design]`.
- `apply.instruction` starts with §4.1's Worktree pre-flight check (English version above), then §4.4's batch dispatch.
- All parallel Implementer subagents share the same worktree as the main agent (the one validated in Step 0). Independence proof already guarantees disjoint files, so per-subagent worktrees are unnecessary and forbidden.

---

## 5. New Templates to Author

Three new templates. Each is written once, then copied into the variants that use it.

### 5.1 `environment.md` template (used by sequential-worktree, subagent-worktree, parallel-worktree)

Required sections (skeleton — subagents fill in the blanks):

```markdown
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
```

Add an HTML-comment header at the top of the template explaining:
> This file is a mandatory schema output; it records the isolated work environment.
> The apply phase reads it on every start to confirm work is happening in the
> correct worktree.

### 5.2 `execution-plan.md` template — **subagent version**

Required sections:

```markdown
# Execution Plan: <change-id>

## Mode

subagent-driven

## Per-task contract

Context every dispatched subagent receives (subagents do not inherit the
main conversation):
- The full text of the task from tasks.md (including the RED + GREEN pair)
- The matching entry in test-plan.md (test name / scenario / assertion / why first / tier)
- The relevant spec.md section (the capability's requirement + scenarios)
- The relevant design.md section (decisions / risks affecting this task)
- Not given: other tasks; unrelated capability specs

## Roles

### Implementer

- **default_model**: `haiku`
- **upgrade_to_sonnet_when**:
  - Task touches 3+ files
  - Pattern matching against existing code is needed
  - Debugging an existing failing test
- **upgrade_to_opus_when**:
  - Redispatched after BLOCKED
  - Architecture-level judgment required

### Spec Reviewer (Stage 1)

- **default_model**: `sonnet`
- **rationale**: comparing spec to code requires moderate judgment;
  Haiku tends to miss spec deviations
- **Review checklist**:
  - [ ] Every spec requirement has matching implementation?
  - [ ] Did the implementation do anything the spec did not ask for (over-engineering)?
  - [ ] Does the RED test correspond to the correct Scenario?
  - [ ] Does the GREEN implementation only satisfy the RED, without touching
        unrelated requirements?
- **Never reviews**: naming / structure / quality (Stage 2 territory)

### Code-Quality Reviewer (Stage 2)

- **default_model**: `opus`
- **rationale**: catching idioms / design / edge cases benefits most from
  the strongest model
- **Review checklist**:
  - [ ] Naming is clear and consistent with existing style?
  - [ ] Any duplication (DRY)?
  - [ ] Edge cases handled?
  - [ ] Error handling is reasonable?
  - [ ] Magic numbers / strings extracted?
  - [ ] Readability?
- **Never reviews**: whether the spec is right (Stage 1 already covered that)

## Escalation

- Implementer rejected by the same reviewer N times in a row (suggested N=3)
  → upgrade model and redispatch
- Spec Reviewer's own judgment is inconsistent → escalate to main conversation
  for spec clarification by a human
- Code-Quality Reviewer vs. Implementer style disagreements → existing codebase style wins
- Any stage BLOCKED for over 30 minutes → escalate to a human
```

Add an HTML-comment header at the top of the template explaining:
> This file is a mandatory schema output; the apply phase reads it to dispatch
> subagents and assign models.

### 5.3 `execution-plan.md` template — **parallel version**

Required sections (**note: no reviewer roles, faithful to superpowers**):

```markdown
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

Upgrade rules (per superpowers SKILL.md:114-119):
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
```

Add an HTML-comment header at the top of the template explaining:
> This file is a mandatory schema output; the apply phase dispatches implementers
> in parallel and uses this file for integration verification.
> **Critical**: do NOT add Spec Reviewer / Code-Quality Reviewer sections —
> superpowers intentionally omits two-stage review from the parallel variant.

---

## 6. Reference: Model Selection Table (verbatim from superpowers)

Source: `superpowers/skills/subagent-driven-development/SKILL.md:89-102`.

> Use the least powerful model that can handle each role to conserve cost and increase speed.

| Task signal | Model |
|-------------|-------|
| Touches 1-2 files with a complete spec | cheap (Haiku) |
| Touches multiple files with integration concerns | standard (Sonnet) |
| Requires design judgment or broad codebase understanding | most capable (Opus) |

**Task complexity signals**:
- Mechanical implementation (isolated functions, clear specs, 1-2 files) → Haiku
- Integration / pattern matching / debugging → Sonnet
- Architecture / design / review → Opus

**BLOCKED escalation** (SKILL.md:114-119):
1. Context problem → provide more context, **same model**, re-dispatch
2. Reasoning problem → **upgrade model**, re-dispatch
3. Task too large → break into smaller pieces
4. Plan itself is wrong → escalate to human
**Never**: re-dispatch the same model without changes.

---

## 7. Execution Sequence

Run in order. Each phase must complete before the next.

### Phase 1 — Skeleton + common templates

```bash
cd /Users/danny/Desktop/project/OpenSourceRepo/combin-sp-opsecp/openspec-custom-schemas

for v in tdd-sequential-worktree tdd-subagent tdd-subagent-worktree tdd-parallel tdd-parallel-worktree; do
  mkdir -p "$v/templates"
  cp tdd-sequential/templates/*.md "$v/templates/"
done
```

Verify: each new folder should now have 6 files in `templates/`.

### Phase 2 — Author 3 new templates

Write each into a staging location (e.g., create `_staging/` at family root or use Write directly into the first variant that needs it, then `cp` from there in Phase 4).

Recommended: put authoritative copies under `tdd-subagent-worktree/templates/` (the only variant that needs ALL three new templates), then `cp` from there:

- `tdd-subagent-worktree/templates/environment.md`        ← spec §5.1
- `tdd-subagent-worktree/templates/execution-plan.md`     ← spec §5.2 (subagent version)
- `tdd-parallel-worktree/templates/execution-plan.md`     ← spec §5.3 (parallel version) — overwrite the subagent one copied in Phase 1 was just `tasks.md` etc., this file doesn't exist yet so just Write

(Phase 1 copied only 6 base templates; execution-plan.md and environment.md did not exist in base, so they need to be Written fresh.)

### Phase 3 — Write 5 `schema.yaml`

For each variant, start from `tdd-sequential/schema.yaml` and apply the spec in §4.x:

| Variant | Apply spec |
|---------|------------|
| `tdd-sequential-worktree/schema.yaml` | §4.1 |
| `tdd-subagent/schema.yaml`            | §4.2 |
| `tdd-subagent-worktree/schema.yaml`   | §4.3 |
| `tdd-parallel/schema.yaml`            | §4.4 |
| `tdd-parallel-worktree/schema.yaml`   | §4.5 |

Each schema.yaml's `name:` and `description:` must reflect the variant. Description must say which superpowers skill(s) it inlines. Example for `tdd-subagent`:

```yaml
name: tdd-subagent
version: 1
description: |
  TDD-disciplined workflow with subagent-driven execution and two-stage review.
  Inlines superpowers' subagent-driven-development skill: per-task fresh subagent
  dispatch, spec compliance review (Stage 1), then code quality review (Stage 2),
  with fix-loops between stages. No worktree isolation.
```

### Phase 4 — Distribute new templates

```bash
cd /Users/danny/Desktop/project/OpenSourceRepo/combin-sp-opsecp/openspec-custom-schemas

# environment.md → 3 worktree variants (already in tdd-subagent-worktree from Phase 2)
cp tdd-subagent-worktree/templates/environment.md tdd-sequential-worktree/templates/
cp tdd-subagent-worktree/templates/environment.md tdd-parallel-worktree/templates/

# subagent execution-plan.md → tdd-subagent (already in tdd-subagent-worktree from Phase 2)
cp tdd-subagent-worktree/templates/execution-plan.md tdd-subagent/templates/

# parallel execution-plan.md → tdd-parallel (already in tdd-parallel-worktree from Phase 2)
cp tdd-parallel-worktree/templates/execution-plan.md tdd-parallel/templates/
```

### Phase 5 — Update README.md

Edit `openspec-custom-schemas/README.md`:
1. Remove the line "> 目前僅 tdd-sequential 已完整實作為 base..."
2. Add a "## 完成狀態" section confirming all 6 variants are built.

---

## 8. Acceptance Criteria

Run these checks before declaring done:

### Filesystem

```bash
cd /Users/danny/Desktop/project/OpenSourceRepo/combin-sp-opsecp/openspec-custom-schemas

# Each variant has a schema.yaml
for v in tdd-sequential tdd-sequential-worktree tdd-subagent tdd-subagent-worktree tdd-parallel tdd-parallel-worktree; do
  test -f "$v/schema.yaml" || echo "MISSING: $v/schema.yaml"
done

# Worktree variants have environment.md
for v in tdd-sequential-worktree tdd-subagent-worktree tdd-parallel-worktree; do
  test -f "$v/templates/environment.md" || echo "MISSING: $v/templates/environment.md"
done

# subagent + parallel variants have execution-plan.md
for v in tdd-subagent tdd-subagent-worktree tdd-parallel tdd-parallel-worktree; do
  test -f "$v/templates/execution-plan.md" || echo "MISSING: $v/templates/execution-plan.md"
done

# Sequential variants must NOT have execution-plan.md
for v in tdd-sequential tdd-sequential-worktree; do
  test ! -f "$v/templates/execution-plan.md" || echo "UNEXPECTED: $v/templates/execution-plan.md should not exist"
done

# Non-worktree variants must NOT have environment.md
for v in tdd-sequential tdd-subagent tdd-parallel; do
  test ! -f "$v/templates/environment.md" || echo "UNEXPECTED: $v/templates/environment.md should not exist"
done
```

All checks should print nothing.

### Content sanity

For each schema.yaml, verify:
- `name:` matches the folder name
- `artifacts:` count matches the matrix in §4 (6, 7, or 8)
- `apply.requires:` is `[tasks]`
- `apply.tracks:` is `tasks.md`
- subagent variants' apply.instruction mentions "Stage 1" and "Stage 2"
- parallel variants' apply.instruction mentions "Independence proof" and does NOT mention "Stage 1" / "Spec Reviewer" / "Code-Quality Reviewer"
- worktree variants' apply.instruction starts with the worktree pre-flight check step (Step 0)

### Diff-of-diff sanity

`tdd-subagent-worktree` should equal `tdd-subagent` + worktree overlay.
`tdd-parallel-worktree` should equal `tdd-parallel` + worktree overlay.
The worktree overlay (environment artifact + Step 0 in apply.instruction) must be byte-identical across the 3 worktree variants.

### README

`README.md`:
- No line saying "目前僅 tdd-sequential 已完整實作"
- Has section confirming 6/6 variants done

---

## 9. Out of Scope (do not do these)

- Do not modify `tdd-sequential/` (base is frozen).
- Do not add reviewer roles to parallel variants.
- Do not invent new artifacts beyond what §4 specifies.
- Do not change the artifact matrix.
- Do not translate base template files; copy them verbatim.
- Do not create or modify files outside `openspec-custom-schemas/`.
- Do not run `openspec` CLI against these schemas (no openspec install in this env).
- Do not commit / push (this folder is a research workspace; commits are not the user's request).
