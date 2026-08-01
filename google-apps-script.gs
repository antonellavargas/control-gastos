/**
 * Backend opcional para guardar los movimientos en Google Sheets.
 * 1. Crea una hoja de cálculo nueva.
 * 2. Extensiones > Apps Script.
 * 3. Pega este código y reemplaza SPREADSHEET_ID.
 * 4. Implementar > Nueva implementación > Aplicación web.
 * 5. Ejecutar como: tú. Acceso: cualquiera con el enlace.
 * 6. Copia la URL /exec en la configuración de la web.
 */
const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET';
const SHEET_NAME = 'Movimientos';

function doGet() {
  return jsonResponse({ ok: true, message: 'API de control de gastos activa' });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    if (payload.action === 'upsert' && payload.record) upsertRecord(payload.record);
    if (payload.action === 'bulkUpsert' && Array.isArray(payload.records)) payload.records.forEach(upsertRecord);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  const headers = ['ID','Fecha','Usuario','Tipo','Categoría','Forma de pago','Monto','Descripción','Nota','Creado','Actualizado'];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function upsertRecord(r) {
  const sheet = getSheet();
  const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat() : [];
  const rowData = [r.id, r.fecha, r.usuario, r.tipo, r.categoria, r.formaPago, Number(r.monto), r.descripcion || '', r.nota || '', new Date(r.createdAt), new Date(r.updatedAt)];
  const index = ids.indexOf(r.id);
  if (index >= 0) sheet.getRange(index + 2, 1, 1, rowData.length).setValues([rowData]);
  else sheet.appendRow(rowData);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
