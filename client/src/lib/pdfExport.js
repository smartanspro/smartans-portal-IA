import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { confirmDialog } from '../components/confirmDialog.js';
import { apiFetch } from '../api/http.js';
import { showToast } from './toast.js';

const loadingEl = () => document.getElementById('loading');

async function generatePdfBlob(nodeId, bgColor) {
  const node = document.getElementById(nodeId);
  await document.fonts.ready;

  const canvas = await html2canvas(node, { scale: 2, backgroundColor: bgColor, useCORS: true });
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const pxToMm = 0.264583;
  const widthMm = canvas.width * pxToMm * 0.5; // scale:2 compensa acá
  const heightMm = canvas.height * pxToMm * 0.5;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMm, heightMm] });
  pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm);
  return pdf.output('blob');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slug(s) {
  return (
    (s || 'ficha')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'ficha'
  );
}

/** Descarga el PDF directo — pide confirmación antes de generar nada. */
export async function exportarPDF(nodeId, filenameBase, bgColor) {
  const ok = await confirmDialog({
    title: 'Descargar PDF',
    message: 'Se va a generar el PDF de esta ficha con los datos actuales. ¿Confirmás?',
    acceptLabel: 'Sí, generar PDF',
  });
  if (!ok) return;

  loadingEl().classList.add('show');
  try {
    const blob = await generatePdfBlob(nodeId, bgColor);
    downloadBlob(blob, `${slug(filenameBase)}.pdf`);
    showToast('PDF descargado.');
  } catch (err) {
    showToast('No se pudo generar el PDF: ' + err.message, 'danger');
  } finally {
    loadingEl().classList.remove('show');
  }
}

/** Genera el PDF, lo sube (autenticado) para obtener un link público firmado
 *  y expirable, y abre WhatsApp con ese link — todo detrás de una
 *  confirmación explícita del usuario. */
export async function enviarPorWhatsApp(fichaId, nodeId, filenameBase, bgColor, buildWhatsappText) {
  const ok = await confirmDialog({
    title: 'Enviar por WhatsApp',
    message: 'Se va a generar el PDF, subirlo, y abrir WhatsApp con el link listo para enviar. ¿Confirmás?',
    acceptLabel: 'Sí, generar y enviar',
  });
  if (!ok) return;

  loadingEl().classList.add('show');
  try {
    const blob = await generatePdfBlob(nodeId, bgColor);

    const formData = new FormData();
    formData.append('file', blob, `${slug(filenameBase)}.pdf`);

    const resp = await apiFetch(`/api/fichas/${fichaId}/pdf`, { method: 'POST', body: formData, isFormData: true });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data?.error?.message || 'No se pudo subir el PDF.');
    }
    const { shareUrl } = await resp.json();
    const fullUrl = new URL(shareUrl, window.location.origin).toString();

    const text = buildWhatsappText(fullUrl);
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    showToast('PDF subido — WhatsApp abierto con el link listo.');
  } catch (err) {
    showToast('No se pudo completar el envío: ' + err.message, 'danger');
  } finally {
    loadingEl().classList.remove('show');
  }
}
