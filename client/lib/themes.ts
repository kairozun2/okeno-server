export type ThemeKey = 'forest' | 'feldgrau' | 'wheat' | 'midnight' | 'mint' | 'merlot' | 'apricot';

export interface Theme {
  key: ThemeKey;
  name: string;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentDark: string;
    text: string;
    textSecondary: string;
    background: string;
    card: string;
    border: string;
  };
}

export const themes: Record<ThemeKey, Theme> = {
  forest: {
    key: 'forest',
    name: 'Forest',
    colors: {
      primary: '#064734',
      primaryLight: '#0A5C45',
      primaryDark: '#043325',
      accent: '#E8D5B7',
      accentDark: '#D4C5A8',
      text: '#F5F2ED',
      textSecondary: 'rgba(245, 242, 237, 0.6)',
      background: '#064734',
      card: '#0A5C45',
      border: 'rgba(245, 242, 237, 0.1)',
    },
  },
  midnight: {
    key: 'midnight',
    name: 'Midnight Fjord',
    colors: {
      primary: '#053264',
      primaryLight: '#0A4A8A',
      primaryDark: '#031E3D',
      accent: '#FFD482',
      accentDark: '#E6BD6E',
      text: '#F5F2ED',
      textSecondary: 'rgba(245, 242, 237, 0.6)',
      background: '#053264',
      card: '#0A4A8A',
      border: 'rgba(245, 242, 237, 0.1)',
    },
  },
  wheat: {
    key: 'wheat',
    name: 'Wheat',
    colors: {
      primary: '#E6CFA7',
      primaryLight: '#F0DFC0',
      primaryDark: '#D4BD8F',
      accent: '#8B7355',
      accentDark: '#7A6348',
      text: '#2A2520',
      textSecondary: 'rgba(42, 37, 32, 0.6)',
      background: '#E6CFA7',
      card: '#F0DFC0',
      border: 'rgba(42, 37, 32, 0.1)',
    },
  },
  feldgrau: {
    key: 'feldgrau',
    name: 'Feldgrau',
    colors: {
      primary: '#4D5D53',
      primaryLight: '#5D6D63',
      primaryDark: '#3D4D43',
      accent: '#A9B3AC',
      accentDark: '#89938C',
      text: '#F5F2ED',
      textSecondary: 'rgba(245, 242, 237, 0.6)',
      background: '#4D5D53',
      card: '#5D6D63',
      border: 'rgba(245, 242, 237, 0.1)',
    },
  },
  mint: {
    key: 'mint',
    name: 'Mint',
    colors: {
      primary: '#D6E8D9',
      primaryLight: '#E6F0E9',
      primaryDark: '#C6D8C9',
      accent: '#5D7D63',
      accentDark: '#4D6D53',
      text: '#2A2520',
      textSecondary: 'rgba(42, 37, 32, 0.6)',
      background: '#D6E8D9',
      card: '#E6F0E9',
      border: 'rgba(42, 37, 32, 0.1)',
    },
  },
  merlot: {
    key: 'merlot',
    name: 'Merlot',
    colors: {
      primary: '#4A0E0E',
      primaryLight: '#6A1E1E',
      primaryDark: '#2A0707',
      accent: '#D4AF37',
      accentDark: '#B8962E',
      text: '#F5F2ED',
      textSecondary: 'rgba(245, 242, 237, 0.6)',
      background: '#4A0E0E',
      card: '#6A1E1E',
      border: 'rgba(245, 242, 237, 0.1)',
    },
  },
  apricot: {
    key: 'apricot',
    name: 'Apricot',
    colors: {
      primary: '#FFB347',
      primaryLight: '#FFC373',
      primaryDark: '#E69B2E',
      accent: '#4D3319',
      accentDark: '#3D2814',
      text: '#2A2520',
      textSecondary: 'rgba(42, 37, 32, 0.6)',
      background: '#FFB347',
      card: '#FFC373',
      border: 'rgba(42, 37, 32, 0.1)',
    },
  },
};

export function getTheme(key: ThemeKey): Theme {
  return themes[key] || themes.midnight;
}

export const themeList: Theme[] = Object.values(themes);
