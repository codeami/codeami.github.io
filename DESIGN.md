---
version: alpha
name: Software Meta-Factory Chart & Cards
description: The design system for every front end of the Software Meta-Factory. Three skins and one saved choice. "Chart & Cards" puts a live graph under everything and slides content over it as cards, in two colour variants, HUD (warm orange, the default) and Matrix (green). "Calm" is a quiet light skin that covers every surface, the graph and its controls included: a light map on paper, never a dark panel inside a light page. The reader picks a skin once and every page follows.
colors:
  primary: "#e9e6e0"
  secondary: "#8f8b84"
  tertiary: "#ff7a1a"
  neutral: "#05060a"
  surface: "#0c0e11"
  surface-glass: "rgba(12,14,17,.92)"
  line: "#23262b"
  line-strong: "#3a3f46"
  on-accent: "#05060a"
  accent-dim: "#3a2a1d"
  ok: "#5ec27a"
  warn: "#e0554a"
  info: "#5cd3ff"
  matrix-primary: "#d6f5dc"
  matrix-secondary: "#7fa088"
  matrix-tertiary: "#00ff41"
  matrix-neutral: "#020503"
  matrix-surface: "#06100a"
  matrix-line: "#16301d"
  matrix-line-strong: "#24502f"
  matrix-on-accent: "#020503"
  matrix-accent-dim: "#0a3a17"
  matrix-ok: "#7fdcff"
  matrix-warn: "#ff6b5a"
  matrix-info: "#c8ffd4"
  calm-primary: "#2b2620"
  calm-secondary: "#6b5f4a"
  calm-tertiary: "#8a5a2b"
  calm-neutral: "#faf7f2"
  calm-surface: "#ffffff"
  calm-line: "#e4dccb"
  calm-line-strong: "#cfc3ab"
  calm-on-accent: "#ffffff"
  calm-accent-dim: "#efe3d2"
  calm-ok: "#4d7a4d"
  calm-warn: "#b0452f"
  calm-info: "#3d6a8a"
  graph-root: "#ff7a1a"
  graph-skill: "#ff9a3c"
  graph-routine: "#ffb347"
  graph-off: "#6c6a66"
  graph-cli: "#5cd3ff"
  graph-project: "#2ee6c5"
  graph-page: "#ffd93d"
  room-1: "#b57bff"
  room-2: "#ff4fd8"
  room-3: "#4f8dff"
  room-4: "#2ee6c5"
  room-5: "#ffd93d"
  room-6: "#ff8a3d"
  room-7: "#5cd3ff"
typography:
  title:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.3em
  headline-md:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.3
  ui-md:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  ui-sm:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
  reading:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  label-caps:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.3em
  data-lg:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1
  calm-headline:
    fontFamily: Georgia, serif
    fontSize: 28px
    fontWeight: 500
    lineHeight: 1.2
  calm-label:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.12em
  calm-display:
    fontFamily: Georgia, serif
    fontSize: clamp(2rem, 7vw, 3.4rem)
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: -0.01em
  calm-subtitle:
    fontFamily: Georgia, serif
    fontSize: 1.15rem
    fontWeight: 400
    lineHeight: 1.45
rounded:
  none: 0px
  calm: 8px
  dot: 9999px
spacing:
  xs: 3px
  sm: 6px
  md: 12px
  lg: 16px
  xl: 24px
  gutter: 16px
  card-max: 46rem
  panel-w: 340px
  sheet-max: 70vh
  page-max: 74rem
  panel-gap: 16px
