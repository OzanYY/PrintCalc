//require - функция для импорта модулей .config() загружает переменные в в process.env
require('dotenv').config(); // загружаем переменные окружения из файла .env
const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth-routes');
const printerRoutes = require('./routes/printer-routes');
const materialRoutes = require('./routes/material-routes');
const calculationRoutes = require('./routes/calculation-routes');
const orderRoutes = require('./routes/order-routes')
const UserModel = require('./models/UserModel');
const TokenModel = require('./models/TokenModel');
const TokenService = require('./services/TokenService');
const MailService = require('./services/MailService');
const { PrinterModel } = require('./models/PrinterModel');
const MaterialModel = require('./models/MaterialModel');
const OrderModel = require('./models/OrderModel');
const MaterialTransactionModel = require('./models/MaterialTransactionModel');
const inventoryRoutes = require('./routes/inventory-routes');
const adminRoutes = require('./routes/admin-routes');
const clientRoutes = require('./routes/client-routes');
const tagRoutes = require('./routes/tag-routes');
const ClientModel = require('./models/ClientModel');
const TagModel = require('./models/TagModel');
const OrderCommentModel = require('./models/OrderCommentModel');
const TeamModel           = require('./models/TeamModel');
const TeamMemberModel     = require('./models/TeamMemberModel');
const TeamInvitationModel = require('./models/TeamInvitationModel');
const TeamResourceModel   = require('./models/TeamResourceModel');
const NotificationModel   = require('./models/NotificationModel');
const teamRoutes          = require('./routes/team-routes');
const notificationRoutes  = require('./routes/notification-routes');
const invitationRoutes    = require('./routes/invitation-routes');

// Объявляем порт, на котором будет развернут сервек
const PORT = process.env.PORT || 5000;
// Создаем приложение express
const app = express()
app.set('trust proxy', 1);

// ─── Rate Limiters ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 20,                   // максимум 20 попыток
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
    skip: (req) => process.env.NODE_ENV === 'test',
});

// ─── Настройки CORS ───────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];
const corsOptions = {
    origin: process.env.CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false })); // Security headers
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRoutes);
app.use('/api/printers', printerRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api', calculationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clients',        clientRoutes);
app.use('/api/tags',           tagRoutes);
app.use('/api/teams',          teamRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/invitations',    invitationRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('[Unhandled error]', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

const start = async () => {
    try {
        // 2. Создаем таблицы (если их нет)
        await UserModel.createTable();
        console.log('✅ Users table ready');

        await TokenModel.createTable();
        console.log('✅ Tokens table ready');

        await PrinterModel.createTable();
        console.log('✅ Printers table ready');

        await MaterialModel.createTable();
        console.log('✅ Materials table ready');

        await ClientModel.createTable();
        console.log('✅ Clients table ready');

        await OrderModel.createTable();
        console.log('✅ Orders table ready');

        await MaterialTransactionModel.createTable();
        console.log('✅ Material transactions table ready');

        await TagModel.createTable();
        console.log('✅ Tags & order_tags tables ready');

        await OrderCommentModel.createTable();
        console.log('✅ Order comments table ready');

        await TeamModel.createTable();
        console.log('✅ Teams table ready');

        await TeamMemberModel.createTable();
        console.log('✅ Team members table ready');

        await TeamInvitationModel.createTable();
        console.log('✅ Team invitations table ready');

        await TeamResourceModel.createTable();
        console.log('✅ Team resources table ready');

        await NotificationModel.createTable();
        console.log('✅ Notifications table ready');

        app.listen(PORT, () => console.log(`Server started on port - ${PORT}`));

        // Запускаем первую очистку сразу при старте, затем каждые 24 часа
        runDailyCleanup();
        setInterval(runDailyCleanup, 24 * 60 * 60 * 1000);
    }
    catch (e) {
        console.log(e);
    }
}

async function runDailyCleanup() {
    try {
        // 1. Отправляем предупреждение за 1 день до удаления
        const expiringSoon = await UserModel.findUnactivatedExpiringSoon();
        for (const user of expiringSoon) {
            await MailService.sendDeletionWarningMail(user.email, user.username, user.activation_link);
            await UserModel.markDeletionWarningSent(user.id);
        }
        if (expiringSoon.length > 0) {
            console.log(`📧 Sent deletion warning to ${expiringSoon.length} account(s)`);
        }

        // 2. Удаляем неактивированные аккаунты старше 14 дней
        const deleted = await UserModel.deleteUnactivatedExpired();
        if (deleted.length > 0) {
            console.log(`🗑️  Deleted ${deleted.length} expired unactivated account(s):`, deleted.map(u => u.email).join(', '));
        }

        // 3. Чистим просроченные токены
        await TokenService.cleanupExpiredTokens();
    } catch (error) {
        console.error('Daily cleanup error:', error);
    }
}

start()