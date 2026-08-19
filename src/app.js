const estado = {
  clientes: [],
  conversaciones: [],
  recordatorios: [],
  config: {},
  filtroRecordatorios: 'pendientes',
  buscadorClientes: '',
  filtroClienteConv: '',
  filtroTipoConv: '',
  formularioClienteTemp: null
};

const ETIQUETAS = {
  activo: 'Activo',
  potencial: 'Potencial',
  inactivo: 'Inactivo',
  vip: 'VIP'
};

const TIPOS = {
  llamada: 'Llamada',
  correo: 'Correo',
  mensaje: 'Mensaje',
  reunion: 'Reunión',
  otro: 'Otro'
};

const VEHICULOS = {
  carro: 'Carro',
  moto: 'Moto',
  camioneta: 'Camioneta',
  camion: 'Camión',
  otro: 'Otro'
};

const SERVICIOS = {
  cambio_aceite: 'Cambio de aceite',
  frenos: 'Frenos',
  llantas: 'Llantas',
  alineacion: 'Alineación',
  balanceo: 'Balanceo',
  mecanica_rapida: 'Mecánica rápida',
  otro: 'Otro'
};

const $ = (id) => document.getElementById(id);

function escapeHtml(texto) {
  return String(texto == null ? '' : texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatearFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function formatearFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(d);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function fechaHoyLocal() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function clientePorId(id) {
  return estado.clientes.find((c) => c.id === id) || null;
}

function diasDesde(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function estadoFechaRecordatorio(fecha) {
  const hoy = fechaHoyLocal();
  if (fecha < hoy) return 'pasada';
  if (fecha === hoy) return 'hoy';
  return 'futura';
}

function notificar(mensaje) {
  const toast = $('toast');
  toast.textContent = mensaje;
  toast.hidden = false;
  clearTimeout(notificar.temporizador);
  notificar.temporizador = setTimeout(() => { toast.hidden = true; }, 2600);
}

async function iniciar() {
  const datos = await window.api.obtenerDatos();
  estado.clientes = datos.clientes;
  estado.conversaciones = datos.conversaciones;
  estado.recordatorios = datos.recordatorios;
  estado.config = datos.config;
  prepararNavegacion();
  prepararBusqueda();
  prepararExportarImportar();
  const ruta = await window.api.rutaDatos();
  const rutaEl = $('ruta-datos');
  rutaEl.textContent = 'Datos guardados en:\n' + ruta;
  rutaEl.title = ruta;
  renderTodo();
  mostrarAlertaVencidos();
}

function mostrarAlertaVencidos() {
  const vencidos = estado.recordatorios
    .filter((r) => !r.completado && r.fecha < fechaHoyLocal())
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!vencidos.length) return;

  $('modal-alerta-cuerpo').innerHTML = `
    <h2>Recordatorios vencidos</h2>
    <p class="subtitulo" style="margin-top:-10px">Tienes ${vencidos.length} recordatorio${vencidos.length > 1 ? 's' : ''} pendiente${vencidos.length > 1 ? 's' : ''} sin atender.</p>
    <div class="tarjetas">
      ${vencidos.map((r) => {
        const cliente = r.clienteId ? clientePorId(r.clienteId) : null;
        return `
          <div class="tarjeta recordatorio">
            <div class="tarjeta-principal">
              <div class="tarjeta-titulo">
                <span>${escapeHtml(r.titulo)}</span>
                ${cliente ? `<span class="tipo-etiqueta tipo-llamada">${escapeHtml(cliente.nombre)}</span>` : ''}
              </div>
              <div class="fecha-tarjeta fecha-pasada">
                Vencido el ${formatearFecha(r.fecha)}
                ${cliente ? ` · <span class="fecha-tarjeta">Tel: ${escapeHtml(cliente.telefono || '—')}</span>` : ''}
              </div>
              ${r.nota ? `<div class="tarjeta-resumen">${escapeHtml(r.nota)}</div>` : ''}
            </div>
            <div class="tarjeta-acciones">
              <button class="btn-primario" data-accion="completar" data-id="${r.id}">Completado</button>
            </div>
          </div>`;
      }).join('')}
    </div>
    <div class="modal-acciones">
      <button type="button" class="btn-primario" data-accion="ver-todos">Ver en Recordatorios</button>
      <button type="button" class="btn-cancelar" data-cerrar>Ahora no</button>
    </div>`;
  $('modal-alerta').hidden = false;

  $('modal-alerta-cuerpo').querySelectorAll('[data-accion]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.accion === 'completar') {
        const id = btn.dataset.id;
        const rec = estado.recordatorios.find((r) => r.id === id);
        if (rec) {
          await window.api.recordatorioActualizar(id, { completado: true });
          rec.completado = true;
          mostrarAlertaVencidos();
          renderTodo();
        }
      } else if (btn.dataset.accion === 'ver-todos') {
        cerrarModalAlerta();
        document.querySelector('.nav-item[data-vista="recordatorios"]').click();
        estado.filtroRecordatorios = 'pendientes';
        document.querySelectorAll('.chip').forEach((c) => {
          c.classList.toggle('activo', c.dataset.filtro === 'pendientes');
        });
        renderRecordatorios();
      }
    });
  });
}

