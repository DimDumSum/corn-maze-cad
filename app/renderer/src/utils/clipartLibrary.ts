/**
 * Clipart Library - SVG path data for corn maze decorations
 * Each clipart is stored as SVG path data that can be converted to polygons
 * All paths normalized to 100x100 viewBox for consistent scaling
 */

export type ClipArtCategory =
  | 'shapes'
  | 'halloween'
  | 'harvest'
  | 'farm'
  | 'animals'
  | 'nature'
  | 'arrows'
  | 'sports'
  | 'holidays'
  | 'symbols';

export interface ClipArtItem {
  id: string;
  name: string;
  category: ClipArtCategory;
  // SVG path data (d attribute) - normalized to 100x100 viewBox
  pathData: string;
  // Preview color for the dialog
  previewColor: string;
  // Good for mazes (thick solid shapes work best)
  mazeRecommended?: boolean;
}

export const clipartCategories: Array<{
  id: ClipArtCategory;
  label: string;
  description: string;
}> = [
  { id: 'shapes', label: 'Shapes', description: 'Basic geometric shapes' },
  { id: 'halloween', label: 'Halloween', description: 'Spooky seasonal' },
  { id: 'harvest', label: 'Harvest', description: 'Fall & autumn' },
  { id: 'farm', label: 'Farm', description: 'Agricultural' },
  { id: 'animals', label: 'Animals', description: 'Farm & wildlife' },
  { id: 'nature', label: 'Nature', description: 'Trees & plants' },
  { id: 'arrows', label: 'Arrows', description: 'Directional' },
  { id: 'sports', label: 'Sports', description: 'Athletics & games' },
  { id: 'holidays', label: 'Holidays', description: 'Seasonal celebrations' },
  { id: 'symbols', label: 'Symbols', description: 'Icons & logos' },
];

