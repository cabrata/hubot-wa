let handler = async (m, { conn, args, command }) => {
    let type = command.toLowerCase()
    
    // 🔥 FIX: BIKIN WADAHNYA DULU KALO BELUM ADA BIAR GA ERROR
    if (!global.opts) {
        global.opts = {}
    }

    // ----- LOGIC GCONLY -----
    if (type == 'gconly') {
        // Cek argumen (on/off/enable/disable)
        let isEnable = args[0] === 'on' || args[0] === 'enable' || args[0] === '1' || args[0] === 'true'
        let isDisable = args[0] === 'off' || args[0] === 'disable' || args[0] === '0' || args[0] === 'false'

        if (isEnable) {
            global.opts['gconly'] = true
            global.opts['pconly'] = false // Matikan pconly otomatis biar ga tabrakan
            m.reply('✅ Mode *Group Only* berhasil diaktifkan.\n(Bot hanya merespon di Grup)')
        } else if (isDisable) {
            global.opts['gconly'] = false
            m.reply('❌ Mode *Group Only* berhasil dinonaktifkan.')
        } else {
            // Toggle otomatis jika tidak ketik on/off
            global.opts['gconly'] = !global.opts['gconly']
            if (global.opts['gconly']) global.opts['pconly'] = false
            m.reply(`Mode *Group Only* sekarang: ${global.opts['gconly'] ? '✅ AKTIF' : '❌ NONAKTIF'}`)
        }
    } 
    
    // ----- LOGIC PCONLY -----
    else if (type == 'pconly') {
        let isEnable = args[0] === 'on' || args[0] === 'enable' || args[0] === '1' || args[0] === 'true'
        let isDisable = args[0] === 'off' || args[0] === 'disable' || args[0] === '0' || args[0] === 'false'

        if (isEnable) {
            global.opts['pconly'] = true
            global.opts['gconly'] = false // Matikan gconly otomatis biar ga tabrakan
            m.reply('✅ Mode *Private Only* berhasil diaktifkan.\n(Bot hanya merespon di Japri/PC)')
        } else if (isDisable) {
            global.opts['pconly'] = false
            m.reply('❌ Mode *Private Only* berhasil dinonaktifkan.')
        } else {
            // Toggle otomatis jika tidak ketik on/off
            global.opts['pconly'] = !global.opts['pconly']
            if (global.opts['pconly']) global.opts['gconly'] = false
            m.reply(`Mode *Private Only* sekarang: ${global.opts['pconly'] ? '✅ AKTIF' : '❌ NONAKTIF'}`)
        }
    }
}

handler.help = ['gconly', 'pconly']
handler.tags = ['owner']
handler.command = /^(gconly|pconly)$/i
handler.rowner = true // Hanya Owner Asli (Real Owner) yang bisa akses

module.exports = handler
