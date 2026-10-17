import { esc } from './utils.js';
import { t } from './i18n.js';
import { notify } from './ui.js';

export async function resizePhoto(file, watermark = false) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 31457280)
    throw Error(t('fileError'));
  const image = await createImageBitmap(file);
  if (image.width < 640 || image.height < 480) notify(t('smallPhoto'));
  const scale = Math.min(1, 1920 / image.width, 1440 / image.height),
    canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  if (watermark) {
    const logo = new Image();
    logo.src = 'logo.png';
    await logo.decode();
    const w = Math.min(260, canvas.width * 0.23),
      h = (w * logo.height) / logo.width;
    ctx.globalAlpha = 0.8;
    ctx.drawImage(logo, canvas.width - w - 12, canvas.height - h - 12, w, h);
  }
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.84));
  if (!blob) throw Error(t('fileError'));
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
}

export function qrSvg(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 192) throw Error(t('invalid'));
  const bits = [],
    add = (v, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
    };
  add(4, 4);
  add(bytes.length, 8);
  bytes.forEach((b) => add(b, 8));
  for (let n = 0; n < 4 && bits.length < 1552; n++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  let data = [];
  for (let i = 0; i < bits.length; i += 8)
    data.push(bits.slice(i, i + 8).reduce((a, b) => a * 2 + b, 0));
  for (let i = 0; data.length < 194; i++) data.push(i % 2 ? 17 : 236);
  const exp = Array(512).fill(0),
    log = Array(256).fill(0);
  for (let x = 1, i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x <<= 1;
    if (x & 256) x ^= 285;
  }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
  const mul = (a, b) => (a && b ? exp[log[a] + log[b]] : 0);
  let gen = [1];
  for (let i = 0; i < 24; i++) {
    const next = Array(gen.length + 1).fill(0);
    gen.forEach((v, j) => {
      next[j] ^= v;
      next[j + 1] ^= mul(v, exp[i]);
    });
    gen = next;
  }
  const blocks = [data.slice(0, 97), data.slice(97)],
    ecc = blocks.map((b) => {
      const out = [...b, ...Array(24).fill(0)];
      for (let i = 0; i < b.length; i++) {
        const n = out[i];
        for (let j = 0; j < gen.length; j++) out[i + j] ^= mul(gen[j], n);
      }
      return out.slice(-24);
    }),
    code = [];
  for (let i = 0; i < 97; i++) for (let j = 0; j < 2; j++) code.push(blocks[j][i]);
  for (let i = 0; i < 24; i++) for (let j = 0; j < 2; j++) code.push(ecc[j][i]);
  const n = 49,
    m = Array.from({ length: n }, () => Array(n).fill(null)),
    set = (x, y, v) => {
      if (x >= 0 && y >= 0 && x < n && y < n) m[y][x] = v;
    };
  for (const [x, y] of [
    [0, 0],
    [42, 0],
    [0, 42],
  ])
    for (let dy = -1; dy <= 7; dy++)
      for (let dx = -1; dx <= 7; dx++)
        set(
          x + dx,
          y + dy,
          dx >= 0 &&
            dx < 7 &&
            dy >= 0 &&
            dy < 7 &&
            (dx === 0 ||
              dx === 6 ||
              dy === 0 ||
              dy === 6 ||
              (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4))
            ? 1
            : 0,
        );
  for (const cy of [6, 24, 42])
    for (const cx of [6, 24, 42]) {
      if (m[cy][cx] !== null) continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1 ? 1 : 0);
    }
  for (let i = 8; i < n - 8; i++) {
    if (m[6][i] === null) set(i, 6, i % 2 === 0 ? 1 : 0);
    if (m[i][6] === null) set(6, i, i % 2 === 0 ? 1 : 0);
  }
  let format = 8 << 10;
  for (let i = 14; i >= 10; i--) if ((format >>> i) & 1) format ^= 0x537 << (i - 10);
  format = ((8 << 10) | format) ^ 0x5412;
  for (let i = 0; i < 15; i++) {
    const b = (format >>> i) & 1;
    set(8, i < 6 ? i : i < 8 ? i + 1 : n - 15 + i, b);
    set(i < 8 ? n - i - 1 : i < 9 ? 15 - i : 14 - i, 8, b);
  }
  set(8, n - 8, 1);
  let ver = 8 << 12;
  for (let i = 17; i >= 12; i--) if ((ver >>> i) & 1) ver ^= 0x1f25 << (i - 12);
  ver |= 8 << 12;
  for (let i = 0; i < 18; i++) {
    set(n - 11 + (i % 3), Math.floor(i / 3), (ver >>> i) & 1);
    set(Math.floor(i / 3), n - 11 + (i % 3), (ver >>> i) & 1);
  }
  let pos = 0,
    up = true;
  for (let right = n - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    for (let v = 0; v < n; v++) {
      const y = up ? n - 1 - v : v;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (m[y][x] !== null) continue;
        const bit = pos < code.length * 8 ? (code[pos >>> 3] >>> (7 - (pos & 7))) & 1 : 0;
        m[y][x] = bit ^ ((x + y) % 2 === 0 ? 1 : 0);
        pos++;
      }
    }
    up = !up;
  }
  return (
    `<svg class="qr" viewBox="0 0 57 57" role="img" aria-label="QR"><path fill="white" d="M0 0h57v57H0z"/><path fill="black" d="` +
    `${esc(m.flatMap((row, y) => row.map((v, x) => (v ? `M${esc(x + 4)} ${esc(y + 4)}h1v1h-1z` : ''))).join(''))}` +
    `"/></svg>`
  );
}
