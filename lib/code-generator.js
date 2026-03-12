//by Nabil
//ig: @mnabzfz

const crypto = require('crypto');
// Morse Code
const morseCode = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.",
    G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
    M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
    S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..",
    "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....",
    "6": "-....", "7": "--...", "8": "---..", "9": "----.", "0": "-----",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.",
    "(": "-.--.", ")": "-.--.-", ":": "---...", ";": "-.-.-.", "=": "-...-",
    "+": ".-.-.", "-": "-....-", "_": "..--.-", "@": ".--.-.", " ": "/",
    "!": "-.-.--",   // Standar Morse untuk tanda seru
    "&": ".-...",    // Standar Morse untuk simbol ampersand
    "$": "...-..-",  // Standar Morse untuk simbol dollar
    "\"": ".-..-.",  // Standar Morse untuk tanda kutip
    "/": "-..-.",    // Standar Morse untuk garis miring
    "[": "[", "]": "]", "{": "{", "}": "}", // Tidak umum, tetap simbol itu
    "\\": "\\", "^": "^", "~": "~", "|": "|", // Simbol sendiri
    "√": "√", "π": "π", "÷": "÷", "×": "×",  // Simbol matematika tetap
    "€": "€", "£": "£", "¢": "¢", "¥": "¥",  // Simbol mata uang tetap
    "©": "©", "®": "®", "™": "™",           // Simbol hak cipta/merk dagang tetap
    "✓": "✓", "*": "*", "`": "`"
};


