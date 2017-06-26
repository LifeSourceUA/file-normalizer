import dirTree from 'directory-tree';
import fs from 'fs-extra';
import Debug from 'debug';
const debug = Debug('app');

const validations = {
    DOT: 'DOT\t\t',
    EMPTY_DIR: 'EMPTY_DIR',
    EMPTY_FILE: 'EMPTY_FILE',
    SYMBOLS: 'SYMBOLS\t'
};

function isValid(file) {
    // Имя не может начинаться или заканчиваться точкой
    const dotStartExp = /^\./g;
    const dotEndExp = /\.$/g;
    if (dotStartExp.test(file.name) || dotEndExp.test(file.name)) {
        return validations.DOT;
    }

    // Не допускаются пустые папки
    if (file.type === 'directory' && file.children.length === 0) {
        return validations.EMPTY_DIR;
    }

    // Не допускаются пустые файлы
    if (file.type === 'file' && file.size === 0) {
        return validations.EMPTY_FILE;
    }

    // Фильтр на допустимые символы
    const symbolsExp = /^[a-zA-Zа-яА-Я0-9.\-_]+$/g;
    if (!symbolsExp.test(file.name)) {
        return validations.SYMBOLS;
    }

    return true;
}

function flatten(files) {
    return files.reduce((flatList, file) => {
        debug(`Processing ${file.type}: ${file.path}`);

        flatList.push({
            path: file.path,
            name: file.name,
            size: file.size,
            type: file.type,
            valid: isValid(file)
        });

        if (file.type === 'directory' && Array.isArray(file.children)) {
            debug('Go deep');
            flatList.push(...flatten(file.children));
        }

        return flatList;
    }, []);
}

class Worker {
    static async run({ task, rootPath } = {}) {
        const output = fs.createWriteStream('output.txt');

        const tree = dirTree(rootPath);
        flatten(tree.children).filter((file) => {
            return file.valid !== true;
        }).forEach((file) => {
            output.write(`${file.valid}\t${file.path}\n`);
        });
    }
}

export default Worker;