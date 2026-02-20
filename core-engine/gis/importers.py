"""
File format importers for GIS data (KML, KMZ, Shapefile, GeoJSON, CSV).

Supports multiple vector formats and auto-detects format from file extension.
Uses GDAL-free libraries for Windows compatibility.
"""

import json
import csv
import os
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from lxml import etree
from fastkml import kml
import shapefile as shp  # pyshp
from shapely.geometry import shape, Point, Polygon, MultiPolygon, mapping, LinearRing
from shapely.geometry.base import BaseGeometry


class ImportError(Exception):
    """Raised when file import fails."""
    pass


def import_boundary(file_path: str) -> Dict:
    """
    Import a field boundary from various GIS file formats.

    Auto-detects format from file extension and calls appropriate handler.

    Args:
        file_path: Path to the file to import

    Returns:
        Dictionary with:
        {
            "geometry": GeoJSON-like geometry dict,
            "crs": str (e.g., "EPSG:4326"),
            "properties": dict (metadata from file),
            "source_format": str (e.g., "KML", "Shapefile")
        }

    Raises:
        ImportError: If file cannot be read or format is unsupported

    Example:
        >>> result = import_boundary("field.kml")
        >>> result["source_format"]
        'KML'
        >>> result["crs"]
        'EPSG:4326'
    """
    if not os.path.exists(file_path):
        raise ImportError(f"File not found: {file_path}")

    # Get file extension (lowercase, without dot)
    ext = Path(file_path).suffix.lower().lstrip('.')

    # Route to appropriate importer
    importers = {
        'kml': import_kml,
        'kmz': import_kmz,
        'shp': import_shapefile,
        'geojson': import_geojson,
        'json': import_geojson,
        'csv': import_csv,
    }

    if ext not in importers:
        raise ImportError(
            f"Unsupported file format: .{ext}. "
            f"Supported formats: {', '.join(importers.keys())}"
        )

    try:
        return importers[ext](file_path)
    except Exception as e:
        raise ImportError(f"Failed to import {ext.upper()}: {str(e)}") from e


def import_kml(file_path: str) -> Dict:
    """
    Import a field boundary from a KML file using fastkml.

    Args:
        file_path: Path to KML file

    Returns:
        Dictionary with geometry, CRS (always EPSG:4326), properties, and source format

    Raises:
        ImportError: If KML cannot be parsed or contains no valid polygons
    """
    try:
        # Read KML file
        with open(file_path, 'rb') as f:
            doc = f.read()

        # Parse KML
        k = kml.KML()
        k.from_string(doc)

        # Find first polygon or multipolygon
        polygon_geom = None
        properties = {}

        def extract_geometries(element):
            """Recursively extract geometries from KML structure."""
            nonlocal polygon_geom, properties

            if hasattr(element, 'features'):
                for feature in element.features():
                    if hasattr(feature, 'geometry') and feature.geometry:
                        geom = feature.geometry
                        if isinstance(geom, (Polygon, MultiPolygon)):
                            polygon_geom = geom
                            # Extract properties
                            if hasattr(feature, 'name'):
                                properties['name'] = feature.name
                            if hasattr(feature, 'description'):
                                properties['description'] = feature.description
                            return True
                    # Recursively search folders
                    if extract_geometries(feature):
                        return True
            return False

        # Search for polygon in document
        for feature in k.features():
            if extract_geometries(feature):
                break

        if polygon_geom is None:
            raise ImportError("No polygon or multipolygon found in KML file")

        # Convert to GeoJSON
        geometry = mapping(polygon_geom)

        return {
            "geometry": geometry,
            "crs": "EPSG:4326",  # KML is always WGS84
            "properties": properties,
            "source_format": "KML"
        }

    except Exception as e:
        raise ImportError(f"Failed to parse KML: {str(e)}") from e


def import_kmz(file_path: str) -> Dict:
    """
    Import a field boundary from a KMZ file (zipped KML).

    Args:
        file_path: Path to KMZ file

    Returns:
        Dictionary with geometry, CRS, properties, and source format

    Raises:
        ImportError: If KMZ cannot be extracted or contains no valid KML
    """
    try:
        # KMZ is a ZIP file containing doc.kml (and potentially other files)
        with tempfile.TemporaryDirectory() as temp_dir:
            # Extract KMZ
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)

            # Look for doc.kml or any .kml file
            kml_files = list(Path(temp_dir).rglob('*.kml'))

            if not kml_files:
                raise ImportError("No KML file found inside KMZ archive")

            # Use the first KML file found (usually doc.kml)
            kml_path = str(kml_files[0])

            # Import the extracted KML
            result = import_kml(kml_path)

            # Update source format
            result["source_format"] = "KMZ"

            return result

    except zipfile.BadZipFile:
        raise ImportError("Invalid KMZ file: not a valid ZIP archive")
    except Exception as e:
        raise ImportError(f"Failed to read KMZ: {str(e)}") from e


