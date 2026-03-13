const mineflayer = require('mineflayer');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// --- CONFIG ---
const host = 'lol_smp.aternos.me';
const port = 18949; // Change this if you changed it in the dashboard!
const username = 'AEBoi91';

// --- THE PANEL (Built directly into the code) ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>AEBoi91 GOD PANEL</title>
        <style>
            body { background: #000; color: #0f0; font-family: monospace; text-align: center; }
            .btn { padding: 15px; margin: 5px; background: #222; border: 1px solid #0f0; color: #0f0; cursor: pointer; width: 150px; }
            #log { height: 200px; border: 1px solid #333; overflow-y: scroll; padding: 10px; text-align: left; background: #050505; }
        </style>
    </head>
    <body>
        <h1>🛡️ AEBoi91 CONTROL 🛡️</h1>
        <div id="log">Waiting for connection...</div>
        <button class="btn" onclick="send('guard')">GUARD AREA</button>
        <button class="btn" onclick="send('grind')">GRIND MOBS</button>
        <button class="btn" onclick="send('stop')">STOP</button>
        <br><br>
        <input type="text" id="m" style="width:70%; padding:10px;" placeholder="Send AI Command...">
        <button class="btn" style="width:20%" onclick="ask()">SEND</button>

        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            function send(type) { socket.emit('mode', type); }
            function ask() { socket.emit('ai', document.getElementById('m').value); document.getElementById('m').value=''; }
            socket.on('chat', m => { const l=document.getElementById('log'); l.innerHTML += '<div>' + m + '</div>'; l.scrollTop=l.scrollHeight; });
        </script>
    </body>
    </html>
    `);
});

// --- THE BRAIN ---
let bot;
function startBot() {
    console.log("🚀 Starting AEBoi91...");
    bot = mineflayer.createBot({ host, port, username, version: '1.21.1', auth: 'offline' });

    bot.on('login', () => {
        console.log("✅ Logged in to SMP!");
        io.emit('chat', "[SYSTEM] Bot is in the server.");
    });

    bot.on('physicsTick', () => {
        if (!bot.mode || !bot.entity) return;
        const filter = e => (bot.mode === 'grind' ? e.type === 'mob' : e.type === 'player' && e.username !== bot.username);
        const target = bot.nearestEntity(filter);
        if (target && bot.entity.position.distanceTo(target.position) < 4.5) {
            bot.attack(target);
        }
    });

    bot.on('message', m => io.emit('chat', m.toString()));
    bot.on('error', e => console.log("❌ Error: " + e.message));
    bot.on('end', () => setTimeout(startBot, 5000));
}

io.on('connection', (socket) => {
    socket.on('mode', m => { bot.mode = m; io.emit('chat', "Mode set: " + m); });
    socket.on('ai', m => bot.chat(m)); // Simple relay for now
});

server.listen(3000, '0.0.0.0', () => {
    console.log("🌍 PANEL IS LIVE!");
    startBot();
});
