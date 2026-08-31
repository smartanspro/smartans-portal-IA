# Migración de datos: Google Sheets → SQLite

Sin acceso programático a las Sheets del portal viejo desde este entorno, el
camino es exportación manual + este script de importación.

## 1. Exportar las hojas como CSV

Desde la Google Sheet del portal viejo, por cada pestaña:
`Archivo → Descargar → Valores separados por comas (.csv)`, y guardá cada
archivo con este nombre exacto dentro de `input/`:

- `input/Usuarios.csv`
- `input/Fichas.csv`
- `input/NotifConfig.csv`
- `input/MonitorServicios.csv`

(`input/` está en `.gitignore` — nunca se sube al repo, tiene datos reales).

## 2. Exportar las imágenes de Drive (opcional, solo si hay fichas de Canje con foto/logo)

No hay acceso directo a Drive desde este entorno tampoco. Corré esto UNA vez,
a mano, en tu propio editor de Apps Script (con tu sesión ya logueada):

```javascript
function exportarImagenesParaMigracion() {
  var sheet = SpreadsheetApp.openById('TU_SPREADSHEET_ID').getSheetByName('Fichas');
  var rows = sheet.getDataRange().getValues();
  var destino = DriveApp.createFolder('export-imagenes-migracion');
  for (var i = 1; i < rows.length; i++) {
    var heroId = rows[i][5], logoId = rows[i][7]; // columnas heroFileId / logoFileId
    [heroId, logoId].forEach(function (fileId) {
      if (!fileId) return;
      try { DriveApp.getFileById(fileId).makeCopy(destino); } catch (e) {}
    });
  }
  Logger.log('Carpeta creada: ' + destino.getUrl());
}
```

Después descargá esa carpeta como zip desde Drive y descomprimila en
`input/images/`.

## 3. Correr la migración

```bash
cd scripts/migrate-from-sheets
node migrate.mjs --dry-run   # valida y muestra conteos, no escribe nada
node migrate.mjs             # corrida real
```

Es **idempotente**: correrlo dos veces no duplica filas (se saltea todo lo
que ya tenga la misma clave natural — usuario, id de ficha, etc.).

## 4. Después de migrar

- Los usuarios migrados quedan con su password viejo (SHA-256+salt) en las
  columnas `legacy_password_hash`/`legacy_password_salt` — se actualizan
  solas a argon2id la primera vez que esa persona haga login en el sistema
  nuevo (ver `auth.service.js`). No hace falta pedirle a nadie que resetee
  su contraseña.
- Revisá `docs/DEPLOY.md` para el resto del corte a producción.