export const clipartLibrary: ClipArtItem[] = [
  // ============================================
  // SHAPES - Basic geometric shapes
  // ============================================
  {
    id: 'star',
    name: 'Star',
    category: 'shapes',
    pathData: 'M50,5 L61,40 L98,40 L68,62 L79,97 L50,75 L21,97 L32,62 L2,40 L39,40 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'star-6',
    name: '6-Point Star',
    category: 'shapes',
    pathData: 'M50,5 L58,35 L90,20 L72,50 L90,80 L58,65 L50,95 L42,65 L10,80 L28,50 L10,20 L42,35 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'heart',
    name: 'Heart',
    category: 'shapes',
    pathData: 'M50,88 C20,60 5,40 5,25 C5,10 20,5 35,5 C42,5 50,12 50,12 C50,12 58,5 65,5 C80,5 95,10 95,25 C95,40 80,60 50,88 Z',
    previewColor: '#ef4444',
    mazeRecommended: true,
  },
  {
    id: 'circle',
    name: 'Circle',
    category: 'shapes',
    pathData: 'M50,5 A45,45 0 1,1 49.99,5 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'shapes',
    pathData: 'M50,5 L95,50 L50,95 L5,50 Z',
    previewColor: '#8b5cf6',
    mazeRecommended: true,
  },
  {
    id: 'triangle',
    name: 'Triangle',
    category: 'shapes',
    pathData: 'M50,5 L95,90 L5,90 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    category: 'shapes',
    pathData: 'M50,5 L95,38 L77,90 L23,90 L5,38 Z',
    previewColor: '#06b6d4',
    mazeRecommended: true,
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    category: 'shapes',
    pathData: 'M50,5 L90,27 L90,73 L50,95 L10,73 L10,27 Z',
    previewColor: '#f59e0b',
    mazeRecommended: true,
  },
  {
    id: 'octagon',
    name: 'Octagon',
    category: 'shapes',
    pathData: 'M35,5 L65,5 L95,35 L95,65 L65,95 L35,95 L5,65 L5,35 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'cross',
    name: 'Cross',
    category: 'shapes',
    pathData: 'M35,5 L65,5 L65,35 L95,35 L95,65 L65,65 L65,95 L35,95 L35,65 L5,65 L5,35 L35,35 Z',
    previewColor: '#ef4444',
    mazeRecommended: true,
  },
  {
    id: 'crescent',
    name: 'Crescent Moon',
    category: 'shapes',
    pathData: 'M70,10 A40,40 0 1,1 70,90 A30,30 0 1,0 70,10 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },

  // ============================================
  // HALLOWEEN - Spooky seasonal clipart
  // ============================================
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    category: 'halloween',
    pathData: 'M45,15 L45,8 C45,3 55,3 55,8 L55,15 M50,15 C20,15 5,35 5,55 C5,80 25,95 50,95 C75,95 95,80 95,55 C95,35 80,15 50,15 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'jack-o-lantern',
    name: "Jack-O'-Lantern",
    category: 'halloween',
    pathData: 'M45,12 L45,5 C45,2 55,2 55,5 L55,12 M50,12 C18,12 3,35 3,55 C3,82 25,97 50,97 C75,97 97,82 97,55 C97,35 82,12 50,12 Z M25,45 L35,35 L45,45 L35,55 Z M55,45 L65,35 L75,45 L65,55 Z M30,70 L40,60 L50,65 L60,60 L70,70 L60,80 L50,75 L40,80 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'ghost',
    name: 'Ghost',
    category: 'halloween',
    pathData: 'M50,5 C25,5 10,25 10,50 L10,85 L20,75 L30,85 L40,75 L50,85 L60,75 L70,85 L80,75 L90,85 L90,50 C90,25 75,5 50,5 Z M35,40 A5,5 0 1,1 35.01,40 M65,40 A5,5 0 1,1 65.01,40',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'bat',
    name: 'Bat',
    category: 'halloween',
    pathData: 'M50,30 C50,20 45,15 40,15 C35,15 30,25 30,35 L5,20 L15,45 L5,50 L20,55 C15,60 15,70 20,75 C25,80 35,80 40,75 L50,85 L60,75 C65,80 75,80 80,75 C85,70 85,60 80,55 L95,50 L85,45 L95,20 L70,35 C70,25 65,15 60,15 C55,15 50,20 50,30 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'spider',
    name: 'Spider',
    category: 'halloween',
    pathData: 'M50,35 A15,15 0 1,1 50.01,35 M50,55 A20,15 0 1,1 50.01,55 M30,40 L5,20 M25,50 L5,50 M30,60 L5,80 M70,40 L95,20 M75,50 L95,50 M70,60 L95,80 M35,70 L20,95 M65,70 L80,95',
    previewColor: '#1f2937',
  },
  {
    id: 'witch-hat',
    name: 'Witch Hat',
    category: 'halloween',
    pathData: 'M50,3 L75,70 L95,70 C95,80 85,85 75,85 L25,85 C15,85 5,80 5,70 L25,70 Z M20,75 L80,75 L80,90 L20,90 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'skull',
    name: 'Skull',
    category: 'halloween',
    pathData: 'M50,5 C20,5 5,25 5,50 C5,70 15,82 30,88 L30,95 L40,95 L40,88 L45,88 L45,95 L55,95 L55,88 L60,88 L60,95 L70,95 L70,88 C85,82 95,70 95,50 C95,25 80,5 50,5 Z M30,45 A10,12 0 1,1 30.01,45 M70,45 A10,12 0 1,1 70.01,45 M40,70 L45,65 L50,70 L55,65 L60,70 L55,75 L50,70 L45,75 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'candy-corn',
    name: 'Candy Corn',
    category: 'halloween',
    pathData: 'M50,5 L20,95 L80,95 Z M50,5 L30,55 L70,55 Z M30,55 L25,75 L75,75 L70,55 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'cauldron',
    name: 'Cauldron',
    category: 'halloween',
    pathData: 'M15,35 C5,35 5,45 15,45 L15,75 C15,90 30,95 50,95 C70,95 85,90 85,75 L85,45 C95,45 95,35 85,35 Z M25,25 L35,35 M50,20 L50,35 M75,25 L65,35',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'tombstone',
    name: 'Tombstone',
    category: 'halloween',
    pathData: 'M20,95 L20,40 C20,15 35,5 50,5 C65,5 80,15 80,40 L80,95 Z M35,50 L65,50 M35,60 L65,60 M35,70 L65,70',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'black-cat',
    name: 'Black Cat',
    category: 'halloween',
    pathData: 'M25,30 L15,5 L30,25 L35,20 C45,15 55,15 65,20 L70,25 L85,5 L75,30 C85,40 85,60 75,75 L80,90 L70,85 C60,92 40,92 30,85 L20,90 L25,75 C15,60 15,40 25,30 Z M35,45 A5,5 0 1,1 35.01,45 M65,45 A5,5 0 1,1 65.01,45 M45,55 L50,60 L55,55',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'frankenstein',
    name: 'Frankenstein',
    category: 'halloween',
    pathData: 'M20,20 L20,5 L35,5 L35,20 M65,5 L80,5 L80,20 L65,20 M25,20 L25,85 C25,92 35,97 50,97 C65,97 75,92 75,85 L75,20 Z M5,35 L25,35 L25,50 L5,50 Z M75,35 L95,35 L95,50 L75,50 Z M35,45 L45,45 L45,55 L35,55 Z M55,45 L65,45 L65,55 L55,55 Z M35,75 L65,75 L65,82 L35,82 Z',
    previewColor: '#65a30d',
    mazeRecommended: true,
  },
  {
    id: 'spiderweb',
    name: 'Spider Web',
    category: 'halloween',
    pathData: 'M50,50 L50,5 M50,50 L95,50 M50,50 L50,95 M50,50 L5,50 M50,50 L82,18 M50,50 L82,82 M50,50 L18,82 M50,50 L18,18 M25,25 L75,25 L75,75 L25,75 Z M35,35 L65,35 L65,65 L35,65 Z',
    previewColor: '#9ca3af',
  },
  {
    id: 'coffin',
    name: 'Coffin',
    category: 'halloween',
    pathData: 'M35,5 L65,5 L75,30 L75,90 L60,95 L40,95 L25,90 L25,30 Z M40,25 L60,25 L60,40 L40,40 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },

  // ============================================
  // HARVEST - Fall & autumn themed
  // ============================================
  {
    id: 'corn-stalk',
    name: 'Corn Stalk',
    category: 'harvest',
    pathData: 'M50,95 L50,40 M50,40 C50,40 30,35 25,20 C20,5 40,10 50,30 M50,40 C50,40 70,35 75,20 C80,5 60,10 50,30 M50,55 C50,55 25,55 20,45 C15,35 35,40 50,55 M50,55 C50,55 75,55 80,45 C85,35 65,40 50,55 M45,70 L45,95 L55,95 L55,70',
    previewColor: '#65a30d',
    mazeRecommended: true,
  },
  {
    id: 'corn-cob',
    name: 'Corn Cob',
    category: 'harvest',
    pathData: 'M35,10 C25,10 20,25 20,50 C20,75 25,90 35,90 L65,90 C75,90 80,75 80,50 C80,25 75,10 65,10 Z M30,25 A3,3 0 1,1 30.01,25 M40,20 A3,3 0 1,1 40.01,20 M50,25 A3,3 0 1,1 50.01,25 M60,20 A3,3 0 1,1 60.01,20 M70,25 A3,3 0 1,1 70.01,25 M30,40 A3,3 0 1,1 30.01,40 M40,35 A3,3 0 1,1 40.01,35 M50,40 A3,3 0 1,1 50.01,40 M60,35 A3,3 0 1,1 60.01,35 M70,40 A3,3 0 1,1 70.01,40 M30,55 A3,3 0 1,1 30.01,55 M40,50 A3,3 0 1,1 40.01,50 M50,55 A3,3 0 1,1 50.01,55 M60,50 A3,3 0 1,1 60.01,50 M70,55 A3,3 0 1,1 70.01,55 M30,70 A3,3 0 1,1 30.01,70 M40,65 A3,3 0 1,1 40.01,65 M50,70 A3,3 0 1,1 50.01,70 M60,65 A3,3 0 1,1 60.01,65 M70,70 A3,3 0 1,1 70.01,70',
    previewColor: '#fbbf24',
  },
  {
    id: 'wheat',
    name: 'Wheat',
    category: 'harvest',
    pathData: 'M50,95 L50,30 M40,30 L50,20 L60,30 M35,40 L50,25 L65,40 M30,50 L50,30 L70,50 M40,55 L50,45 L60,55 M35,65 L50,50 L65,65',
    previewColor: '#d97706',
  },
  {
    id: 'apple',
    name: 'Apple',
    category: 'harvest',
    pathData: 'M50,15 L50,5 M45,15 C20,20 10,40 10,55 C10,80 30,95 50,95 C70,95 90,80 90,55 C90,40 80,20 55,15 M55,12 C65,5 75,5 80,10',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    category: 'harvest',
    pathData: 'M50,50 A15,15 0 1,1 50.01,50 M50,5 L55,25 L45,25 Z M50,95 L55,75 L45,75 Z M5,50 L25,55 L25,45 Z M95,50 L75,55 L75,45 Z M15,15 L32,30 L22,40 Z M85,15 L68,30 L78,40 Z M15,85 L32,70 L22,60 Z M85,85 L68,70 L78,60 Z',
    previewColor: '#facc15',
    mazeRecommended: true,
  },
  {
    id: 'scarecrow',
    name: 'Scarecrow',
    category: 'harvest',
    pathData: 'M50,25 A15,15 0 1,1 50.01,25 M5,45 L40,45 L40,50 L5,50 Z M60,45 L95,45 L95,50 L60,50 Z M40,40 L60,40 L65,95 L35,95 Z M35,55 L65,55 M35,70 L65,70 M50,5 L50,10 M35,30 L30,32 M65,30 L70,32',
    previewColor: '#d97706',
    mazeRecommended: true,
  },
  {
    id: 'acorn',
    name: 'Acorn',
    category: 'harvest',
    pathData: 'M50,5 L50,15 M30,15 L70,15 L75,30 L25,30 Z M30,30 C20,35 15,50 20,70 C25,85 40,95 50,95 C60,95 75,85 80,70 C85,50 80,35 70,30',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'hay-bale',
    name: 'Hay Bale',
    category: 'harvest',
    pathData: 'M10,30 L90,30 L90,80 L10,80 Z M10,30 L50,15 L90,30 M20,40 L20,70 M35,40 L35,70 M50,40 L50,70 M65,40 L65,70 M80,40 L80,70',
    previewColor: '#d97706',
    mazeRecommended: true,
  },
  {
    id: 'pie',
    name: 'Pie',
    category: 'harvest',
    pathData: 'M10,60 C10,35 30,20 50,20 C70,20 90,35 90,60 L90,70 C90,80 70,85 50,85 C30,85 10,80 10,70 Z M50,20 L50,60 M25,30 L75,80 M75,30 L25,80',
    previewColor: '#d97706',
    mazeRecommended: true,
  },
  {
    id: 'leaf',
    name: 'Autumn Leaf',
    category: 'harvest',
    pathData: 'M50,95 L50,50 M50,50 C30,50 10,30 20,10 C40,20 50,50 50,50 C50,50 60,20 80,10 C90,30 70,50 50,50 M30,60 L50,50 L70,60',
    previewColor: '#ea580c',
    mazeRecommended: true,
  },
  {
    id: 'maple-leaf',
    name: 'Maple Leaf',
    category: 'harvest',
    pathData: 'M50,95 L50,60 M50,5 L45,25 L30,15 L40,35 L20,35 L35,45 L15,55 L40,50 L35,70 L50,55 L65,70 L60,50 L85,55 L65,45 L80,35 L60,35 L70,15 L55,25 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },

  // ============================================
  // FARM - Agricultural themed
  // ============================================
  {
    id: 'tractor',
    name: 'Tractor',
    category: 'farm',
    pathData: 'M15,70 A15,15 0 1,1 15.01,70 M75,65 A25,25 0 1,1 75.01,65 M5,55 L5,45 L25,45 L25,35 L60,35 L65,25 L85,25 L85,40 L95,40 L95,50 L85,50 L85,55 M30,55 L30,70 L50,70 L50,55 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'barn',
    name: 'Barn',
    category: 'farm',
    pathData: 'M10,95 L10,45 L50,15 L90,45 L90,95 Z M35,95 L35,65 L65,65 L65,95 M20,55 L20,50 L30,50 L30,55 M70,55 L70,50 L80,50 L80,55 M45,45 L55,45 L55,55 L45,55 Z',
    previewColor: '#b91c1c',
    mazeRecommended: true,
  },
  {
    id: 'windmill',
    name: 'Windmill',
    category: 'farm',
    pathData: 'M35,95 L40,40 L60,40 L65,95 Z M50,40 A10,10 0 1,1 50.01,40 M50,30 L50,5 L45,5 L50,30 M50,30 L75,30 L75,25 L50,30 M50,30 L50,55 L55,55 L50,30 M50,30 L25,30 L25,35 L50,30',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'silo',
    name: 'Silo',
    category: 'farm',
    pathData: 'M30,95 L30,30 C30,15 40,5 50,5 C60,5 70,15 70,30 L70,95 Z M35,40 L35,85 M45,40 L45,85 M55,40 L55,85 M65,40 L65,85 M30,20 L70,20',
    previewColor: '#9ca3af',
    mazeRecommended: true,
  },
  {
    id: 'pitchfork',
    name: 'Pitchfork',
    category: 'farm',
    pathData: 'M45,95 L45,35 L55,35 L55,95 M45,35 L45,5 L35,5 L35,30 M55,35 L55,5 L65,5 L65,30 M40,35 L40,5 M50,35 L50,5 M60,35 L60,5',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'wagon',
    name: 'Wagon',
    category: 'farm',
    pathData: 'M10,50 L90,50 L85,35 L15,35 Z M20,65 A10,10 0 1,1 20.01,65 M80,65 A10,10 0 1,1 80.01,65 M25,50 L25,55 M75,50 L75,55 M5,35 L15,20',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'fence',
    name: 'Fence',
    category: 'farm',
    pathData: 'M5,30 L95,30 M5,60 L95,60 M15,20 L15,70 L25,70 L25,20 Z M40,20 L40,70 L50,70 L50,20 Z M65,20 L65,70 L75,70 L75,20 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'water-tower',
    name: 'Water Tower',
    category: 'farm',
    pathData: 'M25,40 C20,40 15,30 15,20 C15,10 30,5 50,5 C70,5 85,10 85,20 C85,30 80,40 75,40 M30,40 L25,95 M70,40 L75,95 M40,40 L35,95 M60,40 L65,95 M20,70 L80,70',
    previewColor: '#9ca3af',
    mazeRecommended: true,
  },

  // ============================================
  // ANIMALS - Farm animals and wildlife
  // ============================================
  {
    id: 'cow',
    name: 'Cow',
    category: 'animals',
    pathData: 'M20,35 L10,25 L20,30 M80,35 L90,25 L80,30 M25,35 C15,40 10,55 15,70 L15,85 L25,85 L25,70 L35,75 L35,85 L45,85 L45,75 L55,75 L55,85 L65,85 L65,75 L75,70 L75,85 L85,85 L85,70 C90,55 85,40 75,35 L80,25 L70,30 L65,25 L35,25 L30,30 L20,25 Z M35,50 A5,5 0 1,1 35.01,50 M65,50 A5,5 0 1,1 65.01,50',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'pig',
    name: 'Pig',
    category: 'animals',
    pathData: 'M25,30 L15,20 L25,25 M75,30 L85,20 L75,25 M20,35 C10,45 10,65 20,75 L20,85 L30,85 L30,75 L70,75 L70,85 L80,85 L80,75 C90,65 90,45 80,35 L85,30 L80,25 L20,25 L15,30 Z M40,50 A5,5 0 1,1 40.01,50 M60,50 A5,5 0 1,1 60.01,50 M45,65 L55,65 L55,70 L45,70 Z',
    previewColor: '#fda4af',
    mazeRecommended: true,
  },
  {
    id: 'chicken',
    name: 'Chicken',
    category: 'animals',
    pathData: 'M50,15 L55,5 L60,15 L55,15 Z M35,25 C20,30 15,50 20,65 L15,65 L15,80 L25,80 L30,70 L40,75 L45,85 L55,85 L60,75 L70,70 L75,80 L85,80 L85,65 L80,65 C85,50 80,30 65,25 L70,20 L60,20 L55,15 L50,20 L45,20 L40,25 Z M35,40 A5,5 0 1,1 35.01,40 M75,50 L85,45',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'horse',
    name: 'Horse',
    category: 'animals',
    pathData: 'M25,25 L20,5 L30,20 M30,20 C20,25 15,40 15,55 L15,80 L25,80 L25,60 L35,65 L35,80 L45,80 L45,65 L55,65 L55,80 L65,80 L65,60 L75,55 L75,80 L85,80 L85,55 C85,35 75,20 60,15 L70,10 L60,10 L55,5 L50,15 L40,15 Z M30,35 A4,4 0 1,1 30.01,35 M80,30 L95,25 L90,35',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'sheep',
    name: 'Sheep',
    category: 'animals',
    pathData: 'M20,40 A25,20 0 1,1 80,40 A25,20 0 1,1 20,40 M25,55 L25,75 L35,75 L35,60 M65,55 L65,75 L75,75 L75,60 M35,30 C30,25 25,25 20,30 C20,20 30,15 40,20 M65,30 C70,25 75,25 80,30 C80,20 70,15 60,20 M35,40 A4,4 0 1,1 35.01,40 M55,40 A4,4 0 1,1 55.01,40',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'duck',
    name: 'Duck',
    category: 'animals',
    pathData: 'M75,40 L95,35 L90,45 L75,45 M30,35 C15,40 10,55 15,70 C20,80 35,85 55,80 L65,85 L75,80 C85,75 90,60 85,45 C80,30 65,25 50,25 L45,20 L40,25 L35,25 Z M30,45 A4,4 0 1,1 30.01,45',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'rooster',
    name: 'Rooster',
    category: 'animals',
    pathData: 'M45,10 L50,5 L55,15 L50,20 L55,10 L60,20 L50,25 M65,30 L75,25 L70,35 M35,30 C20,35 15,55 20,70 L15,70 L15,85 L25,85 L30,75 L70,75 L75,85 L85,85 L85,70 L80,70 C85,55 80,35 65,30 L60,25 L45,25 Z M35,45 A5,5 0 1,1 35.01,45 M85,55 L95,50 L95,60 L85,55',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    category: 'animals',
    pathData: 'M35,35 L30,5 L40,30 M65,35 L70,5 L60,30 M30,40 C15,50 15,70 25,80 L25,90 L35,90 L35,80 L65,80 L65,90 L75,90 L75,80 C85,70 85,50 70,40 L75,35 L65,35 L60,30 L40,30 L35,35 L25,35 Z M35,55 A5,5 0 1,1 35.01,55 M65,55 A5,5 0 1,1 65.01,55 M50,70 A8,5 0 1,1 50.01,70',
    previewColor: '#9ca3af',
    mazeRecommended: true,
  },
  {
    id: 'deer',
    name: 'Deer',
    category: 'animals',
    pathData: 'M30,20 L25,5 L35,15 L40,5 L40,20 M70,20 L75,5 L65,15 L60,5 L60,20 M35,25 C20,35 15,55 20,75 L20,90 L30,90 L30,70 L40,75 L40,90 L50,90 L50,75 L60,75 L60,90 L70,90 L70,70 L80,75 L80,90 L90,90 L90,75 C95,55 85,30 70,25 L65,20 L45,20 L40,25 Z M35,45 A4,4 0 1,1 35.01,45',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'owl',
    name: 'Owl',
    category: 'animals',
    pathData: 'M25,35 L15,20 L30,30 M75,35 L85,20 L70,30 M30,35 C15,45 15,75 35,85 L35,95 L45,95 L45,85 L55,85 L55,95 L65,95 L65,85 C85,75 85,45 70,35 L75,25 L60,30 L55,25 L45,25 L40,30 L25,25 Z M30,50 A12,12 0 1,1 30.01,50 M70,50 A12,12 0 1,1 70.01,50 M45,70 L50,75 L55,70',
    previewColor: '#92400e',
    mazeRecommended: true,
  },

  // ============================================
  // NATURE - Trees, plants, and natural elements
  // ============================================
  {
    id: 'tree',
    name: 'Tree',
    category: 'nature',
    pathData: 'M40,95 L40,60 L60,60 L60,95 M50,60 C25,60 10,40 15,20 C20,5 35,0 50,0 C65,0 80,5 85,20 C90,40 75,60 50,60 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'pine-tree',
    name: 'Pine Tree',
    category: 'nature',
    pathData: 'M45,95 L45,75 L55,75 L55,95 M50,75 L20,75 L50,50 L25,50 L50,25 L30,25 L50,5 L70,25 L50,25 L75,50 L50,50 L80,75 Z',
    previewColor: '#166534',
    mazeRecommended: true,
  },
  {
    id: 'palm-tree',
    name: 'Palm Tree',
    category: 'nature',
    pathData: 'M45,95 L45,40 L55,40 L55,95 M50,40 L30,30 L10,35 M50,40 L30,25 L5,20 M50,40 L50,20 L45,5 M50,40 L70,30 L90,35 M50,40 L70,25 L95,20',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'flower',
    name: 'Flower',
    category: 'nature',
    pathData: 'M50,95 L50,55 M50,40 A10,10 0 1,1 50.01,40 M50,20 A12,12 0 1,1 50.01,20 M30,40 A12,12 0 1,1 30.01,40 M70,40 A12,12 0 1,1 70.01,40 M35,55 A12,12 0 1,1 35.01,55 M65,55 A12,12 0 1,1 65.01,55',
    previewColor: '#ec4899',
  },
  {
    id: 'tulip',
    name: 'Tulip',
    category: 'nature',
    pathData: 'M45,95 L45,50 L55,50 L55,95 M50,50 C35,50 25,35 30,20 C35,5 50,5 50,5 C50,5 65,5 70,20 C75,35 65,50 50,50 Z M30,60 L50,50 L70,60',
    previewColor: '#f43f5e',
    mazeRecommended: true,
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    category: 'nature',
    pathData: 'M35,55 L35,90 L65,90 L65,55 M50,55 C15,55 5,35 15,20 C25,5 50,5 50,5 C50,5 75,5 85,20 C95,35 85,55 50,55 Z M30,35 A5,5 0 1,1 30.01,35 M60,25 A7,7 0 1,1 60.01,25 M70,45 A4,4 0 1,1 70.01,45',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'sun',
    name: 'Sun',
    category: 'nature',
    pathData: 'M50,50 A20,20 0 1,1 50.01,50 M50,5 L50,20 M50,80 L50,95 M5,50 L20,50 M80,50 L95,50 M15,15 L27,27 M73,73 L85,85 M85,15 L73,27 M27,73 L15,85',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'cloud',
    name: 'Cloud',
    category: 'nature',
    pathData: 'M25,70 A20,20 0 0,1 25,30 A25,25 0 0,1 75,30 A20,20 0 0,1 75,70 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'mountain',
    name: 'Mountain',
    category: 'nature',
    pathData: 'M5,90 L35,25 L50,50 L65,25 L95,90 Z M35,25 L40,35 L30,35 Z',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'cactus',
    name: 'Cactus',
    category: 'nature',
    pathData: 'M40,95 L40,20 C40,10 50,5 55,10 L60,10 L60,95 M40,50 L20,50 L20,35 C20,25 30,25 30,35 L30,50 M60,60 L80,60 L80,45 C80,35 70,35 70,45 L70,60',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },

  // ============================================
  // ARROWS - Directional indicators
  // ============================================
  {
    id: 'arrow-right',
    name: 'Arrow Right',
    category: 'arrows',
    pathData: 'M5,40 L65,40 L65,20 L95,50 L65,80 L65,60 L5,60 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'arrow-left',
    name: 'Arrow Left',
    category: 'arrows',
    pathData: 'M95,40 L35,40 L35,20 L5,50 L35,80 L35,60 L95,60 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'arrow-up',
    name: 'Arrow Up',
    category: 'arrows',
    pathData: 'M40,95 L40,35 L20,35 L50,5 L80,35 L60,35 L60,95 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'arrow-down',
    name: 'Arrow Down',
    category: 'arrows',
    pathData: 'M40,5 L40,65 L20,65 L50,95 L80,65 L60,65 L60,5 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'arrow-curved',
    name: 'Curved Arrow',
    category: 'arrows',
    pathData: 'M85,70 L95,50 L75,50 L80,50 C80,30 65,15 45,15 C25,15 10,30 10,50 C10,70 25,85 45,85 L45,75 C30,75 20,65 20,50 C20,35 30,25 45,25 C60,25 70,35 70,50 L65,50 L85,70 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'arrow-double',
    name: 'Double Arrow',
    category: 'arrows',
    pathData: 'M5,50 L25,30 L25,40 L75,40 L75,30 L95,50 L75,70 L75,60 L25,60 L25,70 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'arrow-corner',
    name: 'Corner Arrow',
    category: 'arrows',
    pathData: 'M10,10 L10,60 L60,60 L60,40 L90,70 L60,100 L60,80 L30,80 L30,10 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'chevron-right',
    name: 'Chevron Right',
    category: 'arrows',
    pathData: 'M25,5 L75,50 L25,95 L35,95 L85,50 L35,5 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },

  // ============================================
  // SPORTS - Athletics and games
  // ============================================
  {
    id: 'football',
    name: 'Football',
    category: 'sports',
    pathData: 'M50,10 C25,10 5,30 5,50 C5,70 25,90 50,90 C75,90 95,70 95,50 C95,30 75,10 50,10 Z M30,50 L70,50 M40,35 L40,65 M50,30 L50,70 M60,35 L60,65',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'basketball',
    name: 'Basketball',
    category: 'sports',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M5,50 L95,50 M50,5 L50,95 M20,20 C35,35 35,65 20,80 M80,20 C65,35 65,65 80,80',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'baseball',
    name: 'Baseball',
    category: 'sports',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M20,30 C30,40 30,60 20,70 M80,30 C70,40 70,60 80,70 M25,35 L30,40 M25,45 L30,50 M25,55 L30,60 M75,35 L70,40 M75,45 L70,50 M75,55 L70,60',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'soccer-ball',
    name: 'Soccer Ball',
    category: 'sports',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M50,15 L35,35 L50,55 L65,35 Z M35,35 L15,45 M65,35 L85,45 M50,55 L50,75 M15,45 L25,65 M85,45 L75,65 M25,65 L50,75 L75,65',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'trophy',
    name: 'Trophy',
    category: 'sports',
    pathData: 'M30,15 L70,15 L70,45 C70,60 60,70 50,70 C40,70 30,60 30,45 Z M30,25 L15,25 L15,40 C15,50 25,50 30,45 M70,25 L85,25 L85,40 C85,50 75,50 70,45 M45,70 L45,80 L35,80 L35,90 L65,90 L65,80 L55,80 L55,70',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'medal',
    name: 'Medal',
    category: 'sports',
    pathData: 'M40,5 L35,25 L50,20 L65,25 L60,5 M50,25 A25,25 0 1,1 50.01,25 M50,35 L55,45 L65,47 L58,55 L60,65 L50,60 L40,65 L42,55 L35,47 L45,45 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },

  // ============================================
  // HOLIDAYS - Seasonal celebrations
  // ============================================
  {
    id: 'christmas-tree',
    name: 'Christmas Tree',
    category: 'holidays',
    pathData: 'M45,95 L45,75 L55,75 L55,95 M50,75 L20,75 L40,55 L25,55 L45,35 L30,35 L50,10 L70,35 L55,35 L75,55 L60,55 L80,75 Z',
    previewColor: '#166534',
    mazeRecommended: true,
  },
  {
    id: 'candy-cane',
    name: 'Candy Cane',
    category: 'holidays',
    pathData: 'M60,95 L60,40 C60,20 70,10 80,10 C90,10 95,20 95,30 C95,40 85,45 75,40 L55,40 L55,95 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    category: 'holidays',
    pathData: 'M50,5 L50,95 M50,5 L40,15 M50,5 L60,15 M50,95 L40,85 M50,95 L60,85 M5,50 L95,50 M5,50 L15,40 M5,50 L15,60 M95,50 L85,40 M95,50 L85,60 M15,15 L85,85 M15,15 L25,10 M15,15 L10,25 M85,85 L75,90 M85,85 L90,75 M85,15 L15,85 M85,15 L75,10 M85,15 L90,25 M15,85 L25,90 M15,85 L10,75',
    previewColor: '#bfdbfe',
  },
  {
    id: 'present',
    name: 'Present',
    category: 'holidays',
    pathData: 'M15,40 L85,40 L85,90 L15,90 Z M45,40 L45,90 M55,40 L55,90 M15,55 L85,55 M30,40 L30,25 C30,15 40,15 45,25 L50,35 L55,25 C60,15 70,15 70,25 L70,40',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'shamrock',
    name: 'Shamrock',
    category: 'holidays',
    pathData: 'M50,95 L50,55 M50,55 C50,55 35,55 30,45 C25,35 35,25 45,30 C50,32 50,40 50,40 C50,40 50,32 55,30 C65,25 75,35 70,45 C65,55 50,55 50,55 M50,40 C50,40 40,35 35,25 C30,15 45,5 50,20 C55,5 70,15 65,25 C60,35 50,40 50,40',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'easter-egg',
    name: 'Easter Egg',
    category: 'holidays',
    pathData: 'M50,5 C25,5 10,30 10,55 C10,80 30,95 50,95 C70,95 90,80 90,55 C90,30 75,5 50,5 Z M20,40 L80,40 M20,55 L80,55 M20,70 L80,70 M30,25 L40,35 L50,25 L60,35 L70,25',
    previewColor: '#a855f7',
    mazeRecommended: true,
  },

  // ============================================
  // SYMBOLS - Common icons and logos
  // ============================================
  {
    id: 'checkmark',
    name: 'Checkmark',
    category: 'symbols',
    pathData: 'M15,55 L40,80 L85,20 L75,15 L40,60 L25,45 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'x-mark',
    name: 'X Mark',
    category: 'symbols',
    pathData: 'M20,15 L50,45 L80,15 L85,20 L55,50 L85,80 L80,85 L50,55 L20,85 L15,80 L45,50 L15,20 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'question',
    name: 'Question Mark',
    category: 'symbols',
    pathData: 'M30,30 C30,10 70,10 70,30 C70,45 55,50 55,65 L45,65 C45,45 60,40 60,30 C60,20 40,20 40,30 Z M45,80 L55,80 L55,90 L45,90 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'exclamation',
    name: 'Exclamation',
    category: 'symbols',
    pathData: 'M40,10 L60,10 L58,60 L42,60 Z M42,75 L58,75 L58,90 L42,90 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'music-note',
    name: 'Music Note',
    category: 'symbols',
    pathData: 'M30,75 A15,15 0 1,1 30.01,75 M40,75 L40,15 L75,10 L75,25 L45,30 L45,75',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'peace',
    name: 'Peace Sign',
    category: 'symbols',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M50,5 L50,95 M50,50 L20,75 M50,50 L80,75',
    previewColor: '#a855f7',
    mazeRecommended: true,
  },
  {
    id: 'smiley',
    name: 'Smiley Face',
    category: 'symbols',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M30,40 A5,5 0 1,1 30.01,40 M70,40 A5,5 0 1,1 70.01,40 M30,65 C35,75 65,75 70,65',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'hand-print',
    name: 'Hand Print',
    category: 'symbols',
    pathData: 'M25,40 L25,20 L35,20 L35,45 M35,35 L35,15 L45,15 L45,45 M45,30 L45,10 L55,10 L55,45 M55,35 L55,15 L65,15 L65,50 M65,50 L70,50 C80,50 85,60 85,75 C85,90 70,95 55,95 L40,95 C25,95 15,85 15,70 L15,55 L25,55 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL SHAPES
  // ============================================
  {
    id: 'rounded-rect',
    name: 'Rounded Rectangle',
    category: 'shapes',
    pathData: 'M20,10 L80,10 C90,10 95,15 95,25 L95,75 C95,85 90,90 80,90 L20,90 C10,90 5,85 5,75 L5,25 C5,15 10,10 20,10 Z',
    previewColor: '#6366f1',
    mazeRecommended: true,
  },
  {
    id: 'shield',
    name: 'Shield',
    category: 'shapes',
    pathData: 'M50,5 L90,15 L90,45 C90,70 70,90 50,95 C30,90 10,70 10,45 L10,15 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'badge',
    name: 'Badge',
    category: 'shapes',
    pathData: 'M50,5 L60,20 L80,15 L75,35 L95,50 L75,65 L80,85 L60,80 L50,95 L40,80 L20,85 L25,65 L5,50 L25,35 L20,15 L40,20 Z',
    previewColor: '#f59e0b',
    mazeRecommended: true,
  },
  {
    id: 'ribbon',
    name: 'Ribbon',
    category: 'shapes',
    pathData: 'M5,30 L30,30 L50,10 L70,30 L95,30 L95,50 L70,50 L50,70 L30,50 L5,50 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'trapezoid',
    name: 'Trapezoid',
    category: 'shapes',
    pathData: 'M25,20 L75,20 L95,80 L5,80 Z',
    previewColor: '#8b5cf6',
    mazeRecommended: true,
  },
  {
    id: 'parallelogram',
    name: 'Parallelogram',
    category: 'shapes',
    pathData: 'M25,15 L95,15 L75,85 L5,85 Z',
    previewColor: '#06b6d4',
    mazeRecommended: true,
  },
  {
    id: 'burst',
    name: 'Burst',
    category: 'shapes',
    pathData: 'M50,5 L55,30 L75,10 L65,35 L95,35 L70,50 L95,65 L65,65 L75,90 L55,70 L50,95 L45,70 L25,90 L35,65 L5,65 L30,50 L5,35 L35,35 L25,10 L45,30 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'ring',
    name: 'Ring',
    category: 'shapes',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M50,25 A25,25 0 1,0 50.01,25 Z',
    previewColor: '#ec4899',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL HALLOWEEN
  // ============================================
  {
    id: 'mummy',
    name: 'Mummy',
    category: 'halloween',
    pathData: 'M30,20 C30,8 40,3 50,3 C60,3 70,8 70,20 L70,85 C70,92 60,97 50,97 C40,97 30,92 30,85 Z M30,20 L70,25 M30,35 L70,30 M30,45 L70,50 M30,60 L70,55 M30,75 L70,80 M38,42 A5,5 0 1,1 38.01,42 M62,42 A5,5 0 1,1 62.01,42',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'eyeball',
    name: 'Eyeball',
    category: 'halloween',
    pathData: 'M50,10 C20,10 5,35 5,50 C5,70 20,90 50,90 C80,90 95,70 95,50 C95,35 80,10 50,10 Z M50,30 A20,20 0 1,1 50.01,30 M50,40 A10,10 0 1,1 50.01,40 M35,20 L40,30 M60,25 L55,35',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'haunted-house',
    name: 'Haunted House',
    category: 'halloween',
    pathData: 'M10,95 L10,50 L5,50 L50,15 L95,50 L90,50 L90,95 Z M35,95 L35,70 L45,70 L45,95 M55,95 L55,70 L65,70 L65,95 M40,50 L60,50 L60,65 L40,65 Z M70,45 L70,30 L80,30 L80,50 M22,60 L32,60 L32,70 L22,70 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'zombie-hand',
    name: 'Zombie Hand',
    category: 'halloween',
    pathData: 'M40,95 L40,60 L25,60 L25,35 L35,35 L35,50 L40,50 L40,25 L50,25 L50,50 L55,50 L55,20 L65,20 L65,50 L70,50 L70,30 L80,30 L80,60 L55,60 L55,95 Z',
    previewColor: '#65a30d',
    mazeRecommended: true,
  },
  {
    id: 'reaper',
    name: 'Grim Reaper',
    category: 'halloween',
    pathData: 'M35,25 C35,10 50,5 65,10 C75,15 80,30 75,45 L75,80 L70,95 L45,95 L40,80 L40,45 C35,35 35,25 35,25 Z M45,35 A5,5 0 1,1 45.01,35 M60,35 A5,5 0 1,1 60.01,35 M5,40 L35,55 L5,70 Z M15,30 L40,45',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'bones',
    name: 'Crossbones',
    category: 'halloween',
    pathData: 'M15,15 A8,8 0 1,1 25,25 L75,75 A8,8 0 1,1 85,85 A8,8 0 1,1 75,75 L25,25 A8,8 0 1,1 15,15 M85,15 A8,8 0 1,1 75,25 L25,75 A8,8 0 1,1 15,85 A8,8 0 1,1 25,75 L75,25 A8,8 0 1,1 85,15',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL HARVEST
  // ============================================
  {
    id: 'cornucopia',
    name: 'Cornucopia',
    category: 'harvest',
    pathData: 'M90,70 C70,70 50,60 30,45 C15,35 5,20 5,20 C5,20 10,25 20,30 C30,35 45,45 55,55 C65,65 75,75 90,80 C95,81 95,69 90,70 Z M15,10 A8,8 0 1,1 15.01,10 M25,5 A6,6 0 1,1 25.01,5 M10,20 A5,5 0 1,1 10.01,20',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'gourd',
    name: 'Gourd',
    category: 'harvest',
    pathData: 'M50,12 L50,5 M45,12 C30,15 20,30 20,50 C20,75 35,95 50,95 C65,95 80,75 80,50 C80,30 70,15 55,12 C55,8 60,5 60,5 M35,40 C30,50 30,70 40,80 M65,40 C70,50 70,70 60,80',
    previewColor: '#84cc16',
    mazeRecommended: true,
  },
  {
    id: 'basket',
    name: 'Harvest Basket',
    category: 'harvest',
    pathData: 'M15,40 L85,40 L75,90 L25,90 Z M15,40 C15,25 30,15 50,15 C70,15 85,25 85,40 M25,55 L75,55 M25,70 L75,70 M35,40 L30,90 M50,40 L50,90 M65,40 L70,90',
    previewColor: '#a16207',
    mazeRecommended: true,
  },
  {
    id: 'grapes',
    name: 'Grapes',
    category: 'harvest',
    pathData: 'M50,10 L50,20 M45,20 L55,15 L55,20 M30,35 A12,12 0 1,1 30.01,35 M50,35 A12,12 0 1,1 50.01,35 M70,35 A12,12 0 1,1 70.01,35 M40,55 A12,12 0 1,1 40.01,55 M60,55 A12,12 0 1,1 60.01,55 M50,75 A12,12 0 1,1 50.01,75',
    previewColor: '#7c3aed',
    mazeRecommended: true,
  },
  {
    id: 'pear',
    name: 'Pear',
    category: 'harvest',
    pathData: 'M50,8 L50,18 M55,10 C60,5 65,8 60,15 M45,25 C30,35 25,55 30,75 C35,90 50,95 50,95 C50,95 65,90 70,75 C75,55 70,35 55,25 C55,20 50,18 50,18 C50,18 45,20 45,25 Z',
    previewColor: '#a3e635',
    mazeRecommended: true,
  },
  {
    id: 'turkey',
    name: 'Turkey',
    category: 'harvest',
    pathData: 'M50,70 A20,15 0 1,1 50.01,70 M30,55 L25,45 L35,50 M70,55 L75,45 L65,50 M40,50 C30,35 35,15 50,10 C65,15 70,35 60,50 M45,50 L45,40 C45,30 55,30 55,40 L55,50 M55,70 L55,90 L60,95 M45,70 L45,90 L40,95 M45,75 A3,3 0 1,1 45.01,75 M55,75 A3,3 0 1,1 55.01,75 M48,82 L50,85 L52,82',
    previewColor: '#92400e',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL FARM
  // ============================================
  {
    id: 'farmhouse',
    name: 'Farmhouse',
    category: 'farm',
    pathData: 'M10,95 L10,50 L50,20 L90,50 L90,95 Z M40,95 L40,70 L60,70 L60,95 M20,60 L30,60 L30,70 L20,70 Z M70,60 L80,60 L80,70 L70,70 Z M45,40 L55,40 L55,50 L45,50 Z M75,35 L75,15 L90,15 L90,50',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'weathervane',
    name: 'Weather Vane',
    category: 'farm',
    pathData: 'M48,95 L48,40 L52,40 L52,95 M35,40 L65,40 L65,45 L35,45 Z M30,30 L70,30 L75,20 L85,25 L75,30 L70,35 L30,35 L25,30 L15,25 L25,20 Z M50,30 L50,10 M45,10 L55,10',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'milk-can',
    name: 'Milk Can',
    category: 'farm',
    pathData: 'M35,15 L65,15 L65,25 C75,30 80,40 80,55 L80,85 C80,92 65,95 50,95 C35,95 20,92 20,85 L20,55 C20,40 25,30 35,25 Z M35,15 L35,10 C35,5 45,5 50,5 C55,5 65,5 65,10 L65,15 M30,45 L70,45 M40,60 L40,75 M50,55 L50,80 M60,60 L60,75',
    previewColor: '#9ca3af',
    mazeRecommended: true,
  },
  {
    id: 'horseshoe',
    name: 'Horseshoe',
    category: 'farm',
    pathData: 'M25,85 L25,40 C25,20 40,10 50,10 C60,10 75,20 75,40 L75,85 L65,85 L65,40 C65,30 58,20 50,20 C42,20 35,30 35,40 L35,85 Z M25,80 A5,5 0 1,1 25.01,80 M35,80 A5,5 0 1,1 35.01,80 M65,80 A5,5 0 1,1 65.01,80 M75,80 A5,5 0 1,1 75.01,80',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'watering-can',
    name: 'Watering Can',
    category: 'farm',
    pathData: 'M25,40 L75,40 L70,85 L30,85 Z M60,40 L60,25 C60,20 70,20 75,25 L90,40 M25,55 L15,45 L5,50 L15,55 L25,60 M35,50 L35,75 M50,45 L50,80 M65,50 L65,75',
    previewColor: '#059669',
    mazeRecommended: true,
  },
  {
    id: 'boots',
    name: 'Farm Boots',
    category: 'farm',
    pathData: 'M20,20 L35,20 L35,65 L5,65 L5,55 L20,55 Z M50,20 L65,20 L65,55 L80,55 L80,65 L50,65 Z M20,20 C20,10 27,5 27,5 L28,20 M50,20 C50,10 57,5 57,5 L58,20',
    previewColor: '#92400e',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL ANIMALS
  // ============================================
  {
    id: 'butterfly',
    name: 'Butterfly',
    category: 'animals',
    pathData: 'M50,25 L50,75 M50,25 C25,5 5,25 15,45 C25,60 45,50 50,50 C55,50 75,60 85,45 C95,25 75,5 50,25 M50,50 C25,75 15,95 35,90 C50,87 50,75 50,75 C50,75 50,87 65,90 C85,95 75,75 50,50 M45,35 A3,3 0 1,1 45.01,35 M55,35 A3,3 0 1,1 55.01,35',
    previewColor: '#f472b6',
    mazeRecommended: true,
  },
  {
    id: 'bee',
    name: 'Bee',
    category: 'animals',
    pathData: 'M40,35 L35,20 M60,35 L65,20 M50,35 A20,15 0 1,1 50.01,35 M50,55 A15,20 0 1,1 50.01,55 M30,55 L15,50 L30,60 M70,55 L85,50 L70,60 M35,45 L65,45 M35,60 L65,60 M42,38 A3,3 0 1,1 42.01,38 M58,38 A3,3 0 1,1 58.01,38',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'fish',
    name: 'Fish',
    category: 'animals',
    pathData: 'M75,50 C75,30 55,15 35,20 C15,25 5,40 5,50 C5,60 15,75 35,80 C55,85 75,70 75,50 Z M75,50 L95,35 L95,65 Z M25,45 A5,5 0 1,1 25.01,45 M35,50 L45,45 M35,55 L45,60 M55,45 L65,50 M55,60 L65,55',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'frog',
    name: 'Frog',
    category: 'animals',
    pathData: 'M30,30 A12,12 0 1,1 30.01,30 M70,30 A12,12 0 1,1 70.01,30 M50,45 C25,45 10,60 10,75 C10,90 30,95 50,95 C70,95 90,90 90,75 C90,60 75,45 50,45 Z M20,75 L20,90 L30,90 M80,75 L80,90 L70,90 M35,70 C40,75 60,75 65,70 M32,28 A4,4 0 1,1 32.01,28 M68,28 A4,4 0 1,1 68.01,28',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'squirrel',
    name: 'Squirrel',
    category: 'animals',
    pathData: 'M35,40 C25,35 20,25 25,15 C30,5 45,5 50,15 C55,5 70,10 70,25 C70,35 60,45 50,45 L50,60 L40,60 L40,70 L50,70 L50,85 L60,85 L60,70 L70,70 L70,85 L80,85 L80,65 C90,55 90,35 80,30 L80,20 C90,15 95,25 90,35 M38,30 A3,3 0 1,1 38.01,30',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'goat',
    name: 'Goat',
    category: 'animals',
    pathData: 'M25,25 L15,10 L25,20 M35,20 L30,5 L40,15 M30,25 C15,35 10,55 20,70 L20,90 L30,90 L30,70 L40,75 L40,90 L50,90 L50,75 L60,75 L60,90 L70,90 L70,70 L80,75 L80,90 L90,90 L90,70 C95,55 85,35 70,30 L75,25 L65,25 L60,20 L40,20 Z M35,45 A4,4 0 1,1 35.01,45 M55,60 L55,70',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'ladybug',
    name: 'Ladybug',
    category: 'animals',
    pathData: 'M50,15 A35,40 0 1,1 50.01,15 M50,15 L50,95 M30,35 A6,6 0 1,1 30.01,35 M70,35 A6,6 0 1,1 70.01,35 M25,55 A5,5 0 1,1 25.01,55 M40,70 A5,5 0 1,1 40.01,70 M55,50 A5,5 0 1,1 55.01,50 M70,65 A5,5 0 1,1 70.01,65 M35,10 L35,5 M50,8 L50,3 M65,10 L65,5',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'turtle',
    name: 'Turtle',
    category: 'animals',
    pathData: 'M50,20 C25,20 10,40 10,55 C10,75 25,85 50,85 C75,85 90,75 90,55 C90,40 75,20 50,20 Z M10,55 L5,50 L5,60 Z M90,55 L95,50 L95,60 Z M25,85 L20,95 L30,90 M75,85 L80,95 L70,90 M50,20 L45,10 L55,10 Z M30,45 A6,6 0 1,1 30.01,45 M50,40 A6,6 0 1,1 50.01,40 M70,45 A6,6 0 1,1 70.01,45 M40,60 A6,6 0 1,1 40.01,60 M60,60 A6,6 0 1,1 60.01,60 M50,75 A6,6 0 1,1 50.01,75',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL NATURE
  // ============================================
  {
    id: 'rainbow',
    name: 'Rainbow',
    category: 'nature',
    pathData: 'M5,80 C5,40 25,10 50,10 C75,10 95,40 95,80 L85,80 C85,45 70,20 50,20 C30,20 15,45 15,80 Z M15,80 C15,50 30,30 50,30 C70,30 85,50 85,80 L75,80 C75,55 65,40 50,40 C35,40 25,55 25,80 Z',
    previewColor: '#f472b6',
    mazeRecommended: true,
  },
  {
    id: 'lightning',
    name: 'Lightning Bolt',
    category: 'nature',
    pathData: 'M55,5 L25,45 L45,45 L35,95 L75,45 L55,45 L70,5 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'waves',
    name: 'Waves',
    category: 'nature',
    pathData: 'M5,40 C15,30 25,30 35,40 C45,50 55,50 65,40 C75,30 85,30 95,40 L95,50 C85,40 75,40 65,50 C55,60 45,60 35,50 C25,40 15,40 5,50 Z M5,60 C15,50 25,50 35,60 C45,70 55,70 65,60 C75,50 85,50 95,60 L95,70 C85,60 75,60 65,70 C55,80 45,80 35,70 C25,60 15,60 5,70 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'raindrop',
    name: 'Raindrop',
    category: 'nature',
    pathData: 'M50,5 C50,5 20,45 20,65 C20,85 35,95 50,95 C65,95 80,85 80,65 C80,45 50,5 50,5 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'snowman',
    name: 'Snowman',
    category: 'nature',
    pathData: 'M50,20 A15,15 0 1,1 50.01,20 M50,50 A20,20 0 1,1 50.01,50 M50,85 A25,25 0 1,1 50.01,85 M42,18 A3,3 0 1,1 42.01,18 M58,18 A3,3 0 1,1 58.01,18 M50,25 L52,28 L48,28 M50,42 A3,3 0 1,1 50.01,42 M50,55 A3,3 0 1,1 50.01,55 M25,45 L10,35 M75,45 L90,35',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'four-leaf-clover',
    name: 'Four-Leaf Clover',
    category: 'nature',
    pathData: 'M50,95 L50,55 M50,55 C30,55 20,45 20,30 C20,15 35,10 50,25 C65,10 80,15 80,30 C80,45 70,55 50,55 M50,55 C55,35 65,25 80,25 C95,25 95,45 80,55 C65,65 55,55 50,55 M50,55 C45,35 35,25 20,25 C5,25 5,45 20,55 C35,65 45,55 50,55',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'oak-leaf',
    name: 'Oak Leaf',
    category: 'nature',
    pathData: 'M50,95 L50,50 M50,50 C45,50 35,55 30,45 C25,35 35,35 40,40 C35,30 25,30 25,20 C25,10 40,15 45,25 C45,15 40,5 50,5 C60,5 55,15 55,25 C60,15 75,10 75,20 C75,30 65,30 60,40 C65,35 75,35 70,45 C65,55 55,50 50,50',
    previewColor: '#65a30d',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL ARROWS
  // ============================================
  {
    id: 'arrow-circle',
    name: 'Circular Arrow',
    category: 'arrows',
    pathData: 'M50,15 A35,35 0 1,1 15,50 L5,50 L20,35 L35,50 L25,50 A25,25 0 1,0 50,25 L50,15 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'arrow-refresh',
    name: 'Refresh Arrows',
    category: 'arrows',
    pathData: 'M75,25 A30,30 0 0,1 75,75 L85,75 L70,95 L55,75 L65,75 A20,20 0 0,0 65,35 Z M25,75 A30,30 0 0,1 25,25 L15,25 L30,5 L45,25 L35,25 A20,20 0 0,0 35,65 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'arrow-split',
    name: 'Split Arrow',
    category: 'arrows',
    pathData: 'M45,95 L45,50 L20,50 L20,30 L5,50 L20,70 L20,50 M55,95 L55,50 L80,50 L80,70 L95,50 L80,30 L80,50',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'arrow-merge',
    name: 'Merge Arrow',
    category: 'arrows',
    pathData: 'M15,15 L15,45 L40,45 L40,65 L60,65 L60,45 L85,45 L85,15 L70,15 L70,30 L30,30 L30,15 Z M40,65 L50,95 L60,65',
    previewColor: '#10b981',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL SPORTS
  // ============================================
  {
    id: 'tennis-ball',
    name: 'Tennis Ball',
    category: 'sports',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M15,30 C30,45 30,55 15,70 M85,30 C70,45 70,55 85,70',
    previewColor: '#bef264',
    mazeRecommended: true,
  },
  {
    id: 'golf-ball',
    name: 'Golf Ball',
    category: 'sports',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M30,30 A3,3 0 1,1 30.01,30 M50,25 A3,3 0 1,1 50.01,25 M70,30 A3,3 0 1,1 70.01,30 M25,50 A3,3 0 1,1 25.01,50 M40,45 A3,3 0 1,1 40.01,45 M60,45 A3,3 0 1,1 60.01,45 M75,50 A3,3 0 1,1 75.01,50 M35,65 A3,3 0 1,1 35.01,65 M50,60 A3,3 0 1,1 50.01,60 M65,65 A3,3 0 1,1 65.01,65 M50,75 A3,3 0 1,1 50.01,75',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    category: 'sports',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M50,5 C40,25 40,75 50,95 M50,5 C60,25 60,75 50,95 M5,50 C25,40 75,40 95,50 M5,50 C25,60 75,60 95,50',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'hockey-stick',
    name: 'Hockey Stick',
    category: 'sports',
    pathData: 'M75,5 L35,80 L10,80 C5,80 5,90 10,90 L40,90 L45,85 L85,10 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'helmet',
    name: 'Football Helmet',
    category: 'sports',
    pathData: 'M25,35 C25,15 40,5 55,5 C75,5 90,20 90,40 C90,60 80,75 60,80 L60,85 L90,85 L90,95 L35,95 L35,80 C20,70 15,55 25,35 Z M30,45 L50,45 L50,55 L30,55 Z M60,35 L75,35 M60,50 L75,50 M60,65 L75,65',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'bowling-pin',
    name: 'Bowling Pin',
    category: 'sports',
    pathData: 'M40,15 C40,8 45,5 50,5 C55,5 60,8 60,15 L62,30 C65,35 65,45 60,50 L65,85 C65,92 58,95 50,95 C42,95 35,92 35,85 L40,50 C35,45 35,35 38,30 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'baseball-bat',
    name: 'Baseball Bat',
    category: 'sports',
    pathData: 'M15,90 L10,85 L60,35 C65,30 75,25 85,25 C95,25 95,35 90,40 L85,45 L35,95 L30,90 Z',
    previewColor: '#a16207',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL HOLIDAYS
  // ============================================
  {
    id: 'menorah',
    name: 'Menorah',
    category: 'holidays',
    pathData: 'M50,15 L50,40 M20,25 L20,40 M30,20 L30,40 M40,18 L40,40 M60,18 L60,40 M70,20 L70,40 M80,25 L80,40 M15,40 L85,40 L85,50 L55,50 L55,75 L60,75 L60,85 L40,85 L40,75 L45,75 L45,50 L15,50 Z M50,8 L53,15 L47,15 Z M20,18 L23,25 L17,25 Z M30,13 L33,20 L27,20 Z M40,11 L43,18 L37,18 Z M60,11 L63,18 L57,18 Z M70,13 L73,20 L67,20 Z M80,18 L83,25 L77,25 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'dreidel',
    name: 'Dreidel',
    category: 'holidays',
    pathData: 'M35,10 L65,10 L65,20 L35,20 Z M30,20 L70,20 L70,60 L55,60 L50,90 L45,60 L30,60 Z M40,35 L40,50 L50,50 L50,40 L45,35 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    category: 'holidays',
    pathData: 'M50,50 L50,20 M50,50 L50,80 M50,50 L20,50 M50,50 L80,50 M50,50 L25,25 M50,50 L75,75 M50,50 L75,25 M50,50 L25,75 M50,15 L45,5 L55,5 Z M50,85 L45,95 L55,95 Z M15,50 L5,45 L5,55 Z M85,50 L95,45 L95,55 Z',
    previewColor: '#f43f5e',
    mazeRecommended: true,
  },
  {
    id: 'american-flag',
    name: 'American Flag',
    category: 'holidays',
    pathData: 'M10,15 L90,15 L90,85 L10,85 Z M10,15 L50,15 L50,50 L10,50 Z M10,27 L90,27 M10,39 L90,39 M10,51 L90,51 M10,63 L90,63 M10,75 L90,75 M18,22 A2,2 0 1,1 18.01,22 M30,22 A2,2 0 1,1 30.01,22 M42,22 A2,2 0 1,1 42.01,22 M24,32 A2,2 0 1,1 24.01,32 M36,32 A2,2 0 1,1 36.01,32 M18,42 A2,2 0 1,1 18.01,42 M30,42 A2,2 0 1,1 30.01,42 M42,42 A2,2 0 1,1 42.01,42',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'ornament',
    name: 'Christmas Ornament',
    category: 'holidays',
    pathData: 'M45,10 L55,10 L55,20 L45,20 Z M40,20 L60,20 C60,20 70,25 70,30 L30,30 C30,25 40,20 40,20 M50,30 A35,40 0 1,1 50.01,30',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'bell',
    name: 'Bell',
    category: 'holidays',
    pathData: 'M50,5 A8,8 0 1,1 50.01,5 M45,13 C30,18 20,35 20,55 L20,70 L10,70 L10,80 L90,80 L90,70 L80,70 L80,55 C80,35 70,18 55,13 M40,80 C40,90 45,95 50,95 C55,95 60,90 60,80',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'stocking',
    name: 'Christmas Stocking',
    category: 'holidays',
    pathData: 'M30,5 L70,5 L70,50 L85,70 C95,85 85,95 70,90 L55,80 L40,95 C25,100 15,85 25,70 L40,50 L40,20 L30,20 Z M30,5 L70,5 L70,15 L30,15 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'wreath',
    name: 'Wreath',
    category: 'holidays',
    pathData: 'M50,10 A40,40 0 1,1 50.01,10 M50,25 A25,25 0 1,0 50.01,25 M45,8 L50,3 L55,8 L52,8 L50,12 L48,8 Z M50,95 L45,92 L50,88 L55,92 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },

  // ============================================
  // ADDITIONAL SYMBOLS
  // ============================================
  {
    id: 'anchor',
    name: 'Anchor',
    category: 'symbols',
    pathData: 'M50,20 A10,10 0 1,1 50.01,20 M45,30 L45,75 M55,30 L55,75 M50,75 A25,25 0 0,1 25,50 L15,55 L25,45 L35,55 L25,50 A15,15 0 0,0 40,70 M50,75 A25,25 0 0,0 75,50 L85,55 L75,45 L65,55 L75,50 A15,15 0 0,1 60,70 M30,30 L70,30',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'compass',
    name: 'Compass',
    category: 'symbols',
    pathData: 'M50,5 A45,45 0 1,1 50.01,5 M50,15 L55,50 L50,85 L45,50 Z M15,50 L50,45 L85,50 L50,55 Z M50,15 L45,50 M50,15 L55,50 M15,50 L50,45 M15,50 L50,55',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'crown',
    name: 'Crown',
    category: 'symbols',
    pathData: 'M10,75 L10,35 L30,55 L50,25 L70,55 L90,35 L90,75 Z M15,75 L85,75 L85,85 L15,85 Z M30,45 A3,3 0 1,1 30.01,45 M50,20 A4,4 0 1,1 50.01,20 M70,45 A3,3 0 1,1 70.01,45',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'key',
    name: 'Key',
    category: 'symbols',
    pathData: 'M30,35 A20,20 0 1,1 30.01,35 M30,20 A5,5 0 1,0 30.01,20 M45,35 L90,35 L90,45 L80,45 L80,55 L70,55 L70,45 L45,45 M30,45 L45,45',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'lock',
    name: 'Lock',
    category: 'symbols',
    pathData: 'M25,45 L25,30 C25,15 35,5 50,5 C65,5 75,15 75,30 L75,45 M35,30 C35,20 42,15 50,15 C58,15 65,20 65,30 L65,45 L35,45 Z M20,45 L80,45 L80,90 L20,90 Z M50,60 A8,8 0 1,1 50.01,60 M46,68 L54,68 L54,78 L46,78 Z',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'lightbulb',
    name: 'Light Bulb',
    category: 'symbols',
    pathData: 'M50,5 C25,5 10,25 10,45 C10,60 20,70 35,75 L35,85 L65,85 L65,75 C80,70 90,60 90,45 C90,25 75,5 50,5 Z M35,85 L35,90 L65,90 L65,85 M40,90 L40,95 L60,95 L60,90 M50,20 L50,35 M35,35 L45,45 M65,35 L55,45',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'infinity',
    name: 'Infinity',
    category: 'symbols',
    pathData: 'M50,50 C50,35 35,25 25,35 C15,45 15,55 25,65 C35,75 50,65 50,50 C50,35 65,25 75,35 C85,45 85,55 75,65 C65,75 50,65 50,50 Z',
    previewColor: '#8b5cf6',
    mazeRecommended: true,
  },
  {
    id: 'recycle',
    name: 'Recycle',
    category: 'symbols',
    pathData: 'M50,15 L65,40 L55,40 L55,55 L45,55 L45,40 L35,40 Z M25,55 L10,80 L25,80 L35,65 L45,65 L35,80 L20,80 L15,70 L25,55 M75,55 L90,80 L75,80 L65,65 L55,65 L65,80 L80,80 L85,70 L75,55',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'wifi',
    name: 'WiFi Signal',
    category: 'symbols',
    pathData: 'M50,85 A8,8 0 1,1 50.01,85 M50,60 C35,60 25,70 25,75 L15,75 C15,65 30,50 50,50 C70,50 85,65 85,75 L75,75 C75,70 65,60 50,60 M50,35 C25,35 5,55 5,75 L15,75 C15,60 30,45 50,45 C70,45 85,60 85,75 L95,75 C95,55 75,35 50,35',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'power',
    name: 'Power Symbol',
    category: 'symbols',
    pathData: 'M50,5 L50,45 M25,25 C10,40 10,65 25,80 C40,95 60,95 75,80 C90,65 90,40 75,25',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'gear',
    name: 'Gear',
    category: 'symbols',
    pathData: 'M50,50 A15,15 0 1,1 50.01,50 M45,10 L55,10 L57,25 L43,25 Z M45,90 L55,90 L57,75 L43,75 Z M10,45 L10,55 L25,57 L25,43 Z M90,45 L90,55 L75,57 L75,43 Z M20,20 L27,27 L37,17 L30,10 Z M80,80 L73,73 L63,83 L70,90 Z M80,20 L73,27 L83,37 L90,30 Z M20,80 L27,73 L17,63 L10,70 Z',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'thumbs-up',
    name: 'Thumbs Up',
    category: 'symbols',
    pathData: 'M30,95 L30,50 L15,50 L15,95 Z M35,50 L35,40 C35,25 45,20 55,25 L60,10 C60,5 70,5 70,15 L65,35 L85,35 C95,35 95,50 90,55 C95,60 95,70 90,75 C92,80 90,90 80,90 L40,90 L40,50 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'flag',
    name: 'Flag',
    category: 'symbols',
    pathData: 'M20,5 L20,95 M20,5 L85,5 L70,30 L85,55 L20,55',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
];

/**
 * Get clipart by category
 */
export function getClipArtByCategory(category: ClipArtCategory): ClipArtItem[] {
  return clipartLibrary.filter((item) => item.category === category);
}

/**
 * Get maze-recommended clipart
 */
export function getMazeRecommendedClipArt(): ClipArtItem[] {
  return clipartLibrary.filter((item) => item.mazeRecommended);
}

/**
 * Get clipart by ID
 */
export function getClipArtById(id: string): ClipArtItem | undefined {
  return clipartLibrary.find((item) => item.id === id);
}

/**
 * Get all categories with counts
 */
export function getCategoriesWithCounts(): Array<{
  id: ClipArtCategory;
  label: string;
  description: string;
  count: number;
}> {
  return clipartCategories.map((cat) => ({
    ...cat,
    count: clipartLibrary.filter((item) => item.category === cat.id).length,
  }));
}

/**
 * Get all category IDs
 */
export function getCategories(): ClipArtCategory[] {
  return clipartCategories.map((c) => c.id);
}
