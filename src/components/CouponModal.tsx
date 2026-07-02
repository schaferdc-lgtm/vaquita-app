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
    <div id="coupon-modal-overlay" className="fixed inset-0 bg-blue-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-blue-100 flex flex-col transform scale-100 transition-transform duration-300">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 text-center relative">
          <div className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1.5 cursor-pointer text-white transition" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="mx-auto w-12 h-12 bg-white/15 rounded-full flex items-center justify-center mb-2">
            <Ticket className="w-6 h-6 text-blue-100" />
          </div>
          <h3 className="text-xl font-bold">¡Aporte Confirmado!</h3>
          <p className="text-blue-100 text-xs mt-1">Se ha generado tu cupón de pago colaborativo</p>
        </div>

        {/* Ticket Container */}
        <div className="p-6 flex-1 bg-slate-50 relative">
          {/* Decorative semi-circles for ticket aesthetic */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-blue-900/60 rounded-r-full z-10"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-blue-900/60 rounded-l-full z-10"></div>

          <div ref={couponRef} className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            
            {/* Ticket Stamp Background */}
            <div className="absolute right-[-20px] top-[-20px] text-blue-50/40 transform rotate-12 select-none">
              <Ticket className="w-40 h-40" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">CÓDIGO DE CUPÓN</p>
                  <p className="text-lg font-mono font-bold text-blue-700 tracking-tight">{contribution.coupon_code}</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                  {contribution.project_id}
                </div>
              </div>

              {/* Amount Display */}
              <div className="text-center py-4 bg-blue-50/50 rounded-xl mb-4 border border-blue-50">
                <p className="text-xs text-slate-500 font-medium">TOTAL A PAGAR / TRANSFERIR</p>
                <p className="text-3xl font-extrabold text-blue-800 mt-1">
                  ${contribution.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Payment Destination (Company Alias) */}
              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 mb-4 flex items-start gap-3">
                <Building2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">ALiAS DE LA EMPRESA (DESTINO)</p>
                  <p className="text-sm font-mono font-bold text-amber-900 select-all">{aliasToDisplay}</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Realice la transferencia a este alias por el importe indicado.</p>
                </div>
              </div>

              {/* Contributor Metadata */}
              <div className="space-y-3.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <User className="w-3.5 h-3.5" /> Aportante
                  </span>
                  <span className="font-semibold text-slate-800">{contribution.backer_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Wallet className="w-3.5 h-3.5" /> Cantidad aportada
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {contribution.quantity_bought % 1 === 0 
                      ? contribution.quantity_bought 
                      : Number(contribution.quantity_bought).toFixed(4)} unidades
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Calendar className="w-3.5 h-3.5" /> Fecha emisión
                  </span>
                  <span className="font-semibold text-slate-800">
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
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center">
                <div className="w-full h-8 bg-slate-900 flex items-center justify-between px-1 rounded-sm overflow-hidden select-none opacity-80">
                  {Array.from({ length: 42 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-white h-full" 
                      style={{ width: `${Math.floor(Math.random() * 4) + 1}px` }}
                    />
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 font-mono mt-1 tracking-widest">{contribution.id.toUpperCase()}</p>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 font-medium text-sm transition-all shadow-xs cursor-pointer"
          >
            {copied ? (
              <>
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Datos</span>
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Listo</span>
          </button>
        </div>

      </div>
    </div>
  );
}
