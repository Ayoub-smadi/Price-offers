import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Product } from '@shared/schema';

const createPrintDocument = (element: HTMLElement, items: any[], details: any): HTMLElement => {
  const printDiv = document.createElement('div');
  printDiv.style.width = '210mm';
  printDiv.style.padding = '6mm 4mm';
  printDiv.style.backgroundColor = '#ffffff';
  printDiv.style.color = '#000000';
  printDiv.style.fontFamily = 'Cairo, sans-serif';
  printDiv.style.lineHeight = '1.5';
  printDiv.style.fontSize = '14px';
  printDiv.style.direction = 'rtl';
  printDiv.style.textAlign = 'right';
  printDiv.style.boxSizing = 'border-box';

  const clone = element.cloneNode(true) as HTMLElement;

  const inputs = clone.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    const htmlInput = input as HTMLInputElement | HTMLTextAreaElement;
    const value = htmlInput.value;

    const div = document.createElement('div');
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.color = '#000000';

    const computedStyle = window.getComputedStyle(htmlInput);
    div.style.fontSize = computedStyle.fontSize;
    div.style.fontWeight = computedStyle.fontWeight;
    div.style.textAlign = computedStyle.textAlign;
    div.style.margin = computedStyle.margin;
    div.style.padding = computedStyle.padding;

    div.textContent = value || ' ';
    htmlInput.parentNode?.replaceChild(div, htmlInput);
  });

  const noPrint = clone.querySelectorAll('.no-print');
  noPrint.forEach(el => el.remove());

  const tables = clone.querySelectorAll('table');
  tables.forEach(table => {
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';

    const headerCells = table.querySelectorAll('th');
    headerCells.forEach(cell => {
      const element = cell as HTMLElement;
      element.style.border = '1px solid #000000';
      element.style.padding = '10px 8px';
      element.style.minHeight = '40px';
      element.style.height = '40px';
      element.style.verticalAlign = 'middle';
      element.style.textAlign = 'center';
      element.style.backgroundColor = '#1e293b';
      element.style.color = '#ffffff';
      element.style.fontWeight = 'bold';
      element.style.fontSize = '12px';
    });

    const dataCells = table.querySelectorAll('tbody td');
    dataCells.forEach(cell => {
      const element = cell as HTMLElement;
      element.style.border = '1px solid #000000';
      element.style.padding = '10px 8px';
      element.style.minHeight = '40px';
      element.style.height = '40px';
      element.style.verticalAlign = 'middle';
      element.style.wordWrap = 'break-word';
      element.style.whiteSpace = 'normal';
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#000000';
    });

    // Style tfoot (grand total row) to match on-screen appearance
    const tfootCells = Array.from(table.querySelectorAll('tfoot td'));
    const lastTfootIdx = tfootCells.length - 1;
    tfootCells.forEach((cell, idx) => {
      const element = cell as HTMLElement;
      element.style.border = '1px solid #000000';
      element.style.padding = '10px 8px';
      element.style.minHeight = '40px';
      element.style.height = '40px';
      element.style.verticalAlign = 'middle';
      element.style.backgroundColor = '#0f172a';
      element.style.color = '#ffffff';
      element.style.fontWeight = 'bold';
      if (idx === lastTfootIdx) {
        element.style.backgroundColor = '#1e3a8a';
        element.style.fontSize = '14px';
        element.style.fontWeight = '900';
        element.style.textAlign = 'center';
      }
    });
  });

  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const element = el as HTMLElement;
    element.style.boxShadow = 'none';
  });

  // Fix flex containers - apply styles inline since html2canvas ignores Tailwind classes
  const allCloned = clone.querySelectorAll('*');
  allCloned.forEach(container => {
    const el = container as HTMLElement;
    if (!el.classList) return;
    if (el.classList.contains('flex') || el.classList.contains('inline-flex')) {
      el.style.display = 'flex';
      if (el.classList.contains('items-center')) el.style.alignItems = 'center';
      if (el.classList.contains('items-start')) el.style.alignItems = 'flex-start';
      if (el.classList.contains('items-end')) el.style.alignItems = 'flex-end';
      if (el.classList.contains('justify-center')) el.style.justifyContent = 'center';
      if (el.classList.contains('justify-between')) el.style.justifyContent = 'space-between';
      if (el.classList.contains('justify-end')) el.style.justifyContent = 'flex-end';
      if (el.classList.contains('gap-1')) el.style.gap = '4px';
      if (el.classList.contains('gap-2')) el.style.gap = '8px';
      if (el.classList.contains('gap-4')) el.style.gap = '16px';
      if (el.classList.contains('flex-wrap')) el.style.flexWrap = 'wrap';
    }
  });

  // Remove all SVG elements - html2canvas cannot reliably align SVGs with inline text
  // We rebuild the contact footer section manually below using plain text + Unicode
  const svgElements = clone.querySelectorAll('svg');
  svgElements.forEach(svg => {
    svg.parentNode?.removeChild(svg);
  });

  // Rebuild the contact footer if details are provided, replacing the cloned version
  // Find the footer section (last border-t section in the clone) and replace its inner HTML
  if (details && (details.phone || details.email || details.website)) {
    // Find all border-t divs and take the last one (contact section)
    const borderSections = clone.querySelectorAll('[class*="border-t"]');
    const contactSection = borderSections[borderSections.length - 1] as HTMLElement | undefined;

    if (contactSection) {
      contactSection.innerHTML = '';
      contactSection.style.borderTop = '1px solid #e2e8f0';
      contactSection.style.paddingTop = '8px';
      contactSection.style.textAlign = 'center';

      const companyName = document.createElement('div');
      companyName.textContent = details.companyNameAr || 'مؤسسة ومشاتل القادري الزراعية';
      companyName.style.fontSize = '10px';
      companyName.style.fontWeight = 'bold';
      companyName.style.color = '#0f172a';
      companyName.style.marginBottom = '6px';
      contactSection.appendChild(companyName);

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'center';
      row.style.gap = '20px';
      row.style.direction = 'ltr';
      row.style.fontSize = '10px';
      row.style.color = '#475569';
      row.style.fontFamily = 'Cairo, Arial, sans-serif';

      const makeItem = (icon: string, text: string) => {
        const item = document.createElement('span');
        item.style.display = 'inline-flex';
        item.style.alignItems = 'center';
        item.style.gap = '3px';
        item.style.lineHeight = '1.4';

        const iconSpan = document.createElement('span');
        iconSpan.textContent = icon;
        iconSpan.style.display = 'inline-block';
        iconSpan.style.lineHeight = '1';
        iconSpan.style.fontSize = '10px';
        iconSpan.style.fontFamily = 'Arial, sans-serif';

        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        textSpan.style.fontWeight = '600';

        item.appendChild(iconSpan);
        item.appendChild(textSpan);
        return item;
      };

      if (details.phone) row.appendChild(makeItem('☎', details.phone));
      if (details.email) row.appendChild(makeItem('✉', details.email));
      if (details.website) row.appendChild(makeItem('⊕', details.website));

      contactSection.appendChild(row);
    }
  }

  printDiv.appendChild(clone);
  return printDiv;
};

