// build.mjs — 把 src/ 的去重素材組裝成 8 個自足的 OpenSpec schema 資料夾到 build/。
//
// 用法:
//   node src/build.mjs           產生 build/(會先清空 build/ 再重建)
//   node src/build.mjs --check   只檢查 build/ 是否與 src/ 同步(不寫檔;不同步則 exit 1)
//
// 設計:schema.yaml 以「純文字片段串接」方式組出,不做 YAML 物件序列化,
// 因此輸出可與手寫版逐字一致。apply body 每個變體各自完整保留(它是各變體
// 真正獨有的行為核心);其餘機械重複的片段(共用 artifact 區塊、tasks head、
// execution-plan、environment、templates、header)在 src/ 只存一份。
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // .../openspec-custom-schemas/src
const ROOT = path.dirname(HERE);                           // .../openspec-custom-schemas
const BUILD = path.join(ROOT, 'build');

// apply 前綴(requires / tracks / instruction 標頭)。
// requires 列出「除 overview 外」的所有 artifacts:overview 是純人類讀物,
// 不 gate apply;其餘都是 apply.instruction 會讀取或寫入的檔案(worktree 變體
// 的 Step 0 依賴 environment.md,而 environment 不在 tasks 的依賴鏈上,
// 必須在這裡列出才會被 `openspec instructions apply` 的 blocked 檢查涵蓋)。
// 順序與 schema 內 artifacts 的宣告順序一致。
function applyPrefix(v) {
  const requires = ['proposal', 'specs'];
  if (!v.lean) requires.push('design'); // lean 變體沒有 design artifact
  requires.push('test-plan');
  if (v.mode !== 'sequential') requires.push('execution-plan');
  requires.push('tasks');
  if (v.worktree) requires.push('environment');
  return `apply:\n  requires: [${requires.join(', ')}]\n  tracks: tasks.md\n  instruction: |\n`;
}

// 8 個變體 = 執行模式 {sequential, subagent, parallel} × worktree {false, true}
// + 2 個 lean 變體(去掉 design / overview,只留 proposal / specs / test-plan / tasks;
//   lean 目前僅支援 sequential 模式)。
const VARIANTS = [
  { name: 'tdd-sequential',               mode: 'sequential', worktree: false },
  { name: 'tdd-sequential-worktree',      mode: 'sequential', worktree: true  },
  { name: 'tdd-subagent',                 mode: 'subagent',   worktree: false },
  { name: 'tdd-subagent-worktree',        mode: 'subagent',   worktree: true  },
  { name: 'tdd-parallel',                 mode: 'parallel',   worktree: false },
  { name: 'tdd-parallel-worktree',        mode: 'parallel',   worktree: true  },
  { name: 'tdd-sequential-lite',          mode: 'sequential', worktree: false, lean: true },
  { name: 'tdd-sequential-lite-worktree', mode: 'sequential', worktree: true,  lean: true },
];

// 完整變體都有的 6 份共用 template;lean 變體只輸出其中 4 份(無 design / overview)。
const SHARED_TEMPLATES = ['proposal.md', 'spec.md', 'design.md', 'test-plan.md', 'overview.md', 'tasks.md'];
const LEAN_TEMPLATES = ['proposal.md', 'spec.md', 'test-plan.md', 'tasks.md'];

// 讀取來源片段;片段以純文字串接組成 schema.yaml,因此必須以換行結尾,
// 否則會與下一個片段黏行,產出壞掉的 YAML。
function read(rel) {
  const content = fs.readFileSync(path.join(HERE, rel), 'utf8');
  if (!content.endsWith('\n')) {
    throw new Error(`來源片段未以換行結尾,串接會黏行: src/${rel}`);
  }
  return content;
}

// 產生檔頂註解:標明此檔為產生物、來源與重建方式。OpenSpec 的 YAML parser 會忽略註解。
function marker(v) {
  const leanTag = v.lean ? ', lean=true' : ''; // 只有 lean 變體多印,既有變體產出逐字節不變
  return '# GENERATED FILE — do not edit. Source of truth: openspec-custom-schemas/src/\n'
       + `# Rebuild: node src/build.mjs   |   Variant: ${v.name} (mode=${v.mode}, worktree=${v.worktree}${leanTag})\n`;
}

