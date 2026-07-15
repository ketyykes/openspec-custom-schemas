# OpenSpec Custom Schemas — TDD Family

> **客製版本說明**：這個資料夾收錄 6 個基於 OpenSpec `spec-driven` 的客製 schemas。
> 與原版相比的主要結構分岔：
> - 新增 `test-plan` artifact（RED 階段承諾書）
> - 新增 `overview` artifact（純人類視覺版）
> - tasks 強制 `RED / GREEN / REFACTOR` 前綴
> - `apply.instruction` 內嵌完整 TDD 執行紀律
>
> 與原版的相容性：仍使用 OpenSpec 標準的 artifact-graph 機制；
> 只是在 schema 內透過 instruction 強化紀律，不改動 CLI 行為。

這個資料夾收錄 6 個自製的 OpenSpec custom schemas。它們把四項核心開發紀律
（test-driven-development、subagent-driven-development、parallel-agent dispatch、
git-worktree 隔離）**內嵌**進 OpenSpec 的 artifact + apply.instruction，讓任何
環境不需額外外掛也能保有同樣紀律。另外每個 schema 都產出一份 `overview.md` 作為
人類友善的 ASCII 視覺版（含前端需求時自動繪製 UI mockups）。

## 家族成員

|             | 執行模式 | worktree |
|-------------|----------|:--------:|
| `tdd-sequential`           | 單 agent 順序 | ❌ |
| `tdd-sequential-worktree`  | 單 agent 順序 | ✅ |
| `tdd-subagent`             | 每 task 派 subagent + 兩階段審查 | ❌ |
| `tdd-subagent-worktree`    | 每 task 派 subagent + 兩階段審查 | ✅ |
| `tdd-parallel`             | 多 subagent 並行批次 | ❌ |
| `tdd-parallel-worktree`    | 多 subagent 並行批次 | ✅ |

## 架構：單一來源 + 產生器（`src/` → `build/`）

6 個變體高度重複：6 份共用 template 完全相同、5 個 artifact 的 `instruction`
逐字一致。但 **OpenSpec 執行期沒有任何去重機制**：schema 沒有繼承 / overlay，
template loader 也不會 fallback 到共用目錄（`instruction-loader.ts` 的
`loadTemplate` 只讀該 schema 自己的 `templates/`，找不到就直接報錯）。因此去重
只能在「撰寫層」做，再編譯成 N 個自足資料夾。

本資料夾採用 **單一來源 + 產生器**：

```
src/            ← 唯一要維護的來源（去重後）
  variants/     每個變體的檔頭（name / version / description），6 份；內容本就各異
  artifacts/    artifact 區塊，只存唯一版本：
                  proposal / specs / design / test-plan / overview（6 變體共用，各 1 份）
                  tasks.yaml（共用主體；requires 由 build 依模式補齊）
                  execution-plan.subagent / execution-plan.parallel
                  environment（worktree 專用）
  apply/        apply body，每個變體各 1 份（各變體真正獨有的行為核心）
  templates/    9 份唯一 template（原本 46 份的去重版）
  build.mjs     產生器（零依賴 Node ESM，僅用 fs/path/url 內建模組；
                建議 Node.js ≥ 20，與 OpenSpec 本身的執行環境要求一致）

build/          ← 產生物；OpenSpec 直接可用，安裝時從這裡複製（請勿手改）
  tdd-sequential/ … tdd-parallel-worktree/
```

工作流：

- **改共用內容 → 只改 `src/` 一處 → `node src/build.mjs` → 6 個變體同步更新。**
- `build/` 每個 `schema.yaml` 頂端有 `# GENERATED FILE` 標記；請勿手改。
- `node src/build.mjs --check` 檢查 `build/` 是否與 `src/` 同步（未同步則 exit 1），
  可在 commit 前 / CI 使用。
- 產生的 6 份與手寫版 **逐字一致**：唯一差異是頂端 2 行 GENERATED 註解，
  而 YAML 註解會被 OpenSpec parser 忽略，不影響行為。

### 哪些被去重、哪些每變體保留

