const { db, getUser } = require('../../lib/database');

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = await getUser(m.sender);
    
    // Cek apakah yang pakai adalah Owner atau Moderator (Sesuai SQL Prisma)
    let isStaff = global.owner?.includes(m.sender.split('@')[0]) || (user && user.moderator);

    // ==========================================
    // 1. DAFTAR SEMUA KODE (HANYA STAFF)
    // ==========================================
    if (command === 'listcode') {
        if (!isStaff) return m.reply('⛔ Hanya Owner dan Moderator yang bisa melihat daftar semua kode.');

        let codesList = await db.redeemCode.findMany();
        if (codesList.length === 0) return m.reply('💤 Tidak ada kode redeem yang terdaftar saat ini.');

        let txt = `📋 *DAFTAR KODE REDEEM SERVER* 📋\n────────────────────\n\n`;
        let count = 1;
        let now = Date.now();
        let mentions = [];

        for (let r of codesList) {
            let code = r.code;
            let claims = typeof r.claim === 'string' ? JSON.parse(r.claim) : r.claim;
            let forWho = typeof r.forWho === 'string' ? JSON.parse(r.forWho) : r.forWho;
            
            let isExpired = now > Number(r.expired);
            let status = isExpired ? '🔴 Expired' : (claims.length >= r.limituser ? '🟡 Penuh' : '🟢 Aktif');
            let isPrivate = forWho && forWho.length > 0;

            txt += `*${count}. ${code}* [${status}]\n`;
            txt += `   👤 Creator: @${r.creator.split('@')[0]}\n`;
            txt += `   👥 Kuota: ${claims.length} / ${r.limituser}\n`;
            txt += `   🔒 Tipe: ${isPrivate ? 'Private Code' : 'Public Code'}\n`;
            txt += `   ⏳ Exp: ${new Date(Number(r.expired)).toLocaleString('id-ID')}\n\n`;
            
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

        let r = await db.redeemCode.findUnique({ where: { code } });
        if (!r) return m.reply(`❌ Kode *${code}* tidak ditemukan, salah ketik, atau sudah dihapus permanen.`);

        let claims = typeof r.claim === 'string' ? JSON.parse(r.claim) : r.claim;
        let forWho = typeof r.forWho === 'string' ? JSON.parse(r.forWho) : r.forWho;
        let blocked = typeof r.blocked === 'string' ? JSON.parse(r.blocked) : r.blocked;
        let reward = typeof r.reward === 'string' ? JSON.parse(r.reward) : r.reward;

        let now = Date.now();
        let isExpired = now > Number(r.expired);
        let status = isExpired ? '🔴 Kadaluarsa (Expired)' : (claims.length >= r.limituser ? '🟡 Kuota Penuh' : '🟢 Masih Aktif');
        let isPrivate = forWho && forWho.length > 0;
        
        let txt = `🔎 *INFO KODE REDEEM* 🔎\n────────────────────\n`;
        txt += `🎟️ *Kode:* ${code}\n`;
        txt += `📊 *Status:* ${status}\n`;
        txt += `👥 *Telah Diklaim:* ${claims.length} / ${r.limituser} Orang\n`;
        txt += `🔒 *Tipe:* ${isPrivate ? 'Private (Khusus User/Grup Tertentu)' : 'Public (Terbuka Bebas)'}\n`;
        txt += `⏳ *Berakhir Pukul:* ${new Date(Number(r.expired)).toLocaleString('id-ID')}\n\n`;
        
        txt += `🎁 *HADIAH DI DALAMNYA:*\n`;
        txt += ` 💰 Money: ${Number(reward.money || 0).toLocaleString('id-ID')}\n`;
        txt += ` 💳 Saldo: ${Number(reward.saldo || 0).toLocaleString('id-ID')}\n`;
        txt += ` ✨ Exp: ${Number(reward.exp || 0).toLocaleString('id-ID')}\n`;
        txt += ` ⚡ Limit: ${Number(reward.limit || 0).toLocaleString('id-ID')}\n`;

        // Tampilkan info tambahan jika yang mengecek adalah admin
        if (isStaff) {
            txt += `\n🛠️ *INFO ADMIN:*\n`;
            txt += `• Pembuat Kode: @${r.creator.split('@')[0]}\n`;
            if (blocked && blocked.length > 0) {
                txt += `• User Diblokir: ${blocked.length} orang\n`;
            }
        }

        return conn.reply(m.chat, txt.trim(), m, { mentions: [r.creator] });
    }
};

handler.help = ['listcode', 'cekcode <kode>'];
handler.tags = ['redeem'];
handler.command = /^(listcode|cekcode)$/i;

module.exports = handler;
