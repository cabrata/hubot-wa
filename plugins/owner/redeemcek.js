const fs = require('fs');
const path = require('path');
const { getUser } = require('../../lib/database');

const dbFolder = path.join(__dirname, '../../database');
const redeemPath = path.join(dbFolder, 'redeem.json');

// Fungsi membaca database redeem lokal
function readRedeem() {
    try {
        if (!fs.existsSync(redeemPath)) return { redeems: {} };
        return JSON.parse(fs.readFileSync(redeemPath, 'utf8'));
    } catch (e) {
        return { redeems: {} };
    }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let dbRedeem = readRedeem();
    let user = await getUser(m.sender);
    
    // Cek apakah yang pakai adalah Owner atau Moderator (Sesuai SQL Prisma)
    let isStaff = global.owner?.includes(m.sender.split('@')[0]) || (user && user.moderator);

    // ==========================================
    // 1. DAFTAR SEMUA KODE (HANYA STAFF)
    // ==========================================
    if (command === 'listcode') {
        if (!isStaff) return m.reply('⛔ Hanya Owner dan Moderator yang bisa melihat daftar semua kode.');

        let codes = Object.keys(dbRedeem.redeems);
        if (codes.length === 0) return m.reply('💤 Tidak ada kode redeem yang terdaftar saat ini.');

        let txt = `📋 *DAFTAR KODE REDEEM SERVER* 📋\n────────────────────\n\n`;
        let count = 1;
        let now = Date.now();
        let mentions = [];

        for (let code of codes) {
            let r = dbRedeem.redeems[code];
            let isExpired = now > r.data.expired;
            let status = isExpired ? '🔴 Expired' : (r.data.claim.length >= r.data.limituser ? '🟡 Penuh' : '🟢 Aktif');
            let isPrivate = r.data.forWho && r.data.forWho.length > 0;

            txt += `*${count}. ${code}* [${status}]\n`;
            txt += `   👤 Creator: @${r.creator.split('@')[0]}\n`;
            txt += `   👥 Kuota: ${r.data.claim.length} / ${r.data.limituser}\n`;
            txt += `   🔒 Tipe: ${isPrivate ? 'Private Code' : 'Public Code'}\n`;
            txt += `   ⏳ Exp: ${new Date(r.data.expired).toLocaleString('id-ID')}\n\n`;
            
            mentions.push(r.creator);
            count++;
        }
        
        txt += `────────────────────\n_Gunakan *${usedPrefix}cekcode <kode>* untuk melihat hadiahnya_`;
        return conn.reply(m.chat, txt.trim(), m, { mentions: [...new Set(mentions)] });
    }

    // ==========================================
    // 2. CEK DETAIL 1 KODE (PUBLIK)
    // ==========================================
    if (command === 'cekcode') {
        let code = args[0];
        if (!code) return m.reply(`❓ Masukkan kode yang ingin dicek!\nContoh: *${usedPrefix + command} KODE123*`);

        let r = dbRedeem.redeems[code];
        if (!r) return m.reply(`❌ Kode *${code}* tidak ditemukan, salah ketik, atau sudah dihapus permanen.`);

        let now = Date.now();
        let isExpired = now > r.data.expired;
        let status = isExpired ? '🔴 Kadaluarsa (Expired)' : (r.data.claim.length >= r.data.limituser ? '🟡 Kuota Penuh' : '🟢 Masih Aktif');
        let isPrivate = r.data.forWho && r.data.forWho.length > 0;
        
        let txt = `🔎 *INFO KODE REDEEM* 🔎\n────────────────────\n`;
        txt += `🎟️ *Kode:* ${code}\n`;
        txt += `📊 *Status:* ${status}\n`;
        txt += `👥 *Telah Diklaim:* ${r.data.claim.length} / ${r.data.limituser} Orang\n`;
        txt += `🔒 *Tipe:* ${isPrivate ? 'Private (Khusus User/Grup Tertentu)' : 'Public (Terbuka Bebas)'}\n`;
        txt += `⏳ *Berakhir Pukul:* ${new Date(r.data.expired).toLocaleString('id-ID')}\n\n`;
        
        txt += `🎁 *HADIAH DI DALAMNYA:*\n`;
        txt += ` 💰 Money: ${Number(r.data.reward.money).toLocaleString('id-ID')}\n`;
        txt += ` 💳 Saldo: ${Number(r.data.reward.saldo).toLocaleString('id-ID')}\n`;
        txt += ` ✨ Exp: ${Number(r.data.reward.exp).toLocaleString('id-ID')}\n`;
        txt += ` ⚡ Limit: ${Number(r.data.reward.limit).toLocaleString('id-ID')}\n`;

        // Tampilkan info tambahan jika yang mengecek adalah admin
        if (isStaff) {
            txt += `\n🛠️ *INFO ADMIN:*\n`;
            txt += `• Pembuat Kode: @${r.creator.split('@')[0]}\n`;
            if (r.data.blocked && r.data.blocked.length > 0) {
                txt += `• User Diblokir: ${r.data.blocked.length} orang\n`;
            }
        }

        return conn.reply(m.chat, txt.trim(), m, { mentions: [r.creator] });
    }
};

handler.help = ['listcode', 'cekcode <kode>'];
handler.tags = ['redeem'];
handler.command = /^(listcode|cekcode)$/i;

module.exports = handler;
