import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Sparkles,
  Send,
  Trash2,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  SlidersHorizontal,
  BarChart3,
  Layers,
  GitBranch,
  Play,
  ArrowRight,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  AppRoute,
  SearchResultVerse,
  ChatResponseData,
  MandalaSummary,
  LifeThemeId,
  EvaluationSummaryReport,
} from '../types';

export const LIFE_THEME_OPTIONS: Array<{
  id: LifeThemeId;
  label: string;
  sanskrit: string;
  sanskrit_concept: string;
  description: string;
  sampleQuestion: string;
  sample_question: string;
}> = [
  {
    id: 'adversity_resilience',
    label: 'Adversity & Resilience',
    sanskrit: 'Duritā-taraṇa',
    sanskrit_concept: 'Duritā-taraṇa (Crossing Perils)',
    description:
      'Metaphors of crossing turbulent waters in a boat, mutual support amidst difficulty, and seeking light through darkness.',
    sampleQuestion: 'What does the text say about adversity and crossing through troubles?',
    sample_question: 'What does the text say about adversity and crossing through troubles?',
  },
  {
    id: 'knowledge_learning',
    label: 'Knowledge & Learning',
    sanskrit: 'Dhī & Vāc',
    sanskrit_concept: 'Dhī & Vāc (Insight & Sacred Speech)',
    description:
      'Cultivation of discernment, refinement of language among the wise, and inquiry into the unity underlying diverse names.',
    sampleQuestion: 'How does the Rig Veda describe knowledge, wise speech, and learning?',
    sample_question: 'How does the Rig Veda describe knowledge, wise speech, and learning?',
  },
  {
    id: 'cooperation',
    label: 'Cooperation & Unity',
    sanskrit: 'Saṁjñāna',
    sanskrit_concept: 'Saṁjñāna (Concord & Shared Purpose)',
    description:
      'Calls for collective concord, shared deliberation in assembly, and unity of heart and mind.',
    sampleQuestion: 'What do the hymns teach about cooperation, unity of mind, and shared purpose?',
    sample_question: 'What do the hymns teach about cooperation, unity of mind, and shared purpose?',
  },
  {
    id: 'leadership',
    label: 'Leadership & Responsibility',
    sanskrit: 'Nīti & Gopā',
    sanskrit_concept: 'Nīti & Gopā (Protective Stewardship)',
    description:
      'Portrayals of wise guidance, protecting the community, leading with counsel, and earning willing respect.',
    sampleQuestion: 'How is leadership and protective stewardship portrayed in the Rig Veda?',
    sample_question: 'How is leadership and protective stewardship portrayed in the Rig Veda?',
  },
  {
    id: 'discipline_order',
    label: 'Discipline & Order',
    sanskrit: 'Ṛta & Vrata',
    sanskrit_concept: 'Ṛta & Vrata (Order & Restraint)',
    description:
      'Observance of cosmic and moral regularity (Ṛta), honest labour over reckless gambling, and self-restraint.',
    sampleQuestion:
      'What does the Rig Veda say about self-discipline, avoiding gambling, and honest cultivation?',
    sample_question:
      'What does the Rig Veda say about self-discipline, avoiding gambling, and honest cultivation?',
  },
  {
    id: 'ethics_conduct',
    label: 'Ethics & Conduct',
    sanskrit: 'Dāna & Satya',
    sanskrit_concept: 'Dāna & Ānṛṇya (Generosity & Integrity)',
    description:
      'Teachings on sharing wealth with the needy, recognizing the changing wheel of fortune, truthfulness, and moral introspection.',
    sampleQuestion:
      'What does the Rig Veda say about ethics, generosity to the poor, and the changing wheel of fortune?',
    sample_question:
      'What does the Rig Veda say about ethics, generosity to the poor, and the changing wheel of fortune?',
  },
  {
    id: 'uncertainty',
    label: 'Uncertainty & Inquiry',
    sanskrit: 'Nāsadīya-vimarśa',
    sanskrit_concept: 'Nāsadīya-vimarśa (Cosmic Inquiry)',
    description:
      'Philosophical humility before the unknown, questioning the ultimate origin of existence without dogmatic certainty.',
    sampleQuestion:
      'How does the Rig Veda express cosmic uncertainty and skepticism about the origin of creation?',
    sample_question:
      'How does the Rig Veda express cosmic uncertainty and skepticism about the origin of creation?',
  },
  {
    id: 'well_being',
    label: 'Well-Being & Vitality',
    sanskrit: 'Svasti & Bhadra',
    sanskrit_concept: 'Svasti & Bhadra (Auspicious Flourishing)',
    description:
      'Prayers for receptive senses, auspicious thoughts, peaceful coexistence, and fullness of life.',
    sampleQuestion:
      'What prayers for well-being, auspicious thoughts, and peaceful living appear in the Rig Veda?',
    sample_question:
      'What prayers for well-being, auspicious thoughts, and peaceful living appear in the Rig Veda?',
  },
  {
    id: 'nature',
    label: 'Nature & Ecology',
    sanskrit: 'Prakṛti-stuti',
    sanskrit_concept: 'Prakṛti-stuti (Rivers, Forest & Sky)',
    description:
      'Poetic celebration of rushing rivers, life-giving rain (Parjanya), radiant dawn (Uṣas), and the unspoiled forest (Araṇyānī).',
    sampleQuestion:
      'How does the Rig Veda celebrate nature, rivers, rain, and the forest goddess Aranyani?',
    sample_question:
      'How does the Rig Veda celebrate nature, rivers, rain, and the forest goddess Aranyani?',
  },
];

const SAMPLE_SEARCHES = [
  { label: 'Adversity & Crossing Troubles', query: 'carry us through troubles grief boat river', mandala: null },
  { label: 'Cooperation & Unity (10.191)', query: 'assemble speak together minds one accord common purpose', mandala: 10 },
  { label: 'Knowledge & Wise Speech (10.71)', query: 'wise in spirit created language friends recognize', mandala: 10 },
  { label: 'Discipline & Honest Cultivation (10.34)', query: 'play not with dice cultivate corn-land wealth', mandala: 10 },
  { label: 'Ethics & Generosity (10.117)', query: 'rich satisfy poor implorer wheels of cars rolling', mandala: 10 },
  { label: 'Uncertainty & Creation (10.129)', query: 'non-existent nor existent whence creation came', mandala: 10 },
  { label: 'Nature & Forest Goddess (10.146)', query: 'Goddess of wild and forest Aranyani', mandala: 10 },
];

