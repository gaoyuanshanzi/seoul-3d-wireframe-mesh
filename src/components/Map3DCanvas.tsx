import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Download, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { DistrictParsedData } from '../utils/geoUtils';
import { District3DItem } from './District3DItem';
import { downloadStandaloneHtml } from '../utils/exportHtmlGenerator';

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
      downloadStandaloneHtml(districts, rawValues, normalizedValues, 'seoul_3d_wireframe_mesh.html');
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
      {/* 1. 우측 상단 Overlay: 'Export HTML' 버튼 */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2.5">
        <button
          onClick={handleExportHtml}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/30 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'HTML 생성 중...' : 'Export HTML'}
        </button>

        <button
          onClick={handleResetCamera}
          title="카메라 시점 초기화"
          className="p-2.5 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl shadow-md border border-slate-200/80 backdrop-blur-md transition-all hover:shadow-lg cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 성공 토스트 메시지 */}
      {showSuccessToast && (
        <div className="absolute top-18 right-5 z-30 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-xl text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>단일 실행형 HTML 파일(seoul_3d_wireframe_mesh.html) 다운로드 완료!</span>
        </div>
      )}

      {/* 좌측 상단 안내 뱃지 */}
      <div className="absolute top-5 left-5 z-10 pointer-events-none">
        <div className="bg-white/85 backdrop-blur-md border border-slate-200/60 rounded-xl px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            3D Wireframe Mesh 뷰포트
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            등고선 높이: <strong>0~100 스케일</strong> • 3D 라벨: <strong>실제 data값</strong>
          </div>
        </div>
      </div>

      {/* 우측 하단 범례 카드 */}
      <div className="absolute bottom-5 right-5 z-10 bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-xl p-3 shadow-md max-w-xs pointer-events-none">
        <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span>등고선 Z축 높이 (0 ~ 100)</span>
          <span className="text-[10px] text-emerald-600 font-mono">자동 비율조정</span>
        </div>
        <div className="h-2 w-52 rounded-full bg-gradient-to-r from-[#0284c7] via-[#6366f1] to-[#e11d48] shadow-inner" />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span title={`최솟값: ${minRaw.toLocaleString()}`}>0 ({minRaw.toLocaleString()})</span>
          <span title={`최댓값: ${maxRaw.toLocaleString()}`}>100 ({maxRaw.toLocaleString()})</span>
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
        <ambientLight intensity={0.8} />
        <directionalLight position={[30, -20, 50]} intensity={0.9} castShadow />
        <directionalLight position={[-30, 20, 30]} intensity={0.35} color="#bae6fd" />

        {/* 바닥 베이스 그리드 */}
        <gridHelper
          args={[70, 35, '#cbd5e1', '#e2e8f0']}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0, -0.05]}
        />

        {/* 25개 구 3D 메쉬 렌더링: 0~100 높이 반영 & 실제 data값 라벨 표시 */}
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
