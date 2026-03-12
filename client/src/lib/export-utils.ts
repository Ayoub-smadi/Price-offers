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

const buildCatalogHTML = async (products: Product[], logoSrc: string): Promise<HTMLElement> => {
  const A4_PX = Math.round(210 * 96 / 25.4); // ≈ 794px

  const wrap = mkEl('div', `
    width: ${A4_PX}px;
    background: #f4f7f4;
    font-family: 'Cairo', Arial, sans-serif;
    direction: rtl;
    text-align: right;
    color: #1e293b;
    box-sizing: border-box;
    padding: 0;
  `);

  // inject font link inside the wrapper too (for onclone)
  const styleTag = document.createElement('style');
  styleTag.textContent = `@import url('${FONT_URL}'); * { font-family: 'Cairo', Arial, sans-serif !important; }`;
  wrap.appendChild(styleTag);

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = mkEl('div', `
    background: linear-gradient(135deg, #0d2b1e 0%, #1a4a2e 50%, #22603a 100%);
    padding: 22px 28px 18px;
    display: flex;
    align-items: center;
    gap: 20px;
    border-bottom: 4px solid #52b788;
  `);

  const logoData = logoSrc ? await loadImageAsDataUrl(logoSrc) : '';
  if (logoData) {
    const logoWrap = mkEl('div', 'width:96px;height:96px;background:#ffffff;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:5px;box-shadow:0 4px 12px rgba(0,0,0,0.3);');
    const logo = document.createElement('img') as HTMLImageElement;
    logo.src = logoData;
    logo.style.cssText = 'width:86px;height:86px;object-fit:contain;';
    logoWrap.appendChild(logo);
    header.appendChild(logoWrap);
  }

  const hText = mkEl('div', 'flex:1;padding-right:4px;');
  hText.appendChild(mkEl('div', 'font-size:28px;font-weight:900;color:#ffffff;line-height:1.1;', 'مؤسسة ومشاتل القادري الزراعية'));
  hText.appendChild(mkEl('div', 'font-size:12px;color:#86efac;direction:ltr;text-align:left;margin-top:4px;font-weight:600;letter-spacing:0.5px;', 'Al-Qadri Agricultural Nursery & Establishment'));

  const divider = mkEl('div', 'height:1px;background:rgba(255,255,255,0.2);margin:10px 0;');
  hText.appendChild(divider);
  hText.appendChild(mkEl('div', 'font-size:14px;color:#d1fae5;font-weight:700;', 'أسعار الأشجار والشجيرات والورود لدى مشاتل القادري'));
  header.appendChild(hText);
  wrap.appendChild(header);

  // ── Info bar ──────────────────────────────────────────────────────────────
  const infoBar = mkEl('div', 'background:#ffffff;padding:8px 28px;border-bottom:1px solid #d1fae5;display:flex;justify-content:space-between;align-items:center;');
  const phoneEl = mkEl('div', 'display:flex;align-items:center;gap:6px;');
  phoneEl.appendChild(mkEl('span', 'font-size:13px;color:#166534;font-weight:700;direction:ltr;', COMPANY_PHONE));
  phoneEl.appendChild(mkEl('span', 'font-size:13px;color:#166534;', ':هاتف'));
  infoBar.appendChild(phoneEl);
  infoBar.appendChild(mkEl('span', 'font-size:11px;color:#64748b;font-weight:600;', `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' })}`));
  infoBar.appendChild(mkEl('span', 'font-size:11px;color:#64748b;font-weight:600;', `إجمالي الأصناف: ${products.length}`));
  wrap.appendChild(infoBar);

  // ── Products Grid ────────────────────────────────────────────────────────
  const GAP = 12;
  const PAD = 14;
  const colW = Math.floor((A4_PX - PAD * 2 - GAP) / 2);
  const CARD_IMG_H = 165;

  const grid = mkEl('div', `display:grid;grid-template-columns:${colW}px ${colW}px;gap:${GAP}px;padding:${PAD}px;background:#f4f7f4;`);

  for (const product of products) {
    // Card container
    const card = mkEl('div', `
      background: #ffffff;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #e2efe6;
      width: ${colW}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    `);

    // Green accent top bar
    card.appendChild(mkEl('div', 'height:4px;background:linear-gradient(90deg,#2d6a4f,#52b788);'));

    // ── Image area ──
    const imgBox = mkEl('div', `width:${colW}px;height:${CARD_IMG_H}px;overflow:hidden;background:#e8f5e9;display:flex;align-items:center;justify-content:center;position:relative;`);

    if (product.imageUrl) {
      const imgData = await loadImageAsDataUrl(product.imageUrl);
      if (imgData) {
        const img = document.createElement('img') as HTMLImageElement;
        img.src = imgData;
        img.style.cssText = `width:${colW}px;height:${CARD_IMG_H}px;object-fit:cover;display:block;`;
        imgBox.appendChild(img);
      } else {
        imgBox.appendChild(mkEl('div', 'font-size:50px;', '🌿'));
      }
    } else {
      imgBox.appendChild(mkEl('div', 'font-size:50px;', '🌿'));
    }
    card.appendChild(imgBox);

    // ── Info section ──
    const info = mkEl('div', 'padding:12px 14px 14px;');

    // Product name — large and prominent
    info.appendChild(mkEl('div',
      'font-size:15px;font-weight:900;color:#0f172a;line-height:1.3;margin-bottom:4px;',
      product.name
    ));

    // Description — italic, muted
    if (product.description) {
      const truncated = product.description.length > 70
        ? product.description.slice(0, 67) + '...'
        : product.description;
      info.appendChild(mkEl('div',
        'font-size:10px;color:#6b7280;line-height:1.5;margin-bottom:8px;font-style:italic;',
        truncated
      ));
    } else {
      info.appendChild(mkEl('div', 'height:8px;'));
    }

    // Price row with green badge
    const priceRow = mkEl('div', 'display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px dashed #d1fae5;');

    // Price badge
    const priceBadge = mkEl('div', 'background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:5px 12px;');
    priceBadge.appendChild(mkEl('div', 'font-size:19px;font-weight:900;color:#166534;line-height:1;', Number(product.price).toLocaleString('ar-JO')));
    priceBadge.appendChild(mkEl('div', 'font-size:8.5px;color:#4ade80;font-weight:700;margin-top:1px;', CURRENCY));
    priceRow.appendChild(priceBadge);

    // Unit badge
    priceRow.appendChild(mkEl('div',
      'background:#dcfce7;color:#166534;font-size:9.5px;font-weight:700;padding:4px 10px;border-radius:20px;',
      product.unit || 'وحدة'
    ));

    info.appendChild(priceRow);
    card.appendChild(info);
    grid.appendChild(card);
  }

  if (products.length % 2 !== 0) {
    grid.appendChild(mkEl('div', `width:${colW}px;`));
  }
  wrap.appendChild(grid);

  // ── Footer ──────────────────────────────────────────────────────────────
  const footer = mkEl('div', 'background:linear-gradient(135deg,#0d2b1e,#22603a);padding:12px 28px;display:flex;justify-content:space-between;align-items:center;border-top:3px solid #52b788;');
  footer.appendChild(mkEl('div', 'color:#d1fae5;font-size:11px;font-weight:700;', 'مؤسسة ومشاتل القادري الزراعية'));
  footer.appendChild(mkEl('div', 'color:#86efac;font-size:11px;font-weight:700;direction:ltr;', `${COMPANY_PHONE} :☎`));
  wrap.appendChild(footer);

  return wrap;
};

