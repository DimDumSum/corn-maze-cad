/**
 * SatelliteBoundaryPicker - Trace field boundaries on a satellite map
 *
 * Uses Leaflet with free satellite tile layers (Esri World Imagery).
 * User workflow:
 * 1. Navigate to field location (search or pan/zoom)
 * 2. Click points around the field boundary
 * 3. Close the polygon and confirm
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
  const markersRef = useRef<L.CircleMarker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [points, setPoints] = useState<[number, number][]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [area, setArea] = useState<number | null>(null);

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

  // Update polygon visualization when points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Clear old shapes
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (polygonLayerRef.current) { polygonLayerRef.current.remove(); polygonLayerRef.current = null; }

    if (points.length === 0) {
      setArea(null);
      return;
    }

    // Convert [lon, lat] to [lat, lng] for Leaflet
    const latLngs: L.LatLngExpression[] = points.map(p => [p[1], p[0]]);

    // Add markers for each point
    points.forEach((p, i) => {
      const isFirst = i === 0;
      const marker = L.circleMarker([p[1], p[0]], {
        radius: isFirst ? 8 : 6,
        color: isFirst ? '#22c55e' : '#3b82f6',
        fillColor: isFirst ? '#22c55e' : '#3b82f6',
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
      // Closed polygon
      const polygon = L.polygon(latLngs, {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map);
      polygonLayerRef.current = polygon;

      // Calculate approximate area
      const areaM2 = calculateSphericalArea(points);
      setArea(areaM2);
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
  }, [points, isClosed]);

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
  };

  const handleConfirm = () => {
    if (points.length >= 3) {
      onConfirm(points);
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
                ? `Boundary complete — ${points.length} points, ${formatArea(area)}`
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
