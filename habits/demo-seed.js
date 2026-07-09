/* Habit Tracker — portfolio demo seed.
 * Runs before the app loads. If the visitor has no habit data yet, writes a
 * realistic sample dataset (~6 weeks) so the Today, Reports, and Dashboard
 * views look alive on first visit. Never overwrites existing data, so anyone
 * who keeps using the tracker keeps their own history.
 */
(function () {
  "use strict";
  var KEY = "habit-tracker:v1";
  try {
    if (localStorage.getItem(KEY) !== null) return; // real or prior demo data — leave it alone

    var DAYS = 45;
    var msDay = 864e5;
    var iso = function (offset) {
      return new Date(Date.now() + offset * msDay).toISOString().slice(0, 10);
    };
    var dow = function (dateStr) { return new Date(dateStr + "T12:00").getDay(); };
    var start = iso(-DAYS);

    var habits = [
      { id: "demo-run", name: "Morning run", type: "boolean", scheduledDays: [1, 3, 5], createdAt: start, archivedAt: null },
      { id: "demo-read", name: "Read", type: "quantity", target: 20, unit: "pages", scheduledDays: [0, 1, 2, 3, 4, 5, 6], createdAt: start, archivedAt: null },
      { id: "demo-water", name: "Drink water", type: "quantity", target: 8, unit: "glasses", scheduledDays: [0, 1, 2, 3, 4, 5, 6], createdAt: start, archivedAt: null },
      { id: "demo-meditate", name: "Meditate", type: "boolean", scheduledDays: [0, 1, 2, 3, 4, 5, 6], createdAt: start, archivedAt: null },
      { id: "demo-review", name: "Weekly review", type: "boolean", scheduledDays: [0], createdAt: start, archivedAt: null },
    ];

    // Deterministic pseudo-random so the demo shape is stable.
    var seed = 42;
    var rand = function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    var entries = [];
    for (var off = -DAYS; off < 0; off++) {
      var date = iso(off);
      var day = dow(date);
      // Completion improves over time: ~65% in early weeks, ~90% in the last two.
      var p = off >= -14 ? 0.9 : 0.65;

      if ([1, 3, 5].indexOf(day) !== -1 && rand() < p) entries.push({ habitId: "demo-run", date: date, value: 1 });
      if (rand() < p) entries.push({ habitId: "demo-read", date: date, value: rand() < 0.7 ? 20 : 10 + Math.floor(rand() * 10) });
      if (rand() < p + 0.05) entries.push({ habitId: "demo-water", date: date, value: rand() < 0.75 ? 8 : 4 + Math.floor(rand() * 4) });
      // Meditate: keep the last 9 days fully complete so a streak is alive.
      if (off >= -9 || rand() < p) entries.push({ habitId: "demo-meditate", date: date, value: 1 });
      if (day === 0 && rand() < 0.8) entries.push({ habitId: "demo-review", date: date, value: 1 });
    }

    // Today: partially done — water mid-progress, reading done, meditation
    // still open (its 9-day streak triggers the "streak in danger" nudge).
    var today = iso(0);
    entries.push({ habitId: "demo-read", date: today, value: 20 });
    entries.push({ habitId: "demo-water", date: today, value: 5 });

    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 1, habits: habits, entries: entries }));
  } catch (e) {
    /* storage unavailable — app falls back to its own empty state */
  }
})();
