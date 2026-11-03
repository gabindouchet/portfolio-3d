// Content cards are hidden by default. The chip in each shot toggles its card; a click outside
// the open card or Escape closes it.
export function initCards() {
  const slots = [...document.querySelectorAll('.slot')];

  const set = (slot, open) => {
    slot.classList.toggle('open', open);
    slot.querySelector('.reveal').setAttribute('aria-expanded', String(open));
  };

  for (const slot of slots) {
    slot.querySelector('.reveal').addEventListener('click', () => {
      const open = !slot.classList.contains('open');
      slots.forEach(s => set(s, false));
      set(slot, open);
    });
  }

  document.addEventListener('click', (e) => {
    for (const slot of slots) if (slot.classList.contains('open') && !slot.contains(e.target)) set(slot, false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = slots.find(s => s.classList.contains('open'));
    if (open) { set(open, false); open.querySelector('.reveal').focus(); }
  });
}