function prepararNavegacion() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('activo'));
      btn.classList.add('activo');
      document.querySelectorAll('.vista').forEach((v) => v.classList.remove('activa'));
      $('vista-' + btn.dataset.vista).classList.add('activa');
    });
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.remove('activo'));
      chip.classList.add('activo');
      estado.filtroRecordatorios = chip.dataset.filtro;
      renderRecordatorios();
    });
  });

  $('btn-nuevo-cliente').addEventListener('click', () => abrirFormularioCliente());
  $('btn-vacio-cliente').addEventListener('click', () => abrirFormularioCliente());
  $('btn-nueva-conversacion').addEventListener('click', () => abrirFormularioConversacion());
  $('btn-nuevo-recordatorio').addEventListener('click', () => abrirFormularioRecordatorio());
  $('filtro-cliente-conv').addEventListener('change', (e) => {
    estado.filtroClienteConv = e.target.value;
    renderConversaciones();
  });
  $('filtro-tipo-conv').addEventListener('change', (e) => {
    estado.filtroTipoConv = e.target.value;
    renderConversaciones();
  });
}

function prepararBusqueda() {
  $('buscar-clientes').addEventListener('input', (e) => {
    estado.buscadorClientes = e.target.value.toLowerCase().trim();
    renderClientes();
  });
}

function prepararExportarImportar() {
  $('btn-exportar').addEventListener('click', () => abrirModalExportar());
  $('btn-importar').addEventListener('click', async () => {
    const resultado = await window.api.importar();
    if (resultado === true) {
      const datos = await window.api.obtenerDatos();
      estado.clientes = datos.clientes;
      estado.conversaciones = datos.conversaciones;
      estado.recordatorios = datos.recordatorios;
      renderTodo();
      notificar('Datos importados correctamente.');
    } else if (resultado === 'invalido') {
      notificar('El archivo no tiene un formato válido.');
    } else if (resultado === 'error') {
      notificar('No se pudo leer el archivo.');
    }
  });
}

function renderTodo() {
  renderInicio();
  renderClientes();
  renderConversaciones();
  renderRecordatorios();
  renderBadge();
}

function renderBadge() {
  const pendientes = estado.recordatorios.filter((r) => !r.completado).length;
  const badge = $('badge-recordatorios');
  badge.hidden = pendientes === 0;
  badge.textContent = pendientes > 99 ? '99+' : pendientes;
}

/* ================= INICIO ================= */

function renderInicio() {
  const hoy = fechaHoyLocal();
  const mesActual = hoy.slice(0, 7);
  const convMes = estado.conversaciones.filter((c) => c.fecha.slice(0, 7) === mesActual);
  const pendientes = estado.recordatorios.filter((r) => !r.completado);
  const porContactar = estado.clientes.filter((c) => {
    const dias = diasDesde(c.ultimoContacto);
    return dias === null || dias > 30;
  });

  const tarjetas = [
    { clase: 'acento', valor: estado.clientes.length, etiqueta: 'Clientes registrados' },
    { clase: 'verde', valor: convMes.length, etiqueta: 'Conversaciones este mes' },
    { clase: 'ambar', valor: pendientes.length, etiqueta: 'Recordatorios pendientes' },
    { clase: '', valor: porContactar.length, etiqueta: 'Clientes por contactar (+30 días)' }
  ];

  $('tarjetas-inicio').innerHTML = tarjetas.map((t) => `
    <div class="tarjeta-resumen ${t.clase}">
      <div class="etiqueta-mini">${t.etiqueta}</div>
      <div class="valor">${t.valor}</div>
    </div>
  `).join('');

  renderBarrasEstados();
  renderBarrasMeses();
  renderUltimosContactos();
  renderRecordatoriosInicio();
}

function renderBarrasEstados() {
  const contador = { activo: 0, potencial: 0, inactivo: 0, vip: 0 };
  estado.clientes.forEach((c) => {
    if (contador[c.etiqueta] != null) contador[c.etiqueta]++;
  });
  const max = Math.max(1, ...Object.values(contador));
  const colores = { activo: 'barra', potencial: 'barra ambar', inactivo: 'barra', vip: 'barra rosa' };
  $('barras-estados').innerHTML = Object.keys(contador).map((k) => {
    const valor = contador[k];
    const alto = Math.round((valor / max) * 100);
    return `
      <div class="barra-col">
        <div class="barra-valor">${valor}</div>
        <div class="barra ${colores[k]}" style="height:${alto}%"></div>
        <div class="barra-rotulo">${ETIQUETAS[k]}</div>
      </div>`;
  }).join('');
}

function renderBarrasMeses() {
  const meses = [];
  const ahora = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    meses.push({
      clave: d.toISOString().slice(0, 7),
      nombre: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d)
    });
  }
  const contador = meses.map((m) => ({
    ...m,
    valor: estado.conversaciones.filter((c) => c.fecha.slice(0, 7) === m.clave).length
  }));
  const max = Math.max(1, ...contador.map((m) => m.valor));
  $('barras-meses').innerHTML = contador.map((m) => `
    <div class="barra-col">
      <div class="barra-valor">${m.valor}</div>
      <div class="barra verde" style="height:${Math.round((m.valor / max) * 100)}%"></div>
      <div class="barra-rotulo">${m.nombre}</div>
    </div>`).join('');
}

