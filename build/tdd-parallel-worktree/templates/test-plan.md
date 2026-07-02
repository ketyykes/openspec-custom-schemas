# Test Plan: <change-id>

<!--
  RED-phase commitment document. Do NOT describe implementation logic —
  only "what to test, expected outcome, why first".
  Apply reads this repeatedly as the source of "what to RED next".

  The `Tier` column is REQUIRED for every row (values: unit | integration | e2e).
-->

## <capability-name-1>

### Requirement: <requirement-name>

| Test name | Scenario | Assertion | Why first | Tier |
|-----------|----------|-----------|-----------|------|
| `test_name_in_imperative_form` | Scenario A | input X → output Y | golden path | unit |
| `test_handles_empty_input` | Scenario B | input empty → raises ValidationError | edge case | unit |
| `test_persists_to_db` | Scenario A | after call → DB row exists with field=X | integration guard | integration |

### Requirement: <next requirement>

| Test name | Scenario | Assertion | Why first | Tier |
|-----------|----------|-----------|-----------|------|
| ... | ... | ... | ... | ... |

## <capability-name-2>

...

---

## Checklist

- [ ] Every requirement has at least one matching test
- [ ] Every Scenario (####) has at least one matching test
- [ ] Every row has a Tier value (unit | integration | e2e)
- [ ] Test names use imperative form (avoid `test_1`, `it_works`)