components:
  card:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
    padding: 16px
  reading-card:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.primary}"
    typography: "{typography.reading}"
    padding: 16px
    width: "{spacing.card-max}"
  side-panel:
    backgroundColor: "{colors.surface-glass}"
    width: "{spacing.panel-w}"
    padding: 12px
  bottom-sheet:
    backgroundColor: "{colors.surface-glass}"
    height: "{spacing.sheet-max}"
    padding: 12px
  widget-heading:
    textColor: "{colors.secondary}"
    typography: "{typography.label-caps}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-accent}"
    typography: "{typography.ui-sm}"
    rounded: "{rounded.none}"
    padding: 8px
    height: 32px
  button-secondary:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
    height: 32px
  button-secondary-hover:
    textColor: "{colors.tertiary}"
  button-ghost:
    textColor: "{colors.secondary}"
    height: 32px
  button-danger:
    textColor: "{colors.warn}"
    height: 32px
  button-icon:
    size: 32px
  input:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.ui-md}"
    height: 34px
  input-error:
    textColor: "{colors.warn}"
  chip:
    textColor: "{colors.secondary}"
    typography: "{typography.ui-sm}"
    height: 26px
  chip-selected:
    textColor: "{colors.tertiary}"
  badge:
    typography: "{typography.ui-sm}"
    padding: 3px
  toast:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    width: 320px
  stat:
    textColor: "{colors.primary}"
    typography: "{typography.data-lg}"
  node-selected:
    backgroundColor: "{colors.tertiary}"
    rounded: "{rounded.dot}"
    size: 10px
  kicker:
    textColor: "{colors.calm-secondary}"
    typography: "{typography.calm-label}"
  editorial-title:
    textColor: "{colors.calm-primary}"
    typography: "{typography.calm-display}"
  title-highlight:
    backgroundColor: "{colors.calm-accent-dim}"
    textColor: "{colors.calm-tertiary}"
  tag-chip:
    backgroundColor: "{colors.calm-surface}"
    textColor: "{colors.calm-secondary}"
    rounded: "{rounded.dot}"
    padding: 4px
  series-index:
    textColor: "{colors.calm-primary}"
    typography: "{typography.reading}"
  quote-card:
    backgroundColor: "{colors.calm-accent-dim}"
    textColor: "{colors.calm-primary}"
    typography: "{typography.calm-subtitle}"
    rounded: "{rounded.calm}"
    padding: 16px
  side-card:
    backgroundColor: "{colors.calm-surface}"
    textColor: "{colors.calm-primary}"
    rounded: "{rounded.calm}"
    padding: 16px
  panel:
    backgroundColor: "{colors.calm-neutral}"
    textColor: "{colors.calm-primary}"
    rounded: "{rounded.calm}"
    padding: 16px
  panel-box:
    backgroundColor: "{colors.calm-surface}"
    rounded: "{rounded.calm}"
    padding: 12px
  principle-box:
    backgroundColor: "{colors.calm-accent-dim}"
    textColor: "{colors.calm-primary}"
    rounded: "{rounded.calm}"
    padding: 12px
  post-card:
    backgroundColor: "{colors.calm-surface}"
    textColor: "{colors.calm-primary}"
    rounded: "{rounded.calm}"
    padding: 16px
---

# Software Meta-Factory Chart & Cards

## Design principles

Five rules every new screen and every change must keep. Each is checked in the
Agent Contract before anything is handed back.

1. **One skin applies to every surface.** HUD, Matrix or Calm is set once on
   `<html>`. The top bar, cards, panels, the map canvas, its labels, legend and
   buttons all follow it. A surface that cannot follow the skin does not ship;
   there is no dark panel inside a light page, and no light one inside a dark page.
2. **Overlays float over the map, never resize it.** The map keeps the whole
   viewport and centres on it. The page card, the controls panel and the lists
   lay over it. Each can be closed (a ✕ button, and Esc), and on a phone the
   panel is a sheet over the lower map.
3. **One spacing scale.** Steps are 3, 6, 12, 16 and 24px, and a 16px gutter. No
   other gap, padding or margin.
4. **Text meets WCAG AA.** 4.5:1 for text, 3:1 for shapes and lines, in all three
   skins, on every surface, dimmed states included. Colour never carries status alone.
