# DSH Memory KB · Workbench

> 给 **DeepSeek Harness** 的长期记忆与可视化工作台插件：对话自动沉淀、自动召回、技能生成、RSS 新闻、记忆审核、问记忆库、成本估算、会话导出和代码文件预览。

这是一个本地优先的 DSH 插件。记忆、技能、新闻和状态都保存在你自己的机器上；插件不会把记忆上传到第三方服务。模型调用仍走你当前 DSH 会话配置的 DeepSeek 账号。

> ⚠️ 这是社区插件，不是 DeepSeek 官方项目。它依赖 DSH 的插件/客户端内部接口，DSH 大版本升级后可能需要适配。

## 功能

| 模块 | 能做什么 |
| --- | --- |
| 自动沉淀 | 每轮对话结束后，用当前模型提炼稳定事实、决策、偏好、项目进展，写入 Markdown 记忆并更新 `INDEX.md` |
| 自动召回 | 新消息到达时检索相关记忆，把 `[记忆召回]` 背景块注入当前步骤；无关内容可忽略 |
| 技能生成 | 从对话中识别可重复流程，生成 `SKILL.md`，DSH 会自动发现 |
| 实时新闻 | 定时抓取 RSS/Atom，生成中文简报；支持缩略图、双栏阅读 |
| Workbench | 全屏工作台：会话、记忆库、调用状态、输出模型、运行状态、实时新闻、进度与计划、关系网络、总览、设置 |
| AGENT | 项目带 + 会话导航 + 工作台内聊天；附件（选择/粘贴/拖拽）、`@ 文件`、`/ 指令`、流式输出、可展开工具结果 |
| 审批/提问 | 当前会话出现审批或 `ask_user_question` 时，底部直接显示审批卡/提问卡，无需退出工作台 |
| 记忆审核 | 待复核队列：单条/批量确认、编辑标题与结论、删除；按相似度找近重复并合并 |
| 问记忆库 | 检索 Top N 记忆/知识/技能/新闻，由当前模型基于资料回答，并给出 `[n]` 引用 |
| 成本估算 | 本会话、每轮、今日实际（独立账本）金额；单价和日预算可配置 |
| 会话导出 | 把当前/历史会话导出为 Markdown（用户、助手、工具调用、工具结果、命令） |
| 代码视图 | 工作区文件树、工作过程时间线、文件只读预览、git diff、资源管理器定位 |
| 独立记账 | 每 60 秒观测余额，记录今日消费；不依赖小鲸鱼账本 |

## 环境要求

- Windows 10/11（桌面版验证环境）
- DeepSeek Harness 桌面版：**v44.7.0 / `@deepseek-ai/dsh-desktop 0.2.1-rc.2` 实测通过**
- Node.js 22+（仅开发/运行测试需要；桌面版使用自带的 Electron Node）
- 一个可用的 DeepSeek 账号或 API 配置（用于沉淀、新闻摘要、问记忆库）

> 插件使用 DSH 的 `clientSession`、`uiSession`、`workspaceFiles`、`remote.fileReferences`、`remote.commands`、`ctx.llm` 等接口。其他 DSH 版本可能正常，也可能需要小改。

## 安装

### 方式 A：用 DSH 的 Plugin Manager（推荐）

1. 克隆本仓库到本地，例如：

   ```powershell
   git clone https://github.com/luckyunhao/dsh-memory-wbh.git D:\dsh-memory-kb
   ```

2. 在 DSH 里对 Agent 说：

   > 用 plugin_manager 的 install_bundle 安装 `D:\dsh-memory-kb\dsh-memory-kb`

   或直接调用 Plugin Manager：

   ```
   plugin_manager install_bundle
     target: D:\dsh-memory-kb\dsh-memory-kb
   ```

3. 重启 DeepSeek Harness。

### 方式 B：手动装到 profile

适合想自己控制安装位置的情况。以 `desktop` profile 为例：

1. **关闭 DSH**，备份 `%USERPROFILE%\.dsh\profiles\desktop\package.json`。
2. 克隆仓库到 `D:\dsh-memory-kb`。
3. 在 profile 的 `package.json` 里加依赖和 bundle：

   ```json
   {
     "dependencies": {
       "dsh-memory-kb": "link:D:/dsh-memory-kb/dsh-memory-kb"
     },
     "dsh": {
       "profile": {
         "bundles": [
           "@deepseek-ai/dsh-base",
           "@deepseek-ai/dsh-web-app",
           "dsh-memory-kb"
         ]
       }
     }
   }
   ```

   保留你原来的其它依赖和 bundles，只追加 `dsh-memory-kb`。

4. 建立 junction（Windows PowerShell）：

   ```powershell
   New-Item -ItemType Junction `
     -Path "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-memory-kb" `
     -Target "D:\dsh-memory-kb\dsh-memory-kb"
   ```

5. 重启 DSH。左侧栏底部会出现「记忆库」，工作台默认铺满窗口。

