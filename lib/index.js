// dsh-message-revert: host-side file-rollback engine + web RPC.
// Captures the full "before" content of every write/edit at tool/call time
// (before the tool executes) and persists it per-session per-seq, so a revert
// can restore the exact file content that existed before a given message.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync, readdirSync, unlinkSync, rmSync, appendFileSync } from 'node:fs';
import { join, dirname, resolve as pathResolve, normalize } from 'node:path';
import { homedir } from 'node:os';
import { zstdDecompressSync } from 'node:zlib';

export const name = 'dsh-message-revert';
export const inject = ['webServer', 'sessions'];
export { readUserMessages, readWorkspaceForSession, findSessionFile };

// ---- storage helpers --------------------------------------------------------
function dshHome() {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh');
}
function storeDir() {
  const dir = join(dshHome(), 'dsh-revert');
  mkdirSync(dir, { recursive: true });
  return dir;
}
function storeFile(sessionId) {
  const safe = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(storeDir(), `${safe}.json`);
}
// Only keep the FIRST (oldest) captured before-state per path per run.
function loadSession(sessionId) {
  const f = storeFile(sessionId);
  if (existsSync(f)) {
    try { return JSON.parse(readFileSync(f, 'utf8')); } catch { /* repair to fresh */ }
  }
  return { sessionId, cwd: null, files: {}, blobs: {} };
}
function saveSession(sessionId, data) {
  try { writeFileSync(storeFile(sessionId), JSON.stringify(data), 'utf8'); } catch { /* ignore */ }
}
function blobKey(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 32);
}

