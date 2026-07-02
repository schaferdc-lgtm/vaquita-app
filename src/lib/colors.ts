import { ProjectCategory } from '../types';

export interface ProjectPalette {
  headerBg: string;
  hoverBorder: string;
  badgeBg: string;
  iconContainer: string;
  iconColor: string;
  titleHover: string;
  itemsFundedBadgeBg: string;
  itemsFundedBadgeText: string;
  progressText: string;
  progressBarGradient: string;
  metaTotalText: string;
  footerText: string;
  footerHoverText: string;
  accentButtonBg: string;
  accentButtonHoverBg: string;
  formBg: string;
  formBorder: string;
  formLabel: string;
  formInputFocus: string;
}

const PALETTES: ProjectPalette[] = [
  {
    // Blue/Indigo
    headerBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    hoverBorder: 'hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/50',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
    iconContainer: 'bg-blue-50/60 group-hover:bg-blue-100/70',
    iconColor: 'text-blue-600',
    titleHover: 'group-hover:text-blue-700',
    itemsFundedBadgeBg: 'bg-blue-50',
    itemsFundedBadgeText: 'text-blue-600',
    progressText: 'text-blue-700',
    progressBarGradient: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    metaTotalText: 'text-blue-800',
    footerText: 'text-blue-600',
    footerHoverText: 'group-hover:text-indigo-700',
    accentButtonBg: 'bg-blue-600 hover:bg-blue-700',
    accentButtonHoverBg: 'hover:bg-blue-700',
    formBg: 'bg-blue-50/50',
    formBorder: 'border-blue-200',
    formLabel: 'text-blue-800',
    formInputFocus: 'focus:border-blue-500',
  },
  {
    // Emerald/Teal (Green Theme)
    headerBg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    hoverBorder: 'hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50/50',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    iconContainer: 'bg-emerald-50/60 group-hover:bg-emerald-100/70',
    iconColor: 'text-emerald-600',
    titleHover: 'group-hover:text-emerald-700',
    itemsFundedBadgeBg: 'bg-emerald-50',
    itemsFundedBadgeText: 'text-emerald-600',
    progressText: 'text-emerald-700',
    progressBarGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    metaTotalText: 'text-emerald-800',
    footerText: 'text-emerald-600',
    footerHoverText: 'group-hover:text-teal-700',
    accentButtonBg: 'bg-emerald-600 hover:bg-emerald-700',
    accentButtonHoverBg: 'hover:bg-emerald-700',
    formBg: 'bg-emerald-50/50',
    formBorder: 'border-emerald-200',
    formLabel: 'text-emerald-800',
    formInputFocus: 'focus:border-emerald-500',
  },
  {
    // Violet/Purple (Royal Theme)
    headerBg: 'bg-gradient-to-r from-violet-500 to-fuchsia-600',
    hoverBorder: 'hover:border-violet-200 hover:shadow-lg hover:shadow-violet-50/50',
    badgeBg: 'bg-violet-50 text-violet-700 border-violet-100',
    iconContainer: 'bg-violet-50/60 group-hover:bg-violet-100/70',
    iconColor: 'text-violet-600',
    titleHover: 'group-hover:text-violet-700',
    itemsFundedBadgeBg: 'bg-violet-50',
    itemsFundedBadgeText: 'text-violet-600',
    progressText: 'text-violet-700',
    progressBarGradient: 'bg-gradient-to-r from-violet-500 to-fuchsia-600',
    metaTotalText: 'text-violet-800',
    footerText: 'text-violet-600',
    footerHoverText: 'group-hover:text-fuchsia-700',
    accentButtonBg: 'bg-violet-600 hover:bg-violet-700',
    accentButtonHoverBg: 'hover:bg-violet-700',
    formBg: 'bg-violet-50/50',
    formBorder: 'border-violet-200',
    formLabel: 'text-violet-800',
    formInputFocus: 'focus:border-violet-500',
  },
  {
    // Amber/Orange (Warm Theme)
    headerBg: 'bg-gradient-to-r from-amber-500 to-rose-500',
    hoverBorder: 'hover:border-amber-200 hover:shadow-lg hover:shadow-amber-50/50',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-100',
    iconContainer: 'bg-amber-50/60 group-hover:bg-amber-100/70',
    iconColor: 'text-amber-600',
    titleHover: 'group-hover:text-amber-700',
    itemsFundedBadgeBg: 'bg-amber-50',
    itemsFundedBadgeText: 'text-amber-600',
    progressText: 'text-amber-700',
    progressBarGradient: 'bg-gradient-to-r from-amber-500 to-rose-500',
    metaTotalText: 'text-amber-800',
    footerText: 'text-amber-600',
    footerHoverText: 'group-hover:text-rose-700',
    accentButtonBg: 'bg-amber-600 hover:bg-amber-700',
    accentButtonHoverBg: 'hover:bg-amber-700',
    formBg: 'bg-amber-50/50',
    formBorder: 'border-amber-200',
    formLabel: 'text-amber-800',
    formInputFocus: 'focus:border-amber-500',
  },
  {
    // Cyan/Sky (Sky Blue Theme)
    headerBg: 'bg-gradient-to-r from-cyan-500 to-blue-600',
    hoverBorder: 'hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-50/50',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    iconContainer: 'bg-cyan-50/60 group-hover:bg-cyan-100/70',
    iconColor: 'text-cyan-600',
    titleHover: 'group-hover:text-cyan-700',
    itemsFundedBadgeBg: 'bg-cyan-50',
    itemsFundedBadgeText: 'text-cyan-600',
    progressText: 'text-cyan-700',
    progressBarGradient: 'bg-gradient-to-r from-cyan-500 to-blue-600',
    metaTotalText: 'text-cyan-800',
    footerText: 'text-cyan-600',
    footerHoverText: 'group-hover:text-blue-700',
    accentButtonBg: 'bg-cyan-600 hover:bg-cyan-700',
    accentButtonHoverBg: 'hover:bg-cyan-700',
    formBg: 'bg-cyan-50/50',
    formBorder: 'border-cyan-200',
    formLabel: 'text-cyan-800',
    formInputFocus: 'focus:border-cyan-500',
  },
  {
    // Rose/Pink (Rose Theme)
    headerBg: 'bg-gradient-to-r from-rose-500 to-pink-600',
    hoverBorder: 'hover:border-rose-200 hover:shadow-lg hover:shadow-rose-50/50',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-100',
    iconContainer: 'bg-rose-50/60 group-hover:bg-rose-100/70',
    iconColor: 'text-rose-600',
    titleHover: 'group-hover:text-rose-700',
    itemsFundedBadgeBg: 'bg-rose-50',
    itemsFundedBadgeText: 'text-rose-600',
    progressText: 'text-rose-700',
    progressBarGradient: 'bg-gradient-to-r from-rose-500 to-pink-600',
    metaTotalText: 'text-rose-800',
    footerText: 'text-rose-600',
    footerHoverText: 'group-hover:text-pink-700',
    accentButtonBg: 'bg-rose-600 hover:bg-rose-700',
    accentButtonHoverBg: 'hover:bg-rose-700',
    formBg: 'bg-rose-50/50',
    formBorder: 'border-rose-200',
    formLabel: 'text-rose-800',
    formInputFocus: 'focus:border-rose-500',
  },
  {
    // Red/Orange (Crimson Theme)
    headerBg: 'bg-gradient-to-r from-red-500 to-orange-600',
    hoverBorder: 'hover:border-red-200 hover:shadow-lg hover:shadow-red-50/50',
    badgeBg: 'bg-red-50 text-red-700 border-red-100',
    iconContainer: 'bg-red-50/60 group-hover:bg-red-100/70',
    iconColor: 'text-red-600',
    titleHover: 'group-hover:text-red-700',
    itemsFundedBadgeBg: 'bg-red-50',
    itemsFundedBadgeText: 'text-red-600',
    progressText: 'text-red-700',
    progressBarGradient: 'bg-gradient-to-r from-red-500 to-orange-600',
    metaTotalText: 'text-red-800',
    footerText: 'text-red-600',
    footerHoverText: 'group-hover:text-orange-700',
    accentButtonBg: 'bg-red-600 hover:bg-red-700',
    accentButtonHoverBg: 'hover:bg-red-700',
    formBg: 'bg-red-50/50',
    formBorder: 'border-red-200',
    formLabel: 'text-red-800',
    formInputFocus: 'focus:border-red-500',
  },
];

export function getProjectPalette(projectId: string): ProjectPalette {
  if (!projectId) return PALETTES[0];
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTES.length;
  return PALETTES[index];
}
