const axios = require("axios");
const qs = require("qs");

class CekResi {
    constructor() {
        this.courierCodes = [
            "spx", "jne", "jnt", "jtcargo", "sicepat", "lion", "ninja", "pos",
            "tiki", "idexpress", "anteraja", "wahana", "indah", "lazada",
            "sentral", "dakota", "rex", "paxel", "sap", "jdl", "ncs"
        ];
    }

    async track(resi, code) {
        const { data } = await axios.post(
            "https://trackingpaket.com/cek-resi-xhr.php",
            qs.stringify({
                awb: resi,
                courier_awb: resi,
                courier_code: code,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0",
                    Origin: "https://trackingpaket.com",
                    Referer: "https://trackingpaket.com/tracking/",
                },
            }
        );
        return data;
    }

    async multiTrack(resi) {
        for (const code of this.courierCodes) {
            try {
                const result = await this.track(resi, code);
                const data = result?.results;
                if (data && Array.isArray(data.history) && data.history.length > 0) {
                    return {
                        status: true,
                        courier: data.exp,
                        courier_code: code,
                        awb: data.awb,
                        current_status: data.status,
                        shipment_date: data.date_of_shipment || "-",
                        history: data.history,
                    };
                }
            } catch {
                // lanjut ke kurir berikutnya
            }
        }
        return { status: false, message: "Resi atau kurir tidak ditemukan" };
    }
}

module.exports = CekResi;