const createPageMiniHeader = (details: any, logoSrc: string): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.style.width = '210mm';
  wrapper.style.padding = '3mm 4mm 2mm';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.direction = 'rtl';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.borderBottom = '2px solid #e2e8f0';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '10px';
  wrapper.style.fontFamily = 'Cairo, sans-serif';

  if (logoSrc) {
    const logo = document.createElement('img');
    logo.src = logoSrc;
    logo.crossOrigin = 'anonymous';
    logo.style.width = '45px';
    logo.style.height = '45px';
    logo.style.objectFit = 'contain';
    logo.style.flexShrink = '0';
    wrapper.appendChild(logo);
  }

  const textDiv = document.createElement('div');
  textDiv.style.flex = '1';

  const nameAr = document.createElement('div');
  nameAr.style.fontSize = '13px';
  nameAr.style.fontWeight = 'bold';
  nameAr.style.color = '#1e293b';
  nameAr.textContent = details.companyNameAr || 'مؤسسة ومشاتل القادري الزراعية';

  const nameEn = document.createElement('div');
  nameEn.style.fontSize = '9px';
  nameEn.style.color = '#64748b';
  nameEn.style.direction = 'ltr';
  nameEn.style.textAlign = 'left';
  nameEn.textContent = details.companyNameEn || 'Al-Qadri Agricultural Establishment';

  textDiv.appendChild(nameAr);
  textDiv.appendChild(nameEn);
  wrapper.appendChild(textDiv);

  return wrapper;
};

const renderToCanvas = async (el: HTMLElement): Promise<HTMLCanvasElement> => {
  return html2canvas(el, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    allowTaint: true,
    imageTimeout: 15000,
    windowWidth: Math.round(210 * 96 / 25.4),
  });
};

