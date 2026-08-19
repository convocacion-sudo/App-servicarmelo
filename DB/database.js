const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

let wb = null;
let rutaArchivo = null;

const HOJAS = ['clientes', 'servicios', 'conversaciones', 'recordatorios', 'config'];

const COLUMNAS = {
  clientes: ['id', 'nombre', 'cc_nit', 'telefono', 'email', 'municipio', 'tipo_vehiculo', 'modelo', 'placa', 'servicio', 'soat', 'tecnico_mecanica', 'extintor', 'etiqueta', 'notas', 'creado', 'ultimo_contacto'],
  servicios: ['id', 'cliente_id', 'tipo', 'nombre', 'descripcion', 'fecha', 'fecha_vencimiento', 'valor', 'estado', 'notas', 'creado'],
  conversaciones: ['id', 'cliente_id', 'fecha', 'tipo', 'tema', 'resumen', 'valor', 'seguimiento'],
  recordatorios: ['id', 'cliente_id', 'titulo', 'fecha', 'nota', 'completado'],
  config: ['clave', 'valor']
};

function rutaDB() {
  const { app } = require('electron');
  return path.join(app.getPath('userData'), 'crm.xlsx');
}

function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function inicializar() {
  rutaArchivo = rutaDB();
  fs.mkdirSync(path.dirname(rutaArchivo), { recursive: true });

  if (fs.existsSync(rutaArchivo)) {
    wb = XLSX.readFile(rutaArchivo);
  } else {
    wb = XLSX.utils.book_new();
    for (const hoja of HOJAS) {
      const ws = XLSX.utils.aoa_to_sheet([COLUMNAS[hoja]]);
      XLSX.utils.book_append_sheet(wb, ws, hoja);
    }
    guardar();
  }

  // Asegurar que todas las hojas existan
  for (const hoja of HOJAS) {
    if (!wb.Sheets[hoja]) {
      const ws = XLSX.utils.aoa_to_sheet([COLUMNAS[hoja]]);
      XLSX.utils.book_append_sheet(wb, ws, hoja);
    }
  }
}

function guardar() {
  if (!wb || !rutaArchivo) return;
  XLSX.writeFile(wb, rutaArchivo);
}

function leerHoja(nombre) {
  const ws = wb.Sheets[nombre];
  if (!ws) return [];
  const datos = XLSX.utils.sheet_to_json(ws);
  return datos;
}

function escribirHoja(nombre, filas) {
  const ws = XLSX.utils.aoa_to_sheet([COLUMNAS[nombre]]);
  if (filas.length > 0) {
    XLSX.utils.sheet_add_json(ws, filas, { skipHeader: true, origin: 1 });
  }
  wb.Sheets[nombre] = ws;
}

// ===================== CLIENTES =====================

function agregarCliente(cliente) {
  const clientes = leerHoja('clientes');
  const nuevo = {
    id: nuevoId(),
    nombre: cliente.nombre || '',
    cc_nit: cliente.cc_nit || '',
    telefono: cliente.telefono || '',
    email: cliente.email || '',
    municipio: cliente.municipio || '',
    tipo_vehiculo: cliente.tipo_vehiculo || '',
    modelo: cliente.modelo || '',
    placa: cliente.placa || '',
    servicio: cliente.servicio || '',
    soat: cliente.soat || '',
    tecnico_mecanica: cliente.tecnico_mecanica || '',
    extintor: cliente.extintor || '',
    etiqueta: cliente.etiqueta || 'activo',
    notas: cliente.notas || '',
    creado: cliente.creado || new Date().toISOString(),
    ultimo_contacto: cliente.ultimoContacto || ''
  };
  clientes.unshift(nuevo);
  escribirHoja('clientes', clientes);
  guardar();
  return nuevo;
}

function obtenerClientePorId(id) {
  const clientes = leerHoja('clientes');
  return clientes.find(c => c.id === id) || null;
}

function actualizarCliente(id, cambios) {
  const clientes = leerHoja('clientes');
  const idx = clientes.findIndex(c => c.id === id);
  if (idx === -1) return null;

  const mapping = {
    nombre: 'nombre', cc_nit: 'cc_nit', telefono: 'telefono', email: 'email',
    municipio: 'municipio', tipo_vehiculo: 'tipo_vehiculo', modelo: 'modelo',
    placa: 'placa', servicio: 'servicio', soat: 'soat',
    tecnico_mecanica: 'tecnico_mecanica', extintor: 'extintor',
    etiqueta: 'etiqueta', notas: 'notas', ultimoContacto: 'ultimo_contacto'
  };

  for (const [claveJS, columna] of Object.entries(mapping)) {
    if (cambios[claveJS] !== undefined) {
      clientes[idx][columna] = cambios[claveJS];
    }
  }

  escribirHoja('clientes', clientes);
  guardar();
  return clientes[idx];
}

