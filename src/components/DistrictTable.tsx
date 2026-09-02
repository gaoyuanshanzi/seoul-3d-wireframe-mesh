import React, { useState, useRef } from 'react';
import { 
  RefreshCw, 
  Shuffle, 
  Search, 
  ArrowUpDown, 
  ClipboardPaste, 
  CheckCircle2, 
  X,
  FileSpreadsheet,
  HelpCircle,
  Calculator
} from 'lucide-react';
import { getDistrictColor } from '../utils/geoUtils';

interface DistrictTableProps {
  districts: string[];
  rawValues: Record<string, number>;
  normalizedValues: Record<string, number>;
  minRaw: number;
  maxRaw: number;
  onRawValueChange: (district: string, value: number) => void;
  onBatchRawValueChange: (newValues: Record<string, number>) => void;
  onReset: () => void;
  onRandomize: () => void;
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
}

export const DistrictTable: React.FC<DistrictTableProps> = ({
  districts,
  rawValues,
  normalizedValues,
  minRaw,
  maxRaw,
  onRawValueChange,
  onBatchRawValueChange,
  onReset,
  onRandomize,
  selectedDistrict,
  onSelectDistrict,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'default' | 'value-desc' | 'value-asc'>('default');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  
  // 붙여넣기 모달 상태
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteInputText, setPasteInputText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Input refs for keyboard navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 통계 계산
  const rawList = Object.values(rawValues);
  const avgRaw = rawList.length > 0 
    ? Math.round(rawList.reduce((a, b) => a + b, 0) / rawList.length) 
    : 0;

  // 정렬 및 검색 필터링
  const filteredDistricts = [...districts]
    .filter(name => name.includes(searchQuery.trim()))
    .sort((a, b) => {
      if (sortMode === 'value-desc') return (rawValues[b] ?? 0) - (rawValues[a] ?? 0);
      if (sortMode === 'value-asc') return (rawValues[a] ?? 0) - (rawValues[b] ?? 0);
      return a.localeCompare(b, 'ko');
    });

  // 클립보드 세로 텍스트 파싱 및 B열(Raw Data) 일괄 업데이트 로직
  const parseAndApplyPasteData = (rawText: string, startRow = 0) => {
    if (!rawText.trim()) return;

    const lines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return;

    const updated: Record<string, number> = {};
    let appliedCount = 0;

    // 1. "구이름\t값" 또는 "구이름,값" 형태인지 확인
    const hasDistrictNames = lines.some(line => {
      return districts.some(d => line.includes(d));
    });

    if (hasDistrictNames) {
      lines.forEach(line => {
        const parts = line.split(/[\t, ]+/).filter(Boolean);
        for (const district of districts) {
          if (line.includes(district)) {
            const numPart = parts.find(p => !isNaN(Number(p.replace(/,/g, ''))) && p !== district);
            if (numPart !== undefined) {
              const val = Number(numPart.replace(/,/g, ''));
              updated[district] = val;
              appliedCount++;
              break;
            }
          }
        }
      });
    } else {
      // 순수 세로 숫자 열 방식
      lines.forEach((line, idx) => {
        const targetRow = startRow + idx;
        if (targetRow < filteredDistricts.length) {
          const districtName = filteredDistricts[targetRow];
          const cleanNum = line.replace(/,/g, '').trim();
          if (cleanNum && !isNaN(Number(cleanNum))) {
            const val = Number(cleanNum);
            updated[districtName] = val;
            appliedCount++;
          }
        }
      });
    }

    if (appliedCount > 0) {
      onBatchRawValueChange(updated);
      showToast(`총 ${appliedCount}개 구의 실제 데이터가 반영되어 0~100 스케일이 재계산되었습니다!`);
    } else {
      showToast('유효한 숫자 데이터를 찾지 못했습니다.');
    }
  };

  // 테이블 내 B열 셀에서 직접 Ctrl+V 붙여넣기 이벤트 처리
  const handleCellPaste = (e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    parseAndApplyPasteData(pastedData, rowIndex);
  };

  // 모달을 통한 텍스트 붙여넣기 적용
  const handleModalApply = () => {
    parseAndApplyPasteData(pasteInputText, 0);
    setIsPasteModalOpen(false);
    setPasteInputText('');
  };

  // 샘플 데이터 복사 테스트용 (자유로운 큰 수치 예시)
  const handleCopySampleData = () => {
    const sample = [
      '534000', '462000', '296000', '568000', '487000',
      '337000', '395000', '230000', '503000', '312000',
      '342000', '382000', '365000', '306000', '408000',
      '281000', '430000', '658000', '442000', '376000',
      '218000', '468000', '141000', '121000', '385000'
    ].join('\n');
    navigator.clipboard.writeText(sample);
    showToast('샘플 25개 실제 데이터가 클립보드에 복사되었습니다! B열에서 Ctrl+V를 눌러보세요.');
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (index + 1 < filteredDistricts.length) {
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index - 1 >= 0) {
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.select();
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 select-none">
      {/* 1. 상단 앱 타이틀 & 상태 바 */}
      <div className="p-5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">서울시 25개 구 데이터 시트</h1>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  3열 스마트 정규화
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                B열에 자유로운 실제 데이터를 넣으면 C열에 0~100 스케일로 자동 계산됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 통계 요약 뱃지 */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">실제 평균값</span>
            <div className="text-sm font-extrabold text-slate-800 font-mono truncate" title={avgRaw.toLocaleString()}>
              {avgRaw.toLocaleString()}
            </div>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase">최댓값 (100)</span>
            </div>
            <div className="text-sm font-extrabold text-emerald-700 font-mono truncate" title={maxRaw.toLocaleString()}>
              {maxRaw.toLocaleString()}
            </div>
          </div>
          <div className="bg-rose-50/60 border border-rose-200/80 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] font-semibold text-rose-600 uppercase">최솟값 (0)</span>
            </div>
            <div className="text-sm font-extrabold text-rose-700 font-mono truncate" title={minRaw.toLocaleString()}>
              {minRaw.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 스프레드시트 액션 툴바 */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-md shadow-sm transition-all cursor-pointer"
            title="외부 엑셀/스프레드시트 세로 데이터를 한번에 붙여넣기"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            외부 데이터 붙여넣기
          </button>

          <button
            onClick={onRandomize}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer border border-slate-200"
          >
            <Shuffle className="w-3.5 h-3.5 text-slate-500" />
            랜덤 채우기
          </button>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            초기화
          </button>

          <button
            onClick={handleCopySampleData}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors ml-auto cursor-pointer"
            title="테스트용 25개 실제 데이터(인구수) 복사"
          >
            <HelpCircle className="w-3 h-3 text-slate-400" />
            샘플데이터 복사
          </button>
        </div>

        {/* 검색 및 정렬 필터 */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="구 이름 필터..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => {
              if (sortMode === 'default') setSortMode('value-desc');
              else if (sortMode === 'value-desc') setSortMode('value-asc');
              else setSortMode('default');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>
              {sortMode === 'default' && '가나다순'}
              {sortMode === 'value-desc' && '수치 높은순'}
              {sortMode === 'value-asc' && '수치 낮은순'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. 스프레드시트 수식 표시줄 (Formula Bar) */}
      <div className="flex items-center px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-mono">
        <span className="w-10 text-emerald-700 font-bold">
          {focusedIndex !== null ? `B${focusedIndex + 1}` : 'CELL'}
        </span>
        <span className="text-slate-300 mx-2">|</span>
        <span className="text-slate-500 text-[11px] truncate flex items-center gap-1.5">
          {focusedIndex !== null && filteredDistricts[focusedIndex] ? (
            <>
              <span className="font-semibold text-slate-800">{filteredDistricts[focusedIndex]}</span>
              <span>: 실제값 = {rawValues[filteredDistricts[focusedIndex]]?.toLocaleString()}</span>
              <span className="text-slate-400">➔</span>
              <span className="text-emerald-700 font-bold">
                정규화 높이 = {normalizedValues[filteredDistricts[focusedIndex]]} (0~100)
              </span>
            </>
          ) : (
            <span>💡 B열(실제 데이터)을 클릭하고 Ctrl+V를 누르면 세로 데이터가 붙여넣어집니다.</span>
          )}
        </span>
      </div>

      {/* 3. 3열 구조의 스프레드시트 격자 테이블 */}
      <div className="flex-1 overflow-y-auto bg-slate-100/60 p-2">
        <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-left table-fixed">
            {/* 스프레드시트 열 헤더 */}
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 select-none text-[11px] font-bold text-slate-600">
                <th className="w-10 py-1.5 text-center border-r border-slate-300 text-slate-400 bg-slate-200/50">
                  #
                </th>
                <th className="w-28 py-1.5 px-3 border-r border-slate-300">
                  A : 자치구 이름
                </th>
                <th className="py-1.5 px-3 border-r border-slate-300 bg-emerald-50/40 text-emerald-900">
                  B : 실제 데이터 (입력)
                </th>
                <th className="w-36 py-1.5 px-3 text-slate-700 bg-sky-50/40">
                  <div className="flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-sky-600" />
                    <span>C : 정규화 (0~100)</span>
                  </div>
                </th>
              </tr>
            </thead>

            {/* 스프레드시트 행 격자 */}
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredDistricts.map((name, idx) => {
                const rawVal = rawValues[name] ?? 0;
                const normVal = normalizedValues[name] ?? 0;
                const color = getDistrictColor(normVal);
                const isSelected = selectedDistrict === name;
                const isFocused = focusedIndex === idx;

                return (
                  <tr
                    key={name}
                    onClick={() => onSelectDistrict(isSelected ? null : name)}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/70'
                        : isFocused
                        ? 'bg-slate-50'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* 행 번호 셀 */}
                    <td className="py-1 text-center font-mono text-[11px] font-semibold text-slate-400 bg-slate-100/70 border-r border-slate-300 select-none">
                      {idx + 1}
                    </td>

                    {/* A열: 자치구 이름 셀 */}
                    <td className="py-1 px-3 border-r border-slate-300 cursor-pointer">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0 shadow-xs border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-slate-800 tracking-tight">
                          {name}
                        </span>
                      </div>
                    </td>

                    {/* B열: 새로 추가된 실제 데이터(Raw Data) 입력 셀 (자유 수치 입력 + Paste) */}
                    <td 
                      className="p-0 relative border-r border-slate-300"
                      onClick={e => e.stopPropagation()}
                    >
                      <div
                        className={`w-full h-full flex items-center pr-2 relative transition-all ${
                          isFocused ? 'ring-2 ring-emerald-600 ring-inset bg-emerald-50/30' : ''
                        }`}
                      >
                        <input
                          ref={el => { inputRefs.current[idx] = el; }}
                          type="number"
                          step="any"
                          value={rawVal}
                          onFocus={() => {
                            setFocusedIndex(idx);
                            onSelectDistrict(name);
                          }}
                          onBlur={() => {
                            if (focusedIndex === idx) setFocusedIndex(null);
                          }}
                          onPaste={e => handleCellPaste(e, idx)}
                          onKeyDown={e => handleKeyDown(e, idx)}
                          onChange={e => {
                            const num = Number(e.target.value) || 0;
                            onRawValueChange(name, num);
                          }}
                          className="w-full h-8 px-2.5 font-mono font-bold text-slate-900 bg-transparent text-right outline-none cursor-text text-xs"
                          placeholder="수치 입력"
                          title="자유롭게 실제 데이터를 입력하세요. Ctrl+V로 세로 붙여넣기도 가능합니다."
                        />
                        {isFocused && (
                          <div className="absolute right-0 bottom-0 w-1.5 h-1.5 bg-emerald-600 pointer-events-none" />
                        )}
                      </div>
                    </td>

                    {/* C열: 0~100 자동 비율 조정 (Normalized) 결과 셀 (읽기 전용) */}
                    <td className="py-1 px-2.5 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        {/* 미니 프로그레스 바 */}
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(0, Math.min(100, normVal))}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        {/* 0~100 수치 표시 */}
                        <span 
                          className="font-mono font-bold text-[11px] w-9 text-right"
                          style={{ color }}
                        >
                          {normVal}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 스프레드시트 상태표시줄 */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span>준비됨 • 25개 구</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-medium">
            💡 B열에 실제값을 넣으면 C열(0~100)로 자동 변환되어 3D 등고선 높이에 반영됩니다.
          </span>
        </div>
      </div>

      {/* 4. 외부 데이터 붙여넣기 모달 */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  외부 실제 데이터 붙여넣기 (B열 자동 매핑)
                </h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                엑셀이나 외부에서 복사한 <strong>실제 데이터(인구, 예산, 면적 등)</strong>를 붙여넣으세요. 최대값은 100, 최소값은 0으로 자동 비율 조정됩니다.
              </p>

              <textarea
                rows={8}
                value={pasteInputText}
                onChange={e => setPasteInputText(e.target.value)}
                placeholder={`예시 (세로 숫자 열):\n534000\n462000\n296000\n...\n\n또는 구 이름과 함께:\n강남구\t534000\n강동구\t462000\n...`}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                autoFocus
              />

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setPasteInputText(text);
                      showToast('클립보드 내용을 가져왔습니다.');
                    } catch {
                      showToast('직접 상자 안에 Ctrl+V로 붙여넣어 주세요.');
                    }
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  클립보드에서 자동 불러오기
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPasteModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleModalApply}
                    disabled={!pasteInputText.trim()}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow transition-all cursor-pointer disabled:opacity-40"
                  >
                    데이터 적용 & 0~100 자동 계산
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 성공 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
