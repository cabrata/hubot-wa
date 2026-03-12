//rpg-mancing
const { getUser, updateCooldown, updateJob, getTool, setTool, addInventory } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix }) => {
    let user = await getUser(m.sender);
    if (!user) return;
    
    let lastmancing = Number(user.lastmancing || 0);
    let timeDiff = Date.now() - lastmancing;
    let remainingTime = 180000 - timeDiff; 
    
    let fishingrod = await getTool(m.sender, 'fishingrod');
    
    if (!fishingrod) {
        return conn.reply(m.chat, '[❗] Kamu gak punya pancingan! Bikin dulu di craft 🎣', m);
    }
    
    if (timeDiff >= 180000) {
        let ikan = Math.floor(Math.random() * 4);
        let lele = Math.floor(Math.random() * 5);
        let nila = Math.floor(Math.random() * 6);
        let bawal = Math.floor(Math.random() * 11);
        let udang = Math.floor(Math.random() * 8);
        let kepiting = Math.floor(Math.random() * 6);
        let paus = Math.floor(Math.random() * 2);
        
        let totalCatch = nila + bawal + ikan + lele + udang + kepiting + paus;
        
        let mcng = `•  *Hasil Mancing:*
        
◦  🐟 Ikan nila: ${nila}
◦  🐡 Bawal: ${bawal}
◦  🐟 Lele: ${lele}
◦  🐟 Ikan: ${ikan}
◦  🦐 Udang: ${udang}
◦  🦀 Kepiting: ${kepiting}
◦  🐋 Paus: ${paus}`.trim()
        
        setTimeout(() => { conn.reply(m.chat, mcng, m) }, 38000);
        setTimeout(() => { conn.reply(m.chat, `Tunggu bentar...`, m) }, 28000);
        setTimeout(() => { conn.reply(m.chat, `Tarik pancingannya!`, m) }, 18000);
        setTimeout(() => { conn.reply(m.chat, `Pancingan ditarik oleh ikan...`, m) }, 8000);
        setTimeout(() => { conn.reply(m.chat, `Melempar umpan 🎣...`, m) }, 0);
        
        // Simpan Hasil ke Database
        if (nila) await addInventory(m.sender, 'nila', nila);
        if (ikan) await addInventory(m.sender, 'ikan', ikan);
        if (lele) await addInventory(m.sender, 'lele', lele);
        if (bawal) await addInventory(m.sender, 'bawal', bawal);
        if (udang) await addInventory(m.sender, 'udang', udang);
        if (paus) await addInventory(m.sender, 'paus', paus);
        if (kepiting) await addInventory(m.sender, 'kepiting', kepiting);
        
        await updateJob(m.sender, { totalPancingan: (user.totalPancingan || 0) + totalCatch });
        await updateCooldown(m.sender, { lastmancing: Date.now() });
        
        // Kurangi Durability Pancingan
        let newDura = (fishingrod.durability || 40) - 1;
        if (newDura <= 0) {
            await setTool(m.sender, 'fishingrod', null);
            setTimeout(() => { conn.reply(m.chat, '⚠️ Pancinganmu hancur!', m) }, 39000);
        } else {
            await setTool(m.sender, 'fishingrod', { durability: newDura });
        }
    } else {
        let m_time = Math.floor(remainingTime / 60000) % 60;
        let s_time = Math.floor(remainingTime / 1000) % 60;
        conn.reply(m.chat, `Kamu baru mancing, tunggu selama ${m_time} menit ${s_time} detik`, m);
    }
}
handler.help = ['mancing']
handler.tags = ['rpg']
handler.command = /^(mancing)$/i
module.exports = handler