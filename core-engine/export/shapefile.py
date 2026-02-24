"""
Shapefile export functionality.

Handles exporting maze geometries to ESRI Shapefile format
with proper coordinate system projection files.
"""

import shapefile
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple


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


def create_wkt_prj_file(filepath: str, crs: str = "EPSG:4326"):
    """
    Create .prj file with WKT coordinate system definition.

    Uses pyproj to generate the correct WKT for any EPSG code.

    Args:
        filepath: Path where .prj file should be created
        crs: Coordinate reference system (e.g., "EPSG:32615")
    """
    try:
        import pyproj
        crs_obj = pyproj.CRS(crs)
        prj_content = crs_obj.to_wkt()
    except Exception:
        # Fallback to WGS84 if pyproj fails
        prj_content = (
            'GEOGCS["GCS_WGS_1984",'
            'DATUM["D_WGS_1984",'
            'SPHEROID["WGS_1984",6378137,298.257223563]],'
            'PRIMEM["Greenwich",0],'
            'UNIT["Degree",0.017453292519943295]]'
        )

    with open(filepath, 'w') as f:
        f.write(prj_content)


def export_cut_paths_to_shapefile(
    carved_paths: List[Dict],
    base_name: str = "maze_cut_paths",
    output_dir: Path = None,
    crs: str = "EPSG:4326",
) -> Dict[str, any]:
    """
    Export maze cut-path centerlines to ESRI Shapefile format.

    Each carved tractor pass becomes one line record with an ID and the
    cutting WIDTH_M attribute.  Corn-row wall centerlines are not included
    — they are a visual design aid with no value to the GPS operator.

    Creates .shp, .shx, .dbf, and .prj files in the Downloads folder
    (or specified output directory). Automatically adds timestamp if a
    file with the same name already exists.

    Args:
        carved_paths: List of {'points': [[x,y],...], 'width': float}
        base_name: Base name for output files (default: "maze_cut_paths")
        output_dir: Optional output directory (default: Downloads folder)
        crs: Coordinate reference system of the input coordinates

    Returns:
        {"success": bool, "path": str, "files": list[str]}

    Raises:
        ValueError: If carved_paths is empty
    """
    if not carved_paths:
        raise ValueError("No cut paths to export")

    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.shp"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = f"{base_name}_{timestamp}"
        output_path = output_dir / f"{base_name}.shp"

    with shapefile.Writer(str(output_path)) as writer:
        writer.field('ID', 'N')
        writer.field('WIDTH_M', 'N', decimal=4)

        for i, cp in enumerate(carved_paths):
            pts = cp.get("points", [])
            width = float(cp.get("width") or 0)
            if len(pts) < 2:
                continue
            writer.line([[(p[0], p[1]) for p in pts]])
            writer.record(i, width)

    prj_path = output_path.with_suffix('.prj')
    create_wkt_prj_file(str(prj_path), crs=crs)

    return {
        "success": True,
        "path": str(output_path),
        "files": [
            str(output_path),
            str(output_path.with_suffix('.shx')),
            str(output_path.with_suffix('.dbf')),
            str(prj_path),
        ],
    }
