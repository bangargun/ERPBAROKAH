/**
 * MRIS Theme Palette Utility
 * Returns a consistent color palette object (T) for the given themeMode.
 * Used by all admin page components to achieve a professional, unified theme.
 * 
 * Themes:
 *   'dark'           — Deep navy glassmorphism (default)
 *   'light'          — Clean white/slate light mode
 *   'warm_minimalist'— Deep Forest Green + Amber Gold on Off-White ground
 */
export function getThemePalette(themeMode) {
  const isWarm = themeMode === 'warm_minimalist';
  const isLight = themeMode === 'light';

  if (isWarm) return {
    // ── Backgrounds ──
    appBg:          '#faf8f5',
    pageBg:         '#faf8f5',
    cardBg:         '#ffffff',
    cardBg2:        '#f4f1ea',
    inputBg:        '#fdfcf9',
    controlBg:      '#f4f1ea',
    dropdownBg:     '#ffffff',
    hoverBg:        'rgba(20, 48, 34, 0.06)',
    tableBg:        '#ffffff',
    tableHeaderBg:  '#f4f1ea',
    tableRowHover:  'rgba(217, 119, 6, 0.04)',
    tableStripeBg:  '#faf8f5',

    // ── Text ──
    txtPrimary:     '#1a2e1f',
    txtSecondary:   '#3d5445',
    txtMuted:       '#687d71',
    txtInverse:     '#faf8f5',
    txtLabel:       '#3d5445',

    // ── Borders ──
    border:         '#e0ddd5',
    borderStrong:   '#c8c0b0',
    borderHover:    '#a39580',
    divider:        '#e8e4da',

    // ── Brand Accents ──
    accentGold:     '#d97706',
    accentGoldHover:'#b45309',
    accentGoldBg:   'rgba(217, 119, 6, 0.10)',
    accentGoldBorder:'rgba(217, 119, 6, 0.28)',
    accentGreen:    '#1b5e35',
    accentGreenBg:  'rgba(27, 94, 53, 0.10)',

    // ── Semantic Colors ──
    success:        '#2d7a4f',
    successBg:      'rgba(45, 122, 79, 0.10)',
    successBorder:  'rgba(45, 122, 79, 0.25)',
    danger:         '#c0392b',
    dangerBg:       'rgba(192, 57, 43, 0.10)',
    dangerBorder:   'rgba(192, 57, 43, 0.25)',
    warning:        '#d97706',
    warningBg:      'rgba(217, 119, 6, 0.10)',
    warningBorder:  'rgba(217, 119, 6, 0.25)',
    info:           '#1b5e35',
    infoBg:         'rgba(27, 94, 53, 0.10)',
    infoBorder:     'rgba(27, 94, 53, 0.25)',

    // ── Navigation / Active ──
    navActiveBg:    'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    navActiveTxt:   '#ffffff',
    navActiveShadow:'rgba(217, 119, 6, 0.30)',
    primaryBtn:     'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    primaryBtnShadow:'rgba(217, 119, 6, 0.25)',

    // ── Shadows ──
    shadowSm:       '0 1px 4px rgba(20, 48, 34, 0.10)',
    shadowMd:       '0 4px 16px rgba(20, 48, 34, 0.12)',
    shadowLg:       '0 8px 32px rgba(20, 48, 34, 0.16)',

    // ── Chart / Tooltip ──
    tooltipBg:      '#1a2e1f',
    tooltipBorder:  '#d97706',
    tooltipColor:   '#ffffff',
    gridColor:      '#e8e4da',
    axisColor:      '#687d71',
    chartColors:    ['#d97706', '#2d7a4f', '#8b5e3c', '#4a7c59', '#c0392b', '#6b9a74'],

    // ── Tab Styles ──
    tabActiveBg:    'linear-gradient(135deg, #d97706, #b45309)',
    tabActiveColor: '#ffffff',
    tabInactiveBg:  '#f4f1ea',
    tabInactiveColor:'#3d5445',
    tabBorder:      '#e0ddd5',
  };

  if (isLight) return {
    appBg:          '#f1f5f9',
    pageBg:         '#f1f5f9',
    cardBg:         '#ffffff',
    cardBg2:        '#f8fafc',
    inputBg:        '#ffffff',
    controlBg:      '#f8fafc',
    dropdownBg:     '#ffffff',
    hoverBg:        'rgba(0, 0, 0, 0.04)',
    tableBg:        '#ffffff',
    tableHeaderBg:  '#f8fafc',
    tableRowHover:  'rgba(217, 119, 6, 0.04)',
    tableStripeBg:  '#f8fafc',

    txtPrimary:     '#0f172a',
    txtSecondary:   '#475569',
    txtMuted:       '#64748b',
    txtInverse:     '#f8fafc',
    txtLabel:       '#374151',

    border:         '#e2e8f0',
    borderStrong:   '#cbd5e1',
    borderHover:    '#94a3b8',
    divider:        '#e2e8f0',

    accentGold:     '#d97706',
    accentGoldHover:'#b45309',
    accentGoldBg:   'rgba(217, 119, 6, 0.10)',
    accentGoldBorder:'rgba(217, 119, 6, 0.25)',
    accentGreen:    '#4f46e5',
    accentGreenBg:  'rgba(79, 70, 229, 0.10)',

    success:        '#059669',
    successBg:      'rgba(5, 150, 105, 0.10)',
    successBorder:  'rgba(5, 150, 105, 0.25)',
    danger:         '#e11d48',
    dangerBg:       'rgba(225, 29, 72, 0.10)',
    dangerBorder:   'rgba(225, 29, 72, 0.25)',
    warning:        '#d97706',
    warningBg:      'rgba(217, 119, 6, 0.10)',
    warningBorder:  'rgba(217, 119, 6, 0.25)',
    info:           '#0284c7',
    infoBg:         'rgba(2, 132, 199, 0.10)',
    infoBorder:     'rgba(2, 132, 199, 0.25)',

    navActiveBg:    'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    navActiveTxt:   '#ffffff',
    navActiveShadow:'rgba(217, 119, 6, 0.25)',
    primaryBtn:     'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    primaryBtnShadow:'rgba(217, 119, 6, 0.20)',

    shadowSm:       '0 1px 3px rgba(0, 0, 0, 0.08)',
    shadowMd:       '0 4px 14px rgba(0, 0, 0, 0.10)',
    shadowLg:       '0 8px 32px rgba(0, 0, 0, 0.12)',

    tooltipBg:      '#0f172a',
    tooltipBorder:  '#d97706',
    tooltipColor:   '#ffffff',
    gridColor:      '#e2e8f0',
    axisColor:      '#94a3b8',
    chartColors:    ['#d97706', '#4f46e5', '#059669', '#0284c7', '#e11d48', '#7c3aed'],

    tabActiveBg:    'linear-gradient(135deg, #d97706, #b45309)',
    tabActiveColor: '#ffffff',
    tabInactiveBg:  '#f8fafc',
    tabInactiveColor:'#475569',
    tabBorder:      '#e2e8f0',
  };

  // Default: Dark theme
  return {
    appBg:          '#0b0f19',
    pageBg:         '#0b0f19',
    cardBg:         '#1e293b',
    cardBg2:        '#0f172a',
    inputBg:        '#0f172a',
    controlBg:      '#1e293b',
    dropdownBg:     '#0f172a',
    hoverBg:        'rgba(255, 255, 255, 0.05)',
    tableBg:        '#0f172a',
    tableHeaderBg:  '#1e293b',
    tableRowHover:  'rgba(255, 255, 255, 0.04)',
    tableStripeBg:  '#111625',

    txtPrimary:     '#f8fafc',
    txtSecondary:   '#94a3b8',
    txtMuted:       '#64748b',
    txtInverse:     '#0f172a',
    txtLabel:       '#cbd5e1',

    border:         'rgba(255, 255, 255, 0.08)',
    borderStrong:   '#334155',
    borderHover:    'rgba(255, 255, 255, 0.20)',
    divider:        '#334155',

    accentGold:     '#f59e0b',
    accentGoldHover:'#d97706',
    accentGoldBg:   'rgba(245, 158, 11, 0.15)',
    accentGoldBorder:'rgba(245, 158, 11, 0.30)',
    accentGreen:    '#6366f1',
    accentGreenBg:  'rgba(99, 102, 241, 0.15)',

    success:        '#34d399',
    successBg:      'rgba(52, 211, 153, 0.12)',
    successBorder:  'rgba(52, 211, 153, 0.30)',
    danger:         '#fb7185',
    dangerBg:       'rgba(244, 63, 94, 0.12)',
    dangerBorder:   'rgba(244, 63, 94, 0.28)',
    warning:        '#fbbf24',
    warningBg:      'rgba(245, 158, 11, 0.12)',
    warningBorder:  'rgba(245, 158, 11, 0.28)',
    info:           '#38bdf8',
    infoBg:         'rgba(56, 189, 248, 0.12)',
    infoBorder:     'rgba(56, 189, 248, 0.28)',

    navActiveBg:    'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)',
    navActiveTxt:   '#ffffff',
    navActiveShadow:'rgba(202, 138, 4, 0.35)',
    primaryBtn:     'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)',
    primaryBtnShadow:'rgba(202, 138, 4, 0.30)',

    shadowSm:       '0 1px 3px rgba(0, 0, 0, 0.30)',
    shadowMd:       '0 4px 14px rgba(0, 0, 0, 0.40)',
    shadowLg:       '0 8px 32px rgba(0, 0, 0, 0.50)',

    tooltipBg:      '#1e293b',
    tooltipBorder:  '#f59e0b',
    tooltipColor:   '#ffffff',
    gridColor:      'rgba(255, 255, 255, 0.06)',
    axisColor:      '#64748b',
    chartColors:    ['#f59e0b', '#34d399', '#38bdf8', '#818cf8', '#fb7185', '#a78bfa'],

    tabActiveBg:    'linear-gradient(135deg, #ca8a04, #a16207)',
    tabActiveColor: '#ffffff',
    tabInactiveBg:  '#1e293b',
    tabInactiveColor:'#94a3b8',
    tabBorder:      '#334155',
  };
}
