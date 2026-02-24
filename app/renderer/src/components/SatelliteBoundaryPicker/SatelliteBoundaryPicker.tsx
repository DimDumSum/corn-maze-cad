/**
 * SatelliteBoundaryPicker - Trace field boundaries on a satellite map
 *
 * Uses Leaflet with free satellite tile layers (Esri World Imagery).
 * User workflow:
 * 1. Navigate to field location (search or pan/zoom)
 * 2. Click points around the field boundary
 * 3. Optionally set a corner radius to round corners (tractor turn radius)
 * 4. Close the polygon and confirm
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface SatelliteBoundaryPickerProps {
  onConfirm: (coordinates: [number, number][]) => void;
  onCancel: () => void;
}

export function SatelliteBoundaryPicker({ onConfirm, onCancel }: SatelliteBoundaryPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const arcPolygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [points, setPoints] = useState<[number, number][]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [area, setArea] = useState<number | null>(null);
  // Corner radius for rounding tractor turns (stored in feet for display, 0 = no rounding)
  const [arcRadiusFt, setArcRadiusFt] = useState(0);

  // Derived: smoothed polygon points when arc radius > 0 and polygon is closed
  const smoothedPoints = useCallback((): [number, number][] | null => {
    if (!isClosed || points.length < 3 || arcRadiusFt <= 0) return null;
    return applyRoundedCorners(points, arcRadiusFt * 0.3048);
  }, [points, isClosed, arcRadiusFt]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [42.026, -93.642], // Default: Iowa corn country
      zoom: 16,
      zoomControl: true,
    });

    // Esri World Imagery (free satellite tiles)
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      }
    );

    // OpenStreetMap as a secondary option
    const osm = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    );

    satellite.addTo(map);

    L.control.layers(
      { 'Satellite': satellite, 'Street Map': osm },
      {},
      { position: 'topright' }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle map clicks for placing points
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const container = map.getContainer();
    if (isClosed) {
      container.style.cursor = '';
    } else {
      container.style.cursor = 'crosshair';
    }

    const onClick = (e: L.LeafletMouseEvent) => {
      if (isClosed) return;

      const newPoint: [number, number] = [e.latlng.lng, e.latlng.lat];
      setPoints(prev => [...prev, newPoint]);
    };

    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
      container.style.cursor = '';
    };
  }, [isClosed]);

  // Update polygon visualization when points or arc radius changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Clear old shapes
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (polygonLayerRef.current) { polygonLayerRef.current.remove(); polygonLayerRef.current = null; }
    if (arcPolygonRef.current) { arcPolygonRef.current.remove(); arcPolygonRef.current = null; }

    if (points.length === 0) {
      setArea(null);
      return;
    }

    // Convert [lon, lat] to [lat, lng] for Leaflet
    const latLngs: L.LatLngExpression[] = points.map(p => [p[1], p[0]]);

    // Add vertex markers for original placed points
    points.forEach((p, i) => {
      const isFirst = i === 0;
      const marker = L.circleMarker([p[1], p[0]], {
        radius: isFirst ? 8 : 5,
        color: isFirst ? '#22c55e' : '#94a3b8',
        fillColor: isFirst ? '#22c55e' : '#94a3b8',
        fillOpacity: 0.8,
        weight: 2,
      }).addTo(map);

      if (isFirst && points.length >= 3) {
        marker.bindTooltip('Click to close polygon', {
          permanent: false,
          direction: 'top',
        });
        marker.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          closePolygon();
        });
      }

      markersRef.current.push(marker);
    });

    if (isClosed && points.length >= 3) {
      const arced = smoothedPoints();

      if (arced) {
        // Show original corners as a dashed outline
        const originalPoly = L.polygon(latLngs, {
          color: '#94a3b8',
          fillOpacity: 0,
          weight: 1,
          dashArray: '4, 6',
        }).addTo(map);
        polygonLayerRef.current = originalPoly;

        // Show arc-smoothed polygon as the main solid outline
        const arcLatLngs: L.LatLngExpression[] = arced.map(p => [p[1], p[0]]);
        const arcPoly = L.polygon(arcLatLngs, {
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.15,
          weight: 2.5,
        }).addTo(map);
        arcPolygonRef.current = arcPoly;

        const areaM2 = calculateSphericalArea(arced);
        setArea(areaM2);
      } else {
        // No rounding — standard solid polygon
        const polygon = L.polygon(latLngs, {
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);
        polygonLayerRef.current = polygon;

        const areaM2 = calculateSphericalArea(points);
        setArea(areaM2);
      }
    } else if (points.length >= 2) {
      // Open polyline
      const polyline = L.polyline(latLngs, {
        color: '#3b82f6',
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);
      polylineRef.current = polyline;
      setArea(null);
    }
  }, [points, isClosed, arcRadiusFt]); // eslint-disable-line react-hooks/exhaustive-deps

  const closePolygon = useCallback(() => {
    if (points.length >= 3) {
      setIsClosed(true);
    }
  }, [points]);

  const handleUndo = () => {
    if (isClosed) {
      setIsClosed(false);
    } else {
      setPoints(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setPoints([]);
    setIsClosed(false);
    setArcRadiusFt(0);
  };

  const handleConfirm = () => {
    if (points.length >= 3) {
      // Export arc-smoothed points if rounding is active, otherwise raw points
      const arced = smoothedPoints();
      onConfirm(arced ?? points);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;

    try {
      // Use Nominatim (OSM) geocoding - free, no API key
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept': 'application/json' } }
      );
      const results = await res.json();

      if (results.length > 0) {
        const { lat, lon } = results[0];
        mapRef.current.setView([parseFloat(lat), parseFloat(lon)], 16);
      }
    } catch {
      // Geocoding failed silently
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') handleSearch();
  };

  const hasArcs = isClosed && points.length >= 3 && arcRadiusFt > 0;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.6)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1f2937', borderRadius: '8px', padding: '16px',
        width: '90vw', height: '85vh', maxWidth: '1200px',
        display: 'flex', flexDirection: 'column', color: 'white',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Trace Field Boundary on Satellite Image
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search address or coordinates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{
                width: '280px', padding: '6px 10px', borderRadius: '4px',
                border: '1px solid #4b5563', background: '#374151', color: 'white',
                fontSize: '13px',
              }}
            />
            <button onClick={handleSearch} style={{
              padding: '6px 12px', borderRadius: '4px', border: 'none',
              background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '13px',
            }}>
              Go
            </button>
          </div>
        </div>

        {/* Instructions bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', background: '#374151', borderRadius: '4px',
          marginBottom: '8px', fontSize: '13px',
        }}>
          <span style={{ color: '#9ca3af' }}>
            {points.length === 0
              ? 'Click on the map to place boundary points around your field'
              : isClosed
                ? `Boundary complete — ${points.length} corner points${hasArcs ? ', arcs applied' : ''}, ${formatArea(area)}`
                : points.length < 3
                  ? `${points.length} point${points.length > 1 ? 's' : ''} placed — need at least 3`
                  : `${points.length} points — click first point (green) to close, or keep adding`}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleUndo} disabled={points.length === 0} style={{
              padding: '4px 10px', borderRadius: '3px', border: '1px solid #4b5563',
              background: '#1f2937', color: points.length > 0 ? 'white' : '#6b7280',
              cursor: points.length > 0 ? 'pointer' : 'default', fontSize: '12px',
            }}>
              Undo
            </button>
            <button onClick={handleClear} disabled={points.length === 0} style={{
              padding: '4px 10px', borderRadius: '3px', border: '1px solid #4b5563',
              background: '#1f2937', color: points.length > 0 ? 'white' : '#6b7280',
              cursor: points.length > 0 ? 'pointer' : 'default', fontSize: '12px',
            }}>
              Clear
            </button>
          </div>
        </div>

        {/* Arc corner radius control — visible once polygon is closed */}
        {isClosed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '7px 12px', background: '#1e3a2f', border: '1px solid #166534',
            borderRadius: '4px', marginBottom: '8px', fontSize: '13px',
          }}>
            <span style={{ color: '#86efac', fontWeight: 500, whiteSpace: 'nowrap' }}>
              ↻ Corner Radius
            </span>
            <input
              type="number"
              min={0}
              max={500}
              step={5}
              value={arcRadiusFt}
              onChange={e => setArcRadiusFt(Math.max(0, parseFloat(e.target.value) || 0))}
              onKeyDown={e => e.stopPropagation()}
              style={{
                width: '72px', padding: '3px 6px', borderRadius: '3px',
                border: '1px solid #166534', background: '#14532d', color: 'white',
                fontSize: '13px', textAlign: 'right',
              }}
            />
            <span style={{ color: '#86efac' }}>ft</span>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>
              {arcRadiusFt > 0
                ? `= ${(arcRadiusFt * 0.3048).toFixed(1)} m — rounds each corner to match tractor turning radius`
                : 'Set to round corners for tractor turning radius (0 = sharp corners)'}
            </span>
            {hasArcs && (
              <span style={{
                marginLeft: 'auto', color: '#4ade80', fontSize: '12px',
                background: '#14532d', padding: '2px 7px', borderRadius: '10px',
                border: '1px solid #166534', whiteSpace: 'nowrap',
              }}>
                Arcs active
              </span>
            )}
          </div>
        )}

        {/* Map */}
        <div
          ref={mapContainerRef}
          style={{
            flex: 1, borderRadius: '4px', overflow: 'hidden',
            border: '1px solid #4b5563',
          }}
        />

        {/* Footer buttons */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '12px',
          marginTop: '12px',
        }}>
          <button onClick={onCancel} style={{
            padding: '8px 20px', borderRadius: '4px', border: '1px solid #4b5563',
            background: '#374151', color: 'white', cursor: 'pointer', fontSize: '14px',
          }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isClosed || points.length < 3}
            style={{
              padding: '8px 20px', borderRadius: '4px', border: 'none',
              background: isClosed && points.length >= 3 ? '#22c55e' : '#4b5563',
              color: 'white', cursor: isClosed && points.length >= 3 ? 'pointer' : 'default',
              fontSize: '14px', fontWeight: 500,
            }}
          >
            Use This Boundary
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Geometry helpers
// ============================================================

