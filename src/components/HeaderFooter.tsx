import React, { useState } from 'react';
import {
  BookOpen,
  Compass,
  Search,
  Sparkles,
  Home,
  ChevronRight,
  ExternalLink,
  Menu,
  X,
  BarChart3,
} from 'lucide-react';
import { AppRoute, MandalaSummary } from '../types';
import { VedicEmblem } from './VedicOrnaments';

interface HeaderProps {
  route: AppRoute;
  navigate: (r: AppRoute) => void;
  mandalas: MandalaSummary[];
  onQuickJump: (input: string) => void;
}

export function Header({ route, navigate, onQuickJump }: HeaderProps) {
  const [jumpInput, setJumpInput] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeMandalaNum =
    route.page === 'mandala'
      ? route.mandala
      : route.page === 'reader'
      ? route.mandala
      : 1;

  const isScholarRagActive =
    route.page === 'scholar' && (route.initialTab || 'rag') === 'rag';
  const isScholarEvalActive =
    route.page === 'scholar' && route.initialTab === 'evaluation';

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumpInput.trim()) return;
    onQuickJump(jumpInput.trim());
    setJumpInput('');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#DECBA8] bg-[#FBF7EE]/95 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Identity */}
          <button
            type="button"
            onClick={() => navigate({ page: 'scholar', initialTab: 'rag' })}
            title="Go to Ask VedaWise"
            className="flex items-center gap-2.5 text-left group rounded-lg p-1 -ml-1 transition-colors shrink-0 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-[#5B1612] text-[#E6B655] flex items-center justify-center border border-[#B6862C] group-hover:bg-[#430F0C] group-hover:scale-105 transition-all duration-200 shrink-0 shadow-2xs">
              <VedicEmblem className="w-5 h-5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-cinzel text-lg font-bold tracking-tight text-[#430F0C] group-hover:text-[#5B1612] transition-colors">
                VedaWise
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-1 bg-[#F4ECE1]/70 p-1 rounded-lg border border-[#DECBA8]/80"
          >
            <NavButton
              active={route.page === 'home'}
              onClick={() => navigate({ page: 'home' })}
              icon={<Home className="w-3.5 h-3.5" />}
              label="Dashboard"
            />
            <NavButton
              active={isScholarRagActive}
              onClick={() => navigate({ page: 'scholar', initialTab: 'rag' })}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              label="Ask VedaWise"
              highlight
            />
            <NavButton
              active={route.page === 'explorer' || route.page === 'mandala'}
              onClick={() => navigate({ page: 'explorer' })}
              icon={<Compass className="w-3.5 h-3.5" />}
              label="Mandalas"
            />
            <NavButton
              active={route.page === 'reader'}
              onClick={() =>
                navigate({
                  page: 'reader',
                  mandala: activeMandalaNum,
                  sukta: route.page === 'reader' ? route.sukta : 1,
                })
              }
              icon={<BookOpen className="w-3.5 h-3.5" />}
              label="Reader"
            />
            <NavButton
              active={route.page === 'search'}
              onClick={() => navigate({ page: 'search' })}
              icon={<Search className="w-3.5 h-3.5" />}
              label="Search"
            />
            <NavButton
              active={isScholarEvalActive}
              onClick={() => navigate({ page: 'scholar', initialTab: 'evaluation' })}
              icon={<BarChart3 className="w-3.5 h-3.5" />}
              label="Evaluation"
            />
          </nav>

          {/* Quick Jump Input */}
          <form onSubmit={handleJumpSubmit} className="hidden lg:flex items-center shrink-0">
            <div className="relative group">
              <input
                type="text"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder="Jump: 2.12, 3.62.10, or topic"
                aria-label="Jump to Mandala, hymn, verse, or search topic"
                title="Enter a verse (e.g. 3.62.10 or RV_10_191_2), hymn (2.12), Mandala (4), or keyword"
                className="w-48 pl-3 pr-8 py-1.5 text-xs rounded-lg bg-[#FFFDF9] border border-[#D3BC94] text-[#231610] placeholder-[#8C7566] transition-all duration-200 focus:w-56 focus:border-[#9A3412] shadow-2xs"
              />
              <button
                type="submit"
                title="Jump to reference or search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#8B261D] hover:text-[#430F0C] hover:bg-[#F4ECE1] rounded p-1 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-[#DECBA8] bg-[#FFFDF9] text-[#430F0C] hover:bg-[#F4ECE1] transition-colors"
            aria-label="Toggle Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFDF9] border-t border-[#DECBA8] px-4 py-4 space-y-3 shadow-lg animate-page-enter">
          <form onSubmit={handleJumpSubmit} className="flex gap-2">
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="Jump to 2.12, 3.62.10, or search..."
              aria-label="Jump to hymn, verse, or search"
              className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg bg-[#FBF7EE] border border-[#D3BC94] text-[#231610]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#5B1612] hover:bg-[#430F0C] text-[#FFFDF9] text-xs font-semibold transition-colors"
            >
              Go
            </button>
          </form>
          <div className="grid grid-cols-2 gap-2">
            <MobileNavBtn
              active={route.page === 'home'}
              onClick={() => {
                navigate({ page: 'home' });
                setMobileMenuOpen(false);
              }}
              icon={<Home className="w-3.5 h-3.5" />}
              label="Home"
              sub="Overview & Themes"
            />
            <MobileNavBtn
              active={isScholarRagActive}
              onClick={() => {
                navigate({ page: 'scholar', initialTab: 'rag' });
                setMobileMenuOpen(false);
              }}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              label="Ask VedaWise"
              sub="Live RAG Chatbot"
            />
            <MobileNavBtn
              active={route.page === 'explorer' || route.page === 'mandala'}
              onClick={() => {
                navigate({ page: 'explorer' });
                setMobileMenuOpen(false);
              }}
              icon={<Compass className="w-3.5 h-3.5" />}
              label="Explore Mandalas"
              sub="Books 1 to 10"
            />
            <MobileNavBtn
              active={route.page === 'reader'}
              onClick={() => {
                navigate({
                  page: 'reader',
                  mandala: activeMandalaNum,
                  sukta: route.page === 'reader' ? route.sukta : 1,
                });
                setMobileMenuOpen(false);
              }}
              icon={<BookOpen className="w-3.5 h-3.5" />}
              label="Hymn Reader"
              sub="Sanskrit & English"
            />
            <MobileNavBtn
              active={route.page === 'search'}
              onClick={() => {
                navigate({ page: 'search' });
                setMobileMenuOpen(false);
              }}
              icon={<Search className="w-3.5 h-3.5" />}
              label="Hybrid Search"
              sub="BM25 + Dense + RRF"
            />
            <MobileNavBtn
              active={isScholarEvalActive}
              onClick={() => {
                navigate({ page: 'scholar', initialTab: 'evaluation' });
                setMobileMenuOpen(false);
              }}
              icon={<BarChart3 className="w-3.5 h-3.5" />}
              label="Evaluation"
              sub="RAG Benchmarks"
            />
          </div>
        </div>
      )}
    </header>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
        active
          ? 'bg-[#5B1612] text-[#FFFDF9] shadow-2xs'
          : highlight
          ? 'bg-[#FFFDF9] text-[#5B1612] border border-[#D3BC94] hover:border-[#9A3412] hover:bg-[#FFFBF2]'
          : 'text-[#3B251B] hover:bg-[#FFFDF9] hover:text-[#5B1612]'
      }`}
    >
      <span className={active ? 'text-[#E6B655]' : highlight ? 'text-[#C85A17]' : 'text-[#9A3412]'}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function MobileNavBtn({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2.5 rounded-lg text-left border transition-colors flex items-start gap-2 ${
        active
          ? 'bg-[#5B1612] text-[#FFFDF9] border-[#B6862C]'
          : 'bg-[#FBF7EE] text-[#3B251B] border-[#DECBA8] hover:bg-[#F4ECE1]'
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${active ? 'text-[#E6B655]' : 'text-[#9A3412]'}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-bold truncate">{label}</div>
        <div className={`text-[10px] truncate ${active ? 'text-[#E8D8BE]' : 'text-[#6E5648]'}`}>
          {sub}
        </div>
      </div>
    </button>
  );
}

export function Footer({
  navigate,
}: {
  navigate: (r: AppRoute) => void;
  mandalas: MandalaSummary[];
}) {
  return (
    <footer className="bg-[#2B110E] text-[#E8D8BE] border-t border-[#B6862C]/60 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#5B1612] text-[#E6B655] flex items-center justify-center border border-[#B6862C]">
              <VedicEmblem className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-cinzel text-sm font-semibold text-[#FBF7EE] tracking-wide">
                  VedaWise
                </span>
                <span className="text-xs text-[#E6B655] font-display">
                  Ancient Knowledge. Explained with Evidence.
                </span>
              </div>
              <p className="text-xs text-[#B39B82] mt-0.5">
                An Explainable Conversational RAG System for Retrieving, Contextualizing, and Verifying Life-Oriented Themes from the Rig Veda
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#D5C1A5]">
            <button
              type="button"
              onClick={() => navigate({ page: 'home' })}
              className="hover:text-[#E6B655] transition-colors cursor-pointer"
            >
              Home
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigate({ page: 'scholar', initialTab: 'rag' })}
              className="hover:text-[#E6B655] transition-colors cursor-pointer font-semibold text-[#F4E3C1]"
            >
              Ask VedaWise
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigate({ page: 'explorer' })}
              className="hover:text-[#E6B655] transition-colors cursor-pointer"
            >
              Explore Mandalas
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigate({ page: 'reader', mandala: 1, sukta: 1 })}
              className="hover:text-[#E6B655] transition-colors cursor-pointer"
            >
              Hymn Reader
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigate({ page: 'search' })}
              className="hover:text-[#E6B655] transition-colors cursor-pointer"
            >
              Hybrid Search
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigate({ page: 'scholar', initialTab: 'evaluation' })}
              className="hover:text-[#E6B655] transition-colors cursor-pointer"
            >
              Evaluation
            </button>
            <span aria-hidden="true">·</span>
            <a
              href="https://sacred-texts.com/hin/rigveda/index.htm"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#E6B655] hover:underline"
            >
              <span>Source Text</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
