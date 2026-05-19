export function drawSpriteFrame(ctx, spriteSheet, frameIndex, drawX, drawY, flip = false) {
  const frame = spriteSheet.frames[frameIndex];
  if (!frame) return;

  if (flip) {
    ctx.save();
    ctx.translate(drawX + frame.w, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(
      spriteSheet.image,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      0,
      0,
      frame.w,
      frame.h,
    );
    ctx.restore();
    return;
  }

  ctx.drawImage(
    spriteSheet.image,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    drawX,
    drawY,
    frame.w,
    frame.h,
  );
}

export function drawGrid(ctx, world, camera) {
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;

  for (let x = 0; x <= world.width; x += world.tileSize) {
    const drawX = x - camera.x;
    if (drawX >= -world.tileSize && drawX <= camera.width + world.tileSize) {
      ctx.beginPath();
      ctx.moveTo(drawX, -camera.y);
      ctx.lineTo(drawX, world.height - camera.y);
      ctx.stroke();
    }
  }

  for (let y = 0; y <= world.height; y += world.tileSize) {
    const drawY = y - camera.y;
    if (drawY >= -world.tileSize && drawY <= camera.height + world.tileSize) {
      ctx.beginPath();
      ctx.moveTo(-camera.x, drawY);
      ctx.lineTo(world.width - camera.x, drawY);
      ctx.stroke();
    }
  }
}
