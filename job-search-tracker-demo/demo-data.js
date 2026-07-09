"use strict";
/* Job Search Tracker — static demo shim.
 *
 * The demo runs the REAL dashboard front-end (app.js + styles.css copied
 * verbatim from career-dashboard/public) with no server behind it. This file:
 *   1. forces the app into demo mode before app.js reads localStorage, and
 *   2. intercepts the dashboard's /api/* fetches, serving a fictional sample
 *      pipeline that mirrors the server's demoState().
 *
 * In demo mode the app already simulates every mutation (drag, edit, rounds,
 * add-job) in memory, so nothing here writes anything. All data is fictional.
 */

// 1. Force demo mode (app.js reads this on load).
try { localStorage.setItem("chq-demo", "1"); } catch (e) {}

// 2. Sample dataset — mirrors server demoState(). Dates are relative to today.
function demoState() {
  const d = (o) => new Date(Date.now() + o * 864e5).toISOString().slice(0, 10);
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const mk = (o) => ({
    company: o.company, role: o.role, stage: o.stage,
    applied: o.applied || "", lastTouch: o.lastTouch || d(-2),
    nextAction: o.nextAction === undefined ? "Follow up" : o.nextAction, due: o.due || "",
    file: `${o.applied || d(-9)}-${slug(o.company)}-${slug(o.role)}.md`,
    fitScore: o.fit ?? null, source: o.source || "",
    location: o.location || "Remote", salary: o.salary || "",
    link: o.link || "#", resume: "", prep: "",
    stageSince: o.stageSince || o.lastTouch || d(-3),
    rounds: o.rounds || [],
    timeline: o.timeline || [{ date: o.lastTouch || d(-2), note: "added to pipeline (demo)" }],
  });
  return {
    generatedAt: new Date().toISOString(), today: d(0), demo: true,
    pipeline: [
      mk({ company: "Brightline", role: "Growth PM", stage: "identified", lastTouch: d(-1), stageSince: d(-1),
        nextAction: "Tailor resume + apply", due: d(3), fit: 9, source: "referral", salary: "$140k–$160k", location: "Remote (US)",
        link: "https://boards.greenhouse.io/brightline/jobs/4021" }),
      mk({ company: "Atlas Labs", role: "Product Analyst", stage: "applied", applied: d(-6), lastTouch: d(-6), stageSince: d(-6),
        nextAction: "Follow up if silent", due: d(1), fit: 6, source: "cold outreach", location: "Austin, TX", salary: "$110k–$125k",
        link: "https://atlaslabs.com/careers/product-analyst" }),
      mk({ company: "Vector & Co", role: "Product Manager", stage: "applied", applied: d(-12), lastTouch: d(-12), stageSince: d(-12),
        nextAction: "Decide: follow up or close", due: d(-2), fit: 7, source: "indeed", location: "Chicago, IL", salary: "$130k–$150k",
        link: "https://www.indeed.com/viewjob?jk=vectorpm" }),
      mk({ company: "Kestrel", role: "Senior PM", stage: "applied", applied: d(-4), lastTouch: d(-4), stageSince: d(-4),
        nextAction: "", due: "", fit: 8, source: "linkedin", location: "Remote", salary: "$150k–$175k",
        link: "https://www.linkedin.com/jobs/view/kestrel-spm" }),
      mk({ company: "Northwind Media", role: "Associate PM", stage: "screen", applied: d(-10), lastTouch: d(-3), stageSince: d(-3),
        nextAction: "Send follow-up to recruiter", due: d(0), fit: 7, source: "indeed", location: "New York, NY", salary: "$120k–$140k",
        link: "https://boards.greenhouse.io/northwind/jobs/8810",
        rounds: [
          { date: d(-3), type: "recruiter", status: "completed", notes: "Culture + comp range aligned" },
          { date: d(2), type: "phone", status: "scheduled", notes: "Hiring-manager screen" },
        ] }),
      mk({ company: "Lumen Studios", role: "Product Manager", stage: "interview", applied: d(-18), lastTouch: d(-1), stageSince: d(-5),
        nextAction: "Prep for panel round", due: d(2), fit: 8, source: "referral", location: "Los Angeles, CA", salary: "$135k–$155k",
        link: "https://jobs.lever.co/lumenstudios/pm-2026",
        rounds: [
          { date: d(-9), type: "recruiter", status: "passed", notes: "Strong rapport with recruiter" },
          { date: d(-1), type: "technical", status: "completed", notes: "Product-sense case; felt good" },
          { date: d(2), type: "panel", status: "scheduled", notes: "Cross-functional panel, 4 interviewers" },
        ] }),
      mk({ company: "Meridian Apps", role: "APM", stage: "final", applied: d(-25), lastTouch: d(-2), stageSince: d(-2),
        nextAction: "Thank-you note + references", due: d(1), fit: 7, source: "linkedin", location: "Remote", salary: "$115k–$130k",
        link: "https://meridianapps.com/jobs/apm",
        rounds: [
          { date: d(-14), type: "phone", status: "passed", notes: "" },
          { date: d(-8), type: "onsite", status: "passed", notes: "Whiteboard + lunch; met the team" },
          { date: d(-2), type: "final", status: "completed", notes: "VP conversation, references requested" },
        ] }),
      mk({ company: "Halcyon TV", role: "Product Manager", stage: "offer", applied: d(-35), lastTouch: d(-1), stageSince: d(-1),
        nextAction: "Review written offer terms", due: d(4), fit: 8, source: "referral", location: "Burbank, CA", salary: "$150k base + 15% bonus + equity",
        link: "https://halcyontv.com/careers/pm",
        rounds: [
          { date: d(-20), type: "recruiter", status: "passed", notes: "" },
          { date: d(-12), type: "onsite", status: "passed", notes: "" },
          { date: d(-6), type: "panel", status: "passed", notes: "Unanimous yes" },
        ] }),
    ],
    weekly: [
      { week: d(-23), apps: 5, touches: 3, interviews: 0, notes: "" },
      { week: d(-16), apps: 6, touches: 5, interviews: 1, notes: "" },
      { week: d(-9), apps: 4, touches: 6, interviews: 2, notes: "" },
      { week: d(-2), apps: 3, touches: 7, interviews: 3, notes: "quality over volume" },
    ],
    archive: [
      { company: "Coldstart Inc", role: "PM", outcome: "closed-rejected", closed: d(-15), takeaway: "needed 5+ yrs — aim level-appropriate" },
      { company: "Beacon Health", role: "APM", outcome: "closed-stale", closed: d(-8), takeaway: "no referral path, cold app died" },
    ],
  };
}

// 3. Intercept the dashboard's API calls — there is no server here.
const _fetch = window.fetch ? window.fetch.bind(window) : null;
function jsonResponse(obj) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } });
}
window.fetch = function (input, init) {
  const url = typeof input === "string" ? input : (input && input.url) || "";
  if (url.indexOf("/api/state") !== -1) return Promise.resolve(jsonResponse(demoState()));
  if (url.indexOf("/api/ingest") !== -1) {
    // The real extractor needs a live page fetch; in the static demo we just hand
    // back an empty draft so the user fills the add-job form in by hand.
    let jobUrl = "";
    try { jobUrl = JSON.parse((init && init.body) || "{}").url || ""; } catch (e) {}
    return Promise.resolve(jsonResponse({ ok: true, partial: true, job: { company: "", role: "", location: "", salary: "", source: "demo", url: jobUrl, extracted: "none" } }));
  }
  if (url.indexOf("/api/") !== -1) return Promise.resolve(jsonResponse({ ok: true })); // mutations are handled in-memory anyway
  return _fetch ? _fetch(input, init) : Promise.reject(new Error("offline demo"));
};
