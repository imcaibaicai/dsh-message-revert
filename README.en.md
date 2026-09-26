# dsh-message-revert

简体中文 | [English](README.en.md)

A message revert/rollback plugin for DeepSeek Harness: **a revert button appears when hovering any sent message**; on confirm it restores that message's text and attachments to the composer, rolls the session back to before that step (fork at the last completed turn, or a fresh blank session for a first message), and restores workspace files to their captured before-content. Host engine + browser UI, pure plugin, no core changes.

## Features

| Feature | Notes |
|---|---|
| Revert button | Appears on hover in every user message row's action bar (with a fallback hover bar while the first turn is still running) |
| Confirm dialog | Lists the files changed before that step (`＋` created / `●` modified); says so plainly when none are detected |
| Text restore | The message text returns to the composer (official `conversation.input.shell` `setDraft` first, Lexical DOM injection as fallback) |
| Attachment restore | Image/file attachments are re-created as drafts and re-attached (official `createDrafts` + `addAttachments` + `rebindDraftFiles`) |
| Session rollback | Non-first message: fork at the **last completed turn strictly before the message**; first message: a fresh blank session bound to the original workspace (model / mode / permission profile all inherited) |
| File restore | The host captures the full content of every `write`/`edit` target **before the tool executes**; on revert, files are restored in order (created ones deleted, modified ones restored) |
| Workspace inheritance | The new session is bound to the original workspace, so the composer is editable and model/mode/permissions survive |
| Diagnostics channel | On failure, the observed snapshot shape is appended to `~/.dsh/dsh-revert/diag.log` and shown in the dialog, so issues can be located after the fact |

## Safety design (why it is safe to use)

1. **Clearing a session is only allowed when it is provably the first exchange**: the seq must be a number, must be the earliest user message, there must be no completed turn before it, and at most one `turn/start` before it — everything else forks; any ambiguity errors out. **It never guesses.**
2. **Second check before archiving after a fork**: the child session log is re-read and the count of user messages earlier than the target must be ≥ the expected value, otherwise the original session is **not archived** and a toast says so.
3. **Same-origin gate on the RPC**: every POST to `/dsh-revert/rpc` validates that `Origin` matches the request `Host` (requests without an Origin — curl, server-to-server — are allowed), so a malicious web page cannot drive the browser into restoring files.
4. **Only captured files are restored**: a file with no captured before-state is never touched.

## Install

```bash
dsh plugin --profile web add -w dsh-message-revert
```

Manual equivalent: place the package at `<DSH_HOME>/profiles/node_modules/dsh-message-revert/` and add a row to `cordis.patch.yml`:

```yaml
- insert:
    - id: dsh-revert
      name: 'dsh-message-revert'
```

Host plugins load at DSH startup — **fully quit and restart DeepSeek Harness after install**, then hard-refresh the session page.

## Uninstall

Remove the insert row from `cordis.patch.yml` plus the package directory, then restart. Captured before-snapshots stay in `~/.dsh/dsh-revert/` and are not deleted with the plugin.

## Implementation notes

- **Host half** (`lib/index.js`): captures the full content of `write`/`edit` targets at `tool/call` time (sha256-deduped blobs, persisted per session to `<DSH_HOME>/dsh-revert/<session>.json`); replicates the official `scanZstdFrames()` to decode multi-frame zstd session logs frame by frame (Node's native APIs decode only the first frame); takes real user messages and their seqs by `source.kind === "user"`; reads the workspace registry to resolve `workspaceId`; web RPC with five actions (status / preview / execute / diag / user-messages / workspace-for-session).
- **Browser half** (`lib/client.js`): a MutationObserver attaches buttons to user message action rows; the host log is the primary source with the client snapshot as fallback (multiple shapes deduped by seq); `decideReset` is a three-state decision (reset / fork / error); draft restore retries 45×150ms with separate completion flags for text and attachments.
- **Data compatibility**: the HTTP route `/dsh-revert` and the data directory `~/.dsh/dsh-revert/` keep their original names — upgrading changes no path and loses no captured snapshot.

## Known boundaries

- Before-snapshots only exist for `write`/`edit` calls made while the plugin was installed; earlier changes cannot be reverted (the dialog will say "no file changes detected before this step").
- Relies on official internal DOM markers (`[data-chat-flow-kind=user]`, `[data-chat-flow-key]`, `[data-composer-input]`) and service faces (`sessions.fork` / `conversation.input.shell` / `workspaces.archiveSession`); after a DSH upgrade, check these contracts first if something breaks.
- Tested on DeepSeek Harness `0.1.5-rc.1` (web profile); `sessions.create({ workspaceId })` is the correct way to birth a blank session on 0.1.5, and newer-build verbs (`connectWorkspace` / `startSession`) are preferred when present.

## License

MIT
