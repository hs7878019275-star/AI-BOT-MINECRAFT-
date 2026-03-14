const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin
const armorManager = require('mineflayer-armor-manager')
const autoTotem = require('mineflayer-auto-totem')
const collectBlock = require('mineflayer-collectblock').plugin
const Vec3 = require('vec3')
const express = require('express')

/* WEB SERVER */

const app = express()
app.get('/', (req,res)=>res.send("Bot running"))
app.listen(process.env.PORT || 3000)

/* CONFIG */

const HOST="Hermeet.aternos.me"
const PORT=14512
const VERSION="1.20.4"

const OWNER="Hermeet_playzz1"
const PASSWORD="HERMEET7878OM"

const STORAGE = new Vec3(0,64,0)

let bot
let guardMode=false
let grindMode=false

function startBot(){

bot = mineflayer.createBot({
host:HOST,
port:PORT,
username:"AEBoi91",
version:VERSION
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(pvp)
bot.loadPlugin(armorManager)
bot.loadPlugin(autoTotem)
bot.loadPlugin(collectBlock)

bot.once('spawn',()=>{

const move = new Movements(bot)
bot.pathfinder.setMovements(move)

bot.armorManager.equipAll()

console.log("Bot joined server")

})

/* AUTO LOGIN */

bot.on('message',msg=>{

const text = msg.toString()

if(text.includes("/register"))
bot.chat(`/register ${PASSWORD} ${PASSWORD}`)

if(text.includes("/login"))
bot.chat(`/login ${PASSWORD}`)

})

/* OWNER COMMANDS */

bot.on('chat',(username,message)=>{

if(username!==OWNER) return

if(message==="guard"){
guardMode=true
grindMode=false
}

if(message==="grind"){
grindMode=true
guardMode=false
}

if(message==="stop"){
guardMode=false
grindMode=false
bot.pvp.stop()
}

})

/* MAIN LOOP */

bot.on('physicsTick',async()=>{

if(grindMode){

await mineDiamonds()
await farmCrops()
await chopTrees()
await xpFarm()
await villagerTrade()
await storeItems()

}

if(guardMode){

await defendRaid()

const enemy = findEnemy()

if(enemy)
proCombat(enemy)

}

})

/* RECONNECT */

bot.on("end",()=>{
console.log("Disconnected, reconnecting...")
setTimeout(startBot,10000)
})

bot.on("error",err=>console.log(err))

}

/* ENEMY FINDER */

function findEnemy(){

return bot.nearestEntity(e=>{
if(e.type!=="player") return false
if(e.username===OWNER) return false
return true
})

}

/* PREDICTION */

function predict(enemy){

const v = enemy.velocity

return enemy.position.offset(
v.x*3,
v.y*3,
v.z*3
)

}

/* AXE ATTACK */

async function axeAttack(enemy){

const axe = bot.inventory.items().find(i=>i.name.includes("axe"))

if(!axe) return

await bot.equip(axe,"hand")

bot.lookAt(enemy.position.offset(0,1,0))

bot.attack(enemy)

}

/* AUTO SHIELD */

async function autoShield(enemy){

const shield = bot.inventory.items().find(i=>i.name==="shield")

if(!shield) return

const dist = bot.entity.position.distanceTo(enemy.position)

if(dist<4){

await bot.equip(shield,"off-hand")

bot.activateItem()

}

}

/* TOTEM CLUTCH */

async function totemClutch(){

if(bot.health>8) return

const totem = bot.inventory.items().find(i=>i.name==="totem_of_undying")

if(!totem) return

await bot.equip(totem,"off-hand")

}

/* PEARL ESCAPE */

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

/* WIND CHARGE */

async function windChase(enemy){

const wind = bot.inventory.items().find(i=>i.name==="wind_charge")

if(!wind) return

const dist = bot.entity.position.distanceTo(enemy.position)

if(dist<10) return

await bot.equip(wind,"hand")

await bot.lookAt(enemy.position.offset(0,1,0))

bot.activateItem()

}

/* COBWEB TRAP */

async function cobwebTrap(enemy){

const web = bot.inventory.items().find(i=>i.name==="cobweb")

if(!web) return

const dist = bot.entity.position.distanceTo(enemy.position)

if(dist>3) return

const block = bot.blockAt(enemy.position.offset(0,-1,0))

if(!block) return

try{

await bot.equip(web,"hand")

await bot.placeBlock(block,new Vec3(0,1,0))

}catch{}

}

/* COMBAT */

async function proCombat(enemy){

const dist = bot.entity.position.distanceTo(enemy.position)

const side=Math.random()>0.5?2:-2

const pos = enemy.position.offset(side,0,side)

bot.pathfinder.setGoal(
new goals.GoalBlock(pos.x,pos.y,pos.z)
)

const predicted = predict(enemy)

bot.lookAt(predicted)

if(dist<4)
axeAttack(enemy)

cobwebTrap(enemy)

autoShield(enemy)

totemClutch()

pearlEscape(enemy)

windChase(enemy)

}

/* RAID DEFENSE */

async function defendRaid(){

const raider = bot.nearestEntity(e=>
e.type==="mob" &&
(
e.name==="pillager"||
e.name==="vindicator"||
e.name==="evoker"||
e.name==="ravager"
)
)

if(!raider) return

bot.pvp.attack(raider)

}

/* DIAMOND MINING */

async function mineDiamonds(){

const block = bot.findBlock({
matching:b=>b.name.includes("diamond_ore"),
maxDistance:64
})

if(!block) return

await bot.collectBlock.collect(block)

}

/* FARM CROPS */

async function farmCrops(){

const crop = bot.findBlock({
matching:b=>b.name==="wheat",
maxDistance:32
})

if(!crop) return

await bot.collectBlock.collect(crop)

}

/* TREE FARM */

async function chopTrees(){

const log = bot.findBlock({
matching:b=>b.name.includes("log"),
maxDistance:32
})

if(!log) return

await bot.collectBlock.collect(log)

}

/* XP FARM */

async function xpFarm(){

const mob = bot.nearestEntity(e=>
e.type==="mob" &&
(
e.name==="zombie"||
e.name==="skeleton"||
e.name==="spider"
)
)

if(!mob) return

bot.pvp.attack(mob)

}

/* VILLAGER TRADE */

async function villagerTrade(){

const villager = bot.nearestEntity(e=>e.name==="villager")

if(!villager) return

}

/* STORAGE */

async function storeItems(){

const chest = bot.findBlock({
matching:b=>b.name.includes("chest"),
maxDistance:32
})

if(!chest) return

}

/* START BOT */

startBot()
