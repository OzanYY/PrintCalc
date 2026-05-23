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

    buildHtml({ title, body, buttonText, buttonUrl, disclaimer }) {
        const button = buttonUrl
            ? `<p style="margin:24px 0">
                 <a href="${buttonUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:15px">${buttonText}</a>
               </p>
               <p style="color:#6b7280;font-size:13px;margin:0">Если кнопка не работает, скопируйте ссылку в браузер:<br>
               <a href="${buttonUrl}" style="color:#2563eb">${buttonUrl}</a></p>`
            : '';

        const disclaimerBlock = disclaimer
            ? `<p style="color:#9ca3af;font-size:12px;margin:0">${disclaimer}</p>`
            : '';

        return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">

        <!-- Header -->
        <tr>
          <td style="background:#2563eb;border-radius:8px 8px 0 0;padding:20px 32px">
            <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px">PrintCalc</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:32px;border-radius:0 0 8px 8px">
            <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#111827">${title}</h2>
            ${body}
            ${button}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 0;text-align:center">
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px">
            ${disclaimerBlock}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    async sendActivationMail(to, link) {
        try {
            await this.transporter.sendMail({
                from: `"PrintCalc" <${process.env.SMTP_USER}>`,
                to,
                subject: 'Активация аккаунта PrintCalc',
                text: `Активация аккаунта PrintCalc\n\nДля завершения регистрации перейдите по ссылке:\n${link}\n\nЕсли вы не активируете аккаунт в течение 14 дней, он будет удалён автоматически.\nЕсли вы не регистрировались на PrintCalc, проигнорируйте это письмо.`,
                html: this.buildHtml({
                    title: 'Активация аккаунта',
                    body: `<p style="color:#374151;line-height:1.6;margin:0 0 8px">Для завершения регистрации нажмите кнопку ниже.</p>
                           <p style="color:#374151;line-height:1.6;margin:0">Если вы не активируете аккаунт в течение 14 дней, он будет удалён автоматически.</p>`,
                    buttonText: 'Активировать аккаунт',
                    buttonUrl: link,
                    disclaimer: 'Если вы не регистрировались на PrintCalc, проигнорируйте это письмо.'
                }),
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
                html: this.buildHtml({
                    title: 'Сброс пароля',
                    body: `<p style="color:#374151;line-height:1.6;margin:0">Нажмите кнопку ниже, чтобы задать новый пароль. Ссылка действительна <strong>1 час</strong>.</p>`,
                    buttonText: 'Сбросить пароль',
                    buttonUrl: resetLink,
                    disclaimer: 'Если вы не запрашивали сброс пароля, проигнорируйте это письмо.'
                }),
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
                html: this.buildHtml({
                    title: 'Аккаунт будет удалён завтра',
                    body: `<p style="color:#374151;line-height:1.6;margin:0">Здравствуйте, <strong>${username}</strong>! Ваш аккаунт не был активирован и будет удалён завтра. Чтобы сохранить его, нажмите кнопку ниже.</p>`,
                    buttonText: 'Активировать аккаунт',
                    buttonUrl: activationUrl,
                    disclaimer: null
                }),
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
                html: this.buildHtml({
                    title: 'Подтверждение смены email',
                    body: `<p style="color:#374151;line-height:1.6;margin:0">Здравствуйте, <strong>${username}</strong>! Вы запросили смену email в PrintCalc. Нажмите кнопку ниже, чтобы подтвердить новый адрес.</p>`,
                    buttonText: 'Подтвердить новый email',
                    buttonUrl: link,
                    disclaimer: 'Если вы не запрашивали смену email, проигнорируйте это письмо — ваш текущий email останется без изменений.'
                }),
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
                html: this.buildHtml({
                    title: 'Добро пожаловать в PrintCalc!',
                    body: `<p style="color:#374151;line-height:1.6;margin:0">Здравствуйте, <strong>${username}</strong>! Ваш аккаунт успешно активирован. Теперь вам доступны все функции сервиса.</p>`,
                    buttonText: 'Перейти в PrintCalc',
                    buttonUrl: process.env.CLIENT_URL,
                    disclaimer: null
                }),
            });
            console.log(`📧 Welcome email sent to ${to}`);
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);
        }
    }
}

module.exports = new MailService();
