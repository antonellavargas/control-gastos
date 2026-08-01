const CONFIG = {
  tipos: ['Ingresos', 'Egresos', 'Ahorros'],
  categorias: ['Cuidado Personal', 'Gastos', 'Educación', 'Transporte', 'Comida', 'Internet Casa', 'Celular', 'Trabajo', 'Casa', 'Ropa', 'Gym', 'Deuda', 'Ahorros', '-'],
  formasPago: ['Efectivo', 'Yape', 'Plin', 'Tarjeta Dorada'],
  usuarios: ['Mami', 'Nella']
};

const STORAGE_KEY = 'controlGastosMovimientosV1';
const SCRIPT_URL_KEY = 'controlGastosAppsScriptUrl';
// Pega aquí la URL /exec de tu Apps Script antes de publicar en GitHub.
// Así Mami y Nella usarán automáticamente la misma base de datos.
const CLOUD_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwG6XTEAQJiE2C4skqeeG7-h-oVK0c2un9Ptisob_CftJHoYJB4TH14Ow4DyVWbGKYmcw/exec';
let transactions = loadTransactions();

const $ = (id) => document.getElementById(id);
const money = (value) => `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = new Date().toISOString().slice(0, 10);

function normalizeDateValue(value) {
  if (!value) return '';
  const raw = String(value).trim();

  // Formato recomendado: yyyy-mm-dd
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;

  // Formatos habituales de Google Sheets en Perú: dd/mm/yyyy o dd-mm-yyyy
  const local = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (local) return `${local[3]}-${String(local[2]).padStart(2, '0')}-${String(local[1]).padStart(2, '0')}`;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return raw;
}

function pick(obj, keys, fallback = '') {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return fallback;
}

function normalizeTransaction(t) {
  const normalized = {
    id: String(pick(t, ['id', 'ID', 'Id'], crypto.randomUUID())),
    fecha: normalizeDateValue(pick(t, ['fecha', 'Fecha', 'date', 'Date'])),
    usuario: String(pick(t, ['usuario', 'Usuario', 'user', 'User'])).trim(),
    tipo: String(pick(t, ['tipo', 'Tipo', 'type', 'Type'])).trim(),
    categoria: String(pick(t, ['categoria', 'Categoría', 'Categoria', 'category'], '-')).trim(),
    formaPago: String(pick(t, ['formaPago', 'Forma de pago', 'Forma de Pago', 'forma_pago', 'payment'], '')).trim(),
    monto: Number(String(pick(t, ['monto', 'Monto', 'Monto (S/)', 'amount'], 0)).replace(',', '.')) || 0,
    descripcion: String(pick(t, ['descripcion', 'Descripción', 'Descripcion', 'description'], '')),
    nota: String(pick(t, ['nota', 'Nota', 'notes'], '')),
    createdAt: Number(pick(t, ['createdAt', 'Creado', 'creado'], Date.now())) || Date.now(),
    updatedAt: Number(pick(t, ['updatedAt', 'Actualizado', 'actualizado'], Date.now())) || Date.now()
  };

  if (normalized.formaPago === 'Tarjeta') normalized.formaPago = 'Yape';
  if (normalized.formaPago === 'Dinero en Físico') normalized.formaPago = 'Efectivo';
  if (normalized.tipo === 'Ingreso') normalized.tipo = 'Ingresos';
  if (normalized.tipo === 'Egreso') normalized.tipo = 'Egresos';
  if (normalized.tipo === 'Ahorro') normalized.tipo = 'Ahorros';
  if (normalized.tipo === 'Tarjeta de Crédito') normalized.tipo = 'Egresos';
  if (normalized.tipo === 'Dinero en Físico') normalized.tipo = 'Ingresos';
  return normalized;
}
function loadTransactions() {
  try {
    const rows = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return Array.isArray(rows) ? rows.map(normalizeTransaction) : [];
  } catch { return []; }
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
function getScriptUrl() {
  const embedded = CLOUD_SCRIPT_URL.trim();
  if (embedded && !embedded.includes('PEGA_AQUI')) return embedded;
  return (localStorage.getItem(SCRIPT_URL_KEY) || '').trim();
}
function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2400);
}
function fillSelect(id, items, firstOption = null) {
  const select = $(id); select.innerHTML = '';
  if (firstOption) select.add(new Option(firstOption.label, firstOption.value));
  items.forEach(item => select.add(new Option(item, item)));
}
function initMonths() {
  const select = $('globalMonth');
  const now = new Date();
  for (let i = -18; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    select.add(new Option(label.charAt(0).toUpperCase() + label.slice(1), value));
  }
  select.value = today.slice(0, 7);
}
function monthTransactions() {
  const month = $('globalMonth').value;
  return transactions.filter(t => String(t.fecha || '').startsWith(month));
}

function selectLatestMonthWithData() {
  const validMonths = [...new Set(transactions
    .map(t => String(t.fecha || '').slice(0, 7))
    .filter(month => /^\d{4}-\d{2}$/.test(month)))]
    .sort();

  const latest = validMonths.pop();
  if (!latest) return;

  const select = $('globalMonth');
  if (![...select.options].some(option => option.value === latest)) {
    const [year, month] = latest.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    const label = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    select.add(new Option(label.charAt(0).toUpperCase() + label.slice(1), latest));
  }
  select.value = latest;
}
function filteredTransactions() {
  const user = $('globalUser').value;
  const monthly = monthTransactions();
  const base = monthly.length ? monthly : transactions;
  return base.filter(t => user === 'Todos' || t.usuario === user);
}
function signedAmount(t) {
  if (t.tipo === 'Ingresos') return Number(t.monto);
  if (t.tipo === 'Egresos' || t.tipo === 'Ahorros') return -Number(t.monto);
  return 0;
}
function updateDashboard() {
  const data = filteredTransactions();
  const ingresos = sum(data.filter(t => t.tipo === 'Ingresos'));
  const gastos = sum(data.filter(t => t.tipo === 'Egresos'));
  const ahorros = sum(data.filter(t => t.tipo === 'Ahorros'));

  $('totalIngresos').textContent = money(ingresos);
  $('totalGastos').textContent = money(gastos);
  $('totalAhorros').textContent = money(ahorros);
  $('dineroLibre').textContent = money(ingresos - gastos - ahorros);

  // Los paneles de Mami y Nella muestran el saldo acumulado actual, no solo el mes.
  renderPaymentBalances(transactions);
  renderTable($('recentTableBody'), [...data].sort(sortNewest).slice(0, 7), false);
}
function sum(items) { return items.reduce((acc, item) => acc + Number(item.monto), 0); }
function sortNewest(a, b) { return b.fecha.localeCompare(a.fecha) || b.createdAt - a.createdAt; }
function paymentBalance(rows, paymentNames) {
  return rows
    .filter(t => paymentNames.includes(t.formaPago))
    .reduce((acc, t) => acc + signedAmount(t), 0);
}
function renderPaymentBalances(data) {
  const container = $('paymentBalances');
  const visibleBalances = [
    { label: 'Efectivo', payments: ['Efectivo'], icon: '💵' },
    { label: 'Yape', payments: ['Yape'], icon: '📱' },
    { label: 'Tarjeta Dorada', payments: ['Tarjeta Dorada'], icon: '💳' }
  ];

  const groups = CONFIG.usuarios.map(user => ({
    label: user,
    rows: data.filter(t => t.usuario === user)
  }));

  container.innerHTML = groups.map(group => {
    const balances = visibleBalances.map(item => `
      <div class="balance-item">
        <div class="balance-icon">${item.icon}</div>
        <div><b>${item.label}</b><small>Saldo de ${group.label}</small></div>
        <div class="balance-amount">${money(paymentBalance(group.rows, item.payments))}</div>
      </div>`).join('');
    const ingresos = sum(group.rows.filter(t => t.tipo === 'Ingresos'));
    const gastos = sum(group.rows.filter(t => t.tipo === 'Egresos'));
    const ahorros = sum(group.rows.filter(t => t.tipo === 'Ahorros'));
    const saldoActual = group.rows.reduce((acc, t) => acc + signedAmount(t), 0);
    const avatar = group.label === 'Mami' ? '👩‍🦰' : '👩🏻';
    return `<section class="user-balance-group user-card-${group.label.toLowerCase()}">
      <div class="user-card-heading">
        <div class="user-avatar">${avatar}</div>
        <div><small>Saldo principal</small><h4>${group.label}</h4></div>
        <div class="user-free-total"><small>Saldo actual</small><b>${money(saldoActual)}</b></div>
      </div>
      <div class="payment-card-list">${balances}</div>
      <div class="user-mini-summary">
        <span>Ingresos <b>${money(ingresos)}</b></span>
        <span>Gastos <b>${money(gastos)}</b></span>
        <span>Ahorros <b>${money(ahorros)}</b></span>
      </div>
    </section>`;
  }).join('');
}
function renderCategoryBars(data) {
  const expenses = data.filter(t => t.tipo === 'Egresos');
  const grouped = {};
  expenses.forEach(t => grouped[t.categoria] = (grouped[t.categoria] || 0) + Number(t.monto));
  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = rows[0]?.[1] || 1;
  $('categoryBars').innerHTML = rows.length ? rows.map(([cat, amount]) => `
    <div class="category-row"><span>${escapeHtml(cat)}</span><div class="bar-track"><div class="bar-fill" style="width:${(amount/max)*100}%"></div></div><span class="category-amount">${money(amount)}</span></div>`).join('') : '<p>No hay gastos en este periodo.</p>';
}
function renderMovements() {
  const query = $('searchInput').value.toLowerCase().trim();
  const type = $('typeFilter').value;
  const data = filteredTransactions().filter(t => (type === 'Todos' || t.tipo === type) && (!query || `${t.descripcion} ${t.nota} ${t.categoria}`.toLowerCase().includes(query))).sort(sortNewest);
  renderTable($('allTableBody'), data, true);
  $('emptyState').hidden = data.length !== 0;
}
function renderTable(body, data, actions) {
  body.innerHTML = data.map(t => {
    const positive = t.tipo === 'Ingresos';
    return `<tr>
      <td>${formatDate(t.fecha)}</td><td>${escapeHtml(t.usuario)}</td><td><span class="badge">${escapeHtml(t.tipo)}</span></td>
      <td>${escapeHtml(t.categoria)}</td><td>${escapeHtml(t.formaPago)}</td><td>${escapeHtml(t.descripcion || '-')}</td>
      <td class="${positive ? 'amount-income' : 'amount-expense'}">${positive ? '+' : '-'} ${money(t.monto)}</td>
      ${actions ? `<td><button class="action-btn" onclick="editTransaction('${t.id}')" title="Editar">✏️</button><button class="action-btn" onclick="deleteTransaction('${t.id}')" title="Eliminar">🗑️</button></td>` : ''}
    </tr>`;
  }).join('') || `<tr><td colspan="${actions ? 8 : 7}" style="text-align:center;color:#73758a;padding:28px">Sin movimientos</td></tr>`;
}
function formatDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString('es-PE'); }
function escapeHtml(value='') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $(`${view}View`).classList.add('active');
  $('pageTitle').textContent = ({dashboard:'Resumen mensual', movimientos:'Movimientos', nuevo:'Nuevo registro', configuracion:'Configuración'})[view];
  if (view === 'movimientos') renderMovements();
}
function resetForm() {
  $('transactionForm').reset(); $('editId').value = ''; $('fecha').value = today; $('formTitle').textContent = 'Registrar movimiento';
}
function editTransaction(id) {
  const t = transactions.find(x => x.id === id); if (!t) return;
  $('editId').value = t.id; $('fecha').value = t.fecha; $('usuario').value = t.usuario; $('tipo').value = t.tipo;
  $('categoria').value = t.categoria; $('formaPago').value = t.formaPago; $('monto').value = t.monto; $('descripcion').value = t.descripcion || ''; $('nota').value = t.nota || '';
  $('formTitle').textContent = 'Editar movimiento'; switchView('nuevo');
}
async function deleteTransaction(id) {
  if (!confirm('¿Deseas eliminar este movimiento?')) return;
  transactions = transactions.filter(t => t.id !== id); persist(); refreshAll(); toast('Movimiento eliminado');
  await sendCloudAction({ action: 'delete', id });
}
function refreshAll() { updateDashboard(); renderMovements(); }

$('transactionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('editId').value || crypto.randomUUID();
  const old = transactions.find(t => t.id === id);
  const record = {
    id, fecha: $('fecha').value, usuario: $('usuario').value, tipo: $('tipo').value,
    categoria: $('categoria').value, formaPago: $('formaPago').value, monto: Number($('monto').value),
    descripcion: $('descripcion').value.trim(), nota: $('nota').value.trim(), createdAt: old?.createdAt || Date.now(), updatedAt: Date.now()
  };
  const index = transactions.findIndex(t => t.id === id);
  if (index >= 0) transactions[index] = record; else transactions.push(record);
  persist(); resetForm(); refreshAll(); switchView('dashboard'); toast(index >= 0 ? 'Movimiento actualizado' : 'Movimiento guardado');
  await sendToSheets(record);
});

document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.go)));
$('quickAdd').addEventListener('click', () => { resetForm(); switchView('nuevo'); });
$('cancelEdit').addEventListener('click', resetForm);
$('globalMonth').addEventListener('change', refreshAll);
$('globalUser').addEventListener('change', refreshAll);
$('searchInput').addEventListener('input', renderMovements);
$('typeFilter').addEventListener('change', renderMovements);

function excelRows(data) {
  return data.sort((a,b) => a.fecha.localeCompare(b.fecha)).map(t => ({
    Fecha: t.fecha, Usuario: t.usuario, Tipo: t.tipo, Categoría: t.categoria,
    'Forma de pago': t.formaPago, Descripción: t.descripcion, Nota: t.nota, 'Monto (S/)': Number(t.monto)
  }));
}
function exportExcel(data, filename) {
  if (!data.length) return toast('No hay datos para exportar');
  if (typeof XLSX === 'undefined') return toast('No se pudo cargar el exportador de Excel');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows(data));
  ws['!cols'] = [{wch:12},{wch:12},{wch:20},{wch:20},{wch:20},{wch:30},{wch:35},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  const summary = buildSummaryRows(data);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Resumen');
  const paymentSummary = buildPaymentSummaryRows(data);
  const paymentWs = XLSX.utils.json_to_sheet(paymentSummary);
  paymentWs['!cols'] = [{wch:14},{wch:22},{wch:18}];
  XLSX.utils.book_append_sheet(wb, paymentWs, 'Saldos por medio');
  XLSX.writeFile(wb, filename, { compression: true });
}
function buildSummaryRows(data) {
  const users = ['Todos', ...CONFIG.usuarios];
  return users.map(user => {
    const rows = user === 'Todos' ? data : data.filter(t => t.usuario === user);
    const ingresos = sum(rows.filter(t => t.tipo === 'Ingresos'));
    const gastos = sum(rows.filter(t => t.tipo === 'Egresos'));
    const ahorros = sum(rows.filter(t => t.tipo === 'Ahorros'));
    return { Usuario: user, 'Total ingresos': ingresos, 'Total gastos': gastos, 'Total ahorros': ahorros, 'Dinero libre': ingresos-gastos-ahorros,
      'Queda en efectivo': paymentBalance(rows, ['Efectivo']),
      'Queda en Yape': paymentBalance(rows, ['Yape']),
      'Queda en Tarjeta Dorada': paymentBalance(rows, ['Tarjeta Dorada']) };
  });
}
function buildPaymentSummaryRows(data) {
  const users = ['Todos', ...CONFIG.usuarios];
  return users.flatMap(user => {
    const rows = user === 'Todos' ? data : data.filter(t => t.usuario === user);
    return CONFIG.formasPago.map(payment => ({
      Usuario: user,
      'Forma de pago': payment,
      'Saldo calculado': paymentBalance(rows, [payment])
    }));
  });
}
$('exportCurrent').addEventListener('click', () => exportExcel(filteredTransactions(), `control-gastos-${$('globalMonth').value}.xlsx`));
$('exportAll').addEventListener('click', () => exportExcel([...transactions], `control-gastos-completo-${today}.xlsx`));
$('backupJson').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), transactions }, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `respaldo-gastos-${today}.json`; a.click(); URL.revokeObjectURL(a.href);
});
$('restoreJson').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()); const rows = Array.isArray(parsed) ? parsed : parsed.transactions;
    if (!Array.isArray(rows)) throw new Error();
    transactions = rows.map(normalizeTransaction); persist(); refreshAll(); toast('Respaldo restaurado');
  } catch { toast('El archivo no es un respaldo válido'); }
  e.target.value = '';
});
$('clearData').addEventListener('click', () => {
  if (!confirm('Esta acción eliminará todos los movimientos de este navegador. ¿Continuar?')) return;
  transactions = []; persist(); refreshAll(); toast('Datos eliminados');
});

$('appsScriptUrl').value = getScriptUrl();
$('saveAppsScript').addEventListener('click', async () => {
  localStorage.setItem(SCRIPT_URL_KEY, $('appsScriptUrl').value.trim());
  toast('URL guardada en este dispositivo');
  await loadFromCloud();
});
async function sendCloudAction(payload) {
  const url = getScriptUrl();
  if (!url) return false;
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch {
    return false;
  }
}
async function sendToSheets(record) {
  return sendCloudAction({ action: 'upsert', record });
}
function loadFromCloud() {
  const url = getScriptUrl();
  if (!url) return Promise.resolve(false);
  $('syncStatus').textContent = 'Cargando información compartida...';
  return new Promise((resolve) => {
    const callbackName = `gastosCloud_${Date.now()}`;
    const script = document.createElement('script');
    const cleanup = () => { delete window[callbackName]; script.remove(); };
    const timeout = setTimeout(() => {
      cleanup();
      $('syncStatus').textContent = 'No se pudo cargar la nube; se muestra la copia del dispositivo.';
      resolve(false);
    }, 12000);
    window[callbackName] = (response) => {
      clearTimeout(timeout);
      if (response && response.ok && Array.isArray(response.records)) {
        transactions = response.records.map(normalizeTransaction);
        persist();
        selectLatestMonthWithData();
        refreshAll();
        $('syncStatus').textContent = `Datos compartidos actualizados: ${transactions.length} movimientos. Mes mostrado: ${$('globalMonth').value || 'sin fecha'}.`;
        resolve(true);
      } else {
        $('syncStatus').textContent = 'La respuesta de Google Sheets no fue válida.';
        resolve(false);
      }
      cleanup();
    };
    script.onerror = () => {
      clearTimeout(timeout); cleanup();
      $('syncStatus').textContent = 'No se pudo conectar con Google Sheets.';
      resolve(false);
    };
    script.src = `${url}${url.includes('?') ? '&' : '?'}action=list&callback=${callbackName}&_=${Date.now()}`;
    document.body.appendChild(script);
  });
}
$('syncSheets').addEventListener('click', async () => {
  const inputUrl = $('appsScriptUrl').value.trim();
  if (!inputUrl && !getScriptUrl()) return toast('Primero agrega la URL de Apps Script');
  if (inputUrl) localStorage.setItem(SCRIPT_URL_KEY, inputUrl);
  $('syncStatus').textContent = 'Enviando movimientos del dispositivo...';
  const sent = await sendCloudAction({ action: 'bulkUpsert', records: transactions });
  if (!sent) {
    $('syncStatus').textContent = 'No se pudo conectar. Revisa la URL y el despliegue.';
    return;
  }
  await new Promise(resolve => setTimeout(resolve, 900));
  await loadFromCloud();
  toast('Información sincronizada');
});
fillSelect('usuario', CONFIG.usuarios);
fillSelect('tipo', CONFIG.tipos);
fillSelect('categoria', CONFIG.categorias);
fillSelect('formaPago', CONFIG.formasPago);
fillSelect('typeFilter', CONFIG.tipos, {label:'Todos los tipos', value:'Todos'});
initMonths(); resetForm(); refreshAll();
loadFromCloud();
window.editTransaction = editTransaction; window.deleteTransaction = deleteTransaction;
