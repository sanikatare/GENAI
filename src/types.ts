export interface MandalaDeityCount {
  name: string;
  count: number;
}

export interface MandalaOpeningHymn {
  sukta: number;
  title: string;
  deity: string;
  first_verse_sanskrit: string;
  first_verse_english: string;
}

export interface MandalaSummary {
  mandala: number;
  roman: string;
  devanagari_num: string;
  sanskrit_title: string;
  translit_title: string;
  rishi_lineage: string;
  book_designation: string;
  principal_deities: string[];
  summary: string;
  hymn_count: number;
  verse_count: number;
  top_deities: MandalaDeityCount[];
  opening_hymn: MandalaOpeningHymn | null;
}

export interface HymnSummary {
  mandala: number;
  sukta: number;
  hymn_id: string;
  title: string;
  deity: string;
  anukramani: string;
  source_url: string;
  verse_count: number;
  first_verse_sanskrit: string;
  first_verse_english: string;
}

export interface MandalaDetail extends Omit<MandalaSummary, 'top_deities' | 'opening_hymn'> {
  hymns: HymnSummary[];
}

export interface VerseRecord {
  verse_id: string;
  mandala: number;
  sukta: number;
  verse: number;
  sanskrit: string;
  transliteration: string;
  english_translation: string;
  wilson_translation: string;
  griffith_verse: string | null;
  translator: string;
}

export interface HymnDetail {
  mandala: number;
  sukta: number;
  hymn_id: string;
  title: string;
  deity: string;
  anukramani: string;
  source_url: string;
  verse_count: number;
  griffith_hymn_text: string;
  verses: VerseRecord[];
  mandala_info: {
    mandala: number;
    roman: string;
    devanagari_num: string;
    sanskrit_title: string;
    translit_title: string;
    rishi_lineage: string;
    book_designation: string;
    principal_deities: string[];
    summary: string;
    hymn_count?: number;
  };
  prev_hymn: { mandala: number; sukta: number; title: string } | null;
  next_hymn: { mandala: number; sukta: number; title: string } | null;
}

export interface SearchResultVerse {
  verse_id: string;
  mandala: number;
  sukta: number;
  verse: number;
  english_translation: string;
  sanskrit?: string;
  transliteration?: string;
  deity?: string;
  hymn_title?: string;
  translator: string;
  edition: string;
  source: string;
  source_file: string;
  bm25_rank: number | null;
  bm25_score: number | null;
  dense_rank: number | null;
  dense_score: number | null;
  rrf_score: number;
  final_rank: number;
  rerank_score?: number;
}

export interface ProvenanceOut {
  verse_id: string;
  mandala: number;
  sukta: number;
  verse: number;
  translator: string;
  edition: string;
  source: string;
  source_file: string;
}

export interface SupportingVerseOut {
  verse_id: string;
  english_translation: string;
  sanskrit?: string;
  transliteration?: string;
  deity?: string;
  hymn_title?: string;
  final_rank: number;
  rrf_score: number;
  bm25_rank: number | null;
  bm25_score: number | null;
  dense_rank: number | null;
  dense_score: number | null;
  retrieval_sources: string[];
  provenance: ProvenanceOut;
}

export interface ClaimOut {
  claim: string;
  supporting_verses: string[];
  support_type:
    | 'Direct'
    | 'Thematic'
    | 'Interpretive'
    | 'Unsupported'
    | 'direct'
    | 'paraphrase'
    | 'inference'
    | 'insufficient';
  support_status: 'supported' | 'partially_supported' | 'unsupported';
  layer?: 'textual_evidence' | 'theme' | 'contemporary_connection' | 'unsupported_claim';
}

export interface EpistemicLayers {
  textual_evidence: string;
  theme: string;
  contemporary_connection: string;
  unsupported_claim: string;
}

export interface EpistemicDistinction {
  direct: string;
  inferred: string;
  contextual: string;
}

export interface StructuredTeacherAnswer {
  direct_answer: string;
  explanation: string;
  context: string | null;
  textual_basis: string;
  references: string;
  is_indirect_connection: boolean;
  interpretation_type?: 'direct' | 'inferred' | 'contextual';
  epistemic_distinction?: EpistemicDistinction;
}

export type LifeThemeId =
  | 'adversity_resilience'
  | 'knowledge_learning'
  | 'cooperation'
  | 'leadership'
  | 'discipline_order'
  | 'ethics_conduct'
  | 'uncertainty'
  | 'well_being'
  | 'nature';

