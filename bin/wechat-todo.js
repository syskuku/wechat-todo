#!/usr/bin/env node
"use strict";
/**
 * wechat-todo 一键安装器 v2.1
 *   npx github:syskuku/wechat-todo
 *   npx github:syskuku/wechat-todo --token <滴答个人访问令牌>   # 同时自动配置滴答清单 MCP
 * 干五件事：装 skills（wechat-todo + wechat-local）→ 按本机架构铺设 wechat-cli 工具链
 *          （deps-arm64 / deps-x64 二选一）→ 自动提取解密密钥（wxcli init）
 *          → 写入滴答清单 MCP 配置
 * 兼容：ZCode / OpenClaw（~/.agents|~/.zcode/skills）、Claude Code（~/.claude/skills）
 * 环境变量：DIDA365_TOKEN 等价 --token；WECHAT_TODO_SKILLS_DIR 指定 skills 目录
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const cp = require("child_process");

const pkgRoot = path.join(__dirname, "..");
const home = os.homedir();
const args = process.argv.slice(2);

function flag(name) {
  const i = args.findIndex((a) => a === "--" + name || a.startsWith("--" + name + "="));
  if (i < 0) return null;
  const a = args[i];
  if (a.includes("=")) return a.slice(a.indexOf("=") + 1);
  const nxt = args[i + 1];
  return nxt && !nxt.startsWith("--") ? nxt : "";
}
const didaToken = flag("token") || process.env.DIDA365_TOKEN || null;
const skipInit = args.includes("--skip-init");
const ok = (m) => console.log("✅ " + m);
const info = (m) => console.log("ℹ️ " + m);
const warn = (m) => console.log("⚠️ " + m);

/* ---------- A. 安装 skills ---------- */
const skillsSrc = path.join(pkgRoot, "skills");
const skillNames = fs.readdirSync(skillsSrc).filter((f) =>
  fs.statSync(path.join(skillsSrc, f)).isDirectory()
);
const candidates = [
  [path.join(home, ".agents", "skills"), "ZCode / OpenClaw"],
  [path.join(home, ".zcode", "skills"), "ZCode（高优先级）"],
  [path.join(home, ".claude", "skills"), "Claude Code"],
];
let targets;
if (process.env.WECHAT_TODO_SKILLS_DIR) {
  targets = [[path.resolve(process.env.WECHAT_TODO_SKILLS_DIR), "自定义目录(WECHAT_TODO_SKILLS_DIR)"]];
} else {
  targets = candidates.filter(([dir]) => fs.existsSync(path.dirname(dir)));
  if (targets.length === 0) targets = [candidates[0]];
}
for (const [root, label] of targets) {
  const installed = [];
  for (const name of skillNames) {
    let dest = path.join(root, name);
    try {
      const st = fs.lstatSync(dest);
      if (st.isSymbolicLink()) {
        // 尊重软链布局（如 cc-switch 管理的 skills）：跟随链接装到真实位置
        try { dest = fs.realpathSync(dest); }
        catch (e) { warn("跳过 " + dest + "（断开的符号链接）"); continue; }
      }
    } catch (e) { /* 不存在 → 正常新建 */ }
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(path.join(skillsSrc, name), dest, { recursive: true, force: true });
    installed.push(name);
  }
  ok("skills 装入 " + root + "  ← " + label + "（" + installed.join("、") + "）");
}

/* ---------- A2. 检测本机架构与 Python 版本 ---------- */
function detectArch() {
  try {
    const r = cp.spawnSync("python", ["-c", "import platform;print(platform.machine().upper())"], {
      encoding: "utf8", timeout: 15000,
    });
    const m = (r.stdout || "").trim().toUpperCase();
    if (m.includes("ARM64") || m.includes("AARCH64")) return "arm64";
    if (m.includes("AMD64") || m.includes("X86_64")) return "x64";
  } catch (e) { /* fall through */ }
  return process.arch === "arm64" ? "arm64" : "x64";
}
let pyVer = "";
try {
  const r = cp.spawnSync("python", ["-c", "import platform;print(platform.python_version())"], {
    encoding: "utf8", timeout: 15000,
  });
  pyVer = (r.stdout || "").trim();
} catch (e) { /* ignore */ }
const arch = detectArch();
info("本机检测：Python " + (pyVer || "未检测到") + " / " + (arch === "arm64" ? "ARM64" : "x64") + " 架构");

/* ---------- B. 铺设 wechat-cli 工具链（按架构选依赖集） ---------- */
// 包内 vendor 只含 tool/ deps-arm64/ deps-x64/ wxcli.cmd（Apache-2.0），
// 绝不含也不会覆盖用户本机的 all_keys.json（解密密钥）与 config.json（db_dir）
const wcSrc = path.join(pkgRoot, "vendor", "wechat-cli");
const wcDest = path.join(home, ".wechat-cli");
const depsSrcName = arch === "arm64" ? "deps-arm64" : "deps-x64";
let wcNote = "-";
if (fs.existsSync(wcSrc)) {
  fs.mkdirSync(wcDest, { recursive: true });
  // tool（架构无关）
  fs.cpSync(path.join(wcSrc, "tool"), path.join(wcDest, "tool"), { recursive: true, force: true });
  // deps：按架构二选一，铺到统一的 ~/.wechat-cli/deps（wxcli.cmd 的 PYTHONPATH 不变）
  const depsSrc = path.join(wcSrc, depsSrcName);
  if (fs.existsSync(depsSrc)) {
    fs.cpSync(depsSrc, path.join(wcDest, "deps"), { recursive: true, force: true });
  } else {
    warn("包内缺少 " + depsSrcName + "，Python 依赖未安装");
  }
  fs.copyFileSync(path.join(wcSrc, "wxcli.cmd"), path.join(wcDest, "wxcli.cmd"));
  wcNote = "wechat-cli-plus 0.2.4 (Apache-2.0) → ~/.wechat-cli（依赖集=" + depsSrcName + "）";
  ok("微信工具链 " + wcNote);
} else {
  warn("包内缺少 vendor/wechat-cli，微信读取能力未安装");
}
// Python 版本提示：预编译依赖按 3.12 打包（pycryptodome/psutil 为 abi3 通用，
// zstandard 为 cp312 绑定）；其他版本给出手动补装命令
if (pyVer && !pyVer.startsWith("3.12")) {
  warn("预编译依赖按 Python 3.12 打包，当前 " + pyVer + " 可能不匹配 zstandard。");
  info("可执行：python -m pip install --target \"" + path.join(wcDest, "deps") + "\" zstandard pycryptodome psutil click");
}

