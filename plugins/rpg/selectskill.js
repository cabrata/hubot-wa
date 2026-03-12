const { getUser, updateRpg } = require('../../lib/database')

let handler = async (m, { conn, usedPrefix, text, command }) => {
    let user = await getUser(m.sender)
    if (!user) return

    let skill = {
        "barbarian": { difficulty: "hard", stars: "⭐⭐⭐⭐" },
        "bard": { difficulty: "medium", stars: "⭐⭐⭐" },
        "cleric": { difficulty: "medium", stars: "⭐⭐⭐" },
        "druid": { difficulty: "hard", stars: "⭐⭐⭐⭐" },
        "fighter": { difficulty: "easy", stars: "⭐⭐" },
        "monk": { difficulty: "expert", stars: "⭐⭐⭐⭐⭐" },
        "paladin": { difficulty: "hard", stars: "⭐⭐⭐⭐" },
        "ranger": { difficulty: "medium", stars: "⭐⭐⭐" },
        "rogue": { difficulty: "medium", stars: "⭐⭐⭐" },
        "sorcerer": { difficulty: "expert", stars: "⭐⭐⭐⭐⭐" },
        "warlock": { difficulty: "hard", stars: "⭐⭐⭐⭐" },
        "wizard": { difficulty: "expert", stars: "⭐⭐⭐⭐⭐" }
    }

    let skil = text.trim().toLowerCase()

    if (!Object.keys(skill).includes(skil)) {
        let skillList = Object.keys(skill).map(s => {
            let { difficulty, stars } = skill[s]
            return `- *${s.charAt(0).toUpperCase() + s.slice(1)}* *[ ${stars} ]*\n_Difficulty_ : ${difficulty}`
        }).join('\n\n')

        const availableSkillsMessage = `乂 *C L A S S*\n\nPilih *Class* yang anda sukai atau sesuai dengan talent mu:\n\n${skillList}\n\n_How To Use_ :\n${usedPrefix + command} *nameskill*\n\n_Example_ :\n${usedPrefix + command} wizard`.trim()
        
        return await conn.reply(m.chat, availableSkillsMessage, m, {
            contextInfo: {
                externalAdReply: {
                    mediaType: 1,
                    title: 'AXELLDX',
                    thumbnailUrl: 'https://telegra.ph/file/a0e0fd6b16e109e36e455.jpg',
                    renderLargerThumbnail: true,
                    sourceUrl: ''
                }
            }
        })
    }

    let { difficulty, stars } = skill[skil]

    await updateRpg(m.sender, { skill: skil })
    
    m.reply(`✅ Anda telah memilih class/skill *${skil.toUpperCase()}* dengan tingkat kesulitan ${difficulty} dan bintang ${stars}.`)
}

handler.help = ['selectskill <class>']
handler.tags = ['rpg']
handler.command = /^(selectskill|pilihskill)$/i

module.exports = handler
