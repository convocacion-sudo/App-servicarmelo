const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  obtenerDatos: () => ipcRenderer.invoke('datos:obtener'),
  rutaDatos: () => ipcRenderer.invoke('app:ruta'),
  exportar: (inicio, fin) => ipcRenderer.invoke('datos:exportar', inicio, fin),
  importar: () => ipcRenderer.invoke('datos:importar'),
  clienteAgregar: (cliente) => ipcRenderer.invoke('clientes:agregar', cliente),
  clienteActualizar: (id, cambios) => ipcRenderer.invoke('clientes:actualizar', id, cambios),
  clienteEliminar: (id) => ipcRenderer.invoke('clientes:eliminar', id),
  conversacionAgregar: (conversacion) => ipcRenderer.invoke('conversaciones:agregar', conversacion),
  conversacionActualizar: (id, cambios) => ipcRenderer.invoke('conversaciones:actualizar', id, cambios),
  conversacionEliminar: (id) => ipcRenderer.invoke('conversaciones:eliminar', id),
  recordatorioAgregar: (recordatorio) => ipcRenderer.invoke('recordatorios:agregar', recordatorio),
  recordatorioActualizar: (id, cambios) => ipcRenderer.invoke('recordatorios:actualizar', id, cambios),
  recordatorioEliminar: (id) => ipcRenderer.invoke('recordatorios:eliminar', id),
  servicioAgregar: (servicio) => ipcRenderer.invoke('servicios:agregar', servicio),
  servicioActualizar: (id, cambios) => ipcRenderer.invoke('servicios:actualizar', id, cambios),
  servicioEliminar: (id) => ipcRenderer.invoke('servicios:eliminar', id),
  serviciosPorCliente: (clienteId) => ipcRenderer.invoke('servicios:por-cliente', clienteId),
  serviciosTodos: () => ipcRenderer.invoke('servicios:todos'),
  serviciosPorVencer: (dias) => ipcRenderer.invoke('servicios:por-vencer', dias)
});