export const exportToPDF = async (
  elementId: string,
  filename: string,
  items?: any[],
  details?: any,
  logoSrc?: string
) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const marginX = 2;
    const marginY = 2;
    const imgWidth = pdfWidth - marginX * 2;

    // --- Render main document ---
    const printDoc = createPrintDocument(element, items || [], details || {});
    printDoc.style.position = 'fixed';
    printDoc.style.top = '-9999px';
    printDoc.style.left = '-9999px';
    document.body.appendChild(printDoc);
    await new Promise(resolve => setTimeout(resolve, 200));

    const mainCanvas = await renderToCanvas(printDoc);
    document.body.removeChild(printDoc);

    // --- Render mini header for subsequent pages ---
    let miniHeaderCanvas: HTMLCanvasElement | null = null;
    let miniHeaderHeightMM = 0;

    if (logoSrc || details) {
      const miniHeader = createPageMiniHeader(details || {}, logoSrc || '');
      miniHeader.style.position = 'fixed';
      miniHeader.style.top = '-9999px';
      miniHeader.style.left = '-9999px';
      document.body.appendChild(miniHeader);
      await new Promise(resolve => setTimeout(resolve, 150));

      miniHeaderCanvas = await renderToCanvas(miniHeader);
      document.body.removeChild(miniHeader);

      miniHeaderHeightMM = (miniHeaderCanvas.height * imgWidth) / miniHeaderCanvas.width;
    }

    // --- Calculate page dimensions in canvas pixels ---
    const canvasPixelsPerMM = mainCanvas.width / imgWidth;
    const fullPageHeightPx = (pdfHeight - marginY * 2) * canvasPixelsPerMM;
    const miniHeaderHeightPx = miniHeaderCanvas
      ? (miniHeaderCanvas.height * mainCanvas.width) / miniHeaderCanvas.width
      : 0;

    // Available content height per page (page 2+ has mini header)
    const contentHeightPage1Px = fullPageHeightPx;
    const contentHeightSubsequentPx = fullPageHeightPx - miniHeaderHeightPx;

    // --- Slice and add pages ---
    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < mainCanvas.height) {
      if (pageIndex > 0) {
        pdf.addPage('a4');
      }

      let contentStartY = marginY;

      // Draw mini header on pages 2+
      if (pageIndex > 0 && miniHeaderCanvas) {
        const miniImgData = miniHeaderCanvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(miniImgData, 'JPEG', marginX, marginY, imgWidth, miniHeaderHeightMM);
        contentStartY = marginY + miniHeaderHeightMM;
      }

      const availableContentPx = pageIndex === 0 ? contentHeightPage1Px : contentHeightSubsequentPx;
      const sliceHeightPx = Math.min(availableContentPx, mainCanvas.height - sourceY);

      if (sliceHeightPx <= 0) break;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = mainCanvas.width;
      pageCanvas.height = Math.round(sliceHeightPx);

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          mainCanvas,
          0, Math.round(sourceY),
          mainCanvas.width, Math.round(sliceHeightPx),
          0, 0,
          mainCanvas.width, Math.round(sliceHeightPx)
        );
      }

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
      const pageHeightMM = sliceHeightPx / canvasPixelsPerMM;

      pdf.addImage(pageImgData, 'JPEG', marginX, contentStartY, imgWidth, pageHeightMM);

      sourceY += availableContentPx;
      pageIndex++;
    }

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
  }
};

// ─── Catalog PDF Export ─────────────────────────────────────────────────────

const COMPANY_PHONE = '00962777772211';
const CURRENCY = 'دينار أردني';
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap';

const loadImageAsDataUrl = (src: string): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve('');
    img.src = src;
  });

const mkEl = (tag: string, css: string, text?: string): HTMLElement => {
  const e = document.createElement(tag);
  e.style.cssText = css;
  if (text !== undefined) e.textContent = text;
  return e;
};

const ensureCairoFont = async () => {
  if (!document.getElementById('cairo-font-link')) {
    const link = document.createElement('link');
    link.id = 'cairo-font-link';
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    document.head.appendChild(link);
  }
  try {
    await Promise.all([
      document.fonts.load('400 16px Cairo'),
      document.fonts.load('700 16px Cairo'),
      document.fonts.load('900 16px Cairo'),
    ]);
    await document.fonts.ready;
  } catch {
    await new Promise(r => setTimeout(r, 1000));
  }
};

