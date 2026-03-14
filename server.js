const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin
const armorManager = require('mineflayer-armor-manager')
const autoTotem = require('mineflayer-auto-totem')
const collectBlock = require('mineflayer-collectblock').plugin
const Vec3 = require('vec3')
const express = require('express')
const mcDataLoader = require('minecraft-data')

// ---------- KEEP ALIVE SERVER ----------
const app = express()
app.get('/', (req,res) => res.send("Bot running"))
app.listen(process.env.PORT || 3000)

// ---------- CONFIG ----------
const HOST = "Hermeet.aternos.me"
const PORT = 14512
const VERSION = "1.21.1"
const USERNAME = "AEBoi91"
const OWNER = "Hermeet_playzz1"
const PASSWORD = "HERMEET7878OM"

let bot
let guardMode = false
let grindMode = false
let combatCooldown = 0

// ---------- START BOT ----------
function startBot() {
    bot = mineflayer.createBot({ host: HOST, port: PORT, username: USERNAME, version: VERSION })

    bot.loadPlugin(pathfinder)
    bot.loadPlugin(pvp)
    bot.loadPlugin(armorManager)
    bot.loadPlugin(autoTotem)
    bot.loadPlugin(collectBlock)

    const mcData = mcDataLoader(bot.version)

    bot.once('spawn', () => {
        bot.pathfinder.setMovements(new Movements(bot))
        bot.armorManager.equipAll()
        console.log('Bot joined server')
    })

    // ---------- AUTO LOGIN ----------
    bot.on('message', msg => {
        const t = msg.toString()
        if(t.includes("/register")) bot.chat(`/register ${PASSWORD} ${PASSWORD}`)
        if(t.includes("/login")) bot.chat(`/login ${PASSWORD}`)
    })

    // ---------- OWNER COMMANDS ----------
    bot.on('chat', (user,msg) => {
        if(user !== OWNER) return
        if(msg === "guard") { guardMode = true; grindMode = false }
        if(msg === "grind") { grindMode = true; guardMode = false }
        if(msg === "stop") { guardMode = false; grindMode = false; bot.pvp.stop() }
    })

    // ---------- MAIN LOOP ----------
    bot.on('physicsTick', async () => {
        await autoEat()
        await autoSortInventory()
        await totemClutch()

        if(grindMode) {
            await autoGrind(mcData)
        }

        if(guardMode) {
            const enemy = findEnemy()
            if(enemy) await proCombat(enemy)
        }
    })

    // ---------- AUTO DEFENSE ----------
    bot.on('entityHurt', async (entity) => {
        if(!grindMode && !guardMode) return
        if(!entity) return
        if(entity.username === OWNER) return
        const attacker = bot.nearestEntity(e => (e.type === 'player' || e.type === 'mob') && e.id !== bot.entity.id)
        if(!attacker) return
        console.log(`Under attack by ${attacker.username || attacker.mobType}, engaging combat!`)
        await proCombat(attacker)
    })

    // ---------- RECONNECT ----------
    bot.on("end", () => { console.log("Disconnected. Reconnecting in 10s..."); setTimeout(startBot, 10000) })
    bot.on("error", err => console.log("Error:", err))
}

// ---------- UTILITIES ----------
function findEnemy() {
    return bot.nearestEntity(e => e.type === "player" && e.username !== OWNER)
}

// ---------- AUTO EAT ----------
async function autoEat() {
    if(bot.food >= 18 || bot.isEating) return
    const food = bot.inventory.items().find(i => ["bread","beef","pork","chicken","golden_apple"].some(f => i.name.includes(f)))
    if(!food) return
    try{
        await bot.equip(food,"hand")
        bot.activateItem()
        const interval = setInterval(() => {
            if(bot.food >= 20){ bot.deactivateItem(); clearInterval(interval) }
        },500)
    }catch{}
}

