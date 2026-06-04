import { attachInputHandlers } from '../systems/inputSystem.js';
import { hideTitleScreen } from '../scenes/titleScene.js';
import { drawSpriteFrame } from '../systems/renderSystem.js';
import { loadConfigXml } from './configLoader.js';
import { loadHudAssets, drawHud } from '../systems/hudSystem.js';
import { generateRoomGraph, debugPrintRoomGraph } from '../systems/mapGenerator.js';

const ROOM_TYPE_BACKGROUNDS = {
  normal: 'resources/gfx/rooms/backgrounds/normal.png',
  shop: 'resources/gfx/rooms/backgrounds/shop.png',
  boss: 'resources/gfx/rooms/backgrounds/boss.png',
  special: 'resources/gfx/rooms/backgrounds/special.png',
};

const ROOM_TYPE_ICONS = {
  shop: 'resources/gfx/rooms/icons/shop.png',
  boss: 'resources/gfx/rooms/icons/boss.png',
  special: 'resources/gfx/rooms/icons/special.png',
};

// Heat Dweller - Main Game Engine
// Loads XML config and Lua-inspired game logic

export class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.gameState = 'title';
    this.lastTime = performance.now();
    
    this.hudAssets = null;
    
    // Game state
    this.config = null;
    this.player = null;
    this.stats = null;
    this.input = { left: false, right: false, up: false, down: false };
    this.world = null;
    this.camera = null;
    this.animation = null;
    this.attack = {
      active: false,
      direction: 'down',
      time: 0,
      duration: 0.24,
      hasHit: false,
    };
    
    // resources
    this.spriteSheet = {
      image: new Image(),
      atlas: null,
      loaded: false,
    };
    
    this.swordSheet = {
      image: new Image(),
      frames: [
        { x: 0, y: 0, w: 64, h: 64 },
        { x: 64, y: 0, w: 64, h: 64 },
        { x: 128, y: 0, w: 64, h: 64 },
      ],
      loaded: false,
    };
    this.swordSheet.image.src = 'resources/gfx/projectiles/defaultsword/spritesheet/defaultsword.png';
    this.swordSheet.image.onload = () => { this.swordSheet.loaded = true; };

    this.swordSwingAudio = new Audio('resources/audio/sfx/swordswing.ogg');
    this.swordSwingAudio.volume = 0.5;

    this.enemySpriteSheets = {
      angryredguy: {
        image: new Image(),
        frames: [{ x: 0, y: 0, w: 64, h: 64 }],
        loaded: false,
      },
      spider: {
        image: new Image(),
        frames: [],
        loaded: false,
      },
    };

    this.enemySpriteSheets.angryredguy.image.onload = () => {
      this.enemySpriteSheets.angryredguy.loaded = true;
    };
    this.enemySpriteSheets.angryredguy.image.src = 'resources/gfx/enemies/angryredguy/angryredguy.png';
    this.loadEnemySpriteSheets();

    this.backgroundImage = {
      image: new Image(),
      loaded: false,
      layouts: [
        'resources/sprites/environment/topexitcrustI.png',
        'resources/sprites/environment/allexitcrustI.png',
      ],
      currentLayout: null,
      canvas: document.createElement('canvas'),
      ctx: null,
    };
    this.backgroundImage.ctx = this.backgroundImage.canvas.getContext('2d');
    this.roomTransitionCooldown = 0;
    this.roomEnemies = [];
    this.roomGraph = null;
    this.currentRoomId = null;
    this.roomStates = {};
    this.transition = {
      active: false,
      phase: 'none',
      alpha: 0,
      duration: 0.24,
      nextRoomId: null,
      entryDirection: null,
    };
    
    this.unlockedCharacters = {
      matthew: true,
      stella: false,
    };
    this.selectedCharacterIndex = 0;
    this.characterSelection = [
      {
        id: 'matthew',
        name: 'Matthew',
        portrait: 'resources/gfx/characters/character_001_matthew.png',
        lockText: null,
      },
      {
        id: 'stella',
        name: 'Stella',
        portrait: 'resources/gfx/characters/character_002_stella.png',
        lockText: 'Beat the Attic for the first time to unlock',
      },
    ];
    this.loadedPortraits = {};
    
    // Items inventory
    this.inventory = [];
    this.itemDatabase = this.getItemDatabase();
  }
  
  
  async loadConfig() {
    try {
      this.config = await loadConfigXml('resources/data/config.xml');
      this.initGameState();
    } catch (err) {
      console.error('Failed to load config:', err);
      this.initGameStateDefault();
    }
  }
  
  initGameState() {
    if (!this.config) {
      this.initGameStateDefault();
      return;
    }
    
    const getVal = (selector, defaultVal) => {
      const el = this.config.querySelector(selector);
      return el ? el.textContent : defaultVal;
    };
    
    this.world = {
      width: parseInt(getVal('world > width', 1600)),
      height: parseInt(getVal('world > height', 1200)),
      tileSize: parseInt(getVal('world > tileSize', 80)),
      rows: parseInt(getVal('world > rows', 15)),
      cols: parseInt(getVal('world > cols', 20)),
    };
    
    this.player = {
      x: parseInt(getVal('player > startX', 800)),
      y: parseInt(getVal('player > startY', 600)),
      width: 40,
      height: 40,
      speed: parseInt(getVal('player > baseSpeed', 220)),
      facing: 'down',
      moving: false,
      animationTime: 0,
      frameSpeed: parseFloat(getVal('animation > frameSpeed', 0.08)),
      blinkTime: 0,
      blinkDuration: parseFloat(getVal('animation > blinkDuration', 0.12)),
      nextBlink: Math.random() * 2 + 2,
      blinking: false,
      character: 'matthew',
    };
    
    this.stats = {
      speed: this.player.speed,
      damage: 25,
      attackSpeed: 1.0,
      defense: 10,
      health: 100,
      maxHealth: 100,
      experience: 0,
      level: 1,
    };
    
    this.animation = {
      heads: {
        forward: 'head_forward_1',
        right: 'head_right_1',
        back: 'head_back_1',
      },
      body: {
        idle: 'body_idle',
        walk_down: ['walk_down_0', 'walk_down_1', 'walk_down_2', 'walk_down_3', 'walk_down_4'],
        walk_right: ['walk_right_0', 'walk_right_1', 'walk_right_2', 'walk_right_3', 'walk_right_4', 'walk_right_5'],
        hurt: ['hurt_0', 'hurt_1', 'hurt_2', 'hurt_3'],
      },
    };
    
    this.camera = {
      x: 0,
      y: 0,
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
    };

    this.roomStates = {};
    this.backgroundImage.layouts = [
      'resources/gfx/sprites/environment/topexitcrustI.png',
      'resources/gfx/sprites/environment/allexitcrustI.png',
    ];
  }
  
  initGameStateDefault() {
    this.world = {
      width: 1600,
      height: 1200,
      tileSize: 80,
      rows: 15,
      cols: 20,
    };
    
    this.player = {
      x: 800,
      y: 600,
      width: 40,
      height: 40,
      speed: 220,
      facing: 'down',
      moving: false,
      animationTime: 0,
      frameSpeed: 0.08,
      blinkTime: 0,
      blinkDuration: 0.12,
      nextBlink: Math.random() * 2 + 2,
      blinking: false,
    };
    
    this.stats = {
      speed: 220,
      damage: 25,
      attackSpeed: 1.0,
      defense: 10,
      health: 100,
      maxHealth: 100,
      experience: 0,
      level: 1,
    };
    
    this.animation = {
      heads: {
        forward: 'head_forward_1',
        right: 'head_right_1',
        back: 'head_back_1',
      },
      body: {
        idle: 'body_idle',
        walk_down: ['walk_down_0', 'walk_down_1', 'walk_down_2', 'walk_down_3', 'walk_down_4'],
        walk_right: ['walk_right_0', 'walk_right_1', 'walk_right_2', 'walk_right_3', 'walk_right_4', 'walk_right_5'],
        hurt: ['hurt_0', 'hurt_1', 'hurt_2', 'hurt_3'],
      },
    };
    
    this.camera = {
      x: 0,
      y: 0,
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
    };
    
    this.loadCharacterAtlas();
    this.roomStates = {};
    this.backgroundImage.layouts = [
      'resources/gfx/sprites/environment/topexitcrustI.png',
      'resources/gfx/sprites/environment/allexitcrustI.png',
    ];
  }
  
  getItemDatabase() {
    return [
      { id: 1, name: "Iron Sword", type: "weapon", damage: 15, attackSpeed: 1.0, rarity: "common" },
      { id: 2, name: "Wooden Shield", type: "armor", defense: 5, rarity: "common" },
      { id: 3, name: "Health Potion", type: "consumable", healAmount: 30, rarity: "common" },
      { id: 4, name: "Mana Potion", type: "consumable", manaAmount: 25, rarity: "common" },
      { id: 5, name: "Steel Sword", type: "weapon", damage: 25, attackSpeed: 0.9, rarity: "uncommon" },
      { id: 6, name: "Leather Armor", type: "armor", defense: 10, rarity: "uncommon" },
      { id: 7, name: "Speed Boots", type: "equipment", speed: 50, rarity: "uncommon" },
      { id: 8, name: "Crystal Amulet", type: "accessory", mana: 25, rarity: "rare" },
      { id: 9, name: "Void Essence", type: "material", rarity: "legendary" },
    ];
  }
  
  addItem(itemId, quantity = 1) {
    const item = this.itemDatabase.find(i => i.id === itemId);
    if (!item) return false;
    
    const invItem = this.inventory.find(i => i.id === itemId);
    if (invItem) {
      invItem.quantity = (invItem.quantity || 1) + quantity;
      return true;
    }
    
    this.inventory.push({
      id: itemId,
      name: item.name,
      type: item.type,
      quantity: quantity,
      properties: item
    });
    return true;
  }
  
  updateMovement(delta) {
    const move = this.player.speed * delta;
    let moved = false;
    
    if (this.input.left) {
      this.player.x -= move;
      this.player.facing = 'left';
      moved = true;
    } else if (this.input.right) {
      this.player.x += move;
      this.player.facing = 'right';
      moved = true;
    }
    
    if (this.input.up) {
      this.player.y -= move;
      if (!moved) this.player.facing = 'up';
      moved = true;
    } else if (this.input.down) {
      this.player.y += move;
      if (!moved) this.player.facing = 'down';
      moved = true;
    }
    
    this.player.moving = moved;
    if (this.player.moving) {
      this.player.animationTime += delta;
    } else {
      this.player.animationTime = 0;
    }
    
    // Blink animation
    if (this.player.blinking) {
      this.player.blinkTime += delta;
      if (this.player.blinkTime >= this.player.blinkDuration) {
        this.player.blinking = false;
        this.player.blinkTime = 0;
        this.player.nextBlink = Math.random() * 2 + 2;
      }
    } else {
      this.player.nextBlink -= delta;
      if (this.player.nextBlink <= 0) {
        this.player.blinking = true;
        this.player.blinkTime = 0;
      }
    }
  }

  updateAttack(delta) {
    if (!this.attack.active) return;

    this.attack.time += delta;
    if (!this.attack.hasHit && this.attack.time >= 0.06) {
      this.handleAttackHits();
      this.attack.hasHit = true;
    }

    if (this.attack.time >= this.attack.duration) {
      this.attack.active = false;
      this.attack.time = 0;
      this.attack.hasHit = false;
    }
  }

  handleAttackHits() {
    const hitBox = this.getAttackHitbox();
    if (!hitBox) return;

    for (const enemy of this.roomEnemies) {
      if (!enemy.alive) continue;
      if (this.rectsOverlap(hitBox, this.getEnemyRect(enemy))) {
        enemy.health -= this.stats.damage;
        enemy.contactCooldown = 0.5;
        if (enemy.health <= 0) {
          enemy.alive = false;
        }
      }
    }

    this.roomEnemies = this.roomEnemies.filter(e => e.alive);
    if (this.currentRoomId !== null) {
      const roomInfo = this.roomGraph?.rooms.find(room => room.id === this.currentRoomId);
      if (roomInfo?.type === 'boss' && this.roomEnemies.length === 0) {
        this.unlockCharacter('stella');
      }
    }
  }

  getAttackHitbox() {
    const size = 48;
    const half = size / 2;
    let x = this.player.x - half;
    let y = this.player.y - half;

    switch (this.attack.direction) {
      case 'left':
        x = this.player.x - this.player.width / 2 - size;
        y = this.player.y - size / 2;
        break;
      case 'right':
        x = this.player.x + this.player.width / 2;
        y = this.player.y - size / 2;
        break;
      case 'up':
        x = this.player.x - size / 2;
        y = this.player.y - this.player.height / 2 - size;
        break;
      case 'down':
        x = this.player.x - size / 2;
        y = this.player.y + this.player.height / 2;
        break;
    }

    return { x, y, width: size, height: size };
  }

  getEnemyRect(enemy) {
    return {
      x: enemy.x - enemy.width / 2,
      y: enemy.y - enemy.height / 2,
      width: enemy.width,
      height: enemy.height,
    };
  }

  rectsOverlap(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  getRoomPixelColor(imageX, imageY) {
    if (!this.backgroundImage.loaded || !this.backgroundImage.ctx) return null;
    if (imageX < 0 || imageY < 0 || imageX >= this.backgroundImage.canvas.width || imageY >= this.backgroundImage.canvas.height) return null;
    const data = this.backgroundImage.ctx.getImageData(imageX, imageY, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
  }

  findSafeRoomPosition() {
    if (!this.backgroundImage.loaded) {
      return { x: this.camera.width / 2, y: this.camera.height / 2 };
    }

    const width = this.backgroundImage.canvas.width;
    const height = this.backgroundImage.canvas.height;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    for (let dy = -80; dy <= 80; dy += 16) {
      for (let dx = -80; dx <= 80; dx += 16) {
        const x = centerX + dx;
        const y = centerY + dy;
        const pixel = this.getRoomPixelColor(x, y);
        if (!pixel) continue;
        if (!(pixel.r === 0 && pixel.g === 0 && pixel.b === 0 && pixel.a !== 0)) {
          return {
            x: Math.floor(((x + 0.5) / width) * this.camera.width),
            y: Math.floor(((y + 0.5) / height) * this.camera.height),
          };
        }
      }
    }
    return { x: this.camera.width / 2, y: this.camera.height / 2 };
  }

  loadRoomImage(path) {
    this.backgroundImage.loaded = false;
    this.backgroundImage.currentLayout = path;
    this.backgroundImage.image.onload = () => {
      this.backgroundImage.loaded = true;
      this.backgroundImage.canvas.width = this.backgroundImage.image.width;
      this.backgroundImage.canvas.height = this.backgroundImage.image.height;
      this.backgroundImage.ctx.drawImage(this.backgroundImage.image, 0, 0);
    };
    this.backgroundImage.image.src = path;
  }

  loadRandomRoom() {
    const layouts = this.backgroundImage.layouts || [];
    if (!layouts.length) return;

    const candidates = layouts.filter(path => path !== this.backgroundImage.currentLayout);
    const nextLayout = candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : layouts[Math.floor(Math.random() * layouts.length)];

    this.loadRoomImage(nextLayout);
    this.roomEnemies = this.generateRoomEnemies();
  }

  generateRoomEnemies() {
    const count = 4;
    const margin = 96;
    const width = this.camera.width;
    const height = this.camera.height;
    const enemyTypes = ['angryredguy', 'spider'];

    return Array.from({ length: count }, (_, index) => {
      const type = enemyTypes[index % enemyTypes.length];
      return {
        type,
        x: Math.floor(Math.random() * (width - margin * 2) + margin),
        y: Math.floor(Math.random() * (height - margin * 2) + margin),
        width: 64,
        height: 64,
        speed: type === 'angryredguy' ? 140 : 100,
        health: type === 'angryredguy' ? 65 : 28,
        damage: type === 'angryredguy' ? 18 : 10,
        alertRadius: 160,
        loseRadius: 240,
        wanderTime: Math.random() * 2 + 1.5,
        direction: this.getRandomDirection(),
        isChasing: false,
        contactCooldown: 0,
        alive: true,
        spriteSheet: this.enemySpriteSheets[type],
        frameTime: 0,
        frameIndex: 0,
        color: type === 'angryredguy' ? '#c92a2a' : '#8e44ad',
      };
    });
  }

  drawRoomEnemies() {
    if (!this.roomEnemies.length) return;

    for (const enemy of this.roomEnemies) {
      const drawX = enemy.x - enemy.width / 2;
      const drawY = enemy.y - enemy.height / 2;
      const sheet = enemy.spriteSheet;
      const frameCount = sheet && sheet.frames ? sheet.frames.length : 0;
      const frameIndex = frameCount > 0 ? enemy.frameIndex % frameCount : 0;
      const flip = enemy.type === 'angryredguy' && enemy.x > this.player.x;

      if (sheet && sheet.loaded && frameCount) {
        drawSpriteFrame(this.ctx, sheet, frameIndex, drawX, drawY, flip);
      } else {
        this.ctx.fillStyle = enemy.color;
        this.ctx.fillRect(drawX, drawY, enemy.width, enemy.height);
      }
    }
  }

  checkRoomTransition() {
    if (this.roomEnemies.some(e => e.alive)) return;
    if (this.roomTransitionCooldown > 0) return;
    if (!this.roomGraph || this.currentRoomId === null) return;

    const exitDirection = this.getExitDirection();
    if (!exitDirection) return;

    const currentRoom = this.roomGraph.rooms.find(room => room.id === this.currentRoomId);
    if (!currentRoom) return;

    const nextRoomId = currentRoom.connections[exitDirection];
    if (nextRoomId === null || nextRoomId === undefined) return;

    this.beginRoomTransition(nextRoomId, this.getOppositeDirection(exitDirection));
  }

  getOppositeDirection(direction) {
    const opposite = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    };
    return opposite[direction] || null;
  }

  getExitDirection() {
    const threshold = 8;
    const leftEdge = this.player.x - this.player.width / 2 <= threshold;
    const rightEdge = this.player.x + this.player.width / 2 >= this.world.width - threshold;
    const topEdge = this.player.y - this.player.height / 2 <= threshold;
    const bottomEdge = this.player.y + this.player.height / 2 >= this.world.height - threshold;

    if (topEdge) return 'north';
    if (bottomEdge) return 'south';
    if (leftEdge) return 'west';
    if (rightEdge) return 'east';
    return null;
  }

  findRoomEntryPosition(direction) {
    switch (direction) {
      case 'north':
        return { x: this.world.width / 2, y: this.world.height - this.player.height };
      case 'south':
        return { x: this.world.width / 2, y: this.player.height };
      case 'west':
        return { x: this.world.width - this.player.width, y: this.world.height / 2 };
      case 'east':
        return { x: this.player.width, y: this.world.height / 2 };
      default:
        return { x: this.world.width / 2, y: this.world.height / 2 };
    }
  }

  beginRoomTransition(nextRoomId, entryDirection) {
    if (this.transition.active || this.roomTransitionCooldown > 0) return;
    this.transition.active = true;
    this.transition.phase = 'out';
    this.transition.alpha = 0;
    this.transition.nextRoomId = nextRoomId;
    this.transition.entryDirection = entryDirection;
    this.roomTransitionCooldown = 0.5;
  }

  updateRoomTransition(delta) {
    if (!this.transition.active) return;

    const speed = delta / this.transition.duration;
    if (this.transition.phase === 'out') {
      this.transition.alpha = Math.min(1, this.transition.alpha + speed);
      if (this.transition.alpha >= 1) {
        this.performRoomSwitch();
        this.transition.phase = 'in';
      }
    } else if (this.transition.phase === 'in') {
      this.transition.alpha = Math.max(0, this.transition.alpha - speed);
      if (this.transition.alpha <= 0) {
        this.transition.active = false;
        this.transition.phase = 'none';
      }
    }
  }

  performRoomSwitch() {
    const nextRoomId = this.transition.nextRoomId;
    const entryDirection = this.transition.entryDirection;
    if (nextRoomId === null || nextRoomId === undefined) return;
    this.enterRoom(nextRoomId, entryDirection);
  }

  createRoomState(roomId) {
    const roomInfo = this.roomGraph?.rooms.find(room => room.id === roomId) || null;
    const roomType = roomInfo?.type || 'normal';
    return {
      roomId,
      visited: false,
      cleared: false,
      type: roomType,
      enemies: this.generateRoomEnemies(),
      items: [],
      backgroundLayout: ROOM_TYPE_BACKGROUNDS[roomType] || ROOM_TYPE_BACKGROUNDS.normal,
    };
  }

  getRoomState(roomId) {
    if (!this.roomStates[roomId]) {
      this.roomStates[roomId] = this.createRoomState(roomId);
    }
    return this.roomStates[roomId];
  }

  enterRoom(roomId, entryDirection = null) {
    if (!this.roomGraph) return;
    const roomInfo = this.roomGraph.rooms.find(room => room.id === roomId);
    if (!roomInfo) return;

    this.currentRoomId = roomId;
    const roomState = this.getRoomState(roomId);
    roomState.visited = true;

    const layout = roomState.backgroundLayout;
    this.backgroundImage.layouts = [layout];
    this.loadRoomImage(layout);

    this.roomEnemies = roomState.cleared ? [] : roomState.enemies;

    if (entryDirection) {
      const spawn = this.findRoomEntryPosition(entryDirection);
      this.player.x = spawn.x;
      this.player.y = spawn.y;
    } else {
      const spawn = this.findSafeRoomPosition();
      this.player.x = spawn.x;
      this.player.y = spawn.y;
    }
  }

  drawRoomTransition() {
    if (!this.transition.active) return;
    this.ctx.save();
    this.ctx.globalAlpha = this.transition.alpha;
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.camera.width, this.camera.height);
    this.ctx.restore();
  }

  updateEnemies(delta) {
    if (!this.roomEnemies.length) return;

    const playerRect = {
      x: this.player.x - this.player.width / 2,
      y: this.player.y - this.player.height / 2,
      width: this.player.width,
      height: this.player.height,
    };

    for (const enemy of this.roomEnemies) {
      if (enemy.type === 'angryredguy') {
        this.updateChaserEnemy(enemy, delta);
      } else if (enemy.type === 'spider') {
        this.updateWandererEnemy(enemy, delta);
      }

      enemy.frameTime += delta;
      if (enemy.spriteSheet && enemy.spriteSheet.frames.length > 1) {
        enemy.frameIndex = Math.floor(enemy.frameTime / 0.18) % enemy.spriteSheet.frames.length;
      }

      if (enemy.contactCooldown > 0) {
        enemy.contactCooldown = Math.max(0, enemy.contactCooldown - delta);
      }

      if (enemy.alive && enemy.contactCooldown <= 0 && this.rectsOverlap(playerRect, this.getEnemyRect(enemy))) {
        this.stats.health = Math.max(0, this.stats.health - enemy.damage);
        enemy.contactCooldown = 0.6;
      }
    }

    this.roomEnemies = this.roomEnemies.filter(e => e.alive);
    if (this.currentRoomId !== null) {
      const roomState = this.getRoomState(this.currentRoomId);
      roomState.enemies = this.roomEnemies;
      roomState.cleared = this.roomEnemies.length === 0;
    }
  }

  updateChaserEnemy(enemy, delta) {
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const moveSpeed = enemy.speed * delta;

    enemy.x += (dx / distance) * moveSpeed;
    enemy.y += (dy / distance) * moveSpeed;
  }

  updateWandererEnemy(enemy, delta) {
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;

    if (enemy.isChasing) {
      if (distance > enemy.loseRadius) {
        enemy.isChasing = false;
        enemy.wanderTime = 0;
      }
    } else if (distance <= enemy.alertRadius) {
      enemy.isChasing = true;
    }

    if (enemy.isChasing) {
      enemy.x += (dx / distance) * enemy.speed * delta;
      enemy.y += (dy / distance) * enemy.speed * delta;
    } else {
      enemy.wanderTime -= delta;
      if (enemy.wanderTime <= 0) {
        enemy.wanderTime = Math.random() * 2 + 1.5;
        enemy.direction = this.getRandomDirection();
      }
      enemy.x += enemy.direction.dx * enemy.speed * delta;
      enemy.y += enemy.direction.dy * enemy.speed * delta;
    }

    const halfWidth = enemy.width / 2;
    const halfHeight = enemy.height / 2;

    if (enemy.x < halfWidth) {
      enemy.x = halfWidth;
      enemy.direction.dx = 1;
    } else if (enemy.x > this.world.width - halfWidth) {
      enemy.x = this.world.width - halfWidth;
      enemy.direction.dx = -1;
    }

    if (enemy.y < halfHeight) {
      enemy.y = halfHeight;
      enemy.direction.dy = 1;
    } else if (enemy.y > this.world.height - halfHeight) {
      enemy.y = this.world.height - halfHeight;
      enemy.direction.dy = -1;
    }
  }

  startAttack(direction) {
    if (this.gameState !== 'playing') return;
    if (this.attack.active) return;

    this.attack.active = true;
    this.attack.direction = direction;
    this.attack.time = 0;
    this.attack.hasHit = false;
    this.player.facing = direction;

    if (this.swordSwingAudio) {
      this.swordSwingAudio.currentTime = 0;
      this.swordSwingAudio.play().catch(() => {});
    }
  }

  getSwordFrame() {
    const frameCount = this.swordSheet.frames.length;
    const frameIndex = Math.floor(this.attack.time / this.attack.duration * frameCount);
    return this.swordSheet.loaded ? Math.min(frameIndex, frameCount - 1) : 0;
  }

  drawSwordAttack() {
    if (!this.attack.active || !this.swordSheet.loaded) return;

    const frameIndex = this.getSwordFrame();
    const direction = this.attack.direction;
    let offsetX = 0;
    let offsetY = 0;
    let flip = false;

    switch (direction) {
      case 'left':
        offsetX = -56;
        offsetY = 12;
        flip = true;
        break;
      case 'right':
        offsetX = this.player.width - 8;
        offsetY = 12;
        break;
      case 'up':
        offsetX = 0;
        offsetY = -40;
        break;
      case 'down':
        offsetX = 0;
        offsetY = this.player.height - 16;
        break;
    }

    const drawX = this.player.x - this.player.width / 2 + offsetX;
    const drawY = this.player.y - this.player.height / 2 + offsetY;

    drawSpriteFrame(this.ctx, this.swordSheet, frameIndex, drawX, drawY, flip);
  }

  async loadEnemySpriteSheets() {
    try {
      const response = await fetch('resources/gfx/enemies/json/entity_002_scar.json');
      const atlas = await response.json();
      this.enemySpriteSheets.spider.frames = this.parseSpriteAtlas(atlas);
      this.enemySpriteSheets.spider.image.onload = () => {
        this.enemySpriteSheets.spider.loaded = true;
      };
      this.enemySpriteSheets.spider.image.src = 'resources/gfx/enemies/spritesheets/entity_002_scar.png';
    } catch (err) {
      console.warn('Failed to load spider sprite atlas:', err);
    }
  }

  parseSpriteAtlas(atlasData) {
    if (!atlasData || !atlasData.frames) return [];
    return Object.keys(atlasData.frames)
      .sort()
      .map((key) => atlasData.frames[key].frame);
  }

  getRandomDirection() {
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  updateEnemies(delta) {
    if (!this.roomEnemies.length) return;

    for (const enemy of this.roomEnemies) {
      if (enemy.type === 'angryredguy') {
        this.updateChaserEnemy(enemy, delta);
      } else if (enemy.type === 'spider') {
        this.updateWandererEnemy(enemy, delta);
      }

      enemy.frameTime += delta;
      if (enemy.spriteSheet && enemy.spriteSheet.frames.length > 1) {
        enemy.frameIndex = Math.floor(enemy.frameTime / 0.18) % enemy.spriteSheet.frames.length;
      }
    }
  }

  updateChaserEnemy(enemy, delta) {
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const moveSpeed = enemy.speed * delta;

    enemy.x += (dx / distance) * moveSpeed;
    enemy.y += (dy / distance) * moveSpeed;
  }

  updateWandererEnemy(enemy, delta) {
    enemy.wanderTime -= delta;
    if (enemy.wanderTime <= 0) {
      enemy.wanderTime = Math.random() * 2 + 1.5;
      enemy.direction = this.getRandomDirection();
    }

    enemy.x += enemy.direction.dx * enemy.speed * delta;
    enemy.y += enemy.direction.dy * enemy.speed * delta;

    const halfWidth = enemy.width / 2;
    const halfHeight = enemy.height / 2;

    if (enemy.x < halfWidth) {
      enemy.x = halfWidth;
      enemy.direction.dx = 1;
    } else if (enemy.x > this.world.width - halfWidth) {
      enemy.x = this.world.width - halfWidth;
      enemy.direction.dx = -1;
    }

    if (enemy.y < halfHeight) {
      enemy.y = halfHeight;
      enemy.direction.dy = 1;
    } else if (enemy.y > this.world.height - halfHeight) {
      enemy.y = this.world.height - halfHeight;
      enemy.direction.dy = -1;
    }
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  
  update(delta) {
    if (this.transition.active) {
      this.updateRoomTransition(delta);
      return;
    }

    this.updateMovement(delta);
    this.updateAttack(delta);
    this.updateEnemies(delta);
    
    this.player.x = this.clamp(this.player.x, this.player.width / 2, this.world.width - this.player.width / 2);
    this.player.y = this.clamp(this.player.y, this.player.height / 2, this.world.height - this.player.height / 2);
    
    this.camera.x = this.clamp(this.player.x - this.camera.width / 2, 0, this.world.width - this.camera.width);
    this.camera.y = this.clamp(this.player.y - this.camera.height / 2, 0, this.world.height - this.camera.height);

    if (this.roomTransitionCooldown > 0) {
      this.roomTransitionCooldown = Math.max(0, this.roomTransitionCooldown - delta);
    }

    this.checkRoomTransition();
  }
  
  getBodyFrame() {
    if (!this.player.moving) {
      return this.animation.body.idle;
    }
    
    let frames = this.animation.body.walk_down;
    if (this.player.facing === 'left' || this.player.facing === 'right') {
      frames = this.animation.body.walk_right;
    }
    
    const index = Math.floor(this.player.animationTime / this.player.frameSpeed) % frames.length;
    return frames[index];
  }
  
  getHeadFrame() {
    const headMap = {
      up: 'back',
      down: 'forward',
      left: 'right',
      right: 'right',
    };
    const headDir = headMap[this.player.facing] || 'forward';
    let frameName = this.animation.heads[headDir];
    
    // Use blink variant if blinking
    if (this.player.blinking) {
      frameName = frameName.replace('_1', '_blink');
    }
    
    return frameName;
  }
  
  async loadCharacterAtlas() {
    try {
      const response = await fetch('resources/gfx/sprites/characters/character_001_matthew.json');
      if (!response.ok) throw new Error(`Failed to load JSON: ${response.status}`);
      this.spriteSheet.atlas = await response.json();
      
      // Wait for image to load
      return new Promise((resolve) => {
        this.spriteSheet.image.onload = () => { 
          this.spriteSheet.loaded = true;
          console.log('Character atlas and image loaded successfully');
          resolve();
        };
        this.spriteSheet.image.onerror = () => {
          console.error('Failed to load character image');
          resolve();
        };
        this.spriteSheet.image.src = 'resources/gfx/sprites/characters/character_001_matthew.png';
      });
    } catch (err) {
      console.error('Failed to load character atlas:', err);
    }
  }
  
  getFrameData(frameName) {
    if (!this.spriteSheet.atlas || !this.spriteSheet.atlas.frames) {
      if (!this.spriteSheet.loaded) {
        return null; // Still loading
      }
      console.warn('Atlas not loaded or frames missing');
      return null;
    }
    const frameData = this.spriteSheet.atlas.frames[frameName];
    if (!frameData) {
      console.warn(`Frame not found in atlas: ${frameName}`);
      return null;
    }
    return frameData.frame;
  }

  getSelectedCharacter() {
    return this.characterSelection[this.selectedCharacterIndex] || this.characterSelection[0];
  }

  isCharacterUnlocked(characterId) {
    return Boolean(this.unlockedCharacters[characterId]);
  }

  changeSelection(direction) {
    const count = this.characterSelection.length;
    this.selectedCharacterIndex = (this.selectedCharacterIndex + direction + count) % count;
  }

  startCharacterSelect() {
    if (this.gameState !== 'title') return;
    this.gameState = 'characterSelect';
    hideTitleScreen();
  }

  confirmCharacterSelection() {
    const character = this.getSelectedCharacter();
    if (!this.isCharacterUnlocked(character.id)) {
      return;
    }
    if (!this.player) {
      this.initGameState();
    }
    this.player.character = character.id;
    this.startGame();
  }

  loadCharacterPortraits() {
    this.characterSelection.forEach((character) => {
      const image = new Image();
      image.src = character.portrait;
      this.loadedPortraits[character.id] = image;
    });
  }

  loadPersistentFlags() {
    try {
      const saved = localStorage.getItem('heatdweller.unlockedCharacters');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.unlockedCharacters = {
          ...this.unlockedCharacters,
          ...parsed,
        };
      }
    } catch (err) {
      console.warn('Could not load persistent unlock flags:', err);
    }
  }

  savePersistentFlags() {
    try {
      localStorage.setItem('heatdweller.unlockedCharacters', JSON.stringify(this.unlockedCharacters));
    } catch (err) {
      console.warn('Could not save persistent unlock flags:', err);
    }
  }

  unlockCharacter(characterId) {
    if (!this.unlockedCharacters[characterId]) {
      this.unlockedCharacters[characterId] = true;
      this.savePersistentFlags();
    }
  }

  drawCharacterSelect() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#07080c';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.fillStyle = '#eff2ff';
    this.ctx.font = 'bold 32px Inter, system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Select Your Hero', width / 2, 80);

    const centerX = width / 2;
    const centerY = height / 2 + 20;
    const spacing = 280;
    const portraitSize = 220;

    this.characterSelection.forEach((character, index) => {
      const offset = index - this.selectedCharacterIndex;
      const x = centerX + offset * spacing;
      const isSelected = index === this.selectedCharacterIndex;
      const scale = isSelected ? 1.0 : 0.72;
      const portraitImage = this.loadedPortraits[character.id];

      this.ctx.save();
      this.ctx.globalAlpha = isSelected ? 1 : 0.55;
      this.ctx.translate(x, centerY);
      this.ctx.scale(scale, scale);
      this.ctx.fillStyle = 'rgba(18, 22, 37, 0.85)';
      this.ctx.fillRect(-portraitSize / 2 - 8, -portraitSize / 2 - 8, portraitSize + 16, portraitSize + 16);
      if (portraitImage && portraitImage.complete) {
        this.ctx.drawImage(portraitImage, -portraitSize / 2, -portraitSize / 2, portraitSize, portraitSize);
      } else {
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(-portraitSize / 2, -portraitSize / 2, portraitSize, portraitSize);
      }
      this.ctx.restore();

      this.ctx.fillStyle = '#e2e8f0';
      this.ctx.font = `${isSelected ? 'bold 24px' : '18px'} Inter, system-ui, sans-serif`;
      this.ctx.fillText(character.name, x, centerY + portraitSize / 2 + 40);

      if (!this.isCharacterUnlocked(character.id)) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
        this.ctx.font = '14px Inter, system-ui, sans-serif';
        this.ctx.fillText(character.lockText, x, centerY + portraitSize / 2 + 70);
      }
    });

    this.ctx.fillStyle = '#cbd5e1';
    this.ctx.font = '16px Inter, system-ui, sans-serif';
    this.ctx.fillText('Use A/D or arrow keys to choose. Press Enter to confirm.', width / 2, height - 40);
  }

  drawPlayer() {
    if (!this.spriteSheet.loaded) {
      // Show placeholder while loading
      const drawX = this.player.x - this.player.width / 2;
      const drawY = this.player.y - this.player.height / 2;
      this.ctx.fillStyle = '#666666';
      this.ctx.fillRect(drawX, drawY, this.player.width, this.player.height);
      return;
    }

    const bodyFrameName = this.getBodyFrame();
    const headFrameName = this.getHeadFrame();
    const bodyFrame = this.getFrameData(bodyFrameName);
    const headFrame = this.getFrameData(headFrameName);
    
    const drawX = this.player.x - this.player.width / 2;
    const drawY = this.player.y - this.player.height / 2;
    const flip = this.player.facing === 'left';
    
    if (!bodyFrame || !headFrame) {
      console.error(`Missing frame data: body=${bodyFrameName}, head=${headFrameName}`);
      this.ctx.fillStyle = '#e8e8e8';
      this.ctx.fillRect(drawX, drawY, this.player.width, this.player.height);
      return;
    }
    
    // Draw body first
    this.drawAtlasFrame(bodyFrame, drawX, drawY, flip);
    
    // Draw head on top
    this.drawAtlasFrame(headFrame, drawX, drawY, flip);
    
    this.drawSwordAttack();
  }
  
  drawAtlasFrame(frameData, drawX, drawY, flip = false) {
    if (!frameData) return;
    
    const { x, y, w, h } = frameData;
    
    if (flip) {
      this.ctx.save();
      this.ctx.translate(drawX + w, drawY);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(
        this.spriteSheet.image,
        x, y, w, h,
        0, 0, w, h
      );
      this.ctx.restore();
    } else {
      this.ctx.drawImage(
        this.spriteSheet.image,
        x, y, w, h,
        drawX, drawY, w, h
      );
    }
  }
  
  drawWorld() {
    this.ctx.fillStyle = '#101010';
    this.ctx.fillRect(0, 0, this.camera.width, this.camera.height);
    
    if (this.backgroundImage.loaded) {
      this.ctx.drawImage(
        this.backgroundImage.image,
        0, 0, this.camera.width, this.camera.height,
      );
    }
    
    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);
    this.drawRoomEnemies();
    this.drawPlayer();
    this.ctx.restore();
  }
  
  drawHUD() {
    if (!this.hudAssets || !this.stats) {
      return;
    }

    drawHud(this.ctx, this.hudAssets, this.stats, this.canvas);
  }
  
  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.camera.width = this.canvas.clientWidth;
    this.camera.height = this.canvas.clientHeight;
    this.world.width = this.camera.width;
    this.world.height = this.camera.height;
  }
  
  loop = (timestamp) => {
    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.033);
    this.lastTime = timestamp;
    
    if (this.gameState === 'playing') {
      this.update(delta);
      this.drawWorld();
      this.drawHUD();
      this.drawRoomTransition();
    } else if (this.gameState === 'characterSelect') {
      this.drawCharacterSelect();
    }
    
    requestAnimationFrame(this.loop);
  }
  
  setInput(event, value) {
    if (this.gameState === 'playing') {
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.input.left = value;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.input.right = value;
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.input.up = value;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.input.down = value;
          break;
      }
      return;
    }

    if (this.gameState === 'characterSelect' && value) {
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.changeSelection(-1);
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.changeSelection(1);
          break;
        case 'Enter':
        case 'NumpadEnter':
          this.confirmCharacterSelection();
          break;
      }
    }
  }
  
  startGame = () => {
    if (this.gameState === 'playing') return;
    this.gameState = 'playing';
    hideTitleScreen();
    this.lastTime = performance.now();
  }
  
  async init() {
    await this.loadConfig();
    this.hudAssets = await loadHudAssets();
    this.loadPersistentFlags();
    this.roomGraph = generateRoomGraph();
    debugPrintRoomGraph(this.roomGraph);
    await this.loadCharacterAtlas();
    this.loadCharacterPortraits();
    this.resizeCanvas();
    this.roomStates = {};
    this.enterRoom(this.roomGraph.startRoomId);
    
    attachInputHandlers(this);
    requestAnimationFrame(this.loop);
  }
}

