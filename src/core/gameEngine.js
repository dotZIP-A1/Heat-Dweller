import { attachInputHandlers } from '../systems/inputSystem.js';
import { hideTitleScreen } from '../scenes/titleScene.js';
import { drawSpriteFrame, drawGrid } from '../systems/renderSystem.js';
import { loadConfigXml } from './configLoader.js';

// Echo of the Void - Main Game Engine
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
    
    // Assets
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
    
    this.backgroundImage = {
      image: new Image(),
      loaded: false,
      zoom: 1.7,
    };
    
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
        <div style="color: #9da5b4; font-size: 11px; margin-bottom: 2px;">Mana</div>
        <div style="background: rgba(255,255,255,0.05); border-radius: 4px; height: 16px; overflow: hidden;">
          <div style="background: #60a5fa; height: 100%; width: ${(this.stats.mana / this.stats.maxMana) * 100}%;">
          </div>
        </div>
        <div style="font-size: 11px; color: #9da5b4; margin-top: 2px;">${this.stats.mana}/${this.stats.maxMana}</div>
      </div>
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
      this.config = await loadConfigXml('assets/data/config.xml');
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
      mana: 50,
      maxMana: 50,
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
    
    // Load assets
    const spriteSheetPath = getVal('assets > spriteSheet', 'assets/sprites/characters/character1.png');
    const backgroundPath = getVal('assets > background', 'assets/sprites/environment/grassbackground1.png');
    
    this.spriteSheet.image.src = spriteSheetPath;
    this.spriteSheet.image.onload = () => { this.spriteSheet.loaded = true; };
    
    this.backgroundImage.image.src = backgroundPath;
    this.backgroundImage.image.onload = () => { this.backgroundImage.loaded = true; };
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
      mana: 50,
      maxMana: 50,
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
    
    this.spriteSheet.image.src = 'assets/sprites/characters/character1.png';
    this.spriteSheet.image.onload = () => { this.spriteSheet.loaded = true; };
    
    this.backgroundImage.image.src = 'assets/sprites/environment/grassbackground1.png';
    this.backgroundImage.image.onload = () => { this.backgroundImage.loaded = true; };
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
  
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  
  update(delta) {
    this.updateMovement(delta);
    
    this.player.x = this.clamp(this.player.x, this.player.width / 2, this.world.width - this.player.width / 2);
    this.player.y = this.clamp(this.player.y, this.player.height / 2, this.world.height - this.player.height / 2);
    
    this.camera.x = this.clamp(this.player.x - this.camera.width / 2, 0, this.world.width - this.camera.width);
    this.camera.y = this.clamp(this.player.y - this.camera.height / 2, 0, this.world.height - this.camera.height);
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

  drawGrid() {
    drawGrid(this.ctx, this.world, this.camera);
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
    } else {
      this.ctx.fillStyle = '#e8e8e8';
      this.ctx.fillRect(drawX, drawY, this.player.width, this.player.height);
    }
  }
  
  drawWorld() {
    this.ctx.fillStyle = '#101010';
    this.ctx.fillRect(0, 0, this.camera.width, this.camera.height);
    
    if (this.backgroundImage.loaded) {
      const scaleX = this.backgroundImage.image.width / this.world.width;
      const scaleY = this.backgroundImage.image.height / this.world.height;
      const sourceWidth = this.camera.width / this.backgroundImage.zoom;
      const sourceHeight = this.camera.height / this.backgroundImage.zoom;
      const centerX = this.player.x * scaleX;
      const centerY = this.player.y * scaleY;
      const sourceX = this.clamp(centerX - sourceWidth / 2, 0, this.backgroundImage.image.width - sourceWidth);
      const sourceY = this.clamp(centerY - sourceHeight / 2, 0, this.backgroundImage.image.height - sourceHeight);
      
      this.ctx.drawImage(
        this.backgroundImage.image,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, this.camera.width, this.camera.height,
      );
    }
    
    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);
    this.drawGrid();
    this.drawPlayer();
    this.ctx.restore();
  }
  
  drawHUD() {
    this.ctx.fillStyle = '#ffffffcc';
    this.ctx.font = '14px Inter, system-ui, sans-serif';
    this.ctx.fillText(`Position: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`, 16, 24);
    this.ctx.fillText(`Facing: ${this.player.facing}`, 16, 44);
    this.ctx.fillText('Use arrow keys or WASD to move.', 16, 64);
  }
  
  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.floor(this.canvas.clientHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.camera.width = this.canvas.clientWidth;
    this.camera.height = this.canvas.clientHeight;
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

