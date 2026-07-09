"use strict";
/* Job Search Tracker front-end. Zero dependencies; talks to server.js. */

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STAGES = [
  { id: "identified", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "screen", label: "Screen" },
  { id: "interview", label: "Interview" },
  { id: "final", label: "Final" },
  { id: "offer", label: "Offer" },
];
const STAGE_IDS = STAGES.map((s) => s.id);
const OUTCOMES = ["closed-accepted", "closed-rejected", "closed-withdrawn", "closed-stale"];

let state = null;
let view = localStorage.getItem("chq-view") || "overview";
let demo = localStorage.getItem("chq-demo") === "1";

/* ---- api ---- */
async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}
async function apiPost(path, body) {
  // In demo mode, mutations are simulated in-memory and NEVER sent to the server,
  // so playing with the sample pipeline can't touch real files. /api/ingest is a
  // read-only page fetch, so it's allowed through even in demo mode.
  if (demo && path !== "/api/ingest") { applyDemoMutation(path, body); return { ok: true }; }
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `POST ${path} → ${res.status}`);
  return data;
}
// Full fetch from the server (real or demo dataset). Used on first load and demo toggle.
async function load() {
  state = await apiGet("/api/state" + (demo ? "?demo=1" : ""));
  document.body.classList.toggle("demo", demo);
  const t = document.querySelector("#demo-toggle");
  if (t) t.checked = demo;
  render();
}
// After a mutation: in demo mode the local state was already changed, so just re-render;
// in real mode, re-fetch from disk to stay authoritative.
async function refresh() { if (demo) render(); else await load(); }

// Demo-only: apply a mutation to the in-memory state, mirroring the server's write endpoints.
function applyDemoMutation(path, body) {
  const now = state.today;
  const row = state.pipeline.find((r) => r.file === body.file);
  if (path === "/api/stage" && row) {
    if (String(body.stage).startsWith("closed-")) {
      state.pipeline = state.pipeline.filter((r) => r !== row);
      state.archive.unshift({ company: row.company, role: row.role, outcome: body.stage, closed: now, takeaway: "" });
    } else {
      row.stage = body.stage; row.lastTouch = now; row.stageSince = now;
      if (body.stage === "applied" && !row.applied) row.applied = now;
    }
  } else if (path === "/api/touch" && row) {
    if (body.note) { row.timeline = [{ date: now, note: body.note }, ...(row.timeline || [])]; row.lastTouch = now; }
    if (body.nextAction !== undefined) row.nextAction = body.nextAction;
    if (body.due !== undefined) row.due = body.due;
    if (body.fields) for (const k of ["location", "salary", "source", "link"]) if (body.fields[k] !== undefined) row[k] = body.fields[k];
  } else if (path === "/api/rounds" && row) {
    row.rounds = body.rounds; row.lastTouch = now;
  } else if (path === "/api/application") {
    state.pipeline.push({
      company: body.company, role: body.role, stage: body.stage || "identified",
      applied: body.stage === "applied" ? now : "", lastTouch: now, stageSince: now,
      nextAction: body.nextAction || "Tailor resume + apply", due: body.due || "",
      location: body.location || "", salary: body.salary || "", source: body.source || "",
      link: body.link || "", rounds: [], timeline: [{ date: now, note: "added (demo)" }],
      file: `demo-${Date.now()}-${(body.company || "job").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`,
    });
  }
}

/* ---- date helpers ---- */
const parseDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || "") ? new Date(s + "T00:00:00") : null);
function daysSince(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  return Math.max(0, Math.round((new Date(state.today + "T00:00:00") - d) / 864e5));
}
const stageAge = (row) => daysSince(row.stageSince || row.lastTouch || row.applied);
const isOverdue = (row) => !!row.due && row.due !== "—" && row.due < state.today;
const needsAttention = (row) => isOverdue(row) || !row.nextAction || row.nextAction === "—";

