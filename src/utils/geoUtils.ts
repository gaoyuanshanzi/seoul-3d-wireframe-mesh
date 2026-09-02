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

// 25개 구 기본 실제 원본 데이터 (예: 서울시 구별 인구수/대표 지표 단위)
export const INITIAL_RAW_DISTRICT_VALUES: Record<string, number> = {
  '강남구': 534000,
  '강동구': 462000,
  '강북구': 296000,
  '강서구': 568000,
  '관악구': 487000,
  '광진구': 337000,
  '구로구': 395000,
  '금천구': 230000,
  '노원구': 503000,
  '도봉구': 312000,
  '동대문구': 342000,
  '동작구': 382000,
  '마포구': 365000,
  '서대문구': 306000,
  '서초구': 408000,
  '성동구': 281000,
  '성북구': 430000,
  '송파구': 658000,
  '양천구': 442000,
  '영등포구': 376000,
  '용산구': 218000,
  '은평구': 468000,
  '종로구': 141000,
  '중구': 121000,
  '중랑구': 385000,
};

// 실제 원본 데이터를 최소 0, 최대 100으로 정규화(Min-Max Scaling)
export function normalizeDistrictValues(
  rawValues: Record<string, number>
): {
  normalized: Record<string, number>;
  minRaw: number;
  maxRaw: number;
} {
  const vals = Object.values(rawValues);
  if (vals.length === 0) {
    return { normalized: {}, minRaw: 0, maxRaw: 100 };
  }
  const minRaw = Math.min(...vals);
  const maxRaw = Math.max(...vals);
  const diff = maxRaw - minRaw;

  const normalized: Record<string, number> = {};
  for (const [key, val] of Object.entries(rawValues)) {
    if (diff === 0) {
      normalized[key] = 50;
    } else {
      // 0 ~ 100 범위로 정규화 (소수점 1자리 반올림)
      normalized[key] = Math.round(((val - minRaw) / diff) * 1000) / 10;
    }
  }

  return { normalized, minRaw, maxRaw };
}

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
