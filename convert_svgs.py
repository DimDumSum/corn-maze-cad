#!/usr/bin/env python3
"""
Convert complex traced SVG files into simplified silhouette path data
suitable for the clipart library (normalized to 100x100 viewBox).
"""

import os
import re
import json
import math
from xml.etree import ElementTree as ET
from shapely.geometry import Polygon, MultiPolygon, GeometryCollection
from shapely.ops import unary_union


def tokenize_svg_path(path_data: str):
    """Tokenize SVG path d attribute into commands and args."""
    tokens = re.findall(r'([MLHVCSQTAZmlhvcsqtaz])|(-?\d*\.?\d+(?:[eE][+-]?\d+)?)', path_data)
    commands = []
    current_cmd = None
    current_args = []
    for token in tokens:
        if token[0]:  # Command letter
            if current_cmd:
                commands.append((current_cmd, current_args))
            current_cmd = token[0]
            current_args = []
        elif token[1]:  # Number
            current_args.append(float(token[1]))
    if current_cmd:
        commands.append((current_cmd, current_args))
    return commands


def parse_svg_path_to_subpaths(path_data: str):
    """Parse SVG path data into list of subpaths (lists of (x,y) tuples)."""
    commands = tokenize_svg_path(path_data)
    all_subpaths = []
    current_subpath = []
    cx, cy = 0.0, 0.0
    sx, sy = 0.0, 0.0

    for cmd, args in commands:
        is_rel = cmd.islower()
        cmd_u = cmd.upper()

        if cmd_u == 'M':
            if current_subpath and len(current_subpath) >= 3:
                all_subpaths.append(current_subpath)
            current_subpath = []
            i = 0
            while i < len(args) - 1:
                x, y = args[i], args[i+1]
                if is_rel:
                    x += cx; y += cy
                cx, cy = x, y
                if i == 0:
                    sx, sy = x, y
                current_subpath.append((x, y))
                i += 2

        elif cmd_u == 'L':
            i = 0
            while i < len(args) - 1:
                x, y = args[i], args[i+1]
                if is_rel:
                    x += cx; y += cy
                cx, cy = x, y
                current_subpath.append((x, y))
                i += 2

        elif cmd_u == 'H':
            for x in args:
                if is_rel:
                    x += cx
                cx = x
                current_subpath.append((cx, cy))

        elif cmd_u == 'V':
            for y in args:
                if is_rel:
                    y += cy
                cy = y
                current_subpath.append((cx, cy))

        elif cmd_u == 'C':
            i = 0
            while i < len(args) - 5:
                x1, y1, x2, y2, x, y = args[i:i+6]
                if is_rel:
                    x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy
                for t_i in range(1, 4):
                    t = t_i / 3
                    bx = (1-t)**3*cx + 3*(1-t)**2*t*x1 + 3*(1-t)*t**2*x2 + t**3*x
                    by = (1-t)**3*cy + 3*(1-t)**2*t*y1 + 3*(1-t)*t**2*y2 + t**3*y
                    current_subpath.append((bx, by))
                cx, cy = x, y
                i += 6

        elif cmd_u == 'Q':
            i = 0
            while i < len(args) - 3:
                x1, y1, x, y = args[i:i+4]
                if is_rel:
                    x1 += cx; y1 += cy; x += cx; y += cy
                for t_i in range(1, 4):
                    t = t_i / 3
                    bx = (1-t)**2*cx + 2*(1-t)*t*x1 + t**2*x
                    by = (1-t)**2*cy + 2*(1-t)*t*y1 + t**2*y
                    current_subpath.append((bx, by))
                cx, cy = x, y
                i += 4

        elif cmd_u == 'A':
            i = 0
            while i < len(args) - 6:
                rx, ry, angle, large_arc, sweep, x, y = args[i:i+7]
                if is_rel:
                    x += cx; y += cy
                for t_i in range(1, 4):
                    t = t_i / 3
                    current_subpath.append((cx + t*(x-cx), cy + t*(y-cy)))
                cx, cy = x, y
                i += 7

        elif cmd_u == 'Z':
            if current_subpath:
                current_subpath.append((sx, sy))
                cx, cy = sx, sy

    if current_subpath and len(current_subpath) >= 3:
        all_subpaths.append(current_subpath)

    return all_subpaths


