const axios = require("axios");
const qs = require("qs");

class CekRekening {
    constructor() {
        this.baseURL = "https://atlantich2h.com";
        // Get API key from global variables or environment
        this.apiKey = global.atlanticKey || process.env.ATLANTIC_API_KEY || "IhY9VjdiabY5HU5gFcqHLyTSWyxa3xyl0Hfo8Xt5i4SXoVUpcRHnmkAJcPxc3WKPrPAXuYbtjNF40U6EqaZMJS8y8sAF75APhDMW";
    }

    async getBankList() {
        try {
            const { data } = await axios.post(
                `${this.baseURL}/transfer/bank_list`,
                qs.stringify({ api_key: this.apiKey }),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );
            return data;
        } catch (error) {
            return { status: false, message: error.message };
        }
    }

    async checkAccount(bankCode, accountNumber) {
        try {
            const { data } = await axios.post(
                `${this.baseURL}/transfer/cek_rekening`,
                qs.stringify({
                    api_key: this.apiKey,
                    bank_code: bankCode,
                    account_number: accountNumber
                }),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );
            return data;
        } catch (error) {
            return { status: false, message: error.message };
        }
    }
}

module.exports = CekRekening;
