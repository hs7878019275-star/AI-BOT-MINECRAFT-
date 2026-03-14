const mineflayer = require('mineflayer');
const { pathfinder, goals, Movements } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const autototem = require('mineflayer-auto-totem');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// --- CONFIG ---
const MASTER_NAME = 'AEBoi91'; 
const MC_HOST = 'Hermeet.aternos.me';
const MC_PORT = 14512; 

app.get('/', (req, res) => {
    res.send("<h1 style='color:green;text-align:center;'>AEBoi91 Elite Guard is Online</h1>");
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
        console.log("✅ Spawned in SMP!");
        bot.pathfinder.setMovements(new Movements(bot));
        bot.armorManager.equipAll();
        bot.mode = 'guard'; // Set default mode
    });

    bot.on('physicsTick', async () => {
        if (!bot.entity || bot.mode !== 'guard') return;
        
        bot.autototem.equip(); // Auto-defense

        const master = bot.players[MASTER_NAME]?.entity;
        const enemy = bot.nearestEntity(e => 
            (e.type === 'mob' || (e.type === 'player' && e.username !== bot.username)) && 
            e.username !== MASTER_NAME
        );

        // COMBAT SYSTEM
        if (enemy) {
            const distE = bot.entity.position.distanceTo(enemy.position);
            if (distE > 15 && distE < 40) throwPearl(enemy.position);
            
            if (distE < 4.5) {
                bot.lookAt(enemy.position.offset(0, 1.6, 0));
                bot.attack(enemy);
            } else {
                bot.pathfinder.setGoal(new goals.GoalFollow(enemy, 2));
            }
        } 
        // SMART FOLLOW (10-20 Blocks)
        else if (master) {
            const distM = bot.entity.position.distanceTo(master.position);
            if (distM > 20) {
                if (distM > 35) throwPearl(master.position);
                bot.pathfinder.setGoal(new goals.GoalFollow(master, 12));
            } else if (distM < 10) {
                bot.pathfinder.setGoal(null);
            }
        }
    });

    bot.on('end', () => setTimeout(startBot, 10000));
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