function renderUltimosContactos() {
  const ultimos = [...estado.conversaciones]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 6);
  if (!ultimos.length) {
    $('lista-ultimos-contactos').innerHTML = '<div class="sin-datos">Aún no hay conversaciones registradas.</div>';
    return;
  }
  $('lista-ultimos-contactos').innerHTML = ultimos.map((c) => {
    const cliente = clientePorId(c.clienteId);
    return `
      <div class="item-mini">
        <div class="titulo">${escapeHtml(cliente ? cliente.nombre : 'Cliente eliminado')}</div>
        <div class="detalle">${TIPOS[c.tipo] || c.tipo} · ${escapeHtml(c.tema || 'Sin tema')} · ${formatearFecha(c.fecha)}</div>
      </div>`;
  }).join('');
}

function renderRecordatoriosInicio() {
  const pendientes = estado.recordatorios
    .filter((r) => !r.completado)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 6);
  if (!pendientes.length) {
    $('lista-recordatorios-inicio').innerHTML = '<div class="sin-datos">Sin recordatorios pendientes.</div>';
    return;
  }
  $('lista-recordatorios-inicio').innerHTML = pendientes.map((r) => {
    const cliente = r.clienteId ? clientePorId(r.clienteId) : null;
    return `
      <div class="item-mini">
        <div class="titulo">${escapeHtml(r.titulo)}</div>
        <div class="detalle">${formatearFecha(r.fecha)}${cliente ? ' · ' + escapeHtml(cliente.nombre) : ''}</div>
      </div>`;
  }).join('');
}

/* ================= CLIENTES ================= */

function clientesFiltrados() {
  const q = estado.buscadorClientes;
  if (!q) return estado.clientes;
  return estado.clientes.filter((c) =>
    [c.nombre, c.cc_nit, c.telefono, c.email, c.municipio, c.modelo, c.placa].some((v) =>
      String(v || '').toLowerCase().includes(q)
    )
  );
}

function renderClientes() {
  const lista = clientesFiltrados();
  const tbody = $('tabla-clientes');
  $('vacio-clientes').hidden = lista.length > 0;
  tbody.innerHTML = lista.map((c) => `
      <tr data-id="${c.id}">
        <td><span class="nombre-cliente">${escapeHtml(c.nombre || 'Sin nombre')}</span></td>
        <td>${escapeHtml(c.cc_nit || '—')}</td>
        <td>${escapeHtml(c.telefono || '—')}</td>
        <td class="correo-celda">${escapeHtml(c.email || '—')}</td>
        <td>${escapeHtml(c.municipio || '—')}</td>
        <td>${VEHICULOS[c.tipo_vehiculo] || '—'}</td>
        <td>${escapeHtml(c.placa || '—')}</td>
        <td>${SERVICIOS[c.servicio] || c.servicio || '—'}</td>
      </tr>`).join('');

  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', () => abrirFichaCliente(tr.dataset.id));
  });
}

