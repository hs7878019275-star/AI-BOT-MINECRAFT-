const mineflayer = require('mineflayer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

let botConfig = { host: 'play.pikanetwork.net', username: 'AEBoi91', version: '1.21.1' };
const genAI = new GoogleGenerativeAI("AIzaSyCexqmt2cbtXsbz7d0mbfs8trACX8VElSk");
let bot;

function initBot() {
    if (bot) bot.quit();
    bot = mineflayer.createBot({ host: botConfig.host, username: botConfig.username, version: botConfig.version, auth: 'offline' });
    
    bot.on('login', () => io.emit('chat', `[LIVE] AEBoi91 joined ${botConfig.host}`));
    bot.on('message', (m) => io.emit('chat', m.toString()));
    bot.on('end', () => setTimeout(initBot, 15000));
}

initBot();

io.on('connection', (s) => {
    s.on('update', (d) => {
        botConfig.host = d.host || botConfig.host;
        botConfig.username = d.name || botConfig.username;
        botConfig.version = d.ver || botConfig.version;
        initBot();
    });
    s.on('ai', async (m) => {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const res = await model.generateContent(`You are AEBoi91. Respond short: ${m}`);
        bot.chat(res.response.text());
    });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
server.listen(3000);
          
