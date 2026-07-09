/* Career HQ — frontend. Vanilla JS, no build step. */
"use strict";

const $ = (sel, el = document) => el.querySelector(sel);
const OPEN_STAGES = ["identified", "applied", "screen", "interview", "final", "offer"];
const CLOSED_STAGES = ["closed-accepted", "closed-rejected", "closed-withdrawn", "closed-stale"];
const STAGE_COLOR = {
  identified: "var(--st-identified)", applied: "var(--st-applied)", screen: "var(--st-screen)",
  interview: "var(--st-interview)", final: "var(--st-final)", offer: "var(--st-offer)",
};

const ICONS = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  pipeline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/><circle cx="6" cy="19" r="2"/><circle cx="12" cy="14" r="2"/><circle cx="18" cy="21" r="0.5"/></svg>',
  resume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>',
  jobs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  interview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  compare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M16 7h4l-2 5h-4z"/><path d="M4 7h4l-2 5H2z"/><path d="M7 21h10"/></svg>',
  industry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 15 4-6 4 3 5-8"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "pipeline", label: "Pipeline" },
  { id: "resume", label: "Resume Studio" },
  { id: "jobs", label: "Job Search" },
  { id: "interview", label: "Interview Prep" },
  { id: "compare", label: "Compare Roles" },
  { id: "industry", label: "Industry Intel" },
];

let state = null;
const demo = true; // static demo build — sample data only

/* ---------------- utilities ---------------- */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._h);
  toast._h = setTimeout(() => { t.hidden = true; }, 2800);
}

async function api(path, body) {
  // Static demo: no server. State is baked into demo-data.js.
  if (!body && path.startsWith("/api/state")) return window.DEMO_STATE();
  throw new Error("not available in the demo");
}

function guardWrite() {
  if (demo) { toast("This demo is read-only — the real Career HQ writes to live files"); return false; }
  return true;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
  }
  toast("Prompt copied — paste it into Claude");
}

function daysUntil(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  return Math.round((new Date(dateStr + "T12:00") - new Date(state.today + "T12:00")) / 864e5);
}

function dueBadge(due) {
  const d = daysUntil(due);
  if (d === null) return '<span class="badge none">no date</span>';
  if (d < 0) return `<span class="badge overdue num">${-d}d overdue</span>`;
  if (d === 0) return '<span class="badge today">due today</span>';
  return `<span class="badge soon num">in ${d}d</span>`;
}

/* very small markdown renderer for viewing career files */
function renderMarkdown(md) {
  const lines = md.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  let html = "", listOpen = false, tableRows = [];
  const flushTable = () => {
    if (!tableRows.length) return;
    const [head, ...body] = tableRows;
    html += "<table><thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>"
      + body.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table>";
    tableRows = [];
  };
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (t.startsWith("|")) {
      if (/^\|[\s:|-]+\|$/.test(t)) continue;
      tableRows.push(t.slice(1, -1).split("|").map((c) => c.trim()));
      continue;
    }
    flushTable();
    if (t.startsWith("- ")) {
      if (!listOpen) { html += "<ul>"; listOpen = true; }
      html += `<li>${inline(t.slice(2))}</li>`;
      continue;
    }
    if (listOpen) { html += "</ul>"; listOpen = false; }
    if (t.startsWith("### ")) html += `<h3>${inline(t.slice(4))}</h3>`;
    else if (t.startsWith("## ")) html += `<h2>${inline(t.slice(3))}</h2>`;
    else if (t.startsWith("# ")) html += `<h1>${inline(t.slice(2))}</h1>`;
    else if (t.startsWith("> ")) html += `<p style="color:var(--faint)">${inline(t.slice(2))}</p>`;
    else if (t === "---" || t === "") { /* skip */ }
    else html += `<p>${inline(t)}</p>`;
  }
  if (listOpen) html += "</ul>";
  flushTable();
  return html;
}

/* ---------------- shell ---------------- */

function buildNav() {
  $("#nav").innerHTML = SECTIONS.map((s) =>
    `<button class="nav-link" data-nav="${s.id}">${ICONS[s.id]}<span>${s.label}</span></button>`).join("");
  $("#nav").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-nav]");
    if (btn) location.hash = "#/" + btn.dataset.nav;
  });
}

