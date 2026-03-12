const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { fileTypeFromBuffer } = require('file-type');

// Konfigurasi R2
const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.R2_BUCKET_NAME || '';
const publicUrl = process.env.R2_PUBLIC_URL || ''; // URL R2 public domain, cont: https://media.domain.dev

const S3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

/**
 * Upload buffer to Cloudflare R2
 * @param {Buffer} buffer File Buffer
 * @param {string} ext Extension (optional)
 * @param {string} mime Mimetype (optional)
 */
const uploadR2 = async (buffer, ext = '', mime = '') => {
    if (!accountId || !accessKeyId) throw new Error("Cloudflare R2 belum dikonfigurasi di .env!");

    if (!ext || !mime) {
        const fileType = await fileTypeFromBuffer(buffer);
        if (fileType) {
            ext = fileType.ext;
            mime = fileType.mime;
        } else {
            ext = 'bin';
            mime = 'application/octet-stream';
        }
    }

    // Bikin nama file unik pakai timestamp
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    await S3.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: mime,
        })
    );

    // Jika user mendefinisikan custom public domain untuk bucketnya di Env
    if (publicUrl) {
        let url = publicUrl;
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }
        return `${url}/${fileName}`;
    }

    // Jika tidak, kita gunakan link presigned dari S3 yang bertahan 7 hari
    // (Note: Presigned S3 url max 7 hari)
    const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: fileName });
    return await getSignedUrl(S3, getCommand, { expiresIn: 7 * 24 * 60 * 60 });
};

module.exports = uploadR2;
