const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const prisma = new PrismaClient()

async function check() {
    let db = JSON.parse(fs.readFileSync('./database.json'))
    let pUsers = await prisma.user.count()
    console.log('database.json users:', Object.keys(db.users || {}).length)
    console.log('Prisma users:', pUsers)
}
check().then(() => process.exit(0))
