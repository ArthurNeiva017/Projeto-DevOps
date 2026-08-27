const axios = require('axios');
require('dotenv').config();

function formatDate(dateString) {
    if (!dateString) return 'Data Desconhecida';
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function escapeHTML(text) {
    if (!text) return text;
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function sendTelegramNotification(reportText, attack) {
    const botTokensStr = process.env.TELEGRAM_BOT_TOKEN;
    const chatIdsStr = process.env.TELEGRAM_CHAT_ID;

    if (!botTokensStr || !chatIdsStr) {
        console.warn('Telegram bot token ou chat ID não configurados no .env. Pule o envio para o Telegram.');
        return false;
    }

    const botTokens = botTokensStr.split(',').map(t => t.trim()).filter(t => t);
    const chatIds = chatIdsStr.split(',').map(c => c.trim()).filter(c => c);

    if (botTokens.length === 0 || chatIds.length === 0) {
        console.warn('Telegram bot tokens ou chat IDs inválidos após o parser.');
        return false;
    }

    const textBody = `🚨 <b>Alerta de Segurança Cibernética – Incidente de Ransomware Detectado no Brasil</b> 🚨

A plataforma Cyber Threat Hub identificou um novo incidente de ransomware envolvendo uma organização localizada no Brasil.

O evento foi detectado a partir de fontes públicas de inteligência de ameaças e pode indicar atividade recente de grupos de ransomware atuando na região.

🔎 <b>Detalhes do Incidente:</b>

👾 <b>Grupo de Ransomware:</b> ${escapeHTML(attack.grupo)}

🏢 <b>Organização Vítima:</b> ${escapeHTML(attack.vitima)}

📅 <b>Data da Detecção:</b> ${escapeHTML(formatDate(attack.data_incidente))}

🌏 <b>País:</b> Brasil(BR)

🔎 <b>Fonte do Incidente:</b>
${escapeHTML(attack.url)}`;

    try {
        const promises = [];
        
        // Match tokens with chat IDs up to the length of whichever is shorter. 
        // Typically they should be paired (1 token : 1 chat id) or 1 token used for multiple chats. 
        // If there's 1 token and multiple chats, we send to all chats using that token.
        if (botTokens.length === 1 && chatIds.length > 1) {
            const token = botTokens[0];
            chatIds.forEach(chatId => {
                const url = `https://api.telegram.org/bot${token}/sendMessage`;
                promises.push(
                    axios.post(url, { chat_id: chatId, text: textBody, parse_mode: 'HTML' })
                        .then(() => console.log(`Notificação enviada ao Telegram (Chat: ${chatId}) com sucesso.`))
                        .catch(e => console.error(`Erro ao enviar para o Telegram (Chat: ${chatId}):`, e.response ? e.response.data : e.message))
                );
            });
        } else {
            // Pair each token with corresponding chat id by index
            const maxLen = Math.max(botTokens.length, chatIds.length);
            for (let i = 0; i < maxLen; i++) {
                const token = botTokens[i] || botTokens[botTokens.length - 1]; // fallback to last token
                const chatId = chatIds[i] || chatIds[chatIds.length - 1]; // fallback to last chat id
                const url = `https://api.telegram.org/bot${token}/sendMessage`;
                promises.push(
                    axios.post(url, { chat_id: chatId, text: textBody, parse_mode: 'HTML' })
                        .then(() => console.log(`Notificação enviada ao Telegram (Chat: ${chatId}) com sucesso.`))
                        .catch(e => console.error(`Erro ao enviar para o Telegram (Chat: ${chatId}):`, e.response ? e.response.data : e.message))
                );
            }
        }

        await Promise.allSettled(promises);
        return true;
    } catch (error) {
        console.error("Erro geral no envio de notificação do Telegram:", error.message);
        return false;
    }
}

module.exports = {
    sendTelegramNotification
};
