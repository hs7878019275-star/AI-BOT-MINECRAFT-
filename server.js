const mineflayer = require('mineflayer');
const { pathfinder, goals, Movements } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const autototem = require('mineflayer-auto-totem');
const express = require('express');
const app = express();
const server = require('http').createServer(app);

// --- CONFIG ---
const MASTER_NAME = 'AEBoi91'; 
const MC_HOST = 'Hermeet.aternos.me';
const MC_PORT = 14512; 

// Keep-alive web server
app.get('/', (req, res) => {
    res.send("<h1 style='color:blue;text-align:center;'>AEBoi91 Guard is Running!</h1>");
});

let bot;

function startBot() {
    console.log(`🚀 Connecting to ${MC_HOST}:${MC_PORT}...`);
    
    bot = mineflayer.createBot({
        host: MC_HOST,
        port: MC_PORT,
        username: 'AEBoi91',
        version: '1.21.1',
        auth: 'offline'
    });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(autototem);

    bot.on('spawn', () => {
        console.log("✅ Bot joined the server!");
        bot.pathfinder.setMovements(new Movements(bot));
        bot.armorManager.equipAll();
        bot.mode = 'guard'; 
    });

    bot.on('physicsTick', async () => {
        if (!bot.entity || bot.mode !== 'guard') return;
        
        bot.autototem.equip(); 

        const master = bot.players[MASTER_NAME]?.entity;
        const enemy = bot.nearestEntity(e => 
            (e.type === 'mob' || (e.type === 'player' && e.username !== bot.username)) && 
            e.username !== MASTER_NAME
        );

        if (enemy) {
            const distE = bot.entity.position.distanceTo(enemy.position);
            if (distE > 15 && distE < 40) throwPearl(enemy.position);
            
            if (distE < 4.5) {
                bot.lookAt(enemy.position.offset(0, 1.6, 0));
                bot.attack(enemy);
            } else {
                bot.pathfinder.setGoal(new goals.GoalFollow(enemy, 2));
            }
        } else if (master) {
            const distM = bot.entity.position.distanceTo(master.position);
            if (distM > 20) {
                if (distM > 35) throwPearl(master.position);
                bot.pathfinder.setGoal(new goals.GoalFollow(master, 12));
            } else if (distM < 10) {
                bot.pathfinder.setGoal(null);
            }
        }
    });

    // Handle connection drops
    bot.on('end', () => {
        console.log("Disconnected. Reconnecting in 15 seconds...");
        setTimeout(startBot, 15000);
    });

    bot.on('error', (err) => console.log("Bot Error:", err.message));
}

async function throwPearl(pos) {
    const pearl = bot.inventory.items().find(i => i.name === 'ender_pearl');
    if (pearl) {
        await bot.equip(pearl, 'hand');
        await bot.lookAt(pos.offset(0, 4, 0));
        bot.activateItem();
    }
}

server.listen(process.env.PORT || 3000, () => startBot());
