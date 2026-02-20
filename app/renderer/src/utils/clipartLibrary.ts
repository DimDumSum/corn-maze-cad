/**
 * Clipart Library - SVG path data for corn maze decorations
 *
 * DESIGN RULES for corn maze clipart:
 * 1. Each shape MUST be a single closed path (or very few large closed paths)
 * 2. NO internal detail lines (eyes, stripes, decorative marks)
 * 3. NO tiny circles or dots — they don't translate to corn paths
 * 4. NO open strokes (stems, rays) — everything must have area
 * 5. Bold, recognizable SILHOUETTES that read from aerial view
 *
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
  // SHAPES - Basic geometric shapes (these are clean single paths)
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
    id: 'burst',
    name: 'Burst',
    category: 'shapes',
    pathData: 'M50,5 L55,30 L75,10 L65,35 L95,35 L70,50 L95,65 L65,65 L75,90 L55,70 L50,95 L45,70 L25,90 L35,65 L5,65 L30,50 L5,35 L35,35 L25,10 L45,30 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'rounded-rect',
    name: 'Rounded Rectangle',
    category: 'shapes',
    pathData: 'M20,10 L80,10 C90,10 95,15 95,25 L95,75 C95,85 90,90 80,90 L20,90 C10,90 5,85 5,75 L5,25 C5,15 10,10 20,10 Z',
    previewColor: '#6366f1',
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

  // ============================================
  // HALLOWEEN - Spooky seasonal clipart (clean silhouettes)
  // ============================================
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    category: 'halloween',
    pathData: 'M43,18 C43,12 48,8 50,8 C52,8 57,12 57,18 C80,18 95,35 95,58 C95,82 75,95 50,95 C25,95 5,82 5,58 C5,35 20,18 43,18 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'ghost',
    name: 'Ghost',
    category: 'halloween',
    pathData: 'M50,5 C25,5 10,25 10,50 L10,85 L20,75 L30,85 L40,75 L50,85 L60,75 L70,85 L80,75 L90,85 L90,50 C90,25 75,5 50,5 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'bat',
    name: 'Bat',
    category: 'halloween',
    pathData: 'M50,25 C45,15 35,15 30,25 L5,15 L15,40 L5,45 L20,50 C15,58 18,68 25,75 L50,85 L75,75 C82,68 85,58 80,50 L95,45 L85,40 L95,15 L70,25 C65,15 55,15 50,25 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'witch-hat',
    name: 'Witch Hat',
    category: 'halloween',
    pathData: 'M50,3 L75,68 L90,68 C92,75 85,82 78,82 L22,82 C15,82 8,75 10,68 L25,68 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'skull',
    name: 'Skull',
    category: 'halloween',
    pathData: 'M50,5 C20,5 5,25 5,50 C5,70 15,82 30,88 L30,95 L70,95 L70,88 C85,82 95,70 95,50 C95,25 80,5 50,5 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'cauldron',
    name: 'Cauldron',
    category: 'halloween',
    pathData: 'M15,35 C5,35 5,45 15,45 L15,75 C15,90 30,95 50,95 C70,95 85,90 85,75 L85,45 C95,45 95,35 85,35 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'tombstone',
    name: 'Tombstone',
    category: 'halloween',
    pathData: 'M20,95 L20,40 C20,15 35,5 50,5 C65,5 80,15 80,40 L80,95 Z',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'black-cat',
    name: 'Black Cat',
    category: 'halloween',
    pathData: 'M25,30 L15,5 L35,25 C45,15 55,15 65,25 L85,5 L75,30 C85,40 85,60 75,75 L80,90 L70,85 C60,92 40,92 30,85 L20,90 L25,75 C15,60 15,40 25,30 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'coffin',
    name: 'Coffin',
    category: 'halloween',
    pathData: 'M35,5 L65,5 L75,30 L75,90 L60,95 L40,95 L25,90 L25,30 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'haunted-house',
    name: 'Haunted House',
    category: 'halloween',
    pathData: 'M10,95 L10,50 L5,50 L50,15 L95,50 L90,50 L90,95 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'candy-corn',
    name: 'Candy Corn',
    category: 'halloween',
    pathData: 'M50,5 L20,95 L80,95 Z',
    previewColor: '#f97316',
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

  // ============================================
  // HARVEST - Fall & autumn themed (clean silhouettes)
  // ============================================
  {
    id: 'corn-stalk',
    name: 'Corn Stalk',
    category: 'harvest',
    pathData: 'M44,95 L44,60 C38,55 25,48 20,35 C18,28 25,25 30,30 C35,35 40,45 44,50 L44,40 C38,35 28,25 25,12 C23,5 32,5 36,10 C40,18 43,30 44,35 L44,22 C42,18 38,10 40,5 C42,2 48,2 50,5 L50,8 C52,5 55,2 58,2 C62,5 58,10 56,15 L56,35 C57,30 60,18 64,10 C68,5 77,5 75,12 C72,25 62,35 56,40 L56,50 C60,45 65,35 70,30 C75,25 82,28 80,35 C75,48 62,55 56,60 L56,95 Z',
    previewColor: '#65a30d',
    mazeRecommended: true,
  },
  {
    id: 'apple',
    name: 'Apple',
    category: 'harvest',
    pathData: 'M48,15 C48,10 50,5 50,5 C55,8 58,5 62,8 C60,12 56,15 55,18 C80,22 92,42 92,58 C92,82 72,95 50,95 C28,95 8,82 8,58 C8,42 20,22 45,18 C44,15 42,10 48,15 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    category: 'harvest',
    pathData: 'M50,50 C58,50 62,46 62,38 L55,20 L45,20 L38,38 C38,46 42,50 50,50 Z M50,50 C50,58 46,62 38,62 L20,55 L20,45 L38,38 C46,38 50,42 50,50 Z M50,50 C42,50 38,54 38,62 L45,80 L55,80 L62,62 C62,54 58,50 50,50 Z M50,50 C50,42 54,38 62,38 L80,45 L80,55 L62,62 C54,62 50,58 50,50 Z M50,50 C55,45 62,42 68,30 L60,15 L50,22 L42,15 L32,30 C38,42 45,45 50,50 Z M50,50 C45,55 42,62 30,68 L15,60 L22,50 L15,42 L30,32 C42,38 45,45 50,50 Z M50,50 C55,55 62,58 68,70 L60,85 L50,78 L42,85 L32,70 C38,58 45,55 50,50 Z M50,50 C45,45 38,42 30,32 L42,15 L50,22 L58,15 L68,30 C62,42 55,45 50,50 Z',
    previewColor: '#facc15',
    mazeRecommended: true,
  },
  {
    id: 'acorn',
    name: 'Acorn',
    category: 'harvest',
    pathData: 'M48,5 L48,12 L30,12 L25,28 L75,28 L70,12 L52,12 L52,5 Z M30,28 C20,35 15,50 20,70 C25,85 40,95 50,95 C60,95 75,85 80,70 C85,50 80,35 70,28 Z',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'leaf',
    name: 'Autumn Leaf',
    category: 'harvest',
    pathData: 'M48,95 L48,55 C30,52 12,35 18,12 C25,18 38,28 48,42 L48,30 C42,20 38,8 50,5 C62,8 58,20 52,30 L52,42 C62,28 75,18 82,12 C88,35 70,52 52,55 L52,95 Z',
    previewColor: '#ea580c',
    mazeRecommended: true,
  },
  {
    id: 'maple-leaf',
    name: 'Maple Leaf',
    category: 'harvest',
    pathData: 'M48,95 L48,62 L35,72 L38,52 L15,58 L32,45 L18,38 L38,38 L28,18 L44,28 L50,5 L56,28 L72,18 L62,38 L82,38 L68,45 L85,58 L62,52 L65,72 L52,62 L52,95 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'hay-bale',
    name: 'Hay Bale',
    category: 'harvest',
    pathData: 'M10,30 L50,15 L90,30 L90,80 L10,80 Z',
    previewColor: '#d97706',
    mazeRecommended: true,
  },
  {
    id: 'pie',
    name: 'Pie',
    category: 'harvest',
    pathData: 'M10,60 C10,35 30,20 50,20 C70,20 90,35 90,60 L90,70 C90,80 70,85 50,85 C30,85 10,80 10,70 Z',
    previewColor: '#d97706',
    mazeRecommended: true,
  },
  {
    id: 'scarecrow',
    name: 'Scarecrow',
    category: 'harvest',
    pathData: 'M42,25 C42,15 46,8 50,8 C54,8 58,15 58,25 L62,25 C65,25 68,28 68,32 L68,38 C68,42 65,45 62,45 L58,45 L58,48 L55,48 L55,95 L45,95 L45,48 L42,48 L38,45 C35,45 32,42 32,38 L32,32 C32,28 35,25 38,25 Z M5,40 L95,40 L95,48 L5,48 Z',
    previewColor: '#d97706',
    mazeRecommended: true,
  },
  {
    id: 'pear',
    name: 'Pear',
    category: 'harvest',
    pathData: 'M48,8 L48,18 C30,25 22,48 25,70 C28,88 42,95 50,95 C58,95 72,88 75,70 C78,48 70,25 52,18 L52,8 Z',
    previewColor: '#a3e635',
    mazeRecommended: true,
  },
  {
    id: 'turkey',
    name: 'Turkey',
    category: 'harvest',
    pathData: 'M55,65 C70,65 82,72 82,82 C82,90 68,95 55,95 L45,95 C32,95 18,90 18,82 C18,72 30,65 45,65 L45,55 C35,50 28,38 35,22 C38,15 45,10 50,10 C55,10 62,15 65,22 C72,38 65,50 55,55 Z',
    previewColor: '#92400e',
    mazeRecommended: true,
  },

  // ============================================
  // FARM - Agricultural themed (clean silhouettes)
  // ============================================
  {
    id: 'tractor',
    name: 'Tractor',
    category: 'farm',
    pathData: 'M15,78 C8,78 2,72 2,65 C2,58 8,52 15,52 C22,52 28,58 28,65 C28,72 22,78 15,78 Z M75,82 C62,82 52,72 52,60 C52,48 62,38 75,38 C88,38 98,48 98,60 C98,72 88,82 75,82 Z M5,50 L5,40 L25,40 L25,30 L60,30 L65,20 L88,20 L88,35 L50,35 L50,50 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'barn',
    name: 'Barn',
    category: 'farm',
    pathData: 'M10,95 L10,45 L50,15 L90,45 L90,95 Z',
    previewColor: '#b91c1c',
    mazeRecommended: true,
  },
  {
    id: 'windmill',
    name: 'Windmill',
    category: 'farm',
    pathData: 'M35,95 L40,40 L48,40 L48,28 L45,5 L50,28 L55,5 L52,28 L52,40 L60,40 L65,95 Z',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'silo',
    name: 'Silo',
    category: 'farm',
    pathData: 'M30,95 L30,30 C30,15 40,5 50,5 C60,5 70,15 70,30 L70,95 Z',
    previewColor: '#9ca3af',
    mazeRecommended: true,
  },
  {
    id: 'horseshoe',
    name: 'Horseshoe',
    category: 'farm',
    pathData: 'M22,88 L22,40 C22,18 35,8 50,8 C65,8 78,18 78,40 L78,88 L65,88 L65,40 C65,28 58,20 50,20 C42,20 35,28 35,40 L35,88 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'watering-can',
    name: 'Watering Can',
    category: 'farm',
    pathData: 'M25,38 L75,38 L70,85 L30,85 Z M60,38 L60,25 C60,18 70,18 75,22 L90,38 Z',
    previewColor: '#059669',
    mazeRecommended: true,
  },
  {
    id: 'fence',
    name: 'Fence',
    category: 'farm',
    pathData: 'M5,28 L95,28 L95,34 L5,34 Z M5,58 L95,58 L95,64 L5,64 Z M12,18 L28,18 L28,72 L12,72 Z M38,18 L54,18 L54,72 L38,72 Z M65,18 L80,18 L80,72 L65,72 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'farmhouse',
    name: 'Farmhouse',
    category: 'farm',
    pathData: 'M10,95 L10,50 L50,20 L90,50 L90,95 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },

  // ============================================
  // ANIMALS - Farm animals and wildlife (clean silhouettes)
  // ============================================
  {
    id: 'cow',
    name: 'Cow',
    category: 'animals',
    pathData: 'M20,32 L10,22 L22,28 L30,22 L40,22 L45,28 L55,28 L60,22 L70,22 L78,28 L90,22 L80,32 C90,42 92,55 88,68 L88,85 L78,85 L78,68 L68,72 L68,85 L58,85 L58,72 L42,72 L42,85 L32,85 L32,68 L22,72 L22,85 L12,85 L12,68 C8,55 10,42 20,32 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'pig',
    name: 'Pig',
    category: 'animals',
    pathData: 'M22,28 L14,18 L25,24 C35,18 65,18 75,24 L86,18 L78,28 C88,38 90,58 82,72 L82,88 L72,88 L72,72 L28,72 L28,88 L18,88 L18,72 C10,58 12,38 22,28 Z',
    previewColor: '#fda4af',
    mazeRecommended: true,
  },
  {
    id: 'chicken',
    name: 'Chicken',
    category: 'animals',
    pathData: 'M52,8 L58,18 C72,22 82,38 82,55 L82,72 L72,72 L72,60 L60,65 L60,85 L48,85 L48,65 L35,60 L35,72 L25,72 L25,55 C25,38 35,22 48,18 L42,8 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'horse',
    name: 'Horse',
    category: 'animals',
    pathData: 'M28,22 L22,5 L32,18 C38,12 48,8 55,8 L62,8 L72,5 L65,15 C78,22 88,38 88,55 L88,85 L78,85 L78,58 L68,62 L68,85 L58,85 L58,62 L42,62 L42,85 L32,85 L32,58 L22,55 C15,48 12,38 18,28 Z',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'sheep',
    name: 'Sheep',
    category: 'animals',
    pathData: 'M25,35 C15,35 8,42 8,52 C8,65 18,72 25,72 L25,88 L35,88 L35,72 L65,72 L65,88 L75,88 L75,72 C82,72 92,65 92,52 C92,42 85,35 75,35 C72,28 62,22 50,22 C38,22 28,28 25,35 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'duck',
    name: 'Duck',
    category: 'animals',
    pathData: 'M75,38 L92,32 L88,42 L75,42 C82,52 82,65 75,75 C68,82 55,85 42,82 C28,78 15,68 12,55 C8,42 15,30 28,25 C38,22 50,22 58,28 L55,18 L48,18 L42,22 L38,20 C42,15 48,12 55,12 C62,12 68,18 68,28 L75,38 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    category: 'animals',
    pathData: 'M32,38 L28,5 L42,32 L58,32 L72,5 L68,38 C78,48 82,62 78,75 L78,90 L68,90 L68,75 L32,75 L32,90 L22,90 L22,75 C18,62 22,48 32,38 Z',
    previewColor: '#9ca3af',
    mazeRecommended: true,
  },
  {
    id: 'deer',
    name: 'Deer',
    category: 'animals',
    pathData: 'M30,22 L25,5 L35,15 L40,5 L42,22 L58,22 L60,5 L65,15 L75,5 L70,22 C82,32 88,48 85,65 L85,88 L75,88 L75,65 L62,68 L62,88 L52,88 L52,68 L48,68 L48,88 L38,88 L38,65 L25,68 L25,88 L15,88 L15,65 C12,48 18,32 30,22 Z',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    category: 'animals',
    pathData: 'M48,25 C30,8 5,15 10,40 C15,58 42,55 48,50 C42,68 20,90 35,92 C48,92 48,78 48,75 L52,75 C52,78 52,92 65,92 C80,90 58,68 52,50 C58,55 85,58 90,40 C95,15 70,8 52,25 L52,95 L48,95 Z',
    previewColor: '#f472b6',
    mazeRecommended: true,
  },
  {
    id: 'fish',
    name: 'Fish',
    category: 'animals',
    pathData: 'M75,50 C75,30 55,15 35,20 C15,25 5,40 5,50 C5,60 15,75 35,80 C55,85 75,70 75,50 Z M75,50 L95,35 L95,65 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'owl',
    name: 'Owl',
    category: 'animals',
    pathData: 'M25,32 L15,18 L32,28 C38,22 45,18 50,18 C55,18 62,22 68,28 L85,18 L75,32 C85,42 88,58 85,72 L85,82 L68,92 L58,88 L52,92 L48,92 L42,88 L32,92 L15,82 L15,72 C12,58 15,42 25,32 Z',
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
    pathData: 'M42,95 L42,62 C25,60 10,42 15,22 C20,5 35,0 50,0 C65,0 80,5 85,22 C90,42 75,60 58,62 L58,95 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'pine-tree',
    name: 'Pine Tree',
    category: 'nature',
    pathData: 'M44,95 L44,75 L18,75 L38,52 L22,52 L42,30 L28,30 L50,5 L72,30 L58,30 L78,52 L62,52 L82,75 L56,75 L56,95 Z',
    previewColor: '#166534',
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
    pathData: 'M5,90 L35,25 L50,50 L65,25 L95,90 Z',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'cactus',
    name: 'Cactus',
    category: 'nature',
    pathData: 'M42,95 L42,22 C42,12 50,5 55,10 L58,10 L58,95 Z M42,48 L22,48 L22,35 C22,25 32,25 32,35 L32,48 Z M58,58 L78,58 L78,45 C78,35 68,35 68,45 L68,58 Z',
    previewColor: '#22c55e',
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
    id: 'raindrop',
    name: 'Raindrop',
    category: 'nature',
    pathData: 'M50,5 C50,5 20,45 20,65 C20,85 35,95 50,95 C65,95 80,85 80,65 C80,45 50,5 50,5 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'tulip',
    name: 'Tulip',
    category: 'nature',
    pathData: 'M44,95 L44,52 C30,50 22,35 28,20 C32,8 45,5 50,5 C55,5 68,8 72,20 C78,35 70,50 56,52 L56,95 Z',
    previewColor: '#f43f5e',
    mazeRecommended: true,
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    category: 'nature',
    pathData: 'M35,55 L35,90 L65,90 L65,55 C85,55 95,35 85,20 C75,5 50,5 50,5 C50,5 25,5 15,20 C5,35 15,55 35,55 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'four-leaf-clover',
    name: 'Four-Leaf Clover',
    category: 'nature',
    pathData: 'M48,95 L48,58 C32,58 18,48 18,35 C18,18 35,10 50,25 C65,10 82,18 82,35 C82,48 68,58 52,58 L52,95 Z M50,48 C42,55 30,62 20,58 C5,52 8,38 22,35 C32,33 42,42 50,48 Z M50,48 C58,55 70,62 80,58 C95,52 92,38 78,35 C68,33 58,42 50,48 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },

  // ============================================
  // ARROWS - Directional indicators (already clean)
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
    id: 'arrow-double',
    name: 'Double Arrow',
    category: 'arrows',
    pathData: 'M5,50 L25,30 L25,40 L75,40 L75,30 L95,50 L75,70 L75,60 L25,60 L25,70 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },
  {
    id: 'chevron-right',
    name: 'Chevron Right',
    category: 'arrows',
    pathData: 'M25,5 L75,50 L25,95 L40,95 L90,50 L40,5 Z',
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
    id: 'arrow-corner',
    name: 'Corner Arrow',
    category: 'arrows',
    pathData: 'M10,10 L10,60 L60,60 L60,40 L90,70 L60,100 L60,80 L30,80 L30,10 Z',
    previewColor: '#10b981',
    mazeRecommended: true,
  },

  // ============================================
  // SPORTS - Athletics and games (clean silhouettes)
  // ============================================
  {
    id: 'football',
    name: 'Football',
    category: 'sports',
    pathData: 'M50,10 C25,10 5,30 5,50 C5,70 25,90 50,90 C75,90 95,70 95,50 C95,30 75,10 50,10 Z',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'trophy',
    name: 'Trophy',
    category: 'sports',
    pathData: 'M30,15 L70,15 L70,45 C70,60 60,70 50,70 C40,70 30,60 30,45 Z M30,25 L15,25 L15,40 C15,50 25,50 30,45 Z M70,25 L85,25 L85,40 C85,50 75,50 70,45 Z M45,70 L45,80 L35,80 L35,90 L65,90 L65,80 L55,80 L55,70 Z',
    previewColor: '#fbbf24',
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
    id: 'baseball-bat',
    name: 'Baseball Bat',
    category: 'sports',
    pathData: 'M15,90 L10,85 L60,35 C65,30 75,25 85,25 C95,25 95,35 90,40 L85,45 L35,95 L30,90 Z',
    previewColor: '#a16207',
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
    id: 'medal',
    name: 'Medal',
    category: 'sports',
    pathData: 'M40,5 L35,28 L50,22 L65,28 L60,5 L55,5 L50,15 L45,5 Z M50,25 A25,25 0 1,1 50.01,25 Z',
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
    pathData: 'M44,95 L44,75 L18,75 L38,55 L22,55 L42,35 L28,35 L50,10 L72,35 L58,35 L78,55 L62,55 L82,75 L56,75 L56,95 Z',
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
    id: 'present',
    name: 'Present',
    category: 'holidays',
    pathData: 'M10,38 L90,38 L90,90 L10,90 Z M30,38 L30,25 C30,15 40,15 46,25 L50,35 L54,25 C60,15 70,15 70,25 L70,38 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'shamrock',
    name: 'Shamrock',
    category: 'holidays',
    pathData: 'M48,95 L48,58 C35,58 22,48 22,38 C22,25 35,18 48,30 L48,25 C42,15 42,5 50,5 C58,5 58,15 52,25 L52,30 C65,18 78,25 78,38 C78,48 65,58 52,58 L52,95 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'easter-egg',
    name: 'Easter Egg',
    category: 'holidays',
    pathData: 'M50,5 C25,5 10,30 10,55 C10,80 30,95 50,95 C70,95 90,80 90,55 C90,30 75,5 50,5 Z',
    previewColor: '#a855f7',
    mazeRecommended: true,
  },
  {
    id: 'bell',
    name: 'Bell',
    category: 'holidays',
    pathData: 'M42,12 C30,18 20,35 20,55 L20,70 L10,70 L10,80 L90,80 L90,70 L80,70 L80,55 C80,35 70,18 58,12 C58,8 55,5 50,5 C45,5 42,8 42,12 Z M40,80 C40,90 45,95 50,95 C55,95 60,90 60,80 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'ornament',
    name: 'Christmas Ornament',
    category: 'holidays',
    pathData: 'M44,10 L56,10 L56,20 L44,20 Z M38,20 L62,20 C62,20 72,25 72,30 L28,30 C28,25 38,20 38,20 Z M50,30 A35,40 0 1,1 50.01,30 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'stocking',
    name: 'Christmas Stocking',
    category: 'holidays',
    pathData: 'M30,5 L70,5 L70,15 L30,15 Z M32,15 L68,15 L68,50 L82,68 C92,82 82,95 68,88 L55,78 L42,92 C28,98 15,85 25,68 L40,50 L40,15 Z',
    previewColor: '#dc2626',
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
    pathData: 'M30,30 C30,10 70,10 70,30 C70,45 55,50 55,65 L45,65 C45,45 60,40 60,30 C60,20 40,20 40,30 Z M45,78 L55,78 L55,90 L45,90 Z',
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
    id: 'hand-print',
    name: 'Hand Print',
    category: 'symbols',
    pathData: 'M25,40 L25,20 L35,20 L35,45 L45,45 L45,10 L55,10 L55,45 L65,45 L65,15 L75,15 L75,50 C82,50 88,60 88,75 C88,90 72,95 55,95 L40,95 C25,95 15,85 15,70 L15,55 L25,55 Z',
    previewColor: '#f97316',
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
    pathData: 'M15,5 L22,5 L22,55 L88,55 L72,32 L88,8 L22,8 L15,8 L15,95 L22,95 L22,55 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'crown',
    name: 'Crown',
    category: 'symbols',
    pathData: 'M10,75 L10,35 L30,55 L50,25 L70,55 L90,35 L90,75 Z M12,75 L88,75 L88,88 L12,88 Z',
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
    id: 'music-note',
    name: 'Music Note',
    category: 'symbols',
    pathData: 'M30,90 C22,90 15,82 15,72 C15,62 22,55 30,55 C35,55 40,58 42,62 L42,15 L78,8 L78,22 L48,28 L48,72 C48,82 42,90 30,90 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'anchor',
    name: 'Anchor',
    category: 'symbols',
    pathData: 'M42,28 C42,18 45,12 50,12 C55,12 58,18 58,28 L62,28 L62,34 L55,34 L55,72 C65,70 72,62 75,52 L68,58 L62,48 L80,42 L86,62 L78,55 C75,68 62,78 55,80 L55,92 L62,92 L62,98 L38,98 L38,92 L45,92 L45,80 C38,78 25,68 22,55 L14,62 L20,42 L38,48 L32,58 L25,52 C28,62 35,70 45,72 L45,34 L38,34 L38,28 Z',
    previewColor: '#1f2937',
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
