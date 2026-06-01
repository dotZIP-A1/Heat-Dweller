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

const menuLeftKeys = ['ArrowLeft', 'KeyA'];
const menuRightKeys = ['ArrowRight', 'KeyD'];
const menuConfirmKeys = ['Enter', 'NumpadEnter'];

export function setInput(game, event, value) {
  if (game.gameState === 'title') {
    if (value && menuConfirmKeys.includes(event.code)) {
      if (typeof game.startCharacterSelect === 'function') {
        game.startCharacterSelect();
      }
    }
    return;
  }

  if (game.gameState === 'characterSelect') {
    if (!value) return;

    if (menuLeftKeys.includes(event.code)) {
      game.changeSelection(-1);
      return;
    }

    if (menuRightKeys.includes(event.code)) {
      game.changeSelection(1);
      return;
    }

    if (menuConfirmKeys.includes(event.code)) {
      if (typeof game.confirmCharacterSelection === 'function') {
        game.confirmCharacterSelection();
      }
      return;
    }

    return;
  }

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
    titleEl.addEventListener('click', () => {
      if (typeof game.startCharacterSelect === 'function') {
        game.startCharacterSelect();
      }
    });
  }
}