5. **Every control is reachable by keyboard.** Tab reaches it, a 1px accent
   outline with a 2px offset shows where focus is, Esc closes what opened, and
   focus returns to what opened it. On a phone every hit area is at least 44px.

## Overview

One design system, three skins, one saved choice.

**Chart & Cards** is the default for every screen of the Software Meta-Factory. A live graph
is always the base layer. It fills the screen, drifts slowly, and is never hidden
for good. All content slides over it as cards: a reading card for posts, notes and
chat; a side panel for controls; a node card when a node is picked. On desktop the
node card and other detail open as a right panel. On a phone they open as a bottom
sheet, and the graph stays visible above it. A **Chart** button hides the cards so
the graph can be explored on its own.

It feels like a quiet instrument panel laid over a live map: calm, dense, exact,
never playful. It has two colour variants that share every other token:

- **HUD** (default): orange `tertiary` #ff7a1a on near-black.
- **Matrix**: the `matrix-*` set, phosphor green #00ff41 on black-green.

**Calm** is the reading skin: warm off-white paper, Georgia headings, small-caps
labels, 8px corners. It covers every surface, the map as well: the same live
graph is the base layer, drawn light (paper ground, flat dots, no glow), with its
panels, legend, buttons and labels in the Calm palette. Reading pages sit in one
centred column, and a graph also appears as a framed figure when the content
needs one.

The skin is set on `<html>`: `data-skin="hud"`, `"matrix"` or `"calm"`. One file,
`broman-os/skin.js`, owns it. Every page loads that file first in the head, so the
saved skin is on `<html>` before the body is drawn and no page flashes white. It
reads `localStorage` (`skin`, wrapped in try/catch) and falls back to HUD. The
top-bar button (`.theme`) cycles HUD, Matrix, Calm and saves the choice; a change
in one tab reaches the others. No page sets `data-skin` in its markup.

### The idea

**Every screen is a working chart.** The graph is the surveyed sea; every card
is a note pinned to the chart table. Marks on the chart are measured, never
decorative: a line is a link, a ring is a distance from the root, a number is a
reading.

### The voice

EA-bot writes like a navigator keeping the ship's log. It states what was
measured, what changed and when, in short plain lines: "14:07 Chart not loaded.
brain-data.json returned 404." It never says sorry or "oops", never cheers,
never uses an exclamation mark, and marks a guess as "not proven".

## Colors

Each theme fills the same roles, and each role is named for what it is for.
The CSS custom properties in the shared `broman-os/hud.css` follow the roles:
`--bg --panel --glass --ink --mute --line --line-2 --accent --on-accent
--accent-dim --ok --warn --info`.

- **Ink (`--ink`, primary):** what you must read.
- **Pencil (`--mute`, secondary):** labels, metadata, placeholder text; what
  you may skip.
- **Bearing (`--accent`, tertiary):** where you are steering. The only accent:
  selection, focus, the active control, the primary button, the one number that
  changed. Never decoration.
- **Wake (`--accent-dim`):** where you have been: pressed fills, past or
  inactive accent marks.
- **Night water (`--bg`, neutral):** the ground the graph and cards float on.
- **Chart paper (`--panel`, `--glass`):** cards and panels. Chart & Cards uses
  it at 92% opacity so the graph shows through; Calm uses solid white.
- **Graticule and rhumb line (`--line`, `--line-2`):** borders, dividers,
  chart marks and graph links.
- **On-bearing (`--on-accent`):** text on an accent fill.
- **Fair, Hazard, Sounding (`--ok`, `--warn`, `--info`):** status only, always
  next to a word. Fair is healthy, done or proven. Hazard is blocked, failed or
  needs you. Sounding is a neutral new reading.

