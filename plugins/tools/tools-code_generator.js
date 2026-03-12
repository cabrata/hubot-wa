let { textToMorse, textToBraille, textToAscii, encodeBase64, caesarCipher, textToBinary, textToNato, textToEBCDIC, textToHex, encrypto, decodeMorse, decodeBraille, asciiToText, decodeBase64, decodeCaesarCipher, binaryToText, decodeNato, ebcdicToText, hexToText, decrypto } = require('../../lib/code-generator.js');
let { encrypt, decrypt } = require('@dunkelhaiser/caesar-cipher');

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const more = String.fromCharCode(8206)
    const readmore = more.repeat(4001)

    let apkh = command == 'enc' ? 'Hello world' : 'Jgnnq yqtnf';
    let format = `Invalid format!\nExample: ${usedPrefix + command} Hello world\nor reply text then type ${usedPrefix+command} `;
    let format2 = `Khusus ${command} 2-10
Cara penggunaan:
${usedPrefix}command Teks
Contoh:
${usedPrefix+command}2 ${apkh}

atau reply pesan lalu ketik
${usedPrefix+command}2 (reply pesan)

Khusus enc1
Cara penggunaan:
${usedPrefix}enc1 Teks|shift(nomor)
Contoh:
${usedPrefix}enc1 Hello world|2

atau reply pesan lalu ketik
${usedPrefix}enc1 2

jika dec1 
Cara penggunaan:
${usedPrefix}dec1 Encode|shift(nomor atau all)
Contoh:
${usedPrefix}dec1 Jgnnq yqtnf|2
atau reply pesan lalu ketik
${usedPrefix}dec1 2
> jika shift adalah *all* maka akan memunculkan 26 shift

List command encode dan decode:
${readmore}
${usedPrefix}enc1 (Encrypt Caesar Cipher)
${usedPrefix}dec1 (Decrypt Caesar Cipher)
${usedPrefix}enc2 (Encode Morse)
${usedPrefix}dec2 (Decode Morse)
${usedPrefix}enc3 (Encode Braille)
${usedPrefix}dec3 (Decode Braille)
${usedPrefix}enc4 (Encode ASCII)
${usedPrefix}dec4 (Decode ASCII)
${usedPrefix}enc5 (Encode Base64)
${usedPrefix}dec5 (Decode Base64)
${usedPrefix}enc6 (Encode Binary)
${usedPrefix}dec6 (Decode Binary)
${usedPrefix}enc7 (Encode NATO)
${usedPrefix}dec7 (Decode NATO)
${usedPrefix}enc8 (Encode EBCDIC)
${usedPrefix}dec8 (Decode EBCDIC)
${usedPrefix}enc9 (Encode Hex)
${usedPrefix}dec9 (Decode Hex)
${usedPrefix}enc10 (Encrypt)
${usedPrefix}dec10 (Decrypt)`

//${Array.from({ length: 10 }, (_, i) => `${usedPrefix}enc${i + 1}\n${usedPrefix}dec${i + 1}`).join('\n')}
    if (command === 'enc' || command === 'dec') throw format2
    let [teks, numb] = text ? text.split('|') : [m.quoted?.text, null];
    if (m.quoted?.text) {
      teks = m.quoted.text
      numb = text
    }
    let ha = command === 'enc1' || command === 'dec1' ? format + '2 or all' : format
    if (!teks) throw ha
    const functions = {
        enc1: async () => {
            if ( !numb || isNaN(numb)) throw format + '2'
            return `Encrypted:\n${await encrypt(teks, parseInt(numb))}`;
        },
        dec1: async () => {
            if (numb === 'all') {
                if (!/[a-zA-Z]/.test(teks)) throw 'Text must contain at least one alphabet for "all"';
                if (teks.length > 100) throw 'Text is too long for "all" (max 100 characters)';

                let results = [];
                for (let i = 1; i <= 26; i++) results.push(`Shift ${i}: ${await decrypt(teks, i)}`);
                return `Decryption results:\n\n${results.join('\n')}`;
            } else {
                if (!numb || isNaN(numb)) throw format + '2 or all';
                return `Decrypted:\n${await decrypt(teks, parseInt(numb))}`;
            }
        },
        enc2: async () => `Encoded:\n${await textToMorse(teks)}`,
        dec2: async () => `Decoded:\n${await decodeMorse(teks)}`,
        enc3: async () => `Encoded:\n${await textToBraille(teks)}`,
        dec3: async () => `Decoded:\n${await decodeBraille(teks)}`,
        enc4: async () => `Encoded:\n${await textToAscii(teks)}`,
        dec4: async () => `Decoded:\n${await asciiToText(teks)}`,
        enc5: async () => `Encoded:\n${await encodeBase64(teks)}`,
        dec5: async () => `Decoded:\n${await decodeBase64(teks)}`,
        enc6: async () => `Encoded:\n${await textToBinary(teks)}`,
        dec6: async () => `Decoded:\n${await binaryToText(teks)}`,
        enc7: async () => `Encoded:\n${await textToNato(teks)}`,
        dec7: async () => `Decoded:\n${await decodeNato(teks)}`,
        enc8: async () => `Encoded:\n${await textToEBCDIC(teks)}`,
        dec8: async () => `Decoded:\n${await ebcdicToText(teks)}`,
        enc9: async () => `Encoded:\n${await textToHex(teks)}`,
        dec9: async () => `Decoded:\n${await hexToText(teks)}`,
        enc10: async () => `Encoded:\n${await encrypto(teks)}`,
        dec10: async () => `Decoded:\n${await decrypto(teks)}`,
    };

    try {
        if (!functions[command]) throw format;
        let result = await functions[command]();
        return m.reply(result);
    } catch (err) {
        console.error(err);
        return m.reply('Error:\n' + err);
    }
};
handler.command = [
    'enc1', 'dec1', 'enc2', 'dec2', 'enc3', 'dec3', 'enc4', 'dec4',
    'enc5', 'dec5', 'enc6', 'dec6', 'enc7', 'dec7', 'enc8', 'dec8',
    'enc9', 'dec9', 'enc10', 'dec10', 'enc', 'dec'

];
handler.help = [
    'enc1 <text|number>', 'dec1 <text|number>', 'enc2 <text>', 'dec2 <text>', 'enc3 <text>', 'dec3 <text>', 'enc4 <text>', 'dec4 <text>',
    'enc5 <text>', 'dec5 <text>', 'enc6 <text>', 'dec6 <text>', 'enc7 <text>', 'dec7 <text>', 'enc8 <text>', 'dec8 <text>',
    'enc9 <text>', 'dec9 <text>', 'enc10 <text>', 'dec10 <text>'
];
handler.tags = ['code'];

module.exports = handler;