// ── Page-aware catalog layout constants ────────────────────────────────────
const A4_W   = Math.round(210 * 96 / 25.4); // 794px
const A4_H   = Math.round(297 * 96 / 25.4); // 1122px
const C_PAD  = 18;   // horizontal + vertical page padding
const C_GAP  = 12;   // gap between cards/rows
const COLS   = 3;    // 3 cards per row
const C_COL  = Math.floor((A4_W - C_PAD * 2 - C_GAP * (COLS - 1)) / COLS); // ~244px

const CARD_IMG_H  = 163;  // tall portrait-style image
const CARD_INFO_H = 115;  // name + description + price
const CARD_BAR_H  = 5;
const CARD_H      = CARD_BAR_H + CARD_IMG_H + CARD_INFO_H; // 283px
const ROW_H       = CARD_H + C_GAP;                        // 295px
const CAT_H       = 46;   // category section header
const MAIN_HDR_H  = 178;  // page 1 header + info bar
const FOOTER_H    = 44;
const PAGE1_AVAIL = A4_H - MAIN_HDR_H - FOOTER_H - C_PAD * 2;
const PAGEN_AVAIL = A4_H - FOOTER_H - C_PAD * 2;

const CATEGORY_STYLES: Record<string, { bar: string; header: string; text: string; badge: string }> = {
  "أشجار":       { bar: '#2d6a4f,#52b788', header: '#0d4a2e', text: '#d1fae5', badge: '#bbf7d0' },
  "شجيرات":      { bar: '#166534,#4ade80', header: '#14532d', text: '#dcfce7', badge: '#a7f3d0' },
  "ورود":        { bar: '#9f1239,#fb7185', header: '#881337', text: '#fce7f3', badge: '#fbcfe8' },
  "نباتات زينة": { bar: '#5b21b6,#a78bfa', header: '#4c1d95', text: '#ede9fe', badge: '#ddd6fe' },
  "متنوعة":      { bar: '#374151,#9ca3af', header: '#1f2937', text: '#f3f4f6', badge: '#e5e7eb' },
};

// ── Types ──────────────────────────────────────────────────────────────────
type CatItem  = { type: 'cat'; label: string; count: number };
type RowItem  = { type: 'row'; cards: Product[] };
type PageItem = CatItem | RowItem;

// ── Chunk helper ──────────────────────────────────────────────────────────
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Build flat item list from products ────────────────────────────────────
function buildItemList(products: Product[]): PageItem[] {
  const items: PageItem[] = [];
  const knownCats: string[] = [];
  const grouped: Record<string, Product[]> = {};

  for (const p of products) {
    const cat = p.category || '';
    if (cat && !knownCats.includes(cat)) knownCats.push(cat);
    if (cat) {
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }
  }

  const misc = products.filter(p => !p.category);

  for (const cat of knownCats) {
    items.push({ type: 'cat', label: cat, count: grouped[cat].length });
    for (const row of chunk(grouped[cat], COLS)) items.push({ type: 'row', cards: row });
  }
  if (misc.length) {
    items.push({ type: 'cat', label: 'متنوعة', count: misc.length });
    for (const row of chunk(misc, COLS)) items.push({ type: 'row', cards: row });
  }
  return items;
}

// ── Page layout: assign items to pages ───────────────────────────────────
function assignToPages(items: PageItem[]): PageItem[][] {
  const pages: PageItem[][] = [[]];
  let avail = PAGE1_AVAIL;
  let used  = 0;

  // accounting heights (each item's visual height + the flex gap that follows it)
  const hCat = CAT_H + C_GAP;
  const hRow = ROW_H; // ROW_H already = CARD_H + C_GAP

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const h    = item.type === 'cat' ? hCat : hRow;

    if (item.type === 'cat') {
      // Ensure cat header + ≥1 row stay together on same page
      const nextH = i + 1 < items.length && items[i + 1].type === 'row' ? hRow : 0;
      if (used > 0 && used + h + nextH > avail) {
        pages.push([]);
        avail = PAGEN_AVAIL;
        used  = 0;
      }
    } else {
      if (used + h > avail) {
        pages.push([]);
        avail = PAGEN_AVAIL;
        used  = 0;
      }
    }
    pages[pages.length - 1].push(item);
    used += h;
  }
  return pages;
}