function eliminarCliente(id) {
  let clientes = leerHoja('clientes');
  clientes = clientes.filter(c => c.id !== id);
  escribirHoja('clientes', clientes);

  let conversaciones = leerHoja('conversaciones');
  conversaciones = conversaciones.filter(c => c.cliente_id !== id);
  escribirHoja('conversaciones', conversaciones);

  let recordatorios = leerHoja('recordatorios');
  recordatorios = recordatorios.filter(r => r.cliente_id !== id);
  escribirHoja('recordatorios', recordatorios);

  let servicios = leerHoja('servicios');
  servicios = servicios.filter(s => s.cliente_id !== id);
  escribirHoja('servicios', servicios);

  guardar();
  return true;
}

function todosLosClientes() {
  return leerHoja('clientes');
}

// ===================== SERVICIOS =====================

function agregarServicio(servicio) {
  const servicios = leerHoja('servicios');
  const ahora = new Date().toISOString();
  const nuevo = {
    id: nuevoId(),
    cliente_id: servicio.clienteId,
    tipo: servicio.tipo || '',
    nombre: servicio.nombre || '',
    descripcion: servicio.descripcion || '',
    fecha: servicio.fecha || ahora,
    fecha_vencimiento: servicio.fechaVencimiento || '',
    valor: servicio.valor || 0,
    estado: servicio.estado || 'activo',
    notas: servicio.notas || '',
    creado: servicio.creado || ahora
  };
  servicios.unshift(nuevo);
  escribirHoja('servicios', servicios);
  guardar();
  return nuevo;
}

function actualizarServicio(id, cambios) {
  const servicios = leerHoja('servicios');
  const idx = servicios.findIndex(s => s.id === id);
  if (idx === -1) return null;

  const mapping = {
    tipo: 'tipo', nombre: 'nombre', descripcion: 'descripcion',
    fecha: 'fecha', fechaVencimiento: 'fecha_vencimiento',
    valor: 'valor', estado: 'estado', notas: 'notas'
  };

  for (const [claveJS, columna] of Object.entries(mapping)) {
    if (cambios[claveJS] !== undefined) {
      servicios[idx][columna] = cambios[claveJS];
    }
  }

  escribirHoja('servicios', servicios);
  guardar();
  return servicios[idx];
}

function eliminarServicio(id) {
  let servicios = leerHoja('servicios');
  servicios = servicios.filter(s => s.id !== id);
  escribirHoja('servicios', servicios);
  guardar();
  return true;
}

