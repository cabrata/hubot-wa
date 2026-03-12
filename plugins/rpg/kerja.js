//rpg-kerja
const { getUser, updateEconomy, updateCooldown } = require('../../lib/database')

let handler = async (m, { conn, command, args, usedPrefix }) => {
    let type = (args[0] || '').toLowerCase()
    
    let user = await getUser(m.sender)
    if (!user) return

    let lastkerja = Number(user.lastkerja || 0)
    let time = lastkerja + 300000

    let penumpan = ['mas mas', 'bapak bapak', 'cewe sma', 'bocil epep', 'emak emak']
    let penumpang = penumpan[Math.floor(Math.random() * penumpan.length)]
    let daganga = ['wortel', 'sawi', 'selada', 'tomat', 'seledri', 'cabai', 'daging', 'ikan', 'ayam']
    let dagangan = daganga[Math.floor(Math.random() * daganga.length)]
    let pasie = ['sakit kepala', 'cedera', 'luka bakar', 'patah tulang']
    let pasien = pasie[Math.floor(Math.random() * pasie.length)]
    let pane = ['Wortel', 'Kubis', 'stowbery', 'teh', 'padi', 'jeruk', 'pisang', 'semangka', 'durian', 'rambutan']
    let panen = pane[Math.floor(Math.random() * pane.length)]
    let bengke = ['mobil', 'motor', 'becak', 'bajai', 'bus', 'angkot', 'becak', 'sepeda']
    let bengkel = bengke[Math.floor(Math.random() * bengke.length)]
    let ruma = ['Membangun Rumah', 'Membangun Gedung', 'Memperbaiki Rumah', 'Memperbaiki Gedung', 'Membangun Fasilitas Umum', 'Memperbaiki Fasilitas Umum']
    let rumah = ruma[Math.floor(Math.random() * ruma.length)]
    let pnjh = ['pencuri', 'pelanggar aturan lalu lintas', 'perampok bank', 'copet', 'koruptor']
    let pnjht = pnjh[Math.floor(Math.random() * pnjh.length)]
    
    if (/kerjadulu|kerja|work/i.test(command)) {
        switch (type) {
            case 'ojek':
                if (Date.now() - lastkerja < 300000) return m.reply(`Kamu sudah bekerja\nSaatnya istirahat selama ${clockString(time - Date.now())}`)
                let hasilojek = Math.floor(Math.random() * 5000000)
                await updateEconomy(m.sender, { money: (user.money || 0) + hasilojek })
                await updateCooldown(m.sender, { lastkerja: Date.now() })
                m.reply(`Kamu Sudah Mengantarkan *${penumpang}* 🚗\nDan mendapatkan uang senilai *Rp ${hasilojek} money*`)
                break
            case 'pedagang':
                if (Date.now() - lastkerja < 300000) return m.reply(`Kamu sudah bekerja,Saatnya istirahat selama\n🕜 ${clockString(time - Date.now())}`)
                let hasildagang = Math.floor(Math.random() * 5000000)
                await updateEconomy(m.sender, { money: (user.money || 0) + hasildagang })
                await updateCooldown(m.sender, { lastkerja: Date.now() })
                m.reply(`Ada pembeli yg membeli *${dagangan}* 🛒\nDan mendapatkan uang senilai *Rp ${hasildagang} money*`)
                break
            case 'dokter':
                if (Date.now() - lastkerja < 300000) return m.reply(`Kamu sudah bekerja,Saatnya istirahat selama\n🕜 ${clockString(time - Date.now())}`)
                let hasildokter = Math.floor(Math.random() * 5000000)
                await updateEconomy(m.sender, { money: (user.money || 0) + hasildokter })
                await updateCooldown(m.sender, { lastkerja: Date.now() })
                m.reply(`Kamu menyembuhkan pasien *${pasien}* 💉\nDan mendapatkan uang senilai *Rp ${hasildokter}* money`)
                break
            case 'petani':
                if (Date.now() - lastkerja < 300000) return m.reply(`Kamu sudah bekerja,Saatnya istirahat selama\n🕜 ${clockString(time - Date.now())}`)
                let hasiltani = Math.floor(Math.random() * 5000000)
                await updateEconomy(m.sender, { money: (user.money || 0) + hasiltani })
                await updateCooldown(m.sender, { lastkerja: Date.now() })
                m.reply(`${panen} Sudah Panen !🌽 Dan menjualnya 🧺\nDan mendapatkan uang senilai Rp *${hasiltani} money*`)
                break
            case 'montir':
                if (Date.now() - lastkerja < 300000) return m.reply(`Kamu sudah bekerja,Saatnya istirahat selama\n🕜 ${clockString(time - Date.now())}`)
                let hasilmontir = Math.floor(Math.random() * 5000000)
                await updateEconomy(m.sender, { money: (user.money || 0) + hasilmontir })
                await updateCooldown(m.sender, { lastkerja: Date.now() })
                m.reply(`Kamu Baru saja mendapatkan pelanggan dan memperbaiki *${bengkel} 🔧*\nDan kamu mendapatkan uang senilai *Rp ${hasilmontir}* money`)
                break
            case 'kuli':
                if (Date.now() - lastkerja < 300000) return m.reply(`Kamu sudah bekerja,Saatnya istirahat selama\n🕜 ${clockString(time - Date.now())}`)
                let hasilkuli = Math.floor(Math.random() * 5000000)
                await updateEconomy(m.sender, { money: (user.money || 0) + hasilkuli })
                await updateCooldown(m.sender, { lastkerja: Date.now() })
                m.reply(`Kamu baru saja selesai ${rumah} 🔨\nDan mendapatkan uang senilai *Rp ${hasilkuli} money*`)
                break
            case 'polisi':
                if (Date.now() - lastkerja < 300000) return m.reply(`Kamu sudah bekerja,Saatnya istirahat selama\n🕜 ${clockString(time - Date.now())}`)
                let hasilpolis = Math.floor(Math.random() * 5000000)
                await updateEconomy(m.sender, { money: (user.money || 0) + hasilpolis })
                await updateCooldown(m.sender, { lastkerja: Date.now() })
                m.reply(`Kamu baru saja menangkap ${pnjht} 🚨\nDan mendapatkan uang senilai *Rp ${hasilpolis} money*`)
                break
            default:
                let judul = `
_*Pilih Pekerjaan Yang Kamu Inginkan*_

- Dokter [👨‍⚕]
- Pedagang [👨🏻‍🍳]
- Ojek[🛵] 
- Kuli [👷‍♂️]
- Montir [👨‍🔧]
- Petani [👨‍🌾]
- Polisi [👮]
`
                let msg = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2,
                            },
                            interactiveMessage: {
                                body: {
                                    text: judul,
                                },
                                footer: {
                                    text: `by Killua Fourteen`,
                                },
                                header: {
                                    title: '',
                                    subtitle: '',
                                    hasMediaAttachment: false
                                },
                                nativeFlowMessage: {
                                    buttons: [
                                        {
                                        "name": "single_select",
                                        "buttonParamsJson":
                                        JSON.stringify({
                                        "title": "Pilih Pekerjaan",
                                        "sections": [
                                            {
                                                title: 'List Pekerjaan',
                                                highlight_label: 'Select', 
                                                rows: [
                                                { "header": "", "title": 'Dokter [👨‍⚕]', "description": "Menjadi Seorang Dokter", "id": `.kerja dokter` },
                                                { "header": "", "title": 'Pedagang [👨🏻‍🍳]', "description": "Menjadi Seorang Pedagang", "id": `.kerja pedagang` },
                                                { "header": "", "title": 'Ojek[🛵]', "description": "Menjadi Seorang Gojek", "id": `.kerja ojek` },
                                                { "header": "", "title": 'Kuli [👷‍♂️]', "description": "Menjadi Seorang Kuli Bangunan", "id": `.kerja kuli` },
                                                { "header": "", "title": 'Montir [👨‍🔧]', "description": "Menjadi Seorang Montir", "id": `.kerja montir` },
                                                { "header": "", "title": 'Petani [👨‍🌾]', "description": "Menjadi Seorang Petani", "id": `.kerja petani` },
                                                { "header": "", "title": 'Polisi [👮]', "description": "Menjadi Seorang Polisi", "id": `.kerja polisi` },
                                                ]
                                            }
                                            ]
                                        })              
                                        } 
                                    ],
                                },
                                contextInfo: {
                                    quotedMessage: m.message,
                                    participant: m.sender,
                                    ...m.key
                                },
                            },
                        },
                    },
                };
                return conn.relayMessage(m.chat, msg, {});
        }
    }
}
handler.help = ['kerja']
handler.tags = ['rpg']
handler.command = /^kerja$/i
handler.register = true
handler.group = true

module.exports = handler

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}
function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0) ).join(':')
}