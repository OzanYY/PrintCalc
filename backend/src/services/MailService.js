const nodemailer = require('nodemailer');

class MailService {
    constructor() {
        // Создаем транспортер для отправки писем
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // true для 465, false для других портов
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
    }

    // Отправка письма для активации
    async sendActivationMail(to, link) {
        try {
            // Формируем письмо
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: to,
                subject: 'Активация аккаунта на PrintCalc',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #333; text-align: center;">Добро пожаловать в PrintCalc! 🖨️</h1>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p style="font-size: 16px; color: #555;">Для завершения регистрации, пожалуйста, активируйте ваш аккаунт:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${link}" 
                                   style="background-color: #4CAF50; 
                                          color: white; 
                                          padding: 12px 30px; 
                                          text-decoration: none; 
                                          border-radius: 5px;
                                          font-weight: bold;
                                          display: inline-block;">
                                    Активировать аккаунт
                                </a>
                            </div>
                            
                            <p style="font-size: 14px; color: #777;">Или скопируйте ссылку:</p>
                            <p style="font-size: 12px; color: #999; word-break: break-all;">${link}</p>
                        </div>
                        
                        <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin: 10px 0;">
                            <p style="font-size: 13px; color: #856404; margin: 0;">
                                ⚠️ <strong>Важно:</strong> если вы не активируете аккаунт в течение <strong>14 дней</strong>, он будет автоматически удалён.
                            </p>
                        </div>

                        <p style="font-size: 12px; color: #999; text-align: center;">
                            Если вы не регистрировались на PrintCalc, просто проигнорируйте это письмо.
                        </p>
                    </div>
                `
            };

            // Отправляем письмо
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`📧 Activation email sent to ${to}`);
            return result;

        } catch (error) {
            console.error('❌ Failed to send email:', error);
            throw new Error('Failed to send activation email');
        }
    }

    // Отправка письма для сброса пароля
    async sendPasswordResetMail(to, token) {
        try {
            const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
            
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: to,
                subject: 'Сброс пароля на PrintCalc',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #333; text-align: center;">Сброс пароля 🔐</h1>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p style="font-size: 16px; color: #555;">Мы получили запрос на сброс пароля для вашего аккаунта:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" 
                                   style="background-color: #2196F3; 
                                          color: white; 
                                          padding: 12px 30px; 
                                          text-decoration: none; 
                                          border-radius: 5px;
                                          font-weight: bold;
                                          display: inline-block;">
                                    Сбросить пароль
                                </a>
                            </div>
                            
                            <p style="font-size: 14px; color: #777;">Ссылка действительна 1 час.</p>
                            <p style="font-size: 14px; color: #777;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
                        </div>
                    </div>
                `
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`📧 Password reset email sent to ${to}`);
            return result;

        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            throw error;
        }
    }

    // Предупреждение об удалении аккаунта через 1 день
    async sendDeletionWarningMail(to, username, activationLink) {
        try {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to,
                subject: 'Ваш аккаунт PrintCalc будет удалён завтра',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #c0392b; text-align: center;">Аккаунт будет удалён завтра ⚠️</h1>

                        <div style="background-color: #fdf3f2; border: 1px solid #e74c3c; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p style="font-size: 16px; color: #555;">Здравствуйте, ${username}!</p>
                            <p style="font-size: 16px; color: #555;">
                                Ваш аккаунт на <strong>PrintCalc</strong> был зарегистрирован, но так и не активирован.
                                Завтра он будет автоматически удалён.
                            </p>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.API_URL}/api/auth/activate/${activationLink}"
                                   style="background-color: #e74c3c;
                                          color: white;
                                          padding: 12px 30px;
                                          text-decoration: none;
                                          border-radius: 5px;
                                          font-weight: bold;
                                          display: inline-block;">
                                    Активировать аккаунт сейчас
                                </a>
                            </div>

                            <p style="font-size: 14px; color: #777;">
                                Если вы не хотите сохранять аккаунт — просто проигнорируйте это письмо.
                            </p>
                        </div>
                    </div>
                `,
            };
            await this.transporter.sendMail(mailOptions);
            console.log(`📧 Deletion warning email sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send deletion warning email:', error);
        }
    }

    // Отправка приветственного письма после активации
    async sendWelcomeMail(to, username) {
        try {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: to,
                subject: 'Добро пожаловать в PrintCalc! 🎉',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #333; text-align: center;">Аккаунт активирован!</h1>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p style="font-size: 16px; color: #555;">Здравствуйте, ${username}!</p>
                            <p style="font-size: 16px; color: #555;">Ваш аккаунт успешно активирован. Теперь вы можете:</p>
                            
                            <ul style="font-size: 16px; color: #555; margin: 20px;">
                                <li>✅ Рассчитывать стоимость печати</li>
                                <li>✅ Сохранять свои расчеты</li>
                                <li>✅ Создавать заказы</li>
                                <li>✅ Отслеживать статистику</li>
                            </ul>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.CLIENT_URL}/calculator" 
                                   style="background-color: #4CAF50; 
                                          color: white; 
                                          padding: 12px 30px; 
                                          text-decoration: none; 
                                          border-radius: 5px;
                                          font-weight: bold;">
                                    Перейти к калькулятору
                                </a>
                            </div>
                        </div>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`📧 Welcome email sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);
        }
    }
}

module.exports = new MailService();