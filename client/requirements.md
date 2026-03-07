## Packages
xlsx | Exporting quotations to Excel
docx | Exporting quotations to Word
jspdf | Exporting to PDF
html2canvas | Taking high-quality screenshots for PDF export to perfectly support Arabic RTL without custom font embedding
date-fns | Formatting dates nicely

## Notes
- The UI is designed for Arabic (RTL). `dir="rtl"` is applied at the root container.
- We use `html2canvas` combined with `jspdf` to generate the PDF. This is the most reliable way to maintain the beautiful UI and Arabic RTL text alignment without complex font management.
- The font "Cairo" is imported via Google Fonts.
