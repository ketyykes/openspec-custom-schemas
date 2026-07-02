# Tasks: <change-id>

<!--
  Apply parses `- [ ]` checkboxes to track progress. Wrong format = no tracking.
  Every implementation task MUST be preceded by a corresponding test task.
  Naming prefix: RED / GREEN / REFACTOR
-->

## 1. <first group name (by capability or subsystem)>

- [ ] 1.1 RED: write test `<test_name_from_test_plan>`
- [ ] 1.2 GREEN: implement <minimum code to pass>
- [ ] 1.3 RED: write test `<next_test_name>`
- [ ] 1.4 GREEN: <implementation>
- [ ] 1.5 REFACTOR: <refactor description (optional)>

## 2. <second group name>
Depends on: §1

- [ ] 2.1 RED: write test `<test_name>`
- [ ] 2.2 GREEN: <implementation>

## 3. <third group name>

- [ ] 3.1 RED: write test `<test_name>`
- [ ] 3.2 GREEN: <implementation>
