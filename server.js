const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin
const armorManager = require('mineflayer-armor-manager')
const autoTotem = require('mineflayer-auto-totem')
const collectBlock = require('mineflayer-collectblock').plugin
const Vec3 = require('vec3')

/* CONFIG */

const HOST = "Hermeet.aternos.me"
const PORT = 14512
const VERSION = "1.20.4"

const OWNER = "Hermeet_playzz1"
const PASSWORD = "HERMEET7878OM"

/* CHEST LOCATION YOU SET */
const STORAGE = new Vec3(0,64,0)

let bot
let grindMode=false
let guardMode=false

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

const movements=new Movements(bot)
bot.pathfinder.setMovements(movements)

bot.armorManager.equipAll()

})

/* LOGIN */

bot.on('message',msg=>{

const text=msg.toString()

if(text.includes("/register"))
bot.chat(`/register ${PASSWORD} ${PASSWORD}`)

if(text.includes("/login"))
bot.chat(`/login ${PASSWORD}`)

})

/* COMMANDS */

bot.on('chat',(u,m)=>{

if(u!==OWNER) return

if(m==="grind") grindMode=true
if(m==="guard") guardMode=true

if(m==="stop"){
grindMode=false
guardMode=false
bot.pvp.stop()
}

})

/* MAIN AI LOOP */

bot.on('physicsTick',async()=>{

if(grindMode){

await mineDiamonds()
await farmCrops()
await chopTrees()
await xpFarm()
await villagerTrade()
await storeItems()
sortInventory()

}

if(guardMode){

await defendRaid()

const enemy=findEnemy()

if(enemy){

strafe(enemy)

if(bot.entity.position.distanceTo(enemy.position)<4)
bot.pvp.attack(enemy)

pearlChase(enemy)
shieldBlock()
crystalAttack(enemy)

}

}

})

}

/* DIAMOND MINING */

async function mineDiamonds(){

const block=bot.findBlock({
matching:b=>b.name.includes("diamond_ore"),
maxDistance:64
})

if(!block) return

await bot.collectBlock.collect(block)

}

/* FARM CROPS */

async function farmCrops(){

const crop=bot.findBlock({
matching:b=>b.name==="wheat",
maxDistance:32
})

if(!crop) return

await bot.collectBlock.collect(crop)

}

/* TREE FARM */

async function chopTrees(){

const log=bot.findBlock({
matching:b=>b.name.includes("log"),
maxDistance:32
})

if(!log) return

await bot.collectBlock.collect(log)

}

/* XP FARM */

async function xpFarm(){

const mob=bot.nearestEntity(e=>
e.type==="mob" &&
(e.name==="zombie" || e.name==="skeleton" || e.name==="spider")
)

if(!mob) return

bot.pvp.attack(mob)

}

/* RAID DEFENSE */

async function defendRaid(){

const raider=bot.nearestEntity(e=>
e.type==="mob" &&
(
e.name==="pillager" ||
e.name==="vindicator" ||
e.name==="evoker" ||
e.name==="ravager"
)
)

if(!raider) return

bot.chat("Raid detected!")

bot.pvp.attack(raider)

}

/* VILLAGER TRADING */

async function villagerTrade(){

const villager=bot.nearestEntity(e=>e.name==="villager")

if(!villager) return

try{

const vill=await bot.openVillager(villager)

const trade=vill.trades[0]

if(trade)
await vill.trade(trade,1)

}catch{}

}

/* STORE ITEMS */

async function storeItems(){

const chestBlock=bot.blockAt(STORAGE)
if(!chestBlock) return

const chest=await bot.openChest(chestBlock)

for(const item of bot.inventory.items()){

if(item.name.includes("cobblestone") || item.name.includes("dirt"))
await chest.deposit(item.type,null,item.count)

}

}

/* SORT INVENTORY */

function sortInventory(){

bot.inventory.items().sort((a,b)=>a.name.localeCompare(b.name))

}

/* FIND ENEMY */

function findEnemy(){

return bot.nearestEntity(e=>{
if(e.type!=="player") return false
if(e.username===OWNER) return false
return true
})

}

/* STRAFE COMBAT */

function strafe(enemy){

const dir=Math.random()>0.5?1:-1
const pos=enemy.position.offset(dir*2,0,dir*2)

bot.pathfinder.setGoal(new goals.GoalBlock(pos.x,pos.y,pos.z))

}

/* PEARL CHASE */

async function pearlChase(enemy){

const pearl=bot.inventory.items().find(i=>i.name==="ender_pearl")
if(!pearl) return

await bot.equip(pearl,"hand")

bot.lookAt(enemy.position.offset(0,1,0))
bot.activateItem()

}

/* SHIELD */

function shieldBlock(){

const shield=bot.inventory.items().find(i=>i.name==="shield")

if(!shield) return

bot.equip(shield,"off-hand").then(()=>{
bot.activateItem()
})

}

/* CRYSTAL PVP */

async function crystalAttack(enemy){

const crystal=bot.inventory.items().find(i=>i.name==="end_crystal")
if(!crystal) return

const block=bot.blockAt(enemy.position.offset(0,-1,0))
if(!block) return

await bot.equip(crystal,"hand")

try{
await bot.placeBlock(block,new Vec3(0,1,0))
}catch{}

}

/* RECONNECT */

bot.on('end',()=>setTimeout(startBot,10000))
bot.on('error',err=>console.log(err))

startBot()
