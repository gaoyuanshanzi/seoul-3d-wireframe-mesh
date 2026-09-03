import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
      showToast(`총 ${appliedCount}개 구 데이터 반영 완료!`);
    } else {
      showToast('유효한 숫자 데이터를 찾지 못했습니다.');
    }
  };

  const handleCellPaste = (e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    parseAndApplyPasteData(pastedData, rowIndex);
  };

  const handleModalApply = () => {
    parseAndApplyPasteData(pasteInputText, 0);
    setIsPasteModalOpen(false);
    setPasteInputText('');
  };

  const handleCopySampleData = () => {
    const sample = [
      '534000', '462000', '296000', '568000', '487000',
      '337000', '395000', '230000', '503000', '312000',
      '342000', '382000', '365000', '306000', '408000',
      '281000', '430000', '658000', '442000', '376000',
      '218000', '468000', '141000', '121000', '385000'
    ].join('\n');
    navigator.clipboard.writeText(sample);
    showToast('샘플 데이터가 복사되었습니다. B열에서 Ctrl+V를 눌러보세요.');
  };

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
    <div className="h-full flex flex-col bg-white select-none">
      {/* 1. 상단 앱 타이틀 & 상태 바 */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight truncate">서울시 25개 구 데이터</h1>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 flex-shrink-0">
                  Sheet
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                B열 입력 시 C열(0~100) 자동 계산
              </p>
            </div>
          </div>
        </div>

        {/* 통계 요약 뱃지 */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center">
            <span className="text-[9px] font-semibold text-slate-400 uppercase block">평균</span>
            <div className="text-xs font-extrabold text-slate-800 font-mono truncate" title={avgRaw.toLocaleString()}>
              {avgRaw.toLocaleString()}
            </div>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-1.5 text-center">
            <span className="text-[9px] font-semibold text-emerald-600 uppercase block">최대 (100)</span>
            <div className="text-xs font-extrabold text-emerald-700 font-mono truncate" title={maxRaw.toLocaleString()}>
              {maxRaw.toLocaleString()}
            </div>
          </div>
          <div className="bg-rose-50/60 border border-rose-200/80 rounded-lg p-1.5 text-center">
            <span className="text-[9px] font-semibold text-rose-600 uppercase block">최소 (0)</span>
            <div className="text-xs font-extrabold text-rose-700 font-mono truncate" title={minRaw.toLocaleString()}>
              {minRaw.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 액션 툴바 */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-xs transition-all cursor-pointer"
            title="외부 세로 데이터 일괄 붙여넣기"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            붙여넣기
          </button>

          <button
            onClick={onRandomize}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer border border-slate-200"
          >
            <Shuffle className="w-3 h-3 text-slate-500" />
            랜덤
          </button>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer border border-slate-200"
          >
            <RefreshCw className="w-3 h-3 text-slate-500" />
            초기화
          </button>

          <button
            onClick={handleCopySampleData}
            className="inline-flex items-center gap-1 px-1.5 py-1 text-[10px] font-medium text-slate-400 hover:text-slate-700 rounded transition-colors ml-auto cursor-pointer"
            title="샘플 25개 데이터 복사"
          >
            <HelpCircle className="w-3 h-3 text-slate-400" />
            샘플복사
          </button>
        </div>

        {/* 검색 및 정렬 필터 */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <div className="relative flex-1">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="구 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => {
              if (sortMode === 'default') setSortMode('value-desc');
              else if (sortMode === 'value-desc') setSortMode('value-asc');
              else setSortMode('default');
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0"
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>
              {sortMode === 'default' && '가나다'}
              {sortMode === 'value-desc' && '높은순'}
              {sortMode === 'value-asc' && '낮은순'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. 수식 표시줄 */}
      <div className="flex items-center px-3 py-1 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-mono">
        <span className="w-7 text-emerald-700 font-bold flex-shrink-0">
          {focusedIndex !== null ? `B${focusedIndex + 1}` : 'fx'}
        </span>
        <span className="text-slate-300 mx-1.5">|</span>
        <span className="text-slate-500 text-[10px] truncate">
          {focusedIndex !== null && filteredDistricts[focusedIndex] ? (
            `${filteredDistricts[focusedIndex]} = ${rawValues[filteredDistricts[focusedIndex]]?.toLocaleString()} (C: ${normalizedValues[filteredDistricts[focusedIndex]]})`
          ) : (
            'B열 클릭 후 Ctrl+V로 붙여넣기'
          )}
        </span>
      </div>

      {/* 3. 3열 스프레드시트 격자 테이블 */}
      <div className="flex-1 overflow-y-auto bg-slate-100/60 p-1.5">
        <div className="bg-white border border-slate-300 rounded shadow-xs overflow-hidden">
          <table className="w-full border-collapse text-left table-fixed">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 select-none text-[10px] font-bold text-slate-600">
                <th className="w-7 py-1 text-center border-r border-slate-300 text-slate-400 bg-slate-200/50">
                  #
                </th>
                <th className="w-22 py-1 px-2 border-r border-slate-300">
                  A : 자치구
                </th>
                <th className="py-1 px-2 border-r border-slate-300 bg-emerald-50/40 text-emerald-900">
                  B : 실제데이터
                </th>
                <th className="w-24 py-1 px-1.5 text-slate-700 bg-sky-50/40">
                  <div className="flex items-center gap-1">
                    <Calculator className="w-2.5 h-2.5 text-sky-600" />
                    <span>C : 0~100</span>
                  </div>
                </th>
              </tr>
            </thead>

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
                    {/* 행 번호 */}
                    <td className="py-1 text-center font-mono text-[10px] font-semibold text-slate-400 bg-slate-100/70 border-r border-slate-300 select-none">
                      {idx + 1}
                    </td>

                    {/* A열: 구 이름 */}
                    <td className="py-1 px-2 border-r border-slate-300 cursor-pointer">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-xs flex-shrink-0 border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-slate-800 tracking-tight text-[11px] truncate">
                          {name}
                        </span>
                      </div>
                    </td>

                    {/* B열: 실제 데이터 입력 */}
                    <td 
                      className="p-0 relative border-r border-slate-300"
                      onClick={e => e.stopPropagation()}
                    >
                      <div
                        className={`w-full h-full flex items-center pr-1.5 relative transition-all ${
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
                          className="w-full h-7 px-1.5 font-mono font-bold text-slate-900 bg-transparent text-right outline-none cursor-text text-xs"
                          placeholder="수치"
                          title="실제 데이터를 입력하거나 Ctrl+V로 붙여넣으세요"
                        />
                        {isFocused && (
                          <div className="absolute right-0 bottom-0 w-1 h-1 bg-emerald-600 pointer-events-none" />
                        )}
                      </div>
                    </td>

                    {/* C열: 정규화 0~100 */}
                    <td className="py-1 px-1.5 bg-slate-50/50">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(0, Math.min(100, normVal))}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <span 
                          className="font-mono font-bold text-[10px] w-7 text-right flex-shrink-0"
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

      {/* 푸터 상태줄 */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
        <span>25개 구 • 준비됨</span>
        <span className="text-emerald-700 font-medium">B열 Ctrl+V 지원</span>
      </div>

      {/* 4. 외부 데이터 일괄 붙여넣기 팝업 모달 (React Portal로 document.body 최상단 레이어에 렌더링) */}
      {isPasteModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          style={{ zIndex: 99999 }}
          onClick={() => setIsPasteModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    외부 데이터 일괄 붙여넣기 (B열 매핑)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    엑셀 등에서 복사한 세로 데이터를 한번에 입력합니다.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-slate-600 mb-2.5 leading-relaxed">
                엑셀이나 메모장에서 <strong>25개 세로 데이터</strong>(인구, 수치 등)를 복사한 후 아래 텍스트 상자에 <code>Ctrl+V</code>로 붙여넣으세요.
              </p>

              <textarea
                rows={8}
                value={pasteInputText}
                onChange={e => setPasteInputText(e.target.value)}
                placeholder={`예시 1 (순수 세로 숫자 열):\n534000\n462000\n296000\n...\n\n예시 2 (구 이름과 함께 복사된 경우):\n강남구\t534000\n강동구\t462000\n...`}
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder:text-slate-400 resize-none shadow-inner"
                autoFocus
              />

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setPasteInputText(text);
                      showToast('클립보드 내용을 성공적으로 가져왔습니다.');
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
                    데이터 적용하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. 토스트 메시지 (React Portal로 document.body 최상단에 렌더링) */}
      {toastMessage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed bottom-6 left-6 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ zIndex: 99999 }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>,
        document.body
      )}
    </div>
  );
};
