import { GameEngine } from './core/gameEngine.js';

// Boot the game once the UI is ready.
document.addEventListener('DOMContentLoaded', async () => {
  const game = new GameEngine();
  await game.init();
});
