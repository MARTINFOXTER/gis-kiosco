/**
 * GIS Seguridad — Apps Script vinculado a:
 * https://docs.google.com/spreadsheets/d/1YBgE7Ol1dddNhOmqm6KqxZqf6lH4F32Z_Z6KKb6psKE/edit
 *
 * GitHub Pages: https://martinfoxter.github.io/gis-kiosco/
 *
 * Despliegue (obligatorio para uso online):
 * 1. En la hoja: Extensiones → Apps Script. Pega este archivo como Codigo.gs
 *    y Index.html.
 * 2. Ejecuta inicializarHojas (autoriza permisos).
 * 3. Implementar → Administrar implementaciones → Editar → Nueva versión
 *    (o Nueva implementación → Aplicación web).
 *    Ejecutar como: Yo. Quién tiene acceso: Cualquiera.
 * 4. La URL /exec se queda en github-pages/config.js
 */

const SPREADSHEET_ID = '1YBgE7Ol1dddNhOmqm6KqxZqf6lH4F32Z_Z6KKb6psKE';
const SHEET_EMPLEADOS = 'Empleados';
const SHEET_SERVICIOS = 'Servicios';
const SHEET_FICHAJES = 'Fichajes';
const SHEET_INCIDENCIAS = 'Incidencias';
const SHEET_SOS = 'SOS';
const SHEET_GPS = 'GPS';
const SOS_NOTIFICATION_EMAILS = '';

const HEADERS = {
  Empleados: ['ID_Empleado', 'Nombre', 'Codigo_QR', 'Servicio_Asignado', 'Activo', 'PIN_4'],
  Servicios: ['ID_Servicio', 'Nombre_Servicio', 'Telefono_Asignado', 'Activo'],
  Fichajes: ['Timestamp', 'ID_Empleado', 'Nombre_Empleado', 'ID_Servicio', 'Nombre_Servicio', 'Tipo', 'Metodo', 'Nota'],
  Incidencias: ['Timestamp', 'ID_Empleado', 'Nombre_Empleado', 'ID_Servicio', 'Nombre_Servicio', 'Categoria', 'Descripcion', 'Latitud', 'Longitud', 'Estado'],
  SOS: ['Timestamp', 'ID_Empleado', 'Nombre_Empleado', 'ID_Servicio', 'Nombre_Servicio', 'Latitud', 'Longitud', 'Estado'],
  GPS: ['Timestamp', 'ID_Empleado', 'Nombre_Empleado', 'ID_Servicio', 'Nombre_Servicio', 'Latitud', 'Longitud', 'Precision']
};

function getSs_() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active && active.getId()) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet_(name) {
  asegurarHojas_();
  const sheet = getSs_().getSheetByName(name);
  if (!sheet) throw new Error('No existe la hoja "' + name + '". Ejecuta el menú GIS Seguridad → Inicializar hojas.');
  return sheet;
}

function asegurarHojas_() {
  const ss = getSs_();
  Object.keys(HEADERS).forEach(function (nombre) {
    let sh = ss.getSheetByName(nombre);
    if (!sh) sh = ss.insertSheet(nombre);
    const expected = HEADERS[nombre];
    const row1 = sh.getRange(1, 1, 1, expected.length).getValues()[0];
    const vacio = row1.every(function (c) { return c === '' || c === null; });
    if (vacio) sh.getRange(1, 1, 1, expected.length).setValues([expected]).setFontWeight('bold');
  });
}

function inicializarHojas() {
  asegurarHojas_();
  const serv = getSheet_(SHEET_SERVICIOS);
  if (serv.getLastRow() < 2) {
    serv.appendRow(['S1', 'Servicio demostración', '600000000', true]);
  }
  const emp = getSheet_(SHEET_EMPLEADOS);
  if (emp.getLastRow() < 2) {
    emp.appendRow(['1001', 'Vigilante Demo Uno', generarTokenQR_(), 'S1', true, '1234']);
    emp.appendRow(['1002', 'Vigilante Demo Dos', generarTokenQR_(), 'S1', true, '5678']);
  }
  return { ok: true, mensaje: 'Hojas listas. Demo: 1001/1234 y 1002/5678.' };
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GIS Seguridad')
    .addItem('Inicializar hojas y datos demo', 'inicializarHojas')
    .addItem('Generar QRs de empleados (imprimibles)', 'generarQRsEmpleados')
    .addToUi();
}

