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
};

export function getTheme(key: ThemeKey): Theme {
  return themes[key] || themes.midnight;
}

export const themeList: Theme[] = Object.values(themes);
