import React, { useState } from 'react';
import { BookOpen, Search, ArrowRight, Sparkles, Compass, BarChart3, RotateCcw } from 'lucide-react';
import { AppRoute, MandalaSummary } from '../types';
import { SacredMandalaWheel, CornerOrnament, SacredLotusBloom } from './VedicOrnaments';
import { LIFE_THEME_OPTIONS } from './SearchAndScholar';

const FEATURED_MANTRAS = [
  {
    ref: '1.1.1',
    canonicalId: 'RV_1_1_1',
    mandala: 1,
    sukta: 1,
    verse: 1,
    title: 'Hymn to Agni',
    deity: 'Agni',
    sanskrit: 'अग्निमीळे पुरोहितं यज्ञस्य देवमृत्विजम् । होतारं रत्नधातमम् ॥',
    translit: 'agním īḷe puróhitaṃ yajñásya devám ṛtvíjam | hótāraṃ ratnadhā́tamam ||',
    english:
      'I Laud Agni, the chosen Priest, God, minister of sacrifice, The hotar, lavishest of wealth.',
  },
  {
    ref: '2.12.1',
    canonicalId: 'RV_2_12_1',
    mandala: 2,
    sukta: 12,
    verse: 1,
    title: 'Hymn to Indra',
    deity: 'Indra',
    sanskrit:
      'यो जात एव प्रथमो मनस्वान्देवो देवान्क्रतुना पर्यभूषत् । यस्य शुष्माद्रोदसी अभ्यसेतां नृम्णस्य मह्ना स जनास इन्द्रः ॥',
    translit:
      'yó jā́tá evá prathamó mánasvān devó devā́n krátunā paryábhūṣat | yásya śúṣmād ródasī ábhyasetāṃ nṛmṇásya mahnā́ sá janāsa índraḥ ||',
    english:
      'He who, just born, chief God of lofty spirit by power and might became the Gods’ protector, Before whose breath through greatness of his valour the two worlds trembled, He, O men, is Indra.',
  },
  {
    ref: '3.62.10',
    canonicalId: 'RV_3_62_10',
    mandala: 3,
    sukta: 62,
    verse: 10,
    title: 'Sāvitrī Mantra',
    deity: 'Savitar',
    sanskrit: 'तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि । धियो यो नः प्रचोदयात् ॥',
    translit: 'tát savitúr váreṇyaṃ bhárgo devásya dhīmahi | dhíyo yó naḥ pracodáyāt ||',
    english:
      'May we attain that excellent glory of Savitar the God: So may he stimulate our prayers.',
  },
  {
    ref: '10.129.1',
    canonicalId: 'RV_10_129_1',
    mandala: 10,
    sukta: 129,
    verse: 1,
    title: 'Nāsadīya Sūkta',
    deity: 'Cosmogony',
    sanskrit:
      'नासदासीन्नो सदासीत्तदानीं नासीद्रजो नो व्योमा परो यत् । किमावरीवः कुह कस्य शर्मन्नम्भः किमासीद्गहनं गभीरम् ॥',
    translit:
      'nā́sad āsīn nó sád āsīt tadā́nīṃ nā́sīd rájo nó vyòmā paró yát | kím ā́varīvaḥ kúha kásya śármann ámbhaḥ kím āsīd gáhanaṃ gabhīrám ||',
    english:
      'Then was not non-existent nor existent: there was no realm of air, no sky beyond it. What covered in, and where? and what gave shelter? Was water there, unfathomed depth of water?',
  },
];

