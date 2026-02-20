/**
 * Snapping System - Barrel export
 */

export { SnapEngine } from './SnapEngine';
export type { SnapResult, SnapType } from './SnapEngine';
export {
  renderSnapIndicator,
  renderGuideLines,
  findAlignmentGuides,
  findExtensionGuides,
  findPerpendicularGuides,
} from './SnapVisuals';
export type { GuideLine, GuideLineType } from './SnapVisuals';
