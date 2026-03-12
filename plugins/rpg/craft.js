//rpg-craft
const { getUser, getTool, setTool, addInventory } = require('../../lib/database')

let handler = async (m, { conn, command, args, usedPrefix }) => {
    let type = (args[0] || '').toLowerCase();
    let _type = (args[0] || '').toLowerCase();
    
    let user = await getUser(m.sender);
    if (!user) return

    let caption = `*B L A C K S M I T H*\n
> *L I S T - C R A F T*
*[ ⛏️ ]* • Pickaxe 
*[ ⚔️ ]* • Sword 
*[ 🎣 ]* • Fishingrod 
*[ 🥼 ]* • Armor 
*[ 🦯 ]* • Katana 
*[ 🪓 ]* • Axe 
*[ 🏹 ]* • Bow 
*[ 🔪 ]* • Pisau 

> *R E C E I P T*
*[ ⛏️ ]* • _Pickaxe_
• _10_ || *Kayu*
• _5_ || *Batu*
• _5_ || *Iron*
• _20_ || *String*

*[ 🪓 ]* • _Axe_
• _15_ || *Kayu*
• _10_ || *Batu*
• _15_ || *Iron*
• _10_ || *String*

*[ ⚔️ ]* • _Sword_
• _10_ || *Kayu*
• _15_ || *Iron*

*[ 🔪 ]* • _Pisau_
• _15_ || *Kayu*
• _20_ || *Iron*

*[ 🏹 ]* • _Bow_
• _10_ || *Kayu*
• _5_ || *Iron*
• _10_ || *String*

*[ 🎣 ]* • _Fishingrod_
• _10_ || *Kayu*
• _2_ || *Iron*
• _20_ || *String*

*[ 🥼 ]* • _Armor_
• _5_ || *Iron*
• _1_ || *Diamond*

*[ 🦯 ]* • _Katana_
• _10_ || *Kayu*
• _15_ || *Iron*
• _5_ || *Diamond*
• _3_ || *Emerald*

> *H O W - C R A F T*
• _Example_ :
.craft _sword_
`.trim();

    try {
        if (/craft|Crafting|blacksmith/i.test(command)) {
            const count = args[1] && args[1].length > 0 ? Math.min(99999999, Math.max(parseInt(args[1]), 1)) : !args[1] || args.length < 3 ? 1 : Math.min(1, count);
            
            // Ambil balance inventory user saat ini (sudah rata dari getUser)
            let kayu = user.kayu || 0, iron = user.iron || 0, batu = user.batu || 0, string = user.string || 0, diamond = user.diamond || 0, emerald = user.emerald || 0;

            switch (type) {
                case 'pickaxe':
                    let pickaxe = await getTool(m.sender, 'pickaxe')
                    if (pickaxe) return m.reply('Kamu sudah memilik ini');
                    if (batu < 5 || kayu < 10 || iron < 5 || string < 20) return m.reply(`Barang tidak cukup!\nUntuk membuat pickaxe. Kamu memerlukan : ${kayu < 10 ? `\n${10 - kayu} kayu🪵` : ''} ${iron < 5 ? `\n${5 - iron} iron⛓` : ''}${string < 20 ? `\n${20 - string} String🕸️` : ''}${batu < 5 ? `\n${5 - batu} Batu 🪨` : ''}`);
                    
                    await addInventory(m.sender, 'kayu', -10)
                    await addInventory(m.sender, 'iron', -5)
                    await addInventory(m.sender, 'batu', -5)
                    await addInventory(m.sender, 'string', -20)
                    await setTool(m.sender, 'pickaxe', { durability: 40 })
                    m.reply("Sukses membuat 1 pickaxe 🔨");
                    break;                  
                case 'sword':
                    let sword = await getTool(m.sender, 'sword')
                    if (sword) return m.reply('Kamu sudah memilik ini');
                    if (kayu < 10 || iron < 15) return m.reply(`Barang tidak cukup!\nUntuk membuat sword. Kamu memerlukan :${kayu < 10 ? `\n${10 - kayu} kayu🪵` : ''}${iron < 15 ? `\n${15 - iron} iron⛓️` : ''}`);
                    
                    await addInventory(m.sender, 'kayu', -10)
                    await addInventory(m.sender, 'iron', -15)
                    await setTool(m.sender, 'sword', { durability: 40 })
                    m.reply("Sukses membuat 1 sword 🗡️");
                    break;
                case 'pisau':
                    let pisau = await getTool(m.sender, 'pisau')
                    if (pisau) return m.reply('Kamu sudah memilik ini');
                    if (kayu < 15 || iron < 20) return m.reply(`Barang tidak cukup!\nUntuk membuat pisau. Kamu memerlukan :${kayu < 15 ? `\n${15 - kayu} kayu🪵` : ''}${iron < 20 ? `\n${20 - iron} iron⛓️` : ''}`);
                    
                    await addInventory(m.sender, 'kayu', -15)
                    await addInventory(m.sender, 'iron', -20)
                    await setTool(m.sender, 'pisau', { durability: 40 })
                    m.reply("Sukses membuat 1 pisau 🔪");
                    break;
                case 'axe':
                    let axe = await getTool(m.sender, 'axe')
                    if (axe) return m.reply('Kamu sudah memilik ini');
                    if (batu < 10 || kayu < 15 || iron < 15 || string < 10) return m.reply(`Barang tidak cukup!\nUntuk membuat axe. Kamu memerlukan : ${kayu < 15 ? `\n${15 - kayu} kayu🪵` : ''} ${iron < 15 ? `\n${15 - iron} iron⛓` : ''}${string < 10 ? `\n${10 - string} String🕸️` : ''}${batu < 10 ? `\n${10 - batu} Batu 🪨` : ''}`);
                    
                    await addInventory(m.sender, 'kayu', -15)
                    await addInventory(m.sender, 'iron', -15)
                    await addInventory(m.sender, 'batu', -10)
                    await addInventory(m.sender, 'string', -10)
                    await setTool(m.sender, 'axe', { durability: 40 })
                    m.reply("Sukses membuat 1 axe 🪓");
                    break;
                case 'fishingrod':
                    let fishingrod = await getTool(m.sender, 'fishingrod')
                    if (fishingrod) return m.reply('Kamu sudah memilik ini');
                    if (kayu < 20 || iron < 5 || string < 20) return m.reply(`Barang tidak cukup!\nUntuk membuat pancingan. Kamu memerlukan :${kayu < 20 ? `\n${20 - kayu} kayu🪵` : ''}${iron < 5 ? `\n${5 - iron} iron⛓` : ''}${string < 20 ? `\n${20 - string} String🕸️` : ''}`);
                    
                    await addInventory(m.sender, 'kayu', -10)
                    await addInventory(m.sender, 'iron', -2)
                    await addInventory(m.sender, 'string', -20)
                    await setTool(m.sender, 'fishingrod', { durability: 40 })
                    m.reply("Sukses membuat 1 Pancingan 🎣");
                    break;
                case 'bow':
                    let bow = await getTool(m.sender, 'bow')
                    if (bow) return m.reply('Kamu sudah memilik ini');
                    if (kayu < 10 || iron < 5 || string < 10) return m.reply(`Barang tidak cukup!\nUntuk membuat bow. Kamu memerlukan :${kayu < 10 ? `\n${10 - kayu} kayu🪵` : ''}${iron < 5 ? `\n${5 - iron} iron⛓` : ''}${string < 10 ? `\n${10 - string} String🕸️` : ''}`);
                    
                    await addInventory(m.sender, 'kayu', -10)
                    await addInventory(m.sender, 'iron', -5)
                    await addInventory(m.sender, 'string', -10)
                    await setTool(m.sender, 'bow', { durability: 40 })
                    m.reply("Sukses membuat 1 Bow 🏹");
                    break;
                case 'katana':
                    let katana = await getTool(m.sender, 'katana')
                    if (katana) return m.reply('Kamu sudah memilik ini');
                    if (kayu < 10 || iron < 15 || diamond < 5 || emerald < 3) return m.reply(`Barang tidak cukup!\nUntuk membuat katana. Kamu memerlukan :${kayu < 10 ? `\n${10 - kayu} kayu🪵` : ''}${iron < 15 ? `\n${15 - iron} iron⛓` : ''}${diamond < 5 ? `\n${5 - diamond} Diamond💎` : ''}${emerald < 3 ? `\n${3 - emerald} Emerald 🟩` : ''}`);
                    
                    await addInventory(m.sender, 'kayu', -10)
                    await addInventory(m.sender, 'iron', -15)
                    await addInventory(m.sender, 'diamond', -5)
                    await addInventory(m.sender, 'emerald', -3)
                    await setTool(m.sender, 'katana', { durability: 40 })
                    m.reply("Sukses membuat 1 Katana 🦯");
                    break;
                case 'armor':
                    let armor = await getTool(m.sender, 'armor')
                    if (armor) return m.reply('Kamu sudah memilik ini');
                    if (iron < 5 || diamond < 1) return m.reply(`Barang tidak cukup!\nUntuk membuat armor. Kamu memerlukan :${iron < 5 ? `\n${5 - iron} Iron ⛓️` : ''}${diamond < 1 ? `\n${1 - diamond} Diamond 💎` : ''}`);
                    
                    await addInventory(m.sender, 'iron', -5)
                    await addInventory(m.sender, 'diamond', -1)
                    await setTool(m.sender, 'armor', { durability: 50 })
                    m.reply("Sukses membuat 1 Armor 🥼");
                    break;
                default:
                    await conn.reply(m.chat, caption, m, {
                        contextInfo: {
                            externalAdReply: {
                                mediaType: 1,
                                title: wm,
                                thumbnailUrl: 'https://telegra.ph/file/ed878d04e7842407c2b89.jpg',
                                renderLargerThumbnail: true,
                                sourceUrl: ''
                            }
                        }
                    });
            }
        } else if (/enchant|enchan/i.test(command)) {
            const count = args[2] && args[2].length > 0 ? Math.min(99999999, Math.max(parseInt(args[2]), 1)) : !args[2] || args.length < 4 ? 1 : Math.min(1, count);
            switch (_type) {
                case 't':
                    break;
                case '':
                    break;
                default:
                    m.reply(caption);
            }
        }
    } catch (err) {
        m.reply("Error\n\n\n" + err.stack);
    }
};

handler.help = ['craft', 'blacksmith'];
handler.tags = ['rpg'];
handler.command = /^(craft|crafting|chant|blacksmith)/i;
handler.register = true;
handler.group = true;

module.exports = handler;