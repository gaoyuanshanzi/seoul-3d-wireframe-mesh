import { useState, useMemo, useCallback } from 'react';
import type { SeoulGeoJson } from './types';
import seoulDistrictsJson from './data/seoul_districts.json';
import { parseSeoulGeoJson, INITIAL_DISTRICT_VALUES } from './utils/geoUtils';
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

  // 구별 수치 데이터 상태 (0 ~ 100)
  const [districtValues, setDistrictValues] = useState<Record<string, number>>(() => {
    return { ...INITIAL_DISTRICT_VALUES };
  });

  // 현재 선택/포커스된 구
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  // 개별 수치 변경 핸들러
  const handleValueChange = useCallback((district: string, value: number) => {
    setDistrictValues(prev => ({
      ...prev,
      [district]: value,
    }));
  }, []);

  // 다중/일괄 수치 변경 핸들러 (스프레드시트 세로 붙여넣기 등)
  const handleBatchValueChange = useCallback((newValues: Record<string, number>) => {
    setDistrictValues(prev => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  // 기본값 초기화
  const handleReset = useCallback(() => {
    setDistrictValues({ ...INITIAL_DISTRICT_VALUES });
    setSelectedDistrict(null);
  }, []);

  // 랜덤 데이터 채우기 (20 ~ 95 범위의 랜덤 정수)
  const handleRandomize = useCallback(() => {
    const nextValues: Record<string, number> = {};
    districtNames.forEach(name => {
      nextValues[name] = Math.floor(Math.random() * 76) + 20;
    });
    setDistrictValues(nextValues);
  }, [districtNames]);

  return (
    <div className="w-screen h-screen flex flex-col md:flex-row overflow-hidden bg-white text-slate-900">
      {/* 1. 왼쪽 50% 영역: 스프레드시트 격자형 데이터 입력 패널 */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full flex-shrink-0 z-10 shadow-lg md:shadow-none">
        <DistrictTable
          districts={districtNames}
          districtValues={districtValues}
          onValueChange={handleValueChange}
          onBatchValueChange={handleBatchValueChange}
          onReset={handleReset}
          onRandomize={handleRandomize}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
        />
      </div>

      {/* 2. 오른쪽 50% 영역: 3D 지도 시각화 뷰포트 & Export */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full flex-1 relative">
        <Map3DCanvas
          districts={parsedDistricts}
          districtValues={districtValues}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
        />
      </div>
    </div>
  );
}

export default App;