| 內容 | 處理 |
|------|------|
| 6 份共用 template | `src/templates/` 各 1 份 |
| execution-plan template（subagent / parallel 兩版） | 各 1 份；輸出時一律命名 `execution-plan.md` |
| proposal / specs / design / test-plan / overview 的 artifact 區塊 | `src/artifacts/` 各 1 份（6 變體共用） |
| tasks 區塊 | 共用主體 1 份；`requires` 由 build 依模式補上 `execution-plan` |
| environment 區塊 + template | worktree 專用，各 1 份 |
| **apply body** | **每變體 1 份**。worktree 版把「共用同一個 worktree」的意識織入 Step 0、dispatch context、Forbidden 三處，屬各變體專屬，不宜機械拼接 |
| header（name / description） | 每變體 1 份（內容本就各異） |

### 如何新增一個新變體

1. 在 `src/build.mjs` 的 `VARIANTS` 陣列新增一筆 `{ name, mode, worktree }`。
2. 新增 `src/variants/<name>.head.yaml`（name / version / description）。
3. 新增 `src/apply/<name>.txt`（apply body，完整撰寫，不與其他變體拼接——
   這是唯一「刻意不去重」的部分，見上表）。
4. 若 `mode` 是全新模式（非既有的 `sequential` / `subagent` / `parallel`）：
   新增 `src/artifacts/execution-plan.<mode>.yaml` 與
   `src/templates/execution-plan.<mode>.md`。`build.mjs` 會用 `v.mode` 字串
   直接組出檔名去讀，不需改動 `buildSchema()` / `buildFiles()` 的邏輯。
5. 執行 `node src/build.mjs` 產生，再用 `node src/build.mjs --check` 確認同步。
6. 手動更新本 README 最上方的「家族成員」與「變體差異對照」兩個表格——
   這兩張表是人工維護，不是 `build.mjs` 的產生物。

## 完成狀態

6/6 變體皆由 `src/build.mjs` 產生到 `build/`：

- ✅ `tdd-sequential` — 純 TDD 順序
- ✅ `tdd-sequential-worktree` — + worktree 隔離（含 environment.md）
- ✅ `tdd-subagent` — + subagent 派發 + 兩階段審查（含 execution-plan.md）
- ✅ `tdd-subagent-worktree` — subagent + worktree（含 environment.md + execution-plan.md）
- ✅ `tdd-parallel` — + 批次並行派發（含 execution-plan.md，無兩階段審查）
- ✅ `tdd-parallel-worktree` — parallel + worktree（含 environment.md + execution-plan.md）

> 日常維護請以 `src/` 為準，改完跑 `node src/build.mjs` 同步到 `build/`。

## 各 schema 共通的 artifact

```
proposal
 ├─► specs
 │     ├─► test-plan ─► execution-plan *
 │     └─► overview（純人類讀，無其他 artifact 依賴它）
 └─► design

tasks 直接依賴：specs + test-plan + design（非 sequential 變體另加 execution-plan）
environment（worktree 專用）直接依賴：proposal，獨立於上圖之外

* execution-plan 僅 subagent / parallel 變體存在；sequential 變體沒有這個節點。
```

> 圖只畫單一父節點的分支；`tasks` 有 3～4 個直接依賴（見下方說明），
> 無法在樹狀圖中乾淨表示多重父節點，因此另外列出，避免像舊版那樣
> 用共用垂直線畫出「design → test-plan」「overview → tasks」這類實際不存在的邊。

| Artifact | 用途 | 由誰讀 |
|----------|------|--------|
| `proposal.md`  | Why / What / Capabilities / Impact | 人 + apply |
| `specs/**/*.md`| WHAT — 需求 + Scenario（純文字）| 人 + apply + validator |
| `design.md`    | HOW — 技術決策 | 人 + apply |
| `test-plan.md` | RED 階段承諾書（測什麼、預期、為何先寫）| apply 反覆讀 |
| `overview.md`  | ASCII 視覺版（含 UI mockups）| 純人類 |
| `tasks.md`     | RED / GREEN / REFACTOR checkbox 清單 | apply 追蹤進度 |

