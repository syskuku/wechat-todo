# wechat-todo

> 微信消息 → 待办整理 → 滴答清单（TickTick / dida365）自动同步 —— **一行命令、即插即用**的 AI 助手技能包

每天微信群里的通知、截止日期、文件散落各处？装上它之后，对你的 AI 助手说一句 **「更新待办」**，它就会：全量扫描微信新消息 → 判定哪些是要办的事 → 写成结构化待办文件 → 去重提交到滴答清单 → 把新收到的文件分类归档 → 给你一份汇总报告。

兼容任何支持 **SKILL.md 规范**的 AI 编码/助手工具（ZCode、OpenClaw、Claude Code 等），Windows / macOS / Linux 通用。

---

## 安装（一行命令）

```bash
npx github:syskuku/wechat-todo
```

就这一条。它不是只丢给你一个说明文件——**该带的工具全部随包装好**：

| 组件 | 说明 | 装到哪 |
|---|---|---|
| `wechat-todo` skill | 待办主工作流（扫描→判定→写文件→同步滴答→归档→报告） | `~/.agents/skills/wechat-todo/` 等 |
| `wechat-local` skill | 微信消息查询/导出/检索的全部脚本（`search_all.py` 等） | `~/.agents/skills/wechat-local/` |
| wechat-cli 工具链 | 开源 [wechat-cli-plus](https://github.com/maomao3334/wechat-cli-plus) 0.2.4（Apache-2.0），含全部 Python 依赖，**无需 pip 安装** | `~/.wechat-cli/` |
| 解密密钥初始化 | 自动检测并执行 `wxcli init`（保持微信运行即可，密钥从本机微信进程提取，数据不出本机） | `~/.wechat-cli/all_keys.json` |
| 滴答清单 MCP | 提供 `--token` 时**自动写入**你本机工具的 MCP 配置 | ZCode → `~/.zcode/cli/config.json`；Claude Code → `~/.claude.json` |

安装器会检测你机器上已有的工具目录（`~/.agents/skills`、`~/.zcode/skills`、`~/.claude/skills`）并装入存在的那些；重复执行 = 覆盖升级。

**带上滴答令牌一步到位：**

```bash
npx github:syskuku/wechat-todo --token <你的滴答个人访问令牌>
```

<details>
<summary>其他安装方式（备用）</summary>

**手动（clone 后拷贝）：**

```bash
git clone https://github.com/syskuku/wechat-todo.git
# ① 两个 skill 文件夹 → 放进你的 skills 目录（如 ~/.agents/skills/）
# ② vendor/wechat-cli/ → 整个复制为 ~/.wechat-cli/
# ③ node bin/wechat-todo.js 与上面效果一致（自动完成 ①② 及密钥/MCP 初始化）
```

**环境变量开关：**
- `DIDA365_TOKEN` —— 等价 `--token`
- `WECHAT_TODO_SKILLS_DIR` —— 自定义 skills 安装目录
- `--skip-init` —— 跳过解密密钥初始化

</details>

---

## 使用方法

### 1. 触发

装好后，在你的 AI 助手对话里直接说：

> **更新待办** ／ 生成今天的待办 ／ 同步滴答 ／ 整理微信消息 ／ 跑一下待办 ／ 汇总最近要办的事

### 2. 首次使用引导（只出现一次）

第一次触发时，skill 会带着你完成三件事，然后**把引导段从文件里自动删掉**，之后的每次运行都不再重复：

1. **新建专用工作文件夹**（最重要）——在电脑任意位置建一个文件夹作为唯一工作区，消息导出、`今日待办.md`、`待办总表.md`、`日期纪要/`、归档文件全放这里，让 agent 运行在该文件夹中；
2. **接入滴答清单 MCP**——已用 `--token` 装好的直接验证；没配的会给你两种方式（重跑带令牌 / 手动粘贴配置片段），并核对 5 类能力：列项目、查未完成、查已完成、搜索任务、新建与完成任务；
3. **告知作者信息**（见文末），随后引导段自动移除。

> 若微信解密没就绪（`wxcli sessions` 报错），保持微信运行执行一次 `~/.wechat-cli/wxcli.cmd init` 即可。

### 3. 每次运行做什么（自动流程）

1. **定断点**——读工作区 README 里的上次同步时间；
2. **全量扫会话**——`wxcli sessions` 列出所有会话，凡断点后有新消息的逐个导出（不靠固定群名单，防漏新拉的群）；
3. **关键词补盲**——截止/交/报名/接龙/收到请回复 等多轮检索，补上扫描盲区；
4. **判定分类**——新待办 / 已完成 / 作废 / 纯通知 / 纯闲聊，同事项取最新版本，别人私聊交代的事优先；
5. **写文件**——生成 `日期纪要/当天.md`，重写 `今日待办.md`（绝对日期勾选清单），倒叙重排 `待办总表.md`；
6. **同步滴答**——先查未完成+已完成+关键词三样去重，再勾已完成、建新任务（每条正文附通知原文、单任务单日期）；
7. **归档文件**——新收到的 docx/xlsx/pdf/zip 打开确认内容后分类入文件夹；
8. **衔接校验 + 汇报**——旧未完成逐条对照不许凭空消失，最后输出断点范围、新增待办（按优先级排序）、滴答操作明细、文件去向、近三天硬截止 Top3。

### 4. 产出文件结构

```text
你的工作区/
├── README.md            ← 同步断点、必盯会话、个人范围与优先级规则
├── 今日待办.md            ← 每天打开这个：⚡硬截止 → 🟡顺手 → 📅接下来 → ✅已完成 → ⚠️已作废
├── 待办总表.md            ← 全部待办倒叙（最新在顶），滴答勾掉=已完成
├── 日期纪要/YYYY-MM-DD.md ← 每日消息背景与时间线
├── 原始消息/              ← 聊天记录导出存档
└── …归档的资料文件夹
```

### 5. 内置规则（踩坑沉淀，不用你再教）

- 绝对日期（永不写"今天"）、总表倒叙、全量会话扫描；
- 滴答单任务单日期；正文末尾附**通知原文逐字照抄**；
- 带日期的事项（哪怕可选、收到免回复）一律建任务；
- 建任务前三查去重，**已打勾=已完成**，不重复提交；
- 范围过滤：通知限定"校本部/某年级/某职务"的，不派给范围外的用户；
- 优先级默认：本人组织职务 > 老师/上级 > 其他按紧急度（可在工作区 README 覆盖）。

---

## 更新与卸载

- **更新**：重跑 `npx github:syskuku/wechat-todo`（覆盖最新版）；
- **卸载**：删除 skills 里的 `wechat-todo`、`wechat-local` 两个文件夹，以及 `~/.wechat-cli/`（如不再需要微信读取）；
- **数据安全**：解密密钥、db 配置、聊天数据永不出本机，安装包不包含也不覆盖你的任何凭据；滴答令牌只写进你自己的 MCP 配置文件。

## 常见问题

| 现象 | 处理 |
|---|---|
| `wxcli sessions` 报密钥错误/乱码 | 保持微信运行 → `~/.wechat-cli/wxcli.cmd init` |
| 报 `zstandard has no attribute ZstdDecompressor` | 把 `~/.wechat-cli/deps/zstandard/*` 复制到 `%LOCALAPPDATA%\Temp\wechat-cli-plus-pydeps\zstandard\` |
| 滴答工具没出现 | 令牌是否有效；配置写在了哪个工具的配置文件里（看安装输出）；重启 AI 工具加载 MCP |
| npx 拉不下来（网络） | 换网络重试，或 `git clone` 后手动 `node bin/wechat-todo.js` |
| 微信换了版本/重装 | 重新 `wxcli init`，db_dir 会自动重探测 |

## 作者

**Syskuku_暮雪逢樱** · [www.imikufans.com](https://www.imikufans.com)

License: skill 与安装器 MIT ｜ 内置 wechat-cli-plus Apache-2.0 ｜ 依赖库各随其原许可
