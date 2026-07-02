// build.mjs — 把 src/ 的去重素材組裝成 6 個自足的 OpenSpec schema 資料夾到 build/。
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

// 所有變體共用的 apply 前綴(requires / tracks / instruction 標頭)。
const APPLY_PREFIX = 'apply:\n  requires: [tasks]\n  tracks: tasks.md\n  instruction: |\n';

// 6 個變體 = 執行模式 {sequential, subagent, parallel} × worktree {false, true}。
const VARIANTS = [
  { name: 'tdd-sequential',          mode: 'sequential', worktree: false },
  { name: 'tdd-sequential-worktree', mode: 'sequential', worktree: true  },
  { name: 'tdd-subagent',            mode: 'subagent',   worktree: false },
  { name: 'tdd-subagent-worktree',   mode: 'subagent',   worktree: true  },
  { name: 'tdd-parallel',            mode: 'parallel',   worktree: false },
  { name: 'tdd-parallel-worktree',   mode: 'parallel',   worktree: true  },
];

// 每個變體都有的 6 份共用 template。
const SHARED_TEMPLATES = ['proposal.md', 'spec.md', 'design.md', 'test-plan.md', 'overview.md', 'tasks.md'];

const read = (rel) => fs.readFileSync(path.join(HERE, rel), 'utf8');

// 產生檔頂註解:標明此檔為產生物、來源與重建方式。OpenSpec 的 YAML parser 會忽略註解。
function marker(v) {
  return '# GENERATED FILE — do not edit. Source of truth: openspec-custom-schemas/src/\n'
       + `# Rebuild: node src/build.mjs   |   Variant: ${v.name} (mode=${v.mode}, worktree=${v.worktree})\n`;
}

// 組出某變體的 schema.yaml 完整內容(含 GENERATED 標記)。
function buildSchema(v) {
  const nonSeq = v.mode !== 'sequential';
  let s = marker(v);
  s += read(`variants/${v.name}.head.yaml`); // name / version / description / 'artifacts:'
  s += read('artifacts/proposal.yaml');
  s += read('artifacts/specs.yaml');
  s += read('artifacts/design.yaml');
  s += read('artifacts/test-plan.yaml');
  s += read('artifacts/overview.yaml');
  if (nonSeq) s += read(`artifacts/execution-plan.${v.mode}.yaml`); // 非 sequential 才有
  s += read('artifacts/tasks.yaml'); // 結尾為 '    requires:\n',以下依模式補上相依項
  s += '      - specs\n      - test-plan\n';
  if (nonSeq) s += '      - execution-plan\n';
  s += '      - design\n\n';
  if (v.worktree) s += read('artifacts/environment.yaml'); // worktree 才有,放 tasks 之後
  s += APPLY_PREFIX;
  s += read(`apply/${v.name}.txt`); // apply body:各變體專屬
  return s;
}

// 組出某變體要輸出的所有檔案:{ 相對路徑(用 '/') -> 內容字串 }。
function buildFiles(v) {
  const files = { 'schema.yaml': buildSchema(v) };
  for (const t of SHARED_TEMPLATES) files[`templates/${t}`] = read(`templates/${t}`);
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