/* ---------- C. 解密密钥初始化 ---------- */
let initNote = "跳过";
const keysFile = path.join(wcDest, "all_keys.json");
if (fs.existsSync(keysFile)) {
  initNote = "密钥已存在（沿用本机）";
  info("解密密钥已存在，跳过初始化");
} else if (skipInit) {
  initNote = "已按 --skip-init 跳过";
} else if (process.platform === "win32") {
  info("未检测到解密密钥，自动执行 wxcli init（请确认微信客户端正在运行）…");
  try {
    const r = cp.spawnSync("cmd", ["/c", path.join(wcDest, "wxcli.cmd"), "init"], {
      encoding: "utf8", timeout: 120000,
    });
    if (r.status === 0) { initNote = "init 自动完成"; ok("解密密钥已生成，微信读取就绪"); }
    else {
      initNote = "待手动 init";
      warn("自动 init 未成功（多半是微信没开）。保持微信运行后执行：~/.wechat-cli/wxcli.cmd init");
    }
  } catch (e) {
    initNote = "待手动 init";
    warn("init 异常：" + e.message + "；稍后手动执行 ~/.wechat-cli/wxcli.cmd init");
  }
} else {
  initNote = "非 Windows 需手动安装";
  warn("非 Windows 平台：请参考上游 github.com/maomao3334/wechat-cli-plus 手动安装");
}

/* ---------- D. 滴答清单 MCP 配置 ---------- */
const SERVER_KEY = "滴答清单";
function serverDef(token) {
  return { type: "http", url: "https://mcp.dida365.com",
           headers: { Authorization: "Bearer " + token } };
}
function ensureDida(file, ensureSection, label) {
  if (!fs.existsSync(file)) return "missing";
  let j;
  try { j = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { warn(label + " 配置解析失败，跳过：" + e.message); return "error"; }
  const section = ensureSection(j);
  if (section[SERVER_KEY] && !didaToken) {
    info(label + " 已有滴答清单 MCP 配置，跳过（更新令牌请加 --token）");
    return "exists";
  }
  if (!didaToken) return "absent";
  section[SERVER_KEY] = serverDef(didaToken);
  fs.writeFileSync(file, JSON.stringify(j, null, 2));
  ok(label + " 滴答清单 MCP 已写入 " + file);
  return "written";
}
const zcodeCfg = path.join(home, ".zcode", "cli", "config.json");
const claudeCfg = path.join(home, ".claude.json");
const stZ = fs.existsSync(zcodeCfg)
  ? ensureDida(zcodeCfg, (j) => { j.mcp = j.mcp || {}; j.mcp.servers = j.mcp.servers || {}; return j.mcp.servers; }, "ZCode")
  : "missing";
const stC = fs.existsSync(claudeCfg)
  ? ensureDida(claudeCfg, (j) => { j.mcpServers = j.mcpServers || {}; return j.mcpServers; }, "Claude Code")
  : "missing";
const mcpConfigured = (stZ === "written" || stZ === "exists" || stC === "written" || stC === "exists");

/* ---------- E. 汇总 ---------- */
console.log("");
console.log("════════════════════════════════════════════════════");
console.log("📦 wechat-todo 安装完成");
console.log("  · skills       : " + skillNames.join(", ") + " → " + targets.map((t) => t[0]).join("  ;  "));
console.log("  · 微信工具链   : " + wcNote);
console.log("  · 解密密钥     : " + initNote);
console.log("  · 滴答清单 MCP : " + (mcpConfigured ? "已就绪" : "未接入（见下方二选一）"));
if (!mcpConfigured) {
  console.log("");
  console.log("  滴答清单 MCP 接入（二选一）：");
  console.log("    A) 重跑一行命令并带令牌（自动写入配置）：");
  console.log("       npx github:syskuku/wechat-todo --token <滴答个人访问令牌>");
  console.log("       令牌获取：滴答清单开发者平台 developer.dida365.com");
  console.log("       （或搜索「滴答清单 MCP 官方文档」）");
  console.log('    B) 手动把片段加入工具 MCP 配置（Claude Code 放顶层 mcpServers）：');
  console.log('       {"mcp":{"servers":{"滴答清单":{"type":"http","url":"https://mcp.dida365.com","headers":{"Authorization":"Bearer <令牌>"}}}}}');
}
console.log("");
console.log("▶ 下一步：在你的 AI 助手里说「更新待办」——首次会引导你新建专用工作文件夹。");
console.log("  作者：Syskuku_暮雪逢樱 · www.imikufans.com");
