/**
 * Font Library - Font options for text rendering in corn maze designs
 * Fonts are rendered via matplotlib's TextPath on the backend.
 *
 * Only fonts that are verified available on the system are included.
 * The backend dynamically checks font availability and the library
 * is kept in sync with what matplotlib can actually render.
 */

export interface FontOption {
  id: string;
  name: string;
  category: FontCategory;
  // For matplotlib backend - system font name
  backendFont: string;
  // CSS font-family for browser preview (web-safe equivalent)
  browserFont: string;
  // Preview character for font picker
  preview: string;
  // Good for mazes (thick strokes, no thin details)
  mazeRecommended: boolean;
  // Weight hint for backend
  weight: 'normal' | 'bold';
}

export type FontCategory = 'sans-serif' | 'serif' | 'display' | 'monospace';

export const fontCategories: Array<{ id: FontCategory; label: string; description: string }> = [
  { id: 'sans-serif', label: 'Sans-Serif', description: 'Clean & Modern' },
  { id: 'serif', label: 'Serif', description: 'Classic & Traditional' },
  { id: 'display', label: 'Display', description: 'Fun & Decorative' },
  { id: 'monospace', label: 'Monospace', description: 'Fixed-Width & Technical' },
];

export const fontLibrary: FontOption[] = [
  // ============================================
  // SANS-SERIF
  // ============================================
  {
    id: 'dejavu-sans-bold',
    name: 'DejaVu Sans Bold',
    category: 'sans-serif',
    backendFont: 'DejaVu Sans',
    browserFont: 'Arial, Helvetica, sans-serif',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'dejavu-sans',
    name: 'DejaVu Sans',
    category: 'sans-serif',
    backendFont: 'DejaVu Sans',
    browserFont: 'Arial, Helvetica, sans-serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'liberation-sans-bold',
    name: 'Liberation Sans Bold',
    category: 'sans-serif',
    backendFont: 'Liberation Sans',
    browserFont: 'Helvetica Neue, Helvetica, sans-serif',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'liberation-sans',
    name: 'Liberation Sans',
    category: 'sans-serif',
    backendFont: 'Liberation Sans',
    browserFont: 'Helvetica Neue, Helvetica, sans-serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'freesans-bold',
    name: 'FreeSans Bold',
    category: 'sans-serif',
    backendFont: 'FreeSans',
    browserFont: 'Verdana, Geneva, sans-serif',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'freesans',
    name: 'FreeSans',
    category: 'sans-serif',
    backendFont: 'FreeSans',
    browserFont: 'Verdana, Geneva, sans-serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },

  // ============================================
  // SERIF
  // ============================================
  {
    id: 'dejavu-serif-bold',
    name: 'DejaVu Serif Bold',
    category: 'serif',
    backendFont: 'DejaVu Serif',
    browserFont: 'Georgia, "Times New Roman", serif',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'dejavu-serif',
    name: 'DejaVu Serif',
    category: 'serif',
    backendFont: 'DejaVu Serif',
    browserFont: 'Georgia, "Times New Roman", serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'liberation-serif-bold',
    name: 'Liberation Serif Bold',
    category: 'serif',
    backendFont: 'Liberation Serif',
    browserFont: '"Times New Roman", Times, serif',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'liberation-serif',
    name: 'Liberation Serif',
    category: 'serif',
    backendFont: 'Liberation Serif',
    browserFont: '"Times New Roman", Times, serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'freeserif-bold',
    name: 'FreeSerif Bold',
    category: 'serif',
    backendFont: 'FreeSerif',
    browserFont: 'Garamond, "Book Antiqua", Palatino, serif',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'freeserif',
    name: 'FreeSerif',
    category: 'serif',
    backendFont: 'FreeSerif',
    browserFont: 'Garamond, "Book Antiqua", Palatino, serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'stix-general-bold',
    name: 'STIX General Bold',
    category: 'serif',
    backendFont: 'STIXGeneral',
    browserFont: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },

  // ============================================
  // DISPLAY (CJK and special)
  // ============================================
  {
    id: 'dejavu-sans-display',
    name: 'DejaVu Sans Display',
    category: 'display',
    backendFont: 'DejaVu Sans Display',
    browserFont: 'Impact, "Arial Narrow", Arial, sans-serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'dejavu-serif-display',
    name: 'DejaVu Serif Display',
    category: 'display',
    backendFont: 'DejaVu Serif Display',
    browserFont: '"Palatino Linotype", Palatino, serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'ipa-gothic',
    name: 'IPA Gothic',
    category: 'display',
    backendFont: 'IPAGothic',
    browserFont: '"MS Gothic", "Hiragino Kaku Gothic Pro", monospace',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'wenquanyi',
    name: 'WenQuanYi Zen Hei',
    category: 'display',
    backendFont: 'WenQuanYi Zen Hei',
    browserFont: '"SimHei", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'loma',
    name: 'Loma',
    category: 'display',
    backendFont: 'Loma',
    browserFont: '"Trebuchet MS", Tahoma, sans-serif',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },

  // ============================================
  // MONOSPACE
  // ============================================
  {
    id: 'dejavu-sans-mono-bold',
    name: 'DejaVu Sans Mono Bold',
    category: 'monospace',
    backendFont: 'DejaVu Sans Mono',
    browserFont: '"Courier New", Courier, monospace',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'dejavu-sans-mono',
    name: 'DejaVu Sans Mono',
    category: 'monospace',
    backendFont: 'DejaVu Sans Mono',
    browserFont: '"Courier New", Courier, monospace',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'liberation-mono-bold',
    name: 'Liberation Mono Bold',
    category: 'monospace',
    backendFont: 'Liberation Mono',
    browserFont: '"Lucida Console", "Lucida Sans Typewriter", monospace',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'liberation-mono',
    name: 'Liberation Mono',
    category: 'monospace',
    backendFont: 'Liberation Mono',
    browserFont: '"Lucida Console", "Lucida Sans Typewriter", monospace',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'freemono-bold',
    name: 'FreeMono Bold',
    category: 'monospace',
    backendFont: 'FreeMono',
    browserFont: 'Consolas, "Andale Mono", monospace',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
];

/**
 * Get fonts by category
 */
export function getFontsByCategory(category: FontCategory): FontOption[] {
  return fontLibrary.filter((f) => f.category === category);
}

/**
 * Get maze-recommended fonts
 */
export function getMazeRecommendedFonts(): FontOption[] {
  return fontLibrary.filter((f) => f.mazeRecommended);
}

/**
 * Get font by ID
 */
export function getFontById(id: string): FontOption | undefined {
  return fontLibrary.find((f) => f.id === id);
}

/**
 * Get default font
 */
export function getDefaultFont(): FontOption {
  return fontLibrary.find((f) => f.id === 'dejavu-sans-bold') || fontLibrary[0];
}

/**
 * Get categories with font counts
 */
export function getCategoriesWithCounts(): Array<{
  id: FontCategory;
  label: string;
  description: string;
  count: number;
}> {
  return fontCategories.map((cat) => ({
    ...cat,
    count: fontLibrary.filter((f) => f.category === cat.id).length,
  }));
}
