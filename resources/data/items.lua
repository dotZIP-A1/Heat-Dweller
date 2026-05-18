-- Echo of the Void - Items Database
-- All collectible and usable items

local Items = {}

Items.inventory = {}
Items.itemDatabase = {
  {
    id = 1,
    name = "Iron Sword",
    type = "weapon",
    damage = 15,
    attackSpeed = 1.0,
    rarity = "common",
    description = "A basic iron sword"
  },
  {
    id = 2,
    name = "Wooden Shield",
    type = "armor",
    defense = 5,
    rarity = "common",
    description = "A sturdy wooden shield"
  },
  {
    id = 3,
    name = "Health Potion",
    type = "consumable",
    healAmount = 30,
    rarity = "common",
    description = "Restores 30 HP"
  },
  {
    id = 4,
    name = "Mana Potion",
    type = "consumable",
    manaAmount = 25,
    rarity = "common",
    description = "Restores 25 Mana"
  },
  {
    id = 5,
    name = "Steel Sword",
    type = "weapon",
    damage = 25,
    attackSpeed = 0.9,
    rarity = "uncommon",
    description = "A finely crafted steel sword"
  },
  {
    id = 6,
    name = "Leather Armor",
    type = "armor",
    defense = 10,
    rarity = "uncommon",
    description = "Protective leather armor"
  },
  {
    id = 7,
    name = "Speed Boots",
    type = "equipment",
    speed = 50,
    rarity = "uncommon",
    description = "Increases movement speed by 50"
  },
  {
    id = 8,
    name = "Crystal Amulet",
    type = "accessory",
    mana = 25,
    rarity = "rare",
    description = "Increases maximum mana by 25"
  },
  {
    id = 9,
    name = "Void Essence",
    type = "material",
    rarity = "legendary",
    description = "A mysterious essence from the void"
  },
}

function Items:addItem(itemId, quantity)
  quantity = quantity or 1
  local item = self:getItemById(itemId)
  if not item then return false end
  
  for _, inv_item in ipairs(self.inventory) do
    if inv_item.id == itemId then
      inv_item.quantity = (inv_item.quantity or 1) + quantity
      return true
    end
  end
  
  local newItem = {
    id = itemId,
    name = item.name,
    type = item.type,
    quantity = quantity,
    properties = item
  }
  table.insert(self.inventory, newItem)
  return true
end

function Items:removeItem(itemId, quantity)
  quantity = quantity or 1
  for i, item in ipairs(self.inventory) do
    if item.id == itemId then
      item.quantity = (item.quantity or 1) - quantity
      if item.quantity <= 0 then
        table.remove(self.inventory, i)
      end
      return true
    end
  end
  return false
end

function Items:getItemById(itemId)
  for _, item in ipairs(self.itemDatabase) do
    if item.id == itemId then
      return item
    end
  end
  return nil
end

function Items:getInventory()
  return self.inventory
end

function Items:getItemsByType(itemType)
  local result = {}
  for _, item in ipairs(self.itemDatabase) do
    if item.type == itemType then
      table.insert(result, item)
    end
  end
  return result
end

function Items:getAllItems()
  return self.itemDatabase
end

return Items
