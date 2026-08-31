import { randomUUID } from 'node:crypto';
import { AppError } from '../../middleware/errorHandler.js';
import { isDataUrl, hashDataUrl, saveFichaImage, readFileAsDataUrl, deleteUploadedFile } from '../../lib/uploads.js';
import * as repo from './fichas.repository.js';

function toApiShape(row) {
  let data;
  try {
    data = JSON.parse(row.data_json);
  } catch {
    data = {};
  }
  const images = repo.listImagesForFicha(row.id);
  const hero = images.find((i) => i.kind === 'hero');
  const logo = images.find((i) => i.kind === 'logo');

  return {
    id: row.id,
    tipo: row.tipo,
    nombre: row.nombre,
    updatedAt: row.updated_at,
    data,
    hero: hero ? readFileAsDataUrl(hero.file_path) : null,
    logo: logo ? readFileAsDataUrl(logo.file_path) : null,
  };
}

export function listFichas() {
  return repo.listFichas().map(toApiShape);
}

export function getFicha(id) {
  const row = repo.findFichaById(id);
  if (!row) throw new AppError(404, 'FICHA_NOT_FOUND', 'Ficha no encontrada.');
  return toApiShape(row);
}

/** hero/logo: string dataURL (nueva/cambiada) | null (se sacó) | undefined (no se tocó). */
function syncImage(fichaId, kind, incoming) {
  const existing = repo.findImage(fichaId, kind);

  if (incoming === null) {
    if (existing) {
      deleteUploadedFile(existing.file_path);
      repo.deleteImageRow(fichaId, kind);
    }
    return;
  }
  if (incoming === undefined) return; // no se tocó, dejamos lo que había

  if (isDataUrl(incoming)) {
    const newHash = hashDataUrl(incoming);
    if (existing && existing.hash === newHash) return; // no cambió, no reescribimos a disco

    const relativePath = saveFichaImage(fichaId, kind, incoming);
    if (existing) deleteUploadedFile(existing.file_path);
    repo.upsertImage(fichaId, kind, relativePath, newHash);
  }
}

/** Crea una ficha nueva — el id SIEMPRE lo genera el servidor (a diferencia
 *  del portal viejo, que tenía dos generadores de id distintos conviviendo:
 *  uid() del cliente y Utilities.getUuid() del backend según el flujo). */
export function createFicha({ tipo, nombre, data, hero, logo }, userId) {
  const fichaId = randomUUID();
  const dataJson = JSON.stringify(data ?? {});
  repo.insertFicha({ id: fichaId, tipo, nombre, dataJson, userId });

  syncImage(fichaId, 'hero', hero);
  syncImage(fichaId, 'logo', logo);

  return getFicha(fichaId);
}

export function updateFicha(fichaId, { tipo, nombre, data, hero, logo }, userId) {
  const existing = repo.findFichaById(fichaId);
  if (!existing) throw new AppError(404, 'FICHA_NOT_FOUND', 'Ficha no encontrada.');

  const dataJson = JSON.stringify(data ?? {});
  repo.updateFicha(fichaId, { tipo, nombre, dataJson, userId });

  syncImage(fichaId, 'hero', hero);
  syncImage(fichaId, 'logo', logo);

  return getFicha(fichaId);
}

export function deleteFicha(id) {
  const row = repo.findFichaById(id);
  if (!row) throw new AppError(404, 'FICHA_NOT_FOUND', 'Ficha no encontrada.');

  for (const image of repo.listImagesForFicha(id)) {
    deleteUploadedFile(image.file_path);
  }
  repo.deleteFicha(id); // ON DELETE CASCADE se lleva ficha_images y pdf_shares
}
