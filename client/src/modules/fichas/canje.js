import { n, esc, fmtUSD, fmtPct, fmtPctSigned, fmtNum, fmtM2Smart, mapsUrl, pinLabel } from '../../lib/format.js';
import { icon } from '../../lib/icons.js';
import { exportarPDF, enviarPorWhatsApp } from '../../lib/pdfExport.js';
import { fichasApi } from './fichasApi.js';
import { showToast } from '../../lib/toast.js';

export const BLANK = {
  nombreProyecto: '', direccion: '', zona: '', ubicacionDescripcion: '',
  costoTierra: '', detalleCosto: 'Incluye costo del terreno, comisión inmobiliaria, costo de escritura, comisión de SMARTANS y costos de demolición.',
  superficieVendible: '', canjeMin: '', canjeBase: '', canjeMax: '',
  precioPozo: '', precioTerminado: '', inversionMinima: '',
  web: '', email: '', whatsapp: '',
  tituloL1: 'Invertí en la compra de la tierra.',
  tituloL2: 'Obtené metros cuadrados de pozo al mejor valor.',
  tituloL3: 'Garantizá tu inversión a través de la tierra.',
};

export const EXAMPLE = {
  ...BLANK,
  nombreProyecto: 'Ugarte 2729', direccion: 'Ugarte 2729, Belgrano, CABA', zona: 'Belgrano, CABA',
  ubicacionDescripcion: 'Belgrano, a metros de Av. Cabildo y Av. Congreso. Zona consolidada, alta demanda y excelente conectividad.',
  costoTierra: 820000, superficieVendible: 1360, canjeMin: 26, canjeBase: 28, canjeMax: 30,
  precioPozo: 2800, precioTerminado: 3200, inversionMinima: 50000,
  web: 'https://www.smartans.pro', email: 'inmuebles@smartans.pro', whatsapp: '5491135252013',
};

function calcular(d) {
  const base = [
    { k: 'min', canje: n(d.canjeMin) },
    { k: 'base', canje: n(d.canjeBase) },
    { k: 'max', canje: n(d.canjeMax) },
  ];
  const escenarios = base.map((e) => {
    const m2Grupo = (n(d.superficieVendible) * e.canje) / 100;
    const costoM2 = m2Grupo > 0 ? n(d.costoTierra) / m2Grupo : 0;
    const rentPozo = costoM2 > 0 ? (n(d.precioPozo) / costoM2 - 1) * 100 : 0;
    const rentTerminado = costoM2 > 0 ? (n(d.precioTerminado) / costoM2 - 1) * 100 : 0;
    return { k: e.k, canje: e.canje, m2Grupo, costoM2, rentPozo, rentTerminado };
  });
  const costos = escenarios.map((e) => e.costoM2).filter((v) => v > 0);
  const rents = [];
  escenarios.forEach((e) => rents.push(e.rentPozo, e.rentTerminado));
  return {
    escenarios,
    costoM2Min: costos.length ? Math.min(...costos) : 0,
    costoM2Max: costos.length ? Math.max(...costos) : 0,
    rentMin: rents.length ? Math.min(...rents) : 0,
    rentMax: rents.length ? Math.max(...rents) : 0,
  };
}

