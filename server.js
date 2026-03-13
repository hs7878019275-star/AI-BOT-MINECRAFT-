const mineflayer = require('mineflayer');
const { pathfinder, goals, movements } = require('mineflayer-pathfinder');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;
let bot;

// Start Web Server first so Render is happy
server.listen(PORT, () => {
    console.log(`Web Portal active on port ${PORT}`);
    startBot();
});

function startBot() {
    if (bot) bot.quit();

    bot = mineflayer.createBot({
        host: 'lol_smp.aternos.me',
        port: 18949,
        username: 'AEBoi91',
        version: '1.21.1',
        auth: 'offline'
    });

    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        console.log("AEBoi91 has spawned in the world!");
        io.emit('chat', "AEBoi91 is now ONLINE");
    });

    bot.on('chat', (username, message) => {
        io.emit('chat', `${username}: ${message}`);
    });

    bot.on('error', (err) => console.log("Bot Error: ", err));
    
    // Auto-reconnect if it kicks us
    bot.on('end', () => {
        console.log("Disconnected. Retrying in 10 seconds...");
        setTimeout(startBot, 10000);
    });
}

app.get('/', (req, res) => {
    res.send("<h1>AEBoi91 Bot Portal is Running</h1><p>Check logs for Minecraft status.</p>");
});
              
