// Хранит активные SSE-соединения: userId (string) → Express Response
const connections = new Map();

const SSEService = {
    connect(userId, res) {
        const key = String(userId);
        // Закрываем старое соединение того же пользователя (новая вкладка)
        const existing = connections.get(key);
        if (existing) {
            try { existing.end(); } catch (_) {}
        }
        connections.set(key, res);
    },

    disconnect(userId) {
        connections.delete(String(userId));
    },

    push(userId, notification) {
        const res = connections.get(String(userId));
        if (!res) return false;
        try {
            res.write(`data: ${JSON.stringify(notification)}\n\n`);
            return true;
        } catch (_) {
            connections.delete(String(userId));
            return false;
        }
    },

    pushToMany(userIds, notification) {
        for (const id of userIds) {
            this.push(id, notification);
        }
    },
};

module.exports = SSEService;