function abrirFormularioCliente(id) {
  const cliente = id ? clientePorId(id) : null;
  const servicioActual = cliente ? cliente.servicio : '';
  const esOtroServicio = servicioActual && !SERVICIOS[servicioActual];
  const servicioSeleccion = esOtroServicio ? 'otro' : servicioActual;

  $('modal-form-cuerpo').innerHTML = `
    <h2>${cliente ? 'Editar cliente' : 'Nuevo cliente'}</h2>
    <form id="form-cliente">
      <div class="dos-columnas">
        <div class="campo">
          <label>Nombre *</label>
          <input name="nombre" required value="${escapeHtml(cliente ? cliente.nombre : '')}">
        </div>
        <div class="campo">
          <label>C.C o Nit</label>
          <input name="cc_nit" value="${escapeHtml(cliente ? cliente.cc_nit : '')}">
        </div>
      </div>
      <div class="dos-columnas">
        <div class="campo">
          <label>Teléfono</label>
          <input name="telefono" value="${escapeHtml(cliente ? cliente.telefono : '')}">
        </div>
        <div class="campo">
          <label>Correo</label>
          <input name="email" type="email" value="${escapeHtml(cliente ? cliente.email : '')}">
        </div>
      </div>
      <div class="campo">
        <label>Municipio</label>
        <input name="municipio" value="${escapeHtml(cliente ? cliente.municipio : '')}">
      </div>
      <div class="dos-columnas">
        <div class="campo">
          <label>Tipo de vehículo</label>
          <select name="tipo_vehiculo">
            <option value="">—</option>
            ${Object.entries(VEHICULOS).map(([k, v]) =>
              `<option value="${k}" ${cliente && cliente.tipo_vehiculo === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label>Modelo</label>
          <input name="modelo" value="${escapeHtml(cliente ? cliente.modelo : '')}">
        </div>
      </div>
      <div class="dos-columnas">
        <div class="campo">
          <label>Placa</label>
          <input name="placa" value="${escapeHtml(cliente ? cliente.placa : '')}">
        </div>
        <div class="campo">
          <label>Servicio</label>
          <select name="servicio" id="servicio-select">
            <option value="">—</option>
            ${Object.entries(SERVICIOS).map(([k, v]) =>
              `<option value="${k}" ${servicioSeleccion === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          <input name="servicio_otro" id="servicio-otro" placeholder="Escribe el servicio..."
            value="${esOtroServicio ? escapeHtml(servicioActual) : ''}"
            style="margin-top:8px" ${esOtroServicio ? '' : 'hidden'}>
        </div>
      </div>
      <div class="campo">
        <label>Notas</label>
        <textarea name="notas">${escapeHtml(cliente ? cliente.notas : '')}</textarea>
      </div>
      <div class="campo">
        <button type="button" class="btn-secundario btn-naranja" id="btn-serv-extendidos" style="width:100%">Servicios extendidos</button>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn-cancelar" data-cerrar>Cancelar</button>
        <button type="submit" class="btn-primario">${cliente ? 'Guardar cambios' : 'Crear cliente'}</button>
      </div>
    </form>`;
  $('modal-form').hidden = false;

  $('servicio-select').addEventListener('change', (e) => {
    const otro = $('servicio-otro');
    if (e.target.value === 'otro') {
      otro.hidden = false;
      otro.focus();
    } else {
      otro.hidden = true;
      otro.value = '';
    }
  });

  $('btn-serv-extendidos').addEventListener('click', () => {
    const datosForm = Object.fromEntries(new FormData($('form-cliente')).entries());
    if (datosForm.servicio === 'otro') {
      datosForm.servicio = datosForm.servicio_otro.trim();
    }
    delete datosForm.servicio_otro;
    estado.formularioClienteTemp = { datos: datosForm, clienteId: cliente ? cliente.id : null };
    cerrarModalForm();
    abrirServiciosExtendidos();
  });

  $('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datosForm = Object.fromEntries(new FormData(e.target).entries());
    if (datosForm.servicio === 'otro') {
      datosForm.servicio = datosForm.servicio_otro.trim();
    }
    delete datosForm.servicio_otro;
    if (cliente) {
      await window.api.clienteActualizar(cliente.id, datosForm);
      Object.assign(cliente, datosForm);
    } else {
      const nuevo = await window.api.clienteAgregar(datosForm);
      estado.clientes.unshift(nuevo);
    }
    cerrarModalForm();
    renderTodo();
    notificar(cliente ? 'Cliente actualizado.' : 'Cliente creado.');
  });
}

function abrirServiciosExtendidos() {
  const temp = estado.formularioClienteTemp;
  const cliente = temp && temp.clienteId ? clientePorId(temp.clienteId) : null;

  $('modal-form-cuerpo').innerHTML = `
    <h2>Servicios extendidos</h2>
    <p class="subtitulo" style="margin-top:-10px;margin-bottom:18px">Renovaciones obligatorias anuales</p>
    <form id="form-serv-ext">
      <div class="campo">
        <label>SOAT</label>
        <input name="soat" type="date" value="${cliente ? cliente.soat : ''}">
      </div>
      <div class="campo">
        <label>Tecnomecánica</label>
        <input name="tecnico_mecanica" type="date" value="${cliente ? cliente.tecnico_mecanica : ''}">
      </div>
      <div class="campo">
        <label>Extintor</label>
        <input name="extintor" type="date" value="${cliente ? cliente.extintor : ''}">
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn-cancelar" id="btn-volver-form">Volver</button>
        <button type="submit" class="btn-primario">Guardar</button>
      </div>
    </form>`;
  $('modal-form').hidden = false;

  $('btn-volver-form').addEventListener('click', () => {
    cerrarModalForm();
    abrirFormularioCliente(temp.clienteId || undefined);
  });

  $('form-serv-ext').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datosServExt = Object.fromEntries(new FormData(e.target).entries());
    const todosLosDatos = Object.assign({}, temp.datos, datosServExt);
    if (temp.clienteId) {
      await window.api.clienteActualizar(temp.clienteId, todosLosDatos);
      Object.assign(cliente, todosLosDatos);
    } else {
      const nuevo = await window.api.clienteAgregar(todosLosDatos);
      estado.clientes.unshift(nuevo);
    }
    estado.formularioClienteTemp = null;
    cerrarModalForm();
    renderTodo();
    notificar(temp.clienteId ? 'Cliente actualizado.' : 'Cliente creado.');
  });
}