// ── Build one card element ────────────────────────────────────────────────
async function buildCard(product: Product): Promise<HTMLElement> {
  const s = CATEGORY_STYLES[product.category || ''] || CATEGORY_STYLES['متنوعة'];

  // Outer card wrapper — no overflow:hidden so text is never clipped
  const card = document.createElement('div');
  card.style.cssText = `
    width:${C_COL}px;
    background:#ffffff;
    border-radius:16px;
    border:1.5px solid #d4e9da;
    box-shadow:0 4px 14px rgba(0,0,0,0.10);
    display:block;
    flex-shrink:0;
    overflow:hidden;
  `;

  // ── 1. Top accent bar ──────────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.style.cssText = `height:${CARD_BAR_H}px;background:linear-gradient(90deg,${s.bar});display:block;`;
  card.appendChild(bar);

  // ── 2. Image ───────────────────────────────────────────────────────────
  const imgBox = document.createElement('div');
  imgBox.style.cssText = `
    width:${C_COL}px;
    height:${CARD_IMG_H}px;
    overflow:hidden;
    background:linear-gradient(160deg,#e8f5e9 0%,#c8e6c9 100%);
    display:block;
    position:relative;
  `;

  if (product.imageUrl) {
    const data = await loadImageAsDataUrl(product.imageUrl);
    if (data) {
      const img = document.createElement('img') as HTMLImageElement;
      img.src = data;
      img.style.cssText = `width:${C_COL}px;height:${CARD_IMG_H}px;object-fit:cover;display:block;`;
      imgBox.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.style.cssText = 'font-size:52px;line-height:1;padding:60px 0;text-align:center;';
      ph.textContent = '🌿';
      imgBox.appendChild(ph);
    }
  } else {
    const ph = document.createElement('div');
    ph.style.cssText = 'font-size:52px;line-height:1;padding:60px 0;text-align:center;';
    ph.textContent = '🌿';
    imgBox.appendChild(ph);
  }

  // Category badge overlaid bottom-right of image
  if (product.category) {
    const catBadge = document.createElement('div');
    catBadge.style.cssText = `
      position:absolute;
      bottom:7px;
      right:7px;
      background:${s.header};
      color:#ffffff;
      font-size:8.5px;
      font-weight:700;
      padding:3px 9px;
      border-radius:20px;
      box-shadow:0 2px 6px rgba(0,0,0,0.28);
      direction:rtl;
      unicode-bidi:bidi-override;
    `;
    catBadge.textContent = '\u200F' + product.category;
    imgBox.appendChild(catBadge);
  }
  card.appendChild(imgBox);

  // ── 3. Parse description ───────────────────────────────────────────────
  const hasArabic = (str: string) => /[\u0600-\u06FF]/.test(str);

  let scientificName = '';   // Latin only — shown LTR italic
  let heightInfo    = '';   // Arabic height text
  let arabicDesc    = '';   // fallback: any Arabic description shown RTL

  if (product.description) {
    const cleaned = product.description.replace(/^\(|\)$/g, '').trim();
    const dashIdx = cleaned.search(/\s[–—-]\s/);
    if (dashIdx > 0) {
      const leftPart = cleaned.slice(0, dashIdx).trim();
      const rest     = cleaned.slice(dashIdx).replace(/^[\s–—-]+/, '').trim();
      const hMatch   = rest.match(/ارتفاع[\s\d.,]+م/);
      heightInfo     = hMatch ? hMatch[0] : '';
      if (!hasArabic(leftPart)) {
        scientificName = leftPart;
      } else {
        arabicDesc = leftPart;
      }
    } else {
      const hMatch = cleaned.match(/ارتفاع[\s\d.,]+م/);
      heightInfo   = hMatch ? hMatch[0] : '';
      if (!heightInfo) {
        if (hasArabic(cleaned)) {
          arabicDesc = cleaned.slice(0, 50);
        } else {
          scientificName = cleaned.slice(0, 35);
        }
      }
    }
  }

  // ── 4. Text area (name + desc + height) ───────────────────────────────
  const PRICE_BAR_H = 42;
  const TEXT_AREA_H = CARD_INFO_H - PRICE_BAR_H;

  const textArea = document.createElement('div');
  textArea.style.cssText = `
    width:${C_COL}px;
    height:${TEXT_AREA_H}px;
    box-sizing:border-box;
    padding:9px 12px 6px 12px;
    background:#ffffff;
    direction:rtl;
    text-align:right;
    display:block;
    overflow:hidden;
  `;

  // Product name
  const nameEl = document.createElement('div');
  nameEl.style.cssText = `
    font-size:14px;
    font-weight:900;
    color:#0d1f0a;
    line-height:1.25;
    text-align:right;
    direction:rtl;
    unicode-bidi:bidi-override;
    display:block;
  `;
  nameEl.textContent = '\u200F' + product.name;
  textArea.appendChild(nameEl);

  // Scientific name (Latin only → LTR italic)
  if (scientificName) {
    const sciEl = document.createElement('div');
    sciEl.style.cssText = `
      font-size:8px;
      color:#8fa68a;
      font-style:italic;
      font-weight:500;
      margin-top:3px;
      direction:ltr;
      text-align:left;
      display:block;
    `;
    sciEl.textContent = scientificName;
    textArea.appendChild(sciEl);
  }

  // Arabic description (fallback when no Latin sci name)
  if (arabicDesc) {
    const descEl = document.createElement('div');
    descEl.style.cssText = `
      font-size:9px;
      color:#64748b;
      font-weight:500;
      margin-top:3px;
      direction:rtl;
      text-align:right;
      unicode-bidi:bidi-override;
      display:block;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    `;
    descEl.textContent = '\u200F' + arabicDesc;
    textArea.appendChild(descEl);
  }

  // Height info (Arabic)
  if (heightInfo) {
    const htEl = document.createElement('div');
    htEl.style.cssText = `
      font-size:9px;
      color:#4a7c59;
      font-weight:700;
      margin-top:3px;
      direction:rtl;
      text-align:right;
      unicode-bidi:bidi-override;
      display:block;
    `;
    htEl.textContent = '\u200F' + heightInfo;
    textArea.appendChild(htEl);
  }

  card.appendChild(textArea);

  // ── 5. Price bar — solid block at bottom ──────────────────────────────
  const priceBar = document.createElement('div');
  priceBar.style.cssText = `
    width:${C_COL}px;
    height:${PRICE_BAR_H}px;
    box-sizing:border-box;
    background:${s.header};
    display:block;
    padding:0 12px;
    line-height:${PRICE_BAR_H}px;
    direction:rtl;
  `;

  // Use a table to put price on right and unit on left (RTL: price=right)
  const tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;direction:rtl;';
  const tr = document.createElement('tr');

  // Price cell (right side in RTL)
  const tdPrice = document.createElement('td');
  tdPrice.style.cssText = 'text-align:right;vertical-align:middle;line-height:1;padding:0;';
  const priceNum = document.createElement('span');
  priceNum.style.cssText = 'font-size:20px;font-weight:900;color:#ffffff;vertical-align:baseline;';
  priceNum.textContent = Number(product.price).toLocaleString('ar-JO');
  const priceCur = document.createElement('span');
  priceCur.style.cssText = `font-size:10px;font-weight:700;color:${s.text};vertical-align:baseline;margin-right:3px;`;
  priceCur.textContent = 'د.أ';
  tdPrice.appendChild(priceNum);
  tdPrice.appendChild(priceCur);

  // Unit cell (left side in RTL)
  const tdUnit = document.createElement('td');
  tdUnit.style.cssText = 'text-align:left;vertical-align:middle;padding:0;';
  const unitPill = document.createElement('span');
  unitPill.style.cssText = `
    display:inline-block;
    background:rgba(255,255,255,0.2);
    color:#ffffff;
    font-size:9.5px;
    font-weight:800;
    padding:3px 10px;
    border-radius:20px;
    border:1px solid rgba(255,255,255,0.4);
    line-height:1.4;
  `;
  unitPill.textContent = product.unit || 'وحدة';
  tdUnit.appendChild(unitPill);

  tr.appendChild(tdPrice);
  tr.appendChild(tdUnit);
  tbl.appendChild(tr);
  priceBar.appendChild(tbl);
  card.appendChild(priceBar);

  return card;
}