function serviciosPorCliente(clienteId) {
  const servicios = leerHoja('servicios');
  return servicios
    .filter(s => s.cliente_id === clienteId)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

function todosLosServicios() {
  return leerHoja('servicios');
}

function serviciosPorVencer(dias) {
  const servicios = leerHoja('servicios');
  const clientes = leerHoja('clientes');
  const fechaLimite = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

  return servicios
    .filter(s => s.fecha_vencimiento && s.fecha_vencimiento <= fechaLimite && s.estado === 'activo')
    .map(s => {
      const cliente = clientes.find(c => c.id === s.cliente_id);
      return { ...s, cliente_nombre: cliente ? cliente.nombre : '', cliente_telefono: cliente ? cliente.telefono : '' };
    })
    .sort((a, b) => (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || ''));
}

// ===================== CONVERSACIONES =====================

function agregarConversacion(conversacion) {
  const conversaciones = leerHoja('conversaciones');
  const ahora = new Date().toISOString();
  const nueva = {
    id: nuevoId(),
    cliente_id: conversacion.clienteId,
    fecha: conversacion.fecha || ahora,
    tipo: conversacion.tipo || 'llamada',
    tema: conversacion.tema || '',
    resumen: conversacion.resumen || '',
    valor: conversacion.valor || 0,
    seguimiento: conversacion.seguimiento ? 1 : 0
  };
  conversaciones.unshift(nueva);

  if (conversacion.clienteId) {
    const clientes = leerHoja('clientes');
    const idx = clientes.findIndex(c => c.id === conversacion.clienteId);
    if (idx !== -1) clientes[idx].ultimo_contacto = conversacion.fecha || ahora;
    escribirHoja('clientes', clientes);
  }

  escribirHoja('conversaciones', conversaciones);
  guardar();
  return nueva;
}

function actualizarConversacion(id, cambios) {
  const conversaciones = leerHoja('conversaciones');
  const idx = conversaciones.findIndex(c => c.id === id);
  if (idx === -1) return null;

  const mapping = {
    clienteId: 'cliente_id', fecha: 'fecha', tipo: 'tipo',
    tema: 'tema', resumen: 'resumen', valor: 'valor', seguimiento: 'seguimiento'
  };

  for (const [claveJS, columna] of Object.entries(mapping)) {
    if (cambios[claveJS] !== undefined) {
      conversaciones[idx][columna] = claveJS === 'seguimiento' ? (cambios[claveJS] ? 1 : 0) : cambios[claveJS];
    }
  }

  escribirHoja('conversaciones', conversaciones);
  guardar();
  return conversaciones[idx];
}

function eliminarConversacion(id) {
  let conversaciones = leerHoja('conversaciones');
  conversaciones = conversaciones.filter(c => c.id !== id);
  escribirHoja('conversaciones', conversaciones);
  guardar();
  return true;
}

function todasLasConversaciones() {
  return leerHoja('conversaciones');
}

// ===================== RECORDATORIOS =====================

function agregarRecordatorio(recordatorio) {
  const recordatorios = leerHoja('recordatorios');
  const nuevo = {
    id: nuevoId(),
    cliente_id: recordatorio.clienteId || '',
    titulo: recordatorio.titulo || '',
    fecha: recordatorio.fecha || new Date().toISOString().slice(0, 10),
    nota: recordatorio.nota || '',
    completado: recordatorio.completado ? 1 : 0
  };
  recordatorios.unshift(nuevo);
  escribirHoja('recordatorios', recordatorios);
  guardar();
  return nuevo;
}

function actualizarRecordatorio(id, cambios) {
  const recordatorios = leerHoja('recordatorios');
  const idx = recordatorios.findIndex(r => r.id === id);
  if (idx === -1) return null;

  const mapping = {
    clienteId: 'cliente_id', titulo: 'titulo', fecha: 'fecha',
    nota: 'nota', completado: 'completado'
  };

  for (const [claveJS, columna] of Object.entries(mapping)) {
    if (cambios[claveJS] !== undefined) {
      recordatorios[idx][columna] = claveJS === 'completado' ? (cambios[claveJS] ? 1 : 0) : cambios[claveJS];
    }
  }

  escribirHoja('recordatorios', recordatorios);
  guardar();
  return recordatorios[idx];
}

function eliminarRecordatorio(id) {
  let recordatorios = leerHoja('recordatorios');
  recordatorios = recordatorios.filter(r => r.id !== id);
  escribirHoja('recordatorios', recordatorios);
  guardar();
  return true;
}

function todosLosRecordatorios() {
  return leerHoja('recordatorios');
}

// ===================== CONFIG =====================

function obtenerConfig(clave) {
  const config = leerHoja('config');
  const row = config.find(c => c.clave === clave);
  return row ? row.valor : null;
}

function guardarConfig(clave, valor) {
  const config = leerHoja('config');
  const idx = config.findIndex(c => c.clave === clave);
  if (idx !== -1) {
    config[idx].valor = valor;
  } else {
    config.push({ clave, valor });
  }
  escribirHoja('config', config);
  guardar();
}

// ===================== OBTENER TODO (compatibilidad) =====================

function obtenerTodos() {
  const clientes = todosLosClientes();
  const conversaciones = todasLasConversaciones();
  const recordatorios = todosLosRecordatorios();
  const config = { ultimaRevision: obtenerConfig('ultimaRevision') };

  conversaciones.forEach(c => { c.seguimiento = !!c.seguimiento; });
  recordatorios.forEach(r => { r.completado = !!r.completado; });
  clientes.forEach(c => { c.ultimoContacto = c.ultimo_contacto; });

  return { clientes, conversaciones, recordatorios, config };
}

// ===================== MIGRACIÓN DESDE JSON =====================

function migrarDesdeJSON(rutaJSON) {
  try {
    const raw = fs.readFileSync(rutaJSON, 'utf-8');
    const datos = JSON.parse(raw);
    const clientes = leerHoja('clientes');
    const conversaciones = leerHoja('conversaciones');
    const recordatorios = leerHoja('recordatorios');

    if (Array.isArray(datos.clientes)) {
      for (const c of datos.clientes) {
        clientes.push({
          id: c.id, nombre: c.nombre || '', cc_nit: c.cc_nit || '',
          telefono: c.telefono || '', email: c.email || '', municipio: c.municipio || '',
          tipo_vehiculo: c.tipo_vehiculo || '', modelo: c.modelo || '', placa: c.placa || '',
          servicio: c.servicio || '', soat: c.soat || '', tecnico_mecanica: c.tecnico_mecanica || '',
          extintor: c.extintor || '', etiqueta: c.etiqueta || 'activo', notas: c.notas || '',
          creado: c.creado || new Date().toISOString(), ultimo_contacto: c.ultimoContacto || ''
        });
      }
      escribirHoja('clientes', clientes);
    }

    if (Array.isArray(datos.conversaciones)) {
      for (const c of datos.conversaciones) {
        conversaciones.push({
          id: c.id, cliente_id: c.clienteId, fecha: c.fecha || new Date().toISOString(),
          tipo: c.tipo || 'llamada', tema: c.tema || '', resumen: c.resumen || '',
          valor: c.valor || 0, seguimiento: c.seguimiento ? 1 : 0
        });
      }
      escribirHoja('conversaciones', conversaciones);
    }

    if (Array.isArray(datos.recordatorios)) {
      for (const r of datos.recordatorios) {
        recordatorios.push({
          id: r.id, cliente_id: r.clienteId || '', titulo: r.titulo || '',
          fecha: r.fecha || new Date().toISOString().slice(0, 10),
          nota: r.nota || '', completado: r.completado ? 1 : 0
        });
      }
      escribirHoja('recordatorios', recordatorios);
    }

    guardar();
    return true;
  } catch (e) {
    console.error('Error migrando datos:', e);
    return false;
  }
}

// ===================== REEMPLAZAR TODO (importación) =====================

function reemplazarTodo(datos) {
  const clientes = [];
  const conversaciones = [];
  const recordatorios = [];
  const config = [];

  if (Array.isArray(datos.clientes)) {
    for (const c of datos.clientes) {
      clientes.push({
        id: c.id, nombre: c.nombre || '', cc_nit: c.cc_nit || '',
        telefono: c.telefono || '', email: c.email || '', municipio: c.municipio || '',
        tipo_vehiculo: c.tipo_vehiculo || '', modelo: c.modelo || '', placa: c.placa || '',
        servicio: c.servicio || '', soat: c.soat || '', tecnico_mecanica: c.tecnico_mecanica || '',
        extintor: c.extintor || '', etiqueta: c.etiqueta || 'activo', notas: c.notas || '',
        creado: c.creado || new Date().toISOString(), ultimo_contacto: c.ultimoContacto || ''
      });
    }
  }

  if (Array.isArray(datos.conversaciones)) {
    for (const c of datos.conversaciones) {
      conversaciones.push({
        id: c.id, cliente_id: c.clienteId, fecha: c.fecha,
        tipo: c.tipo, tema: c.tema, resumen: c.resumen,
        valor: c.valor, seguimiento: c.seguimiento ? 1 : 0
      });
    }
  }

  if (Array.isArray(datos.recordatorios)) {
    for (const r of datos.recordatorios) {
      recordatorios.push({
        id: r.id, cliente_id: r.clienteId || '', titulo: r.titulo,
        fecha: r.fecha, nota: r.nota, completado: r.completado ? 1 : 0
      });
    }
  }

  if (datos.config) {
    for (const [k, v] of Object.entries(datos.config)) {
      config.push({ clave: k, valor: String(v) });
    }
  }

  // Conservar servicios existentes
  const serviciosActuales = leerHoja('servicios');

  escribirHoja('clientes', clientes);
  escribirHoja('conversaciones', conversaciones);
  escribirHoja('recordatorios', recordatorios);
  escribirHoja('config', config);
  escribirHoja('servicios', serviciosActuales);
  guardar();
  return true;
}

module.exports = {
  inicializar,
  nuevoId,
  agregarCliente, obtenerClientePorId, actualizarCliente, eliminarCliente, todosLosClientes,
  agregarServicio, actualizarServicio, eliminarServicio, serviciosPorCliente, todosLosServicios, serviciosPorVencer,
  agregarConversacion, actualizarConversacion, eliminarConversacion, todasLasConversaciones,
  agregarRecordatorio, actualizarRecordatorio, eliminarRecordatorio, todosLosRecordatorios,
  obtenerConfig, guardarConfig,
  obtenerTodos, reemplazarTodo, migrarDesdeJSON
};