/**
 * Project [lon, lat] to local Cartesian meters relative to a reference point.
 * Accurate enough for field-scale areas (< 10 km).
 */
function lngLatToLocal(lon: number, lat: number, refLon: number, refLat: number): [number, number] {
  const R = 6371000;
  const avgLat = ((lat + refLat) / 2) * (Math.PI / 180);
  const x = (lon - refLon) * (Math.PI / 180) * R * Math.cos(avgLat);
  const y = (lat - refLat) * (Math.PI / 180) * R;
  return [x, y];
}

/**
 * Inverse of lngLatToLocal — convert local meters back to [lon, lat].
 */
function localToLngLat(x: number, y: number, refLon: number, refLat: number): [number, number] {
  const R = 6371000;
  const avgLat = refLat * (Math.PI / 180);
  const lon = refLon + (x / (R * Math.cos(avgLat))) * (180 / Math.PI);
  const lat = refLat + (y / R) * (180 / Math.PI);
  return [lon, lat];
}

/**
 * Generate arc interpolation points at a polygon corner.
 *
 * Given three consecutive vertices (prev → curr → next), replaces the sharp
 * corner at `curr` with a circular arc of `radius` meters.  The arc is
 * approximated by `segments` straight-line steps (8 gives smooth results).
 *
 * Returns the arc points in local meter coords.  If the edges are too short
 * to fit the radius, the radius is automatically reduced to half the shorter
 * edge so the arc always fits.
 */
