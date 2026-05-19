-- Echo of the Void - Boss System
-- Boss AI, stats, and behavior management

Boss = {}
Boss.__index = Boss

function Boss.new(config)
  local self = setmetatable({}, Boss)
  self.id = config.id or 1
  self.name = config.name or "Unknown Boss"
  self.description = config.description or ""
  self.rarity = config.rarity or "common"
  
  self.stats = {
    health = config.health or 500,
    maxHealth = config.maxHealth or 500,
    damage = config.damage or 45,
    attackSpeed = config.attackSpeed or 0.7,
    defense = config.defense or 25,
    speed = config.speed or 120,
  }
  
  self.position = {
    x = config.x or 800,
    y = config.y or 150,
    width = config.width or 96,
    height = config.height or 96,
  }
  
  self.state = 'idle' -- idle, attacking, hurt, defeated
  self.animationTime = 0
  self.attackCooldown = 0
  self.abilities = config.abilities or {}
  self.drops = config.drops or {}
  
  return self
end

function Boss:takeDamage(amount)
  local actualDamage = math.max(1, amount - (self.stats.defense / 2))
  self.stats.health = self.stats.health - actualDamage
  
  if self.stats.health <= 0 then
    self.stats.health = 0
    self.state = 'defeated'
    return true
  end
  
  self.state = 'hurt'
  return false
end

function Boss:getHealthPercent()
  return self.stats.health / self.stats.maxHealth
end

function Boss:attack()
  if self.attackCooldown <= 0 then
    self.state = 'attacking'
    self.attackCooldown = 1 / self.stats.attackSpeed
    return true
  end
  return false
end

function Boss:useAbility(abilityId)
  for _, ability in ipairs(self.abilities) do
    if ability.id == abilityId then
      return ability
    end
  end
  return nil
end

function Boss:update(delta, player)
  self.animationTime = self.animationTime + delta
  self.attackCooldown = self.attackCooldown - delta
  
  -- Distance to player
  local dx = player.x - self.position.x
  local dy = player.y - self.position.y
  local distance = math.sqrt(dx * dx + dy * dy)
  
  -- Simple AI behavior
  if self.state == 'idle' or self.state == 'defeated' then
    return
  end
  
  if distance < 300 then
    -- Player is close, attack
    if self.attackCooldown <= 0 then
      self:attack()
    end
  end
  
  if self.state == 'hurt' then
    if self.animationTime > 0.5 then
      self.state = 'idle'
      self.animationTime = 0
    end
  end
end

function Boss:isDefeated()
  return self.state == 'defeated'
end

function Boss:getDrops()
  local drops = {}
  for _, item in ipairs(self.drops) do
    if math.random() < (item.chance or 100) / 100 then
      table.insert(drops, item)
    end
  end
  return drops
end

-- Rob the Traitor - Default boss config
function Boss.createRobTheBoss()
  return Boss.new({
    id = 1,
    name = "Rob the Traitor",
    description = "The cult leader who turned the bliblings against Matthew",
    rarity = "legendary",
    health = 500,
    maxHealth = 500,
    damage = 45,
    attackSpeed = 0.7,
    defense = 25,
    speed = 120,
    x = 800,
    y = 150,
    width = 96,
    height = 96,
    abilities = {
      { id = 1, name = "Cult Summon", damage = 0, effect = "Summons 3 cult minions" },
      { id = 2, name = "Dark Surge", damage = 60, effect = "Area attack that hits all nearby enemies" },
      { id = 3, name = "Void Strike", damage = 85, effect = "Single powerful attack" },
    },
    drops = {
      { id = 9, name = "Void Essence", rarity = "legendary", chance = 100 },
      { id = 8, name = "Crystal Amulet", rarity = "rare", chance = 50 },
      { id = 5, name = "Steel Sword", rarity = "uncommon", chance = 75 },
    },
  })
end

return Boss
