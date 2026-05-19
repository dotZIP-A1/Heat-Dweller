export const keyMap = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
};

export function setInput(game, event, value) {
  if (game.gameState === 'title') return;
  const mappedKey = keyMap[event.code];
  if (!mappedKey) return;
  game.input[mappedKey] = value;
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
