//rpg-betpv_and
const { getUser, updateEconomy } = require('../../lib/database');
const delay = (time) => new Promise((res) => setTimeout(res, time));

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

module.exports.before = async function (m) {
    this.judipvp = this.judipvp ? this.judipvp : {};
    let room = Object.values(this.judipvp).find(room => room.id.startsWith('judipvp') && room.status && [room.p, room.p2].includes(m.sender));
    
    let score = Math.ceil(Math.random() * 100) * 1;
    let score2 = Math.ceil(Math.random() * 100) * 1;

    if (room) {
        let user1 = await getUser(room.p);
        let user2 = await getUser(room.p2);

        if (m.sender === room.p2 && /y(a|es)?/i.test(m.text.toLowerCase()) && m.isGroup && room.status === 'wait') {
            if (/n(o)?|tidak/i.test(m.text.toLowerCase())) {
                this.reply(m.chat, `@${room.p2.split`@`[0]} menolak judipvp, judipvp dibatalkan`, m, { contextInfo: { mentionedJid: [room.p2] } });
                delete this.judipvp[room.id];
                return true;
            }
            if ((user2[room.type] || 0) < room.taruhan) return m.reply(`Uang Kamu Kurang! Kamu membutuhkan ${room.taruhan} ${room.type}`);
            if ((user1[room.type] || 0) < room.taruhan) return m.reply(`Uang Lawanmu Kurang! membutuhkan ${room.taruhan} ${room.type}`);
            
            clearTimeout(room.waktu);
            room.status = 'spin';
            room.asal = m.chat;
            room.spin = room.p;
            await this.reply(room.asal, `Silahkan Spin @${room.p.split('@')[0]}\n\nSpin dengan cara ketik *Spin/Judi*`, m, { contextInfo: { mentionedJid: [room.p] } });
            
            room.waktu = setTimeout(async () => {
                this.reply(m.chat, `Waktu habis @${room.spin.split('@')[0]} Tidak menjawab`, m, { contextInfo: { mentionedJid: [room.spin] } });
                delete this.judipvp[room.id];
            }, 60000);

        } else if (room.status === 'spin' && /spin|judi/i.test(m.text)) {
            if (m.sender !== room.spin) return m.reply('Sekarang bukan giliran kamu');
            if ((user1[room.type] || 0) < room.taruhan) return m.reply(`Uang Kamu Kurang! Kamu membutuhkan ${room.taruhan} ${room.type}`);
            if ((user2[room.type] || 0) < room.taruhan) return m.reply(`Uang Lawanmu Kurang! membutuhkan ${room.taruhan} ${room.type}`);
            
            clearTimeout(room.waktu);
            room.score = score;
            room.status = 'spinp';
            room.spin = room.p2;
            
            room.waktu = setTimeout(async () => {
                let pemenang = room.p === room.spin ? room.p2 : room.p;
                let yangGagal = room.spin;
                
                let freshPemenang = await getUser(pemenang);
                let freshGagal = await getUser(yangGagal);

                if (freshPemenang && freshGagal) {
                    await updateEconomy(yangGagal, { [room.type]: freshGagal[room.type] - room.taruhan });
                    await updateEconomy(pemenang, { [room.type]: freshPemenang[room.type] + room.taruhan });
                }

                this.reply(m.chat, `Waktu habis! @${yangGagal.split('@')[0]} tidak menjawab\n\n@${pemenang.split('@')[0]} otomatis menang dan mendapatkan ${room.taruhan} ${room.type}`, m, {
                    contextInfo: { mentionedJid: [pemenang, yangGagal] }
                });
                delete this.judipvp[room.id];
            }, 60000);

            this.reply(room.asal, `@${m.sender.split('@')[0]} Berhasil mendapatkan score ${score}\nSekarang giliran @${room.p2.split('@')[0]} untuk spin\n\nSilahkan ketik *Spin/Judi* Untuk spin`, m, { contextInfo: { mentionedJid: [room.p, room.p2] } });

        } else if (room.status === 'spinp' && /spin|judi/i.test(m.text)) {
            if (m.sender !== room.spin) return m.reply(room.asal, 'Sekarang bukan giliranmu!', m);
            if ((user2[room.type] || 0) < room.taruhan) return m.reply(`Uang Kamu Kurang! Kamu membutuhkan ${room.taruhan} ${room.type}`);
            if ((user1[room.type] || 0) < room.taruhan) return m.reply(`Uang Lawanmu Kurang! membutuhkan ${room.taruhan} ${room.type}`);
            
            clearTimeout(room.waktu);
            
            if (room.score < score2) {
                await updateEconomy(room.p2, { [room.type]: user2[room.type] + room.taruhan });
                await updateEconomy(room.p, { [room.type]: user1[room.type] - room.taruhan });
                room.win = room.p2;
            } else if (room.score > score2) {
                await updateEconomy(room.p2, { [room.type]: user2[room.type] - room.taruhan });
                await updateEconomy(room.p, { [room.type]: user1[room.type] + room.taruhan });
                room.win = room.p;
            } else {
                room.win = 'draw';
            }
            
            this.reply(room.asal, `
| *PLAYERS* | *POINT* |
*👤 @${room.p.split('@')[0]} :* ${room.score}
*👤 @${room.p2.split('@')[0]} :* ${score2}

${room.win !== 'draw' ? `Pemenangnya adalah @${room.win.split('@')[0]} Dan mendapatkan ${room.taruhan} ${room.type}` : `Draw Masing Masing Mendapatkan ${room.taruhan} ${room.type}`}
`.trim(), m, { contextInfo: { mentionedJid: [room.p, room.p2] } });
            
            delete this.judipvp[room.id];
        }
        return true;
    }
    return true;
};