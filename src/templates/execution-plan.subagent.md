<!--
This file is a mandatory schema output; the apply phase reads it to dispatch
subagents and assign models.
-->

# Execution Plan: <change-id>

## Mode

subagent-driven

## Review unit

The review unit is the tasks.md `##` group, not the single task:
implementation is dispatched per task, but Stage 1 / Stage 2 run once per
group, at the group boundary (mid-group states are legitimately intermediate
and are not reviewed). Groups must satisfy two planning rules:

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

### Spec Reviewer (Stage 1)

- **default_model**: `sonnet`
- **rationale**: comparing spec to code requires moderate judgment;
  Haiku tends to miss spec deviations
- **Reviews**: one group's combined diff; findings name the task number(s)
  they concern
- **Review checklist**:
  - [ ] Every spec requirement of this group's capability has matching
        implementation?
  - [ ] Did the implementation do anything the spec did not ask for (over-engineering)?
  - [ ] Does each RED test correspond to the correct Scenario?
  - [ ] Is every intermediate state inside the group consumed by the
        group's end (nothing left dangling)?
- **Never reviews**: naming / structure / quality (Stage 2 territory)

### Code-Quality Reviewer (Stage 2)

- **default_model**: `opus`
- **rationale**: catching idioms / design / edge cases benefits most from
  the strongest model
- **Reviews**: the same group diff; findings name the task number(s)
  they concern
- **Review checklist**:
  - [ ] Naming is clear and consistent with existing style?
  - [ ] Any duplication (DRY), including between this group's tasks?
  - [ ] Edge cases handled?
  - [ ] Error handling is reasonable?
  - [ ] Magic numbers / strings extracted?
  - [ ] Readability?
- **Never reviews**: whether the spec is right (Stage 1 already covered that)

### Final Code Reviewer (integration)

- **default_model**: `opus`
- **rationale**: cross-group integration review has to hold the whole change
  in view; the strongest model pays off here
- **Review checklist**:
  - [ ] Naming and patterns consistent across groups?
  - [ ] Duplicated logic introduced by separate groups that should be unified?
  - [ ] Does the combined diff stay within the proposal's scope?
  - [ ] Full test suite green on the final state?
- **Never reviews**: single-group spec compliance or quality details
  (Stages 1-2 already covered those per group)

## Escalation

- The same group rejected by the same reviewer N times in a row (suggested
  N=3) → upgrade the fix Implementer's model and redispatch
- Spec Reviewer's own judgment is inconsistent → escalate to main conversation
  for spec clarification by a human
- Code-Quality Reviewer vs. Implementer style disagreements → existing codebase style wins
- Any stage BLOCKED for over 30 minutes → escalate to a human