function doGet(e) {
  e = e || { parameter: {} };
  const p = e.parameter || {};
  if (p.action) {
    return responder_(ejecutarAccion_(p), p.callback);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('GIS Seguridad — Fichaje')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e.postData && e.postData.contents) || '{}');
  } catch (err) {
    body = { action: '' };
  }
  return responder_(ejecutarAccion_(body), body.callback);
}

function responder_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback && /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(callback))) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function apiGis(p) {
  return ejecutarAccion_(p);
}

function ejecutarAccion_(p) {
  try {
    asegurarHojas_();
    switch (String(p.action || '')) {
      case 'ping':
        return { ok: true, hoja: getSs_().getUrl(), empleados: getSheet_(SHEET_EMPLEADOS).getLastRow() - 1 };
      case 'buscarEmpleado':
        return resolverEmpleado_(p);
      case 'fichar':
        return registrarFichaje(p.qr, p.tipo, p.metodo || 'web', p.nota || '', p.numero, p.pin);
      case 'incidencia':
        return registrarIncidencia(p);
      case 'sos':
        return registrarSOS(p);
      case 'gps':
        return registrarGPS(p);
      case 'gpsVivos':
        return listarGpsVivos_(Number(p.minutos || 30));
      case 'recorrido':
        return listarRecorrido_(p.id || p.numero);
      case 'plantilla':
        return listarPlantilla_();
      default:
        return { ok: false, error: 'Acción no reconocida: ' + p.action };
    }
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

function inactivo_(v) {
  return v === false || String(v).toUpperCase() === 'FALSE' || v === 0 || v === '0';
}

function resolverEmpleado_(p) {
  if (p.numero && p.pin) return buscarEmpleadoPorNumeroPin(p.numero, p.pin);
  if (p.qr) return buscarEmpleadoPorQR(p.qr);
  return { ok: false, error: 'Indica QR o número de empleado + contraseña de 4 dígitos.' };
}

function filaEmpleado_(idEmpleado, nombre, codigo, servicioAsignado) {
  const servicio = buscarServicioPorId_(servicioAsignado);
  const estado = obtenerUltimoEstadoFichaje_(idEmpleado);
  return {
    ok: true,
    empleado: { id: idEmpleado, nombre: nombre, qr: codigo, numero: idEmpleado },
    servicio: servicio,
    estadoActual: estado
  };
}

function buscarEmpleadoPorQR(codigoQR) {
  if (!codigoQR) return { ok: false, error: 'Falta el código QR.' };
  const data = getSheet_(SHEET_EMPLEADOS).getDataRange().getValues();
  const buscado = String(codigoQR).trim().toUpperCase();
  for (let i = 1; i < data.length; i++) {
    const [idEmpleado, nombre, codigo, servicioAsignado, activo] = data[i];
    if (String(codigo).trim().toUpperCase() === buscado) {
      if (inactivo_(activo)) return { ok: false, error: 'Este empleado está marcado como inactivo.' };
      return filaEmpleado_(idEmpleado, nombre, codigo, servicioAsignado);
    }
  }
  return { ok: false, error: 'Código QR no reconocido.' };
}

function buscarEmpleadoPorNumeroPin(numero, pin) {
  const data = getSheet_(SHEET_EMPLEADOS).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const [idEmpleado, nombre, codigo, servicioAsignado, activo, pinHoja] = data[i];
    if (String(idEmpleado).trim() === String(numero).trim()) {
      if (inactivo_(activo)) return { ok: false, error: 'Este empleado está marcado como inactivo.' };
      if (String(pinHoja).trim() !== String(pin).trim()) {
        return { ok: false, error: 'Contraseña incorrecta.' };
      }
      return filaEmpleado_(idEmpleado, nombre, codigo, servicioAsignado);
    }
  }
  return { ok: false, error: 'Número de empleado no reconocido.' };
}

function buscarServicioPorId_(idServicio) {
  const data = getSheet_(SHEET_SERVICIOS).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const [id, nombre, telefono] = data[i];
    if (String(id).trim() === String(idServicio).trim()) {
      return { id: id, nombre: nombre, telefono: telefono || '' };
    }
  }
  return { id: idServicio, nombre: '(Servicio no encontrado)', telefono: '' };
}

function obtenerUltimoEstadoFichaje_(idEmpleado) {
  const data = getSheet_(SHEET_FICHAJES).getDataRange().getValues();
  let ultimoTipo = null;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(idEmpleado).trim()) {
      ultimoTipo = data[i][5];
    }
  }
  return ultimoTipo;
}

