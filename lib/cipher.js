const crypto = require('crypto');

// Function untuk mengenkripsi teks
function encrypt(text, secretKey) {
    try {
        // Menggunakan algoritma AES-256-CBC
        const algorithm = 'aes-256-cbc';
        
        // Membuat initialization vector (IV)
        const iv = crypto.randomBytes(16);
        
        // Membuat key dari secret key yang diberikan
        const key = crypto.scryptSync(secretKey, 'salt', 32);
        
        // Membuat cipher
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        
        // Enkripsi teks
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Menggabungkan IV dan hasil enkripsi
        return {
            iv: iv.toString('hex'),
            encryptedText: encrypted
        };
    } catch (error) {
        console.error('Encryption error:', error.message);
        throw error;
    }
}

// Function untuk mendekripsi teks
function decrypt(encryptedData, secretKey) {
    try {
        const algorithm = 'aes-256-cbc';
        
        // Mengubah IV dari hex ke buffer
        const iv = Buffer.from(encryptedData.iv, 'hex');
        
        // Membuat key dari secret key
        const key = crypto.scryptSync(secretKey, 'salt', 32);
        
        // Membuat decipher
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        
        // Dekripsi teks
        let decrypted = decipher.update(encryptedData.encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        throw error;
    }
}

// Contoh penggunaan
function example() {
    const secretKey = 'rahasia123';
    const originalText = 'Ini adalah teks rahasia!';

    try {
        // Enkripsi
        console.log('Teks asli:', originalText);
        const encrypted = encrypt(originalText, secretKey);
        console.log('Hasil enkripsi:', encrypted);

        // Dekripsi
        const decrypted = decrypt(encrypted, secretKey);
        console.log('Hasil dekripsi:', decrypted);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Export functions
module.exports = {
    encrypt,
    decrypt,
    example
};