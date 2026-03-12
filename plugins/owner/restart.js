const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

module.exports = {
    command: ['restart'],
    help: 'restart',
    desc: 'Restart bot, bersihkan require cache, tmp, dan hapus session selain creds.json.',
    owner: true,
    handler: async ({ conn, m }) => {
        await m.reply('Merestart bot dan membersihkan cache...')

        // 1. Refresh require cache
        Object.keys(require.cache).forEach(key => delete require.cache[key])

        // 2. Clear tmp folder
        const tmpDir = path.join(process.cwd(), 'tmp')
        if (fs.existsSync(tmpDir)) {
            const files = fs.readdirSync(tmpDir)
            for (const file of files) {
                const filePath = path.join(tmpDir, file)
                try {
                    if (fs.lstatSync(filePath).isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true })
                    } else {
                        fs.unlinkSync(filePath)
                    }
                } catch (e) {
                    console.error('[RESTART] Error deleting tmp file:', e)
                }
            }
        } else {
            fs.mkdirSync(tmpDir, { recursive: true })
        }

        // 3. Clear sessions folder except creds.json
        /* const sessionDir = path.join(process.cwd(), 'sessions')
         if (fs.existsSync(sessionDir)) {
             const files = fs.readdirSync(sessionDir)
             for (const file of files) {
                 if (file !== 'creds.json') {
                     const filePath = path.join(sessionDir, file)
                     try {
                         if (fs.lstatSync(filePath).isDirectory()) {
                             fs.rmSync(filePath, { recursive: true, force: true })
                         } else {
                             fs.unlinkSync(filePath)
                         }
                     } catch (e) {
                         console.error('[RESTART] Error deleting session file:', e)
                     }
                 }
             }
         } */

        // 4. Restart bot
        setTimeout(() => {
            if (process.send) {
                process.send('restart')
            } else {
                process.exit(0)
            }
        }, 1000)
    }
}
