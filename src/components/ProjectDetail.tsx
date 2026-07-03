import React, { useState } from 'react';
import { Project, ProjectComponent, Contribution, UserProfile } from '../types';
import { fundComponent } from '../business_logic';
import { getProjectPalette } from '../lib/colors';
import ProjectReportModal from './ProjectReportModal';
import { 
  ArrowLeft, Hammer, GlassWater, Trophy, HelpCircle, Info, 
  Coins, Plus, Calendar, Ticket, CheckCircle2, AlertCircle, ShoppingBag, 
  Building2, ArrowRight, Trash2, HelpCircle as HelpIcon, FileText, Settings
} from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  components: ProjectComponent[];
  contributions: Contribution[];
  activeUser: UserProfile | null;
  onBackToList: () => void;
  onAddContribution: (contribution: Contribution, updatedComponent: ProjectComponent) => void;
  onAddComponent: (component: ProjectComponent) => void;
  onDeleteComponent: (componentId: string) => void;
  onApproveContribution: (contributionId: string) => void;
  onRejectContribution: (contributionId: string) => void;
  onUpdateProjectDates: (projectId: string, newStartDate: string, newEndDate: string) => void;
  onSoftDeleteProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
  onToggleProjectApproval?: (projectId: string, approve: boolean, isAutoMpApproved?: boolean) => void;
  onSendAdminEmail?: (type: 'payment_intent' | 'payment_result', details: { projectId: string; amount: number; isSuccess?: boolean; paymentId?: string }) => void;
  onEdit?: (project: Project) => void;
  adminFeeMin?: number;
  adminFeeMax?: number;
  adminFeePercent?: number;
  adminMinValidityDays?: number;
  adminMaxValidityDays?: number;
}

