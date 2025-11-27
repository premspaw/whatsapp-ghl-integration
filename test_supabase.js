const db = require("./db");

async function checkMessages() {
    console.log("Checking Supabase messages...");
    const history = await db.getChatHistory("+918123133382", 10);
    console.log("Recent Messages:");
    console.log(JSON.stringify(history, null, 2));
}

checkMessages();