def import_shapefile(file_path: str) -> Dict:
    """
    Import a field boundary from a Shapefile using pyshp.

    Args:
        file_path: Path to .shp file (requires .shx, .dbf, and optionally .prj)

    Returns:
        Dictionary with geometry, CRS, properties, and source format

    Raises:
        ImportError: If shapefile cannot be read or contains no valid polygons
    """
    try:
        # Open shapefile with pyshp
        sf = shp.Reader(file_path)

        # Get CRS from .prj file if exists
        prj_file = Path(file_path).with_suffix('.prj')
        crs = "EPSG:4326"  # Default

        if prj_file.exists():
            try:
                with open(prj_file, 'r') as f:
                    prj_text = f.read()
                    # Try to extract EPSG code from WKT
                    if 'EPSG' in prj_text.upper():
                        # Simple extraction (not robust, but works for most cases)
                        import re
                        match = re.search(r'EPSG["\s,]*(\d+)', prj_text, re.IGNORECASE)
                        if match:
                            crs = f"EPSG:{match.group(1)}"
            except Exception:
                print(f"Warning: Could not parse .prj file, assuming WGS84")

        # Find first polygon or multipolygon
        polygon_shape = None
        properties = {}

        for i, shape_record in enumerate(sf.shapeRecords()):
            shape_obj = shape_record.shape

            # Check shape type (5 = Polygon, 15 = PolygonZ, 25 = PolygonM)
            if shape_obj.shapeType in [5, 15, 25]:
                # Convert pyshp shape to Shapely geometry
                # pyshp.Shape has .points (list of (x,y)) and .parts (indices of ring starts)

                if not shape_obj.points:
                    continue

                # Build polygon from parts
                if len(shape_obj.parts) == 1:
                    # Simple polygon
                    coords = shape_obj.points
                    polygon_shape = Polygon(coords)
                else:
                    # Polygon with holes or MultiPolygon
                    parts = list(shape_obj.parts) + [len(shape_obj.points)]
                    rings = []

                    for j in range(len(parts) - 1):
                        start = parts[j]
                        end = parts[j + 1]
                        ring_coords = shape_obj.points[start:end]
                        rings.append(LinearRing(ring_coords))

                    # First ring is exterior, rest are holes
                    if len(rings) > 0:
                        polygon_shape = Polygon(rings[0], rings[1:])

                # Get attribute data
                if shape_record.record:
                    properties = shape_record.record.as_dict()

                break  # Use first polygon found

        if polygon_shape is None:
            raise ImportError("No polygon found in shapefile")

        # Convert to GeoJSON
        geometry = mapping(polygon_shape)

        return {
            "geometry": geometry,
            "crs": crs,
            "properties": properties,
            "source_format": "Shapefile"
        }

    except Exception as e:
        raise ImportError(f"Failed to read shapefile: {str(e)}") from e