export default function ProjectDetail({
  project,
  components,
  contributions,
  activeUser,
  onBackToList,
  onAddContribution,
  onAddComponent,
  onDeleteComponent,
  onApproveContribution,
  onRejectContribution,
  onUpdateProjectDates,
  onSoftDeleteProject,
  onRestoreProject,
  onToggleProjectApproval,
  onSendAdminEmail,
  onEdit,
  adminFeeMin = 50000,
  adminFeeMax = 1000000,
  adminFeePercent = 1,
  adminMinValidityDays = 30,
  adminMaxValidityDays = 365,
}: ProjectDetailProps) {
  // Get color palette for this project
  const palette = getProjectPalette(project.id);

  // Get components for this project
  const projectComponents = components.filter((c) => c.project_id === project.id);
  // Get contributions for this project
  const projectContributions = contributions.filter((c) => c.project_id === project.id);

  // Financial aggregates
  const totalCost = projectComponents.reduce((sum, c) => sum + c.total_price, 0);
  const totalRemaining = projectComponents.reduce((sum, c) => sum + (c.remaining_quantity * c.unit_price), 0);
  const totalFunded = Math.max(0, totalCost - totalRemaining);
  const progressPercent = totalCost > 0 ? Math.min(100, Math.round((totalFunded / totalCost) * 100)) : 0;

  // Selected item contribution states
  const [fundingInputs, setFundingInputs] = useState<Record<string, { quantity: string; amount: string; paymentTicket: string; paymentBank: string }>>({});
  const [fundingErrors, setFundingErrors] = useState<Record<string, string>>({});

  // New component form states (for project owner or admin)
  const [showAddComponentForm, setShowAddComponentForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnitPrice, setNewItemUnitPrice] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [formError, setFormError] = useState('');

  // Mercado Pago states
  const [activeMpPayment, setActiveMpPayment] = React.useState<{
    type: 'contribution' | 'tk_fee';
    amount: number;
    componentId?: string;
    componentName?: string;
    quantityBought?: number;
  } | null>(null);
  const [mpProcessing, setMpProcessing] = React.useState(false);
  const [mpSuccess, setMpSuccess] = React.useState(false);
  const [generatedMpPaymentId, setGeneratedMpPaymentId] = React.useState('');
  const [selectedContributionMethod, setSelectedContributionMethod] = React.useState<Record<string, 'transfer' | 'mercadopago'>>({});

  // Date and status management states
  const [editedStartDate, setEditedStartDate] = useState(project.start_date);
  const [editedEndDate, setEditedEndDate] = useState(project.end_date);
  const [dateUpdateSuccess, setDateUpdateSuccess] = useState(false);
  const [dateUpdateError, setDateUpdateError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  const handleMpPaymentComplete = () => {
    if (!activeMpPayment || !activeUser) return;

    if (activeMpPayment.type === 'tk_fee') {
      // Approve project automatically (VIGENTE)
      onToggleProjectApproval?.(project.id, true, true);
      alert(`¡Pago de TK Servicio por $${activeMpPayment.amount.toLocaleString('es-AR')} procesado con éxito mediante Mercado Pago! El proyecto/evento se encuentra ahora en estado VIGENTE y habilitado para recibir aportes de forma instantánea.`);
    } else if (activeMpPayment.type === 'contribution' && activeMpPayment.componentId) {
      const compId = activeMpPayment.componentId;
      const component = components.find(c => c.id === compId);
      if (!component) return;

      const isPartial = component.allow_partial;
      const amount = activeMpPayment.amount;
      const qty = activeMpPayment.quantityBought || 0;

      const res = fundComponent(
        component,
        isPartial,
        qty,
        amount,
        activeUser.id,
        activeUser.email,
        activeUser.full_name
      );

      if (res.success && res.updatedComponent && res.contribution) {
        const contributionResult = res.contribution;
        // Mark as approved immediately since payment was made online!
        contributionResult.status = 'approved';
        contributionResult.payment_method = 'mercadopago';
        contributionResult.payment_bank = 'MercadoPago';
        contributionResult.payment_ticket = 'PREF-MP-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        contributionResult.validated_at = new Date().toISOString();

        if (project.payment_alias) {
          contributionResult.company_alias = project.payment_alias;
        }

        onAddContribution(contributionResult, res.updatedComponent);

        // Clear input form
        setFundingInputs((prev) => ({
          ...prev,
          [compId]: { quantity: '', amount: '', paymentTicket: '', paymentBank: '' },
        }));

        alert(`¡Aporte de $${amount.toLocaleString('es-AR')} para el insumo "${component.name}" acreditado e inscripto con éxito de forma automática! Puedes ver tu cupón de inscripción en la sección "Mis Aportes".`);
      } else {
        alert('Error al registrar el aporte: ' + res.error);
      }
    }

    // Reset MP state
    setActiveMpPayment(null);
    setMpProcessing(false);
    setMpSuccess(false);
  };

  React.useEffect(() => {
    setEditedStartDate(project.start_date);
    setEditedEndDate(project.end_date);
    setDateUpdateSuccess(false);
    setDateUpdateError('');
  }, [project.start_date, project.end_date]);

  const todayStr = new Date().toLocaleDateString('en-CA');
  const isStarted = project.start_date <= todayStr;
  const isExpired = todayStr > project.end_date;
  const isProjectActive = isStarted && !isExpired && !project.is_deleted;

  const handleUpdateProjectDates = () => {
    setDateUpdateSuccess(false);
    setDateUpdateError('');
    if (!editedStartDate || !editedEndDate) {
      setDateUpdateError('Las fechas de inicio y fin no pueden estar vacías.');
      return;
    }
    if (editedEndDate < editedStartDate) {
      setDateUpdateError('La fecha fin no puede ser anterior a la de inicio.');
      return;
    }

    // Guardrail: VIGENTE (approved) projects cannot modify start date
    if (project.is_approved && editedStartDate !== project.start_date) {
      setDateUpdateError('El proyecto ya se encuentra VIGENTE (Aprobado). No está permitido modificar la fecha de inicio de la campaña.');
      return;
    }

    // Guardrail: Check duration range
    const start_dt = new Date(editedStartDate);
    const end_dt = new Date(editedEndDate);
    const diff_time = end_dt.getTime() - start_dt.getTime();
    const diff_days = Math.ceil(diff_time / (1000 * 60 * 60 * 24));

    if (diff_days < adminMinValidityDays) {
      setDateUpdateError(`La duración de la vigencia (${diff_days} días) no puede ser menor al mínimo establecido de ${adminMinValidityDays} días.`);
      return;
    }
    if (diff_days > adminMaxValidityDays) {
      setDateUpdateError(`La duración de la vigencia (${diff_days} días) no puede superar el máximo establecido de ${adminMaxValidityDays} días.`);
      return;
    }

    onUpdateProjectDates(project.id, editedStartDate, editedEndDate);
    setDateUpdateSuccess(true);
  };

  const handleSoftDelete = () => {
    if (confirm('¿Está seguro de que desea eliminar lógicamente este proyecto? Quedará archivado y no admitirá aportes, pero el Administrador podrá recuperarlo.')) {
      onSoftDeleteProject(project.id);
    }
  };

  const handleRestore = () => {
    if (confirm('¿Desea restaurar este proyecto archivado para que vuelva a estar vigente?')) {
      onRestoreProject(project.id);
    }
  };

  const handleInputChange = (componentId: string, field: 'quantity' | 'amount' | 'paymentTicket' | 'paymentBank', value: string) => {
    setFundingInputs((prev) => ({
      ...prev,
      [componentId]: {
        ...prev[componentId] || { quantity: '', amount: '', paymentTicket: '', paymentBank: '' },
        [field]: value,
      },
    }));
    // Clear error
    setFundingErrors((prev) => ({ ...prev, [componentId]: '' }));
  };

  const handleFundSubmit = (e: React.FormEvent, component: ProjectComponent) => {
    e.preventDefault();

    if (!activeUser) {
      setFundingErrors((prev) => ({
        ...prev,
        [component.id]: 'Debes iniciar sesión para realizar un aporte.',
      }));
      return;
    }

    const inputState = fundingInputs[component.id] || { quantity: '', amount: '', paymentTicket: '', paymentBank: '' };
    const allowPartial = component.allow_partial;

    // Intercept Mercado Pago payment method
    const method = selectedContributionMethod[component.id] || 'transfer';
    if (method === 'mercadopago') {
      let amount = 0;
      let qty = 0;
      if (allowPartial) {
        amount = parseFloat(inputState.amount);
        if (isNaN(amount) || amount <= 0) {
          setFundingErrors((prev) => ({ ...prev, [component.id]: 'Ingrese un monto válido de dinero.' }));
          return;
        }
        const remainingVal = component.remaining_quantity * component.unit_price;
        if (amount > remainingVal) {
          setFundingErrors((prev) => ({ ...prev, [component.id]: `El monto no puede superar el saldo restante de $${remainingVal.toLocaleString('es-AR')}.` }));
          return;
        }
      } else {
        qty = parseInt(inputState.quantity);
        if (isNaN(qty) || qty <= 0) {
          setFundingErrors((prev) => ({ ...prev, [component.id]: 'Ingrese una cantidad válida de unidades.' }));
          return;
        }
        if (qty > Math.floor(component.remaining_quantity)) {
          setFundingErrors((prev) => ({ ...prev, [component.id]: `La cantidad no puede superar el stock disponible de ${Math.floor(component.remaining_quantity)} unidades.` }));
          return;
        }
        amount = qty * component.unit_price;
      }

      // Launch Mercado Pago Simulator
      setActiveMpPayment({
        type: 'contribution',
        amount,
        componentId: component.id,
        componentName: component.name,
        quantityBought: qty
      });
      return;
    }

    let success = false;
    let errorMsg = '';
    let updatedComponent: ProjectComponent | null = null;
    let contributionResult: Contribution | null = null;

    if (allowPartial) {
      // Custom money contribution
      const amount = parseFloat(inputState.amount);
      if (isNaN(amount) || amount <= 0) {
        errorMsg = 'Ingrese un monto válido de dinero.';
      } else {
        const res = fundComponent(
          component,
          true,
          0,
          amount,
          activeUser.id,
          activeUser.email,
          activeUser.full_name
        );
        success = res.success;
        errorMsg = res.error || '';
        updatedComponent = res.updatedComponent;
        contributionResult = res.contribution;
      }
    } else {
      // Stock deduction quantity purchase
      const qty = parseInt(inputState.quantity);
      if (isNaN(qty) || qty <= 0) {
        errorMsg = 'Ingrese una cantidad válida de unidades.';
      } else {
        const res = fundComponent(
          component,
          false,
          qty,
          0,
          activeUser.id,
          activeUser.email,
          activeUser.full_name
        );
        success = res.success;
        errorMsg = res.error || '';
        updatedComponent = res.updatedComponent;
        contributionResult = res.contribution;
      }
    }

    if (!success || !updatedComponent || !contributionResult) {
      setFundingErrors((prev) => ({
        ...prev,
        [component.id]: errorMsg || 'Error al procesar el aporte.',
      }));
      return;
    }

    // Payment fields will be uploaded after the transfer by the user in the "Mis Aportes" tab
    contributionResult.payment_ticket = '';
    contributionResult.payment_bank = '';

    // Use the project's own payment alias as the destination if set, otherwise fallback to the generated one
    if (project.payment_alias) {
      contributionResult.company_alias = project.payment_alias;
    }

    // Success! Notify parent component
    onAddContribution(contributionResult, updatedComponent);

    // Clear form inputs
    setFundingInputs((prev) => ({
      ...prev,
      [component.id]: { quantity: '', amount: '', paymentTicket: '', paymentBank: '' },
    }));
  };

  const handleAddComponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newItemName || !newItemUnitPrice || !newItemQuantity) {
      setFormError('Por favor complete todos los campos.');
      return;
    }

    const price = parseFloat(newItemUnitPrice);
    const qty = parseInt(newItemQuantity);

    if (isNaN(price) || price <= 0) {
      setFormError('El precio unitario debe ser mayor que cero.');
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      setFormError('La cantidad debe ser mayor que cero.');
      return;
    }

    // Determine allow_partial logic: unit_price > 100000 and quantity < 3
    const allowPartial = price > 100000 && qty < 3;

    const newComponent: ProjectComponent = {
      id: `comp-${Math.random().toString(36).substring(2, 9)}`,
      project_id: project.id,
      name: newItemName.trim(),
      unit_price: price,
      quantity: qty,
      remaining_quantity: qty,
      funded_amount: 0,
      allow_partial: allowPartial,
      total_price: price * qty,
    };

    onAddComponent(newComponent);

    // Reset Form
    setNewItemName('');
    setNewItemUnitPrice('');
    setNewItemQuantity('');
    setShowAddComponentForm(false);
  };

  // Check permissions to add/delete components
  const isOwnerOrAdmin = activeUser?.role === 'admin' || activeUser?.id === project.owner_id;

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'construction': return 'Infraestructura / Obra';
      case 'party': return 'Fiesta / Celebración';
      case 'event': return 'Evento Social';
      default: return 'Otro';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Project Banner Hero / Propaganda */}
      {project.banner_url && (
        <div className="w-full h-48 md:h-64 rounded-3xl overflow-hidden border border-slate-200/60 shadow-sm relative group bg-slate-900">
          <img 
            src={project.banner_url} 
            alt={`Banner de ${project.name}`} 
            className="w-full h-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as any).src = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=400&auto=format&fit=crop&q=80';
            }}
          />
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-900/10 to-transparent"></div>
          
          {/* Metadata/Propaganda indicator */}
          <div className="absolute top-4 right-4 bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider border border-white/20 shadow-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Propaganda del Proyecto</span>
          </div>

          {/* Banner text info display for more context */}
          <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none hidden sm:block">
            <span className="bg-blue-600/90 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wide">
              Información del Evento
            </span>
            <p className="text-[11px] text-slate-200 mt-1.5 max-w-xl font-medium drop-shadow-sm leading-relaxed">
              Carga tus aportes abajo para ayudar a financiar el proyecto "{project.name}". ¡Cada aporte cuenta!
            </p>
          </div>
        </div>
      )}
      
      {/* Back & Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-4">
          <button 
            onClick={onBackToList}
            className={`mt-1 p-2 bg-white border border-slate-200 ${palette.hoverBorder} text-slate-600 ${palette.footerText} rounded-xl transition cursor-pointer shrink-0 shadow-xs`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {project.avatar_url && (
            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-100 shadow-xs mt-1">
              <img 
                src={project.avatar_url} 
                alt={project.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${palette.badgeBg}`}>
                {getCategoryLabel(project.category)}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                ID: {project.id}
              </span>
              
              {/* Validity Status Badges */}
              {project.is_deleted ? (
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md border border-red-200">
                  🗑️ Archivada (Eliminación Lógica)
                </span>
              ) : !project.is_approved ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse">
                  ⚠️ Pendiente OK de Administración (No Vigente)
                </span>
              ) : isExpired ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  ⌛ Fuera de vigencia (Finalizado)
                </span>
              ) : !isStarted ? (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  📅 Programado (Inicia el {project.start_date.split('-').reverse().join('/')})
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ✓ Vigente (Activo)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{project.name}</h1>
              {isOwnerOrAdmin && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(project)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                  title="Configurar/Modificar datos del proyecto"
                >
                  <Settings className="w-5.5 h-5.5" />
                </button>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">{project.description}</p>
            
            {/* Payment Info Badges */}
            {(project.payment_alias || project.payment_cbu) && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 items-center p-3.5 bg-amber-50/30 rounded-xl border border-amber-100/50 max-w-2xl">
                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wide block">
                  📍 Transferir aportes a:
                </span>
                <div className="flex flex-wrap gap-2">
                  {project.payment_alias && (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-2xs">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase">Alias:</span>
                      <span className="text-[11px] font-bold text-slate-700 font-mono select-all bg-slate-50 px-1 py-0.5 rounded">{project.payment_alias}</span>
                    </div>
                  )}
                  {project.payment_cbu && (
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-2xs">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase">CBU/CVU:</span>
                      <span className="text-[11px] font-bold text-slate-700 font-mono select-all bg-slate-50 px-1 py-0.5 rounded">{project.payment_cbu}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {isOwnerOrAdmin && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setShowReportModal(true)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4 text-slate-300" />
              <span>Reporte e Inventario</span>
            </button>
            <button
              onClick={() => setShowAddComponentForm(!showAddComponentForm)}
              className={`${palette.accentButtonBg} text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs`}
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Requerimiento</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Component Form (Drawer/Card) */}
      {showAddComponentForm && (
        <div className={`${palette.formBg} border ${palette.formBorder} p-6 rounded-2xl animate-slide-down`}>
          <h3 className={`font-bold ${palette.formLabel} text-sm tracking-wide uppercase mb-4 flex items-center gap-2`}>
            <Plus className="w-4 h-4" /> Agregar Nuevo Requerimiento / Insumo
          </h3>
          <form onSubmit={handleAddComponentSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-[10px] font-bold ${palette.formLabel} uppercase mb-1`}>Nombre del Insumo / Servicio</label>
              <input
                type="text"
                placeholder="Ej. Cemento, DJ, Alquiler"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className={`w-full text-xs bg-white px-3.5 py-2.5 border ${palette.formBorder} rounded-xl focus:outline-hidden ${palette.formInputFocus}`}
              />
            </div>
            <div>
              <label className={`block text-[10px] font-bold ${palette.formLabel} uppercase mb-1`}>Precio Unitario ($ ARS)</label>
              <input
                type="number"
                placeholder="Ej. 15000"
                value={newItemUnitPrice}
                onChange={(e) => setNewItemUnitPrice(e.target.value)}
                className={`w-full text-xs bg-white px-3.5 py-2.5 border ${palette.formBorder} rounded-xl focus:outline-hidden ${palette.formInputFocus}`}
              />
            </div>
            <div>
              <label className={`block text-[10px] font-bold ${palette.formLabel} uppercase mb-1`}>Cantidad Requerida</label>
              <input
                type="number"
                placeholder="Ej. 100"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                className={`w-full text-xs bg-white px-3.5 py-2.5 border ${palette.formBorder} rounded-xl focus:outline-hidden ${palette.formInputFocus}`}
              />
            </div>
            
            {formError && (
              <div className="md:col-span-3 text-xs text-red-600 font-medium">
                {formError}
              </div>
            )}

            <div className="md:col-span-3 flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddComponentForm(false)}
                className="text-slate-600 hover:bg-slate-100 text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`${palette.accentButtonBg} text-white text-xs font-bold py-2 px-5 rounded-xl transition cursor-pointer`}
              >
                Guardar Insumo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Info + Component List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Lg: 8) - Requirements list */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Insumos y Componentes Requeridos ({projectComponents.length})
          </h2>

          <div className="space-y-4">
            {projectComponents.length === 0 ? (
              <div className="text-center p-8 bg-white border border-dashed border-slate-200 rounded-2xl">
                <p className="text-xs text-slate-400 font-medium">No hay requerimientos cargados para este proyecto.</p>
              </div>
            ) : (
              projectComponents.map((component) => {
                const isFunded = component.remaining_quantity <= 0.0001;
                const progressLocal = component.total_price > 0 
                  ? Math.min(100, Math.round(((component.total_price - (component.remaining_quantity * component.unit_price)) / component.total_price) * 100)) 
                  : 0;

                const inputState = fundingInputs[component.id] || { quantity: '', amount: '' };
                const error = fundingErrors[component.id];

                return (
                  <div 
                    key={component.id}
                    className={`bg-white rounded-2xl border transition-all p-5 md:p-6 flex flex-col md:flex-row justify-between gap-6 ${
                      isFunded 
                        ? 'border-emerald-100 bg-emerald-50/10' 
                        : 'border-slate-100 hover:border-blue-100'
                    }`}
                  >
                    
                    {/* Component Info */}
                    <div className="flex-1 space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
                            {component.name}
                            {isFunded && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Financidado
                              </span>
                            )}
                          </h4>
                          
                          {/* Financial Meta Info */}
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            Precio unitario: <span className="font-semibold text-slate-700">${component.unit_price.toLocaleString('es-AR')}</span> | Cantidad: <span className="font-semibold text-slate-700">{component.quantity}</span>
                          </p>
                        </div>

                        {/* Delete button (Admin or project creator only) */}
                        {isOwnerOrAdmin && (
                          <button
                            onClick={() => onDeleteComponent(component.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition shrink-0 cursor-pointer"
                            title="Eliminar requerimiento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Partial / Fractional Funding Tag */}
                      {component.allow_partial && (
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-md border border-amber-200/50">
                          <Coins className="w-3.5 h-3.5 text-amber-600" />
                          <span>Aporte Fraccional Autorizado (Unitario &gt; $100.000 / Cantidad &lt; 3)</span>
                        </div>
                      )}

                      {/* Individual Component Progress */}
                      <div className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100/60">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">Financiado:</span>
                          <span className="font-bold text-slate-700">{progressLocal}%</span>
                        </div>
                        <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isFunded ? 'bg-emerald-500' : palette.headerBg}`}
                            style={{ width: `${progressLocal}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                          <span>Requerido: ${component.total_price.toLocaleString('es-AR')}</span>
                          <span className={`font-semibold ${palette.progressText}`}>Restante: ${(component.remaining_quantity * component.unit_price).toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Funding Interaction Forms */}
                    <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6 flex flex-col justify-center">
                      {isFunded ? (
                        <div className="text-center py-4 text-emerald-600 flex flex-col items-center">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          <span className="text-xs font-bold mt-1">¡Totalmente Cubierto!</span>
                        </div>
                      ) : !isProjectActive ? (
                        <div className="text-center py-4 px-3 bg-rose-50/50 border border-rose-100 rounded-xl flex flex-col items-center gap-2">
                          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
                          <div>
                            <span className="text-[11px] font-bold text-rose-700 block uppercase tracking-wide">Aportes Deshabilitados</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5 leading-normal">
                              {project.is_deleted 
                                ? 'El proyecto ha sido archivado.' 
                                : isExpired 
                                ? 'El proyecto ha finalizado su vigencia.' 
                                : 'El proyecto está programado y aún no ha comenzado.'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={(e) => handleFundSubmit(e, component)} className="space-y-3">
                          {component.allow_partial ? (
                            // Partial Input Form
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Monto de tu Aporte ($)</label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                <input
                                  type="number"
                                  placeholder="Ingresa importe"
                                  value={inputState.amount}
                                  onChange={(e) => handleInputChange(component.id, 'amount', e.target.value)}
                                  max={component.remaining_quantity * component.unit_price}
                                  className={`w-full text-xs font-semibold pl-7 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden ${palette.formInputFocus}`}
                                />
                              </div>
                            </div>
                          ) : (
                            // Quantity Stock Purchase Form
                            <div>
                              <div className="flex justify-between mb-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cantidad a comprar</label>
                                <span className="text-[10px] text-slate-400">Disp: {Math.floor(component.remaining_quantity)} un.</span>
                              </div>
                              <input
                                type="number"
                                placeholder={`1 a ${Math.floor(component.remaining_quantity)}`}
                                value={inputState.quantity}
                                onChange={(e) => handleInputChange(component.id, 'quantity', e.target.value)}
                                min="1"
                                max={Math.floor(component.remaining_quantity)}
                                className={`w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden ${palette.formInputFocus}`}
                              />
                            </div>
                          )}

                          {/* Selector de Medio de Pago */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Medio de Pago</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedContributionMethod(prev => ({ ...prev, [component.id]: 'transfer' }))}
                                className={`text-[10px] font-bold py-1.5 px-2 rounded-lg border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                                  (selectedContributionMethod[component.id] || 'transfer') === 'transfer'
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                🏦 Transf. Bancaria
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedContributionMethod(prev => ({ ...prev, [component.id]: 'mercadopago' }))}
                                className={`text-[10px] font-bold py-1.5 px-2 rounded-lg border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                                  selectedContributionMethod[component.id] === 'mercadopago'
                                    ? 'bg-sky-50 border-sky-300 text-sky-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                💳 Mercado Pago
                              </button>
                            </div>
                          </div>

                          {/* Payment information instructions */}
                          {(selectedContributionMethod[component.id] || 'transfer') === 'transfer' ? (
                            <div className="border border-amber-100 rounded-xl p-3 bg-amber-50/25 space-y-2 mt-2">
                              <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                Instrucciones de Pago (Manual)
                              </span>
                              <p className="text-[10px] text-slate-600 leading-normal">
                                Al presionar <strong>Aportar e Inscribirse</strong> registrarás tu intención de aporte para este insumo. 
                                Luego, podrás ver los datos bancarios, realizar la transferencia y <strong>cargar el comprobante de pago</strong> desde la pestaña <strong>"Mis Aportes"</strong>.
                              </p>
                              <div className="text-[9px] text-amber-700 bg-amber-500/10 rounded p-1.5 font-medium">
                                ⚠️ Tendrás un plazo de <strong>24 horas</strong> para cargar el comprobante y que el administrador lo valide.
                              </div>
                            </div>
                          ) : (
                            <div className="border border-sky-100 rounded-xl p-3 bg-sky-50/25 space-y-2 mt-2">
                              <span className="block text-[10px] font-bold text-sky-800 uppercase tracking-wide flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span>
                                Acreditación Online Instantánea
                              </span>
                              <p className="text-[10px] text-slate-600 leading-normal">
                                Al presionar <strong>Pagar con Mercado Pago</strong>, se abrirá la pasarela segura para abonar con tarjeta, dinero en cuenta o transferencia. El aporte quedará <strong>aprobado de forma inmediata</strong>.
                              </p>
                            </div>
                          )}

                          {error && (
                            <p className="text-[10px] font-semibold text-red-500 leading-tight bg-red-50 p-2 rounded-md border border-red-100 flex items-start gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                              <span>{error}</span>
                            </p>
                          )}

                          <button
                            type="submit"
                            className={`w-full font-bold text-xs py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer ${
                              selectedContributionMethod[component.id] === 'mercadopago'
                                ? 'bg-sky-500 hover:bg-sky-600 text-white'
                                : `${palette.accentButtonBg} text-white`
                            }`}
                          >
                            <Ticket className="w-4 h-4" />
                            <span>
                              {selectedContributionMethod[component.id] === 'mercadopago'
                                ? 'Pagar con Mercado Pago'
                                : 'Aportar e Inscribirse'}
                            </span>
                          </button>
                        </form>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (Lg: 4) - Project aggregates & contributions log */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Progression Dashboard Panel */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5">
              Tablero de Progreso del Proyecto
            </h3>

            {/* Circular or percentage representation */}
            <div className={`flex items-center gap-4 ${palette.formBg} p-4 rounded-xl border ${palette.formBorder}`}>
              <div className={`w-16 h-16 rounded-full ${palette.accentButtonBg} text-white font-black flex items-center justify-center text-lg shadow-sm shrink-0`}>
                {progressPercent}%
              </div>
              <div>
                <p className={`text-xs font-extrabold ${palette.formLabel}`}>Progreso Total Recaudado</p>
                <p className={`text-[11px] ${palette.progressText} mt-0.5 leading-relaxed`}>
                  Financiando {components.filter(c => c.project_id === project.id && c.remaining_quantity <= 0.0001).length} de {components.filter(c => c.project_id === project.id).length} requerimientos totales.
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/40">
              <div 
                className={`${palette.progressBarGradient} h-full rounded-full transition-all duration-500`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {/* Aggregate values list */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between text-slate-500 border-b border-slate-50 pb-2">
                <span className="font-medium">Presupuesto Estimado</span>
                <span className="font-extrabold text-slate-800">${totalCost.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-slate-500 border-b border-slate-50 pb-2">
                <span className="font-medium text-emerald-600">Total Aportado</span>
                <span className="font-extrabold text-emerald-700">${totalFunded.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span className={`font-medium ${palette.footerText}`}>Pendiente de Financiar</span>
                <span className={`font-extrabold ${palette.metaTotalText}`}>${totalRemaining.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          {/* Crowdfunding Service & OK Final Panel */}
          <div className={`rounded-2xl border p-6 space-y-4 shadow-sm ${project.is_approved ? 'bg-emerald-50/10 border-emerald-200' : 'bg-amber-50/10 border-amber-200'}`}>
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Coins className={`w-4 h-4 ${project.is_approved ? 'text-emerald-600' : 'text-amber-600'}`} />
                Vigencia y Servicio de Crowdfounding
              </span>
              {project.is_approved ? (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">OK Vigente</span>
              ) : (
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 animate-pulse shrink-0">Pendiente OK</span>
              )}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-600 border-b border-slate-50 pb-1.5">
                <span className="font-medium text-slate-500">Costo Total del Proyecto</span>
                <span className="font-bold text-slate-800">${totalCost.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 border-b border-slate-50 pb-1.5">
                <span className="font-medium text-slate-500">
                  TK Servicio{activeUser?.role === 'admin' ? ` (${adminFeePercent}%)` : ''}
                </span>
                <div className="text-right">
                  <span className="font-bold text-slate-800 block">${Math.max(adminFeeMin, Math.min(adminFeeMax, totalCost * (adminFeePercent / 100))).toLocaleString('es-AR')}</span>
                  {activeUser?.role === 'admin' && (
                    <span className="text-[8px] text-slate-400 block font-semibold">
                      (Mín ${adminFeeMin >= 1000 ? `${(adminFeeMin / 1000)}k` : adminFeeMin} / Máx ${adminFeeMax >= 1000000 ? `${(adminFeeMax / 1000000)}M` : adminFeeMax >= 1000 ? `${(adminFeeMax / 1000)}k` : adminFeeMax})
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-slate-600 leading-normal space-y-2">
                {project.is_approved ? (
                  <p className="text-emerald-700 font-medium">
                    ✓ Este proyecto ha sido habilitado por la administración tras verificar el pago del servicio de crowdfunding.
                  </p>
                ) : (
                  <>
                    <p>
                      Para habilitar la vigencia y recibir aportes, se debe abonar el servicio realizando una transferencia al alias:
                    </p>
                    <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 font-mono text-center text-slate-800 select-all font-bold tracking-wide">
                      danielschafer.mp
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Cuando el administrador (Daniel Schafer) reciba la transferencia de <strong>${Math.max(adminFeeMin, Math.min(adminFeeMax, totalCost * (adminFeePercent / 100))).toLocaleString('es-AR')}</strong>, otorgará el OK final de vigencia.
                    </p>
                  </>
                )}
              </div>

              {!project.is_approved && (activeUser?.id === project.owner_id || activeUser?.role === 'admin') && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const fee = Math.max(adminFeeMin, Math.min(adminFeeMax, totalCost * (adminFeePercent / 100)));
                      setActiveMpPayment({
                        type: 'tk_fee',
                        amount: fee
                      });
                      onSendAdminEmail?.('payment_intent', {
                        projectId: project.id,
                        amount: fee
                      });
                    }}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-[11px] py-2.5 px-3 rounded-xl transition cursor-pointer text-center shadow-xs flex items-center justify-center gap-1.5"
                  >
                    Pagar TK Servicio con Mercado Pago
                  </button>
                  <p className="text-[9px] text-slate-400 mt-1 text-center">
                    Simula la pasarela de Mercado Pago para habilitar la campaña instantáneamente.
                  </p>
                </div>
              )}

              {/* Admin Direct Approval buttons inside Detail view */}
              {activeUser?.role === 'admin' && (
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  {!project.is_approved ? (
                    <button
                      onClick={() => onToggleProjectApproval?.(project.id, true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl transition cursor-pointer text-center shadow-xs"
                    >
                      Dar OK Final (Aprobar)
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleProjectApproval?.(project.id, false)}
                      className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 font-bold text-[11px] py-2 px-3 rounded-xl transition cursor-pointer text-center"
                    >
                      Denegar / Revocar OK
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Configuration & Validity Management (Owner or Admin) */}
          {isOwnerOrAdmin && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Vigencia y Estado
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center justify-between">
                    <span>Fecha de Inicio</span>
                    {project.is_approved && (
                      <span className="text-[8px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-extrabold uppercase font-sans">Congelado (Vigente)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    disabled={project.is_approved === true}
                    value={editedStartDate}
                    onChange={(e) => setEditedStartDate(e.target.value)}
                    className={`w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-mono bg-white ${
                      project.is_approved ? 'opacity-70 bg-slate-50 cursor-not-allowed border-amber-200' : ''
                    }`}
                  />
                  {project.is_approved && (
                    <p className="text-[9px] text-slate-400 mt-1">La fecha de inicio no se puede modificar porque el proyecto está vigente.</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    min={editedStartDate}
                    value={editedEndDate}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-mono bg-white"
                  />
                </div>
                <div className="pt-1">
                  <button
                    onClick={handleUpdateProjectDates}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Guardar Fechas de Vigencia
                  </button>
                  {dateUpdateSuccess && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1.5 text-center">✓ Fechas de vigencia actualizadas con éxito.</p>
                  )}
                  {dateUpdateError && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1.5 text-center">✗ {dateUpdateError}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3.5 space-y-3">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-700">Estado del Proyecto</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {project.is_deleted 
                      ? 'Este proyecto ha sido archivado (eliminado lógicamente).' 
                      : 'El owner puede eliminarlo lógicamente. Solo el Administrador puede restaurarlo.'}
                  </p>
                </div>

                <div className="flex gap-2">
                  {!project.is_deleted ? (
                    <button
                      onClick={handleSoftDelete}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Lógicamente (Archivar)</span>
                    </button>
                  ) : (
                    activeUser?.role === 'admin' ? (
                      <button
                        onClick={handleRestore}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs animate-pulse"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Restaurar Proyecto (Admin)</span>
                      </button>
                    ) : (
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center text-[10px] font-medium text-slate-500 leading-normal">
                        🔒 Solo el **Administrador** (Daniel Schafer) puede restaurar este proyecto archivado.
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Admin Validation Section (Visible only to Project Creator/Admin) */}
          {isOwnerOrAdmin && (
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 md:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Panel de Validación (Admin)
                </h3>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-sm border border-amber-500/30 uppercase">
                  Pendientes ({projectContributions.filter(c => (!c.status || c.status === 'pending') && c.payment_ticket).length})
                </span>
              </div>
              
              <p className="text-[11px] text-slate-400 leading-normal">
                Verifica los comprobantes de transferencia de aportes. Tienes 24hs para dar el OK final o se cancelará automáticamente.
              </p>

              {projectContributions.filter(c => (!c.status || c.status === 'pending') && c.payment_ticket).length === 0 ? (
                <div className="text-center py-4 bg-slate-800/40 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400">No hay aportes pendientes de validación con comprobante cargado.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {projectContributions.filter(c => (!c.status || c.status === 'pending') && c.payment_ticket).map((contrib) => {
                    const compName = components.find((c) => c.id === contrib.component_id)?.name || 'Insumo';
                    
                    // Calculate remaining time in hours/minutes
                    const createdTime = new Date(contrib.created_at).getTime();
                    const now = new Date().getTime();
                    const diffMs = (24 * 60 * 60 * 1000) - (now - createdTime);
                    const hoursLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
                    const minutesLeft = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));

                    return (
                      <div key={contrib.id} className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate">
                            <p className="font-bold text-slate-200 truncate">{contrib.backer_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{contrib.backer_email}</p>
                          </div>
                          <span className="font-black text-emerald-400 text-sm shrink-0">
                            ${contrib.amount.toLocaleString('es-AR')}
                          </span>
                        </div>

                        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5 text-[11px]">
                          <p className="text-slate-300">
                            Insumo: <strong className="text-white">{compName}</strong> ({contrib.quantity_bought % 1 === 0 ? contrib.quantity_bought : contrib.quantity_bought.toFixed(3)} u.)
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-300">Comprobante / Ticket:</span>
                            <span className="font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded text-[10px]">{contrib.payment_ticket || 'No especificado'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-300">Entidad / Banco:</span>
                            <span className="text-slate-200 font-medium">{contrib.payment_bank || 'No especificado'}</span>
                          </div>
                        </div>

                        {/* Countdown Timer */}
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          <span>Plazo de validación: </span>
                          <span className="font-bold text-amber-400">{hoursLeft}h {minutesLeft}m restantes</span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => onApproveContribution(contrib.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10.5px] py-1.5 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Validar (Dar OK)</span>
                          </button>
                          <button
                            onClick={() => onRejectContribution(contrib.id)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10.5px] py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                            title="Rechazar y anular"
                          >
                            <span>Anular</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Contributions Feed List */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-50 pb-2.5">
              Historial de Aportes ({projectContributions.length})
            </h3>

            {projectContributions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400 font-medium">Nadie ha aportado aún. ¡Sé el primero en participar!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
                {projectContributions.slice().reverse().map((contrib) => {
                  const compName = components.find((c) => c.id === contrib.component_id)?.name || 'Insumo';
                  const isNulo = contrib.status === 'rejected' || contrib.status === 'expired';
                  
                  return (
                    <div 
                      key={contrib.id} 
                      className={`p-3.5 rounded-xl border transition ${
                        isNulo 
                          ? 'bg-slate-50/50 border-slate-150 opacity-60 line-through decoration-slate-400/50' 
                          : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                      } text-xs space-y-2`}
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span className="truncate flex items-center gap-1.5">
                          {contrib.backer_name}
                          {isNulo && <span className="text-[9px] font-bold text-red-600 uppercase tracking-wide bg-red-50 px-1 py-0.5 rounded border border-red-100">Nulo / Cancelado</span>}
                        </span>
                        <span className={`font-bold shrink-0 ${isNulo ? 'text-slate-400' : palette.progressText}`}>
                          ${contrib.amount.toLocaleString('es-AR')}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-500 leading-relaxed">
                        Aportó para <strong className="text-slate-700">{compName}</strong> ({contrib.quantity_bought % 1 === 0 ? contrib.quantity_bought : contrib.quantity_bought.toFixed(3)} u.).
                      </div>

                      {/* Display Ticket & Emisora Empleada */}
                      {(contrib.payment_ticket || contrib.payment_bank) && (
                        <div className="text-[10px] text-slate-500 bg-white/75 rounded-lg p-2 border border-slate-200/40 flex flex-wrap justify-between gap-1.5 font-medium">
                          <span>Comprobante: <strong className="font-mono text-slate-700">{contrib.payment_ticket || 'S/D'}</strong></span>
                          <span>Entidad: <strong className="text-slate-700">{contrib.payment_bank || 'S/D'}</strong></span>
                        </div>
                      )}
                      
                      {/* Status and Coupon visual stamp */}
                      <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-200/60 pt-2 mt-1.5 text-slate-400">
                        <div className="flex items-center gap-1">
                          {contrib.status === 'approved' && (
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-200/50 uppercase tracking-wide">✓ Verificado</span>
                          )}
                          {(!contrib.status || contrib.status === 'pending') && (
                            <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wide animate-pulse">⏰ Pendiente</span>
                          )}
                          {contrib.status === 'expired' && (
                            <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-wide">⌛ Expirado</span>
                          )}
                          {contrib.status === 'rejected' && (
                            <span className="bg-rose-50 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-250 uppercase tracking-wide">✗ Rechazado</span>
                          )}
                        </div>
                        <span className="text-amber-700 font-bold tracking-tight">{contrib.company_alias}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      <ProjectReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        project={project}
        components={components}
        contributions={contributions}
      />

      {activeMpPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
            
            {/* Header: Mercado Pago Branding */}
            <div className="bg-[#009EE3] p-5 text-white relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight">Mercado Pago</span>
                  <span className="bg-white/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Checkout Pro</span>
                </div>
                <button
                  onClick={() => {
                    setActiveMpPayment(null);
                    setMpProcessing(false);
                    setMpSuccess(false);
                  }}
                  className="text-white hover:text-slate-100 bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <div className="mt-4">
                <span className="text-white/70 text-xs font-semibold uppercase tracking-wider block">Total a pagar:</span>
                <span className="text-3xl font-black">${activeMpPayment.amount.toLocaleString('es-AR')}</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              
              {!mpProcessing && !mpSuccess ? (
                <>
                  <div className="space-y-3.5">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Concepto del Pago</span>
                      <p className="text-xs font-bold text-slate-700 leading-normal">
                        {activeMpPayment.type === 'tk_fee' 
                          ? `TK Servicio - Activación y vigencia de la campaña del proyecto "${project.name}"`
                          : `Aporte para el insumo "${activeMpPayment.componentName}"`
                        }
                      </p>
                      {activeMpPayment.quantityBought && activeMpPayment.quantityBought > 0 ? (
                        <p className="text-[11px] text-slate-500">
                          Cantidad adquirida: <strong>{activeMpPayment.quantityBought} unidades</strong>
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Elige cómo pagar (Simulado)</span>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-150 transition cursor-pointer">
                          <input type="radio" defaultChecked name="payment_mock" id="pm_card" className="accent-[#009EE3]" />
                          <label htmlFor="pm_card" className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 cursor-pointer">
                            <span>💳 Tarjeta de Crédito o Débito</span>
                            <span className="text-[10px] text-slate-400 font-mono">Visa, Master...</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-150 transition cursor-pointer">
                          <input type="radio" name="payment_mock" id="pm_wallet" className="accent-[#009EE3]" />
                          <label htmlFor="pm_wallet" className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 cursor-pointer">
                            <span>📱 Dinero en cuenta Mercado Pago</span>
                            <span className="text-[10px] text-emerald-600 font-extrabold uppercase text-right">Acreditación Al Instante</span>
                          </label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-150 transition cursor-pointer">
                          <input type="radio" name="payment_mock" id="pm_debin" className="accent-[#009EE3]" />
                          <label htmlFor="pm_debin" className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 cursor-pointer">
                            <span>🏦 Transferencia (CVU / DEBIN)</span>
                            <span className="text-[10px] text-slate-400 font-mono">Inmediata</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setMpProcessing(true);
                        const paymentId = 'MP-TRANS-' + Math.floor(100000000 + Math.random() * 900000000);
                        setGeneratedMpPaymentId(paymentId);
                        setTimeout(() => {
                          setMpProcessing(false);
                          setMpSuccess(true);
                          if (activeMpPayment?.type === 'tk_fee') {
                            onSendAdminEmail?.('payment_result', {
                              projectId: project.id,
                              amount: activeMpPayment.amount,
                              isSuccess: true,
                              paymentId: paymentId
                            });
                          }
                        }, 2000);
                      }}
                      className="w-full bg-[#009EE3] hover:bg-[#0089c7] text-white font-bold text-xs py-3 rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border-0"
                    >
                      <Ticket className="w-4 h-4 text-white" />
                      <span>Simular Pago Exitoso</span>
                    </button>
                    <button
                      onClick={() => setActiveMpPayment(null)}
                      className="w-full text-slate-500 hover:bg-slate-100 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer border-0 bg-transparent"
                    >
                      Cancelar y Volver
                    </button>
                  </div>
                </>
              ) : mpProcessing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 border-4 border-[#009EE3] border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">Procesando pago de forma segura...</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Por favor no cierres la ventana</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center space-y-5">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-800">¡Pago Aprobado con Éxito!</h4>
                    <p className="text-[11px] text-slate-500">La transacción de Mercado Pago ha sido conciliada.</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl w-full text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">ID de Pago Mercado Pago</span>
                    <span className="text-xs font-mono font-bold text-slate-700">{generatedMpPaymentId || 'MP-TRANS-XXXXXX'}</span>
                  </div>

                  <button
                    onClick={handleMpPaymentComplete}
                    className="w-full bg-[#009EE3] hover:bg-[#0089c7] text-white font-bold text-xs py-3 rounded-xl transition shadow-md hover:shadow-lg cursor-pointer border-0"
                  >
                    Volver a VaquitaApp
                  </button>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 py-3.5 px-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[9px] text-slate-400 font-medium">Pago seguro encriptado SSL</span>
              <span className="text-[9px] text-slate-400 font-semibold font-mono">Ref: VAQUITA-{project.id}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
