const nodemailer = require('nodemailer');

class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
    }

    async sendActivationMail(to, link) {
        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_USER,
                to,
                subject: 'Активация аккаунта PrintCalc',
                html: `
                    <h2>Активация аккаунта PrintCalc</h2>
                    <p>Для завершения регистрации перейдите по ссылке ниже.<br>
                    Если вы не активируете аккаунт в течение 14 дней, он будет удалён автоматически.</p>
                    <p><a href="${link}">Активировать аккаунт</a></p>
                    <p>Если вы не регистрировались на PrintCalc, проигнорируйте это письмо.</p>
                `,
            });
            console.log(`📧 Activation email sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send activation email:', error);
            throw new Error('Failed to send activation email');
        }
    }

    async sendPasswordResetMail(to, token) {
        try {
            const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
            await this.transporter.sendMail({
                from: process.env.SMTP_USER,
                to,
                subject: 'Сброс пароля PrintCalc',
                html: `
                    <h2>Сброс пароля PrintCalc</h2>
                    <p>Для сброса пароля перейдите по ссылке ниже. Ссылка действительна 1 час.</p>
                    <p><a href="${resetLink}">Сбросить пароль</a></p>
                    <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
                `,
            });
            console.log(`📧 Password reset email sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            throw error;
        }
    }

    async sendDeletionWarningMail(to, username, activationLink) {
        try {
            const activationUrl = `${process.env.API_URL}/api/auth/activate/${activationLink}`;
            await this.transporter.sendMail({
                from: process.env.SMTP_USER,
                to,
                subject: 'Аккаунт PrintCalc будет удалён завтра',
                html: `
                    <h2>Аккаунт PrintCalc будет удалён завтра</h2>
                    <p>Здравствуйте, ${username}! Ваш аккаунт не был активирован и будет удалён завтра.
                    Чтобы сохранить его, перейдите по ссылке ниже.</p>
                    <p><a href="${activationUrl}">Активировать аккаунт</a></p>
                `,
            });
            console.log(`📧 Deletion warning email sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send deletion warning email:', error);
        }
    }

    async sendWelcomeMail(to, username) {
        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_USER,
                to,
                subject: 'Добро пожаловать в PrintCalc',
                html: `
                    <h2>Добро пожаловать в PrintCalc!</h2>
                    <p>Здравствуйте, ${username}! Ваш аккаунт успешно активирован.
                    Теперь вам доступны все функции сервиса.</p>
                    <p><a href="${process.env.CLIENT_URL}">Перейти в PrintCalc</a></p>
                `,
            });
            console.log(`📧 Welcome email sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);
        }
    }
}

module.exports = new MailService();
