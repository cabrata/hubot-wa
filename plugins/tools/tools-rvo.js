let handler = async (m, { conn }) => {
    if (!m.quoted) return m.reply('🚩 Reply media viewonce-nya!');
    
    try {
        let q = m.quoted;
        // Akalin object pesannya: paksa viewOnce jadi false
        q.message[q.mtype].viewOnce = false;
        
        // Langsung forward pesan yang udah dimanipulasi
        await conn.sendMessage(m.chat, { forward: q }, { quoted: m });
    } catch (e) {
        m.reply('❌ Gagal, pastikan yang di-reply beneran view once.');
    }
}

handler.help = ['rvo']
handler.tags = ['tools']
handler.command = ['readviewonce', 'read', 'ver', 'rvo'] 

module.exports = handler