注意：`tasks.requires` 同時列出 `specs`、`test-plan`、`design`，與原版 `spec-driven`
的依賴語意對齊（即便 `test-plan` 已 require `specs`，仍顯式列出以避免 resolver
的傳遞依賴假設不同）。subagent / parallel 變體另外顯式加入 `execution-plan`。

## 變體差異對照

| Artifact | sequential | sequential-worktree | subagent | subagent-worktree | parallel | parallel-worktree |
|----------|:-:|:-:|:-:|:-:|:-:|:-:|
| `proposal` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `specs` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `design` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `test-plan` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `overview` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tasks` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `execution-plan` | — | — | ✅ | ✅ | ✅ | ✅ |
| `environment` | — | ✅ | — | ✅ | — | ✅ |

設計理由：
- **sequential 不需要 `execution-plan`**：只有一條時間軸，沒有 dispatch 決策要記錄。
- **worktree 變體一律加 `environment.md`**：分支名、設定指令、驗證步驟、teardown。
  不允許 opt-out（要 opt-out 就選非 worktree 變體）。

## 安裝到專案

1. 先確保 `build/` 是最新的（改過 `src/` 才需要）：
   ```
   node src/build.mjs
   ```
2. 把要用的變體從 `build/` 複製到目標專案的 `openspec/schemas/`：
   ```
   cp -r build/tdd-sequential /path/to/project/openspec/schemas/
   ```
3. 在 `openspec/config.yaml` 設定預設 schema 與輸出語言：
   ```yaml
   schema: tdd-sequential

   context: |
     Language: Traditional Chinese (zh-TW)
     All generated artifacts must be written in Traditional Chinese (Taiwan).

     # 你的專案 context 寫在下面
     Tech stack: ...
   ```
   > Schema instructions 一律使用英文以最大化通用性；輸出語言由
   > `openspec/config.yaml` 的 `context:` 注入（OpenSpec 官方多語機制，
   > 詳見 OpenSpec/docs/multi-language.md）。
4. 驗證 schema 合法性：
   ```
   openspec schema validate tdd-sequential
   ```

## 設計原則速覽

1. **紀律內嵌、自成一體**：所有紀律寫進 `instruction:` 與 `apply.instruction:`，不依賴任何外部外掛。
2. **TDD 雙保險**：`test-plan.md` 作前置承諾，`apply.instruction` 強制 RED→GREEN→REFACTOR。
3. **specs 保持純文字**：所有 ASCII 視覺集中到 `overview.md`，避免干擾 validator。
4. **overview 依規模動態組合**：small / medium / large 命中不同區塊；含前端需求時加 UI Mockups。
5. **worktree 是 schema-level 決策，非 artifact opt-out**：避免「畫了 environment.md 但說不用 worktree」的歧義。
6. **Schema instructions 英文，輸出語言由 config.yaml 控制**：見「安裝到專案」段。
7. **來源去重、產生物自足**：維護改 `src/`，OpenSpec 吃 `build/`；兩者由 `build.mjs` 保持同步。

## 已知限制 / 環境前提

- **commit 紀律依賴 agent 有 git 權限**：`apply.instruction` 內的
  `commit ... (RED)` / `(GREEN)` / `(REFACTOR)` 預期 host agent
  （Claude Code、Codex 等）有權限執行 `git commit`。若 agent 無此權限，
  commit 動作會退化為 in-memory 步驟；test-first 的順序紀律仍應遵守。
- **overview 為 required artifact**：列在 `artifacts:` 內即 OpenSpec resolver
  會把它視為必須產出的節點。small 規模也至少需輸出 Scope + What Changes 兩區塊。
- **與原版 schema 不可混用**：同一 change 不要中途切換 `spec-driven` 與
  `tdd-*` schema —— 兩者 artifact 集合不同，會造成 `openspec status` 誤判。
- **`build/` 是產生物**：不要直接手改；要改請改 `src/` 再 `node src/build.mjs`。
  `node src/build.mjs --check` 可偵測是否有人手改或忘了重建。
