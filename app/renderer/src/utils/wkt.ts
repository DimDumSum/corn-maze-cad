/**
 * Simple WKT (Well-Known Text) parser for Polygon and MultiPolygon geometries.
 * Used to parse carved area geometry for canvas rendering.
 */

/**
 * A ring is an array of [x, y] coordinate pairs forming a closed loop.
 * A polygon has one exterior ring and zero or more interior rings (holes).
 */
export interface ParsedPolygon {
  exterior: [number, number][];
  interiors: [number, number][][];
}

/**
 * Parse a WKT coordinate string like "x1 y1, x2 y2, ..." into [x, y][] pairs.
 */
function parseCoordString(s: string): [number, number][] {
  return s
    .trim()
    .split(',')
    .map((pair) => {
      const [x, y] = pair.trim().split(/\s+/).map(Number);
      return [x, y] as [number, number];
    })
    .filter(([x, y]) => !isNaN(x) && !isNaN(y));
}

/**
 * Parse a WKT ring group like "((x1 y1, x2 y2), (x3 y3, x4 y4))"
 * into an array of rings (first = exterior, rest = holes).
 */
function parseRingGroup(s: string): ParsedPolygon | null {
  // Match individual rings: content between innermost parentheses
  const ringRegex = /\(([^()]+)\)/g;
  const rings: [number, number][][] = [];
  let match: RegExpExecArray | null;
  while ((match = ringRegex.exec(s)) !== null) {
    rings.push(parseCoordString(match[1]));
  }
  if (rings.length === 0) return null;
  return {
    exterior: rings[0],
    interiors: rings.slice(1),
  };
}

/**
 * Parse a WKT string into an array of polygon definitions.
 * Supports: POLYGON, MULTIPOLYGON, GEOMETRYCOLLECTION (containing polygons).
 * Returns an empty array for unsupported or empty geometries.
 */
export function parseWKTPolygons(wkt: string): ParsedPolygon[] {
  if (!wkt || typeof wkt !== 'string') return [];

  const trimmed = wkt.trim();

  // MULTIPOLYGON (((x y, ...), (...)), ((x y, ...)))
  if (trimmed.startsWith('MULTIPOLYGON')) {
    const content = trimmed.slice('MULTIPOLYGON'.length).trim();
    // Split by ")),((" to separate polygons
    // First strip outermost parens
    const inner = content.slice(1, -1); // Remove outer ( )
    const polygons: ParsedPolygon[] = [];

    // Split on ")),((" — each polygon group is wrapped in ((...))
    const groups = inner.split(/\)\s*,\s*\(/);
    for (const group of groups) {
      // Re-add parens that were consumed by split
      const normalized = '(' + group.replace(/^\(+/, '').replace(/\)+$/, '') + ')';
      const parsed = parseRingGroup(normalized);
      if (parsed) polygons.push(parsed);
    }
    return polygons;
  }

  // POLYGON ((x y, ...), (...))
  if (trimmed.startsWith('POLYGON')) {
    const content = trimmed.slice('POLYGON'.length).trim();
    const parsed = parseRingGroup(content);
    return parsed ? [parsed] : [];
  }

  // GEOMETRYCOLLECTION (POLYGON (...), POLYGON (...))
  if (trimmed.startsWith('GEOMETRYCOLLECTION')) {
    const content = trimmed.slice('GEOMETRYCOLLECTION'.length).trim();
    const inner = content.slice(1, -1); // Strip outer parens

    // Find all POLYGON and MULTIPOLYGON within
    const results: ParsedPolygon[] = [];
    const subRegex = /(MULTI)?POLYGON\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)/g;
    let subMatch: RegExpExecArray | null;
    while ((subMatch = subRegex.exec(inner)) !== null) {
      results.push(...parseWKTPolygons(subMatch[0]));
    }
    return results;
  }

  return [];
}
