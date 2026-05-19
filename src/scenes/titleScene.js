export function showTitleScreen() {
  const titleEl = document.getElementById('titleScreen');
  if (titleEl) {
    titleEl.style.display = 'flex';
  }
}

export function hideTitleScreen() {
  const titleEl = document.getElementById('titleScreen');
  if (titleEl) {
    titleEl.style.display = 'none';
  }
}
