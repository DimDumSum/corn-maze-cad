/**
 * Font Library - Comprehensive font options for text rendering in corn maze designs
 * Fonts are rendered via matplotlib's TextPath on the backend
 * Includes 60+ fonts organized by category with maze recommendations
 */

export interface FontOption {
  id: string;
  name: string;
  category: FontCategory;
  // For matplotlib backend - system font name
  backendFont: string;
  // Preview character for font picker
  preview: string;
  // Good for mazes (thick strokes, no thin details)
  mazeRecommended: boolean;
  // Weight hint for backend
  weight: 'normal' | 'bold';
}

export type FontCategory = 'sans-serif' | 'serif' | 'display' | 'stencil' | 'script' | 'monospace' | 'gothic' | 'condensed';

export const fontCategories: Array<{ id: FontCategory; label: string; description: string }> = [
  { id: 'sans-serif', label: 'Sans-Serif', description: 'Clean & Modern' },
  { id: 'serif', label: 'Serif', description: 'Classic & Traditional' },
  { id: 'display', label: 'Display', description: 'Fun & Decorative' },
  { id: 'stencil', label: 'Stencil', description: 'Bold & Industrial' },
  { id: 'script', label: 'Script', description: 'Handwritten & Cursive' },
  { id: 'monospace', label: 'Monospace', description: 'Fixed-Width & Technical' },
  { id: 'gothic', label: 'Gothic', description: 'Medieval & Blackletter' },
  { id: 'condensed', label: 'Condensed', description: 'Narrow & Compact' },
];

