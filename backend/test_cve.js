const axios = require('axios');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function testCVE() {
    try {
        const apiKey = process.env.CVEFEED_API_KEY;
        if (!apiKey) throw new Error('Defina CVEFEED_API_KEY no ambiente');
        const response = await axios.get('https://cvefeed.io/api/vulnerability/CVE-2024-21412/', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });
        console.log("Success:", Object.keys(response.data));
    } catch (err) {
        console.error("Error:", err.message);
        if (err.response) {
            console.error("Data:", err.response.data);
            console.error("Status:", err.response.status);
        }
    }
}

testCVE();