Matrix makes `ok` cyan (#7fdcff) so a healthy status never disappears into the
green accent.

**Graph colours** are a separate, fixed palette: `graph-*` for node kinds and
`room-1` to `room-7` for the rooms. They are the only other colours allowed, and
only inside graphs and charts. Matrix and Calm remap them to their own palettes
(green and cyan shades; muted earth tones) in `hud.css`.

## Typography

- **Chart & Cards:** monospace (`ui-monospace`) for all UI: title, buttons,
  inputs, labels, node cards, numbers. System sans (`reading`, 16px) for any
  paragraph longer than two lines; monospace paragraphs tire the eye on a phone.
- **Calm:** Georgia (`calm-headline`) for headings, system sans for everything
  else, `calm-label` small caps for labels.
- **Widget headings** (`label-caps` or `calm-label`) are the only spaced
  uppercase text. Buttons, chips and body text keep normal case.
- **Numbers** that are the point of a widget use `data-lg`. One per card at most.
- No web fonts. Bold only for a node's name and a key term in reading text.

## Layout

### Layout: Chart & Cards

- **Base layer:** the graph is `position:fixed; inset:0` behind everything.
- **Cards:** one scrolling column of cards, max `card-max` (46rem), on the left
  on wide screens. Cards float over the graph; its centre stays the centre of
  the viewport.
- **Right panel (900px and up):** node cards, details, chat and the map's
  controls open in a `panel-w` (340px) panel pinned to the right edge. It floats
  over the map and takes no width from it. When the page card is open the
  controls panel sits beside it, still over the map. It has a ✕ button, and Esc
  closes it and returns focus to what opened it.
- **Bottom sheet (under 900px):** the same content opens as a sheet from the
  bottom, at most `sheet-max` (70vh), with a drag handle. The graph stays
  visible above it.
- **Top bar:** brand at left; search (Cmd-K), theme switcher and the
  Cards/Chart toggle at right. It wraps on a phone, never scrolls sideways.
- **Gaps** between cards let pointer events through to the graph.

### Layout: Calm

One centred reading column, max 46rem, on plain paper. Calm applies to all the
UI, the map included: the base-layer graph is light (`calm-neutral` ground,
flat dots in the `calm` graph tones, labels darkened to 4.5:1), and the left
list, controls panel, legend, node cards and buttons use the Calm tokens. This
replaces the earlier rule that kept a dark graph panel under Calm.
Detail panels still use the right panel or bottom sheet. Graphs and ladders
also appear inline: a graph in a framed figure, a course ladder as a stepper.

A **panel post** and the blog index are wider: the page is at most `page-max`
(74rem). Under 760px every grid is one column. From 760px the panel grid and the
post-card grid are two columns, and from 1100px three. The series index and the
side cards sit in one row from 900px. The full prose of a post stays in the
46rem column below the panels.

### Spacing

Steps are 3, 6, 12, 16 and 24px. Gutter 16px on every edge. No horizontal page
scroll at any width.

## Elevation & Depth

Flat. Depth comes from layering: graph at the back, cards and panels in front,
sheets, tooltips, toasts and the command palette on top. No box-shadow, no blur
filters, no gradients on cards. The only glow is a 1px accent ring on a selected
node.

## Shapes

- Chart & Cards: square corners everywhere (`rounded.none`).
- Calm: 8px corners (`rounded.calm`) on cards, inputs and buttons.
- Round shapes are only graph nodes, legend dots, toggle knobs and radio buttons.
- Node kinds have their own shape, so kind is never shown by colour alone:
  root = ringed circle with a square core, room hub = open circle, note = small
  dot, skill = diamond, routine = ring (dashed when not running),
  app/project/page = hexagon.

## Components

Every interactive component has six states: default, hover, focus (1px accent
outline, 2px offset), pressed (`aria-pressed` or `:active`), disabled (45%
opacity, `not-allowed`) and loading (a spinner replaces the icon; the label
stays).

- **Buttons:** primary (accent fill), secondary (glass, 1px line), ghost (text
  only), danger (warn text and border; fill only on press), icon (32px square,
  with a tooltip naming it). Height 32px.
- **Inputs:** 34px, 1px line border, `--bg` fill. Focus turns the border accent.
  Error turns it warn and adds a message under it, in words. Helper text in
  secondary.
- **Search with Cmd-K:** a search field in the top bar shows a `⌘K` key hint.
  Cmd-K or Ctrl-K opens the command palette: one input and a result list of
  nodes and sections, moved with arrow keys, chosen with Enter, closed with Esc.
- **Toggle switch, checkbox, radio:** square box and track in Chart & Cards,
  rounded in Calm. Checked uses the accent. Checkboxes have an indeterminate
  state.
- **Chips:** filter chips (default, selected, removable with ×, disabled).
- **Tabs:** text tabs with a 1px accent underline on the active tab.
- **Segmented control:** buttons joined in one bordered row; one is pressed.
- **Slider:** native range with `accent-color`; the value is printed beside it.
- **Tooltip:** small glass box, 1px line, under or above its target, shown on
  hover and on keyboard focus.
- **Toast:** bottom-left on desktop, above the sheet on a phone. A status word
  first (`ok`, `warn`, `info`), then one line, then an optional action. Leaves
  after 5 seconds; never the only place a message appears.
- **Badge:** a status word in its status colour with a 1px border. Planned or
  not proven items use a dashed border.
- **Nav bar:** the top bar above.
- **Side panel:** graph controls: layout, spin, node size, labels, motion, legend.
  On a framed page they sit behind one dropdown under the site name (Look, Map,
  Layout, View, Help; a full-width sheet on a phone), not as floating buttons.
  "All settings" opens the controls panel (search, layout, view, motion) over the
  map: a ✕ button and Esc close it, and on a phone it is a bottom sheet.
  The left list pane has tabs (Read, Pages, FirstMate). No heading glow.
- **Node card:** glyph of its kind, name in bold, kind and status, then tabs:
  Overview, Links (`comes from`, `leads to`, each a button that jumps to that
  node), Source (file path with a copy button). Opens in the right panel or
  bottom sheet.
- **Overlay card:** the reading card. Sans 16px, max 46rem.
- **Bottom sheet:** handle, title, close button; content scrolls inside it.
- **Table:** 1px row rules, secondary header, a sort mark on the sorted column,
  status as badges.
- **Calm panel post:** the reusable blog layout, in `broman-os/panel.css`
  (link it after `hud.css` and `kit/kit.css`, and load `skin.js` in the head;
  it works in all three skins, and loads no `article.js` or `hud.js`). Pages use the
  classes only; no inline style. Top to bottom:
  - **Kicker** (`.p-kicker`): the series or topic, in `calm-label`, parts split
    by a 1px rule.
  - **Editorial title** (`.p-title`, `calm-display`) with at most one highlighted
    phrase (`.p-hl`: accent text on `accent-dim`). Then the **subtitle**
    (`.p-sub`, italic Georgia, one line), the byline (`.p-byline`) and the
    **tag chips** (`.p-tags`, pill, `secondary` text, 1px line).
  - **Series index** (`.p-index`): "In this post", a numbered list `01`, `02`
    in the accent, each a link to its panel.
  - **Side cards** (`.p-side`): the quote card (`.p-quote`, accent-dim fill,
    accent left rule, italic: one line in the post's own words), then
    `.p-card` for the core idea (`.core` adds an accent border) and for how
    the post differs from the usual way. One to three cards.
  - **Numbered panel grid** (`.p-grid` of `.p-panel`): a header with the number
    (`.p-num`) and title, then labelled boxes (`.p-box` with a `.p-lab` label)
    holding a short list, a numbered list (`.p-steps`) or a small comparison
    table (`.p-table`), then one **principle box** (`.p-principle`: the single
    sentence to keep) and a link to the full section. Panels use the post's
    own words, shortened; never new claims.
  - **Wide panel and figure** (`.p-wide`, `.p-fig`): a panel that spans every
    column, for a diagram. The figure is an inline SVG with `viewBox` and no
    fixed width, drawn only with the role tokens through `.p-svg-*` classes
    (folder, root, line, name, file), max 30rem, with a `<title>`, a `<desc>`
    and a caption that says when the example is made up.
  - **Full prose** (`.p-full.p-prose`): the whole post below the panels, with
    `.p-test` for a test note and `.p-callout` for a side note. It opens with
    "The problem" and ends "Why it matters", "Try it yourself", credits. It
    states dated facts and plans; notes on how reliable the work is stay in
    private notes (a test enforces this). Inside it, `figure` SVGs use the box, line and text
    classes in `panel.css` (`.box`, `.edge`, `.ring`, `.bar`, `.dot`, `.t`, `.s`),
    and `.p-tag`, `.p-gloss`, `.p-ex` and `.p-try` for tags, glossary, examples
    and the try-it box. No post carries a `<style>` block or a `style` attribute.
  - **Post card** (`.p-post` in `.p-posts`, under a `.p-group` heading): kicker,
    title link, one-line summary, date and reading time. The whole card is the
    link. Groups by series or topic, newest first; list only pages that are
    `public` in `share.json`.
- **Empty state:** says what is empty and why, and offers one next step.
- **Error state:** says what failed in plain words, a Retry button, and the
  technical detail in secondary text.

## Graphs and Charts

- **Graph views:** hex (the default, with the Folders view: a honeycomb of
  cells, each room's notes in their own wedge with the room's name on the middle
  of them, folder names between the cells, and the page and project badges one
  badge width outside the outermost cell; it does not spin), rings (root at the
  centre, skills on the inner ring, rooms in sectors, routines and apps on the
  outer rings), force, circle and 3D. The Departments view colours by room only.
  All use the same node kinds, colours, labels, hover label and click-to-card.
  In Calm every view is drawn light.
- **Chart marks:** the rings view draws 32 faint rhumb lines from the root and
  a degree ring on the outer edge (a tick every 10°, labelled 000, 090, 180,
  270), taken from the portolan charts and the astrolabe in References. They
  sit in `--line`, under the links.
- **3D:** a toggle on the map (the 3D button, 2D by default). It uses
  `3d-force-graph` 1.79.0 from `cdn.jsdelivr.net`, pinned, loaded only when 3D
  is first opened, and draws the same public nodes from `brain-data.json`. The
  hover label carries the kind word, because spheres cannot carry the shape.
  If the script fails to load, say so and keep the 2D view.
- **Charts:** line, bar, donut and meter in inline SVG. Axes and grid in
  `--line`, data in `--accent`, other series in `--mute`. Donut segments use
  graph colours and are always labelled with words and numbers. A meter shows
  its threshold mark and turns warn past it, with the word.
- **Labels:** room hubs and the root are always labelled; other nodes on hover,
  or all when the labels switch is on.
- **Motion:** slow drift on the rings view only. `prefers-reduced-motion` stops
  all drift and transitions.

## Do's and Don'ts

- Do keep the graph visible on every Chart & Cards screen; it is the brand.
- Do use the accent for one thing per card: what is selected or what changed.
- Do pair every status colour with a word.
- Do use the sans `reading` style for paragraphs.
- Do keep text contrast at WCAG AA (4.5:1) in all three palettes.
- Do show every state of a control the same way on every page.
- Don't add a colour that is not a token here.
- Don't round corners, add shadows or add gradients in Chart & Cards.
- Don't leave any surface, the map and its controls included, in one skin while
  the page is in another.
- Don't let a panel or card take width from the map.
- Don't spread uppercase spaced labels beyond widget headings.
- Don't use middle-dot meta strings or arrow suffixes as decoration.
- Don't load web fonts or icon fonts. The only external script allowed is the
  pinned 3D graph library, loaded on demand.
- Don't cover more than half of the graph with cards on a wide screen.

### Never

```ini
[never]
gradients=0
soft_shadows=0
blur=0
emoji=0
exclamations=0
sorry=0
hype_words=0              ; amazing, seamless, powerful, magic
second_accent=0
colour_only_status=0
rounded_corners_in_chart=0
web_fonts=0
stock_illustrations=0
bouncy_easing=0           ; motion eases out or steps; it never bounces
skeleton_shimmer=0        ; say what is loading instead
middle_dot_meta=0
arrow_suffix=0
```

## References

Zone 1 of the pack: real, open-access images the look is built from. Inspired
by, never copied. Each line says what we take from it.

1. Portolan chart, Jorge de Aguiar, 1492. Yale Beinecke Library via Wikimedia
   Commons, public domain. The web of rhumb lines from wind roses: our links
   and chart marks.
   https://commons.wikimedia.org/wiki/File:1492_Portolan_chart_of_the_Mediterranean_Sea,_the_North_Atlantic_Ocean,_the_Black_Sea,_and_the_West_African_coast_as_far_south_as_Sierra_Leone.png
2. Compass rose from the Joan Martines atlas, 1591. Wikimedia Commons, public
   domain. One rose that every bearing starts from: our root node.
   https://commons.wikimedia.org/wiki/File:Compass_Rose_Cropped_from_Martines_Atlas_1591_(03_of_14).jpg
3. Dutch sea chart of the Atlantic (West-Indische Paskaert), about 1695.
   Wikimedia Commons, public domain. Open water, a graticule, very few labels.
   https://commons.wikimedia.org/wiki/File:Ca._1695_Dutch_sea_chart_of_the_Atlantic_Ocean.jpg
4. Pilot chart of the Channel approach ("Pas Caert van 't in komen van de
   Canael"), 1661. Rijksmuseum NG-501-34, public domain (CC0). Soundings as
   small numbers on empty water: our data labels.
   https://www.rijksmuseum.nl/en/collection/NG-501-34
5. U.S. Coast Survey reconnaissance plate, James McNeill Whistler, 1854-57.
   The Met 395959, CC0. One ink, hairlines, small type: our 1px lines.
   https://www.metmuseum.org/art/collection/search/395959
6. Astrolabe, Regiomontanus, 1462. The Met 923639, CC0. Concentric rings and a
   degree scale on the rim: the rings view and its degree ring.
   https://www.metmuseum.org/art/collection/search/923639
7. Eight Bells, Winslow Homer, 1887. The Met 814997, CC0. Two sailors taking a
   reading: the voice. Measure first, then state it.
   https://www.metmuseum.org/art/collection/search/814997
8. Octant, mid 19th century. Smithsonian NMAH 1167872, CC0. A fine scale with a
   vernier: our sliders and meter ticks.
   https://www.si.edu/object/nmah_1167872
9. Bond marine chronometer, about 1812-15. Smithsonian NMAH 856140, CC0. A dial
   with minute ticks: our loading and time marks.
   https://www.si.edu/object/nmah_856140
10. Diatom plate in "Science of the Sea", Challenger Society, 1912. Biodiversity
    Heritage Library scan via Internet Archive, no known copyright
    restrictions. A radial structure grown from one centre: the graph itself.
    https://commons.wikimedia.org/wiki/File:Science_of_the_sea._An_elementary_handbook_of_practical_oceanography_for_travellers,_sailors,_and_yachtsmen_(1912)_(14766909795).jpg

## Agent Contract

The look is not yours to decide. It lives in this file and in `broman-os/hud.css`.

1. Read this file before writing or changing any front end of the Software Meta-Factory.
2. Link or inline `hud.css`; use only its classes and custom properties.
3. If a screen needs something the file lacks, use the closest existing component
   and say so in your report. Do not invent new styles.
4. Never edit this file or `hud.css` unless the owner asks to change the look.
5. Write every label, toast and error in the voice above, and check the copy
   against the never-list.
6. Before handing back: check 375px and 1200px widths, all three palettes, the
   five Design principles at the top of this file, and grep for colours not
   listed above.
