import { useState, useMemo, useCallback } from 'react';
import type { SeoulGeoJson } from './types';
import seoulDistrictsJson from './data/seoul_districts.json';
import { 
  parseSeoulGeoJson, 
  INITIAL_RAW_DISTRICT_VALUES, 
  normalizeDistrictValues 
} from './utils/geoUtils';
import { DistrictTable } from './components/DistrictTable';
import { Map3DCanvas } from './components/Map3DCanvas';

export function App() {
  // GeoJSON 데이터 파싱
  const parsedDistricts = useMemo(() => {
    return parseSeoulGeoJson(seoulDistrictsJson as SeoulGeoJson);
  }, []);

  // 25개 구 이름 목록
  const districtNames = useMemo(() => {
    return parsedDistricts.map(d => d.name);
  }, [parsedDistricts]);

  // 구별 실제 데이터 상태 (Raw Data: 자유로운 수치 입력 가능)
  const [rawDistrictValues, setRawDistrictValues] = useState<Record<string, number>>(() => {
    return { ...INITIAL_RAW_DISTRICT_VALUES };
  });

  // 0~100 스케일 자동 정규화 계산 (최댓값 100, 최솟값 0)
  const { normalized, minRaw, maxRaw } = useMemo(() => {
    return normalizeDistrictValues(rawDistrictValues);
  }, [rawDistrictValues]);

  // 현재 선택/포커스된 구
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  // 개별 실제 데이터 변경 핸들러
  const handleRawValueChange = useCallback((district: string, value: number) => {
    setRawDistrictValues(prev => ({
      ...prev,
      [district]: value,
    }));
  }, []);

  // 다중/일괄 실제 데이터 변경 핸들러 (스프레드시트 세로 붙여넣기 등)
  const handleBatchRawValueChange = useCallback((newValues: Record<string, number>) => {
    setRawDistrictValues(prev => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  // 기본값 초기화
  const handleReset = useCallback(() => {
    setRawDistrictValues({ ...INITIAL_RAW_DISTRICT_VALUES });
    setSelectedDistrict(null);
  }, []);

  // 랜덤 데이터 채우기 (자유로운 실제 데이터 스케일: 100,000 ~ 700,000)
  const handleRandomize = useCallback(() => {
    const nextValues: Record<string, number> = {};
    districtNames.forEach(name => {
      nextValues[name] = Math.floor(Math.random() * 600 + 100) * 1000;
    });
    setRawDistrictValues(nextValues);
  }, [districtNames]);

  return (
    <div className="w-screen h-screen flex flex-col md:flex-row overflow-hidden bg-white text-slate-900">
      {/* 1. 왼쪽 1/3 영역: 3열 스마트 스프레드시트 데이터 입력 패널 */}
      <div className="w-full md:w-1/3 h-1/2 md:h-full flex-shrink-0 z-10 shadow-lg md:shadow-none border-r border-slate-200">
        <DistrictTable
          districts={districtNames}
          rawValues={rawDistrictValues}
          normalizedValues={normalized}
          minRaw={minRaw}
          maxRaw={maxRaw}
          onRawValueChange={handleRawValueChange}
          onBatchRawValueChange={handleBatchRawValueChange}
          onReset={handleReset}
          onRandomize={handleRandomize}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
        />
      </div>

      {/* 2. 오른쪽 2/3 영역: 3D 지도 시각화 뷰포트 (0~100 높이 반영 & 실제 data값 라벨) */}
      <div className="w-full md:w-2/3 h-1/2 md:h-full flex-1 relative">
        <Map3DCanvas
          districts={parsedDistricts}
          rawValues={rawDistrictValues}
          normalizedValues={normalized}
          minRaw={minRaw}
          maxRaw={maxRaw}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
        />
      </div>
    </div>
  );
}

export default App;
