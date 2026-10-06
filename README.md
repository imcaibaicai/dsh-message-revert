# dsh-message-revert

[English](README.en.md) | 简体中文

DSH 消息撤回/回滚插件：**每条已发送消息悬停时出现撤回按钮**；确认后把该消息的文本与图片/文件原样填回输入框，会话回滚到该步骤之前（fork 到最近一个已完成回合，或对首条消息回到新会话首屏），并把工作区文件还原到该消息之前的内容。宿主引擎 + 浏览器 UI，纯插件实现，不改核心、不动官方任何文件。

## 功能

| 功能 | 说明 |
|---|---|
| 撤回按钮 | 每条用户消息行的操作条上悬停出现（首条消息运行时也有兜底悬停条） |
| 确认对话框 | 列出该步骤之前改动过的文件（`＋` 新建 / `●` 修改），未检测到更改会明说 |
| 文本回填 | 消息原文回到输入框（优先走官方 `conversation.input.shell` 的 `setDraft`，失败回退 Lexical DOM 注入） |
| 附件回填 | 图片/文件附件重新创建草稿并挂回输入框（官方 `createDrafts` + `addAttachments` + `rebindDraftFiles`） |
| 会话回滚 | 非首条：fork 到**严格早于该消息的最后一个已完成回合**；首条：新建绑定原工作区的空白会话（模型/模式/权限全部继承） |
| 文件还原 | 宿主在每次 `write`/`edit` 工具调用**执行前**捕获文件全文，撤回时按序还原（新建的删除、修改的复原） |
| 工作区继承 | 新会话绑定原工作区，composer 可编辑、模型/模式/权限不丢 |
| 诊断通道 | 失败时把观察到的快照形状写进 `~/.dsh/dsh-revert/diag.log` 并在弹窗显示，可事后定位 |

## 安全设计（为什么可以放心用）

1. **只有能证明是该会话第一次往返才允许清空**：seq 必须是数字、是最早一条用户消息、之前没有已完成回合、之前的 `turn/start` ≤ 1 个——其余一律 fork；任何歧义直接报错，**绝不猜**。
2. **fork 后归档前二次校验**：重新读子会话日志，早于目标消息的用户消息数必须 ≥ 预期值，否则**不归档原会话**并 toast 告知。
3. **RPC 同源校验**：`/dsh-revert/rpc` 的每个 POST 都校验 `Origin` 与请求 `Host` 一致（无 Origin 的 curl/服务端请求放行），恶意网页无法借浏览器触发文件还原。
4. **只还原被捕获过的文件**：没捕获到 before 状态的文件不会被碰。

## 安装

```bash
dsh plugin --profile web add -w dsh-message-revert
```

手动等价方式：包放到 `<DSH_HOME>/profiles/node_modules/dsh-message-revert/`，在 `cordis.patch.yml` 加一条：

```yaml
- insert:
    - id: dsh-revert
      name: 'dsh-message-revert'
```

宿主插件在 DSH 启动时加载，**装完必须完全退出并重启 DeepSeek Harness**，会话页强刷。

## 卸载

删 `cordis.patch.yml` 里的插入行 + 删包目录，重启即可。已捕获的 before 快照保留在 `~/.dsh/dsh-revert/`，不随卸载删除。

## 实现要点

- **宿主半包**（`lib/index.js`）：`tool/call` 时捕获 `write`/`edit` 目标文件全文（sha256 去重存 blob，按 session 落 `<DSH_HOME>/dsh-revert/<session>.json`）；复刻官方 `scanZstdFrames()` 逐帧解压多帧 zstd 会话日志（Node 原生 API 只解第一帧），按 `source.kind === "user"` 取真人消息与 seq；读工作区注册表解析 `workspaceId`；web RPC 五个动作（status / preview / execute / diag / user-messages / workspace-for-session）。
- **浏览器半包**（`lib/client.js`）：MutationObserver 在用户消息行动作条挂按钮；宿主日志为主源、客户端快照为兜底（多形状按 seq 去重）；`decideReset` 三态决策（reset / fork / error）；草稿回填带 45×150ms 重试与完成标志分离。
- **数据兼容**：HTTP 路由 `/dsh-revert` 与数据目录 `~/.dsh/dsh-revert/` 沿用旧名，升级不改路径、不丢已捕获的快照。

## 已知边界

- 只对插件安装后发生的 `write`/`edit` 调用有 before 快照；更早的改动撤不回（确认框会显示"未检测到该步骤之前的文件更改"）。
- 依赖官方内部 DOM 标记（`[data-chat-flow-kind=user]`、`[data-chat-flow-key]`、`[data-composer-input]`）与服务面（`sessions.fork` / `conversation.input.shell` / `workspaces.archiveSession`）；DSH 升级后若失效，先核对这些契约。
- 实测于 DeepSeek Harness `0.1.5-rc.1`（web profile）；`sessions.create({ workspaceId })` 是 0.1.5 建空白会话的正解，新版动词（`connectWorkspace` / `startSession`）存在时也会优先使用。

## 更新记录

### 1.0.3（2026-10-06）

- **修复「同一回合内的纠错消息撤不回 / 撤回即丢一整段」**：之前的切点算法只在 `turn/end` 上分叉，撤回第 2 回合中途发送的跟进消息时会把整段回合丢回上一个回合，触发"安全检查未通过"并阻止归档。现在改为**按会话真实拓扑选切点**：
  - **回合起始消息**（该消息是所在回合的第一条提问）→ 切到**上一个已完成回合的结尾**，整段撤回当前回合；
  - **回合中途跟进 / steer 消息** → 切到**该消息前最近一个已完成 `step/end`**，只剔除这条消息及其后的操作，同回合早于它的内容和成果全部保留；
  - **会话首条消息** → 依然只有在能证明是首次往返时才允许重置到空白会话，其余一律 fork；任何歧义直接报错，绝不猜。
- **修复归档阻塞**：切点精确后，fork 出的子会话完整保留早于被撤回消息的全部用户消息；同时给子会话日志读取加了**缓存穿透**，避免轮询读到 3 秒内的空缓存而误判，也修掉了"安全检查未通过"的 toast 一闪而过（页面已跳转）导致看不到原因的问题。
- **执行时序更稳**：确认撤回时先 `stopIfRunning()` 停止仍在运行的回合，再还原文件，避免还原写盘与 Agent 写盘竞争。
- **目标消息定位更稳**：`data-chat-flow-key` 渲染延迟或缺失时，改用在 DOM 上实时重读的键 + **文本兜底匹配**，不再退化到"最后一条消息"。
- 宿主 `readUserMessages` 额外返回 `stepEnds`，为回合内精细切点提供锚点。

### 1.0.2（此前未发布，随本次一并合入）

- 撤回后**图片 / 文件附件原样回填**（宿主新增附件直读端点 `/dsh-revert/attachment`，支持二进制流；`createDrafts` + `addAttachments` + `rebindDraftFiles` 挂回输入框）。
- 声明 DSH `0.2.0` peer 兼容，注入列表补上 `@deepseek-ai/dsh-client-ui-workspace`。

## License

MIT