function currentSection() {
  const id = (location.hash || "").replace("#/", "");
  return SECTIONS.some((s) => s.id === id) ? id : "overview";
}

async function refresh() {
  try {
    state = await api("/api/state" + (demo ? "?demo=1" : ""));
  } catch (e) {
    $("#main").innerHTML = `<div class="empty">Could not load data: ${esc(e.message)}</div>`;
    return;
  }
  const p = state.profile;
  const ready = p.masterReady && p.positioningReady;
  $("#profilePill").innerHTML =
    `<span class="dot ${ready ? "ok" : "warn"}"></span>${ready ? "Profile ready" : "Profile needs setup"}`;
  render();
}

function render() {
  const sec = currentSection();
  document.querySelectorAll(".nav-link").forEach((b) => b.classList.toggle("active", b.dataset.nav === sec));
  const banner = demo ? '<div class="demo-banner">Interactive demo with sample data — the real Career HQ runs locally on private files. Explore the sections, drag pipeline cards, open a card.</div>' : "";
  const renderers = { overview: renderOverview, pipeline: renderPipeline, resume: renderResume, jobs: renderJobs, interview: renderInterview, compare: renderCompare, industry: renderIndustry };
  $("#main").innerHTML = banner + renderers[sec]();
  wireMain();
}

/* ---------------- shared blocks ---------------- */

function promptCard(title, desc, prompt) {
  return `<div class="card prompt-card">
    <h4>${esc(title)}</h4><p>${esc(desc)}</p>
    <div class="prompt-box">${esc(prompt)}</div>
    <div class="prompt-foot"><button class="btn small" data-copy="${esc(prompt)}">${ICONS.copy} Copy prompt</button></div>
  </div>`;
}

function fileList(files, emptyMsg) {
  if (!files.length) return `<div class="empty">${emptyMsg}</div>`;
  return files.map((f) => `<div class="file-row">${ICONS.doc}
    <button class="linkish" data-view="${esc(f.path)}" data-title="${esc(f.name)}">${esc(f.name.replace(/\.md$/, ""))}</button>
    <span class="date num">${f.modified}</span></div>`).join("");
}

function appLabel(r) { return `${esc(r.company)} — ${esc(r.role)}`; }

/* ---------------- overview ---------------- */

