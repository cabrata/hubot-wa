const CryptoJS = require('crypto-js');

// Fungsi untuk enkripsi
exports.encrypt = function encrypt(message, key) {
    if (!message || !key) {
        throw new Error('Please provide both message and key!');
    }

    try {
        const encrypted = CryptoJS.AES.encrypt(message, key).toString();
        return encrypted;
    } catch (error) {
        throw new Error('Encryption failed: ' + error.message);
    }
}

// Fungsi untuk dekripsi
exports.decrypt = function decrypt(encryptedMessage, key) {
    if (!encryptedMessage || !key) {
        throw new Error('Please provide both encrypted message and key!');
    }

    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key);
        const originalText = decrypted.toString(CryptoJS.enc.Utf8);

        if (!originalText) {
            throw new Error('Invalid key or encrypted message');
        }

        return originalText;
    } catch (error) {
        throw new Error('Decryption failed: ' + error.message);
    }
}


