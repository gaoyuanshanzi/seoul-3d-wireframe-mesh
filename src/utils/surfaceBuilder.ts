import * as THREE from 'three';
import type { DistrictParsedData } from './geoUtils';

/**
 * Viridis 컬러맵: 보라색(낮음) -> 청록색 -> 녹색 -> 노란색(높음)
 * 0.0 ~ 1.0 정규화 값을 RGB [r, g, b] (0~1 범위)로 반환
 */
export function getViridisColor(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));

  // Viridis 5-stop 팔레트
  // 0.00: #440154 (68, 1, 84)     - 짙은 보라색
  // 0.25: #3b528b (59, 82, 139)   - 짙은 블루/남색
  // 0.50: #21918c (33, 145, 140)  - 청록/틸
  // 0.75: #5ec962 (94, 201, 98)   - 밝은 녹색
  // 1.00: #fde725 (253, 231, 37)  - 선명한 노란색
  const stops = [
    { pos: 0.00, r: 68 / 255, g: 1 / 255, b: 84 / 255 },
    { pos: 0.25, r: 59 / 255, g: 82 / 255, b: 139 / 255 },
    { pos: 0.50, r: 33 / 255, g: 145 / 255, b: 140 / 255 },
    { pos: 0.75, r: 94 / 255, g: 201 / 255, b: 98 / 255 },
    { pos: 1.00, r: 253 / 255, g: 231 / 255, b: 37 / 255 },
  ];

  let low = stops[0];
  let high = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].pos && clamped <= stops[i + 1].pos) {
      low = stops[i];
      high = stops[i + 1];
      break;
    }
  }

  const factor = (clamped - low.pos) / (high.pos - low.pos || 1);
  const r = low.r + (high.r - low.r) * factor;
  const g = low.g + (high.g - low.g) * factor;
  const b = low.b + (high.b - low.b) * factor;

  return [r, g, b];
}

// 점 (x, y)가 링(Polygon) 내부에 있는지 판별 (Ray Casting Algorithm)
export function pointInPolygon(x: number, y: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// 점 (x, y)가 서울시 25개 구 중 어느 하나라도 속하는지 또는 최소 거리 계산
export function getSeoulDistance(x: number, y: number, districts: DistrictParsedData[]): number {
  for (const d of districts) {
    for (const poly of d.polygons) {
      if (pointInPolygon(x, y, poly.outerRing)) {
        return 0; // 서울시 내부
      }
    }
  }

  // 서울시 경계 밖인 경우 가장 가까운 점까지의 최소 거리 계산
  let minDistSq = Infinity;
  for (const d of districts) {
    for (const poly of d.polygons) {
      for (const pt of poly.outerRing) {
        const dx = x - pt[0];
        const dy = y - pt[1];
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) minDistSq = dSq;
      }
    }
  }
  return Math.sqrt(minDistSq);
}

/**
 * 커널 밀도 추정 (KDE / Gaussian RBF 보간) 기반으로
 * 주어진 점 (x, y)에서의 높이(0~100)를 연속적으로 계산합니다.
 */
export function evaluateKDEHeight(
  x: number,
  y: number,
  districts: DistrictParsedData[],
  normalizedValues: Record<string, number>,
  bandwidth = 5.2 // km 단위 가우시안 표준편차 sigma
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  const twoSigmaSq = 2 * bandwidth * bandwidth;

  for (const d of districts) {
    const val = normalizedValues[d.name] ?? 50;
    const cx = d.centroid[0];
    const cy = d.centroid[1];
    const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);

    // 가우시안 커널 가중치
    const weight = Math.exp(-distSq / twoSigmaSq);
    weightedSum += val * weight;
    totalWeight += weight;
  }

  const rawNormVal = totalWeight > 1e-6 ? weightedSum / totalWeight : 50;
  return rawNormVal;
}

/**
 * 3D 연속 곡면 표면도(KDE Surface Mesh)를 위한 BufferGeometry 생성
 */
