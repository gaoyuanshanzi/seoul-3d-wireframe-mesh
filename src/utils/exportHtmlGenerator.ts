import type { DistrictParsedData } from './geoUtils';

export function generateStandaloneHtml(
  districtParsedList: DistrictParsedData[],
  rawDistrictValues: Record<string, number>,
  normalizedDistrictValues: Record<string, number>,
  initialMode: 'modeA' | 'modeB' = 'modeA'
): string {
  const serializedData = districtParsedList.map(d => ({
    code: d.code,
    name: d.name,
    nameEng: d.nameEng,
    centroid: d.centroid,
    rawValue: rawDistrictValues[d.name] ?? 0,
    normalizedValue: normalizedDistrictValues[d.name] ?? 50,
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
  <title>서울시 25개 구 3D 시각화 (A:와이어프레임 / B:연속곡면 KDE)</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f1f5f9;
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
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(12px);
      padding: 16px 20px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      z-index: 10;
      max-width: 380px;
    }
    .hud-title {
      font-size: 16px;
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
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
      line-height: 1.4;
    }
    .top-toolbar {
      position: absolute;
      top: 20px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 20;
    }
    .tabs-card {
      display: flex;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(12px);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      gap: 4px;
    }
    .tab-btn {
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
      color: #64748b;
    }
    .tab-btn.active.modeA {
      background: #0284c7;
      color: white;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
    }
    .tab-btn.active.modeB {
      background: #059669;
      color: white;
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
    }
    .btn-reset {
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.94);
      color: #334155;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .btn-reset:hover {
      background: #ffffff;
      color: #0f172a;
    }
    .legend-card {
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      z-index: 10;
      width: 240px;
    }
    .legend-bar {
      height: 8px;
      border-radius: 9999px;
      margin: 6px 0;
    }
    .legend-bar.modeA {
      background: linear-gradient(to right, #0284c7, #6366f1, #e11d48);
    }
    .legend-bar.modeB {
      background: linear-gradient(to right, #440154, #21918c, #5ec962, #fde725);
    }
  </style>

  <!-- Three.js & OrbitControls -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
  <div class="hud-header">
    <div class="hud-title">
      <span id="header-mode-title">서울시 3D 시각화</span>
      <span class="hud-badge">Standalone</span>
    </div>
    <div class="hud-desc" id="header-mode-desc">
      등고선 높이는 0~100 스케일로 표시되고, 3D 공간 상단 라벨에는 실제 data값이 표시됩니다.
    </div>
  </div>

  <div class="top-toolbar">
    <div class="tabs-card">
      <button id="btn-modeA" class="tab-btn active modeA" onclick="setMode('modeA')">A. 구별 와이어프레임</button>
      <button id="btn-modeB" class="tab-btn" onclick="setMode('modeB')">B. 3D 연속 곡면 (KDE)</button>
    </div>
    <button class="btn-reset" onclick="resetCamera()">시점 초기화</button>
  </div>

  <div class="legend-card">
    <div style="font-weight:700; color:#334155;" id="legend-title">등고선 Z축 높이 (0 ~ 100)</div>
    <div id="legend-gradient" class="legend-bar modeA"></div>
    <div style="display:flex; justify-content:space-between; font-family:monospace;" id="legend-labels">
      <span>0 (낮음)</span>
      <span>100 (높음)</span>
    </div>
  </div>

  <div id="canvas-container"></div>

  <script id="district-data" type="application/json">
    ${serializedDataStr}
  </script>

  <script>
    const districtsData = JSON.parse(document.getElementById('district-data').textContent);
    let currentMode = '${initialMode}';

    const container = document.getElementById('canvas-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

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
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    function resetCamera() {
      camera.position.set(0, -42, 38);
      controls.target.set(0, 0, 2);
      controls.update();
    }

    // 조명
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dLight1 = new THREE.DirectionalLight(0xffffff, 0.95);
    dLight1.position.set(30, -20, 50);
    scene.add(dLight1);
    const dLight2 = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    dLight2.position.set(-30, 20, 30);
    scene.add(dLight2);

    // 바닥 그리드
    const grid = new THREE.GridHelper(70, 35, 0xcbd5e1, 0xe2e8f0);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.05;
    scene.add(grid);

    // 색상 함수
    function getModeAColor(val) {
      const norm = Math.max(0, Math.min(1, val / 100));
      if (norm < 0.5) {
        const t = norm / 0.5;
        return (Math.round(2 + t * 97) << 16) | (Math.round(132 - t * 30) << 8) | Math.round(199 + t * 42);
      } else {
        const t = (norm - 0.5) / 0.5;
        return (Math.round(99 + t * 126) << 16) | (Math.round(102 - t * 73) << 8) | Math.round(241 - t * 169);
      }
    }

    function getViridisColor(t) {
      const clamped = Math.max(0, Math.min(1, t));
      const stops = [
        { p: 0.00, r: 68, g: 1, b: 84 },
        { p: 0.25, r: 59, g: 82, b: 139 },
        { p: 0.50, r: 33, g: 145, b: 140 },
        { p: 0.75, r: 94, g: 201, b: 98 },
        { p: 1.00, r: 253, g: 231, b: 37 }
      ];
      let low = stops[0], high = stops[4];
      for (let i = 0; i < 4; i++) {
        if (clamped >= stops[i].p && clamped <= stops[i+1].p) {
          low = stops[i]; high = stops[i+1]; break;
        }
      }
      const factor = (clamped - low.p) / (high.p - low.p || 1);
      return [
        (low.r + (high.r - low.r) * factor) / 255,
        (low.g + (high.g - low.g) * factor) / 255,
        (low.b + (high.b - low.b) * factor) / 255
      ];
    }

    // 3D Billboard Sprite 텍스트 생성기
    function createTextSprite(text, subText, colorHex) {
      const canvas = document.createElement('canvas');
      canvas.width = 280; canvas.height = 130;
      const ctx = canvas.getContext('2d');
      const x = 18, y = 18, w = 244, h = 94, r = 16;
      ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.beginPath();
      ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
      ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
      ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
      ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#' + colorHex.toString(16).padStart(6, '0');
      ctx.lineWidth = 3; ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, 140, 54);
      ctx.fillStyle = '#' + colorHex.toString(16).padStart(6, '0');
      ctx.font = 'bold 20px monospace';
      ctx.fillText(subText, 140, 88);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
      sprite.scale.set(4.8, 2.2, 1);
      return sprite;
    }

    // ----------------------------------------------------
    // Group A: 구별 와이어프레임 메쉬
    // ----------------------------------------------------
    const groupA = new THREE.Group();
    districtsData.forEach(d => {
      const h = Math.max(0.6, (d.normalizedValue ?? 50) * 0.08);
      const colorHex = getModeAColor(d.normalizedValue ?? 50);
      const positions = [], indices = [], contourPositions = [];
      let vertexOffset = 0;

      d.polygons.forEach(poly => {
        const numVerts = poly.vertices2D.length / 2;
        for (let i = 0; i < numVerts; i++) positions.push(poly.vertices2D[i*2], poly.vertices2D[i*2+1], 0);
        const bBase = vertexOffset; vertexOffset += numVerts;
        for (let i = 0; i < numVerts; i++) positions.push(poly.vertices2D[i*2], poly.vertices2D[i*2+1], h);
        const tBase = vertexOffset; vertexOffset += numVerts;

        for (let i = 0; i < poly.triangles.length; i += 3) {
          indices.push(bBase + poly.triangles[i], bBase + poly.triangles[i+2], bBase + poly.triangles[i+1]);
          indices.push(tBase + poly.triangles[i], tBase + poly.triangles[i+1], tBase + poly.triangles[i+2]);
        }

        const allRings = [poly.outerRing, ...poly.holes];
        let rStart = 0;
        allRings.forEach(ring => {
          for (let i = 0; i < ring.length - 1; i++) {
            const b0 = bBase + rStart + i, b1 = bBase + rStart + i + 1;
            const t0 = tBase + rStart + i, t1 = tBase + rStart + i + 1;
            indices.push(b0, b1, t0); indices.push(b1, t1, t0);
          }
          rStart += ring.length;
        });

        const numC = Math.max(2, Math.floor(h / 0.8));
        for (let c = 0; c <= numC; c++) {
          const z = (h * c) / numC;
          allRings.forEach(ring => {
            for (let i = 0; i < ring.length - 1; i++) {
              contourPositions.push(ring[i][0], ring[i][1], z, ring[i+1][0], ring[i+1][1], z);
            }
          });
        }
      });

      const meshGeo = new THREE.BufferGeometry();
      meshGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      meshGeo.setIndex(indices);
      meshGeo.computeVertexNormals();

      const solidMesh = new THREE.Mesh(meshGeo, new THREE.MeshStandardMaterial({
        color: colorHex, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.28, side: THREE.DoubleSide
      }));
      const wireMesh = new THREE.Mesh(meshGeo, new THREE.MeshBasicMaterial({
        color: colorHex, wireframe: true, transparent: true, opacity: 0.85
      }));
      const cGeo = new THREE.BufferGeometry();
      cGeo.setAttribute('position', new THREE.Float32BufferAttribute(contourPositions, 3));
      const cLine = new THREE.LineSegments(cGeo, new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.45 }));

      const sprite = createTextSprite(d.name, (d.rawValue || 0).toLocaleString(), colorHex);
      sprite.position.set(d.centroid[0], d.centroid[1], h + 1.6);

      const dGroup = new THREE.Group();
      dGroup.add(solidMesh); dGroup.add(wireMesh); dGroup.add(cLine); dGroup.add(sprite);
      groupA.add(dGroup);
    });
    scene.add(groupA);

    // ----------------------------------------------------
    // Group B: 3D 연속 곡면 (KDE Surface)
    // ----------------------------------------------------
    const groupB = new THREE.Group();

    function evaluateKDE(x, y) {
      let wSum = 0, tWeight = 0;
      const twoSigSq = 2 * 5.2 * 5.2;
      districtsData.forEach(d => {
        const val = d.normalizedValue ?? 50;
        const distSq = (x - d.centroid[0])**2 + (y - d.centroid[1])**2;
        const w = Math.exp(-distSq / twoSigSq);
        wSum += val * w;
        tWeight += w;
      });
      return tWeight > 1e-6 ? wSum / tWeight : 50;
    }

    // 간단한 점-다각형 거리 계산
    function distToSeoul(x, y) {
      let minDistSq = Infinity;
      districtsData.forEach(d => {
        d.polygons.forEach(p => {
          for (let i = 0; i < p.outerRing.length; i++) {
            const dx = x - p.outerRing[i][0], dy = y - p.outerRing[i][1];
            const dSq = dx*dx + dy*dy;
            if (dSq < minDistSq) minDistSq = dSq;
          }
        });
      });
      return Math.sqrt(minDistSq);
    }

    const resX = 74, resY = 64;
    const minX = -20, maxX = 20, minY = -16, maxY = 16;
    const stepX = (maxX - minX) / resX, stepY = (maxY - minY) / resY;
    const bPos = [], bColors = [], bIndices = [], bWire = [];

    for (let j = 0; j <= resY; j++) {
      const y = minY + j * stepY;
      for (let i = 0; i <= resX; i++) {
        const x = minX + i * stepX;
        const dOut = distToSeoul(x, y);
        let fade = dOut > 3.0 ? Math.max(0, 1 - (dOut - 3.0) / 3.0) : 1.0;
        fade = fade * fade;

        const kdeVal = evaluateKDE(x, y) * fade;
        const z = Math.max(0.05, (kdeVal / 100) * 8.5);
        bPos.push(x, y, z);
        const [r, g, b] = getViridisColor(kdeVal / 100);
        bColors.push(r, g, b);
      }
    }

    const stride = resX + 1;
    for (let j = 0; j < resY; j++) {
      for (let i = 0; i < resX; i++) {
        const a = j * stride + i, b = j * stride + (i + 1);
        const c = (j + 1) * stride + i, d = (j + 1) * stride + (i + 1);
        bIndices.push(a, b, c);
        bIndices.push(b, d, c);
      }
    }

    // 와이어 라인
    for (let j = 0; j <= resY; j += 2) {
      for (let i = 0; i < resX; i++) {
        const iA = (j * stride + i)*3, iB = (j * stride + i + 1)*3;
        bWire.push(bPos[iA], bPos[iA+1], bPos[iA+2]+0.02, bPos[iB], bPos[iB+1], bPos[iB+2]+0.02);
      }
    }
    for (let i = 0; i <= resX; i += 2) {
      for (let j = 0; j < resY; j++) {
        const iA = (j * stride + i)*3, iB = ((j+1) * stride + i)*3;
        bWire.push(bPos[iA], bPos[iA+1], bPos[iA+2]+0.02, bPos[iB], bPos[iB+1], bPos[iB+2]+0.02);
      }
    }

    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3));
    sGeo.setAttribute('color', new THREE.Float32BufferAttribute(bColors, 3));
    sGeo.setIndex(bIndices);
    sGeo.computeVertexNormals();
    const surfaceMesh = new THREE.Mesh(sGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, side: THREE.DoubleSide }));
    groupB.add(surfaceMesh);

    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.Float32BufferAttribute(bWire, 3));
    groupB.add(new THREE.LineSegments(wGeo, new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.18 })));

    // 경계선
    const bLines = [];
    districtsData.forEach(d => {
      d.polygons.forEach(p => {
        for (let i = 0; i < p.outerRing.length - 1; i++) {
          const x1 = p.outerRing[i][0], y1 = p.outerRing[i][1];
          const z1 = (evaluateKDE(x1, y1) / 100) * 8.5 + 0.05;
          const x2 = p.outerRing[i+1][0], y2 = p.outerRing[i+1][1];
          const z2 = (evaluateKDE(x2, y2) / 100) * 8.5 + 0.05;
          bLines.push(x1, y1, z1, x2, y2, z2);
        }
      });
      // 중심점 라벨
      const cz = (evaluateKDE(d.centroid[0], d.centroid[1]) / 100) * 8.5;
      const [r, g, b] = getViridisColor((d.normalizedValue ?? 50) / 100);
      const hex = (Math.round(r*255) << 16) | (Math.round(g*255) << 8) | Math.round(b*255);
      const sprite = createTextSprite(d.name, (d.rawValue || 0).toLocaleString(), hex);
      sprite.position.set(d.centroid[0], d.centroid[1], cz + 1.6);
      groupB.add(sprite);
    });

    const bLineGeo = new THREE.BufferGeometry();
    bLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(bLines, 3));
    groupB.add(new THREE.LineSegments(bLineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, linewidth: 1.5 })));

    scene.add(groupB);

    // ----------------------------------------------------
    // 탭 모드 전환 로직
    // ----------------------------------------------------
    function setMode(mode) {
      currentMode = mode;
      const btnA = document.getElementById('btn-modeA');
      const btnB = document.getElementById('btn-modeB');
      const title = document.getElementById('header-mode-title');
      const desc = document.getElementById('header-mode-desc');
      const lTitle = document.getElementById('legend-title');
      const lGrad = document.getElementById('legend-gradient');
      const lLabels = document.getElementById('legend-labels');

      if (mode === 'modeA') {
        groupA.visible = true;
        groupB.visible = false;
        btnA.className = 'tab-btn active modeA';
        btnB.className = 'tab-btn';
        title.textContent = '서울시 25개 구 와이어프레임 3D';
        desc.textContent = '행정구역 경계선 단위로 독립된 3D 메쉬 Z축 높이와 등고선 표현';
        lTitle.textContent = '등고선 Z축 높이 (0 ~ 100)';
        lGrad.className = 'legend-bar modeA';
        lLabels.innerHTML = '<span>0 (낮음)</span><span>100 (높음)</span>';
      } else {
        groupA.visible = false;
        groupB.visible = true;
        btnA.className = 'tab-btn';
        btnB.className = 'tab-btn active modeB';
        title.textContent = '서울시 3D 연속 곡면 표면도 (KDE)';
        desc.textContent = '가우시안 커널 밀도 추정(KDE)과 Viridis 컬러 스펙트럼(보라->녹색->노랑)을 적용한 연속 지형 곡면';
        lTitle.textContent = 'KDE 밀도 색상 맵 (Viridis)';
        lGrad.className = 'legend-bar modeB';
        lLabels.innerHTML = '<span>보라색(최저밀도)</span><span>노란색(최고밀도)</span>';
      }
    }

    setMode(currentMode);

    // 렌더 루프 & 리사이즈
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
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
  rawDistrictValues: Record<string, number>,
  normalizedDistrictValues: Record<string, number>,
  initialMode: 'modeA' | 'modeB' = 'modeA',
  filename = 'seoul_3d_wireframe_mesh.html'
) {
  const htmlContent = generateStandaloneHtml(districtParsedList, rawDistrictValues, normalizedDistrictValues, initialMode);
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