export const fontLibrary: FontOption[] = [
  // ============================================
  // SANS-SERIF (clean, modern - great for mazes)
  // ============================================
  {
    id: 'arial-black',
    name: 'Arial Black',
    category: 'sans-serif',
    backendFont: 'Arial Black',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'impact',
    name: 'Impact',
    category: 'sans-serif',
    backendFont: 'Impact',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'helvetica-bold',
    name: 'Helvetica Bold',
    category: 'sans-serif',
    backendFont: 'Helvetica',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'arial-bold',
    name: 'Arial Bold',
    category: 'sans-serif',
    backendFont: 'Arial',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'verdana-bold',
    name: 'Verdana Bold',
    category: 'sans-serif',
    backendFont: 'Verdana',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'tahoma-bold',
    name: 'Tahoma Bold',
    category: 'sans-serif',
    backendFont: 'Tahoma',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'trebuchet-bold',
    name: 'Trebuchet Bold',
    category: 'sans-serif',
    backendFont: 'Trebuchet MS',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'calibri-bold',
    name: 'Calibri Bold',
    category: 'sans-serif',
    backendFont: 'Calibri',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'segoe-ui-bold',
    name: 'Segoe UI Bold',
    category: 'sans-serif',
    backendFont: 'Segoe UI',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'century-gothic',
    name: 'Century Gothic',
    category: 'sans-serif',
    backendFont: 'Century Gothic',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'franklin-gothic',
    name: 'Franklin Gothic',
    category: 'sans-serif',
    backendFont: 'Franklin Gothic Medium',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'gill-sans',
    name: 'Gill Sans',
    category: 'sans-serif',
    backendFont: 'Gill Sans MT',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'lucida-sans',
    name: 'Lucida Sans',
    category: 'sans-serif',
    backendFont: 'Lucida Sans Unicode',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'candara',
    name: 'Candara',
    category: 'sans-serif',
    backendFont: 'Candara',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'corbel',
    name: 'Corbel',
    category: 'sans-serif',
    backendFont: 'Corbel',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },

  // ============================================
  // SERIF (classic, traditional)
  // ============================================
  {
    id: 'times-bold',
    name: 'Times Bold',
    category: 'serif',
    backendFont: 'Times New Roman',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'georgia-bold',
    name: 'Georgia Bold',
    category: 'serif',
    backendFont: 'Georgia',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'palatino-bold',
    name: 'Palatino Bold',
    category: 'serif',
    backendFont: 'Palatino Linotype',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'book-antiqua',
    name: 'Book Antiqua',
    category: 'serif',
    backendFont: 'Book Antiqua',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'cambria-bold',
    name: 'Cambria Bold',
    category: 'serif',
    backendFont: 'Cambria',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'rockwell',
    name: 'Rockwell',
    category: 'serif',
    backendFont: 'Rockwell',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'rockwell-extra-bold',
    name: 'Rockwell Extra Bold',
    category: 'serif',
    backendFont: 'Rockwell Extra Bold',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'constantia',
    name: 'Constantia',
    category: 'serif',
    backendFont: 'Constantia',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'garamond',
    name: 'Garamond',
    category: 'serif',
    backendFont: 'Garamond',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'bodoni',
    name: 'Bodoni MT',
    category: 'serif',
    backendFont: 'Bodoni MT',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'bookman',
    name: 'Bookman Old Style',
    category: 'serif',
    backendFont: 'Bookman Old Style',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'century-schoolbook',
    name: 'Century Schoolbook',
    category: 'serif',
    backendFont: 'Century Schoolbook',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'perpetua',
    name: 'Perpetua',
    category: 'serif',
    backendFont: 'Perpetua',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },

  // ============================================
  // DISPLAY (fun, decorative)
  // ============================================
  {
    id: 'cooper-black',
    name: 'Cooper Black',
    category: 'display',
    backendFont: 'Cooper Black',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'bauhaus',
    name: 'Bauhaus 93',
    category: 'display',
    backendFont: 'Bauhaus 93',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'broadway',
    name: 'Broadway',
    category: 'display',
    backendFont: 'Broadway',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'showcard',
    name: 'Showcard Gothic',
    category: 'display',
    backendFont: 'Showcard Gothic',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'algerian',
    name: 'Algerian',
    category: 'display',
    backendFont: 'Algerian',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'copperplate',
    name: 'Copperplate',
    category: 'display',
    backendFont: 'Copperplate Gothic Bold',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'wide-latin',
    name: 'Wide Latin',
    category: 'display',
    backendFont: 'Wide Latin',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'playbill',
    name: 'Playbill',
    category: 'display',
    backendFont: 'Playbill',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'jokerman',
    name: 'Jokerman',
    category: 'display',
    backendFont: 'Jokerman',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'ravie',
    name: 'Ravie',
    category: 'display',
    backendFont: 'Ravie',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'snap-itc',
    name: 'Snap ITC',
    category: 'display',
    backendFont: 'Snap ITC',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'curlz',
    name: 'Curlz MT',
    category: 'display',
    backendFont: 'Curlz MT',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'harrington',
    name: 'Harrington',
    category: 'display',
    backendFont: 'Harrington',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'magneto',
    name: 'Magneto Bold',
    category: 'display',
    backendFont: 'Magneto',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'elephant',
    name: 'Elephant',
    category: 'display',
    backendFont: 'Elephant',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'haettenschweiler',
    name: 'Haettenschweiler',
    category: 'display',
    backendFont: 'Haettenschweiler',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },

  // ============================================
  // STENCIL (military, industrial - perfect for mazes)
  // ============================================
  {
    id: 'stencil',
    name: 'Stencil',
    category: 'stencil',
    backendFont: 'Stencil',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'stencil-std',
    name: 'Stencil Std',
    category: 'stencil',
    backendFont: 'Stencil Std',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'agency-fb',
    name: 'Agency FB Bold',
    category: 'stencil',
    backendFont: 'Agency FB',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'ocr',
    name: 'OCR A Extended',
    category: 'stencil',
    backendFont: 'OCR A Extended',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'normal',
  },
  {
    id: 'military-stencil',
    name: 'Army Stencil',
    category: 'stencil',
    backendFont: 'Army',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },

  // ============================================
  // SCRIPT (handwritten - use carefully, thin strokes)
  // ============================================
  {
    id: 'comic-sans',
    name: 'Comic Sans MS',
    category: 'script',
    backendFont: 'Comic Sans MS',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'lucida-handwriting',
    name: 'Lucida Handwriting',
    category: 'script',
    backendFont: 'Lucida Handwriting',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'papyrus',
    name: 'Papyrus',
    category: 'script',
    backendFont: 'Papyrus',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'kristen',
    name: 'Kristen ITC',
    category: 'script',
    backendFont: 'Kristen ITC',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'segoe-script',
    name: 'Segoe Script',
    category: 'script',
    backendFont: 'Segoe Script',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'brush-script',
    name: 'Brush Script MT',
    category: 'script',
    backendFont: 'Brush Script MT',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'freestyle-script',
    name: 'Freestyle Script',
    category: 'script',
    backendFont: 'Freestyle Script',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'french-script',
    name: 'French Script MT',
    category: 'script',
    backendFont: 'French Script MT',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'edwardian-script',
    name: 'Edwardian Script',
    category: 'script',
    backendFont: 'Edwardian Script ITC',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'monotype-corsiva',
    name: 'Monotype Corsiva',
    category: 'script',
    backendFont: 'Monotype Corsiva',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    category: 'script',
    backendFont: 'Mistral',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'rage-italic',
    name: 'Rage Italic',
    category: 'script',
    backendFont: 'Rage Italic',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },

  // ============================================
  // MONOSPACE (fixed-width, technical)
  // ============================================
  {
    id: 'courier-bold',
    name: 'Courier New Bold',
    category: 'monospace',
    backendFont: 'Courier New',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'consolas',
    name: 'Consolas',
    category: 'monospace',
    backendFont: 'Consolas',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'lucida-console',
    name: 'Lucida Console',
    category: 'monospace',
    backendFont: 'Lucida Console',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'monaco',
    name: 'Monaco',
    category: 'monospace',
    backendFont: 'Monaco',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'andale-mono',
    name: 'Andale Mono',
    category: 'monospace',
    backendFont: 'Andale Mono',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },

  // ============================================
  // GOTHIC (medieval, blackletter)
  // ============================================
  {
    id: 'old-english',
    name: 'Old English Text',
    category: 'gothic',
    backendFont: 'Old English Text MT',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'blackadder',
    name: 'Blackadder ITC',
    category: 'gothic',
    backendFont: 'Blackadder ITC',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },
  {
    id: 'goudy-stout',
    name: 'Goudy Stout',
    category: 'gothic',
    backendFont: 'Goudy Stout',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'castellar',
    name: 'Castellar',
    category: 'gothic',
    backendFont: 'Castellar',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'engravers-mt',
    name: 'Engravers MT',
    category: 'gothic',
    backendFont: 'Engravers MT',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'felix-titling',
    name: 'Felix Titling',
    category: 'gothic',
    backendFont: 'Felix Titling',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'normal',
  },

  // ============================================
  // CONDENSED (narrow, compact)
  // ============================================
  {
    id: 'arial-narrow-bold',
    name: 'Arial Narrow Bold',
    category: 'condensed',
    backendFont: 'Arial Narrow',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'franklin-gothic-condensed',
    name: 'Franklin Gothic Condensed',
    category: 'condensed',
    backendFont: 'Franklin Gothic Medium Cond',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'britannic-bold',
    name: 'Britannic Bold',
    category: 'condensed',
    backendFont: 'Britannic Bold',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'berlin-sans',
    name: 'Berlin Sans FB Bold',
    category: 'condensed',
    backendFont: 'Berlin Sans FB',
    preview: 'Aa',
    mazeRecommended: true,
    weight: 'bold',
  },
  {
    id: 'tw-cen-mt',
    name: 'Tw Cen MT Bold',
    category: 'condensed',
    backendFont: 'Tw Cen MT',
    preview: 'Aa',
    mazeRecommended: false,
    weight: 'bold',
  },
  {
    id: 'eras-bold',
    name: 'Eras Bold ITC',
    category: 'condensed',
    backendFont: 'Eras Bold ITC',
    preview: 'Aa',
    mazeRecommended: true,
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
  return fontLibrary.find((f) => f.id === 'arial-black') || fontLibrary[0];
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