/* ---- interview rounds ---- */
const ROUND_TYPES = ["phone", "recruiter", "technical", "onsite", "panel", "final", "other"];
const ROUND_STATUSES = ["scheduled", "completed", "passed", "rejected"];
function roundSummary(rounds) {
  const latest = rounds[rounds.length - 1];
  const label = latest.type || latest.status || "logged";
  return `Round ${rounds.length} · ${label}`;
}
function nextScheduledRound(rounds) {
  return (rounds || []).find((r) => r.status === "scheduled" && /^\d{4}-\d{2}-\d{2}$/.test(r.date || "")) || null;
}

/* ---- shell ---- */
function render() {
  document.querySelectorAll(".nav-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === view));
  if (view === "board") renderBoard(); else renderOverview();
}
function setView(v) { view = v; localStorage.setItem("chq-view", v); render(); }

/* ---- board ---- */
function tileHtml(row) {
  const unparsed = !row.file;
  const age = stageAge(row);
  const meta = [row.location, row.salary].filter((v) => v && v !== "—").map(esc).join(" · ");
  const action = row.nextAction && row.nextAction !== "—"
    ? `<div class="tile-action ${isOverdue(row) ? "overdue" : ""}">↳ ${esc(row.nextAction)}${row.due && row.due !== "—" ? ` <span class="due">${esc(row.due)}</span>` : ""}</div>`
    : `<div class="tile-action missing">no next action</div>`;
  return `<article class="tile ${unparsed ? "unparsed" : ""}" draggable="${!unparsed}" data-file="${esc(row.file || "")}">
    <div class="tile-top">
      <div><div class="tile-company">${esc(row.company)}</div><div class="tile-role">${esc(row.role)}</div></div>
      ${row.link && row.link !== "#" && row.link !== "—" ? `<a class="tile-link" href="${esc(row.link)}" target="_blank" rel="noopener" title="Open posting">↗</a>` : ""}
    </div>
    ${meta ? `<div class="tile-meta">${meta}</div>` : ""}
    <div class="tile-badges">
      ${row.source && row.source !== "—" ? `<span class="badge">${esc(row.source)}</span>` : ""}
      ${age != null ? `<span class="badge dim">${age}d in stage</span>` : ""}
      ${row.rounds && row.rounds.length ? `<span class="badge round-badge">${esc(roundSummary(row.rounds))}</span>` : ""}
      ${nextScheduledRound(row.rounds) ? `<span class="badge dim">next: ${esc(nextScheduledRound(row.rounds).date)}</span>` : ""}
      ${STAGE_IDS.includes(row.stage) ? "" : `<span class="badge dim">unknown stage: ${esc(row.stage)}</span>`}
      ${unparsed ? `<span class="badge dim">unparsed row — fix in tracker.md</span>` : ""}
    </div>
    ${action}
  </article>`;
}

function renderBoard() {
  const misfits = state.pipeline.filter((r) => !STAGE_IDS.includes(r.stage)); // surfaced in "Saved", never hidden
  const cols = STAGES.map((s) => {
    const rows = state.pipeline.filter((r) => r.stage === s.id).concat(s.id === "identified" ? misfits : []);
    return `<section class="col" data-stage="${s.id}">
      <header class="col-head stage-${s.id}"><span>${s.label}</span><span class="count">${rows.length}</span></header>
      <div class="col-body">${rows.map(tileHtml).join("") || '<div class="col-empty">·</div>'}</div>
    </section>`;
  }).join("");
  const archive = state.archive.length
    ? `<details class="archive"><summary>Closed · ${state.archive.length}</summary><div class="archive-rows">${
        state.archive.map((a) => `<div class="archive-row"><strong>${esc(a.company)}</strong> ${esc(a.role)}
          <span class="badge dim">${esc(a.outcome)}</span> <span class="dim">${esc(a.closed)}</span>${
          a.takeaway && a.takeaway !== "—" ? ` — ${esc(a.takeaway)}` : ""}</div>`).join("")}</div></details>`
    : "";
  $("#view").innerHTML = `<div class="board">${cols}</div>${archive}`;
  wireBoard();
}

function wireBoard() {
  document.querySelectorAll(".tile[data-file]:not(.unparsed)").forEach((t) => {
    t.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", t.dataset.file); t.classList.add("dragging"); });
    t.addEventListener("dragend", () => t.classList.remove("dragging"));
    t.addEventListener("click", (e) => { if (e.target.closest("a")) return; openDetail(t.dataset.file); });
  });
  document.querySelectorAll(".col").forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("dropping"); });
    col.addEventListener("dragleave", () => col.classList.remove("dropping"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("dropping");
      const file = e.dataTransfer.getData("text/plain");
      const row = state.pipeline.find((r) => r.file === file);
      if (!row || row.stage === col.dataset.stage) return;
      try { await apiPost("/api/stage", { file, stage: col.dataset.stage }); } catch (err) { alert(err.message); }
      await refresh();
    });
  });
}

