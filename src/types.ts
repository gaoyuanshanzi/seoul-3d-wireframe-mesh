export interface DistrictInfo {
  code: string;
  name: string;
  nameEng: string;
  value: number;
}

export interface GeoJsonFeature {
  type: string;
  properties: {
    code: string;
    name: string;
    name_eng: string;
    base_year?: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface SeoulGeoJson {
  type: string;
  features: GeoJsonFeature[];
}

export interface DistrictMeshGeometryData {
  name: string;
  code: string;
  center: [number, number]; // [x, y] in 3D world
  // vertices and indices for top face
  topVertices2D: [number, number][]; // 2D points relative to center
  triangles: number[]; // earcut indices
  boundaryLoops: [number, number][][]; // outer and inner boundaries
}
