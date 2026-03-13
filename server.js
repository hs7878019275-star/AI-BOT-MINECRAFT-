const mineflayer = require('mineflayer');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const autototem = require('mineflayer-auto-totem');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

let bot;
let botConfig = { host: 'lol_smp.aternos.me', port: 18949, username: 'AEBoi91', version: '1.21.1' };
const genAI = new GoogleGenerativeAI("AIzaSyCexqmt2cbtXsbz7d0mbfs8trACX8VElSk");

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Panel Live on port ${PORT}`);
    initBot(); 
});

function initBot() {
    if (bot) { bot.removeAllListeners(); try { bot.quit(); } catch(e) {} }
    
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

    bot.on('login', () => io.emit('chat', "[SYSTEM] AEBoi91 connected!"));
    
    bot.on('physicsTick', () => {
        if (!bot || !bot.entity || !bot.mode) return;
        if (bot.mode === 'guard' || bot.mode === 'grind') {
            const filter = e => (bot.mode === 'grind' ? e.type === 'mob' : e.type === 'player' && e.username !== bot.username);
            const target = bot.nearestEntity(filter);
            if (target && bot.entity.position.distanceTo(target.position) < 4) {
                bot.attack(target);
            }
        }
    });

    bot.on('message', m => io.emit('chat', m.toString()));
    bot.on('error', err => console.log("Bot Error:", err.message));
    bot.on('end', () => setTimeout(initBot, 10000));
}

io.on('connection', (s) => {
    s.on('update', d => { botConfig.host = d.host; botConfig.port = d.port; initBot(); });
    s.on('mode', m => { if(bot) bot.mode = (bot.mode === m) ? null : m; });
    s.on('ai', async (m) => {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const res = await model.generateContent(m);
        if(bot) bot.chat(res.response.text());
    });
});
