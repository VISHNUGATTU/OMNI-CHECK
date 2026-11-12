const pdfParse = require('pdf-parse');

const extractTextFromPDF = async (fileBuffer) => {
  try {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Invalid file buffer received.');
    }

    let text = '';

    // Handle pdf-parse v2.x (class-based API)
    if (pdfParse && typeof pdfParse.PDFParse === 'function') {
      const parser = new pdfParse.PDFParse({ data: fileBuffer });
      try {
        const result = await parser.getText();
        text = result?.text || '';
      } finally {
        if (typeof parser.destroy === 'function') {
          await parser.destroy().catch(() => {});
        }
      }
    } else {
      // Handle pdf-parse v1.x (function-based API, CommonJS or ESM default)
      const parseFunction = typeof pdfParse === 'function' ? pdfParse : pdfParse?.default;
      if (typeof parseFunction === 'function') {
        const data = await parseFunction(fileBuffer);
        text = data?.text || '';
      } else {
        throw new Error('Unsupported pdf-parse export structure.');
      }
    } 

    // Clean extra whitespace to save tokens for the AI
    return (text || '').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('PDF Parsing Engine Error:', error);
    throw new Error(`Failed to parse PDF text: ${error.message}`);
  }
};

module.exports = { extractTextFromPDF };