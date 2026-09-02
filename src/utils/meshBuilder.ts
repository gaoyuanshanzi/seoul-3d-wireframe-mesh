import * as THREE from 'three';
import type { DistrictParsedData } from './geoUtils';

/**
 * 특정 구에 대해 높이(H)를 적용한 3D 입체 BufferGeometry를 생성합니다.
 * Z축이 높이(Height) 축입니다.
 */
export function buildDistrictGeometry(
  district: DistrictParsedData,
  height: number
): {
  meshGeometry: THREE.BufferGeometry;
  contourLinesGeometry: THREE.BufferGeometry;
} {
  const positions: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  // contour lines (와이어프레임 등고선 링) positions
  const contourPositions: number[] = [];

  district.polygons.forEach(poly => {
    const { outerRing, holes, vertices2D, triangles } = poly;
    const numVerts2D = vertices2D.length / 2;

    // 1. Bottom Face vertices (Z = 0)
    for (let i = 0; i < numVerts2D; i++) {
      positions.push(vertices2D[i * 2], vertices2D[i * 2 + 1], 0);
    }
    const bottomBase = vertexOffset;
    vertexOffset += numVerts2D;

    // 2. Top Face vertices (Z = height)
    for (let i = 0; i < numVerts2D; i++) {
      positions.push(vertices2D[i * 2], vertices2D[i * 2 + 1], height);
    }
    const topBase = vertexOffset;
    vertexOffset += numVerts2D;

    // Bottom Face Triangles (Normal facing down)
    for (let i = 0; i < triangles.length; i += 3) {
      indices.push(
        bottomBase + triangles[i],
        bottomBase + triangles[i + 2],
        bottomBase + triangles[i + 1]
      );
    }

    // Top Face Triangles (Normal facing up)
    for (let i = 0; i < triangles.length; i += 3) {
      indices.push(
        topBase + triangles[i],
        topBase + triangles[i + 1],
        topBase + triangles[i + 2]
      );
    }

    // 3. Side Walls (outerRing + holes)
    const allRings = [outerRing, ...holes];
    let ringStartIdx = 0;

    allRings.forEach(ring => {
      const ringLen = ring.length;
      for (let i = 0; i < ringLen - 1; i++) {
        const currIdx = ringStartIdx + i;
        const nextIdx = ringStartIdx + i + 1;

        const b0 = bottomBase + currIdx;
        const b1 = bottomBase + nextIdx;
        const t0 = topBase + currIdx;
        const t1 = topBase + nextIdx;

        // Quad = 2 triangles
        indices.push(b0, b1, t0);
        indices.push(b1, t1, t0);
      }
      ringStartIdx += ringLen;
    });

    // 4. 등고선 (Contour rings) 생성 (0부터 height까지 등간격)
    const numContours = Math.max(2, Math.floor(height / 0.8));
    for (let c = 0; c <= numContours; c++) {
      const z = (height * c) / numContours;
      allRings.forEach(ring => {
        for (let i = 0; i < ring.length - 1; i++) {
          contourPositions.push(ring[i][0], ring[i][1], z);
          contourPositions.push(ring[i + 1][0], ring[i + 1][1], z);
        }
      });
    }
  });

  const meshGeometry = new THREE.BufferGeometry();
  meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  meshGeometry.setIndex(indices);
  meshGeometry.computeVertexNormals();

  const contourLinesGeometry = new THREE.BufferGeometry();
  contourLinesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(contourPositions, 3));

  return {
    meshGeometry,
    contourLinesGeometry,
  };
}
