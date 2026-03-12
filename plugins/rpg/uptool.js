const { getUser, updateEconomy, addInventory, getTool, setTool } = require('../../lib/database')

let handler = async (m, { conn, command, args, usedPrefix }) => {
    let user = await getUser(m.sender);
    if (!user) return;
    
    let type = (args[0] || '').toLowerCase();
    let validTools = ['fishingrod', 'pickaxe', 'sword', 'armor', 'katana', 'axe', 'bow', 'pisau'];
    
    if (!validTools.includes(type)) {
        return conn.reply(m.chat, `乂 *U P G R A D E*\n\n乂 *L I S T - U P G R A D E*\n*[ 🎣 ]* • Fishingrod\n*[ ⛏️ ]* • Pickaxe\n*[ 🗡 ]* • Sword\n*[ 🛡 ]* • Armor\n*[ 🦯 ]* • Katana\n*[ 🏹 ]* • Bow\n*[ 🪓 ]* • Axe\n*[ 🔪 ]* • Pisau\n\n乂 *H O W - U P G R A D E*\n• _Example_ :\n${usedPrefix}uptool sword`, m);
    }
    
    let tool = await getTool(m.sender, type);
    if (!tool) {
        return m.reply(`Anda belum memiliki *${type}*\nuntuk mendapatkannya ketik *${usedPrefix}craft ${type}*`);
    }
    
    let level = tool.level || 1;
    if (level > 9) {
        return m.reply(`*${type}* kamu sudah mencapai level maksimal!`);
    }
    
    let reqIron = level * 5;
    let reqDiamond = level * 1;
    let reqMoney = level * 500;
    
    let userIron = user.iron || 0;
    let userDiamond = user.diamond || 0;
    let userMoney = user.money || 0;
    
    if (userIron < reqIron || userDiamond < reqDiamond || userMoney < reqMoney) {
        let msg = `Material Anda Kurang!!\nUntuk upgrade *${type}* ke level ${level + 1} membutuhkan:`;
        if (userIron < reqIron) msg += `\n🔩 Iron: ${reqIron} (Kurang ${reqIron - userIron})`;
        if (userDiamond < reqDiamond) msg += `\n💎 Diamond: ${reqDiamond} (Kurang ${reqDiamond - userDiamond})`;
        if (userMoney < reqMoney) msg += `\n💰 Uang: ${reqMoney} (Kurang ${reqMoney - userMoney})`;
        return m.reply(msg);
    }
    
    // Kurangi material
    await updateEconomy(m.sender, { money: userMoney - reqMoney, diamond: userDiamond - reqDiamond });
    await addInventory(m.sender, 'iron', -reqIron);
    
    // Set status tool yang baru
    await setTool(m.sender, type, { level: level + 1, durability: (level + 1) * 50 });
    
    m.reply(`🎉 Sukses mengupgrade *${type}* ke level ${level + 1}!\nDurability direset menjadi ${(level + 1) * 50}.`);
}
handler.help = ['uptool <item>'];
handler.tags = ['rpg'];
handler.command = /^(up(tool)?)$/i;
handler.group = true;
module.exports = handler;
