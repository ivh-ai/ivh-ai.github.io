# Ishaan Hattangady — Portfolio

A single-page portfolio showcasing projects built with Claude Code:
COTE (Countries of the Earth), MathSprint, Career HQ, and whatever ships next.

Plain HTML/CSS/JS — no build step, no dependencies.

## Files

- `index.html` — the whole page (content lives here)
- `styles.css` — design system (colors/spacing in `:root` variables)
- `script.js` — mobile nav + scroll-reveal animations
- `favicon.svg` — IH monogram
- `docs/` — per-project documentation pages (cote, mathsprint, careerhq + shared docs.css)
- `cote/`, `mathsprint/` — bundled playable game demos
- `careerhq-demo/` — static read-only Career HQ dashboard demo with fictional
  sample data (adapted from `../Career HQ/career-dashboard/public/`; the server
  API is replaced by `demo-data.js`, which mirrors the server's `demoState()`)
- `habits/` — Habit Tracker PWA demo (production build of `../Habit Tracker`
  via `npx vite build --base=/habits/`, plus `demo-seed.js` injected into its
  index.html: seeds ~6 weeks of sample habits into localStorage on first visit
  only — never overwrites existing data)

## Local preview

From this folder:

```
node .claude/serve.js
```

Then open http://127.0.0.1:8642.

## Deploying to GitHub Pages

1. Create a repo named `ivh-ai.github.io` on GitHub (public).
2. Push this folder's contents to the repo's `main` branch.
3. In the repo: Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
4. The site goes live at `https://ivh-ai.github.io` within a minute or two.

### Project demo links

The COTE and MathSprint cards link to `cote/` and `mathsprint/`, which are
already bundled in this folder (verified working locally). To refresh them
after changing a game:

- **MathSprint**: copy `../Math Game/index.html` into `mathsprint/index.html`.
- **COTE**: rebuild and copy the output:
  ```
  cd "../World Map Game"
  npx vite build --base=/cote/
  cp -r dist "../Claude Portfolio/cote"
  ```

## Adding a future project

Copy an existing `<article class="project-card reveal">` block in
`index.html` (Projects section), edit the name/description/tags/link, and
keep the dashed "Next project" card last. Update the "projects shipped"
count in the hero stats.

## Before sharing on LinkedIn

- Add an `og-image.png` (1200×630) so LinkedIn shows a preview card, or
  remove the `og:image` meta tag.
