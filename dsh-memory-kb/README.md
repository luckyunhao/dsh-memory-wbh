# dsh-memory-kb

给 DeepSeek Harness 的「记忆 + 知识库」插件：对话自动沉淀长期记忆、生成可复用技能、抓取新闻，并用图谱浏览整个知识库。

## 功能

| 能力 | 说明 |
| --- | --- |
| 自动沉淀 | 每轮对话结束后，用当前会话的模型把稳定事实、决策、偏好、项目进展写成记忆条目，自动更新 `INDEX.md` |
| 自动召回 | 用户发新消息时检索相关记忆，把 `[记忆召回]` 背景块插入当前请求；无关时模型可忽略 |
| 技能生成 | 从对话中识别可重复流程，写成 `SKILL.md` 到用户技能目录；DSH 的 skill-filesystem 会自动发现 |
| 新闻抓取 | 定时抓取 RSS/Atom，生成中文简报；网页使用 `node:http(s)`，不依赖全局 fetch |
| 知识库可视化 | 侧栏底部「记忆库」按钮打开「第二大脑工作台」：AGENT / 知识库 / 专家 / 风格 / 监控 / 新闻 / 项目 / 图谱 / 概览 / 设置；右侧 LIVE SIGNAL（当前目标 / 记忆中心 / 任务队列 / 运行记录） |
| AGENT 页 | 项目带（`sessionQuery.listSessions()` 列出实时+持久会话与标题）+ 工作台内聊天（实时会话走 `clientSession.prompt()`；持久会话只读历史）+ 附件（文件/粘贴/拖拽）+ `@ 文件` 引用 + `/ 指令` + 流式输出 + 可展开的工具调用 chip；Enter 发送、Shift+Enter 换行；一键导出 Markdown |
| 内嵌审批/提问 | 当前主会话出现 `approval/request` 或 `ask_user_question` 时，工作台底部显示卡片：允许一次 / 拒绝；单选 / 多选 / 自定义回答 |
| 记忆审核 | 「记忆库 → 待复核」列出自动沉淀的条目：单条确认/编辑/删除、批量确认；按标题+结论 token 相似度找近重复并一键合并（保留一条，其余进 `.trash`） |
| 问记忆库 | 检索 Top 6 记忆/知识/技能，交给当前模型基于资料回答并给出 `[n]` 引用；点击引用可直接打开条目 |
| 成本估算 | 本会话/每轮/今日实际（独立账本）金额；单价与日预算可在设置里改，达到日预算时每天提醒一次 |
| 文件预览 | 代码视图文件树点文件即可只读预览（`workspaceFiles.read`），支持 git diff、复制内容、在资源管理器中打开 |
| 素材墙 | 知识库「素材」筛选：扫描素材目录的图片/视频/音频，缩略图网格 + 播放/图片灯箱；`/media/file` 支持 Range |
| 直接调用 | 专家卡「在对话中调用」、风格卡「在对话中使用」会把指令直接发送到当前会话并切到 AGENT 页；失败时回退复制 |
| Agent 工具 | `memory_search`、`memory_save`、`memory_stats`、`skill_list`、`skill_create`、`news_fetch` |
| 斜杠命令 | `/memory search\|save\|distill\|news\|status\|on\|off` |

## 全屏模式（默认）

工作台默认铺满整个 DSH 窗口，不再需要先点「记忆库」：

- 左侧栏底部「退出工作台 →」回到原生 DSH 界面；原生侧栏的「工作台」按钮再打开
- AGENT 页优先走 **Client Session 的 `binding.hooks.session.prompt()`**（原生 composer 同一条通道），它拥有会话写句柄，能激活普通会话
- 「+ 新会话」会直接触发原生「新建会话」按钮，工作台保持打开；新建的空会话可直接发送
- 已恢复但被原生写句柄占用的会话（`session/writer-held`）：发送/激活失败后，AGENT 头部会显示橙色横幅「该会话被原生写句柄占用」+「新建会话继续」按钮，一键走原生新建会话（不会再只弹 toast）

## 数据放在哪

默认：

- 记忆根：自动探测 `D:\DeepSeekHarness\memory`（存在 `INDEX.md`/`entries` 时）；否则 `$DSH_HOME/memory`
- 技能目录：`$DSH_HOME/skills`（DSH 的 user-dsh 根，rank 400）
- 插件状态：`$DSH_HOME/memory-kb/`（`settings.json`、`state.json`、`.trash/`）

记忆条目沿用它已有的格式：

```markdown
# 一句话标题

- 日期：YYYY-MM-DD
- 类型：fact | preference | decision | project | reference
- 来源：DSH 会话 <id> 第 N 轮
- 状态：自动沉淀（待人工复核）
- 标签：...

## 结论
...
## 依据
...
```

