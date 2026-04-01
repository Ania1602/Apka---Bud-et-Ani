// Old Money Design System - Elegant, Classic, Sophisticated

export const OldMoneyColors = {
  // Primary Colors - Elegant neutrals
  cream: '#F5F1E8',
  beige: '#E8DCC4',
  darkBeige: '#C4B5A0',
  
  // Accent Colors - Refined metallics and deep tones
  gold: '#D4AF37',
  darkGold: '#B8941F',
  burgundy: '#800020',
  forestGreen: '#2C5F2D',
  navy: '#1B2845',
  
  // Backgrounds
  background: '#FAF8F3',
  cardBackground: '#FFFFFF',
  darkBackground: '#2A2520',
  
  // Text
  primary: '#2A2520',
  secondary: '#6B5D52',
  tertiary: '#9B8B7E',
  light: '#F5F1E8',
  
  // Status colors
  success: '#2C5F2D',
  warning: '#B8941F',
  error: '#800020',
  
  // Borders
  border: '#E0D5C7',
  darkBorder: '#4A4035',
};

export const OldMoneyShadows = {
  small: {
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#2A2520',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const OldMoneyFonts = {
  heading: {
    fontSize: 32,
    fontWeight: '600' as const,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  small: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.3,
  },
};
