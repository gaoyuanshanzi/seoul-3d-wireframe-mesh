import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Download, RotateCcw, CheckCircle2, Box, Waves } from 'lucide-react';
import type { DistrictParsedData } from '../utils/geoUtils';
import { District3DItem } from './District3DItem';
import { KDESurface3D } from './KDESurface3D';
import { downloadStandaloneHtml } from '../utils/exportHtmlGenerator';

export type ViewMode = 'modeA' | 'modeB';

interface Map3DCanvasProps {
  districts: DistrictParsedData[];
  rawValues: Record<string, number>;
  normalizedValues: Record<string, number>;
  minRaw: number;
  maxRaw: number;
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
}

export const Map3DCanvas: React.FC<Map3DCanvasProps> = ({
  districts,
  rawValues,
  normalizedValues,
  minRaw,
  maxRaw,
  selectedDistrict,
  onSelectDistrict,
}) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('modeA');
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleExportHtml = () => {
    setIsExporting(true);
    try {
      downloadStandaloneHtml(
        districts, 
        rawValues, 
        normalizedValues, 
        viewMode,
        'seoul_3d_wireframe_mesh.html'
      );
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3500);
    } catch (err) {
      console.error('Export HTML failed:', err);
      alert('HTML Export 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden select-none">
      {/* 1. 상단 탭 (A버튼, B버튼) & Export HTML 버튼 */}
      <div className="absolute top-5 right-5 z-20 flex flex-wrap items-center gap-2.5">
        {/* A/B 방식 전환 탭 세그먼트 */}
        <div className="flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-slate-200/80">
          <button
            onClick={() => setViewMode('modeA')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'modeA'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>A 방식 (구별 와이어프레임)</span>
          </button>
          <button
            onClick={() => setViewMode('modeB')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'modeB'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>B 방식 (3D 연속 곡면 KDE)</span>
          </button>
        </div>

        {/* Export HTML 버튼 */}
        <button
          onClick={handleExportHtml}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? '생성 중...' : 'Export HTML'}
        </button>

        {/* 시점 초기화 버튼 */}
        <button
          onClick={handleResetCamera}
          title="카메라 시점 초기화"
          className="p-2 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl shadow-md border border-slate-200/80 backdrop-blur-md transition-all hover:shadow-lg cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 성공 토스트 메시지 */}
      {showSuccessToast && (
        <div className="absolute top-20 right-5 z-30 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-xl text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>단일 실행형 HTML 파일(A/B 모드 포함) 다운로드 완료!</span>
        </div>
      )}

      {/* 좌측 상단 모드 안내 뱃지 */}
      <div className="absolute top-5 left-5 z-10 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm max-w-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              viewMode === 'modeA' ? 'bg-sky-500' : 'bg-emerald-500'
            }`} />
            {viewMode === 'modeA' 
              ? 'A 방식: 25개 구별 3D 와이어프레임 메쉬' 
              : 'B 방식: 커널 밀도 추정(KDE) 3D 연속 곡면 표면도'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 leading-snug">
            {viewMode === 'modeA'
              ? '행정구역 경계선 단위로 독립된 3D 메쉬 Z축 높이와 등고선 표현'
              : '가우시안 커널 밀도 보간을 통해 경계선 없이 부드럽게 이어지는 연속 지형 곡면'}
          </div>
        </div>
      </div>

      {/* 우측 하단 범례 카드 (모드에 따라 동적 전환) */}
      <div className="absolute bottom-5 right-5 z-10 bg-white/92 backdrop-blur-md border border-slate-200/80 rounded-xl p-3 shadow-md max-w-xs pointer-events-none">
        <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>{viewMode === 'modeA' ? '등고선 Z축 높이 (0 ~ 100)' : 'KDE 연속 밀도 색상 맵'}</span>
          <span className="text-[10px] text-emerald-700 font-mono font-bold">
            {viewMode === 'modeA' ? 'Auto Scale' : 'Viridis Spectrum'}
          </span>
        </div>

        {/* 컬러 그라데이션 바 */}
        <div className={`h-2.5 w-56 rounded-full shadow-inner ${
          viewMode === 'modeA'
            ? 'bg-gradient-to-r from-[#0284c7] via-[#6366f1] to-[#e11d48]'
            : 'bg-gradient-to-r from-[#440154] via-[#21918c] via-[#5ec962] to-[#fde725]'
        }`} />

        <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono font-medium">
          <span>{viewMode === 'modeA' ? `0 (${minRaw.toLocaleString()})` : '보라색(최저밀도)'}</span>
          <span>{viewMode === 'modeA' ? `100 (${maxRaw.toLocaleString()})` : '노란색(최고밀도)'}</span>
        </div>
      </div>

      {/* React Three Fiber 3D Canvas */}
      <Canvas
        camera={{ position: [0, -42, 38], fov: 45, up: [0, 0, 1] }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            onSelectDistrict(null);
          }
        }}
        className="w-full h-full"
      >
        <color attach="background" args={['#f1f5f9']} />
        
        {/* 조명 */}
        <ambientLight intensity={0.85} />
        <directionalLight position={[30, -20, 50]} intensity={0.95} castShadow />
        <directionalLight position={[-30, 20, 30]} intensity={0.4} color="#bae6fd" />
        <directionalLight position={[0, 0, 40]} intensity={0.25} />

        {/* 바닥 베이스 그리드 */}
        <gridHelper
          args={[70, 35, '#cbd5e1', '#e2e8f0']}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, -0.05]}
        />

        {/* Mode A: 25개 구별 3D 와이어프레임 메쉬 */}
        {viewMode === 'modeA' && (
          <group>
            {districts.map((district) => (
              <District3DItem
                key={district.name}
                district={district}
                rawValue={rawValues[district.name] ?? 0}
                normalizedValue={normalizedValues[district.name] ?? 50}
                isSelected={selectedDistrict === district.name}
                onSelect={onSelectDistrict}
              />
            ))}
          </group>
        )}

        {/* Mode B: 3D 연속 곡면 표면도 (KDE Surface Map) */}
        {viewMode === 'modeB' && (
          <KDESurface3D
            districts={districts}
            rawValues={rawValues}
            normalizedValues={normalizedValues}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={onSelectDistrict}
          />
        )}

        {/* OrbitControls */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.06}
          target={[0, 0, 2]}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={10}
          maxDistance={120}
        />
      </Canvas>
    </div>
  );
};
