const axios = require('axios');

async function sendTeamsNotification(reportText, threatObj) {
    const webhookUrlsStr = process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrlsStr) {
        console.warn('⚠️ Teams Webhook URL not found in .env (TEAMS_WEBHOOK_URL). Skipping Teams notification.');
        return false;
    }

    const webhooks = webhookUrlsStr.split(',').map(u => u.trim()).filter(u => u);
    if (webhooks.length === 0) {
        console.warn('⚠️ No valid Teams Webhooks found. Skipping.');
        return false;
    }

    let fonte = 'Desconhecida';
    if (threatObj.fonte) {
        const fonteLower = threatObj.fonte.toLowerCase();
        if (fonteLower.includes('ransomware')) {
            fonte = 'Ransomware Live';
        } else if (fonteLower.includes('ransomfeed')) {
            fonte = 'Ransom Feed';
        } else {
            fonte = threatObj.fonte;
        }
    }

    const payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "0076D7",
        "summary": `Novo Incidente Detectado: ${threatObj.vitima}`,
        "sections": [{
            "activityTitle": "🚨Novo Ataque Identificado - Brasil🚨",
            "facts": [
                { "name": "👾Grupo:", "value": threatObj.grupo },
                { "name": "🏢Vítima:", "value": threatObj.vitima },
                { "name": "📅Data:", "value": threatObj.data_incidente ? new Date(threatObj.data_incidente).toLocaleDateString('pt-BR') : 'Desconhecida' },
                { "name": "🌍Fonte:", "value": fonte }
            ],
            "markdown": true
        }],
        "potentialAction": [{
            "@type": "OpenUri",
            "name": "Ver Fonte do Incidente",
            "targets": [{
                "os": "default",
                "uri": threatObj.url
            }]
        }]
    };

    try {
        const promises = webhooks.map(url => 
            axios.post(url, payload)
                .then(() => console.log(`✅ Teams Notification Sent for: ${threatObj.vitima} to ${url.substring(0, 30)}...`))
                .catch(e => console.error(`❌ Error sending to Teams Webhook ${url.substring(0, 30)}... :`, e.message))
        );
        
        await Promise.allSettled(promises);
        return true;
    } catch (error) {
        console.error('❌ Error sending Teams Notification:', error.message);
        return false;
    }
}

module.exports = { sendTeamsNotification };
