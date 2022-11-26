// http://www.cbr.ru/s/newbik
// http://www.cbr.ru/PSystem/payment_system/#a_44305

import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream';
import {promisify} from 'node:util'
import fetch from 'node-fetch';
import fs from "fs"
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import xmldom from "xmldom";

const {decode} = iconv
const pathToZipFolder = './bik.zip';
const pathToUnzipFolder = './bik';

async function downloadBikTo(pathToZipFolder) {
    const streamPipeline = promisify(pipeline);
    const response = await fetch('http://www.cbr.ru/s/newbik');
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);
    await streamPipeline(response.body, createWriteStream(pathToZipFolder));
    return pathToZipFolder;
}


function extractFromZipFolder(pathToZipFolder, pathToUnzipFolder) {
    const zip = new AdmZip(pathToZipFolder, {});
    zip.extractAllTo(`${pathToUnzipFolder}`, true, false, "");
}


function readFileAndDecode(pathToUnzipFolder) {
    const pathToReadFile = pathToUnzipFolder + "/" + fs.readdirSync(pathToUnzipFolder);
    const readFile = fs.readFileSync(pathToReadFile)
    return decode(readFile, "win1251");
}

function getData(pathToUnzipFolder) {
    const decoded = readFileAndDecode(pathToUnzipFolder);
    const parsedFile = new xmldom.DOMParser().parseFromString(decoded);
    const bicDirectories = Array.from(parsedFile.getElementsByTagName("BICDirectoryEntry"))
    const data = []
    for (const bicDirectory of bicDirectories) {
        const bic = bicDirectory.getAttribute("BIC")
        const participant = Array.from(bicDirectory.getElementsByTagName("ParticipantInfo")).pop()
        const participantNameP = participant.getAttribute("NameP")
        const accounts = Array.from(bicDirectory.getElementsByTagName("Accounts"))
        for (const account of accounts) {
            if (accounts.length === 0) continue;
            let accountName = account.getAttribute("Account");
            data.push({bic: bic, name: participantNameP, corrAccount: accountName})
        }

    }
    return data;
}

await downloadBikTo(pathToZipFolder);
extractFromZipFolder(pathToZipFolder, pathToUnzipFolder);
const data = getData(pathToUnzipFolder);

console.log(data);