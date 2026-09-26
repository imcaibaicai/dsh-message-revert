window.__ModuleLoader__.load({
	id: "dsh-message-revert",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		// #region styles
		const css = `
.dsh-revert-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:6px;border:none;border-radius:28px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background-color .15s ease,color .15s ease;box-sizing:border-box}
.dsh-revert-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.dsh-revert-btn svg{width:15px;height:15px;fill:none;stroke:currentColor}
[data-chat-flow-kind=user] .dsh-revert-btn{opacity:0;transition:opacity .15s ease}
[data-chat-flow-kind=user]:hover .dsh-revert-btn{opacity:1}
.dsh-revert-fallback{display:inline-flex;align-items:center;gap:4px;opacity:0;transition:opacity .15s ease}
[data-chat-flow-kind=user]:hover .dsh-revert-fallback{opacity:1}
.dsh-revert-overlay{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}
.dsh-revert-modal{width:min(520px,calc(100vw - 48px));background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l3);border-radius:14px;box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);padding:18px;font-size:14px;line-height:22px;box-sizing:border-box;max-height:70vh;overflow:auto}
.dsh-revert-modal h3{font-size:16px;margin:0 0 8px;font-weight:600}
.dsh-revert-sub{color:var(--dsw-alias-label-secondary);margin:4px 0 0}
.dsh-revert-files{margin:10px 0;padding:8px 12px;background:var(--dsw-alias-interactive-bg-hover);border-radius:8px;max-height:220px;overflow:auto;font-size:12.5px;line-height:20px}
.dsh-revert-file{display:flex;gap:6px;padding:1px 0;color:var(--dsw-alias-label-secondary)}
.dsh-revert-file code{color:var(--dsw-alias-label-primary);word-break:break-all}
.dsh-revert-actions{display:flex;gap:10px;margin-top:16px;justify-content:flex-end}
.dsh-revert-btn-primary,.dsh-revert-btn-cancel{border-radius:8px;cursor:pointer;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;line-height:20px}
.dsh-revert-btn-primary{border:1px solid var(--dsw-state-business-primary);background:var(--dsw-state-business-primary);color:#fff}
.dsh-revert-btn-primary:hover{filter:brightness(1.06)}
.dsh-revert-btn-cancel{border:1px solid var(--dsw-alias-border-l3);background:transparent;color:var(--dsw-alias-label-secondary)}
.dsh-revert-btn-cancel:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-revert-loading{color:var(--dsw-alias-label-tertiary);font-size:12.5px;margin:8px 0}
.dsh-revert-empty{color:var(--dsw-alias-label-tertiary);font-size:12.5px;margin:6px 0}
.dsh-revert-toast{position:fixed;left:50%;bottom:132px;transform:translateX(-50%);z-index:2147483500;max-width:min(520px,calc(100vw - 48px));background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l3);border-radius:10px;box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;padding:10px 14px}
.dsh-revert-diag{margin-top:10px;font-size:11.5px;line-height:18px;color:var(--dsw-alias-label-tertiary);word-break:break-all;white-space:pre-wrap}
`;
		const styleTagId = "dsh-message-revert/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(styleTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-message-revert";
			tag.dataset.pluginCss = styleTagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		// #endregion
		// #region app state
		let ctx_sessions = null;
		let workspacesService = null;
		let conversationService = null;
		let rootCtx = null;
		const logCache = new Map();
		// #endregion
		// #region helpers
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		const asSeq = (v) => (typeof v === "number" && isFinite(v) ? v : void 0);
		function conversation() {
			if (conversationService) return conversationService;
			if (rootCtx && typeof rootCtx.get === "function") {
				try {
					conversationService = rootCtx.get("conversation") || null;
				} catch (e) {}
			}
			return conversationService;
		}
		// `conversation` is a root service this plugin deliberately does not
		// declare as a cordis dependency (a missing dependency would refuse to
		// activate the whole plugin), so ctx.get may not resolve it. The path
		// ui-conversation's own docks use is the session scope.
		function conversationFor(sessionId) {
			const direct = conversation();
			if (direct) return direct;
			if (ctx_sessions && sessionId && typeof ctx_sessions.scope === "function") {
				try {
					const actx = ctx_sessions.scope(sessionId);
					if (actx && typeof actx.get === "function") {
						const c = actx.get("conversation");
						if (c) { conversationService = c; return c; }
					}
				} catch (e) {}
			}
			return null;
		}
		function getCurrentSessionId() {
			if (ctx_sessions && ctx_sessions.list && typeof ctx_sessions.list.getSnapshot === "function") {
				const s = ctx_sessions.list.getSnapshot();
				return s && s.current;
			}
			return void 0;
		}
		function bindingOf(sessionId) {
			if (!ctx_sessions || !sessionId) return void 0;
			try {
				return ctx_sessions.binding(sessionId);
			} catch (e) {
				return void 0;
			}
		}
		function snapshotOf(sessionId) {
			const b = bindingOf(sessionId);
			if (!b || !b.session) return void 0;
			try {
				return b.session.getSnapshot();
			} catch (e) {
				return void 0;
			}
		}
		// ------------------------------------------------------------------
		// Conversation-node reading.
		//
		// PRIMARY source is the durable session log, read host-side (see
		// lib/index.js `user-messages`). The client-side snapshot is only a
		// fallback: its `chat` target is populated solely once a view builder
		// registers for "chat", and `nodes` / `turnEnds` are derived from it —
		// so on a tree where that never happened they read as empty.
		// ------------------------------------------------------------------
		function seqOfNode(node) {
			if (!node) return void 0;
			return asSeq(node.seq) ?? asSeq(node.anchorSeq) ?? asSeq(node.data && node.data.seq) ?? asSeq(node.data && node.data.anchorSeq);
		}
		function kindOfNode(node) {
			if (!node) return "?";
			return String(node.kind || (node.data && node.data.kind) || "?");
		}
		function contentOfNode(node) {
			if (!node) return [];
			if (Array.isArray(node.content)) return node.content;
			if (node.data && Array.isArray(node.data.content)) return node.data.content;
			return [];
		}
		function sourceOfNode(node) {
			if (!node) return void 0;
			return node.source || (node.data && node.data.source) || void 0;
		}
		// A message the human actually typed. Injected user-role events
		// (AGENTS.md instructions, plugin runtime snapshots) share role "user"
		// on the wire but carry a non-"user" source kind, so source is the
		// authoritative discriminator — kind alone is not.
		function isUserMessageNode(node) {
			if (!node) return false;
			const k = kindOfNode(node);
			if (k === "user" || k === "steering") return true;
			const s = sourceOfNode(node);
			return !!(s && typeof s === "object" && s.kind === "user");
		}
		function collectNodes(snap) {
			const out = [];
			const seen = new Set();
			const push = (n) => {
				if (!n || typeof n !== "object") return;
				const seq = seqOfNode(n);
				const id = seq === void 0 ? "key:" + String(n.key) : "seq:" + seq;
				if (seen.has(id)) return;
				seen.add(id);
				out.push(n);
			};
			try {
				const store = snap && snap.chat && snap.chat.nodes;
				if (store && typeof store.values === "function") {
					const vals = store.values();
					if (Array.isArray(vals)) vals.forEach(push);
					else if (vals && typeof vals.forEach === "function") vals.forEach(push);
				}
			} catch (e) {}
			try {
				if (Array.isArray(snap && snap.nodes)) snap.nodes.forEach(push);
				const legacy = snap && snap.chat && snap.chat.legacy;
				if (legacy && Array.isArray(legacy.nodes)) legacy.nodes.forEach(push);
			} catch (e) {}
			return out;
		}
		// `turnEnds` is typed as a Map but has shipped as a plain object and as
		// an array in different builds; accept all three rather than silently
		// reading nothing.
		function turnEndSeqs(snap) {
			const out = [];
			const push = (v) => { const s = asSeq(v); if (s !== void 0) out.push(s); };
			const sources = [];
			try { if (snap && snap.turnEnds) sources.push(snap.turnEnds); } catch (e) {}
			try {
				const legacy = snap && snap.chat && snap.chat.legacy;
				if (legacy && legacy.turnEnds) sources.push(legacy.turnEnds);
			} catch (e) {}
			for (const m of sources) {
				if (!m) continue;
				if (typeof m.forEach === "function") m.forEach(push);
				else if (Array.isArray(m)) m.forEach(push);
				else if (typeof m === "object") Object.keys(m).forEach((k) => push(m[k]));
			}
			return out;
		}
		// `data-chat-flow-key` is `${kind.length}:${kind}${id}` — the message id
		// is what survives into it, so that is how we match a DOM row back to a
		// durable event.
		function domKeyToId(domKey) {
			if (!domKey) return null;
			const m = String(domKey).match(/^(\d+):/);
			if (!m) return null;
			const kindLen = parseInt(m[1], 10);
			if (!(kindLen > 0)) return null;
			const rest = String(domKey).slice(m[0].length);
			if (rest.length <= kindLen) return null;
			return rest.slice(kindLen);
		}
		async function fetchUserMessages(sessionId) {
			const cached = logCache.get(sessionId);
			if (cached && Date.now() - cached.at < 3000) return cached.value;
			let value = null;
			try {
				const res = await callRpc("user-messages", { sessionId });
				if (res && res.ok) value = res;
			} catch (e) {}
			logCache.set(sessionId, { at: Date.now(), value });
			return value;
		}
		// Read back one user message: text, image refs, file refs, event seq,
		// every user-message seq in the log, and the turn/end seqs (the only
		// valid fork anchors). `diag` records what was actually observed so a
		// failure can be diagnosed from the log instead of guessed at.
		async function extractUserMeta(sessionId, domKey) {
			const out = { text: "", seq: void 0, images: [], files: [], isFirstUser: false, userSeqs: [], turnEnds: [], turnStarts: [], hasMore: false, diag: {} };
			const snap = snapshotOf(sessionId);
			const log = await fetchUserMessages(sessionId);
			const users = [];
			const seenSeq = new Set();
			const pushUser = (u) => {
				if (!u || typeof u !== "object") return;
				const s = asSeq(u.seq);
				if (s === void 0) return;
				if (seenSeq.has(s)) return;
				seenSeq.add(s);
				users.push(u);
			};
			// 1) durable log (host-side) — the authoritative source
			if (log && log.ok && Array.isArray(log.users)) for (const u of log.users) pushUser(u);
			// 2) snapshot nodes — fallback for a tree whose log read failed
			if (users.length === 0) {
				for (const n of collectNodes(snap)) {
					if (!isUserMessageNode(n)) continue;
					const content = contentOfNode(n);
					const texts = [];
					const images = [];
					const files = [];
					for (const b of content) {
						if (!b) continue;
						if (b.type === "text" && typeof b.text === "string") texts.push(b.text);
						else if (b.type === "image" && b.attachment) images.push(b.attachment);
						else if (b.type === "file" && b.attachment) files.push(b.attachment);
					}
					pushUser({ seq: seqOfNode(n), id: n.id, text: texts.join(""), images, files });
				}
			}
			const userSeqs = [];
			for (const u of users) if (typeof u.seq === "number") userSeqs.push(u.seq);
			userSeqs.sort((a, b) => a - b);
			const turnEnds = log && Array.isArray(log.turnEnds) ? log.turnEnds.slice().sort((a, b) => a - b) : turnEndSeqs(snap);
			const turnStarts = log && Array.isArray(log.turnStarts) ? log.turnStarts.slice().sort((a, b) => a - b) : [];
			out.userSeqs = userSeqs;
			out.turnEnds = turnEnds;
			out.turnStarts = turnStarts;
			out.hasMore = snap ? snap.hasMore === true : false;
			const domId = domKeyToId(domKey);
			out.diag = {
				stage: "extract",
				sessionId,
				domKey: domKey === void 0 ? null : domKey,
				domId,
				logOk: !!(log && log.ok),
				logError: log && log.ok === false ? log.error : void 0,
				userCount: users.length,
				userSeqs,
				turnEnds,
				turnStarts,
				hasMore: out.hasMore,
				openState: snap ? snap.openState : void 0,
				blank: snap ? snap.blank : void 0,
				running: snap ? snap.running : void 0,
				snapshotNodeCount: collectNodes(snap).length
			};
			let target = void 0;
			if (domId) target = users.filter((u) => u.id === domId)[0];
			if (!target && users.length === 1) target = users[0];
			if (!target && users.length > 1) target = users[users.length - 1];
			if (!target) {
				out.diag.targetFound = false;
				return out;
			}
			out.diag.targetFound = true;
			out.diag.targetSeq = target.seq;
			out.text = target.text || "";
			out.seq = target.seq;
			out.images = target.images || [];
			out.files = target.files || [];
			out.isFirstUser = typeof out.seq === "number" && userSeqs.length > 0 && out.seq === userSeqs[0];
			return out;
		}
		// DSH's fork keeps the WHOLE turn containing the anchor, so the cut has
		// to land on the last completed turn/end STRICTLY BEFORE the message.
		// A result of 0 means there is no such anchor — fork is impossible.
		function cutSeqFrom(turnEnds, afterSeq) {
			if (typeof afterSeq !== "number") return 0;
			let cut = 0;
			for (const s of turnEnds || []) if (s < afterSeq && s > cut) cut = s;
			return cut;
		}
		// Decide how to land the revert:
		//   reset — go back to a blank new-session screen (what a first message
		//           needs: fork can never produce an empty session)
		//   fork  — cut at the last completed turn before this message
		//   error — genuinely ambiguous, refuse instead of guessing
		// ------------------------------------------------------------------
		// Where to land the revert.
		//
		// `reset` (blank new-session screen) is ONLY allowed when the message is
		// provably the first exchange of the session. Everything else forks at
		// the last completed turn before it, and anything ambiguous refuses —
		// silently wiping a long conversation is the one outcome we must never
		// produce.
		// ------------------------------------------------------------------
		function decideReset(meta) {
			const seq = typeof meta.seq === "number" ? meta.seq : void 0;
			const userSeqs = Array.isArray(meta.userSeqs) ? meta.userSeqs.slice().sort((a, b) => a - b) : [];
			const turnEnds = Array.isArray(meta.turnEnds) ? meta.turnEnds.slice().sort((a, b) => a - b) : [];
			const turnStarts = Array.isArray(meta.turnStarts) ? meta.turnStarts.slice().sort((a, b) => a - b) : [];
			const isEarliestUser = seq !== void 0 && userSeqs.length > 0 && seq === userSeqs[0];
			// Completed turns strictly before this message, and turn openings
			// strictly before it (a first message has exactly one: its own).
			const earlierTurnEnds = seq === void 0 ? [] : turnEnds.filter((s) => s < seq);
			const earlierTurnStarts = seq === void 0 ? [] : turnStarts.filter((s) => s < seq);
			const cut = earlierTurnEnds.length > 0 ? earlierTurnEnds[earlierTurnEnds.length - 1] : 0;

			// Could not read the message back at all -> refuse. Guessing here is
			// what would wipe a conversation.
			if (seq === void 0) {
				return { mode: "error", reason: "无法读取该消息在会话中的位置，已中止（未做任何改动）" };
			}
			// Provably the first exchange: no earlier user message, no completed
			// turn before it, and at most the one turn opening that carries it.
			if (isEarliestUser && earlierTurnEnds.length === 0 && earlierTurnStarts.length <= 1) {
				return { mode: "reset", reason: "first-message", cut: 0 };
			}
			// Not the first message, but no anchor to fork at: the earlier
			// history is not loaded. Refuse rather than drop it.
			if (cut === 0) {
				return { mode: "error", reason: "无法定位安全的撤回点（更早的历史未载入，请先向上滚动加载）" };
			}
			return { mode: "fork", cut };
		}
		// Stop a running turn before cutting: a running session cannot be forked,
		// and an archived session must not keep writing.
		async function waitForIdle(sessionId, timeoutMs) {
			const deadline = Date.now() + (timeoutMs || 12000);
			while (Date.now() < deadline) {
				const snap = snapshotOf(sessionId);
				if (!snap || !snap.running) return true;
				await sleep(150);
			}
			const snap = snapshotOf(sessionId);
			return !snap || !snap.running;
		}
		async function stopIfRunning(sessionId) {
			const snap = snapshotOf(sessionId);
			if (!snap || !snap.running) return true;
			const b = bindingOf(sessionId);
			if (b && b.session && typeof b.session.cancel === "function") {
				try {
					await b.session.cancel();
				} catch (e) {}
			}
			return await waitForIdle(sessionId, 12000);
		}
		async function loadAttachmentFiles(sessionId, refs) {
			const files = [];
			const b = bindingOf(sessionId);
			if (!b || !b.session || !refs || refs.length === 0) return files;
			for (const ref of refs) {
				try {
					const id = ref && (ref.attachmentId || ref.id);
					if (!id) continue;
					const res = await b.session.readAttachment(id);
					const value = res && res.ok ? res.value : void 0;
					if (!value || !value.data) continue;
					const resolved = value.attachment || {};
					const mediaType = ref.mediaType || resolved.mediaType || "application/octet-stream";
					const name = ref.name || resolved.name || ("attachment-" + (files.length + 1));
					const blob = new Blob([value.data], { type: mediaType });
					files.push(new File([blob], name, { type: mediaType }));
				} catch (e) {}
			}
			return files;
		}
		function shellOf(sessionId) {
			const c = conversationFor(sessionId);
			if (!c || !c.input || typeof c.input.shell !== "function") return null;
			try {
				return c.input.shell(sessionId);
			} catch (e) {
				return null;
			}
		}
		// Fallback when the input shell is unreachable: seed the composer's own
		// Lexical instance directly (its root element carries `__lexicalEditor`).
		function composerEditor() {
			const roots = document.querySelectorAll("[data-composer-input]");
			for (const el of roots) {
				if (el.offsetParent === null) continue;
				if (el.__lexicalEditor) return el.__lexicalEditor;
			}
			const any = document.querySelectorAll("[contenteditable='true']");
			for (const el of any) {
				if (el.offsetParent === null) continue;
				if (el.__lexicalEditor) return el.__lexicalEditor;
			}
			return null;
		}
		function setDraftViaDom(text) {
			if (!text) return false;
			const ed = composerEditor();
			if (!ed || typeof ed.parseEditorState !== "function") return false;
			const lines = String(text).replace(/\r\n/g, "\n").split("\n");
			const json = {
				root: {
					children: lines.map((line) => ({
						children: [{ detail: 0, format: 0, mode: "normal", style: "", text: line, type: "text", version: 1 }],
						direction: null,
						format: "",
						indent: 0,
						type: "paragraph",
						version: 1,
						textFormat: 0,
						textStyle: ""
					})),
					direction: null,
					format: "",
					type: "root",
					version: 1
				}
			};
			try {
				ed.setEditorState(ed.parseEditorState(json));
				if (typeof ed.focus === "function") ed.focus();
				return true;
			} catch (e) {
				return false;
			}
		}
		function notify(message) {
			if (typeof document === "undefined") return;
			if (document.querySelector(".dsh-revert-toast")) return;
			const toast = document.createElement("div");
			toast.className = "dsh-revert-toast";
			toast.textContent = message;
			document.body.appendChild(toast);
			setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4500);
		}
		// Is the composer actually editable right now? A blank session with no
		// workspace renders the composer INERT (null editor) — writing a draft
		// into it silently does nothing, which is exactly the "text never came
		// back" symptom.
		function composerState() {
			if (typeof document === "undefined") return { present: false, editable: false };
			const els = document.querySelectorAll("[data-composer-input]");
			for (const el of els) {
				if (el.offsetParent === null) continue;
				return {
					present: true,
					editable: el.getAttribute("contenteditable") === "true" || el.isContentEditable === true,
					placeholder: el.getAttribute("data-placeholder") || el.getAttribute("placeholder") || null
				};
			}
			return { present: false, editable: false };
		}
		function restoreDraft(sessionId, text, files) {
			let textDone = !text;
			let filesDone = !files || files.length === 0;
			const tries = (n) => {
				const shell = shellOf(sessionId);
				const c = conversationFor(sessionId);
				const state = composerState();
				if (!textDone) {
					try {
						if (shell && typeof shell.setDraft === "function") {
							shell.setDraft(text);
							textDone = true;
						}
					} catch (e) {}
					if (!textDone && setDraftViaDom(text)) textDone = true;
				}
				if (!filesDone) {
					try {
						if (shell && c && typeof c.createDrafts === "function" && typeof shell.addAttachments === "function") {
							const drafts = c.createDrafts(sessionId, files);
							const ids = drafts.map((d) => d.id);
							if (shell.addAttachments(ids) !== false) {
								if (typeof c.rebindDraftFiles === "function") c.rebindDraftFiles(sessionId, ids);
								filesDone = true;
							} else if (typeof c.releaseDraftAttachments === "function") {
								c.releaseDraftAttachments(drafts);
							}
						}
					} catch (e) {}
				}
				if (textDone && filesDone) return;
				if (n <= 0) {
					reportDiag({
						stage: "restore-failed",
						sessionId,
						textDone,
						filesDone,
						textLength: text ? text.length : 0,
						fileCount: files ? files.length : 0,
						hasShell: !!shell,
						hasConversation: !!c,
						composer: state
					});
					if (!textDone) notify("已撤回，但消息文本未能自动填回输入框");
					if (!filesDone) notify("已撤回，但附件未能自动填回输入框");
					return;
				}
				setTimeout(() => tries(n - 1), 150);
			};
			setTimeout(() => tries(45), 150);
		}
		// Wait until the current session stops being `fromId` (the New Session
		// flow is fire-and-forget: it resolves the workspace and opens the
		// resulting session asynchronously).
		async function waitForCurrentChange(fromId, timeoutMs) {
			const deadline = Date.now() + (timeoutMs || 10000);
			while (Date.now() < deadline) {
				await sleep(120);
				try {
					const s = ctx_sessions.list.getSnapshot();
					const cur = s && s.current;
					if (cur && cur !== fromId) return cur;
				} catch (e) {}
			}
			return void 0;
		}
		// Which workspace owns this session? Host registry first (it is the
		// durable source), then the workspaces service's own list mirror.
		async function resolveWorkspaceId(sessionId, cwd, diag) {
			diag = diag || {};
			try {
				const res = await callRpc("workspace-for-session", { sessionId });
				if (res && res.ok && res.workspaceId) {
					diag.registryWs = res.workspaceId;
					return res.workspaceId;
				}
				diag.registryErr = res && res.ok === false ? res.error : "no workspace";
			} catch (e) { diag.registryErr = String(e && e.message); }
			if (workspacesService && workspacesService.list && typeof workspacesService.list.getSnapshot === "function") {
				try {
					const ws = workspacesService.list.getSnapshot();
					const items = (ws && ws.items) || [];
					diag.wsServiceItems = items.length;
					for (const w of items) {
						if (w && w.sessionIds && w.sessionIds.indexOf(sessionId) !== -1) return w.workspaceId;
					}
					if (cwd) {
						for (const w of items) if (w && w.path === cwd) return w.workspaceId;
					}
				} catch (e) {}
			}
			return void 0;
		}
		// Land on a fresh blank session that still belongs to the ORIGINAL
		// workspace. `sessions.create({ workspaceId })` is the documented way to
		// birth a workspace-bound blank session ("target workspace or working
		// directory") and it is what the workspaces service itself calls — the
		// `connectWorkspace` / `startSession` verbs do not exist on the
		// WorkspaceController this DSH build registers, so they are only tried
		// when present (i.e. on a newer build).
		async function ensureBlankSession(sessionId, diag) {
			diag = diag || {};
			let cwd = void 0;
			try {
				const snap = ctx_sessions.list.getSnapshot();
				const row = snap && snap.byId ? snap.byId[sessionId] : void 0;
				cwd = row && row.cwd;
			} catch (e) {}
			diag.cwd = cwd;
			const workspaceId = await resolveWorkspaceId(sessionId, cwd, diag);
			diag.workspaceId = workspaceId || null;
			// 1) workspace-bound blank session — carries the workspace, model,
			//    mode and permission profile, and makes the composer editable.
			if (workspaceId && typeof ctx_sessions.create === "function") {
				try {
					const id = await ctx_sessions.create({ workspaceId });
					if (id) { diag.via = "sessions.create({workspaceId})"; return id; }
					diag.createWorkspace = "returned no id";
				} catch (e) { diag.createWorkspaceErr = String(e && e.message); }
			}
			// 2) newer-build verbs, only when they actually exist
			if (workspaceId && workspacesService && typeof workspacesService.connectWorkspace === "function") {
				try {
					const id = await workspacesService.connectWorkspace(workspaceId);
					if (id) { diag.via = "connectWorkspace"; return id; }
				} catch (e) { diag.connectErr = String(e && e.message); }
			}
			if (workspacesService && typeof workspacesService.startSession === "function") {
				try {
					workspacesService.startSession();
					const id = await waitForCurrentChange(sessionId, 8000);
					if (id) { diag.via = "startSession()"; return id; }
					diag.startSession = "current did not change";
				} catch (e) { diag.startSessionErr = String(e && e.message); }
			}
			// 3) last resort: a bare session with only a cwd — loses the
			//    workspace binding (and with it the editable composer).
			if (typeof ctx_sessions.create === "function") {
				const id = await ctx_sessions.create(cwd ? { cwd } : {});
				diag.via = "sessions.create({cwd})";
				return id;
			}
			throw new Error("无法新建会话（sessions.create 不可用）");
		}
		async function callRpc(action, payload) {
			const res = await fetch("/dsh-revert/rpc", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action, payload })
			});
			return await res.json();
		}
		// Ship what the renderer actually observed to two places an operator can
		// read afterwards: the desktop error.log (renderer console is forwarded
		// there) and a host-side diag.log the client cannot write itself.
		function reportDiag(diag) {
			let line = "";
			try {
				line = JSON.stringify(diag);
			} catch (e) {
				line = String(diag);
			}
			try { console.error("[dsh-message-revert][diag] " + line); } catch (e) {}
			try {
				fetch("/dsh-revert/rpc", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ action: "diag", payload: diag })
				}).catch(() => {});
			} catch (e) {}
		}
		// #endregion
		// #region confirm dialog
		function openConfirm(sessionId, domKey, meta) {
			const root = document.createElement("div");
			root.className = "dsh-revert-overlay";
			document.body.appendChild(root);
			const modal = document.createElement("div");
			modal.className = "dsh-revert-modal";
			root.appendChild(modal);
			const decision = decideReset(meta);
			const reset = decision.mode === "reset";
			const h3 = document.createElement("h3");
			h3.textContent = reset ? "确定撤回这条消息并回到新会话吗" : "确定回滚到此步骤前并重新开始吗";
			modal.appendChild(h3);
			const sub = document.createElement("p");
			sub.className = "dsh-revert-sub";
			sub.textContent = reset
				? "这是该会话的第一条消息：撤回到新会话首屏，消息文本与图片/文件会原样回到输入框，原会话将被移除。"
				: "这将回滚该消息之后的所有更改，并把该消息的文本与图片/文件恢复到输入框。";
			modal.appendChild(sub);
			const filesEl = document.createElement("div");
			filesEl.className = "dsh-revert-files";
			filesEl.textContent = "正在读取更改过的文件…";
			modal.appendChild(filesEl);
			const loading = document.createElement("div");
			loading.className = "dsh-revert-loading";
			loading.textContent = "载入中…";
			modal.appendChild(loading);
			const actions = document.createElement("div");
			actions.className = "dsh-revert-actions";
			modal.appendChild(actions);
			const cancel = document.createElement("button");
			cancel.type = "button";
			cancel.className = "dsh-revert-btn-cancel";
			cancel.textContent = "取消";
			actions.appendChild(cancel);
			const confirm = document.createElement("button");
			confirm.type = "button";
			confirm.className = "dsh-revert-btn-primary";
			confirm.textContent = "确认撤回";
			actions.appendChild(confirm);
			cancel.addEventListener("click", () => { if (root.parentNode) root.parentNode.removeChild(root); });
			root.addEventListener("click", (e) => { if (e.target === root && root.parentNode) root.parentNode.removeChild(root); });
			callRpc("preview", { sessionId, afterSeq: meta && meta.seq }).then((res) => {
				if (loading.parentNode) loading.parentNode.removeChild(loading);
				filesEl.textContent = "";
				const changed = res && res.ok && Array.isArray(res.changedFiles) ? res.changedFiles : null;
				if (changed && changed.length > 0) {
					for (const f of changed) {
						const row = document.createElement("div");
						row.className = "dsh-revert-file";
						const tag = document.createElement("span");
						tag.textContent = f.state === "created" ? "＋ " : "● ";
						const code = document.createElement("code");
						code.textContent = f.path;
						row.appendChild(tag);
						row.appendChild(code);
						filesEl.appendChild(row);
					}
				} else {
					const empty = document.createElement("div");
					empty.className = "dsh-revert-empty";
					empty.textContent = changed ? "未检测到该步骤之前的文件更改。" : "无法读取更改文件列表。";
					filesEl.appendChild(empty);
				}
			}).catch(() => {
				if (loading.parentNode) loading.parentNode.removeChild(loading);
				filesEl.textContent = "";
				const empty = document.createElement("div");
				empty.className = "dsh-revert-empty";
				empty.textContent = "读取文件列表失败。";
				filesEl.appendChild(empty);
			});
			const fail = (message, diag) => {
				confirm.disabled = false;
				confirm.textContent = "确认撤回";
				let err = modal.querySelector(".dsh-revert-error");
				if (!err) {
					err = document.createElement("div");
					err.className = "dsh-revert-loading dsh-revert-error";
					err.style.color = "var(--dsw-alias-state-error-primary)";
					modal.appendChild(err);
				}
				err.textContent = "撤回失败：" + message;
				if (diag) {
					let box = modal.querySelector(".dsh-revert-diag");
					if (!box) {
						box = document.createElement("div");
						box.className = "dsh-revert-diag";
						modal.appendChild(box);
					}
					try {
						box.textContent = "诊断：" + JSON.stringify(diag);
					} catch (e) {}
				}
			};
			confirm.addEventListener("click", async () => {
				confirm.disabled = true;
				confirm.textContent = "正在撤回…";
				let targetId = void 0;
				const landing = {};
				try {
					const afterSeq = meta && meta.seq;
					await callRpc("execute", { sessionId, afterSeq });
					const stopped = await stopIfRunning(sessionId);
					if (!stopped) throw new Error("会话仍在运行，请稍候停止后再撤回");
					// Re-read from the log: the capture above may be seconds old.
					const fresh = await extractUserMeta(sessionId, domKey);
					reportDiag(fresh.diag);
					const seq = typeof fresh.seq === "number" ? fresh.seq : afterSeq;
					const files = await loadAttachmentFiles(sessionId, (fresh.images || []).concat(fresh.files || []));
					const text = fresh.text || "";
					const decisionFresh = decideReset(fresh);
					if (decisionFresh.mode === "error") throw new Error(decisionFresh.reason);
					if (decisionFresh.mode === "reset") {
						targetId = await ensureBlankSession(sessionId, landing);
						landing.reason = decisionFresh.reason;
					} else {
						targetId = await ctx_sessions.fork({ sessionId, atSeq: decisionFresh.cut, increaseTitle: false });
						landing.via = "fork";
						landing.cut = decisionFresh.cut;
						// Safety gate: the forked child MUST still carry every user
						// message that preceded the one being reverted. If it does
						// not, we refuse to archive the original — losing a whole
						// conversation is the one outcome we must never produce.
						const expectKeep = fresh.userSeqs.filter((s) => s < seq).length;
						landing.expectedKeep = expectKeep;
						if (expectKeep > 0) {
							let kept = -1;
							for (let attempt = 0; attempt < 6 && kept < expectKeep; attempt++) {
								if (attempt > 0) await sleep(350);
								const childLog = await fetchUserMessages(targetId);
								kept = childLog && childLog.ok ? childLog.users.filter((u) => typeof u.seq === "number" && u.seq < seq).length : -1;
							}
							landing.keptEarlier = kept;
							if (kept < expectKeep) {
								landing.archiveBlocked = true;
								notify("安全检查未通过：新会话未完整保留更早的对话，已保留原会话未归档");
							}
						}
					}
					if (!targetId) throw new Error("未能创建用于撤回的新会话");
					landing.targetId = targetId;
					landing.hasBinding = !!bindingOf(targetId);
					reportDiag(Object.assign({ stage: "reset-landed", sessionId, reason: decisionFresh.reason }, landing));
					if (!landing.hasBinding) throw new Error("新会话尚未就绪（无 binding），请重试");
					if (typeof ctx_sessions.open === "function") ctx_sessions.open(targetId);
					await sleep(120);
					// Archive the original only when the landing is proven safe: a
					// first-message reset has nothing to keep, and a fork that
					// passed the safety gate above carries the earlier history.
					const mayArchive = sessionId !== targetId
						&& workspacesService && typeof workspacesService.archiveSession === "function"
						&& !landing.archiveBlocked;
					if (mayArchive) {
						try {
							await workspacesService.archiveSession(sessionId);
						} catch (e) {}
					}
					if (root.parentNode) root.parentNode.removeChild(root);
					restoreDraft(targetId, text, files);
				} catch (e) {
					if (targetId && typeof ctx_sessions.open === "function") {
						try {
							ctx_sessions.open(sessionId);
						} catch (e2) {}
					}
					fail((e && e.message) ? e.message : String(e), landing);
				}
			});
		}
		// #endregion
		// #region attach buttons on user messages
		function attachButtons(rootNode) {
			const scope = rootNode || document;
			const rows = scope.querySelectorAll("[data-chat-flow-kind=user]");
			rows.forEach((row) => {
				if (row.querySelector(".dsh-revert-btn")) return;
				let host = row.querySelector("[class*='actions']");
				if (!host) {
					// A first turn that is still running may render no actions row yet;
					// keep the control reachable by mounting a hover bar of our own.
					host = document.createElement("div");
					host.className = "dsh-revert-fallback";
					row.appendChild(host);
				}
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "dsh-revert-btn";
				btn.setAttribute("aria-label", "撤回/回滚此消息");
				btn.title = "撤回/回滚此消息";
				btn.innerHTML = "<svg viewBox='0 0 16 16'><path d='M5.5 3.5L2 7L5.5 10.5'/><path d='M2.5 7H9C11.5 7 13.5 9 13.5 11.5V12.5'/></svg>";
				const domKey = row.getAttribute("data-chat-flow-key") || row.getAttribute("data-chat-anchor-key");
				btn.addEventListener("click", (e) => {
					e.preventDefault();
					e.stopPropagation();
					// Re-resolve the session at click time: the row is only
					// meaningful in the session currently on stage.
					const sessionId = getCurrentSessionId();
					if (!sessionId) return;
					btn.disabled = true;
					extractUserMeta(sessionId, domKey).then((meta) => {
						btn.disabled = false;
						reportDiag(meta.diag);
						openConfirm(sessionId, domKey, meta);
					}).catch((err) => {
						btn.disabled = false;
						notify("读取消息失败：" + ((err && err.message) || String(err)));
					});
				});
				host.appendChild(btn);
			});
		}
		// #endregion
		// #region plugin
		const inject = ["slots", "locale", "sessions", "workspaces"];
		function apply(ctx) {
			rootCtx = ctx;
			ctx_sessions = (ctx.get && ctx.get("sessions")) || null;
			workspacesService = (ctx.get && ctx.get("workspaces")) || null;
			conversationService = (ctx.get && ctx.get("conversation")) || null;
			let mo = null;
			try {
				mo = new MutationObserver(() => { try { attachButtons(document); } catch (e) {} });
				mo.observe(document.body, { childList: true, subtree: true });
			} catch (e) {}
			try { setTimeout(() => attachButtons(document), 500); } catch (e) {}
			ctx.effect(() => () => { if (mo) { try { mo.disconnect(); } catch (e) {} } }, "dsh-revert client cleanup");
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
