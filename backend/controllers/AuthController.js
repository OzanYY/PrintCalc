// controllers/AuthController.js
const UserService = require('../service/UserService');
const TokenService = require('../service/TokenService');

class AuthController {
    // ==================== РЕГИСТРАЦИЯ ====================
    static async register(req, res) {
        try {
            const { username, email, password } = req.body;

            // Валидация обязательных полей
            if (!username || !email || !password) {
                return res.status(400).json({ 
                    error: 'Username, email and password are required' 
                });
            }

            // Регистрация через сервис
            const result = await UserService.register({ username, email, password });

            // Генерация токенов для автоматического входа после регистрации
            const metadata = {
                fingerprint: req.headers['x-fingerprint'],
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip
            };

            const tokens = await TokenService.createAuthTokens(result.user, metadata);

            res.status(201).json({
                message: 'User registered successfully',
                user: result.user,
                ...tokens
            });

        } catch (error) {
            console.error('Register error:', error);
            
            // Обработка разных типов ошибок
            if (error.message.includes('already exists')) {
                return res.status(409).json({ error: error.message });
            }
            
            res.status(400).json({ error: error.message });
        }
    }

    // ==================== ВХОД ====================
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ 
                    error: 'Email and password are required' 
                });
            }

            // Аутентификация пользователя
            const user = await UserService.login(email, password);

            // Создание токенов
            const metadata = {
                fingerprint: req.headers['x-fingerprint'],
                userAgent: req.headers['user-agent'],
                ipAddress: req.ip
            };

            const tokens = await TokenService.createAuthTokens(user, metadata);

            res.json({
                message: 'Login successful',
                user,
                ...tokens
            });

        } catch (error) {
            console.error('Login error:', error);
            
            // Одинаковое сообщение для безопасности
            res.status(401).json({ error: 'Invalid email or password' });
        }
    }

    // ==================== ВЫХОД ====================
    static async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({ 
                    error: 'Refresh token required' 
                });
            }

            await TokenService.removeToken(refreshToken);

            res.json({ 
                message: 'Logged out successfully' 
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    }

    // ==================== ВЫХОД СО ВСЕХ УСТРОЙСТВ ====================
    static async logoutAll(req, res) {
        try {
            const userId = req.user.id; // из auth middleware
            const { refreshToken } = req.body;

            // Удаляем все токены пользователя
            const deletedCount = await TokenService.removeAllUserTokens(userId);

            res.json({ 
                message: `Logged out from ${deletedCount} devices` 
            });

        } catch (error) {
            console.error('Logout all error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    }

    // ==================== ОБНОВЛЕНИЕ ТОКЕНОВ ====================
    static async refresh(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ 
                    error: 'Refresh token required' 
                });
            }

            const result = await TokenService.refreshTokens(refreshToken);

            res.json({
                message: 'Tokens refreshed successfully',
                ...result
            });

        } catch (error) {
            console.error('Refresh error:', error);
            
            if (error.message.includes('not found') || error.message.includes('expired')) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }
            
            res.status(401).json({ error: 'Token refresh failed' });
        }
    }

    // ==================== ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ ====================
    static async getMe(req, res) {
        try {
            const userId = req.user.id; // из auth middleware
            const user = await UserService.getProfile(userId);

            res.json({ user });

        } catch (error) {
            console.error('Get me error:', error);
            res.status(404).json({ error: 'User not found' });
        }
    }

    // ==================== АКТИВАЦИЯ АККАУНТА ====================
    static async activate(req, res) {
        try {
            const { link } = req.params;

            if (!link) {
                return res.status(400).json({ 
                    error: 'Activation link required' 
                });
            }

            const user = await UserService.activateAccount(link);

            res.json({
                message: 'Account activated successfully',
                user
            });

        } catch (error) {
            console.error('Activation error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    // ==================== СМЕНА ПАРОЛЯ ====================
    static async changePassword(req, res) {
        try {
            const userId = req.user.id; // из auth middleware
            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                return res.status(400).json({ 
                    error: 'Old password and new password are required' 
                });
            }

            const result = await UserService.changePassword(userId, oldPassword, newPassword);

            // Опционально: удаляем все токены кроме текущего (принудительный вход заново)
            // const refreshToken = req.headers.authorization?.split(' ')[1];
            // await TokenService.removeOtherTokens(userId, refreshToken);

            res.json(result);

        } catch (error) {
            console.error('Change password error:', error);
            
            if (error.message.includes('incorrect')) {
                return res.status(400).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Password change failed' });
        }
    }

    // ==================== ЗАПРОС НА СБРОС ПАРОЛЯ ====================
    static async requestPasswordReset(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ 
                    error: 'Email is required' 
                });
            }

            const result = await UserService.requestPasswordReset(email);

            // Здесь нужно отправить email с ссылкой для сброса
            // await EmailService.sendPasswordResetEmail(email, result.resetToken);

            res.json({ 
                message: 'If email exists, reset link will be sent' 
            });

        } catch (error) {
            console.error('Password reset request error:', error);
            res.status(500).json({ error: 'Failed to process request' });
        }
    }

    // ==================== ПОЛУЧЕНИЕ АКТИВНЫХ СЕССИЙ ====================
    static async getSessions(req, res) {
        try {
            const userId = req.user.id; // из auth middleware
            
            // Получаем все сессии пользователя
            const sessions = await TokenService.getUserSessions(userId);

            // Получаем текущий refresh token из заголовка (если есть)
            const authHeader = req.headers.authorization;
            const accessToken = authHeader?.split(' ')[1];
            
            // Здесь нужно найти соответствующий refresh token
            // Это упрощенная версия, в реальности лучше передавать refreshToken отдельно

            res.json({ 
                sessions,
                total: sessions.length 
            });

        } catch (error) {
            console.error('Get sessions error:', error);
            res.status(500).json({ error: 'Failed to get sessions' });
        }
    }

    // ==================== ЗАВЕРШЕНИЕ ДРУГИХ СЕССИЙ ====================
    static async terminateOtherSessions(req, res) {
        try {
            const userId = req.user.id; // из auth middleware
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ 
                    error: 'Current refresh token required' 
                });
            }

            const deletedCount = await TokenService.terminateOtherSessions(userId, refreshToken);

            res.json({ 
                message: `Terminated ${deletedCount} other sessions` 
            });

        } catch (error) {
            console.error('Terminate sessions error:', error);
            res.status(500).json({ error: 'Failed to terminate sessions' });
        }
    }

    // ==================== УДАЛЕНИЕ АККАУНТА ====================
    static async deleteAccount(req, res) {
        try {
            const userId = req.user.id; // из auth middleware
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({ 
                    error: 'Password is required' 
                });
            }

            // Удаляем все токены пользователя
            await TokenService.removeAllUserTokens(userId);

            // Удаляем пользователя
            const result = await UserService.deleteAccount(userId, password);

            res.json({ 
                message: 'Account deleted successfully' 
            });

        } catch (error) {
            console.error('Delete account error:', error);
            
            if (error.message.includes('Invalid password')) {
                return res.status(400).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Failed to delete account' });
        }
    }

    // ==================== ПРОВЕРКА ТОКЕНА ====================
    static async verifyToken(req, res) {
        try {
            // Этот маршрут защищен middleware, поэтому если мы здесь - токен валидный
            res.json({ 
                valid: true,
                user: req.user 
            });

        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({ valid: false });
        }
    }
}

module.exports = AuthController;