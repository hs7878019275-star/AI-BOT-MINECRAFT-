const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin
const armorManager = require('mineflayer-armor-manager')
const autoTotem = require('mineflayer-auto-totem')
const collectBlock = require('mineflayer-collectblock').plugin
const Vec3 = require('vec3')
const express = require('express')

const app = express()
app.get('/', (req,res)=>res.send("Bot running"))
app.listen(process.env.PORT || 3000)

/* CONFIG */

const HOST="Hermeet.aternos.me"
const PORT=14512
const VERSION="1.21.1"

const OWNER="Hermeet_playzz1"
const PASSWORD="HERMEET7878OM"

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

const t = msg.toString()

if(t.includes("/register"))
bot.chat(`/register ${PASSWORD} ${PASSWORD}`)

if(t.includes("/login"))
bot.chat(`/login ${PASSWORD}`)

})

/* OWNER COMMANDS */

bot.on('chat',(user,msg)=>{

if(user!==OWNER) return

if(msg==="guard"){
guardMode=true
grindMode=false
}

if(msg==="grind"){
grindMode=true
guardMode=false
}

if(msg==="stop"){
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

}

if(guardMode){

const enemy = findEnemy()

if(enemy)
proCombat(enemy)

}

})

/* RECONNECT */

bot.on("end",()=>{

console.log("Reconnecting...")

setTimeout(startBot,10000)

})

bot.on("error",err=>console.log(err))

}

/* FIND ENEMY */

function findEnemy(){

return bot.nearestEntity(e=>{
if(e.type!=="player") return false
if(e.username===OWNER) return false
return true
})

}

/* PREDICT MOVEMENT */

function predict(enemy){

const v = enemy.velocity

return enemy.position.offset(
v.x*3,
v.y*3,
v.z*3
)

}

/* AXE SHIELD BREAK */

async function axeAttack(enemy){

const axe = bot.inventory.items().find(i=>i.name.includes("axe"))

if(!axe) return

await bot.equip(axe,"hand")

bot.attack(enemy)

}

/* MACE SMASH */

async function maceSmash(enemy){

const mace = bot.inventory.items().find(i=>i.name==="mace")

if(!mace) return

const dist = bot.entity.position.distanceTo(enemy.position)

if(dist>5) return

await bot.equip(mace,"hand")

bot.setControlState('jump',true)

setTimeout(()=>{
bot.setControlState('jump',false)
},300)

setTimeout(()=>{
bot.attack(enemy)
},450)

}

/* WIND CHARGE PVP */

async function windChargePvp(enemy){

const wind = bot.inventory.items().find(i=>i.name==="wind_charge")

if(!wind) return

const dist = bot.entity.position.distanceTo(enemy.position)

if(dist < 6 || dist > 18) return

await bot.equip(wind,"hand")

await bot.lookAt(enemy.position.offset(0,1,0))

bot.activateItem()

bot.setControlState('forward',true)

setTimeout(()=>{
bot.setControlState('forward',false)
},1200)

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

const t = bot.inventory.items().find(i=>i.name==="totem_of_undying")

if(!t) return

await bot.equip(t,"off-hand")

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

/* PRO COMBAT */

async function proCombat(enemy){

const dist = bot.entity.position.distanceTo(enemy.position)

const side=Math.random()>0.5?2:-2

const pos = enemy.position.offset(side,0,side)

bot.pathfinder.setGoal(
new goals.GoalBlock(pos.x,pos.y,pos.z)
)

const predicted = predict(enemy)

bot.lookAt(predicted)

await windChargePvp(enemy)

await maceSmash(enemy)

if(dist<4)
axeAttack(enemy)

cobwebTrap(enemy)

autoShield(enemy)

totemClutch()

pearlEscape(enemy)

}

/* GRIND */

async function mineDiamonds(){

const block = bot.findBlock({
matching:b=>b.name.includes("diamond_ore"),
maxDistance:64
})

if(!block) return

await bot.collectBlock.collect(block)

}

async function farmCrops(){

const crop = bot.findBlock({
matching:b=>b.name==="wheat",
maxDistance:32
})

if(!crop) return

await bot.collectBlock.collect(crop)

}

async function chopTrees(){

const log = bot.findBlock({
matching:b=>b.name.includes("log"),
maxDistance:32
})

if(!log) return

await bot.collectBlock.collect(log)

}

/* START BOT */

startBot()