function abrirFichaCliente(id) {
  const cliente = clientePorId(id);
  if (!cliente) return;

  const conversaciones = estado.conversaciones
    .filter((c) => c.clienteId === id)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const recordatorios = estado.recordatorios
    .filter((r) => r.clienteId === id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  $('modal-cliente-cuerpo').innerHTML = `
    <div class="ficha-cabecera">
      <div>
        <h2>${escapeHtml(cliente.nombre || 'Sin nombre')}</h2>
        <span class="etiqueta etiqueta-${cliente.etiqueta || 'activo'}">${ETIQUETAS[cliente.etiqueta] || 'Activo'}</span>
      </div>
      <div class="tarjeta-acciones">
        <button class="icono-boton" title="Editar" data-accion="editar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
        </button>
        <button class="icono-boton eliminar" title="Eliminar" data-accion="eliminar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
    <div class="ficha-contacto">
      <div class="dato-ficha"><div class="rotulo">C.C o Nit</div><div class="valor">${escapeHtml(cliente.cc_nit || '—')}</div></div>
      <div class="dato-ficha"><div class="rotulo">Teléfono</div><div class="valor">${escapeHtml(cliente.telefono || '—')}</div></div>
      <div class="dato-ficha"><div class="rotulo">Correo</div><div class="valor">${escapeHtml(cliente.email || '—')}</div></div>
      <div class="dato-ficha"><div class="rotulo">Municipio</div><div class="valor">${escapeHtml(cliente.municipio || '—')}</div></div>
      <div class="dato-ficha"><div class="rotulo">Tipo de vehículo</div><div class="valor">${VEHICULOS[cliente.tipo_vehiculo] || '—'}</div></div>
      <div class="dato-ficha"><div class="rotulo">Modelo</div><div class="valor">${escapeHtml(cliente.modelo || '—')}</div></div>
      <div class="dato-ficha"><div class="rotulo">Placa</div><div class="valor">${escapeHtml(cliente.placa || '—')}</div></div>
      <div class="dato-ficha"><div class="rotulo">Servicio</div><div class="valor">${SERVICIOS[cliente.servicio] || cliente.servicio || '—'}</div></div>
      <div class="dato-ficha"><div class="rotulo">Registrado</div><div class="valor">${formatearFecha(cliente.creado)}</div></div>
      <div class="dato-ficha"><div class="rotulo">Último contacto</div><div class="valor">${formatearFecha(cliente.ultimoContacto)}</div></div>
    </div>

    <div class="seccion-ficha">
      <h3>Notas</h3>
      <div class="campo">
        <textarea id="ficha-notas" style="min-height:90px">${escapeHtml(cliente.notas || '')}</textarea>
      </div>
      <div class="modal-acciones">
        <button class="btn-primario" data-accion="guardar-notas">Guardar notas</button>
      </div>
    </div>

    <div class="seccion-ficha">
      <h3>Servicios extendidos <button class="btn-primario" data-accion="editar-serv-ext">Editar</button></h3>
      <div class="ficha-contacto">
        <div class="dato-ficha"><div class="rotulo">SOAT</div><div class="valor">${formatearFecha(cliente.soat) || '—'}</div></div>
        <div class="dato-ficha"><div class="rotulo">Tecnomecánica</div><div class="valor">${formatearFecha(cliente.tecnico_mecanica) || '—'}</div></div>
        <div class="dato-ficha"><div class="rotulo">Extintor</div><div class="valor">${formatearFecha(cliente.extintor) || '—'}</div></div>
      </div>
    </div>

    <div class="seccion-ficha">
      <h3>Conversaciones <button class="btn-primario" data-accion="nueva-conv">Nueva conversación</button></h3>
      <div id="ficha-conversaciones">
        ${conversaciones.length ? conversaciones.map((c) => `
          <div class="tarjeta" style="margin-bottom:10px">
            <div class="tarjeta-principal">
              <div class="tarjeta-sub">${formatearFechaHora(c.fecha)} · <span class="tipo-etiqueta tipo-${c.tipo}">${TIPOS[c.tipo] || c.tipo}</span></div>
              <div class="tarjeta-titulo">${escapeHtml(c.tema || 'Sin tema')}</div>
              ${c.resumen ? `<div class="tarjeta-resumen">${escapeHtml(c.resumen)}</div>` : ''}
              ${c.valor ? `<div class="tarjeta-sub">Valor: ${escapeHtml(String(c.valor))} €</div>` : ''}
            </div>
            <div class="tarjeta-acciones">
              <button class="icono-boton" title="Editar" data-accion="editar-conv" data-id="${c.id}">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
              </button>
              <button class="icono-boton eliminar" title="Eliminar" data-accion="borrar-conv" data-id="${c.id}">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>`).join('') : '<div class="sin-datos">Sin conversaciones registradas.</div>'}
      </div>
    </div>

    <div class="seccion-ficha">
      <h3>Recordatorios <button class="btn-primario" data-accion="nuevo-recordatorio">Nuevo recordatorio</button></h3>
      <div id="ficha-recordatorios">
        ${recordatorios.length ? recordatorios.map((r) => `
          <div class="tarjeta recordatorio ${r.completado ? 'completado' : ''}" style="margin-bottom:10px">
            <button class="check ${r.completado ? 'hecho' : ''}" title="Marcar" data-accion="completar-rec" data-id="${r.id}">✓</button>
            <div class="tarjeta-principal">
              <div class="tarjeta-titulo">${escapeHtml(r.titulo)}</div>
              <div class="fecha-tarjeta ${r.completado ? '' : estadoFechaRecordatorio(r.fecha)}">${formatearFecha(r.fecha)}</div>
              ${r.nota ? `<div class="tarjeta-resumen">${escapeHtml(r.nota)}</div>` : ''}
            </div>
          </div>`).join('') : '<div class="sin-datos">Sin recordatorios.</div>'}
      </div>
    </div>`;

  const cuerpo = $('modal-cliente-cuerpo');
  $('modal-cliente').hidden = false;

  cuerpo.querySelectorAll('[data-accion]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      const accion = btn.dataset.accion;
      const datoId = btn.dataset.id;
      if (accion === 'editar') {
        cerrarModalCliente();
        abrirFormularioCliente(id);
      } else if (accion === 'eliminar') {
        await eliminarCliente(id);
      } else if (accion === 'guardar-notas') {
        const notas = $('ficha-notas').value;
        await window.api.clienteActualizar(id, { notas });
        cliente.notas = notas;
        notificar('Notas guardadas.');
      } else if (accion === 'editar-serv-ext') {
        cerrarModalCliente();
        estado.formularioClienteTemp = { datos: {}, clienteId: id };
        abrirServiciosExtendidos();
      } else if (accion === 'nueva-conv') {
        cerrarModalCliente();
        abrirFormularioConversacion(id);
      } else if (accion === 'nueva-conversacion') {
        cerrarModalCliente();
        abrirFormularioConversacion(id);
      } else if (accion === 'editar-conv') {
        cerrarModalCliente();
        abrirFormularioConversacion(id, datoId);
      } else if (accion === 'borrar-conv') {
        await eliminarConversacion(datoId);
        abrirFichaCliente(id);
      } else if (accion === 'nuevo-recordatorio') {
        cerrarModalCliente();
        abrirFormularioRecordatorio(id);
      } else if (accion === 'completar-rec') {
        const rec = estado.recordatorios.find((r) => r.id === datoId);
        if (rec) {
          const completado = !rec.completado;
          await window.api.recordatorioActualizar(datoId, { completado });
          rec.completado = completado;
          abrirFichaCliente(id);
          renderTodo();
        }
      }
    });
  });
}

