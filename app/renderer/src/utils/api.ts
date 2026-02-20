/**
 * API utilities for communicating with the Python backend.
 */

export interface ImportResult {
  success: boolean;
  geometry?: {
    exterior: number[][];
    interiors: number[][][];
  };
  crs?: string;
  source_crs?: string;
  source_format?: string;
  validation?: {
    is_valid: boolean;
    is_closed: boolean;
    area_m2: number;
    errors: string[];
    warnings: string[];
  };
  bounds?: number[];  // [minx, miny, maxx, maxy]
  area_hectares?: number;
  warnings?: string[];
  error?: string;
}

/**
 * Upload a boundary file to the backend for import.
 *
 * @param file - File object (from drag-drop), ArrayBuffer (from Electron dialog), or shapefile bundle
 * @param filename - Name of the file
 * @param apiUrl - Backend API URL (default: http://localhost:8000)
 * @returns Import result with geometry and validation info
 */
export async function uploadBoundary(
  file: File | File[] | number[] | Record<string, number[]>,
  filename: string,
  apiUrl: string = 'http://localhost:8000'
): Promise<ImportResult> {
  // Create FormData for multipart/form-data upload
  const formData = new FormData();

  if (file instanceof File) {
    // Browser single file upload (drag-drop or <input>)
    formData.append('file', file);
  } else if (Array.isArray(file)) {
    if (file.length > 0 && file[0] instanceof File) {
      // Browser multi-file upload (shapefile drag-drop)
      const files = file as File[];

      // Validate shapefile bundle
      const hasShp = files.some(f => f.name.endsWith('.shp'));
      const hasShx = files.some(f => f.name.endsWith('.shx'));
      const hasDbf = files.some(f => f.name.endsWith('.dbf'));

      if (hasShp && (!hasShx || !hasDbf)) {
        throw new Error('Incomplete shapefile: requires .shp, .shx, and .dbf files together');
      }

      // Upload all files
      files.forEach(f => {
        formData.append('files', f);
      });
    } else {
      // Electron single file ArrayBuffer upload
      const uint8Array = new Uint8Array(file as number[]);
      const blob = new Blob([uint8Array]);
      const fileObj = new File([blob], filename);
      formData.append('file', fileObj);
    }
  } else {
    // Electron shapefile bundle: Record<string, number[]>
    const files = file as Record<string, number[]>;
    const baseName = filename.replace(/\.[^.]+$/, ''); // Remove extension

    // Convert each file and upload
    for (const [ext, buffer] of Object.entries(files)) {
      const uint8Array = new Uint8Array(buffer);
      const blob = new Blob([uint8Array]);
      const fileObj = new File([blob], baseName + ext);
      formData.append('files', fileObj);
    }
  }

  // Upload to backend
  const response = await fetch(`${apiUrl}/import-boundary`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary parameter
  });

  if (!response.ok) {
    // Try to parse error details
    try {
      const errorData = await response.json();
      throw new Error(errorData.detail?.error || `Upload failed: ${response.statusText}`);
    } catch (e) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
  }

  const result: ImportResult = await response.json();
  return result;
}

/**
 * Get list of supported file formats from backend.
 *
 * @param apiUrl - Backend API URL
 * @returns List of supported formats with extensions and descriptions
 */
export async function getSupportedFormats(
  apiUrl: string = 'http://localhost:8000'
): Promise<Array<{
  format: string;
  name: string;
  extensions: string[];
  description: string;
}>> {
  const response = await fetch(`${apiUrl}/supported-formats`);

  if (!response.ok) {
    throw new Error('Failed to get supported formats');
  }

  const data = await response.json();
  return data.formats;
}
