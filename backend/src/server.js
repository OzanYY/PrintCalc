//require - функция для импорта модулей .config() загружает переменные в в process.env
require('dotenv').config(); // загружаем переменные окружения из файла .env
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth-routes');
const printerRoutes = require('./routes/printer-routes');
const materialRoutes = require('./routes/material-routes');
const calculationRoutes = require('./routes/calculation-routes');
const orderRoutes = require('./routes/order-routes')
const UserModel = require('./models/UserModel');
const TokenModel = require('./models/TokenModel');
const { PrinterModel } = require('./models/PrinterModel');
const MaterialModel = require('./models/MaterialModel');
const OrderModel = require('./models/OrderModel');

// Объявляем порт, на котором будет развернут сервек
const PORT = process.env.PORT || 5000;
// Создаем приложение express
const app = express()

// Настройки CORS
const corsOptions = {
    origin: 'http://localhost:5173', // адрес фронта
    credentials: true,                // разрешаем куки
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use('/api/printers', printerRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api', calculationRoutes);
app.use('/api/orders', orderRoutes);

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

        await OrderModel.createTable();
        console.log('✅ Orders table ready');

        app.listen(PORT, () => console.log(`Server started on port - ${PORT}`))
    }
    catch (e) {
        console.log(e);
    }
}

start()