写入前会做凭据脱敏；禁止把密码、token、API key 写进记忆。

项目类记忆（`type=project`）的正文按小节组织，工作台会解析成项目卡：

```markdown
## 项目目标
## 关键决策
## 当前状态
## 下一步行动
- [x] 已完成
- [ ] 待办
## 参考链接
```

## HTTP API

前缀 `/dsh-memory-kb/api`：

| 路由 | 说明 |
| --- | --- |
| `GET /overview` | 统计、最近条目、设置、最近沉淀/新闻 |
| `GET /entries?q=&kind=&limit=` | 条目检索 |
| `GET /entry?id=` | 单条详情（含正文/meta/路径） |
| `GET /session?id=` | 当前会话：标题、轮次、缓冲事件、任务、最近工具、目标、游标 |
| `GET /sessions` | 活跃会话列表（项目带） |
| `GET /chat/messages?id=&limit=` | 工作台聊天消息（只保留真人 user + assistant 文本/工具名） |
| `POST /chat/send` | 向当前会话发送 `{sessionId, text}`（`agent.followup`，带 `role:'user'`） |
| `GET /media/list` | 素材目录列表（图片/视频/音频） |
| `GET /media/file?path=` | 素材流式读取，支持 Range/206 |
| `POST /goal` | 保存当前会话目标 `{sessionId, goal}` |
| `POST /distill` | 手动沉淀 `{sessionId}` |
| `GET /news/items` | 最近一次抓取的新闻条目（含缩略图字段） |
| `POST /news/fetch` | 立即抓取 |
| `GET /graph?limit=` | 图谱节点/边 |
| `GET/POST /settings` | 读取/保存设置（含成本单价与日预算） |
| `POST /save-memory` | 手动新建卡片 |
| `POST /delete` | 移到 `.trash` |
| `GET /review` | 待复核条目与近重复分组 |
| `POST /review` | 审核单条/批量：action = confirm / update / reject |
| `POST /merge` | 合并重复记忆 `{keepId, dropIds}` |
| `POST /ask-memory` | 「问记忆库」`{question, sessionId?, limit?}`，返回回答与引用 |
| `GET /export-session?id=` | 导出会话 Markdown（用户/助手/工具调用/结果） |
| `POST /workspace/diff` | 工作区文件的 git diff（限制在会话 cwd 内） |
| `POST /workspace/reveal` | 在资源管理器中定位文件/目录（限制在会话 cwd 内） |

## 安装

在 DSH 项目中（或任意工作区）用 Plugin Manager 安装本地 bundle，`target` 指向本仓库里的 `dsh-memory-kb` 目录：

```
plugin_manager install_bundle
  target: <本仓库路径>/dsh-memory-kb
```

或让 DSH Agent 执行：

> 用 plugin_manager 的 install_bundle 安装 `<本仓库路径>/dsh-memory-kb`

安装后重启 DSH（Host 半边改动需要重启；纯 Client 改动可由 HMR 重载）。

手动安装：把 `dsh-memory-kb` 目录放到 `~/.dsh/profiles/<profile>/node_modules/dsh-memory-kb`（或建 junction），
在 profile 的 `package.json` 里加 `"dsh-memory-kb": "link:<绝对路径>"` 和 `dsh.profile.bundles` 条目，然后重启 DSH。
更完整的步骤见仓库根目录 `README.md`。

## 配置

在 profile 的 `cordis.patch.yml` 里按 id 覆盖（`config` 整体替换）：

```yaml
- id: dsh-memory-kb
  config:
    autoDistill: true
    autoRecall: true
    recallLimit: 3
    maxMemoriesPerTurn: 3
    newsEnabled: true
    newsIntervalHours: 6
    newsMaxItemsPerSource: 15
    provider: ''      # 留空 = 跟随当前会话
    model: ''
    memoryDir: ''     # 留空 = 自动探测
    skillsDir: ''
    pluginDir: ''
    newsSources:
      - name: Hacker News
        url: https://hnrss.org/frontpage
        category: tech
```

面板「设置」页可以改大部分选项，保存到 `$DSH_HOME/memory-kb/settings.json`，立即生效。

## 模型调用

- 优先用插件配置的 `provider`/`model`
- 否则用该会话最近一次 `request/context` 的路由
- 再否则用 `$DSH_HOME/memory-kb/state.json` 里记录的上次路由
- 最后回退到 `deepseek-account` / `deepseek-flash`

沉淀和新闻摘要都走 `ctx.llm.stream`，有 90 秒超时与 200k 字符上限。

## 已知限制

