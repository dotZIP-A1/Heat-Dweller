const COLLECTIBLE_SPRITES = {
  burnt_chilli: 'collectibles_001_burntchilli.png',
  light_bulb: 'collectibles_002_lightbulb.png',
  wet_sock: 'collectibles_003_wetsock.png',
  dead_spider: 'collectibles_004_deadspider.png',
  mysterious_key: 'collectibles_005_mysteriouskey.png',
  playdough: 'collectibles_006_playdough.png',
  playdough_shotgun: 'collectibles_007_playdoughshotgun.png',
  playdough_cake: 'collectibles_008_playdoughcake.png',
  playdough_shield: 'collectibles_009_playdoughshield.png',
  molotov: 'collectibles_012_molotov.png',
  charger: 'collectibles_013_charger.png',
  duality: 'collectibles_014_duality.png',
  garlic: 'collectibles_015_garlic.png',
  snowman: 'collectibles_016_snowman.png',
  utensils: 'collectibles_017_utensils.png',
};

const spriteCache = {};

async function loadCollectibleSprite(spriteFile) {
  if (spriteCache[spriteFile]) {
    return spriteCache[spriteFile];
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      spriteCache[spriteFile] = img;
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Failed to load collectible sprite: ${spriteFile}`);
      resolve(null);
    };
    img.src = `resources/gfx/items/collectibles/${spriteFile}`;
  });
}

export const Collectibles = {
  items: [],

  spawn(spriteType, x, y) {
    const spriteFile = COLLECTIBLE_SPRITES[spriteType];
    if (!spriteFile) {
      console.warn(`Unknown collectible type: ${spriteType}`);
      return;
    }

    const item = {
      spriteType,
      spriteFile,
      sprite: null,
      x,
      y,
      baseY: y,
      timer: Math.random() * 10,
      bobHeight: 3,
      bobSpeed: 2,
      offsetY: 0
    };

    loadCollectibleSprite(spriteFile).then(img => {
      item.sprite = img;
    });

    this.items.push(item);
  },

  update(dt) {
    for (const item of this.items) {
      item.timer += dt;
      item.offsetY =
        Math.sin(item.timer * item.bobSpeed) * item.bobHeight;
    }
  },

  draw(ctx) {
    for (const item of this.items) {

      // shadow (ellipse like your Lua version)
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      ctx.ellipse(
        item.x,
        item.baseY + 10,
        10,
        4,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // item sprite
      if (item.sprite) {
        ctx.drawImage(
          item.sprite,
          item.x - item.sprite.width / 2,
          item.baseY + item.offsetY - item.sprite.height / 2
        );
      }
    }
  }
};