import {PDFDocument, StandardFonts, rgb, PageSizes} from 'pdf-lib'

export const generatePDF = async (config) => {
    // Create a new PDFDocument
    const pdfDoc = await PDFDocument.create();
    // Embed the font into the doc
    const documentFont = await pdfDoc.embedFont(config.font);
    // Add a blank page
    const page = pdfDoc.addPage(config.pageSize);
    // Get the width and height of the page
    const { width, height } = page.getSize()

    // Serialize the PDFDocument to bytes (a Uint8Array)
    const pdfBytes = await pdfDoc.save()

    return pdfBytes;
}