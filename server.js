const mineflayer = require('mineflayer');
const { pathfinder, goals, Movements } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const { autototem } = require('mineflayer-auto-totem');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// --- MASTER CONFIG ---
const MASTER_NAME = 'AEBoi91'; 
const host = 'lol_smp.aternos.me';
const port = 18949; 

// --- WEB PANEL ---
app.get('/', (req, res) => {
    res.send(`
    <html><body style="background:#000;color:#0f0;text-align:center;font-family:monospace;">
    <h1>🛡️ AEBoi91 ELITE GUARD 🛡️</h1>
    <div id="log" style="height:200px;border:1px solid #333;overflow-y:scroll;margin:20px;padding:10px;text-align:left;"></div>
    <button style="padding:15px;background:#222;color:#0f0;border:1px solid #0f0;" onclick="s('guard')">BODYGUARD MODE</button>
    <button style="padding:15px;background:#222;color:#0f0;border:1px solid #0f0;" onclick="s('stop')">IDLE</button>
    <script src="/socket.io/socket.io.js"></script>
    <script>const socket = io(); function s(m){socket.emit('mode', m);} socket.on('chat', c=>{const l=document.getElementById('log');l.innerHTML+='<div>'+c+'</div>';l.scrollTop=l.scrollHeight;});</script>
    </body></html>`);
});

let bot;

function startBot() {
    bot = mineflayer.createBot({ host, port, username: 'AEBoi91', version: '1.21.1', auth: 'offline' });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(autototem);

    bot.on('spawn', () => {
        console.log("Elite Guard Spawned!");
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove);
        bot.armorManager.equipAll();
    });

    bot.on('physicsTick', async () => {
        if (!bot.entity || bot.mode !== 'guard') return;

        // 1. AUTO-TOTEM / AUTO-SHIELD
        bot.autototem.equip();

        const master = bot.players[MASTER_NAME]?.entity;
        if (!master) return;

        const distToMaster = bot.entity.position.distanceTo(master.position);

        // 2. ENEMY DETECTION
        const enemy = bot.nearestEntity(e => 
            (e.type === 'mob' || (e.type === 'player' && e.username !== bot.username)) && 
            e.username !== MASTER_NAME
        );

        // 3. COMBAT & PEARL LOGIC
        if (enemy) {
            const distToEnemy = bot.entity.position.distanceTo(enemy.position);

            // Pearl to enemy if they are running away
            if (distToEnemy > 15 && distToEnemy < 40) throwPearl(enemy.position);

            if (distToEnemy < 4.5) {
                bot.lookAt(enemy.position.offset(0, 1.6, 0));
                bot.attack(enemy);
            } else {
                bot.pathfinder.setGoal(new goals.GoalFollow(enemy, 2));
            }
        } 
        // 4. SMART FOLLOW (10-20 Blocks)
        else {
            if (distToMaster > 20) {
                // Pearl to master if too far
                if (distToMaster > 35) throwPearl(master.position);
                bot.pathfinder.setGoal(new goals.GoalFollow(master, 10));
            } else if (distToMaster < 10) {
                bot.pathfinder.setGoal(null); // Stop if in the "Safe Zone"
            }
        }
    });

    bot.on('message', m => io.emit('chat', m.toString()));
    bot.on('end', () => setTimeout(startBot, 5000));
}

async function throwPearl(pos) {
    const pearl = bot.inventory.items().find(i => i.name === 'ender_pearl');
    if (pearl) {
        await bot.equip(pearl, 'hand');
        await bot.lookAt(pos.offset(0, 4, 0)); // Arc the throw
        bot.activateItem();
    }
}

io.on('connection', s => s.on('mode', m => { bot.mode = m; }));
server.listen(3000, '0.0.0.0', () => startBot());
                                                            
