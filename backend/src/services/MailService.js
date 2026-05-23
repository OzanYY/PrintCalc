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
                from: `"PrintCalc" <${process.env.SMTP_USER}>`,
                to,
                subject: 'Активация аккаунта PrintCalc',
                text: `Активация аккаунта PrintCalc\n\nДля завершения регистрации перейдите по ссылке:\n${link}\n\nЕсли вы не активируете аккаунт в течение 14 дней, он будет удалён автоматически.\nЕсли вы не регистрировались на PrintCalc, проигнорируйте это письмо.`,
                html: `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                    <h2 style="color:#111">Активация аккаунта PrintCalc</h2>
                    <p>Для завершения регистрации перейдите по ссылке ниже.<br>
                    Если вы не активируете аккаунт в течение 14 дней, он будет удалён автоматически.</p>
                    <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Активировать аккаунт</a></p>
                    <p style="color:#666;font-size:13px">Если кнопка не работает, скопируйте эту ссылку в браузер:<br><a href="${link}">${link}</a></p>
                    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
                    <p style="color:#999;font-size:12px">Если вы не регистрировались на PrintCalc, проигнорируйте это письмо.</p>
                </body></html>`,
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
                from: `"PrintCalc" <${process.env.SMTP_USER}>`,
                to,
                subject: 'Сброс пароля PrintCalc',
                text: `Сброс пароля PrintCalc\n\nДля сброса пароля перейдите по ссылке (действительна 1 час):\n${resetLink}\n\nЕсли вы не запрашивали сброс пароля, проигнорируйте это письмо.`,
                html: `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                    <h2 style="color:#111">Сброс пароля PrintCalc</h2>
                    <p>Для сброса пароля перейдите по ссылке ниже. Ссылка действительна <strong>1 час</strong>.</p>
                    <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Сбросить пароль</a></p>
                    <p style="color:#666;font-size:13px">Если кнопка не работает, скопируйте эту ссылку в браузер:<br><a href="${resetLink}">${resetLink}</a></p>
                    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
                    <p style="color:#999;font-size:12px">Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
                </body></html>`,
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
                from: `"PrintCalc" <${process.env.SMTP_USER}>`,
                to,
                subject: 'Аккаунт PrintCalc будет удалён завтра',
                text: `Здравствуйте, ${username}!\n\nВаш аккаунт PrintCalc не был активирован и будет удалён завтра.\nЧтобы сохранить его, перейдите по ссылке:\n${activationUrl}`,
                html: `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                    <h2 style="color:#dc2626">Аккаунт PrintCalc будет удалён завтра</h2>
                    <p>Здравствуйте, <strong>${username}</strong>! Ваш аккаунт не был активирован и будет удалён завтра.
                    Чтобы сохранить его, перейдите по ссылке ниже.</p>
                    <p><a href="${activationUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Активировать аккаунт</a></p>
                    <p style="color:#666;font-size:13px">Если кнопка не работает, скопируйте эту ссылку в браузер:<br><a href="${activationUrl}">${activationUrl}</a></p>
                </body></html>`,
            });
            console.log(`📧 Deletion warning email sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send deletion warning email:', error);
        }
    }

    async sendEmailChangeMail(to, link, username) {
        try {
            await this.transporter.sendMail({
                from: `"PrintCalc" <${process.env.SMTP_USER}>`,
                to,
                subject: 'Подтверждение смены email PrintCalc',
                text: `Подтверждение смены email PrintCalc\n\nЗдравствуйте, ${username}!\n\nВы запросили смену email. Для подтверждения нового адреса перейдите по ссылке:\n${link}\n\nЕсли вы не запрашивали смену email, проигнорируйте это письмо — ваш текущий email останется без изменений.`,
                html: `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                    <h2 style="color:#111">Подтверждение смены email</h2>
                    <p>Здравствуйте, <strong>${username}</strong>!</p>
                    <p>Вы запросили смену email в PrintCalc. Для подтверждения нового адреса перейдите по ссылке ниже.</p>
                    <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Подтвердить новый email</a></p>
                    <p style="color:#666;font-size:13px">Если кнопка не работает, скопируйте эту ссылку в браузер:<br><a href="${link}">${link}</a></p>
                    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
                    <p style="color:#999;font-size:12px">Если вы не запрашивали смену email, проигнорируйте это письмо — ваш текущий email останется без изменений.</p>
                </body></html>`,
            });
            console.log(`📧 Email change confirmation sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send email change mail:', error);
            throw new Error('Failed to send confirmation email');
        }
    }

    async sendWelcomeMail(to, username) {
        try {
            await this.transporter.sendMail({
                from: `"PrintCalc" <${process.env.SMTP_USER}>`,
                to,
                subject: 'Добро пожаловать в PrintCalc',
                text: `Добро пожаловать в PrintCalc!\n\nЗдравствуйте, ${username}! Ваш аккаунт успешно активирован. Теперь вам доступны все функции сервиса.\n${process.env.CLIENT_URL}`,
                html: `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                    <h2 style="color:#16a34a">Добро пожаловать в PrintCalc!</h2>
                    <p>Здравствуйте, <strong>${username}</strong>! Ваш аккаунт успешно активирован.
                    Теперь вам доступны все функции сервиса.</p>
                    <p><a href="${process.env.CLIENT_URL}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Перейти в PrintCalc</a></p>
                </body></html>`,
            });
            console.log(`📧 Welcome email sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);
        }
    }
}

module.exports = new MailService();
