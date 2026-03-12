const fs = require('fs')
const path = require('path')
const syntaxError = require('syntax-error')

let handler = async (m, { conn }) => {
    let pluginsDir = path.join(__dirname, '..')
    let categories = fs.readdirSync(pluginsDir).filter(f => fs.statSync(path.join(pluginsDir, f)).isDirectory())

    let total = 0
    let success = 0
    let errSyntax = []
    let errRequire = []

    await m.reply('🔍 *Memeriksa semua plugin untuk mencari error...*\nMohon tunggu sebentar.')

    for (let category of categories) {
        let categoryDir = path.join(pluginsDir, category)
        let files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.js'))

        for (let file of files) {
            total++
            let pluginPath = path.join(categoryDir, file)
            let pluginKey = `${category}/${file}`

            try {
                // Cek syntax
                let code = fs.readFileSync(pluginPath, 'utf-8')
                let syntaxErr = syntaxError(code, pluginPath)

                if (syntaxErr) {
                    errSyntax.push({ file: pluginKey, err: syntaxErr.toString() })
                    continue
                }

                // Cek logis / runtime dengan try catch require
                const resolved = require.resolve(pluginPath)
                if (resolved in require.cache) delete require.cache[resolved]
                require(pluginPath)
                success++
            } catch (e) {
                errRequire.push({ file: pluginKey, err: e.stack ? e.stack : e.message })
            }
        }
    }

    let result = `📊 *HASIL CEK PLUGIN*\n\n`
    result += `Total Plugin: ${total}\n`
    result += `Sukses: ${success}\n`
    result += `Error Syntax: ${errSyntax.length}\n`
    result += `Error Require: ${errRequire.length}\n\n`

    if (errSyntax.length > 0) {
        result += `*⚠️ ERROR SYNTAX:*\n`
        errSyntax.forEach(e => {
            result += `*- ${e.file}*\n${e.err}\n`
        })
        result += '\n'
    }

    if (errRequire.length > 0) {
        result += `*⚠️ ERROR REQUIRE:*\n`
        errRequire.forEach(e => {
            result += `*- ${e.file}*\n${e.err}\n\n`
        })
        result += '\n'
    }

    if (errSyntax.length === 0 && errRequire.length === 0) {
        result += `*✅ Semua plugin aman, tidak ada error yang terdeteksi!*`
    }

    m.reply(result.trim())
}

handler.help = ['cekplugin', 'checkplugin', 'cekplugins']
handler.tags = ['owner']
handler.command = /^(cekplugin|checkplugin|cekplugins|checkplugins)$/i
handler.owner = true

module.exports = handler
