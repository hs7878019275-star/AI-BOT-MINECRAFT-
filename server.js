const mineflayer = require('mineflayer');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const { SwordPvP } = require('@nxg-org/mineflayer-custom-pvp');
const armorManager = require('mineflayer-armor-manager');
const autototem = require('mineflayer-auto-totem');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// --- CONFIGURATION ---
let bot;
let botConfig = { 
    host: 'lol_smp.aternos.me', 
    port: 18949, 
    username: 'AEBoi91', 
    version: '1.21.1' 
};
const genAI = new GoogleGenerativeAI("AIzaSyCexqmt2cbtXsbz7d0mbfs8trACX8VElSk");

function initBot() {
    if (bot) bot.quit();
    
    bot = mineflayer.createBot({
        host: botConfig.host,
        port: botConfig.port,
        username: botConfig.username,
        version: botConfig.version,
        auth: 'offline',
        checkTimeoutInterval: 60000
    });

    // Load Plugins
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(autototem);

    bot.on('login', () => {
        io.emit('chat', `[SYSTEM] AEBoi91 Logged into ${botConfig.host}`);
        bot.armorManager.equipAll();
    });

    bot.on('spawn', () => {
        bot.chat("AEBoi91 God Bot is Active!");
        // Anti-AFK Swing
        setInterval(() => { if(bot.entity) bot.swingArm('right'); }, 30000);
    });

    // --- GOD MODE CORE LOGIC ---
    bot.on('physicsTick', () => {
        // Killaura & Mob Grind Logic
        if (bot.mode === 'guard' || bot.mode === 'grind') {
            const target = bot.nearestEntity(e => {
                if (bot.mode === 'grind') return e.type === 'mob';
                return e.type === 'player' && e.username !== bot.username;
            });

            if (target && bot.entity.position.distanceTo(target.position) < 5) {
                bot.lookAt(target.position.offset(0, 1.6, 0));
                bot.attack(target);
            }
        }

        // Twerk Logic
        if (bot.mode === 'twerk') {
            bot.setControlState('sneak', !bot.getControlState('sneak'));
        }

        // Spam Logic
        if (bot.mode === 'spam') {
            if (Date.now() % 3000 < 50) { // Spams every 3 seconds
                bot.chat("AEBoi91 is the KING of this server! | Join the God Bot Revolution");
            }
        }
    });

    bot.on('message', (jsonMsg) => io.emit('chat', jsonMsg.toString()));
    
    bot.on('end', (reason) => {
        io.emit('chat', `[RECONNECTING] Bot disconnected: ${reason}`);
        setTimeout(initBot, 10000);
    });

    bot.on('error', (err) => console.log(err));
}

initBot();

// --- CONTROLLER COMMUNICATION ---
io.on('connection', (socket) => {
    socket.on('update', (data) => {
        botConfig.host = data.host || botConfig.host;
        botConfig.port = data.port || botConfig.port;
        initBot();
    });

    socket.on('mode', (m) => {
        bot.mode = (bot.mode === m) ? null : m; // Toggle mode on/off
        io.emit('chat', `[MODE] AEBoi91 set to: ${bot.mode || 'IDLE'}`);
        if (m === 'stop') { bot.mode = null; bot.pathfinder.setGoal(null); }
    });

    socket.on('ai', async (userMsg) => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(`In Minecraft, respond as AEBoi91 God Bot: ${userMsg}`);
            bot.chat(result.response.text());
        } catch (e) {
            io.emit('chat', "[AI ERROR] Brain is overloaded.");
        }
    });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
server.listen(3000);

          
