/**
 * NOTE: This file is NOT used at runtime.
 * 
 * Since wbssocket is an ESM-only package, the socket extension
 * and smsg() are inlined directly in main.js using dynamic import().
 * 
 * This file is kept as reference/documentation only.
 * All socket helpers (decodeJid, getName, reply, downloadMedia, etc.)
 * and smsg() are defined in main.js and exposed as:
 * - global.makeWASocket (extended socket constructor)
 * - global.smsg (message serializer)
 */

// See main.js for the actual implementations
module.exports = {}
