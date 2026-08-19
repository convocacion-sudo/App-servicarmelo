const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const db = require('./src/db.js');

function crearVentana() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    title: 'Gestor de Clientes',
    backgroundColor: '#f4f6fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  return win;
}

app.whenReady().then(() => {
  crearVentana();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const plantillaMenu = [
  {
    label: 'Archivo',
    submenu: [
      { label: 'Exportar copia', accelerator: 'CmdOrCtrl+E', click: () => {} },
      { label: 'Importar copia', accelerator: 'CmdOrCtrl+I', click: () => {} },
      { type: 'separator' },
      { role: 'quit', label: 'Salir' }
    ]
  },
  {
    label: 'Editar',
    submenu: [
      { role: 'undo', label: 'Deshacer' },
      { role: 'redo', label: 'Rehacer' },
      { type: 'separator' },
      { role: 'cut', label: 'Cortar' },
      { role: 'copy', label: 'Copiar' },
      { role: 'paste', label: 'Pegar' },
      { role: 'selectAll', label: 'Seleccionar todo' }
    ]
  },
  {
    label: 'Ver',
    submenu: [
      { role: 'reload', label: 'Recargar' },
      { role: 'forceReload', label: 'Forzar recarga' },
      { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Restablecer zoom' },
      { role: 'zoomIn', label: 'Acercar' },
      { role: 'zoomOut', label: 'Alejar' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Pantalla completa' }
    ]
  },
  {
    label: 'Ventana',
    submenu: [
      { role: 'minimize', label: 'Minimizar' },
      { role: 'maximize', label: 'Maximizar' },
      { role: 'close', label: 'Cerrar' }
    ]
  }
];

Menu.setApplicationMenu(Menu.buildFromTemplate(plantillaMenu));

ipcMain.handle('datos:obtener', () => db.obtenerTodos());
ipcMain.handle('app:ruta', () => app.getPath('userData'));

ipcMain.handle('clientes:agregar', (evento, cliente) => db.agregarCliente(cliente));
ipcMain.handle('clientes:actualizar', (evento, id, cambios) => db.actualizarCliente(id, cambios));
ipcMain.handle('clientes:eliminar', (evento, id) => db.eliminarCliente(id));

ipcMain.handle('conversaciones:agregar', (evento, conversacion) => db.agregarConversacion(conversacion));
ipcMain.handle('conversaciones:actualizar', (evento, id, cambios) => db.actualizarConversacion(id, cambios));
ipcMain.handle('conversaciones:eliminar', (evento, id) => db.eliminarConversacion(id));

ipcMain.handle('recordatorios:agregar', (evento, recordatorio) => db.agregarRecordatorio(recordatorio));
ipcMain.handle('recordatorios:actualizar', (evento, id, cambios) => db.actualizarRecordatorio(id, cambios));
ipcMain.handle('recordatorios:eliminar', (evento, id) => db.eliminarRecordatorio(id));

ipcMain.handle('servicios:agregar', (evento, servicio) => db.agregarServicio(servicio));
ipcMain.handle('servicios:actualizar', (evento, id, cambios) => db.actualizarServicio(id, cambios));
ipcMain.handle('servicios:eliminar', (evento, id) => db.eliminarServicio(id));
ipcMain.handle('servicios:por-cliente', (evento, clienteId) => db.serviciosPorCliente(clienteId));
ipcMain.handle('servicios:todos', () => db.todosLosServicios());
ipcMain.handle('servicios:por-vencer', (evento, dias) => db.serviciosPorVencer(dias));

ipcMain.handle('datos:exportar', async (evento, fechaInicio, fechaFin) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar copia de seguridad',
    defaultPath: 'copia_clientes_' + new Date().toISOString().slice(0, 10) + '.xlsx',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  });
  if (canceled || !filePath) return false;

  const datos = db.obtenerTodos();
  const wb = XLSX.utils.book_new();

  const filtrarPorFecha = (items, campo) => {
    if (!fechaInicio && !fechaFin) return items;
    return items.filter(item => {
      const fecha = (item[campo] || '').slice(0, 10);
      if (!fecha) return false;
      if (fechaInicio && fecha < fechaInicio) return false;
      if (fechaFin && fecha > fechaFin) return false;
      return true;
    });
  };

  const clientesFiltrados = filtrarPorFecha(datos.clientes || [], 'creado');
  const clienteIds = new Set(clientesFiltrados.map(c => c.id));

  const serviciosFiltrados = filtrarPorFecha(datos.servicios || [], 'fecha')
    .filter(s => clienteIds.has(s.cliente_id));
  const conversacionesFiltradas = filtrarPorFecha(datos.conversaciones || [], 'fecha')
    .filter(c => clienteIds.has(c.cliente_id));
  const recordatoriosFiltrados = filtrarPorFecha(datos.recordatorios || [], 'fecha')
    .filter(r => !r.cliente_id || clienteIds.has(r.cliente_id));

  const clientes = clientesFiltrados.map(c => ({
    ID: c.id, Nombre: c.nombre, 'C.C / NIT': c.cc_nit, Teléfono: c.telefono,
    Correo: c.email, Municipio: c.municipio, 'Tipo vehículo': c.tipo_vehiculo,
    Modelo: c.modelo, Placa: c.placa, Servicio: c.servicio,
    SOAT: c.soat, Tecnomecánica: c.tecnico_mecanica, Extintor: c.extintor,
    Etiqueta: c.etiqueta, Notas: c.notas, Creado: c.creado, 'Último contacto': c.ultimoContacto || c.ultimo_contacto
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientes), 'Clientes');

  const servicios = serviciosFiltrados.map(s => ({
    ID: s.id, 'Cliente ID': s.cliente_id, Tipo: s.tipo, Nombre: s.nombre,
    Descripción: s.descripcion, Fecha: s.fecha, Vencimiento: s.fecha_vencimiento,
    Valor: s.valor, Estado: s.estado, Notas: s.notas, Creado: s.creado
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(servicios), 'Servicios');

  const conversaciones = conversacionesFiltradas.map(c => ({
    ID: c.id, 'Cliente ID': c.cliente_id, Fecha: c.fecha, Tipo: c.tipo,
    Tema: c.tema, Resumen: c.resumen, Valor: c.valor, Seguimiento: c.seguimiento ? 'Sí' : 'No'
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(conversaciones), 'Conversaciones');

  const recordatorios = recordatoriosFiltrados.map(r => ({
    ID: r.id, 'Cliente ID': r.cliente_id, Título: r.titulo, Fecha: r.fecha,
    Nota: r.nota, Completado: r.completado ? 'Sí' : 'No'
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recordatorios), 'Recordatorios');

  XLSX.writeFile(wb, filePath);
  return true;
});

ipcMain.handle('datos:importar', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importar copia de seguridad',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return false;
  try {
    const contenido = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
    if (!contenido || !Array.isArray(contenido.clientes)) return 'invalido';
    db.reemplazarTodo(contenido);
    return true;
  } catch (e) {
    return 'error';
  }
});
