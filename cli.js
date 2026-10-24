import {input, select} from '@inquirer/prompts';
import { stat } from 'node:fs/promises';
import { createPrompt, isEnterKey, makeTheme, useEffect, useKeypress, usePrefix, useState } from '@inquirer/core';
import {formatFileName, PaperSize} from './common.js';

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
    
    const paperDimensions = await getPaperDimensions();
    const labelDimensions = await getLabelDimensions(paperDimensions);
    const templateName = await getTemplateName();
    const dir = await getDir();
}


const dimensionOptions = {
    required: true,
    pattern: /^\d+(?:\.\d+)?$/,
    patternError: 'Enter a number > 0',
};

async function getPaperDimensions(){
    const paperSize = await select({
        message: 'Select a paper size:',
        default: 'Letter',
        choices: [
            {
                name: 'Letter',
                value: PaperSize.LETTER,
                description: '215.9 × 279.4 mm (8.5 × 11 in)',
            },
            {
                name: 'A4',
                value: PaperSize.A4,
                description: '210 × 297 mm (8.27 × 11.69 in)',
            },
            {
                name: 'Legal',
                value: PaperSize.LEGAL,
                description: '215.9 × 355.6 mm (8.5 × 14 in)',
            },
            {
                name: 'A5',
                value: PaperSize.A5,
                description: '148 × 210 mm (5.83 × 8.27 in)',
            },
            {
                name: 'Tabloid',
                value: PaperSize.TABLOID,
                description: '279.4 × 431.8 mm (11 × 17 in)',
            },
            {
                name: 'A3',
                value: PaperSize.A3,
                description: '297 × 420 mm (11.69 × 16.54 in)',
            },
            {
                name: 'Custom Size',
                value: PaperSize.CUSTOM
            }
        ],
    });

    const wMessage = "Paper Width (in):"
    const hMessage = "Paper Height (in):"

    if (paperSize === PaperSize.CUSTOM) {
        w = Number(await input({
            ...dimensionOptions,
            message: wMessage,
        }));

        h = Number(await input({
            ...dimensionOptions,
            message: hMessage,
        }));
    }
    else {
        const dimensions = {
            [PaperSize.LETTER]: [8.5, 11],
            [PaperSize.A4]: [8.27, 11.69],
            [PaperSize.LEGAL]: [8.5, 14],
            [PaperSize.A5]: [5.83, 8.27],
            [PaperSize.TABLOID]: [11, 17],
            [PaperSize.A3]: [11.69, 16.54],
        };

        [w, h] = dimensions[paperSize];
        await displayValue({ message: wMessage, value: w });
        await displayValue({ message: hMessage, value: h });
    }
    return [w, h];
}

async function getLabelDimensions([paperWidth, paperHeight]){
    const wMessage = "Label Width (in):"
    const hMessage = "Label Height (in):"

    w = Number(await input({
        ...dimensionOptions,
        message: wMessage,
        validate: (value) => Number(value) <= paperWidth || `Label width must be at most ${paperWidth} in`,
    }));

    h = Number(await input({
        ...dimensionOptions,
        message: hMessage,
        validate: (value) => Number(value) <= paperHeight || `Label height must be at most ${paperHeight} in`,
    }));

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