export function LandingPage({ navigate }: { navigate: (r: AppRoute) => void }) {
  const [isBlooming, setIsBlooming] = useState(false);

  const triggerLotusTransition = () => {
    if (isBlooming) return;
    setIsBlooming(true);
    window.setTimeout(() => {
      navigate({ page: 'home' });
    }, 2150);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="VedaWise Landing Page"
      onDoubleClick={triggerLotusTransition}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerLotusTransition();
        }
      }}
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#430F0C] via-[#5B1612] to-[#3B0D0A] text-[#FBF7EE] flex flex-col items-center justify-center px-6 select-none cursor-pointer"
    >
      {/* Concentric Animated Mandala Wheels Behind Centered Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <SacredMandalaWheel
          className={`w-[540px] h-[540px] sm:w-[760px] sm:h-[760px] text-[#E6B655]/12 animate-mandala-slow shrink-0 transition-all duration-1000 ${
            isBlooming ? 'scale-110 opacity-0' : ''
          }`}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <SacredMandalaWheel
          className={`w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] text-[#E6B655]/10 animate-mandala-reverse shrink-0 transition-all duration-1000 ${
            isBlooming ? 'scale-125 opacity-0' : ''
          }`}
        />
      </div>

      {/* Centrally Aligned Hero Typography */}
      <div
        className={`relative z-10 max-w-3xl mx-auto text-center space-y-5 transition-all duration-1000 ${
          isBlooming ? 'opacity-0 scale-95 pointer-events-none' : 'animate-page-enter'
        }`}
      >
        <p className="font-sanskrit text-sm sm:text-base text-[#E6B655] tracking-wider">
          ॥ ऋग्वेदसंहिता · Rig Veda Mandalas 1–10 ॥
        </p>

        <h1 className="font-cinzel text-5xl sm:text-7xl font-semibold tracking-tight text-[#FFFDF9] leading-[1.06]">
          VedaWise
        </h1>

        <p className="font-display text-2xl sm:text-3xl font-medium text-[#E6B655] tracking-tight">
          Ancient Knowledge. Explained with Evidence.
        </p>

        <p className="font-inter text-sm sm:text-lg text-[#EADBC4] leading-relaxed max-w-2xl mx-auto pt-1">
          An Explainable Conversational RAG System for Retrieving, Contextualizing, and Verifying
          Life-Oriented Themes from the Rig Veda
        </p>
      </div>

      {/* Faded, Dim Sacred Lotus Bloom Transition Overlay */}
      {isBlooming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[#260604] animate-lotus-wash" />
          <SacredLotusBloom className="relative z-10 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] animate-lotus-unfurl" />
        </div>
      )}
    </div>
  );
}

