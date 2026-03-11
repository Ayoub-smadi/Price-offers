import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

    const dataCells = table.querySelectorAll('td');
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
  });

  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const element = el as HTMLElement;
    element.style.boxShadow = 'none';
  });

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
