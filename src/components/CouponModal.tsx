import React, { useRef } from 'react';
import { Contribution, Project } from '../types';
import { Ticket, Copy, Check, Printer, Building2, User, Wallet, ClipboardCheck, Calendar } from 'lucide-react';

interface CouponModalProps {
  contribution: Contribution | null;
  projects?: Project[];
  onClose: () => void;
}

export default function CouponModal({ contribution, projects, onClose }: CouponModalProps) {
  const [copied, setCopied] = React.useState(false);
  const couponRef = useRef<HTMLDivElement>(null);

  if (!contribution) return null;

  const project = projects?.find(p => p.id === contribution.project_id);
  const aliasToDisplay = project?.payment_alias || contribution.company_alias;

  const handleCopy = () => {
    const text = `
--------------------------------------------------
  CUPÓN DE PAGO - APORTE COLABORATIVO
--------------------------------------------------
Proyecto: ${contribution.project_id}
Aportante: ${contribution.backer_name} (${contribution.backer_email})
Código del Cupón: ${contribution.coupon_code}
Alias de la Empresa: ${aliasToDisplay}
Monto a Pagar: $${contribution.amount.toLocaleString('es-AR')}
Cantidad Aportada: ${contribution.quantity_bought}
Fecha: ${new Date(contribution.created_at).toLocaleString('es-AR')}
--------------------------------------------------
    `;
    navigator.clipboard.writeText(text.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printContent = couponRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;
    if (printContent) {
      const win = window.open('', '', 'height=500,width=500');
      if (win) {
        win.document.write('<html><head><title>Cupón de Pago</title>');
        win.document.write('<style>body{font-family:sans-serif;padding:20px;text-align:center;} .card{border:2px dashed #2563eb;padding:20px;border-radius:10px;display:inline-block;}</style>');
        win.document.write('</head><body>');
        win.document.write('<div class="card">' + printContent + '</div>');
        win.document.write('</body></html>');
        win.document.close();
        win.print();
      }
    }
  };

  return (
    <div id="coupon-modal-overlay" className="fixed inset-0 bg-blue-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-full max-h-[94vh] sm:max-h-[90vh] overflow-hidden border border-blue-100 flex flex-col transform scale-100 transition-all duration-300">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-4 sm:py-4 sm:px-5 text-center relative shrink-0">
          <div className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 rounded-full p-1 cursor-pointer text-white transition" onClick={onClose}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="mx-auto w-8 h-8 bg-white/15 rounded-full flex items-center justify-center mb-1">
            <Ticket className="w-4.5 h-4.5 text-blue-100" />
          </div>
          <h3 className="text-base sm:text-lg font-extrabold tracking-tight">¡Aporte Confirmado!</h3>
          <p className="text-blue-100/95 text-[10px] sm:text-[11px] mt-0.5">Se ha generado tu cupón de pago colaborativo</p>
        </div>

        {/* Ticket Container */}
        <div className="p-3 sm:p-4 flex-1 bg-slate-50 relative overflow-y-auto min-h-0 scrollbar-thin">
          {/* Decorative semi-circles for ticket aesthetic */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-5 bg-blue-900/60 rounded-r-full z-10 opacity-70"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-5 bg-blue-900/60 rounded-l-full z-10 opacity-70"></div>

          <div ref={couponRef} className="bg-white border border-dashed border-blue-200 rounded-xl p-3 sm:p-4 shadow-xs relative overflow-hidden">
            
            {/* Ticket Stamp Background */}
            <div className="absolute right-[-10px] top-[-10px] text-blue-50/20 transform rotate-12 select-none pointer-events-none">
              <Ticket className="w-24 h-24" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">CÓDIGO DE CUPÓN</p>
                  <p className="text-sm sm:text-base font-mono font-bold text-blue-700 tracking-tight">{contribution.coupon_code}</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold max-w-[120px] truncate">
                  {contribution.project_id}
                </div>
              </div>

              {/* Amount Display */}
              <div className="text-center py-2 bg-blue-50/50 rounded-lg mb-2.5 border border-blue-50">
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold tracking-wider uppercase">TOTAL A PAGAR / TRANSFERIR</p>
                <p className="text-xl sm:text-2xl font-black text-blue-800 mt-0.5">
                  ${contribution.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Payment Destination (Company Alias) */}
              <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-2 sm:p-2.5 mb-2.5 flex items-start gap-2">
                <Building2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] uppercase tracking-wider text-amber-700 font-bold">ALIAS DE LA EMPRESA (DESTINO)</p>
                  <p className="text-xs font-mono font-bold text-amber-900 select-all truncate">{aliasToDisplay}</p>
                  <p className="text-[9px] sm:text-[10px] text-amber-700 mt-0.5 leading-tight">Realice la transferencia a este alias por el importe indicado.</p>
                </div>
              </div>

              {/* Contributor Metadata */}
              <div className="space-y-1.5 text-[11px] sm:text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="flex items-center gap-1 text-slate-400 font-medium shrink-0">
                    <User className="w-3 h-3" /> Aportante
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[160px]">{contribution.backer_name}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="flex items-center gap-1 text-slate-400 font-medium shrink-0">
                    <Wallet className="w-3 h-3" /> Cantidad aportada
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {contribution.quantity_bought % 1 === 0 
                      ? contribution.quantity_bought 
                      : Number(contribution.quantity_bought).toFixed(4)} unidades
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="flex items-center gap-1 text-slate-400 font-medium shrink-0">
                    <Calendar className="w-3 h-3" /> Fecha emisión
                  </span>
                  <span className="font-semibold text-slate-800 font-mono text-[10px] sm:text-[11px]">
                    {new Date(contribution.created_at).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-col items-center">
                <div className="w-full h-4.5 bg-slate-900 flex items-center justify-between px-1 rounded-xs overflow-hidden select-none opacity-80">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-white h-full" 
                      style={{ width: `${Math.floor(Math.random() * 2) + 1}px` }}
                    />
                  ))}
                </div>
                <p className="text-[7px] text-slate-400 font-mono mt-1 tracking-widest">{contribution.id.toUpperCase()}</p>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-3.5 py-2.5 sm:px-4 sm:py-3 border-t border-slate-100 flex gap-2.5 shrink-0">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs transition-all shadow-2xs cursor-pointer"
          >
            {copied ? (
              <>
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Datos</span>
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition shadow-xs hover:shadow-sm cursor-pointer flex items-center justify-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Listo</span>
          </button>
        </div>

      </div>
    </div>
  );
}
