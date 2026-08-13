# OpenSpec Custom Schemas — TDD Family

> **客製版本說明**：這個資料夾收錄 8 個基於 OpenSpec `spec-driven` 的客製 schemas。
> 與原版相比的主要結構分岔：
> - 新增 `test-plan` artifact（RED 階段承諾書）
> - 新增 `overview` artifact（純人類視覺版）
> - tasks 強制 `RED / GREEN / REFACTOR` 前綴
> - `apply.instruction` 內嵌完整 TDD 執行紀律
>
> 與原版的相容性：仍使用 OpenSpec 標準的 artifact-graph 機制；
> 只是在 schema 內透過 instruction 強化紀律，不改動 CLI 行為。

這個資料夾收錄 8 個自製的 OpenSpec custom schemas。它們把四項核心開發紀律
（test-driven-development、subagent-driven-development、parallel-agent dispatch、
git-worktree 隔離）**內嵌**進 OpenSpec 的 artifact + apply.instruction，讓任何
環境不需額外外掛也能保有同樣紀律。另外除 lite 變體外，每個 schema 都產出
一份 `overview.md` 作為人類友善的 ASCII 視覺版（依條件自動繪製 UI mockups、
DB 關聯圖、時序圖與資料遷移流程）。

## 家族成員

|             | 執行模式 | worktree |
|-------------|----------|:--------:|
| `tdd-sequential`           | 單 agent 順序 | ❌ |
| `tdd-sequential-worktree`  | 單 agent 順序 | ✅ |
| `tdd-subagent`             | 每 task 派 subagent + 每 group 兩階段審查 | ❌ |
| `tdd-subagent-worktree`    | 每 task 派 subagent + 每 group 兩階段審查 | ✅ |
| `tdd-parallel`             | 多 subagent 並行批次 | ❌ |
| `tdd-parallel-worktree`    | 多 subagent 並行批次 | ✅ |
| `tdd-sequential-lite`          | 單 agent 順序（精簡：無 design / overview） | ❌ |
| `tdd-sequential-lite-worktree` | 單 agent 順序（精簡：無 design / overview） | ✅ |

## 架構：單一來源 + 產生器（`src/` → `build/`）

8 個變體高度重複：共用 template 完全相同、多數 artifact 的 `instruction`
逐字一致（lean 變體僅做定向字串替換）。但 **OpenSpec 執行期沒有任何去重機制**：schema 沒有繼承 / overlay，
template loader 也不會 fallback 到共用目錄（`instruction-loader.ts` 的
`loadTemplate` 只讀該 schema 自己的 `templates/`，找不到就直接報錯）。因此去重
只能在「撰寫層」做，再編譯成 N 個自足資料夾。

本資料夾採用 **單一來源 + 產生器**：

```
src/            ← 唯一要維護的來源（去重後）
  variants/     每個變體的檔頭（name / version / description），8 份；內容本就各異
  artifacts/    artifact 區塊，只存唯一版本：
                  proposal / specs / design / test-plan / overview（完整變體共用，各 1 份；lean 變體由 build 定向替換拿掉 design / overview 引用）
                  tasks.yaml（共用主體；requires 由 build 依模式補齊）
                  execution-plan.subagent / execution-plan.parallel
                  environment（worktree 專用）
  apply/        apply body，每個變體各 1 份（各變體真正獨有的行為核心）
  templates/    9 份唯一 template（去重版；未去重時 8 個變體共 52 份實體檔）
  build.mjs     產生器（零依賴 Node ESM，僅用 fs/path/url 內建模組；
                建議 Node.js ≥ 20，與 OpenSpec 本身的執行環境要求一致）

build/          ← 產生物；OpenSpec 直接可用，安裝時從這裡複製（請勿手改）
  tdd-sequential/ … tdd-parallel-worktree/ … tdd-sequential-lite-worktree/
```

工作流：

