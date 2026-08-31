// Helpers de formato/escape — portados 1:1 del index.html viejo (son lógica
// de presentación pura, no cambian con la migración de backend).

export function n(v) {
  const x = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(x) ? x : 0;
}
export function fmtUSD(v) {
  return 'US$ ' + Math.round(n(v)).toLocaleString('es-AR');
}
export function fmtNum(v, d = 0) {
  return n(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function fmtPct(v, d = 1) {
  return n(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
}
export function fmtPctSigned(v, d = 1) {
  const s = n(v) >= 0 ? '+' : '';
  return s + fmtPct(v, d);
}
export function fmtM2Smart(v) {
  return fmtNum(v, 0) + ' m²';
}
export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
export function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}
export function nl2p(t) {
  return (t || '')
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>')
    .join('');
}
export function fmtFecha(v) {
  if (!v) return '';
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const parts = v.split('-');
  if (parts.length !== 3) return v;
  const [y, mStr, dStr] = parts;
  const m = parseInt(mStr, 10) - 1;
  const d = parseInt(dStr, 10);
  if (!meses[m]) return v;
  return `${d} de ${meses[m]} de ${y}`;
}
export function mapsUrl(d) {
  const q = (d.direccion || d.zona || '').trim();
  return q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
}
export function pinLabel(d) {
  const base = (d.direccion || d.zona || '').trim();
  if (!base) return 'VER UBICACIÓN';
  return base.toUpperCase().replace(/,\s*/g, ' · ');
}
export function webUrl(d) {
  const w = (d.web || '').trim();
  if (!w) return '';
  return /^https?:\/\//i.test(w) ? w : 'https://' + w;
}
export function mailUrl(d) {
  const e = (d.email || '').trim();
  return e ? 'mailto:' + e : '';
}
export function waUrl(d) {
  const digits = (d.whatsapp || '').replace(/\D/g, '');
  return digits ? 'https://wa.me/' + digits : '';
}
export function waDisplay(d) {
  const digits = (d.whatsapp || '').replace(/\D/g, '');
  if (/^549\d{10}$/.test(digits)) return `(+54 9) ${digits.slice(3, 5)} ${digits.slice(5, 9)}-${digits.slice(9, 13)}`;
  return digits ? '+' + digits : '';
}
