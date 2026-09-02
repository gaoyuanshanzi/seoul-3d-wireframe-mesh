import { useState } from 'react';
import { RefreshCw, Shuffle, Search, BarChart3, ArrowUpDown } from 'lucide-react';
import { getDistrictColor } from '../utils/geoUtils';

interface DistrictTableProps {
  districts: string[];
  districtValues: Record<string, number>;
  onValueChange: (district: string, value: number) => void;
  onReset: () => void;
  onRandomize: () => void;
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
}

export const DistrictTable: React.FC<DistrictTableProps> = ({
  districts,
  districtValues,
  onValueChange,
  onReset,
  onRandomize,
  selectedDistrict,
  onSelectDistrict,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'default' | 'value-desc' | 'value-asc'>('default');

  // 통계 계산
  const values = Object.values(districtValues);
  const avgValue = Math.round(values.reduce((a, b) => a + b, 0) / (values.length || 1));
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  // 정렬 및 검색 필터링
  const filteredDistricts = [...districts]
    .filter(name => name.includes(searchQuery.trim()))
    .sort((a, b) => {
      if (sortMode === 'value-desc') return (districtValues[b] ?? 0) - (districtValues[a] ?? 0);
      if (sortMode === 'value-asc') return (districtValues[a] ?? 0) - (districtValues[b] ?? 0);
      return a.localeCompare(b, 'ko');
    });

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      {/* 헤더 & 앱 타이틀 */}
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">서울시 25개 구 3D 시각화</h1>
              <p className="text-xs text-slate-500 font-medium">실제 행정구역 GeoJSON 경계 기반 3D 등고선 와이어프레임</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            25개 자치구
          </span>
        </div>

        {/* 요약 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">평균 수치</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{avgValue}</div>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">최고 수치</div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{maxValue}</div>
          </div>
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3">
            <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">최저 수치</div>
            <div className="text-xl font-black text-rose-700 mt-0.5">{minValue}</div>
          </div>
        </div>

        {/* 액션 버튼 툴바 */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={onRandomize}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            랜덤 데이터 채우기
          </button>
          <button
            onClick={onReset}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            기본값 초기화
          </button>
        </div>

        {/* 검색 및 정렬 필터 */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="구 이름 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>
          <button
            onClick={() => {
              if (sortMode === 'default') setSortMode('value-desc');
              else if (sortMode === 'value-desc') setSortMode('value-asc');
              else setSortMode('default');
            }}
            title="정렬 모드 변경"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {sortMode === 'default' && '가나다순'}
              {sortMode === 'value-desc' && '높은순'}
              {sortMode === 'value-asc' && '낮은순'}
            </span>
          </button>
        </div>
      </div>

      {/* 2열 구조의 스크롤 가능한 테이블 */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200 shadow-sm">
            <tr>
              <th className="py-2.5 px-4 text-xs font-semibold text-slate-600 tracking-wider w-1/2">
                1. 서울시 자치구
              </th>
              <th className="py-2.5 px-4 text-xs font-semibold text-slate-600 tracking-wider w-1/2">
                2. 수치 (Z축 높이)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDistricts.map((name, idx) => {
              const val = districtValues[name] ?? 0;
              const color = getDistrictColor(val);
              const isSelected = selectedDistrict === name;

              return (
                <tr
                  key={name}
                  onClick={() => onSelectDistrict(isSelected ? null : name)}
                  className={`group transition-colors cursor-pointer ${
                    isSelected ? 'bg-sky-50/70 ring-1 ring-inset ring-sky-300' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* 1번째 칼럼: 서울시 25개 구 이름 */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm transition-transform group-hover:scale-125"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">
                          {name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          #{idx + 1}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2번째 칼럼: 사용자가 구별 수치(Data)를 직접 입력/수정할 수 있는 Input 필드 */}
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={val}
                          onChange={e => {
                            const num = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            onValueChange(name, num);
                          }}
                          className="w-full text-right font-mono font-bold text-sm px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 transition-all shadow-sm"
                        />
                      </div>
                      {/* 미니 슬라이더 */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={val}
                        onChange={e => onValueChange(name, Number(e.target.value))}
                        className="w-20 accent-sky-500 cursor-pointer"
                        title={`수치: ${val}`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 푸터 안내 */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400">
        값을 변경하면 오른쪽 3D 지형의 Z축 높이가 실시간으로 업데이트됩니다.
      </div>
    </div>
  );
};
