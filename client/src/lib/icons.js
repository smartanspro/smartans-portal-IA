// Íconos SVG inline usados en la ficha de Canje de tierra — portados del index.html viejo.

const ICON_PATHS = {
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
  building: '<rect x="7" y="3.5" width="10" height="17" rx="1.6"/><path d="M9.4 8h1.6M13 8h1.6M9.4 12h1.6M13 12h1.6M9.4 16h1.6M13 16h1.6"/>',
  maximize: '<path d="M9 3H5.5A2.5 2.5 0 0 0 3 5.5V9"/><path d="M15 21h3.5a2.5 2.5 0 0 0 2.5-2.5V15"/>',
  shuffle: '<path d="M4 16h3l7-11h6"/><path d="M17 3l3 2-3 2"/><path d="M4 8h3l1.5 2.4"/><path d="M13.5 13.6L15 16h5"/><path d="M17 21l3-2-3-2"/>',
  trending: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><polyline points="12 7 12 12 15.5 14"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 6.5l9 6.2 9-6.2"/>',
  chat: '<path d="M21 11.5a8 8 0 0 1-8 8H7l-4 3 .7-4.2A8 8 0 1 1 21 11.5Z"/>',
  globe: '<circle cx="12" cy="12" r="9.5"/><line x1="2.5" y1="12" x2="21.5" y2="12"/><path d="M12 2.5c2.6 2.5 4 6 4 9.5s-1.4 7-4 9.5c-2.6-2.5-4-6-4-9.5s1.4-7 4-9.5Z"/>',
  dollar: '<path d="M12 2v20"/><path d="M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.8 5 3.3 5 1.4 5 3.4-2.2 3-5 3-5-1.1-5-3"/>',
  dollarDown:
    '<path d="M9.5 2.5v13"/><path d="M13 5.3c0-1.15-1.57-1.8-3.5-1.8s-3.5.65-3.5 1.8 1.57 1.68 3.5 1.98 3.5.83 3.5 1.98-1.57 1.8-3.5 1.8-3.5-.65-3.5-1.8"/><path d="M17 13.5v8"/><polyline points="13.5 18.5 17 22 20.5 18.5"/>',
  tag: '<path d="M20.6 12.4 12.4 20.6a2 2 0 0 1-2.8 0L3 14V3h11l6.6 6.6a2 2 0 0 1 0 2.8Z"/><path d="M7.5 7.5h.01"/>',
  shield: '<path d="M12 2 4 5v6c0 5.2 3.4 9.4 8 11 4.6-1.6 8-5.8 8-11V5l-8-3Z"/><path d="M9 12l2 2 4-4"/>',
  coins:
    '<ellipse cx="12" cy="7" rx="6.5" ry="3.2"/><path d="M5.5 7v4.5c0 1.77 2.9 3.2 6.5 3.2s6.5-1.43 6.5-3.2V7"/><path d="M5.5 11.5V16c0 1.77 2.9 3.2 6.5 3.2s6.5-1.43 6.5-3.2v-4.5"/>',
};

export function icon(name) {
  const p = ICON_PATHS[name] || '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}