// ── Build one row (3 cards) ───────────────────────────────────────────────
async function buildRow(cards: Product[]): Promise<HTMLElement> {
  const row = mkEl('div', `display:flex;gap:${C_GAP}px;height:${CARD_H}px;align-items:stretch;`);
  for (const p of cards) row.appendChild(await buildCard(p));
  // fill remaining slots with invisible placeholders
  for (let i = cards.length; i < COLS; i++) {
    row.appendChild(mkEl('div', `width:${C_COL}px;flex-shrink:0;`));
  }
  return row;
}

// ── Build category header bar ─────────────────────────────────────────────
function buildCatHeader(label: string, count: number): HTMLElement {
  const s = CATEGORY_STYLES[label] || CATEGORY_STYLES['متنوعة'];

  const wrap = mkEl('div', `
    height:${CAT_H}px;
    background:linear-gradient(135deg,${s.header} 0%,${s.bar.split(',')[0]} 100%);
    border-radius:14px;
    overflow:hidden;
    display:flex;
    align-items:stretch;
    flex-shrink:0;
    box-shadow:0 3px 10px rgba(0,0,0,0.18);
  `);

  // Thick left accent stripe
  wrap.appendChild(mkEl('div', `width:10px;background:linear-gradient(180deg,${s.badge},${s.bar.split(',')[1] || s.badge});flex-shrink:0;`));

  // Inner content
  const inner = mkEl('div', `
    flex:1;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:0 20px 0 14px;
    direction:rtl;
  `);

  // Left side: icon + label
  const leftSide = mkEl('div', 'display:flex;align-items:center;gap:10px;');
  leftSide.appendChild(mkEl('span', 'font-size:20px;line-height:1;', '🌱'));
  const labelEl = mkEl('div', `
    font-size:21px;
    font-weight:900;
    color:#ffffff;
    font-family:'Cairo',Arial,sans-serif;
    letter-spacing:0.5px;
    text-shadow:0 1px 4px rgba(0,0,0,0.35);
    direction:rtl;
    unicode-bidi:bidi-override;
  `);
  labelEl.textContent = '\u200F' + label;
  leftSide.appendChild(labelEl);
  inner.appendChild(leftSide);

  // Right side: count badge
  const countBadge = mkEl('div', `
    background:rgba(255,255,255,0.22);
    color:#ffffff;
    font-size:11.5px;
    font-weight:800;
    padding:5px 16px;
    border-radius:20px;
    border:1.5px solid rgba(255,255,255,0.45);
    white-space:nowrap;
    direction:rtl;
    unicode-bidi:bidi-override;
  `);
  countBadge.textContent = `\u200F${count} صنف`;
  inner.appendChild(countBadge);

  wrap.appendChild(inner);
  return wrap;
}

