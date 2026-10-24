# PDF Tag Generator

Generate printable PDF label templates with dotted outlines and editable text fields.

## Setup

Use Node.js 24+ (recommended) and npm.

```bash
npm install
```

## Run

```bash
npm run generate
```

The CLI asks for:

1. Paper size: a standard size or custom width and height.
2. Label width and height, in inches.
3. Font: use a Courier, Helvetica, or Times variant. Symbol and ZapfDingbats are not supported by the generator.
4. Text mode: single line (default) or multiline with wrapping.
5. Template name, with a live filename preview.
6. An existing output directory; press Enter to use the current working directory.

The PDF is saved in the selected directory. Template names are lowercased and whitespace is replaced with underscores: `My Tags` becomes `my_tags.pdf`.

**An existing file with the same name will be overwritten.** Press Ctrl+C during a prompt to cancel.

## Fill and print

Open the generated PDF in a browser PDF viewer and type into each label independently. Save the filled PDF using the viewer's download/save option, and print at **100% / Actual size** to preserve label dimensions.

- Labels have dotted outlines, 2pt gaps, and a horizontally centered grid.
- Fields are inset 3pt from each label edge, with bold, horizontally centered text.
- Automatic text sizing depends on the PDF viewer. Single-line fields are typically vertically centered; multiline fields wrap but are generally top-aligned.
- The header shows the filename, label dimensions, and label count. The footer shows the font, text mode, and paper size.

Dimensions are entered and displayed in inches; internal calculations use PDF points (72pt = 1 inch). The grid reserves 18pt minimum side margins, 36pt at the top, and 25pt at the bottom. Margins and gaps reduce the number of labels that fit on a page.
