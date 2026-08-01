/**
 * API compartida para Mi Control de Gastos.
 * 1. Crea una hoja de Google Sheets.
 * 2. Copia este código en Extensiones > Apps Script.
 * 3. Reemplaza SPREADSHEET_ID con el ID de la hoja.
 * 4. Implementa como Aplicación web: ejecutar como tú y acceso "Cualquier persona".
 * 5. Copia la URL terminada en /exec dentro de CLOUD_SCRIPT_URL en app.js.
 */
const SPREADSHEET_ID = '13hzJd1Sqp3P_vKZASUqnB90xYQVqG0V7aYN6O-sioLU';
const SHEET_NAME = 'Movimientos';
const HEADERS = ['ID','Fecha','Usuario','Tipo','Categoría','Forma de pago','Monto','Descripción','Nota','Creado','Actualizado'];

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'status';
    let result;
    if (action === 'list') result = { ok: true, records: listRecords() };
    else result = { ok: true, message: 'API de control de gastos activa' };
    return output(result, e && e.parameter && e.parameter.callback);
  } catch (error) {
    return output({ ok: false, error: String(error) }, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (payload.action === 'upsert' && payload.record) upsertRecord(payload.record);
    else if (payload.action === 'bulkUpsert' && Array.isArray(payload.records)) payload.records.forEach(upsertRecord);
    else if (payload.action === 'delete' && payload.id) deleteRecord(payload.id);
    else throw new Error('Acción no válida');
    return output({ ok: true });
  } catch (error) {
    return output({ ok: false, error: String(error) });
  }
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function listRecords() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(row => ({
    id: String(row[0]),
    fecha: formatSheetDate(row[1]),
    usuario: String(row[2]),
    tipo: String(row[3]),
    categoria: String(row[4]),
    formaPago: String(row[5]),
    monto: Number(row[6]) || 0,
    descripcion: String(row[7] || ''),
    nota: String(row[8] || ''),
    createdAt: dateToMillis(row[9]),
    updatedAt: dateToMillis(row[10])
  })).filter(r => r.id);
}

function upsertRecord(r) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getSheet();
    const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat() : [];
    const rowData = [
      String(r.id), String(r.fecha), String(r.usuario), String(r.tipo), String(r.categoria),
      String(r.formaPago), Number(r.monto) || 0, r.descripcion || '', r.nota || '',
      new Date(Number(r.createdAt) || Date.now()), new Date(Number(r.updatedAt) || Date.now())
    ];
    const index = ids.indexOf(String(r.id));
    if (index >= 0) sheet.getRange(index + 2, 1, 1, rowData.length).setValues([rowData]);
    else sheet.appendRow(rowData);
  } finally {
    lock.releaseLock();
  }
}

function deleteRecord(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getSheet();
    if (sheet.getLastRow() < 2) return;
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
    const index = ids.indexOf(String(id));
    if (index >= 0) sheet.deleteRow(index + 2);
  } finally {
    lock.releaseLock();
  }
}

function formatSheetDate(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(value || '').slice(0, 10);
}

function dateToMillis(value) {
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? Date.now() : date.getTime();
}

function output(data, callback) {
  const json = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${json})`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
