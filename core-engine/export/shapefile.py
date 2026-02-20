"""
Shapefile export functionality.

Handles exporting maze geometries to ESRI Shapefile format
with proper coordinate system projection files.
"""

import shapefile
from pathlib import Path
from datetime import datetime
from shapely.geometry.base import BaseGeometry
from typing import List, Dict, Tuple
from geometry.operations import flatten_geometry


def get_downloads_folder() -> Path:
    """
    Get OS-specific Downloads folder path.

    Returns:
        Path to Downloads folder, or home directory as fallback

    Example:
        >>> folder = get_downloads_folder()
        >>> str(folder)
        'C:\\Users\\Username\\Downloads'  # on Windows
    """
    home = Path.home()
    downloads = home / "Downloads"

    if downloads.exists():
        return downloads

    # Fallback to home directory
    return home


def create_wkt_prj_file(filepath: str, crs: str = "EPSG:3857"):
    """
    Create .prj file with WKT coordinate system definition.

    Args:
        filepath: Path where .prj file should be created
        crs: Coordinate reference system (default: EPSG:3857 Web Mercator)

    Note:
        Currently only supports EPSG:3857. Will be extended to support
        UTM zones in future updates.
    """
    # TODO: Support dynamic CRS based on UTM zone detection
    # For now, hardcoded to Web Mercator
    prj_content = (
        'PROJCS["WGS 84 / Pseudo-Mercator",'
        'GEOGCS["WGS 84",'
        'DATUM["WGS_1984",'
        'SPHEROID["WGS 84",6378137,298.257223563]],'
        'PRIMEM["Greenwich",0],'
        'UNIT["degree",0.0174532925199433]],'
        'PROJECTION["Mercator_1SP"],'
        'PARAMETER["central_meridian",0],'
        'PARAMETER["scale_factor",1],'
        'PARAMETER["false_easting",0],'
        'PARAMETER["false_northing",0],'
        'UNIT["metre",1]]'
    )

    with open(filepath, 'w') as f:
        f.write(prj_content)


def export_walls_to_shapefile(
    walls: BaseGeometry,
    base_name: str = "maze_walls",
    output_dir: Path = None
) -> Dict[str, any]:
    """
    Export maze walls to ESRI Shapefile format.

    Creates .shp, .shx, .dbf, and .prj files in the Downloads folder
    (or specified output directory). Automatically adds timestamp
    if file already exists.

    Args:
        walls: Shapely geometry containing maze walls
        base_name: Base name for output files (default: "maze_walls")
        output_dir: Optional output directory (default: Downloads folder)

    Returns:
        Dictionary with:
        {
            "success": bool,
            "path": str (path to .shp file),
            "files": list[str] (all generated file paths)
        }

    Raises:
        ValueError: If walls geometry is None or empty

    Example:
        >>> from shapely.geometry import MultiLineString
        >>> walls = MultiLineString([...])
        >>> result = export_walls_to_shapefile(walls)
        >>> print(result["path"])
        'C:\\Users\\Username\\Downloads\\maze_walls.shp'
    """
    if walls is None:
        raise ValueError("No walls geometry to export")

    # Determine output directory
    if output_dir is None:
        output_dir = get_downloads_folder()

    # Build output path
    output_path = output_dir / f"{base_name}.shp"

    # Avoid overwriting - add timestamp if exists
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = f"{base_name}_{timestamp}"
        output_path = output_dir / f"{base_name}.shp"

    # Create shapefile writer
    with shapefile.Writer(str(output_path)) as writer:
        writer.field('ID', 'N')  # Numeric ID field

        # Write geometries
        flattened = flatten_geometry(walls)
        for i, line_coords in enumerate(flattened):
            writer.line([line_coords])
            writer.record(i)

    # Create .prj file with coordinate system definition
    prj_path = output_path.with_suffix('.prj')
    create_wkt_prj_file(str(prj_path))

    return {
        "success": True,
        "path": str(output_path),
        "files": [
            str(output_path),                          # .shp
            str(output_path.with_suffix('.shx')),      # .shx
            str(output_path.with_suffix('.dbf')),      # .dbf
            str(prj_path)                               # .prj
        ]
    }
