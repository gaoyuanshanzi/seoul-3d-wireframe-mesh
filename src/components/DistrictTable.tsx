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
  HelpCircle
} from 'lucide-react';
import { getDistrictColor } from '../utils/geoUtils';

interface DistrictTableProps {
  districts: string[];
  districtValues: Record<string, number>;
  onValueChange: (district: string, value: number) => void;
  onBatchValueChange: (newValues: Record<string, number>) => void;
  onReset: () => void;
  onRandomize: () => void;
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
}

export const DistrictTable: React.FC<DistrictTableProps> = ({
  districts,
  districtValues,
  onValueChange,
  onBatchValueChange,
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

  // 클립보드 세로 텍스트 파싱 및 일괄 업데이트 핵심 로직
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
      // 구 이름 매칭 방식
      lines.forEach(line => {
        const parts = line.split(/[\t, ]+/).filter(Boolean);
        for (const district of districts) {
          if (line.includes(district)) {
            // 숫자인 부분 찾기
            const numPart = parts.find(p => !isNaN(Number(p)) && p !== district);
            if (numPart !== undefined) {
              const val = Math.max(0, Math.min(100, Math.round(Number(numPart))));
              updated[district] = val;
              appliedCount++;
              break;
            }
          }
        }
      });
    } else {
      // 순수 세로 숫자 열 방식 (엑셀 등에서 세로 25개 셀 복사 시)
      lines.forEach((line, idx) => {
        const targetRow = startRow + idx;
        if (targetRow < filteredDistricts.length) {
          const districtName = filteredDistricts[targetRow];
          // 숫자 추출 (쉼표나 공백 등 정리)
          const cleanNum = line.replace(/[^0-9.-]/g, '');
          if (cleanNum && !isNaN(Number(cleanNum))) {
            const val = Math.max(0, Math.min(100, Math.round(Number(cleanNum))));
            updated[districtName] = val;
            appliedCount++;
          }
        }
      });
    }

    if (appliedCount > 0) {
      onBatchValueChange(updated);
      showToast(`총 ${appliedCount}개 구 데이터가 성공적으로 반영되었습니다!`);
    } else {
      showToast('유효한 숫자 데이터를 찾지 못했습니다.');
    }
  };

  // 테이블 내 셀에서 직접 Ctrl+V 붙여넣기 이벤트 처리
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

  // 샘플 데이터 복사 테스트용
  const handleCopySampleData = () => {
    const sample = filteredDistricts.map((_, i) => Math.floor(30 + Math.sin(i) * 35 + 20)).join('\n');
    navigator.clipboard.writeText(sample);
    showToast('샘플 25개 세로 데이터가 클립보드에 복사되었습니다! Ctrl+V로 붙여넣어 보세요.');
  };

  // 키보드 네비게이션 (Enter, 방향키 위/아래)
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
                  Spreadsheet Grid
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                엑셀이나 외부에서 복사한 세로 데이터를 바로 붙여넣기(Ctrl+V)할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 통계 요약 뱃지 */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">평균 수치</span>
            <div className="text-base font-extrabold text-slate-800">{avgValue}</div>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-2 text-center">
            <span className="text-[10px] font-semibold text-emerald-600 uppercase">최고 수치</span>
            <div className="text-base font-extrabold text-emerald-700">{maxValue}</div>
          </div>
          <div className="bg-rose-50/60 border border-rose-200/80 rounded-lg p-2 text-center">
            <span className="text-[10px] font-semibold text-rose-600 uppercase">최저 수치</span>
            <div className="text-base font-extrabold text-rose-700">{minValue}</div>
          </div>
        </div>

        {/* 엑셀 스타일 스프레드시트 툴바 */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          {/* 붙여넣기 마법사 버튼 */}
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-md shadow-sm transition-all cursor-pointer"
            title="외부 엑셀/스프레드시트 세로 데이터를 한번에 붙여넣기"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            외부 데이터 일괄 붙여넣기
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
            title="테스트용 25개 수치를 클립보드에 복사"
          >
            <HelpCircle className="w-3 h-3 text-slate-400" />
            샘플데이터 복사
          </button>
        </div>

        {/* 검색 및 정렬 바 */}
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
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition-colors cursor-pointer"
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

      {/* 2. 스프레드시트 수식/정보 입력 표시줄 (Formula Bar) */}
      <div className="flex items-center px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-mono">
        <span className="w-10 text-slate-400 font-bold">
          {focusedIndex !== null ? `B${focusedIndex + 1}` : 'CELL'}
        </span>
        <span className="text-slate-300 mx-2">|</span>
        <span className="text-slate-500 text-[11px] truncate">
          {focusedIndex !== null && filteredDistricts[focusedIndex]
            ? `${filteredDistricts[focusedIndex]} = ${districtValues[filteredDistricts[focusedIndex]] ?? 0}`
            : '💡 임의의 셀을 클릭하고 Ctrl+V를 누르면 25개 세로 데이터가 차례대로 붙여넣어집니다.'}
        </span>
      </div>

      {/* 3. 스프레드시트 격자(Grid) 테이블 */}
      <div className="flex-1 overflow-y-auto bg-slate-100/60 p-2">
        <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
          <table className="w-full border-collapse text-left table-fixed">
            {/* 스프레드시트 열 헤더 (Column Header) */}
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 select-none text-[11px] font-bold text-slate-600">
                <th className="w-12 py-1.5 text-center border-r border-slate-300 text-slate-400 bg-slate-200/50">
                  #
                </th>
                <th className="w-1/2 py-1.5 px-3 border-r border-slate-300">
                  A : 자치구 이름
                </th>
                <th className="w-1/2 py-1.5 px-3">
                  B : 수치 (Data, 0~100)
                </th>
              </tr>
            </thead>

            {/* 스프레드시트 행 격자 (Rows) */}
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredDistricts.map((name, idx) => {
                const val = districtValues[name] ?? 0;
                const color = getDistrictColor(val);
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
                    {/* 행 번호 셀 (Row Header: 1, 2, 3...) */}
                    <td className="py-1 text-center font-mono text-[11px] font-semibold text-slate-400 bg-slate-100/70 border-r border-slate-300 select-none">
                      {idx + 1}
                    </td>

                    {/* A열: 구 이름 셀 */}
                    <td className="py-1 px-3 border-r border-slate-300 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0 shadow-xs border border-black/10"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-slate-800 tracking-tight">
                          {name}
                        </span>
                      </div>
                    </td>

                    {/* B열: 수치 입력 스프레드시트 셀 (Input with Paste handler) */}
                    <td 
                      className="p-0 relative"
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
                          min="0"
                          max="100"
                          value={val}
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
                            const num = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            onValueChange(name, num);
                          }}
                          className="w-full h-8 px-3 font-mono font-bold text-slate-900 bg-transparent text-right outline-none cursor-text"
                          title="Ctrl+V를 누르면 여기서부터 아래로 세로 데이터가 채워집니다"
                        />
                        <span className="text-[10px] text-slate-400 font-mono ml-1">
                          pt
                        </span>

                        {/* 엑셀 셀 우측 하단 채우기 핸들 포인트 데코 */}
                        {isFocused && (
                          <div className="absolute right-0 bottom-0 w-1.5 h-1.5 bg-emerald-600 pointer-events-none" />
                        )}
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
        <div className="flex items-center gap-3">
          <span>준비됨 • 총 25개 구</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-medium">
            💡 단축키: Enter/↓(다음 행), ↑(이전 행), Ctrl+V(세로 데이터 붙여넣기)
          </span>
        </div>
      </div>

      {/* 4. 외부 데이터 일괄 붙여넣기 팝업 모달 */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  외부 스프레드시트 세로 데이터 붙여넣기
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
                엑셀, 구글 스프레드시트, 또는 메모장에서 <strong>세로 25개 숫자(또는 구 이름과 숫자)</strong>를 복사한 후 아래 창에 <code>Ctrl+V</code>로 붙여넣으세요.
              </p>

              <textarea
                rows={8}
                value={pasteInputText}
                onChange={e => setPasteInputText(e.target.value)}
                placeholder={`예시 1 (순수 세로 숫자 열):\n85\n70\n92\n45\n...\n\n예시 2 (구 이름과 숫자):\n강남구\t95\n강동구\t60\n...`}
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
                    25개 구 데이터 적용
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