function buildPreviewHTML(d, c, heroDataURL) {
  const zonaOrDireccion = d.zona || d.direccion || 'la zona';
  const mUrl = mapsUrl(d);
  const heroStyle = heroDataURL ? ` style="background-image:url('${heroDataURL}')"` : '';
  const heroClass = heroDataURL ? 'hero' : 'hero hero-noimg';
  const logoBlockHero = '<img class="hero-logo-img" src="/logo.png" alt="SMARTANS" />';
  const logoBlockFoot = '<img class="foot-logo-img" src="/logo.png" alt="SMARTANS" />';
  const titleLines = [
    { ic: 'building', txt: d.tituloL1 },
    { ic: 'dollarDown', txt: d.tituloL2 },
    { ic: 'shield', txt: d.tituloL3 },
  ]
    .filter((l) => (l.txt || '').trim().length)
    .map((l) => `<div class="hero-title-line">${icon(l.ic)}<span>${esc(l.txt)}</span></div>`)
    .join('');
  const pLabel = pinLabel(d);
  const pinHtml = mUrl
    ? `<a class="hero-pin" href="${mUrl}" target="_blank" rel="noopener">${icon('pin')}<span>${esc(pLabel)}</span></a>`
    : `<span class="hero-pin">${icon('pin')}<span>${esc(pLabel)}</span></span>`;
  const hero =
    `<div class="${heroClass}"${heroStyle}>${heroDataURL ? '<div class="hero-scrim"></div>' : ''}` +
    `<div class="hero-top">${logoBlockHero}</div><div class="hero-mid">${titleLines}</div>` +
    `<div class="hero-bottom"><div class="hero-stats">` +
    `<div class="hero-stat">${icon('tag')}<div class="hero-stat-txt"><span class="hero-stat-val"><span class="u">US$</span>${fmtNum(c.costoM2Min, 0)} – ${fmtNum(c.costoM2Max, 0)}<span class="s">/m²</span></span><span class="hero-stat-lbl">Rango de precios estimados por m² a obtener del canje</span></div></div>` +
    `<div class="hero-stat">${icon('trending')}<div class="hero-stat-txt"><span class="hero-stat-val">${fmtPct(c.rentMin, 1)} a ${fmtPct(c.rentMax, 1)}</span><span class="hero-stat-lbl">Rentabilidad total estimada *</span></div></div>` +
    `</div>${pinHtml}</div></div>`;

  const pasos = [
    { nm: '01', t: 'Financiamiento de la tierra', h: `Entre varios inversores se reúne el capital para comprar el terreno por <b>${fmtUSD(d.costoTierra)}</b>, a través de un fideicomiso inmobiliario.` },
    { nm: '02', t: 'Canje con el desarrollador', h: 'SMARTANS buscará un desarrollador inmobiliario para aportarle la tierra en canje (estructurando las <b>garantías</b> correspondientes) para que construya el edificio.' },
    { nm: '03', t: 'Pago en metros terminados', h: `Como pago por la tierra, el desarrollador entrega al grupo inversor un <b>porcentaje de los m² de unidades terminadas</b>. El canje se estima entre el <b>${fmtNum(d.canjeMin, 0)}%</b> y el <b>${fmtNum(d.canjeMax, 0)}%</b>.` },
    { nm: '04', t: 'Recupero de inversión', h: 'Los inversores pasan a ser dueños de unidades por el total de m² recibidos en el edificio, con la <b>tierra como respaldo</b>. SMARTANS distribuye la utilidad a los inversores.' },
  ];
  const comoFunciona = `<div class="doc-section"><div class="doc-eyebrow">¿Cómo funciona?</div><div class="steps">${pasos.map((p) => `<div class="step"><div class="step-n">${p.nm}</div><div><h3>${esc(p.t)}</h3><p>${p.h}</p></div></div>`).join('')}</div></div>`;

  const statCards = [
    { ic: 'building', label: 'Adquisición de la tierra', val: fmtUSD(d.costoTierra), obs: esc(d.detalleCosto) },
    { ic: 'maximize', label: 'Superficie vendible', sub: 'estimada', val: fmtM2Smart(d.superficieVendible), obs: 'Superficie obtenida a través de estudio de prefactibilidad en base al código vigente.' },
    { ic: 'shuffle', label: 'Canje estimado', sub: '(tierra → m²)', val: `${fmtNum(d.canjeMin, 0)}% – ${fmtNum(d.canjeMax, 0)}%`, obs: 'Rango de valores de canje estudiados para la zona.' },
    { ic: 'coins', label: 'Inversión mínima', val: fmtUSD(d.inversionMinima), obs: '' },
  ];
  const bodyCards = [
    { ic: 'shield', label: 'Garantía real', h: 'La tierra como <b>garantía de entrega</b> del desarrollador durante toda la obra.' },
    { ic: 'dollarDown', label: 'Mejor valor', h: 'M² a un <b>valor muy inferior</b> al de una compra de pozo tradicional.' },
  ];
  const numeros =
    `<div class="doc-section"><div class="doc-eyebrow">La inversión en números</div><div class="cards6">` +
    statCards.map((x) => `<div class="card"><div class="card-top">${icon(x.ic)}<span>${esc(x.label)}${x.sub ? `<span class="sub">${esc(x.sub).toUpperCase()}</span>` : ''}</span></div><div class="card-val">${x.val}</div>${x.obs ? `<div class="card-obs">${x.obs}</div>` : ''}</div>`).join('') +
    bodyCards.map((x) => `<div class="card"><div class="card-top">${icon(x.ic)}<span>${esc(x.label)}</span></div><p class="card-body">${x.h}</p></div>`).join('') +
    '</div></div>';

  const rows = c.escenarios
    .map(
      (e) =>
        `<tr class="${e.k === 'base' ? 'base' : ''}"><td>${fmtNum(e.canje, 0)}%${e.k === 'base' ? '<span class="base-pill">BASE</span>' : ''}</td><td>${fmtM2Smart(e.m2Grupo)}</td><td>${fmtUSD(e.costoM2)}</td><td class="pos">${fmtPctSigned(e.rentPozo, 1)}</td><td class="pos">${fmtPctSigned(e.rentTerminado, 1)}</td></tr>`
    )
    .join('');
  const tabla =
    `<div class="doc-section"><div class="doc-eyebrow">Escenarios y rentabilidad</div>` +
    `<div class="table-card"><div class="tablewrap"><table class="esc"><thead><tr><th>Escenario<span class="sub">de canje</span></th><th>m² para<span class="sub">el grupo</span></th><th>Costo por m²<span class="sub">para el inversor</span></th><th>Reventa en pozo<span class="sub">valor zona ${fmtUSD(d.precioPozo)}</span></th><th>Obra terminada<span class="sub">valor zona ${fmtUSD(d.precioTerminado)}</span></th></tr></thead><tbody>${rows}</tbody></table></div></div>` +
    `<div class="table-note">* Rentabilidad calculada en cada escenario tomando el costo de adquisición y los precios estimados de venta. Cifras de carácter orientativo.</div></div>`;

  const ubicacionTxt = (d.ubicacionDescripcion || '').trim() || `Terreno en ${zonaOrDireccion}, una zona consolidada con demanda sostenida.`;
  const whys = [
    { ic: 'clock', t: 'Entrás antes que el mercado', h: 'Los inversores adquieren los metros con asignación desde la aprobación del proyecto, a un valor inferior a pozos comparables de mercado en la zona.' },
    { ic: 'pin', t: 'Ubicación premium', h: esc(ubicacionTxt) },
    { ic: 'shield', t: 'Garantía real', h: 'A diferencia de una compra de pozo tradicional, la inversión cuenta con la tierra como garantía de entrega del desarrollador.' },
  ];
  const porque = `<div class="doc-section"><div class="doc-eyebrow">¿Por qué invertir?</div><div class="whys">${whys.map((w) => `<div class="why">${icon(w.ic)}<h3>${esc(w.t)}</h3><p>${w.h}</p></div>`).join('')}</div></div>`;

  const contactLinks = [];
  if (d.web) contactLinks.push(`<a href="${/^https?:\/\//i.test(d.web) ? d.web : 'https://' + d.web}" target="_blank" rel="noopener">${icon('globe')}<span>${esc(d.web)}</span></a>`);
  if (d.email) contactLinks.push(`<a href="mailto:${esc(d.email)}">${icon('mail')}<span>${esc(d.email)}</span></a>`);
  const footer = `<div class="doc-footer"><div class="contact">${contactLinks.join('')}</div>${logoBlockFoot}</div>`;

  return hero + comoFunciona + numeros + tabla + porque + footer;
}

