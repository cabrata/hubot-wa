const schedule = require('node-schedule')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { db } = require('../../lib/database')
const { generateGempaVideo } = require('../../lib/gempaCanvas')

let handler = m => m

// Store last earthquake timestamp to prevent duplicate sends
const lastGempaFile = path.join(__dirname, '../../tmp/last_gempa.txt')

schedule.scheduleJob('*/2 * * * *', async () => {
    if (!global.conn) return;

    try {
        const response = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json')
        const data = response.data?.Infogempa?.gempa
        if (!data) return

        let lastGempa = ''
        if (fs.existsSync(lastGempaFile)) {
            lastGempa = fs.readFileSync(lastGempaFile, 'utf8').trim()
        }

        if (data.DateTime !== lastGempa) {
            // New earthquake detected
            console.log(`[AutoGempa] New earthquake detected at ${data.DateTime}`)

            // Get groups with warngempa enabled
            const subscribedChats = await db.chat.findMany({
                where: { warngempa: true }
            });

            if (subscribedChats.length > 0) {
                // Generate Canvas
                console.log(`[AutoGempa] Generating canvas video...`)
                const buffer = await generateGempaVideo(data)

                const caption = `*INFO GEMPA BUMI (BMKG)*\n\n` +
                    `📅 *Tanggal:* ${data.Tanggal}\n` +
                    `⏰ *Waktu:* ${data.Jam}\n` +
                    `📍 *Lokasi:* ${data.Lintang}, ${data.Bujur}\n` +
                    `🎚️ *Magnitudo:* ${data.Magnitude}\n` +
                    `🌊 *Kedalaman:* ${data.Kedalaman}\n` +
                    `🗺️ *Wilayah:* ${data.Wilayah}\n` +
                    `⚠️ *Potensi:* ${data.Potensi}\n` +
                    `📌 *Dirasakan:* ${data.Dirasakan || '-'}`

                console.log(`[AutoGempa] Sending to ${subscribedChats.length} groups...`)
                
                for (let chat of subscribedChats) {
                    try {
                        await global.conn.sendMessage(chat.chatId, {
                            video: buffer,
                            gifPlayback: true,
                            caption: caption
                        })
                        // Add some delay to prevent spam
                        await new Promise(resolve => setTimeout(resolve, 3000))
                    } catch (e) {
                        console.error(`[AutoGempa] Failed to send to ${chat.chatId}`, e)
                    }
                }
            }

            // Save last gempa after broadcasting
            fs.writeFileSync(lastGempaFile, data.DateTime)
        }
    } catch (e) {
        console.error('[AutoGempa] Error fetching or processing BMKG data:', e)
    }
})

module.exports = handler
