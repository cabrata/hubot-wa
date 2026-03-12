let { S3Client, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
let ftype = require("file-type");
let md5 = require("md5");

const s3Client = new S3Client({
    region: 'auto',
    endpoint: 'https://27a9a074bbf70dac0e323ba56817bc16.r2.cloudflarestorage.com',
    credentials: {
        accessKeyId: "42ab5cf2e50f5f42f3cdf9878f89d70f",
        secretAccessKey: "3d9e8fdef5326428724e8f4c72f0e6896bf0e52f153297e701d6c388149c6b79"
    }
});


module.exports = async function(buffer, Bucketname = "filestore") {
try {
let { ext, mime } = await ftype.fromBuffer(buffer);
const putObjectCommand = new PutObjectCommand({
    Bucket: Bucketname,
    Key: `uploads/${md5(buffer)}.${ext}`,
    Body: buffer,
    ContentType: mime
});
let response = await s3Client.send(putObjectCommand);
let data = {
status: response.$metadata.httpStatusCode,
url: `https://filestore.caliphdev.com/uploads/${md5(buffer)}.${ext}`,
expired_at: response.Expiration.split(`expiry-date="`)[1].split(`",`)[0].trim()
};
return data;
} catch (err) {
    if (err.hasOwnProperty('$metadata')) {
        throw `Error - Status Code: ${err.$metadata.httpStatusCode} - ${err.message}`;
    } else {
        throw err;
    }
}
}