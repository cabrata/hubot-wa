const formdata = require("form-data");
const fetch = require("node-fetch");
const { fromBuffer } = require("file-type");
const crypto = require("crypto");

function getRand(length) {
    return crypto.randomBytes(length).toString("hex").slice(0, length)
}


module.exports = async function upload(file, file_name, slots) {
    let Form = new formdata();
    let rand1 = getRand(10);
    let { ext } = await fromBuffer(file);
    let filename = file_name || `${getRand(10)}.${ext}`;
    Form.append("file", file, filename);
    Form.append("context", slots || rand1);
    let data = await fetch("https://api.ganeshaoperationexpert.com/v1/file/upload/image", {
        headers: {
            "x-api-key": "fb2005b9-131f-4ed7-b26b-5650e45382db",
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9,id;q=0.8",
            "content-type": `multipart/form-data; boundary=${Form._boundary}`,
        },
        method: "POST",
        body: Form
    });
    if (!data.ok) throw `API Failed: Status Code ${data.status}\n\nJSON: ${JSON.stringify(await data.json(), null, 2)}`;
    return (await data.json()).link;
}