function roundCorner(
  prev: [number, number],
  curr: [number, number],
  next: [number, number],
  radius: number,
  segments = 8,
): [number, number][] {
  const dx1 = prev[0] - curr[0], dy1 = prev[1] - curr[1];
  const dx2 = next[0] - curr[0], dy2 = next[1] - curr[1];
  const len1 = Math.hypot(dx1, dy1);
  const len2 = Math.hypot(dx2, dy2);

  if (len1 < 0.01 || len2 < 0.01) return [curr];

  const ux1 = dx1 / len1, uy1 = dy1 / len1;
  const ux2 = dx2 / len2, uy2 = dy2 / len2;

  // Half-angle between the two edge directions
  const dot = Math.max(-1, Math.min(1, ux1 * ux2 + uy1 * uy2));
  const angle = Math.acos(dot);               // angle between BA and BC vectors
  const halfAngle = angle / 2;

  // Nearly straight or U-turn — keep the sharp corner
  if (halfAngle < 0.02 || halfAngle > Math.PI / 2 - 0.02) return [curr];

  // Distance along each edge from the vertex to the arc tangent point
  const tanDist = radius / Math.tan(halfAngle);

  // Clamp so tangent points stay within the edge (use 45% to leave room)
  const maxTanDist = Math.min(tanDist, len1 * 0.45, len2 * 0.45);
  const actualRadius = maxTanDist * Math.tan(halfAngle);

  // Tangent points on each edge
  const t1: [number, number] = [curr[0] + ux1 * maxTanDist, curr[1] + uy1 * maxTanDist];
  const t2: [number, number] = [curr[0] + ux2 * maxTanDist, curr[1] + uy2 * maxTanDist];

  // Arc center: move perpendicularly from t1 by actualRadius toward the inside of the corner
  // The cross product sign tells us which side is "inside"
  const cross = ux1 * uy2 - uy1 * ux2;
  const side = cross > 0 ? 1 : -1;
  // Perpendicular to edge-1 pointing inward
  const nx = -uy1 * side;
  const ny =  ux1 * side;
  const center: [number, number] = [t1[0] + nx * actualRadius, t1[1] + ny * actualRadius];

  // Sweep the arc from t1 to t2
  const startA = Math.atan2(t1[1] - center[1], t1[0] - center[0]);
  const endA   = Math.atan2(t2[1] - center[1], t2[0] - center[0]);

  let sweep = endA - startA;
  // Force the short arc in the correct rotational direction
  if (side > 0 && sweep > 0) sweep -= 2 * Math.PI;
  if (side < 0 && sweep < 0) sweep += 2 * Math.PI;

  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const a = startA + sweep * (i / segments);
    pts.push([
      center[0] + actualRadius * Math.cos(a),
      center[1] + actualRadius * Math.sin(a),
    ]);
  }
  return pts;
}