const FORM_HTML = `
  <div class="editor-shell">
    <div class="formpanel">
      <div class="editor-head" style="justify-content:space-between;">
        <h1>Canje de tierra</h1>
        <div style="display:flex;gap:8px;">
          <button class="btn" type="button" id="cjBtnCancel">Cancelar</button>
          <button class="btn btn-primary" type="button" id="cjBtnSave">Guardar</button>
        </div>
      </div>
      <div class="quickrow" style="display:flex;gap:8px;padding-bottom:14px;">
        <button class="btn btn-small" type="button" id="cjBtnExample">✦ Cargar ejemplo</button>
      </div>
      <form id="cjForm" autocomplete="off">
        <fieldset>
          <legend>Proyecto y ubicación</legend>
          <div class="field"><label>Nombre del proyecto</label><input type="text" name="nombreProyecto" /></div>
          <div class="field"><label>Dirección completa</label><input type="text" name="direccion" /></div>
          <div class="field"><label>Zona / barrio</label><input type="text" name="zona" /></div>
          <div class="field"><label>Descripción de la ubicación</label><textarea name="ubicacionDescripcion"></textarea></div>
        </fieldset>
        <fieldset>
          <legend>El terreno</legend>
          <div class="field"><label>Costo de adquisición</label><div class="prefix-field"><span>US$</span><input type="number" name="costoTierra" /></div></div>
          <div class="field"><label>Detalle del costo</label><textarea name="detalleCosto"></textarea></div>
          <div class="field"><label>Superficie vendible (m²)</label><input type="number" name="superficieVendible" /></div>
        </fieldset>
        <fieldset>
          <legend>Canje con el desarrollador</legend>
          <div class="row3">
            <div class="field"><label>Mínimo %</label><input type="number" name="canjeMin" /></div>
            <div class="field"><label>Base %</label><input type="number" name="canjeBase" /></div>
            <div class="field"><label>Máximo %</label><input type="number" name="canjeMax" /></div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Precios de venta de referencia</legend>
          <div class="row2">
            <div class="field"><label>En pozo (US$/m²)</label><input type="number" name="precioPozo" /></div>
            <div class="field"><label>Obra terminada (US$/m²)</label><input type="number" name="precioTerminado" /></div>
          </div>
          <div class="field"><label>Inversión mínima</label><div class="prefix-field"><span>US$</span><input type="number" name="inversionMinima" /></div></div>
        </fieldset>
        <fieldset>
          <legend>Imagen del edificio</legend>
          <label class="upload" id="cjUploadHero"><input type="file" accept="image/*" id="cj-heroFile" /><div class="upload-txt"><b>Subí un render o foto del edificio</b>Si no subís nada, se usa un fondo degradado.</div></label>
        </fieldset>
        <fieldset>
          <legend>Contacto (pie de página)</legend>
          <div class="field"><label>Sitio web</label><input type="text" name="web" /></div>
          <div class="field"><label>Email</label><input type="text" name="email" /></div>
          <div class="field"><label>WhatsApp (con código de país)</label><input type="text" name="whatsapp" /></div>
        </fieldset>
        <details class="adv">
          <summary>Personalizar textos del encabezado</summary>
          <div class="field"><label>Línea 1</label><input type="text" name="tituloL1" /></div>
          <div class="field"><label>Línea 2</label><input type="text" name="tituloL2" /></div>
          <div class="field"><label>Línea 3</label><input type="text" name="tituloL3" /></div>
        </details>
      </form>
    </div>
    <div class="previewcol">
      <div class="previewbar"><div class="previewbar-info">Vista previa en vivo</div>
        <div style="display:flex;gap:8px;"><button class="btn btn-whatsapp" id="cjBtnWhatsapp" type="button">📱 Enviar por WhatsApp</button><button class="btn btn-primary" id="cjBtnExport" type="button">⬇ Descargar PDF</button></div>
      </div>
      <div class="previewstage"><div class="stage"><div id="previewCanje"></div></div></div>
    </div>
  </div>`;

