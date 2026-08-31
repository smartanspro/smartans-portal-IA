import { n, esc, escAttr, fmtUSD, fmtPct, fmtFecha, nl2p } from '../../lib/format.js';
import { exportarPDF, enviarPorWhatsApp } from '../../lib/pdfExport.js';
import { fichasApi } from './fichasApi.js';
import { showToast } from '../../lib/toast.js';

export const BLANK = {
  operacion: '', nombreInterno: '', fechaEstimada: '',
  tipoInversionBullets: ['Colocación de dólares a tasa fija.', 'Inversión en préstamo privado.', 'Inmuebles en garantía.'],
  tasacionGarantia: '', tasacionProyectada: '', primerDesembolsoLabel: 'Primer Desembolso', primerDesembolso: '', lineaCreditoTotal: '',
  plazoMeses: '', inversionMinima: '', ubicacion: '',
  tipoGarantia: 'Fideicomiso', moneda: 'Dólares (billete)',
  amortizacionTitulo: 'Americano', amortizacionSub: '(paga intereses mensuales y el capital al vencimiento)',
  tasas: [{ desde: 25000, tna: '' }, { desde: 50000, tna: '' }, { desde: 100000, tna: '' }],
  garantiaInfo: '', garantiaInfoExtra: '',
  formatoGarantia: ['Fideicomiso en garantía.', 'Transferencia de dominio de las propiedades por escritura pública.'],
  faqs: [
    { q: '¿Por qué es confiable esta inversión?', a: 'El tomador del crédito aporta los inmuebles en garantía, los cuales son escriturados a nombre de nuestra empresa fiduciaria.' },
    { q: '¿A quién le estoy dando mi dinero?', a: 'El dinero lo recibe directamente el tomador del crédito, ante escribano público.' },
    { q: '¿Las tasas publicadas son netas?', a: 'Sí, netas de gastos de Smartans, sin costos adicionales mientras el deudor cumpla.' },
  ],
  montoSimulado: '',
};

export const EXAMPLE = {
  ...BLANK,
  operacion: 'Edificio Lavalle 796, CABA (Primer Desembolso)', fechaEstimada: '2026-08-06',
  tasacionGarantia: 7000000, primerDesembolso: 1500000, lineaCreditoTotal: 3650000,
  plazoMeses: 36, inversionMinima: 25000, ubicacion: 'Lavalle y Esmeralda, Microcentro, CABA',
  tasas: [{ desde: 25000, tna: 10 }, { desde: 50000, tna: 11 }, { desde: 100000, tna: 12 }],
  garantiaInfo:
    'Edificio de 3.700 m² cubiertos ubicado en la esquina de Lavalle y Esmeralda. Cuenta con 7 plantas de oficinas de entre 300 m² y 450 m², locales comerciales en Planta Baja y depósitos en el subsuelo.\n\nSe encuentra en el epicentro del Microcentro porteño, a 2 cuadras del obelisco, 1 cuadra de Av. Corrientes y a 6 cuadras de Av. Paseo Colón con acceso inmediato a los principales accesos, estaciones de subte y líneas colectivos lo que garantiza una excelente conectividad con toda la Ciudad de Buenos Aires y la Provincia.',
  montoSimulado: 100000,
};

export const EXAMPLE_2 = {
  ...BLANK,
  operacion: 'Shale, Vaca Muerta (Décimo Primer Desembolso)', nombreInterno: 'Crédito con Garantía II', fechaEstimada: '2026-08-24',
  tasacionGarantia: 5500000, tasacionProyectada: 8000000,
  primerDesembolsoLabel: 'Décimo Primer Desembolso', primerDesembolso: 150000, lineaCreditoTotal: 3000000,
  plazoMeses: 24, inversionMinima: 25000, ubicacion: 'Añelo, Neuquén (Vaca Muerta)',
  tasas: [{ desde: 25000, tna: 10 }, { desde: 50000, tna: 11 }, { desde: 100000, tna: 12 }],
  garantiaInfo:
    '3 Módulos de departamentos de 307 m² cubiertos y 100 m² semi-cubiertos totales, sobre un lote de 360 m², 2 Módulos de departamentos con un grado de avance del 90% y 3 terrenos aptos multifamiliar de 360 m² para replicar edificios con departamentos ubicados en zona estratégica de Añelo (Vaca Muerta).',
  garantiaInfoExtra: 'Los desembolsos del crédito se irán realizando a medida que avance la obra, manteniendo siempre un límite de aforo del 50% del valor del inmueble.',
  montoSimulado: 100000,
};

