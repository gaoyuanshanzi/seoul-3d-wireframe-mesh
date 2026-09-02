import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { DistrictParsedData } from '../utils/geoUtils';
import { getDistrictColor } from '../utils/geoUtils';
import { buildDistrictGeometry } from '../utils/meshBuilder';

interface District3DItemProps {
  district: DistrictParsedData;
  rawValue: number;
  normalizedValue: number;
  isSelected: boolean;
  onSelect: (name: string) => void;
}

export const District3DItem: React.FC<District3DItemProps> = ({
  district,
  rawValue,
  normalizedValue,
  isSelected,
  onSelect,
}) => {
  // 0~100으로 표시된 정규화 수치를 3D 등고선 높이(0.6 ~ 8.6 유닛)로 적용
  const height = useMemo(() => Math.max(0.6, normalizedValue * 0.08), [normalizedValue]);

  // 지오메트리 빌드
  const { meshGeometry, contourLinesGeometry } = useMemo(() => {
    return buildDistrictGeometry(district, height);
  }, [district, height]);

  // 0~100 수치 기준 컬러 계산
  const colorStr = useMemo(() => getDistrictColor(normalizedValue), [normalizedValue]);
  const threeColor = useMemo(() => new THREE.Color(colorStr), [colorStr]);

  return (
    <group onClick={(e) => {
      e.stopPropagation();
      onSelect(district.name);
    }}>
      {/* 1. 은은한 반투명 솔리드 볼륨 메쉬 */}
      <mesh geometry={meshGeometry}>
        <meshStandardMaterial
          color={isSelected ? '#38bdf8' : threeColor}
          transparent
          opacity={isSelected ? 0.45 : 0.28}
          roughness={0.3}
          metalness={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. 3D 그물형(Wireframe Mesh) 재질 */}
      <mesh geometry={meshGeometry}>
        <meshBasicMaterial
          color={isSelected ? '#0284c7' : threeColor}
          wireframe
          transparent
          opacity={isSelected ? 0.95 : 0.75}
        />
      </mesh>

      {/* 3. 등고선 (Contour Line Loops) */}
      <lineSegments geometry={contourLinesGeometry}>
        <lineBasicMaterial
          color={isSelected ? '#0369a1' : '#334155'}
          transparent
          opacity={isSelected ? 0.7 : 0.4}
          linewidth={1}
        />
      </lineSegments>

      {/* 4. 각 구 최상단(Z축 최고점) 위치에 3D Billboard HTML Overlay 라벨: 실제 data값 표시 */}
      <Html
        position={[district.centroid[0], district.centroid[1], height + 0.9]}
        center
        distanceFactor={45}
        style={{
          transition: 'all 0.2s ease-out',
          pointerEvents: 'none',
        }}
      >
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border backdrop-blur-md cursor-pointer transition-all duration-200 select-none ${
            isSelected
              ? 'bg-sky-600 text-white border-sky-400 scale-110 shadow-sky-500/30'
              : 'bg-white/95 text-slate-800 border-slate-200 shadow-slate-900/10 hover:border-sky-400'
          }`}
          style={{ whiteSpace: 'nowrap' }}
        >
          <span className="text-[12px] font-bold tracking-tight">
            {district.name}
          </span>
          <span
            className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              isSelected
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-900'
            }`}
            style={{
              color: isSelected ? '#ffffff' : colorStr,
            }}
            title={`실제값: ${rawValue.toLocaleString()} (정규화 높이: ${normalizedValue})`}
          >
            {rawValue.toLocaleString()}
          </span>
        </div>
      </Html>
    </group>
  );
};
