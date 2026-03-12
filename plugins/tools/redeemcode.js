const crypto = require('crypto');
const { db, getUser, updateUser, updateEconomy } = require('../../lib/database'); 
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getModState() {
    let mod = await db.modRedeemState.findUnique({ where: { id: 1 } });
    if (!mod) {
        mod = await db.modRedeemState.create({
            data: { id: 1, weeklyCount: 0, dailyCount: {}, resetWeekly: BigInt(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        });
    }
    return mod;
}

async function updateModState(mod) {
    await db.modRedeemState.update({
        where: { id: 1 },
        data: {
            weeklyCount: mod.weeklyCount,
            dailyCount: mod.dailyCount,
            resetWeekly: mod.resetWeekly
        }
    });
}

function parseJSON(str) {
    if (typeof str === 'string') return JSON.parse(str);
    return str || [];
}

let handler = async (m, { conn, text, args, command, usedPrefix }) => {
    function randomString(length) {
        return crypto.randomBytes(length).toString('hex').slice(0, length).toUpperCase();
    }

    // --- AUTO CLEAN UP EXPIRED REDEEMS ---
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    
    let expiredRedeems = await db.redeemCode.findMany({
        where: { expired: { lt: BigInt(now - thirtyDays) } }
    });

    for (let redeem of expiredRedeems) {
        let ownerMessage = `Kode redeem "${redeem.code}" yang dibuat oleh @${redeem.creator.split('@')[0]} telah dihapus dari database karena sudah melewati masa 30 hari setelah kadaluarsa.`;
        await delay(1000);
        await global.conn.reply('120363368633822650@g.us', ownerMessage, null, { mentions: [redeem.creator] });
        await db.redeemCode.delete({ where: { code: redeem.code } });
    }
    // --------------------------------------

    let userMemory = m.user || {};

    if (command === 'createredeem') {
        var moneys = 2500000;
        var exps = 25000;
        var limits = 100;
        var saldos = 2500000;
        var expireds = 14;
        var limitusers = 50;

        let [money, exp, limit, saldo, expired, limituser, code, tagged] = text.split('|');
        let tagUser = m.mentionedJid.length > 0 ? m.mentionedJid : conn.parseMention(text);
        
        let staffs = []; 
        let isOwner = staffs.includes(m.sender) || (global.owner && global.owner.includes(m.sender.split('@')[0]));
        let isPublic = tagUser.length === 0;
        const isModerator = isOwner || userMemory.moderator;
        let format = `Format salah!\n${usedPrefix + command} money|exp|limit|saldo|expired|limit user${isOwner ? '|code' : ''}`;

        if (!m.chat.includes('120363368633822650@g.us')) throw 'Jika ingin membuat kode redeem, silahkan chat di grup staff';
        if (!text) throw format;
        if (!isModerator) return conn.reply(m.chat, 'Hanya moderator atau owner yang dapat membuat kode redeem.', m);
        
        if (!isOwner) {
            if (money > moneys || exp > exps || limit > limits || saldo > saldos || expired > expireds || limituser > limitusers) {
                return m.reply(`Input melebihi batas yang ditentukan\n- Money: ${moneys}\n- Exp: ${exps}\n- Limit: ${limits}\n- Saldo: ${saldos}\n- Expired: ${expireds}\n- Limit user: ${limitusers}`);
            }
            if (code) return m.reply('Moderator tidak bisa request kode custom!');
        }
        
        let modState = await getModState();
        let dailyCountObj = parseJSON(modState.dailyCount) || {};

        if (Date.now() > Number(modState.resetWeekly)) {
            modState.weeklyCount = 0;
            modState.resetWeekly = BigInt(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
        
        const today = new Date().toISOString().split('T')[0]; 
        if (!dailyCountObj[today]) {
            dailyCountObj[today] = {};
        }

        if (!isOwner) {
            let dailyCount = dailyCountObj[today][m.sender] || 0;
            let weeklyCount = modState.weeklyCount;
            if (dailyCount >= 5) return conn.reply(m.chat, 'Kode redeem sudah mencapai batas pembuatan harian (5 per hari).', m);
            if (weeklyCount >= 35) return conn.reply(m.chat, 'Kode redeem sudah mencapai batas pembuatan mingguan (35 per minggu).', m);
            
            dailyCountObj[today][m.sender] = dailyCount + 1;
            modState.weeklyCount++;
            modState.dailyCount = dailyCountObj;
            await updateModState(modState);
        }

        code = isOwner ? (code || 'OA' + randomString(6)) : 'M' + randomString(8);
        money = money ? parseInt(money) : moneys;
        exp = exp ? parseInt(exp) : exps;
        limit = limit ? parseInt(limit) : limits;
        saldo = saldo ? parseInt(saldo) : saldos;
        expired = expired ? parseInt(expired) : expireds;
        limituser = limituser ? parseInt(limituser) : limitusers;
        
        if (isNaN(money) || isNaN(exp) || isNaN(limit) || isNaN(saldo) || isNaN(expired) || isNaN(limituser)) {
            return conn.reply(m.chat, format, m);
        }

        let expiredAt = Date.now() + expired * 24 * 60 * 60 * 1000;

        let existing = await db.redeemCode.findUnique({ where: { code } });
        if (existing) {
            return conn.reply(m.chat, `Kode redeem "${code}" sudah ada! Gunakan kode yang berbeda.`, m);
        }
        
        await db.redeemCode.create({
            data: {
                code,
                creator: m.sender,
                since: BigInt(Date.now()),
                reward: { money, exp, limit, saldo },
                claim: [],
                expired: BigInt(expiredAt),
                limituser,
                forWho: tagUser,
                blocked: []
            }
        });

        let ownerMessage = `Kode redeem baru telah dibuat:\n- Creator: @${m.sender.split('@')[0]}\n- Kode: ${code}\n- Status: ${isPublic ? 'Public' : 'Private'} Code\n- Hadiah:\n  - Money: ${money}\n  - Exp: ${exp}\n  - Limit: ${limit}\n  - Saldo: ${saldo}\n- Masa Berlaku: ${expired} hari\n- Batas Pengguna: ${limituser} orang`;
       
        await global.conn.sendMessage('120363368633822650@g.us', { text: ownerMessage, mentions: [m.sender] });
        await delay(500);
        
        conn.reply(m.chat, `Kode redeem "${code}" *(${isPublic ? 'Public' : 'Private'})* berhasil dibuat dengan hadiah:\n- Money: ${money}\n- Exp: ${exp}\n- Limit: ${limit}\n- Saldo: ${saldo}\n\nKedaluwarsa: ${expired} hari\nBatas pengguna: ${limituser} orang`, m);
        
        if (tagUser.length > 0) {
            let expiredDate = new Date(expiredAt).toLocaleString();
            for (let user of tagUser) {
                await conn.sendMessage(user, { text: `📢 Kamu telah ditambahkan sebagai penerima kode redeem *${code}*.\nBerlaku sampai: ${expiredDate}`, mentions: [m.sender] });
            }
            return;
        }
   
        await delay(500);
        let teks = `*KODE REDEEM BARU!*\n*\`${code}\`*\n\n- Kadaluarsa: ${expired} hari\n- Batas Pengguna: ${limituser} orang\nCara penggunaan:\nKetik #redeem ${code}\n\n*Bantu kami untuk mengembangkan komunitas HuTao BOT dengan cara sawer kami di https://saweria.co/hutaobot*\n> _KODE REDEEM BARU HANYA DIBAGIKAN DI CHANNEL INI_\n> This message was sent automatically using a bot`;
        
        // --- BYPASS ERROR BAILEYS, MENGGUNAKAN CARA SIMPLE ---
        await global.conn.sendMessage('120363373141583166@newsletter', {
            text: teks,
            contextInfo: {
                externalAdReply: {
                    title: 'KODE REDEEM BARU!',
                    body: 'HuTao BOT Official',
                    thumbnailUrl: 'https://i0.wp.com/i.ibb.co.com/9t5dkSZ/Screenshot-2025-01-03-14-42-53-66-7352322957d4404136654ef4adb64504.jpg',
                    sourceUrl: 'https://saweria.co/hutaobot',
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        });
    }

    if (command === 'redeem') {
        let code = text;
        if (!code) return conn.reply(m.chat, `Gunakan perintah: ${usedPrefix + command} <kode>`, m);
        
        let redeem = await db.redeemCode.findUnique({ where: { code } });
        if (!redeem) return conn.reply(m.chat, 'Kode redeem ini mungkin tidak terdaftar atau sudah dihapus.', m);

        let claimStr = parseJSON(redeem.claim) || [];
        let blockedStr = parseJSON(redeem.blocked) || [];
        let forWhoStr = parseJSON(redeem.forWho) || [];
        let rewardNum = parseJSON(redeem.reward) || {};

        if (Date.now() > Number(redeem.expired)) {
            return conn.reply(m.chat, 'Kode redeem ini sudah kadaluarsa.', m);
        }
       
        if (redeem.creator === m.sender) return conn.reply(m.chat, 'Pembuat kode dilarang claim kode redeem buatan sendiri!', m);
        if (claimStr.includes(m.sender)) return conn.reply(m.chat, 'Kamu sudah menggunakan kode redeem ini sebelumnya.', m);
        if (blockedStr.includes(m.sender)) return conn.reply(m.chat, 'Kamu telah diblokir dari menggunakan kode ini.', m);
        
        if (forWhoStr.length > 0 && !forWhoStr.includes(m.sender)) {
            return conn.reply(m.chat, 'Kamu tidak termasuk dalam daftar penerima kode ini.', m);
        }

        if (claimStr.length >= redeem.limituser) {
            return conn.reply(m.chat, 'Kode redeem ini sudah mencapai batas kuota pengguna.', m);
        }
        
        let userSql = await getUser(m.sender);
        if (!userSql) return m.reply("Data kamu tidak ada di database.");

        let reward = rewardNum;
        
        // --- FIX SQL: PISAH TABEL USER DAN ECONOMY ---
        await updateUser(m.sender, {
            exp: (Number(userSql.exp) || 0) + (reward.exp || 0),
            limit: (Number(userSql.limit) || 0) + (reward.limit || 0)
        });

        await updateEconomy(m.sender, {
            money: (Number(userSql.economy?.money || userSql.money) || 0) + (reward.money || 0),
            saldo: (Number(userSql.economy?.saldo || userSql.saldo) || 0) + (reward.saldo || 0)
        });
        // ---------------------------------------------

        claimStr.push(m.sender);
        forWhoStr = forWhoStr.filter(u => u !== m.sender);
        
        await db.redeemCode.update({
            where: { code },
            data: { claim: claimStr, forWho: forWhoStr }
        });

        return conn.reply(m.chat, `🎉 Berhasil menukarkan kode redeem\n*${code}*\n\nHadiah yang kamu dapatkan:\n- Money: ${reward.money || 0}\n- Exp: ${reward.exp || 0}\n- Limit: ${reward.limit || 0}\n- Saldo: ${reward.saldo || 0}`, m);
    }

    if (command === 'addclaim') {
        let [code, newUsersRaw] = text.split('|');
        let redeem = await db.redeemCode.findUnique({ where: { code } });
        if (!redeem) return conn.reply(m.chat, 'Kode tidak ditemukan.', m);
        
        let forWhoStr = parseJSON(redeem.forWho) || [];
        let claimStr = parseJSON(redeem.claim) || [];

        if (redeem.creator !== m.sender) return conn.reply(m.chat, 'Hanya pembuat kode yang bisa menambah penerima.', m);
        if (Date.now() > Number(redeem.expired)) throw 'Kode tersebut sudah expired';
        if (!newUsersRaw) throw 'Tag salah satu user atau masukkan ID grup';

        let newUsers = [];
        let isGroup = /@g\.us$/.test(newUsersRaw.trim());

        if (isGroup) {
            try {
                let groupMeta = await conn.groupMeta(newUsersRaw.trim());
                newUsers = groupMeta.participants.map(p => p.id).filter(id => id !== conn.user.jid);
            } catch (e) {
                return conn.reply(m.chat, 'Gagal mengambil data grup. Pastikan bot ada di grup tersebut.', m);
            }
        } else {
            newUsers = m.mentionedJid.length > 0 ? m.mentionedJid : conn.parseMention(text);
        }

        let alreadyInForWho = [];
        let alreadyClaimed = [];
        let toAdd = [];

        for (let u of newUsers) {
            if (claimStr.includes(u)) alreadyClaimed.push(u);
            else if (forWhoStr.includes(u)) alreadyInForWho.push(u);
            else toAdd.push(u);
        }

        if (toAdd.length === 0) throw 'Tidak ditemukan pengguna yang valid (semua sudah terdaftar/klaim).';
        forWhoStr.push(...toAdd);
        
        await db.redeemCode.update({
            where: { code },
            data: { forWho: forWhoStr }
        });

        let addedMentions = toAdd.map(u => '@' + u.split('@')[0]);
        let replyMsg = addedMentions.length > 0 ? `✅ Berhasil menambahkan ${addedMentions.join(', ')} ke daftar penerima kode *${code}*\n` : '';

        if (isGroup && toAdd.length > 0) {
            await conn.sendMessage(newUsersRaw.trim(), { text: `📢 Kalian semua telah ditambahkan sebagai penerima kode redeem *${code}*`, mentions: toAdd }, { quoted: m });
        } else {
            for (let user of toAdd) {
                await conn.sendMessage(user, { text: `📢 Kamu telah ditambahkan sebagai penerima kode redeem *${code}*.`, mentions: [m.sender] });
            }
        }

        await conn.reply(m.chat, replyMsg.trim() || 'Semua user sudah terdaftar/klaim.', m, { mentions: [...toAdd, ...alreadyInForWho, ...alreadyClaimed] });
    }

    if (command === 'delclaim') {
        let [code, removeUsersText] = text.split('|');
        let redeem = await db.redeemCode.findUnique({ where: { code } });
        if (!redeem) return conn.reply(m.chat, '❌ Kode tidak ditemukan.', m);
        let forWhoStr = parseJSON(redeem.forWho) || [];
        if (redeem.creator !== m.sender) return conn.reply(m.chat, '❌ Hanya pembuat kode yang bisa menghapus penerima.', m);

        let removeUsers = m.mentionedJid.length > 0 ? m.mentionedJid : conn.parseMention(text);
        if (removeUsers.length === 0) throw 'Tag salah satu user dulu!';

        let removed = [];
        for (let user of removeUsers) {
            if (forWhoStr.includes(user)) {
                forWhoStr = forWhoStr.filter(u => u !== user);
                removed.push(user);
            }
        }
        
        await db.redeemCode.update({
            where: { code },
            data: { forWho: forWhoStr }
        });

        let removedMentions = removed.map(u => '@' + u.split('@')[0]);
        return conn.reply(m.chat, removedMentions.length > 0 ? `✅ Berhasil menghapus ${removedMentions.join(', ')} dari daftar penerima.` : '⚠️ User tidak terdaftar.', m, { mentions: removed });
    }

    if (command === 'delclaimed') {
        let [code, removeUsersText] = text.split('|');
        let redeem = await db.redeemCode.findUnique({ where: { code } });
        if (!redeem) return conn.reply(m.chat, '❌ Kode tidak ditemukan.', m);
        let claimStr = parseJSON(redeem.claim) || [];
        if (redeem.creator !== m.sender) return conn.reply(m.chat, '❌ Hanya pembuat kode yang bisa menghapus data klaim.', m);

        let removeUsers = m.mentionedJid.length > 0 ? m.mentionedJid : conn.parseMention(m.text);
        if (removeUsers.length === 0) throw 'Tag salah satu user dulu!';

        let removed = [];
        for (let user of removeUsers) {
            if (claimStr.includes(user)) {
                claimStr = claimStr.filter(u => u !== user);
                removed.push(user);
            }
        }

        await db.redeemCode.update({
            where: { code },
            data: { claim: claimStr }
        });

        let removedMentions = removed.map(u => '@' + u.split('@')[0]);
        return conn.reply(m.chat, removedMentions.length > 0 ? `✅ Berhasil menghapus ${removedMentions.join(', ')} dari daftar klaim.` : '⚠️ User belum klaim.', m, { mentions: removed });
    }

    if (command === 'blockclaim') {
        let [code, blockedUsersText] = text.split('|');
        let redeem = await db.redeemCode.findUnique({ where: { code } });
        if (!redeem) return conn.reply(m.chat, '❌ Kode tidak ditemukan.', m);
        let blockedStr = parseJSON(redeem.blocked) || [];
        if (redeem.creator !== m.sender) return conn.reply(m.chat, '❌ Hanya pembuat kode yang bisa memblokir user.', m);

        let blockedUsers = m.mentionedJid.length > 0 ? m.mentionedJid : conn.parseMention(m.text);
        if (blockedUsers.length === 0) throw 'Tag salah satu user dulu!';

        let newlyBlocked = [];
        for (let user of blockedUsers) {
            if (!blockedStr.includes(user)) {
                blockedStr.push(user);
                newlyBlocked.push(user);
            }
        }

        await db.redeemCode.update({
            where: { code },
            data: { blocked: blockedStr }
        });

        let addedMentions = newlyBlocked.map(u => '@' + u.split('@')[0]);
        return conn.reply(m.chat, addedMentions.length > 0 ? `🚫 User diblokir dari klaim kode *${code}*: ${addedMentions.join(', ')}\n` : '⚠️ Sudah diblokir sebelumnya.', m, { mentions: newlyBlocked });
    }

    if (command === 'delcode') {
        let code = text;
        let isOwner = global.owner.includes(m.sender.split('@')[0]);
        let redeem = await db.redeemCode.findUnique({ where: { code } });
        if (!redeem) return conn.reply(m.chat, 'Kode tidak ditemukan.', m);
        
        if (!isOwner && redeem.creator !== m.sender) return conn.reply(m.chat, 'Hanya pembuat kode yang bisa menghapus kode', m);
        
        let forWhoStr = parseJSON(redeem.forWho) || [];
        let claimStr = parseJSON(redeem.claim) || [];
        let rewardNum = parseJSON(redeem.reward) || {};

        if (forWhoStr.length > 0) {
            for (let user of forWhoStr) {
                await conn.delay(1500);
                await global.conn.sendText(user, `📢 Maaf kode redeem ${code} dihapus oleh pembuat redeem. Anda tidak dapat mengklaim kode tersebut.`);
            }
        }

        if (claimStr.length > 0) {
            for (let user of claimStr) {
                await conn.delay(1500);
                let targetUser = await getUser(user);
                
                if (targetUser) {
                    // --- FIX SQL: PISAH TABEL USER DAN ECONOMY ---
                    await updateUser(user, {
                        exp: Math.max(0, (Number(targetUser.exp) || 0) - (rewardNum.exp || 0)),
                        limit: Math.max(0, (Number(targetUser.limit) || 0) - (rewardNum.limit || 0))
                    });

                    await updateEconomy(user, {
                        money: Math.max(0, (Number(targetUser.economy?.money || targetUser.money) || 0) - (rewardNum.money || 0)),
                        saldo: Math.max(0, (Number(targetUser.economy?.saldo || targetUser.saldo) || 0) - (rewardNum.saldo || 0))
                    });
                    // ---------------------------------------------
                    
                    await global.conn.sendText(user, `📢 Maaf kode redeem ${code} dihapus oleh pembuat redeem. Hasil klaim anda telah ditarik ulang.`);
                }
            }
        }

        await db.redeemCode.delete({ where: { code } });

        return m.reply(`Berhasil menghapus kode *${code}* dan menarik semua klaim.`);
    }
};

handler.help = ['redeem', 'createredeem', 'addclaim', 'delcode', 'delclaim', 'delclaimed', 'blockclaim'];
handler.tags = ['redeem'];
handler.command = /^(createredeem|redeem|addclaim|delcode|delclaim|delclaimed|blockclaim)$/i;
handler.register = true;

module.exports = handler;
