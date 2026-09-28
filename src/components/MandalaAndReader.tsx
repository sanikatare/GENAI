import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  LayoutList,
  LayoutGrid,
  RotateCcw,
} from 'lucide-react';
import { AppRoute, MandalaDetail, MandalaSummary, HymnDetail } from '../types';
import { CornerOrnament } from './VedicOrnaments';

export function MandalaDetailPage({
  mandalaNum,
  navigate,
}: {
  mandalaNum: number;
  mandalas: MandalaSummary[];
  navigate: (r: AppRoute) => void;
}) {
  const [detail, setDetail] = useState<MandalaDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeity, setSelectedDeity] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSelectedDeity('ALL');
    setSearchQuery('');

    fetch(`/api/mandalas/${mandalaNum}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load Mandala ${mandalaNum}`);
        return res.json();
      })
      .then((data: MandalaDetail) => {
        if (active) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to load Mandala data.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mandalaNum]);

  const deityFilters = useMemo(() => {
    if (!detail?.hymns) return [];
    const counts = new Map<string, number>();
    for (const h of detail.hymns) {
      const clean = (h.deity || 'Various').replace(/\.$/, '').trim();
      counts.set(clean, (counts.get(clean) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [detail]);

  const filteredHymns = useMemo(() => {
    if (!detail?.hymns) return [];
    return detail.hymns.filter((h) => {
      if (selectedDeity !== 'ALL') {
        const clean = (h.deity || 'Various').replace(/\.$/, '').trim();
        if (clean.toLowerCase() !== selectedDeity.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${h.sukta} ${h.mandala}.${h.sukta} ${h.title} ${h.deity} ${h.anukramani} ${h.first_verse_sanskrit} ${h.first_verse_english}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [detail, selectedDeity, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Simple Top Bar: Breadcrumb + Mandala Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFDF9] p-3.5 rounded-xl border border-[#DECBA8] shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs text-[#6E5648]">
          <button
            type="button"
            onClick={() => navigate({ page: 'home' })}
            className="hover:text-[#5B1612] font-medium transition-colors cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#B6862C]" />
          <button
            type="button"
            onClick={() => navigate({ page: 'explorer' })}
            className="hover:text-[#5B1612] font-medium transition-colors cursor-pointer"
          >
            Mandalas
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#B6862C]" />
          <span className="font-bold text-[#430F0C]">Mandala {mandalaNum}</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Select Mandala"
            value={mandalaNum}
            onChange={(e) => navigate({ page: 'mandala', mandala: Number(e.target.value) })}
            className="px-2.5 py-1.5 rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-xs font-semibold text-[#430F0C] cursor-pointer"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Mandala {m}
              </option>
            ))}
          </select>

          {mandalaNum > 1 && (
            <button
              type="button"
              onClick={() => navigate({ page: 'mandala', mandala: mandalaNum - 1 })}
              className="px-2.5 py-1.5 rounded-lg bg-[#FBF7EE] hover:bg-[#5B1612] text-[#430F0C] hover:text-[#FFFDF9] border border-[#D3BC94] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
          )}
          {mandalaNum < 10 && (
            <button
              type="button"
              onClick={() => navigate({ page: 'mandala', mandala: mandalaNum + 1 })}
              className="px-2.5 py-1.5 rounded-lg bg-[#FBF7EE] hover:bg-[#5B1612] text-[#430F0C] hover:text-[#FFFDF9] border border-[#D3BC94] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Clean Mandala Header */}
      {detail && (
        <div className="rounded-xl bg-[#430F0C] text-[#FBF7EE] p-6 sm:p-7 border border-[#B6862C] shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#FFFDF9]">
                  Mandala {detail.mandala}
                </h1>
                <span className="font-sanskrit text-base text-[#E6B655]">
                  {detail.sanskrit_title}
                </span>
                <span className="text-xs text-[#D8C2A3] bg-[#FFFDF9]/10 px-2.5 py-0.5 rounded border border-[#E6B655]/30">
                  {detail.hymn_count} Hymns · {detail.verse_count.toLocaleString()} Verses
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#EADBC4] font-serif-prose leading-relaxed">
                {detail.summary}
              </p>

              <p className="text-xs text-[#D8C2A3]">
                <strong className="text-[#E6B655]">Seers:</strong> {detail.rishi_lineage}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    page: 'scholar',
                    initialQuestion: `What are the main themes and teachings in Mandala ${detail.mandala}?`,
                    initialTab: 'rag',
                  })
                }
                className="px-3.5 py-2.5 rounded-lg bg-[#FFFDF9]/10 hover:bg-[#FFFDF9]/20 text-[#FFFDF9] border border-[#E6B655]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E6B655]" />
                <span>Ask VedaWise</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    page: 'reader',
                    mandala: detail.mandala,
                    sukta: 1,
                  })
                }
                className="px-4 py-2.5 rounded-lg bg-[#C85A17] hover:bg-[#B24D10] text-[#FFFDF9] text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Read Hymn {detail.mandala}.1</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#DECBA8] p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C705F] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hymns by number, deity, or verse text..."
              aria-label="Search hymns in this Mandala"
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-[#231610] placeholder-[#8C7566] focus:outline-none focus:border-[#9A3412]"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs text-[#6E5648] font-medium">
              Showing <strong className="text-[#430F0C]">{filteredHymns.length}</strong> of{' '}
              {detail?.hymn_count || 0} hymns
            </span>
            <div className="inline-flex rounded-lg border border-[#D3BC94] bg-[#F4ECE1] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#5B1612] text-[#FFFDF9]' : 'text-[#5C493E]'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#5B1612] text-[#FFFDF9]' : 'text-[#5C493E]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {deityFilters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#EFE4CE]">
            <span className="text-[11px] font-semibold text-[#6E5648] mr-1">Deity:</span>
            <button
              type="button"
              onClick={() => setSelectedDeity('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                selectedDeity === 'ALL'
                  ? 'bg-[#5B1612] text-[#FFFDF9]'
                  : 'bg-[#F4ECE1] text-[#5C493E] hover:bg-[#E8D8BE]'
              }`}
            >
              All ({detail?.hymn_count})
            </button>
            {deityFilters.map(([deityName, count]) => (
              <button
                key={deityName}
                type="button"
                onClick={() => setSelectedDeity(selectedDeity === deityName ? 'ALL' : deityName)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedDeity === deityName
                    ? 'bg-[#C85A17] text-[#FFFDF9]'
                    : 'bg-[#FBF7EE] text-[#430F0C] border border-[#DECBA8] hover:bg-[#F4ECE1]'
                }`}
              >
                {deityName} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#FFFDF9] border border-[#DECBA8] p-5 space-y-2.5 animate-pulse"
            >
              <div className="h-4 w-48 bg-[#EFE4CE] rounded" />
              <div className="h-4 w-3/4 bg-[#F4ECE1] rounded" />
              <div className="h-3 w-2/3 bg-[#F4ECE1] rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-6 rounded-xl bg-[#FFF5F5] border border-red-300 text-red-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold">Unable to load Mandala {mandalaNum}</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'explorer' })}
            className="px-4 py-2 rounded-lg bg-[#5B1612] text-[#FFFDF9] text-xs font-semibold self-start sm:self-auto"
          >
            Back to Mandalas
          </button>
        </div>
      )}

      {/* Hymns List / Grid */}
      {!loading && !error && detail && (
        <>
          {filteredHymns.length === 0 ? (
            <div className="rounded-xl bg-[#FFFDF9] border border-[#DECBA8] p-10 text-center space-y-3">
              <p className="font-display text-lg font-bold text-[#430F0C]">
                No hymns match your current filter
              </p>
              <p className="text-xs text-[#6E5648]">
                Try clearing the search query or selecting “All” deities in Mandala {mandalaNum}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDeity('ALL');
                }}
                className="px-4 py-2 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2.5">
              {filteredHymns.map((h) => (
                <div
                  key={h.hymn_id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate({
                      page: 'reader',
                      mandala: h.mandala,
                      sukta: h.sukta,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate({
                        page: 'reader',
                        mandala: h.mandala,
                        sukta: h.sukta,
                      });
                    }
                  }}
                  className="group rounded-xl bg-[#FFFDF9] border border-[#DECBA8] hover:border-[#9A3412] hover:-translate-y-0.5 hover:shadow-sm p-4 transition-all duration-150 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-cinzel text-sm font-bold text-[#5B1612] bg-[#F4ECE1] px-2 py-0.5 rounded border border-[#DECBA8]">
                        {h.mandala}.{h.sukta}
                      </span>
                      <h3 className="font-display text-lg font-bold text-[#430F0C] group-hover:text-[#C85A17] transition-colors">
                        {h.title}
                      </h3>
                      <span className="text-xs text-[#6E5648]">
                        · {h.deity} · {h.verse_count} {h.verse_count === 1 ? 'verse' : 'verses'}
                      </span>
                    </div>

                    {h.first_verse_sanskrit && (
                      <p className="font-sanskrit text-sm text-[#430F0C] truncate">
                        {h.first_verse_sanskrit}
                      </p>
                    )}

                    {h.first_verse_english && (
                      <p className="text-xs text-[#5C493E] font-serif-prose line-clamp-1 italic">
                        {h.first_verse_english}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-[#5B1612] group-hover:text-[#C85A17] inline-flex items-center gap-1 shrink-0 transition-colors">
                    <span>Read Hymn</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredHymns.map((h) => (
                <button
                  key={h.hymn_id}
                  type="button"
                  onClick={() =>
                    navigate({
                      page: 'reader',
                      mandala: h.mandala,
                      sukta: h.sukta,
                    })
                  }
                  className="text-left p-3.5 rounded-xl bg-[#FFFDF9] border border-[#DECBA8] hover:border-[#9A3412] hover:bg-[#FBF7EE] hover:-translate-y-0.5 hover:shadow-2xs transition-all duration-150 flex flex-col justify-between gap-1.5 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-cinzel text-xs font-bold text-[#5B1612] group-hover:text-[#C85A17]">
                      {h.mandala}.{h.sukta}
                    </span>
                    <span className="text-[11px] text-[#6E5648] bg-[#F4ECE1] px-1.5 py-0.5 rounded">
                      {h.verse_count}v
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#231610] truncate">{h.deity}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function HymnReaderPage({
  mandalaNum,
  suktaNum,
  highlightVerse,
  mandalas,
  navigate,
}: {
  mandalaNum: number;
  suktaNum: number;
  highlightVerse?: number;
  mandalas: MandalaSummary[];
  navigate: (r: AppRoute) => void;
}) {
  const [hymn, setHymn] = useState<HymnDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [readerMode, setReaderMode] = useState<'bilingual' | 'sanskrit' | 'english'>('bilingual');
  const [showTranslit, setShowTranslit] = useState<boolean>(true);
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg'>('md');
  const [copiedVerseId, setCopiedVerseId] = useState<string>('');

  const currentMandalaSummary = mandalas.find((m) => m.mandala === mandalaNum);
  const maxSuktasInMandala =
    currentMandalaSummary?.hymn_count || hymn?.mandala_info?.hymn_count || 191;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetch(`/api/mandalas/${mandalaNum}/hymns/${suktaNum}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Hymn ${mandalaNum}.${suktaNum} not found.`);
        return res.json();
      })
      .then((data: HymnDetail) => {
        if (active) {
          setHymn(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to load hymn.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mandalaNum, suktaNum]);

  useEffect(() => {
    if (!loading && hymn && highlightVerse) {
      const el = document.getElementById(`verse-card-${highlightVerse}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }, [loading, hymn, highlightVerse]);

  const handleCopyVerse = (v: HymnDetail['verses'][number]) => {
    const text = `Rig Veda ${v.mandala}.${v.sukta}.${v.verse} (${v.verse_id})\n${
      v.sanskrit ? v.sanskrit + '\n' : ''
    }${v.english_translation}`;
    navigator.clipboard?.writeText(text);
    setCopiedVerseId(v.verse_id);
    setTimeout(() => setCopiedVerseId(''), 2000);
  };

  const sanskritTextClass =
    fontScale === 'lg'
      ? 'text-xl sm:text-2xl leading-relaxed'
      : fontScale === 'sm'
      ? 'text-base sm:text-lg leading-relaxed'
      : 'text-lg sm:text-xl leading-relaxed';

  const englishTextClass =
    fontScale === 'lg'
      ? 'text-base sm:text-lg leading-relaxed'
      : fontScale === 'sm'
      ? 'text-xs sm:text-sm leading-relaxed'
      : 'text-sm sm:text-base leading-relaxed';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation & Selectors */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FFFDF9] p-3.5 rounded-xl border border-[#DECBA8] shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs text-[#6E5648] flex-wrap">
          <button
            type="button"
            onClick={() => navigate({ page: 'explorer' })}
            className="hover:text-[#5B1612] font-medium transition-colors cursor-pointer"
          >
            Rig Veda
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#B6862C]" />
          <button
            type="button"
            onClick={() => navigate({ page: 'mandala', mandala: mandalaNum })}
            className="hover:text-[#5B1612] font-semibold text-[#430F0C] transition-colors cursor-pointer"
          >
            Mandala {mandalaNum}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#B6862C]" />
          <span className="font-bold text-[#9A3412]">Hymn {suktaNum}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hymn?.prev_hymn && (
            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'reader',
                  mandala: hymn.prev_hymn!.mandala,
                  sukta: hymn.prev_hymn!.sukta,
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-[#F4ECE1] hover:bg-[#5B1612] text-[#430F0C] hover:text-[#FFFDF9] border border-[#D3BC94] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
          )}

          <select
            aria-label="Select Mandala"
            value={mandalaNum}
            onChange={(e) =>
              navigate({
                page: 'reader',
                mandala: Number(e.target.value),
                sukta: 1,
              })
            }
            className="px-2.5 py-1.5 rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-xs font-semibold text-[#430F0C] cursor-pointer"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Mandala {m}
              </option>
            ))}
          </select>

          <select
            aria-label="Select Hymn"
            value={suktaNum}
            onChange={(e) =>
              navigate({
                page: 'reader',
                mandala: mandalaNum,
                sukta: Number(e.target.value),
              })
            }
            className="px-2.5 py-1.5 rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-xs font-semibold text-[#430F0C] cursor-pointer"
          >
            {Array.from({ length: maxSuktasInMandala }, (_, i) => i + 1).map((s) => (
              <option key={s} value={s}>
                Hymn {mandalaNum}.{s}
              </option>
            ))}
          </select>

          {hymn?.next_hymn && (
            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'reader',
                  mandala: hymn.next_hymn!.mandala,
                  sukta: hymn.next_hymn!.sukta,
                })
              }
              className="px-2.5 py-1.5 rounded-lg bg-[#F4ECE1] hover:bg-[#5B1612] text-[#430F0C] hover:text-[#FFFDF9] border border-[#D3BC94] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[#FFFDF9] border-2 border-[#DECBA8] p-6 space-y-3 animate-pulse">
            <div className="h-4 w-36 bg-[#EFE4CE] rounded" />
            <div className="h-7 w-64 bg-[#EFE4CE] rounded" />
            <div className="h-3 w-48 bg-[#F4ECE1] rounded" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#FFFDF9] border border-[#DECBA8] p-5 space-y-3 animate-pulse"
            >
              <div className="h-4 w-32 bg-[#EFE4CE] rounded" />
              <div className="h-14 w-full bg-[#FBF7EE] rounded" />
              <div className="h-4 w-5/6 bg-[#F4ECE1] rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-6 rounded-xl bg-[#FFF5F5] border border-red-300 text-red-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold">Hymn {mandalaNum}.{suktaNum} unavailable</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ page: 'mandala', mandala: mandalaNum })}
            className="px-4 py-2 rounded-lg bg-[#5B1612] text-[#FFFDF9] text-xs font-semibold self-start sm:self-auto cursor-pointer"
          >
            Browse Mandala {mandalaNum}
          </button>
        </div>
      )}

      {!loading && !error && hymn && (
        <>
          {/* Cited Verse Focus Banner for seamless movement between Chatbot -> Cited Verse -> Reader */}
          {highlightVerse && (
            <div className="rounded-xl bg-[#FFFBF2] border-2 border-[#C85A17]/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs animate-page-enter">
              <div className="flex items-center gap-2 text-xs text-[#430F0C]">
                <span className="px-2 py-0.5 rounded bg-[#C85A17] text-[#FFFDF9] font-bold">
                  Cited Verse Focus
                </span>
                <span className="font-cinzel font-bold text-[#5B1612]">
                  Rig Veda {mandalaNum}.{suktaNum}.{highlightVerse}
                </span>
                <span className="font-mono text-[11px] text-[#6E5648]">
                  (RV_{mandalaNum}_{suktaNum}_{highlightVerse})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`verse-card-${highlightVerse}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#F4ECE1] hover:bg-[#E8D8BE] text-[#430F0C] border border-[#D3BC94] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Jump to Verse #{highlightVerse}
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ page: 'scholar', initialTab: 'rag' })}
                  className="px-3 py-1 rounded-md bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#E6B655]" />
                  <span>← Back to Ask VedaWise</span>
                </button>
              </div>
            </div>
          )}

          {/* Clean Hymn Masthead */}
          <div className="relative rounded-xl bg-[#FFFDF9] border-2 border-[#B6862C] p-6 shadow-sm">
            <CornerOrnament position="tl" />
            <CornerOrnament position="tr" />
            <CornerOrnament position="bl" />
            <CornerOrnament position="br" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE4CE]">
              <div>
                <div className="text-xs font-semibold text-[#8B261D]">
                  Hymn {hymn.mandala}.{hymn.sukta} · {hymn.deity} · {hymn.verse_count}{' '}
                  {hymn.verse_count === 1 ? 'Verse' : 'Verses'}
                </div>
                <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#430F0C] mt-1">
                  {hymn.title}
                </h1>
                {hymn.anukramani && (
                  <p className="text-xs text-[#6E5648] mt-1">{hymn.anukramani}</p>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      page: 'scholar',
                      initialQuestion: `What are the main themes of Rig Veda ${hymn.mandala}.${hymn.sukta} (${hymn.title})?`,
                      initialTab: 'rag',
                    })
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E6B655]" />
                  <span>Ask VedaWise about Hymn</span>
                </button>
                {hymn.source_url && (
                  <a
                    href={hymn.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-2 rounded-lg bg-[#F4ECE1] hover:bg-[#E8D8BE] text-[#430F0C] border border-[#D3BC94] text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    title="View source text"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Reader Controls */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    ['bilingual', 'Bilingual'],
                    ['sanskrit', 'Sanskrit'],
                    ['english', 'English'],
                  ] as const
                ).map(([modeKey, label]) => (
                  <button
                    key={modeKey}
                    type="button"
                    onClick={() => setReaderMode(modeKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      readerMode === modeKey
                        ? 'bg-[#5B1612] text-[#FFFDF9]'
                        : 'bg-[#F4ECE1] text-[#430F0C] hover:bg-[#E8D8BE]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {readerMode !== 'english' && (
                  <button
                    type="button"
                    onClick={() => setShowTranslit(!showTranslit)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      showTranslit
                        ? 'bg-[#2B5B3F] text-[#FFFDF9] border-[#2B5B3F]'
                        : 'bg-[#FFFDF9] text-[#5C493E] border-[#DECBA8] hover:bg-[#F4ECE1]'
                    }`}
                  >
                    Transliteration
                  </button>
                )}

                <div className="inline-flex rounded-lg border border-[#D3BC94] bg-[#FFFDF9] overflow-hidden">
                  {(['sm', 'md', 'lg'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setFontScale(sz)}
                      title={`Text size: ${sz.toUpperCase()}`}
                      className={`px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                        fontScale === sz
                          ? 'bg-[#5B1612] text-[#FFFDF9]'
                          : 'text-[#5C493E] hover:bg-[#F4ECE1]'
                      }`}
                    >
                      {sz === 'sm' ? 'A-' : sz === 'md' ? 'A' : 'A+'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Verses List */}
          <div className="space-y-4">
            {hymn.verses.map((v) => {
              const isHighlighted = highlightVerse === v.verse;
              return (
                <article
                  id={`verse-card-${v.verse}`}
                  key={v.verse_id}
                  className={`rounded-xl bg-[#FFFDF9] border transition-all duration-200 p-5 ${
                    isHighlighted
                      ? 'border-2 border-[#C85A17] bg-[#FFFBF2] shadow-md animate-verse-highlight'
                      : 'border-[#DECBA8] hover:border-[#B6862C]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#EFE4CE]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-cinzel text-xs font-bold text-[#5B1612]">
                        Verse {v.verse}{' '}
                        <span className="font-normal text-[#8C705F] ml-1">
                          (Rig Veda {v.mandala}.{v.sukta}.{v.verse})
                        </span>
                      </span>
                      <span className="font-mono text-[11px] bg-[#F4ECE1] text-[#5C493E] px-1.5 py-0.5 rounded border border-[#DECBA8]">
                        {v.verse_id}
                      </span>
                      {isHighlighted && (
                        <span className="px-2 py-0.5 rounded bg-[#C85A17] text-[#FFFDF9] text-[11px] font-bold">
                          Cited / Selected Verse
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            page: 'scholar',
                            initialQuestion: `Explain Rig Veda ${v.mandala}.${v.sukta}.${v.verse} (${v.verse_id}) and its theme.`,
                            initialTab: 'rag',
                          })
                        }
                        className="text-xs font-semibold text-[#8B261D] hover:text-[#430F0C] inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title={`Ask VedaWise about Rig Veda ${v.mandala}.${v.sukta}.${v.verse}`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C85A17]" />
                        <span>Ask AI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyVerse(v)}
                        className="text-xs text-[#6E5648] hover:text-[#430F0C] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedVerseId === v.verse_id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#2B5B3F]" />
                            <span className="text-[#2B5B3F] font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {readerMode !== 'english' && v.sanskrit && (
                    <div className="p-3.5 rounded-lg bg-[#FBF7EE] border-l-4 border-[#C85A17] mb-3 space-y-1.5">
                      <p className={`font-sanskrit text-[#430F0C] font-medium ${sanskritTextClass}`}>
                        {v.sanskrit}
                      </p>
                      {showTranslit && v.transliteration && (
                        <p className="text-xs sm:text-sm italic text-[#6E5648] font-serif-prose">
                          {v.transliteration}
                        </p>
                      )}
                    </div>
                  )}

                  {readerMode !== 'sanskrit' && (
                    <p className={`font-serif-prose text-[#231610] ${englishTextClass}`}>
                      {v.english_translation}
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          {/* Bottom Prev / Next Hymn Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#DECBA8]">
            {hymn.prev_hymn ? (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    page: 'reader',
                    mandala: hymn.prev_hymn!.mandala,
                    sukta: hymn.prev_hymn!.sukta,
                  })
                }
                className="p-4 rounded-xl bg-[#FFFDF9] hover:bg-[#F4ECE1] border border-[#DECBA8] hover:border-[#9A3412] text-left transition-all flex items-center gap-3 group cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-[#9A3412] shrink-0 group-hover:-translate-x-0.5 transition-transform" />
                <div>
                  <div className="text-xs text-[#7A6253]">Previous Hymn</div>
                  <div className="font-cinzel text-sm font-bold text-[#430F0C]">
                    {hymn.prev_hymn.mandala}.{hymn.prev_hymn.sukta} — {hymn.prev_hymn.title}
                  </div>
                </div>
              </button>
            ) : (
              <div />
            )}

            {hymn.next_hymn ? (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    page: 'reader',
                    mandala: hymn.next_hymn!.mandala,
                    sukta: hymn.next_hymn!.sukta,
                  })
                }
                className="p-4 rounded-xl bg-[#FFFDF9] hover:bg-[#F4ECE1] border border-[#DECBA8] hover:border-[#9A3412] text-right transition-all flex items-center justify-end gap-3 group cursor-pointer"
              >
                <div>
                  <div className="text-xs text-[#7A6253]">Next Hymn</div>
                  <div className="font-cinzel text-sm font-bold text-[#430F0C]">
                    {hymn.next_hymn.mandala}.{hymn.next_hymn.sukta} — {hymn.next_hymn.title}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#9A3412] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <div />
            )}
          </div>
        </>
      )}
    </div>
  );
}
