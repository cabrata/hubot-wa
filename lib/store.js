const NodeCache = require('node-cache')

/**
 * Minimal message store using NodeCache
 * Only stores messages needed for retry — auto-expires after 5 minutes
 * Much lighter than makeInMemoryStore() which keeps ALL messages in RAM
 */
const messageStore = new NodeCache({
    stdTTL: 300,       // 5 minutes TTL
    checkperiod: 60,   // cleanup every 60s
    maxKeys: 5000,     // max 5000 messages in cache
    useClones: false,   // avoid cloning for memory savings
})

/**
 * Store a message for retry
 */
function saveMessage(msg) {
    if (msg?.key?.id) {
        messageStore.set(msg.key.id, msg)
    }
}

/**
 * Get message by key ID (used for Baileys getMessage callback)
 */
function getMessage(key) {
    if (key?.id) {
        const msg = messageStore.get(key.id)
        return msg?.message || undefined
    }
    return undefined
}

/**
 * Get full message object by ID
 */
function getFullMessage(id) {
    return messageStore.get(id)
}

/**
 * Stats
 */
function getStats() {
    return messageStore.getStats()
}

module.exports = {
    messageStore,
    saveMessage,
    getMessage,
    getFullMessage,
    getStats,
}