async function eliminarCliente(id) {
  const cliente = clientePorId(id);
  const nombre = cliente ? cliente.nombre : '';
  if (!confirm(`¿Eliminar al cliente "${nombre}"?\nTambién se eliminarán sus conversaciones y recordatorios.`)) return;
  await window.api.clienteEliminar(id);
  estado.clientes = estado.clientes.filter((c) => c.id !== id);
  estado.conversaciones = estado.conversaciones.filter((c) => c.clienteId !== id);
  estado.recordatorios = estado.recordatorios.filter((r) => r.clienteId !== id);
  cerrarModalCliente();
  renderTodo();
  notificar('Cliente eliminado.');
}

/* ================= CONVERSACIONES ================= */

function conversacionesFiltradas() {
  return estado.conversaciones
    .filter((c) => !estado.filtroClienteConv || c.clienteId === estado.filtroClienteConv)
    .filter((c) => !estado.filtroTipoConv || c.tipo === estado.filtroTipoConv)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

function renderConversaciones() {
  const opcionesCliente = estado.filtroClienteConv;
  const select = $('filtro-cliente-conv');
  select.innerHTML = '<option value="">Todos los clientes</option>' +
    estado.clientes.map((c) =>
      `<option value="${c.id}" ${c.id === opcionesCliente ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`
    ).join('');

  const lista = conversacionesFiltradas();
  $('vacio-conversaciones').hidden = lista.length > 0;

  $('lista-conversaciones').innerHTML = lista.map((c) => {
    const cliente = clientePorId(c.clienteId);
    return `
      <div class="tarjeta">
        <div class="tarjeta-principal">
          <div class="tarjeta-titulo">
            <span>${escapeHtml(c.tema || 'Sin tema')}</span>
            <span class="tipo-etiqueta tipo-${c.tipo}">${TIPOS[c.tipo] || c.tipo}</span>
            ${c.seguimiento ? '<span class="etiqueta etiqueta-potencial">Seguimiento</span>' : ''}
          </div>
          <div class="tarjeta-sub">
            <strong>${escapeHtml(cliente ? cliente.nombre : 'Cliente eliminado')}</strong> · ${formatearFechaHora(c.fecha)}
          </div>
          ${c.resumen ? `<div class="tarjeta-resumen">${escapeHtml(c.resumen)}</div>` : ''}
          ${c.valor ? `<div class="tarjeta-sub">Valor: ${escapeHtml(String(c.valor))} €</div>` : ''}
        </div>
        <div class="tarjeta-acciones">
          <button class="icono-boton" title="Editar" data-id="${c.id}" data-accion="editar">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </button>
          <button class="icono-boton eliminar" title="Eliminar" data-id="${c.id}" data-accion="eliminar">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  $('lista-conversaciones').querySelectorAll('.icono-boton').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (btn.dataset.accion === 'editar') {
        abrirFormularioConversacion(null, btn.dataset.id);
      } else {
        await eliminarConversacion(btn.dataset.id);
      }
    });
  });
}

function abrirFormularioConversacion(clienteIdPrefill, id) {
  const conversacion = id ? estado.conversaciones.find((c) => c.id === id) : null;
  const opciones = estado.clientes.map((c) =>
    `<option value="${c.id}" ${(conversacion ? conversacion.clienteId : clienteIdPrefill) === c.id ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`
  ).join('');

  $('modal-form-cuerpo').innerHTML = `
    <h2>${conversacion ? 'Editar conversación' : 'Nueva conversación'}</h2>
    <form id="form-conversacion">
      <div class="campo">
        <label>Cliente *</label>
        <select name="clienteId" required>
          ${opciones || '<option value="">—</option>'}
        </select>
      </div>
      <div class="dos-columnas">
        <div class="campo">
          <label>Fecha y hora</label>
          <input name="fecha" type="datetime-local" value="${conversacion ? fechaInputValor(conversacion.fecha) : fechaInputValor(new Date().toISOString())}">
        </div>
        <div class="campo">
          <label>Tipo</label>
          <select name="tipo">
            ${Object.entries(TIPOS).map(([k, v]) =>
              `<option value="${k}" ${conversacion && conversacion.tipo === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="campo">
        <label>Tema</label>
        <input name="tema" value="${escapeHtml(conversacion ? conversacion.tema : '')}">
      </div>
      <div class="campo">
        <label>Resumen</label>
        <textarea name="resumen">${escapeHtml(conversacion ? conversacion.resumen : '')}</textarea>
      </div>
      <div class="dos-columnas">
        <div class="campo">
          <label>Valor (€)</label>
          <input name="valor" type="number" step="0.01" min="0" value="${conversacion ? conversacion.valor : ''}">
        </div>
        <div class="campo">
          <label>Requiere seguimiento</label>
          <label class="aviso-seguro">
            <input name="seguimiento" type="checkbox" ${conversacion && conversacion.seguimiento ? 'checked' : ''}>
            Marcar como pendiente de seguimiento
          </label>
        </div>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn-cancelar" data-cerrar>Cancelar</button>
        <button type="submit" class="btn-primario">${conversacion ? 'Guardar cambios' : 'Registrar conversación'}</button>
      </div>
    </form>`;
  $('modal-form').hidden = false;

  $('form-conversacion').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!estado.clientes.length) {
      notificar('Primero crea un cliente.');
      return;
    }
    const datosForm = new FormData(e.target);
    const datos = {
      clienteId: datosForm.get('clienteId'),
      fecha: new Date(datosForm.get('fecha')).toISOString(),
      tipo: datosForm.get('tipo'),
      tema: datosForm.get('tema'),
      resumen: datosForm.get('resumen'),
      valor: parseFloat(datosForm.get('valor')) || 0,
      seguimiento: datosForm.get('seguimiento') === 'on'
    };
    if (conversacion) {
      await window.api.conversacionActualizar(conversacion.id, datos);
      Object.assign(conversacion, datos);
    } else {
      const nueva = await window.api.conversacionAgregar(datos);
      estado.conversaciones.unshift(nueva);
      const cliente = clientePorId(nueva.clienteId);
      if (cliente) cliente.ultimoContacto = nueva.fecha;
    }
    cerrarModalForm();
    renderTodo();
    notificar(conversacion ? 'Conversación actualizada.' : 'Conversación registrada.');
  });
}

function fechaInputValor(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

async function eliminarConversacion(id) {
  if (!confirm('¿Eliminar esta conversación?')) return;
  await window.api.conversacionEliminar(id);
  estado.conversaciones = estado.conversaciones.filter((c) => c.id !== id);
  renderTodo();
  notificar('Conversación eliminada.');
}

/* ================= RECORDATORIOS ================= */

function recordatoriosFiltrados() {
  return estado.recordatorios
    .filter((r) => {
      if (estado.filtroRecordatorios === 'pendientes') return !r.completado;
      if (estado.filtroRecordatorios === 'completados') return r.completado;
      return true;
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function renderRecordatorios() {
  const lista = recordatoriosFiltrados();
  $('vacio-recordatorios').hidden = lista.length > 0;
  $('lista-recordatorios').innerHTML = lista.map((r) => {
    const cliente = r.clienteId ? clientePorId(r.clienteId) : null;
    const claseFecha = r.completado ? '' : estadoFechaRecordatorio(r.fecha);
    return `
      <div class="tarjeta recordatorio ${r.completado ? 'completado' : ''}">
        <button class="check ${r.completado ? 'hecho' : ''}" title="${r.completado ? 'Desmarcar' : 'Marcar como completado'}" data-id="${r.id}">✓</button>
        <div class="tarjeta-principal">
          <div class="tarjeta-titulo">
            <span>${escapeHtml(r.titulo)}</span>
            ${cliente ? `<span class="tipo-etiqueta tipo-llamada">${escapeHtml(cliente.nombre)}</span>` : ''}
          </div>
          <div class="fecha-tarjeta ${claseFecha}">
            ${formatearFecha(r.fecha)}
            ${r.fecha < fechaHoyLocal() && !r.completado ? ' · <strong>Retrasado</strong>' : ''}
            ${r.fecha === fechaHoyLocal() && !r.completado ? ' · <strong>Hoy</strong>' : ''}
          </div>
          ${r.nota ? `<div class="tarjeta-resumen">${escapeHtml(r.nota)}</div>` : ''}
        </div>
        <div class="tarjeta-acciones">
          <button class="icono-boton" title="Editar" data-id="${r.id}" data-accion="editar">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </button>
          <button class="icono-boton eliminar" title="Eliminar" data-id="${r.id}" data-accion="eliminar">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  $('lista-recordatorios').querySelectorAll('[data-id]').forEach((el) => {
    el.addEventListener('click', async () => {
      const id = el.dataset.id;
      if (el.classList.contains('check')) {
        const rec = estado.recordatorios.find((r) => r.id === id);
        const completado = !rec.completado;
        await window.api.recordatorioActualizar(id, { completado });
        rec.completado = completado;
      } else if (el.dataset.accion === 'editar') {
        abrirFormularioRecordatorio(null, id);
      } else {
        if (!confirm('¿Eliminar este recordatorio?')) return;
        await window.api.recordatorioEliminar(id);
        estado.recordatorios = estado.recordatorios.filter((r) => r.id !== id);
        notificar('Recordatorio eliminado.');
      }
      renderTodo();
    });
  });
}

function abrirFormularioRecordatorio(clienteIdPrefill, id) {
  const recordatorio = id ? estado.recordatorios.find((r) => r.id === id) : null;
  const opciones = '<option value="">Sin cliente (general)</option>' +
    estado.clientes.map((c) =>
      `<option value="${c.id}" ${(recordatorio ? recordatorio.clienteId : clienteIdPrefill) === c.id ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`
    ).join('');

  $('modal-form-cuerpo').innerHTML = `
    <h2>${recordatorio ? 'Editar recordatorio' : 'Nuevo recordatorio'}</h2>
    <form id="form-recordatorio">
      <div class="campo">
        <label>Título *</label>
        <input name="titulo" required value="${escapeHtml(recordatorio ? recordatorio.titulo : '')}">
      </div>
      <div class="dos-columnas">
        <div class="campo">
          <label>Fecha</label>
          <input name="fecha" type="date" required value="${recordatorio ? recordatorio.fecha : fechaHoyLocal()}">
        </div>
        <div class="campo">
          <label>Cliente</label>
          <select name="clienteId">${opciones}</select>
        </div>
      </div>
      <div class="campo">
        <label>Nota</label>
        <textarea name="nota">${escapeHtml(recordatorio ? recordatorio.nota : '')}</textarea>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn-cancelar" data-cerrar>Cancelar</button>
        <button type="submit" class="btn-primario">${recordatorio ? 'Guardar cambios' : 'Crear recordatorio'}</button>
      </div>
    </form>`;
  $('modal-form').hidden = false;

  $('form-recordatorio').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datosForm = new FormData(e.target);
    const datos = {
      titulo: datosForm.get('titulo'),
      fecha: datosForm.get('fecha'),
      clienteId: datosForm.get('clienteId') || null,
      nota: datosForm.get('nota')
    };
    if (recordatorio) {
      await window.api.recordatorioActualizar(recordatorio.id, datos);
      Object.assign(recordatorio, datos);
    } else {
      const nuevo = await window.api.recordatorioAgregar(datos);
      estado.recordatorios.unshift(nuevo);
    }
    cerrarModalForm();
    renderTodo();
    notificar(recordatorio ? 'Recordatorio actualizado.' : 'Recordatorio creado.');
  });
}

/* ================= MODALES ================= */

function cerrarModalForm() {
  $('modal-form').hidden = true;
}

function cerrarModalCliente() {
  $('modal-cliente').hidden = true;
}

function cerrarModalAlerta() {
  $('modal-alerta').hidden = true;
}

function cerrarModalExportar() {
  $('modal-exportar').hidden = true;
}

function abrirModalExportar() {
  $('modal-exportar-cuerpo').innerHTML = `
    <h2>Exportar copia de seguridad</h2>
    <p class="subtitulo" style="margin-top:-10px;margin-bottom:18px">Selecciona el rango de fechas para exportar</p>
    <form id="form-exportar">
      <div class="dos-columnas">
        <div class="campo">
          <label>Fecha inicio</label>
          <input name="fecha_inicio" type="date">
        </div>
        <div class="campo">
          <label>Fecha fin</label>
          <input name="fecha_fin" type="date">
        </div>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn-cancelar" data-cerrar>Cancelar</button>
        <button type="button" class="btn-secundario" id="btn-exportar-todo">Exportar todo</button>
        <button type="submit" class="btn-primario">Exportar rango</button>
      </div>
    </form>`;
  $('modal-exportar').hidden = false;

  $('form-exportar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target).entries());
    const inicio = datos.fecha_inicio || null;
    const fin = datos.fecha_fin || null;
    cerrarModalExportar();
    const ok = await window.api.exportar(inicio, fin);
    if (ok) notificar('Copia de seguridad exportada.');
  });

  $('btn-exportar-todo').addEventListener('click', async () => {
    cerrarModalExportar();
    const ok = await window.api.exportar(null, null);
    if (ok) notificar('Copia de seguridad exportada.');
  });
}

function prepararCierreModales() {
  [$('modal-form'), $('modal-cliente'), $('modal-alerta'), $('modal-exportar')].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.hidden = true;
    });
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cerrar]');
    if (!btn) return;
    if (btn.closest('#modal-form')) cerrarModalForm();
    if (btn.closest('#modal-cliente')) cerrarModalCliente();
    if (btn.closest('#modal-alerta')) cerrarModalAlerta();
    if (btn.closest('#modal-exportar')) cerrarModalExportar();
  });
}

prepararCierreModales();
iniciar();