export function buildKDESurfaceGeometry(
  districts: DistrictParsedData[],
  normalizedValues: Record<string, number>,
  resX = 84,
  resY = 74,
  rangeX: [number, number] = [-20, 20],
  rangeY: [number, number] = [-16, 16],
  maxElevation = 8.5 // 최대 3D Z축 높이
): {
  surfaceGeometry: THREE.BufferGeometry;
  wireframeGeometry: THREE.BufferGeometry;
} {
  const [minX, maxX] = rangeX;
  const [minY, maxY] = rangeY;
  const stepX = (maxX - minX) / resX;
  const stepY = (maxY - minY) / resY;

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // 1. 버텍스 위치 및 컬러 계산
  for (let j = 0; j <= resY; j++) {
    const y = minY + j * stepY;
    for (let i = 0; i <= resX; i++) {
      const x = minX + i * stepX;

      // 서울시 경계 외부 거리 확인 (부드러운 테두리 감쇠)
      const distOutside = getSeoulDistance(x, y, districts);
      let fadeFactor = 1.0;
      if (distOutside > 0) {
        // 서울시 외곽 3.5km 이내에서 서서히 0으로 감쇠
        fadeFactor = Math.max(0, 1 - distOutside / 3.5);
        fadeFactor = fadeFactor * fadeFactor; // 부드러운 쿼드라틱 감쇠
      }

      // KDE 높이 계산 (0 ~ 100)
      const kdeVal = evaluateKDEHeight(x, y, districts, normalizedValues);
      const effectiveVal = kdeVal * fadeFactor;

      // 3D Z축 높이 (0.1 ~ maxElevation)
      const z = Math.max(0.05, (effectiveVal / 100) * maxElevation);

      positions.push(x, y, z);

      // Viridis 컬러 적용
      const [r, g, b] = getViridisColor(effectiveVal / 100);
      colors.push(r, g, b);
    }
  }

  // 2. 사각형(Quad) 그리드 삼각화 인덱스 생성
  const rowStride = resX + 1;
  for (let j = 0; j < resY; j++) {
    for (let i = 0; i < resX; i++) {
      const a = j * rowStride + i;
      const b = j * rowStride + (i + 1);
      const c = (j + 1) * rowStride + i;
      const d = (j + 1) * rowStride + (i + 1);

      // 두 개의 삼각형으로 분할
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const surfaceGeometry = new THREE.BufferGeometry();
  surfaceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  surfaceGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  surfaceGeometry.setIndex(indices);
  surfaceGeometry.computeVertexNormals();

  // 지형 곡면 위에 얹을 3D 와이어프레임 그리드 지오메트리
  const wireLines: number[] = [];
  // 가로 방향 라인
  for (let j = 0; j <= resY; j += 2) {
    for (let i = 0; i < resX; i++) {
      const idxA = (j * rowStride + i) * 3;
      const idxB = (j * rowStride + (i + 1)) * 3;
      wireLines.push(
        positions[idxA], positions[idxA + 1], positions[idxA + 2] + 0.02,
        positions[idxB], positions[idxB + 1], positions[idxB + 2] + 0.02
      );
    }
  }
  // 세로 방향 라인
  for (let i = 0; i <= resX; i += 2) {
    for (let j = 0; j < resY; j++) {
      const idxA = (j * rowStride + i) * 3;
      const idxB = ((j + 1) * rowStride + i) * 3;
      wireLines.push(
        positions[idxA], positions[idxA + 1], positions[idxA + 2] + 0.02,
        positions[idxB], positions[idxB + 1], positions[idxB + 2] + 0.02
      );
    }
  }

  const wireframeGeometry = new THREE.BufferGeometry();
  wireframeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wireLines, 3));

  return { surfaceGeometry, wireframeGeometry };
}

/**
 * 서울시 25개 구 경계선 윤곽선을 3D 곡면 위에 투영하기 위한 라인 지오메트리 생성
 */
export function buildBoundaryOutlinesGeometry(
  districts: DistrictParsedData[],
  evaluateZFn: (x: number, y: number) => number
): THREE.BufferGeometry {
  const linePositions: number[] = [];

  districts.forEach(d => {
    d.polygons.forEach(poly => {
      const ring = poly.outerRing;
      for (let i = 0; i < ring.length - 1; i++) {
        const x1 = ring[i][0];
        const y1 = ring[i][1];
        const z1 = evaluateZFn(x1, y1) + 0.06;

        const x2 = ring[i + 1][0];
        const y2 = ring[i + 1][1];
        const z2 = evaluateZFn(x2, y2) + 0.06;

        linePositions.push(x1, y1, z1, x2, y2, z2);
      }
    });
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  return geo;
}
