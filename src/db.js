const path = require('path');
const fs = require('fs');
const db = require('../DB/database.js');

function init() {
  db.inicializar();

  // Migrar desde JSON si existe y la DB está vacía
  const { app } = require('electron');
  const rutaJSON = path.join(app.getPath('userData'), 'datos.json');
  const clientesExistentes = db.todosLosClientes();
  if (clientesExistentes.length === 0 && fs.existsSync(rutaJSON)) {
    db.migrarDesdeJSON(rutaJSON);
  }
}

init();

module.exports = {
  obtenerTodos: db.obtenerTodos,
  agregarCliente: db.agregarCliente,
  actualizarCliente: db.actualizarCliente,
  eliminarCliente: db.eliminarCliente,
  agregarConversacion: db.agregarConversacion,
  actualizarConversacion: db.actualizarConversacion,
  eliminarConversacion: db.eliminarConversacion,
  agregarRecordatorio: db.agregarRecordatorio,
  actualizarRecordatorio: db.actualizarRecordatorio,
  eliminarRecordatorio: db.eliminarRecordatorio,
  reemplazarTodo: db.reemplazarTodo,
  agregarServicio: db.agregarServicio,
  actualizarServicio: db.actualizarServicio,
  eliminarServicio: db.eliminarServicio,
  serviciosPorCliente: db.serviciosPorCliente,
  todosLosServicios: db.todosLosServicios,
  serviciosPorVencer: db.serviciosPorVencer
};
