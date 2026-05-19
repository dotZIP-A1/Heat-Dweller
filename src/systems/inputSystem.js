const movementKeyMap = {
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
};

const attackKeyMap = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export function setInput(game, event, value) {
  if (game.gameState === 'title') return;

  const movementKey = movementKeyMap[event.code];
  if (movementKey) {
    game.input[movementKey] = value;
    return;
  }

  const attackDirection = attackKeyMap[event.code];
  if (attackDirection && value) {
    if (typeof game.startAttack === 'function') {
      game.startAttack(attackDirection);
    }
  }
}

export function attachInputHandlers(game) {
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' && game.gameState === 'title') {
      game.startGame();
      return;
    }

    setInput(game, event, true);
  });

  window.addEventListener('keyup', (event) => {
    setInput(game, event, false);
  });

  window.addEventListener('resize', () => {
    if (typeof game.resizeCanvas === 'function') {
      game.resizeCanvas();
    }
  });

  const titleEl = document.getElementById('titleScreen');
  if (titleEl) {
    titleEl.addEventListener('click', () => game.startGame());
  }
}
