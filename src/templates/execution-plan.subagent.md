<!--
This file is a mandatory schema output; the apply phase reads it to dispatch
subagents and assign models.
-->

# Execution Plan: <change-id>

## Mode

subagent-driven

## Review unit

The review unit is the tasks.md `##` group, not the single task:
implementation is dispatched per task, but one group review (spec
compliance + code quality, two sections of a single report by a single
reviewer) runs once per group, at the group boundary (mid-group states are
legitimately intermediate and are not reviewed). Groups must satisfy two
planning rules:

- Every group ends in a spec-coherent state (no dangling intermediate state
  at the boundary)
- Every group stays within 3 RED/GREEN pairs

## Per-task contract

Context every dispatched subagent receives (subagents do not inherit the
main conversation):
- The full text of the task from tasks.md (including the RED + GREEN pair)
- The matching entry in test-plan.md (test name / scenario / assertion / why first / tier)
- The relevant spec.md section (the capability's requirement + scenarios)
- The relevant design.md section (decisions / risks affecting this task)
- For an intermediate-state task: one line naming which later task in the
  group consumes its output, and how
- Not given: other groups' tasks; unrelated capability specs

<!-- Worktree variants only (schema includes an environment artifact):
     also list the worktree path from environment.md as a contract entry. -->

## Roles

<!-- Model names are Claude tiers used as examples; on hosts without them,
     map to the closest fast / balanced / strongest equivalents. -->

### Implementer

- **default_model**: `haiku`
- **upgrade_to_sonnet_when**:
  - Task touches 3+ files
  - Pattern matching against existing code is needed
  - Debugging an existing failing test
- **upgrade_to_opus_when**:
  - Redispatched after BLOCKED
  - Architecture-level judgment required

### Group Reviewer

- **default_model**: `opus`
- **rationale**: one reviewer covers both spec compliance and code quality
  in a single pass; the strongest model keeps spec deviations from being
  buried under quality nits, and halves the reviewer dispatches per group
- **Reviews**: one group's combined diff; returns one report with two
  sections in this order. Every finding carries a severity tag (see Review
  findings), belongs to exactly one section, and names the task number(s)
  it concerns
- **Section A — Spec compliance checklist**:
  - [ ] Every spec requirement of this group's capability has matching
        implementation?
  - [ ] Did the implementation do anything the spec did not ask for (over-engineering)?
  - [ ] Does each RED test correspond to the correct Scenario?
  - [ ] Is every intermediate state inside the group consumed by the
        group's end (nothing left dangling)?
  - Never comments on naming / structure / quality here (Section B territory)
- **Section B — Code quality checklist**:
  - [ ] Naming is clear and consistent with existing style?
  - [ ] Any duplication (DRY), including between this group's tasks?
  - [ ] Edge cases handled?
  - [ ] Error handling is reasonable?
  - [ ] Magic numbers / strings extracted?
  - [ ] Readability?
  - Never re-litigates whether the spec is right here (Section A territory)
- **REFACTOR-only group**: Section B only; Section A states "no
  spec-visible change"

### Final Code Reviewer (integration)

- **default_model**: `opus`
- **rationale**: cross-group integration review has to hold the whole change
  in view; the strongest model pays off here
- **Review checklist**:
  - [ ] Naming and patterns consistent across groups?
  - [ ] Duplicated logic introduced by separate groups that should be unified?
  - [ ] Does the combined diff stay within the proposal's scope?
  - [ ] Full test suite green on the final state?
- **Also receives**: design.md's `## Deferred Findings` list; gives a
  verdict per entry (stands / resolved / false positive). Verdicts are
  not findings and trigger no fix round
- **Never reviews**: single-group spec compliance or quality details
  beyond those verdicts (the group review already covered those)

## Review findings

The contract every reviewer (group review / Final review) reports against.
The orchestrator pastes this section into every reviewer dispatch.

### Severity scale (exactly one tag per finding)

- `high`: spec requirement missing or violated; wrong behavior; a RED test
  that does not map to its Scenario; data loss, security, or crash path
- `medium`: partial coverage; scope creep; unhandled edge case; duplication
  that will diverge; misleading naming or error handling
- `low`: style, readability, cosmetic, optional improvement

### Pass rule

- k = fix rounds already used for this group (both sections share it)
- First review (k = 0): passes only with zero findings of any severity in
  either section; a low-only list still triggers fix round 1
- Re-review (k ≥ 1): passes with zero `medium` / `high` findings in either
  section; leftover `low` findings are recorded (design.md
  `## Deferred Findings`, round k), never fixed on their own

### Fix budget

- 3 fix rounds per group, shared by Section A and Section B;
  Final review: 3 rounds total
- Round 1 fixes every finding → Implementer default model;
  rounds 2-3 fix `medium` / `high` (`low` optional) → one tier up,
  then the strongest tier
- A re-review receives the previous round's findings and marks each one
  resolved / unresolved first; new findings count against the same budget
- Budget exhausted with `medium` / `high` remaining → recorded under
  design.md `## Deferred Findings`, review treated as passed-with-deferred,
  apply proceeds. There is never a 4th round.

## Escalation

- Fix rounds are bounded by the Review findings budget above; model upgrades
  happen per round, never as "one more try" past round 3
- Section A's judgment is inconsistent (e.g., flips verdicts between rounds
  on unchanged code) → escalate to main conversation for spec clarification
  by a human
- Section B vs. Implementer style disagreements → existing codebase style wins
- Any review BLOCKED for over 30 minutes → escalate to a human