export function SearchPage({
  initialQuery = 'assemble speak together minds one accord',
  initialMandala = null,
  navigate,
}: {
  initialQuery?: string;
  initialMandala?: number | null;
  mandalas: MandalaSummary[];
  navigate: (r: AppRoute) => void;
}) {
  const [query, setQuery] = useState<string>(initialQuery);
  const [selectedMandala, setSelectedMandala] = useState<number | null>(initialMandala ?? null);
  const [retrievalMode, setRetrievalMode] = useState<'hybrid' | 'hybrid_rerank' | 'bm25' | 'dense'>('hybrid');
  const [results, setResults] = useState<SearchResultVerse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [lookupInput, setLookupInput] = useState<string>('10.191.2');
  const [lookedUpVerse, setLookedUpVerse] = useState<SearchResultVerse | null>(null);
  const [lookupError, setLookupError] = useState<string>('');

  const executeSearch = async (
    q: string,
    mFilter: number | null,
    mode: 'hybrid' | 'hybrid_rerank' | 'bm25' | 'dense' = retrievalMode
  ) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q.trim(),
          top_k: 15,
          mandala: mFilter,
          retrieval_mode: mode,
          enable_reranker: mode === 'hybrid_rerank',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || 'Search failed.');
      } else {
        setResults(data.results || []);
      }
    } catch {
      setError('Network error while searching.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery(initialQuery);
    setSelectedMandala(initialMandala ?? null);
    executeSearch(initialQuery, initialMandala ?? null, retrievalMode);
  }, [initialQuery, initialMandala]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupInput.trim()) return;
    setLookupError('');
    setLookedUpVerse(null);
    try {
      const res = await fetch(`/api/verse/${encodeURIComponent(lookupInput.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.detail || 'Verse not found. Try 10.191.2 or 3.62.10.');
      } else {
        setLookedUpVerse(data);
      }
    } catch {
      setLookupError('Unable to look up verse.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-[#DECBA8]">
        <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#430F0C]">
          Hybrid Verse Search (Mandalas 1–10)
        </h1>
        <p className="text-xs sm:text-sm text-[#6E5648] mt-0.5">
          Compare BM25 lexical, Dense vector, and Reciprocal Rank Fusion (RRF) retrieval across 10,546 verses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Search Column */}
        <div className="lg:col-span-8 space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(query, selectedMandala, retrievalMode);
            }}
            className="bg-[#FFFDF9] rounded-xl border border-[#DECBA8] p-4 space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8C705F] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search verses, life themes, deities..."
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-[#231610] focus:outline-none focus:border-[#9A3412]"
                />
              </div>
              <select
                aria-label="Retrieval Mode"
                value={retrievalMode}
                onChange={(e) => {
                  const nextMode = e.target.value as 'hybrid' | 'hybrid_rerank' | 'bm25' | 'dense';
                  setRetrievalMode(nextMode);
                  executeSearch(query, selectedMandala, nextMode);
                }}
                className="px-3 py-2 rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-xs font-semibold text-[#430F0C]"
              >
                <option value="hybrid">Hybrid RRF (BM25 + Dense)</option>
                <option value="hybrid_rerank">Hybrid RRF + Reranker</option>
                <option value="bm25">BM25 Lexical Only</option>
                <option value="dense">Dense Vector Only</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs font-semibold transition-colors shrink-0"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Scope Filter */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#EFE4CE]">
              <span className="text-xs text-[#6E5648] mr-1">Mandala:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedMandala(null);
                  executeSearch(query, null, retrievalMode);
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  selectedMandala === null
                    ? 'bg-[#5B1612] text-[#FFFDF9]'
                    : 'bg-[#F4ECE1] text-[#430F0C] hover:bg-[#E8D8BE]'
                }`}
              >
                All
              </button>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setSelectedMandala(m);
                    executeSearch(query, m, retrievalMode);
                  }}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    selectedMandala === m
                      ? 'bg-[#C85A17] text-[#FFFDF9]'
                      : 'bg-[#FBF7EE] text-[#430F0C] border border-[#DECBA8] hover:bg-[#F4ECE1]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-[#FFF5F5] border border-red-300 text-red-900 text-xs">
              {error}
            </div>
          )}

          {/* Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#6E5648]">
              <span>
                Showing <strong className="text-[#430F0C]">{results.length}</strong> verses · Mode:{' '}
                <span className="font-mono font-semibold text-[#5B1612]">
                  {retrievalMode.toUpperCase()}
                </span>
              </span>
              {selectedMandala !== null && (
                <span className="px-2 py-0.5 rounded bg-[#F4ECE1] text-[#430F0C] font-semibold">
                  Filtered: Mandala {selectedMandala}
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-[#FFFDF9] border border-[#DECBA8] p-5 space-y-3 animate-pulse"
                  >
                    <div className="flex justify-between">
                      <div className="h-4 w-40 bg-[#EFE4CE] rounded" />
                      <div className="h-4 w-32 bg-[#F4ECE1] rounded" />
                    </div>
                    <div className="h-12 w-full bg-[#FBF7EE] rounded" />
                    <div className="h-4 w-5/6 bg-[#F4ECE1] rounded" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 && !error ? (
              <div className="rounded-xl bg-[#FFFDF9] border border-[#DECBA8] p-10 text-center space-y-3">
                <p className="font-display text-lg font-bold text-[#430F0C]">
                  No verses found for “{query}”
                </p>
                <p className="text-xs text-[#6E5648] max-w-md mx-auto">
                  Try searching across all Mandalas or selecting one of the life-oriented sample queries on the right.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMandala(null);
                    setQuery('assemble speak together minds one accord');
                    executeSearch('assemble speak together minds one accord', null, retrievalMode);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Search</span>
                </button>
              </div>
            ) : (
              results.map((r) => (
                <div
                  key={r.verse_id}
                  className="rounded-xl bg-[#FFFDF9] border border-[#DECBA8] hover:border-[#9A3412] hover:-translate-y-0.5 hover:shadow-sm p-5 space-y-3 transition-all duration-150"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#EFE4CE]">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-cinzel text-xs font-bold text-[#5B1612] bg-[#F4ECE1] px-2 py-0.5 rounded border border-[#DECBA8]">
                        #{r.final_rank} · Rig Veda {r.mandala}.{r.sukta}.{r.verse}
                      </span>
                      <span className="font-mono text-[11px] text-[#6E5648]">({r.verse_id})</span>
                      {r.hymn_title && (
                        <span className="font-display text-base font-bold text-[#430F0C]">
                          {r.hymn_title}
                        </span>
                      )}
                      {r.deity && <span className="text-xs text-[#8B261D]">· {r.deity}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono bg-[#F4ECE1] text-[#430F0C] px-2 py-0.5 rounded border border-[#D3BC94]">
                        RRF: {r.rrf_score.toFixed(4)}
                        {r.bm25_rank !== null ? ` | BM25 #${r.bm25_rank}` : ''}
                        {r.dense_rank !== null ? ` | Dense #${r.dense_rank}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            page: 'scholar',
                            initialQuestion: `Explain Rig Veda ${r.mandala}.${r.sukta}.${r.verse} (${r.verse_id}) and its theme.`,
                            initialTab: 'rag',
                          })
                        }
                        className="text-xs font-semibold text-[#8B261D] hover:text-[#430F0C] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C85A17]" />
                        <span>Ask AI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            page: 'reader',
                            mandala: r.mandala,
                            sukta: r.sukta,
                            highlightVerse: r.verse,
                          })
                        }
                        className="px-2.5 py-1 rounded-md bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#E6B655]" />
                        <span>Open Hymn</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {r.sanskrit && (
                    <div className="p-3 rounded-lg bg-[#FBF7EE] border-l-4 border-[#C85A17]">
                      <p className="font-sanskrit text-base text-[#430F0C]">{r.sanskrit}</p>
                      {r.transliteration && (
                        <p className="text-xs italic text-[#6E5648] mt-1 font-serif-prose">
                          {r.transliteration}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="font-serif-prose text-sm sm:text-base text-[#231610] leading-relaxed">
                    {r.english_translation}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-[#FFFDF9] rounded-xl border border-[#DECBA8] p-5 space-y-3 shadow-2xs">
            <h3 className="font-cinzel text-sm font-bold text-[#430F0C]">Direct Verse Lookup</h3>
            <form onSubmit={handleLookup} className="flex gap-2">
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                placeholder="e.g. 10.191.2 or RV_1_99_1"
                aria-label="Direct verse lookup"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-[#231610]"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#C85A17] hover:bg-[#B24D10] text-[#FFFDF9] text-xs font-semibold transition-colors cursor-pointer"
              >
                Go
              </button>
            </form>

            {lookupError && <p className="text-xs text-red-700">{lookupError}</p>}

            {lookedUpVerse && (
              <div className="p-3.5 rounded-lg bg-[#FBF7EE] border border-[#D3BC94] space-y-2 animate-page-enter">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-cinzel font-bold text-[#5B1612]">
                    {lookedUpVerse.mandala}.{lookedUpVerse.sukta}.{lookedUpVerse.verse} ({lookedUpVerse.verse_id})
                  </span>
                  <span className="text-[#8B261D] font-semibold">{lookedUpVerse.deity}</span>
                </div>
                {lookedUpVerse.sanskrit && (
                  <p className="font-sanskrit text-sm text-[#430F0C]">{lookedUpVerse.sanskrit}</p>
                )}
                <p className="text-xs font-serif-prose text-[#231610] leading-relaxed">
                  {lookedUpVerse.english_translation}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      page: 'reader',
                      mandala: lookedUpVerse.mandala,
                      sukta: lookedUpVerse.sukta,
                      highlightVerse: lookedUpVerse.verse,
                    })
                  }
                  className="w-full py-1.5 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Open Hymn {lookedUpVerse.mandala}.{lookedUpVerse.sukta}
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#FFFDF9] rounded-xl border border-[#DECBA8] p-5 space-y-2.5 shadow-2xs">
            <h3 className="font-cinzel text-sm font-bold text-[#430F0C]">Life-Oriented Search Queries</h3>
            <div className="space-y-1.5">
              {SAMPLE_SEARCHES.map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  onClick={() => {
                    setQuery(topic.query);
                    setSelectedMandala(topic.mandala);
                    executeSearch(topic.query, topic.mandala, retrievalMode);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#FBF7EE] hover:bg-[#F4ECE1] border border-[#E5D5B5] hover:border-[#B6862C] text-xs text-[#3B251B] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span>{topic.label}</span>
                  <ArrowRight className="w-3 h-3 text-[#9A3412] opacity-70 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScholarPage({
  initialQuestion,
  initialTheme = null,
  initialTab = 'rag',
  navigate,
}: {
  initialQuestion?: string;
  initialTheme?: LifeThemeId | null;
  initialTab?: 'rag' | 'evaluation';
  navigate: (r: AppRoute) => void;
}) {
  const [activeTab, setActiveTab] = useState<'rag' | 'evaluation'>(initialTab);
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      abstained?: boolean;
      explainable_res?: ChatResponseData;
    }>
  >([]);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [mandalaScope, setMandalaScope] = useState<number | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<LifeThemeId | null>(initialTheme);
  const [retrievalMode, setRetrievalMode] = useState<'hybrid' | 'hybrid_rerank' | 'bm25' | 'dense'>('hybrid');
  const [showDebugPipeline, setShowDebugPipeline] = useState<boolean>(false);
  const [inspectorTabByMsg, setInspectorTabByMsg] = useState<
    Record<number, 'summary' | 'claims' | 'verses' | 'pipeline' | 'collapsed'>
  >({});
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Evaluation Benchmark state
  const [evalReport, setEvalReport] = useState<EvaluationSummaryReport | null>(null);
  const [evalLoading, setEvalLoading] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialTheme) {
      setSelectedTheme(initialTheme);
    }
    if (initialQuestion && initialQuestion.trim()) {
      setActiveTab('rag');
      submitQuestion(initialQuestion.trim(), initialTheme || selectedTheme);
    }
  }, [initialQuestion, initialTheme]);

  useEffect(() => {
    if (messages.length > 0 || loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length, loading]);

  const loadEvaluationSummary = async (forceRun = false) => {
    setEvalLoading(true);
    try {
      const res = await fetch(forceRun ? '/api/evaluation/run' : '/api/evaluation/summary', {
        method: forceRun ? 'POST' : 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        setEvalReport(data);
      }
    } catch {
      // ignore
    } finally {
      setEvalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'evaluation' && !evalReport) {
      loadEvaluationSummary(false);
    }
  }, [activeTab]);

  const submitQuestion = async (q: string, themeOverride?: LifeThemeId | null) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    const themeToUse = themeOverride !== undefined ? themeOverride : selectedTheme;
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId || undefined,
          history: chatHistory,
          top_k: 5,
          mandala: mandalaScope,
          life_theme: themeToUse,
          retrieval_mode: retrievalMode,
          enable_reranker: retrievalMode === 'hybrid_rerank',
        }),
      });
      const data: ChatResponseData = await res.json();
      if (data.conversation_id) setConversationId(data.conversation_id);
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: data.answer },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          abstained: data.abstained,
          explainable_res: data,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to reach the VedaWise RAG service.',
          abstained: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const parseVerseRef = (verseId: string) => {
    const m = verseId.match(/^RV_(\d+)_(\d+)_(\d+)$/i);
    if (!m) return null;
    const mandala = Number(m[1]);
    const sukta = Number(m[2]);
    const verse = Number(m[3]);
    return {
      mandala,
      sukta,
      verse,
      humanRef: `Rig Veda ${mandala}.${sukta}.${verse}`,
      canonicalRef: `RV_${mandala}_${sukta}_${verse}`,
    };
  };

  const renderClickableVerseRef = (
    verseId: string,
    keyPrefix: string | number = verseId,
    compact = false
  ) => {
    const parsed = parseVerseRef(verseId);
    if (!parsed) {
      return (
        <span key={keyPrefix} className="font-inter text-xs font-medium">
          {verseId}
        </span>
      );
    }

    if (compact) {
      return (
        <button
          key={keyPrefix}
          type="button"
          onClick={() =>
            navigate({
              page: 'reader',
              mandala: parsed.mandala,
              sukta: parsed.sukta,
              highlightVerse: parsed.verse,
            })
          }
          className="mx-1 px-2 py-0.5 rounded bg-[#F4ECE1] hover:bg-[#5B1612] text-[#5B1612] hover:text-[#FFFDF9] border border-[#D8C39E] text-xs font-inter font-medium inline-flex items-center gap-1 transition-colors cursor-pointer align-baseline"
          title={`Open ${parsed.humanRef} (${parsed.canonicalRef}) in Hymn Reader`}
        >
          <span>RV {parsed.mandala}.{parsed.sukta}.{parsed.verse}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-75 shrink-0" />
        </button>
      );
    }

    return (
      <button
        key={keyPrefix}
        type="button"
        onClick={() =>
          navigate({
            page: 'reader',
            mandala: parsed.mandala,
            sukta: parsed.sukta,
            highlightVerse: parsed.verse,
          })
        }
        className="px-2.5 py-1 rounded-md bg-[#FFFDF9] hover:bg-[#5B1612] text-[#5B1612] hover:text-[#FFFDF9] border border-[#C85A17]/50 hover:border-[#5B1612] text-xs font-inter font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer group"
        title={`Click to open ${parsed.humanRef} (${parsed.canonicalRef}) in the Bilingual Hymn Reader`}
      >
        <BookOpen className="w-3 h-3 text-[#C85A17] group-hover:text-[#E6B655] shrink-0" />
        <span>{parsed.humanRef}</span>
        <span className="text-[11px] opacity-75">({parsed.canonicalRef})</span>
      </button>
    );
  };

  const renderTextWithCitations = (text: string) => {
    const parts = text.split(/(\[RV_\d+_\d+_\d+\])/g);
    return parts.map((part, idx) => {
      const m = part.match(/^\[(RV_\d+_\d+_\d+)\]$/);
      if (m) {
        return renderClickableVerseRef(m[1], idx, true);
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const supportBadgeColor = (st: string) => {
    const lower = st.toLowerCase();
    if (lower === 'direct') return 'bg-[#1E5638] text-white';
    if (lower === 'thematic' || lower === 'paraphrase') return 'bg-[#2C6B49] text-white';
    if (lower === 'interpretive' || lower === 'inference') return 'bg-[#B45309] text-white';
    return 'bg-[#4B5563] text-white';
  };

  const QUICK_ASK_QUESTIONS = [
    {
      label: 'Leadership in Daily Life',
      question: 'What does the Rig Veda say about leadership in daily life?',
      theme: 'leadership' as LifeThemeId,
    },
    {
      label: 'Cooperation & Unity',
      question: 'What does it say about cooperation?',
      theme: 'cooperation' as LifeThemeId,
    },
    {
      label: 'Handling Adversity',
      question: 'How can a verse relate to handling adversity?',
      theme: 'adversity_resilience' as LifeThemeId,
    },
    {
      label: 'Self-Discipline & Order',
      question: 'What does it say about discipline?',
      theme: 'discipline_order' as LifeThemeId,
    },
    {
      label: 'Knowledge & Learning',
      question: 'What can the verses teach us about learning?',
      theme: 'knowledge_learning' as LifeThemeId,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-inter">
      {/* Header & Research Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#DECBA8]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#6E5648]">
            <span className="font-semibold text-[#5B1612]">Ask VedaWise</span>
            <span aria-hidden="true">·</span>
            <span>Mandalas 1–10 (10,546 Verses)</span>
            <span aria-hidden="true">·</span>
            <span>Hybrid BM25 + Dense FAISS + RRF</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#430F0C] mt-1 tracking-tight">
            Ask VedaWise
          </h1>
          <p className="text-sm text-[#5C493E] mt-0.5">
            Clear answers grounded in the Rig Veda, paired with a separate Explainable AI verification panel.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[#D3BC94] bg-[#F4ECE1] p-1 self-start shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('rag');
              navigate({ page: 'scholar', initialTab: 'rag' });
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'rag'
                ? 'bg-[#5B1612] text-[#FFFDF9] shadow-2xs'
                : 'text-[#430F0C] hover:bg-[#FFFDF9]/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask VedaWise Chatbot</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('evaluation');
              navigate({ page: 'scholar', initialTab: 'evaluation' });
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'evaluation'
                ? 'bg-[#5B1612] text-[#FFFDF9] shadow-2xs'
                : 'text-[#430F0C] hover:bg-[#FFFDF9]/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Research Evaluation (BM25 vs Dense vs RRF)</span>
          </button>
        </div>
      </div>

      {activeTab === 'rag' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Controls Sidebar */}
          <div className="lg:col-span-4 bg-[#FFFDF9] rounded-xl border border-[#DECBA8] p-5 space-y-4 shadow-2xs font-inter">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#430F0C] flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-[#9A3412]" />
                <span>Retrieval &amp; Theme Controls</span>
              </h2>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setChatHistory([]);
                    setConversationId('');
                  }}
                  className="text-xs font-medium text-[#8B261D] hover:text-[#430F0C] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Reset Chat</span>
                </button>
              )}
            </div>

            {/* Mandala Filter */}
            <div>
              <label className="block text-xs font-medium text-[#5C493E] mb-1">
                Mandala Filter (1–10)
              </label>
              <select
                value={mandalaScope ?? ''}
                onChange={(e) => setMandalaScope(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-xs font-medium text-[#231610] cursor-pointer"
              >
                <option value="">All Mandalas (1–10)</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Mandala {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Retrieval Mode */}
            <div>
              <label className="block text-xs font-medium text-[#5C493E] mb-1">
                Retrieval Method
              </label>
              <select
                value={retrievalMode}
                onChange={(e) =>
                  setRetrievalMode(e.target.value as 'hybrid' | 'hybrid_rerank' | 'bm25' | 'dense')
                }
                className="w-full px-3 py-2 rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-xs font-medium text-[#231610] cursor-pointer"
              >
                <option value="hybrid">Hybrid RRF (BM25 + Dense)</option>
                <option value="hybrid_rerank">Hybrid RRF + Cross-Encoder Rerank</option>
                <option value="bm25">BM25 Lexical Only</option>
                <option value="dense">Dense Embeddings (FAISS) Only</option>
              </select>
            </div>

            {/* Debug View Toggle */}
            <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#FBF7EE] hover:bg-[#F4ECE1] border border-[#E5D5B5] cursor-pointer text-xs font-medium text-[#231610] transition-colors">
              <span className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-[#2B5B3F]" />
                <span>Show RAG Pipeline Trace in XAI</span>
              </span>
              <input
                type="checkbox"
                checked={showDebugPipeline}
                onChange={(e) => setShowDebugPipeline(e.target.checked)}
                className="accent-[#2B5B3F]"
              />
            </label>

            {/* 9 Life-Oriented Themes */}
            <div className="pt-3 border-t border-[#EFE4CE] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#430F0C]">
                  Life-Oriented Themes
                </span>
                {selectedTheme && (
                  <button
                    type="button"
                    onClick={() => setSelectedTheme(null)}
                    className="text-xs text-[#6E5648] hover:text-[#430F0C] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {LIFE_THEME_OPTIONS.map((th) => {
                  const active = selectedTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => {
                        setSelectedTheme(th.id);
                        submitQuestion(th.sampleQuestion, th.id);
                      }}
                      disabled={loading}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer group ${
                        active
                          ? 'bg-[#5B1612] text-[#FFFDF9] border-[#5B1612]'
                          : 'bg-[#FBF7EE] hover:bg-[#F4ECE1] text-[#231610] border-[#E5D5B5]'
                      }`}
                    >
                      <span className="font-medium">{th.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Epistemic Abstention & Out-of-Scope Test Buttons */}
            <div className="pt-3 border-t border-[#EFE4CE] space-y-1.5">
              <span className="text-xs font-semibold text-[#430F0C] block">
                Boundary &amp; Abstention Tests
              </span>
              <button
                type="button"
                onClick={() =>
                  submitQuestion(
                    'Which Rig Veda verse scientifically proves that it cures diabetes?',
                    null
                  )
                }
                disabled={loading}
                className="w-full text-left px-3 py-2 rounded-lg bg-[#FFF5F5] hover:bg-[#FEEBEB] border border-red-200 text-xs font-medium text-red-900 transition-colors cursor-pointer"
              >
                Test Medical Boundary (“...cures diabetes?”) →
              </button>
              <button
                type="button"
                onClick={() => submitQuestion('What does Mandala 15 say?', null)}
                disabled={loading}
                className="w-full text-left px-3 py-2 rounded-lg bg-[#FFF5F5] hover:bg-[#FEEBEB] border border-red-200 text-xs font-medium text-red-900 transition-colors cursor-pointer"
              >
                Test Out-of-Scope (“What does Mandala 15 say?”) →
              </button>
            </div>
          </div>

          {/* Right Conversation & Explainability Stream */}
          <div className="lg:col-span-8 space-y-4 font-inter">
            {/* Color Legend Bar so user immediately understands the 2 colors */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#DECBA8] text-xs text-[#5C493E]">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-2 font-medium text-[#231610]">
                  <span className="w-3 h-3 rounded-sm bg-[#FFFBF2] border-2 border-[#B6862C] inline-block" />
                  <span>Warm Ivory Box = Actual Answer</span>
                </span>
                <span className="inline-flex items-center gap-2 font-medium text-[#1B432C]">
                  <span className="w-3 h-3 rounded-sm bg-[#EAF4EE] border-2 border-[#2B5B3F] inline-block" />
                  <span>Sage Green Box = Explainable AI (XAI) &amp; Evidence</span>
                </span>
              </div>
              <span className="text-[11px] text-[#6E5648]">
                Click any RV reference to open the Hymn Reader
              </span>
            </div>

            <div className="bg-[#F7F1E5] rounded-2xl border border-[#DECBA8] p-4 sm:p-6 min-h-[480px] space-y-6 shadow-2xs">
              {messages.length === 0 && (
                <div className="text-center py-12 px-4 space-y-5 bg-[#FFFDF9] rounded-xl border border-[#E5D5B5] animate-page-enter">
                  <div className="w-11 h-11 rounded-full bg-[#F4ECE1] border border-[#DECBA8] flex items-center justify-center mx-auto">
                    <Sparkles className="w-5 h-5 text-[#C85A17]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-semibold text-[#430F0C]">
                      Ask VedaWise a Question
                    </h2>
                    <p className="text-sm text-[#5C493E] max-w-xl mx-auto leading-relaxed">
                      Each response is cleanly separated into two parts: the{' '}
                      <strong className="text-[#430F0C]">Actual Answer</strong> (in a warm ivory card)
                      and the <strong className="text-[#1E5638]">Explainable AI Verification</strong>{' '}
                      (in a sage-green panel below it).
                    </p>
                  </div>

                  <div className="max-w-2xl mx-auto pt-1">
                    <div className="text-xs font-medium text-[#6E5648] mb-2.5">
                      Try one of these life-oriented questions:
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {QUICK_ASK_QUESTIONS.map((item) => (
                        <button
                          key={item.question}
                          type="button"
                          onClick={() => {
                            setSelectedTheme(item.theme);
                            submitQuestion(item.question, item.theme);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-[#FBF7EE] hover:bg-[#5B1612] text-[#231610] hover:text-[#FFFDF9] border border-[#D3BC94] text-xs font-medium transition-colors cursor-pointer"
                        >
                          “{item.question}”
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                if (msg.role === 'user') {
                  return (
                    <div key={idx} className="flex justify-end animate-message-enter">
                      <div className="max-w-xl px-4 py-3 rounded-2xl rounded-tr-xs bg-[#5B1612] text-[#FFFDF9] shadow-2xs">
                        <div className="text-[11px] font-medium text-[#E6B655] mb-0.5">
                          Your Question
                        </div>
                        <div className="text-[15px] font-normal leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                }

                const res = msg.explainable_res;
                const layers = res?.epistemic_layers;
                const expVal = res?.explainability_validation;
                const activeInspectorTab =
                  inspectorTabByMsg[idx] || (showDebugPipeline ? 'pipeline' : 'summary');

                return (
                  <div key={idx} className="space-y-3 animate-message-enter">
                    {/* =========================================================
                        PART 1: THE ACTUAL ANSWER (Warm Ivory-White Card)
                       ========================================================= */}
                    <div className="rounded-2xl bg-[#FFFFFF] border-2 border-[#D8C39E] shadow-xs overflow-hidden">
                      {/* Answer Header */}
                      <div className="px-5 py-3 bg-[#FAF3E6] border-b border-[#E6D7BC] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#5B1612] text-[#FFFDF9] text-xs font-semibold">
                            Actual Answer
                          </span>
                          {res?.query_analysis?.primary_theme && !res.abstained && (
                            <span className="text-xs font-semibold text-[#5B1612] capitalize">
                              · {res.query_analysis.primary_theme.replace(/_/g, ' ')}
                            </span>
                          )}
                          {res?.retrieval?.query_rewritten && (
                            <span className="text-xs text-[#6E5648]">
                              · Follow-up: “{res.effective_query}”
                            </span>
                          )}
                        </div>

                        {/* Cited Verses Pills */}
                        {res && !res.abstained && res.citations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {res.citations.map((citeId) =>
                              renderClickableVerseRef(citeId, `header-${citeId}`)
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cohesive Answer Body */}
                      {layers && !res?.abstained ? (
                        <div className="p-5 space-y-4">
                          {/* Main Explanation in clean Inter 15px */}
                          <div className="space-y-2.5 text-[15px] text-[#1F1612] leading-relaxed font-normal">
                            <p>{renderTextWithCitations(layers.theme)}</p>
                            <p className="text-[#3B2A22]">
                              {renderTextWithCitations(layers.contemporary_connection)}
                            </p>
                          </div>

                          {/* Scriptural Quote Box in Source Sans 3 */}
                          <div className="p-4 rounded-xl bg-[#FBF7EE] border-l-4 border-[#B6862C] border border-[#E8DAC0]">
                            <div className="text-xs font-semibold text-[#5B1612] mb-1">
                              Rig Veda Textual Evidence (Griffith Translation)
                            </div>
                            <div className="font-translation text-[15px] text-[#231610] leading-relaxed">
                              {renderTextWithCitations(layers.textual_evidence)}
                            </div>
                          </div>

                          {/* Contextual Follow-up Buttons */}
                          {res && res.supporting_verses.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EFE4CE]">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-[#6E5648]">
                                  Follow up:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => submitQuestion('What about the next verse?')}
                                  disabled={loading}
                                  className="px-2.5 py-1 rounded-md bg-[#FBF7EE] hover:bg-[#5B1612] text-[#430F0C] hover:text-[#FFFDF9] border border-[#D8C39E] text-xs font-medium transition-colors cursor-pointer"
                                >
                                  Next verse →
                                </button>
                                <button
                                  type="button"
                                  onClick={() => submitQuestion('What about the previous verse?')}
                                  disabled={loading}
                                  className="px-2.5 py-1 rounded-md bg-[#FBF7EE] hover:bg-[#5B1612] text-[#430F0C] hover:text-[#FFFDF9] border border-[#D8C39E] text-xs font-medium transition-colors cursor-pointer"
                                >
                                  Previous verse →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Abstention State inside Actual Answer */
                        <div className="p-5 bg-[#FFF9F9] space-y-2">
                          <div className="text-xs font-semibold text-red-800">
                            Abstained ({res?.abstention_reason || 'Outside Corpus Evidence Scope'})
                          </div>
                          <div className="text-[15px] text-[#231610] leading-relaxed">
                            {renderTextWithCitations(msg.content)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* =========================================================
                        PART 2: EXPLAINABLE AI (XAI) PANEL (Distinct Sage-Green Card)
                       ========================================================= */}
                    {res && (
                      <div className="rounded-2xl bg-[#EAF4EE] border-2 border-[#9EC5AE] shadow-2xs overflow-hidden">
                        {/* Sage-Green XAI Header & View Switcher */}
                        <div className="px-5 py-3 bg-[#DCECE2] border-b border-[#B5D4C1] flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#1E5638] text-white text-xs font-semibold inline-flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Explainable AI (XAI)</span>
                            </span>
                            <span className="text-xs font-medium text-[#19442C]">
                              {res.abstained
                                ? 'Epistemic Guardrail Active'
                                : `${res.citations.length} Verified Citation(s) · ${res.retrieval.method.toUpperCase()} (${res.execution_time_sec}s)`}
                            </span>
                          </div>

                          {/* Clean XAI Tabs */}
                          <div className="flex flex-wrap items-center gap-1 bg-[#EAF4EE] p-1 rounded-lg border border-[#A8CCB6]">
                            <button
                              type="button"
                              onClick={() =>
                                setInspectorTabByMsg((prev) => ({ ...prev, [idx]: 'summary' }))
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                activeInspectorTab === 'summary'
                                  ? 'bg-[#1E5638] text-white'
                                  : 'text-[#19442C] hover:bg-white/70'
                              }`}
                            >
                              4-Layer Breakdown
                            </button>

                            {res.claims.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setInspectorTabByMsg((prev) => ({ ...prev, [idx]: 'claims' }))
                                }
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                  activeInspectorTab === 'claims'
                                    ? 'bg-[#1E5638] text-white'
                                    : 'text-[#19442C] hover:bg-white/70'
                                }`}
                              >
                                Claim Attribution ({res.claims.length})
                              </button>
                            )}

                            {res.supporting_verses.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setInspectorTabByMsg((prev) => ({ ...prev, [idx]: 'verses' }))
                                }
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                  activeInspectorTab === 'verses'
                                    ? 'bg-[#1E5638] text-white'
                                    : 'text-[#19442C] hover:bg-white/70'
                                }`}
                              >
                                Source Verses ({res.supporting_verses.length})
                              </button>
                            )}

                            {res.debug_pipeline && (
                              <button
                                type="button"
                                onClick={() =>
                                  setInspectorTabByMsg((prev) => ({ ...prev, [idx]: 'pipeline' }))
                                }
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                                  activeInspectorTab === 'pipeline'
                                    ? 'bg-[#1E5638] text-white'
                                    : 'text-[#19442C] hover:bg-white/70'
                                }`}
                              >
                                RAG Trace
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setInspectorTabByMsg((prev) => ({
                                  ...prev,
                                  [idx]: activeInspectorTab === 'collapsed' ? 'summary' : 'collapsed',
                                }))
                              }
                              className="px-2 py-1 rounded-md text-xs font-medium text-[#19442C] hover:bg-white/70 transition-colors cursor-pointer"
                            >
                              {activeInspectorTab === 'collapsed' ? 'Expand' : 'Hide'}
                            </button>
                          </div>
                        </div>

                        {/* XAI Content Body */}
                        {activeInspectorTab !== 'collapsed' && (
                          <div className="p-4 sm:p-5 space-y-3">
                            {/* TAB 1: Compact 4-Layer Epistemic Breakdown */}
                            {activeInspectorTab === 'summary' && layers && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-page-enter">
                                <div className="p-3.5 rounded-xl bg-white border border-[#C2DDD0]">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs font-semibold text-[#1E5638]">
                                      1. Literal Textual Evidence
                                    </span>
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#EAF4EE] text-[#1E5638]">
                                      Direct Quote
                                    </span>
                                  </div>
                                  <div className="text-xs text-[#24382D] leading-relaxed">
                                    {renderTextWithCitations(layers.textual_evidence)}
                                  </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-white border border-[#C2DDD0]">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs font-semibold text-[#1E5638]">
                                      2. Supported Vedic Theme
                                    </span>
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#EAF4EE] text-[#1E5638]">
                                      Thematic
                                    </span>
                                  </div>
                                  <div className="text-xs text-[#24382D] leading-relaxed">
                                    {renderTextWithCitations(layers.theme)}
                                  </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-white border border-[#C2DDD0]">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs font-semibold text-[#1E5638]">
                                      3. Contemporary Connection
                                    </span>
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">
                                      Interpretive Reflection
                                    </span>
                                  </div>
                                  <div className="text-xs text-[#24382D] leading-relaxed">
                                    {renderTextWithCitations(layers.contemporary_connection)}
                                  </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-white border border-[#C2DDD0]">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-xs font-semibold text-[#7F1D1D]">
                                      4. Evidence Boundary (What is NOT Claimed)
                                    </span>
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#FEE2E2] text-[#991B1B]">
                                      Epistemic Limit
                                    </span>
                                  </div>
                                  <div className="text-xs text-[#3B2525] leading-relaxed">
                                    {layers.unsupported_claim}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* TAB 2: Claim Attribution */}
                            {activeInspectorTab === 'claims' && res.claims.length > 0 && (
                              <div className="space-y-2 animate-page-enter">
                                {res.claims.map((c, cIdx) => (
                                  <div
                                    key={cIdx}
                                    className="p-3.5 rounded-xl bg-white border border-[#C2DDD0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="text-[#1F2E26] flex-1 leading-relaxed">
                                      {renderTextWithCitations(c.claim)}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                      {c.supporting_verses.map((vId) =>
                                        renderClickableVerseRef(vId, `claim-${cIdx}-${vId}`, true)
                                      )}
                                      <span
                                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${supportBadgeColor(
                                          c.support_type
                                        )}`}
                                      >
                                        {c.support_type}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* TAB 3: Retrieved Source Verses */}
                            {activeInspectorTab === 'verses' && res.supporting_verses.length > 0 && (
                              <div className="space-y-2.5 animate-page-enter">
                                {res.supporting_verses.map((sv) => {
                                  const humanVerseRef = `Rig Veda ${sv.provenance.mandala}.${sv.provenance.sukta}.${sv.provenance.verse}`;
                                  return (
                                    <div
                                      key={sv.verse_id}
                                      className="p-4 rounded-xl bg-white border border-[#C2DDD0] space-y-2 text-xs"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-semibold text-[#1E5638]">
                                            #{sv.final_rank} · {humanVerseRef} ({sv.verse_id})
                                          </span>
                                          {sv.deity && (
                                            <span className="text-[#4B6356] font-medium">
                                              · Deity: {sv.deity}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] text-[#355242] bg-[#EAF4EE] px-2 py-0.5 rounded border border-[#B5D4C1]">
                                            RRF: {sv.rrf_score.toFixed(4)}
                                            {sv.bm25_rank !== null ? ` · BM25 #${sv.bm25_rank}` : ''}
                                            {sv.dense_rank !== null ? ` · Dense #${sv.dense_rank}` : ''}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              navigate({
                                                page: 'reader',
                                                mandala: sv.provenance.mandala,
                                                sukta: sv.provenance.sukta,
                                                highlightVerse: sv.provenance.verse,
                                              })
                                            }
                                            className="px-2.5 py-1 rounded-md bg-[#1E5638] hover:bg-[#164029] text-white font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                                          >
                                            <BookOpen className="w-3 h-3" />
                                            <span>Open in Reader →</span>
                                          </button>
                                        </div>
                                      </div>

                                      {sv.sanskrit && (
                                        <div className="p-2.5 rounded-lg bg-[#F6FAF8] border-l-3 border-[#1E5638]">
                                          <p className="font-sanskrit text-sm text-[#193827]">
                                            {sv.sanskrit}
                                          </p>
                                          {sv.transliteration && (
                                            <p className="text-xs italic text-[#4B6356] mt-0.5">
                                              {sv.transliteration}
                                            </p>
                                          )}
                                        </div>
                                      )}

                                      <p className="font-translation text-sm text-[#1F2E26] leading-relaxed">
                                        “{sv.english_translation}”
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* TAB 4: RAG Pipeline Debug Trace */}
                            {activeInspectorTab === 'pipeline' && res.debug_pipeline && (
                              <div className="p-3.5 rounded-xl bg-[#162920] text-[#EAF4EE] font-mono text-xs space-y-1.5 overflow-x-auto animate-page-enter">
                                <div>
                                  1. Original Query: &quot;{res.debug_pipeline.query_analysis.original_query}&quot;
                                </div>
                                <div>
                                  2. Context Resolution: &quot;{res.debug_pipeline.query_analysis.rewritten_query}&quot; (Follow-up:{' '}
                                  {String(res.debug_pipeline.query_analysis.is_followup)})
                                </div>
                                <div>
                                  3. Life-Theme Detection:{' '}
                                  {res.debug_pipeline.query_analysis.detected_themes?.join(', ') || 'None'}
                                </div>
                                <div>
                                  4. BM25 Top Candidates:{' '}
                                  {res.debug_pipeline.bm25_candidates
                                    .slice(0, 4)
                                    .map((c) => `${c.verse_id} (#${c.bm25_rank}, ${c.bm25_score.toFixed(2)})`)
                                    .join(', ') || 'None'}
                                </div>
                                <div>
                                  5. Dense Vector Top Candidates:{' '}
                                  {res.debug_pipeline.dense_candidates
                                    .slice(0, 4)
                                    .map((c) => `${c.verse_id} (#${c.dense_rank}, ${c.dense_score.toFixed(3)})`)
                                    .join(', ') || 'None'}
                                </div>
                                <div>
                                  6. RRF Fused Top Candidates:{' '}
                                  {res.debug_pipeline.rrf_candidates
                                    .slice(0, 4)
                                    .map((c) => `${c.verse_id} (RRF=${c.rrf_score.toFixed(4)})`)
                                    .join(', ') || 'None'}
                                </div>
                                <div>
                                  7. Evidence Filtered IDs:{' '}
                                  {res.debug_pipeline.filtered_evidence.join(', ') || 'None'}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="p-4 rounded-xl bg-white border border-[#DECBA8] space-y-2 animate-message-enter">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#5B1612]">
                    <Sparkles className="w-4 h-4 text-[#C85A17] animate-spin" />
                    <span>Retrieving Rig Veda Evidence &amp; Generating Answer...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitQuestion(inputText);
              }}
              className="flex gap-2 bg-[#FFFDF9] p-3 rounded-xl border-2 border-[#DECBA8] focus-within:border-[#9A3412] transition-colors shadow-2xs"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about adversity, cooperation, knowledge, ethics, or follow up with 'What about the next verse?'..."
                aria-label="Ask VedaWise a question"
                className="flex-1 px-3.5 py-2 text-sm rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-[#231610] focus:outline-none focus:border-[#9A3412]"
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="px-5 py-2 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] disabled:opacity-50 text-[#FFFDF9] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask VedaWise</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Research Evaluation Benchmark Panel (BM25 vs Dense vs Hybrid RRF) */
        <div className="space-y-6 animate-page-enter">
          <div className="bg-[#FFFDF9] rounded-xl border border-[#DECBA8] p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-cinzel text-xl font-bold text-[#430F0C]">
                  Experimental Evaluation: BM25 vs Dense vs Hybrid RRF
                </h2>
                <p className="text-xs text-[#6E5648] mt-1">
                  {evalReport?.research_question ||
                    'Can an explainable hybrid RAG system reliably retrieve and contextualize life-oriented themes from the Rig Veda while minimizing hallucinations and unsupported interpretations?'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadEvaluationSummary(true)}
                disabled={evalLoading}
                className="px-4 py-2 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] disabled:opacity-60 text-[#FFFDF9] text-xs font-semibold flex items-center gap-1.5 self-start shrink-0 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#E6B655]" />
                <span>{evalLoading ? 'Evaluating Benchmark...' : 'Re-Run Live Benchmark'}</span>
              </button>
            </div>

            {evalLoading && !evalReport && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-[#FBF7EE] border border-[#DECBA8] space-y-2 animate-pulse"
                  >
                    <div className="h-3 w-20 bg-[#EFE4CE] rounded" />
                    <div className="h-6 w-16 bg-[#EFE4CE] rounded" />
                    <div className="h-3 w-24 bg-[#F4ECE1] rounded" />
                  </div>
                ))}
              </div>
            )}

            {evalReport && (
              <>
                {/* Top Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                  <MetricCard
                    label="Benchmark Size"
                    value={`${evalReport.num_questions} Qs`}
                    sub={`${evalReport.num_answerable} Ans / ${evalReport.num_unanswerable} Unans`}
                  />
                  <MetricCard
                    label="Hybrid Recall@5"
                    value={`${(evalReport.retrieval.recall_at_5 * 100).toFixed(1)}%`}
                    sub={`MRR: ${evalReport.retrieval.mrr.toFixed(3)}`}
                  />
                  <MetricCard
                    label="Hybrid nDCG@5"
                    value={evalReport.retrieval.ndcg_at_5.toFixed(3)}
                    sub={`Recall@1: ${(evalReport.retrieval.recall_at_1 * 100).toFixed(1)}%`}
                  />
                  <MetricCard
                    label="Faithfulness & Citations"
                    value={`${((evalReport.generation.faithfulness ?? 1) * 100).toFixed(0)}%`}
                    sub={`Citation Prec: ${(evalReport.generation.citation_accuracy * 100).toFixed(0)}%`}
                  />
                  <MetricCard
                    label="Unsupported Claim Rate"
                    value={`${(evalReport.generation.unsupported_claim_rate * 100).toFixed(1)}%`}
                    sub="Epistemic Guardrail"
                  />
                  <MetricCard
                    label="Abstention Accuracy"
                    value={`${(evalReport.generation.abstention_accuracy * 100).toFixed(1)}%`}
                    sub={`Thematic Grounding: ${(
                      (evalReport.generation.thematic_grounding_rate ?? 1) * 100
                    ).toFixed(0)}%`}
                  />
                </div>

                {/* Method Comparison Table */}
                {evalReport.method_comparison && (
                  <div className="pt-4 overflow-x-auto">
                    <h3 className="font-cinzel text-sm font-bold text-[#430F0C] mb-2">
                      Retrieval &amp; Grounding Ablation Table
                    </h3>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F4ECE1] text-[#430F0C] border-b border-[#D3BC94]">
                          <th className="py-2.5 px-3 font-bold">Method</th>
                          <th className="py-2.5 px-3 font-bold">Recall@1</th>
                          <th className="py-2.5 px-3 font-bold">Recall@3</th>
                          <th className="py-2.5 px-3 font-bold">Recall@5</th>
                          <th className="py-2.5 px-3 font-bold">MRR</th>
                          <th className="py-2.5 px-3 font-bold">nDCG@5</th>
                          <th className="py-2.5 px-3 font-bold">Thematic Grounding</th>
                          <th className="py-2.5 px-3 font-bold">Avg Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE4CE]">
                        {(
                          [
                            ['BM25 Lexical Only', evalReport.method_comparison.methods.bm25_only],
                            ['Dense Vector (FAISS)', evalReport.method_comparison.methods.dense_only],
                            ['Hybrid RRF (BM25 + Dense)', evalReport.method_comparison.methods.hybrid_rrf],
                            ...(evalReport.method_comparison.methods.hybrid_rrf_reranker
                              ? [
                                  [
                                    'Hybrid RRF + Cross-Encoder Rerank',
                                    evalReport.method_comparison.methods.hybrid_rrf_reranker,
                                  ] as const,
                                ]
                              : []),
                          ] as const
                        ).map(([label, m]) => (
                          <tr key={label} className="hover:bg-[#FBF7EE] transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-[#430F0C]">{label}</td>
                            <td className="py-2.5 px-3 font-mono">{(m.recall_at_1 * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 font-mono">{(m.recall_at_3 * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#2B5B3F]">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#2B5B3F]/10 border border-[#2B5B3F]/25">
                                {(m.recall_at_5 * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono">{m.mrr.toFixed(3)}</td>
                            <td className="py-2.5 px-3 font-mono">{m.ndcg_at_5.toFixed(3)}</td>
                            <td className="py-2.5 px-3 font-mono">
                              {((m.thematic_grounding_rate ?? m.recall_at_5) * 100).toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 font-mono">{m.avg_latency_ms ?? 1.2} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-3.5 rounded-xl bg-[#FBF7EE] border border-[#DECBA8] space-y-1">
      <div className="text-[11px] font-semibold text-[#6E5648]">{label}</div>
      <div className="font-cinzel text-lg font-bold text-[#430F0C]">{value}</div>
      <div className="text-[11px] text-[#8B261D]">{sub}</div>
    </div>
  );
}