def parse_rgb(fill_str):
    """Parse rgb(r,g,b) to (r,g,b) tuple. Returns None if not parseable."""
    m = re.match(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', fill_str)
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return None


def is_near_white(r, g, b, threshold=240):
    """Check if an RGB color is near-white."""
    return r >= threshold and g >= threshold and b >= threshold


def is_visible_path(path_elem):
    """Check if a path element should be included in the silhouette."""
    opacity = path_elem.get('opacity', '1')
    try:
        op = float(opacity)
        if op < 0.1:
            return False
    except (ValueError, TypeError):
        pass

    fill = path_elem.get('fill', '')

    # Parse RGB fill
    rgb = parse_rgb(fill)
    if rgb:
        r, g, b = rgb
        # Skip near-white fills (background)
        if is_near_white(r, g, b, threshold=240):
            return False
        return True

    # Hex colors
    if fill.startswith('#'):
        hex_str = fill[1:]
        if len(hex_str) == 3:
            hex_str = hex_str[0]*2 + hex_str[1]*2 + hex_str[2]*2
        if len(hex_str) == 6:
            r, g, b = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
            if is_near_white(r, g, b, threshold=240):
                return False
            return True

    # Named colors
    if fill in ['white']:
        return False
    if fill in ['none', '']:
        stroke = path_elem.get('stroke', 'none')
        if stroke == 'none' or stroke == '':
            return False

    return True


def extract_polygons_from_svg(svg_path: str):
    """
    Extract visible polygons from SVG file.
    Returns (polygons_list, (vb_width, vb_height)).
    """
    tree = ET.parse(svg_path)
    root = tree.getroot()

    ns_prefix = ''
    m = re.match(r'\{(.+?)\}', root.tag)
    if m:
        ns_prefix = f'{{{m.group(1)}}}'

    viewBox = root.get('viewBox', '0 0 1024 1024')
    vb_parts = viewBox.split()
    vb_width = float(vb_parts[2])
    vb_height = float(vb_parts[3])

    paths = root.findall(f'.//{ns_prefix}path')
    polygons = []

    for path_elem in paths:
        if not is_visible_path(path_elem):
            continue

        d = path_elem.get('d', '')
        if not d:
            continue

        try:
            subpaths = parse_svg_path_to_subpaths(d)
            for sp in subpaths:
                if len(sp) < 3:
                    continue
                if sp[0] != sp[-1]:
                    sp.append(sp[0])
                if len(sp) < 4:
                    continue
                try:
                    poly = Polygon(sp)
                    if not poly.is_valid:
                        poly = poly.buffer(0)
                    if poly.is_valid and not poly.is_empty and poly.area > 1:
                        polygons.append(poly)
                except Exception:
                    pass
        except Exception:
            pass

    return polygons, (vb_width, vb_height)


def simplify_to_target(geom, max_vertices=300, min_tolerance=1.0, max_tolerance=100.0):
    """
    Iteratively simplify geometry to target vertex count.
    Uses binary search on tolerance.
    """
    def count_vertices(g):
        total = 0
        if isinstance(g, Polygon):
            total += len(g.exterior.coords)
            for interior in g.interiors:
                total += len(interior.coords)
        elif isinstance(g, MultiPolygon):
            for poly in g.geoms:
                total += len(poly.exterior.coords)
                for interior in poly.interiors:
                    total += len(interior.coords)
        elif hasattr(g, 'geoms'):
            for sub in g.geoms:
                total += count_vertices(sub)
        return total

    current_count = count_vertices(geom)
    if current_count <= max_vertices:
        return geom

    lo, hi = min_tolerance, max_tolerance
    best = geom

    for _ in range(20):  # binary search iterations
        mid = (lo + hi) / 2
        simplified = geom.simplify(mid, preserve_topology=True)
        if simplified.is_empty:
            hi = mid
            continue
        vc = count_vertices(simplified)
        if vc <= max_vertices:
            best = simplified
            hi = mid  # try less simplification
        else:
            lo = mid  # need more simplification

    # Final check - if still too many, use the highest tolerance
    final_count = count_vertices(best)
    if final_count > max_vertices * 1.5:
        best = geom.simplify(hi, preserve_topology=True)

    return best


def filter_small_polygons(geom, min_area_ratio=0.005):
    """Remove tiny polygons from a MultiPolygon that are too small to matter."""
    if isinstance(geom, Polygon):
        return geom

    if isinstance(geom, MultiPolygon):
        total_area = geom.area
        min_area = total_area * min_area_ratio
        kept = [p for p in geom.geoms if p.area >= min_area]
        if not kept:
            # Keep at least the largest
            kept = [max(geom.geoms, key=lambda p: p.area)]
        if len(kept) == 1:
            return kept[0]
        return MultiPolygon(kept)

    # GeometryCollection
    if hasattr(geom, 'geoms'):
        polys = []
        for g in geom.geoms:
            if isinstance(g, (Polygon, MultiPolygon)):
                polys.append(g)
        if polys:
            combined = unary_union(polys)
            return filter_small_polygons(combined, min_area_ratio)

    return geom


def polygon_to_svg_path(geom, target_size=100.0, padding=2.0):
    """
    Convert a Shapely geometry to SVG path data normalized to target viewBox.
    """
    if geom is None or geom.is_empty:
        return None

    minx, miny, maxx, maxy = geom.bounds
    width = maxx - minx
    height = maxy - miny

    if width <= 0 or height <= 0:
        return None

    usable = target_size - 2 * padding
    scale = usable / max(width, height)

    scaled_w = width * scale
    scaled_h = height * scale
    offset_x = padding + (usable - scaled_w) / 2 - minx * scale
    offset_y = padding + (usable - scaled_h) / 2 - miny * scale

    def transform_and_format(coords):
        """Transform coordinates to normalized viewBox and format as path."""
        points = []
        for x, y in coords:
            nx = round(x * scale + offset_x, 1)
            ny = round(y * scale + offset_y, 1)
            # Clean up .0 endings
            nx = int(nx) if nx == int(nx) else nx
            ny = int(ny) if ny == int(ny) else ny
            points.append((nx, ny))
        if len(points) < 3:
            return ''
        parts = [f'M{points[0][0]},{points[0][1]}']
        for x, y in points[1:-1]:  # Skip last point (duplicate of first for closed)
            parts.append(f'L{x},{y}')
        parts.append('Z')
        return ' '.join(parts)

    path_parts = []

    if isinstance(geom, Polygon):
        ext = transform_and_format(geom.exterior.coords)
        if ext:
            path_parts.append(ext)
        for interior in geom.interiors:
            ip = transform_and_format(interior.coords)
            if ip:
                path_parts.append(ip)
    elif isinstance(geom, MultiPolygon):
        for poly in geom.geoms:
            ext = transform_and_format(poly.exterior.coords)
            if ext:
                path_parts.append(ext)
            for interior in poly.interiors:
                ip = transform_and_format(interior.coords)
                if ip:
                    path_parts.append(ip)
    else:
        for g in getattr(geom, 'geoms', []):
            if isinstance(g, (Polygon, MultiPolygon)):
                sub = polygon_to_svg_path(g, target_size, padding)
                if sub:
                    path_parts.append(sub)

    return ' '.join(path_parts) if path_parts else None


def process_svg(filepath: str, max_vertices=300):
    """Process a single SVG file and return simplified path data."""
    polygons, (vb_w, vb_h) = extract_polygons_from_svg(filepath)

    if not polygons:
        return None

    # Union all polygons
    combined = unary_union(polygons)

    # Remove tiny fragments
    combined = filter_small_polygons(combined, min_area_ratio=0.005)

    # Buffer slightly to merge nearby polygons, then un-buffer
    max_dim = max(vb_w, vb_h)
    buffer_dist = max_dim * 0.003
    combined = combined.buffer(buffer_dist).buffer(-buffer_dist * 0.5)

    # Filter small polygons again after buffering
    combined = filter_small_polygons(combined, min_area_ratio=0.005)

    # Simplify to target vertex count
    combined = simplify_to_target(combined, max_vertices=max_vertices)

    # Convert to path data
    path_data = polygon_to_svg_path(combined)

    return path_data


def process_all_svgs(svg_dir: str, output_json: str, max_vertices=300):
    """Process all SVG files in directory and output JSON with path data."""
    files = sorted(os.listdir(svg_dir))
    svg_files = [f for f in files if f.endswith('.svg')]

    results = []
    for fname in svg_files:
        filepath = os.path.join(svg_dir, fname)
        name = os.path.splitext(fname)[0]

        # Create clean ID from filename
        item_id = (name.lower()
                   .replace(' ', '-')
                   .replace('(', '')
                   .replace(')', '')
                   .replace('.', '')
                   .replace('---', '-')
                   .strip('-'))

        print(f"Processing: {fname}...")

        try:
            path_data = process_svg(filepath, max_vertices=max_vertices)

            if path_data is None:
                print(f"  WARNING: No geometry extracted from {fname}")
                continue

            vert_count = path_data.count('L') + path_data.count('M')
            path_len = len(path_data)
            print(f"  OK: {vert_count} vertices, {path_len} chars")

            results.append({
                'id': item_id,
                'name': name,
                'pathData': path_data,
                'pathLength': path_len,
                'vertexCount': vert_count,
            })

        except Exception as e:
            print(f"  ERROR processing {fname}: {e}")
            import traceback
            traceback.print_exc()

    # Write output
    with open(output_json, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nDone! Processed {len(results)}/{len(svg_files)} files.")
    print(f"Output written to: {output_json}")

    total_path_chars = sum(r['pathLength'] for r in results)
    avg = total_path_chars // len(results) if results else 0
    max_len = max((r['pathLength'] for r in results), default=0)
    min_len = min((r['pathLength'] for r in results), default=0)
    print(f"Total path data: {total_path_chars:,} chars")
    print(f"Average per item: {avg:,} chars")
    print(f"Range: {min_len:,} - {max_len:,} chars")

    return results


if __name__ == '__main__':
    svg_dir = '/home/user/corn-maze-cad/animals svg'
    output_json = '/home/user/corn-maze-cad/animals_paths.json'
    process_all_svgs(svg_dir, output_json, max_vertices=300)
