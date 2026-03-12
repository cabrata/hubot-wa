const SpotifyWebApi = require('spotify-web-api-node')
// const ytDlp = require('yt-dlp-exec')
const fs = require('fs')
const path = require('path')
let ytdlpPath = path.join(__dirname, '../../yt-dlp')

module.exports = {
    name: 'spotify',
    command: ['spotify', 'spoti'],
    category: 'main',
    premium: true,
    desc: 'Download lagu dari Spotify lengkap dengan lirik (Max 15 menit) (Premium Only)',

    async handler({ m, args, conn, usedPrefix, command }) {
        if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
            return m.reply(`❌ Fitur Spotify belum dikonfigurasi.\n\n_Note untuk Owner: Silakan isi SPOTIFY_CLIENT_ID dan SPOTIFY_CLIENT_SECRET di file .env_\nDapatkan dari https://developer.spotify.com/dashboard`)
        }

        let query = args.join(' ')
        if (!query) {
            return m.reply(`*Format Salah!*\n\nContoh penggunaan:\n${usedPrefix}${command} lesti kejora\n${usedPrefix}${command} https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT`)
        }

        await m.react('⏳')
        let msg = await m.reply('🔍 Sedang mencari informasi lagu di Spotify...')

        try {
            // Setup Spotify API
            const spotifyApi = new SpotifyWebApi({
                clientId: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET
            })

            // Get access token via client credentials flow
            const data = await spotifyApi.clientCredentialsGrant()
            spotifyApi.setAccessToken(data.body['access_token'])

            let trackInfo = {}

            // Check if it's a Spotify link
            const spotifyRegex = /spotify\.com\/track\/([a-zA-Z0-9]+)/i
            const isLink = spotifyRegex.test(query)

            if (isLink) {
                const trackId = query.match(spotifyRegex)[1]
                const trackData = await spotifyApi.getTrack(trackId)
                const t = trackData.body
                trackInfo = {
                    title: t.name,
                    artist: t.artists.map(a => a.name).join(', '),
                    album: t.album.name,
                    durationMs: t.duration_ms,
                    cover: t.album.images.length > 0 ? t.album.images[0].url : null,
                    url: t.external_urls.spotify
                }
            } else {
                // Search by query
                const searchData = await spotifyApi.searchTracks(query, { limit: 1 })
                if (!searchData.body.tracks || searchData.body.tracks.items.length === 0) {
                    return conn.sendMessage(m.chat, { text: '❌ Lagu tidak ditemukan di Spotify!', edit: msg.key })
                }
                const t = searchData.body.tracks.items[0]
                trackInfo = {
                    title: t.name,
                    artist: t.artists.map(a => a.name).join(', '),
                    album: t.album.name,
                    durationMs: t.duration_ms,
                    cover: t.album.images.length > 0 ? t.album.images[0].url : null,
                    url: t.external_urls.spotify
                }
            }

            // Duration check (max 15 minutes)
            let durationSeconds = Math.floor(trackInfo.durationMs / 1000)
            if (durationSeconds > 900) {
                return conn.sendMessage(m.chat, { text: '❌ Durasi lagu terlalu panjang! Maksimal 15 menit.', edit: msg.key })
            }

            // Format duration string
            let dMin = Math.floor(durationSeconds / 60)
            let dSec = durationSeconds % 60
            let durationStr = `${dMin}:${dSec < 10 ? '0' : ''}${dSec}`

            let captionInfo = `🎵 *SPOTIFY DOWNLOADER* 🎵\n\n`
            captionInfo += `📌 *Judul:* ${trackInfo.title}\n`
            captionInfo += `🎤 *Artis:* ${trackInfo.artist}\n`
            captionInfo += `💿 *Album:* ${trackInfo.album}\n`
            captionInfo += `⏱️ *Durasi:* ${durationStr}\n`
            captionInfo += `🔗 *Link Spotify:* ${trackInfo.url}\n\n`
            captionInfo += `_⏳ Sedang mendownload audio resolusi tinggi dari YouTube Music..._\n_⚠️ Proses ini mungkin memakan waktu beberapa saat tergantung ukuran file._`

            // Send track info with cover image
            let currentMsg
            if (trackInfo.cover) {
                currentMsg = await conn.sendMessage(m.chat, { image: { url: trackInfo.cover }, caption: captionInfo }, { quoted: m })
            } else {
                currentMsg = await conn.sendMessage(m.chat, { text: captionInfo, edit: msg.key })
            }

            // Search using yt-search to find the YouTube video
            const yts = require('yt-search')
            let searchStr = `${trackInfo.title} ${trackInfo.artist} audio`
            let searchResults = await yts(searchStr)

            if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
                return conn.sendMessage(m.chat, { text: '❌ Video YouTube untuk lagu ini tidak ditemukan.', edit: currentMsg.key })
            }

            let videoUrl = searchResults.videos[0].url

            // Setup temp file path
            let tempFileName = `spotify_${m.sender.split('@')[0]}_${Date.now()}`
            let tempDir = path.join(process.cwd(), 'tmp')
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
            let audioPath = path.join(tempDir, `${tempFileName}.mp3`)

            try {
                // Run local yt-dlp to extract best audio
                const { spawn } = require('child_process')

                await new Promise((resolve, reject) => {
                    const ytDlpProcess = spawn(ytdlpPath, [
                        videoUrl,
                        '--extract-audio',
                        '--audio-format', 'mp3',
                        '--audio-quality', '0',
                        '--output', path.join(tempDir, `${tempFileName}.EXT`),
                        '--no-check-certificates',
                        '--no-warnings',
                        '--add-header', 'referer:youtube.com',
                        '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
                    ])

                    ytDlpProcess.on('close', (code) => {
                        if (code === 0) resolve()
                        else reject(new Error(`yt-dlp exited with code ${code}`))
                    })

                    ytDlpProcess.on('error', (err) => {
                        reject(err)
                    })
                })

                // Cek ekstensi file yang dihasilkan (kadang m4a atau ogg, yt-dlp otomatis rename jika kita suruh extract audio k mp3, tp jaga2)
                let finalAudioPath = audioPath

                if (!fs.existsSync(finalAudioPath)) {
                    // Coba cari file lain dengan prefix tersebut di tmp
                    let files = fs.readdirSync(tempDir)
                    let downloadedFile = files.find(f => f.startsWith(tempFileName))
                    if (downloadedFile) {
                        finalAudioPath = path.join(tempDir, downloadedFile)
                    } else {
                        throw new Error('File audio tidak ditemukan setelah download')
                    }
                }

                // Send audio
                await conn.sendMessage(m.chat, {
                    audio: fs.readFileSync(finalAudioPath),
                    mimetype: 'audio/mp4', // WhatsApp uses audio/mp4 or ogg typically, mp3 works too
                    ptt: false, // Send as document/audio file, not a voice note
                    contextInfo: {
                        externalAdReply: {
                            title: trackInfo.title,
                            body: trackInfo.artist,
                            mediaType: 1,
                            thumbnailUrl: trackInfo.cover,
                            sourceUrl: trackInfo.url,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: currentMsg || m })

                // Hapus file temporary
                if (fs.existsSync(finalAudioPath)) fs.unlinkSync(finalAudioPath)

                await m.react('✅')

            } catch (dlptError) {
                console.error("YT-DLP Error:", dlptError)
                m.reply('❌ Gagal mendownload audio dari YouTube Music. Pastikan package python dan yt-dlp sudah terinstall di server.')
            }

        } catch (e) {
            console.error('Spotify Error:', e)
            m.reply(`❌ Terjadi kesalahan saat memproses permintaan Spotify.\n\n*Error Detail:* ${e.message || e}`)
        }
    }
}
