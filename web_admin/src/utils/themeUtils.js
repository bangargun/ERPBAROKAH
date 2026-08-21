/**
 * MRIS Theme Palette Utility
 * Returns a consistent color palette object (T) for the given themeMode.
 * Used by all admin page components to achieve a professional, unified theme.
 * 
 * Themes:
 *   'dark'       — Deep navy glassmorphism (default)
 *   'soft_blue'  — Soft classic blue-sky, high-contrast, professional
 */
export function getThemePalette(themeMode) {
  const isSoftBlue = themeMode === 'soft_blue';
  const isLight = isSoftBlue; // legacy compat alias — many components check `isLight`

  if (isSoftBlue) return {
    // ── Backgrounds ──
    appBg:          '#ddeeff',
    pageBg:         '#ddeeff',
    cardBg:         '#ffffff',
    cardBg2:        '#eaf4ff',
    inputBg:        '#ffffff',
    controlBg:      '#eaf4ff',
    dropdownBg:     '#ffffff',
    hoverBg:        'rgba(30, 90, 160, 0.07)',
    tableBg:        '#ffffff',
    tableHeaderBg:  '#c7e0f9',
    tableRowHover:  'rgba(30, 90, 160, 0.06)',
    tableStripeBg:  '#eaf4ff',

    // ── Text ──
    txtPrimary:     '#0c1f3d',
    txtSecondary:   '#1e4a7c',
    txtMuted:       '#456b9a',
    txtInverse:     '#ffffff',
    txtLabel:       '#1e3a5f',

    // ── Borders ──
    border:         '#b0ccec',
    borderStrong:   '#7aaad4',
    borderHover:    '#3b82c4',
    divider:        '#c3d9f0',

    // ── Brand Accents ──
    accentGold:     '#1a6fc4',
    accentGoldHover:'#145ea8',
    accentGoldBg:   'rgba(26, 111, 196, 0.10)',
    accentGoldBorder:'rgba(26, 111, 196, 0.28)',
    accentGreen:    '#0d5fa3',
    accentGreenBg:  'rgba(13, 95, 163, 0.10)',

    // ── Semantic Colors ──
    success:        '#0a7c4e',
    successBg:      'rgba(10, 124, 78, 0.10)',
    successBorder:  'rgba(10, 124, 78, 0.25)',
    danger:         '#c0152b',
    dangerBg:       'rgba(192, 21, 43, 0.10)',
    dangerBorder:   'rgba(192, 21, 43, 0.25)',
    warning:        '#b45309',
    warningBg:      'rgba(180, 83, 9, 0.10)',
    warningBorder:  'rgba(180, 83, 9, 0.25)',
    info:           '#1a6fc4',
    infoBg:         'rgba(26, 111, 196, 0.10)',
    infoBorder:     'rgba(26, 111, 196, 0.25)',

    // ── Navigation / Active ──
    navActiveBg:    'linear-gradient(135deg, #1a6fc4 0%, #0d5295 100%)',
    navActiveTxt:   '#ffffff',
    navActiveShadow:'rgba(26, 111, 196, 0.30)',
    primaryBtn:     'linear-gradient(135deg, #1a6fc4 0%, #0d5295 100%)',
    primaryBtnShadow:'rgba(26, 111, 196, 0.25)',

    // ── Shadows ──
    shadowSm:       '0 1px 4px rgba(10, 40, 80, 0.10)',
    shadowMd:       '0 4px 16px rgba(10, 40, 80, 0.13)',
    shadowLg:       '0 8px 32px rgba(10, 40, 80, 0.18)',

    // ── Chart / Tooltip ──
    tooltipBg:      '#0c1f3d',
    tooltipBorder:  '#1a6fc4',
    tooltipColor:   '#ffffff',
    gridColor:      '#c7e0f9',
    axisColor:      '#456b9a',
    chartColors:    ['#1a6fc4', '#0a7c4e', '#b45309', '#7c3aed', '#c0152b', '#0891b2'],

    // ── Tab Styles ──
    tabActiveBg:    'linear-gradient(135deg, #1a6fc4, #0d5295)',
    tabActiveColor: '#ffffff',
    tabInactiveBg:  '#eaf4ff',
    tabInactiveColor:'#1e4a7c',
    tabBorder:      '#b0ccec',

    // ── Professional Typography Scale ──
    fsTitle:        'var(--fs-2xl)',
    fsSubtitle:     'var(--fs-sm)',
    fsBody:         'var(--fs-base)',
    fsBadge:        'var(--fs-xs)',
    fsCaption:      'var(--fs-xs)',
    borderUltraThin:'1px solid rgba(30, 90, 160, 0.08)',

    // ── Card shadow ──
    cardShadow:     '0 2px 8px rgba(10,40,80,0.12), 0 0 0 1px rgba(30,90,160,0.07)',
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

    // ── Professional Typography Scale ──
    fsTitle:        'var(--fs-2xl)',
    fsSubtitle:     'var(--fs-sm)',
    fsBody:         'var(--fs-base)',
    fsBadge:        'var(--fs-xs)',
    fsCaption:      'var(--fs-xs)',
    borderUltraThin:'1px solid rgba(255, 255, 255, 0.06)',

    // ── Card shadow ──
    cardShadow:     '0 2px 8px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04)',
  };
}
