import React, { useState, useEffect, useCallback } from 'react';
import { AppRoute, MandalaSummary } from './types';
import { Header, Footer } from './components/HeaderFooter';
import { LandingPage, HomePage, MandalaExplorerPage } from './components/HomeAndExplorer';
import { MandalaDetailPage, HymnReaderPage } from './components/MandalaAndReader';
import { SearchPage, ScholarPage } from './components/SearchAndScholar';

function parseHashToRoute(hash: string): AppRoute {
  const clean = hash.replace(/^#\/?/, '').trim();
  if (!clean || clean === 'landing') return { page: 'landing' };
  if (clean === 'dashboard' || clean === 'home') return { page: 'home' };

  const parts = clean.split('/');
  if (parts[0] === 'explorer') return { page: 'explorer' };
  if (parts[0] === 'search') return { page: 'search' };
  if (parts[0] === 'evaluation') return { page: 'scholar', initialTab: 'evaluation' };
  if (parts[0] === 'scholar' || parts[0] === 'ask') {
    if (parts[1] === 'evaluation') {
      return { page: 'scholar', initialTab: 'evaluation' };
    }
    return { page: 'scholar', initialTab: 'rag' };
  }

  if (parts[0] === 'mandala' && parts[1]) {
    const m = parseInt(parts[1], 10);
    if (!isNaN(m) && m >= 1 && m <= 10) {
      if (parts[2] === 'hymn' && parts[3]) {
        const s = parseInt(parts[3], 10);
        const v = parts[4] ? parseInt(parts[4], 10) : undefined;
        if (!isNaN(s) && s >= 1) {
          return { page: 'reader', mandala: m, sukta: s, highlightVerse: v };
        }
      }
      return { page: 'mandala', mandala: m };
    }
  }

  return { page: 'home' };
}

function routeToHash(route: AppRoute): string {
  switch (route.page) {
    case 'landing':
      return '#/';
    case 'home':
      return '#/dashboard';
    case 'explorer':
      return '#/explorer';
    case 'mandala':
      return `#/mandala/${route.mandala}`;
    case 'reader':
      return route.highlightVerse
        ? `#/mandala/${route.mandala}/hymn/${route.sukta}/${route.highlightVerse}`
        : `#/mandala/${route.mandala}/hymn/${route.sukta}`;
    case 'search':
      return '#/search';
    case 'scholar':
      return route.initialTab === 'evaluation' ? '#/evaluation' : '#/scholar';
  }
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? parseHashToRoute(window.location.hash) : { page: 'landing' }
  );
  const [mandalas, setMandalas] = useState<MandalaSummary[]>([]);

  const navigate = useCallback((nextRoute: AppRoute) => {
    setRoute(nextRoute);
    const nextHash = routeToHash(nextRoute);
    if (typeof window !== 'undefined' && window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseHashToRoute(window.location.hash));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    fetch('/api/mandalas')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.mandalas)) {
          setMandalas(data.mandalas);
        }
      })
      .catch((err) => console.error('Failed to load Mandalas:', err));
  }, []);

  const handleQuickJump = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;

    const verseMatch = cleaned.match(
      /^(?:rig\s*veda\s*|rv[_\s.]*|verse\s*)?(\d+)[._:\s-]+(\d+)[._:\s-]+(\d+)$/i
    );
    if (verseMatch) {
      const m = parseInt(verseMatch[1], 10);
      const s = parseInt(verseMatch[2], 10);
      const v = parseInt(verseMatch[3], 10);
      if (m >= 1 && m <= 10 && s >= 1) {
        navigate({ page: 'reader', mandala: m, sukta: s, highlightVerse: v });
        return;
      }
    }

    const hymnMatch = cleaned.match(
      /^(?:rig\s*veda\s*|rv[_\s.]*|hymn\s*|sukta\s*)?(\d+)[._:\s-]+(\d+)$/i
    );
    if (hymnMatch) {
      const m = parseInt(hymnMatch[1], 10);
      const s = parseInt(hymnMatch[2], 10);
      if (m >= 1 && m <= 10 && s >= 1) {
        navigate({ page: 'reader', mandala: m, sukta: s });
        return;
      }
    }

    const mandalaMatch = cleaned.match(/^(?:mandala\s*|book\s*)?(\d+)$/i);
    if (mandalaMatch) {
      const m = parseInt(mandalaMatch[1], 10);
      if (m >= 1 && m <= 10) {
        navigate({ page: 'mandala', mandala: m });
        return;
      }
    }

    if (
      cleaned.endsWith('?') ||
      /^(?:what|how|why|who|where|when|which|explain|tell\s+me|compare)\b/i.test(cleaned)
    ) {
      navigate({ page: 'scholar', initialQuestion: cleaned, initialTab: 'rag' });
      return;
    }

    navigate({ page: 'search', initialQuery: cleaned });
  };

  if (route.page === 'landing') {
    return <LandingPage navigate={navigate} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7EE] text-[#231610]">
      <Header
        route={route}
        navigate={navigate}
        mandalas={mandalas}
        onQuickJump={handleQuickJump}
      />

      <main className="flex-1">
        <div
          key={`${route.page}-${'mandala' in route ? route.mandala : ''}-${
            'sukta' in route ? route.sukta : ''
          }`}
          className="animate-page-enter"
        >
          {route.page === 'home' && <HomePage mandalas={mandalas} navigate={navigate} />}
          {route.page === 'explorer' && (
            <MandalaExplorerPage mandalas={mandalas} navigate={navigate} />
          )}
          {route.page === 'mandala' && (
            <MandalaDetailPage
              mandalaNum={route.mandala}
              mandalas={mandalas}
              navigate={navigate}
            />
          )}
          {route.page === 'reader' && (
            <HymnReaderPage
              mandalaNum={route.mandala}
              suktaNum={route.sukta}
              highlightVerse={route.highlightVerse}
              mandalas={mandalas}
              navigate={navigate}
            />
          )}
          {route.page === 'search' && (
            <SearchPage
              initialQuery={route.initialQuery}
              initialMandala={route.initialMandala}
              mandalas={mandalas}
              navigate={navigate}
            />
          )}
          {route.page === 'scholar' && (
            <ScholarPage
              initialQuestion={route.initialQuestion}
              initialTheme={route.initialTheme}
              initialTab={route.initialTab}
              navigate={navigate}
            />
          )}
        </div>
      </main>

      <Footer navigate={navigate} mandalas={mandalas} />
    </div>
  );
}