function registrarFichaje(codigoQR, tipo, metodo, nota, numero, pin) {
  if (tipo !== 'Entrada' && tipo !== 'Salida') {
    return { ok: false, error: 'Tipo de fichaje no válido.' };
  }
  const resultado = resolverEmpleado_({ qr: codigoQR, numero: numero, pin: pin });
  if (!resultado.ok) return resultado;
  const estado = resultado.estadoActual;
  if (tipo === 'Entrada' && estado === 'Entrada') {
    return { ok: false, error: 'Este trabajador ya tiene el servicio iniciado.' };
  }
  if (tipo === 'Salida' && estado !== 'Entrada') {
    return { ok: false, error: 'No hay un inicio de servicio abierto para este trabajador.' };
  }
  getSheet_(SHEET_FICHAJES).appendRow([
    new Date(),
    resultado.empleado.id,
    resultado.empleado.nombre,
    resultado.servicio.id,
    resultado.servicio.nombre,
    tipo,
    metodo || 'QR',
    nota || ''
  ]);
  return { ok: true, mensaje: tipo + ' registrada para ' + resultado.empleado.nombre, empleado: resultado.empleado, servicio: resultado.servicio };
}

function registrarIncidencia(p) {
  const resultado = resolverEmpleado_(p);
  if (!resultado.ok) return resultado;
  const desc = String(p.descripcion || '').trim();
  if (!desc) return { ok: false, error: 'Escribe la nota / incidencia.' };
  getSheet_(SHEET_INCIDENCIAS).appendRow([
    new Date(),
    resultado.empleado.id,
    resultado.empleado.nombre,
    resultado.servicio.id,
    resultado.servicio.nombre,
    p.categoria || 'General',
    desc,
    p.lat || '',
    p.lng || '',
    'Abierta'
  ]);
  return { ok: true, mensaje: 'Parte registrado.' };
}

function registrarSOS(p) {
  const resultado = resolverEmpleado_(p);
  if (!resultado.ok) return resultado;
  getSheet_(SHEET_SOS).appendRow([
    new Date(),
    resultado.empleado.id,
    resultado.empleado.nombre,
    resultado.servicio.id,
    resultado.servicio.nombre,
    p.lat || '',
    p.lng || '',
    'Activo'
  ]);
  if (SOS_NOTIFICATION_EMAILS) {
    const mapsLink = (p.lat && p.lng) ? ('https://maps.google.com/?q=' + p.lat + ',' + p.lng) : '(sin ubicación)';
    MailApp.sendEmail({
      to: SOS_NOTIFICATION_EMAILS,
      subject: '🚨 SOS — ' + resultado.empleado.nombre + ' (' + resultado.servicio.nombre + ')',
      body: 'Empleado: ' + resultado.empleado.nombre + '\nServicio: ' + resultado.servicio.nombre +
            '\nHora: ' + new Date().toLocaleString() + '\nUbicación: ' + mapsLink
    });
  }
  return { ok: true, mensaje: 'SOS enviado.' };
}

function registrarGPS(body) {
  const resultado = resolverEmpleado_(body);
  let emp;
  let serv;
  if (resultado.ok) {
    emp = resultado.empleado;
    serv = resultado.servicio;
  } else if (body.idEmpleado || body.empleado_id) {
    emp = { id: body.idEmpleado || body.empleado_id, nombre: body.nombre || '' };
    serv = { id: body.idServicio || body.servicio_id || '', nombre: '' };
  } else {
    return resultado;
  }
  if (body.lat === '' || body.lat == null || body.lng === '' || body.lng == null) {
    return { ok: false, error: 'Faltan coordenadas.' };
  }
  getSheet_(SHEET_GPS).appendRow([
    new Date(),
    emp.id,
    emp.nombre,
    serv.id,
    serv.nombre,
    body.lat,
    body.lng,
    body.precision || ''
  ]);
  return { ok: true };
}

function listarGpsVivos_(minutos) {
  const data = getSheet_(SHEET_GPS).getDataRange().getValues();
  const corte = new Date().getTime() - (minutos || 30) * 60 * 1000;
  const last = {};
  for (let i = 1; i < data.length; i++) {
    const ts = data[i][0] instanceof Date ? data[i][0] : new Date(data[i][0]);
    if (isNaN(ts.getTime()) || ts.getTime() < corte) continue;
    last[String(data[i][1])] = {
      empleado_id: data[i][1],
      nombre: data[i][2],
      servicio_nombre: data[i][4],
      latitud: Number(data[i][5]),
      longitud: Number(data[i][6]),
      precision: data[i][7],
      timestamp: ts.toISOString()
    };
  }
  return { ok: true, puntos: Object.keys(last).map(function (k) { return last[k]; }) };
}