export const exportCatalogToPDF = async (products: Product[], _logoSrc: string = '') => {
  try {
    // 1. Pre-load Cairo font
    await ensureCairoFont();

    // 2. Build the HTML
    const catalogEl = await buildCatalogHTML(products, '/logo.png');
    catalogEl.style.cssText = 'position:fixed;top:-99999px;left:-99999px;z-index:-1;';
    document.body.appendChild(catalogEl);

    // 3. Extra wait to let browser paint & render font
    await new Promise(r => setTimeout(r, 800));

    const A4_PX = Math.round(210 * 96 / 25.4);
    const canvas = await html2canvas(catalogEl, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#f4f7f4',
      allowTaint: true,
      imageTimeout: 20000,
      windowWidth: A4_PX,
      width: A4_PX,
      onclone: (cloned: Document) => {
        const s = cloned.createElement('link');
        s.rel = 'stylesheet';
        s.href = FONT_URL;
        cloned.head.appendChild(s);
      },
    });
    document.body.removeChild(catalogEl);

    // 4. Build PDF pages
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const imgW = pdfW;
    const pxPerMM = canvas.width / imgW;
    const pageHeightPx = pdfH * pxPerMM;

    let srcY = 0;
    let pageIdx = 0;
    while (srcY < canvas.height) {
      if (pageIdx > 0) pdf.addPage('a4');
      const slicePx = Math.min(pageHeightPx, canvas.height - srcY);
      if (slicePx <= 0) break;

      const pg = document.createElement('canvas');
      pg.width = canvas.width;
      pg.height = Math.round(slicePx);
      pg.getContext('2d')!.drawImage(
        canvas,
        0, Math.round(srcY), canvas.width, Math.round(slicePx),
        0, 0, canvas.width, Math.round(slicePx)
      );
      pdf.addImage(pg.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, imgW, slicePx / pxPerMM);
      srcY += pageHeightPx;
      pageIdx++;
    }

    const dateStr = new Date().toLocaleDateString('ar-JO').replace(/\//g, '-');
    pdf.save(`كتالوج-مشاتل-القادري-${dateStr}.pdf`);
  } catch (err) {
    console.error('Catalog PDF error:', err);
  }
};
