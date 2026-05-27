const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Envía un correo electrónico de notificación.
 * @param {string} subject Asunto del correo.
 * @param {string} body Cuerpo del correo.
 * @param {string} attachmentPath Ruta opcional de un archivo para adjuntar.
 */
async function sendEmail(subject, body, attachmentPath = null) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ No se ha configurado el SMTP en el archivo .env. Saltando envío de email.');
        return;
    }

    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: process.env.EMAIL_TO,
            subject: subject,
            text: body,
            html: body.replace(/\n/g, '<br>'),
            attachments: []
        };

        if (attachmentPath && fs.existsSync(attachmentPath)) {
            const fileName = attachmentPath.split(/[\\/]/).pop();
            mailOptions.attachments.push({
                filename: fileName,
                path: attachmentPath,
                cid: 'screenshot' // ID para referenciarlo en el HTML si fuera necesario
            });
            
            // Añadir la imagen al final del HTML de forma opcional
            mailOptions.html += `<br><br><img src="cid:screenshot" style="max-width: 100%; height: auto;">`;
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email enviado: %s', info.messageId);
    } catch (error) {
        console.error('❌ Error enviando email:', error);
    }
}

module.exports = { sendEmail };
