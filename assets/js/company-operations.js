for (const menu of document.querySelectorAll('.operations-menu')) {
  menu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !menu.open) return;
    event.stopPropagation();
    menu.open = false;
    menu.querySelector('summary').focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
}