// ── Build main page header (page 1 only) ──────────────────────────────────
async function buildMainHeader(totalCount: number, logoSrc: string): Promise<HTMLElement> {
  const wrap = mkEl('div', 'margin-bottom:0;');

  const hdr = mkEl('div', `
    background:linear-gradient(135deg,#0d2b1e 0%,#1a4a2e 50%,#22603a 100%);
    padding:20px ${C_PAD + 8}px 16px;
    display:flex;align-items:center;gap:18px;
    border-bottom:4px solid #52b788;
  `);
  const logoData = logoSrc ? await loadImageAsDataUrl(logoSrc) : '';
  if (logoData) {
    const lw = mkEl('div', 'width:92px;height:92px;background:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:4px;box-shadow:0 4px 14px rgba(0,0,0,0.3);');
    const li = document.createElement('img') as HTMLImageElement;
    li.src = logoData;
    li.style.cssText = 'width:84px;height:84px;object-fit:contain;';
    lw.appendChild(li);
    hdr.appendChild(lw);
  }
  const ht = mkEl('div', 'flex:1;direction:rtl;');
  ht.appendChild(mkEl('div', 'font-size:27px;font-weight:900;color:#ffffff;line-height:1.1;direction:rtl;unicode-bidi:bidi-override;', '\u200Fمؤسسة ومشاتل القادري الزراعية'));
  ht.appendChild(mkEl('div', 'height:1px;background:rgba(255,255,255,0.18);margin:10px 0;'));
  ht.appendChild(mkEl('div', 'font-size:13.5px;color:#d1fae5;font-weight:700;direction:rtl;unicode-bidi:bidi-override;', '\u200Fقائمة الأسعار - أسعار الأشجار والشجيرات والورود'));
  hdr.appendChild(ht);
  wrap.appendChild(hdr);

  const info = mkEl('div', `background:#ffffff;padding:8px ${C_PAD + 8}px;border-bottom:1px solid #d1fae5;display:flex;justify-content:space-between;align-items:center;direction:rtl;`);
  const ph = mkEl('div', 'display:flex;align-items:center;gap:6px;direction:rtl;');
  ph.appendChild(mkEl('span', 'font-size:12.5px;color:#166534;font-weight:700;direction:ltr;unicode-bidi:embed;', COMPANY_PHONE));
  ph.appendChild(mkEl('span', 'font-size:12.5px;color:#166534;direction:rtl;unicode-bidi:bidi-override;', '\u200F:هاتف'));
  info.appendChild(ph);
  info.appendChild(mkEl('span', 'font-size:10.5px;color:#64748b;font-weight:600;direction:rtl;unicode-bidi:bidi-override;', `\u200Fتاريخ الإصدار: ${new Date().toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' })}`));
  info.appendChild(mkEl('span', 'font-size:10.5px;color:#64748b;font-weight:600;direction:rtl;unicode-bidi:bidi-override;', `\u200Fإجمالي الأصناف: ${totalCount}`));
  wrap.appendChild(info);
  return wrap;
}