// ---------- INVENTORY SORT ----------
async function autoSortInventory() {
    const items = bot.inventory.items()
    const sword = items.find(i => i.name.includes("sword"))
    const axe = items.find(i => i.name.includes("axe"))
    const shield = items.find(i => i.name === "shield")
    try{
        if(sword) await bot.equip(sword,"hand")
        else if(axe) await bot.equip(axe,"hand")
        if(shield) await bot.equip(shield,"off-hand")
    }catch{}
}

// ---------- TOTEM CLUTCH ----------
async function totemClutch() {
    if(bot.health > 8) return
    const t = bot.inventory.items().find(i => i.name === "totem_of_undying")
    if(!t) return
    await bot.equip(t,"off-hand")
}

// ---------- GRIND ----------
async function autoGrind(mcData) {
    await mineOres()
    await chopTrees()
}

// Auto diamond/iron/coal mining
async function mineOres() {
    const block = bot.findBlock({ matching:b => ["diamond_ore","iron_ore","coal_ore"].includes(b.name), maxDistance:64 })
    if(!block) return
    try{ await bot.collectBlock.collect(block) }catch{}
}

// Tree chopping
async function chopTrees() {
    const log = bot.findBlock({ matching:b => b.name.includes("log"), maxDistance:32 })
    if(!log) return
    try{ await bot.collectBlock.collect(log) }catch{}
}

// ---------- COMBAT ----------
async function proCombat(enemy) {
    if(!enemy || combatCooldown > Date.now()) return

    const dist = bot.entity.position.distanceTo(enemy.position)
    bot.lookAt(enemy.position)

    // ---- Offensive PvP abilities ----
    await axeAttack(enemy)
    await swordAttack(enemy)
    await maceSmash(enemy)
    await windCharge(enemy)
    await cobwebTrap(enemy)
    await pearlEscape(enemy)
    await shieldBlock(enemy)

    combatCooldown = Date.now() + 500 // 0.5s cooldown between combos
}

// Axe attack
async function axeAttack(enemy){
    const axe = bot.inventory.items().find(i => i.name.includes("axe"))
    if(!axe) return
    await bot.equip(axe,"hand")
    bot.attack(enemy)
}

// Sword attack
async function swordAttack(enemy){
    const sword = bot.inventory.items().find(i => i.name.includes("sword"))
    if(!sword) return
    await bot.equip(sword,"hand")
    bot.attack(enemy)
}

// Mace smash (if you have custom weapon)
async function maceSmash(enemy){
    const mace = bot.inventory.items().find(i => i.name.includes("mace"))
    if(!mace) return
    await bot.equip(mace,"hand")
    bot.attack(enemy)
}

// Wind charge
async function windCharge(enemy){
    const wind = bot.inventory.items().find(i => i.name === "wind_charge")
    if(!wind) return
    const dist = bot.entity.position.distanceTo(enemy.position)
    if(dist<6 || dist>18) return
    await bot.equip(wind,"hand")
    await bot.lookAt(enemy.position.offset(0,1,0))
    bot.activateItem()
}

// Cobweb trap
async function cobwebTrap(enemy){
    const web = bot.inventory.items().find(i => i.name==="cobweb")
    if(!web) return
    const dist = bot.entity.position.distanceTo(enemy.position)
    if(dist>3) return
    const block = bot.blockAt(enemy.position.offset(0,-1,0))
    if(!block) return
    try{ await bot.equip(web,"hand"); await bot.placeBlock(block,new Vec3(0,1,0)) }catch{}
}

// Pearl escape / chase
async function pearlEscape(enemy){
    if(bot.health>6) return
    const pearl = bot.inventory.items().find(i=>i.name==="ender_pearl")
    if(!pearl) return
    await bot.equip(pearl,"hand")
    const pos = bot.entity.position.offset(
        (bot.entity.position.x-enemy.position.x)*2,
        2,
        (bot.entity.position.z-enemy.position.z)*2
    )
    await bot.lookAt(pos)
    bot.activateItem()
}

// Shield defense
async function shieldBlock(enemy){
    const shield = bot.inventory.items().find(i=>i.name==="shield")
    if(!shield) return
    await bot.equip(shield,"off-hand")
}

// ---------- START ----------
startBot()