/* ---- detail drawer ---- */
function openDetail(file) {
  const row = state.pipeline.find((r) => r.file === file);
  if (!row) return;
  const v = (x) => (x && x !== "—" ? x : "");
  $("#drawer").innerHTML = `
    <div class="drawer-head">
      <div><h2>${esc(row.company)}</h2><p class="dim">${esc(row.role)} · ${esc(row.stage)}</p></div>
      <button class="icon-btn" id="drawer-close" title="Close">✕</button>
    </div>
    <form id="detail-form" class="stack">
      <label>Next action <input name="nextAction" value="${esc(v(row.nextAction))}"></label>
      <label>Due <input type="date" name="due" value="${esc(v(row.due))}"></label>
      <div class="row">
        <label>Location <input name="location" value="${esc(v(row.location))}"></label>
        <label>Salary <input name="salary" value="${esc(v(row.salary))}"></label>
      </div>
      <div class="row">
        <label>Source <input name="source" value="${esc(v(row.source))}"></label>
        <label>Posting link <input name="link" value="${esc(v(row.link))}"></label>
      </div>
      <button class="btn primary" type="submit">Save changes</button>
    </form>
    <form id="touch-form" class="stack">
      <label>Log a touch <input name="note" placeholder="e.g. emailed recruiter" autocomplete="off"></label>
      <button class="btn" type="submit">Log touch</button>
    </form>
    <div class="stack rounds-block">
      <div class="rounds-head"><strong>Interview rounds</strong><button class="btn" type="button" id="add-round">+ Round</button></div>
      <div id="rounds-list"></div>
      <button class="btn primary" type="button" id="save-rounds">Save rounds</button>
    </div>
    <div class="stack">
      <label>Close application
        <select id="close-outcome"><option value="">choose outcome…</option>${OUTCOMES.map((o) => `<option>${o}</option>`).join("")}</select>
      </label>
      <button class="btn danger" id="close-app" type="button">Close application</button>
    </div>
    ${row.timeline && row.timeline.length ? `<h3>Timeline</h3><ul class="timeline">${
      row.timeline.map((t) => `<li><span class="dim">${esc(t.date)}</span> ${esc(t.note)}</li>`).join("")}</ul>` : ""}`;
  document.body.classList.add("drawer-open");
  $("#drawer-close").onclick = closeDrawer;
  $("#detail-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await apiPost("/api/touch", {
      file,
      nextAction: f.get("nextAction"),
      due: f.get("due"),
      fields: { location: f.get("location"), salary: f.get("salary"), source: f.get("source"), link: f.get("link") },
    });
    await refresh();
    closeDrawer();
  };
  $("#touch-form").onsubmit = async (e) => {
    e.preventDefault();
    const note = new FormData(e.target).get("note");
    if (note) { await apiPost("/api/touch", { file, note }); await refresh(); }
    openDetail(file);
  };

  // interview rounds: draft array lives in the DOM; add/remove re-render, save persists
  let draftRounds = (row.rounds || []).map((r) => ({ ...r }));
  const collectRounds = () => [...$("#rounds-list").querySelectorAll(".round-row")].map((el) => ({
    date: el.querySelector(".rd-date").value,
    type: el.querySelector(".rd-type").value,
    status: el.querySelector(".rd-status").value,
    notes: el.querySelector(".rd-notes").value.trim(),
  }));
  const opt = (list, sel) => list.map((x) => `<option${x === sel ? " selected" : ""}>${x}</option>`).join("");
  function renderRounds() {
    $("#rounds-list").innerHTML = draftRounds.length
      ? draftRounds.map((r, i) => `<div class="round-row" data-i="${i}">
          <input type="date" class="rd-date" value="${esc(r.date || "")}">
          <select class="rd-type">${opt(ROUND_TYPES, r.type)}</select>
          <button class="icon-btn rd-del" type="button" title="Remove round">✕</button>
          <select class="rd-status">${opt(ROUND_STATUSES, r.status)}</select>
          <input class="rd-notes" placeholder="notes" value="${esc(r.notes || "")}">
        </div>`).join("")
      : '<p class="dim">No rounds yet — add one as interviews get scheduled.</p>';
    $("#rounds-list").querySelectorAll(".rd-del").forEach((b) =>
      b.addEventListener("click", () => { const i = +b.closest(".round-row").dataset.i; draftRounds = collectRounds(); draftRounds.splice(i, 1); renderRounds(); }));
  }
  renderRounds();
  $("#add-round").onclick = () => { draftRounds = collectRounds(); draftRounds.push({ date: state.today, type: "phone", status: "scheduled", notes: "" }); renderRounds(); };
  $("#save-rounds").onclick = async () => {
    await apiPost("/api/rounds", { file, rounds: collectRounds() });
    await refresh();
    openDetail(file);
  };

  $("#close-app").onclick = async () => {
    const stage = $("#close-outcome").value;
    if (!stage) return;
    await apiPost("/api/stage", { file, stage });
    await refresh();
    closeDrawer();
  };
}
function closeDrawer() { document.body.classList.remove("drawer-open"); $("#drawer").innerHTML = ""; }

