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
**DB schema touched**: yes | no — <一句判定理由>
**Data migration**: yes | no — <一句判定理由>
**Cross-component flow**: yes | no — <一句判定理由>

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

## Data Model

<!-- 條件：動到資料庫結構（新 table、欄位增刪改、索引、關聯、schema migration）時必加，不分規模 -->

<!--
  繪製慣例：
  - table：┌─ table_name ─┐ 邊框，欄位一行一個
  - 主鍵後綴 PK、外鍵後綴 FK
  - 關聯線：1───1 / 1───N / N───M（基數標在線的兩端）
  - 範圍：受影響 table 展開全部欄位；直接 FK 關聯的鄰居 table
    只畫名稱框（欄位以 (…) 代替），不再向外擴一層
  - 寬度 ≤ 80 字元；不使用全形空格與全形括號
-->

Before / After 兩張圖（純新增 table 且無既有關聯時可只畫 After）：

```
=== Before ===

┌─ users ──────────┐
│ id           PK  │
│ email            │
└──────────────────┘

=== After ===

┌─ users ──────────┐       ┌─ orders ─────────┐
│ id           PK  │ 1───N │ id           PK  │
│ email            │       │ user_id      FK  │
│ locale           │       │ status           │
└──────────────────┘       └──────────────────┘
```

---

## Data Migration

<!-- 條件：含資料遷移（backfill、格式轉換、拆表併表）時必加，不分規模 -->

<一兩句說明遷移對象與量級。>

```
=== 資料形狀 Before ===
<遷移前欄位 / 格式，可附一筆範例資料>

=== 遷移步驟 ===
1. <schema migration / 新結構就緒>
2. <backfill：批次策略>
3. <雙寫 / 切讀時機>
4. <清理舊結構（獨立 migration、獨立部署）>

=== 資料形狀 After ===
<遷移後欄位 / 格式>

=== Rollback ===
- <每個步驟可否回滾、如何回滾>
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

## Sequence Diagram

<!-- 條件：含跨元件流程（非同步任務、webhook、排程、多服務協作）時必加；
     單純同步 CRUD（前端→API→DB 一來一回）不加 -->

<!--
  繪製慣例：
  - 參與者橫排在頂，底下接垂直生命線 │
  - 時間由上而下
  - 同步請求：──►；回應：◄──；非同步 / 事件：╌╌►
  - 訊息標籤寫在箭頭同行或上一行
  - 只畫關鍵路徑與失敗分支；寬度 ≤ 80 字元
-->

<一兩句說明此流程的起點與終點。>

```
User          Frontend            API               Worker
 │               │                 │                   │
 │ click Export  │                 │                   │
 │──────────────►│                 │                   │
 │               │ POST /exports   │                   │
 │               │────────────────►│                   │
 │               │ 202 Accepted    │                   │
 │               │◄────────────────│                   │
 │               │                 │ enqueue job       │
 │               │                 │╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌►│
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