function renderOverview() {
  const open = state.pipeline.filter((r) => OPEN_STAGES.includes(r.stage));
  const interviews = open.filter((r) => ["screen", "interview", "final"].includes(r.stage)).length;
  const offers = open.filter((r) => r.stage === "offer").length;
  const wk = state.weekly[state.weekly.length - 1];
  const weekActions = wk ? wk.apps + wk.touches + wk.interviews : 0;
  const appliedPlus = open.filter((r) => r.stage !== "identified").length + state.archive.length;
  const responded = open.filter((r) => ["screen", "interview", "final", "offer"].includes(r.stage)).length;
  const respRate = appliedPlus ? Math.round((responded / appliedPlus) * 100) : null;

  const funnel = OPEN_STAGES.map((s) => ({ s, n: open.filter((r) => r.stage === s).length }));
  const maxN = Math.max(1, ...funnel.map((f) => f.n));

  const actions = open
    .filter((r) => r.nextAction && r.nextAction !== "—")
    .sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1)
    .slice(0, 7);

  const fits = open.filter((r) => r.fitScore != null).sort((a, b) => b.fitScore - a.fitScore).slice(0, 8);

  const shelfItems = [
    ...state.research.companies.map((f) => ({ ...f, kind: "company" })),
    ...state.research.industries.map((f) => ({ ...f, kind: "industry" })),
    ...state.research.comparisons.map((f) => ({ ...f, kind: "comparison" })),
    ...state.prepPacks.map((f) => ({ ...f, kind: "prep" })),
  ];

  return `
  <div class="page-head">
    <div><h1>Overview</h1><div class="sub">${state.profile.statement ? esc(state.profile.statement) : "Your search at a glance. Last weekly review: " + (esc(state.lastReviewed) || "never")}</div></div>
    <button class="btn primary" data-open-add>${ICONS.plus} Add application</button>
  </div>

  <div class="grid cols4">
    <div class="card"><div class="stat-value num">${open.length}</div><div class="stat-label">Open applications</div><div class="stat-hint">${state.archive.length} closed all-time</div></div>
    <div class="card"><div class="stat-value num">${interviews}</div><div class="stat-label">In interview stages</div><div class="stat-hint">screen · interview · final</div></div>
    <div class="card"><div class="stat-value num">${offers}</div><div class="stat-label">Offers on the table</div><div class="stat-hint">${offers ? "review terms before replying" : "keep the funnel fed"}</div></div>
    <div class="card"><div class="stat-value num">${weekActions}</div><div class="stat-label">Actions this week</div><div class="stat-hint">${respRate === null ? "apps + touches + interviews" : `<span class="${respRate >= 15 ? "up" : "down"}">${respRate}% response rate</span>`}</div></div>
  </div>

  <div class="grid cols2" style="margin-top:16px">
    <div class="card">
      <h3>Pipeline funnel</h3>
      ${funnel.map((f) => `<div class="funnel-row">
        <span class="lbl">${f.s}</span>
        <div class="funnel-bar"><div class="funnel-fill" style="width:${(f.n / maxN) * 100}%;background:${STAGE_COLOR[f.s]}"></div></div>
        <span class="num" style="text-align:right">${f.n}</span></div>`).join("")}
      ${open.length === 0 ? '<div class="empty">Nothing in the pipeline yet — <strong>add an application</strong> or copy a Find Jobs prompt.</div>' : ""}
    </div>
    <div class="card">
      <h3>Next actions</h3>
      ${actions.length ? actions.map((r) => `<div class="action-item">
          <div class="action-main">
            <div class="action-title">${esc(r.nextAction)}</div>
            <div class="action-sub">${appLabel(r)} · ${esc(r.stage)}</div>
          </div>${dueBadge(r.due)}
        </div>`).join("") : '<div class="empty">No pending actions. Every open application should have one — run a <strong>weekly review</strong>.</div>'}
    </div>
  </div>

  <div class="grid cols2" style="margin-top:16px">
    <div class="card"><h3>Weekly activity</h3>${weeklyChart()}</div>
    <div class="card"><h3>Where applications come from</h3>${sourceDonut(open)}</div>
  </div>

  <div class="grid cols2" style="margin-top:16px">
    <div class="card">
      <h3>Best-fit open roles</h3>
      ${fits.length ? fits.map((r) => `<div class="fit-row">
          <span class="fit-score num" style="color:${r.fitScore >= 8 ? "var(--success)" : r.fitScore >= 6 ? "var(--warn)" : "var(--danger)"}">${r.fitScore}</span>
          <span class="fit-name">${appLabel(r)}<small>${esc(r.stage)}${r.salary ? " · " + esc(r.salary) : ""}</small></span>
        </div>`).join("") : '<div class="empty">Fit scores appear once applications have a scored fit assessment (resume-tailor and find-jobs write them).</div>'}
    </div>
    <div class="card">
      <h3>Research shelf</h3>
      ${shelfItems.length ? `<div class="shelf">${shelfItems.map((f) =>
        `<button class="chip" data-view="${esc(f.path)}" data-title="${esc(f.name)}">${ICONS.doc}${esc(f.name.replace(/\.md$/, ""))}</button>`).join("")}</div>`
        : '<div class="empty">Company research, industry deep dives, comparisons, and prep packs will collect here as you generate them.</div>'}
    </div>
  </div>`;
}