/* ---- add-job modal ---- */
function openAdd() {
  $("#modal").innerHTML = `
    <div class="modal-card">
      <div class="modal-head"><h2>Add a job</h2><button class="icon-btn" id="modal-close" title="Close">✕</button></div>
      <form id="ingest-form" class="stack">
        <label>Job posting URL <input name="url" type="url" placeholder="https://…" autofocus></label>
        <div class="row">
          <button class="btn primary" type="submit">Fetch details</button>
          <button class="btn" type="button" id="manual-entry">Enter manually</button>
        </div>
        <p class="hint" id="ingest-status"></p>
      </form>
      <div id="job-form-slot"></div>
    </div>`;
  document.body.classList.add("modal-open");
  $("#modal-close").onclick = closeModal;
  $("#modal").onclick = (e) => { if (e.target.id === "modal") closeModal(); };
  $("#manual-entry").onclick = () => showJobForm({ url: $("#ingest-form").url.value.trim() });
  $("#ingest-form").onsubmit = async (e) => {
    e.preventDefault();
    const url = e.target.url.value.trim();
    if (!url) return showJobForm({});
    $("#ingest-status").textContent = "Fetching…";
    try {
      const r = await apiPost("/api/ingest", { url });
      $("#ingest-status").textContent = r.partial
        ? "Couldn't auto-extract — fill in the details manually."
        : "Details found — review, fix anything, and save.";
      showJobForm(r.job);
    } catch (err) {
      $("#ingest-status").textContent = err.message;
      showJobForm({ url });
    }
  };
}

