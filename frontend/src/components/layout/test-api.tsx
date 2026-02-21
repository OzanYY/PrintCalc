import React, { useEffect, useState } from 'react';

export const TestAPI: React.FC = () => {
    const [status, setStatus] = useState<string>('Тестируем API...');
    const [error, setError] = useState<string>('');

    useEffect(() => {
    testConnection();
}, []);

const testConnection = async () => {
    try {
        // 1. Проверяем health check - ТЕПЕРЬ РАБОТАЕТ!
        const health = await fetch('http://localhost:5000/health');
        const healthData = await health.json();
        console.log('Health check:', healthData);
        
        setStatus('✅ Бэкенд доступен');
        setStatus('✅ API работает');
        
    } catch (err) {
        console.error('Connection error:', err);
        setError('❌ Не удалось подключиться к бэкенду');
    }
};

    return (
        <div className="p-4">
            <h2>Тест подключения</h2>
            <p>{status}</p>
            {error && <p className="text-red-500">{error}</p>}
        </div>
    );
};