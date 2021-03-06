import fs from 'fs-extra';
import path from 'path';
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
    // const symbolsExp = /^[a-zA-Zа-яА-ЯёїієЇІЄ0-9.,\-_()+!\[\]№ ]+$/g;
    const symbolsExp = /["#%*:<>?/|\\]/g;
    if (symbolsExp.test(file.name)) {
        return validations.SYMBOLS;
    }

    return true;
}

function safeReadDirSync (rootPath) {
    let dirData = {};
    try {
        dirData = fs.readdirSync(rootPath);
    } catch(ex) {
        if (ex.code == "EACCES")
        //User does not have permissions, ignore directory
            return null;
        else throw ex;
    }
    return dirData;
}

function directoryLoop(rootPath, cb) {
    const name = path.basename(rootPath);
    const item = {
        path: rootPath,
        name
    };
    let stats;

    try { stats = fs.statSync(rootPath); }
    catch (e) { return null; }

    if (stats.isFile()) {

        const ext = path.extname(rootPath).toLowerCase();

        item.size = stats.size;  // File size in bytes
        item.extension = ext;
        item.type = 'file';
        if (cb) {
            cb(item);
        }
    }
    else if (stats.isDirectory()) {
        let dirData = safeReadDirSync(rootPath);
        if (dirData === null) return null;

        item.children = dirData
            .map(child => directoryLoop(path.join(rootPath, child), cb))
            .filter(e => !!e);
        item.size = item.children.reduce((prev, cur) => prev + cur.size, 0);
        item.type = 'directory';

        if (cb) {
            cb(item);
        }
    } else {
        return null; // Or set item.size = 0 for devices, FIFO and sockets ?
    }
    return item;
}

class Worker {
    static async run({ task, rootPath, outputFile } = {}) {
        const fileList = [];
        directoryLoop(rootPath, (file) => {
            return fileList.push({
                path: file.path,
                name: file.name,
                size: file.size,
                type: file.type,
                valid: isValid(file)
            });
        });

        const output = fs.createWriteStream(outputFile);
        const symbolsExp = /["#%*:<>?|\\]/g;

        fileList.filter((file) => {
            return file.valid !== true;
        }).forEach((file) => {
            switch (task) {
                case 'print':
                    output.write(`${file.valid}\t${file.path}\n`);
                    break;
                case 'clean':
                    try {
                        if (file.valid === validations.EMPTY_FILE) {
                            fs.unlinkSync(file.path);
                            output.write(`File ${file.path} removed\n`);
                        }

                        if (file.valid === validations.EMPTY_DIR) {
                            fs.rmdirSync(file.path);
                            output.write(`Dir ${file.path} removed\n`);
                        }

                        if (file.valid === validations.DOT) {
                            if (file.type === 'file') {
                                fs.unlinkSync(file.path);
                                output.write(`Dot file ${file.path} removed\n`);
                            } else {
                                fs.rmdirSync(file.path);
                                output.write(`Dot dir ${file.path} removed\n`);
                            }
                        }
                        if (file.valid === validations.SYMBOLS) {
                            const newFilePath = file.path.split('/').map((item, index, parts) => {
                                if (index === parts.length - 1) {
                                    return item.replace(symbolsExp, '_');
                                }
                                return item;
                            }).join('/');
                            fs.renameSync(file.path, newFilePath);
                            output.write(`${file.path} renamed => ${newFilePath}\n`);
                        }
                    } catch (error) {
                        output.write(`Error ${file.path}: ${error.message}`);
                    }

                    break;
                case 'rename':
                    break;
            }
        });
    }
}

export default Worker;
