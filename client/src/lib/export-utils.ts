import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToExcel = (items: any[], quotationDetails: any) => {
  const data = items.map((item, index) => ({
    '#': index + 1,
    'الصنف': item.name,
    'الوصف': item.description || '',
    'الكمية': item.quantity,
    'السعر': item.price,
    'الإجمالي': item.total,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Quotation");
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
    // Add a temporary class to ensure light mode and proper rendering during screenshot
    element.classList.add('print-only');
    element.style.padding = '20px';
    
    const canvas = await html2canvas(element, { 
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    element.classList.remove('print-only');
    element.style.padding = '';

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
  }
};
