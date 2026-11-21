// src/Pages/modules/operations/utils/pdf.js
// Downloads any rendered element as a multi-page A4 PDF.
export const downloadElementAsPdf = async (el, fileName = 'document') => {
  if (!el) throw new Error('Nothing to download');
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const sliceH = Math.floor((canvas.width * pageH) / pageW);
  for (let y = 0, page = 0; y < canvas.height; y += sliceH, page += 1) {
    const h = Math.min(sliceH, canvas.height - y);
    const part = document.createElement('canvas');
    part.width = canvas.width;
    part.height = h;
    part.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(part.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, (h * pageW) / canvas.width);
  }
  pdf.save(`${fileName}.pdf`);
};