// 對來源片段做定向字串替換(lean 拔除引用 / subagent 插入群組審查規則等變體差異用)。
// 找不到目標字串就 throw,避免來源改寫後替換靜默失效、產出殘留失效引用。
function mustReplace(content, from, to, srcName) {
  if (!content.includes(from)) {
    throw new Error(`替換目標不存在(來源可能已改寫,請同步更新 mustReplace 呼叫): src/${srcName}`);
  }
  return content.replace(from, to);
}

// 組出某變體的 schema.yaml 完整內容(含 GENERATED 標記)。
function buildSchema(v) {
  const nonSeq = v.mode !== 'sequential';
  if (v.lean && nonSeq) {
    throw new Error(`lean 目前僅支援 sequential 模式(execution-plan 與 lean 的互動未定義): ${v.name}`);
  }
  const head = read(`variants/${v.name}.head.yaml`); // name / version / description / 'artifacts:'
  if (!head.endsWith('artifacts:\n')) {
    throw new Error(`head 必須以 'artifacts:' 收尾,否則串接出壞 YAML: src/variants/${v.name}.head.yaml`);
  }
  let tasks = read('artifacts/tasks.yaml');
  if (!tasks.endsWith('    requires:\n')) {
    throw new Error(`tasks.yaml 必須以 '    requires:' 收尾,build 依此補相依項: src/artifacts/tasks.yaml`);
  }
  if (v.mode === 'subagent') {
    // subagent 變體的審查單位是 tasks.md 的 `##` 群組:規劃期就要求每個群組
    // 收尾於 spec 完整狀態,避免中間態落在審查邊界上(見 apply 的 coherence pre-flight)
    tasks = mustReplace(
      tasks,
      '      - Cross-group dependencies: state `Depends on: §N` on the line under the group header\n',
      '      - Cross-group dependencies: state `Depends on: §N` on the line under the group header\n'
      + '      - Review runs per group (`##` section), not per task: every group must\n'
      + '        end in a spec-coherent state — no dangling intermediate state (e.g.,\n'
      + '        a helper nothing in the group consumes) at the group boundary\n'
      + '      - Keep groups reviewable: at most 3 RED/GREEN pairs per group\n',
      'artifacts/tasks.yaml'
    );
  }
  const applyBody = read(`apply/${v.name}.txt`);
  if (!applyBody.startsWith('    ')) {
    throw new Error(`apply body 首行必須縮排 4 空格(YAML block scalar): src/apply/${v.name}.txt`);
  }
  let proposal = read('artifacts/proposal.yaml');
  let specs = read('artifacts/specs.yaml');
  if (v.lean) {
    // lean 沒有 design / overview,instruction 內對它們的引用必須一併拿掉
    proposal = mustReplace(
      proposal,
      'Keep it 1-2 pages. The "how" belongs in design.md, not here.',
      'Keep it 1-2 pages. Implementation details do not belong here.',
      'artifacts/proposal.yaml'
    );
    specs = mustReplace(
      specs,
      '      ⚠️ Do NOT embed ASCII diagrams or visualizations in spec.md.\n'
      + '      All visuals belong in overview.md. spec.md must stay as pure requirement\n'
      + '      language so the validator can parse it correctly.\n',
      '      ⚠️ Do NOT embed ASCII diagrams or visualizations in spec.md.\n'
      + '      spec.md must stay as pure requirement language so the validator\n'
      + '      can parse it correctly.\n',
      'artifacts/specs.yaml'
    );
  }
  let s = marker(v);
  s += head;
  s += proposal;
  s += specs;
  if (!v.lean) s += read('artifacts/design.yaml');
  s += read('artifacts/test-plan.yaml');
  if (!v.lean) s += read('artifacts/overview.yaml');
  if (nonSeq) s += read(`artifacts/execution-plan.${v.mode}.yaml`); // 非 sequential 才有
  s += tasks; // 結尾為 '    requires:\n',以下依模式補上相依項
  s += '      - specs\n      - test-plan\n';
  if (nonSeq) s += '      - execution-plan\n';
  if (!v.lean) s += '      - design\n';
  s += '\n';
  if (v.worktree) s += read('artifacts/environment.yaml'); // worktree 才有,放 tasks 之後
  s += applyPrefix(v);
  s += applyBody; // apply body:各變體專屬
  return s;
}

