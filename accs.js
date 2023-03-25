import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';
import * as stream from 'stream'
import { once } from 'events'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const importETHWallets = async () => {
    let accs = [];
    let instream = fs.createReadStream(path.join(__dirname, './privates.txt'));
    let outstream = new stream.Stream();
    let rl = readline.createInterface(instream, outstream);
    rl.on('line', (line) => {
        accs.push(line);
    });
    await once(rl, 'close');
    return accs;
}

export const importAptosWallets = async () => {
    let accs = [];
    let instream = fs.createReadStream(path.join(__dirname, './aptos_privates.txt'));
    let outstream = new stream.Stream();
    let rl = readline.createInterface(instream, outstream);
    rl.on('line', (line) => {
        accs.push(line);
    });
    await once(rl, 'close');
    return accs;
}