- **改共用內容 → 只改 `src/` 一處 → `node src/build.mjs` → 8 個變體同步更新。**
- `build/` 每個 `schema.yaml` 頂端有 `# GENERATED FILE` 標記；請勿手改。
- `node src/build.mjs --check` 檢查 `build/` 是否與 `src/` 同步（未同步則 exit 1），
  也會偵測 `build/` 頂層的孤兒資料夾與散檔；可在 commit 前 / CI 使用。
- 頂端的 `# GENERATED FILE` 是 YAML 註解，OpenSpec parser 會忽略，不影響行為。

### 哪些被去重、哪些每變體保留

| 內容 | 處理 |
|------|------|
| 6 份共用 template | `src/templates/` 各 1 份（lean 變體只輸出其中 4 份；subagent 變體的 tasks.md 由 build 定向加註審查單位） |
| execution-plan template（subagent / parallel 兩版） | 各 1 份；輸出時一律命名 `execution-plan.md` |
| proposal / specs / design / test-plan / overview 的 artifact 區塊 | `src/artifacts/` 各 1 份（完整變體共用；lean 變體由 build 定向替換拿掉 design / overview 引用） |
| tasks 區塊 | 共用主體 1 份；`requires` 由 build 依模式補上 `execution-plan`；subagent 模式由 build 定向插入群組審查規則 |
| environment 區塊 + template | worktree 專用，各 1 份 |
| apply 的 requires / tracks 標頭 | 由 build 依變體組成（`applyPrefix()`：除 overview 外全列；worktree 加 environment） |
| **apply body** | **每變體 1 份**。worktree 版把「共用同一個 worktree」的意識織入 Step 0、dispatch context、Forbidden 三處，屬各變體專屬，不宜機械拼接 |
| header（name / description） | 每變體 1 份（內容本就各異） |
| lite（lean）變體的 design / overview 拔除 | build 以 `lean` 旗標條件式略過區塊與 templates，並定向替換 proposal / specs / spec.md 中的引用 |

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

若要新增「精簡（lean）」變體：在 `VARIANTS` 那筆加上 `lean: true`（目前僅支援
`mode: 'sequential'`）。build 會略過 design / overview 的 artifact 區塊與 templates，
並定向替換來源中對兩者的引用；apply body 請勿引用 design.md / overview.md。

## 完成狀態

8/8 變體皆由 `src/build.mjs` 產生到 `build/`：

- ✅ `tdd-sequential` — 純 TDD 順序
- ✅ `tdd-sequential-worktree` — + worktree 隔離（含 environment.md）
- ✅ `tdd-subagent` — + subagent 派發 + 每 group 兩階段審查（含 execution-plan.md）
- ✅ `tdd-subagent-worktree` — subagent + worktree（含 environment.md + execution-plan.md）
- ✅ `tdd-parallel` — + 批次並行派發（含 execution-plan.md，無兩階段審查）
- ✅ `tdd-parallel-worktree` — parallel + worktree（含 environment.md + execution-plan.md）
- ✅ `tdd-sequential-lite` — 精簡版：無 design / overview
- ✅ `tdd-sequential-lite-worktree` — 精簡版 + worktree 隔離（含 environment.md）

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

lite 變體（`tdd-sequential-lite[-worktree]`）沒有 design 與 overview：
依賴鏈為 proposal ─► specs ─► test-plan；tasks 直接依賴 specs + test-plan；
`apply.requires` 為 [proposal, specs, test-plan, tasks]（worktree 版另加 environment）。

> 圖只畫單一父節點的分支；`tasks` 有 3～4 個直接依賴（見下方說明），
> 無法在樹狀圖中乾淨表示多重父節點，因此另外列出，避免像舊版那樣
> 用共用垂直線畫出「design → test-plan」「overview → tasks」這類實際不存在的邊。

| Artifact | 用途 | 由誰讀 |
|----------|------|--------|
| `proposal.md`  | Why / What / Capabilities / Impact | 人 + apply |
| `specs/**/*.md`| WHAT — 需求 + Scenario（純文字）| 人 + apply + validator |
| `design.md`    | HOW — 技術決策 | 人 + apply |
| `test-plan.md` | RED 階段承諾書（測什麼、預期、為何先寫）| apply 反覆讀 |
| `overview.md`  | ASCII 視覺版（UI mockups / DB 關聯圖 / 時序圖等條件式圖表）| 純人類 |
| `tasks.md`     | RED / GREEN / REFACTOR checkbox 清單 | apply 追蹤進度 |

