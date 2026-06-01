export const Collectibles = {
  items: [],

  spawn(sprite, x, y) {
    this.items.push({
      sprite,
      x,
      y,
      baseY: y,
      timer: Math.random() * 10,
      bobHeight: 3,
      bobSpeed: 2,
      offsetY: 0
    });
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