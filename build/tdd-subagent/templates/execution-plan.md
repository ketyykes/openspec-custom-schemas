<!--
This file is a mandatory schema output; the apply phase reads it to dispatch
subagents and assign models.
-->

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
