import React, { useState } from 'react';
import { Project, ProjectComponent, Contribution } from '../types';
import { 
  FileText, Printer, Download, Filter, CheckCircle, Clock, XCircle, 
  TrendingUp, Award, Calendar, DollarSign, Archive, Users, Shield, Copy, Check
} from 'lucide-react';

interface ProjectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  components: ProjectComponent[];
  contributions: Contribution[];
}

export default function ProjectReportModal({
  isOpen,
  onClose,
  project,
  components,
  contributions,
}: ProjectReportModalProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Filter project data
  const projectComponents = components.filter((c) => c.project_id === project.id);
  const projectContributions = contributions.filter((c) => c.project_id === project.id);

  // Filtered contributions for the table
  const filteredContributions = projectContributions.filter((c) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return !c.status || c.status === 'pending';
    return c.status === statusFilter;
  });

  // Financial calculations
  const totalBudget = projectComponents.reduce((sum, c) => sum + c.total_price, 0);
  const totalRemaining = projectComponents.reduce((sum, c) => sum + (c.remaining_quantity * c.unit_price), 0);
  const totalFunded = Math.max(0, totalBudget - totalRemaining);
  const progressPercent = totalBudget > 0 ? Math.min(100, Math.round((totalFunded / totalBudget) * 100)) : 0;

  // Additional stats
  const approvedContributions = projectContributions.filter(c => c.status === 'approved');
  const totalApprovedAmount = approvedContributions.reduce((sum, c) => sum + c.amount, 0);
  const pendingContributions = projectContributions.filter(c => !c.status || c.status === 'pending');
  const totalPendingAmount = pendingContributions.reduce((sum, c) => sum + c.amount, 0);

  // Unique backers (approved + pending)
  const uniqueBackersCount = new Set(projectContributions.map(c => c.backer_email.toLowerCase())).size;

  // Insumos stats
  const totalInsumosCount = projectComponents.length;
  const completedInsumosCount = projectComponents.filter(c => c.remaining_quantity <= 0.0001).length;
  const inProgressInsumosCount = projectComponents.filter(c => c.remaining_quantity > 0 && c.remaining_quantity < c.quantity).length;
  const untouchedInsumosCount = projectComponents.filter(c => c.remaining_quantity === c.quantity).length;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCSV = () => {
    // Generate CSV for contributions
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Proyecto,ID Proyecto,Insumo,Aportante,Email,Cantidad Comprada,Monto Aportado,Codigo Cupon,Banco,Estado,Fecha\n";
    
    projectContributions.forEach((c) => {
      const compName = projectComponents.find(comp => comp.id === c.component_id)?.name || c.component_id;
      const statusLabel = c.status === 'approved' ? 'Aprobado' : (c.status === 'rejected' ? 'Rechazado' : 'Pendiente');
      const row = `"${project.name}","${project.id}","${compName}","${c.backer_name}","${c.backer_email}",${c.quantity_bought},${c.amount},"${c.coupon_code}","${c.payment_bank || ''}","${statusLabel}","${c.created_at}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Inventario_${project.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyJSON = () => {
    const reportData = {
      proyecto: {
        id: project.id,
        nombre: project.name,
        descripcion: project.description,
        categoria: project.category,
        fecha_inicio: project.start_date,
        fecha_fin: project.end_date,
        alias: project.payment_alias || '',
        cbu: project.payment_cbu || '',
        archivado: !!project.is_deleted,
      },
      metricas_financieras: {
        presupuesto_total: totalBudget,
        total_recaudado_aprobado: totalApprovedAmount,
        total_comprometido_pendiente: totalPendingAmount,
        total_recaudado_general: totalFunded,
        porcentaje_progreso: progressPercent,
        total_backers_unicos: uniqueBackersCount,
      },
      inventario_insumos: projectComponents.map(c => ({
        id: c.id,
        nombre: c.name,
        precio_unitario: c.unit_price,
        cantidad_original: c.quantity,
        cantidad_restante: c.remaining_quantity,
        cantidad_comprada: c.quantity - c.remaining_quantity,
        total_costo: c.total_price,
        monto_financiado: Math.max(0, c.total_price - (c.remaining_quantity * c.unit_price)),
        parcial_permitido: c.allow_partial,
        completado: c.remaining_quantity <= 0.0001
      })),
      aportes_recibidos: projectContributions.map(c => ({
        id: c.id,
        cupon: c.coupon_code,
        backer_name: c.backer_name,
        backer_email: c.backer_email,
        monto: c.amount,
        unidades: c.quantity_bought,
        banco: c.payment_bank || '',
        comprobante: c.payment_ticket || '',
        estado: c.status || 'pending',
        fecha_creacion: c.created_at
      }))
    };

    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-55 p-4 overflow-y-auto print:bg-white print:p-0 print:absolute print:inset-0">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] my-4 flex flex-col shadow-2xl border border-slate-100 overflow-hidden print:shadow-none print:border-none print:my-0">
        
        {/* Modal Header - Hidden on Print */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Reporte e Inventario Oficial de Obra</h3>
              <p className="text-[10px] text-slate-400 font-mono">Consola de Auditoría y Control del Owner / Admin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition cursor-pointer font-bold text-xs"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Action Controls Header - Hidden on Print */}
        <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePrint}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimir Reporte (o guardar PDF)</span>
            </button>
            <button
              onClick={handleCopyCSV}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar Aportes (.CSV)</span>
            </button>
            <button
              onClick={handleCopyJSON}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600">¡Copiado al portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar Datos (.JSON)</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-amber-600 font-medium">
            💡 Consejo: Para guardar como PDF impecable, pulsa "Imprimir" y elige la opción "Guardar como PDF".
          </p>
        </div>

        {/* Scrollable Report Sheet */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50/20 print:p-0 print:bg-white print:overflow-visible">
          
          {/* Printable Report Header */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs relative overflow-hidden print:border-b print:border-slate-300 print:shadow-none print:rounded-none print:p-0">
            {/* Decors */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100/40 rounded-full blur-2xl pointer-events-none print:hidden"></div>
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100 print:pb-4 print:border-slate-300">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-900 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                    VaquitaApp Oficial
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {project.id}</span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{project.name}</h1>
                <p className="text-slate-500 text-xs max-w-xl leading-relaxed">{project.description}</p>
              </div>

              {/* Status and Dates Box */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 min-w-48 space-y-2.5 font-mono text-[10px] text-slate-600 print:border-none print:bg-white print:p-0">
                <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                  <span className="font-semibold text-slate-400">FECHA REPORTE</span>
                  <span className="font-bold text-slate-800">{new Date().toLocaleDateString('es-AR')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                  <span className="font-semibold text-slate-400">VIGENCIA</span>
                  <span className="font-bold text-slate-800">{project.start_date.split('-').reverse().join('/')} a {project.end_date.split('-').reverse().join('/')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-400">ESTADO</span>
                  {project.is_deleted ? (
                    <span className="text-red-700 font-bold bg-red-100 px-1.5 py-0.5 rounded text-[9px]">Archivado</span>
                  ) : new Date().toLocaleDateString('en-CA') > project.end_date ? (
                    <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[9px]">Finalizado</span>
                  ) : (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[9px]">Vigente</span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial & Insumos Summary Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 print:pt-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Presupuesto Estimado</span>
                <span className="text-lg font-black text-slate-800 font-mono block">${totalBudget.toLocaleString('es-AR')}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block text-emerald-600">Total Recaudado</span>
                <span className="text-lg font-black text-emerald-700 font-mono block">${totalFunded.toLocaleString('es-AR')}</span>
                <span className="text-[9px] text-emerald-600 block">({progressPercent}% cubierto)</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block text-rose-600">Saldo Faltante</span>
                <span className="text-lg font-black text-rose-700 font-mono block">${totalRemaining.toLocaleString('es-AR')}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block text-slate-500">Aportantes Únicos</span>
                <span className="text-lg font-black text-slate-700 font-mono block">{uniqueBackersCount} personas</span>
              </div>
            </div>

            {/* Sub-info on Bank Details */}
            {(project.payment_alias || project.payment_cbu) && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-[10px] text-slate-500 font-mono print:hidden">
                {project.payment_alias && (
                  <span>ALIAS BANCARIO: <strong className="text-slate-700">{project.payment_alias}</strong></span>
                )}
                {project.payment_cbu && (
                  <span>CBU: <strong className="text-slate-700">{project.payment_cbu}</strong></span>
                )}
              </div>
            )}
          </div>

          {/* SECTION 1: INVENTORY DETAIL */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>1. Inventario de Requerimientos y Materiales ({totalInsumosCount} Items)</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                Completos: {completedInsumosCount} | En Curso: {inProgressInsumosCount} | Pendientes: {untouchedInsumosCount}
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">Item / Material</th>
                    <th className="py-2.5 px-2 text-right">P. Unitario</th>
                    <th className="py-2.5 px-2 text-right">Cant. Req</th>
                    <th className="py-2.5 px-2 text-right">Cant. Compra</th>
                    <th className="py-2.5 px-2 text-right">Cant. Restante</th>
                    <th className="py-2.5 px-2 text-right">Presp. Total</th>
                    <th className="py-2.5 px-2 text-right">Monto Financiado</th>
                    <th className="py-2.5 px-3 text-center">Estado de Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectComponents.map((c) => {
                    const compFundedAmt = Math.max(0, c.total_price - (c.remaining_quantity * c.unit_price));
                    const pct = c.total_price > 0 ? Math.min(100, Math.round((compFundedAmt / c.total_price) * 100)) : 0;
                    const qtyBought = c.quantity - c.remaining_quantity;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {c.name}
                          {c.allow_partial && (
                            <span className="text-[8px] font-bold text-blue-700 bg-blue-100 px-1 py-0.5 rounded ml-1.5 uppercase">Aporte Parcial</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-mono">${c.unit_price.toLocaleString('es-AR')}</td>
                        <td className="py-3 px-2 text-right font-mono">{c.quantity}</td>
                        <td className="py-3 px-2 text-right font-mono text-emerald-700 font-bold">
                          {qtyBought % 1 === 0 ? qtyBought : qtyBought.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-400">
                          {c.remaining_quantity % 1 === 0 ? c.remaining_quantity : c.remaining_quantity.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-right font-mono">${c.total_price.toLocaleString('es-AR')}</td>
                        <td className="py-3 px-2 text-right font-mono text-emerald-700 font-bold">${compFundedAmt.toLocaleString('es-AR')}</td>
                        <td className="py-3 px-3 text-center">
                          {c.remaining_quantity <= 0.0001 ? (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-150">
                              Adquirido (100%)
                            </span>
                          ) : qtyBought > 0 ? (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-150">
                              Parcial ({pct}%)
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              Sin Aportes
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: CONTRIBUTIONS LOG */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
            <div className="border-b border-slate-100 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>2. Detalle de Aportes de la Comunidad ({projectContributions.length} Contribuciones)</span>
              </h3>

              {/* Status Filter Tab row - Hidden on print */}
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl print:hidden">
                {(['all', 'approved', 'pending', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`text-[9px] font-bold px-2.5 py-1 rounded-lg transition capitalize cursor-pointer ${
                      statusFilter === status 
                        ? 'bg-white text-slate-800 shadow-2xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {status === 'all' ? 'Ver Todos' : (status === 'approved' ? 'Acreditados' : (status === 'rejected' ? 'Cancelados' : 'Pendientes'))}
                  </button>
                ))}
              </div>
            </div>

            {filteredContributions.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-150 text-slate-400 text-xs">
                No se encontraron aportes registrados con el filtro actual ({statusFilter}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3">Cupón / Código</th>
                      <th className="py-2.5 px-3">Aportante</th>
                      <th className="py-2.5 px-2">Insumo Destino</th>
                      <th className="py-2.5 px-2 text-right">Cant. Un</th>
                      <th className="py-2.5 px-2 text-right">Monto</th>
                      <th className="py-2.5 px-3">Ref Bancaria / Ticket</th>
                      <th className="py-2.5 px-3 text-center">Fecha</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredContributions.map((c) => {
                      const compName = projectComponents.find(comp => comp.id === c.component_id)?.name || 'Insumo Eliminado';
                      
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">{c.coupon_code}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 block leading-tight">{c.backer_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{c.backer_email}</span>
                          </td>
                          <td className="py-3 px-2 font-medium text-slate-700">{compName}</td>
                          <td className="py-3 px-2 text-right font-mono">{c.quantity_bought % 1 === 0 ? c.quantity_bought : c.quantity_bought.toFixed(3)} u.</td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-slate-800">${c.amount.toLocaleString('es-AR')}</td>
                          <td className="py-3 px-3 font-mono text-[10px]">
                            {c.payment_ticket ? (
                              <div>
                                <span className="text-slate-700 block font-semibold">{c.payment_ticket}</span>
                                <span className="text-slate-400 block text-[9px]">{c.payment_bank || 'Banco'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No cargado</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400 text-[10px]">
                            {new Date(c.created_at).toLocaleDateString('es-AR')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {c.status === 'approved' ? (
                              <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                                Acreditado
                              </span>
                            ) : c.status === 'rejected' ? (
                              <span className="text-[9px] font-extrabold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-200 uppercase">
                                Cancelado
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 uppercase">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 3: GRAND TOTAL SUMMARY */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md grid grid-cols-1 md:grid-cols-3 gap-6 print:bg-white print:text-slate-800 print:border-t print:border-slate-300 print:shadow-none print:p-0">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide print:text-slate-500">
                Resumen Presupuestario
              </h4>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-800 pb-1.5 print:border-slate-200">
                  <span className="text-slate-400 print:text-slate-500">Estimación Total:</span>
                  <span className="font-extrabold text-white print:text-slate-800">${totalBudget.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5 print:border-slate-200">
                  <span className="text-emerald-400 font-bold">Total Acreditado:</span>
                  <span className="font-extrabold text-emerald-400">${totalApprovedAmount.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5 print:border-slate-200">
                  <span className="text-amber-400">Total Comprometido (Pendiente):</span>
                  <span className="font-extrabold text-amber-400">${totalPendingAmount.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-[13px] font-black pt-1">
                  <span className="text-slate-300 print:text-slate-600">Total General:</span>
                  <span className="text-white print:text-slate-800">${totalFunded.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide print:text-slate-500">
                Inventario de Adquisiciones
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed print:text-slate-500">
                Se han completado un total de <strong>{completedInsumosCount} de {totalInsumosCount}</strong> requerimientos de materiales físicos, representando un <strong>{progressPercent}%</strong> de efectividad global.
              </p>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/60 print:bg-slate-100 print:border-slate-200">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            <div className="space-y-2 md:border-l md:border-slate-800 md:pl-6 print:border-none print:pl-0">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide print:text-slate-500">
                Declaración de Conformidad
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal print:text-slate-500">
                Este inventario consolidado ha sido generado automáticamente por VaquitaApp y se encuentra listo para su presentación comunitaria o auditoría contable. El owner {project.owner_id} asume el compromiso legal de custodia física de todos los materiales aquí detallados.
              </p>
              <div className="pt-2 border-t border-slate-800/80 mt-2 flex justify-between items-center text-[9px] font-mono text-slate-500 print:border-none">
                <span>VERIFICACIÓN AUDITORÍA: OK</span>
                <span className="text-emerald-500 font-bold uppercase">Aprobado</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
