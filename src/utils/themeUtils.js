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
  const isDark = themeMode === 'dark';
  const isCalmSage = !isDark; // Default utama: Calm Sage
  const isLight = isCalmSage;

  // ── 1. Calm Sage & Soft Mint Theme (Fresh, Calm, Eye-Friendly - Default) ──
  if (isCalmSage) return {
    // ── Backgrounds ──
    appBg:          '#f3f7f4',
    pageBg:         '#f3f7f4',
    cardBg:         '#ffffff',
    cardBg2:        '#eaf2ec',
    inputBg:        '#ffffff',
    controlBg:      '#eef5f0',
    dropdownBg:     '#ffffff',
    hoverBg:        'rgba(45, 122, 91, 0.07)',
    tableBg:        '#ffffff',
    tableHeaderBg:  '#dceee3',
    tableRowHover:  'rgba(45, 122, 91, 0.05)',
    tableStripeBg:  '#f5faf7',

    // ── Text ──
    txtPrimary:     '#152e22',
    txtSecondary:   '#28533f',
    txtMuted:       '#587c6b',
    txtInverse:     '#ffffff',
    txtLabel:       '#1f4232',

    // ── Borders ──
    border:         '#c8ded1',
    borderStrong:   '#9ec4ad',
    borderHover:    '#2d7a5b',
    divider:        '#d5e6dc',

    // ── Brand Accents ──
    accentGold:     '#2d7a5b',
    accentGoldHover:'#226046',
    accentGoldBg:   'rgba(45, 122, 91, 0.10)',
    accentGoldBorder:'rgba(45, 122, 91, 0.28)',
    accentGreen:    '#2d7a5b',
    accentGreenBg:  'rgba(45, 122, 91, 0.10)',

    // ── Semantic Colors ──
    success:        '#15803d',
    successBg:      'rgba(21, 128, 61, 0.10)',
    successBorder:  'rgba(21, 128, 61, 0.25)',
    danger:         '#b91c1c',
    dangerBg:       'rgba(185, 28, 28, 0.10)',
    dangerBorder:   'rgba(185, 28, 28, 0.25)',
    warning:        '#b45309',
    warningBg:      'rgba(180, 83, 9, 0.10)',
    warningBorder:  'rgba(180, 83, 9, 0.25)',
    info:           '#0e7490',
    infoBg:         'rgba(14, 116, 144, 0.10)',
    infoBorder:     'rgba(14, 116, 144, 0.25)',

    // ── Navigation / Active ──
    navActiveBg:    'linear-gradient(135deg, #2d7a5b 0%, #1b533c 100%)',
    navActiveTxt:   '#ffffff',
    navActiveShadow:'rgba(45, 122, 91, 0.30)',
    primary:        '#2d7a5b',
    primaryBtn:     'linear-gradient(135deg, #2d7a5b 0%, #1b533c 100%)',
    primaryBtnShadow:'rgba(45, 122, 91, 0.25)',

    // ── Shadows ──
    shadowSm:       '0 1px 4px rgba(21, 46, 34, 0.08)',
    shadowMd:       '0 4px 16px rgba(21, 46, 34, 0.10)',
    shadowLg:       '0 8px 32px rgba(21, 46, 34, 0.15)',

    // ── Chart / Tooltip ──
    tooltipBg:      '#152e22',
    tooltipBorder:  '#2d7a5b',
    tooltipColor:   '#ffffff',
    gridColor:      '#dceee3',
    axisColor:      '#587c6b',
    chartColors:    ['#2d7a5b', '#0e7490', '#b45309', '#7c3aed', '#b91c1c', '#15803d'],

    // ── Tab Styles ──
    tabActiveBg:    'linear-gradient(135deg, #2d7a5b, #1b533c)',
    tabActiveColor: '#ffffff',
    tabInactiveBg:  '#eaf2ec',
    tabInactiveColor:'#28533f',
    tabBorder:      '#c8ded1',

    // ── Typography & Shadows ──
    fsTitle:        'var(--fs-2xl)',
    fsSubtitle:     'var(--fs-sm)',
    fsBody:         'var(--fs-base)',
    fsBadge:        'var(--fs-xs)',
    fsCaption:      'var(--fs-xs)',
    borderUltraThin:'1px solid rgba(45, 122, 91, 0.08)',
    cardShadow:     '0 2px 8px rgba(21, 46, 34, 0.08), 0 0 0 1px rgba(45, 122, 91, 0.06)',
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
    primary:        '#f59e0b',
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
