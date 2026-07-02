import React, { useState } from 'react';
import { Contribution, Project, ProjectComponent } from '../types';
import { 
  Scale, Shield, HelpCircle, Undo2, Ban, Search, FileText, 
  MessageSquare, User, Calendar, Ticket, CheckCircle, AlertTriangle, 
  ChevronRight, Building, Mail, BookOpen
} from 'lucide-react';

interface LegalViewsProps {
  isOpen: boolean;
  initialTab: 'terms' | 'privacy' | 'refunds' | 'consumer' | 'faq';
  onClose: () => void;
  contributions: Contribution[];
  projects: Project[];
  components: ProjectComponent[];
  activeUser: { email: string; name: string; role: string; id: string } | null;
  onRevokeContribution: (contributionId: string, reason: string) => void;
}

export default function LegalViews({
  isOpen,
  initialTab,
  onClose,
  contributions,
  projects,
  components,
  activeUser,
  onRevokeContribution
}: LegalViewsProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'refunds' | 'consumer' | 'faq'>(initialTab);
  
  // Arrepentimiento states
  const [searchEmail, setSearchEmail] = useState(activeUser?.email || '');
  const [searchCoupon, setSearchCoupon] = useState('');
  const [selectedContribId, setSelectedContribId] = useState('');
  const [revocationReason, setRevocationReason] = useState('');
  const [revocationSuccess, setRevocationSuccess] = useState(false);
  const [revocationError, setRevocationError] = useState('');

  // Support / FAQ contact form state
  const [supportName, setSupportName] = useState(activeUser?.name || '');
  const [supportEmail, setSupportEmail] = useState(activeUser?.email || '');
  const [supportMsg, setSupportMsg] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter contributions that can be revoked (pending or approved status, not already rejected/cancelled)
  const userContributions = contributions.filter(c => {
    const matchesEmail = c.backer_email.toLowerCase() === searchEmail.toLowerCase().trim();
    const matchesCoupon = searchCoupon ? c.coupon_code.toUpperCase().trim() === searchCoupon.toUpperCase().trim() : true;
    const isRevocable = c.status !== 'rejected';
    return matchesEmail && matchesCoupon && isRevocable;
  });

  const handleRevokeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRevocationError('');
    setRevocationSuccess(false);

    if (!selectedContribId) {
      setRevocationError('Por favor, seleccione una contribución para revocar.');
      return;
    }

    if (!revocationReason.trim()) {
      setRevocationError('Por favor, ingrese el motivo de su arrepentimiento.');
      return;
    }

    // Call revocation handler
    onRevokeContribution(selectedContribId, revocationReason);
    setRevocationSuccess(true);
    setSelectedContribId('');
    setRevocationReason('');
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;
    setSupportSuccess(true);
    setSupportMsg('');
    setTimeout(() => setSupportSuccess(false), 5000);
  };

  const tabs = [
    { id: 'terms', label: 'Términos de Uso', icon: Scale },
    { id: 'privacy', label: 'Privacidad', icon: Shield },
    { id: 'refunds', label: 'Reembolsos', icon: Ban },
    { id: 'consumer', label: 'Botón de Arrepentimiento', icon: Undo2 },
    { id: 'faq', label: 'Soporte & FAQ', icon: HelpCircle },
  ] as const;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-md">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Centro Legal y de Soporte</h2>
              <p className="text-[10px] text-slate-400 font-mono">Regulaciones, Políticas, Botón de Arrepentimiento y FAQ • VaquitaApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition cursor-pointer font-bold text-xs"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Navigation Sidebar */}
          <div className="w-full md:w-64 bg-slate-50/50 border-r border-slate-100 p-4 space-y-1 overflow-y-auto shrink-0 flex md:flex-col gap-1 md:gap-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setRevocationSuccess(false);
                    setRevocationError('');
                  }}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Details Content Container */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white font-sans text-slate-600 text-xs leading-relaxed space-y-6">
            
            {/* TAB: TERMS */}
            {activeTab === 'terms' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Términos y Condiciones de Uso
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Última actualización: 01 de Julio de 2026</p>
                </div>

                <div className="space-y-4">
                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">1. Relación de la Plataforma</h4>
                    <p>
                      VaquitaApp funciona estrictamente como una plataforma de crowdfunding comunitario o "financiamiento colectivo" (cooperativa informal y asincrónica) diseñada para coordinar la compra conjunta de insumos para obras de construcción, asados, festejos de fin de año y proyectos vecinales. VaquitaApp facilita las herramientas de control de metas, cálculo de costos y generación de cupones de transferencia bancaria directa (peer-to-peer / P2P).
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">2. Responsabilidad de los Creadores (Owners)</h4>
                    <p>
                      El usuario que crea un proyecto u obra ("Owner") asume la total responsabilidad civil, comercial y penal por la veracidad del proyecto, la correcta determinación de los precios cargados en los insumos y la posterior adquisición física de los materiales. VaquitaApp NO custodia el dinero, NO procesa pagos directos en tarjetas, ni retiene comisiones de las transferencias. El aporte se transfiere directamente a la cuenta bancaria del Owner detallada en el cupón con su CBU o Alias personal.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">3. Propiedad Intelectual</h4>
                    <p>
                      Todo el código fuente, la marca VaquitaApp, las ilustraciones generadas por IA de la vaquita en la barra de navegación, la base de datos de auditoría de cupones, las estructuras de las tablas en Supabase y el diseño bento-grid de la plataforma corresponden a propiedad intelectual exclusiva de los desarrolladores y el administrador general Daniel Schafer.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">4. Condiciones de Aportes Económicos</h4>
                    <p>
                      Al presionar "Aportar", el aportante ("Backer") asume el compromiso de transferir el monto exacto indicado en el cupón generado al Alias destino asignado en un plazo máximo de 48 horas. La validación del aporte queda en manos del Owner y del Administrador, quienes verificarán la acreditación bancaria basándose en el comprobante subido por el Backer.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">5. Exención de Garantías</h4>
                    <p>
                      VaquitaApp no garantiza que los proyectos alcancen el 100% de su financiamiento ni responde ante incumplimientos en la entrega de materiales por parte de terceros proveedores del Owner. Al realizar un aporte, usted declara conocer la naturaleza comunitaria y de buena fe de la plataforma.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {/* TAB: PRIVACY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    Políticas de Privacidad & Protección de Datos
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Regulaciones de la Ley Nacional de Protección de Datos Personales N° 25.326</p>
                </div>

                <div className="space-y-4">
                  <p>
                    En VaquitaApp consideramos fundamental la seguridad de la información. Esta política detalla rigurosamente cómo recolectamos, protegemos y gestionamos los datos personales de los usuarios de nuestra plataforma.
                  </p>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">1. Datos Personales Recolectados</h4>
                    <p>
                      Para utilizar la plataforma y emitir o validar aportes, registramos la siguiente información suministrada voluntariamente:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Identidad Básica:</strong> Nombre completo, correo electrónico, rol en el sistema (Backer, Owner o Administrador).</li>
                      <li><strong>Información del Proyecto:</strong> Alias bancario, CBU, descripciones de obras e insumos que se proponen financiar.</li>
                      <li><strong>Datos de Transacción:</strong> Números de operación bancaria, banco emisor y opcionalmente imágenes/comprobantes de transferencia cargados por los usuarios.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">2. Integración de Autenticación de Google y Supabase</h4>
                    <p>
                      La plataforma simula un entorno seguro de inicio de sesión de Google a nivel de cliente para proteger la identidad del usuario activo. Cuando el sistema se conecta a un servidor remoto de base de datos a través de <strong>Supabase SQL</strong>, los datos son transmitidos de forma segura mediante encriptación SSL, persistiendo en tablas dedicadas y debidamente estructuradas para evitar manipulaciones ajenas.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">3. Almacenamiento y Seguridad de Datos</h4>
                    <p>
                      Toda la información de proyectos, componentes, contribuciones y logs de auditoría se almacena de forma redundante mediante el estado de hidratación de <strong>LocalStorage</strong> para garantizar que el progreso de su cooperativa no se pierda al cerrar el navegador. Cuando se activa la consola Supabase, los datos quedan regidos por las políticas de seguridad del backend en la nube.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">4. Derechos ARCO</h4>
                    <p>
                      Cualquier usuario de la plataforma tiene derecho a acceder, rectificar, cancelar oponerse al tratamiento de sus datos personales. Puede coordinar esto de manera directa enviando un ticket al Administrador de la plataforma (Daniel Schafer).
                    </p>
                  </section>
                </div>
              </div>
            )}

            {/* TAB: REFUNDS */}
            {activeTab === 'refunds' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <Ban className="w-5 h-5 text-rose-600" />
                    Política de Reembolsos y Cancelaciones
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Normativa de devolución de aportes y financiamientos parciales</p>
                </div>

                <div className="space-y-4">
                  <p>
                    VaquitaApp administra presupuestos de obras e insumos mediante un sistema de financiamiento peer-to-peer (P2P). Es fundamental entender las reglas de devolución antes de confirmar una reserva de cupón.
                  </p>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">1. Naturaleza de los Fondos</h4>
                    <p>
                      Dado que los fondos se transfieren <strong>directamente</strong> a las cuentas bancarias provistas por los Owners (sin intermediación financiera de VaquitaApp), cualquier reembolso en efectivo debe ser realizado y coordinado por el Owner del proyecto. VaquitaApp facilita la reconciliación del sistema al anular los cupones y devolver el stock de los insumos a su estado disponible.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">2. Regulación de Financiamiento Parcial (Partial Funding)</h4>
                    <p>
                      Aquellos insumos de alto valor (como materiales áridos de gran volumen) marcados con la opción de <strong>Aporte Parcial</strong> acumulan saldo de forma gradual. Si un proyecto se cancela antes de que el insumo se financie al 100%, los fondos acumulados hasta la fecha deben ser devueltos de forma proporcional por el Owner a cada aportante.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-slate-800 font-bold text-xs">3. Proyectos Cancelados o Archivados</h4>
                    <p>
                      Si un proyecto es eliminado lógicamente por el Owner o suspendido por el Administrador por irregularidades en los presupuestos:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Todos los aportes con estado <strong>Pendiente</strong> quedan anulados de inmediato.</li>
                      <li>Los aportes con estado <strong>Aprobado</strong> requieren que el Owner procese las transferencias inversas. El Backer puede utilizar el <strong>Botón de Arrepentimiento</strong> para asentar formalmente el reclamo de reintegro en el sistema.</li>
                    </ul>
                  </section>
                </div>
              </div>
            )}

            {/* TAB: CONSUMER / ARREPENTIMIENTO */}
            {activeTab === 'consumer' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <Undo2 className="w-5 h-5 text-blue-600" />
                    Botón de Arrepentimiento & Revocación
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Conforme a la Ley N° 24.240 de Defensa del Consumidor (Art. 34)</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-900 leading-normal">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-xs">Derecho de Revocación de Reservas</span>
                    <span className="text-[11px] block mt-0.5 text-amber-800">
                      Usted dispone de 10 días hábiles para revocar cualquier aporte realizado sin penalidad alguna. Al revocar, el stock del insumo en el proyecto correspondiente se liberará inmediatamente para que otros colaboradores puedan reservarlo.
                    </span>
                  </div>
                </div>

                {revocationSuccess ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h4 className="text-emerald-800 font-extrabold text-sm">¡Revocación Solicitada con Éxito!</h4>
                    <p className="text-xs text-emerald-700 max-w-md mx-auto">
                      Se ha procedido a anular la reserva y restablecer los insumos liberados al stock del proyecto correspondiente. El log de auditoría del sistema ha guardado su solicitud de revocación.
                    </p>
                    <button
                      onClick={() => setRevocationSuccess(false)}
                      className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl cursor-pointer"
                    >
                      Realizar otra revocación
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRevokeSubmit} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="font-extrabold text-slate-800 text-xs">Buscador de Aportes Vigentes para Revocar</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tu Correo Electrónico</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            required
                            placeholder="ejemplo@correo.com"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Código del Cupón (Opcional)</label>
                        <div className="relative">
                          <Ticket className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="CUPON-XXXX-XXXX"
                            value={searchCoupon}
                            onChange={(e) => setSearchCoupon(e.target.value)}
                            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:border-blue-500 font-mono uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/60 pt-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">
                        Selecciona tu aporte ({userContributions.length} encontrados)
                      </span>
                      
                      {userContributions.length === 0 ? (
                        <div className="bg-white p-4 text-center rounded-xl border border-slate-200 text-slate-400">
                          {searchEmail ? 'No se encontraron aportes revocables para este correo electrónico.' : 'Ingrese su correo electrónico en el formulario de arriba para buscar sus aportes.'}
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {userContributions.map((c) => {
                            const comp = components.find(item => item.id === c.component_id);
                            const proj = projects.find(p => p.id === c.project_id);
                            return (
                              <label
                                key={c.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                  selectedContribId === c.id 
                                    ? 'border-blue-500 bg-blue-50/50 shadow-xs' 
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="selected_contribution"
                                  value={c.id}
                                  checked={selectedContribId === c.id}
                                  onChange={() => setSelectedContribId(c.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <span className="font-bold text-slate-800 text-[11px] font-mono">{c.coupon_code}</span>
                                    <span className="font-extrabold text-blue-600 font-mono text-[11px]">${c.amount.toLocaleString('es-AR')}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                    Proyecto: <span className="font-semibold">{proj?.name || c.project_id}</span> • Item: <span className="font-semibold">{comp?.name || 'Insumo'}</span>
                                  </p>
                                  <div className="flex justify-between items-center mt-1 text-[9px] text-slate-400 font-mono">
                                    <span>Emitido: {new Date(c.created_at).toLocaleDateString('es-AR')}</span>
                                    <span className={`px-1.5 py-0.5 rounded-sm font-sans font-bold capitalize ${
                                      c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {c.status === 'approved' ? 'Acreditado' : 'Pendiente'}
                                    </span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {selectedContribId && (
                      <div className="space-y-3 border-t border-slate-200/60 pt-3 animate-fade-in">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Motivo del arrepentimiento / cancelación <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            required
                            rows={2}
                            placeholder="Ej: Error en el cálculo, imposibilidad de realizar la transferencia, etc."
                            value={revocationReason}
                            onChange={(e) => setRevocationReason(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:border-blue-500"
                          />
                        </div>

                        {revocationError && (
                          <p className="text-[10px] text-red-600 font-bold">{revocationError}</p>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            Confirmar Arrepentimiento
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}

            {/* TAB: FAQ & SUPPORT */}
            {activeTab === 'faq' && (
              <div className="space-y-6 animate-fade-in">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                    Soporte & Preguntas Frecuentes (FAQ)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Respuestas rápidas para backer, owners y administradores</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left: FAQs */}
                  <div className="lg:col-span-7 space-y-4">
                    {[
                      {
                        q: '¿Cómo funciona el sistema de cupones de VaquitaApp?',
                        a: 'Al presionar "Aportar" sobre un insumo, el sistema reserva las unidades correspondientes bloqueándolas temporalmente y emite un Cupón con un código único. En ese cupón figuran las instrucciones de pago bancario directo (CBU/Alias del proyecto). Luego de transferir, debes subir tu comprobante de pago para que el Owner valide la recepción del dinero.'
                      },
                      {
                        q: '¿Qué es el Alias del Proyecto/Empresa?',
                        a: 'Es la dirección única de cuenta bancaria o billetera digital (como Mercado Pago) provista por el creador del proyecto. El dinero que aportas nunca pasa por las cuentas de VaquitaApp; se acredita directamente en la cuenta del Owner para acelerar las compras y evitar intermediaciones bancarias.'
                      },
                      {
                        q: '¿Cómo subo mi comprobante de transferencia?',
                        a: 'Ingresa a la pestaña "Mis Aportes" en el menú principal. Allí verás tu listado de reservas de cupones. Selecciona la opción para cargar el Nro de Operación de transferencia bancaria y el banco emisor. Esto notificará al administrador y al creador del proyecto para su validación.'
                      },
                      {
                        q: '¿Qué sucede si un proyecto no se completa?',
                        a: 'En proyectos que no admiten financiamiento parcial, si la meta no es lograda, los cupones pendientes se anulan. En proyectos con financiamiento parcial (como bolsones de arena), el dinero ya se puede ir utilizando. Si el proyecto se cancela por completo, el Owner asume la obligación de contactar a cada backer para realizar el reintegro de los importes transferidos.'
                      },
                      {
                        q: '¿Cuál es el rol del Administrador (Daniel Schafer)?',
                        a: 'El Administrador tiene superpoderes en la consola de auditoría. Es el único que puede recuperar proyectos eliminados lógicamente, purgar la lista completa de logs históricos de acciones, crear o modificar usuarios especiales y validar o rechazar cupones de cualquier proyecto si existiese un reclamo.'
                      }
                    ].map((faq, idx) => (
                      <div key={idx} className="border-b border-slate-100 pb-3 space-y-1.5">
                        <h4 className="font-bold text-slate-800 text-xs flex gap-2 items-start">
                          <span className="text-blue-500 font-mono">Q.</span>
                          {faq.q}
                        </h4>
                        <p className="text-slate-500 pl-4 leading-relaxed text-[11px]">{faq.a}</p>
                      </div>
                    ))}
                  </div>

                  {/* Right: Support Form */}
                  <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                    <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      Enviar Mensaje a Soporte
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      ¿Tuviste un inconveniente con una transferencia o alias incorrecto? Completa el formulario para enviar una consulta al Administrador.
                    </p>

                    {supportSuccess ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center text-emerald-800 text-[11px] font-bold">
                        ✓ Mensaje enviado con éxito. El administrador Daniel Schafer responderá a su correo registrado en breve.
                      </div>
                    ) : (
                      <form onSubmit={handleSupportSubmit} className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Nombre</label>
                          <input
                            type="text"
                            required
                            placeholder="Tu nombre"
                            value={supportName}
                            onChange={(e) => setSupportName(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                          <input
                            type="email"
                            required
                            placeholder="tu@correo.com"
                            value={supportEmail}
                            onChange={(e) => setSupportEmail(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Tu Consulta / Disputa</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Describa brevemente el problema con el alias, insumo o cupón..."
                            value={supportMsg}
                            onChange={(e) => setSupportMsg(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded-xl focus:outline-hidden focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer"
                        >
                          Enviar Consulta
                        </button>
                      </form>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