function showJobForm(job) {
  $("#job-form-slot").innerHTML = `
    <form id="job-form" class="stack">
      <div class="row">
        <label>Company <input name="company" required value="${esc(job.company || "")}"></label>
        <label>Role <input name="role" required value="${esc(job.role || "")}"></label>
      </div>
      <div class="row">
        <label>Location <input name="location" value="${esc(job.location || "")}"></label>
        <label>Salary <input name="salary" value="${esc(job.salary || "")}"></label>
      </div>
      <div class="row">
        <label>Source <input name="source" value="${esc(job.source || "")}"></label>
        <label>Starting column
          <select name="stage">${STAGES.map((s) => `<option value="${s.id}"${s.id === "applied" ? " selected" : ""}>${s.label}</option>`).join("")}</select>
        </label>
      </div>
      <div class="row">
        <label>Next action <input name="nextAction" placeholder="defaults sensibly if empty"></label>
        <label>Due <input name="due" type="date"></label>
      </div>
      <input type="hidden" name="link" value="${esc(job.url || "")}">
      <button class="btn primary" type="submit">Save to board</button>
    </form>`;
  $("#job-form").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    if (!d.nextAction) d.nextAction = d.stage === "applied" ? "Follow up if silent" : "Tailor resume + apply";
    try { await apiPost("/api/application", d); } catch (err) { $("#ingest-status").textContent = err.message; return; }
    closeModal();
    await refresh();
  };
}

function closeModal() { document.body.classList.remove("modal-open"); $("#modal").innerHTML = ""; }
/* ---- overview ---- */
function renderOverview() {
  const open = state.pipeline;
  const interviewing = open.filter((r) => ["screen", "interview", "final"].includes(r.stage)).length;
  const offers = open.filter((r) => r.stage === "offer").length;
  const latest = state.weekly[state.weekly.length - 1];
  const weekAge = latest ? daysSince(latest.week) : null;
  const actionsThisWeek = latest && weekAge != null && weekAge < 7 ? latest.apps + latest.touches + latest.interviews : 0;
  const attention = open.filter(needsAttention);

  const cards = [
    [open.length, "Open applications"],
    [interviewing, "In interview stages"],
    [offers, "Offers on the table"],
    [actionsThisWeek, "Actions this week"],
  ].map(([n, label]) => `<div class="card stat"><div class="stat-n">${n}</div><div class="stat-label">${label}</div></div>`).join("");

  const attn = attention.length
    ? attention.map((r) => `<button class="attn-row ${isOverdue(r) ? "overdue" : ""}" data-file="${esc(r.file)}">
        <strong>${esc(r.company)}</strong> ${esc(r.role)}
        <span>${isOverdue(r) ? `overdue: ${esc(r.nextAction)} (was due ${esc(r.due)})` : "no next action set"}</span>
      </button>`).join("")
    : '<p class="dim">Nothing overdue and every open application has a next action.</p>';

  const max = Math.max(1, ...STAGES.map((s) => open.filter((r) => r.stage === s.id).length));
  const funnel = STAGES.map((s) => {
    const n = open.filter((r) => r.stage === s.id).length;
    return `<div class="funnel-row"><span class="funnel-label">${s.label}</span>
      <div class="funnel-bar"><div class="funnel-fill stage-${s.id}" style="width:${(n / max) * 100}%"></div></div>
      <span class="funnel-n">${n}</span></div>`;
  }).join("");

  $("#view").innerHTML = `
    <div class="stats">${cards}</div>
    <div class="card"><h2>Needs attention · ${attention.length}</h2>${attn}</div>
    <div class="card"><h2>Pipeline funnel</h2>${funnel}</div>`;
  document.querySelectorAll(".attn-row").forEach((b) =>
    b.addEventListener("click", () => { setView("board"); openDetail(b.dataset.file); }));
}

/* ---- init ---- */
document.querySelectorAll(".nav-tab").forEach((b) => b.addEventListener("click", () => setView(b.dataset.tab)));
$("#add-job").addEventListener("click", () => openAdd());
$("#demo-toggle").addEventListener("change", (e) => {
  demo = e.target.checked;
  localStorage.setItem("chq-demo", demo ? "1" : "0");
  closeDrawer(); closeModal();
  load().catch((err) => { $("#view").innerHTML = `<p class="error">Failed to load: ${esc(err.message)}</p>`; });
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (typeof closeModal === "function") closeModal(); closeDrawer(); } });
load().catch((e) => { $("#view").innerHTML = `<p class="error">Failed to load: ${esc(e.message)}</p>`; });
