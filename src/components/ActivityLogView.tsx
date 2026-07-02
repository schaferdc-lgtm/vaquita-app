import React, { useState } from 'react';
import { UserAction } from '../types';
import { 
  Search, 
  Clock, 
  Filter, 
  ShieldAlert, 
  FileText, 
  Info,
  Trash2,
  RefreshCw,
  PlusCircle,
  CheckCircle,
  XCircle,
  Lock,
  UserCheck
} from 'lucide-react';

interface ActivityLogViewProps {
  actions: UserAction[];
  onClearAllLogs?: () => void;
}

export default function ActivityLogView({ actions, onClearAllLogs }: ActivityLogViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Format action type badges
  const getActionBadge = (type: string) => {
    switch (type) {
      case 'INICIO_SESION':
      case 'CAMBIO_USUARIO':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <UserCheck className="w-3 h-3 text-slate-500" />
            <span>SESIÓN</span>
          </span>
        );
      case 'CREACION_PROYECTO':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <PlusCircle className="w-3 h-3 text-blue-500" />
            <span>PROYECTO</span>
          </span>
        );
      case 'RESERVA_APORTE':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <Info className="w-3 h-3 text-amber-500 animate-pulse" />
            <span>APORTE NUEVO</span>
          </span>
        );
      case 'CARGA_COMPROBANTE':
        return (
          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <FileText className="w-3 h-3 text-purple-500" />
            <span>COMPROBANTE</span>
          </span>
        );
      case 'APROBACION_APORTE':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            <span>APROBACIÓN</span>
          </span>
        );
      case 'RECHAZO_APORTE':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3 text-rose-500" />
            <span>RECHAZO</span>
          </span>
        );
      case 'CREACION_REQUERIMIENTO':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <PlusCircle className="w-3 h-3 text-indigo-500" />
            <span>REQUERIMIENTO</span>
          </span>
        );
      case 'ELIMINACION_REQUERIMIENTO':
        return (
          <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <Trash2 className="w-3 h-3 text-slate-400" />
            <span>BORRADO_REQUERIMIENTO</span>
          </span>
        );
      case 'ELIMINACION_PROYECTO':
        return (
          <span className="bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <Trash2 className="w-3 h-3 text-red-500" />
            <span>BORRADO_PROYECTO</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold px-2 py-0.5 rounded-full w-fit">
            {type}
          </span>
        );
    }
  };

  // Filter actions
  const filteredActions = actions.slice().reverse().filter((act) => {
    const matchesSearch = 
      act.user_email.toLowerCase().includes(search.toLowerCase()) ||
      act.details.toLowerCase().includes(search.toLowerCase());
    
    if (filterType === 'ALL') return matchesSearch;
    return matchesSearch && act.action_type === filterType;
  });

  // Action type options for dropdown
  const actionTypes = Array.from(new Set(actions.map(a => a.action_type)));

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-4">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-50">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            Registro de Auditoría y Acciones
          </h3>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Seguimiento de actividad en tiempo real de todos los usuarios de la plataforma.
          </p>
        </div>
        {onClearAllLogs && actions.length > 0 && (
          <button
            onClick={() => {
              if (confirm('¿Está seguro de que desea limpiar todos los registros locales de auditoría?')) {
                onClearAllLogs();
              }
            }}
            className="text-[10px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition cursor-pointer font-bold flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>Limpiar Logs</span>
          </button>
        )}
      </div>

      {/* Constraints Banner */}
      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-[10.5px] text-slate-600 flex items-start gap-2.5 leading-relaxed">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-blue-900 block">Regla de Persistencia y Límites:</span>
          Se conserva un historial de hasta un máximo de <strong className="text-blue-900">500 acciones</strong> por usuario (excepto el Administrador <strong>Daniel Schafer</strong> que posee historial de auditoría completo y persistente sin límites).
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por usuario, proyecto o detalles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 bg-slate-50/50 font-medium"
          />
        </div>
        <div className="sm:w-56 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full text-xs font-semibold bg-transparent focus:outline-hidden text-slate-600 cursor-pointer"
          >
            <option value="ALL">Todos los eventos</option>
            <option value="INICIO_SESION">Inicios de Sesión</option>
            <option value="CREACION_PROYECTO">Nuevos Proyectos</option>
            <option value="RESERVA_APORTE">Aportes / Reservas</option>
            <option value="CARGA_COMPROBANTE">Comprobantes Cargados</option>
            <option value="APROBACION_APORTE">Aprobaciones (OK)</option>
            <option value="RECHAZO_APORTE">Aportes Rechazados</option>
            <option value="CREACION_REQUERIMIENTO">Requerimientos Creados</option>
            <option value="ELIMINACION_REQUERIMIENTO">Requerimientos Borrados</option>
            <option value="ELIMINACION_PROYECTO">Proyectos Borrados</option>
          </select>
        </div>
      </div>

      {/* Log list/table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[380px] overflow-y-auto">
        {filteredActions.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/50 text-slate-400 text-xs font-medium">
            No se registraron acciones con los filtros indicados.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                <th className="py-2 px-3">Usuario / Email</th>
                <th className="py-2 px-3">Acción</th>
                <th className="py-2 px-3">Detalle</th>
                <th className="py-2 px-3 text-right">Fecha/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredActions.map((act) => {
                const isAdminEmail = act.user_email.toLowerCase() === 'schaferdc@gmail.com';
                return (
                  <tr key={act.id} className="hover:bg-slate-50/30 transition">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">{act.user_email}</span>
                        {isAdminEmail && (
                          <span className="bg-red-50 text-red-600 text-[8px] font-black px-1 rounded border border-red-200 flex items-center gap-0.5">
                            <Lock className="w-2 h-2" />
                            ADMIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {getActionBadge(act.action_type)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 leading-normal font-medium min-w-[200px]">
                      {act.details}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[10px] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span>
                          {new Date(act.created_at).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
        <span>Mostrando {filteredActions.length} de {actions.length} logs de auditoría totales</span>
        <span>Persistencia Activa</span>
      </div>
    </div>
  );
}
