export type ThemeKey = 'forest' | 'feldgrau' | 'wheat' | 'midnight' | 'mint' | 'merlot' | 'apricot' | 'caramel' | 'babyblue' | 'glaucous' | 'skyblue';

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
  caramel: {
    key: 'caramel',
    name: 'Caramel',
    colors: {
      primary: '#BF7E46',
      primaryLight: '#D19662',
      primaryDark: '#A06634',
      accent: '#F5E6D3',
      accentDark: '#DBC9B5',
      text: '#F5F2ED',
      textSecondary: 'rgba(245, 242, 237, 0.6)',
      background: '#BF7E46',
      card: '#D19662',
      border: 'rgba(245, 242, 237, 0.1)',
    },
  },
  babyblue: {
    key: 'babyblue',
    name: 'Baby Blue',
    colors: {
      primary: '#97C6E0',
      primaryLight: '#B0D8ED',
      primaryDark: '#7EAFCC',
      accent: '#FFFFFF',
      accentDark: '#F0F0F0',
      text: '#1A2A3A',
      textSecondary: 'rgba(26, 42, 58, 0.6)',
      background: '#97C6E0',
      card: '#B0D8ED',
      border: 'rgba(26, 42, 58, 0.1)',
    },
  },
  glaucous: {
    key: 'glaucous',
    name: 'Glaucous',
    colors: {
      primary: '#5D77A0',
      primaryLight: '#728BB3',
      primaryDark: '#4A628C',
      accent: '#E0E7F1',
      accentDark: '#C5CEDD',
      text: '#F5F2ED',
      textSecondary: 'rgba(245, 242, 237, 0.6)',
      background: '#5D77A0',
      card: '#728BB3',
      border: 'rgba(245, 242, 237, 0.1)',
    },
  },
  skyblue: {
    key: 'skyblue',
    name: 'Sky Blue',
    colors: {
      primary: '#88CBE8',
      primaryLight: '#A3D9EF',
      primaryDark: '#6EBBDD',
      accent: '#FFFFFF',
      accentDark: '#F0F0F0',
      text: '#1A2A3A',
      textSecondary: 'rgba(26, 42, 58, 0.6)',
      background: '#88CBE8',
      card: '#A3D9EF',
      border: 'rgba(26, 42, 58, 0.1)',
    },
  },
  mint: {
    key: 'mint',
    name: 'Mint',
    colors: {
      primary: '#769382',
      primaryLight: '#8BA696',
      primaryDark: '#62806F',
      accent: '#D9E8E0',
      accentDark: '#C1D1C8',
      text: '#F5F2ED',
      textSecondary: 'rgba(245, 242, 237, 0.6)',
      background: '#769382',
      card: '#8BA696',
      border: 'rgba(245, 242, 237, 0.1)',
    },
  },
  wheat: {
    key: 'wheat',
    name: 'Wheat Harvest',
    colors: {
      primary: '#8C7355',
      primaryLight: '#A38B6E',
      primaryDark: '#755C3E',
      accent: '#F2E8D5',
      accentDark: '#D9CCB4',
      text: '#F5F2ED',
      textSecondary: 'rgba(245, 242, 237, 0.6)',
      background: '#8C7355',
      card: '#A38B6E',
      border: 'rgba(245, 242, 237, 0.1)',
    },
  },
  apricot: {
    key: 'apricot',
    name: 'Apricot',
    colors: {
      primary: '#D99177',
      primaryLight: '#E8A78F',
      primaryDark: '#C17C62',
      accent: '#F2E8D5',
      accentDark: '#D9CCB4',
      text: '#F5F2ED',
      textSecondary: 'rgba(245, 242, 237, 0.6)',
      background: '#D99177',
      card: '#E8A78F',
      border: 'rgba(245, 242, 237, 0.1)',
    },
  },
};

export function getTheme(key: ThemeKey): Theme {
  return themes[key] || themes.midnight;
}

export const themeList: Theme[] = Object.values(themes);
