const syntaxerror = require('syntax-error')
const util = require('util')

class CustomArray extends Array {
    constructor(...args) {
        if (typeof args[0] == 'number') return super(Math.min(args[0], 10000))
        else return super(...args)
    }
}

module.exports = {
    name: 'eval',
    command: /(?:)/i,
    customPrefix: /^=?> /,
    rowner: true,
    mods: false,
    premium: false,
    group: false,
    private: false,
    admin: false,
    botAdmin: false,
    limit: false,
    fail: null,
    tags: ['advanced'],
    desc: 'Evaluate JavaScript code',

    async handler({ m, conn, usedPrefix, noPrefix, args, groupMetadata }) {
        let _return
        let _syntax = ''
        let _text = (/^=/.test(usedPrefix) ? 'return ' : '') + noPrefix
        let old = m.exp * 1

        try {
            let i = 15
            let f = { exports: {} }
            let exec = new (async () => { }).constructor(
                'print', 'm', 'handler', 'require', 'conn',
                'Array', 'process', 'args', 'groupMetadata',
                'module', 'exports', 'argument',
                _text
            )
            _return = await exec.call(conn,
                (...args) => {
                    if (--i < 1) return
                    console.log(...args)
                    return conn.reply(m.chat, util.format(...args), m.msg)
                },
                m, module.exports, require, conn,
                CustomArray, process, args, groupMetadata,
                f, f.exports, [conn, { m, conn, usedPrefix, noPrefix, args, groupMetadata }]
            )
        } catch (e) {
            let err = syntaxerror(_text, 'Execution Function', {
                allowReturnOutsideFunction: true,
                allowAwaitOutsideFunction: true,
            })
            if (err) _syntax = '```' + err + '```\n\n'
            _return = e
        } finally {
            conn.reply(m.chat, _syntax + util.format(_return), m.msg)
            m.exp = old
        }
    },
}