export interface LifeThemeDefinition {
  id: LifeThemeId;
  label: string;
  sanskrit_concept: string;
  description: string;
  keywords: string[];
  expansion_terms: string[];
  canonical_verses: string[];
  contemporary_reflection: string;
  epistemic_boundary: string;
}

export interface RetrievalExplanation {
  verse_id: string;
  final_rank: number;
  rrf_score: number;
  bm25_rank: number | null;
  bm25_score: number | null;
  dense_rank: number | null;
  dense_score: number | null;
  retrieval_sources: string[];
  explanation: string;
}

export interface DebugPipelineTrace {
  query_analysis: {
    original_query: string;
    normalized_query: string;
    rewritten_query: string;
    is_followup: boolean;
    detected_mandala: number | null;
    detected_sukta: number | null;
    detected_verse_id: string | null;
    detected_themes?: LifeThemeId[];
    primary_theme?: LifeThemeId | null;
    medical_scientific_boundary_triggered?: boolean;
  };
  retrieval_mode: string;
  life_theme?: LifeThemeId | null;
  effective_mandala_filter: number | null;
  bm25_candidates: Array<{
    verse_id: string;
    bm25_rank: number;
    bm25_score: number;
    english_translation: string;
  }>;
  dense_candidates: Array<{
    verse_id: string;
    dense_rank: number;
    dense_score: number;
    english_translation: string;
  }>;
  rrf_candidates: Array<{
    verse_id: string;
    final_rank: number;
    rrf_score: number;
    bm25_rank: number | null;
    dense_rank: number | null;
  }>;
  reranked_candidates: Array<{
    verse_id: string;
    final_rank: number;
    rerank_score?: number;
    rrf_score: number;
  }>;
  filtered_evidence: string[];
}

export interface ExplainabilityValidation {
  passed: boolean;
  all_citations_in_corpus: boolean;
  all_citations_retrieved: boolean;
  textual_claims_have_supporting_verses: boolean;
  no_fabricated_verse_ids: boolean;
  no_fabricated_sanskrit: boolean;
  four_epistemic_layers_distinct: boolean;
}

export interface ChatResponseData {
  answer: string;
  structured_answer?: StructuredTeacherAnswer;
  epistemic_layers?: EpistemicLayers;
  citations: string[];
  supporting_verses: SupportingVerseOut[];
  retrieval: {
    method: string;
    channels: string[];
    fusion: string;
    rrf_k: number;
    effective_query: string;
    query_rewritten: boolean;
    explanations: RetrievalExplanation[];
    human_explanation: string;
  };
  claims: ClaimOut[];
  abstained: boolean;
  abstention_reason: string | null;
  evidence_status: 'sufficient' | 'limited' | 'insufficient';
  conversation_id: string;
  request_id: string;
  effective_query: string;
  query_analysis?: DebugPipelineTrace['query_analysis'];
  explainability_validation?: ExplainabilityValidation;
  debug_pipeline?: DebugPipelineTrace | null;
  model_used: string;
  execution_time_sec: number;
}

export interface RetrievalMethodMetrics {
  recall_at_1: number;
  recall_at_3: number;
  recall_at_5: number;
  recall_at_10: number;
  precision_at_5: number;
  ndcg_at_5: number;
  mrr: number;
  thematic_grounding_rate?: number;
  avg_latency_ms?: number;
}

export interface EvaluationSummaryReport {
  available: boolean;
  timestamp: string;
  num_questions: number;
  num_answerable: number;
  num_unanswerable: number;
  num_thematic?: number;
  research_question?: string;
  benchmark_note: string;
  retrieval: RetrievalMethodMetrics & { method: string };
  generation: {
    citation_precision?: number;
    citation_accuracy: number;
    citation_recall: number;
    citation_coverage: number;
    faithfulness?: number;
    unsupported_claim_rate: number;
    abstention_accuracy: number;
    thematic_grounding_rate?: number;
    answer_correctness: number;
  };
  method_comparison?: {
    note: string;
    methods: {
      bm25_only: RetrievalMethodMetrics;
      dense_only: RetrievalMethodMetrics;
      hybrid_rrf: RetrievalMethodMetrics;
      hybrid_rrf_reranker?: RetrievalMethodMetrics;
    };
  };
}

export type AppRoute =
  | { page: 'landing' }
  | { page: 'home' }
  | { page: 'explorer' }
  | { page: 'mandala'; mandala: number }
  | { page: 'reader'; mandala: number; sukta: number; highlightVerse?: number }
  | { page: 'search'; initialQuery?: string; initialMandala?: number | null }
  | {
      page: 'scholar';
      initialQuestion?: string;
      initialTheme?: LifeThemeId | null;
      initialTab?: 'rag' | 'evaluation';
    };