function cloneState(base) {
  return {
    ...base,
    tipoInversionBullets: base.tipoInversionBullets.slice(),
    formatoGarantia: base.formatoGarantia.slice(),
    tasas: base.tasas.map((t) => ({ ...t })),
    faqs: base.faqs.map((f) => ({ ...f })),
  };
}

function tituloCorto(operacion) {
  return (operacion || '').replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Nombre de la operación';
}

function logoBlockHtml() {
  return '<img class="doc-logo-img" src="/logo.png" alt="SMARTANS" /><div class="doc-logo-text"><span class="m1">SMARTANS</span><span class="m2">GROUP</span></div>';
}

function buildPreviewHTML(d) {
  const tasasSorted = d.tasas.slice().sort((a, b) => n(a.desde) - n(b.desde));
  const tnas = tasasSorted.map((t) => n(t.tna)).filter((v) => v > 0);
  const tnaMaxima = tnas.length ? Math.max(...tnas) : 0;
  const tnaCardsHTML =
    tasasSorted
      .map(
        (t) =>
          `<div class="cr2-tna-card"><div class="cr2-tna-label">Invirtiendo desde</div><div class="cr2-tna-monto">${fmtUSD(t.desde)}</div><div class="cr2-tna-val">${fmtPct(t.tna, 2)}<span class="unit">TNA</span></div></div>`
      )
      .join('') || '<div class="cr2-tna-card"><div class="cr2-tna-label">Cargá los tramos de tasa a la izquierda.</div></div>';

  const bulletsInv = d.tipoInversionBullets.filter((b) => b.trim());
  const desembolsoLabel = d.primerDesembolsoLabel || 'Primer Desembolso';
  const subtitle = [desembolsoLabel, ...bulletsInv].join(' · ');

  const montoCreditoHTML =
    n(d.lineaCreditoTotal) > 0
      ? `${fmtUSD(d.primerDesembolso)} <span style="color:var(--doc2-muted);font-weight:600;">(línea ${fmtUSD(d.lineaCreditoTotal)})</span>`
      : fmtUSD(d.primerDesembolso);
  const tasacionHTML =
    n(d.tasacionProyectada) > 0
      ? `${fmtUSD(d.tasacionGarantia)} <span style="color:var(--doc2-muted);font-weight:600;">(proy. ${fmtUSD(d.tasacionProyectada)})</span>`
      : fmtUSD(d.tasacionGarantia);
  const amortizacionHTML = esc(d.amortizacionTitulo) + (d.amortizacionSub ? ' — ' + esc(d.amortizacionSub) : '');

  const condItems = [
    ['Tipo de inversión', esc(bulletsInv[0] || 'Renta fija')],
    ['Tipo de garantía', esc(d.tipoGarantia)],
    ['Moneda', esc(d.moneda)],
    ['Amortización', amortizacionHTML],
    ['Monto del crédito', montoCreditoHTML],
    ['Tasación garantía', tasacionHTML],
    ['Ubicación', esc(d.ubicacion || '—')],
    ['Fecha estimada', esc(fmtFecha(d.fechaEstimada))],
  ];
  const condGridHTML = condItems.map(([label, val]) => `<div class="cr2-cond-item"><div class="cr2-cond-label">${label}</div><div class="cr2-cond-val">${val}</div></div>`).join('');

  const formatoTexto = d.formatoGarantia.filter((b) => b.trim()).map(esc).join(' · ');
  const detailRowsHTML =
    `<div class="cr2-detail-row"><div class="cr2-detail-label">Descripción</div><div class="cr2-detail-content">${nl2p(d.garantiaInfo)}</div></div>` +
    (d.garantiaInfoExtra.trim() ? `<div class="cr2-detail-row"><div class="cr2-detail-label">Aforo</div><div class="cr2-detail-content">${nl2p(d.garantiaInfoExtra)}</div></div>` : '') +
    (formatoTexto ? `<div class="cr2-detail-row"><div class="cr2-detail-label">Formato</div><div class="cr2-detail-content">${formatoTexto}.</div></div>` : '');

  const faqsHTML = d.faqs.map((f) => `<div><div class="cr2-faq-q">${esc(f.q)}</div><div class="cr2-faq-a">${esc(f.a)}</div></div>`).join('');

  const tituloLimpio = tituloCorto(d.operacion);
  return (
    `<div class="doc-header"><div class="doc-logo">${logoBlockHtml()}</div><div class="cr2-kicker">Ficha de inversión<br>${esc(tituloLimpio)}</div></div>` +
    `<div class="cr2-title-row"><div><div class="cr2-eyebrow">Oportunidad de inversión</div><div class="cr2-title">${esc(tituloLimpio)}</div></div><div class="cr2-subtitle">${esc(subtitle)}</div></div>` +
    `<div class="cr2-kpi-row"><div class="cr2-kpi"><div class="cr2-kpi-label">Tasa anual — hasta</div><div class="cr2-kpi-val">${fmtPct(tnaMaxima, 2)}<span class="unit">TNA</span></div></div>` +
    `<div class="cr2-kpi"><div class="cr2-kpi-label">Plazo</div><div class="cr2-kpi-val">${n(d.plazoMeses) || 0}<span class="unit">meses</span></div></div>` +
    `<div class="cr2-kpi"><div class="cr2-kpi-label">Este desembolso</div><div class="cr2-kpi-val">${fmtUSD(d.primerDesembolso)}</div></div>` +
    `<div class="cr2-kpi"><div class="cr2-kpi-label">Inversión mínima</div><div class="cr2-kpi-val">${fmtUSD(d.inversionMinima)}</div></div></div>` +
    `<div class="cr2-section"><div class="cr2-section-head"><span class="cr2-section-num">01</span> Rendimiento del capital</div><div class="cr2-section-body"><div class="cr2-tna-row">${tnaCardsHTML}</div></div></div>` +
    `<div class="cr2-section"><div class="cr2-section-head"><span class="cr2-section-num">02</span> Condiciones de la operación</div><div class="cr2-section-body"><div class="cr2-cond-grid">${condGridHTML}</div></div></div>` +
    `<div class="cr2-section"><div class="cr2-section-head"><span class="cr2-section-num">03</span> Detalles de la garantía</div><div class="cr2-section-body">${detailRowsHTML}</div></div>` +
    `<div class="cr2-section"><div class="cr2-section-head"><span class="cr2-section-num">04</span> Preguntas frecuentes</div><div class="cr2-section-body"><div class="cr2-faqs">${faqsHTML}</div></div></div>` +
    `<div class="cr2-footer"><div class="doc-logo">${logoBlockHtml()}</div><div class="cr2-contact"><span>inversiones@smartans.pro · (+54 9) 11 3525-2013</span><span>smartans.pro</span></div></div>`
  );
}