export function HomePage({
  mandalas,
  navigate,
}: {
  mandalas: MandalaSummary[];
  navigate: (r: AppRoute) => void;
}) {
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [homeQuestion, setHomeQuestion] = useState('');
  const featured = FEATURED_MANTRAS[featuredIdx];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-inter animate-dashboard-lotus-enter">
      {/* 1. Simplified Central Ask VedaWise Hero Card */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#430F0C] via-[#5B1612] to-[#3B0D0A] text-[#FBF7EE] border border-[#B6862C] p-6 sm:p-10 shadow-md">
        <div className="absolute -right-20 -bottom-20 text-[#E6B655]/10 pointer-events-none">
          <SacredMandalaWheel className="w-[380px] h-[380px] animate-mandala-slow" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-5">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[#E6B655] tracking-wide">
              VedaWise Dashboard · Mandalas 1–10 (10,546 Verses)
            </span>
            <h1 className="text-2xl sm:text-4xl font-semibold text-[#FFFDF9] tracking-tight">
              What would you like to explore in the Rig Veda?
            </h1>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!homeQuestion.trim()) return;
              navigate({
                page: 'scholar',
                initialQuestion: homeQuestion.trim(),
                initialTab: 'rag',
              });
            }}
            className="max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#FFFDF9] border-2 border-[#E6B655] shadow-md focus-within:border-[#C85A17] transition-colors">
              <Sparkles className="w-4 h-4 text-[#C85A17] ml-3 shrink-0 hidden sm:block" />
              <input
                type="text"
                value={homeQuestion}
                onChange={(e) => setHomeQuestion(e.target.value)}
                placeholder="Ask about leadership, cooperation, resilience, discipline, or any verse..."
                aria-label="Ask VedaWise a question"
                className="flex-1 px-2.5 py-2 text-sm bg-transparent text-[#231610] placeholder-[#7A6253] focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs sm:text-sm font-semibold shrink-0 transition-colors cursor-pointer"
              >
                Ask VedaWise →
              </button>
            </div>
          </form>

          {/* Clean Quick-Theme Starters */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {LIFE_THEME_OPTIONS.slice(0, 6).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  navigate({
                    page: 'scholar',
                    initialTheme: t.id,
                    initialQuestion: t.sample_question,
                    initialTab: 'rag',
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-[#FFFDF9]/10 hover:bg-[#FFFDF9]/20 text-[#FBF7EE] border border-[#E6B655]/30 text-xs font-medium transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Three Focused Workspace Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => navigate({ page: 'scholar', initialTab: 'rag' })}
          className="text-left p-5 rounded-xl bg-[#FFFDF9] border border-[#DECBA8] hover:border-[#C85A17] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer flex flex-col justify-between gap-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[#430F0C] group-hover:text-[#C85A17] transition-colors flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C85A17]" />
                <span>Ask VedaWise Chatbot</span>
              </span>
              <ArrowRight className="w-4 h-4 text-[#9A3412] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-[#5C493E] leading-relaxed">
              Conversational RAG with separate color-coded Actual Answer and Explainable AI evidence verification.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate({ page: 'reader', mandala: 1, sukta: 1 })}
          className="text-left p-5 rounded-xl bg-[#FFFDF9] border border-[#DECBA8] hover:border-[#9A3412] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer flex flex-col justify-between gap-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[#430F0C] group-hover:text-[#9A3412] transition-colors flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#9A3412]" />
                <span>Bilingual Hymn Reader</span>
              </span>
              <ArrowRight className="w-4 h-4 text-[#9A3412] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-[#5C493E] leading-relaxed">
              Read Devanagari Sanskrit, transliteration, and Griffith English translations across 1,028 hymns.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate({ page: 'scholar', initialTab: 'evaluation' })}
          className="text-left p-5 rounded-xl bg-[#FFFDF9] border border-[#DECBA8] hover:border-[#2B5B3F] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer flex flex-col justify-between gap-3"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[#430F0C] group-hover:text-[#2B5B3F] transition-colors flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2B5B3F]" />
                <span>Evaluation &amp; Benchmarks</span>
              </span>
              <ArrowRight className="w-4 h-4 text-[#2B5B3F] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-[#5C493E] leading-relaxed">
              Inspect live Recall@K, MRR, nDCG, and citation faithfulness across BM25, Dense FAISS, and Hybrid RRF.
            </p>
          </div>
        </button>
      </section>

      {/* 3. Clean 2-Column Dashboard Content: Compact Mandalas 1-10 + Verse Spotlight */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Compact Mandalas 1-10 Grid */}
        <div className="lg:col-span-7 bg-[#FFFDF9] rounded-2xl border border-[#DECBA8] p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFE4CE]">
            <div>
              <h2 className="text-lg font-semibold text-[#430F0C]">Mandalas 1 – 10</h2>
              <p className="text-xs text-[#6E5648]">
                Select any book to browse its hymns and verses
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ page: 'explorer' })}
              className="text-xs font-medium text-[#5B1612] hover:text-[#C85A17] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Full Explorer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {mandalas.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-[#FBF7EE] border border-[#DECBA8] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {mandalas.map((m) => (
                <button
                  key={m.mandala}
                  type="button"
                  onClick={() => navigate({ page: 'mandala', mandala: m.mandala })}
                  className="p-3 rounded-xl bg-[#FBF7EE] hover:bg-[#5B1612] text-[#231610] hover:text-[#FFFDF9] border border-[#E5D5B5] hover:border-[#5B1612] text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer group"
                >
                  <div className="text-xs font-semibold text-[#5B1612] group-hover:text-[#E6B655]">
                    Mandala {m.mandala}
                  </div>
                  <div className="font-sanskrit text-xs text-[#6E5648] group-hover:text-[#FBF7EE]/90 mt-0.5 truncate">
                    {m.sanskrit_title}
                  </div>
                  <div className="text-[11px] text-[#5C493E] group-hover:text-[#E8D8BE] mt-1.5">
                    {m.hymn_count} hymns
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Featured Verse Spotlight */}
        <div className="lg:col-span-5 bg-[#FFFDF9] rounded-2xl border border-[#DECBA8] p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFE4CE]">
            <div>
              <h2 className="text-lg font-semibold text-[#430F0C]">Featured Verse</h2>
              <p className="text-xs text-[#6E5648]">
                Rig Veda {featured.ref} — {featured.title} ({featured.deity})
              </p>
            </div>
            <div className="flex items-center gap-1">
              {FEATURED_MANTRAS.map((item, idx) => (
                <button
                  key={item.ref}
                  type="button"
                  onClick={() => setFeaturedIdx(idx)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    featuredIdx === idx
                      ? 'bg-[#5B1612] text-[#FFFDF9]'
                      : 'bg-[#F4ECE1] text-[#5C493E] hover:bg-[#E8D8BE]'
                  }`}
                >
                  {item.ref}
                </button>
              ))}
            </div>
          </div>

          <div key={featured.ref} className="space-y-3 animate-page-enter">
            <div className="p-3.5 rounded-xl bg-[#FBF7EE] border-l-4 border-[#C85A17]">
              <p className="font-sanskrit text-base leading-relaxed text-[#430F0C]">
                {featured.sanskrit}
              </p>
              <p className="text-xs italic text-[#6E5648] mt-1 font-translation">
                {featured.translit}
              </p>
            </div>

            <p className="font-translation text-sm sm:text-base text-[#231610] leading-relaxed">
              “{featured.english}”
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#EFE4CE]">
            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'scholar',
                  initialQuestion: `Explain the meaning and themes of Rig Veda ${featured.ref} (${featured.title}).`,
                  initialTab: 'rag',
                })
              }
              className="text-xs font-medium text-[#5B1612] hover:text-[#C85A17] inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C85A17]" />
              <span>Ask AI about this verse</span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate({
                  page: 'reader',
                  mandala: featured.mandala,
                  sukta: featured.sukta,
                  highlightVerse: featured.verse,
                })
              }
              className="text-xs font-medium text-[#9A3412] hover:text-[#430F0C] inline-flex items-center gap-1 transition-colors cursor-pointer group"
            >
              <span>Open in Reader</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function MandalaHeritageCard({
  mandala,
  navigate,
}: {
  mandala: MandalaSummary;
  navigate: (r: AppRoute) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate({ page: 'mandala', mandala: mandala.mandala })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate({ page: 'mandala', mandala: mandala.mandala });
        }
      }}
      className="group relative rounded-xl bg-[#FFFDF9] border border-[#D5BE95] hover:border-[#9A3412] shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer"
    >
      <CornerOrnament position="tl" />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />
      <CornerOrnament position="br" />

      <div className="space-y-3">
        {/* Card Header */}
        <div className="flex items-baseline justify-between gap-3 pb-3 border-b border-[#ECE0C8]">
          <div className="flex items-baseline gap-2.5">
            <h3 className="font-cinzel text-xl font-bold text-[#430F0C] group-hover:text-[#9A3412] transition-colors">
              Mandala {mandala.mandala}
            </h3>
            <span className="font-sanskrit text-sm text-[#8B261D]">{mandala.sanskrit_title}</span>
          </div>

          <div className="text-xs text-[#5C493E] font-medium shrink-0 bg-[#FBF7EE] px-2.5 py-0.5 rounded border border-[#E5D5B5]">
            <strong className="text-[#3B251B]">{mandala.hymn_count}</strong> Hymns ·{' '}
            <span>{mandala.verse_count.toLocaleString()}</span> Verses
          </div>
        </div>

        {/* Summary & Lineage */}
        <p className="text-xs text-[#6E5648]">
          <strong className="text-[#3B251B]">Seers:</strong> {mandala.rishi_lineage}
        </p>

        <p className="text-xs sm:text-sm text-[#3B251B] font-serif-prose leading-relaxed line-clamp-2">
          {mandala.summary}
        </p>
      </div>

      {/* Card Footer */}
      <div className="pt-3 mt-3 border-t border-[#ECE0C8] flex items-center justify-between gap-2 text-xs">
        <span className="text-[#6E5648] truncate">
          {mandala.principal_deities.slice(0, 4).join(' · ')}
        </span>

        <span className="font-semibold text-[#5B1612] group-hover:text-[#C85A17] inline-flex items-center gap-1 shrink-0 transition-colors">
          <span>Open Hymns</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
}

export function MandalaExplorerPage({
  mandalas,
  navigate,
}: {
  mandalas: MandalaSummary[];
  navigate: (r: AppRoute) => void;
}) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredMandalas = mandalas.filter((m) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const hay = `mandala ${m.mandala} ${m.roman} ${m.sanskrit_title} ${m.rishi_lineage} ${m.principal_deities.join(' ')} ${m.summary}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DECBA8]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A3412]">
            Complete Corpus · 1,028 Sūktas · 10,546 Ṛcas
          </span>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#430F0C] mt-0.5">
            Rig Veda — Mandalas 1 to 10
          </h1>
          <p className="text-xs sm:text-sm text-[#6E5648] mt-0.5">
            Select any Mandala to browse its hymns, filter by deity, or launch the Bilingual Hymn Reader.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#8C705F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter by seer, deity, or book..."
            aria-label="Filter Mandalas by seer, deity, or book"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#FFFDF9] border border-[#D3BC94] text-[#231610] focus:outline-none focus:border-[#9A3412] shadow-2xs"
          />
        </div>
      </div>

      {mandalas.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#FFFDF9] border border-[#DECBA8] p-5 space-y-3 animate-pulse"
            >
              <div className="h-5 w-1/3 bg-[#EFE4CE] rounded" />
              <div className="h-3 w-1/2 bg-[#F4ECE1] rounded" />
              <div className="h-10 w-full bg-[#F4ECE1] rounded" />
            </div>
          ))}
        </div>
      ) : filteredMandalas.length === 0 ? (
        <div className="rounded-xl bg-[#FFFDF9] border border-[#DECBA8] p-10 text-center space-y-3">
          <p className="font-display text-lg font-bold text-[#430F0C]">
            No Mandalas match “{filterQuery}”
          </p>
          <p className="text-xs text-[#6E5648]">
            Try searching for a seer family (e.g., Viśvāmitra, Vasiṣṭha) or deity (Agni, Indra, Soma).
          </p>
          <button
            type="button"
            onClick={() => setFilterQuery('')}
            className="px-4 py-2 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMandalas.map((m) => (
            <MandalaHeritageCard key={m.mandala} mandala={m} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}
