import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ImageRun } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Create a print-ready version of the document with all inputs converted to visible text
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

  // Clone the original element
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Replace all inputs with divs showing their values
  const inputs = clone.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    const htmlInput = input as HTMLInputElement | HTMLTextAreaElement;
    const value = htmlInput.value;
    
    if (!value.trim()) return; // Skip empty inputs
    
    // Create a div to replace the input
    const div = document.createElement('div');
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.color = '#000000';
    
    // Preserve the styling
    const computedStyle = window.getComputedStyle(htmlInput);
    div.style.fontSize = computedStyle.fontSize;
    div.style.fontWeight = computedStyle.fontWeight;
    div.style.textAlign = computedStyle.textAlign;
    div.style.margin = computedStyle.margin;
    div.style.padding = computedStyle.padding;
    
    div.textContent = value;
    htmlInput.parentNode?.replaceChild(div, htmlInput);
  });

  // Remove all no-print elements
  const noPrint = clone.querySelectorAll('.no-print');
  noPrint.forEach(el => el.remove());

  // Add borders to all tables
  const tables = clone.querySelectorAll('table');
  tables.forEach(table => {
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    
    // Apply consistent styling to header cells
    const headerCells = table.querySelectorAll('th');
    headerCells.forEach(cell => {
      const element = cell as HTMLElement;
      element.style.border = '1px solid #000000';
      element.style.padding = '10px 8px';
      element.style.minHeight = '40px';
      element.style.height = '40px';
      element.style.verticalAlign = 'middle';
      element.style.textAlign = 'center';
      element.style.backgroundColor = '#f3f4f6';
      element.style.color = '#000000';
      element.style.fontWeight = 'bold';
      element.style.fontSize = '12px';
    });
    
    // Apply consistent styling to data cells
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

  // Optimize styles for print
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const element = el as HTMLElement;
    element.style.boxShadow = 'none';
  });

  printDiv.appendChild(clone);
  return printDiv;
};

export const exportToExcel = (items: any[], quotationDetails: any) => {
  // Prepare items data
  const data = items.map((item, index) => ({
    '#': index + 1,
    'الصنف': item.name,
    'الاسم النباتي': item.botanicalName || '',
    'الوصف': item.description || '',
    'الكمية': item.quantity,
    'الوحدة': item.unit || 'وحدة',
    'السعر': item.price,
    'الإجمالي': item.total,
  }));

  // Add grand total row
  data.push({
    '#': '',
    'الصنف': '',
    'الاسم النباتي': '',
    'الوصف': 'المجموع الكلي',
    'الكمية': '',
    'الوحدة': '',
    'السعر': '',
    'الإجمالي': quotationDetails.grandTotal,
  });

  // Add closing section
  data.push({});
  data.push({
    '#': '',
    'الصنف': 'واقبلوا فائق الاحترام....',
    'الاسم النباتي': '',
    'الوصف': '',
    'الكمية': '',
    'الوحدة': '',
    'السعر': '',
    'الإجمالي': '',
  });
  data.push({
    '#': '',
    'الصنف': 'مؤسســـــــة القادري الزراعية',
    'الاسم النباتي': '',
    'الوصف': '',
    'الكمية': '',
    'الوحدة': '',
    'السعر': '',
    'الإجمالي': '',
  });
  data.push({
    '#': '',
    'الصنف': 'المدير العام/ ثامر احمد القادري',
    'الاسم النباتي': '',
    'الوصف': '',
    'الكمية': '',
    'الوحدة': '',
    'السعر': '',
    'الإجمالي': '',
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 4 },   // #
    { wch: 20 },  // الصنف
    { wch: 18 },  // الاسم النباتي
    { wch: 20 },  // الوصف
    { wch: 8 },   // الكمية
    { wch: 10 },  // الوحدة
    { wch: 12 },  // السعر
    { wch: 12 },  // الإجمالي
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "عرض السعر");
  XLSX.writeFile(workbook, `${quotationDetails.quotationNumber || 'Quotation'}.xlsx`);
};

