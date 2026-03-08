import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  try {
    // Create a temporary wrapper for PDF rendering
    const wrapper = document.createElement('div');
    wrapper.style.width = '210mm'; // A4 width
    wrapper.style.padding = '10mm';
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    
    // Clone the element and append to wrapper
    const clonedElement = element.cloneNode(true) as HTMLElement;
    wrapper.appendChild(clonedElement);
    document.body.appendChild(wrapper);
    
    // Set styles for PDF optimization
    const tables = wrapper.querySelectorAll('table');
    tables.forEach(table => {
      (table as HTMLElement).style.fontSize = '11px';
      (table as HTMLElement).style.borderCollapse = 'collapse';
      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        (cell as HTMLElement).style.padding = '6px 4px';
        (cell as HTMLElement).style.lineHeight = '1.2';
      });
    });
    
    // Hide no-print elements
    const noPrintElements = wrapper.querySelectorAll('.no-print');
    noPrintElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
    
    const canvas = await html2canvas(wrapper, { 
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      imageTimeout: 0,
      windowHeight: wrapper.scrollHeight,
      windowWidth: 210 * 96 / 25.4 // A4 width in pixels
    });
    
    // Clean up
    document.body.removeChild(wrapper);
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 10; // Keep margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add image to PDF (single page fit)
    pdf.addImage(imgData, 'JPEG', 5, 5, imgWidth, imgHeight);
    
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
  }
};