// ---- session log reader ----------------------------------------------------
// The client-side conversation snapshot is unreliable for this: `chat` is only
// populated once a view builder registers for the "chat" target, and the
// session's own `nodes`/`turnEnds` are derived from it. The durable log is the
// ground truth, so read it here on the host (which has fs + zstd) and hand the
// client the user messages with their event seqs.
const ZSTD_MAGIC = 4247762216; // 0xFD2FB528, little-endian
// Locate complete frames without decompressing their blocks (same structure
// scan dsh-session-persistence-jsonl uses). Node's zstd APIs decode ONE frame
// only, and a session log is one frame per durable append.
function scanZstdFrames(buffer, maxFrames) {
	const frames = [];
	const limit = maxFrames === undefined ? Number.POSITIVE_INFINITY : maxFrames;
	let offset = 0;
	while (offset < buffer.length) {
		const start = offset;
		if (buffer.length - offset < 4) return { frames, tornStart: start };
		if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error(`invalid frame magic at byte ${offset}`);
		offset += 4;
		if (offset === buffer.length) return { frames, tornStart: start };
		const descriptor = buffer.readUInt8(offset);
		offset += 1;
		if ((descriptor & 24) !== 0) throw new Error(`reserved frame-header bit at byte ${offset - 1}`);
		const contentSizeFlag = descriptor >>> 6;
		const singleSegment = (descriptor & 32) !== 0;
		const checksum = (descriptor & 4) !== 0;
		const dictionaryFlag = descriptor & 3;
		const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
		const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag;
		const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
		if (buffer.length - offset < remainingHeaderBytes) return { frames, tornStart: start };
		offset += remainingHeaderBytes;
		for (;;) {
			if (buffer.length - offset < 3) return { frames, tornStart: start };
			const blockHeader = buffer.readUIntLE(offset, 3);
			offset += 3;
			const lastBlock = (blockHeader & 1) !== 0;
			const blockType = (blockHeader >>> 1) & 3;
			const blockSize = blockHeader >>> 3;
			if (blockType === 3) throw new Error(`reserved block type at byte ${offset - 3}`);
			const payloadBytes = blockType === 1 ? 1 : blockSize;
			if (buffer.length - offset < payloadBytes) return { frames, tornStart: start };
			offset += payloadBytes;
			if (lastBlock) break;
		}
		if (checksum) {
			if (buffer.length - offset < 4) return { frames, tornStart: start };
			offset += 4;
		}
		frames.push({ start, end: offset });
		if (frames.length === limit) return { frames };
	}
	return { frames };
}
function decodeSessionLog(bytes) {
	const { frames } = scanZstdFrames(bytes);
	const parts = [];
	for (const f of frames) parts.push(Buffer.from(zstdDecompressSync(bytes.subarray(f.start, f.end))));
	return Buffer.concat(parts).toString('utf8');
}
// $DSH_HOME/sessions/<cwd-encoded>/session-<id>/session.vN.jsonl[.zstd]
// NOTE: a SessionId already carries the "session-" prefix, so strip it before
// rebuilding the directory name.
function findSessionFile(sessionId) {
	const root = join(dshHome(), 'sessions');
	const bare = String(sessionId).replace(/^session-/, '');
	let entries = [];
	try { entries = readdirSync(root, { withFileTypes: true }); } catch (e) { return null; }
	for (const e of entries) {
		if (!e.isDirectory()) continue;
		const dir = join(root, e.name, `session-${bare}`);
		for (const name of ['session.v3.jsonl.zstd', 'session.v4.jsonl.zstd', 'session.v3.jsonl']) {
			const p = join(dir, name);
			if (existsSync(p)) return p;
		}
	}
	return null;
}
// Every message a human actually typed, with its event seq. Injected user-role
// events (AGENTS.md instructions, plugin runtime snapshots) share role "user"
// on the wire but carry a non-"user" source kind, so source is authoritative.
function readUserMessages(sessionId) {
	const file = findSessionFile(sessionId);
	if (!file) return { ok: false, error: `session log not found: ${sessionId}` };
	let text;
	try {
		const raw = readFileSync(file);
		text = String(file).endsWith('.zstd') ? decodeSessionLog(raw) : raw.toString('utf8');
	} catch (e) {
		return { ok: false, error: String((e && e.message) || e) };
	}
	const users = [];
	const turnEnds = [];
	const turnStarts = [];
	for (const line of text.split('\n')) {
		if (line.trim() === '') continue;
		let ev = null;
		try { ev = JSON.parse(line); } catch (e) { continue; }
		if (!ev || typeof ev.seq !== 'number') continue;
		if (ev.type === 'turn/end') turnEnds.push(ev.seq);
		else if (ev.type === 'turn/start') turnStarts.push(ev.seq);
		else if (ev.type === 'user/message') {
			const src = ev.data && ev.data.source;
			if (!src || src.kind !== 'user') continue;
			const content = (ev.data && ev.data.content) || [];
			const texts = [];
			const images = [];
			const files = [];
			for (const b of content) {
				if (!b) continue;
				if (b.type === 'text' && typeof b.text === 'string') texts.push(b.text);
				else if (b.type === 'image' && b.attachment) images.push(b.attachment);
				else if (b.type === 'file' && b.attachment) files.push(b.attachment);
			}
			users.push({ seq: ev.seq, id: ev.data && ev.data.id, time: ev.time, text: texts.join(''), images, files });
		}
	}
	return { ok: true, users, turnEnds, turnStarts };
}
// Which workspace owns a session, straight from the registry the workspaces
// service persists. Lets the client connect the blank session to the SAME
// workspace (model / mode / permission profile all ride on the workspace).
function readWorkspaceForSession(sessionId) {
	const p = join(dshHome(), 'storages', 'workspace.json');
	if (!existsSync(p)) return { ok: false, error: 'workspace registry not found' };
	let doc = null;
	try { doc = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
	const tables = doc && doc.tables && doc.tables.workspaces;
	if (!tables || typeof tables !== 'object') return { ok: false, error: 'no workspaces table' };
	for (const id of Object.keys(tables)) {
		const w = tables[id];
		if (w && Array.isArray(w.sessionIds) && w.sessionIds.indexOf(sessionId) !== -1) {
			return { ok: true, workspaceId: id, path: w.path, title: w.title };
		}
	}
	return { ok: false, error: `session not accounted in any workspace: ${sessionId}` };
}

// Capture the full content of `filePath` (relative to cwd) BEFORE it is written.
function captureBefore(sessionId, cwd, filePath, seq) {
  try {
    const rel = normalize(String(filePath)).replace(/[\\]+/g, '/');
    if (rel === '' || rel === '.' || rel === '..' || rel.indexOf('..') !== -1) return;
    const abs = pathResolve(cwd || '.', rel);
    let exists = true;
    let content = null;
    try {
      const st = statSync(abs);
      if (!st.isFile()) return;
      content = readFileSync(abs, 'utf8');
    } catch { exists = false; }
    const data = loadSession(sessionId);
    if (!data.cwd && cwd) data.cwd = cwd;
    if (!data.files[rel]) {
      if (exists) {
        const key = blobKey(content);
        data.blobs[key] = content;
        data.files[rel] = { exists: true, hash: key, seq };
      } else {
        data.files[rel] = { exists: false, seq };
      }
      saveSession(sessionId, data);
    }
  } catch { /* ignore capture failures */ }
}

// List files changed at or after a message seq, with exists flag (for preview).
function changedFiles(sessionId, afterSeq) {
  const data = loadSession(sessionId);
  const out = [];
  for (const rel of Object.keys(data.files || {})) {
    const rec = data.files[rel];
    if (rec.seq > afterSeq) out.push({ path: rel, state: rec.exists ? 'modified' : 'created' });
  }
  return out;
}

// Restore every captured file changed at or after `afterSeq` back to its
// captured before-content (or delete it when it did not exist before).
function restoreFiles(sessionId, afterSeq) {
  const data = loadSession(sessionId);
  const files = [];
  for (const rel of Object.keys(data.files || {})) {
    const rec = data.files[rel];
    if (rec.seq <= afterSeq) continue;
    const abs = pathResolve(data.cwd || '.', rel);
    try {
      if (rec.exists) {
        const content = data.blobs[rec.hash];
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content, 'utf8');
        files.push({ path: rel, state: 'restored' });
      } else if (existsSync(abs)) {
        rmSync(abs, { recursive: true, force: true });
        files.push({ path: rel, state: 'deleted' });
      } else {
        files.push({ path: rel, state: 'already-absent' });
      }
    } catch (e) {
      files.push({ path: rel, state: 'failed', error: e && e.message });
    }
  }
  return files;
}