function buildWhatsappText(d, driveLink) {
  const nombre = d.operacion || 'la operación';
  const tnas = d.tasas.map((t) => n(t.tna)).filter((v) => v > 0);
  const tnaMin = tnas.length ? Math.min(...tnas) : 0;
  const tnaMax = tnas.length ? Math.max(...tnas) : 0;
  const linkBlock = driveLink ? `Más información en el siguiente link:\n${driveLink}\n\n` : 'Te paso el PDF con toda la información.\n\n';
  return (
    `¡Hola a todos!\n\nLes paso la ficha de la próxima operación de inversión denominada: "${nombre}".\n\n` +
    `⬤ Moneda: ${d.moneda || ''}.\n⬤ Inversión Mínima: ${fmtUSD(d.inversionMinima)}.-\n` +
    `⬤ Tasa anual (TNA fija): entre ${fmtPct(tnaMin, 2)} y ${fmtPct(tnaMax, 2)} (según monto de inversión).\n\n` +
    `${linkBlock}Cualquier duda me consultan.\n\nSaludos!`
  );
}

const FORM_HTML = `
  <div class="editor-shell">
    <div class="formpanel">
      <div class="editor-head" style="justify-content:space-between;">
        <h1>Crédito con garantía</h1>
        <div style="display:flex;gap:8px;">
          <button class="btn" type="button" id="crBtnCancel">Cancelar</button>
          <button class="btn btn-primary" type="button" id="crBtnSave">Guardar</button>
        </div>
      </div>
      <div class="quickrow" style="display:flex;gap:8px;padding-bottom:14px;">
        <button class="btn btn-small" type="button" id="crBtnExample">✦ Cargar ejemplo (Lavalle 796)</button>
        <button class="btn btn-small" type="button" id="crBtnExample2">✦ Cargar Shale, Vaca Muerta</button>
      </div>
      <form id="crForm" autocomplete="off">
        <fieldset>
          <legend>Operación</legend>
          <div class="field"><label>Nombre de la operación</label><input type="text" name="operacion" /></div>
          <div class="field"><label>Fecha estimada de la inversión</label><input type="date" name="fechaEstimada" /></div>
        </fieldset>
        <fieldset>
          <legend>Garantía y condiciones</legend>
          <div class="row2">
            <div class="field"><label>Tasación (valor actual)</label><div class="prefix-field"><span>US$</span><input type="number" name="tasacionGarantia" /></div></div>
            <div class="field"><label>Tasación proyectada</label><div class="prefix-field"><span>US$</span><input type="number" name="tasacionProyectada" /></div></div>
          </div>
          <div class="row2">
            <div class="field"><label>Etiqueta del desembolso</label><input type="text" name="primerDesembolsoLabel" /></div>
            <div class="field"><label>Monto del desembolso</label><div class="prefix-field"><span>US$</span><input type="number" name="primerDesembolso" /></div></div>
          </div>
          <div class="field"><label>Línea de crédito total</label><div class="prefix-field"><span>US$</span><input type="number" name="lineaCreditoTotal" /></div></div>
          <div class="row2">
            <div class="field"><label>Plazo (meses)</label><input type="number" name="plazoMeses" /></div>
            <div class="field"><label>Inversión mínima</label><div class="prefix-field"><span>US$</span><input type="number" name="inversionMinima" /></div></div>
          </div>
          <div class="row2">
            <div class="field"><label>Tipo de garantía</label><input type="text" name="tipoGarantia" /></div>
            <div class="field"><label>Moneda</label><input type="text" name="moneda" /></div>
          </div>
          <div class="field"><label>Ubicación</label><input type="text" name="ubicacion" /></div>
          <div class="row2">
            <div class="field"><label>Amortización</label><input type="text" name="amortizacionTitulo" /></div>
            <div class="field"><label>Detalle</label><input type="text" name="amortizacionSub" /></div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Rendimiento (TNA escalonada)</legend>
          <div class="dyn-list" id="crTasasRows"></div>
          <button type="button" class="btn btn-ghost btn-small" id="crAddTasa">+ Agregar tramo</button>
        </fieldset>
        <fieldset>
          <legend>Detalles de la garantía</legend>
          <div class="field"><label>Información de la garantía</label><textarea name="garantiaInfo"></textarea></div>
          <div class="field"><label>Aforo (opcional)</label><textarea name="garantiaInfoExtra"></textarea></div>
        </fieldset>
        <fieldset>
          <legend>Preguntas frecuentes</legend>
          <div class="dyn-list" id="crFaqsRows"></div>
          <button type="button" class="btn btn-ghost btn-small" id="crAddFaq">+ Agregar pregunta</button>
        </fieldset>
      </form>
    </div>
    <div class="previewcol">
      <div class="previewbar"><div class="previewbar-info">Vista previa en vivo</div>
        <div style="display:flex;gap:8px;"><button class="btn btn-whatsapp" id="crBtnWhatsapp" type="button">📱 Enviar por WhatsApp</button><button class="btn btn-primary" id="crBtnExport" type="button">⬇ Descargar PDF</button></div>
      </div>
      <div class="previewstage"><div class="stage"><div id="previewCredito"></div></div></div>
    </div>
  </div>`;

