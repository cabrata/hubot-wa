const crypto = require('crypto');
const { db, getUser, updateUser } = require('../../lib/database'); 

const allowedItems = [
    'money', 'limit', 'tabungan', 'potion', 'sampah', 'diamond',
    'common', 'uncommon', 'mythic', 'legendary',
    'string', 'kayu', 'batu', 'iron'
];

async function generateCode() {
    let code;
    let exists = true;
    while (exists) {
        code = crypto.randomBytes(4).toString('hex').toUpperCase();
        let count = await db.giveaway.count({ where: { id: code } });
        if (count === 0) exists = false;
    }
    return code;
}

module.exports = {
    async autoCleanupClosedExpired() {
        const now = Date.now();
        const maxAge = 3 * 24 * 60 * 60 * 1000; // 3 hari dalam milidetik
        let closedGiveaways = await db.giveaway.findMany({ where: { status: 'closed' } });
        for (let g of closedGiveaways) {
            if (g.closedAt && now - Number(g.closedAt) > maxAge) {
                await db.giveaway.delete({ where: { id: g.id } });
            }
        }
    },

    // ==========================================
    // GIVEAWAY SYSTEM
    // ==========================================
    async giveawayStart(m, { conn, args }) {
        let [item, amountStr, totalReceiversStr] = args;
        let amount = parseInt(amountStr);
        let totalReceivers = parseInt(totalReceiversStr);
        
        if (!item || !amount || !totalReceivers) return m.reply('Format salah. Contoh: #giveaway start money 10000 5');
        if (totalReceivers > 30) return m.reply('Hanya diperbolehkan hingga 30 penerima!');
        
        item = item.toLowerCase();
        if (!allowedItems.includes(item)) return m.reply(`❌ Item *${item}* tidak bisa di-giveaway.\n\nItem yang diperbolehkan:\n${allowedItems.map(i => `- ${i}`).join('\n')}`);

        let userSql = await getUser(m.sender);
        if (!userSql) return m.reply("Data tidak ditemukan.");
        
        let currentSaldo = Number(userSql[item]) || 0;
        if (currentSaldo < amount) return m.reply(`Saldo ${item} kamu tidak cukup untuk giveaway sebesar ${amount.toLocaleString('id-ID')}. Saldo kamu: ${currentSaldo.toLocaleString('id-ID')}`);

        // Potong saldo pembuat
        await updateUser(m.sender, { [item]: currentSaldo - amount });

        let code = await generateCode();

        await db.giveaway.create({
            data: {
                id: code,
                type: item,
                amount,
                totalReceivers,
                creator: m.sender,
                participants: [],
                status: 'open',
                isDaget: false
            }
        });

        return m.reply(`🎁 *GIVEAWAY DIMULAI!*\n\nKode: *${code}*\nHadiah: ${amount.toLocaleString('id-ID')} ${item}\nJumlah pemenang yang dicari: ${totalReceivers} orang\n\nGunakan *.giveaway join ${code}* untuk ikut.`);
    },

    async giveawayJoin(m, { conn, args }) {
        let code = args[0]?.toUpperCase();
        if (!code) return m.reply('Kode giveaway tidak ditemukan.');

        let ga = await db.giveaway.findUnique({ where: { id: code } });
        if (!ga || ga.isDaget) return m.reply('Kode giveaway tidak ditemukan.');
        if (ga.status !== 'open') return m.reply('Giveaway ini sudah ditutup atau ditarik.');
        
        let participants = typeof ga.participants === 'string' ? JSON.parse(ga.participants) : (ga.participants || []);
        if (participants.includes(m.sender)) return m.reply('Kamu sudah ikut giveaway ini.');

        participants.push(m.sender);

        // Jika kuota penuh, otomatis undi
        if (participants.length >= ga.totalReceivers) {
            let winner = participants[Math.floor(Math.random() * participants.length)];
            
            // Berikan hadiah ke pemenang di SQL
            let winnerSql = await getUser(winner);
            let winnerSaldo = Number(winnerSql[ga.type]) || 0;
            await updateUser(winner, { [ga.type]: winnerSaldo + ga.amount });

            await db.giveaway.update({
                where: { id: code },
                data: { status: 'closed', closedAt: BigInt(Date.now()), participants }
            });

            m.reply(`🎉 Giveaway ${code} selesai!\nPemenang: @${winner.split('@')[0]}`, m, { mentions: [winner] });
            return conn.sendMessage(winner, { text: `🎉 Selamat kamu menang giveaway *${code}* dan mendapatkan ${ga.amount.toLocaleString('id-ID')} ${ga.type}!` });
        } 
        
        await db.giveaway.update({
            where: { id: code },
            data: { participants }
        });

        if (participants.length === 3) {
            conn.reply(ga.creator, `🔔 Sudah ada 3 orang ikut giveaway ${code}. Kamu bisa menutup giveaway secara manual dengan perintah *.giveaway end ${code}*`);
        }

        return m.reply(`✅ Kamu berhasil ikut giveaway ${code}\nJangan lupa pantau grup/channel agar tahu hasilnya!`);
    },

    async giveawayEnd(m, { conn, args }) {
        let code = args[0]?.toUpperCase();
        if (!code) return m.reply('Kode giveaway tidak ditemukan.');

        let ga = await db.giveaway.findUnique({ where: { id: code } });
        if (!ga || ga.isDaget) return m.reply('Kode giveaway tidak ditemukan.');
        if (ga.creator !== m.sender) return m.reply('❌ Kamu bukan pembuat giveaway ini.');
        if (ga.status !== 'open') return m.reply('Giveaway sudah ditutup.');
        
        let participants = typeof ga.participants === 'string' ? JSON.parse(ga.participants) : (ga.participants || []);
        if (participants.length < 3) return m.reply('Minimal harus ada 3 peserta untuk menutup giveaway secara manual.');

        let winner = participants[Math.floor(Math.random() * participants.length)];
        
        // Berikan hadiah
        let winnerSql = await getUser(winner);
        await updateUser(winner, { [ga.type]: (Number(winnerSql[ga.type]) || 0) + ga.amount });
        
        await db.giveaway.update({
            where: { id: code },
            data: { status: 'closed', closedAt: BigInt(Date.now()), participants }
        });

        conn.reply(ga.creator, `🎉 Giveaway ${code} ditutup manual!\nPemenang: @${winner.split('@')[0]}`, m, { mentions: [winner] });
        return conn.sendMessage(winner, { text: `🎉 Selamat! Kamu menang giveaway *${code}* dan mendapatkan ${ga.amount.toLocaleString('id-ID')} ${ga.type}!` });
    },

    async giveawayCheck(m, { args }) {
        let code = args[0]?.toUpperCase();
        if (!code) return m.reply('Kode giveaway tidak ditemukan.');

        let ga = await db.giveaway.findUnique({ where: { id: code } });
        if (!ga || ga.isDaget) return m.reply('Kode giveaway tidak ditemukan.');

        let status = ga.status === 'open' ? '🟢 OPEN' : '🔴 CLOSED';
        let participants = typeof ga.participants === 'string' ? JSON.parse(ga.participants) : (ga.participants || []);
        let participantsList = participants.map(p => '@' + p.split('@')[0]).join(', ') || 'Belum ada peserta';

        return m.reply(`📦 *Informasi Giveaway:*\n\nKode: ${code}\nTipe: ${ga.type}\nTotal Hadiah: ${ga.amount.toLocaleString('id-ID')}\nTarget Peserta: ${ga.totalReceivers}\nStatus: ${status}\n\nPeserta (${participants.length}):\n${participantsList}`, null, {
            mentions: participants
        });
    },

    async giveawayDelete(m, { args }) {
        let code = args[0]?.toUpperCase();
        if (!code) return m.reply('Kode giveaway tidak ditemukan.');

        let ga = await db.giveaway.findUnique({ where: { id: code } });
        if (!ga || ga.isDaget) return m.reply('Kode giveaway tidak ditemukan.');
        if (ga.creator !== m.sender) return m.reply('❌ Kamu bukan pembuat giveaway ini.');

        if (ga.status === 'open') {
            // Refund uang
            let userSql = await getUser(m.sender);
            await updateUser(m.sender, { [ga.type]: (Number(userSql[ga.type]) || 0) + ga.amount });
            m.reply(`💰 Giveaway dibatalkan. ${ga.amount.toLocaleString('id-ID')} ${ga.type} telah dikembalikan ke saldo kamu.`);
        } else {
            m.reply(`🗑️ Data Giveaway ${code} telah dihapus dari sistem.`);
        }

        await db.giveaway.delete({ where: { id: code } });
    },

    // ==========================================
    // DANA KAGET (DAGET) SYSTEM
    // ==========================================
    async dagetStart(m, { conn, args, isROwner }) {
        let [item, amountStr, totalReceiversStr] = args;
        let amount = parseInt(amountStr);
        let totalReceivers = parseInt(totalReceiversStr);
        
        if (!item || !amount || !totalReceivers) return m.reply('Format salah. Contoh: #daget start money 10000 5');
        if (!isROwner && item === 'money' && amount > 500000000) return m.reply('Maksimal nominal 500 Jt untuk non-owner!');
        if (totalReceivers > 30) return m.reply('Hanya diperbolehkan hingga 30 penerima!');
        
        item = item.toLowerCase();
        if (!allowedItems.includes(item)) return m.reply(`❌ Item *${item}* tidak bisa digunakan untuk dana kaget.`);

        let userSql = await getUser(m.sender);
        let currentSaldo = Number(userSql[item]) || 0;
        if (currentSaldo < amount) return m.reply(`Saldo ${item} kamu tidak cukup untuk dana kaget. Saldo: ${currentSaldo.toLocaleString('id-ID')}`);

        // Potong saldo SQL
        await updateUser(m.sender, { [item]: currentSaldo - amount });

        let code = await generateCode();

        await db.giveaway.create({
            data: {
                id: code,
                type: item,
                totalAmount: amount,
                remainingAmount: amount, // Tambahan untuk memisahkan tracking uang
                totalReceivers,
                claimed: [],
                creator: m.sender,
                status: 'open',
                isDaget: true
            }
        });

        return m.reply(`💸 *DANA KAGET DIMULAI!*\n\nKode: *${code}*\nHadiah: ${amount.toLocaleString('id-ID')} ${item}\nPenerima: ${totalReceivers} orang\n\nGunakan *.daget claim ${code}* untuk berebut!`);
    },

    async dagetClaim(m, { conn, args }) {
        let code = args[0]?.toUpperCase();
        if (!code) return m.reply('Kode dana kaget tidak ditemukan.');

        let ga = await db.giveaway.findUnique({ where: { id: code } });
        if (!ga || !ga.isDaget) return m.reply('Kode dana kaget tidak ditemukan.');

        if (ga.status !== 'open') return m.reply('Yahhh, dana kaget sudah habis/ditutup.');
        let claimed = typeof ga.claimed === 'string' ? JSON.parse(ga.claimed) : (ga.claimed || []);
        
        if (claimed.find(u => u.jid === m.sender)) return m.reply('Kamu sudah claim dana kaget ini sebelumnya.');

        let sisaSlot = ga.totalReceivers - claimed.length;
        let sisaUang = ga.remainingAmount;
        let randomAmount = 0;

        // Logika Matematika Daget Realistis
        if (sisaSlot === 1) {
            randomAmount = sisaUang; // Orang terakhir dapat semua sisanya
        } else {
            let average = Math.floor(sisaUang / sisaSlot);
            let minHit = Math.floor(average * 0.4) || 1; // Minimal dapat 40% dari rata-rata
            let maxHit = Math.floor(average * 1.5); // Maksimal dapat 1.5x rata-rata

            randomAmount = Math.floor(Math.random() * (maxHit - minHit + 1)) + minHit;

            // Boost untuk yang cepat claim (Orang ke-1 & 2)
            let boost = claimed.length === 0 ? 1.4 : (claimed.length === 1 ? 1.2 : 1);
            randomAmount = Math.floor(randomAmount * boost);

            // Safety guard agar uang tidak habis duluan
            if (randomAmount >= sisaUang) randomAmount = sisaUang - sisaSlot;
        }

        // Potong dari pool Daget
        let remainingAmount = sisaUang - randomAmount;
        claimed.push({ jid: m.sender, amount: randomAmount });

        // Tambah uang ke pemenang di SQL
        let userSql = await getUser(m.sender);
        await updateUser(m.sender, { [ga.type]: (Number(userSql[ga.type]) || 0) + randomAmount });

        let status = ga.status;
        let closedAt = ga.closedAt;
        if (claimed.length >= ga.totalReceivers || remainingAmount <= 0) {
            status = 'closed';
            closedAt = BigInt(Date.now());
        }

        await db.giveaway.update({
            where: { id: code },
            data: { remainingAmount, claimed, status, closedAt }
        });

        return m.reply(`🎉 *BERHASIL CLAIM!*\nKamu mendapatkan *${randomAmount.toLocaleString('id-ID')} ${ga.type}*\n\nSisa Kuota: ${ga.totalReceivers - claimed.length} orang lagi.`);
    },

    async dagetCheck(m, { args }) {
        let code = args[0]?.toUpperCase();
        if (!code) return m.reply('Kode dana kaget tidak ditemukan.');

        let ga = await db.giveaway.findUnique({ where: { id: code } });
        if (!ga || !ga.isDaget) return m.reply('Kode dana kaget tidak ditemukan.');

        let status = ga.status === 'open' ? '🟢 OPEN' : '🔴 CLOSED / HABIS';
        let claimed = typeof ga.claimed === 'string' ? JSON.parse(ga.claimed) : (ga.claimed || []);
        let claimedList = claimed.map((u, i) => `${i+1}. @${u.jid.split('@')[0]} (${u.amount.toLocaleString('id-ID')})`).join('\n') || 'Belum ada yang claim';

        return m.reply(`💰 *Informasi Dana Kaget:*\n\nKode: ${code}\nTipe: ${ga.type}\nUang Tersedia: ${ga.remainingAmount.toLocaleString('id-ID')} / ${ga.totalAmount.toLocaleString('id-ID')}\nStatus: ${status}\n\n*Sudah Claim (${claimed.length}/${ga.totalReceivers}):*\n${claimedList}`, null, {
            mentions: claimed.map(u => u.jid)
        });
    }
};