def import_geojson(file_path: str) -> Dict:
    """
    Import a field boundary from a GeoJSON file.

    Args:
        file_path: Path to .geojson or .json file

    Returns:
        Dictionary with geometry, CRS, properties, and source format

    Raises:
        ImportError: If GeoJSON is invalid or contains no valid polygons
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # GeoJSON can be a Feature, FeatureCollection, or just a Geometry
        geometry = None
        properties = {}
        crs = "EPSG:4326"  # Default CRS for GeoJSON

        if data.get('type') == 'FeatureCollection':
            # Find first polygon/multipolygon feature
            for feature in data.get('features', []):
                geom_type = feature.get('geometry', {}).get('type')
                if geom_type in ['Polygon', 'MultiPolygon']:
                    geometry = feature['geometry']
                    properties = feature.get('properties', {})
                    break

        elif data.get('type') == 'Feature':
            # Single feature
            geom_type = data.get('geometry', {}).get('type')
            if geom_type in ['Polygon', 'MultiPolygon']:
                geometry = data['geometry']
                properties = data.get('properties', {})

        elif data.get('type') in ['Polygon', 'MultiPolygon']:
            # Just a geometry (not a Feature)
            geometry = data

        # Check for CRS in properties (non-standard but sometimes present)
        if 'crs' in data:
            crs_props = data['crs'].get('properties', {})
            if 'name' in crs_props:
                # Extract EPSG code from CRS name
                crs_name = crs_props['name']
                if 'EPSG' in crs_name or 'epsg' in crs_name:
                    crs = crs_name.upper()

        if geometry is None:
            raise ImportError("No polygon or multipolygon found in GeoJSON")

        return {
            "geometry": geometry,
            "crs": crs,
            "properties": properties,
            "source_format": "GeoJSON"
        }

    except json.JSONDecodeError as e:
        raise ImportError(f"Invalid JSON: {str(e)}") from e
    except Exception as e:
        raise ImportError(f"Failed to read GeoJSON: {str(e)}") from e


def import_csv(
    file_path: str,
    lat_col: str = "lat",
    lon_col: str = "lon"
) -> Dict:
    """
    Import a field boundary from a CSV file with lat/lon coordinates.

    Creates a polygon from a sequence of points. Points should be in order
    around the boundary perimeter.

    Args:
        file_path: Path to CSV file
        lat_col: Name of latitude column (default: "lat")
        lon_col: Name of longitude column (default: "lon")

    Returns:
        Dictionary with geometry, CRS (EPSG:4326), properties, and source format

    Raises:
        ImportError: If CSV cannot be parsed or has insufficient valid points

    Notes:
        - Requires at least 3 points to form a polygon
        - Automatically closes the polygon if first != last point
        - Assumes coordinates are in WGS84 (EPSG:4326)
    """
    try:
        points: List[Tuple[float, float]] = []

        with open(file_path, 'r', encoding='utf-8') as f:
            # Try to detect delimiter (comma or semicolon)
            sample = f.read(1024)
            f.seek(0)
            sniffer = csv.Sniffer()
            delimiter = sniffer.sniff(sample).delimiter

            reader = csv.DictReader(f, delimiter=delimiter)

            # Check if required columns exist
            if lat_col not in reader.fieldnames:
                raise ImportError(
                    f"Latitude column '{lat_col}' not found. "
                    f"Available columns: {', '.join(reader.fieldnames)}"
                )
            if lon_col not in reader.fieldnames:
                raise ImportError(
                    f"Longitude column '{lon_col}' not found. "
                    f"Available columns: {', '.join(reader.fieldnames)}"
                )

            # Read points
            for i, row in enumerate(reader, 1):
                try:
                    lat = float(row[lat_col])
                    lon = float(row[lon_col])

                    # Validate coordinate ranges
                    if not (-90 <= lat <= 90):
                        print(f"Warning: Row {i} has invalid latitude: {lat}")
                        continue
                    if not (-180 <= lon <= 180):
                        print(f"Warning: Row {i} has invalid longitude: {lon}")
                        continue

                    points.append((lon, lat))  # Note: GeoJSON uses (lon, lat) order

                except (ValueError, TypeError) as e:
                    print(f"Warning: Row {i} has invalid coordinates: {e}")
                    continue

        # Validate point count
        if len(points) < 3:
            raise ImportError(
                f"Need at least 3 valid points to create a polygon, got {len(points)}"
            )

        # Auto-close polygon if needed
        if points[0] != points[-1]:
            points.append(points[0])
            print(f"Info: Auto-closed polygon by adding first point at end")

        # Create Shapely polygon
        polygon = Polygon(points)

        if not polygon.is_valid:
            raise ImportError(
                f"Created polygon is invalid: {polygon.is_valid_reason}"
            )

        # Convert to GeoJSON geometry
        geometry = mapping(polygon)

        return {
            "geometry": geometry,
            "crs": "EPSG:4326",
            "properties": {
                "point_count": len(points) - 1,  # Exclude closing point
                "source_file": os.path.basename(file_path)
            },
            "source_format": "CSV"
        }

    except csv.Error as e:
        raise ImportError(f"Invalid CSV file: {str(e)}") from e
    except Exception as e:
        raise ImportError(f"Failed to read CSV: {str(e)}") from e


def get_supported_formats() -> List[str]:
    """
    Get list of supported file formats.

    Returns:
        List of file extensions (without dots)
    """
    return ['kml', 'kmz', 'shp', 'geojson', 'json', 'csv']


def get_format_info() -> Dict[str, Dict]:
    """
    Get information about each supported format.

    Returns:
        Dictionary mapping format to info dict with:
        - name: Display name
        - extensions: List of file extensions
        - description: Format description
    """
    return {
        'KML': {
            'name': 'Keyhole Markup Language',
            'extensions': ['kml'],
            'description': 'Google Earth KML format (always WGS84)'
        },
        'KMZ': {
            'name': 'Compressed KML',
            'extensions': ['kmz'],
            'description': 'Zipped KML format'
        },
        'Shapefile': {
            'name': 'ESRI Shapefile',
            'extensions': ['shp'],
            'description': 'Industry standard vector format (requires .shp + .shx + .dbf + .prj)'
        },
        'GeoJSON': {
            'name': 'GeoJSON',
            'extensions': ['geojson', 'json'],
            'description': 'JSON-based geospatial format'
        },
        'CSV': {
            'name': 'Comma-Separated Values',
            'extensions': ['csv'],
            'description': 'Point coordinates with lat/lon columns'
        }
    }
