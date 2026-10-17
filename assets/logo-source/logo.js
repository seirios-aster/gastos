// Source of the app logo (a playful flying G). Each export returns an SVG string; the PNGs in
// assets/images were rendered from these at 1024px (icon, adaptive layers), 512px (splash),
// 96px (notification) and 48px (favicon), by drawing the SVG in a headless browser.
// Draws the Gastos logo (a playful flying G) as SVG strings, for the renderer.
const BG = (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B4B5FF"/><stop offset="1" stop-color="#5553DB"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#${id})"/>`;

// The mark itself on a 1024 canvas, centred; `fill` colours the G and wing, `extra` toggles detail.
const mark = ({ fill = '#fff', wingOpacity = 0.75, detail = true } = {}) => `
  <g transform="translate(0 40) rotate(-8 512 520)">
    <!-- motion lines -->
    <g stroke="${fill}" stroke-linecap="round" stroke-width="30" opacity="${detail ? 0.55 : 1}">
      <path d="M190 470 H270"/><path d="M160 560 H250"/><path d="M200 650 H280"/>
    </g>
    <!-- the G: a fat round arc with its bar -->
    <path d="M700 380 A230 230 0 1 0 724 612 H548" fill="none" stroke="${fill}" stroke-width="124" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- a little wing: three feathers fanned out from the G's top end -->
    <g fill="${fill}">
      <g transform="translate(688 392) rotate(-8)"><path d="M0 0 C 58 -51 172 -54 230 0 C 172 31 58 24 0 0Z" opacity="${wingOpacity}"/></g>
      <g transform="translate(688 392) rotate(-40)"><path d="M0 0 C 51 -51 154 -54 205 0 C 154 31 51 24 0 0Z" opacity="${Math.min(1, wingOpacity + 0.12)}"/></g>
      <g transform="translate(688 392) rotate(-72)"><path d="M0 0 C 41 -51 124 -54 165 0 C 124 31 41 24 0 0Z"/></g>
    </g>
  </g>
  ${detail ? `<!-- a coin and a sparkle for fun -->
  <circle cx="770" cy="760" r="46" fill="#FFD166"/><circle cx="770" cy="760" r="30" fill="none" stroke="#F2A93B" stroke-width="9"/>
  <path d="M250 270 l14 38 38 14 -38 14 -14 38 -14 -38 -38 -14 38 -14z" fill="#fff"/>` : ''}`;

exports.tile = (rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${rounded ? '<clipPath id="r"><rect width="1024" height="1024" rx="230"/></clipPath><g clip-path="url(#r)">' : '<g>'}${BG('g')}${mark()}</g></svg>`;
exports.foreground = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><g transform="translate(512 512) scale(.74) translate(-512 -512)">${mark()}</g></svg>`;
exports.background = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${BG('g')}</svg>`;
exports.mono = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><g transform="translate(512 512) scale(.74) translate(-512 -512)">${mark({ fill: '#000', wingOpacity: 1, detail: false })}</g></svg>`;
exports.notif = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><g transform="translate(512 512) scale(.95) translate(-512 -512)">${mark({ fill: '#fff', wingOpacity: 1, detail: false })}</g></svg>`;
exports.markSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${mark()}</svg>`;