// 組出某變體要輸出的所有檔案:{ 相對路徑(用 '/') -> 內容字串 }。
function buildFiles(v) {
  const files = { 'schema.yaml': buildSchema(v) };
  for (const t of (v.lean ? LEAN_TEMPLATES : SHARED_TEMPLATES)) files[`templates/${t}`] = read(`templates/${t}`);
  if (v.lean) {
    // spec.md template 的註解引用 overview.md,lean 版一併拿掉
    files['templates/spec.md'] = mustReplace(
      files['templates/spec.md'],
      'Do NOT embed ASCII diagrams or visualizations here; all visuals go to overview.md.',
      'Do NOT embed ASCII diagrams or visualizations here; keep it pure requirement language.',
      'templates/spec.md'
    );
  }
  if (v.mode === 'subagent') {
    // tasks.md template 的檔頂註解加上審查單位說明,與 tasks.yaml 的定向插入對齊
    files['templates/tasks.md'] = mustReplace(
      files['templates/tasks.md'],
      '  Naming prefix: RED / GREEN / REFACTOR\n',
      '  Naming prefix: RED / GREEN / REFACTOR\n'
      + '  Review unit = the ## group: each group must end spec-coherent\n'
      + '  (no dangling intermediate state; at most 3 RED/GREEN pairs).\n',
      'templates/tasks.md'
    );
  }
  if (v.worktree) files['templates/environment.md'] = read('templates/environment.md');
  if (v.mode !== 'sequential') {
    // src/ 內以 execution-plan.<mode>.md 區分,輸出時一律命名為 execution-plan.md
    files['templates/execution-plan.md'] = read(`templates/execution-plan.${v.mode}.md`);
  }
  return files;
}

// 遞迴列出 dir 底下所有檔案的相對路徑(統一用 '/' 分隔,跨平台一致)。
function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

// 產生 build/:先整包清空再重建,避免殘留已移除變體的舊檔。
function doBuild() {
  fs.rmSync(BUILD, { recursive: true, force: true });
  let fileCount = 0;
  for (const v of VARIANTS) {
    for (const [rel, content] of Object.entries(buildFiles(v))) {
      const p = path.join(BUILD, v.name, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, content);
      fileCount++;
    }
  }
  console.log(`✓ 已產生 ${VARIANTS.length} 個 schema 到 build/(共 ${fileCount} 個檔)`);
}

// 檢查 build/ 是否與 src/ 同步(缺檔 / 內容不符 / 多餘檔),不同步則 exit 1。
function doCheck() {
  const problems = [];
  for (const v of VARIANTS) {
    const files = buildFiles(v);
    const expected = new Set(Object.keys(files));
    for (const [rel, content] of Object.entries(files)) {
      const p = path.join(BUILD, v.name, rel);
      if (!fs.existsSync(p)) problems.push(`missing:  ${v.name}/${rel}`);
      else if (fs.readFileSync(p, 'utf8') !== content) problems.push(`stale:    ${v.name}/${rel}`);
    }
    const dir = path.join(BUILD, v.name);
    if (!fs.existsSync(dir)) { problems.push(`missing dir: ${v.name}/`); continue; }
    for (const rel of listFiles(dir)) {
      if (!expected.has(rel)) problems.push(`orphan:   ${v.name}/${rel}`);
    }
  }
  // build/ 頂層不該有 VARIANTS 以外的東西(已移除的變體、手動加入的散檔)。
  if (fs.existsSync(BUILD)) {
    const expectedDirs = new Set(VARIANTS.map((v) => v.name));
    for (const entry of fs.readdirSync(BUILD, { withFileTypes: true })) {
      if (!expectedDirs.has(entry.name)) {
        problems.push(`orphan:   ${entry.name}${entry.isDirectory() ? '/' : ''}`);
      }
    }
  }
  if (problems.length) {
    console.error(`✗ build/ 與 src/ 不同步(${problems.length} 項):`);
    for (const p of problems) console.error('  - ' + p);
    console.error('  → 執行 `node src/build.mjs` 重新產生。');
    process.exit(1);
  }
  console.log('✓ build/ 與 src/ 完全同步');
}

if (process.argv[2] === '--check') doCheck();
else doBuild();
