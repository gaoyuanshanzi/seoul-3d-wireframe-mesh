import type { DistrictParsedData } from './geoUtils';

export function generateStandaloneHtml(
  districtParsedList: DistrictParsedData[],
  districtValues: Record<string, number>
): string {
  // 직렬화 데이터 준비
  const serializedData = districtParsedList.map(d => ({
    code: d.code,
    name: d.name,
    nameEng: d.nameEng,
    centroid: d.centroid,
    value: districtValues[d.name] ?? 50,
    polygons: d.polygons.map(p => ({
      outerRing: p.outerRing,
      holes: p.holes,
      vertices2D: p.vertices2D,
      triangles: p.triangles,
    }))
  }));

  const serializedDataStr = JSON.stringify(serializedData);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>서울시 25개 구 3D 등고선 그물형 메쉬 시각화 (Standalone)</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      cursor: grab;
    }
    #canvas-container:active {
      cursor: grabbing;
    }
    .hud-header {
      position: absolute;
      top: 20px;
      left: 24px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      padding: 16px 22px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
      z-index: 10;
      max-width: 380px;
    }
    .hud-title {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hud-badge {
      font-size: 11px;
      font-weight: 600;
      background: #0284c7;
      color: white;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .hud-desc {
      font-size: 13px;
      color: #64748b;
      margin-top: 6px;
      line-height: 1.4;
    }
    .controls-card {
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      padding: 12px 18px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .btn-reset {
      margin-top: 6px;
      padding: 6px 12px;
      background: #0284c7;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-reset:hover {
      background: #0369a1;
    }
    #tooltip {
      position: absolute;
      display: none;
      pointer-events: none;
      background: rgba(15, 23, 42, 0.9);
      color: white;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 20;
      transform: translate(-50%, -120%);
    }
  </style>

  <!-- Three.js & OrbitControls from reliable CDNs -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
  <div class="hud-header">
    <div class="hud-title">
      <span>서울시 25개 구 3D 등고선 메쉬</span>
      <span class="hud-badge">Standalone</span>
    </div>
    <div class="hud-desc">
      각 구의 입력 수치에 따라 3D Wireframe Mesh 및 등고선 높이가 Z축으로 실시간 반영된 독립 실행형 뷰포트입니다.
    </div>
  </div>

  <div class="controls-card">
    <div><strong>마우스 조작 가이드</strong></div>
    <div>• 좌클릭 + 드래그: 3D 자유 회전</div>
    <div>• 마우스 휠: 줌 인 / 줌 아웃</div>
    <div>• 우클릭 + 드래그: 평면 이동(Pan)</div>
    <button class="btn-reset" onclick="resetCamera()">시점 초기화</button>
  </div>

  <div id="tooltip"></div>
  <div id="canvas-container"></div>

  <!-- 인젝션된 GeoJSON 및 수치 데이터 -->
  <script id="district-data" type="application/json">
    ${serializedDataStr}
  </script>

  <script>
    // 1. 데이터 파싱
    const districtsData = JSON.parse(document.getElementById('district-data').textContent);
    
    // 2. Three.js Scene Setup (Z축을 높이로 설정)
    const container = document.getElementById('canvas-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

    // 카메라 및 Z-Up 설정
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -42, 38);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 2);
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // 지면 아래로 내려가지 않도록 제한

    function resetCamera() {
      camera.position.set(0, -42, 38);
      controls.target.set(0, 0, 2);
      controls.update();
    }

    // 3. 조명 설정 (밝고 깔끔한 화이트 모드 조명)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(30, -20, 50);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    dirLight2.position.set(-30, 20, 30);
    scene.add(dirLight2);

    // 4. 바닥 그리드 (은은한 라이트 그레이 그리드)
    const gridHelper = new THREE.GridHelper(70, 35, 0xcbd5e1, 0xe2e8f0);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = -0.05;
    scene.add(gridHelper);

    // 5. 색상 헬퍼
    function getDistrictColor(val) {
      const norm = Math.max(0, Math.min(1, val / 100));
      if (norm < 0.5) {
        const t = norm / 0.5;
        const r = Math.round(2 + t * (99 - 2));
        const g = Math.round(132 + t * (102 - 132));
        const b = Math.round(199 + t * (241 - 199));
        return (r << 16) | (g << 8) | b;
      } else {
        const t = (norm - 0.5) / 0.5;
        const r = Math.round(99 + t * (225 - 99));
        const g = Math.round(102 + t * (29 - 102));
        const b = Math.round(241 + t * (72 - 241));
        return (r << 16) | (g << 8) | b;
      }
    }

    // 6. 3D Billboard Sprite 텍스트 생성기
    function createTextSprite(text, subText, colorHex) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      // 둥근 사각형 배경
      const x = 18, y = 18, w = 220, h = 92, r = 16;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      // 테두리
      ctx.strokeStyle = '#' + colorHex.toString(16).padStart(6, '0');
      ctx.lineWidth = 3;
      ctx.stroke();

      // 텍스트 (구 이름)
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, 128, 56);

      // 수치 뱃지
      ctx.fillStyle = '#' + colorHex.toString(16).padStart(6, '0');
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(subText, 128, 90);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        depthTest: false 
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(4.5, 2.25, 1);
      return sprite;
    }

    // 7. 각 구별 3D 메쉬 및 와이어프레임 생성
    const districtObjects = [];

    districtsData.forEach(district => {
      const h = Math.max(0.6, district.value * 0.08);
      const colorHex = getDistrictColor(district.value);

      const positions = [];
      const indices = [];
      const contourPositions = [];
      let vertexOffset = 0;

      district.polygons.forEach(poly => {
        const { outerRing, holes, vertices2D, triangles } = poly;
        const numVerts2D = vertices2D.length / 2;

        // Bottom (Z=0)
        for (let i = 0; i < numVerts2D; i++) {
          positions.push(vertices2D[i * 2], vertices2D[i * 2 + 1], 0);
        }
        const bottomBase = vertexOffset;
        vertexOffset += numVerts2D;

        // Top (Z=h)
        for (let i = 0; i < numVerts2D; i++) {
          positions.push(vertices2D[i * 2], vertices2D[i * 2 + 1], h);
        }
        const topBase = vertexOffset;
        vertexOffset += numVerts2D;

        // Triangles
        for (let i = 0; i < triangles.length; i += 3) {
          indices.push(bottomBase + triangles[i], bottomBase + triangles[i + 2], bottomBase + triangles[i + 1]);
        }
        for (let i = 0; i < triangles.length; i += 3) {
          indices.push(topBase + triangles[i], topBase + triangles[i + 1], topBase + triangles[i + 2]);
        }

        // Side Walls
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
            indices.push(b0, b1, t0);
            indices.push(b1, t1, t0);
          }
          ringStartIdx += ringLen;
        });

        // 등고선 루프
        const numContours = Math.max(2, Math.floor(h / 0.8));
        for (let c = 0; c <= numContours; c++) {
          const z = (h * c) / numContours;
          allRings.forEach(ring => {
            for (let i = 0; i < ring.length - 1; i++) {
              contourPositions.push(ring[i][0], ring[i][1], z);
              contourPositions.push(ring[i + 1][0], ring[i + 1][1], z);
            }
          });
        }
      });

      const meshGeo = new THREE.BufferGeometry();
      meshGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      meshGeo.setIndex(indices);
      meshGeo.computeVertexNormals();

      // 솔리드 반투명 베이스
      const solidMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.35,
        metalness: 0.1,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide
      });
      const solidMesh = new THREE.Mesh(meshGeo, solidMat);
      solidMesh.userData = { district };

      // 그물망 와이어프레임 오버레이
      const wireMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        wireframe: true,
        transparent: true,
        opacity: 0.85
      });
      const wireMesh = new THREE.Mesh(meshGeo, wireMat);

      // 등고선 라인 세그먼트
      const contourGeo = new THREE.BufferGeometry();
      contourGeo.setAttribute('position', new THREE.Float32BufferAttribute(contourPositions, 3));
      const contourMat = new THREE.LineBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.45,
        linewidth: 1
      });
      const contourLine = new THREE.LineSegments(contourGeo, contourMat);

      // 최상단 텍스트 스프라이트 라벨
      const sprite = createTextSprite(district.name, district.value.toString(), colorHex);
      sprite.position.set(district.centroid[0], district.centroid[1], h + 1.6);

      const group = new THREE.Group();
      group.add(solidMesh);
      group.add(wireMesh);
      group.add(contourLine);
      group.add(sprite);

      scene.add(group);
      districtObjects.push(solidMesh);
    });

    // 8. 렌더 루프 및 리사이즈
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>`;
}

export function downloadStandaloneHtml(
  districtParsedList: DistrictParsedData[],
  districtValues: Record<string, number>,
  filename = 'seoul_3d_wireframe_mesh.html'
) {
  const htmlContent = generateStandaloneHtml(districtParsedList, districtValues);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