function weeklyChart() {
  const weeks = state.weekly.slice(-8);
  if (!weeks.length) return '<div class="empty">Logged automatically when you run weekly reviews — applications, human touches, and interviews per week.</div>';
  const W = 560, H = 190, pad = 26, bw = 12, gap = 4;
  const maxV = Math.max(1, ...weeks.flatMap((w) => [w.apps, w.touches, w.interviews]));
  const groupW = (W - pad * 2) / weeks.length;
  const y = (v) => H - 30 - (v / maxV) * (H - 55);
  const series = [["apps", "var(--st-applied)"], ["touches", "var(--cyan)"], ["interviews", "var(--st-interview)"]];
  let bars = "";
  weeks.forEach((w, i) => {
    const x0 = pad + i * groupW + (groupW - (bw * 3 + gap * 2)) / 2;
    series.forEach(([key, color], j) => {
      const v = w[key];
      bars += `<rect x="${x0 + j * (bw + gap)}" y="${y(v)}" width="${bw}" height="${H - 30 - y(v)}" rx="3" fill="${color}"><title>${key}: ${v}</title></rect>`;
    });
    bars += `<text x="${pad + i * groupW + groupW / 2}" y="${H - 10}" text-anchor="middle" font-size="10" fill="var(--faint)">${w.week.slice(5)}</text>`;
  });
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly activity chart">
    <line x1="${pad}" y1="${H - 30}" x2="${W - pad}" y2="${H - 30}" stroke="var(--border-strong)"/>${bars}</svg></div>
  <div class="legend"><span><span class="swatch" style="background:var(--st-applied)"></span>Applications</span>
  <span><span class="swatch" style="background:var(--cyan)"></span>Human touches</span>
  <span><span class="swatch" style="background:var(--st-interview)"></span>Interviews</span></div>`;
}

function sourceDonut(open) {
  const counts = {};
  open.forEach((r) => { const s = (r.source || "unknown").toLowerCase(); counts[s] = (counts[s] || 0) + 1; });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '<div class="empty">Source breakdown (referral vs. cold vs. board) appears once applications are tracked.</div>';
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const colors = ["var(--accent)", "var(--cyan)", "var(--success)", "var(--warn)", "var(--st-interview)", "var(--danger)"];
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0, segs = "";
  entries.forEach(([, n], i) => {
    const frac = n / total;
    segs += `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${colors[i % colors.length]}" stroke-width="18"
      stroke-dasharray="${frac * C} ${C}" stroke-dashoffset="${-offset * C}" transform="rotate(-90 70 70)"/>`;
    offset += frac;
  });
  const referrals = counts["referral"] || 0;
  return `<div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
    <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Application sources">${segs}
      <text x="70" y="66" text-anchor="middle" font-size="22" font-weight="700" fill="var(--text)" font-family="Space Grotesk">${total}</text>
      <text x="70" y="84" text-anchor="middle" font-size="10" fill="var(--muted)">open</text></svg>
    <div class="legend" style="flex-direction:column;gap:8px;margin-top:0">
      ${entries.map(([s, n], i) => `<span><span class="swatch" style="background:${colors[i % colors.length]}"></span>${esc(s)} · <b class="num">${n}</b></span>`).join("")}
    </div></div>
  <div class="stat-hint" style="margin-top:12px">${referrals / (total || 1) >= 0.3 ? "Healthy referral share — referrals convert several times better than cold applications." : "Referrals convert several times better than cold applications — for each batch of apps, add a few human touches."}</div>`;
}

/* ---------------- pipeline (kanban) ---------------- */

function renderPipeline() {
  const cols = OPEN_STAGES.map((stage) => {
    const cards = state.pipeline.filter((r) => r.stage === stage);
    return `<div class="kcol">
      <div class="kcol-head"><span class="swatch" style="background:${STAGE_COLOR[stage]}"></span>${stage}<span class="count num">${cards.length}</span></div>
      <div class="klist glass" data-stage="${stage}">
        ${cards.map((r) => `<div class="kcard stage-tint" draggable="true" data-file="${esc(r.file)}" data-title="${appLabel(r)}" style="border-top-color:${STAGE_COLOR[stage]}">
          <div class="co">${esc(r.company)}</div><div class="ro">${esc(r.role)}</div>
          <div class="meta">${r.fitScore != null ? `<span class="fit-mini num">fit ${r.fitScore}</span>` : ""}
          ${r.due ? `<span class="due-mini num">due ${esc(r.due.slice(5))}</span>` : ""}</div>
        </div>`).join("")}
      </div></div>`;
  }).join("");

  const closed = `<div class="kcol">
    <div class="kcol-head"><span class="swatch" style="background:var(--st-closed)"></span>closed<span class="count num">${state.archive.length}</span></div>
    <div class="klist glass">
      ${state.archive.slice(-6).reverse().map((a) => `<div class="kcard" style="opacity:.6">
        <div class="co">${esc(a.company)}</div><div class="ro">${esc(a.role)} · ${esc(a.outcome.replace("closed-", ""))}</div>
      </div>`).join("") || '<div class="empty">Closed applications archive here with a takeaway.</div>'}
    </div></div>`;

  return `
  <div class="page-head">
    <div><h1>Pipeline</h1><div class="sub">Drag cards between stages — changes write straight to the tracker markdown, so Claude and the dashboard always agree. Click a card for details and actions.</div></div>
    <button class="btn primary" data-open-add>${ICONS.plus} Add application</button>
  </div>
  <div class="kanban">${cols}${closed}</div>
  ${state.pipeline.length === 0 ? `<div class="grid cols2" style="margin-top:18px">
    ${promptCard("Fill the pipeline", "Ask Claude to search openings matched to your profile and add the good ones here.", "Find jobs that match my profile and add the ones I pick to my tracker")}
    ${promptCard("Weekly review", "Claude walks the tracker: stalled apps, due follow-ups, and your weekly action counts.", "Run my weekly pipeline review")}
  </div>` : ""}`;
}

function wireKanban() {
  let dragged = null;
  document.querySelectorAll(".kcard[draggable]").forEach((card) => {
    card.addEventListener("dragstart", () => { dragged = card; card.classList.add("dragging"); });
    card.addEventListener("dragend", () => { dragged = null; card.classList.remove("dragging"); });
    card.addEventListener("click", () => openDrawer(card.dataset.file, card.dataset.title));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") openDrawer(card.dataset.file, card.dataset.title); });
    card.tabIndex = 0;
  });
  document.querySelectorAll(".klist[data-stage]").forEach((list) => {
    list.addEventListener("dragover", (e) => { e.preventDefault(); list.classList.add("dragover"); });
    list.addEventListener("dragleave", () => list.classList.remove("dragover"));
    list.addEventListener("drop", async (e) => {
      e.preventDefault(); list.classList.remove("dragover");
      if (!dragged || !guardWrite()) return;
      const file = dragged.dataset.file, stage = list.dataset.stage;
      try { await api("/api/stage", { file, stage }); toast(`Moved to ${stage}`); await refresh(); }
      catch (err) { toast("Move failed: " + err.message); }
    });
  });
}

/* ---------------- drawer + modal ---------------- */

async function openDrawer(relPathOrFile, title, isAppFile = true) {
  const overlay = $("#drawerOverlay");
  $("#drawerTitle").textContent = title || relPathOrFile;
  $("#drawerBody").innerHTML = '<div class="loading">Loading…</div>';
  $("#drawerActions").innerHTML = "";
  overlay.hidden = false;

  const rel = isAppFile ? "applications/" + relPathOrFile : relPathOrFile;
  if (isAppFile && !demo) {
    const row = state.pipeline.find((r) => r.file === relPathOrFile);
    if (row) {
      $("#drawerActions").innerHTML = `
        <div class="row">
          <select id="dStage" aria-label="Stage">${[...OPEN_STAGES, ...CLOSED_STAGES].map((s) => `<option ${s === row.stage ? "selected" : ""}>${s}</option>`).join("")}</select>
          <button class="btn small" id="dStageGo">Set stage</button>
        </div>
        <div class="row">
          <input id="dNote" placeholder="Log a touch — e.g. 'sent follow-up to recruiter'">
          <button class="btn small" id="dNoteGo">Log</button>
        </div>
        <div class="row">
          <input id="dNext" placeholder="Next action" value="${esc(row.nextAction === "—" ? "" : row.nextAction)}">
          <input id="dDue" type="date" value="${/^\d{4}-\d{2}-\d{2}$/.test(row.due) ? row.due : ""}" style="max-width:150px">
          <button class="btn small" id="dNextGo">Save</button>
        </div>`;
      $("#dStageGo").onclick = async () => {
        if (!guardWrite()) return;
        try { await api("/api/stage", { file: row.file, stage: $("#dStage").value }); toast("Stage updated"); closeOverlays(); await refresh(); }
        catch (e) { toast(e.message); }
      };
      $("#dNoteGo").onclick = async () => {
        const note = $("#dNote").value.trim();
        if (!note || !guardWrite()) return;
        try { await api("/api/touch", { file: row.file, note }); toast("Logged"); openDrawer(relPathOrFile, title); await refresh(); }
        catch (e) { toast(e.message); }
      };
      $("#dNextGo").onclick = async () => {
        if (!guardWrite()) return;
        try { await api("/api/touch", { file: row.file, nextAction: $("#dNext").value.trim(), due: $("#dDue").value }); toast("Next action saved"); await refresh(); }
        catch (e) { toast(e.message); }
      };
    }
  }
  if (demo) {
    $("#drawerBody").innerHTML = '<div class="empty">In the real Career HQ this drawer shows the application\'s full markdown record — posting summary, fit assessment, contacts, and a timestamped timeline log — with controls to change stage, log touches, and set the next action.</div>';
    return;
  }
  try {
    const { content } = await api("/api/file?path=" + encodeURIComponent(rel));
    $("#drawerBody").innerHTML = renderMarkdown(content);
  } catch {
    $("#drawerBody").innerHTML = '<div class="empty">File not found.</div>';
  }
}

function closeOverlays() { $("#drawerOverlay").hidden = true; $("#addOverlay").hidden = true; }

function wireModals() {
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeOverlays));
  document.querySelectorAll(".overlay").forEach((ov) => ov.addEventListener("click", (e) => { if (e.target === ov) closeOverlays(); }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeOverlays(); });

  $("#addForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!guardWrite()) return;
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api("/api/application", data);
      toast(`${data.company} added to pipeline`);
      e.target.reset(); closeOverlays(); await refresh();
    } catch (err) { toast("Add failed: " + err.message); }
  });
}

/* ---------------- section pages ---------------- */

function profileCard() {
  const p = state.profile;
  const row = (ok, label) => `<div class="action-item"><span class="dot ${ok ? "ok" : "warn"}"></span>
    <div class="action-main"><div class="action-title">${label}</div></div>
    <span class="badge ${ok ? "soon" : "today"}">${ok ? "ready" : "needs setup"}</span></div>`;
  return `<div class="card">
    <h3>Profile status</h3>
    ${row(p.masterReady, "Master resume")}
    ${row(p.positioningReady, "Positioning & targets")}
    ${row(p.storyBankReady, `Story bank${p.storyCount ? ` · ${p.storyCount} stories` : ""}`)}
    ${!p.masterReady || !p.positioningReady ? '<div class="empty">Everything below works better once the profile is filled — one guided interview sets it up.</div>' : ""}
  </div>`;
}

function renderResume() {
  return `
  <div class="page-head"><div><h1>Resume Studio</h1><div class="sub">The master resume holds everything; tailored one-page versions are generated per posting and collected here.</div></div></div>
  <div class="grid cols2">
    ${profileCard()}
    <div class="card"><h3>Tailored resumes</h3>${fileList(state.resumes, "No tailored resumes yet — copy the prompt below with a posting you like.")}</div>
  </div>
  <div class="grid cols3" style="margin-top:16px">
    ${promptCard("Set up / refresh profile", "Guided interview that builds your master resume, positioning, and story bank.", "Set up my career profile (run career-onboard)")}
    ${promptCard("Tailor to a posting", "Extracts the posting's requirements, maps your evidence, mirrors keywords, flags gaps honestly.", "Tailor my resume to this job posting:\n[paste the posting text or link here]")}
    ${promptCard("Cover letter", "Three short paragraphs in your voice, hitting their top requirements.", "Write a cover letter for the [role] posting at [company], based on my tailored resume")}
  </div>`;
}

function renderJobs() {
  const identified = state.pipeline.filter((r) => r.stage === "identified");
  return `
  <div class="page-head"><div><h1>Job Search</h1><div class="sub">Claude searches every connected job board (Indeed + ZipRecruiter today, plus the web) with your positioning, merges and scores results against your resume, and feeds picks into the pipeline.</div></div></div>
  <div class="grid cols3">
    ${promptCard("Matched search", "Searches your target titles and ranks results by fit against your profile.", "Find jobs that match my profile")}
    ${promptCard("Targeted search", "Same scoring, but you steer the title and location.", "Find [job title] roles in [location or remote] and rank them against my resume")}
    ${promptCard("Log a posting I found", "Hand Claude any posting; it assesses fit and adds it to the tracker.", "I found this posting — assess my fit and add it to my tracker:\n[paste link or text]")}
  </div>
  <div class="card" style="margin-top:16px">
    <h3>Identified — not yet applied</h3>
    ${identified.length ? identified.map((r) => `<div class="action-item">
      <div class="action-main"><div class="action-title">${appLabel(r)}</div>
      <div class="action-sub">${esc(r.location || "")}${r.salary ? " · " + esc(r.salary) : ""}${r.fitScore != null ? ` · fit ${r.fitScore}/10` : ""}</div></div>
      ${dueBadge(r.due)}</div>`).join("") : '<div class="empty">Roles you\'re considering land here before you apply.</div>'}
  </div>`;
}

function renderInterview() {
  const upcoming = state.pipeline.filter((r) => ["screen", "interview", "final"].includes(r.stage));
  return `
  <div class="page-head"><div><h1>Interview Prep</h1><div class="sub">Per-company prep packs: company brief, likely questions mapped to your story bank, questions to ask, and mock interview rounds.</div></div></div>
  <div class="grid cols2">
    <div class="card"><h3>In interview stages</h3>
      ${upcoming.length ? upcoming.map((r) => `<div class="action-item">
        <div class="action-main"><div class="action-title">${appLabel(r)}</div><div class="action-sub">${esc(r.stage)} · ${esc(r.nextAction)}</div></div>
        ${dueBadge(r.due)}</div>`).join("") : '<div class="empty">When an application reaches screen/interview/final it shows up here.</div>'}
    </div>
    <div class="card"><h3>Prep packs</h3>${fileList(state.prepPacks, "Prep packs are saved per company + role once generated.")}</div>
  </div>
  <div class="grid cols2" style="margin-top:16px">
    ${promptCard("Build a prep pack", "Company research, likely questions mapped to your stories, gaps flagged, questions to ask.", "Prep me for my [round type] interview at [company] for the [role] role")}
    ${promptCard("Mock interview", "Claude plays the interviewer, one question at a time, with specific critique after each answer.", "Run a mock interview with me for my upcoming [company] interview")}
  </div>`;
}

function renderCompare() {
  return `
  <div class="page-head"><div><h1>Compare Roles</h1><div class="sub">Head-to-head scorecard weighted by your priorities, ending in an actual recommendation — comp, growth, culture, risk.</div></div></div>
  <div class="card"><h3>Past comparisons</h3>${fileList(state.research.comparisons, "Comparisons are saved here so decisions stay auditable.")}</div>
  <div class="grid cols2" style="margin-top:16px">
    ${promptCard("Compare two roles", "Works on tracker entries, raw postings, or written offers — both sides researched evenly first.", "Compare [role A at company A] vs [role B at company B] and recommend one")}
    ${promptCard("Offer vs. staying put", "Treats your current situation as one of the options, with the same scorecard.", "Compare the [company] offer against staying in my current position")}
  </div>`;
}

function renderIndustry() {
  return `
  <div class="page-head"><div><h1>Industry Intel</h1><div class="sub">Deep dives on an industry + position: market forces, hiring trends, comp benchmarks, skill demand — always ending with what it means for your candidacy.</div></div></div>
  <div class="grid cols2">
    <div class="card"><h3>Industry deep dives</h3>${fileList(state.research.industries, "Analyses are saved and cited so they stay useful past this week.")}</div>
    <div class="card"><h3>Company research</h3>${fileList(state.research.companies, "Company briefs from interview prep and comparisons collect here.")}</div>
  </div>
  <div class="grid cols2" style="margin-top:16px">
    ${promptCard("Industry deep dive", "Market, players, hiring trends, comp, skill demand, risks — with sources.", "Do a deep industry analysis of [industry] for the [role] position")}
    ${promptCard("Company brief", "Ratings, culture signals, salary bands, and recent news for one employer.", "Research [company] as an employer — culture, ratings, salaries for [role], recent news")}
  </div>`;
}

/* ---------------- wiring ---------------- */

function wireMain() {
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copyText(b.dataset.copy)));
  document.querySelectorAll("[data-open-add]").forEach((b) => b.addEventListener("click", () => {
    if (demo) { toast("Adding applications works in the real Career HQ — this demo is read-only"); return; }
    $("#addOverlay").hidden = false;
    $('#addForm input[name="company"]').focus();
  }));
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => openDrawer(b.dataset.view, b.dataset.title, false)));
  if (currentSection() === "pipeline") wireKanban();
}

/* ---------------- boot ---------------- */

buildNav();
wireModals();
window.addEventListener("hashchange", render);
refresh();
