---
name: PDF blank fix - html2canvas overlay approach
description: The reliable way to render off-screen elements with html2canvas without blank output
---

## The Rule
Never use `visibility:hidden`, `opacity:0`, or `left:-9999px` when placing an element for html2canvas capture — all produce blank canvases.

**Why:**
- `left:-9999px` → element is outside the html2canvas virtual viewport → blank capture area
- `opacity:0` → pixels are transparent → JPEG encodes as white → blank PDF
- `visibility:hidden` → even with onclone restore, html2canvas may process styles before callback fully takes effect

## Working Pattern (both exportToPDF and exportNoHeaderToPDF)

**Strategy**: Show a white loading overlay to the user, place the print element FULLY VISIBLE at z-index:1 (below overlay). In `onclone`, hide the overlay so it doesn't appear in the captured canvas.

1. `showPdfLoadingOverlay()` → creates `div[data-pdf-loading-overlay]` at `position:fixed;inset:0;z-index:99999`
2. Place print element in wrapper: `position:fixed;top:0;left:0;z-index:1;pointer-events:none`
3. In `renderToCanvas` → `onclone` callback: `doc.querySelectorAll('[data-pdf-loading-overlay]').forEach(el => el.style.display='none')`
4. After capture: remove both the wrapper and overlay

## exportNoHeaderToPDF specific
- Clone the live element with `cloneNode(true)`
- Manually copy `.value` property of all `input`/`textarea` via `setAttribute('value', input.value)` — cloneNode does NOT copy JS `.value`
- Set explicit `width: 794px` (210mm at 96dpi), `flex:none`, `height:auto` on clone to prevent flex collapse
- Place clone at z-index:1 behind overlay

## exportToPDF specific
- `createPrintDocument` clones the live element and replaces inputs with plain-text divs — no need to copy .value manually
- Place printDoc wrapper at z-index:1 behind overlay
- Mini-header for page 2+ also placed at z-index:1 (overlay still covers it during capture)

**How to apply:** Any future html2canvas element capture in this project should use the overlay pattern.
