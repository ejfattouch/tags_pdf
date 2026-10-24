export const PaperSize = Object.freeze({
    LETTER: 'letter',
    A4: 'a4',
    LEGAL: 'legal',
    A5: 'A5',
    TABLOID: 'tabloid',
    A3: 'a3',
    CUSTOM: 'custom',
});

export const formatFileName = (artifactName) => {
    return `${artifactName.toLowerCase().split(/\s+/).join("_")}.pdf`
}