// test_teams_alert.js
require('dotenv').config();
const { sendTeamsNotification } = require('./src/services/teamsService');

async function test() {
    const fakeThreatObj = {
        grupo: "TEST_RANSOM_GANG",
        vitima: "Empresa Fictícia BR",
        data_incidente: new Date().toISOString(),
        url: "https://example.com/test-alert",
        pais: "Brasil(BR)",
        fonte: "Ransomware.Live"
    };

    const reportText = `Este é um alerta de teste automatizado. Se você está lendo isso, a notificação do Microsoft Teams está funcionando.`;

    console.log("Iniciando envio de teste exclusivo para o Teams...");
    
    await sendTeamsNotification(reportText, fakeThreatObj);

    console.log("Teste finalizado.");
}

test();