/**
 * Apply rounded corners to a closed polygon.
 *
 * @param points - Array of [lon, lat] pairs (assumed closed — last point connects to first)
 * @param radiusMeters - Corner radius in meters
 * @returns New [lon, lat] array with arc interpolation points inserted at each corner
 */
function applyRoundedCorners(points: [number, number][], radiusMeters: number): [number, number][] {
  if (points.length < 3 || radiusMeters <= 0) return points;

  // Reference origin for local projection (centroid)
  const refLon = points.reduce((s, p) => s + p[0], 0) / points.length;
  const refLat = points.reduce((s, p) => s + p[1], 0) / points.length;

  const local = points.map(p => lngLatToLocal(p[0], p[1], refLon, refLat));
  const n = local.length;

  const result: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const prev = local[(i - 1 + n) % n];
    const curr = local[i];
    const next = local[(i + 1) % n];
    const arcLocal = roundCorner(prev, curr, next, radiusMeters);
    for (const pt of arcLocal) {
      result.push(localToLngLat(pt[0], pt[1], refLon, refLat));
    }
  }
  return result;
}

/**
 * Calculate approximate area of a polygon on a sphere (in m²).
 * Uses the spherical excess formula.
 */
function calculateSphericalArea(coords: [number, number][]): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => deg * Math.PI / 180;

  let area = 0;
  const n = coords.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lon1 = toRad(coords[i][0]);
    const lat1 = toRad(coords[i][1]);
    const lon2 = toRad(coords[j][0]);
    const lat2 = toRad(coords[j][1]);
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  return Math.abs(area * R * R / 2);
}

function formatArea(areaM2: number | null): string {
  if (areaM2 === null) return '';
  const hectares = areaM2 / 10000;
  const acres = hectares * 2.47105;
  if (hectares >= 1) {
    return `${hectares.toFixed(1)} ha (${acres.toFixed(1)} acres)`;
  }
  return `${areaM2.toFixed(0)} m²`;
}