let whText = 'Text is undefined';
let wrText = 'Text must Alphabet';
const textToMorse = (text) => {
    try {
        if (!text) return whText;
        return text.toUpperCase().split('').map(char => morseCode[char] || '❓').join(' ');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

const morseToText = Object.entries(morseCode).reduce((obj, [key, value]) => {
    obj[value] = key;
    return obj;
}, {});

const decodeMorse = (morse) => {
    try {
        if (!morse) return whText;
        return morse.split(' ').map(code => morseToText[code] || '❓').join('');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

// AES-256-CBC Encryption and Decryption
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32); // 256-bit key
const iv = crypto.randomBytes(16); // 16-byte IV

// Encrypt
const encrypto = (text) => {
    try {
        if (!text) return whText;
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

// Decrypt
const decrypto = (encryptedText) => {
    try {
        if (!encryptedText) return whText;
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

// Braille Code
const brailleCode = {
  A: "⠁", B: "⠃", C: "⠉", D: "⠙", E: "⠑", F: "⠋",
  G: "⠛", H: "⠓", I: "⠊", J: "⠚", K: "⠅", L: "⠇",
  M: "⠍", N: "⠝", O: "⠕", P: "⠏", Q: "⠟", R: "⠗",
  S: "⠎", T: "⠞", U: "⠥", V: "⠧", W: "⠺", X: "⠭",
  Y: "⠽", Z: "⠵",
  "1": "⠼⠁", "2": "⠼⠃", "3": "⠼⠉", "4": "⠼⠙", "5": "⠼⠑",
  "6": "⠼⠋", "7": "⠼⠛", "8": "⠼⠓", "9": "⠼⠊", "0": "⠼⠚",
  ".": "⠲", ",": "⠂", ";": "⠆", ":": "⠒", "!": "⠖",
  "?": "⠦", "'": "⠄", "-": "⠤", "/": "⠸⠌", " ": " ",
  "\"": "⠶",  // Tanda kutip
  "(": "⠐⠣", // Kurung buka
  ")": "⠐⠜", // Kurung tutup
  "@": "⠈⠁", // At
  "{": "⠸⠣", // Kurung kurawal buka
  "}": "⠸⠜", // Kurung kurawal tutup
  "[": "⠐⠣", // Kurung siku buka
  "]": "⠐⠜", // Kurung siku tutup
  "\\": "⠸⠡", // Garis miring terbalik
  "=": "⠐⠶", // Sama dengan
  "+": "⠐⠖", // Tambah
  "*": "⠐⠔", // Asterisk
  "<": "⠐⠦", // Kurang dari
  ">": "⠐⠴", // Lebih dari
  "#": "⠼",   // Pagar
  "&": "⠈⠯", // Dan
  "%": "⠨⠴", // Persen
  "_": "⠤",   // Garis bawah
  "^": "⠘",   // Tanda topi
  "|": "⠸⠆", // Garis vertikal
  "~": "⠘⠤", // Tilde
  "√": "√",    // Tetap simbol itu sendiri
  "π": "π",    // Tetap simbol itu sendiri
  "÷": "÷",    // Tetap simbol itu sendiri
  "×": "×",    // Tetap simbol itu sendiri
  "€": "€",    // Tetap simbol itu sendiri
  "£": "£",    // Tetap simbol itu sendiri
  "¢": "¢",    // Tetap simbol itu sendiri
  "¥": "¥",    // Tetap simbol itu sendiri
  "©": "©",    // Tetap simbol itu sendiri
  "®": "®",    // Tetap simbol itu sendiri
  "™": "™",    // Tetap simbol itu sendiri
  "✓": "✓",    // Tetap simbol itu sendiri
  "`": "`"     // Tetap simbol itu sendiri
};

const textToBraille = (text) => {
    try {
        if (!text) return whText;
        return text.toUpperCase().split('').map(char => brailleCode[char] || '❓').join('');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

const brailleToText = Object.entries(brailleCode).reduce((obj, [key, value]) => {
    obj[value] = key;
    return obj;
}, {});

const decodeBraille = (braille) => {
    try {
        if (!braille) return whText;
        return braille.split('').map(char => brailleToText[char] || '❓').join('');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

// ASCII Code
const textToAscii = (text) => {
    try {
        if (!text) return whText;
        return text.split('').map(char => char.charCodeAt(0)).join(' ');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

const asciiToText = (ascii) => {
    try {
        if (!ascii) return whText;
        return ascii.split(' ').map(code => String.fromCharCode(parseInt(code, 10) || '❓')).join('');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

// Base64 Code
const encodeBase64 = (text) => {
    try {
        if (!text) return whText;
        return Buffer.from(text).toString('base64');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

const decodeBase64 = (encoded) => {
    try {
        if (!encoded) return whText;
        return Buffer.from(encoded, 'base64').toString('utf-8');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

// Caesar Cipher
const caesarCipher = (text, shift) => {
    try {
        if (!text) return whText;
        if (!/[a-zA-Z]/.test(text)) throw wrText
        if (shift === undefined) return 'Shift is undefined';
        return text.split('').map(char => {
            const code = char.charCodeAt(0);
            if (code >= 65 && code <= 90) {
                return String.fromCharCode(((code - 65 + shift) % 26) + 65);
            } else if (code >= 97 && code <= 122) {
                return String.fromCharCode(((code - 97 + shift) % 26) + 97);
            }
            return char;
        }).join('');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

const decodeCaesarCipher = (text, shift) => {
    try {
        if (!text) return whText;
        if (!/[a-zA-Z]/.test(text)) throw wrText
        if (shift === undefined) return 'Shift is undefined';
        
        return text.split('').map(char => {
            if (/[a-z]/.test(char)) {
                // For lowercase letters
                let code = ((char.charCodeAt(0) - 97 - shift + 26) % 26) + 97;
                return String.fromCharCode(code);
            } else if (/[A-Z]/.test(char)) {
                // For uppercase letters
                let code = ((char.charCodeAt(0) - 65 - shift + 26) % 26) + 65;
                return String.fromCharCode(code);
            } else {
                // Other symbols or characters
                return char;
            }
        }).join('');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

// Binary Code
const textToBinary = (text) => {
    try {
        if (!text) return whText;
        return text.split('').map(char =>
            char.charCodeAt(0).toString(2).padStart(8, '0')
        ).join(' ');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

const binaryToText = (binary) => {
    try {
        if (!binary) return whText;
        return binary.split(' ').map(bin => String.fromCharCode(parseInt(bin, 2) || '❓')).join('');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

// NATO Phonetic Alphabet
const natoAlphabet = {
    A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot",
    G: "Golf", H: "Hotel", I: "India", J: "Juliett", K: "Kilo", L: "Lima",
    M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo",
    S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey",
    X: "X-ray", Y: "Yankee", Z: "Zulu", " ": "Space",
    "1": "One", "2": "Two", "3": "Three", "4": "Four", "5": "Five",
    "6": "Six", "7": "Seven", "8": "Eight", "9": "Nine", "0": "Zero",
    ",": "Comma", ".": "Dot", "*": "Asterisk", "'": "Apostrophe",
    ":": "Colon", ";": "Semicolon", "@": "At", "!": "Exclamation", "?": "Question",
    "(": "Left Parenthesis", ")": "Right Parenthesis", "-": "Dash", "/": "Slash",
    "\\": "Backslash", "[": "Left Bracket", "]": "Right Bracket",
    "{": "Left Curly Bracket", "}": "Right Curly Bracket", "#": "Hash",
    "&": "Ampersand", "%": "Percent", "+": "Plus", "=": "Equals",
    "~": "Tilde", "`": "Grave Accent", "|": "Pipe", "√": "Square Root",
    "π": "Pi", "÷": "Division", "×": "Multiplication", "$": "Dollar",
    "_": "Underscore", "€": "Euro", "£": "Pound", "¢": "Cent",
    "¥": "Yen", "^": "Caret", "©": "Copyright", "®": "Registered",
    "™": "Trademark", "✓": "Checkmark"
};

const toLowerCaseNato = () => {
    const lowerCaseNato = {};
    for (const [key, value] of Object.entries(natoAlphabet)) {
        lowerCaseNato[key.toLowerCase()] = value.toLowerCase();
    }
    return lowerCaseNato;
};

const textToNato = (text) => {
    try {
        if (!text) return whText;
        const lowerCaseNato = toLowerCaseNato(); 
        const lowerText = text.toLowerCase(); 
        const words = lowerText.split(' ');
        const isEncoded = words.every(word => Object.values(lowerCaseNato).includes(word));
        if (isEncoded) return "The text is already encoded in NATO Alphabet.";
        return text.toUpperCase().split('').map(char => natoAlphabet[char] || '❓').join(' ');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

const natoToText = Object.entries(natoAlphabet).reduce((obj, [key, value]) => {
    obj[value.toLowerCase()] = key;
    return obj;
}, {});

const decodeNato = (nato) => {
    try {
        if (!nato) return whText;
        return nato.split(' ').map(word => natoToText[word.toLowerCase()] || '❓').join('');
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

// EBCDIC Code
const ebcdicTable = {
  "129": "a", "130": "b", "131": "c", "132": "d", "133": "e", "134": "f",
  "135": "g", "136": "h", "137": "i", "145": "j", "146": "k", "147": "l",
  "148": "m", "149": "n", "150": "o", "151": "p", "152": "q", "153": "r",
  "161": "s", "162": "t", "163": "u", "164": "v", "165": "w", "166": "x",
  "167": "y", "168": "z",
  "32": " ", // Spasi
  "44": ",", "46": ".", "42": "*", "34": '"', "39": "'", "58": ":", "59": ";",
  "64": "@", "33": "!", "63": "?", "40": "(", "41": ")", "45": "-", "47": "/",
  "92": "\\", "91": "[", "93": "]", "123": "{", "125": "}", "35": "#",
  "38": "&", "37": "%", "43": "+", "61": "=", "126": "~", "96": "`", "124": "|",
  "8730": "√", "960": "π", "247": "÷", "215": "×", "36": "$", "95": "_",
  "8364": "€", "163": "£", "162": "¢", "165": "¥", "94": "^", "169": "©",
  "174": "®", "8482": "™", "10003": "✓"
};


const textToEBCDIC = (text) => {
  try {
    if (!text) return whText;
    return text.toLowerCase().split('').map(char =>
        Object.keys(ebcdicTable).find(key => ebcdicTable[key] === char) || '❓'
    ).join(' ');
    } catch (error) {
        return `Error: ${error.message}`;
    }
}
const ebcdicToText = (ebcdic) => {
  try {
    if (!ebcdic) return whText;
    return ebcdic.split(' ').map(code => ebcdicTable[code] || '❓').join('');
  } catch (error) {
        return `Error: ${error.message}`;
  }
}
// Base16 (Hexadecimal) Code
const textToHex = (text)  => {
  try {
    if (!text) return whText;
    return text.split('').map(char => char.charCodeAt(0).toString(16)).join(' ');
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

const hexToText = (hex) => {
  try {
    if (!hex) return whText;
    return hex.split(' ').map(code => String.fromCharCode(parseInt(code, 16) || '❓')).join('');
    } catch (error) {
        return `Error: ${error.message}`;
    }
}
// Export all modules
module.exports = {
    textToMorse, decodeMorse,
    textToBraille, decodeBraille,
    textToAscii, asciiToText,
    encodeBase64, decodeBase64,
    caesarCipher, decodeCaesarCipher,
    textToBinary, binaryToText,
    textToNato, decodeNato,
    textToEBCDIC, ebcdicToText,
    textToHex, hexToText,
    encrypto, decrypto
};