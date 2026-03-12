module.exports = {
  setModel(conn, sender, model) {
    conn.CGPTSession = conn.CGPTSession || {};
    conn.CGPTSession[sender] = model;
  },

  getModel(conn, sender) {
    return conn?.CGPTSession?.[sender] || null;
  },

  clearModel(conn, sender) {
    if (conn?.CGPTSession?.[sender]) {
      delete conn.CGPTSession[sender];
    }
  },

  activate(conn, sender, model) {
    const modelName = model.toLowerCase().trim();
    this.setModel(conn, sender, modelName);

    conn.CGPTSessionMeta = conn.CGPTSessionMeta || {};
    conn.CGPTSessionMeta[sender] = { isGroup: false };
  },

  deactivate(conn, sender) {
    this.clearModel(conn, sender);
  },

  // ===================== GRUP =====================
  group: {
    activate(conn, chat, model) {
      conn.CGPTGroupSession = conn.CGPTGroupSession || {};
      conn.CGPTGroupSession[chat] = model.toLowerCase().trim();
    },
    deactivate(conn, chat) {
      if (conn?.CGPTGroupSession?.[chat]) {
        delete conn.CGPTGroupSession[chat];
      }
    },
    getModel(conn, chat) {
      return conn?.CGPTGroupSession?.[chat] || null;
    }
  },

  // ===================== LIMIT CHECK (untuk pribadi saja) =====================
  checkLimit(user, model, isROwner) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Parsing JSON dari database (jika stringify atau objek kosong)
    let chatgpt = user.chatgpt ? (typeof user.chatgpt === 'string' ? JSON.parse(user.chatgpt) : user.chatgpt) : { lastReset: 0, usage: {} };

    // Reset harian
    if (now - chatgpt.lastReset > dayMs) {
      chatgpt.lastReset = now;
      chatgpt.usage = {};
    }

    // Tentukan role
    const role = (() => {
      if (isROwner) return 'owner';
      if (user.moderator) return 'moderator';
      if (Number(user.premiumTime || 0) > now) return 'premium';
      return 'user';
    })();

    // Limit per role
    const limits = {
      user: { '4.1-nano': 10 },
      premium: { '4o-mini': 10, '4.1-nano': 10 },
      moderator: { '4o-mini': 15, '4.1-mini': 10, '4.1-nano': 10 },
      owner: { unlimited: true }
    };

    const allowed = limits[role];
    if (allowed.unlimited) return { allowed: true, updatedChatgpt: chatgpt };

    if (!model || !allowed[model]) {
      return { allowed: false, reason: 'Model tidak diizinkan untuk role Anda.', updatedChatgpt: chatgpt };
    }

    // Cek limit harian
    chatgpt.usage[model] = chatgpt.usage[model] || 0;
    if (chatgpt.usage[model] >= allowed[model]) {
      const resetIn = (chatgpt.lastReset + dayMs - now);
      const jam = Math.floor(resetIn / (60 * 60 * 1000));
      const menit = Math.floor((resetIn % (60 * 60 * 1000)) / (60 * 1000));
      const detik = Math.floor((resetIn % (60 * 1000)) / 1000);
      return {
        allowed: false,
        reason: `Limit pemakaian ChatGPT Anda habis, tunggu ${jam} jam ${menit} menit ${detik} detik lagi!`,
        updatedChatgpt: chatgpt
      };
    }

    chatgpt.usage[model]++;
    return { allowed: true, updatedChatgpt: chatgpt };
  }
};