export const exportToWord = async (elementId: string, filename: string, items?: any[], details?: any) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  try {
    // Build header section
    const headerParagraphs = [
      new Paragraph({
        text: `مؤسسة ومشاتل القادري الزراعية`,
        bidirectional: true,
        bold: true,
        size: 32,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        text: `جرش – الرشايدة`,
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        size: 24,
      }),
      new Paragraph({
        text: `Al-Qadri Agricultural Establishment - Jerash - Al-Rashaidah`,
        alignment: AlignmentType.CENTER,
        size: 20,
      }),
      new Paragraph({ text: "" }), // spacing
    ];

    // Quotation details section
    const detailsParagraphs = [
      new Paragraph({
        text: `عرض سعر رقم: ${details?.quotationNumber || ''}`,
        bidirectional: true,
        bold: true,
      }),
      new Paragraph({
        text: `التاريخ: ${details?.date || ''}`,
        bidirectional: true,
      }),
      new Paragraph({
        text: `اسم العميل: ${details?.customerName || ''}`,
        bidirectional: true,
      }),
      new Paragraph({ text: "" }),
    ];

    // Build table rows (RTL - Right to Left)
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: "الإجمالي", bidirectional: true, bold: true })],
            shading: { fill: "1F2937" },
          }),
          new TableCell({
            children: [new Paragraph({ text: "السعر", bidirectional: true, bold: true })],
            shading: { fill: "1F2937" },
          }),
          new TableCell({
            children: [new Paragraph({ text: "الكمية", bidirectional: true, bold: true })],
            shading: { fill: "1F2937" },
          }),
          new TableCell({
            children: [new Paragraph({ text: "الوصف", bidirectional: true, bold: true })],
            shading: { fill: "1F2937" },
          }),
          new TableCell({
            children: [new Paragraph({ text: "الاسم", bidirectional: true, bold: true })],
            shading: { fill: "1F2937" },
          }),
          new TableCell({
            children: [new Paragraph({ text: "#", alignment: AlignmentType.CENTER, bold: true })],
            shading: { fill: "1F2937" },
          }),
        ],
      }),
      ...(items || []).map((item, index) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: item.total?.toString() || "", alignment: AlignmentType.CENTER })],
            }),
            new TableCell({
              children: [new Paragraph({ text: item.price?.toString() || "", alignment: AlignmentType.CENTER })],
            }),
            new TableCell({
              children: [new Paragraph({ text: item.quantity?.toString() || "", alignment: AlignmentType.CENTER })],
            }),
            new TableCell({
              children: [new Paragraph({ text: item.description || "", bidirectional: true })],
            }),
            new TableCell({
              children: [new Paragraph({ text: item.name || "", bidirectional: true })],
            }),
            new TableCell({
              children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })],
            }),
          ],
        })
      ),
    ];

    // Footer section
    const footerParagraphs = [
      new Paragraph({ text: "" }),
      new Paragraph({
        text: `الإجمالي الكلي: ${details?.grandTotal || 0}`,
        bidirectional: true,
        bold: true,
        size: 24,
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        text: "واقبلوا فائق الاحترام....",
        bidirectional: true,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ text: "" }),
      new Paragraph({
        text: "مؤسسة القادري الزراعية",
        bidirectional: true,
        bold: true,
      }),
      new Paragraph({
        text: "المدير العام/ ثامر احمد القادري",
        bidirectional: true,
      }),
    ];

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          ...headerParagraphs,
          ...detailsParagraphs,
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            }
          }),
          ...footerParagraphs,
        ],
      }],
    });

    const docBlob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(docBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.docx`;
    a.click();
  } catch (error) {
    console.error("Failed to generate Word document:", error);
  }
};

export const exportToPDF = async (elementId: string, filename: string, items?: any[], details?: any) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  try {
    // Create print-ready document with all text visible
    const printDoc = createPrintDocument(element, items || [], details || {});
    document.body.appendChild(printDoc);
    
    // Wait a moment for rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Generate canvas from print-ready document with high quality
    const canvas = await html2canvas(printDoc, { 
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      imageTimeout: 0,
      windowHeight: printDoc.scrollHeight,
      windowWidth: 210 * 96 / 25.4 // A4 width
    });
    
    // Clean up
    document.body.removeChild(printDoc);
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Use full page width with minimal margins
    const imgWidth = pdfWidth - 4;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const xPos = 2;
    const yPos = 2;
    
    // Calculate pages needed based on content height
    const contentHeightPerPage = (pdfHeight - 4) * (canvas.width / imgWidth); // Height in canvas pixels
    const totalPages = Math.ceil(canvas.height / contentHeightPerPage);
    
    // Add each page to the PDF
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      // Create a temporary canvas for this page
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(contentHeightPerPage, canvas.height - (pageIndex * contentHeightPerPage));
      
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          pageIndex * contentHeightPerPage,
          canvas.width,
          pageCanvas.height,
          0,
          0,
          pageCanvas.width,
          pageCanvas.height
        );
      }
      
      // Convert page canvas to image
      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
      const pageImgHeight = (pageCanvas.height * imgWidth) / canvas.width;
      
      // Add page to PDF (except first page which is already created)
      if (pageIndex > 0) {
        pdf.addPage('a4');
      }
      
      pdf.addImage(pageImgData, 'JPEG', xPos, yPos, imgWidth, pageImgHeight);
    }
    
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
  }
};
