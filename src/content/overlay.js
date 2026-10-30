import content from './content.json';

// Fills the HTML overlays from content.json. Runs before the scene starts, so the camera rig
// measures the sections at their final height.
function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  n.append(...children);
  return n;
}

const item = ({ year, title, summary }) =>
  el('li', {}, el('span', { class: 'yr' }, year), el('div', {}, el('b', {}, title), el('span', {}, summary)));

export function renderOverlays() {
  document.querySelector('[data-list="projects"]').replaceChildren(...content.projects.map(item));
  document.querySelector('[data-list="education"]').replaceChildren(...content.education.map(item));
  document.querySelector('[data-contact="email"]').textContent = content.contact.email;
  document.querySelector('[data-contact="links"]').replaceChildren(
    ...content.contact.links.map(({ label, href }) => el('a', { href, target: '_blank', rel: 'noopener' }, label))
  );
}