export function apply(ctx) {
  const logger = ctx.logger ? ctx.logger(name) : console;

  ctx.on('session/event', (session, event) => {
    if (!session || !event) return;
    if (event.type !== 'tool/call') return;
    const sessionId = session.id;
    const cwd = session.header && session.header.cwd;
    const seq = event.seq;
    if (seq === undefined || seq === null) return;
    try {
      const data = event.data || {};
      const tname = data.name;
      if (tname !== 'write' && tname !== 'edit') return;
      let args = {};
      const raw = data.arguments;
      if (typeof raw === 'string') { try { args = JSON.parse(raw || '{}'); } catch { args = {}; } }
      else if (raw && typeof raw === 'object') args = raw;
      const filePath = args.file_path || args.FilePath || args.path;
      if (filePath && typeof cwd === 'string') captureBefore(sessionId, cwd, filePath, seq);
    } catch { /* ignore */ }
  });

  ctx.webServer.register({
    kind: 'prefix',
    path: '/dsh-revert',
    handler: async (req, res) => {
      if (req.method === 'POST' && req.url.startsWith('/dsh-revert/rpc')) {
        // Same-origin gate: the RPC can restore or DELETE workspace files, so a
        // cross-origin POST (a malicious page in the user's browser reaching the
        // local dsh port) must never get through. Requests without an Origin
        // header (curl, server-to-server) are allowed; a present Origin must
        // match the request Host. Same contract as dsh-conversation-log.
        const origin = req.headers.origin;
        if (typeof origin === 'string' && origin !== '') {
          let sameOrigin = false;
          try { sameOrigin = new URL(origin).host === req.headers.host; } catch { sameOrigin = false; }
          if (!sameOrigin) {
            res.writeHead(403, { 'content-type': 'text/plain' });
            res.end('Forbidden');
            return;
          }
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { action, payload } = JSON.parse(body || '{}');
            const sessionId = payload && payload.sessionId;
            let result;
            if (action === 'status') {
              result = { ok: true, version: '1.0.0', name: 'dsh-message-revert', engine: 'captured-before-content' };
            } else if (action === 'preview') {
              const afterSeq = Number(payload && payload.afterSeq) || 0;
              result = { ok: true, changedFiles: changedFiles(sessionId, afterSeq) };
            } else if (action === 'execute') {
              const afterSeq = Number(payload && payload.afterSeq) || 0;
              result = { ok: true, restored: true, files: restoreFiles(sessionId, afterSeq) };
            } else if (action === 'diag') {
              // Client-side diagnostics: the renderer cannot write files, so it
              // ships the snapshot shape it actually observed here and we append
              // it to a log an operator can read after the fact.
              try {
                appendFileSync(join(storeDir(), 'diag.log'),
                  JSON.stringify({ t: new Date().toISOString(), sessionId, payload }) + '\n', 'utf8');
                result = { ok: true };
              } catch (e) {
                result = { ok: false, error: e && e.message };
              }
            } else if (action === 'user-messages') {
              result = readUserMessages(sessionId);
            } else if (action === 'workspace-for-session') {
              result = readWorkspaceForSession(sessionId);
            } else {
              result = { ok: false, error: 'unknown action: ' + action };
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            res.writeHead(500, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err && err.message }));
          }
        });
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not Found');
    },
  });

  logger.info('[dsh-message-revert] host engine ready (captured-before-content, persisted)');
}
