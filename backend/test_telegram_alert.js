// test_telegram_alert.js
require('dotenv').config();
const { sendTelegramNotification } = require('./src/services/telegramService');
const { sendAttackNotification } = require('./src/services/emailService');

async function test() {
    const fakeThreatObj = {
        grupo: "TEST_RANSOM_GANG",
        vitima: "Empresa Fictícia BR",
        data_incidente: new Date().toISOString(),
        url: "https://example.com/test-alert",
        pais: "Brasil(BR)"
    };

    const reportText = `Este é um alerta de teste automatizado. 
    Se você está lendo isso, a notificação está funcionando.`;

    console.log("Iniciando envio de teste exclusivo para o Telegram...");
    // await sendAttackNotification(reportText, fakeThreatObj);
    
    await sendTelegramNotification(reportText, fakeThreatObj);

    console.log("Teste finalizado.");
}

test();
