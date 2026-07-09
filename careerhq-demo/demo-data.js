/* Career HQ — static demo dataset.
 * Mirrors the demoState() the real dashboard serves at /api/state?demo=1.
 * All companies and people are fictional. Dates are computed relative to
 * "today" so the pipeline always looks current. Never real data.
 */
"use strict";

window.DEMO_STATE = function () {
  const d = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  const mk = (company, role, stage, applied, lastTouch, nextAction, due, fit, source, extra) => ({
    company, role, stage, applied, lastTouch, nextAction, due,
    file: `${applied || d(-9)}-${slug(company)}-${slug(role)}.md`,
    fitScore: fit, source, location: (extra && extra.location) || "Remote", salary: (extra && extra.salary) || "",
    link: "#", resume: "", prep: "", timeline: [{ date: lastTouch || d(-2), note: "demo entry" }],
  });
  return {
    generatedAt: new Date().toISOString(),
    today: d(0),
    demo: true,
    profile: {
      masterReady: true, positioningReady: true, storyBankReady: true, storyCount: 7,
      statement: "Product-minded builder who ships fast, proven by two launched consumer products.",
    },
    pipeline: [
      mk("Lumen Studios", "Product Manager", "interview", d(-18), d(-1), "Prep for panel round", d(2), 8, "referral", { location: "Los Angeles, CA", salary: "$135k–$155k" }),
      mk("Northwind Media", "Associate PM", "screen", d(-10), d(-3), "Send follow-up to recruiter", d(0), 7, "indeed"),
      mk("Atlas Labs", "Product Analyst", "applied", d(-6), d(-6), "Follow up if silent", d(1), 6, "cold outreach"),
      mk("Vector & Co", "Product Manager", "applied", d(-12), d(-12), "Decide: follow up or close", d(-2), 7, "indeed"),
      mk("Brightline", "Growth PM", "identified", "", d(-1), "Tailor resume + apply", d(3), 9, "referral", { salary: "$140k–$160k" }),
      mk("Halcyon TV", "Product Manager", "offer", d(-35), d(-1), "Review written offer terms", d(4), 8, "referral", { location: "Burbank, CA", salary: "$150k base + bonus" }),
      mk("Meridian Apps", "APM", "final", d(-25), d(-2), "Thank-you note + references", d(1), 7, "linkedin"),
    ],
    weekly: [
      { week: d(-28), apps: 5, touches: 3, interviews: 0, notes: "" },
      { week: d(-21), apps: 6, touches: 5, interviews: 1, notes: "" },
      { week: d(-14), apps: 4, touches: 6, interviews: 2, notes: "" },
      { week: d(-7), apps: 3, touches: 7, interviews: 3, notes: "quality over volume" },
    ],
    archive: [
      { company: "Coldstart Inc", role: "PM", outcome: "closed-rejected", closed: d(-15), takeaway: "needed 5+ yrs — aim level-appropriate" },
      { company: "Beacon Health", role: "APM", outcome: "closed-stale", closed: d(-8), takeaway: "no referral path, cold app died" },
    ],
    lastReviewed: d(-4),
    resumes: [{ name: `${d(-8)}-lumen-studios-product-manager.md`, path: "resumes/demo.md", modified: d(-8) }],
    prepPacks: [{ name: "lumen-studios-product-manager.md", path: "interview-prep/demo.md", modified: d(-2) }],
    research: {
      companies: [{ name: "lumen-studios.md", path: "research/companies/demo.md", modified: d(-3) }],
      industries: [{ name: "streaming-media-product-manager.md", path: "research/industries/demo.md", modified: d(-5) }],
      comparisons: [{ name: "halcyon-offer-vs-meridian.md", path: "research/comparisons/demo.md", modified: d(-1) }],
    },
  };
};
