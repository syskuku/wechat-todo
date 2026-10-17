# wechat-todo

> ZCode skill：**微信消息 → 待办整理 → 滴答清单（TickTick）同步** 一站式处理

全量扫描微信会话提取今日与近日要办的事 → 写待办文件（今日待办 + 倒叙总表 + 每日纪要）→ 去重同步滴答清单 → 新收到的文件分类归档 → 汇总报告。

## 安装（一行命令）

**Windows（PowerShell）：**

```powershell
iwr https://raw.githubusercontent.com/syskuku/wechat-todo/main/wechat-todo.zip -OutFile $env:TEMP\wechat-todo.zip; Expand-Archive $env:TEMP\wechat-todo.zip $env:USERPROFILE\.agents\skills -Force
```

**macOS / Linux（bash）：**

```bash
curl -fsSL https://raw.githubusercontent.com/syskuku/wechat-todo/main/wechat-todo.zip -o /tmp/wechat-todo.zip && unzip -o /tmp/wechat-todo.zip -d ~/.agents/skills/
```

## 首次使用

装好后在 ZCode 里说一句 **"更新待办"** 即可触发，第一次会走引导：

1. 提醒你在电脑上新建专用工作文件夹（消息/待办/文件都存这里，让 agent 在其中运行）；
2. 教你接入**滴答清单 MCP** 并验证（列项目 / 查未完成 / 查已完成 / 搜索 / 新建与完成任务 五类能力）；
3. 引导完成后自动移除说明段，以后调用不再重复。

依赖：本机 wechat-cli（`~/.wechat-cli/wxcli.cmd`）用于读取微信消息；滴答清单 MCP 用于任务同步。

## 作者

**Syskuku_暮雪逢樱** · [www.imikufans.com](https://www.imikufans.com)
