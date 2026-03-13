const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const { SwordPvP } = require('@nxg-org/mineflayer-custom-pvp');
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

function initBot() {
    if (bot) { bot.quit(); }
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
        io.emit('chat', "[SYSTEM] AEBoi91 is Online!");
        bot.armorManager.equipAll();
    });

    bot.on('spawn', () => {
        setInterval(() => { if(bot.entity) bot.swingArm('right'); }, 30000);
    });

    bot.on('physicsTick', () => {
        if (bot.mode === 'guard' || bot.mode === 'grind') {
            const filter = e => (bot.mode === 'grind' ? e.type === 'mob' : e.type === 'player' && e.username !== bot.username);
            const target = bot.nearestEntity(filter);
            if (target && bot.entity.position.distanceTo(target.position) < 5) {
                bot.lookAt(target.position.offset(0, 1.6, 0));
                bot.attack(target);
            }
        }
        if (bot.mode === 'twerk') bot.setControlState('sneak', !bot.getControlState('sneak'));
    });

    bot.on('message', m => io.emit('chat', m.toString()));
    bot.on('end', () => setTimeout(initBot, 10000));
    bot.on('error', (err) => console.log("Bot Error:", err));
}

initBot();

io.on('connection', (s) => {
    s.on('update', d => { Object.assign(botConfig, d); initBot(); });
    s.on('mode', m => { bot.mode = (bot.mode === m) ? null : m; io.emit('chat', `Mode: ${bot.mode || 'IDLE'}`); });
    s.on('ai', async (m) => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const res = await model.generateContent(m);
            bot.chat(res.response.text());
        } catch (e) { io.emit('chat', "[AI ERROR]"); }
    });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
server.listen(3000);
