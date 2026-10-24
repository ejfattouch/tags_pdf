import {PDFDocument, StandardFonts, rgb, PageSizes, LineCapStyle, TextAlignment, PDFName} from 'pdf-lib'
import {formatFileName} from "./common.js";

let globalFont;
let globalBoldFont;
const labelGap = 2;

export const generatePDF = async (config) => {
    const pdfDoc = await PDFDocument.create();
    const [regularFont, boldFont] = {
        Courier: [StandardFonts.Courier, StandardFonts.CourierBold],
        Helvetica: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
        Times: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
    }[config.font.split('-')[0]];
    globalFont = await pdfDoc.embedFont(regularFont);
    globalBoldFont = await pdfDoc.embedFont(boldFont);

    const form = pdfDoc.getForm();
    form.acroForm.dict.set(PDFName.of('DR'), pdfDoc.context.obj({
        Font: { [globalBoldFont.name]: globalBoldFont.ref },
    }));
    const page = pdfDoc.addPage(config.pageSize);

    const matrix = computeRowCol(config.pageSize, config.labelSize);

    drawHeader(page, config.name,  config.labelSize, matrix.cols * matrix.rows);
    drawLabels(page, config.labelSize, matrix, form, config.multiline);
    drawFooter(page, config);

    // Serialize the PDFDocument to bytes (a Uint8Array)
    // Preserve font size 0 (viewer auto-sizing) in each field's default appearance.
    const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false })

    return pdfBytes;
}

function drawHeader(page, name, labelSize, totalLabels) {
    if (!globalFont) {
        throw new Error('globalFont not initialized.');
    }

    const { width, height } = page.getSize();
    const fontSize = 8;
    const margin = 15;

    const labelWidthInch = String(Number((labelSize.width / 72).toFixed(3)));
    const labelHeightInch = String(Number((labelSize.height / 72).toFixed(3)));

    const headerText = [
        {title: "Label Dimensions", value: `${labelWidthInch}in. x ${labelHeightInch}in.`,},
        {title: "Total Labels", value: `${totalLabels}`,},
    ]

    const blocks = [
        [{ text: formatFileName(name), font: globalBoldFont }],
        ...headerText.map(({ title, value }) => [
            { text: `${title}: `, font: globalFont },
            { text: value, font: globalBoldFont },
        ]),
    ];
    const blockWidths = blocks.map((runs) => runs.reduce(
        (sum, { text, font }) => sum + font.widthOfTextAtSize(text, fontSize), 0,
    ));
    const groupWidth = blockWidths.slice(1).reduce((sum, blockWidth) => sum + blockWidth, 0)
        + margin * (blocks.length - 2);
    const metadataX = width - margin - groupWidth;
    let x = margin;

    blocks.forEach((runs, index) => {
        if (index === 1) x = metadataX;
        runs.forEach(({ text, font }) => {
            page.drawText(text, {
                x,
                y: height - margin,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
            });
            x += font.widthOfTextAtSize(text, fontSize);
        });
        x += margin;
    });
}

function drawFooter(page, config) {
    const { width } = page.getSize();
    const fontSize = 8;
    const margin = 15;
    const paperDimensions = config.pageSize.map((points) => String(Number((points / 72).toFixed(3))));
    const footerText = [
        { title: 'Font', value: globalBoldFont.name },
        { title: 'Text Mode', value: config.multiline ? 'Multiline' : 'Single line' },
        { title: 'Paper Size', value: config.pageSizeName || `${paperDimensions[0]}in. x ${paperDimensions[1]}in.` },
    ];
    const blocks = footerText.map(({ title, value }) => [
        { text: `${title}: `, font: globalFont },
        { text: value, font: globalBoldFont },
    ]);
    const groupWidth = blocks.reduce((sum, runs) => sum + runs.reduce(
        (blockWidth, { text, font }) => blockWidth + font.widthOfTextAtSize(text, fontSize), 0,
    ), 0) + margin * (blocks.length - 1);
    let x = width - margin - groupWidth;

    blocks.forEach((runs) => {
        runs.forEach(({ text, font }) => {
            page.drawText(text, {
                x,
                y: margin,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
            });
            x += font.widthOfTextAtSize(text, fontSize);
        });
        x += margin;
    });
}

function computeRowCol([pageWidth, pageHeight], labelSize){
    const usableWidth = pageWidth - 18 - 18;
    const usableHeight = pageHeight - 36 - 25;

    return {
        rows: Math.max(0, Math.floor((usableHeight + labelGap) / (labelSize.height + labelGap))),
        cols: Math.max(0, Math.floor((usableWidth + labelGap) / (labelSize.width + labelGap))),
    };
}

function drawLabels(page, labelSize, { rows, cols }, form, multiline = false){
    const { width, height } = page.getSize();
    const gridWidth = cols * labelSize.width + Math.max(0, cols - 1) * labelGap;
    const startX = (width - gridWidth) / 2;
    const fieldInset = 3;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = startX + col * (labelSize.width + labelGap);
            const y = height - 36 - labelSize.height - row * (labelSize.height + labelGap);
            page.drawRectangle({
                x,
                y,
                width: labelSize.width,
                height: labelSize.height,
                borderColor: rgb(0, 0, 0),
                borderWidth: 0.5,
                borderDashArray: [0, 2],
                borderLineCap: LineCapStyle.Round,
            });

            const field = form.createTextField(`label_${row + 1}_${col + 1}`);
            if (multiline) {
                field.enableMultiline();
            } else {
                field.disableMultiline();
            }
            field.setAlignment(TextAlignment.Center);
            field.addToPage(page, {
                x: x + fieldInset,
                y: y + fieldInset,
                width: labelSize.width - 2 * fieldInset,
                height: labelSize.height - 2 * fieldInset,
                font: globalBoldFont,
                textColor: rgb(0, 0, 0),
                borderWidth: 0,
                borderColor: undefined,
                backgroundColor: undefined,
            });
            field.setFontSize(0);
        }
    }
}