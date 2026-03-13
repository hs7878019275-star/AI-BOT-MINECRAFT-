const mineflayer = require('mineflayer');
const { pathfinder, goals, Movements } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const autototem = require('mineflayer-auto-totem');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// CONFIG - Use Environment Variables for Security
const MASTER_NAME = process.env.MASTER_NAME || 'AEBoi91'; 
const host = process.env.MC_HOST || 'lol_smp.aternos.me';
const port = parseInt(process.env.MC_PORT) || 18949; 

app.get('/', (req, res) => {
    res.send("<h1>AEBoi91 Elite Guard is Online</h1>");
});

let bot;

function startBot() {
    bot = mineflayer.createBot({ host, port, username: 'AEBoi91', version: '1.21.1', auth: 'offline' });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(autototem);

    bot.on('spawn', () => {
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove);
        bot.armorManager.equipAll();
        console.log("Guard Spawned and Ready.");
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
            const dist = bot.entity.position.distanceTo(enemy.position);
            if (dist > 15 && dist < 40) throwPearl(enemy.position);
            if (dist < 4.5) {
                bot.lookAt(enemy.position.offset(0, 1.6, 0));
                bot.attack(enemy);
            } else {
                bot.pathfinder.setGoal(new goals.GoalFollow(enemy, 2));
            }
        } else if (master) {
            const distM = bot.entity.position.distanceTo(master.position);
            if (distM > 20) {
                if (distM > 35) throwPearl(master.position);
                bot.pathfinder.setGoal(new goals.GoalFollow(master, 10));
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

server.listen(process.env.PORT || 3000, '0.0.0.0', () => startBot());
