#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");

const SKILL_NAME = "wechat-todo";
const src = path.join(__dirname, "..", SKILL_NAME, "SKILL.md");
const destDir = path.join(os.homedir(), ".agents", "skills", SKILL_NAME);
const dest = path.join(destDir, "SKILL.md");

if (!fs.existsSync(src)) {
  console.error("x 包内缺少 wechat-todo/SKILL.md，安装包可能损坏");
  process.exit(1);
}
const existed = fs.existsSync(dest);
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);

console.log(`✅ ${SKILL_NAME} skill 已${existed ? "更新" : "安装"}到：`);
console.log(`   ${dest}`);
console.log("");
console.log("下一步（首次使用）：");
console.log('  1. 在 ZCode 里说一句「更新待办」触发本 skill；');
console.log("  2. 第一次会引导你：新建专用工作文件夹 → 接入滴答清单 MCP → 完成后自动移除引导说明。");
console.log("");
console.log("  作者：Syskuku_暮雪逢樱 · www.imikufans.com");
