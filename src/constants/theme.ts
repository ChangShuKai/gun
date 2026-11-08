export const THEME = {
  colors: {
    background: '#0B0F19',
    surface: '#131B2E',
    surfaceSubtle: '#1E293B',
    surfaceGlass: 'rgba(26, 36, 56, 0.75)',
    surfaceGlassLight: 'rgba(255, 255, 255, 0.08)',
    borderGlass: 'rgba(255, 255, 255, 0.12)',
    borderActive: 'rgba(59, 130, 246, 0.6)',
    
    primary: '#3B82F6', // Royal electric blue
    primaryLight: '#60A5FA',
    primaryDark: '#1D4ED8',
    primaryGlow: 'rgba(59, 130, 246, 0.35)',
    
    accent: '#8B5CF6', // Purple/Violet
    accentGlow: 'rgba(139, 92, 246, 0.35)',
    
    success: '#10B981', // Emerald green
    warning: '#F59E0B',
    danger: '#EF4444',
    
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    
    white: '#FFFFFF',
    black: '#000000',
  },
  blur: {
    heavy: 80,
    medium: 50,
    light: 25,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  shadow: {
    glow: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 18,
      elevation: 10,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    },
  },
};
