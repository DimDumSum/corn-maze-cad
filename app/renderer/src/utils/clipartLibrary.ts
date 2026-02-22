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
    pathData: 'M50,90 C50,90 5,55 5,30 C5,14 18,5 33,5 C41,5 48,9 50,15 C52,9 59,5 67,5 C82,5 95,14 95,30 C95,55 50,90 50,90 Z',
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
    pathData: 'M72,10 C42,10 15,30 15,55 C15,80 42,95 72,95 C55,85 42,70 42,55 C42,35 55,20 72,10 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'shield',
    name: 'Shield',
    category: 'shapes',
    pathData: 'M50,5 L92,18 L88,50 C88,72 72,88 50,95 C28,88 12,72 12,50 L8,18 Z',
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
    pathData: 'M5,35 L20,50 L5,65 L30,65 L30,75 L15,90 L38,75 L38,65 L62,65 L62,75 L85,90 L70,75 L70,65 L95,65 L80,50 L95,35 L70,35 L70,25 L62,25 L62,35 L38,35 L38,25 L30,25 L30,35 Z',
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
    pathData: 'M46,15 C46,8 48,4 50,4 C52,4 54,8 54,15 C60,12 68,12 75,16 C88,22 96,40 96,58 C96,78 82,94 68,96 C62,97 56,94 50,92 C44,94 38,97 32,96 C18,94 4,78 4,58 C4,40 12,22 25,16 C32,12 40,12 46,15 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'ghost',
    name: 'Ghost',
    category: 'halloween',
    pathData: 'M30,6 C16,6 6,18 6,34 L6,52 C6,58 10,62 14,58 C18,54 20,58 22,62 C24,66 28,66 30,62 L30,56 C32,60 36,64 42,66 C50,70 60,72 68,72 C74,74 80,78 82,82 C84,78 82,72 78,68 L88,68 C92,68 92,62 88,62 L78,62 C82,58 84,52 84,44 C84,36 80,28 72,22 L72,14 C72,10 68,10 68,14 L68,20 C62,14 54,10 46,10 L46,18 C46,22 42,22 42,18 L42,10 C38,8 34,6 30,6 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'bat',
    name: 'Bat',
    category: 'halloween',
    pathData: 'M50,22 C47,18 44,16 40,16 C36,16 34,20 34,24 L2,12 C2,12 10,32 18,38 C12,40 6,46 6,52 L22,44 C26,52 32,58 38,62 L34,72 L42,66 C45,68 48,70 50,70 C52,70 55,68 58,66 L66,72 L62,62 C68,58 74,52 78,44 L94,52 C94,46 88,40 82,38 C90,32 98,12 98,12 L66,24 C66,20 64,16 60,16 C56,16 53,18 50,22 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'witch-hat',
    name: 'Witch Hat',
    category: 'halloween',
    pathData: 'M50,2 C48,2 38,48 34,64 L4,68 C2,72 4,78 8,82 L28,82 C24,86 22,90 22,94 L78,94 C78,90 76,86 72,82 L92,82 C96,78 98,72 96,68 L66,64 C62,48 52,2 50,2 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'skull',
    name: 'Skull',
    category: 'halloween',
    pathData: 'M34,8 C50,4 68,8 80,20 C90,32 94,48 90,62 C88,70 82,76 76,80 L76,88 L66,88 L66,82 L56,86 L56,88 L46,88 L46,82 C38,80 30,76 24,70 L12,76 L8,68 L20,64 C14,56 12,44 16,32 C20,18 28,10 34,8 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'cauldron',
    name: 'Cauldron',
    category: 'halloween',
    pathData: 'M18,30 C8,30 4,36 10,40 L14,42 C10,50 8,60 10,70 C14,86 30,96 50,96 C70,96 86,86 90,70 C92,60 90,50 86,42 L90,40 C96,36 92,30 82,30 L78,30 C72,26 62,24 50,24 C38,24 28,26 22,30 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'tombstone',
    name: 'Tombstone',
    category: 'halloween',
    pathData: 'M15,96 L15,88 L22,88 L22,38 C22,16 34,4 50,4 C66,4 78,16 78,38 L78,88 L85,88 L85,96 Z',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'black-cat',
    name: 'Black Cat',
    category: 'halloween',
    pathData: 'M12,36 L6,14 L18,30 C22,26 28,24 34,26 C38,22 44,20 50,22 C56,20 62,18 68,22 L74,14 L72,30 C78,26 84,24 88,28 C92,32 90,38 86,36 C86,40 84,44 80,46 C82,50 82,56 80,60 L80,78 L72,78 L72,64 L50,62 L48,78 L40,78 L40,60 C36,58 30,54 26,48 L22,50 L18,50 L20,46 C16,42 14,38 12,36 Z M80,46 L82,42 C84,38 88,36 92,40 C96,44 92,52 86,56 L84,50 C86,48 86,46 84,44 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'coffin',
    name: 'Coffin',
    category: 'halloween',
    pathData: 'M38,2 L62,2 L78,24 L72,94 L50,98 L28,94 L22,24 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'haunted-house',
    name: 'Haunted House',
    category: 'halloween',
    pathData: 'M4,96 L4,52 L22,52 L22,22 L34,22 L34,52 L20,52 L50,28 L80,52 L80,42 L88,42 L88,52 L96,52 L96,96 L68,96 L68,70 L58,70 L58,96 L42,96 L42,70 L32,70 L32,96 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'candy-corn',
    name: 'Candy Corn',
    category: 'halloween',
    pathData: 'M50,4 C46,4 30,50 24,72 C20,84 22,96 50,96 C78,96 80,84 76,72 C70,50 54,4 50,4 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'zombie-hand',
    name: 'Zombie Hand',
    category: 'halloween',
    pathData: 'M36,96 L36,68 C32,66 26,60 22,52 C20,46 22,40 26,40 C30,40 32,44 32,48 L36,56 L36,44 C36,36 34,26 32,18 C30,12 34,8 38,10 C42,12 42,18 42,26 L44,44 L44,30 C44,20 42,10 44,4 C46,0 52,0 54,4 C56,10 54,20 54,30 L54,44 L56,26 C56,18 58,12 62,10 C66,8 68,12 66,18 L62,44 L62,56 C66,44 68,40 72,40 C76,40 78,46 76,52 C72,60 66,66 62,68 L62,96 Z',
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
    pathData: 'M46,96 L46,68 C40,64 28,56 18,44 C14,38 18,34 22,36 C28,40 36,50 44,60 L46,60 L46,48 C40,42 30,32 22,20 C18,14 22,10 28,14 C34,20 40,32 46,40 L46,28 C44,22 42,14 44,8 C46,4 50,2 52,4 C56,2 60,4 60,8 C60,14 58,22 56,28 L56,40 C62,32 68,20 74,14 C80,10 84,14 80,20 C72,32 62,42 56,48 L56,60 L58,60 C66,50 74,40 80,36 C84,34 88,38 84,44 C74,56 62,64 56,68 L56,96 Z',
    previewColor: '#65a30d',
    mazeRecommended: true,
  },
  {
    id: 'apple',
    name: 'Apple',
    category: 'harvest',
    pathData: 'M48,10 L48,4 L52,4 L52,10 C56,8 62,6 68,8 C82,12 94,30 94,52 C94,76 76,96 50,96 C24,96 6,76 6,52 C6,30 18,12 32,8 C38,6 44,8 48,10 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    category: 'harvest',
    pathData: 'M50,4 L56,28 L50,34 L44,28 Z M76,12 L68,36 L60,36 L58,28 Z M92,32 L72,44 L68,38 L74,30 Z M96,58 L72,54 L70,48 L78,44 Z M86,80 L66,62 L68,56 L76,56 Z M66,94 L56,70 L60,64 L68,68 Z M38,94 L32,68 L38,64 L44,70 Z M16,80 L24,56 L32,56 L34,62 Z M4,58 L22,44 L28,48 L24,56 Z M8,32 L28,38 L30,44 L22,48 Z M24,12 L32,28 L38,36 L30,38 Z M50,34 A18,18 0 1,1 50,70 A18,18 0 1,1 50,34 Z',
    previewColor: '#facc15',
    mazeRecommended: true,
  },
  {
    id: 'acorn',
    name: 'Acorn',
    category: 'harvest',
    pathData: 'M46,4 L46,12 C36,12 24,16 20,28 L20,36 L80,36 L80,28 C76,16 64,12 54,12 L54,4 Z M24,36 C20,48 22,66 30,80 C38,92 46,96 50,96 C54,96 62,92 70,80 C78,66 80,48 76,36 Z',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'leaf',
    name: 'Autumn Leaf',
    category: 'harvest',
    pathData: 'M50,4 C68,4 90,20 92,48 C94,68 80,86 60,92 L54,94 L54,96 L46,96 L46,94 L40,92 C20,86 6,68 8,48 C10,20 32,4 50,4 Z',
    previewColor: '#ea580c',
    mazeRecommended: true,
  },
  {
    id: 'maple-leaf',
    name: 'Maple Leaf',
    category: 'harvest',
    pathData: 'M50,4 L54,20 L62,14 L58,28 L72,22 L64,36 L82,30 L70,44 L90,42 L72,52 L86,62 L66,58 L72,72 L58,62 L56,78 L50,66 L44,78 L42,62 L28,72 L34,58 L14,62 L28,52 L10,42 L30,44 L18,30 L36,36 L28,22 L42,28 L38,14 L46,20 Z M46,66 L46,96 L54,96 L54,66 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'hay-bale',
    name: 'Hay Bale',
    category: 'harvest',
    pathData: 'M8,38 C8,24 28,14 50,14 C72,14 92,24 92,38 L92,82 C92,90 72,96 50,96 C28,96 8,90 8,82 Z',
    previewColor: '#d97706',
    mazeRecommended: true,
  },
  {
    id: 'pie',
    name: 'Pie',
    category: 'harvest',
    pathData: 'M50,18 C24,18 4,34 4,54 L4,66 C4,78 24,90 50,90 C76,90 96,78 96,66 L96,54 C96,34 76,18 50,18 Z M50,18 L50,54 L80,36 Z',
    previewColor: '#d97706',
    mazeRecommended: true,
  },
  {
    id: 'scarecrow',
    name: 'Scarecrow',
    category: 'harvest',
    pathData: 'M34,10 L66,10 L66,16 L34,16 Z M38,16 C36,20 36,26 38,30 C40,34 44,36 48,36 L48,42 L58,42 L58,36 C62,36 66,34 68,30 C70,26 70,20 68,16 Z M4,38 L44,38 L44,48 L4,48 L10,43 Z M62,38 L96,38 L96,48 L62,48 L90,43 Z M44,48 L44,80 L36,96 L46,96 L50,84 L54,96 L64,96 L56,80 L56,48 Z',
    previewColor: '#d97706',
    mazeRecommended: true,
  },
  {
    id: 'pear',
    name: 'Pear',
    category: 'harvest',
    pathData: 'M48,6 L48,16 C38,18 30,26 26,38 C20,54 18,72 24,84 C30,94 40,98 50,98 C60,98 70,94 76,84 C82,72 80,54 74,38 C70,26 62,18 52,16 L52,6 Z',
    previewColor: '#a3e635',
    mazeRecommended: true,
  },
  {
    id: 'turkey',
    name: 'Turkey',
    category: 'harvest',
    pathData: 'M10,42 L4,38 C2,34 6,30 10,34 L16,38 C18,34 22,30 28,28 C32,24 34,18 34,12 C34,8 38,8 38,12 C38,18 36,24 34,28 C38,24 44,22 50,22 C58,22 66,28 72,36 C78,30 82,22 86,16 C90,10 94,14 92,20 C90,28 86,36 80,44 C86,44 92,40 96,36 C98,34 98,40 96,44 C92,50 86,52 80,52 C82,56 82,62 80,66 L80,82 L70,82 L70,68 L48,68 L48,82 L38,82 L38,66 C32,62 26,56 22,48 Z',
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
    pathData: 'M18,78 C10,78 4,72 4,64 C4,56 10,50 18,50 C26,50 32,56 32,64 C32,72 26,78 18,78 Z M74,86 C60,86 50,76 50,64 C50,52 60,42 74,42 C88,42 98,52 98,64 C98,76 88,86 74,86 Z M6,48 L6,38 L28,38 L28,26 L52,26 L58,14 L82,14 L82,40 L48,40 L48,48 Z M58,14 L56,8 L60,8 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'barn',
    name: 'Barn',
    category: 'farm',
    pathData: 'M6,96 L6,52 L20,52 L20,36 L50,10 L80,36 L80,52 L94,52 L94,96 Z M38,96 L38,68 L62,68 L62,96 Z',
    previewColor: '#b91c1c',
    mazeRecommended: true,
  },
  {
    id: 'windmill',
    name: 'Windmill',
    category: 'farm',
    pathData: 'M36,96 L42,46 L50,46 L50,40 L24,8 L32,6 L50,32 L50,6 L56,4 L52,32 L78,10 L80,18 L52,40 L52,46 L58,46 L64,96 Z M50,46 L76,38 L78,46 L52,46 Z M50,46 L22,52 L20,44 L48,46 Z',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'silo',
    name: 'Silo',
    category: 'farm',
    pathData: 'M28,96 L28,34 C28,16 38,4 50,4 C62,4 72,16 72,34 L72,96 Z M28,50 L72,50 L72,56 L28,56 Z M28,68 L72,68 L72,74 L28,74 Z',
    previewColor: '#9ca3af',
    mazeRecommended: true,
  },
  {
    id: 'horseshoe',
    name: 'Horseshoe',
    category: 'farm',
    pathData: 'M16,90 L16,40 C16,18 32,4 50,4 C68,4 84,18 84,40 L84,90 L72,90 L72,84 L76,84 L76,40 C76,24 64,12 50,12 C36,12 24,24 24,40 L24,84 L28,84 L28,90 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'watering-can',
    name: 'Watering Can',
    category: 'farm',
    pathData: 'M22,40 L72,40 L68,88 L26,88 Z M62,40 L62,28 C62,20 70,18 76,22 L92,36 L88,42 L72,30 L72,40 Z M22,48 C16,44 10,42 8,46 C6,50 14,56 22,58 Z',
    previewColor: '#059669',
    mazeRecommended: true,
  },
  {
    id: 'fence',
    name: 'Fence',
    category: 'farm',
    pathData: 'M4,34 L96,34 L96,40 L4,40 Z M4,58 L96,58 L96,64 L4,64 Z M8,80 L8,22 L14,14 L20,22 L20,80 Z M30,80 L30,22 L36,14 L42,22 L42,80 Z M52,80 L52,22 L58,14 L64,22 L64,80 Z M74,80 L74,22 L80,14 L86,22 L86,80 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'farmhouse',
    name: 'Farmhouse',
    category: 'farm',
    pathData: 'M4,96 L4,52 L36,24 L36,12 L44,12 L44,24 L68,44 L68,52 L96,52 L96,96 Z M68,52 L68,96 L96,96 L96,52 Z M68,60 L96,60 Z M20,96 L20,72 L36,72 L36,96 Z',
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
    pathData: 'M6,28 L2,18 L10,24 L14,14 L14,26 C18,24 22,24 24,28 L24,36 C28,30 36,26 44,24 L60,22 C68,22 76,24 82,28 L86,24 C88,22 90,24 90,28 L88,34 C92,36 96,38 96,40 C96,44 92,46 88,44 L86,42 C88,46 88,50 86,54 L86,70 C86,76 84,80 80,80 L76,80 C72,80 70,76 70,70 L70,58 L48,60 L48,70 C48,76 46,80 42,80 L38,80 C34,80 32,76 32,70 L32,60 L28,58 C22,54 16,48 12,40 L8,34 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'pig',
    name: 'Pig',
    category: 'animals',
    pathData: 'M4,32 L4,44 L14,44 C16,40 20,36 26,34 L26,28 C24,22 26,18 30,20 L32,26 C36,22 44,20 54,20 C66,20 76,24 82,32 C86,36 88,42 88,50 L92,48 C96,52 94,58 90,56 L88,54 C88,58 86,62 82,64 L82,80 L72,80 L72,66 L40,66 L40,80 L30,80 L30,64 C24,62 18,56 14,50 Z',
    previewColor: '#fda4af',
    mazeRecommended: true,
  },
  {
    id: 'chicken',
    name: 'Chicken',
    category: 'animals',
    pathData: 'M18,18 C20,12 24,8 28,8 C30,10 30,14 28,18 C30,16 34,14 36,16 L34,22 C38,20 44,20 50,22 C60,26 68,34 72,44 L78,36 L84,30 L86,40 L80,48 C82,54 82,60 80,66 L80,80 L70,80 L70,68 L54,68 L54,80 L44,80 L44,66 C36,62 28,54 22,44 L16,50 C12,48 10,42 14,40 L20,36 C18,32 16,26 18,18 Z M6,28 L16,24 L12,30 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'horse',
    name: 'Horse',
    category: 'animals',
    pathData: 'M4,42 L10,36 C10,30 14,24 18,20 L16,10 L22,8 L22,18 C26,14 32,12 38,14 C40,10 42,8 44,10 C44,14 42,18 40,20 C48,18 58,18 66,22 C76,28 84,38 86,50 L86,56 L92,52 C96,56 96,64 92,62 C90,60 88,58 86,58 C86,62 84,66 82,68 L82,84 L72,84 L72,68 L60,68 L58,84 L48,84 L48,68 L36,68 L34,84 L24,84 L24,66 C18,62 12,56 8,48 Z',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'sheep',
    name: 'Sheep',
    category: 'animals',
    pathData: 'M8,38 C6,34 8,28 14,26 L14,20 L20,20 L20,28 C24,24 30,22 36,22 C42,20 50,18 58,18 C68,18 76,22 82,28 C88,34 90,42 90,50 C90,58 86,64 80,68 L80,84 L70,84 L70,68 L42,68 L42,84 L32,84 L32,66 C26,62 20,56 16,48 C12,44 8,42 8,38 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'duck',
    name: 'Duck',
    category: 'animals',
    pathData: 'M4,40 L4,46 L16,46 C18,42 22,38 28,36 C32,34 36,30 36,24 C36,18 32,14 28,14 C24,14 20,18 20,24 C20,28 22,32 26,34 C22,34 18,36 16,40 Z M16,46 C18,52 24,58 34,62 C46,66 60,68 72,66 C82,64 90,58 92,50 L94,44 L90,38 C88,36 84,38 82,42 L82,48 C78,54 68,58 56,58 C46,58 38,54 34,48 L34,46 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    category: 'animals',
    pathData: 'M18,44 C16,38 18,30 22,26 L20,6 C20,2 26,2 28,6 L30,22 C32,20 34,20 36,22 L38,6 C38,2 44,2 44,6 L42,26 C46,24 52,24 58,28 C66,34 72,44 74,56 C76,66 74,74 68,80 L72,78 C78,78 82,82 82,88 C82,94 76,96 70,96 L24,96 C16,96 10,92 10,86 C10,80 16,76 22,78 L28,80 C22,74 18,66 18,56 Z',
    previewColor: '#9ca3af',
    mazeRecommended: true,
  },
  {
    id: 'deer',
    name: 'Deer',
    category: 'animals',
    pathData: 'M10,42 C8,36 10,28 16,24 L14,18 L10,14 L16,16 L18,8 L20,16 L24,12 L22,20 L26,18 C30,14 36,12 42,14 C44,10 46,6 48,8 C48,12 46,16 44,18 C52,16 62,18 70,24 C80,32 86,44 86,56 L86,60 L92,54 C96,58 94,64 90,62 L86,62 C86,66 84,68 82,70 L82,86 L72,86 L72,70 L58,70 L56,86 L46,86 L46,70 L34,70 L32,86 L22,86 L22,68 C16,64 12,58 10,50 Z',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    category: 'animals',
    pathData: 'M30,52 C24,52 18,54 14,58 L8,54 C4,50 6,44 10,46 L14,50 C16,46 20,44 26,44 C22,38 16,28 10,22 C6,16 12,10 18,14 C26,22 32,34 34,44 C36,38 40,32 46,30 C42,24 36,14 34,6 C34,2 40,2 42,6 C46,14 48,26 48,34 C50,28 54,24 60,24 C66,24 70,28 70,34 C70,42 64,50 56,54 L56,58 C60,62 62,68 62,76 L62,84 L56,84 C52,82 48,78 46,72 L44,72 C42,78 38,82 34,84 L28,84 L28,76 C28,68 30,62 34,58 L34,54 C32,52 30,52 30,52 Z',
    previewColor: '#f472b6',
    mazeRecommended: true,
  },
  {
    id: 'fish',
    name: 'Fish',
    category: 'animals',
    pathData: 'M4,50 C4,36 14,24 28,18 C40,14 54,16 66,22 L66,16 L68,10 C72,14 76,20 78,26 L80,22 L82,16 C86,22 88,30 88,38 C94,30 98,26 98,34 C96,42 90,48 86,50 C90,52 96,58 98,66 C98,74 94,70 88,62 C88,70 86,78 82,84 L80,78 C78,80 76,86 72,90 L68,90 L66,84 L66,78 C54,84 40,86 28,82 C14,76 4,64 4,50 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'owl',
    name: 'Owl',
    category: 'animals',
    pathData: 'M24,30 L16,10 L28,26 C32,20 38,16 46,14 C48,8 50,4 54,8 L56,14 C62,16 68,20 72,26 L82,10 L76,30 C82,38 86,48 86,60 C86,70 82,78 76,84 L82,84 L82,92 L72,92 L66,86 L54,88 L42,86 L34,92 L24,92 L24,84 L30,84 C22,78 18,70 18,60 C18,48 22,38 24,30 Z',
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
    pathData: 'M44,96 L44,68 C30,66 16,54 12,38 C8,22 18,8 34,4 C40,2 46,2 50,4 C54,2 60,2 66,4 C82,8 92,22 88,38 C84,54 70,66 56,68 L56,96 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'pine-tree',
    name: 'Pine Tree',
    category: 'nature',
    pathData: 'M44,96 L44,78 L16,78 L34,56 L20,56 L38,34 L26,34 L50,4 L74,34 L62,34 L80,56 L66,56 L84,78 L56,78 L56,96 Z',
    previewColor: '#166534',
    mazeRecommended: true,
  },
  {
    id: 'cloud',
    name: 'Cloud',
    category: 'nature',
    pathData: 'M24,72 C12,72 4,64 4,54 C4,46 10,40 18,38 C16,32 18,24 26,20 C32,16 40,18 44,22 C48,14 58,8 68,10 C78,12 84,22 84,32 C90,34 96,42 96,52 C96,64 88,72 76,72 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'mountain',
    name: 'Mountain',
    category: 'nature',
    pathData: 'M2,92 L28,32 L38,48 L48,28 L56,8 L72,40 L80,30 L98,92 Z',
    previewColor: '#6b7280',
    mazeRecommended: true,
  },
  {
    id: 'cactus',
    name: 'Cactus',
    category: 'nature',
    pathData: 'M40,96 L40,16 C40,8 46,4 50,4 C54,4 60,8 60,16 L60,96 Z M40,50 L28,50 L28,34 C28,26 34,22 38,26 L40,30 Z M60,62 L72,62 L72,42 C72,34 66,30 62,34 L60,38 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'lightning',
    name: 'Lightning Bolt',
    category: 'nature',
    pathData: 'M58,2 L24,44 L42,44 L18,98 L76,48 L54,48 L72,2 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'raindrop',
    name: 'Raindrop',
    category: 'nature',
    pathData: 'M50,4 C50,4 18,46 18,66 C18,84 32,96 50,96 C68,96 82,84 82,66 C82,46 50,4 50,4 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'tulip',
    name: 'Tulip',
    category: 'nature',
    pathData: 'M44,96 L44,56 L34,60 C24,64 14,58 10,48 C8,40 14,30 22,28 L36,24 L40,16 C44,8 48,4 50,4 C52,4 56,8 60,16 L64,24 L78,28 C86,30 92,40 90,48 C86,58 76,64 66,60 L56,56 L56,96 Z',
    previewColor: '#f43f5e',
    mazeRecommended: true,
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    category: 'nature',
    pathData: 'M50,4 C28,4 6,22 6,42 C6,54 16,60 30,60 L34,60 L34,92 C34,96 42,98 50,98 C58,98 66,96 66,92 L66,60 L70,60 C84,60 94,54 94,42 C94,22 72,4 50,4 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'four-leaf-clover',
    name: 'Four-Leaf Clover',
    category: 'nature',
    pathData: 'M50,50 C44,40 32,30 22,30 C10,30 6,42 14,50 C6,58 10,70 22,70 C32,70 44,60 50,50 Z M50,50 C40,44 30,32 30,22 C30,10 42,6 50,14 C58,6 70,10 70,22 C70,32 60,44 50,50 Z M50,50 C56,60 68,70 78,70 C90,70 94,58 86,50 C94,42 90,30 78,30 C68,30 56,40 50,50 Z M50,50 C60,56 70,68 70,78 C70,90 58,94 50,86 C42,94 30,90 30,78 C30,68 40,56 50,50 Z M46,86 L46,96 L54,96 L54,86 Z',
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
    pathData: 'M10,10 L10,60 L60,60 L60,40 L90,70 L60,95 L60,80 L30,80 L30,10 Z',
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
    pathData: 'M4,50 C4,30 20,10 50,10 C80,10 96,30 96,50 C96,70 80,90 50,90 C20,90 4,70 4,50 Z',
    previewColor: '#92400e',
    mazeRecommended: true,
  },
  {
    id: 'trophy',
    name: 'Trophy',
    category: 'sports',
    pathData: 'M28,10 L72,10 L72,44 C72,60 62,72 52,74 L52,80 L64,80 L64,92 L36,92 L36,80 L48,80 L48,74 C38,72 28,60 28,44 Z M28,22 L14,22 L14,38 C14,50 24,52 28,46 Z M72,22 L86,22 L86,38 C86,50 76,52 72,46 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'hockey-stick',
    name: 'Hockey Stick',
    category: 'sports',
    pathData: 'M72,4 L36,76 L8,76 C4,76 4,88 8,88 L38,88 L44,82 L84,8 Z',
    previewColor: '#78350f',
    mazeRecommended: true,
  },
  {
    id: 'baseball-bat',
    name: 'Baseball Bat',
    category: 'sports',
    pathData: 'M12,92 L8,86 L52,38 C56,34 62,28 68,24 C76,18 86,16 92,22 C96,28 92,38 84,44 C78,48 72,52 66,54 L20,96 Z',
    previewColor: '#a16207',
    mazeRecommended: true,
  },
  {
    id: 'bowling-pin',
    name: 'Bowling Pin',
    category: 'sports',
    pathData: 'M42,16 C42,10 45,4 50,4 C55,4 58,10 58,16 C60,22 64,28 64,36 C64,42 62,46 58,50 L64,84 C64,92 58,96 50,96 C42,96 36,92 36,84 L42,50 C38,46 36,42 36,36 C36,28 40,22 42,16 Z',
    previewColor: '#f8fafc',
    mazeRecommended: true,
  },
  {
    id: 'medal',
    name: 'Medal',
    category: 'sports',
    pathData: 'M38,4 L34,32 L50,26 L66,32 L62,4 L56,4 L50,16 L44,4 Z M50,30 A26,26 0 1,1 50,82 A26,26 0 1,1 50,30 Z',
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
    pathData: 'M44,96 L44,82 L14,82 L32,60 L18,60 L36,38 L24,38 L50,6 L76,38 L64,38 L82,60 L68,60 L86,82 L56,82 L56,96 Z',
    previewColor: '#166534',
    mazeRecommended: true,
  },
  {
    id: 'candy-cane',
    name: 'Candy Cane',
    category: 'holidays',
    pathData: 'M38,96 L38,42 C38,22 48,8 64,8 C80,8 90,22 90,38 C90,52 80,60 68,56 C60,52 56,44 60,38 C64,32 72,30 76,36 L66,40 C64,38 62,40 62,42 L52,42 L52,96 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'present',
    name: 'Present',
    category: 'holidays',
    pathData: 'M6,36 L94,36 L94,46 L6,46 Z M6,46 L94,46 L94,94 L6,94 Z M44,36 L44,94 L56,94 L56,36 Z M44,36 L34,26 C28,20 20,22 22,28 C24,34 32,36 44,36 Z M56,36 L66,26 C72,20 80,22 78,28 C76,34 68,36 56,36 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'shamrock',
    name: 'Shamrock',
    category: 'holidays',
    pathData: 'M50,50 C44,38 32,28 22,30 C10,34 10,48 20,54 C28,58 40,56 50,50 Z M50,50 C56,38 68,28 78,30 C90,34 90,48 80,54 C72,58 60,56 50,50 Z M50,50 C50,38 46,24 38,16 C30,10 18,14 20,26 C22,34 34,42 50,50 Z M46,50 L40,76 C38,84 42,92 50,92 C58,92 62,84 60,76 L54,50 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'easter-egg',
    name: 'Easter Egg',
    category: 'holidays',
    pathData: 'M50,4 C34,4 18,22 12,44 C6,66 14,86 30,94 C38,98 44,98 50,98 C56,98 62,98 70,94 C86,86 94,66 88,44 C82,22 66,4 50,4 Z',
    previewColor: '#a855f7',
    mazeRecommended: true,
  },
  {
    id: 'bell',
    name: 'Bell',
    category: 'holidays',
    pathData: 'M44,14 C32,18 22,32 20,50 L18,68 L8,68 L8,78 L92,78 L92,68 L82,68 L80,50 C78,32 68,18 56,14 C56,10 54,6 50,6 C46,6 44,10 44,14 Z M40,78 C40,88 44,94 50,94 C56,94 60,88 60,78 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'ornament',
    name: 'Christmas Ornament',
    category: 'holidays',
    pathData: 'M46,6 L54,6 L54,14 L46,14 Z M40,14 L60,14 L64,22 L36,22 Z M50,22 C28,22 10,42 10,62 C10,82 28,96 50,96 C72,96 90,82 90,62 C90,42 72,22 50,22 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'stocking',
    name: 'Christmas Stocking',
    category: 'holidays',
    pathData: 'M28,4 L72,4 L72,16 L28,16 Z M30,16 L70,16 L70,54 L82,70 C88,80 84,92 74,94 C66,96 58,92 52,86 L42,76 C36,82 28,86 20,82 C12,78 10,66 18,56 L32,42 L32,16 Z',
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
    pathData: 'M10,52 L38,82 L90,16 L78,10 L38,62 L22,44 Z',
    previewColor: '#22c55e',
    mazeRecommended: true,
  },
  {
    id: 'x-mark',
    name: 'X Mark',
    category: 'symbols',
    pathData: 'M18,8 L50,40 L82,8 L92,18 L60,50 L92,82 L82,92 L50,60 L18,92 L8,82 L40,50 L8,18 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'question',
    name: 'Question Mark',
    category: 'symbols',
    pathData: 'M30,28 C30,10 42,4 50,4 C58,4 70,10 70,28 C70,42 58,48 56,58 L56,66 L44,66 L44,54 C44,42 60,38 60,28 C60,18 40,18 40,28 Z M44,76 L56,76 L56,90 L44,90 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'exclamation',
    name: 'Exclamation',
    category: 'symbols',
    pathData: 'M38,6 L62,6 L58,62 L42,62 Z M42,74 L58,74 L58,92 L42,92 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'hand-print',
    name: 'Hand Print',
    category: 'symbols',
    pathData: 'M22,44 L22,22 L32,22 L32,46 L38,46 L38,10 L48,10 L48,46 L54,46 L54,14 L64,14 L64,46 L70,46 L70,26 L80,26 L80,54 C84,58 88,66 88,76 C88,90 74,96 58,96 L42,96 C26,96 14,86 14,72 L14,56 L22,56 Z',
    previewColor: '#f97316',
    mazeRecommended: true,
  },
  {
    id: 'thumbs-up',
    name: 'Thumbs Up',
    category: 'symbols',
    pathData: 'M26,96 L26,50 L12,50 L12,96 Z M32,50 L32,42 C32,28 42,22 50,26 L56,12 C58,6 66,6 66,14 L62,34 L82,34 C90,34 94,42 90,50 C94,54 94,62 90,68 C92,74 90,84 80,88 L38,88 L38,50 Z',
    previewColor: '#3b82f6',
    mazeRecommended: true,
  },
  {
    id: 'flag',
    name: 'Flag',
    category: 'symbols',
    pathData: 'M12,4 L20,4 L20,96 L12,96 Z M20,8 L88,8 L72,30 L88,52 L20,52 Z',
    previewColor: '#dc2626',
    mazeRecommended: true,
  },
  {
    id: 'crown',
    name: 'Crown',
    category: 'symbols',
    pathData: 'M8,76 L8,30 L28,52 L50,18 L72,52 L92,30 L92,76 Z M10,76 L90,76 L90,90 L10,90 Z',
    previewColor: '#fbbf24',
    mazeRecommended: true,
  },
  {
    id: 'infinity',
    name: 'Infinity',
    category: 'symbols',
    pathData: 'M50,50 C44,36 30,24 18,32 C6,42 6,58 18,68 C30,76 44,64 50,50 C56,36 70,24 82,32 C94,42 94,58 82,68 C70,76 56,64 50,50 Z M50,50 C44,60 34,68 26,64 C16,58 16,42 26,36 C34,32 44,40 50,50 Z M50,50 C56,60 66,68 74,64 C84,58 84,42 74,36 C66,32 56,40 50,50 Z',
    previewColor: '#8b5cf6',
    mazeRecommended: true,
  },
  {
    id: 'music-note',
    name: 'Music Note',
    category: 'symbols',
    pathData: 'M32,90 C22,90 14,82 14,72 C14,62 22,56 32,56 C38,56 42,58 44,62 L44,14 L80,6 L80,22 L50,28 L50,72 C50,82 42,90 32,90 Z',
    previewColor: '#1f2937',
    mazeRecommended: true,
  },
  {
    id: 'anchor',
    name: 'Anchor',
    category: 'symbols',
    pathData: 'M50,8 A10,10 0 1,1 50,28 A10,10 0 1,1 50,8 Z M46,28 L46,72 C34,70 24,60 22,48 L14,56 L8,38 L28,44 L20,52 C22,60 30,66 40,70 L40,28 Z M54,28 L54,72 C66,70 76,60 78,48 L86,56 L92,38 L72,44 L80,52 C78,60 70,66 60,70 L60,28 Z M40,86 L60,86 L60,96 L40,96 Z M46,72 L46,86 L54,86 L54,72 Z',
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
