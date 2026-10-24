import {confirm, input, select, Separator} from '@inquirer/prompts';
import { stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PageSizes, StandardFonts } from 'pdf-lib';
import { createPrompt, isEnterKey, makeTheme, useEffect, useKeypress, usePrefix, useState } from '@inquirer/core';
import {formatFileName, PaperSize} from './common.js';
import {generatePDF} from "./generator.js";

const displayValue = createPrompt((config, done) => {
    const theme = makeTheme({});
    const prefix = usePrefix({ status: 'done', theme });

    useEffect(() => {
        done(config.value);
    }, []);

    return [
        prefix,
        theme.style.message(config.message, 'done'),
        theme.style.answer(String(config.value)),
    ].join(' ');
});

let w, h;

async function main() {
    // handle ctl+c inside of async input
    process.on('uncaughtException', (error) => {
        if (error instanceof Error && error.name === 'ExitPromptError') {
        } else {
            throw error;
        }
    });

    const pageSize = await getPaperDimensions();
    const labelSize = await getLabelDimensions(pageSize);

    const templateName = await getTemplateName();
    const dir = await getDir();


    const config = {
        pageSize: pageSize,
        labelSize: labelSize,
        font: await getFont(),
    }

    const pdf = await generatePDF(config);

    await writeFile(join(dir, formatFileName(templateName)), pdf);
}


const dimensionOptions = {
    required: true,
    pattern: /^\d+(?:\.\d+)?$/,
    patternError: 'Enter a number > 0',
};

async function getFont() {
    return select({
        message: 'Select a font:',
        choices: Object.values(StandardFonts).map((font) => ({
            name: font,
            value: font,
        })),
        loop: false,
    });
}

async function getPaperDimensions(){
    const commonSizes = ['Letter', 'A4', 'Legal', 'A5', 'Tabloid', 'A3'];
    const sizes = [
        ...commonSizes,
        ...Object.keys(PageSizes).filter((size) => !commonSizes.includes(size)),
    ];
    const paperSize = await select({
        message: 'Select a paper size (or select custom):',
        default: 'Letter',
        pageSize: 10,
        loop: true ,
        choices: [
            ...sizes.map((size) => ({
                name: size,
                value: size,
                description: `${(PageSizes[size][0] / 72).toFixed(2)} × ${(PageSizes[size][1] / 72).toFixed(2)} in`,
            })),
            new Separator(),
            {
                name: 'Custom Size',
                value: PaperSize.CUSTOM
            },
            new Separator(),
        ],
    });

    const wMessage = "Paper Width (in):"
    const hMessage = "Paper Height (in):"

    if (paperSize === PaperSize.CUSTOM) {
        w = Number(await input({
            ...dimensionOptions,
            message: wMessage,
        })) * 72;

        h = Number(await input({
            ...dimensionOptions,
            message: hMessage,
        })) * 72;
    }
    else {
        [w, h] = PageSizes[paperSize];
        await displayValue({ message: wMessage, value: Number((w / 72).toFixed(2)) });
        await displayValue({ message: hMessage, value: Number((h / 72).toFixed(2)) });
    }
    return [w, h];
}

async function getLabelDimensions([paperWidth, paperHeight]){
    const wMessage = "Label Width (in):"
    const hMessage = "Label Height (in):"

    w = Number(await input({
        ...dimensionOptions,
        message: wMessage,
        validate: (value) => Number(value) * 72 <= paperWidth || `Label width must be at most ${paperWidth / 72} in`,
    })) * 72;

    h = Number(await input({
        ...dimensionOptions,
        message: hMessage,
        validate: (value) => Number(value) * 72 <= paperHeight || `Label height must be at most ${paperHeight / 72} in`,
    })) * 72;

    return  [w,h]
}

const templateNameInput = createPrompt((config, done) => {
    const [value, setValue] = useState('');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const theme = makeTheme({});
    const prefix = usePrefix({ status, theme });

    useKeypress((key, rl) => {
        if (status === 'done') return;

        if (isEnterKey(key)) {
            if (!value.trim()) {
                setError('Enter a template name');
                return;
            }

            if (!config.pattern.test(value)) {
                setError(config.patternError);
                return;
            }

            setStatus('done');
            done(value);
        } else {
            setValue(rl.line);
            setError('');
        }
    });

    const promptLine = [
        prefix,
        theme.style.message(config.message, status),
        status === 'done' ? theme.style.answer(value) : value,
    ].join(' ');
    const preview = config.pattern.test(value)
        ? `Generated file name: "${formatFileName(value)}"`
        : '';

    return [
        promptLine,
        status === 'done'
            ? undefined
            : [error && theme.style.error(error), preview]
                .filter(Boolean)
                .join('\n'),
    ];
});

async function getTemplateName() {
    const artifactNamePattern = /^(?=.*\S)[^/\0]+$/s;

    const templateName = await templateNameInput({
        message: 'Template name:',
        pattern: artifactNamePattern,
        patternError: 'Template name cannot contain / or NUL characters',
    });

    return templateName;
}

async function getDir() {
    return input({
        message: 'Output directory (leave empty for default):',
        default: process.cwd(),
        validate: async (value) => {
            try {
                return (await stat(value)).isDirectory() || 'Path must be a directory';
            } catch {
                return 'Enter an existing directory';
            }
        },
    });
}
main()