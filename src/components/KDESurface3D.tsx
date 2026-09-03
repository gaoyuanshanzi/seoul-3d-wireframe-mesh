import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { DistrictParsedData } from '../utils/geoUtils';
import { 
  buildKDESurfaceGeometry, 
  buildBoundaryOutlinesGeometry, 
  evaluateKDEHeight, 
  getSeoulDistance,
  getViridisColor
} from '../utils/surfaceBuilder';

interface KDESurface3DProps {
  districts: DistrictParsedData[];
  rawValues: Record<string, number>;
  normalizedValues: Record<string, number>;
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
}

export const KDESurface3D: React.FC<KDESurface3DProps> = ({
  districts,
  rawValues,
  normalizedValues,
  selectedDistrict,
  onSelectDistrict,
}) => {
  // 1. KDE 연속 곡면 표면도 지오메트리 생성
  const { surfaceGeometry, wireframeGeometry } = useMemo(() => {
    return buildKDESurfaceGeometry(districts, normalizedValues);
  }, [districts, normalizedValues]);

  // 임의의 점 (x, y)에서의 3D 높이 z 계산 함수
  const getZAt = useMemo(() => {
    return (x: number, y: number) => {
      const distOutside = getSeoulDistance(x, y, districts);
      let fadeFactor = 1.0;
      if (distOutside > 0) {
        fadeFactor = Math.max(0, 1 - distOutside / 3.5);
        fadeFactor = fadeFactor * fadeFactor;
      }
      const kdeVal = evaluateKDEHeight(x, y, districts, normalizedValues);
      return Math.max(0.05, (kdeVal * fadeFactor / 100) * 8.5);
    };
  }, [districts, normalizedValues]);

  // 2. 구 경계선 윤곽선을 3D 곡면 위에 입체 투영
  const boundaryGeometry = useMemo(() => {
    return buildBoundaryOutlinesGeometry(districts, getZAt);
  }, [districts, getZAt]);

  return (
    <group>
      {/* 1. 3D 연속 곡면 메시 (KDE Surface Mesh with Viridis Colors) */}
      <mesh geometry={surfaceGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.32}
          metalness={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. 3D 격자 메시 와이어프레임 오버레이 (Grid Mesh Overlay) */}
      <lineSegments geometry={wireframeGeometry}>
        <lineBasicMaterial
          color="#0f172a"
          transparent
          opacity={0.18}
          linewidth={1}
        />
      </lineSegments>

      {/* 3. 서울시 25개 구 경계선 윤곽선 (Boundary Lines) */}
      <lineSegments geometry={boundaryGeometry}>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.75}
          linewidth={1.5}
        />
      </lineSegments>

      {/* 4. 각 자치구 중심점에 3D Billboard 라벨 (실제 data값 표시) */}
      {districts.map(d => {
        const cx = d.centroid[0];
        const cy = d.centroid[1];
        const cz = getZAt(cx, cy);
        const rawVal = rawValues[d.name] ?? 0;
        const normVal = normalizedValues[d.name] ?? 50;
        const isSelected = selectedDistrict === d.name;
        const [r, g, b] = getViridisColor(normVal / 100);
        const hexColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

        return (
          <group key={d.name} position={[cx, cy, cz]}>
            {/* 중심점 핀/마커 */}
            <mesh position={[0, 0, 0.2]}>
              <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>

            {/* 3D Billboard HTML 라벨 */}
            <Html
              position={[0, 0, 0.8]}
              center
              distanceFactor={45}
              style={{
                transition: 'all 0.2s ease-out',
                pointerEvents: 'none',
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDistrict(isSelected ? null : d.name);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border backdrop-blur-md cursor-pointer transition-all duration-200 select-none ${
                  isSelected
                    ? 'bg-amber-400 text-slate-900 border-amber-300 scale-110 shadow-amber-500/30'
                    : 'bg-white/95 text-slate-800 border-slate-200 shadow-slate-900/10 hover:border-amber-400'
                }`}
                style={{ whiteSpace: 'nowrap' }}
              >
                <span className="text-[12px] font-bold tracking-tight">
                  {d.name}
                </span>
                <span
                  className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-black/10 text-slate-900'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                  style={{ color: isSelected ? '#0f172a' : hexColor }}
                  title={`실제값: ${rawVal.toLocaleString()} (KDE 높이: ${normVal})`}
                >
                  {rawVal.toLocaleString()}
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
