import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
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

export const exportToWord = async (items: any[], quotationDetails: any) => {
  const tableRows = [
    new TableRow({
      children: ['الإجمالي', 'السعر', 'الكمية', 'الوصف', 'الصنف', '#'].map(text => 
        new TableCell({
          children: [new Paragraph({ text, rightTabStop: 0 })],
          shading: { fill: "F3F4F6" },
        })
      ),
    }),
    ...items.map((item, index) => new TableRow({
      children: [
        item.total.toString(),
        item.price.toString(),
        item.quantity.toString(),
        item.description || '',
        item.name,
        (index + 1).toString(),
      ].map(text => new TableCell({ children: [new Paragraph({ text })] }))
    }))
  ];

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: "عرض سعر", bold: true, size: 48 }),
          ],
          bidirectional: true,
        }),
        new Paragraph({ text: `رقم العرض: ${quotationDetails.quotationNumber}`, bidirectional: true }),
        new Paragraph({ text: `العميل: ${quotationDetails.customerName}`, bidirectional: true }),
        new Paragraph({ text: `التاريخ: ${quotationDetails.date}`, bidirectional: true }),
        new Paragraph({ text: "" }), // spacing
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
          }
        }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: `الإجمالي الكلي: ${quotationDetails.grandTotal}`, bidirectional: true, bold: true }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "واقبلوا فائق الاحترام....", bidirectional: true, alignment: "center" }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "مؤسســـــــة القادري الزراعية", bidirectional: true, bold: true }),
        new Paragraph({ text: "المدير العام/ ثامر احمد القادري", bidirectional: true }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quotationDetails.quotationNumber || 'Quotation'}.docx`;
  a.click();
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
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
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
    
    // Add image starting from left (RTL-aware positioning)
    const xPos = 2;
    const yPos = 2;
    
    pdf.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight);
    
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
  }
};