// ── Build page footer ─────────────────────────────────────────────────────
function buildFooter(pageNum: number, totalPages: number): HTMLElement {
  const f = mkEl('div', `
    height:${FOOTER_H}px;
    background:linear-gradient(135deg,#0d2b1e,#22603a);
    display:flex;justify-content:space-between;align-items:center;
    padding:0 ${C_PAD + 8}px;
    border-top:3px solid #52b788;
    flex-shrink:0;
  `);
  f.appendChild(mkEl('div', 'color:#d1fae5;font-size:10.5px;font-weight:700;direction:rtl;unicode-bidi:bidi-override;', '\u200Fمؤسسة ومشاتل القادري الزراعية'));
  f.appendChild(mkEl('div', 'color:#86efac;font-size:10.5px;font-weight:600;', `${pageNum} / ${totalPages}`));
  f.appendChild(mkEl('div', 'color:#86efac;font-size:10.5px;font-weight:700;direction:ltr;', `${COMPANY_PHONE} :☎`));
  return f;
}

// ── Render one A4 page ────────────────────────────────────────────────────
async function renderPage(
  pageItems: PageItem[],
  isFirst: boolean,
  logoSrc: string,
  totalCount: number,
  pageNum: number,
  totalPages: number
): Promise<HTMLCanvasElement> {
  const styleEl = document.createElement('style');
  styleEl.textContent = `@import url('${FONT_URL}'); * { font-family: 'Cairo', Arial, sans-serif !important; box-sizing: border-box; }`;

  const page = mkEl('div', `
    width:${A4_W}px;
    height:${A4_H}px;
    background:#f0f4f0;
    font-family:'Cairo',Arial,sans-serif;
    direction:rtl;
    text-align:right;
    overflow:hidden;
    display:flex;
    flex-direction:column;
    position:relative;
  `);
  page.appendChild(styleEl);

  // ── main header (page 1 only) ──
  if (isFirst) {
    page.appendChild(await buildMainHeader(totalCount, logoSrc));
  }

  // ── content area ──
  const content = mkEl('div', `
    flex:1;
    padding:${C_PAD}px;
    display:flex;
    flex-direction:column;
    gap:${C_GAP}px;
    overflow:hidden;
  `);

  for (const item of pageItems) {
    if (item.type === 'cat') {
      content.appendChild(buildCatHeader(item.label, item.count));
    } else {
      const rowEl = await buildRow(item.cards);
      content.appendChild(rowEl);
    }
  }
  page.appendChild(content);

  // ── footer ──
  page.appendChild(buildFooter(pageNum, totalPages));

  // ── render to canvas ──
  page.style.position = 'fixed';
  page.style.top = '-99999px';
  page.style.left = '-99999px';
  page.style.zIndex = '-1';
  document.body.appendChild(page);
  await new Promise(r => setTimeout(r, 300));

  const canvas = await html2canvas(page, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: '#f0f4f0',
    allowTaint: true,
    imageTimeout: 20000,
    windowWidth: A4_W,
    width: A4_W,
    height: A4_H,
    onclone: (doc: Document) => {
      const lnk = doc.createElement('link');
      lnk.rel = 'stylesheet';
      lnk.href = FONT_URL;
      doc.head.appendChild(lnk);
    },
  });

  document.body.removeChild(page);
  return canvas;
}

// ── Main export function ──────────────────────────────────────────────────
export const exportCatalogToPDF = async (products: Product[]) => {
  try {
    await ensureCairoFont();

    const items   = buildItemList(products);
    const pages   = assignToPages(items);
    const total   = pages.length;
    const logoSrc = '/logo.png';

    const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW   = pdf.internal.pageSize.getWidth();
    const pdfH   = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage('a4');

      const canvas = await renderPage(pages[i], i === 0, logoSrc, products.length, i + 1, total);

      const imgData = canvas.toDataURL('image/jpeg', 0.97);
      const ratio   = canvas.height / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfW * ratio);

      // If the rendered height exceeds one PDF page height, warn (shouldn't happen now)
      if (pdfW * ratio > pdfH) {
        console.warn(`Page ${i + 1} exceeds A4 height — layout may need adjustment`);
      }
    }

    const dateStr = new Date().toLocaleDateString('ar-JO').replace(/\//g, '-');
    pdf.save(`كتالوج-مشاتل-القادري-${dateStr}.pdf`);
  } catch (err) {
    console.error('Catalog PDF error:', err);
    throw err;
  }
};
