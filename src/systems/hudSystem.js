const STAT_ICON_PATHS = {
  speed: 'resources/gfx/ui/stats/stats_001_speed.png',
  range: 'resources/gfx/ui/stats/stats_004_range.png',
  damage: 'resources/gfx/ui/stats/stats_003_damage.png',
  defense: 'resources/gfx/ui/stats/stats_005_defense.png',
};

const HEARTS_SPRITE_PATH = 'resources/gfx/health/hearts.png';
const HEARTS_JSON_PATH = 'resources/gfx/health/hearts.json';
const HEART_COUNT = 5;
const ICON_SIZE = 32;
const ICON_SPACING = 8;
const HUD_PADDING = 16;

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export async function loadHudAssets() {
  const icons = {};
  const iconEntries = Object.entries(STAT_ICON_PATHS);
  const iconPromises = iconEntries.map(async ([statName, path]) => {
    const image = await loadImage(path);
    if (image) {
      icons[statName] = image;
    } else {
      console.warn(`HUD icon missing or failed to load: ${path}`);
    }
  });

  const heartsData = {
    image: null,
    frames: {},
  };
  let heartsJson = null;

  try {
    const response = await fetch(HEARTS_JSON_PATH);
    if (response.ok) {
      heartsJson = await response.json();
    } else {
      console.warn('Failed to load hearts.json:', response.statusText);
    }
  } catch (err) {
    console.warn('Failed to fetch hearts metadata:', err);
  }

  if (heartsJson && heartsJson.frames) {
    heartsData.frames = heartsJson.frames;
    heartsData.image = await loadImage(HEARTS_SPRITE_PATH);
    if (!heartsData.image) {
      console.warn('Failed to load hearts sprite image:', HEARTS_SPRITE_PATH);
    }
  }

  await Promise.all(iconPromises);

  return {
    icons,
    hearts: heartsData,
    statIconMap: STAT_ICON_PATHS,
  };
}

function getHeartFrame(frames, filled) {
  if (filled >= 1) {
    return frames['Red Heart'];
  }
  if (filled >= 0.5) {
    return frames['Red Heart Half'];
  }
  return frames['Red Heart'];
}

export function drawHud(ctx, assets, stats, canvas) {
  if (!assets || !stats || !canvas) {
    return;
  }

  const xStart = HUD_PADDING;
  let yStart = HUD_PADDING;
  const panelWidth = 260;
  const lineHeight = 32;
  const iconSize = 24;
  const textX = xStart + iconSize + ICON_SPACING + 4;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(xStart - 10, yStart - 10, panelWidth, lineHeight * 5 + 20);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';

  const healthText = `Health: ${Math.max(0, stats.health)} / ${stats.maxHealth}`;
  ctx.fillText(healthText, xStart, yStart + 18);

  if (assets.hearts.image && assets.hearts.frames) {
    const hearts = assets.hearts;
    const healthRatio = stats.maxHealth > 0 ? stats.health / stats.maxHealth : 0;
    const totalFilledHearts = Math.min(HEART_COUNT, Math.max(0, healthRatio * HEART_COUNT));
    const fullHearts = Math.floor(totalFilledHearts);
    const halfHeart = totalFilledHearts - fullHearts >= 0.5;
    const emptyAlpha = 0.3;
    let heartX = xStart;
    const heartY = yStart + lineHeight - ICON_SIZE;

    for (let i = 0; i < HEART_COUNT; i += 1) {
      const filledValue = i < fullHearts ? 1 : (i === fullHearts && halfHeart ? 0.5 : 0);
      const frame = getHeartFrame(hearts.frames, filledValue);
      const alpha = filledValue > 0 ? 1 : emptyAlpha;
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        hearts.image,
        frame.frame.x,
        frame.frame.y,
        frame.frame.w,
        frame.frame.h,
        heartX,
        heartY,
        iconSize,
        iconSize,
      );
      heartX += iconSize + 6;
    }
    ctx.globalAlpha = 1;
  }

  yStart += lineHeight + 8;

  const rows = [
    { label: 'Damage', value: stats.damage, icon: assets.icons.damage },
    { label: 'Speed', value: stats.speed, icon: assets.icons.speed },
    { label: 'Defense', value: stats.defense, icon: assets.icons.defense },
    { label: 'Level', value: stats.level, icon: null },
  ];

  for (const row of rows) {
    if (row.icon) {
      ctx.drawImage(row.icon, 0, 0, row.icon.naturalWidth, row.icon.naturalHeight, xStart, yStart - iconSize + 6, iconSize, iconSize);
    }
    ctx.fillText(`${row.label}: ${row.value}`, row.icon ? textX : xStart, yStart + 4);
    yStart += lineHeight;
  }

  ctx.restore();
}

export function getHudIconPath(statName) {
  return STAT_ICON_PATHS[statName] || null;
}
