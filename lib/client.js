window.__ModuleLoader__.load({
	id: "dsh-message-revert",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		// #region styles
		const css = `
.dsh-revert-btn{display:inline-flex;align-items:center;justify-content:center;width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px));padding:6px;border:none;border-radius:var(--dsw-radius-sm);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;box-sizing:border-box;flex:none}
.dsh-revert-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dsh-revert-btn svg{width:calc(15px + var(--dsh-content-font-delta,0px));height:calc(15px + var(--dsh-content-font-delta,0px));fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;display:block}
/* Official Tooltip look, reproduced for a plain-DOM action button so the
   hover explanation reads exactly like the stock copy button's. Values are
   lifted from @deepseek-ai/dsh-client-ui-primitives/lib/Tooltip.module.css. */
.dsh-revert-tip{position:fixed;z-index:100;width:max-content;max-width:50vw;padding:3px 7px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:13px;line-height:20px;white-space:pre-line;overflow-wrap:break-word;pointer-events:none;animation:tooltip-in 150ms var(--ds-ease-in-out);visibility:hidden}
@keyframes tooltip-in{from{opacity:0}}
@media (prefers-reduced-motion:reduce){.dsh-revert-tip{animation:none}}
.dsh-revert-tip[data-side='bottom']{transform:translateX(-50%)}
.dsh-revert-tip[data-side='top']{transform:translate(-50%,-100%)}
/* Visibility is owned entirely by the stock actions row's reveal rules
   ([data-actions-reveal=hover] opacity 0 -> :hover/:focus-within opacity 1).
   This plugin must NOT re-declare opacity, or the two mechanisms fight:
   our :hover-only rule hides the button while the stock row is already
   revealed by its own :focus-within / sibling-reveal paths. */
.dsh-revert-fallback{display:inline-flex;align-items:center;gap:4px}
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
		/** Hover explanation, identical to the stock row's wording style. */
		const REVERT_LABEL = "撤回/回滚此消息";
		let ctx_sessions = null;
		let workspacesService = null;
		let uiWorkspaceService = null;
		let conversationService = null;
		let rootCtx = null;
		const logCache = new Map();
		// #endregion
		// #region helpers
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		const asSeq = (v) => (typeof v === "number" && isFinite(v) ? v : void 0);
		// ------------------------------------------------------------------
		// Official-look tooltip for a plain-DOM button.
		//
		// The stock actions row renders its hover explanation through the
		// React <Tooltip side="bottom"> component. A DOM button cannot use it,
		// and a native `title` attribute renders the browser tooltip — a
		// different font, box and timing. So this reproduces the official
		// bubble: same tokens (padding 3px 7px, --dsw-radius-sm,
		// --dsw-alias-tooltip-bg, 13px/20px, 150ms --ds-ease-in-out), same
		// 8px gap, same 12px edge margin and the same bottom->top flip when
		// the anchor sits near the viewport bottom.
		// ------------------------------------------------------------------
		const TIP_GAP = 8;
		const TIP_EDGE = 12;
		let tipEl = null;
		let tipAnchor = null;
		function ensureTip() {
			if (tipEl) return tipEl;
			tipEl = document.createElement("div");
			tipEl.className = "dsh-revert-tip";
			tipEl.setAttribute("role", "tooltip");
			document.body.appendChild(tipEl);
			return tipEl;
		}
		function placeTip() {
			if (!tipEl || !tipAnchor) return;
			const rect = tipAnchor.getBoundingClientRect();
			const w = tipEl.offsetWidth;
			const h = tipEl.offsetHeight;
			const fitsBelow = rect.bottom + TIP_GAP + h <= window.innerHeight - TIP_EDGE;
			const fitsAbove = rect.top - TIP_GAP - h >= TIP_EDGE;
			const side = !fitsBelow && fitsAbove ? "top" : "bottom";
			const left = Math.max(TIP_EDGE, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - TIP_EDGE - w));
			tipEl.dataset.side = side;
			tipEl.style.left = left + "px";
			tipEl.style.top = (side === "top" ? rect.top - TIP_GAP : rect.bottom + TIP_GAP) + "px";
			tipEl.style.visibility = "visible";
		}
		function showTip(anchor, text) {
			try {
				const el = ensureTip();
				el.textContent = text;
				tipAnchor = anchor;
				el.style.visibility = "hidden";
				placeTip();
			} catch (e) {}
		}
		function hideTip() {
			try {
				if (tipEl) tipEl.style.visibility = "hidden";
				tipAnchor = null;
			} catch (e) {}
		}
		if (typeof window !== "undefined") {
			window.addEventListener("resize", hideTip);
			window.addEventListener("scroll", hideTip, true);
		}
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
			if (!ctx_sessions || !ctx_sessions.list || typeof ctx_sessions.list.getSnapshot !== "function") return void 0;
			try {
				const snap = ctx_sessions.list.getSnapshot();
				const byId = snap && snap.byId;
				if (byId && typeof byId === "object") {
					const rows = Object.values(byId);
					// 0.2.0: the on-stage session is the one retained by the main view
					const byRetain = rows.find((row) => row && (row.retainedBy && (row.retainedBy.mainView ?? 0) > 0));
					if (byRetain && byRetain.id) return byRetain.id;
					// 0.1.x shape: an explicit `current` field
					const cur = snap.current;
					if (typeof cur === "string" && cur) return cur;
					// last resort: a single known session
					if (rows.length === 1 && rows[0] && rows[0].id) return rows[0].id;
				}
			} catch (e) {}
			return void 0;
		}
		// 0.2.0 `sessions.create()` / `sessions.fork()` resolve to a Result
		// envelope (`{ok, value:{sessionId}}`), while 0.1.x resolved to the
		// bare id. Normalise both so callers always get a session id string.
		function unwrapSessionId(result) {
			if (typeof result === "string" && result) return result;
			if (result && typeof result === "object") {
				const v = result.value;
				if (typeof v === "string" && v) return v;
				if (v && typeof v === "object" && typeof v.sessionId === "string" && v.sessionId) return v.sessionId;
				if (typeof result.sessionId === "string" && result.sessionId) return result.sessionId;
			}
			return void 0;
		}
		function openSessionInUi(targetId) {
			if (!targetId) return false;
			const ui = uiWorkspaceService
				|| (rootCtx && typeof rootCtx.get === "function" && rootCtx.get("uiWorkspace"))
				|| (rootCtx && rootCtx.uiWorkspace);
			if (ui && typeof ui.openSession === "function") {
				try {
					ui.openSession(targetId);
					return true;
				} catch (e) {
					console.error("[dsh-message-revert] uiWorkspace.openSession failed:", e);
				}
			}
			if (workspacesService && typeof workspacesService.openSession === "function") {
				try {
					workspacesService.openSession(targetId);
					return true;
				} catch (e) {}
			}
			if (ctx_sessions && typeof ctx_sessions.open === "function") {
				try {
					ctx_sessions.open(targetId);
					return true;
				} catch (e) {}
			}
			return false;
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
		async function fetchUserMessages(sessionId, bypassCache = false) {
			if (!bypassCache) {
				const cached = logCache.get(sessionId);
				if (cached && Date.now() - cached.at < 3000 && cached.value) return cached.value;
			}
			let value = null;
			try {
				const res = await callRpc("user-messages", { sessionId });
				if (res && res.ok) value = res;
			} catch (e) {}
			if (value) {
				logCache.set(sessionId, { at: Date.now(), value });
			}
			return value;
		}
		// Read back one user message: text, image refs, file refs, event seq,
		// every user-message seq in the log, turn boundaries and step endings.
		// `diag` records what was actually observed so a failure can be diagnosed.
		async function extractUserMeta(sessionId, domKey, hint) {
			const out = { text: "", seq: void 0, images: [], files: [], isFirstUser: false, userSeqs: [], turnEnds: [], turnStarts: [], stepEnds: [], hasMore: false, diag: {} };
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
						else if (b.type === "image") {
							const att = b.attachment || b.image || (b.attachmentId ? b : null);
							if (att && (att.attachmentId || att.id)) images.push(att);
						}
						else if (b.type === "file") {
							const att = b.attachment || b.file || (b.attachmentId ? b : null);
							if (att && (att.attachmentId || att.id)) files.push(att);
						}
					}
					pushUser({ seq: seqOfNode(n), id: n.id, text: texts.join(""), images, files });
				}
			}
			const userSeqs = [];
			for (const u of users) if (typeof u.seq === "number") userSeqs.push(u.seq);
			userSeqs.sort((a, b) => a - b);
			const turnEnds = log && Array.isArray(log.turnEnds) ? log.turnEnds.slice().sort((a, b) => a - b) : turnEndSeqs(snap);
			const turnStarts = log && Array.isArray(log.turnStarts) ? log.turnStarts.slice().sort((a, b) => a - b) : [];
			const stepEnds = log && Array.isArray(log.stepEnds) ? log.stepEnds.slice().sort((a, b) => a - b) : [];
			out.userSeqs = userSeqs;
			out.turnEnds = turnEnds;
			out.turnStarts = turnStarts;
			out.stepEnds = stepEnds;
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
				stepEndsCount: stepEnds.length,
				hasMore: out.hasMore,
				openState: snap ? snap.openState : void 0,
				blank: snap ? snap.blank : void 0,
				running: snap ? snap.running : void 0,
				snapshotNodeCount: collectNodes(snap).length
			};
			let target = void 0;
			if (domId) target = users.filter((u) => u.id === domId)[0];
			if (!target && hint && typeof hint.text === "string" && hint.text.trim()) {
				const trimmed = hint.text.trim();
				target = users.find((u) => u.text && (u.text === trimmed || u.text.startsWith(trimmed) || trimmed.startsWith(u.text)));
			}
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
		function cutSeqFrom(turnEnds, afterSeq) {
			if (typeof afterSeq !== "number") return 0;
			let cut = 0;
			for (const s of turnEnds || []) if (s < afterSeq && s > cut) cut = s;
			return cut;
		}
		// Decide how to land the revert:
		//   reset — go back to a blank new-session screen (for session's first message)
		//   fork  — for turn-opening message: cut at previous turn's turnEnd
		//           for mid-turn/steering message: cut at last completed step before this message
		//   error — genuinely ambiguous or invalid, refuse instead of guessing
		function decideReset(meta) {
			const seq = typeof meta.seq === "number" ? meta.seq : void 0;
			if (seq === void 0) {
				return { mode: "error", reason: "无法读取该消息在会话中的位置，已中止（未做任何改动）" };
			}
			const userSeqs = Array.isArray(meta.userSeqs) ? meta.userSeqs.slice().sort((a, b) => a - b) : [];
			const turnEnds = Array.isArray(meta.turnEnds) ? meta.turnEnds.slice().sort((a, b) => a - b) : [];
			const turnStarts = Array.isArray(meta.turnStarts) ? meta.turnStarts.slice().sort((a, b) => a - b) : [];
			const stepEnds = Array.isArray(meta.stepEnds) ? meta.stepEnds.slice().sort((a, b) => a - b) : [];

			const isEarliestUser = userSeqs.length > 0 && seq === userSeqs[0];
			const earlierTurnEnds = turnEnds.filter((s) => s < seq);
			const earlierTurnStarts = turnStarts.filter((s) => s < seq);

			// 1. Session's very first message -> reset to blank session
			if (isEarliestUser && earlierTurnEnds.length === 0 && earlierTurnStarts.length <= 1) {
				return { mode: "reset", reason: "first-message", cut: 0 };
			}

			// 2. Identify turn boundary for this message
			const currentTurnStart = earlierTurnStarts.length > 0 ? earlierTurnStarts[earlierTurnStarts.length - 1] : 0;
			// Check if there are earlier human messages in this SAME turn
			const earlierUsersInCurrentTurn = userSeqs.filter((s) => s >= currentTurnStart && s < seq);

			if (earlierUsersInCurrentTurn.length === 0) {
				// Turn-opening prompt: reverting discards this entire turn.
				// Cut at the last completed turn before this turn began.
				if (earlierTurnEnds.length > 0) {
					const cut = earlierTurnEnds[earlierTurnEnds.length - 1];
					return { mode: "fork", cut, isTurnOpening: true };
				}
				if (isEarliestUser || userSeqs.indexOf(seq) === 0) {
					return { mode: "reset", reason: "first-message", cut: 0 };
				}
				if (currentTurnStart > 0) {
					return { mode: "fork", cut: currentTurnStart - 1, isTurnOpening: true };
				}
				return { mode: "error", reason: "无法定位安全的撤回点（更早的历史未载入，请先向上滚动加载）" };
			} else {
				// Mid-turn follow-up / steering message: keep earlier messages and steps in this turn.
				// Cut at the latest stepEnd strictly before this message in this turn.
				const earlierStepsInTurn = stepEnds.filter((s) => s < seq && s >= currentTurnStart);
				let cut = 0;
				if (earlierStepsInTurn.length > 0) {
					cut = earlierStepsInTurn[earlierStepsInTurn.length - 1];
				} else {
					cut = Math.max(0, seq - 1);
				}
				return { mode: "fork", cut, isMidTurn: true };
			}
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
			if (!Array.isArray(refs) || refs.length === 0) return files;
			const b = bindingOf(sessionId);
			for (const ref of refs) {
				try {
					const id = ref && (ref.attachmentId || ref.id);
					if (!id) continue;
					const fallbackName = ref.name || ("attachment-" + (files.length + 1));
					const fallbackMediaType = ref.mediaType || "application/octet-stream";

					// 1. Host direct attachment GET endpoint (supports both files and images as native binary stream)
					let loaded = false;
					try {
						const url = "/dsh-revert/attachment?id=" + encodeURIComponent(id) + "&name=" + encodeURIComponent(ref.name || "") + "&mediaType=" + encodeURIComponent(ref.mediaType || "");
						const httpRes = await fetch(url);
						if (httpRes.ok) {
							const blob = await httpRes.blob();
							const mediaType = ref.mediaType || blob.type || fallbackMediaType;
							files.push(new File([blob], fallbackName, { type: mediaType }));
							loaded = true;
						}
					} catch (e) {}
					if (loaded) continue;

					// 2. Host RPC read-attachment (base64 fallback)
					try {
						const rpcRes = await callRpc("read-attachment", { ref });
						if (rpcRes && rpcRes.ok && rpcRes.data) {
							const binary = atob(rpcRes.data);
							const bytes = new Uint8Array(binary.length);
							for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
							const mediaType = rpcRes.mediaType || ref.mediaType || fallbackMediaType;
							const blob = new Blob([bytes], { type: mediaType });
							files.push(new File([blob], rpcRes.name || fallbackName, { type: mediaType }));
							loaded = true;
						}
					} catch (e) {}
					if (loaded) continue;

					// 3. Fallback to session.readAttachment (images only, within active session)
					if (b && b.session && typeof b.session.readAttachment === "function") {
						try {
							const res = await b.session.readAttachment(id);
							const value = res && res.ok ? res.value : void 0;
							if (value && value.data) {
								const resolved = value.attachment || {};
								const mediaType = ref.mediaType || resolved.mediaType || fallbackMediaType;
								const name = ref.name || resolved.name || fallbackName;
								const blob = new Blob([value.data], { type: mediaType });
								files.push(new File([blob], name, { type: mediaType }));
							}
						} catch (e) {}
					}
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
					const cur = getCurrentSessionId();
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
					const created = await ctx_sessions.create({ workspaceId });
					const id = unwrapSessionId(created);
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
				const created = await ctx_sessions.create(cwd ? { cwd } : {});
				const id = unwrapSessionId(created);
				if (!id) throw new Error("无法新建会话（sessions.create 未返回新会话 id）");
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
		function openConfirm(sessionId, domKey, meta, hint) {
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
			const previewSeq = reset ? 0 : decision.cut;
			callRpc("preview", { sessionId, afterSeq: previewSeq }).then((res) => {
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
					const stopped = await stopIfRunning(sessionId);
					if (!stopped) throw new Error("会话仍在运行，请稍候停止后再撤回");
					// Re-read from the log: the capture above may be seconds old.
					const fresh = await extractUserMeta(sessionId, domKey, hint);
					reportDiag(fresh.diag);
					const seq = typeof fresh.seq === "number" ? fresh.seq : (meta && meta.seq);
					const imagesToLoad = (fresh.images && fresh.images.length > 0) ? fresh.images : (meta && meta.images) || [];
					const filesToLoad = (fresh.files && fresh.files.length > 0) ? fresh.files : (meta && meta.files) || [];
					const files = await loadAttachmentFiles(sessionId, imagesToLoad.concat(filesToLoad));
					const text = fresh.text || (meta && meta.text) || "";
					const decisionFresh = decideReset(fresh);
					if (decisionFresh.mode === "error") throw new Error(decisionFresh.reason);

					const revertAfterSeq = decisionFresh.mode === "reset" ? 0 : decisionFresh.cut;
					await callRpc("execute", { sessionId, afterSeq: revertAfterSeq });

					if (decisionFresh.mode === "reset") {
						targetId = await ensureBlankSession(sessionId, landing);
						landing.reason = decisionFresh.reason;
					} else {
						const forked = await ctx_sessions.fork({ sessionId, atSeq: decisionFresh.cut, increaseTitle: false });
						targetId = unwrapSessionId(forked);
						if (!targetId) throw new Error("分叉会话失败：" + ((forked && forked.ok === false && forked.error && (forked.error.message || forked.error.code)) || "未返回新会话 id"));
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
								const childLog = await fetchUserMessages(targetId, true);
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
					// A binding only exists once the session is retained, so the
					// open MUST come first: querying before it can never succeed
					// on 0.2.0, where `binding(id)` reads the scope table.
					openSessionInUi(targetId);

					// The main view retains the opened session asynchronously;
					// poll briefly instead of failing immediately.
					let bound = bindingOf(targetId);
					for (let attempt = 0; attempt < 25 && !bound; attempt++) {
						await sleep(120);
						bound = bindingOf(targetId);
					}
					landing.hasBinding = !!bound;
					reportDiag(Object.assign({ stage: "reset-landed", sessionId, reason: decisionFresh.reason }, landing));
					if (!bound) {
						console.warn("[dsh-message-revert] warning: bindingOf(targetId) not immediately observed for " + targetId + ", continuing with fallback");
					}
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
					if (targetId) {
						try {
							openSessionInUi(sessionId);
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
			const rows = scope.querySelectorAll("[data-chat-flow-kind=user], [class*='userRow']");
			rows.forEach((row) => {
				if (row.querySelector(".dsh-revert-btn")) return;
				// The stock action row. Prefer the one carrying the clock attribute
				// (MessageIconActions sets data-clock), then fall back to any
				// *actions* container; never the singular *action* button.
				let host = row.querySelector("[class*='actions'][data-clock]") || row.querySelector("[class*='_actions']") || row.querySelector("[class*='actions']");
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
				btn.setAttribute("aria-label", REVERT_LABEL);
				// No native `title`: the browser tooltip would not match the
				// stock actions row. Hover/focus drive the official-look bubble.
				btn.innerHTML = "<svg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'><path d='M5.6 3.4L2 7l3.6 3.6' stroke='currentColor'/><path d='M2.6 7H9.4A4.1 4.1 0 0 1 13.5 11v1.6' stroke='currentColor'/></svg>";
				const flowEl = row.hasAttribute("data-chat-flow-key") ? row : (row.closest("[data-chat-flow-key]") || row);
				const domKey = flowEl.getAttribute("data-chat-flow-key") || flowEl.getAttribute("data-chat-anchor-key") || flowEl.getAttribute("data-chat-node-key");
				btn.addEventListener("mouseenter", () => showTip(btn, REVERT_LABEL));
				btn.addEventListener("mouseleave", hideTip);
				btn.addEventListener("focus", () => showTip(btn, REVERT_LABEL));
				btn.addEventListener("blur", hideTip);
				btn.addEventListener("click", (e) => {
					hideTip();
					e.preventDefault();
					e.stopPropagation();
					// Re-resolve the session at click time: the row is only
					// meaningful in the session currently on stage.
					const sessionId = getCurrentSessionId();
					if (!sessionId) return;
					btn.disabled = true;
					const currentFlowEl = row.hasAttribute("data-chat-flow-key") ? row : (row.closest("[data-chat-flow-key]") || row);
					const activeDomKey = currentFlowEl.getAttribute("data-chat-flow-key")
						|| currentFlowEl.getAttribute("data-chat-anchor-key")
						|| currentFlowEl.getAttribute("data-chat-node-key")
						|| domKey;
					const hint = { text: (row.textContent || "").trim() };
					extractUserMeta(sessionId, activeDomKey, hint).then((meta) => {
						btn.disabled = false;
						reportDiag(meta.diag);
						openConfirm(sessionId, activeDomKey, meta, hint);
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
		const inject = ["slots", "locale", "sessions", "workspaces", "uiWorkspace"];
		function apply(ctx) {
			rootCtx = ctx;
			ctx_sessions = (ctx.get && ctx.get("sessions")) || null;
			workspacesService = (ctx.get && ctx.get("workspaces")) || null;
			uiWorkspaceService = (ctx.get && ctx.get("uiWorkspace")) || ctx.uiWorkspace || null;
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
