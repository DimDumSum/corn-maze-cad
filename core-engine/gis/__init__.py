"""
GIS module for corn maze CAD application.

Handles coordinate projections, geometry validation, and file format imports.
"""

from .projection import (
    detect_utm_zone,
    get_utm_crs,
    get_centroid_coords,
    project_to_utm,
    reproject_geometry,
)

from .importers import (
    import_boundary,
    import_kml,
    import_kmz,
    import_shapefile,
    import_geojson,
    import_csv,
    get_supported_formats,
    get_format_info,
)

__all__ = [
    # Projection utilities
    "detect_utm_zone",
    "get_utm_crs",
    "get_centroid_coords",
    "project_to_utm",
    "reproject_geometry",
    # File importers
    "import_boundary",
    "import_kml",
    "import_kmz",
    "import_shapefile",
    "import_geojson",
    "import_csv",
    "get_supported_formats",
    "get_format_info",
]
