import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Clock, 
  Ticket, 
  Landmark, 
  DollarSign, 
  LogIn,
  RefreshCw,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Contribution, Project, ProjectComponent, UserProfile } from '../types';

interface MyContributionsViewProps {
  contributions: Contribution[];
  projects: Project[];
  components: ProjectComponent[];
  activeUser: UserProfile | null;
  allUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  onUploadPaymentTicket: (contribId: string, ticket: string, bank: string) => void;
  onOpenCoupon: (contrib: Contribution) => void;
}

export default function MyContributionsView({
  contributions,
  projects,
  components,
  activeUser,
  allUsers,
  onSwitchUser,
  onUploadPaymentTicket,
  onOpenCoupon,
}: MyContributionsViewProps) {
  // Clipboard copy state helper
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!activeUser) {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-6 bg-white border border-slate-150 rounded-3xl shadow-sm space-y-6 animate-fade-in my-8">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
          <LogIn className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Accede para ver tus aportes</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Inicia sesión para poder registrar los comprobantes de tus transferencias bancarias o virtuales, ver el progreso de aprobación y descargar tus cupones válidos.
          </p>
        </div>
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perfiles rápidos para pruebas:</p>
          <div className="grid grid-cols-1 gap-2">
            {allUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => onSwitchUser(u)}
                className="text-xs font-semibold px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between transition cursor-pointer text-slate-700"
              >
                <div className="text-left">
                  <p className="font-bold text-slate-800">{u.full_name}</p>
                  <p className="text-[10px] text-slate-400 font-normal">{u.role === 'admin' ? 'Administrador' : u.role === 'owner' ? 'Creador' : 'Aportante'}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-100">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter user contributions
  const userContribs = contributions.filter(
    (c) => c.backer_email.toLowerCase() === activeUser.email.toLowerCase()
  );

  // User Stats
  const activeUserContribs = userContribs.filter(c => c.status !== 'rejected' && c.status !== 'expired');
  const totalCommitted = activeUserContribs.reduce((sum, c) => sum + c.amount, 0);
  const totalVerified = userContribs.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0);
  const pendingTicketCount = userContribs.filter(c => (!c.status || c.status === 'pending') && !c.payment_ticket).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Panel */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-100">
            Panel del Colaborador
          </span>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-2.5">
            Mis Aportes y Transferencias
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Revisa tu historial, copia los datos bancarios para transferir y carga el comprobante de tus aportes reservados.
          </p>
        </div>

        {/* Mini stats cards */}
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="flex-1 min-w-[120px] bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Reservado</span>
            <span className="text-base font-black text-slate-800">${totalCommitted.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex-1 min-w-[120px] bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100/40 text-center animate-pulse-slow">
            <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Aprobado</span>
            <span className="text-base font-black text-emerald-700">${totalVerified.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex-1 min-w-[120px] bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100/40 text-center">
            <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-wider block">Falta Ticket</span>
            <span className="text-base font-black text-amber-700">{pendingTicketCount}</span>
          </div>
        </div>
      </div>

      {userContribs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Ticket className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-bold text-slate-700 text-sm">Aún no has participado en ningún proyecto</h3>
            <p className="text-xs text-slate-400 mt-1 leading-normal">
              Explora los proyectos activos en la pestaña principal, elige un insumo que necesite financiamiento e inscríbete para ayudar a tu comunidad.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userContribs.slice().reverse().map((c) => {
            const project = projects.find(p => p.id === c.project_id);
            const component = components.find(item => item.id === c.component_id);
            const compName = component?.name || 'Insumo';
            
            // Calculate 24h expiration remaining time
            const createdTime = new Date(c.created_at).getTime();
            const now = new Date().getTime();
            const diffMs = (24 * 60 * 60 * 1000) - (now - createdTime);
            const isExpired = diffMs <= 0 && (!c.status || c.status === 'pending') && !c.payment_ticket;
            const hoursLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
            const minutesLeft = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

            const displayStatus = isExpired ? 'expired' : c.status || 'pending';

            return (
              <div 
                key={c.id} 
                className={`bg-white rounded-3xl border ${
                  displayStatus === 'approved' 
                    ? 'border-emerald-100 shadow-xs' 
                    : displayStatus === 'rejected' || displayStatus === 'expired'
                    ? 'border-slate-150 opacity-75'
                    : !c.payment_ticket
                    ? 'border-amber-200 ring-2 ring-amber-400/5 shadow-md'
                    : 'border-slate-200'
                } p-5 md:p-6 space-y-4 transition hover:shadow-xs flex flex-col justify-between`}
              >
                {/* Header Row */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                        {project?.name || c.project_id}
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-sm mt-1.5 leading-tight">{compName}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">Aporte: {c.quantity_bought % 1 === 0 ? c.quantity_bought : c.quantity_bought.toFixed(3)} u. • {new Date(c.created_at).toLocaleDateString('es-AR')}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-lg font-black block ${displayStatus === 'approved' ? 'text-emerald-600' : 'text-slate-800'}`}>
                        ${c.amount.toLocaleString('es-AR')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono font-semibold uppercase">{c.company_alias}</span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="pt-1.5 flex items-center gap-1.5">
                    {displayStatus === 'approved' && (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>✓ Verificado y Aprobado</span>
                      </span>
                    )}
                    {displayStatus === 'pending' && c.payment_ticket && (
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-250 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 shrink-0 animate-spin-slow" />
                        <span>⏰ Pendiente de Validación</span>
                      </span>
                    )}
                    {displayStatus === 'pending' && !c.payment_ticket && (
                      <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>💳 Pendiente de Transferencia</span>
                      </span>
                    )}
                    {displayStatus === 'expired' && (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>⌛ Expirado (sin validar)</span>
                      </span>
                    )}
                    {displayStatus === 'rejected' && (
                      <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>✗ Rechazado / Nulo</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Details Area */}
                <div className="space-y-3.5 pt-3 border-t border-slate-100 flex-1">
                  {/* CASE 1: VERIFIED -> ALLOW DOWNLOADING OF CUPON */}
                  {displayStatus === 'approved' && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Tu transferencia fue validada con éxito por el administrador del proyecto. Tu cupón de pago con código de canje único está disponible para ser descargado y presentado:
                      </p>
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-150">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Código del Cupón</span>
                          <p className="font-mono text-xs font-extrabold text-slate-800">{c.coupon_code}</p>
                        </div>
                        <button
                          onClick={() => onOpenCoupon(c)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Descargar Cupón</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CASE 2: PENDING & TICKET SENT -> INFO ONLY */}
                  {displayStatus === 'pending' && c.payment_ticket && (
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
                      <p className="text-[11px] text-slate-500">
                        Ya cargaste los datos de pago para este aporte. El administrador está comparando tu transferencia con el comprobante bancario:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-150">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Referencia:</span>
                          <strong className="font-mono text-slate-700">{c.payment_ticket}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block">Entidad/Medio:</span>
                          <strong className="text-slate-700">{c.payment_bank}</strong>
                        </div>
                      </div>
                      <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Plazo de expiración: {hoursLeft}h {minutesLeft}m restantes para el OK.</span>
                      </div>
                    </div>
                  )}

                  {/* CASE 3: PENDING & LACK TICKET -> ACTIVE TRANSFER AND UPLOAD STAGE */}
                  {displayStatus === 'pending' && !c.payment_ticket && (
                    <div className="space-y-3">
                      {/* BANK/CBU DATA TO TRANSFER */}
                      <div className="bg-amber-50/20 border border-amber-100/50 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5 text-amber-600" />
                            Datos para la Transferencia:
                          </span>
                          <span className="text-[10px] text-amber-700 font-semibold font-mono">
                            {hoursLeft}h {minutesLeft}m límite
                          </span>
                        </div>

                        {project?.payment_alias && (
                          <div className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-slate-150/60">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Alias Destino</span>
                              <strong className="font-mono text-slate-700 text-[11px] select-all">{project.payment_alias}</strong>
                            </div>
                            <button
                              onClick={() => handleCopy(project.payment_alias || '', 'alias')}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md border border-slate-200 transition cursor-pointer"
                              title="Copiar Alias"
                            >
                              {copiedText === 'alias' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}

                        {project?.payment_cbu && (
                          <div className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-slate-150/60">
                            <div>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">CBU / CVU Destino</span>
                              <strong className="font-mono text-slate-700 text-[11px] select-all">{project.payment_cbu}</strong>
                            </div>
                            <button
                              onClick={() => handleCopy(project.payment_cbu || '', 'cbu')}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md border border-slate-200 transition cursor-pointer"
                              title="Copiar CBU"
                            >
                              {copiedText === 'cbu' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* TICKET UPLOAD LOCAL FORM */}
                      <TicketUploadForm 
                        contribId={c.id} 
                        onUpload={(ticket, bank) => onUploadPaymentTicket(c.id, ticket, bank)} 
                      />
                    </div>
                  )}

                  {/* CASE 4: REJECTED / EXPIRED -> INFO */}
                  {(displayStatus === 'rejected' || displayStatus === 'expired') && (
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-[11px] text-slate-500 leading-normal space-y-1">
                      <p className="font-semibold text-slate-700">Este aporte ya no tiene validez:</p>
                      {displayStatus === 'expired' && (
                        <p>Se cumplió el plazo límite de 24 horas para registrar el comprobante de transferencia bancaria, por lo que las unidades correspondientes fueron devueltas al stock disponible del proyecto.</p>
                      )}
                      {displayStatus === 'rejected' && (
                        <p>El administrador anuló este aporte de forma manual. Los insumos y montos correspondientes han sido restablecidos y devueltos al proyecto.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Helper Inner Form Component to hold local state cleanly for each contribution card */
interface TicketUploadFormProps {
  contribId: string;
  onUpload: (ticket: string, bank: string) => void;
}

function TicketUploadForm({ contribId, onUpload }: TicketUploadFormProps) {
  const [ticket, setTicket] = useState('');
  const [bank, setBank] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpload(ticket, bank);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5 bg-slate-50/50 p-3 rounded-2xl border border-slate-150">
      <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">
        Cargar Comprobante Realizado:
      </span>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <input
            type="text"
            placeholder="Nro de Operación"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            className="w-full text-xs font-semibold px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500 bg-white"
            required
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Ej: Mercado Pago, Galicia..."
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="w-full text-xs font-semibold px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500 bg-white"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10.5px] py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Enviar Comprobante de Pago</span>
      </button>
    </form>
  );
}
