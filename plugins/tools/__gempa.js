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
            // New earthquake detected - SAVE IMMEDIATELY to prevent duplicate sends from overlapping crons
            console.log(`[AutoGempa] New earthquake detected at ${data.DateTime}`)
            fs.writeFileSync(lastGempaFile, data.DateTime)

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
                        let sent = false;

                        // Try sending with the main bot first
                        if (global.conn) {
                            try {
                                await global.conn.sendMessage(chat.chatId, {
                                    video: buffer,
                                    gifPlayback: true,
                                    caption: caption
                                });
                                sent = true;
                            } catch (e) {
                                // If main bot is not in the group, we will try jadibots
                            }
                        }

                        // If the main bot couldn't send (e.g., it's a Jadibot's group and main bot isn't inside)
                        // Then fallback to finding a connection that can send it
                        if (!sent && global.conns && global.conns.length > 0) {
                            for (const subConn of global.conns) {
                                try {
                                    await subConn.sendMessage(chat.chatId, {
                                        video: buffer,
                                        gifPlayback: true,
                                        caption: caption
                                    });
                                    sent = true;
                                    break; // Stop after first successful send
                                } catch (e) {
                                    // Connection not in group, try the next one
                                }
                            }
                        }

                        if (!sent) {
                            console.error(`[AutoGempa] Failed to send to ${chat.chatId}: No suitable connection found`);
                        }

                        // Add some delay to prevent spam
                        await new Promise(resolve => setTimeout(resolve, 3000))
                    } catch (e) {
                        console.error(`[AutoGempa] Error while processing chat ${chat.chatId}`, e)
                    }
                }
            }
        }
    } catch (e) {
        console.error('[AutoGempa] Error fetching or processing BMKG data:', e)
    }
})

module.exports = handler