> `link:` + junction 是开发/本地安装的推荐组合；`file:` 在 pnpm 下可能复制源码，改代码后不会自动生效。

## 第一次使用

1. 打开 DSH 后，点左侧栏底部「记忆库」进入 Workbench。
2. 先发几轮对话，让插件自动沉淀记忆；也可以在「记忆库 → 待复核」里确认自动生成的条目。
3. 右侧栏可切换模型、权限、查看用量和账户；「运行状态」里能看到成本估算。
4. 工作台默认全屏，左下角「退出 Workbench」会先弹确认框，再回到原生界面。

### 设置

在「设置」页可以调整：

- 自动沉淀 / 自动召回开关、召回条数、每轮最多沉淀条数
- 新闻抓取开关、间隔、每个源最多条数、RSS 源
- 模型路由（留空 = 跟随当前会话）
- 成本单价（元/百万 token）和日预算（0 = 不提醒）
- 记忆/技能/插件状态目录

也可以直接改 profile 的 `cordis.patch.yml`：

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
    provider: ''
    model: ''
```

## 数据与隐私

- 记忆根目录自动探测：工作区 `memory/`（存在 `INDEX.md`/`entries` 时）→ `D:/DeepSeekHarness/memory` → `$DSH_HOME/memory`
- 技能：`$DSH_HOME/skills`
- 插件状态：`$DSH_HOME/memory-kb`（设置、账本、回收站、新闻缓存）
- 素材目录默认：`$DSH_HOME/memory-kb/media`
- 写入记忆前会做凭据脱敏（API Key、token、密码等模式）
- 本机 HTTP API 只监听 loopback，并带 CSRF/Origin 校验；工作台通过同源页面访问
- 删除记忆是移到 `.trash`，不会物理删除
- 文件预览/资源管理器定位限制在当前会话工作区内

## 已知限制

- 自动沉淀在 `turn/end` 后约 2.5 秒触发；DSH 退出时未完成的队列会丢失（已沉淀的游标不会倒退）。
- 子代理会话不单独沉淀。
- 恢复出来但被原生写句柄占用的会话会返回 `session/writer-held`；请用「+ 新会话」继续。
- 成本面板是估算：默认单价按 DeepSeek V3.2（输入 ¥2 / 缓存命中 ¥0.2 / 输出 ¥3 每百万 token），模型不同请在设置里改；「今日实际」来自余额账本，不等于本会话估算。
- 文件 diff 只对 git 工作区有效；资源管理器定位目前只支持 Windows。
- 新闻摘要依赖模型路由和网络；失败时会回退为原始条目列表。
- 素材墙只扫描一层目录，支持常见图片/视频/音频扩展名。
- Workbench 依赖 DSH 的客户端服务接口；DSH 升级后如果页面打不开，先检查插件是否仍需适配。

## 开发

```bash
# 无需安装运行时依赖
npm test                 # 6 套测试（news 测试会访问真实 RSS）
npm run build:client     # 修改 client-src 后重新生成 client.js
npm run check:client     # 校验 client.js 是否最新
```

目录：

```
dsh-memory-kb/
  index.js               Host 入口：apply / 工具 / 命令 / 召回 / 沉淀调度 / HTTP API
  lib/                   store、distill、news、llm、http、account、server
  client-src/            Client 源码（按功能拆分，构建时拼接）
  client.js              构建产物（不要直接手改）
  scripts/build-client.mjs
  test/                  6 套 Node 脚本（store/pipeline/apply/news/api/regressions）
  cordis.patch.yml       DSH bundle 配置
```

开发时修改 `client-src/*.js`，然后：

```powershell
cd dsh-memory-kb
node scripts/build-client.mjs
```

重启桌面版加载 Host 改动；纯 Client 改动有时可由 HMR 重载。

## 常见问题

**看不到「记忆库」按钮？**
确认 profile 的 `package.json` 里有 `dsh-memory-kb` 依赖和 bundle，`node_modules/dsh-memory-kb` 指向源码目录，然后重启 DSH。

**插件服务未连接？**
访问 `http://127.0.0.1:<端口>/dsh-memory-kb/api/health` 需要 DSH 的鉴权 Cookie；从工作台右上角状态灯看更直接。检查 DSH 主进程是否正常。

**桌面版卡在 `Loading plugins…`？**
先确认不装本插件时 DSH 能否启动；这是 DSH 桌面壳自身的问题。若你反复启动桌面版，可清理 `%APPDATA%\@deepseek-ai\dsh-desktop\Network\Cookies` 里 `127.0.0.1` 的旧 `dsh-auth-*` Cookie（先备份）。

**发送时提示 `session/writer-held`？**
该会话被原生写句柄占用，点「+ 新会话」继续；原会话内容不会丢。

**`client.js is stale`？**
运行 `npm run build:client`，再重启 DSH。

## License

MIT。详见 [LICENSE](./LICENSE)。
