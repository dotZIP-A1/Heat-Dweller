-- Heat Dweller - Game Logic
-- Main game state and logic in Lua
Game = {}
Game = {}
Game.__index = Game

function Game.new()
  local self = setmetatable({}, Game)
  self.state = 'title'
  self.player = {
    x = 800,
    y = 600,
    width = 64,
    height = 64,
    speed = 220,
    facing = 'down',
    moving = false,
    animationTime = 0,
    frameSpeed = 0.08,
    blinkTime = 0,
    blinkDuration = 0.12,
    nextBlink = math.random() * 2 + 2,
    blinking = false,
  }
  
  self.stats = {
    speed = 220,
    damage = 25,
    attackSpeed = 1.0,
    defense = 10,
    health = 100,
    maxHealth = 100,
    mana = 50,
    maxMana = 50,
    experience = 0,
    level = 1,
  }
  
  self.input = {
    left = false,
    right = false,
    up = false,
    down = false,
  }
  
  self.world = {
    width = 1600,
    height = 1200,
    tileSize = 80,
    rows = 15,
    cols = 20,
  }
  
  self.camera = {
    x = 0,
    y = 0,
    width = 1024,
    height = 576,
  }
  
  self.animation = {
    idle = 2,
    walkHorizontal = {3, 4, 5, 6, 7, 8, 9},
    walkVertical = {11, 12, 13, 14, 15, 16},
  }
  
  return self
end

function Game:updateMovement(delta)
  local move = self.player.speed * delta
  local moved = false
  
  if self.input.left then
    self.player.x = self.player.x - move
    self.player.facing = 'left'
    moved = true
  elseif self.input.right then
    self.player.x = self.player.x + move
    self.player.facing = 'right'
    moved = true
  end
  
  if self.input.up then
    self.player.y = self.player.y - move
    if not moved then
      self.player.facing = 'up'
    end
    moved = true
  elseif self.input.down then
    self.player.y = self.player.y + move
    if not moved then
      self.player.facing = 'down'
    end
    moved = true
  end
  
  self.player.moving = moved
  if self.player.moving then
    self.player.animationTime = self.player.animationTime + delta
  else
    self.player.animationTime = 0
  end
  
  if self.player.blinking then
    self.player.blinkTime = self.player.blinkTime + delta
    if self.player.blinkTime >= self.player.blinkDuration then
      self.player.blinking = false
      self.player.blinkTime = 0
      self.player.nextBlink = math.random() * 2 + 2
    end
  else
    self.player.nextBlink = self.player.nextBlink - delta
    if self.player.nextBlink <= 0 then
      self.player.blinking = true
      self.player.blinkTime = 0
    end
  end
end

function Game:clamp(value, min, max)
  if value < min then return min end
  if value > max then return max end
  return value
end

function Game:update(delta)
  self:updateMovement(delta)
  
  self.player.x = self:clamp(self.player.x, self.player.width / 2, self.world.width - self.player.width / 2)
  self.player.y = self:clamp(self.player.y, self.player.height / 2, self.world.height - self.player.height / 2)
  
  self.camera.x = self:clamp(self.player.x - self.camera.width / 2, 0, self.world.width - self.camera.width)
  self.camera.y = self:clamp(self.player.y - self.camera.height / 2, 0, self.world.height - self.camera.height)
end

function Game:getPlayerPosition()
  return math.floor(self.player.x), math.floor(self.player.y)
end

function Game:getPlayerFacing()
  return self.player.facing
end

function Game:getStats()
  return self.stats
end

return Game
