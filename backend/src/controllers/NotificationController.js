const NotificationModel = require('../models/NotificationModel');
const SSEService        = require('../services/SSEService');

class NotificationController {

    // GET /api/notifications/stream — SSE
    static stream(req, res) {
        res.setHeader('Content-Type',  'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection',    'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // nginx proxy-friendly
        res.flushHeaders();

        // Heartbeat каждые 25 сек чтобы не отвалился по timeout
        const heartbeat = setInterval(() => {
            try { res.write(': ping\n\n'); } catch (_) {}
        }, 25_000);

        SSEService.connect(req.user.id, res);

        req.on('close', () => {
            clearInterval(heartbeat);
            SSEService.disconnect(req.user.id);
        });
    }

    // GET /api/notifications
    static async getAll(req, res) {
        try {
            const limit  = Math.min(Number(req.query.limit  ?? 30), 100);
            const offset = Number(req.query.offset ?? 0);
            const notifications = await NotificationModel.findByUser(req.user.id, { limit, offset });
            res.json({ data: notifications });
        } catch (err) {
            console.error('getAll notifications error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // GET /api/notifications/unread-count
    static async getUnreadCount(req, res) {
        try {
            const count = await NotificationModel.getUnreadCount(req.user.id);
            res.json({ count });
        } catch (err) {
            console.error('getUnreadCount error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // PATCH /api/notifications/:id/read
    static async markRead(req, res) {
        try {
            const notification = await NotificationModel.markRead(req.params.id, req.user.id);
            if (!notification) return res.status(404).json({ error: 'Уведомление не найдено' });
            res.json({ data: notification });
        } catch (err) {
            console.error('markRead error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // PATCH /api/notifications/read-all
    static async markAllRead(req, res) {
        try {
            await NotificationModel.markAllRead(req.user.id);
            res.json({ message: 'Все уведомления отмечены прочитанными' });
        } catch (err) {
            console.error('markAllRead error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // DELETE /api/notifications/:id
    static async deleteOne(req, res) {
        try {
            const deleted = await NotificationModel.delete(req.params.id, req.user.id);
            if (!deleted) return res.status(404).json({ error: 'Уведомление не найдено' });
            res.json({ message: 'Уведомление удалено' });
        } catch (err) {
            console.error('deleteOne notification error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = NotificationController;