function listarRecorrido_(id) {
  const data = getSheet_(SHEET_GPS).getDataRange().getValues();
  const puntos = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() !== String(id).trim()) continue;
    puntos.push({
      latitud: Number(data[i][5]),
      longitud: Number(data[i][6]),
      timestamp: data[i][0]
    });
  }
  return { ok: true, puntos: puntos.slice(-2000) };
}

function listarPlantilla_() {
  const data = getSheet_(SHEET_EMPLEADOS).getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    const [idEmpleado, nombre, codigo, servicioAsignado, activo] = data[i];
    if (!idEmpleado) continue;
    out.push({
      numero: idEmpleado,
      nombre: nombre,
      codigo_qr: codigo,
      servicio: servicioAsignado,
      activo: !inactivo_(activo)
    });
  }
  return { ok: true, empleados: out };
}

function onEdit(e) {
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== SHEET_EMPLEADOS) return;
    const fila = e.range.getRow();
    if (fila === 1) return;
    const nombre = sheet.getRange(fila, 2).getValue();
    const codigoActual = sheet.getRange(fila, 3).getValue();
    if (!nombre || codigoActual) return;
    const last = Math.max(sheet.getLastRow() - 1, 1);
    const existentes = new Set(
      sheet.getRange(2, 3, last, 1).getValues().flat().map(String).filter(Boolean)
    );
    let token;
    do { token = generarTokenQR_(); } while (existentes.has(token));
    sheet.getRange(fila, 3).setValue(token);
  } catch (err) {}
}

function generarTokenQR_() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
}

function generarQRsEmpleados() {
  const sheet = getSheet_(SHEET_EMPLEADOS);
  const data = sheet.getDataRange().getValues();
  const tokensExistentes = new Set(data.slice(1).map(function (r) { return String(r[2]).trim(); }).filter(Boolean));
  const pendientes = [];
  for (let i = 1; i < data.length; i++) {
    const idEmpleado = data[i][0];
    const nombre = data[i][1];
    const codigoQR = data[i][2];
    if (!idEmpleado) continue;
    if (codigoQR) {
      pendientes.push({ id: idEmpleado, nombre: nombre, token: codigoQR, nuevo: false });
      continue;
    }
    let token;
    do { token = generarTokenQR_(); } while (tokensExistentes.has(token));
    tokensExistentes.add(token);
    sheet.getRange(i + 1, 3).setValue(token);
    pendientes.push({ id: idEmpleado, nombre: nombre, token: token, nuevo: true });
  }
  if (pendientes.length === 0) {
    SpreadsheetApp.getUi().alert('No hay empleados en la hoja "Empleados" todavía.');
    return;
  }
  const doc = crearDocumentoQRs_(pendientes);
  const nuevos = pendientes.filter(function (p) { return p.nuevo; }).length;
  SpreadsheetApp.getUi().alert(
    'QRs generados: ' + nuevos + ' nuevo(s), ' + (pendientes.length - nuevos) + ' ya existían.\n\nDocumento:\n' + doc.getUrl()
  );
}

function crearDocumentoQRs_(empleados) {
  const nombreDoc = 'QRs Empleados GIS Seguridad — ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const doc = DocumentApp.create(nombreDoc);
  const body = doc.getBody();
  body.setMarginTop(36).setMarginBottom(36);
  empleados.forEach(function (emp, idx) {
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(emp.token);
    const imgBlob = UrlFetchApp.fetch(qrUrl).getBlob();
    const titulo = body.appendParagraph(emp.nombre || String(emp.id));
    titulo.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    const img = body.appendImage(imgBlob);
    img.getParent().asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    img.setWidth(280).setHeight(280);
    body.appendParagraph('ID: ' + emp.id + '   ·   Código: ' + emp.token)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    if (idx < empleados.length - 1) body.appendPageBreak();
  });
  doc.saveAndClose();
  try {
    const ssFile = DriveApp.getFileById(getSs_().getId());
    const folders = ssFile.getParents();
    if (folders.hasNext()) DriveApp.getFileById(doc.getId()).moveTo(folders.next());
  } catch (e) {}
  return doc;
}
