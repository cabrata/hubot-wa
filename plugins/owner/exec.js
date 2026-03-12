const cp = require('child_process')
const { promisify } = require('util')
const exec = promisify(cp.exec).bind(cp)

let handler = async (m, { conn, command, text }) => {
    let em = await m.reply('🔄 *Executing...*')
    let o
    try {
        o = await exec(command.trimStart() + ' ' + text.trimEnd())
    } catch (e) {
        o = e
    } finally {
        let { stdout, stderr } = o
        if (stdout && stdout.trim()) {
            await conn.edit(m.chat, `*bash*\n\n${stdout.trim()}`, em)
        } else if (stderr && stderr.trim()) {
            await conn.edit(m.chat, `*bash error*\n\n${stderr.trim()}`, em)
        } else {
            await conn.edit(m.chat, `_Command executed successfully (No Output)_`, em)
        }
    }
}

handler.help = ['$ <command>']
handler.tags = ['owner']
handler.customPrefix = /^[$] /
handler.command = new RegExp
handler.owner = true

module.exports = handler
