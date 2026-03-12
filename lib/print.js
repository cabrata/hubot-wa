const chalk = require('chalk')

/**
 * Print command log to console
 */
module.exports = function print(m, conn) {
    const sender = m.sender?.split('@')[0] || 'unknown'
    const chatName = m.isGroup ? (m.chat?.split('@')[0] || 'group') : 'private'
    const time = new Date().toLocaleTimeString('id-ID')
    const cmdText = m.text?.slice(0, 50) || ''

    const tag = m.isGroup
        ? chalk.bgCyan.black(` ${chatName} `)
        : chalk.bgGreen.black(' Private ')

    console.log(
        chalk.gray(`[${time}]`),
        tag,
        chalk.yellow(`@${sender}`),
        chalk.white('→'),
        chalk.green(cmdText)
    )
}
