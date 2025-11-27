const axios = require("axios");

async function checkStatus() {
    try {
        const response = await axios.get("http://localhost:3000/api/status");
        console.log("Server Status:", response.data);
    } catch (error) {
        console.error("Error checking status:", error.message);
    }
}

checkStatus();
