---
name: PDF blank fix - html2canvas offscreen rendering
description: How to correctly render off-screen elements with html2canvas without getting blank output
---

## The Rule
Never use `left: -9999px` or `opacity: 0` when placing an off-screen element for html2canvas capture — both produce blank canvases.

**Why:** html2canvas uses `getBoundingClientRect()` to compute bounds. With `left: -9999px`, the element is outside the virtual viewport so the capture area is empty. With `opacity: 0`, the rendered pixels are transparent → JPEG becomes white → blank PDF.

## Working Pattern (exportToPDF)
1. Place wrapper at `position: fixed; top: 0; left: 0; visibility: hidden` with `data-pdf-offscreen` attribute
2. In `onclone`, find `[data-pdf-offscreen]` and set `visibility: visible` — visibility:hidden hides from user but onclone can override it, making the clone render correctly
3. Pass `scrollX: 0, scrollY: 0` to html2canvas (element is at viewport origin)

## Working Pattern (exportNoHeaderToPDF — in-place capture)
1. Measure `scrollWidth/scrollHeight` before capture
2. Set explicit `width`, `height`, `flex: none` so flex-1 layouts don't collapse to 0 in the clone iframe
3. Pass `scrollX: -window.scrollX, scrollY: -window.scrollY` to compensate for page scroll
4. Restore width/height/flex after capture

**How to apply:** Any time html2canvas is used on an element not currently visible in the normal flow.
