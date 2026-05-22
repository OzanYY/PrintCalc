const { Pool, types } = require('pg');

// OID 1082 = DATE. По умолчанию pg может вернуть JS Date (UTC midnight),
// что в UTC+ зонах при сериализации сдвигает день назад.
// Принудительно возвращаем DATE как строку YYYY-MM-DD.
types.setTypeParser(1082, (val) => val); // val уже строка 'YYYY-MM-DD' из pg wire

// Настраиваем параметры бд
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20, // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Проверка подключения
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Экспортируем бд
module.exports = pool;