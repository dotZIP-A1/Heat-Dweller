import { attachInputHandlers } from '../systems/inputSystem.js';
import { hideTitleScreen } from '../scenes/titleScene.js';
import { drawSpriteFrame } from '../systems/renderSystem.js';
import { loadConfigXml } from './configLoader.js';

// Heat Dweller - Main Game Engine
// Loads XML config and Lua-inspired game logic

export class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.gameState = 'title';
    this.lastTime = performance.now();
    
    // Initialize stats panel
    this.initStatsPanels();
    
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
      frames: [
        { x: 0, y: 0, w: 64, h: 64 },
        { x: 64, y: 0, w: 64, h: 64 },
        { x: 128, y: 0, w: 64, h: 64 },
        { x: 192, y: 0, w: 64, h: 64 },
        { x: 256, y: 0, w: 64, h: 64 },
        { x: 320, y: 0, w: 64, h: 64 },
        { x: 384, y: 0, w: 64, h: 64 },
        { x: 448, y: 0, w: 64, h: 64 },
        { x: 512, y: 0, w: 64, h: 64 },
        { x: 576, y: 0, w: 64, h: 64 },
        { x: 640, y: 0, w: 64, h: 64 },
        { x: 704, y: 0, w: 64, h: 64 },
        { x: 768, y: 0, w: 64, h: 64 },
        { x: 832, y: 0, w: 64, h: 64 },
        { x: 896, y: 0, w: 64, h: 64 },
        { x: 960, y: 0, w: 64, h: 64 },
        { x: 1024, y: 0, w: 64, h: 64 },
      ],
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
    this.swordSheet.image.src = 'resources/sprites/attack/sword/spritesheet/defaultsword.png';
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
    this.enemySpriteSheets.angryredguy.image.src = 'resources/sprites/enemies/angryredguy/angryredguy.png';
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
    
    // Items inventory
    this.inventory = [];
    this.itemDatabase = this.getItemDatabase();
  }
  
  initStatsPanels() {
    // Left stats panel
    const leftPanel = document.getElementById('leftStatsPanel');
    if (!leftPanel) {
      const panel = document.createElement('div');
      panel.id = 'leftStatsPanel';
      panel.style.cssText = `
        position: absolute;
        left: 16px;
        top: 16px;
        width: 200px;
        background: rgba(10, 12, 18, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        font-family: Inter, system-ui, sans-serif;
        font-size: 13px;
        color: #e8e8e8;
        z-index: 100;
        display: none;
      `;
      document.body.appendChild(panel);
    }
  }
  
  updateStatsPanels() {
    const panel = document.getElementById('leftStatsPanel');
    if (!panel) return;
    
    if (this.gameState !== 'playing') {
      panel.style.display = 'none';
      return;
    }
    
    panel.style.display = 'block';
    panel.innerHTML = `
      <div style="margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
        <div style="font-weight: 600; margin-bottom: 4px;">Matthew</div>
        <div style="font-size: 12px; color: #9da5b4;">Level ${this.stats.level}</div>
      </div>
      <div style="margin-bottom: 12px;">
        <div style="color: #9da5b4; font-size: 11px; margin-bottom: 2px;">Health</div>
        <div style="background: rgba(255,255,255,0.05); border-radius: 4px; height: 16px; overflow: hidden;">
          <div style="background: #4ade80; height: 100%; width: ${(this.stats.health / this.stats.maxHealth) * 100}%;">
          </div>
        </div>
        <div style="font-size: 11px; color: #9da5b4; margin-top: 2px;">${this.stats.health}/${this.stats.maxHealth}</div>
      </div>
      <div style="margin-bottom: 12px;">
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 12px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
        <div>
          <div style="color: #9da5b4; margin-bottom: 2px;">⚔️ Damage</div>
          <div style="color: #fbbf24;">${this.stats.damage}</div>
        </div>
        <div>
          <div style="color: #9da5b4; margin-bottom: 2px;">⚡ Atk Speed</div>
          <div style="color: #fbbf24;">${this.stats.attackSpeed.toFixed(1)}x</div>
        </div>
        <div>
          <div style="color: #9da5b4; margin-bottom: 2px;">🛡️ Defense</div>
          <div style="color: #4ade80;">${this.stats.defense}</div>
        </div>
        <div>
          <div style="color: #9da5b4; margin-bottom: 2px;">💨 Speed</div>
          <div style="color: #4ade80;">${this.stats.speed}</div>
        </div>
        <div>
          <div style="color: #9da5b4; margin-bottom: 2px;">✨ EXP</div>
          <div style="color: #a78bfa;">${this.stats.experience}</div>
        </div>
      </div>
    `;
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
      width: parseInt(getVal('player > width', 64)),
      height: parseInt(getVal('player > height', 64)),
      speed: parseInt(getVal('player > baseSpeed', 220)),
      facing: 'down',
      moving: false,
      animationTime: 0,
      frameSpeed: parseFloat(getVal('animation > frameSpeed', 0.08)),
      blinkTime: 0,
      blinkDuration: parseFloat(getVal('animation > blinkDuration', 0.12)),
      nextBlink: Math.random() * 2 + 2,
      blinking: false,
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
      idle: 2,
      walkHorizontal: [3, 4, 5, 6, 7, 8, 9],
      walkVertical: [11, 12, 13, 14, 15, 16],
    };
    
    this.camera = {
      x: 0,
      y: 0,
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
    };
    
    // Load resources
    const spriteSheetPath = getVal('resources > spriteSheet', 'resources/sprites/characters/character1.png');
    const backgroundPath = getVal('resources > background', 'resources/sprites/environment/topexitcrustI.png');
    const layouts = [...new Set([
      backgroundPath,
      'resources/sprites/environment/topexitcrustI.png',
      'resources/sprites/environment/allexitcrustI.png',
    ])];

    this.backgroundImage.layouts = layouts;
    this.loadRandomRoom();

    this.spriteSheet.image.src = spriteSheetPath;
    this.spriteSheet.image.onload = () => { this.spriteSheet.loaded = true; };
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
      width: 64,
      height: 64,
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
      idle: 2,
      walkHorizontal: [3, 4, 5, 6, 7, 8, 9],
      walkVertical: [11, 12, 13, 14, 15, 16],
    };
    
    this.camera = {
      x: 0,
      y: 0,
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
    };
    
    this.spriteSheet.image.src = 'resources/sprites/characters/character1.png';
    this.spriteSheet.image.onload = () => { this.spriteSheet.loaded = true; };

    this.backgroundImage.layouts = [
      'resources/sprites/environment/topexitcrustI.png',
      'resources/sprites/environment/allexitcrustI.png',
    ];
    this.loadRandomRoom();
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
    this.generateRoomEnemies();
  }

  generateRoomEnemies() {
    const count = 4;
    const margin = 96;
    const width = this.camera.width;
    const height = this.camera.height;
    const enemyTypes = ['angryredguy', 'spider'];

    this.roomEnemies = Array.from({ length: count }, (_, index) => {
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
    if (!this.backgroundImage.loaded || this.roomTransitionCooldown > 0) return;

    const samplePoints = [
      { x: this.player.x, y: this.player.y + this.player.height / 2 - 4 },
      { x: this.player.x - this.player.width / 4, y: this.player.y + this.player.height / 2 - 4 },
      { x: this.player.x + this.player.width / 4, y: this.player.y + this.player.height / 2 - 4 },
    ];

    const width = this.camera.width;
    const height = this.camera.height;

    for (const point of samplePoints) {
      const imageX = Math.floor((point.x / width) * this.backgroundImage.canvas.width);
      const imageY = Math.floor((point.y / height) * this.backgroundImage.canvas.height);
      const pixel = this.getRoomPixelColor(imageX, imageY);
      if (!pixel) continue;
      if (pixel.r === 0 && pixel.g === 0 && pixel.b === 0 && pixel.a !== 0) {
        this.loadRandomRoom();
        const spawn = this.findSafeRoomPosition();
        this.player.x = spawn.x;
        this.player.y = spawn.y;
        this.roomTransitionCooldown = 0.5;
        return;
      }
    }
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

  clamp(value, min, max) {
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
      const response = await fetch('resources/sprites/enemies/spider/spider.json');
      const atlas = await response.json();
      this.enemySpriteSheets.spider.frames = this.parseSpriteAtlas(atlas);
      this.enemySpriteSheets.spider.image.onload = () => {
        this.enemySpriteSheets.spider.loaded = true;
      };
      this.enemySpriteSheets.spider.image.src = 'resources/sprites/enemies/spider/spider.png';
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
      return this.animation.idle;
    }
    
    let frames = this.animation.walkVertical;
    if (this.player.facing === 'left' || this.player.facing === 'right') {
      frames = this.animation.walkHorizontal;
    }
    
    const index = Math.floor(this.player.animationTime / this.player.frameSpeed) % frames.length;
    return frames[index];
  }
  
  getHeadFrame() {
    return this.player.blinking ? 1 : 0;
  }
  
  drawSpriteFrame(frameIndex, drawX, drawY, flip = false) {
    drawSpriteFrame(this.ctx, this.spriteSheet, frameIndex, drawX, drawY, flip);
  }

  drawPlayer() {
    const bodyFrameIndex = this.getBodyFrame();
    const headFrameIndex = this.getHeadFrame();
    const drawX = this.player.x - this.player.width / 2;
    const drawY = this.player.y - this.player.height / 2;
    const flip = this.player.facing === 'left';
    
    if (this.spriteSheet.loaded) {
      this.drawSpriteFrame(bodyFrameIndex, drawX, drawY, flip);
      this.drawSpriteFrame(headFrameIndex, drawX, drawY, flip);
      this.drawSwordAttack();
    } else {
      this.ctx.fillStyle = '#e8e8e8';
      this.ctx.fillRect(drawX, drawY, this.player.width, this.player.height);
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
    this.ctx.fillStyle = '#ffffffcc';
    this.ctx.font = '14px Inter, system-ui, sans-serif';
    this.ctx.fillText(`Position: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`, 16, 24);
    this.ctx.fillText(`Facing: ${this.player.facing}`, 16, 44);
    this.ctx.fillText('Use WASD to move, arrow keys to attack. Touch black to enter a new room.', 16, 64);
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
    }
    
    this.updateStatsPanels();
    requestAnimationFrame(this.loop);
  }
  
  setInput(event, value) {
    if (this.gameState === 'title') return;
    
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
  }
  
  startGame = () => {
    if (this.gameState === 'playing') return;
    this.gameState = 'playing';
    hideTitleScreen();
    this.lastTime = performance.now();
  }
  
  async init() {
    await this.loadConfig();
    this.resizeCanvas();
    
    attachInputHandlers(this);
    requestAnimationFrame(this.loop);
  }
}

