const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const autototem = require('mineflayer-auto-totem');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

let bot;
let botConfig = { 
    host: 'lol_smp.aternos.me', 
    port: 18949, 
    username: 'AEBoi91', 
    version: '1.21.1' 
};
const genAI = new GoogleGenerativeAI("AIzaSyCexqmt2cbtXsbz7d0mbfs8trACX8VElSk");

function initBot() {
    // Safety: if a bot exists, remove all listeners before quitting
    if (bot) { 
        bot.removeAllListeners();
        try { bot.quit(); } catch(e) {} 
    }
    
    bot = mineflayer.createBot({
        host: botConfig.host,
        port: botConfig.port,
        username: botConfig.username,
        version: botConfig.version,
        auth: 'offline'
    });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(autototem);

    bot.on('login', () => {
        console.log("Logged in!");
        io.emit('chat', "[SYSTEM] AEBoi91 connected successfully!");
        // Small delay to ensure plugins are ready
        setTimeout(() => {
            if (bot.armorManager) bot.armorManager.equipAll();
        }, 2000);
    });

    bot.on('physicsTick', () => {
        // Only run if bot and bot.entity exist to prevent "Status 1" crash
        if (!bot || !bot.entity) return;

        if (bot.mode === 'guard' || bot.mode === 'grind') {
            const filter = e => (bot.mode === 'grind' ? e.type === 'mob' : e.type === 'player' && e.username !== bot.username);
            const target = bot.nearestEntity(filter);
            if (target && bot.entity.position.distanceTo(target.position) < 4.5) {
                bot.lookAt(target.position.offset(0, 1.6, 0));
                bot.attack(target);
            }
        }
        
        if (bot.mode === 'twerk') {
            bot.setControlState('sneak', !bot.getControlState('sneak'));
        }
    });

    bot.on('message', m => io.emit('chat', m.toString()));
    
    bot.on('end', () => {
        console.log("Disconnected. Reconnecting...");
        setTimeout(initBot, 10000);
    });

    bot.on('error', err => {
        console.log("Bot Error:", err);
    });
}

// Initialize the bot
initBot();

io.on('connection', (s) => {
    s.on('update', d => { 
        if(d.host) botConfig.host = d.host;
        if(d.port) botConfig.port = d.port;
        initBot(); 
    });
    s.on('mode', m => { 
        if (!bot) return;
        bot.mode = (bot.mode === m) ? null : m; 
        io.emit('chat', `[MODE] ${m} is now ${bot.mode ? 'ON' : 'OFF'}`); 
    });
    s.on('ai', async (m) => {
        if (!bot) return;
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const res = await model.generateContent(m);
            bot.chat(res.response.text());
        } catch (e) { io.emit('chat', "[AI ERROR] Problem with AI request."); }
    });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// Port handling for Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
            
