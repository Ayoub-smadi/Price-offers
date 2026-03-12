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

const loadImageAsDataUrl = (src: string): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve('');
    img.src = src;
  });

const buildCatalogHTML = async (products: Product[], logoSrc: string): Promise<HTMLElement> => {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    width: 210mm;
    background: #ffffff;
    font-family: Cairo, Arial, sans-serif;
    direction: rtl;
    text-align: right;
    color: #1e293b;
    box-sizing: border-box;
    padding: 0;
  `;

  // ── Header ──
  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #1a3c2e 0%, #2d6a4f 60%, #52b788 100%);
    padding: 18px 20px 14px;
    display: flex;
    align-items: center;
    gap: 14px;
  `;

  if (logoSrc) {
    const logoData = await loadImageAsDataUrl(logoSrc);
    if (logoData) {
      const logo = document.createElement('img');
      logo.src = logoData;
      logo.style.cssText = 'width:70px;height:70px;object-fit:contain;border-radius:10px;background:#fff;padding:4px;flex-shrink:0;';
      header.appendChild(logo);
    }
  }

  const headerText = document.createElement('div');
  headerText.style.cssText = 'flex:1;';

  const companyName = document.createElement('div');
  companyName.textContent = 'مؤسسة ومشاتل القادري الزراعية';
  companyName.style.cssText = 'font-size:22px;font-weight:900;color:#ffffff;line-height:1.2;';
  headerText.appendChild(companyName);

  const companyEn = document.createElement('div');
  companyEn.textContent = 'Al-Qadri Agricultural Establishment';
  companyEn.style.cssText = 'font-size:10px;color:#a7f3d0;direction:ltr;text-align:left;margin-top:2px;';
  headerText.appendChild(companyEn);

  const tagline = document.createElement('div');
  tagline.textContent = 'أسعار الأشجار والشجيرات والورود لدى مشاتل القادري';
  tagline.style.cssText = 'font-size:12px;color:#d1fae5;margin-top:6px;font-weight:600;';
  headerText.appendChild(tagline);
  header.appendChild(headerText);
  wrap.appendChild(header);

  // ── Date bar ──
  const datebar = document.createElement('div');
  datebar.style.cssText = 'background:#f0fdf4;padding:6px 20px;font-size:10px;color:#166534;border-bottom:1px solid #bbf7d0;display:flex;justify-content:space-between;';
  const dateLabel = document.createElement('span');
  dateLabel.textContent = `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  const countLabel = document.createElement('span');
  countLabel.textContent = `إجمالي الأصناف: ${products.length}`;
  datebar.appendChild(dateLabel);
  datebar.appendChild(countLabel);
  wrap.appendChild(datebar);

  // ── Products Grid (2 columns) ──
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:0;padding:12px;gap:10px;background:#f8fafc;';

  for (const product of products) {
    const card = document.createElement('div');
    card.style.cssText = `
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    `;

    // Image
    const imgContainer = document.createElement('div');
    imgContainer.style.cssText = 'width:100%;height:130px;overflow:hidden;background:#f1f5f9;display:flex;align-items:center;justify-content:center;';

    if (product.imageUrl) {
      const imgData = await loadImageAsDataUrl(product.imageUrl);
      if (imgData) {
        const img = document.createElement('img');
        img.src = imgData;
        img.style.cssText = 'width:100%;height:130px;object-fit:cover;';
        imgContainer.appendChild(img);
      } else {
        imgContainer.innerHTML = '<div style="color:#94a3b8;font-size:28px;">🌿</div>';
      }
    } else {
      imgContainer.innerHTML = '<div style="color:#94a3b8;font-size:28px;">🌿</div>';
    }
    card.appendChild(imgContainer);

    // Info
    const info = document.createElement('div');
    info.style.cssText = 'padding:8px 10px 10px;';

    const unitBadge = document.createElement('div');
    unitBadge.style.cssText = 'display:inline-block;background:#dcfce7;color:#166534;font-size:9px;font-weight:700;padding:2px 7px;border-radius:5px;margin-bottom:4px;';
    unitBadge.textContent = product.unit || 'وحدة';
    info.appendChild(unitBadge);

    const name = document.createElement('div');
    name.textContent = product.name;
    name.style.cssText = 'font-size:12px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:2px;';
    info.appendChild(name);

    if (product.description) {
      const desc = document.createElement('div');
      desc.textContent = product.description;
      desc.style.cssText = 'font-size:9px;color:#64748b;line-height:1.4;margin-bottom:5px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;';
      info.appendChild(desc);
    }

    const priceRow = document.createElement('div');
    priceRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-top:4px;padding-top:5px;border-top:1px solid #f1f5f9;';

    const price = document.createElement('div');
    price.style.cssText = 'font-size:16px;font-weight:900;color:#2d6a4f;';
    price.textContent = `${Number(product.price).toLocaleString()}`;
    priceRow.appendChild(price);

    const currency = document.createElement('div');
    currency.style.cssText = 'font-size:9px;color:#94a3b8;font-weight:600;';
    currency.textContent = `ريال / ${product.unit || 'وحدة'}`;
    priceRow.appendChild(currency);

    info.appendChild(priceRow);
    card.appendChild(info);
    grid.appendChild(card);
  }

  // Odd number: add empty filler
  if (products.length % 2 !== 0) {
    grid.appendChild(document.createElement('div'));
  }

  wrap.appendChild(grid);

  // ── Footer ──
  const footer = document.createElement('div');
  footer.style.cssText = 'background:#1a3c2e;padding:8px 20px;text-align:center;';
  const footerText = document.createElement('div');
  footerText.textContent = 'مؤسسة ومشاتل القادري الزراعية • للتواصل والاستفسار يرجى الاتصال بنا';
  footerText.style.cssText = 'color:#a7f3d0;font-size:9px;';
  footer.appendChild(footerText);
  wrap.appendChild(footer);

  return wrap;
};

export const exportCatalogToPDF = async (products: Product[], logoSrc: string = '') => {
  try {
    const catalogEl = await buildCatalogHTML(products, logoSrc);
    catalogEl.style.position = 'fixed';
    catalogEl.style.top = '-9999px';
    catalogEl.style.left = '-9999px';
    document.body.appendChild(catalogEl);
    await new Promise(r => setTimeout(r, 300));

    const canvas = await html2canvas(catalogEl, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      imageTimeout: 15000,
      windowWidth: Math.round(210 * 96 / 25.4),
    });
    document.body.removeChild(catalogEl);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const imgW = pdfW - 4;
    const pxPerMM = canvas.width / imgW;
    const pageHeightPx = (pdfH - 4) * pxPerMM;

    let srcY = 0;
    let pageIdx = 0;

    while (srcY < canvas.height) {
      if (pageIdx > 0) pdf.addPage('a4');
      const slicePx = Math.min(pageHeightPx, canvas.height - srcY);
      if (slicePx <= 0) break;

      const pg = document.createElement('canvas');
      pg.width = canvas.width;
      pg.height = Math.round(slicePx);
      pg.getContext('2d')!.drawImage(canvas, 0, Math.round(srcY), canvas.width, Math.round(slicePx), 0, 0, canvas.width, Math.round(slicePx));

      pdf.addImage(pg.toDataURL('image/jpeg', 0.97), 'JPEG', 2, 2, imgW, slicePx / pxPerMM);
      srcY += pageHeightPx;
      pageIdx++;
    }

    const dateStr = new Date().toLocaleDateString('ar-JO').replace(/\//g, '-');
    pdf.save(`كتالوج-مشاتل-القادري-${dateStr}.pdf`);
  } catch (err) {
    console.error('Catalog PDF error:', err);
  }
};
