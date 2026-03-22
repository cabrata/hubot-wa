const { updateUser, getUser, db } = require('./lib/database');

async function test() {
    try {
        let jid = '1234567890@s.whatsapp.net';
        await getUser(jid);
        
        await updateUser(jid, {
            lastUseTime: new Date(),
            lastUseCommand: '.ping'
        });

        let updated = await db.user.findUnique({ where: { jid } });
        console.log('Success:', updated?.lastUseTime, updated?.lastUseCommand);
        
    } catch (e) {
        console.error('Error in updateUser:', e);
    } finally {
        await db.$disconnect();
    }
}
test();