- 自动沉淀在 `turn/end` 后 2.5 秒触发；DSH 退出时未完成的队列会丢失（已沉淀的游标不会倒退）。
- 子代理会话（`delegationDepth > 0`）不单独沉淀。
- AGENT 页可向「当前会话」和「实时活跃」会话发送；项目带里点开的其它持久会话通过 `sessionQuery.readSession()` 冷读，只读展示历史，输入框会禁用。
- 🔴 恢复出来但被原生写句柄占用的会话会返回 `session/writer-held`（原生 composer 同样会失败）；AGENT 头部会给出「新建会话继续」一键入口，走原生「新建会话」按钮并切换，原会话内容保留。
- 🔴 `sessionQuery.readTitleSnapshots()` 返回的 `value.title` 是快照对象 `{ title, messageSeqs, source, eventSeq, updatedAt }`，不是字符串；直接渲染会触发 React #31。必须取 `value.title.title`。
- 🔴 `agent.followup()` 的输入**必须带 `role: 'user'`**；只传 content/source 会写出缺 role 的 user/message，重载时报 `stored session ... is corrupt`。旧的损坏事件可用 `_work/repair_sessions.mjs --fix` 修复（会加 `.repair-bak-*` 备份）。
- 素材墙只扫描一层目录，限制常见图片/视频/音频扩展名；路径解析限制在素材目录内。
- 成本面板是**估算**：默认单价按 DeepSeek V3.2（输入 ¥2 / 缓存命中 ¥0.2 / 输出 ¥3 每百万 token），可在设置里改；「今日实际」来自余额账本，不等同于本会话估算。
- 文件 diff 只对 git 工作区有效；非 git 工作区会明确提示。预览受 `workspaceFiles.read` 的分页/字节上限约束，超过 1500 行会标记截断。
- 退出 Workbench 默认保留按钮，但会先弹确认框，避免误触。
- 本机 API 带 CSRF 闸：跨站 Origin 返回 403；桌面壳 `dsh-app://`、同源 dev 页面、无 Origin 的本机客户端放行；带 Origin 的写操作必须是 `application/json`。
- 工作台内嵌审批/提问：当前主会话出现 `approval/request` 或 `ask_user_question` 时，底部会显示卡片，可直接「允许一次 / 拒绝」或提交回答；工作台关闭后由原生界面接管。
- 自动召回只在有新用户消息的步骤触发，且同一消息只召一次。
- 新闻摘要依赖模型路由可用；失败时回退为原始条目列表，并在 `state.lastNews.summaryNote` 里记录原因。
- 技能只在对话形成明确可重复流程时才生成；生成后请人工核对命令与步骤。
- 删除条目是移到 `$DSH_HOME/memory-kb/.trash/`，不会物理删除。

## 开发

Host 半边是纯 ESM JavaScript，无构建步骤；Client 半边是 `window.__ModuleLoader__` 的普通 JS 工厂。
DSH 的 client 入口是一个单模块，不能直接 `import` 相对文件，所以源码按功能拆到 `client-src/`，
由脚本拼回 `client.js`（**不要直接改 client.js**）：

```
index.js                 Host 入口：apply / 工具 / 命令 / 召回 / 沉淀调度
lib/store.js             记忆/技能/新闻的扫描、搜索、写入
lib/distill.js           转写、提示词、JSON 解析、写盘
lib/news.js              RSS/Atom 抓取与简报
lib/llm.js               ctx.llm.stream 封装与路由解析
lib/http.js              node:http(s) GET 客户端（避免 undici 问题）
lib/server.js            /dsh-memory-kb/api/* 路由
client.js                构建产物：侧栏按钮 + 全屏面板（React via require('react')）
client-src/00-theme.js   主题色板（CSS 变量与 JS 调色板的唯一来源）
client-src/10-shell.js   全局 UI 状态、桌面窗口按钮、原生标题栏颜色同步
client-src/20-core.js    基础工具、Markdown、基础控件
client-src/30-cards.js   导航、卡片、详情
client-src/40-pages.js   概览、记忆库、项目、调用状态
client-src/45-ask.js     记忆审核队列（确认/编辑/合并）+ 问记忆库 RAG
client-src/50-codeview.js 代码视图、实时事件映射、工作过程渲染、文件预览/diff
client-src/60-agent.js   会话页（项目带 + 聊天）
client-src/70-media.js   素材墙、输出风格、运行状态
client-src/75-news-graph.js 实时新闻、关系网络
client-src/80-settings.js 设置
client-src/85-right-panel.js 右侧实时信号
client-src/90-workbench.js 主容器与全部轮询/事件订阅
client-src/95-style.js   全部 CSS
client-src/99-entry.js   插件入口 apply()
scripts/build-client.mjs 拼接脚本（--check 校验产物是否最新）
```

```bash
cd dsh-memory-kb
node scripts/build-client.mjs          # 改完 client-src 后重新生成 client.js
node scripts/build-client.mjs --check  # 只检查 client.js 是否是新的
```