注意：`tasks.requires` 同時列出 `specs`、`test-plan`、`design`，與原版 `spec-driven`
的依賴語意對齊（即便 `test-plan` 已 require `specs`，仍顯式列出以避免 resolver
的傳遞依賴假設不同）。subagent / parallel 變體另外顯式加入 `execution-plan`。
lite 變體無 design，故只列 `specs`、`test-plan`。

`apply.requires` 則列出**除 `overview` 外的所有 artifacts**（由 build 依變體組成）：
overview 是純人類讀物，不 gate apply；其餘 artifact 都是 apply.instruction 會讀取
或寫入的檔案。特別是 worktree 變體的 `environment`——它不在 `tasks` 的依賴鏈上
（獨立掛在 proposal 下），若不列入 `apply.requires`，手動亂序時
`openspec instructions apply` 不會擋下「environment.md 還不存在就開始 Step 0」的情況。

## 變體差異對照

| Artifact | sequential | sequential-worktree | subagent | subagent-worktree | parallel | parallel-worktree | sequential-lite | sequential-lite-worktree |
|----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `proposal` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `specs` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `design` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| `test-plan` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `overview` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| `tasks` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `execution-plan` | — | — | ✅ | ✅ | ✅ | ✅ | — | — |
| `environment` | — | ✅ | — | ✅ | — | ✅ | — | ✅ |

設計理由：
- **sequential 不需要 `execution-plan`**：只有一條時間軸，沒有 dispatch 決策要記錄。
- **worktree 變體一律加 `environment.md`**：分支名、設定指令、驗證步驟、teardown。
  不允許 opt-out（要 opt-out 就選非 worktree 變體）。
- **lite 變體拔除 `design` / `overview`**：小型改動不需要獨立設計文件與視覺版；
  需要完整紀錄時改用非 lite 變體。

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
4. **overview 依規模與類型動態組合**：small / medium / large 命中不同區塊；另有四個
   條件式區塊不分規模、命中就加 — 前端需求加 UI Mockups、動到 DB 結構加 Data Model
   （Before/After 關聯圖）、含資料遷移加 Data Migration、含跨元件流程加 Sequence Diagram。
5. **worktree 是 schema-level 決策，非 artifact opt-out**：避免「畫了 environment.md 但說不用 worktree」的歧義。
6. **Schema instructions 英文，輸出語言由 config.yaml 控制**：見「安裝到專案」段。
7. **來源去重、產生物自足**：維護改 `src/`，OpenSpec 吃 `build/`；兩者由 `build.mjs` 保持同步。

## 已知限制 / 環境前提

- **commit 紀律依賴 agent 有 git 權限**：`apply.instruction` 內的
  `commit ... (RED)` / `(GREEN)` / `(REFACTOR)` 預期 host agent
  （Claude Code、Codex 等）有權限執行 `git commit`。若 agent 無此權限，
  commit 動作會退化為 in-memory 步驟；test-first 的順序紀律仍應遵守。
- **模型名稱以 Claude tier 為例**：execution-plan 的 haiku / sonnet / opus
  是範例名稱；instruction 與 template 已註明在沒有這些模型的 host 上，
  對應到等級相近的 fast / balanced / strongest 模型即可。
- **overview 為 required artifact**：列在 `artifacts:` 內即 OpenSpec resolver
  會把它視為必須產出的節點。small 規模也至少需輸出 Scope + What Changes 兩區塊。
  （lite 變體不含 overview，自然不受此限。）
- **與原版 schema 不可混用**：同一 change 不要中途切換 `spec-driven` 與
  `tdd-*` schema —— 兩者 artifact 集合不同，會造成 `openspec status` 誤判。
- **`build/` 是產生物**：不要直接手改；要改請改 `src/` 再 `node src/build.mjs`。
  `node src/build.mjs --check` 可偵測是否有人手改或忘了重建。
