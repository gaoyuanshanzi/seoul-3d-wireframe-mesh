import earcut from 'earcut';
import type { SeoulGeoJson } from '../types';

export const CENTER_LNG = 126.9762;
export const CENTER_LAT = 37.5622;
const DEG_TO_RAD = Math.PI / 180;
const COS_LAT = Math.cos(CENTER_LAT * DEG_TO_RAD);

// 1도당 거리 (km 기준 환산, Three.js 씬 단위 1 unit ~ 1 km)
export const KM_PER_LNG = 111.32 * COS_LAT; // 약 88.0 km
export const KM_PER_LAT = 110.57;           // 약 110.57 km

export function lngLatToXY(lng: number, lat: number): [number, number] {
  const x = (lng - CENTER_LNG) * KM_PER_LNG;
  const y = (lat - CENTER_LAT) * KM_PER_LAT;
  return [x, y];
}

export interface DistrictParsedData {
  code: string;
  name: string;
  nameEng: string;
  centroid: [number, number]; // [x, y]
  polygons: {
    outerRing: [number, number][]; // 2D points [x, y]
    holes: [number, number][][];
    vertices2D: number[]; // flat [x0, y0, x1, y1...]
    triangles: number[];  // triangle vertex indices
  }[];
}

// 다각형 무게중심(Centroid) 계산
function computeRingCentroid(ring: [number, number][]): [number, number] {
  let signedArea = 0;
  let cx = 0;
  let cy = 0;
  const n = ring.length;

  for (let i = 0; i < n - 1; i++) {
    const x0 = ring[i][0];
    const y0 = ring[i][1];
    const x1 = ring[i + 1][0];
    const y1 = ring[i + 1][1];
    const a = x0 * y1 - x1 * y0;
    signedArea += a;
    cx += (x0 + x1) * a;
    cy += (y0 + y1) * a;
  }

  signedArea *= 0.5;
  if (Math.abs(signedArea) < 1e-6) {
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += ring[i][0];
      sumY += ring[i][1];
    }
    return [sumX / n, sumY / n];
  }

  cx /= 6 * signedArea;
  cy /= 6 * signedArea;
  return [cx, cy];
}

export function parseSeoulGeoJson(geojson: SeoulGeoJson): DistrictParsedData[] {
  const earcutFn = (earcut as any).default || earcut;

  return geojson.features.map(feature => {
    const { code, name, name_eng } = feature.properties;
    const geom = feature.geometry;
    
    // Polygon or MultiPolygon
    const rawPolygons: number[][][][] = 
      geom.type === 'Polygon' 
        ? [geom.coordinates as number[][][]]
        : (geom.coordinates as number[][][][]);

    let totalArea = 0;
    let weightedCenterX = 0;
    let weightedCenterY = 0;

    const parsedPolygons = rawPolygons.map(poly => {
      const outerRingRaw = poly[0];
      const holesRaw = poly.slice(1);

      const outerRing = outerRingRaw.map(([lng, lat]) => lngLatToXY(lng, lat));
      const holes = holesRaw.map(h => h.map(([lng, lat]) => lngLatToXY(lng, lat)));

      const flatCoords: number[] = [];
      const holeIndices: number[] = [];

      outerRing.forEach(([x, y]) => {
        flatCoords.push(x, y);
      });

      holes.forEach(hole => {
        holeIndices.push(flatCoords.length / 2);
        hole.forEach(([x, y]) => {
          flatCoords.push(x, y);
        });
      });

      const triangles = earcutFn(flatCoords, holeIndices, 2);

      // Centroid 계산 가중치
      const [cRingX, cRingY] = computeRingCentroid(outerRing);
      let approxArea = 0;
      for (let i = 0; i < outerRing.length - 1; i++) {
        approxArea += outerRing[i][0] * outerRing[i + 1][1] - outerRing[i + 1][0] * outerRing[i][1];
      }
      approxArea = Math.abs(approxArea) * 0.5;

      totalArea += approxArea;
      weightedCenterX += cRingX * approxArea;
      weightedCenterY += cRingY * approxArea;

      return {
        outerRing,
        holes,
        vertices2D: flatCoords,
        triangles,
      };
    });

    const centroid: [number, number] = totalArea > 0 
      ? [weightedCenterX / totalArea, weightedCenterY / totalArea]
      : [0, 0];

    return {
      code,
      name,
      nameEng: name_eng || name,
      centroid,
      polygons: parsedPolygons,
    };
  });
}

// 25개 구 기본 수치 데이터 초기화 생성기
export const INITIAL_DISTRICT_VALUES: Record<string, number> = {
  '강남구': 92,
  '강동구': 64,
  '강북구': 45,
  '강서구': 78,
  '관악구': 58,
  '광진구': 62,
  '구로구': 54,
  '금천구': 48,
  '노원구': 68,
  '도봉구': 42,
  '동대문구': 59,
  '동작구': 66,
  '마포구': 85,
  '서대문구': 60,
  '서초구': 90,
  '성동구': 76,
  '성북구': 55,
  '송파구': 88,
  '양천구': 70,
  '영등포구': 82,
  '용산구': 86,
  '은평구': 52,
  '종로구': 74,
  '중구': 79,
  '중랑구': 47,
};

// 수치(0~100)에 따른 색상 계산
export function getDistrictColor(value: number, min = 0, max = 100): string {
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  
  if (norm < 0.5) {
    const t = norm / 0.5;
    const r = Math.round(2 + t * (99 - 2));
    const g = Math.round(132 + t * (102 - 132));
    const b = Math.round(199 + t * (241 - 199));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (norm - 0.5) / 0.5;
    const r = Math.round(99 + t * (225 - 99));
    const g = Math.round(102 + t * (29 - 102));
    const b = Math.round(241 + t * (72 - 241));
    return `rgb(${r}, ${g}, ${b})`;
  }
}