/** onDone(savedFichaOrNull) se llama después de Guardar (con la ficha) o
 *  Cancelar (con null) — quien llama decide qué hacer (volver al listado). */
export function mountCreditoEditor(viewContainer, ficha, onDone) {
  viewContainer.innerHTML = FORM_HTML;
  let state = ficha?.data && Object.keys(ficha.data).length ? cloneState({ ...BLANK, ...ficha.data }) : cloneState(BLANK);

  function renderTasasRows() {
    const wrap = viewContainer.querySelector('#crTasasRows');
    wrap.innerHTML = state.tasas
      .map(
        (t, i) =>
          `<div class="dyn-row dyn-row3"><div class="prefix-field"><span>US$</span><input type="number" value="${escAttr(t.desde)}" data-i="${i}" data-field="desde" class="dyn-tasa-input" /></div>` +
          `<div class="suffix-field"><input type="number" step="0.1" value="${escAttr(t.tna)}" data-i="${i}" data-field="tna" class="dyn-tasa-input" /><span>%</span></div>` +
          `<button type="button" class="row-x" data-i="${i}" data-action="remove-tasa">×</button></div>`
      )
      .join('');
  }
  function renderFaqsRows() {
    const wrap = viewContainer.querySelector('#crFaqsRows');
    wrap.innerHTML = state.faqs
      .map(
        (f, i) =>
          `<div class="dyn-row dyn-faq"><div class="dyn-faq-fields"><input type="text" value="${escAttr(f.q)}" placeholder="Pregunta" data-i="${i}" data-field="q" class="dyn-faq-input"/>` +
          `<textarea placeholder="Respuesta" data-i="${i}" data-field="a" class="dyn-faq-input">${esc(f.a)}</textarea></div>` +
          `<button type="button" class="row-x" data-i="${i}" data-action="remove-faq">×</button></div>`
      )
      .join('');
  }

  function render() {
    viewContainer.querySelector('#previewCredito').innerHTML = buildPreviewHTML(state);
  }

  function bindFormFromState() {
    const form = viewContainer.querySelector('#crForm');
    [...form.elements].forEach((el) => {
      if (el.name && state[el.name] !== undefined) el.value = state[el.name];
    });
    renderTasasRows();
    renderFaqsRows();
  }

  function loadExample(example, label) {
    state = cloneState(example);
    bindFormFromState();
    render();
    showToast(`Ejemplo cargado (${label}).`);
  }
  viewContainer.querySelector('#crBtnExample').addEventListener('click', () => loadExample(EXAMPLE, 'Lavalle 796'));
  viewContainer.querySelector('#crBtnExample2').addEventListener('click', () => loadExample(EXAMPLE_2, 'Shale, Vaca Muerta'));

  viewContainer.querySelector('#crForm').addEventListener('input', (e) => {
    const t = e.target;
    if (!t.name) return;
    state[t.name] = t.type === 'number' ? (t.value === '' ? '' : parseFloat(t.value)) : t.value;
    render();
  });

  viewContainer.querySelector('#crTasasRows').addEventListener('input', (e) => {
    const t = e.target;
    if (!t.matches('.dyn-tasa-input')) return;
    state.tasas[+t.dataset.i][t.dataset.field] = t.value === '' ? '' : parseFloat(t.value);
    render();
  });
  viewContainer.querySelector('#crTasasRows').addEventListener('click', (e) => {
    const t = e.target;
    if (!t.matches('[data-action=remove-tasa]')) return;
    state.tasas.splice(+t.dataset.i, 1);
    renderTasasRows();
    render();
  });
  viewContainer.querySelector('#crAddTasa').addEventListener('click', () => {
    state.tasas.push({ desde: '', tna: '' });
    renderTasasRows();
  });

  viewContainer.querySelector('#crFaqsRows').addEventListener('input', (e) => {
    const t = e.target;
    if (!t.matches('.dyn-faq-input')) return;
    state.faqs[+t.dataset.i][t.dataset.field] = t.value;
    render();
  });
  viewContainer.querySelector('#crFaqsRows').addEventListener('click', (e) => {
    const t = e.target;
    if (!t.matches('[data-action=remove-faq]')) return;
    state.faqs.splice(+t.dataset.i, 1);
    renderFaqsRows();
    render();
  });
  viewContainer.querySelector('#crAddFaq').addEventListener('click', () => {
    state.faqs.push({ q: '', a: '' });
    renderFaqsRows();
  });

  viewContainer.querySelector('#crBtnExport').addEventListener('click', () => {
    exportarPDF('previewCredito', state.operacion || 'ficha_credito', '#ffffff');
  });
  viewContainer.querySelector('#crBtnWhatsapp').addEventListener('click', () => {
    if (!ficha?.id) {
      showToast('Guardá la ficha antes de compartirla.', 'danger');
      return;
    }
    enviarPorWhatsApp(ficha.id, 'previewCredito', state.operacion || 'ficha_credito', '#ffffff', (link) => buildWhatsappText(state, link));
  });

  viewContainer.querySelector('#crBtnCancel').addEventListener('click', () => onDone?.(null));
  viewContainer.querySelector('#crBtnSave').addEventListener('click', async () => {
    const btn = viewContainer.querySelector('#crBtnSave');
    btn.disabled = true;
    const payload = { tipo: 'credito', nombre: state.operacion || 'Ficha sin título', data: state };
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