function buildWhatsappText(d, driveLink) {
  const linkBlock = driveLink ? `Más información en el siguiente link:\n${driveLink}\n\n` : 'Te paso el PDF con toda la información.\n\n';
  return `¡Hola a todos!\n\nLes paso la ficha del proyecto "${d.nombreProyecto || 'el proyecto'}".\n\n${linkBlock}Cualquier duda me consultan.\n\nSaludos!`;
}

/** onDone(savedFichaOrNull) se llama después de Guardar (con la ficha) o
 *  Cancelar (con null) — quien llama decide qué hacer (volver al listado). */
export function mountCanjeEditor(viewContainer, ficha, onDone) {
  viewContainer.innerHTML = FORM_HTML;
  let state = ficha?.data && Object.keys(ficha.data).length ? { ...BLANK, ...ficha.data } : { ...BLANK };
  let heroDataURL = ficha?.hero ?? null;
  let heroChanged = false;

  function render() {
    const c = calcular(state);
    viewContainer.querySelector('#previewCanje').innerHTML = buildPreviewHTML(state, c, heroDataURL);
  }

  function bindFormFromState() {
    const form = viewContainer.querySelector('#cjForm');
    [...form.elements].forEach((el) => {
      if (el.name && state[el.name] !== undefined) el.value = state[el.name];
    });
  }

  viewContainer.querySelector('#cjBtnExample').addEventListener('click', () => {
    state = { ...EXAMPLE };
    bindFormFromState();
    render();
    showToast('Ejemplo cargado.');
  });

  const form = viewContainer.querySelector('#cjForm');
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.name) return;
    state[t.name] = t.type === 'number' ? (t.value === '' ? '' : parseFloat(t.value)) : t.value;
    render();
  });

  viewContainer.querySelector('#cj-heroFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      heroDataURL = reader.result;
      heroChanged = true;
      render();
    };
    reader.readAsDataURL(file);
  });

  viewContainer.querySelector('#cjBtnExport').addEventListener('click', () => {
    exportarPDF('previewCanje', state.nombreProyecto || 'ficha_canje', '#0a1a2a');
  });
  viewContainer.querySelector('#cjBtnWhatsapp').addEventListener('click', () => {
    if (!ficha?.id) {
      showToast('Guardá la ficha antes de compartirla.', 'danger');
      return;
    }
    enviarPorWhatsApp(ficha.id, 'previewCanje', state.nombreProyecto || 'ficha_canje', '#0a1a2a', (link) => buildWhatsappText(state, link));
  });

  viewContainer.querySelector('#cjBtnCancel').addEventListener('click', () => onDone?.(null));
  viewContainer.querySelector('#cjBtnSave').addEventListener('click', async () => {
    const btn = viewContainer.querySelector('#cjBtnSave');
    btn.disabled = true;
    const payload = { tipo: 'canje', nombre: state.nombreProyecto || 'Ficha sin título', data: state };
    if (heroChanged) payload.hero = heroDataURL; // dataURL nueva, o null si se sacó
    try {
      const saved = ficha?.id ? await fichasApi.update(ficha.id, payload) : await fichasApi.create(payload);
      showToast('Ficha guardada.');
      onDone?.(saved);
    } catch (err) {
      showToast('No se pudo guardar: ' + err.message, 'danger');
      btn.disabled = false;
    }
  });

  bindFormFromState();
  render();
}
