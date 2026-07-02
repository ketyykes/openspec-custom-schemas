# Overview: <change-id>

<!--
  ASCII 人類版摘要。所有圖必須包在 ``` 三引號程式碼區塊內。
  Apply 階段不必讀此檔；validator 也不解析它，純人類閱讀用。
  依下方步驟動態決定包含哪些區塊。
-->

## Scope

<兩三句白話描述此 change 做什麼>

**Size**: small | medium | large — <一句判定理由>
**Frontend involved**: yes | no — <一句判定理由>

---

## What Changes

- <精簡版的 What Changes 條列>
- <...>

Before / after 對照（純文字、無 UI 細節）：

```
=== Before ===
<目前狀態的精簡示意>

=== After ===
<變更後狀態的精簡示意>
```

---

<!-- 以下區塊「依條件」加入。沒命中條件就整段刪除（連標題一起）。 -->

## UI Mockups

<!-- 條件：含前端需求時必加 -->

<!--
  繪製慣例：
  - 容器：┌─┐ │ └─┘
  - 按鈕：[Label] / [Label ▾] / [Cancel]
  - Radio：( ) 未選、(●) 已選
  - Checkbox：[ ] / [x]
  - 輸入框：[___________] / [value]
  - 下拉：[value ▼]
  - Disabled：後綴 ░░░░ 或前綴 (disabled)
  - 互動箭頭：│ ▼
  - 狀態切換：=== State N: <描述> ===
  - 標註：← 註解（行末對齊）
  - 寬度 ≤ 80 字元；不使用全形空格與全形括號
-->

至少要有 before / after 兩個 state，以及每個關鍵互動觸發的 state。

```
=== State 1: <情境描述（before）> ===

┌─────────────────────────────┐
│  <畫面內容>                  │
└─────────────────────────────┘


=== State 2: <情境描述（after / 互動後）> ===

┌─────────────────────────────┐
│  <畫面內容>                  │
└─────────────────────────────┘
              │
              │ <觸發動作描述>
              ▼

=== State 3: <下一個 state> ===

┌─────────────────────────────┐
│  <畫面內容>                  │
└─────────────────────────────┘
```

---

## Architecture

<!-- 條件：medium 起追加 -->

<一兩句說明此圖在表達什麼。>

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Module A  │ ──► │  Module B  │ ──► │  Module C  │
└────────────┘     └────────────┘     └────────────┘
                        │
                        ▼
                  ┌────────────┐
                  │   Storage  │
                  └────────────┘
```

---

## Task Tree

<!-- 條件：large 起追加 -->

<一兩句說明任務依賴結構。>

```
1. CSV Export Core
├── 1.1 RED: test_export_returns_csv
├── 1.2 GREEN: implement CsvExporter.export
├── 1.3 RED: test_handles_unicode
└── 1.4 GREEN: encode UTF-8

2. UI Wiring (depends on 1)
├── 2.1 RED: test_export_button_visible
└── 2.2 GREEN: add Export CSV button
```

---

## Cross-Cutting Impact

<!-- 條件：large 起追加 -->

| File / module | Change kind | Risk |
|---------------|-------------|------|
| `src/exporters/csv.ts` | new | low |
| `src/users/list.tsx` | modify | medium |
| `db/migrations/0042_*.sql` | new | high |
