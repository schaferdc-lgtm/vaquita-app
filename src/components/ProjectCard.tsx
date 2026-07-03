import React from 'react';
import { Project, ProjectComponent } from '../types';
import { Calendar, Hammer, GlassWater, Trophy, HelpCircle, ArrowRight, Layers, DollarSign, Settings } from 'lucide-react';
import { getProjectPalette } from '../lib/colors';

interface ProjectCardProps {
  key?: string;
  project: Project;
  components: ProjectComponent[];
  onSelect: () => void;
  onEdit?: (project: Project) => void;
}

export default function ProjectCard({ project, components, onSelect, onEdit }: ProjectCardProps) {
  // Get color palette for this project
  const palette = getProjectPalette(project.id);

  // Filter components belonging to this project
  const projectComponents = components.filter((c) => c.project_id === project.id);
  
  // Calculate aggregate values
  const totalCost = projectComponents.reduce((sum, c) => sum + c.total_price, 0);
  
  // Funded total is total_price minus (remaining_quantity * unit_price)
  const totalRemaining = projectComponents.reduce((sum, c) => sum + (c.remaining_quantity * c.unit_price), 0);
  const totalFunded = Math.max(0, totalCost - totalRemaining);
  
  // Progress percentage
  const progressPercent = totalCost > 0 ? Math.min(100, Math.round((totalFunded / totalCost) * 100)) : 0;

  // Counts of components
  const totalComponentsCount = projectComponents.length;
  const fullyFundedComponentsCount = projectComponents.filter((c) => c.remaining_quantity === 0).length;

  // Category Icon Selector
  const getCategoryIcon = () => {
    switch (project.category) {
      case 'construction':
        return <Hammer className={`w-5 h-5 ${palette.iconColor}`} />;
      case 'party':
        return <GlassWater className={`w-5 h-5 ${palette.iconColor}`} />;
      case 'event':
        return <Trophy className={`w-5 h-5 ${palette.iconColor}`} />;
      default:
        return <HelpCircle className={`w-5 h-5 ${palette.iconColor}`} />;
    }
  };

  const getCategoryLabel = () => {
    switch (project.category) {
      case 'construction':
        return 'Infraestructura / Obra';
      case 'party':
        return 'Fiesta / Celebración';
      case 'event':
        return 'Evento Social';
      default:
        return 'Otro';
    }
  };

  return (
    <div 
      className={`bg-white rounded-2xl border border-slate-100 ${palette.hoverBorder} transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer`}
      onClick={onSelect}
    >
      {/* Header Decoration */}
      <div className={`h-2 ${palette.headerBg}`}></div>

      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Badge & Code */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${palette.badgeBg}`}>
                {getCategoryLabel()}
              </span>
              {project.is_approved === false && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200/60 animate-pulse">
                  ⚠️ Pendiente OK
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              ID: {project.id}
            </span>
          </div>

          {/* Project Title */}
          <div className="flex items-start justify-between gap-2.5 mb-2">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className={`rounded-xl transition-colors shrink-0 overflow-hidden ${project.avatar_url ? 'w-9 h-9 border border-slate-100' : `p-2 ${palette.iconContainer}`}`}>
                {project.avatar_url ? (
                  <img 
                    src={project.avatar_url} 
                    alt={project.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : getCategoryIcon()}
              </div>
              <h3 className={`font-bold text-slate-800 ${palette.titleHover} transition-colors line-clamp-2 leading-snug flex-1`}>
                {project.name}
              </h3>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer"
                title="Configurar proyecto"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Project Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
            {project.description}
          </p>

          {/* Items Funded Badge */}
          <div className="flex items-center gap-1 text-xs text-slate-600 mb-5 bg-slate-50 p-2 rounded-xl border border-slate-100/60 w-fit">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">Ítems financiados:</span>
            <span className={`font-bold ${palette.itemsFundedBadgeText} ${palette.itemsFundedBadgeBg} px-1.5 py-0.5 rounded-sm`}>
              {fullyFundedComponentsCount} de {totalComponentsCount}
            </span>
          </div>
        </div>

        {/* Interactive progression dashboard info */}
        <div>
          <div className="flex justify-between items-end text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Progreso General</span>
            <span className={`font-extrabold ${palette.progressText}`}>{progressPercent}%</span>
          </div>
          
          {/* Beautiful progress bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-4 border border-slate-200/40">
            <div 
              className={`${palette.progressBarGradient} h-full rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <div>
              <p className="font-semibold text-slate-400 uppercase tracking-wide text-[9px]">Aportado</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                ${totalFunded.toLocaleString('es-AR')}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-400 uppercase tracking-wide text-[9px]">Meta Total</p>
              <p className={`text-xs font-bold ${palette.metaTotalText} mt-0.5`}>
                ${totalCost.toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          {/* Footer Call to action */}
          <div className={`mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs ${palette.footerText} font-semibold ${palette.footerHoverText} transition-colors`}>
            <span>Ver Requerimientos e Insumos</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
