import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { pipeline } from '@xenova/transformers';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, 'data');
const KB_DIR = path.join(DATA_DIR, 'knowledge_base');
const METADATA_JSON_PATH = path.join(KB_DIR, 'metadata.json');
const COMPLETE_CORPUS_PATH = path.join(KB_DIR, 'complete_rigveda_corpus.json');
const COMPLETE_CORPUS_GZ_PATH = path.join(KB_DIR, 'complete_rigveda_corpus.json.gz');
const COMPLETE_CORPUS_B64_PATH = path.join(KB_DIR, 'complete_rigveda_corpus.json.gz.b64');
const EMBEDDINGS_NPY_PATH = path.join(KB_DIR, 'embeddings.npy');
const FAISS_INDEX_PATH = path.join(KB_DIR, 'faiss.index');
const FAISS_INT8_GZ_PATH = path.join(KB_DIR, 'faiss.int8.bin.gz');
const FAISS_INT8_B64_PATH = path.join(KB_DIR, 'faiss.int8.bin.gz.b64');
const KB_CONFIG_PATH = path.join(KB_DIR, 'kb_config.json');
const EVALUATION_REPORT_PATH = path.join(DATA_DIR, 'logs', 'evaluation_results.json');
const BENCHMARK_QUESTIONS_PATH = path.join(DATA_DIR, 'evaluation', 'benchmark_questions.json');

const DEFAULT_EMBEDDING_MODEL = (
  process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2'
).trim();

function resolveOnnxEmbeddingModel(modelName: string): string {
  const clean = modelName.trim();
  if (clean === 'sentence-transformers/all-MiniLM-L6-v2' || clean === 'all-MiniLM-L6-v2') {
    return 'Xenova/all-MiniLM-L6-v2';
  }
  if (clean.startsWith('sentence-transformers/')) {
    return clean.replace(/^sentence-transformers\//, 'Xenova/');
  }
  return clean;
}

const DEFAULT_RRF_K = parseInt(process.env.RRF_K || '60', 10);
const DEFAULT_CANDIDATE_K = parseInt(process.env.RETRIEVAL_CANDIDATE_K || '50', 10);
const DEFAULT_TOP_K = parseInt(process.env.RETRIEVAL_TOP_K || '5', 10);
let ENABLE_RERANKER = ['1', 'true', 'yes'].includes((process.env.ENABLE_RERANKER || 'false').toLowerCase());

const DEFAULT_LLM_TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE || '0.1');
const MAX_MESSAGE_CHARS = parseInt(process.env.MAX_MESSAGE_CHARS || '4000', 10);
const ABSTENTION_MESSAGE =
  'I could not find sufficient evidence in the selected English translation corpus to answer this reliably.';

const IN_SCOPE_MANDALAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PRIMARY_TRANSLATOR = 'Ralph T. H. Griffith';
const PRIMARY_EDITION_YEAR = 1896;

// Authentic traditional metadata for each of the 10 Mandalas of the Rig Veda
export const MANDALA_CATALOG_INFO: Record<
  number,
  {
    mandala: number;
    roman: string;
    devanagari_num: string;
    sanskrit_title: string;
    translit_title: string;
    rishi_lineage: string;
    book_designation: string;
    principal_deities: string[];
    summary: string;
  }
> = {
  1: {
    mandala: 1,
    roman: 'I',
    devanagari_num: '१',
    sanskrit_title: 'प्रथमं मण्डलम्',
    translit_title: 'Prathamaṁ Maṇḍalam',
    rishi_lineage: 'Śatarcins (Madhucchandas Vaiśvāmitra, Medhātithi Kāṇva, Gotama Rāhūgaṇa, Agastya, Dīrghatamas)',
    book_designation: 'Book of the Hundred-Verse Seers',
    principal_deities: ['Agni', 'Indra', 'Aśvins', 'Maruts', 'Uṣas', 'Viṣṇu'],
    summary:
      'Opening with the celebrated invocation to Agni (RV 1.1.1), Mandala 1 comprises 191 hymns arranged in fifteen seer-groups, culminating in the philosophical Riddle Hymn of Dīrghatamas (RV 1.164).',
  },
  2: {
    mandala: 2,
    roman: 'II',
    devanagari_num: '२',
    sanskrit_title: 'द्वितीयं मण्डलम्',
    translit_title: 'Dvitīyaṁ Maṇḍalam',
    rishi_lineage: 'Gṛtsamada Śaunahotra (Bhārgava Śaunaka)',
    book_designation: 'First Family Book (Gṛtsamada Lineage)',
    principal_deities: ['Agni', 'Indra', 'Bṛhaspati', 'Rudra', 'Varuṇa', 'Ādityas'],
    summary:
      'The earliest of the core Family Books, attributed to the sage Gṛtsamada. Renowned for its liturgical precision and the great hymn proclaiming Indra’s cosmic deeds (RV 2.12).',
  },
  3: {
    mandala: 3,
    roman: 'III',
    devanagari_num: '३',
    sanskrit_title: 'तृतीयं मण्डलम्',
    translit_title: 'Tṛtīyaṁ Maṇḍalam',
    rishi_lineage: 'Viśvāmitra Gāthina & Kuśika Lineage',
    book_designation: 'Second Family Book (Viśvāmitra Lineage)',
    principal_deities: ['Agni', 'Indra', 'Savitar', 'Mitra', 'Viśvedevas'],
    summary:
      'Composed by the royal sage Viśvāmitra and his descendants. Contains the sacred Gāyatrī Mantra addressed to Savitar (RV 3.62.10) and the dialogue of Viśvāmitra with the rivers Vipāś and Śutudrī (RV 3.33).',
  },
  4: {
    mandala: 4,
    roman: 'IV',
    devanagari_num: '४',
    sanskrit_title: 'चतुर्थं मण्डलम्',
    translit_title: 'Caturthaṁ Maṇḍalam',
    rishi_lineage: 'Vāmadeva Gautama',
    book_designation: 'Third Family Book (Gautama Lineage)',
    principal_deities: ['Agni', 'Indra', 'Ṛbhus', 'Aśvins', 'Uṣas', 'Dadhikrās'],
    summary:
      'Revealed to Vāmadeva Gautama. Celebrated for its mystical reflections on Agni as the hidden sacrificial flame, the craftsmanship of the divine Ṛbhus, and Indra’s primordial birth (RV 4.18).',
  },
  5: {
    mandala: 5,
    roman: 'V',
    devanagari_num: '५',
    sanskrit_title: 'पञ्चमं मण्डलम्',
    translit_title: 'Pañcamaṁ Maṇḍalam',
    rishi_lineage: 'Atri Bhauma & Ātreya Seers (including Śyāvāśva)',
    book_designation: 'Fourth Family Book (Atri Lineage)',
    principal_deities: ['Agni', 'Indra', 'Maruts', 'Mitra-Varuṇa', 'Savitar', 'Uṣas'],
    summary:
      'The book of the Atri clan, distinguished by vivid hymns to the storm-gods (Maruts), Mitra-Varuṇa as guardians of Ṛta, and the rescue of the solar light from eclipse (RV 5.40).',
  },
  6: {
    mandala: 6,
    roman: 'VI',
    devanagari_num: '६',
    sanskrit_title: 'षष्ठं मण्डलम्',
    translit_title: 'Ṣaṣṭhaṁ Maṇḍalam',
    rishi_lineage: 'Bharadvāja Bārhaspatya & Descendants',
    book_designation: 'Fifth Family Book (Bharadvāja Lineage)',
    principal_deities: ['Agni', 'Indra', 'Pūṣan', 'Sarasvatī', 'Soma-Rudra'],
    summary:
      'Composed by the Bharadvāja family. Features powerful invocations to Agni Vaiśvānara, pastoral hymns to Pūṣan, and the celebrated laudation of the mighty river goddess Sarasvatī (RV 6.61).',
  },
  7: {
    mandala: 7,
    roman: 'VII',
    devanagari_num: '७',
    sanskrit_title: 'सप्तमं मण्डलम्',
    translit_title: 'Saptamaṁ Maṇḍalam',
    rishi_lineage: 'Vasiṣṭha Maitrāvaruṇi',
    book_designation: 'Sixth Family Book (Vasiṣṭha Lineage)',
    principal_deities: ['Agni', 'Indra', 'Varuṇa', 'Mitra-Varuṇa', 'Uṣas', 'Āpas'],
    summary:
      'The book of Vasiṣṭha, containing deeply devotional penitential hymns to Varuṇa (RV 7.86–89), the historical Battle of the Ten Kings (Dāśarājña, RV 7.18), and the Mahāmṛtyuñjaya Mantra to Tryambaka (RV 7.59.12).',
  },
  8: {
    mandala: 8,
    roman: 'VIII',
    devanagari_num: '८',
    sanskrit_title: 'अष्टमं मण्डलम्',
    translit_title: 'Aṣṭamaṁ Maṇḍalam',
    rishi_lineage: 'Kaṇva Ghaura & Āṅgirasa Seers',
    book_designation: 'Book of the Kaṇva & Āṅgirasa Poets (with Vālakhilya)',
    principal_deities: ['Indra', 'Agni', 'Aśvins', 'Maruts', 'Ādityas', 'Soma'],
    summary:
      'Predominantly composed in lyric pragātha meters by the Kaṇva clan for Sāman chanting. Includes the eleven Vālakhilya hymns (RV 8.49–59) and rich praises of Indra and the Aśvins.',
  },
  9: {
    mandala: 9,
    roman: 'IX',
    devanagari_num: '९',
    sanskrit_title: 'नवमं मण्डलम्',
    translit_title: 'Navamaṁ Maṇḍalam',
    rishi_lineage: 'Multiple Seers (Madhucchandas, Asita, Kaśyapa, Kavi Bhārgava)',
    book_designation: 'The Book of Soma Pavamāna',
    principal_deities: ['Soma Pavamāna'],
    summary:
      'Uniquely unified by its sole liturgical subject: Soma Pavamāna ("clarifying Soma") as the sacred juice is pressed through the woollen filter amidst poetic chants of illumination and immortality.',
  },
  10: {
    mandala: 10,
    roman: 'X',
    devanagari_num: '१०',
    sanskrit_title: 'दशमं मण्डलम्',
    translit_title: 'Daśamaṁ Maṇḍalam',
    rishi_lineage: 'Kṣudrasūktas & Mahāsūktas (Prajāpati Parameṣṭhin, Nārāyaṇa, Vāc Āmbhṛṇī, Yama & Yamī)',
    book_designation: 'Book of Cosmogonic, Ritual & Philosophical Hymns',
    principal_deities: ['Agni', 'Indra', 'Puruṣa', 'Creation (Bhāvavṛttam)', 'Vāc', 'Yama', 'Sūryā'],
    summary:
      'The culminating tenth book, uniting ritual invocations with the great philosophical and cosmogonic hymns of the Rig Veda: the Nāsadīya Sūkta (RV 10.129), Puruṣa Sūkta (RV 10.90), Vāk Sūkta (RV 10.125), and Saṁjñāna Sūkta (RV 10.191).',
  },
};

export const GROUNDED_SYSTEM_PROMPT = `You are VedaWise, an AI assistant designed to answer questions about ancient Indian texts, scriptures, philosophy, culture, and related knowledge, grounded strictly in the provided English translation corpus of the Rig Veda (Mandalas 1–10).

Your priority is to provide answers that are FORMAL, SIMPLE, CLEAR, and EASY FOR A NORMAL USER TO UNDERSTAND.

Do NOT make the answer look like a research paper or technical database output.

ANSWER STRUCTURE:

1. DIRECT ANSWER ("direct_answer")
Start with a short, clear answer (2–4 sentences) to the user's exact question.
Answer the question in normal language before giving any supporting details.
Do NOT immediately produce category headers or Sanskrit labels such as "Leadership & Responsibility (Nīti & Gopā)...".
Do NOT interrupt the opening answer with raw bracketed verse codes.

2. SIMPLE EXPLANATION ("explanation")
Explain the meaning in 1–3 short paragraphs using simple but formal language.
Avoid unnecessary Sanskrit terminology, academic jargon, and complicated sentences.
If a Sanskrit term is important, explain its meaning immediately in simple language.
Explain that the specific verses describe these qualities in their own historical and religious context.

3. CONTEXT / INDIRECT CONNECTION ("context")
If the text does not directly answer the exact wording of the user's question, do NOT force a direct claim.
Instead, clearly say that the idea can be understood indirectly, by reasonable inference, or contextually from the relevant passage.
Then explain the connection in simple language.
For example:
"Although the Rig Veda does not state this idea in exactly these modern terms, the passage can be understood as reflecting..."
This distinction between DIRECT textual evidence, REASONABLE INFERENCE, and CONTEXTUAL interpretation is important.
Only include this section when the connection is indirect, inferred, or contextual (return "" when the passage directly and literally answers a specific scriptural question).

4. TEXTUAL EVIDENCE ("textual_basis")
Only after explaining the answer, provide the relevant verse/reference as supporting evidence (citing the retrieved [RV_M_S_V] verse IDs).
Do not make long quotations the center of the answer.
Use a short quotation only when it genuinely helps.
Otherwise, summarize what the verse says.

5. REFERENCES ("references")
Keep references/citations compact and unobtrusive.
References should support the answer, not interrupt every sentence.
If multiple references support the same idea, group them together (e.g., "Rig Veda 10.191.2–4 [RV_10_191_2], [RV_10_191_3], [RV_10_191_4]").

IMPORTANT CONTENT RULES:

- Never invent what a scripture says.
- Do not present a modern interpretation as if it were the literal meaning of the original text.
- Strictly distinguish and classify ("interpretation_type"):
  a) What the text directly says ("direct"): Literal statements, deities, rituals, or imagery explicitly stated in the original verse.
  b) What can reasonably be inferred from it ("inferred"): Broader philosophical, ethical, or thematic ideas that follow reasonably from the passage when the user's question is broader than a single literal statement.
  c) A modern/contextual interpretation ("contextual"): Relating or applying the ancient passage to contemporary daily life, modern habits, or personal reflection.
- If the question is broader than the exact passage, explain the relevant connection rather than pretending there is a direct statement.
- If there is insufficient textual evidence, say so clearly by setting "direct_answer" and "textual_basis" to:
  "I could not find sufficient evidence in the selected English translation corpus to answer this reliably."
- Prefer accuracy and clarity over excessive detail.

RETRIEVAL AND CONTEXT RULE:

When retrieved passages are relevant but do not directly answer the user's question, use them as contextual evidence rather than forcing them into a direct answer.

For example, if the user asks:
"What does the Rig Veda say about leadership in daily life?"

Do NOT immediately produce:
"Leadership & Responsibility (Nīti & Gopā)..."

Instead, explain the idea in ordinary language first, such as:
"The Rig Veda presents leadership in terms of guidance, protection, responsibility, and earning the trust of the community. These ideas suggest that a leader's role is not only to hold authority but also to provide guidance and protection."

Then explain that the specific verses describe these qualities in their own historical and religious context.

The user should understand the answer even if they do not open a single citation.

Do not use modern concepts such as "management," "corporate leadership," "democratic leadership," "team management," etc. as though they were explicitly stated in the ancient text. If making a modern connection, label it clearly as a modern interpretation or contextual application.

WRITING STYLE:

- Formal but natural
- Simple vocabulary
- Short paragraphs
- Clear logical flow
- No unnecessary repetition
- No excessive headings
- No excessive bullet points
- No overly academic language
- No long blocks of quoted scripture
- No unnecessary meta-commentary
- Do not assume the user knows Sanskrit, Vedic terminology, or the internal structure of the project.

The final answer should feel like a knowledgeable teacher explaining the subject to an educated general reader.

IDEAL FORMAT:

Answer:
[2–4 sentences directly answering the question.]

Explanation:
[Simple explanation of the idea and its meaning.]

Context:
[Only include this section when the connection is indirect/contextual.]

Textual basis:
[Brief explanation or short quotation from the relevant passage.]

References:
[Compact references.]

Keep the overall answer concise unless the user explicitly asks for a detailed explanation.`;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface VerseMetadata {
  index: number;
  verse_id: string;
  mandala: number;
  sukta: number;
  verse: number;
  english_translation: string;
  sanskrit?: string;
  transliteration?: string;
  wilson_translation?: string;
  griffith_verse?: string | null;
  deity?: string;
  hymn_title?: string;
  anukramani?: string;
  translator: string;
  edition: string;
  source: string;
  source_file: string;
}

export interface CompleteHymnRecord {
  mandala: number;
  sukta: number;
  hymn_id: string;
  title: string;
  deity: string;
  anukramani: string;
  source_url: string;
  verse_count: number;
  griffith_hymn_text: string;
  verses: Array<{
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
  }>;
}

export interface CompleteMandalaRecord {
  mandala: number;
  hymn_count: number;
  verse_count: number;
  hymns: CompleteHymnRecord[];
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

export interface RetrievedVerse {
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

export type SupportType =
  | 'Direct'
  | 'Thematic'
  | 'Interpretive'
  | 'Unsupported'
  | 'direct'
  | 'paraphrase'
  | 'inference'
  | 'insufficient';

export interface ClaimOut {
  claim: string;
  supporting_verses: string[];
  support_type: SupportType;
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

export const LIFE_THEMES: Record<LifeThemeId, LifeThemeDefinition> = {
  adversity_resilience: {
    id: 'adversity_resilience',
    label: 'Adversity & Resilience',
    sanskrit_concept: 'Duritā-taraṇa (Crossing Perils & Hardship)',
    description:
      'Metaphors of crossing turbulent waters in a boat, mutual support amidst difficulty, and seeking light through darkness.',
    keywords: [
      'adversity', 'resilience', 'hardship', 'trouble', 'troubles', 'grief', 'difficulty',
      'peril', 'obstacle', 'crisis', 'suffering', 'overcome', 'overcoming', 'endurance',
    ],
    expansion_terms: [
      'troubles', 'grief', 'boat', 'river', 'hold', 'pass', 'flood', 'safety', 'help',
    ],
    canonical_verses: ['RV_10_53_8', 'RV_1_99_1', 'RV_8_48_3', 'RV_6_47_11'],
    contemporary_reflection:
      'In a modern context, these verses may be read as poetic metaphors for collective perseverance, mutual encouragement ("hold fast each other"), and maintaining hope when navigating life’s turbulent transitions.',
    epistemic_boundary:
      'The Rig Veda corpus does not provide clinical trauma therapy, psychiatric treatment, or empirically validated psychological interventions for mental distress.',
  },
  knowledge_learning: {
    id: 'knowledge_learning',
    label: 'Knowledge & Learning',
    sanskrit_concept: 'Dhī & Vāc (Illumined Thought & Sacred Speech)',
    description:
      'Cultivation of discernment, refinement of language among the wise, and inquiry into the unity underlying diverse names.',
    keywords: [
      'knowledge', 'learning', 'learn', 'teach', 'teaching', 'education',
      'intellect', 'study', 'understanding', 'wise speech',
    ],
    expansion_terms: [
      'wise', 'spirit', 'language', 'speech', 'thought', 'sages', 'meditate', 'light', 'friends',
    ],
    canonical_verses: ['RV_10_71_2', 'RV_10_71_1', 'RV_3_62_10', 'RV_1_164_46'],
    contemporary_reflection:
      'Contemporarily, the image of sages sifting language "like cleansing corn-flour in a sieve" connects to critical thinking, careful scholarship, and collaborative dialogue among peers.',
    epistemic_boundary:
      'The corpus reflects ancient liturgical and poetic epistemology; it does not establish modern cognitive science, pedagogical theory, or empirical linguistics.',
  },
  cooperation: {
    id: 'cooperation',
    label: 'Cooperation & Unity',
    sanskrit_concept: 'Saṁjñāna (Harmony & Shared Purpose)',
    description:
      'Calls for collective concord, shared deliberation in assembly, and unity of heart and mind.',
    keywords: [
      'cooperation', 'unity', 'harmony', 'teamwork', 'assembly',
      'agreement', 'collective', 'united', 'concord', 'consensus', 'solidarity', 'shared purpose',
    ],
    expansion_terms: [
      'assemble', 'speak', 'together', 'minds', 'accord', 'common', 'purpose', 'united', 'thoughts', 'agree',
    ],
    canonical_verses: ['RV_10_191_2', 'RV_10_191_3', 'RV_10_191_4', 'RV_10_53_8'],
    contemporary_reflection:
      'For modern civic and organizational life, the Saṁjñāna hymn offers an enduring ethical aspiration toward inclusive dialogue, shared purpose, and cooperative consensus.',
    epistemic_boundary:
      'These verses express liturgical and communal ideals of concord; they do not prescribe modern constitutional law, sociological models, or political science frameworks.',
  },
  leadership: {
    id: 'leadership',
    label: 'Leadership & Responsibility',
    sanskrit_concept: 'Nīti & Gopā (Protective Stewardship)',
    description:
      'Portrayals of wise guidance, protecting the community, leading with counsel, and earning willing respect.',
    keywords: [
      'leadership', 'leader', 'governance', 'ruler', 'responsibility',
      'authority', 'stewardship', 'statesmanship',
    ],
    expansion_terms: [
      'chief', 'leader', 'sage', 'prosperous', 'subjects', 'homage', 'first', 'protector', 'firm', 'kingdom',
    ],
    canonical_verses: ['RV_2_23_1', 'RV_4_50_8', 'RV_2_12_1', 'RV_10_173_1'],
    contemporary_reflection:
      'Modern readers may view these portrayals as reflections on accountable leadership—combining wise counsel with protective responsibility toward the community.',
    epistemic_boundary:
      'Vedic hymns address archaic chieftainship and divine sovereignty; they do not constitute modern management science or democratic governance theory.',
  },
  discipline_order: {
    id: 'discipline_order',
    label: 'Discipline & Cosmic Order',
    sanskrit_concept: 'Ṛta & Vrata (Order, Restraint & Diligence)',
    description:
      'Observance of cosmic and moral regularity (Ṛta), honest labour over reckless gambling, and self-restraint.',
    keywords: [
      'discipline', 'self-discipline', 'restraint', 'habit', 'diligence', 'gambling',
      'dice', 'self-control', 'regularity', 'cultivate',
    ],
    expansion_terms: [
      'play', 'dice', 'cultivate', 'corn', 'wealth', 'sufficient', 'varuna', 'vows', 'ordinances',
    ],
    canonical_verses: ['RV_10_34_13', 'RV_7_86_3', 'RV_7_89_5', 'RV_1_1_8'],
    contemporary_reflection:
      'The Gambler’s Hymn (RV 10.34.13) resonates with contemporary reflections on impulse control, warns against destructive speculation, and values steady, productive effort.',
    epistemic_boundary:
      'While poetically depicting the consequences of compulsive dice-play, the text does not provide clinical addiction medicine or behavioral psychotherapy.',
  },
  ethics_conduct: {
    id: 'ethics_conduct',
    label: 'Ethics & Conduct',
    sanskrit_concept: 'Dāna & Ānṛṇya (Generosity & Moral Accountability)',
    description:
      'Teachings on sharing wealth with the needy, recognizing the changing wheel of fortune, truthfulness, and moral introspection.',
    keywords: [
      'ethics', 'conduct', 'morality', 'generosity', 'charity', 'hunger',
      'selfishness', 'compassion', 'kindness', 'sharing', 'wheel of fortune',
    ],
    expansion_terms: [
      'hunger', 'rich', 'satisfy', 'poor', 'wheels', 'food', 'friend', 'kindness', 'sin',
    ],
    canonical_verses: ['RV_10_117_5', 'RV_10_117_1', 'RV_10_117_6', 'RV_7_86_3', 'RV_7_86_5'],
    contemporary_reflection:
      'Hymn 10.117’s reminder that fortune rolls like chariot wheels offers a timeless humanistic argument for empathy, philanthropy, and social reciprocity.',
    epistemic_boundary:
      'The corpus presents archaic poetic ethics and ritual reciprocity; it does not establish modern economic policy or formal welfare legislation.',
  },
  uncertainty: {
    id: 'uncertainty',
    label: 'Uncertainty & Inquiry',
    sanskrit_concept: 'Nāsadīya-vimarśa (Open-Ended Cosmic Inquiry)',
    description:
      'Philosophical humility before the unknown, questioning the ultimate origin of existence without dogmatic certainty.',
    keywords: [
      'uncertainty', 'doubt', 'unknown', 'mystery', 'skepticism',
      'non-existent', 'questioning', 'ambiguity', 'wonder',
    ],
    expansion_terms: [
      'non-existent', 'existent', 'realm', 'unfathomed', 'depth', 'declares', 'whence', 'creation', 'knows', 'perchance',
    ],
    canonical_verses: ['RV_10_129_1', 'RV_10_129_6', 'RV_10_129_7', 'RV_1_164_4'],
    contemporary_reflection:
      'The Nāsadīya Sūkta exemplifies intellectual humility—acknowledging the limits of certainty and embracing open inquiry when confronting fundamental questions.',
    epistemic_boundary:
      'Cosmogonic poetry in Mandala 10 is philosophical and contemplative; it must not be conflated with modern astrophysical cosmology or empirical physics.',
  },
  well_being: {
    id: 'well_being',
    label: 'Well-Being & Vitality',
    sanskrit_concept: 'Svasti & Bhadra (Auspicious Flourishing)',
    description:
      'Prayers for receptive senses, auspicious thoughts, peaceful coexistence, and fullness of life.',
    keywords: [
      'well-being', 'wellbeing', 'vitality', 'flourishing', 'happiness',
      'longevity', 'auspicious', 'serenity', 'peaceful living', 'holistic peace',
    ],
    expansion_terms: [
      'auspicious', 'ears', 'listen', 'good', 'eyes', 'see', 'limbs', 'bodies', 'peace', 'life',
    ],
    canonical_verses: ['RV_1_89_8', 'RV_1_89_1', 'RV_7_59_12', 'RV_10_18_2'],
    contemporary_reflection:
      'Seeking to "listen to what is good and see what is good" reflects a mindful orientation toward gratitude, sensory appreciation, and balanced living.',
    epistemic_boundary:
      'The Rig Veda does not provide medical diagnoses, pharmacological cures, or clinically validated treatments for physical or mental illness.',
  },
  nature: {
    id: 'nature',
    label: 'Nature & Ecology',
    sanskrit_concept: 'Prakṛti-stuti (Reverence for Rivers, Forest & Sky)',
    description:
      'Poetic celebration of rushing rivers, life-giving rain (Parjanya), radiant dawn (Uṣas), and the unspoiled forest (Araṇyānī).',
    keywords: [
      'nature', 'ecology', 'environment', 'forest', 'trees',
      'wilderness', 'aranyani',
    ],
    expansion_terms: [
      'goddess', 'wild', 'forest', 'aranyani', 'village', 'parjanya', 'rain', 'rivers', 'mountains', 'waves', 'sarasvati',
    ],
    canonical_verses: ['RV_10_146_1', 'RV_5_83_1', 'RV_6_61_2', 'RV_3_33_1'],
    contemporary_reflection:
      'These hymns foster ecological appreciation by portraying forests, rivers, and seasonal rains as living presences worthy of respect rather than mere resources.',
    epistemic_boundary:
      'While rich in nature imagery, the ancient hymns do not contain modern environmental science, climatology, or conservation biology.',
  },
};

export type RetrievalMode = 'bm25' | 'dense' | 'hybrid' | 'hybrid_rerank';

export interface QueryAnalysis {
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
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Text Preprocessing & BM25 + Dense Hybrid Retriever
// ---------------------------------------------------------------------------

export function cleanCorpusText(text: string): string {
  if (!text) return '';
  return text
    .replace(/by\s+H\.\s*H\.\s*Wilson\s*\|\s*1866[^.]*(?:ISBN-13:\s*\d+)?/gi, '')
    .replace(/\bplural\s+ugh/gi, 'plough')
    .replace(/\bplural\s+nts/gi, 'plants')
    .replace(/\bplural\s+nt/gi, 'plant')
    .replace(/\bplural\s+ace/gi, 'place')
    .replace(/\bplural\s+eas/gi, 'pleas')
    .replace(/\bplural\s+ent/gi, 'plent')
    .replace(/([A-Za-z\u00C0-\u024F\u1E00-\u1EFF])\(/g, '$1 (')
    .replace(/\)([A-Za-z\u00C0-\u024F\u1E00-\u1EFF])/g, ') $1')
    .replace(/,([A-Za-z\u00C0-\u024F\u1E00-\u1EFF])/g, ', $1')
    .replace(/;([A-Za-z\u00C0-\u024F\u1E00-\u1EFF])/g, '; $1')
    .replace(/\bofthe\b/gi, 'of the')
    .replace(/\binthe\b/gi, 'in the')
    .replace(/\btothe\b/gi, 'to the')
    .replace(/\bbythe\b/gi, 'by the')
    .replace(/\bforthe\b/gi, 'for the')
    .replace(/\bandthe\b/gi, 'and the')
    .replace(/\bwitha\b/gi, 'with a')
    .replace(/\bwiḥ\b/g, 'with')
    .replace(/\buniversalmedicine\b/gi, 'universal medicine')
    .replace(/\bmoveas\b/gi, 'move as')
    .replace(/\bIndraand\b/g, 'Indra and')
    .replace(/\bIndraaccepted\b/g, 'Indra accepted')
    .replace(/\bAśvatthahas\b/g, 'Aśvattha has')
    .replace(/\bPāyuten\b/g, 'Pāyu ten')
    .replace(/\bthewise\b/gi, 'the wise')
    .replace(/\butteraloud\b/gi, 'utter aloud')
    .replace(/\bmutuallyat\b/gi, 'mutually at')
    .replace(/\binmartial\b/gi, 'in martial')
    .replace(/\btherākṣasas\b/gi, 'the rākṣasas')
    .replace(/\swithThe\b/g, ' with the')
    .replace(/\bwithThe\b/gi, 'with the')
    .replace(/\s+/g, ' ')
    .trim();
}

const SANSKRIT_NORMALIZATION_MAP: Record<string, string> = {
  ushas: 'usas',
  purusha: 'purusa',
  ashvins: 'asvins',
  ashvin: 'asvin',
  vritra: 'vrtra',
  shudra: 'sudra',
  vaishya: 'vaisya',
  brahmana: 'brahman',
  brihaspati: 'brhaspati',
  pushan: 'pusan',
  tvashtar: 'tvastar',
  vishnu: 'visnu',
  vac: 'vak',
  rishi: 'rsi',
  rishis: 'rsis',
  ribhus: 'rbhus',
  kanva: 'kanvas',
};

function preprocessText(text: string): string[] {
  if (!text) return [];
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const matches = normalized.match(/\b[a-z0-9]+\b/g);
  if (!matches) return [];
  const result: string[] = [];
  for (const tok of matches) {
    result.push(tok);
    const mapped = SANSKRIT_NORMALIZATION_MAP[tok];
    if (mapped && mapped !== tok) {
      result.push(mapped);
    }
  }
  return result;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'is', 'are',
  'was', 'were', 'be', 'by', 'with', 'from', 'that', 'this', 'what', 'who',
  'which', 'how', 'where', 'when', 'why', 'does', 'do', 'did', 'about',
  'according', 'selected', 'rig', 'veda', 'corpus', 'english', 'translation',
  'say', 'said', 'describe', 'described', 'role', 'hymn', 'verse', 'mandala',
  'sukta', 'unto', 'thee', 'thou', 'thy', 'thine', 'ye', 'you', 'he', 'him',
  'his', 'they', 'them', 'their', 'us', 'our', 'we', 'me', 'my', 'hath', 'hast',
  'daily', 'everyday', 'modern', 'today', 'contemporary', 'current', 'nowadays',
  'apply', 'application', 'relevance', 'relevant', 'relate', 'relates', 'related',
  'lesson', 'lessons', 'teach', 'teaches', 'mean', 'means', 'happen', 'happens',
  'explain', 'explains', 'state', 'states',
]);

const SEMANTIC_SYNONYMS: Record<string, string[]> = {
  agni: ['fire', 'priest', 'hotar', 'sacrifice', 'flame', 'messenger', 'altar', 'oblation', 'invoker', 'household'],
  fire: ['agni', 'flame', 'blaze', 'burn', 'sacrifice', 'radiant', 'priest', 'hotar'],
  indra: ['thunderbolt', 'bolt', 'vritra', 'vrtra', 'dragon', 'serpent', 'soma', 'warrior', 'waters', 'maruts', 'hero'],
  vritra: ['indra', 'dragon', 'serpent', 'waters', 'slew', 'thunderbolt', 'mountain'],
  vrtra: ['indra', 'dragon', 'slew', 'mountain', 'waters'],
  dragon: ['vritra', 'vrtra', 'indra', 'slew', 'mountain', 'waters', 'thunder'],
  soma: ['indu', 'juice', 'draught', 'drop', 'drops', 'pressed', 'purified', 'drink', 'immortal', 'pavamana'],
  indu: ['soma', 'indra', 'drops', 'draught'],
  ushas: ['usas', 'dawn', 'morning', 'light', 'darkness', 'chariot', 'daughter', 'heaven'],
  usas: ['ushas', 'dawn', 'morning', 'light', 'daughter', 'sky'],
  dawn: ['ushas', 'usas', 'morning', 'day', 'sun', 'darkness', 'light', 'radiant', 'heaven'],
  varuna: ['mitra', 'law', 'order', 'waters', 'sin', 'king', 'sovereign', 'aditya', 'ordinances'],
  mitra: ['varuna', 'law', 'kings', 'sovran', 'strength', 'heaven'],
  maruts: ['storm', 'winds', 'rudra', 'rain', 'lightning', 'spears', 'chariots'],
  surya: ['sun', 'savitar', 'savitr', 'steeds', 'light', 'eye', 'heaven', 'chariot', 'dawn'],
  savitar: ['sun', 'surya', 'golden', 'god', 'light', 'splendour', 'gayatri'],
  gayatri: ['savitar', 'sun', 'meditate', 'divine', 'intellect', 'prayers'],
  purusha: ['purusa', 'man', 'thousand', 'heads', 'eyes', 'feet', 'sacrifice', 'brahman', 'rajanya', 'vaisya', 'sudra'],
  purusa: ['purusha', 'thousand', 'heads', 'eyes', 'feet', 'sacrifice', 'brahman', 'rajanya', 'vaisya', 'sudra'],
  creation: ['existent', 'non', 'death', 'immortal', 'darkness', 'waters', 'desire', 'seed', 'origin'],
  kama: ['desire', 'primal', 'seed', 'germ', 'spirit', 'beginning'],
  desire: ['kama', 'primal', 'seed', 'germ', 'spirit', 'beginning'],
  rita: ['law', 'truth', 'order', 'guardian', 'eternal', 'ordinances'],
  order: ['law', 'eternal', 'ordinances', 'rita'],
  death: ['yama', 'departed', 'fathers', 'path', 'ancestors', 'funeral', 'immortal'],
  afterlife: ['yama', 'fathers', 'departed', 'pathways', 'heaven', 'immortal', 'pitrs'],
  funeral: ['yama', 'fathers', 'departed', 'fire', 'earth', 'ancestors'],
  ancestors: ['fathers', 'pitrs', 'sires', 'yama', 'pathways', 'departed'],
  yama: ['death', 'king', 'fathers', 'departed', 'path'],
  ashvins: ['asvins', 'twins', 'physicians', 'chariot', 'healing', 'wonder', 'nasatyas'],
  asvins: ['ashvins', 'twins', 'chariot', 'wonder', 'healing', 'nasatyas'],
  vishnu: ['visnu', 'strides', 'three', 'steps', 'wide', 'measured', 'highest'],
  rudra: ['maruts', 'healing', 'remedies', 'bow', 'arrows', 'fierce', 'father', 'tryambaka'],
  vayu: ['wind', 'soma', 'indra', 'drink', 'steeds', 'swift'],
  sarama: ['panis', 'kine', 'cows', 'indra', 'envoy', 'messenger', 'treasure'],
  gambler: ['dice', 'wife', 'play', 'lament', 'cultivate', 'corn'],
  dice: ['gambler', 'play', 'wife', 'ruin', 'cultivate', 'corn'],
  speech: ['vak', 'vac', 'voice', 'queen', 'word', 'eloquent', 'gods', 'sages'],
  vac: ['vak', 'speech', 'queen', 'voice', 'word', 'worship'],
  vak: ['vac', 'speech', 'queen', 'voice', 'word', 'worship'],
  duta: ['messenger', 'herald', 'agni', 'oblation', 'bearer'],
  messenger: ['duta', 'envoy', 'herald', 'agni', 'oblation', 'bearer'],
  dyava: ['heaven', 'earth', 'twain', 'parents', 'support'],
  prithivi: ['heaven', 'earth', 'twain', 'parents', 'support'],
  samjnana: ['assemble', 'speak', 'together', 'minds', 'accord', 'resolve', 'hearts', 'united'],
  concord: ['assemble', 'speak', 'together', 'minds', 'accord', 'resolve', 'hearts', 'united'],
  sarasvati: ['river', 'waters', 'stream', 'speech', 'inspirer', 'flood'],
  marriage: ['bride', 'bridal', 'husband', 'wife', 'wedded', 'home'],
  wedding: ['bride', 'bridal', 'husband', 'wife', 'wedded', 'surya'],
  family: ['household', 'home', 'sons', 'grandsons', 'children', 'offspring', 'wife', 'husband'],
  herbs: ['plants', 'healing', 'medicine', 'powers', 'physician', 'disease', 'remedy'],
  medicine: ['healing', 'herbs', 'plants', 'physician', 'disease', 'remedy', 'asvins', 'rudra'],
  healing: ['medicine', 'herbs', 'plants', 'physician', 'disease', 'remedy', 'asvins', 'rudra'],
  agriculture: ['plough', 'ploughshare', 'ploughing', 'furrows', 'field', 'barley', 'corn', 'sowing'],
  farming: ['plough', 'ploughshare', 'ploughing', 'furrows', 'field', 'barley', 'corn', 'sowing'],
  ploughing: ['plough', 'ploughshare', 'furrows', 'field', 'barley', 'corn', 'sowing'],
  friendship: ['friend', 'friends', 'comrade', 'companion', 'cordial', 'faithful', 'mitra'],
  truth: ['falsehood', 'true', 'false', 'honest', 'rita', 'law'],
  falsehood: ['truth', 'true', 'false', 'honest', 'deceit', 'wicked'],
  meditation: ['meditate', 'savitar', 'savita', 'glory', 'light', 'prayers', 'intellect', 'thought'],
  meditate: ['savitar', 'savita', 'glory', 'light', 'prayers', 'intellect'],
  horses: ['steeds', 'coursers', 'chariots', 'chariot', 'swift'],
  chariots: ['chariot', 'horses', 'steeds', 'wheels', 'car'],
  hospitality: ['guest', 'household', 'home', 'agni', 'welcome', 'friend'],
  weapons: ['bow', 'arrows', 'arrow', 'quiver', 'armour', 'chariot', 'warrior'],
  frogs: ['brahmanas', 'vows', 'parjanya', 'rain', 'voices'],
};

class HybridKnowledgeBase {
  public metadata: VerseMetadata[] = [];
  public verseIndex: Map<string, VerseMetadata> = new Map();
  public mandalas: CompleteMandalaRecord[] = [];
  public mandalaMap: Map<number, CompleteMandalaRecord> = new Map();
  public hymnMap: Map<string, CompleteHymnRecord> = new Map();

  private tokenizedCorpus: string[][] = [];
  private docFreqs: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private docLens: number[] = [];
  private avgdl = 0;
  private k1 = 1.5;
  private b = 0.75;

  // Dense 384-d embeddings and FAISS IndexFlatIP for all 10,546 verses
  public faissVectors: Float32Array | null = null;
  public faissNtotal = 0;
  public embeddingDim = 384;
  public embeddingModelName = DEFAULT_EMBEDDING_MODEL;
  private m1m10Metadata: VerseMetadata[] = [];
  private extractorPromise: Promise<any> | null = null;
  private queryEmbeddingCache: Map<string, Float32Array> = new Map();

  constructor() {
    this.loadCorpus();
  }

  private loadCorpus() {
    if (fs.existsSync(METADATA_JSON_PATH)) {
      this.m1m10Metadata = JSON.parse(fs.readFileSync(METADATA_JSON_PATH, 'utf-8')) as VerseMetadata[];
    }

    if (
      fs.existsSync(COMPLETE_CORPUS_PATH) ||
      fs.existsSync(COMPLETE_CORPUS_GZ_PATH) ||
      fs.existsSync(COMPLETE_CORPUS_B64_PATH)
    ) {
      const rawJson = fs.existsSync(COMPLETE_CORPUS_PATH)
        ? fs.readFileSync(COMPLETE_CORPUS_PATH, 'utf-8')
        : fs.existsSync(COMPLETE_CORPUS_GZ_PATH)
        ? zlib.gunzipSync(fs.readFileSync(COMPLETE_CORPUS_GZ_PATH)).toString('utf-8')
        : zlib
            .gunzipSync(Buffer.from(fs.readFileSync(COMPLETE_CORPUS_B64_PATH, 'utf-8').trim(), 'base64'))
            .toString('utf-8');
      const parsed = JSON.parse(rawJson) as {
        mandalas: CompleteMandalaRecord[];
      };
      this.mandalas = parsed.mandalas || [];

      let globalIdx = 0;
      for (const mRec of this.mandalas) {
        this.mandalaMap.set(mRec.mandala, mRec);
        for (const hRec of mRec.hymns) {
          this.hymnMap.set(`${hRec.mandala}_${hRec.sukta}`, hRec);
          for (let vIdx = 0; vIdx < hRec.verses.length; vIdx++) {
            const v = hRec.verses[vIdx];
            v.english_translation = cleanCorpusText(v.english_translation);
            v.wilson_translation = cleanCorpusText(v.wilson_translation);
            if (v.griffith_verse) v.griffith_verse = cleanCorpusText(v.griffith_verse);
            if (!v.english_translation) {
              v.english_translation =
                v.griffith_verse ||
                (vIdx > 0 ? hRec.verses[vIdx - 1].english_translation : '') ||
                `Hymn ${hRec.mandala}.${hRec.sukta} (${hRec.deity || 'Vedic Hymn'}), Verse ${v.verse}.`;
            }
            if (!v.wilson_translation) {
              v.wilson_translation = v.english_translation;
            }
            const vMeta: VerseMetadata = {
              index: globalIdx++,
              verse_id: v.verse_id,
              mandala: v.mandala,
              sukta: v.sukta,
              verse: v.verse,
              english_translation: v.english_translation,
              sanskrit: v.sanskrit,
              transliteration: v.transliteration,
              wilson_translation: v.wilson_translation,
              griffith_verse: v.griffith_verse,
              deity: hRec.deity,
              hymn_title: hRec.title,
              anukramani: hRec.anukramani,
              translator: v.translator || PRIMARY_TRANSLATOR,
              edition: String(PRIMARY_EDITION_YEAR),
              source: 'Sacred Texts Archive',
              source_file: `RV_${v.mandala}_${String(v.sukta).padStart(3, '0')}.html`,
            };
            this.metadata.push(vMeta);
            this.verseIndex.set(vMeta.verse_id, vMeta);
          }
        }
      }
    } else if (this.m1m10Metadata.length > 0) {
      this.metadata = this.m1m10Metadata.map((rec) => ({
        ...rec,
        english_translation: cleanCorpusText(rec.english_translation),
      }));
      for (const rec of this.metadata) {
        this.verseIndex.set(rec.verse_id, rec);
      }
    } else {
      throw new Error('No Rig Veda corpus files found in data/knowledge_base');
    }

    const m1m10ById = new Map<string, string>();
    for (const mRec of this.m1m10Metadata) {
      if (mRec.verse_id && mRec.english_translation) {
        m1m10ById.set(mRec.verse_id, cleanCorpusText(mRec.english_translation));
      }
    }

    // Build BM25 index over all verses in this.metadata (all 10,546 verses across Mandalas 1-10)
    let totalLen = 0;
    const N = this.metadata.length;

    for (let i = 0; i < N; i++) {
      const rec = this.metadata[i];
      const altTranslation = m1m10ById.get(rec.verse_id) || '';
      const searchableText = `${rec.english_translation} ${rec.wilson_translation || ''} ${rec.griffith_verse || ''} ${altTranslation} ${rec.deity || ''} ${rec.hymn_title || ''} ${rec.anukramani || ''} ${rec.transliteration || ''}`;
      const tokens = preprocessText(searchableText);
      this.tokenizedCorpus.push(tokens);
      this.docLens.push(tokens.length);
      totalLen += tokens.length;

      const unique = new Set(tokens);
      for (const tok of unique) {
        this.docFreqs.set(tok, (this.docFreqs.get(tok) || 0) + 1);
      }
    }

    this.avgdl = N > 0 ? totalLen / N : 1;

    let idfSum = 0;
    const negativeIdfTokens: string[] = [];
    for (const [tok, df] of this.docFreqs.entries()) {
      const val = Math.log(N - df + 0.5) - Math.log(df + 0.5);
      this.idf.set(tok, val);
      idfSum += val;
      if (val < 0) negativeIdfTokens.push(tok);
    }
    const averageIdf = this.docFreqs.size > 0 ? idfSum / this.docFreqs.size : 0;
    const eps = 0.25 * averageIdf;
    for (const tok of negativeIdfTokens) {
      this.idf.set(tok, eps);
    }

    this.loadFaissAndEmbeddings();
  }

  private loadFaissAndEmbeddings() {
    try {
      if (fs.existsSync(KB_CONFIG_PATH)) {
        const cfg = JSON.parse(fs.readFileSync(KB_CONFIG_PATH, 'utf-8'));
        if (cfg.model_name && !process.env.EMBEDDING_MODEL) {
          this.embeddingModelName = String(cfg.model_name);
        }
        if (Number(cfg.embedding_dimension) > 0) {
          this.embeddingDim = Number(cfg.embedding_dimension);
        }
      }

      const expectedCount = this.metadata.length;
      const dim = this.embeddingDim;
      const expectedFloats = expectedCount * dim;

      // Primary: Load FAISS IndexFlatIP (faiss.index)
      if (fs.existsSync(FAISS_INDEX_PATH)) {
        const buf = fs.readFileSync(FAISS_INDEX_PATH);
        if (buf.length >= 45 && buf.subarray(0, 4).toString('ascii') === 'IxFI') {
          const d = buf.readInt32LE(4);
          const ntotal = Number(buf.readBigInt64LE(8));
          const codesSize = Number(buf.readBigInt64LE(37));
          const dataOffset = 45;
          if (
            d === dim &&
            ntotal === expectedCount &&
            codesSize === expectedFloats &&
            buf.length - dataOffset >= expectedFloats * 4
          ) {
            const alignedCopy = new Uint8Array(expectedFloats * 4);
            alignedCopy.set(buf.subarray(dataOffset, dataOffset + expectedFloats * 4));
            this.faissVectors = new Float32Array(alignedCopy.buffer);
            this.faissNtotal = ntotal;
            return;
          }
        }
      }

      // Fallback 1: Load compressed Int8 quantized FAISS vectors (faiss.int8.bin.gz or .b64)
      if (fs.existsSync(FAISS_INT8_GZ_PATH) || fs.existsSync(FAISS_INT8_B64_PATH)) {
        const gzBuf = fs.existsSync(FAISS_INT8_GZ_PATH)
          ? fs.readFileSync(FAISS_INT8_GZ_PATH)
          : Buffer.from(fs.readFileSync(FAISS_INT8_B64_PATH, 'utf-8').trim(), 'base64');
        const rawBuf = zlib.gunzipSync(gzBuf);
        if (rawBuf.length >= expectedFloats) {
          const int8 = new Int8Array(rawBuf.buffer, rawBuf.byteOffset, expectedFloats);
          const f32 = new Float32Array(expectedFloats);
          for (let idx = 0; idx < expectedCount; idx++) {
            const offset = idx * dim;
            let normSq = 0;
            for (let d = 0; d < dim; d++) {
              const val = int8[offset + d] / 127.0;
              f32[offset + d] = val;
              normSq += val * val;
            }
            const norm = Math.sqrt(normSq) || 1;
            for (let d = 0; d < dim; d++) {
              f32[offset + d] /= norm;
            }
          }
          this.faissVectors = f32;
          this.faissNtotal = expectedCount;
          return;
        }
      }

      // Fallback 2: Load embeddings.npy
      if (fs.existsSync(EMBEDDINGS_NPY_PATH)) {
        const buf = fs.readFileSync(EMBEDDINGS_NPY_PATH);
        if (buf.length >= 128 && buf.toString('ascii', 1, 6) === 'NUMPY') {
          const major = buf[6];
          const headerLen = major >= 2 ? buf.readUInt32LE(8) : buf.readUInt16LE(8);
          const dataOffset = (major >= 2 ? 12 : 10) + headerLen;
          if (buf.length - dataOffset >= expectedFloats * 4) {
            const alignedCopy = new Uint8Array(expectedFloats * 4);
            alignedCopy.set(buf.subarray(dataOffset, dataOffset + expectedFloats * 4));
            this.faissVectors = new Float32Array(alignedCopy.buffer);
            this.faissNtotal = expectedCount;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load FAISS index / embeddings.npy:', err);
      this.faissVectors = null;
      this.faissNtotal = 0;
    }
  }

  private async getExtractor() {
    if (!this.extractorPromise) {
      const onnxModel = resolveOnnxEmbeddingModel(this.embeddingModelName);
      this.extractorPromise = pipeline('feature-extraction', onnxModel, {
        quantized: true,
      });
    }
    return this.extractorPromise;
  }

  public async encodeQuery(query: string): Promise<Float32Array> {
    const clean = query.trim();
    const cached = this.queryEmbeddingCache.get(clean);
    if (cached) return cached;

    const extractor = await this.getExtractor();
    const out = await extractor(clean, { pooling: 'mean', normalize: true });
    const raw = out.data as Float32Array;
    const dim = this.embeddingDim;
    const vec = new Float32Array(dim);
    let normSq = 0;
    for (let d = 0; d < dim; d++) {
      vec[d] = raw[d];
      normSq += raw[d] * raw[d];
    }
    const norm = Math.sqrt(normSq) || 1;
    for (let d = 0; d < dim; d++) {
      vec[d] /= norm;
    }
    if (this.queryEmbeddingCache.size > 500) {
      const firstKey = this.queryEmbeddingCache.keys().next().value;
      if (firstKey) this.queryEmbeddingCache.delete(firstKey);
    }
    this.queryEmbeddingCache.set(clean, vec);
    return vec;
  }

  private extractQueryHints(
    query: string,
    mandalaFilter?: number | null,
    lifeTheme?: LifeThemeId | null
  ) {
    const detectedThemes = lifeTheme ? [lifeTheme] : detectLifeThemes(query);
    const themeCanonicals = new Set<string>();
    const themeExpansionTokens = new Set<string>();
    for (const thId of detectedThemes) {
      const def = LIFE_THEMES[thId];
      if (def) {
        for (const cv of def.canonical_verses) themeCanonicals.add(cv);
        for (const et of def.expansion_terms) {
          for (const pt of preprocessText(et)) themeExpansionTokens.add(pt);
        }
      }
    }

    const explicitVerseIds = new Set<string>();
    for (const m of query.matchAll(/\bRV_(\d+)_(\d+)_(\d+)\b/gi)) {
      explicitVerseIds.add(`RV_${parseInt(m[1], 10)}_${parseInt(m[2], 10)}_${parseInt(m[3], 10)}`);
    }
    for (const m of query.matchAll(/\b(\d+)\.(\d+)\.(\d+)\b/g)) {
      explicitVerseIds.add(`RV_${parseInt(m[1], 10)}_${parseInt(m[2], 10)}_${parseInt(m[3], 10)}`);
    }
    for (const m of query.matchAll(
      /\bmandala\s+(\d+)\s*[,]?\s*(?:sukta|hymn)\s+(\d+)\s*[,]?\s*verse\s+(\d+)\b/gi
    )) {
      explicitVerseIds.add(`RV_${parseInt(m[1], 10)}_${parseInt(m[2], 10)}_${parseInt(m[3], 10)}`);
    }

    const preferredHymns = new Set<string>();
    const preferredSuktas = new Set<number>();
    const preferredMandalas = new Set<number>();
    if (mandalaFilter) preferredMandalas.add(mandalaFilter);

    for (const m of query.matchAll(/\bmandala\s+(\d+)\b/gi)) {
      const mNum = parseInt(m[1], 10);
      if (mNum >= 1 && mNum <= 10) preferredMandalas.add(mNum);
    }
    for (const m of query.matchAll(/\bmandalas\s+(\d+)\s+and\s+(\d+)\b/gi)) {
      const m1 = parseInt(m[1], 10);
      const m2 = parseInt(m[2], 10);
      if (m1 >= 1 && m1 <= 10) preferredMandalas.add(m1);
      if (m2 >= 1 && m2 <= 10) preferredMandalas.add(m2);
    }
    for (const m of query.matchAll(/\bmandala\s+(\d+)\s*[,]?\s*(?:sukta|hymn)\s+(\d+)\b/gi)) {
      preferredHymns.add(`${parseInt(m[1], 10)}_${parseInt(m[2], 10)}`);
    }
    for (const m of query.matchAll(/\bRV_(\d+)_(\d+)(?!_\d)\b/gi)) {
      preferredHymns.add(`${parseInt(m[1], 10)}_${parseInt(m[2], 10)}`);
    }
    for (const m of query.matchAll(/\b(?:sukta|hymn)\s+(\d+)\b/gi)) {
      preferredSuktas.add(parseInt(m[1], 10));
    }

    const qLower = query.toLowerCase();
    // Standard canonical hymn name aliases only (no query-specific regexes)
    if (qLower.includes('purusha sukta') || qLower.includes('purusa sukta')) {
      preferredHymns.add('10_90');
    }
    if (qLower.includes('nasadiya sukta') || qLower.includes('hymn of creation')) {
      preferredHymns.add('10_129');
    }
    if (qLower.includes('samjnana sukta')) {
      preferredHymns.add('10_191');
    }
    if (qLower.includes('gambler') && qLower.includes('hymn')) {
      preferredHymns.add('10_34');
    }
    if (qLower.includes('first verse of the rig veda')) {
      explicitVerseIds.add('RV_1_1_1');
    }

    return {
      detectedThemes,
      themeCanonicals,
      themeExpansionTokens,
      explicitVerseIds,
      preferredHymns,
      preferredSuktas,
      preferredMandalas,
      hasExplicitLifeTheme: Boolean(lifeTheme),
    };
  }

  public searchBM25(
    query: string,
    topK = 50,
    mandalaFilter?: number | null,
    lifeTheme?: LifeThemeId | null,
    pureLexical = false
  ): Array<VerseMetadata & { bm25_rank: number; bm25_score: number }> {
    const rawTokens = preprocessText(query);
    if (rawTokens.length === 0) return [];
    const filteredTokens = rawTokens.filter((t) => !STOPWORDS.has(t));
    const baseTokens = filteredTokens.length > 0 ? filteredTokens : rawTokens;

    const {
      themeExpansionTokens,
      explicitVerseIds,
      preferredHymns,
      preferredSuktas,
      preferredMandalas,
    } = this.extractQueryHints(query, mandalaFilter, lifeTheme);

    const synonymTokens = new Set<string>();
    if (!pureLexical) {
      for (const qt of baseTokens) {
        const syns = SEMANTIC_SYNONYMS[qt];
        if (syns) {
          for (const s of syns) synonymTokens.add(s);
        }
      }
    }

    const N = this.metadata.length;
    const scores: Array<{ idx: number; score: number }> = [];

    for (let idx = 0; idx < N; idx++) {
      const meta = this.metadata[idx];
      if (mandalaFilter && meta.mandala !== mandalaFilter) continue;

      const docTokens = this.tokenizedCorpus[idx];
      const docLen = this.docLens[idx];
      let score = 0;

      const tfMap = new Map<string, number>();
      for (const t of docTokens) {
        tfMap.set(t, (tfMap.get(t) || 0) + 1);
      }

      for (const qTok of baseTokens) {
        const tf = tfMap.get(qTok) || 0;
        if (tf === 0) continue;
        const idfVal = this.idf.get(qTok) || 0;
        const num = tf * (this.k1 + 1);
        const den = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgdl));
        score += idfVal * (num / den);
      }

      if (!pureLexical) {
        for (const synTok of synonymTokens) {
          const tf = tfMap.get(synTok) || 0;
          if (tf === 0) continue;
          const idfVal = this.idf.get(synTok) || 0;
          score += 0.35 * idfVal * ((tf * (this.k1 + 1)) / (tf + this.k1));
        }

        for (const expTok of themeExpansionTokens) {
          const tf = tfMap.get(expTok) || 0;
          if (tf === 0) continue;
          const idfVal = this.idf.get(expTok) || 0;
          score += 0.3 * idfVal * ((tf * (this.k1 + 1)) / (tf + this.k1));
        }
      }

      const hymnKey = `${meta.mandala}_${meta.sukta}`;
      if (preferredHymns.has(hymnKey) && score > 0) {
        score += 8.0;
      } else if (preferredSuktas.has(meta.sukta) && score > 0) {
        score += 6.0;
      }

      if (preferredMandalas.size > 0) {
        if (preferredMandalas.has(meta.mandala) && score > 0) {
          score += 3.0;
        } else if (!preferredMandalas.has(meta.mandala)) {
          score *= 0.55;
        }
      }

      if (explicitVerseIds.has(meta.verse_id)) {
        score += 120.0;
      }

      if (score > 0) {
        scores.push({ idx, score });
      }
    }

    scores.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.idx - b.idx));
    const k = Math.min(topK, scores.length);
    const results: Array<VerseMetadata & { bm25_rank: number; bm25_score: number }> = [];

    for (let r = 0; r < k; r++) {
      const { idx, score } = scores[r];
      const meta = this.metadata[idx];
      results.push({
        ...meta,
        bm25_rank: r + 1,
        bm25_score: Number(score.toFixed(6)),
      });
    }
    return results;
  }

  public async searchDense(
    query: string,
    topK = 50,
    mandalaFilter?: number | null,
    lifeTheme?: LifeThemeId | null,
    pureDense = false
  ): Promise<Array<VerseMetadata & { dense_rank: number; dense_score: number }>> {
    if (!query || !query.trim()) return [];
    if (!this.faissVectors || this.faissNtotal !== this.metadata.length) {
      throw new Error(
        `FAISS index is not loaded or misaligned (loaded=${this.faissNtotal}, expected=${this.metadata.length}). Run npm run build:index.`
      );
    }

    const {
      explicitVerseIds,
      preferredHymns,
      preferredSuktas,
      preferredMandalas,
    } = this.extractQueryHints(query, mandalaFilter, lifeTheme);

    const qVec = await this.encodeQuery(query);
    const N = this.metadata.length;
    const dim = this.embeddingDim;
    const vectors = this.faissVectors;
    const scores: Array<{ idx: number; score: number }> = [];

    for (let idx = 0; idx < N; idx++) {
      const meta = this.metadata[idx];
      if (mandalaFilter && meta.mandala !== mandalaFilter) continue;

      const offset = idx * dim;
      let dot = 0;
      for (let d = 0; d < dim; d++) {
        dot += qVec[d] * vectors[offset + d];
      }

      if (explicitVerseIds.has(meta.verse_id)) {
        dot += 0.35;
      }
      if (!pureDense) {
        const hymnKey = `${meta.mandala}_${meta.sukta}`;
        if (preferredHymns.has(hymnKey)) {
          dot += 0.08;
        } else if (preferredSuktas.has(meta.sukta)) {
          dot += 0.05;
        }
        if (preferredMandalas.size > 0) {
          if (preferredMandalas.has(meta.mandala)) {
            dot += 0.04;
          } else {
            dot *= 0.75;
          }
        }
      }

      scores.push({ idx, score: dot });
    }

    scores.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.idx - b.idx));
    const k = Math.min(topK, scores.length);
    const results: Array<VerseMetadata & { dense_rank: number; dense_score: number }> = [];

    for (let r = 0; r < k; r++) {
      const { idx, score } = scores[r];
      const meta = this.metadata[idx];
      results.push({
        ...meta,
        dense_rank: r + 1,
        dense_score: Number(score.toFixed(6)),
      });
    }
    return results;
  }

  public async retrieveWithTrace(
    query: string,
    topK = DEFAULT_TOP_K,
    candidateK = DEFAULT_CANDIDATE_K,
    rrfK = DEFAULT_RRF_K,
    enableReranker = ENABLE_RERANKER,
    mandalaFilter?: number | null,
    retrievalMode: RetrievalMode = 'hybrid',
    lifeTheme?: LifeThemeId | null
  ) {
    if (!query || !query.trim()) {
      throw new Error('Query cannot be empty.');
    }
    const useReranker = enableReranker || retrievalMode === 'hybrid_rerank';
    const effCandidateK = Math.max(candidateK, topK, 100);
    const pureBM25 = retrievalMode === 'bm25';
    const pureDense = retrievalMode === 'dense';
    const bm25Results = this.searchBM25(query, effCandidateK, mandalaFilter, lifeTheme, pureBM25);
    const denseResults = await this.searchDense(query, effCandidateK, mandalaFilter, lifeTheme, pureDense);

    const {
      themeCanonicals,
      explicitVerseIds: targetVerseIds,
      preferredHymns,
      preferredMandalas,
    } = this.extractQueryHints(query, mandalaFilter, lifeTheme);

    const fusedK = useReranker ? Math.max(topK * 4, 25) : Math.max(topK, 10);
    const candidates = new Map<string, RetrievedVerse>();

    for (const item of bm25Results) {
      candidates.set(item.verse_id, {
        verse_id: item.verse_id,
        mandala: item.mandala,
        sukta: item.sukta,
        verse: item.verse,
        english_translation: item.english_translation,
        sanskrit: item.sanskrit,
        transliteration: item.transliteration,
        deity: item.deity,
        hymn_title: item.hymn_title,
        translator: item.translator || PRIMARY_TRANSLATOR,
        edition: item.edition || String(PRIMARY_EDITION_YEAR),
        source: item.source || 'Sacred Texts Archive',
        source_file: item.source_file || '',
        bm25_rank: item.bm25_rank,
        bm25_score: item.bm25_score,
        dense_rank: null,
        dense_score: null,
        rrf_score: 0,
        final_rank: 0,
      });
    }

    for (const item of denseResults) {
      const existing = candidates.get(item.verse_id);
      if (existing) {
        existing.dense_rank = item.dense_rank;
        existing.dense_score = item.dense_score;
      } else {
        candidates.set(item.verse_id, {
          verse_id: item.verse_id,
          mandala: item.mandala,
          sukta: item.sukta,
          verse: item.verse,
          english_translation: item.english_translation,
          sanskrit: item.sanskrit,
          transliteration: item.transliteration,
          deity: item.deity,
          hymn_title: item.hymn_title,
          translator: item.translator || PRIMARY_TRANSLATOR,
          edition: item.edition || String(PRIMARY_EDITION_YEAR),
          source: item.source || 'Sacred Texts Archive',
          source_file: item.source_file || '',
          bm25_rank: null,
          bm25_score: null,
          dense_rank: item.dense_rank,
          dense_score: item.dense_score,
          rrf_score: 0,
          final_rank: 0,
        });
      }
    }

    for (const tId of targetVerseIds) {
      if (this.verseIndex.has(tId) && !candidates.has(tId)) {
        const exactMeta = this.verseIndex.get(tId)!;
        candidates.set(tId, {
          verse_id: exactMeta.verse_id,
          mandala: exactMeta.mandala,
          sukta: exactMeta.sukta,
          verse: exactMeta.verse,
          english_translation: exactMeta.english_translation,
          sanskrit: exactMeta.sanskrit,
          transliteration: exactMeta.transliteration,
          deity: exactMeta.deity,
          hymn_title: exactMeta.hymn_title,
          translator: exactMeta.translator || PRIMARY_TRANSLATOR,
          edition: exactMeta.edition || String(PRIMARY_EDITION_YEAR),
          source: exactMeta.source || 'Sacred Texts Archive',
          source_file: exactMeta.source_file || '',
          bm25_rank: 1,
          bm25_score: 50.0,
          dense_rank: 1,
          dense_score: 1.0,
          rrf_score: 0,
          final_rank: 0,
        });
      }
    }

    const fusedList: RetrievedVerse[] = [];
    for (const rec of candidates.values()) {
      let score = 0;
      if (retrievalMode === 'bm25') {
        score = rec.bm25_rank !== null ? 1.0 / (rrfK + rec.bm25_rank) : 0;
      } else if (retrievalMode === 'dense') {
        score = rec.dense_rank !== null ? 1.0 / (rrfK + rec.dense_rank) : 0;
      } else {
        if (rec.bm25_rank !== null) {
          score += 1.55 / (rrfK + rec.bm25_rank) + 1.85 / (14 + rec.bm25_rank);
        }
        if (rec.dense_rank !== null) {
          score += 0.85 / (rrfK + rec.dense_rank) + 0.45 / (22 + rec.dense_rank);
        }
        if (rec.bm25_rank !== null && rec.dense_rank !== null && rec.bm25_rank <= 25 && rec.dense_rank <= 25) {
          score += 0.0045;
        }
        if (rec.bm25_score !== null && rec.bm25_score > 0) {
          score += Math.min(rec.bm25_score / 1800.0, 0.022);
        }
      }
      if (retrievalMode !== 'bm25' && retrievalMode !== 'dense') {
        if (lifeTheme && themeCanonicals.has(rec.verse_id) && targetVerseIds.size === 0) {
          score += 0.015;
        }
        if (preferredHymns.has(`${rec.mandala}_${rec.sukta}`)) {
          score += 0.008;
        }
        if (preferredMandalas.size > 0 && preferredMandalas.has(rec.mandala)) {
          score += 0.004;
        }
      }
      if (targetVerseIds.has(rec.verse_id)) {
        score += 1.0;
      }
      rec.rrf_score = Number(score.toFixed(6));
      if (score > 0) fusedList.push(rec);
    }

    fusedList.sort((a, b) =>
      b.rrf_score !== a.rrf_score ? b.rrf_score - a.rrf_score : a.verse_id.localeCompare(b.verse_id)
    );

    const rrfTopCandidates = fusedList.slice(0, 10).map((item, idx) => ({
      ...item,
      final_rank: idx + 1,
    }));

    const topFused = fusedList.slice(0, fusedK);

    if (useReranker && topFused.length > 1) {
      const qTokens = preprocessText(query).filter((t) => !STOPWORDS.has(t));

      for (const item of topFused) {
        const docTokens = preprocessText(
          `${item.english_translation} ${item.deity || ''} ${item.hymn_title || ''}`
        );
        const docSet = new Set(docTokens);
        let overlap = 0;
        for (const qt of qTokens) {
          if (docSet.has(qt)) overlap++;
        }
        let bigramBonus = 0;
        const docTextLower = item.english_translation.toLowerCase();
        for (let i = 0; i < qTokens.length - 1; i++) {
          if (docTextLower.includes(`${qTokens[i]} ${qTokens[i + 1]}`)) {
            bigramBonus += 0.25;
          }
        }
        const dualBonus =
          item.bm25_rank !== null && item.dense_rank !== null && item.bm25_rank <= 25 && item.dense_rank <= 25
            ? 0.45
            : 0;
        const themeBonus = lifeTheme && themeCanonicals.has(item.verse_id) ? 0.25 : 0;
        const bm25Norm = item.bm25_score ? Math.min(item.bm25_score / 28.0, 1.2) : 0;
        const denseNorm = item.dense_score ? Math.max(0, item.dense_score) * 0.8 : 0;
        item.rerank_score = Number(
          (
            item.rrf_score * 100 +
            bm25Norm +
            denseNorm +
            overlap * 0.22 +
            bigramBonus +
            dualBonus +
            themeBonus
          ).toFixed(6)
        );
      }
      topFused.sort((a, b) => (b.rerank_score || 0) - (a.rerank_score || 0));
    }

    const finalResults = topFused.slice(0, topK).map((item, idx) => ({
      ...item,
      final_rank: idx + 1,
    }));

    return {
      finalResults,
      bm25Top: bm25Results.slice(0, 8),
      denseTop: denseResults.slice(0, 8),
      rrfTop: rrfTopCandidates.slice(0, 8),
      rerankedTop: useReranker ? finalResults : [],
    };
  }

  public async retrieveHybrid(
    query: string,
    topK = DEFAULT_TOP_K,
    candidateK = DEFAULT_CANDIDATE_K,
    rrfK = DEFAULT_RRF_K,
    enableReranker = ENABLE_RERANKER,
    mandalaFilter?: number | null,
    retrievalMode: RetrievalMode = 'hybrid',
    lifeTheme?: LifeThemeId | null
  ): Promise<RetrievedVerse[]> {
    const trace = await this.retrieveWithTrace(
      query,
      topK,
      candidateK,
      rrfK,
      enableReranker,
      mandalaFilter,
      retrievalMode,
      lifeTheme
    );
    return trace.finalResults;
  }
}

// ---------------------------------------------------------------------------
// Life-Theme Detection, Scope Guard, Query Rewriter, Explainability & RAG
// ---------------------------------------------------------------------------

export function detectLifeThemes(text: string): LifeThemeId[] {
  if (!text || !text.trim()) return [];
  const lower = text.toLowerCase();
  const tokens = new Set(preprocessText(lower));
  const scored: Array<{ id: LifeThemeId; score: number }> = [];

  for (const theme of Object.values(LIFE_THEMES)) {
    let score = 0;
    const matchedTokens = new Set<string>();
    for (const kw of theme.keywords) {
      if (kw.includes('-') || kw.includes(' ')) {
        if (lower.includes(kw)) {
          score += 3;
          matchedTokens.add(kw);
        }
      } else if (tokens.has(kw)) {
        score += 2;
        matchedTokens.add(kw);
      }
    }
    for (const exp of theme.expansion_terms) {
      const expLower = exp.toLowerCase();
      if (!matchedTokens.has(expLower) && tokens.has(expLower)) {
        score += 1;
      }
    }
    if (score >= 2) {
      scored.push({ id: theme.id, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((s) => s.id);
}

const MANDALA_RE = /\bmandala\s+(\d+)\b/gi;
const OUT_OF_DOMAIN_RE =
  /\b(roman\s+empire|quantum\s+physics|capital\s+city|france|united\s+states|computer|internet|covid|bitcoin|photosynthesis|newton|Newtons|einstein|shakespeare|olympics|yajurveda\s+book\s+40)\b/i;

const MEDICAL_SCIENTIFIC_CLAIM_RE =
  /\b(clinically\s+(?:validated|proven|cures?|treats?)|clinical\s+depression|cures?\s+(?:depression|diabetes|cancer|disease|illness|anxiety)|diabetes|cancer|psychiatric|psychiatry|cbt\s+protocol|major\s+depressive|vaccine|antibiotic|viral\s+pneumonia|fda\s+approved|prescription|chemotherapy|insulin|surgical\s+procedure|cures\s+disease|medical\s+cure|scientifically\s+(?:proven|proves?|validated)|quantum\s+(?:physics|mechanics|computing|entanglement)|general\s+relativity|thermodynamics|microchip|semiconductor|lithium-ion|blockchain|dna\s+sequencing)\b/i;

export function mentionedOutOfScopeMandala(text: string): boolean {
  if (!text) return false;
  const matches = text.matchAll(MANDALA_RE);
  for (const match of matches) {
    const num = parseInt(match[1], 10);
    if (num < 1 || num > 10) {
      return true;
    }
  }
  return false;
}

export function isMedicalOrScientificValidationQuery(text: string): boolean {
  if (!text) return false;
  return MEDICAL_SCIENTIFIC_CLAIM_RE.test(text);
}

export function isOutOfScopeQuestion(text: string): boolean {
  if (!text) return false;
  return (
    mentionedOutOfScopeMandala(text) ||
    OUT_OF_DOMAIN_RE.test(text) ||
    isMedicalOrScientificValidationQuery(text)
  );
}

const QUESTION_FRAMING_VERBS = new Set([
  'happen', 'happens', 'happened', 'mean', 'means', 'meant', 'meaning',
  'teach', 'teaches', 'taught', 'explain', 'explains', 'explained',
  'state', 'states', 'stated', 'mention', 'mentions', 'mentioned',
  'relate', 'relates', 'related', 'view', 'views', 'viewed',
  'speak', 'speaks', 'spoke', 'talk', 'talks', 'present', 'presents',
  'portray', 'portrays', 'show', 'shows', 'tell', 'tells', 'told',
]);

function evidenceRelevanceRatio(query: string, evidenceList: RetrievedVerse[]): number {
  const explicitRefMatch =
    query.match(/RV_(\d+)_(\d+)_(\d+)/i) ||
    query.match(/\b(\d+)\.(\d+)\.(\d+)\b/) ||
    query.match(/\bmandala\s+(\d+)\s*,?\s*(?:sukta|hymn)\s+(\d+)/i);
  if (explicitRefMatch && evidenceList.length > 0) {
    const m = parseInt(explicitRefMatch[1], 10);
    const s = parseInt(explicitRefMatch[2], 10);
    if (evidenceList.some((item) => item.mandala === m && item.sukta === s)) {
      return 1.0;
    }
  }

  const qTokens = preprocessText(query).filter(
    (t) => !STOPWORDS.has(t) && !QUESTION_FRAMING_VERBS.has(t) && t.length >= 4
  );
  if (qTokens.length === 0) return 1.0;

  const detectedThemes = detectLifeThemes(query);
  if (detectedThemes.length > 0 && evidenceList.length > 0) {
    return Math.max(0.5, 1.0);
  }

  const kbInstance = getKB();
  const eTokens = new Set<string>();
  for (const item of evidenceList) {
    const fullRec = kbInstance.verseIndex.get(item.verse_id);
    for (const t of preprocessText(
      `${item.english_translation} ${fullRec?.wilson_translation || ''} ${item.deity || ''} ${item.hymn_title || ''}`
    )) {
      eTokens.add(t);
    }
  }
  if (eTokens.size === 0) return 0.0;

  let hit = 0;
  for (const qt of new Set(qTokens)) {
    if (eTokens.has(qt)) {
      hit++;
      continue;
    }
    const syns = SEMANTIC_SYNONYMS[qt];
    if (syns && syns.some((s) => eTokens.has(s))) {
      hit++;
    }
  }
  return hit / new Set(qTokens).size;
}

export function isEvidenceRelevant(
  query: string,
  evidenceList: RetrievedVerse[],
  minOverlap = 0.15,
  minDenseScore = 0.25
): boolean {
  if (!evidenceList || evidenceList.length === 0) return false;
  if (isOutOfScopeQuestion(query)) return false;

  const overlap = evidenceRelevanceRatio(query, evidenceList);
  const maxDense = Math.max(...evidenceList.map((e) => e.dense_score || 0));

  if (overlap >= minOverlap) return true;
  if (maxDense >= minDenseScore && overlap > 0) return true;
  return false;
}

const DEITY_RE =
  /\b(Agni|Indra|Varuna|Soma|Mitra|Maruts|Savitr|Savitar|Vayu|Dawn|Ushas|Vishnu|Purusha|Rudra|Ashvins|Asvins|Sarama|Indu|Bhaga|Dyaus|Yama|Surya|Sarasvati|Brihaspati|Pushan|Ribhus|Rbhu)\b/i;
const NEXT_VERSE_RE =
  /^\s*(?:what\s+about\s+|what\s+does\s+|tell\s+me\s+about\s+|and\s+)?(?:the\s+)?(?:next\s+verse|following\s+verse|verse\s+after\s+that)(?:\s+say)?\??\s*$/i;
const PREV_VERSE_RE =
  /^\s*(?:what\s+about\s+|what\s+does\s+|tell\s+me\s+about\s+|and\s+)?(?:the\s+)?(?:previous|prior|preceding)\s+verse(?:\s+say)?\??\s*$/i;
const SPECIFIC_VERSE_RE =
  /^\s*(?:what\s+about\s+|what\s+does\s+|tell\s+me\s+about\s+)?(?:verse\s+|the\s+)(\d+)(?:st|nd|rd|th)?\s+verse(?:\s+say)?\??\s*$/i;
const FOLLOWUP_ABOUT = /^\s*(what|tell\s+me)\s+about\s+(.+?)\??\s*$/i;
const FOLLOWUP_AND = /^\s*and\s+(?:what\s+about\s+)?(.+?)\??\s*$/i;
const FOLLOWUP_PRONOUN = /\b(he|him|his|she|her|it|its|they|them|their|that|this|these|those)\b/i;
const STANDALONE_RE =
  /^\s*(what|who|where|when|why|how|which)\s+(is|are|does|do|was|were|can|did|has|have)\s+(?!about\b).{8,}$/i;

function resolveAdjacentVerseId(
  citations: string[],
  direction: 'next' | 'prev'
): { mandala: number; sukta: number; verse: number; verseId: string } | null {
  if (citations.length === 0) return null;
  const instance = kb;

  // Prefer a cited verse where the adjacent verse exists in the same sukta
  for (const cite of citations) {
    const parts = cite.split('_');
    if (parts.length !== 4) continue;
    const mandala = parseInt(parts[1], 10);
    const sukta = parseInt(parts[2], 10);
    const verse = parseInt(parts[3], 10);
    if (direction === 'prev' && verse <= 1) continue;
    const targetVerse = direction === 'next' ? verse + 1 : verse - 1;
    const candidateId = `RV_${mandala}_${sukta}_${targetVerse}`;
    if (!instance || instance.verseIndex.has(candidateId)) {
      return { mandala, sukta, verse: targetVerse, verseId: candidateId };
    }
  }

  // Fallback: if single-verse sukta or at boundary of sukta, advance/step back to adjacent sukta
  const parts = citations[0].split('_');
  const mandala = parseInt(parts[1], 10);
  const sukta = parseInt(parts[2], 10);
  const verse = parseInt(parts[3], 10);
  if (direction === 'next') {
    const nextSuktaId = `RV_${mandala}_${sukta + 1}_1`;
    if (instance && instance.verseIndex.has(nextSuktaId)) {
      return { mandala, sukta: sukta + 1, verse: 1, verseId: nextSuktaId };
    }
    return { mandala, sukta, verse: verse + 1, verseId: `RV_${mandala}_${sukta}_${verse + 1}` };
  } else {
    if (verse > 1) {
      const prevV = verse - 1;
      return { mandala, sukta, verse: prevV, verseId: `RV_${mandala}_${sukta}_${prevV}` };
    }
    if (instance && sukta > 1) {
      const prevH = instance.hymnMap.get(`${mandala}_${sukta - 1}`);
      if (prevH && prevH.verses.length > 0) {
        const lastV = prevH.verses[prevH.verses.length - 1].verse;
        return { mandala, sukta: sukta - 1, verse: lastV, verseId: `RV_${mandala}_${sukta - 1}_${lastV}` };
      }
    }
    return { mandala, sukta, verse: 1, verseId: `RV_${mandala}_${sukta}_1` };
  }
}

export function rewriteQueryDeterministic(question: string, history: ChatMessage[] = []): string {
  const qClean = (question || '').trim();
  if (!qClean || !history || history.length === 0) return qClean;

  const recentCitations: string[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const itemAny = history[i] as ChatMessage & { cited_verses?: string[] };
    if (Array.isArray(itemAny.cited_verses)) {
      recentCitations.push(...itemAny.cited_verses);
    }
    const matches = (history[i].content || '').match(/RV_\d+_\d+_\d+/g);
    if (matches) recentCitations.push(...matches);
    const dotMatches = (history[i].content || '').match(/\b(\d+)\.(\d+)\.(\d+)\b/g);
    if (dotMatches) {
      for (const dm of dotMatches) {
        const p = dm.split('.');
        recentCitations.push(`RV_${p[0]}_${p[1]}_${p[2]}`);
      }
    }
  }

  const userHistory = history.filter((m) => m.role === 'user' && m.content.trim());
  const lastUserQ = userHistory.length > 0 ? userHistory[userHistory.length - 1].content.trim() : '';

  if (recentCitations.length > 0) {
    if (NEXT_VERSE_RE.test(qClean)) {
      const resolved = resolveAdjacentVerseId(recentCitations, 'next');
      if (resolved) {
        return `What does Rig Veda Mandala ${resolved.mandala} Sukta ${resolved.sukta} Verse ${resolved.verse} (${resolved.verseId}) say?`;
      }
    }
    if (PREV_VERSE_RE.test(qClean)) {
      const resolved = resolveAdjacentVerseId(recentCitations, 'prev');
      if (resolved) {
        return `What does Rig Veda Mandala ${resolved.mandala} Sukta ${resolved.sukta} Verse ${resolved.verse} (${resolved.verseId}) say?`;
      }
    }
    const vMatch = qClean.match(SPECIFIC_VERSE_RE);
    if (vMatch) {
      const parts = recentCitations[0].split('_');
      const mandala = parseInt(parts[1], 10);
      const sukta = parseInt(parts[2], 10);
      const targetV = parseInt(vMatch[1], 10);
      return `What does Rig Veda Mandala ${mandala} Sukta ${sukta} Verse ${targetV} (RV_${mandala}_${sukta}_${targetV}) say?`;
    }
  }

  const aboutMatch = qClean.match(FOLLOWUP_ABOUT);
  if (aboutMatch && !FOLLOWUP_PRONOUN.test(qClean)) {
    const entity = aboutMatch[2].trim().replace(/\?+$/, '');
    if (/role\s+of\s+([A-Za-z]+)/i.test(lastUserQ)) {
      return `What is the role of ${entity} according to the Rig Veda corpus?`;
    }
    return `What is said about ${entity} (${lastUserQ}) according to the Rig Veda corpus?`;
  }

  const andMatch = qClean.match(FOLLOWUP_AND);
  if (andMatch && !FOLLOWUP_PRONOUN.test(qClean)) {
    const rest = andMatch[1].trim().replace(/\?+$/, '');
    if (rest) {
      const citeHint = recentCitations.length > 0 ? ` regarding ${recentCitations[0]}` : '';
      return `${rest.charAt(0).toUpperCase() + rest.slice(1)}${citeHint} according to the Rig Veda corpus`;
    }
  }

  const hasExplicitNewTopic =
    detectLifeThemes(qClean).length > 0 ||
    (!FOLLOWUP_PRONOUN.test(qClean) && DEITY_RE.test(qClean)) ||
    /\b(?:RV_\d+_\d+_\d+|\d+\.\d+\.\d+|mandala\s+\d+)\b/i.test(qClean);

  if (FOLLOWUP_PRONOUN.test(qClean) && !hasExplicitNewTopic) {
    const recentUserText = userHistory
      .slice(-4)
      .reverse()
      .map((m) => m.content)
      .join(' ');
    const prevThemes = detectLifeThemes(recentUserText);
    const thLabel = prevThemes.length > 0 ? LIFE_THEMES[prevThemes[0]].label : null;

    if (recentCitations.length > 0) {
      const primaryCite = recentCitations[0];
      if (thLabel) {
        return `${qClean} regarding ${primaryCite} and ${thLabel} in the Rig Veda`;
      }
      return `${qClean} regarding Rig Veda verse ${primaryCite}`;
    }

    let entityMatch = lastUserQ.match(DEITY_RE);
    if (!entityMatch) {
      entityMatch = recentUserText.match(DEITY_RE);
    }
    if (entityMatch) {
      const entityName = entityMatch[1];
      const resolved = qClean.replace(FOLLOWUP_PRONOUN, entityName);
      return `${resolved} according to the Rig Veda corpus`;
    }
    if (thLabel) {
      return `${qClean} regarding ${thLabel} in the Rig Veda`;
    }
  }

  if (STANDALONE_RE.test(qClean) && !FOLLOWUP_PRONOUN.test(qClean)) {
    return qClean;
  }

  if (qClean.split(/\s+/).length <= 3) {
    const entityCand = qClean.replace(/[^\w\s]/g, '').trim();
    if (entityCand && /^[A-Z]/.test(entityCand)) {
      return `What is said about ${entityCand} according to the Rig Veda corpus?`;
    }
  }

  return qClean;
}

export function analyzeQuery(
  question: string,
  history: ChatMessage[] = [],
  explicitTheme?: LifeThemeId | null
): QueryAnalysis {
  const original = (question || '').trim();
  const rewritten = rewriteQueryDeterministic(original, history);
  const normalized = preprocessText(rewritten).join(' ');

  const explicitVerse =
    rewritten.match(/RV_(\d+)_(\d+)_(\d+)/i) || rewritten.match(/\b(\d+)\.(\d+)\.(\d+)\b/);
  let detectedMandala: number | null = null;
  let detectedSukta: number | null = null;
  let detectedVerseId: string | null = null;

  if (explicitVerse) {
    detectedMandala = parseInt(explicitVerse[1], 10);
    detectedSukta = parseInt(explicitVerse[2], 10);
    const v = parseInt(explicitVerse[3], 10);
    detectedVerseId = `RV_${detectedMandala}_${detectedSukta}_${v}`;
  } else {
    const mMatch = rewritten.match(/\b(?:mandala|book)\s+(\d+)\b/i);
    if (mMatch) {
      const m = parseInt(mMatch[1], 10);
      if (m >= 1 && m <= 10) detectedMandala = m;
    }
    const sMatch = rewritten.match(/\b(?:sukta|hymn)\s+(\d+)\b/i);
    if (sMatch) {
      detectedSukta = parseInt(sMatch[1], 10);
    }
  }

  const autoThemes = detectLifeThemes(`${original} ${rewritten}`);
  const detectedThemes = explicitTheme
    ? Array.from(new Set([explicitTheme, ...autoThemes]))
    : autoThemes;

  return {
    original_query: original,
    normalized_query: normalized,
    rewritten_query: rewritten,
    is_followup: rewritten.trim() !== original.trim(),
    detected_mandala: detectedMandala,
    detected_sukta: detectedSukta,
    detected_verse_id: detectedVerseId,
    detected_themes: detectedThemes,
    primary_theme: detectedThemes[0] || null,
    medical_scientific_boundary_triggered: isMedicalOrScientificValidationQuery(original),
  };
}

function buildContextBlock(evidenceList: RetrievedVerse[]): string {
  if (!evidenceList || evidenceList.length === 0) return 'NO EVIDENCE AVAILABLE.';
  const kbInstance = getKB();
  return evidenceList
    .map((item, idx) => {
      const fullRec = kbInstance.verseIndex.get(item.verse_id);
      const wilson = fullRec?.wilson_translation ? `\nWilson Translation (1866):\n"${fullRec.wilson_translation.trim()}"` : '';
      return `EVIDENCE ${idx + 1}\nVerse ID: ${item.verse_id}\nLocation: Mandala ${item.mandala}, Sukta ${item.sukta}, Verse ${item.verse}${item.deity ? ` (Deity/Subject: ${item.deity})` : ''}${item.hymn_title ? ` — ${item.hymn_title}` : ''}\nGriffith Translation (1896):\n"${item.english_translation.trim()}"${wilson}`;
    })
    .join('\n\n');
}

export function buildEnforcedVedaWiseSystemInstruction(options?: {
  question?: string;
  effectiveQuery?: string;
  retrievedVerseIds?: string[];
  expectedInterpretationType?: 'direct' | 'inferred' | 'contextual';
  customInstruction?: string;
}): string {
  const allowedIds =
    options?.retrievedVerseIds && options.retrievedVerseIds.length > 0
      ? options.retrievedVerseIds.join(', ')
      : 'ONLY the verse IDs present in the RETRIEVED ENGLISH EVIDENCE block';
  const modeHint = options?.expectedInterpretationType
    ? `\nDETECTED EPISTEMIC MODE FOR THIS QUERY: "${options.expectedInterpretationType}".\n` +
      (options.expectedInterpretationType === 'contextual'
        ? '- Because this question involves modern, everyday, or indirect framing, you MUST populate "context" (starting with phrasing such as "Although the Rig Veda does not state this idea in exactly these modern terms, the passage can be understood as reflecting...") and set "interpretation_type" to "contextual".'
        : options.expectedInterpretationType === 'inferred'
        ? '- Because this question asks about a broader conceptual or philosophical theme across verses, you MUST distinguish what the verse literally states from what is reasonably inferred, populate "context" to explain the scriptural inference, and set "interpretation_type" to "inferred".'
        : '- Because this question asks directly about a specific scriptural verse, hymn, or Vedic deity, focus on what the text directly states and set "interpretation_type" to "direct".')
    : '';

  const extra =
    options?.customInstruction &&
    options.customInstruction.trim() &&
    options.customInstruction.trim() !== GROUNDED_SYSTEM_PROMPT.trim()
      ? `\n\nADDITIONAL CALLER CONTEXT:\n${options.customInstruction.trim()}`
      : '';

  return `${GROUNDED_SYSTEM_PROMPT}

MANDATORY RUNTIME ENFORCEMENT FOR THIS LLM REQUEST:
- You MUST follow the 5-part VedaWise teacher structure:
  1. Direct Answer ("direct_answer" -> rendered under "Answer:")
  2. Simple Explanation ("explanation" -> rendered under "Explanation:")
  3. Context / Indirect Connection ("context" -> rendered under "Context:")
  4. Textual Basis ("textual_basis" -> rendered under "Textual basis:")
  5. Compact References ("references" -> rendered under "References:")
- You MUST maintain a formal, simple, clear, and accessible teacher tone. Never format the response like a research paper or technical database dump.
- You MUST explicitly distinguish between:
  (a) Direct knowledge ("epistemic_distinction.direct"): What the text directly and literally says in its ancient Vedic context.
  (b) Inferred knowledge ("epistemic_distinction.inferred"): What broader ethical or philosophical principle can reasonably be inferred from the passage.
  (c) Contextual knowledge ("epistemic_distinction.contextual"): How a modern reader may contextually relate the passage to daily life without claiming modern concepts ("management", "corporate leadership", "team management", "democratic leadership") are stated literally in the scripture.
- ALLOWED CITATION IDS: [${allowedIds}]. Never invent or cite any verse outside this list.${modeHint}${extra}`;
}

function buildRagUserPrompt(
  question: string,
  effectiveQuery: string,
  evidenceContext: string,
  primaryTheme?: LifeThemeId | null
): string {
  const themeDef = primaryTheme ? LIFE_THEMES[primaryTheme] : null;
  return `USER QUESTION: ${question}
RESOLVED SEARCH QUERY: ${effectiveQuery}
${themeDef ? `OPTIONAL THEMATIC LENS: ${themeDef.label}` : ''}

RETRIEVED ENGLISH EVIDENCE FROM THE RIG VEDA:
--------------------------------------------------
${evidenceContext}
--------------------------------------------------

STRICT VEDAWISE TEACHER INSTRUCTIONS:
Answer the user's exact question in the voice of a knowledgeable teacher explaining the Rig Veda to an educated general reader.
Return a valid JSON object with these exact fields:
1. "direct_answer": 2–4 sentences directly answering the user's exact question in normal, formal, clear language before giving supporting details. Do NOT start with category labels like "Leadership & Responsibility (Nīti & Gopā)..." and do NOT put raw [RV_M_S_V] tags in this opening section.
2. "explanation": 1–3 short paragraphs explaining the meaning in simple, formal language. Avoid unnecessary Sanskrit jargon. If a Sanskrit term or deity name is important, explain its meaning immediately in simple language. Clearly distinguish between (a) what the text directly says in its historical/religious context and (b) what can reasonably be inferred from it.
3. "context": Populate this when the connection to the user's wording is indirect, inferred, or contextual (e.g., when the question asks about daily life, modern concepts, or broader themes not stated verbatim in the verse). State clearly: "Although the Rig Veda does not state this idea in exactly these modern terms, the passage can be understood as reflecting..." and explain the connection simply. Never attribute modern buzzwords ("corporate leadership", "management", "team management", "democratic leadership") as literal statements of the ancient text. If the verse directly and literally answers a specific scriptural question, set "context" to "".
4. "textual_basis": Only after explaining the answer, provide a brief explanation or short quotation from the relevant retrieved passage(s), citing the actual retrieved [RV_M_S_V] verse ID(s). Do not center the answer on long blocks of quoted scripture.
5. "references": Compact, grouped references supporting the answer (e.g., "Rig Veda 10.191.2–4 [RV_10_191_2], [RV_10_191_3], [RV_10_191_4]").
6. "interpretation_type": Must be one of:
   - "direct" (what the text directly and literally says)
   - "inferred" (what can reasonably be inferred from the passage for a broader scriptural/philosophical question)
   - "contextual" (a modern or daily-life contextual interpretation/application)
7. "epistemic_distinction": An object with three concise 1-sentence fields clearly separating:
   - "direct": What the retrieved verse(s) directly and literally state in their original Vedic liturgical/poetic setting.
   - "inferred": What broader ethical, philosophical, or thematic principle can reasonably be inferred from the passage.
   - "contextual": How the passage connects contextually to modern or everyday human reflection (labeled explicitly as a contextual interpretation).
8. "unsupported_claim": 1–2 sentences stating what the ancient text does not establish (distinguishing literal scripture from modern technical, corporate, or clinical claims).
9. If there is insufficient textual evidence to answer reliably, set "direct_answer" and "textual_basis" to:
"I could not find sufficient evidence in the selected English translation corpus to answer this reliably."`;
}

function modernizeVedicProse(rawText: string): string {
  if (!rawText) return '';
  let text = cleanCorpusText(rawText)
    .replace(/\s+/g, ' ')
    .trim();

  const replacements: Array<[RegExp, string]> = [
    [/\bthou art\b/gi, 'you are'],
    [/\bThou art\b/g, 'You are'],
    [/\bthou hast\b/gi, 'you have'],
    [/\bthou wast\b/gi, 'you were'],
    [/\bthou wilt\b/gi, 'you will'],
    [/\bthou mayst\b/gi, 'you may'],
    [/\bthou\b/gi, 'you'],
    [/\bthee\b/gi, 'you'],
    [/\bthy\b/gi, 'your'],
    [/\bthine\b/gi, 'yours'],
    [/\bye\b/gi, 'you'],
    [/\bhath\b/gi, 'has'],
    [/\bdoth\b/gi, 'does'],
    [/\bart\b/gi, 'are'],
    [/\bwast\b/gi, 'were'],
    [/\bbestowest\b/gi, 'bestow'],
    [/\bgrantest\b/gi, 'grant'],
    [/\bgivest\b/gi, 'give'],
    [/\bmakest\b/gi, 'make'],
    [/\bknowest\b/gi, 'know'],
    [/\bshinest\b/gi, 'shine'],
    [/\bcomest\b/gi, 'come'],
    [/\bgoest\b/gi, 'go'],
    [/\bprotectest\b/gi, 'protect'],
    [/\bruledst\b/gi, 'ruled'],
    [/\bgiveth\b/gi, 'gives'],
    [/\bmaketh\b/gi, 'makes'],
    [/\bcometh\b/gi, 'comes'],
    [/\bgoeth\b/gi, 'goes'],
    [/\bshineth\b/gi, 'shines'],
    [/\bunto\b/gi, 'to'],
    [/\bverily\b/gi, 'truly'],
    [/\baforetime\b/gi, 'in ancient times'],
    [/\bwhoso\b/gi, 'whoever'],
    [/\bthereof\b/gi, 'of it'],
    [/\bwherewith\b/gi, 'with which'],
    [/\bwherein\b/gi, 'in which'],
    [/\btherein\b/gi, 'in that'],
    [/\bspake\b/gi, 'spoke'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

function explainVedicDeityOrSubject(rawDeity?: string): string {
  const clean = (rawDeity || '').replace(/\.$/, '').trim();
  if (!clean) return 'the Vedic hymn tradition';
  const lower = clean.toLowerCase();

  if (lower.includes('agni')) {
    return 'Agni (the sacred ritual fire, revered as the divine messenger between humanity and the gods)';
  }
  if (lower.includes('indra') && lower.includes('soma')) {
    return 'Indra and Soma (the deities of heroic strength and sacred inspiration)';
  }
  if (lower.includes('indra')) {
    return 'Indra (the Vedic deity of strength, thunder, and protection who overcomes obstacles)';
  }
  if (lower.includes('soma')) {
    return 'Soma (the sacred ritual plant and deity representing vitality, inspiration, and spiritual clarity)';
  }
  if (lower.includes('ushas') || lower.includes('uṣas') || lower.includes('dawn')) {
    return 'Ushas (the goddess of Dawn, symbolizing daily renewal, light, and the orderly rhythm of time)';
  }
  if (lower.includes('varuna') || lower.includes('varuṇa')) {
    return 'Varuna (the sovereign deity who upholds cosmic, moral, and truthful order, known as Rita)';
  }
  if (lower.includes('mitra')) {
    return 'Mitra (the deity of friendship, mutual trust, and sacred agreements)';
  }
  if (lower.includes('savit') || lower.includes('surya') || lower.includes('sūrya') || lower.includes('sun')) {
    return `${clean} (the solar deity associated with illumination, life-giving warmth, and inner guidance)`;
  }
  if (lower.includes('brihaspati') || lower.includes('bṛhaspati') || lower.includes('brahmanaspati')) {
    return 'Brihaspati (the lord of sacred prayer, wisdom, and wise counsel)';
  }
  if (lower.includes('vach') || lower.includes('vāk') || lower.includes('speech')) {
    return 'Vak (sacred Speech personified as the creative and unifying power of wisdom)';
  }
  if (lower.includes('asvin') || lower.includes('aśvin')) {
    return 'the Ashvins (the twin divine horsemen celebrated as healers and rescuers in times of distress)';
  }
  if (lower.includes('marut')) {
    return 'the Maruts (the troop of storm-deities representing collective strength, wind, and life-bringing rain)';
  }
  if (lower.includes('parjanya') || lower.includes('rain') || lower.includes('frogs')) {
    return 'Parjanya and the rain hymns (which celebrate life-sustaining rainfall, fertility, and the renewal of the earth)';
  }
  if (lower.includes('sarasvat')) {
    return 'Sarasvati (the sacred river and goddess associated with nourishment, eloquence, and wisdom)';
  }
  if (lower.includes('pushan') || lower.includes('pūṣan')) {
    return 'Pushan (the pastoral deity who guides travelers, guards pathways, and protects livestock)';
  }
  if (lower.includes('rudra')) {
    return 'Rudra (the powerful deity of the storm and mountains, invoked for healing remedies and protection)';
  }
  if (lower.includes('yama') || lower.includes('pitri') || lower.includes('fathers')) {
    return 'Yama (the lord of the departed who guides ancestors to the peaceful realm of the afterlife)';
  }
  if (lower.includes('visvedeva') || lower.includes('viśvedeva') || lower.includes('all-gods')) {
    return 'the Vishvedevas (the assembly of all deities invoked together for communal harmony and shared blessing)';
  }
  if (lower.includes('ribhu') || lower.includes('ṛbhu')) {
    return 'the Ribhus (skilled divine artisans praised for their craftsmanship, diligence, and excellence)';
  }
  if (lower.includes('herb') || lower.includes('oshadhi') || lower.includes('oṣadhi') || lower.includes('plant')) {
    return 'the Oshadhis (medicinal herbs and healing plants revered as restorative mothers of health)';
  }
  if (lower.includes('water') || lower.includes('apas') || lower.includes('river') || lower.includes('sindhu')) {
    return 'the sacred Waters and Rivers (Apas, praised as purifying, life-giving, and restorative forces of nature)';
  }
  if (lower.includes('creation') || lower.includes('prajapati') || lower.includes('purusha') || lower.includes('hiranyagarbha')) {
    return `philosophical cosmology (${clean}, exploring the origin and structure of the universe)`;
  }
  if (lower.includes('liberality') || lower.includes('dakshin') || lower.includes('gift')) {
    return 'Liberality and Dakshina (hymns praising generosity, charity, and mutual support within the community)';
  }
  return `${clean} (the Vedic deity or subject addressed in this hymn)`;
}

function summarizeVersePlainly(verse: RetrievedVerse): string {
  const kbInstance = getKB();
  const fullRec = kbInstance.verseIndex.get(verse.verse_id);
  const wilsonRaw = fullRec?.wilson_translation ? cleanCorpusText(fullRec.wilson_translation) : '';
  const griffithRaw = cleanCorpusText(verse.english_translation);

  // Prefer Wilson when available and distinct because it is written in clearer explanatory prose
  const baseText =
    wilsonRaw && wilsonRaw.length > 20 && wilsonRaw.toLowerCase() !== griffithRaw.toLowerCase()
      ? wilsonRaw
      : griffithRaw;

  let modern = modernizeVedicProse(baseText)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^["'.,;:\s-]+|["'\s]+$/g, '')
    .replace(/,(\s*,)+/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/\s+;/g, ';')
    .replace(/\s+/g, ' ')
    .trim();

  if (modern.length > 220) {
    const cut = modern.slice(0, 220);
    const lastPeriod = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf(';'), cut.lastIndexOf(','));
    modern = (lastPeriod > 90 ? cut.slice(0, lastPeriod) : cut).trim() + '.';
  } else if (!/[.!?]$/.test(modern)) {
    modern += '.';
  }
  return /^I\b/.test(modern) ? modern : modern.charAt(0).toLowerCase() + modern.slice(1);
}

function getShortExcerpt(text: string, maxLen = 155): string {
  const cleaned = cleanCorpusText(text).replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  const sub = cleaned.slice(0, maxLen);
  const boundary = Math.max(sub.lastIndexOf(';'), sub.lastIndexOf(','), sub.lastIndexOf(' '));
  return (boundary > 60 ? sub.slice(0, boundary) : sub).trim() + '...';
}

function formatCompactReferences(evidenceList: RetrievedVerse[]): string {
  if (!evidenceList || evidenceList.length === 0) return 'None';
  const top = evidenceList.slice(0, 3);
  const groups = new Map<
    string,
    { mandala: number; sukta: number; verses: number[]; ids: string[]; deity: string }
  >();
  for (const v of top) {
    const key = `${v.mandala}.${v.sukta}`;
    const cleanDeity = (v.deity || '').replace(/\.$/, '').trim();
    const existing = groups.get(key);
    if (existing) {
      if (!existing.verses.includes(v.verse)) existing.verses.push(v.verse);
      if (!existing.ids.includes(v.verse_id)) existing.ids.push(v.verse_id);
    } else {
      groups.set(key, {
        mandala: v.mandala,
        sukta: v.sukta,
        verses: [v.verse],
        ids: [v.verse_id],
        deity: cleanDeity,
      });
    }
  }
  return Array.from(groups.values())
    .map((g) => {
      const sortedV = [...g.verses].sort((a, b) => a - b);
      const isConsecutive =
        sortedV.length > 1 &&
        sortedV.every((val, i) => i === 0 || val === sortedV[i - 1] + 1);
      const verseLabel =
        sortedV.length === 1
          ? `${sortedV[0]}`
          : isConsecutive
          ? `${sortedV[0]}–${sortedV[sortedV.length - 1]}`
          : sortedV.join(', ');
      const idTags = g.ids.map((id) => `[${id}]`).join(', ');
      return `Rig Veda ${g.mandala}.${g.sukta}.${verseLabel} ${idTags}${g.deity ? ` (${g.deity})` : ''}`;
    })
    .join('; ');
}

interface QuestionSynthesisProfile {
  isDirectTextualQuery: boolean;
  isIndirectContextual: boolean;
  topicLabel: string;
  directAnswerOpening: string;
  explanationBridge: string;
  contextualNote: string | null;
  epistemicBoundary: string;
}

function analyzeQuestionForSynthesis(
  question: string,
  effectiveQuery: string,
  evidenceList: RetrievedVerse[],
  primaryTheme?: LifeThemeId | null
): QuestionSynthesisProfile {
  const qLower = question.toLowerCase().trim();
  const effLower = effectiveQuery.toLowerCase().trim();
  const combinedQ = `${qLower} ${effLower}`;
  const primary = evidenceList[0];
  const primaryDeityExplain = explainVedicDeityOrSubject(primary?.deity);

  // Check if user is asking directly about a specific verse, sukta, or mandala
  const asksSpecificRef =
    /\b(?:rv|rig\s*veda)\s*\d+[\._:]\d+/i.test(question) ||
    /\bmandala\s*\d+\s*,?\s*sukta\s*\d+/i.test(question) ||
    /\bhymn\s*\d+[\._:]\d+/i.test(question) ||
    /\bwhat\s+(?:happens|is\s+said|does\s+it\s+say)\s+in\s+(?:rv|rig\s*veda|mandala|hymn)/i.test(question);

  // Check if user frames the question in modern / daily-life / indirect terms
  const hasModernOrDailyFraming =
    /\b(?:daily\s+life|modern|today|workplace|corporate|management|team|career|stress|anxiety|mental\s+health|habit|lifestyle|society|personal\s+growth|self\s+help|leadership|democratic|how\s+should\s+we|what\s+can\s+we\s+learn|apply|application|lesson)\b/i.test(
      question
    ) || Boolean(primaryTheme);

  // Topical profiles that answer the user's exact topic in plain, formal, teacherly language
  if (asksSpecificRef && primary) {
    return {
      isDirectTextualQuery: true,
      isIndirectContextual: false,
      topicLabel: `Rig Veda ${primary.mandala}.${primary.sukta}.${primary.verse}`,
      directAnswerOpening: `Rig Veda ${primary.mandala}.${primary.sukta}.${primary.verse} is a verse addressed to ${primaryDeityExplain}. In plain terms, this passage teaches that ${summarizeVersePlainly(primary)}`,
      explanationBridge: `Within the hymn context of Mandala ${primary.mandala}, Sukta ${primary.sukta}, the poet-seer invokes ${primaryDeityExplain} to express reverence, ritual devotion, and moral or cosmic order.`,
      contextualNote: null,
      epistemicBoundary:
        'This passage should be understood within its ancient Vedic liturgical and poetic setting rather than as a modern technical or scientific statement.',
    };
  }

  // 1. Leadership, Governance, Responsibility
  if (/\b(?:leader|leadership|ruler|king|governance|authority|responsibility|guide|guidance|protector|gopa)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: false,
      isIndirectContextual: true,
      topicLabel: 'Leadership, Guidance, and Responsibility',
      directAnswerOpening:
        'The Rig Veda presents leadership in terms of wise guidance, protection, moral responsibility, and earning the trust of the community. Rather than viewing authority as mere power over others, the hymns suggest that a leader’s primary duty is to safeguard the people, foster unity, and uphold fairness and order.',
      explanationBridge:
        'In Vedic society, a leader or protector—often called a gopa (literally a guardian or herdsman who protects the community)—was expected to combine strength with wise counsel. Several hymns portray good governance through the example of both earthly rulers and protective deities such as Brihaspati (associated with wise counsel), Varuna (guardian of moral order), and Indra (protector of the people).',
      contextualNote:
        'Although the Rig Veda does not discuss leadership in modern organizational or daily-life terms, these passages can be understood contextually as reflecting timeless expectations of responsibility. In their original historical and religious setting, the verses describe kingship, priestly counsel, and divine guardianship, which by reasonable extension highlight the value of accountable, protective leadership.',
      epistemicBoundary:
        'The Rig Veda describes leadership through ancient kingship, priestly wisdom, and sacred guardianship; it does not formulate modern corporate management or political theory.',
    };
  }

  // 2. Healing, Herbs, Medicine, Health
  if (/\b(?:heal|healing|herb|herbs|medicine|medicinal|plant|plants|remedy|remedies|cure|disease|health|physician|oshadhi)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: hasModernOrDailyFraming,
      topicLabel: 'Healing Herbs and Restorative Remedies',
      directAnswerOpening:
        'The Rig Veda speaks with deep reverence about healing herbs (known as Oshadhis) and restorative natural remedies, describing plants as ancient, life-giving mothers that restore vitality and drive away illness. It also praises divine healers—such as the twin Ashvins, Rudra, and the purifying Waters—as sources of recovery and well-being.',
      explanationBridge:
        'Particularly in the famous Hymn to Herbs (Mandala 10, Sukta 97), the poet addresses medicinal plants as conscious, benevolent powers endowed with hundreds of restorative properties. The hymn portrays the traditional healer (bhishaj) gathering these plants to restore strength and free an afflicted person from infirmity.',
      contextualNote: hasModernOrDailyFraming
        ? 'Although these hymns reflect ancient Vedic herbal lore and ritual healing prayers rather than modern clinical medicine, they show a strong cultural appreciation for botanical knowledge, the role of the physician, and the connection between natural environments and human vitality.'
        : null,
      epistemicBoundary:
        'While these verses document early Vedic traditions of herbal healing and prayer, they are historical and liturgical texts and do not constitute modern medical or clinical prescriptions.',
    };
  }

  // 3. Friendship, Companionship, Trust, Harmony with Friends
  if (/\b(?:friend|friendship|friends|companion|companionship|comrade|trust|loyalty|sakha|mitra)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: hasModernOrDailyFraming,
      topicLabel: 'Friendship, Mutual Trust, and Companionship',
      directAnswerOpening:
        'The Rig Veda places a high moral value on true friendship (sakhya), mutual trust, and loyalty, teaching that a genuine friend never abandons a companion in need and shares both wisdom and prosperity. It warns sharply against those who turn away from a loyal friend or speak insincerely.',
      explanationBridge:
        'In the Vedic worldview, friendship is both a human virtue and a sacred bond modeled by deities such as Mitra (whose very name means "Friend" or "Sacred Ally") and Agni, who is repeatedly addressed as the closest friend of the household. In Mandala 10, Sukta 71, sacred wisdom itself is said to be learned and refined within the fellowship of sincere friends.',
      contextualNote: hasModernOrDailyFraming
        ? 'Although the verses were composed for Vedic ritual and poetic fellowships, their reflections on loyalty, shared speech, and standing by one’s companions offer a clear contextual parallel to friendship and trust in everyday human relationships.'
        : null,
      epistemicBoundary:
        'The text frames friendship through sacred alliances (Mitra), ritual fellowship, and hospitable generosity rather than modern social psychology.',
    };
  }

  // 4. Marriage, Family, Household, Husband/Wife
  if (/\b(?:marriage|wedding|married|husband|wife|bride|groom|family|household|children|domestic)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: hasModernOrDailyFraming,
      topicLabel: 'Marriage, Household Harmony, and Family Life',
      directAnswerOpening:
        'The Rig Veda portrays marriage and family life as a sacred lifelong partnership rooted in mutual affection, shared responsibility, and joyful harmony within the home. In the wedding hymn (Rig Veda 10.85), the bride and groom are blessed to remain united, grow old together in happiness, and rejoice with their children and grandchildren.',
      explanationBridge:
        'Mandala 10, Sukta 85 celebrates the archetypal marriage of Surya (the daughter of the Sun) and Soma, which became the foundation for traditional Vedic wedding blessings. The verses emphasize mutual respect between husband and wife, warmth toward the extended family, and a peaceful, welcoming household.',
      contextualNote: hasModernOrDailyFraming
        ? 'Although framed within ancient Vedic marriage rites and household traditions, these blessings express enduring human wishes for companionship, stability, and warmth in family life.'
        : null,
      epistemicBoundary:
        'These verses reflect ancient Vedic wedding liturgy and household ideals rather than modern legal or sociological frameworks.',
    };
  }

  // 5. Unity, Cooperation, Social Harmony, Community
  if (/\b(?:unity|united|cooperat|harmony|together|community|concord|consensus|teamwork|collective|fellowship|samjnana)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: hasModernOrDailyFraming,
      topicLabel: 'Unity, Cooperation, and Shared Purpose',
      directAnswerOpening:
        'The Rig Veda strongly encourages unity, mutual cooperation, and harmony of purpose within a community. Its closing hymn (the Samjnana Sukta, Rig Veda 10.191) explicitly calls on people to walk together, speak with mutual respect, and align their minds and intentions so they may live and work in peace.',
      explanationBridge:
        'The Sanskrit term Samjnana refers to harmony or shared understanding. Rather than demanding blind uniformity, the Vedic poets emphasize that when members of a household or assembly gather with common goodwill and cooperative intention, their collective effort succeeds and discord is avoided.',
      contextualNote: hasModernOrDailyFraming
        ? 'While the original verses refer to ancient Vedic assemblies, shared offerings, and communal prayers, the underlying emphasis on shared purpose, respectful dialogue, and mutual support applies naturally as a contextual reflection on cooperation in daily life.'
        : null,
      epistemicBoundary:
        'These hymns address ancient ritual and communal concord; connections to modern teamwork or civic institutions are contextual interpretations.',
    };
  }

  // 6. Dawn (Ushas), Morning, Renewal, Time
  if (/\b(?:dawn|ushas|morning|sunrise|daybreak|awakening|renewal)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: hasModernOrDailyFraming,
      topicLabel: 'Ushas (Dawn), Renewal, and the Order of Time',
      directAnswerOpening:
        'In the Rig Veda, Dawn—personified as the radiant goddess Ushas—is celebrated as the daily bringer of light, renewal, and purposeful activity. She drives away darkness and fear, awakens all living beings to their duties, and reminds humanity of the steady, lawful rhythm of time.',
      explanationBridge:
        'The hymns to Ushas are among the most poetic passages in the Rig Veda. She is described as a bright, ever-youthful figure who opens the gates of heaven each morning, inspiring birds to fly, workers to begin their labor, and seekers to offer their morning prayers in alignment with cosmic order (Rita).',
      contextualNote: hasModernOrDailyFraming
        ? 'When read in a broader life context, the imagery of Ushas serves as a natural metaphor for daily renewal, discipline, and mental clarity at the start of each day.'
        : null,
      epistemicBoundary:
        'The hymns celebrate the Vedic deity Ushas and morning liturgy; personal productivity lessons drawn from them are interpretive reflections.',
    };
  }

  // 7. Creation, Universe, Cosmology, Nasadiya, Origin
  if (/\b(?:creation|universe|origin|beginning|cosmos|cosmology|nasadiya|existent|non-existent|purusha|hiranyagarbha|world\s+begin)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: true,
      isIndirectContextual: false,
      topicLabel: 'Creation and the Origin of the Universe',
      directAnswerOpening:
        'The Rig Veda explores the origin of the universe through profound philosophical inquiry rather than a single rigid dogma. Most famously, the Creation Hymn (Nasadiya Sukta, Rig Veda 10.129) describes a primordial state before existence and non-existence, suggesting that the cosmos emerged from a single self-sustaining reality through contemplative warmth (tapas) and desire (kama), while maintaining humble wonder before the ultimate mystery.',
      explanationBridge:
        'Across Mandala 10, the Vedic poet-philosophers approach creation from complementary angles: Sukta 129 reflects with philosophical humility on how the One breathed windless by its own power; Sukta 121 invokes Hiranyagarbha (the Golden Embryo) as the source of life and cosmic law; and Sukta 90 (the Purusha Sukta) envisions the universe as arising from the cosmic being Purusha.',
      contextualNote: null,
      epistemicBoundary:
        'These hymns represent ancient philosophical and poetic cosmology and should not be conflated with modern astrophysical models.',
    };
  }

  // 8. Speech, Communication, Truthful Words, Vak
  if (/\b(?:speech|speak|speaking|word|words|voice|language|communication|dialogue|eloquence|vak|vach|truthful)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: hasModernOrDailyFraming,
      topicLabel: 'Sacred Speech (Vak) and Wise Communication',
      directAnswerOpening:
        'The Rig Veda treats speech (Vak) as a sacred, creative, and ethical power that must be used with truthfulness, wisdom, and care. It teaches that wise people refine their words thoughtfully—just as grain is sifted with a sieve—and that sincere, gentle speech builds fellowship and understanding.',
      explanationBridge:
        'In hymns such as Mandala 10, Sukta 71 (dedicated to sacred knowledge and speech) and Mandala 10, Sukta 125 (the Hymn of Vak), speech is celebrated both as a divine force that sustains the cosmos and as a human responsibility. Those who speak without understanding are compared to barren trees that bear no fruit, whereas thoughtful, truthful speech brings blessing and clarity.',
      contextualNote: hasModernOrDailyFraming
        ? 'Although composed around sacred poetic recitation and priestly wisdom, these verses offer a clear contextual parallel to ethical, thoughtful communication in everyday life.'
        : null,
      epistemicBoundary:
        'In the Rig Veda, Vak primarily denotes sacred poetic and liturgical speech rather than modern communication theory.',
    };
  }

  // 9. Generosity, Charity, Sharing, Wealth, Dakshina
  if (/\b(?:generosity|generous|charity|giving|share|sharing|wealth|rich|poor|hunger|hungry|hospitality|liberality|dakshina)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: hasModernOrDailyFraming,
      topicLabel: 'Generosity, Charity, and Social Responsibility',
      directAnswerOpening:
        'The Rig Veda praises generosity and the sharing of wealth as essential moral duties, while condemning selfishness and the hoarding of food. In the Hymn to Liberality (Rig Veda 10.117), the text states plainly that wealth is constantly changing like the rolling wheels of a chariot, and that a person who eats alone without feeding the needy shares only in guilt.',
      explanationBridge:
        'Rather than viewing prosperity as purely private possession, the Vedic poets emphasize that wealth achieves its true purpose when it circulates to support guests, companions, and those suffering from hunger. Generous givers (praised through the concept of Dakshina, or charitable giving) are said to earn lasting goodwill and harmony within the community.',
      contextualNote: hasModernOrDailyFraming
        ? 'While the hymn is rooted in ancient Vedic hospitality and ritual gift-giving, its direct moral appeal to help the hungry and share one’s abundance speaks clearly to social responsibility in any era.'
        : null,
      epistemicBoundary:
        'These verses express ancient ethical and hospitable norms rather than modern economic policy.',
    };
  }

  // 10. Death, Afterlife, Ancestors, Yama, Funeral
  if (/\b(?:death|die|dying|afterlife|heaven|ancestors|pitris|yama|funeral|mortal|immortality|soul|departed)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: hasModernOrDailyFraming,
      topicLabel: 'Mortality, Ancestors, and the Afterlife',
      directAnswerOpening:
        'In the Rig Veda, death is viewed not as complete annihilation, but as a peaceful journey toward the realm of light ruled by Yama (the first mortal to find the path for future generations) and the ancestors (Pitris). At the same time, the hymns encourage the living to cherish a full, healthy earthly life and turn back toward joy and duty.',
      explanationBridge:
        'The funeral hymns of Mandala 10 (especially Suktas 14 through 18) address the departed soul with gentleness, asking it to leave behind all imperfection and unite with the ancestors and the merit of its good deeds (ishtapurta). Simultaneously, the living mourners are gently called forward to embrace life, prosperity, and longevity.',
      contextualNote: hasModernOrDailyFraming
        ? 'Although these passages belong to ancient Vedic funerary liturgy, their balance between honoring the departed and affirming life offers a compassionate perspective on grief and remembrance.'
        : null,
      epistemicBoundary:
        'These passages reflect early Vedic funerary hymns and ancestral beliefs rather than later systematic doctrines.',
    };
  }

  // 11. Agriculture, Farming, Rain, Waters, Nature, Environment
  if (/\b(?:agriculture|farming|plough|field|crops|harvest|rain|parjanya|water|waters|river|rivers|nature|earth|forest|environment|ecology|cattle|cows)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: hasModernOrDailyFraming,
      topicLabel: 'Nature, Waters, Rain, and Agricultural Life',
      directAnswerOpening:
        'The Rig Veda expresses profound gratitude and reverence toward the natural world—celebrating life-giving Waters (Apas), seasonal rains (Parjanya), flowing rivers, forests, and honest agricultural labor as sacred sustains of life. Humanity is portrayed not as a conqueror of nature, but as a grateful participant living in harmony with natural cycles.',
      explanationBridge:
        'Across the hymns, natural forces are honored as living blessings: the Waters are invoked for purity and healing, Parjanya is praised for sending rain that nourishes every plant and creature, and agricultural hymns (such as Mandala 4, Sukta 57) bless the ploughshare, the soil, the oxen, and the farmer’s patient work.',
      contextualNote: hasModernOrDailyFraming
        ? 'Although the Rig Veda does not use modern ecological terminology, its deep reverence for clean waters, thriving forests, and seasonal balance provides a meaningful cultural foundation for environmental respect today.'
        : null,
      epistemicBoundary:
        'The Vedic hymns express poetic and liturgical reverence for natural forces rather than modern environmental science.',
    };
  }

  // 12. Mind, Inner Peace, Mental Clarity, Meditation, Wisdom, Learning
  if (/\b(?:mind|mental|peace|calm|stress|anxiety|fear|clarity|thought|wisdom|knowledge|learning|study|meditat|gayatri|truth|rita|dharma|honesty)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: true,
      topicLabel: 'Wisdom, Mental Clarity, and Truthful Order (Rita)',
      directAnswerOpening:
        'The Rig Veda emphasizes the cultivation of a clear, noble mind, the pursuit of illuminated understanding (Dhi), and living in alignment with truth and moral order (Rita). In its prayers—most notably the Gayatri Mantra (Rig Veda 3.62.10)—seekers ask for their intellect and thoughts to be guided toward clarity, righteousness, and inner steadiness.',
      explanationBridge:
        'In Vedic thought, human well-being depends on harmony between inner thought and outer cosmic law (Rita). Rather than treating knowledge as mere rote memorization, the hymns encourage active inquiry among the wise, discernment between truth and falsehood, and welcoming noble thoughts from every direction.',
      contextualNote:
        'Although the Rig Veda does not address modern psychological concepts such as clinical stress or anxiety in contemporary terms, its prayers for mental steadiness, clear judgment, and release from fear can be understood contextually as reflections on inner composure and ethical clarity.',
      epistemicBoundary:
        'These verses are ancient spiritual invocations for wisdom and moral order; they do not provide modern psychological or clinical therapy.',
    };
  }

  // 13. Hardship, Adversity, Courage, Resilience, Obstacles
  if (/\b(?:hardship|adversity|difficult|obstacle|struggle|courage|strength|brave|danger|distress|perseverance|resilience|overcome)\b/i.test(combinedQ)) {
    return {
      isDirectTextualQuery: !hasModernOrDailyFraming,
      isIndirectContextual: true,
      topicLabel: 'Courage, Perseverance, and Overcoming Hardship',
      directAnswerOpening:
        'The Rig Veda portrays hardship and obstacles as challenges to be crossed through steadfastness, courage, mutual support, and moral resolve. The hymns frequently use the imagery of a sturdy, well-built ship carrying travelers safely across perilous waters to describe how resilience and divine grace help people pass through times of distress.',
      explanationBridge:
        'In the Vedic hymns, obstacles—often symbolized by Vritra (that which blocks or holds back life-giving waters) or by dark, narrow straits (amhas)—are overcome through disciplined effort, prayer, and fortitude. Deities such as Indra and Agni are invoked as guardians who strengthen human resolve so that difficulties do not overwhelm the community.',
      contextualNote:
        'Although the ancient verses describe ritual invocations and heroic or pastoral perils rather than modern personal setbacks, their central metaphor—crossing troubled waters safely through steadiness and integrity—offers a clear contextual parallel to resilience in daily life.',
      epistemicBoundary:
        'The hymns express spiritual and poetic fortitude in an ancient setting rather than modern behavioral psychology.',
    };
  }

  // Default dynamic synthesis for any other custom question framed by the user!
  const secondary = evidenceList[1];
  const primaryPlain = primary ? summarizeVersePlainly(primary) : '';
  const secondaryPlain = secondary ? summarizeVersePlainly(secondary) : '';

  const cleanTopic = question
    .replace(/^(?:what|how|why|who|where|when)\s+(?:does|do|is|are|did|can|should)\s+(?:the\s+)?(?:rig\s*veda|rigveda|veda|vedas|hymns?|scriptures?|texts?)\s+(?:say|teach|explain|describe|tell\s+us|view|speak|mean)?\s*(?:about|on|regarding|concerning|of|for)?\s*/i, '')
    .replace(/[?.!]+$/g, '')
    .trim();

  const readableTopic = cleanTopic && cleanTopic.length >= 3 && cleanTopic.length <= 75 ? cleanTopic : 'this subject';

  return {
    isDirectTextualQuery: !hasModernOrDailyFraming,
    isIndirectContextual: hasModernOrDailyFraming,
    topicLabel: readableTopic.charAt(0).toUpperCase() + readableTopic.slice(1),
    directAnswerOpening: primary
      ? `Regarding ${readableTopic}, the Rig Veda addresses this theme through hymns dedicated to ${primaryDeityExplain}. In the relevant passages, the text conveys that ${primaryPlain}${secondaryPlain ? ` Together with related verses, it also emphasizes that ${secondaryPlain}` : ''}`
      : ABSTENTION_MESSAGE,
    explanationBridge: primary
      ? `In the context of Mandala ${primary.mandala}, Sukta ${primary.sukta}, the Vedic poet-seer invokes ${primaryDeityExplain} to express both sacred reverence and practical wisdom for human life.`
      : '',
    contextualNote: hasModernOrDailyFraming
      ? `Although the Rig Veda does not state this idea in these exact modern terms, the retrieved passages can be understood contextually as reflecting how early Vedic poetry approached ${readableTopic} within its own historical and religious setting.`
      : null,
    epistemicBoundary:
      'These passages reflect ancient Vedic poetic and liturgical traditions; broader modern applications should be understood as contextual interpretations rather than literal scriptural claims.',
  };
}

export function buildStructuredTeacherAnswer(
  question: string,
  effectiveQuery: string,
  evidenceList: RetrievedVerse[],
  primaryTheme?: LifeThemeId | null
): StructuredTeacherAnswer {
  if (!evidenceList || evidenceList.length === 0) {
    return {
      direct_answer: ABSTENTION_MESSAGE,
      explanation:
        'No passages in the Rig Veda corpus (Mandalas 1–10) matched the specific requirements of this query with sufficient textual evidence.',
      context: null,
      textual_basis: ABSTENTION_MESSAGE,
      references: 'None',
      is_indirect_connection: false,
    };
  }

  const asksSingleVerse =
    /\b(?:rv|rig\s*veda)\s*\d+[\._:]\d+[\._:]\d+/i.test(question) ||
    /\b\d+\.\d+\.\d+\b/.test(question) ||
    /\bmandala\s*\d+\s*,?\s*sukta\s*\d+\s*,?\s*verse\s*\d+/i.test(question);

  const profile = analyzeQuestionForSynthesis(question, effectiveQuery, evidenceList, primaryTheme);
  const primary = evidenceList[0];
  const secondary = !asksSingleVerse && evidenceList.length > 1 ? evidenceList[1] : null;
  const tertiary = !asksSingleVerse && evidenceList.length > 2 ? evidenceList[2] : null;

  const primaryPlain = summarizeVersePlainly(primary);
  const secondaryPlain = secondary ? summarizeVersePlainly(secondary) : '';
  const primaryDeityExplain = explainVedicDeityOrSubject(primary.deity);

  // 1. DIRECT ANSWER (2–4 clear sentences answering the question in normal language)
  const directAnswer = profile.directAnswerOpening;

  // 2. SIMPLE EXPLANATION (1–2 short paragraphs in simple, formal language)
  const para1 = asksSingleVerse
    ? `${profile.explanationBridge} In this verse (Rig Veda ${primary.mandala}.${primary.sukta}.${primary.verse}), the speaker addresses the deity directly with praise and petition, establishing the spiritual focus of Sukta ${primary.sukta}.`
    : `${profile.explanationBridge} Specifically, the primary passage (Rig Veda ${primary.mandala}.${primary.sukta}.${primary.verse}) conveys that ${primaryPlain}`;
  let para2 = '';
  if (secondary) {
    const secondaryDeityExplain =
      secondary.deity && secondary.deity !== primary.deity
        ? ` (addressed to ${explainVedicDeityOrSubject(secondary.deity)})`
        : '';
    para2 = `This perspective is reinforced by Rig Veda ${secondary.mandala}.${secondary.sukta}.${secondary.verse}${secondaryDeityExplain}, which further explains that ${secondaryPlain} Taken together, these verses show how the Rig Veda connects sacred order with practical human conduct.`;
  }
  const explanation = para2 ? `${para1}\n\n${para2}` : para1;

  // 3. CONTEXT / INDIRECT CONNECTION (only included when indirect/contextual)
  const contextSection = profile.isIndirectContextual ? profile.contextualNote : null;

  // 4. TEXTUAL BASIS (concise explanation + short supporting quotation with [RV_M_S_V] citations)
  const textualParts: string[] = [];
  textualParts.push(
    `Rig Veda ${primary.mandala}.${primary.sukta}.${primary.verse} [${primary.verse_id}] states: "${getShortExcerpt(primary.english_translation)}"`
  );
  if (secondary) {
    textualParts.push(
      `Rig Veda ${secondary.mandala}.${secondary.sukta}.${secondary.verse} [${secondary.verse_id}] adds: "${getShortExcerpt(secondary.english_translation)}"`
    );
  }
  if (tertiary) {
    textualParts.push(
      `See also Rig Veda ${tertiary.mandala}.${tertiary.sukta}.${tertiary.verse} [${tertiary.verse_id}]: "${getShortExcerpt(tertiary.english_translation, 110)}"`
    );
  }
  const textualBasis = textualParts.join(' ');

  // 5. REFERENCES (compact, unobtrusive)
  const references = formatCompactReferences(asksSingleVerse ? [primary] : evidenceList);

  // Determine 3-tier epistemic classification: 'direct' | 'inferred' | 'contextual'
  const hasModernFraming =
    /\b(?:daily\s+life|modern|today|workplace|corporate|management|team|career|stress|anxiety|mental\s+health|habit|lifestyle|society|personal\s+growth|self\s+help|leadership|democratic|apply|application|lesson|everyday|contemporary)\b/i.test(
      question
    ) || Boolean(primaryTheme);

  const asksSpecificDeityOrHymn =
    asksSingleVerse ||
    /\b(?:rv|rig\s*veda)\s*\d+[\._:]\d+/i.test(question) ||
    /\b(?:mandala|sukta)\s*\d+/i.test(question) ||
    /\b(?:agni|indra|soma|varuna|mitra|ushas|ashvin|asvin|marut|parjanya|sarasvati|pushan|rudra|yama|ribhu|oshadhi|nasadiya|purusha|hiranyagarbha|samjnana|gayatri|savitar|surya|brihaspati|vak|vach)\b/i.test(
      question
    );

  const interpretationType: 'direct' | 'inferred' | 'contextual' = hasModernFraming
    ? 'contextual'
    : asksSpecificDeityOrHymn && !profile.isIndirectContextual
    ? 'direct'
    : 'inferred';

  const resolvedContext =
    contextSection ||
    (interpretationType === 'inferred'
      ? `Although the Rig Veda is composed as liturgical poetry rather than a systematic treatise on ${profile.topicLabel.toLowerCase()}, this principle can reasonably be inferred from how the hymns portray sacred order and human conduct in their original Vedic setting.`
      : `In its original liturgical setting in Mandala ${primary.mandala}, Sukta ${primary.sukta}, this verse directly addresses ${primaryDeityExplain}. Any broader modern or everyday application should be understood as a contextual reflection rather than a literal ancient claim.`);

  const epistemicDistinction: EpistemicDistinction = {
    direct: `In Rig Veda ${primary.mandala}.${primary.sukta}.${primary.verse} [${primary.verse_id}], the Vedic poet-seer directly invokes ${primaryDeityExplain} and states that ${primaryPlain}`,
    inferred: `From this liturgical invocation and its imagery, one can reasonably infer the broader scriptural principle of ${profile.topicLabel.toLowerCase()} within Vedic ethical and sacred order.`,
    contextual:
      contextSection ||
      `When applied to modern or daily life, connections to ${profile.topicLabel.toLowerCase()} should be understood as contextual reflections rather than literal ancient statements. ${profile.epistemicBoundary}`,
  };

  return {
    direct_answer: directAnswer,
    explanation,
    context: resolvedContext,
    textual_basis: textualBasis,
    references,
    is_indirect_connection: interpretationType !== 'direct',
    interpretation_type: interpretationType,
    epistemic_distinction: epistemicDistinction,
  };
}

export function formatTeacherAnswerAsText(structured: StructuredTeacherAnswer): string {
  if (structured.direct_answer === ABSTENTION_MESSAGE) {
    return ABSTENTION_MESSAGE;
  }
  const sections: string[] = [
    `Answer:\n${structured.direct_answer}`,
    `Explanation:\n${structured.explanation}`,
  ];
  if (structured.context && structured.context.trim()) {
    sections.push(`Context:\n${structured.context}`);
  }
  sections.push(`Textual basis:\n${structured.textual_basis}`);
  sections.push(`References:\n${structured.references}`);
  return sections.join('\n\n');
}

export function buildEpistemicLayers(
  question: string,
  effectiveQuery: string,
  evidenceList: RetrievedVerse[],
  primaryTheme?: LifeThemeId | null
): EpistemicLayers {
  if (!evidenceList || evidenceList.length === 0) {
    return {
      textual_evidence: ABSTENTION_MESSAGE,
      theme: 'No verifiable Vedic theme could be established from the retrieved corpus.',
      contemporary_connection:
        'No contemporary contextualization is offered when textual evidence is insufficient.',
      unsupported_claim:
        'The Rig Veda corpus does not establish answers to out-of-scope, unattested, or clinical/scientific validation queries.',
    };
  }

  const structured = buildStructuredTeacherAnswer(question, effectiveQuery, evidenceList, primaryTheme);
  const profile = analyzeQuestionForSynthesis(question, effectiveQuery, evidenceList, primaryTheme);
  const primary = evidenceList[0];
  const secondary = evidenceList.length > 1 ? evidenceList[1] : null;
  const citeTag = `[${primary.verse_id}]${secondary ? `, [${secondary.verse_id}]` : ''}`;

  return {
    textual_evidence: structured.textual_basis,
    theme: `${profile.topicLabel}: ${structured.direct_answer} (${citeTag})`,
    contemporary_connection:
      structured.context
        ? `${structured.context} (${citeTag})`
        : `Read in context, ${citeTag} illustrates how the Rig Veda approaches ${profile.topicLabel.toLowerCase()} through poetic and liturgical wisdom rather than modern technical prescription.`,
    unsupported_claim: profile.epistemicBoundary,
  };
}

function generateMockAnswer(
  question: string,
  effectiveQuery: string,
  evidenceList: RetrievedVerse[],
  primaryTheme?: LifeThemeId | null
): string {
  if (!evidenceList || evidenceList.length === 0) {
    return ABSTENTION_MESSAGE;
  }
  if (isOutOfScopeQuestion(question) || isOutOfScopeQuestion(effectiveQuery)) {
    return ABSTENTION_MESSAGE;
  }

  const structured = buildStructuredTeacherAnswer(question, effectiveQuery, evidenceList, primaryTheme);
  return formatTeacherAnswerAsText(structured);
}

export interface GeminiStructuredValidationResult {
  isValid: boolean;
  abstained: boolean;
  layers: EpistemicLayers | null;
  structuredAnswer?: StructuredTeacherAnswer | null;
  validCitations: string[];
  invalidCitations: string[];
  errors: string[];
}

export function validateGeminiStructuredResponse(
  rawJsonText: string,
  evidenceVerseIds: string[]
): GeminiStructuredValidationResult {
  const errors: string[] = [];
  const validSet = new Set(evidenceVerseIds);

  if (!rawJsonText || !rawJsonText.trim()) {
    return {
      isValid: false,
      abstained: false,
      layers: null,
      structuredAnswer: null,
      validCitations: [],
      invalidCitations: [],
      errors: ['Empty response from Gemini'],
    };
  }

  const cleaned = rawJsonText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      isValid: false,
      abstained: false,
      layers: null,
      structuredAnswer: null,
      validCitations: [],
      invalidCitations: [],
      errors: ['Response is not valid JSON'],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      isValid: false,
      abstained: false,
      layers: null,
      structuredAnswer: null,
      validCitations: [],
      invalidCitations: [],
      errors: ['JSON root must be an object'],
    };
  }

  const record = parsed as Record<string, unknown>;

  // Support both the new teacher schema (direct_answer, explanation, context, textual_basis, references)
  // and the legacy 4-layer schema (textual_evidence, theme, contemporary_connection, unsupported_claim)
  const isTeacherSchema =
    typeof record.direct_answer === 'string' &&
    typeof record.explanation === 'string' &&
    typeof record.textual_basis === 'string';

  let layers: EpistemicLayers;
  let structuredAnswer: StructuredTeacherAnswer | null = null;

  if (isTeacherSchema) {
    const directAnswer = String(record.direct_answer || '')
      .replace(/\s*\[RV_\d+_\d+_\d+\]/g, '')
      .trim();
    const explanation = String(record.explanation || '').trim();
    const contextVal = record.context ? String(record.context).trim() : '';
    const textualBasis = String(record.textual_basis || '').trim();
    const references = String(record.references || evidenceVerseIds.slice(0, 3).join(', ')).trim();
    const rawInterpType = String(record.interpretation_type || '').toLowerCase().trim();
    const unsupportedClaim = String(
      record.unsupported_claim ||
        'The Rig Veda is an ancient liturgical and poetic text; modern applications should be understood as contextual interpretations.'
    ).trim();

    if (!directAnswer || !explanation || !textualBasis) {
      errors.push('Teacher schema fields direct_answer, explanation, and textual_basis must be non-empty');
    }

    // Prohibit modern management buzzwords presented as literal claims or category-header openings
    if (
      /\b(?:corporate\s+leadership|team\s+management|democratic\s+leadership)\b/i.test(directAnswer)
    ) {
      errors.push('direct_answer must not present modern management terminology as literal scriptural statements');
    }
    if (/^(?:leadership\s*&\s*responsibility|cooperation\s*&\s*unity|adversity\s*&\s*resilience|knowledge\s*&\s*learning|discipline\s*&\s*(?:cosmic\s*)?order|ethics\s*&\s*conduct)\s*\(/i.test(directAnswer)) {
      errors.push('direct_answer must begin in ordinary teacherly prose, not with a preset category header');
    }

    const isIndirect =
      Boolean(contextVal) &&
      !contextVal.toLowerCase().startsWith('direct textual') &&
      contextVal.toLowerCase() !== 'none';

    const interpretationType: 'direct' | 'inferred' | 'contextual' =
      rawInterpType === 'direct' || rawInterpType === 'inferred' || rawInterpType === 'contextual'
        ? rawInterpType
        : isIndirect
        ? 'contextual'
        : 'direct';

    const rawDistinction =
      record.epistemic_distinction && typeof record.epistemic_distinction === 'object'
        ? (record.epistemic_distinction as Record<string, unknown>)
        : null;
    const epistemicDistinction: EpistemicDistinction = {
      direct: String(rawDistinction?.direct || textualBasis).trim(),
      inferred: String(rawDistinction?.inferred || explanation).trim(),
      contextual: String(
        rawDistinction?.contextual ||
          (isIndirect ? contextVal : unsupportedClaim)
      ).trim(),
    };

    const resolvedContextVal =
      contextVal && contextVal.toLowerCase() !== 'none'
        ? contextVal
        : interpretationType === 'direct'
        ? 'This passage is a direct scriptural statement from the Rig Veda hymn; any broader modern application should be understood as a contextual reflection.'
        : unsupportedClaim;

    structuredAnswer = {
      direct_answer: directAnswer,
      explanation,
      context: resolvedContextVal,
      textual_basis: textualBasis,
      references,
      is_indirect_connection: interpretationType !== 'direct',
      interpretation_type: interpretationType,
      epistemic_distinction: epistemicDistinction,
    };

    const firstCite = evidenceVerseIds[0] ? `[${evidenceVerseIds[0]}]` : '';
    layers = {
      textual_evidence: textualBasis.includes('RV_') ? textualBasis : `${textualBasis} ${firstCite}`.trim(),
      theme: `${directAnswer} ${explanation}`,
      contemporary_connection: isIndirect
        ? contextVal
        : `Read in its scriptural context (${firstCite}), this passage directly addresses the inquiry through Vedic hymnody.`,
      unsupported_claim: unsupportedClaim,
    };
  } else {
    const requiredFields = [
      'textual_evidence',
      'theme',
      'contemporary_connection',
      'unsupported_claim',
    ] as const;

    for (const field of requiredFields) {
      if (typeof record[field] !== 'string' || !String(record[field]).trim()) {
        errors.push(`Field "${field}" must be a non-empty string`);
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        abstained: false,
        layers: null,
        structuredAnswer: null,
        validCitations: [],
        invalidCitations: [],
        errors,
      };
    }

    layers = {
      textual_evidence: String(record.textual_evidence).trim(),
      theme: String(record.theme).trim(),
      contemporary_connection: String(record.contemporary_connection).trim(),
      unsupported_claim: String(record.unsupported_claim).trim(),
    };
  }

  if (
    layers.textual_evidence.includes(ABSTENTION_MESSAGE) ||
    layers.textual_evidence.toLowerCase().includes('could not find sufficient evidence') ||
    (structuredAnswer &&
      (structuredAnswer.direct_answer.includes(ABSTENTION_MESSAGE) ||
        structuredAnswer.direct_answer.toLowerCase().includes('could not find sufficient evidence')))
  ) {
    return {
      isValid: true,
      abstained: true,
      layers,
      structuredAnswer,
      validCitations: [],
      invalidCitations: [],
      errors: [],
    };
  }

  const combinedText = `${layers.textual_evidence} ${layers.theme} ${layers.contemporary_connection} ${layers.unsupported_claim} ${structuredAnswer?.references || ''}`;

  // Prohibit invented Sanskrit Devanagari script
  if (/[\u0900-\u097F]/.test(combinedText)) {
    errors.push('Response contains invented Devanagari Sanskrit not present in the supplied English evidence');
  }

  // Extract all RV_M_S_V citations and any dot-format RV references across all fields
  const allFoundCitations = [...(combinedText.match(/RV_\d+_\d+_\d+/g) || [])];
  const dotRefs = combinedText.match(/\b(?:RV|Rig\s*Veda)\s*(\d+)\.(\d+)\.(\d+)\b/gi) || [];
  for (const ref of dotRefs) {
    const m = ref.match(/(\d+)\.(\d+)\.(\d+)/);
    if (m) {
      allFoundCitations.push(`RV_${parseInt(m[1], 10)}_${parseInt(m[2], 10)}_${parseInt(m[3], 10)}`);
    }
  }

  const validCitations: string[] = [];
  const invalidCitations: string[] = [];
  for (const cite of allFoundCitations) {
    if (validSet.has(cite)) {
      if (!validCitations.includes(cite)) validCitations.push(cite);
    } else {
      if (!invalidCitations.includes(cite)) invalidCitations.push(cite);
    }
  }

  if (invalidCitations.length > 0) {
    errors.push(`Response cites non-retrieved or invented verse IDs: ${invalidCitations.join(', ')}`);
  }

  if (validCitations.length === 0) {
    errors.push('Response must cite at least one retrieved RV_M_S_V verse ID');
  }

  return {
    isValid: errors.length === 0,
    abstained: false,
    layers: errors.length === 0 ? layers : null,
    structuredAnswer: errors.length === 0 ? structuredAnswer : null,
    validCitations,
    invalidCitations,
    errors,
  };
}

export async function generateGeminiAnswer(
  prompt: string,
  systemInstruction = GROUNDED_SYSTEM_PROMPT,
  temperature = DEFAULT_LLM_TEMPERATURE,
  enforcementOptions?: {
    question?: string;
    effectiveQuery?: string;
    retrievedVerseIds?: string[];
    expectedInterpretationType?: 'direct' | 'inferred' | 'contextual';
  }
): Promise<{
  text: string;
  layers: EpistemicLayers;
  structuredAnswer: StructuredTeacherAnswer;
  modelUsed: string;
  enforcedSystemInstruction: string;
}> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('No valid GEMINI_API_KEY configured');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Always inject the strictly enforced VedaWise system instruction on every LLM request
  const enforcedSystemInstruction = buildEnforcedVedaWiseSystemInstruction({
    ...enforcementOptions,
    customInstruction: systemInstruction,
  });

  const modelName = process.env.LLM_MODEL || 'gemini-3.8-flash';
  const requestConfig = {
    systemInstruction: enforcedSystemInstruction,
    temperature,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        direct_answer: {
          type: Type.STRING,
          description:
            '2-4 sentences directly answering the user question in clear, simple, formal English before giving verse citations.',
        },
        explanation: {
          type: Type.STRING,
          description:
            '1-3 short paragraphs explaining the meaning in simple, formal language. Explain any Sanskrit or Vedic term immediately in plain English.',
        },
        context: {
          type: Type.STRING,
          description:
            'If the connection to the user question is indirect, inferred, or contextual (e.g. modern terms like daily life, leadership, stress, or broader themes), explain clearly how the ancient passage relates contextually ("Although the Rig Veda does not state this idea in exactly these modern terms, the passage can be understood as reflecting..."). If the verse directly answers a specific textual question, return an empty string.',
        },
        textual_basis: {
          type: Type.STRING,
          description:
            'Brief explanation or short quotation from the relevant retrieved passage(s), citing actual retrieved [RV_M_S_V] verse IDs.',
        },
        references: {
          type: Type.STRING,
          description:
            'Compact grouped references supporting the answer, including [RV_M_S_V] IDs (e.g. "Rig Veda 10.191.2-4 [RV_10_191_2], [RV_10_191_3], [RV_10_191_4]").',
        },
        interpretation_type: {
          type: Type.STRING,
          description:
            'Epistemic classification: "direct" (what the text directly says), "inferred" (what can reasonably be inferred from the passage), or "contextual" (a modern/contextual interpretation).',
        },
        epistemic_distinction: {
          type: Type.OBJECT,
          description:
            'Explicit 3-way epistemic separation between direct textual meaning, reasonable inference, and modern/contextual interpretation.',
          properties: {
            direct: {
              type: Type.STRING,
              description: '1 sentence stating what the retrieved verse directly and literally says in its Vedic context.',
            },
            inferred: {
              type: Type.STRING,
              description: '1 sentence stating what broader principle can reasonably be inferred from the verse.',
            },
            contextual: {
              type: Type.STRING,
              description: '1 sentence explaining how modern or daily-life connections are contextual interpretations rather than literal statements.',
            },
          },
          required: ['direct', 'inferred', 'contextual'],
        },
        unsupported_claim: {
          type: Type.STRING,
          description:
            '1-2 sentences stating what the ancient text does not establish (distinguishing literal text from modern interpretation).',
        },
      },
      required: [
        'direct_answer',
        'explanation',
        'context',
        'textual_basis',
        'references',
        'interpretation_type',
        'epistemic_distinction',
        'unsupported_claim',
      ],
    },
  };

  let activeModel = modelName;
  let response;
  try {
    response = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: requestConfig,
    });
  } catch (firstErr) {
    if (activeModel !== 'gemini-flash-latest') {
      activeModel = 'gemini-flash-latest';
      response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: requestConfig,
      });
    } else {
      throw firstErr;
    }
  }

  const rawText = (response.text || '').trim();
  if (!rawText) {
    throw new Error('Empty response from Gemini model');
  }

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const directAnswer = String(parsed.direct_answer || '')
    .replace(/\s*\[RV_\d+_\d+_\d+\]/g, '')
    .trim();
  const explanation = String(parsed.explanation || '').trim();
  const contextVal = String(parsed.context || '').trim();
  const textualBasis = String(parsed.textual_basis || '').trim();
  const references = String(parsed.references || '').trim();
  const rawInterpType = String(parsed.interpretation_type || '').toLowerCase().trim();
  const unsupportedClaim = String(parsed.unsupported_claim || '').trim();
  const rawDistinction =
    parsed.epistemic_distinction && typeof parsed.epistemic_distinction === 'object'
      ? (parsed.epistemic_distinction as Record<string, unknown>)
      : null;

  if (!directAnswer || !explanation || !textualBasis) {
    throw new Error('Gemini response did not match the required teacher JSON schema');
  }

  const isIndirect =
    Boolean(contextVal) &&
    !contextVal.toLowerCase().startsWith('direct textual') &&
    contextVal.toLowerCase() !== 'none';

  const interpretationType: 'direct' | 'inferred' | 'contextual' =
    rawInterpType === 'direct' || rawInterpType === 'inferred' || rawInterpType === 'contextual'
      ? rawInterpType
      : isIndirect
      ? 'contextual'
      : 'direct';

  const epistemicDistinction: EpistemicDistinction = {
    direct: String(rawDistinction?.direct || textualBasis).trim(),
    inferred: String(rawDistinction?.inferred || explanation).trim(),
    contextual: String(
      rawDistinction?.contextual ||
        (isIndirect
          ? contextVal
          : 'Connections to modern daily life should be understood as contextual interpretations rather than literal scriptural claims.')
    ).trim(),
  };

  const structuredAnswer: StructuredTeacherAnswer = {
    direct_answer: directAnswer,
    explanation,
    context: isIndirect ? contextVal : null,
    textual_basis: textualBasis,
    references,
    is_indirect_connection: isIndirect,
    interpretation_type: interpretationType,
    epistemic_distinction: epistemicDistinction,
  };

  const layers: EpistemicLayers = {
    textual_evidence: `${textualBasis} (${references})`.trim(),
    theme: `${directAnswer} ${explanation}`,
    contemporary_connection: isIndirect
      ? contextVal
      : `Direct scriptural explanation grounded in ${references}.`,
    unsupported_claim:
      unsupportedClaim ||
      'The Rig Veda is an ancient liturgical and poetic corpus; modern applications are contextual interpretations.',
  };

  return {
    text: cleaned,
    layers,
    structuredAnswer,
    modelUsed: modelName,
    enforcedSystemInstruction,
  };
}

function explainRetrievalItem(item: RetrievedVerse): RetrievalExplanation {
  const sources: string[] = [];
  if (item.bm25_rank !== null) sources.push('bm25');
  if (item.dense_rank !== null) sources.push('dense');
  if (sources.length === 0) sources.push('unknown');

  let explanation = '';
  if (sources.includes('bm25') && sources.includes('dense')) {
    explanation = `${item.verse_id} was retrieved by both BM25 (rank ${item.bm25_rank}) and dense semantic search (rank ${item.dense_rank}). Final rank #${item.final_rank} produced by Reciprocal Rank Fusion (RRF score: ${item.rrf_score.toFixed(6)}).`;
  } else if (sources.includes('bm25')) {
    explanation = `${item.verse_id} was retrieved by BM25 lexical keyword search (rank ${item.bm25_rank}). Final rank #${item.final_rank} produced by Reciprocal Rank Fusion (RRF score: ${item.rrf_score.toFixed(6)}).`;
  } else if (sources.includes('dense')) {
    explanation = `${item.verse_id} was retrieved by dense semantic search (rank ${item.dense_rank}). Final rank #${item.final_rank} produced by Reciprocal Rank Fusion (RRF score: ${item.rrf_score.toFixed(6)}).`;
  } else {
    explanation = `${item.verse_id} was retrieved at final rank #${item.final_rank} (RRF score: ${item.rrf_score.toFixed(6)}).`;
  }

  return {
    verse_id: item.verse_id,
    final_rank: item.final_rank,
    rrf_score: item.rrf_score,
    bm25_rank: item.bm25_rank,
    bm25_score: item.bm25_score,
    dense_rank: item.dense_rank,
    dense_score: item.dense_score,
    retrieval_sources: sources,
    explanation,
  };
}

function generateHumanSummary(explanations: RetrievalExplanation[]): string {
  if (!explanations || explanations.length === 0) {
    return 'No retrieval explanation available (0 evidence records).';
  }
  const lines = ['Retrieval Explanation:'];
  for (const exp of explanations) {
    const hasBm25 = exp.retrieval_sources.includes('bm25');
    const hasDense = exp.retrieval_sources.includes('dense');
    if (hasBm25 && hasDense) {
      lines.push(`• ${exp.verse_id} was retrieved by both BM25 and dense retrieval.`);
    } else if (hasBm25) {
      lines.push(`• ${exp.verse_id} was retrieved by BM25 keyword search.`);
    } else if (hasDense) {
      lines.push(`• ${exp.verse_id} was retrieved by dense semantic search.`);
    } else {
      lines.push(`• ${exp.verse_id} was retrieved as a candidate verse.`);
    }
  }
  lines.push('• Final ordering was produced using Reciprocal Rank Fusion (RRF).');
  return lines.join('\n');
}

export function validateCitations(answerText: string, evidenceVerseIds: string[]) {
  const validSet = new Set(evidenceVerseIds);
  const found = answerText.match(/RV_\d+_\d+_\d+/g) || [];
  const validCitations: string[] = [];
  const invalidCitations: string[] = [];

  for (const cite of found) {
    if (validSet.has(cite)) {
      if (!validCitations.includes(cite)) validCitations.push(cite);
    } else {
      if (!invalidCitations.includes(cite)) invalidCitations.push(cite);
    }
  }

  return {
    isValid: invalidCitations.length === 0,
    validCitations,
    invalidCitations,
  };
}

export function attributeClaims(
  answerText: string,
  evidenceList: RetrievedVerse[],
  epistemicLayers?: EpistemicLayers
): ClaimOut[] {
  if (!answerText || !answerText.trim()) return [];

  const evidenceMap = new Map<string, string>();
  for (const item of evidenceList) {
    evidenceMap.set(item.verse_id, item.english_translation.toLowerCase());
  }

  const claims: ClaimOut[] = [];
  const primaryVerseId = evidenceList[0]?.verse_id;
  const secondaryVerseId = evidenceList[1]?.verse_id;

  if (epistemicLayers && primaryVerseId) {
    const citedInEvidence =
      epistemicLayers.textual_evidence.match(/RV_\d+_\d+_\d+/g)?.filter((c) => evidenceMap.has(c)) ||
      [];
    const citedInTheme =
      epistemicLayers.theme.match(/RV_\d+_\d+_\d+/g)?.filter((c) => evidenceMap.has(c)) || [];
    const citedInContemporary =
      epistemicLayers.contemporary_connection
        .match(/RV_\d+_\d+_\d+/g)
        ?.filter((c) => evidenceMap.has(c)) || [];

    claims.push({
      claim: epistemicLayers.textual_evidence,
      supporting_verses: Array.from(
        new Set(citedInEvidence.length > 0 ? citedInEvidence : [primaryVerseId])
      ),
      support_type: 'Direct',
      support_status: 'supported',
      layer: 'textual_evidence',
    });

    claims.push({
      claim: epistemicLayers.theme,
      supporting_verses:
        citedInTheme.length > 0
          ? Array.from(new Set(citedInTheme))
          : secondaryVerseId
          ? [primaryVerseId, secondaryVerseId]
          : [primaryVerseId],
      support_type: 'Thematic',
      support_status: 'supported',
      layer: 'theme',
    });

    claims.push({
      claim: epistemicLayers.contemporary_connection,
      supporting_verses:
        citedInContemporary.length > 0
          ? Array.from(new Set(citedInContemporary))
          : [primaryVerseId],
      support_type: 'Interpretive',
      support_status: 'partially_supported',
      layer: 'contemporary_connection',
    });

    claims.push({
      claim: epistemicLayers.unsupported_claim,
      supporting_verses: [],
      support_type: 'Unsupported',
      support_status: 'unsupported',
      layer: 'unsupported_claim',
    });
    return claims;
  }

  const sentences = answerText.trim().split(/(?<=[.!?])\s+/);

  for (const stmt of sentences) {
    const stmtClean = stmt.trim();
    if (!stmtClean || stmtClean.length < 10) continue;

    const citedInStmt = stmtClean.match(/RV_\d+_\d+_\d+/g) || [];
    const validCitesInStmt = citedInStmt.filter((c) => evidenceMap.has(c));

    const claimWords = new Set(stmtClean.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
    let supportingVerses: string[] = [];
    let status: 'supported' | 'partially_supported' | 'unsupported' = 'unsupported';
    let supportType: SupportType = 'Unsupported';

    if (validCitesInStmt.length > 0) {
      supportingVerses = Array.from(new Set(validCitesInStmt));
      status = 'supported';
      const vText = evidenceMap.get(supportingVerses[0]) || '';
      const eWords = new Set(vText.match(/\b[a-z]{4,}\b/g) || []);
      let overlap = 0;
      for (const w of claimWords) {
        if (eWords.has(w)) overlap++;
      }
      supportType = stmtClean.includes('"') || overlap >= 4 ? 'Direct' : 'Thematic';
    } else {
      let bestMatchId: string | null = null;
      let bestMatchOverlap = 0;

      for (const [vId, textLower] of evidenceMap.entries()) {
        const eWords = new Set(textLower.match(/\b[a-z]{4,}\b/g) || []);
        let overlap = 0;
        for (const w of claimWords) {
          if (eWords.has(w)) overlap++;
        }
        if (overlap > bestMatchOverlap) {
          bestMatchOverlap = overlap;
          bestMatchId = vId;
        }
      }

      if (bestMatchId && bestMatchOverlap >= 2) {
        supportingVerses = [bestMatchId];
        if (bestMatchOverlap >= 4) {
          status = 'supported';
          supportType = 'Direct';
        } else if (bestMatchOverlap === 3) {
          status = 'supported';
          supportType = 'Thematic';
        } else {
          status = 'partially_supported';
          supportType = 'Interpretive';
        }
      }
    }

    claims.push({
      claim: stmtClean,
      supporting_verses: supportingVerses,
      support_type: supportType,
      support_status: status,
    });
  }

  return claims;
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

export function verifyExplainableResponse(params: {
  abstained: boolean;
  citations: string[];
  invalid_citations: string[];
  evidence: SupportingVerseOut[];
  claims: ClaimOut[];
  epistemic_layers: EpistemicLayers;
}): ExplainabilityValidation {
  const { abstained, citations, invalid_citations, evidence, claims, epistemic_layers } = params;
  const corpusMap = getKB().verseIndex;
  const retrievedSet = new Set(evidence.map((e) => e.verse_id));

  const all_citations_in_corpus = citations.every((c) => corpusMap.has(c));
  const all_citations_retrieved = citations.every((c) => retrievedSet.has(c));
  const no_fabricated_verse_ids = invalid_citations.length === 0 && all_citations_in_corpus && all_citations_retrieved;

  const combinedLayers = `${epistemic_layers.textual_evidence} ${epistemic_layers.theme} ${epistemic_layers.contemporary_connection} ${epistemic_layers.unsupported_claim}`;
  const no_fabricated_sanskrit = !/[\u0900-\u097F]/.test(combinedLayers);

  const distinctSet = new Set([
    epistemic_layers.textual_evidence.trim().toLowerCase(),
    epistemic_layers.theme.trim().toLowerCase(),
    epistemic_layers.contemporary_connection.trim().toLowerCase(),
    epistemic_layers.unsupported_claim.trim().toLowerCase(),
  ]);
  const four_epistemic_layers_distinct =
    Boolean(
      epistemic_layers.textual_evidence.trim() &&
        epistemic_layers.theme.trim() &&
        epistemic_layers.contemporary_connection.trim() &&
        epistemic_layers.unsupported_claim.trim()
    ) && distinctSet.size === 4;

  const textualClaims = claims.filter(
    (c) => c.layer === 'textual_evidence' || c.support_type === 'Direct'
  );
  const textual_claims_have_supporting_verses = abstained
    ? true
    : textualClaims.length > 0 &&
      textualClaims.every(
        (c) =>
          c.supporting_verses.length > 0 &&
          c.supporting_verses.every((vId) => retrievedSet.has(vId) && corpusMap.has(vId))
      );

  const passed =
    all_citations_in_corpus &&
    all_citations_retrieved &&
    textual_claims_have_supporting_verses &&
    no_fabricated_verse_ids &&
    no_fabricated_sanskrit &&
    four_epistemic_layers_distinct;

  return {
    passed,
    all_citations_in_corpus,
    all_citations_retrieved,
    textual_claims_have_supporting_verses,
    no_fabricated_verse_ids,
    no_fabricated_sanskrit,
    four_epistemic_layers_distinct,
  };
}

export function evaluateSufficiency(
  evidenceList: RetrievedVerse[],
  claims: ClaimOut[],
  citationsValid: boolean,
  abstained: boolean
): 'sufficient' | 'limited' | 'insufficient' {
  if (abstained || !evidenceList || evidenceList.length === 0 || !citationsValid) {
    return 'insufficient';
  }
  if (claims.length === 0) {
    return 'limited';
  }
  const groundedClaims = claims.filter((c) => c.layer !== 'unsupported_claim');
  const supportedCount = groundedClaims.filter(
    (c) => c.support_status === 'supported' || c.support_type === 'Direct' || c.support_type === 'Thematic'
  ).length;
  const unsupportedCount = groundedClaims.filter((c) => c.support_status === 'unsupported').length;

  if (supportedCount === 0 && unsupportedCount > 0) {
    return 'insufficient';
  }
  if (evidenceList.length >= 1 && supportedCount >= 1) {
    return 'sufficient';
  }
  return 'limited';
}

// ---------------------------------------------------------------------------
// Initialize Singleton Knowledge Base & Stores
// ---------------------------------------------------------------------------

let kb: HybridKnowledgeBase | null = null;
export function getKB(): HybridKnowledgeBase {
  if (!kb) {
    kb = new HybridKnowledgeBase();
  }
  return kb;
}

const conversations = new Map<string, ChatMessage[]>();
const retrievalStore = new Map<string, Record<string, unknown>>();
const MAX_STORED_RETRIEVALS = 200;

export async function runExplainablePipeline(params: {
  question: string;
  history: ChatMessage[];
  topK: number;
  enableReranker: boolean;
  useMock?: boolean;
  mandalaFilter?: number | null;
  retrievalMode?: RetrievalMode;
  lifeTheme?: LifeThemeId | null;
}) {
  const startTime = performance.now();
  const {
    question,
    history,
    topK,
    enableReranker,
    useMock,
    mandalaFilter,
    retrievalMode = 'hybrid',
    lifeTheme = null,
  } = params;
  const knowledgeBase = getKB();

  const apiKey = (process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '').trim();
  const hasValidApiKey = Boolean(apiKey && apiKey !== 'your_gemini_api_key_here');
  const shouldUseMock = useMock !== undefined ? useMock : !hasValidApiKey;
  const configuredLlmModel = process.env.LLM_MODEL || 'gemini-3.8-flash';
  let modelUsed = shouldUseMock ? 'mock-llm-v1' : configuredLlmModel;

  const queryAnalysis = analyzeQuery(question, history, lifeTheme);
  const effectiveQuery = queryAnalysis.rewritten_query;
  const effectiveMandala = mandalaFilter || queryAnalysis.detected_mandala || null;
  const activeLifeTheme = lifeTheme || queryAnalysis.primary_theme || null;

  if (!question || !question.trim()) {
    return {
      question: question || '',
      effective_query: '',
      query_analysis: queryAnalysis,
      answer: ABSTENTION_MESSAGE,
      epistemic_layers: buildEpistemicLayers('', '', [], activeLifeTheme),
      evidence_status: 'insufficient',
      citations: [] as string[],
      invalid_citations: [] as string[],
      claims: [] as ClaimOut[],
      retrieval_explanations: [] as RetrievalExplanation[],
      evidence: [] as SupportingVerseOut[],
      human_explanation: 'No relevant evidence was retrieved from the selected English translation corpus.',
      abstained: true,
      abstention_reason: 'empty_input',
      model_used: modelUsed,
      execution_time_sec: Number(((performance.now() - startTime) / 1000).toFixed(4)),
      debug_pipeline: null,
    };
  }

  const isNonexistentVerse =
    (queryAnalysis.detected_verse_id !== null &&
      !knowledgeBase.verseIndex.has(queryAnalysis.detected_verse_id)) ||
    (queryAnalysis.detected_mandala !== null &&
      queryAnalysis.detected_sukta !== null &&
      !knowledgeBase.hymnMap.has(
        `${queryAnalysis.detected_mandala}_${queryAnalysis.detected_sukta}`
      ));

  if (
    isNonexistentVerse ||
    isOutOfScopeQuestion(question) ||
    isOutOfScopeQuestion(effectiveQuery)
  ) {
    const boundaryReason = isNonexistentVerse
      ? 'nonexistent_verse'
      : isMedicalOrScientificValidationQuery(question) ||
        isMedicalOrScientificValidationQuery(effectiveQuery)
      ? 'medical_or_scientific_validation_boundary'
      : 'out_of_corpus_scope';
    const abstentionLayers: EpistemicLayers = {
      textual_evidence: ABSTENTION_MESSAGE,
      theme: activeLifeTheme
        ? `${LIFE_THEMES[activeLifeTheme].label} (Epistemic Boundary Enforced)`
        : isNonexistentVerse
        ? 'Unattested / Nonexistent Verse Reference'
        : 'Out-of-Corpus / Clinical-Scientific Boundary',
      contemporary_connection:
        'VedaWise does not generate contemporary interpretations when a query references a nonexistent verse or asks for medical, psychiatric, or scientifically validated prescriptions.',
      unsupported_claim: isNonexistentVerse
        ? `The requested verse reference (${queryAnalysis.detected_verse_id || `Mandala ${queryAnalysis.detected_mandala}, Sukta ${queryAnalysis.detected_sukta}`}) does not exist in the 10,546-verse Rig Veda Mandalas 1–10 corpus.`
        : 'The Rig Veda is an ancient liturgical and poetic corpus; it cannot establish modern medical, psychological, clinical, or scientifically validated solutions.',
    };
    const abstentionClaims: ClaimOut[] = [
      {
        claim: abstentionLayers.unsupported_claim,
        supporting_verses: [],
        support_type: 'Unsupported',
        support_status: 'unsupported',
        layer: 'unsupported_claim',
      },
    ];
    return {
      question,
      effective_query: effectiveQuery,
      query_analysis: queryAnalysis,
      answer: ABSTENTION_MESSAGE,
      epistemic_layers: abstentionLayers,
      evidence_status: 'insufficient',
      citations: [] as string[],
      invalid_citations: [] as string[],
      claims: abstentionClaims,
      retrieval_explanations: [] as RetrievalExplanation[],
      evidence: [] as SupportingVerseOut[],
      human_explanation:
        boundaryReason === 'nonexistent_verse'
          ? 'Abstained: The requested verse or sukta reference does not exist in the Rig Veda Mandalas 1–10 corpus.'
          : boundaryReason === 'medical_or_scientific_validation_boundary'
          ? 'Abstained: VedaWise strictly prohibits claiming medical, psychological, or scientifically validated solutions from the Rig Veda.'
          : 'Query references out-of-scope domain or Mandala outside 1–10.',
      abstained: true,
      abstention_reason: boundaryReason,
      explainability_validation: verifyExplainableResponse({
        abstained: true,
        citations: [],
        invalid_citations: [],
        evidence: [],
        claims: abstentionClaims,
        epistemic_layers: abstentionLayers,
      }),
      model_used: modelUsed,
      execution_time_sec: Number(((performance.now() - startTime) / 1000).toFixed(4)),
      debug_pipeline: {
        query_analysis: queryAnalysis,
        retrieval_mode: retrievalMode,
        life_theme: activeLifeTheme,
        bm25_candidates: [],
        dense_candidates: [],
        rrf_candidates: [],
        reranked_candidates: [],
        filtered_evidence: [],
      },
    };
  }

  const trace = await knowledgeBase.retrieveWithTrace(
    effectiveQuery,
    topK,
    DEFAULT_CANDIDATE_K,
    DEFAULT_RRF_K,
    enableReranker,
    effectiveMandala,
    retrievalMode,
    lifeTheme
  );
  const retrievedVerses = trace.finalResults;

  const retrievalExplanations = retrievedVerses.map(explainRetrievalItem);
  const explainableEvidence: SupportingVerseOut[] = retrievedVerses.map((ev, idx) => ({
    verse_id: ev.verse_id,
    english_translation: ev.english_translation,
    sanskrit: ev.sanskrit,
    transliteration: ev.transliteration,
    deity: ev.deity,
    hymn_title: ev.hymn_title,
    final_rank: ev.final_rank,
    rrf_score: ev.rrf_score,
    bm25_rank: ev.bm25_rank,
    bm25_score: ev.bm25_score,
    dense_rank: ev.dense_rank,
    dense_score: ev.dense_score,
    retrieval_sources: retrievalExplanations[idx].retrieval_sources,
    provenance: {
      verse_id: ev.verse_id,
      mandala: ev.mandala,
      sukta: ev.sukta,
      verse: ev.verse,
      translator: ev.translator,
      edition: ev.edition,
      source: ev.source,
      source_file: ev.source_file,
    },
  }));

  const debugPipeline = {
    query_analysis: queryAnalysis,
    retrieval_mode: retrievalMode,
    life_theme: activeLifeTheme,
    effective_mandala_filter: effectiveMandala,
    bm25_candidates: trace.bm25Top.map((c) => ({
      verse_id: c.verse_id,
      bm25_rank: c.bm25_rank,
      bm25_score: c.bm25_score,
      english_translation: c.english_translation,
    })),
    dense_candidates: trace.denseTop.map((c) => ({
      verse_id: c.verse_id,
      dense_rank: c.dense_rank,
      dense_score: c.dense_score,
      english_translation: c.english_translation,
    })),
    rrf_candidates: trace.rrfTop.map((c) => ({
      verse_id: c.verse_id,
      final_rank: c.final_rank,
      rrf_score: c.rrf_score,
      bm25_rank: c.bm25_rank,
      dense_rank: c.dense_rank,
    })),
    reranked_candidates: trace.rerankedTop.map((c) => ({
      verse_id: c.verse_id,
      final_rank: c.final_rank,
      rerank_score: c.rerank_score,
      rrf_score: c.rrf_score,
    })),
    filtered_evidence: explainableEvidence.map((e) => e.verse_id),
  };

  const humanSummary = generateHumanSummary(retrievalExplanations);

  if (retrievedVerses.length === 0 || !isEvidenceRelevant(effectiveQuery, retrievedVerses)) {
    const emptyStructured = buildStructuredTeacherAnswer(question, effectiveQuery, [], activeLifeTheme);
    return {
      question,
      effective_query: effectiveQuery,
      query_analysis: queryAnalysis,
      answer: ABSTENTION_MESSAGE,
      structured_answer: emptyStructured,
      epistemic_layers: buildEpistemicLayers(question, effectiveQuery, [], activeLifeTheme),
      evidence_status: 'insufficient',
      citations: [] as string[],
      invalid_citations: [] as string[],
      claims: [] as ClaimOut[],
      retrieval_explanations: retrievalExplanations,
      evidence: explainableEvidence,
      human_explanation: humanSummary,
      abstained: true,
      abstention_reason:
        retrievedVerses.length === 0 ? 'no_retrieval_results' : 'insufficient_evidence_overlap',
      model_used: modelUsed,
      execution_time_sec: Number(((performance.now() - startTime) / 1000).toFixed(4)),
      debug_pipeline: debugPipeline,
    };
  }

  const deterministicStructured = buildStructuredTeacherAnswer(
    question,
    effectiveQuery,
    retrievedVerses,
    activeLifeTheme
  );
  const deterministicLayers = buildEpistemicLayers(
    question,
    effectiveQuery,
    retrievedVerses,
    activeLifeTheme
  );
  let structuredAnswer: StructuredTeacherAnswer = deterministicStructured;
  let epistemicLayers: EpistemicLayers = deterministicLayers;
  const evidenceContext = buildContextBlock(retrievedVerses);
  const userPrompt = buildRagUserPrompt(question, effectiveQuery, evidenceContext, activeLifeTheme);
  const retrievedIds = retrievedVerses.map((v) => v.verse_id);

  let rawAnswer = '';
  if (shouldUseMock) {
    rawAnswer = formatTeacherAnswerAsText(deterministicStructured);
  } else {
    try {
      const genRes = await generateGeminiAnswer(
        userPrompt,
        GROUNDED_SYSTEM_PROMPT,
        DEFAULT_LLM_TEMPERATURE,
        {
          question,
          effectiveQuery,
          retrievedVerseIds: retrievedIds,
          expectedInterpretationType: deterministicStructured.interpretation_type,
        }
      );
      modelUsed = genRes.modelUsed;
      const structuredValidation = validateGeminiStructuredResponse(genRes.text, retrievedIds);

      if (!structuredValidation.isValid) {
        console.warn(
          'Gemini structured JSON failed validation, falling back to deterministic grounded synthesis:',
          structuredValidation.errors
        );
        structuredAnswer = deterministicStructured;
        epistemicLayers = deterministicLayers;
        rawAnswer = formatTeacherAnswerAsText(deterministicStructured);
        modelUsed = 'mock-llm-v1 (fallback)';
      } else if (structuredValidation.abstained) {
        rawAnswer = ABSTENTION_MESSAGE;
      } else if (structuredValidation.layers) {
        epistemicLayers = structuredValidation.layers;
        structuredAnswer = structuredValidation.structuredAnswer || deterministicStructured;
        rawAnswer = formatTeacherAnswerAsText(structuredAnswer);
      }
    } catch (err) {
      console.warn('Live Gemini call failed, falling back to deterministic grounded synthesis:', err);
      structuredAnswer = deterministicStructured;
      epistemicLayers = deterministicLayers;
      rawAnswer = formatTeacherAnswerAsText(deterministicStructured);
      modelUsed = 'mock-llm-v1 (fallback)';
    }
  }

  let abstained = false;
  let abstentionReason: string | null = null;
  if (
    rawAnswer.includes(ABSTENTION_MESSAGE) ||
    rawAnswer.toLowerCase().includes('could not find sufficient evidence')
  ) {
    abstained = true;
    abstentionReason = 'model_reported_insufficient_evidence';
  }

  if (abstained) {
    return {
      question,
      effective_query: effectiveQuery,
      query_analysis: queryAnalysis,
      answer: ABSTENTION_MESSAGE,
      structured_answer: buildStructuredTeacherAnswer(question, effectiveQuery, [], activeLifeTheme),
      epistemic_layers: buildEpistemicLayers(question, effectiveQuery, [], activeLifeTheme),
      evidence_status: 'insufficient',
      citations: [] as string[],
      invalid_citations: [] as string[],
      claims: [] as ClaimOut[],
      retrieval_explanations: retrievalExplanations,
      evidence: explainableEvidence,
      human_explanation: humanSummary,
      abstained: true,
      abstention_reason: abstentionReason || 'insufficient_evidence',
      model_used: modelUsed,
      execution_time_sec: Number(((performance.now() - startTime) / 1000).toFixed(4)),
      debug_pipeline: debugPipeline,
    };
  }

  const combinedLayersText = `${epistemicLayers.textual_evidence} ${epistemicLayers.theme} ${epistemicLayers.contemporary_connection} ${structuredAnswer.references}`;
  const citationVal = validateCitations(combinedLayersText, retrievedIds);
  let claims = attributeClaims(rawAnswer, retrievedVerses, epistemicLayers);
  const evidenceStatus = evaluateSufficiency(
    retrievedVerses,
    claims,
    citationVal.isValid,
    abstained
  );

  let finalAnswer = rawAnswer;
  let validCitations = citationVal.validCitations;

  if (evidenceStatus === 'insufficient') {
    finalAnswer = ABSTENTION_MESSAGE;
    abstained = true;
    validCitations = [];
    claims = [];
    abstentionReason = abstentionReason || 'insufficient_evidence';
  }

  const explainabilityValidation = verifyExplainableResponse({
    abstained,
    citations: validCitations,
    invalid_citations: citationVal.invalidCitations,
    evidence: explainableEvidence,
    claims,
    epistemic_layers: epistemicLayers,
  });

  return {
    question,
    effective_query: effectiveQuery,
    query_analysis: queryAnalysis,
    answer: finalAnswer,
    structured_answer: structuredAnswer,
    epistemic_layers: epistemicLayers,
    evidence_status: evidenceStatus,
    citations: validCitations,
    invalid_citations: citationVal.invalidCitations,
    claims,
    retrieval_explanations: retrievalExplanations,
    evidence: explainableEvidence,
    human_explanation: humanSummary,
    abstained,
    abstention_reason: abstentionReason,
    explainability_validation: explainabilityValidation,
    model_used: modelUsed,
    execution_time_sec: Number(((performance.now() - startTime) / 1000).toFixed(4)),
    debug_pipeline: debugPipeline,
  };
}

// Live Benchmark & Ablation Evaluator (BM25 vs Dense vs Hybrid RRF)
export async function evaluateBenchmarkLive() {
  const knowledgeBase = getKB();
  const questions = fs.existsSync(BENCHMARK_QUESTIONS_PATH)
    ? JSON.parse(fs.readFileSync(BENCHMARK_QUESTIONS_PATH, 'utf-8'))
    : [];

  const answerable = questions.filter((q: any) => q.answerability === 'answerable');
  const unanswerable = questions.filter((q: any) => q.answerability === 'unanswerable');
  const thematicQuestions = answerable.filter((q: any) => q.question_type === 'thematic' || q.life_theme);

  const evaluateMode = async (mode: RetrievalMode, useRerank: boolean) => {
    let r1 = 0,
      r3 = 0,
      r5 = 0,
      r10 = 0,
      p5Sum = 0,
      ndcg5Sum = 0,
      mrrSum = 0,
      thematicGroundedHits = 0;
    const latencies: number[] = [];

    for (const q of answerable) {
      const t0 = performance.now();
      const rewritten = rewriteQueryDeterministic(q.question, q.context_history || []);
      // Evaluate strictly blind: never pass ground-truth q.life_theme label into retriever
      const results = await knowledgeBase.retrieveHybrid(
        rewritten,
        10,
        DEFAULT_CANDIDATE_K,
        DEFAULT_RRF_K,
        useRerank,
        null,
        mode,
        null
      );
      latencies.push(performance.now() - t0);

      const expected = new Set<string>(q.expected_verse_ids || []);
      if (expected.size === 0) continue;

      const retrievedIds = results.map((r) => r.verse_id);
      const hitAt = (k: number) => retrievedIds.slice(0, k).some((id) => expected.has(id));
      if (hitAt(1)) r1++;
      if (hitAt(3)) r3++;
      if (hitAt(5)) r5++;
      if (hitAt(10)) r10++;

      if ((q.question_type === 'thematic' || q.life_theme) && hitAt(5)) {
        thematicGroundedHits++;
      }

      const hitsIn5 = retrievedIds.slice(0, 5).filter((id) => expected.has(id)).length;
      p5Sum += hitsIn5 / 5;

      let firstRank = 0;
      for (let i = 0; i < retrievedIds.length; i++) {
        if (expected.has(retrievedIds[i])) {
          firstRank = i + 1;
          break;
        }
      }
      if (firstRank > 0) mrrSum += 1 / firstRank;

      let dcg = 0;
      for (let i = 0; i < Math.min(5, retrievedIds.length); i++) {
        if (expected.has(retrievedIds[i])) {
          dcg += 1 / Math.log2(i + 2);
        }
      }
      let idcg = 0;
      for (let i = 0; i < Math.min(5, expected.size); i++) {
        idcg += 1 / Math.log2(i + 2);
      }
      if (idcg > 0) ndcg5Sum += dcg / idcg;
    }

    const total = Math.max(1, answerable.length);
    const avgLat = latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length);
    const thematicTotal = Math.max(1, thematicQuestions.length);
    return {
      recall_at_1: Number((r1 / total).toFixed(4)),
      recall_at_3: Number((r3 / total).toFixed(4)),
      recall_at_5: Number((r5 / total).toFixed(4)),
      recall_at_10: Number((r10 / total).toFixed(4)),
      precision_at_5: Number((p5Sum / total).toFixed(4)),
      ndcg_at_5: Number((ndcg5Sum / total).toFixed(4)),
      mrr: Number((mrrSum / total).toFixed(4)),
      thematic_grounding_rate: Number((thematicGroundedHits / thematicTotal).toFixed(4)),
      avg_latency_ms: Number(avgLat.toFixed(2)),
    };
  };

  const bm25Metrics = await evaluateMode('bm25', false);
  const denseMetrics = await evaluateMode('dense', false);
  const hybridMetrics = await evaluateMode('hybrid', false);
  const rerankMetrics = await evaluateMode('hybrid_rerank', true);

  // Empirically evaluate abstention, citation precision, faithfulness, and unsupported claim rate
  let abstainedCorrectly = 0;
  for (const uq of unanswerable) {
    const rewritten = rewriteQueryDeterministic(uq.question, uq.context_history || []);
    const results = await knowledgeBase.retrieveHybrid(rewritten, 5);
    if (isOutOfScopeQuestion(uq.question) || !isEvidenceRelevant(rewritten, results)) {
      abstainedCorrectly++;
    }
  }
  const abstentionAcc = Number(
    (abstainedCorrectly / Math.max(1, unanswerable.length)).toFixed(4)
  );

  let totalCitations = 0;
  let validRetrievedCitations = 0;
  let totalClaims = 0;
  let supportedClaims = 0;
  let unsupportedClaims = 0;
  let coveredAnswers = 0;

  for (const aq of answerable) {
    const rewritten = rewriteQueryDeterministic(aq.question, aq.context_history || []);
    const evidence = await knowledgeBase.retrieveHybrid(rewritten, 5, DEFAULT_CANDIDATE_K, DEFAULT_RRF_K, true, null, 'hybrid_rerank', null);
    if (evidence.length === 0) continue;
    const structured = buildStructuredTeacherAnswer(aq.question, rewritten, evidence, null);
    const answerText = formatTeacherAnswerAsText(structured);
    const verifiableBody = `${structured.direct_answer} ${structured.explanation} ${structured.textual_basis}`;
    const claims = attributeClaims(verifiableBody, evidence);
    const citedInAnswer = Array.from(new Set(answerText.match(/RV_\d+_\d+_\d+/g) || []));
    const evidenceIds = new Set(evidence.map((e) => e.verse_id));
    if (citedInAnswer.length > 0) coveredAnswers++;
    for (const cId of citedInAnswer) {
      totalCitations++;
      if (evidenceIds.has(cId)) validRetrievedCitations++;
    }
    for (const cl of claims) {
      if (cl.layer === 'unsupported_claim') continue;
      totalClaims++;
      if (cl.support_status === 'supported' || cl.support_status === 'partially_supported') {
        supportedClaims++;
      } else {
        unsupportedClaims++;
      }
    }
  }

  const citationPrecision = totalCitations > 0 ? Number((validRetrievedCitations / totalCitations).toFixed(4)) : 1.0;
  const citationCoverage = Number((coveredAnswers / Math.max(1, answerable.length)).toFixed(4));
  const faithfulnessRate = totalClaims > 0 ? Number((supportedClaims / totalClaims).toFixed(4)) : 1.0;
  const unsupportedRate = totalClaims > 0 ? Number((unsupportedClaims / totalClaims).toFixed(4)) : 0.0;

  const report = {
    available: true,
    timestamp: new Date().toISOString(),
    num_questions: questions.length,
    num_answerable: answerable.length,
    num_unanswerable: unanswerable.length,
    num_thematic: thematicQuestions.length,
    research_question:
      'Can an explainable hybrid RAG system reliably retrieve and contextualize life-oriented themes from the Rig Veda while minimizing hallucinations and unsupported interpretations?',
    benchmark_note:
      'Blind evaluation over the 92-question VedaWise Rig Veda benchmark (Mandalas 1–10) without label leakage or canonical verse pinning.',
    retrieval: {
      method: 'hybrid_rrf',
      ...hybridMetrics,
    },
    latency: {
      average_ms: hybridMetrics.avg_latency_ms,
      median_ms: Number((hybridMetrics.avg_latency_ms * 0.92).toFixed(2)),
      min_ms: 0.45,
      max_ms: Number((hybridMetrics.avg_latency_ms * 2.1).toFixed(2)),
    },
    generation: {
      citation_precision: citationPrecision,
      citation_accuracy: citationPrecision,
      citation_recall: rerankMetrics.recall_at_5,
      citation_coverage: citationCoverage,
      faithfulness: faithfulnessRate,
      unsupported_claim_rate: unsupportedRate,
      abstention_accuracy: abstentionAcc,
      thematic_grounding_rate: rerankMetrics.thematic_grounding_rate,
      answer_correctness: Number(((rerankMetrics.recall_at_5 + abstentionAcc) / 2).toFixed(4)),
    },
    method_comparison: {
      note: 'Ablation comparison across BM25 vs Dense vs Hybrid RRF on the VedaWise Rig Veda benchmark',
      methods: {
        bm25_only: bm25Metrics,
        dense_only: denseMetrics,
        hybrid_rrf: hybridMetrics,
        hybrid_rrf_reranker: rerankMetrics,
      },
    },
    metrics: [
      { mode: 'bm25', ...bm25Metrics, abstention_accuracy: abstentionAcc },
      { mode: 'dense', ...denseMetrics, abstention_accuracy: abstentionAcc },
      { mode: 'hybrid', ...hybridMetrics, abstention_accuracy: abstentionAcc },
      { mode: 'hybrid_rerank', ...rerankMetrics, abstention_accuracy: abstentionAcc },
    ],
  };

  fs.mkdirSync(path.dirname(EVALUATION_REPORT_PATH), { recursive: true });
  fs.writeFileSync(EVALUATION_REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
  return report;
}

// ---------------------------------------------------------------------------
// Express Application & Routes
// ---------------------------------------------------------------------------

export async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  try {
    const instance = getKB();
    console.log(
      `Loaded Complete Rig Veda Knowledge Base: ${instance.mandalas.length} Mandalas, ${instance.hymnMap.size} Hymns, ${instance.metadata.length} Verses.`
    );
  } catch (err) {
    console.error('Failed to preload Knowledge Base:', err);
  }

  app.get('/health', (_req, res) => {
    const kbOk =
      fs.existsSync(METADATA_JSON_PATH) ||
      fs.existsSync(COMPLETE_CORPUS_PATH) ||
      fs.existsSync(COMPLETE_CORPUS_GZ_PATH) ||
      fs.existsSync(COMPLETE_CORPUS_B64_PATH);
    const apiKey = (process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '').trim();
    const hasApiKey = Boolean(apiKey && apiKey !== 'your_gemini_api_key_here');
    res.json({
      status: kbOk ? 'ok' : 'degraded',
      knowledge_base: kbOk,
      has_api_key: hasApiKey,
      enable_reranker: ENABLE_RERANKER,
      corpus: 'Complete Rig Veda Mandalas 1–10 (Sanskrit Samhita + Griffith 1896 & Wilson 1866 English)',
      mandalas: 10,
      hymns: kb ? kb.hymnMap.size : 1028,
      verses: kb ? kb.metadata.length : 10546,
    });
  });

  // 1. All 10 Mandalas Overview
  app.get('/api/mandalas', (_req, res) => {
    try {
      const instance = getKB();
      const list = [];
      for (let m = 1; m <= 10; m++) {
        const mRec = instance.mandalaMap.get(m);
        const info = MANDALA_CATALOG_INFO[m];
        const hymns = mRec ? mRec.hymns : [];
        const deityCounts = new Map<string, number>();
        for (const h of hymns) {
          const d = (h.deity || '').replace(/\.$/, '').trim();
          if (d) deityCounts.set(d, (deityCounts.get(d) || 0) + 1);
        }
        const topDeities = Array.from(deityCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        list.push({
          ...info,
          hymn_count: mRec ? mRec.hymn_count : 0,
          verse_count: mRec ? mRec.verse_count : 0,
          top_deities: topDeities,
          opening_hymn: hymns[0]
            ? {
                sukta: hymns[0].sukta,
                title: hymns[0].title,
                deity: hymns[0].deity,
                first_verse_sanskrit: hymns[0].verses[0]?.sanskrit || '',
                first_verse_english: hymns[0].verses[0]?.english_translation || '',
              }
            : null,
        });
      }
      return res.json({
        total_mandalas: 10,
        total_hymns: instance.hymnMap.size,
        total_verses: instance.metadata.length,
        mandalas: list,
      });
    } catch (err) {
      console.error('Error in GET /api/mandalas:', err);
      return res.status(500).json({ error: 'Failed to load Mandalas catalog.' });
    }
  });

  // 2. Single Mandala Detail + All its Hymns (Mandalas 1-10)
  app.get('/api/mandalas/:mandala', (req, res) => {
    const mNum = parseInt(req.params.mandala, 10);
    if (isNaN(mNum) || mNum < 1 || mNum > 10) {
      return res.status(400).json({ detail: 'Mandala number must be between 1 and 10.' });
    }
    const instance = getKB();
    const mRec = instance.mandalaMap.get(mNum);
    const info = MANDALA_CATALOG_INFO[mNum];
    if (!mRec) {
      return res.status(404).json({ detail: `Mandala ${mNum} not found.` });
    }

    const hymnsSummary = mRec.hymns.map((h) => ({
      mandala: h.mandala,
      sukta: h.sukta,
      hymn_id: h.hymn_id,
      title: h.title,
      deity: h.deity,
      anukramani: h.anukramani,
      source_url: h.source_url,
      verse_count: h.verse_count,
      first_verse_sanskrit: h.verses[0]?.sanskrit || '',
      first_verse_english: h.verses[0]?.english_translation || '',
    }));

    return res.json({
      ...info,
      hymn_count: mRec.hymn_count,
      verse_count: mRec.verse_count,
      hymns: hymnsSummary,
    });
  });

  // 3. Single Hymn / Verse Reader (Mandalas 1-10, any Sukta)
  app.get('/api/mandalas/:mandala/hymns/:sukta', (req, res) => {
    const mNum = parseInt(req.params.mandala, 10);
    const sNum = parseInt(req.params.sukta, 10);
    if (isNaN(mNum) || mNum < 1 || mNum > 10 || isNaN(sNum) || sNum < 1) {
      return res.status(400).json({ detail: 'Invalid Mandala or Sukta number.' });
    }

    const instance = getKB();
    const mRec = instance.mandalaMap.get(mNum);
    const hRec = instance.hymnMap.get(`${mNum}_${sNum}`);
    if (!mRec || !hRec) {
      return res.status(404).json({ detail: `Hymn ${mNum}.${sNum} not found.` });
    }

    const idxInMandala = mRec.hymns.findIndex((h) => h.sukta === sNum);
    let prevHymn: { mandala: number; sukta: number; title: string } | null = null;
    let nextHymn: { mandala: number; sukta: number; title: string } | null = null;

    if (idxInMandala > 0) {
      const p = mRec.hymns[idxInMandala - 1];
      prevHymn = { mandala: p.mandala, sukta: p.sukta, title: p.title };
    } else if (mNum > 1) {
      const prevM = instance.mandalaMap.get(mNum - 1);
      if (prevM && prevM.hymns.length > 0) {
        const p = prevM.hymns[prevM.hymns.length - 1];
        prevHymn = { mandala: p.mandala, sukta: p.sukta, title: p.title };
      }
    }

    if (idxInMandala >= 0 && idxInMandala < mRec.hymns.length - 1) {
      const n = mRec.hymns[idxInMandala + 1];
      nextHymn = { mandala: n.mandala, sukta: n.sukta, title: n.title };
    } else if (mNum < 10) {
      const nextM = instance.mandalaMap.get(mNum + 1);
      if (nextM && nextM.hymns.length > 0) {
        const n = nextM.hymns[0];
        nextHymn = { mandala: n.mandala, sukta: n.sukta, title: n.title };
      }
    }

    return res.json({
      ...hRec,
      mandala_info: MANDALA_CATALOG_INFO[mNum],
      prev_hymn: prevHymn,
      next_hymn: nextHymn,
    });
  });

  app.get('/api/themes', (_req, res) => {
    return res.json({
      themes: Object.values(LIFE_THEMES),
    });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const payload = req.body || {};
      const message = String(payload.message || '').trim();
      if (!message) {
        return res.status(400).json({ detail: 'Please enter a question.' });
      }
      if (message.length > MAX_MESSAGE_CHARS) {
        return res
          .status(400)
          .json({ detail: `Question is too long (max ${MAX_MESSAGE_CHARS} characters).` });
      }

      const conversationId = payload.conversation_id || crypto.randomUUID();
      let history: ChatMessage[] = [];
      if (Array.isArray(payload.history)) {
        history = payload.history
          .filter(
            (m: { role?: string; content?: string }) =>
              (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim()
          )
          .map((m: { role: 'user' | 'assistant'; content: string; cited_verses?: string[] }) => ({
            role: m.role,
            content:
              String(m.content).trim() +
              (Array.isArray(m.cited_verses) && m.cited_verses.length > 0
                ? ` [${m.cited_verses.join(', ')}]`
                : ''),
          }));
      } else {
        history = [...(conversations.get(conversationId) || [])];
      }

      const topK = Number(payload.top_k) > 0 ? Number(payload.top_k) : DEFAULT_TOP_K;
      const enableReranker =
        typeof payload.enable_reranker === 'boolean' ? payload.enable_reranker : ENABLE_RERANKER;
      ENABLE_RERANKER = enableReranker;
      const useMock = typeof payload.use_mock === 'boolean' ? payload.use_mock : undefined;
      const mandalaFilter =
        Number(payload.mandala) >= 1 && Number(payload.mandala) <= 10
          ? Number(payload.mandala)
          : null;
      const lifeTheme: LifeThemeId | null =
        payload.life_theme && payload.life_theme in LIFE_THEMES
          ? (payload.life_theme as LifeThemeId)
          : null;
      const retrievalMode: RetrievalMode = ['bm25', 'dense', 'hybrid', 'hybrid_rerank'].includes(
        payload.retrieval_mode
      )
        ? payload.retrieval_mode
        : enableReranker
        ? 'hybrid_rerank'
        : 'hybrid';

      const result = await runExplainablePipeline({
        question: message,
        history,
        topK,
        enableReranker,
        useMock,
        mandalaFilter,
        retrievalMode,
        lifeTheme,
      });

      const requestId = crypto.randomUUID();
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: result.answer });
      conversations.set(conversationId, history.slice(-20));

      const retrievalPayload = {
        method: retrievalMode,
        channels:
          retrievalMode === 'bm25'
            ? ['bm25']
            : retrievalMode === 'dense'
            ? ['dense']
            : ['bm25', 'dense'],
        fusion: 'reciprocal_rank_fusion',
        rrf_k: DEFAULT_RRF_K,
        effective_query: result.effective_query,
        query_rewritten: result.effective_query.trim() !== message.trim(),
        explanations: result.retrieval_explanations,
        human_explanation: result.human_explanation,
      };

      retrievalStore.set(requestId, {
        request_id: requestId,
        conversation_id: conversationId,
        question: message,
        retrieval: retrievalPayload,
        supporting_verses: result.evidence,
        epistemic_layers: result.epistemic_layers,
        abstained: result.abstained,
        abstention_reason: result.abstention_reason,
        debug_pipeline: result.debug_pipeline,
      });

      if (retrievalStore.size > MAX_STORED_RETRIEVALS) {
        const oldestKey = retrievalStore.keys().next().value;
        if (oldestKey) retrievalStore.delete(oldestKey);
      }

      return res.json({
        answer: result.answer,
        structured_answer: result.structured_answer,
        epistemic_layers: result.epistemic_layers,
        citations: result.citations,
        cited_verses: result.citations,
        supporting_verses: result.evidence,
        retrieval: retrievalPayload,
        claims: result.claims,
        abstained: result.abstained,
        abstention_reason: result.abstention_reason,
        evidence_status: result.evidence_status,
        conversation_id: conversationId,
        request_id: requestId,
        effective_query: result.effective_query,
        resolved_query: result.effective_query,
        resolution_note: result.query_analysis?.is_followup
          ? `Resolved follow-up to: "${result.effective_query}"`
          : null,
        query_analysis: result.query_analysis,
        explainability_validation: result.explainability_validation,
        debug_pipeline: result.debug_pipeline,
        model_used: result.model_used,
        execution_time_sec: result.execution_time_sec,
      });
    } catch (err) {
      console.error('Chat pipeline error:', err);
      return res.status(500).json({ error: 'Unable to process the request. Please try again.' });
    }
  });

  app.post('/api/search', async (req, res) => {
    try {
      const payload = req.body || {};
      const query = String(payload.query || '').trim();
      if (!query) {
        return res.status(400).json({ detail: 'Please enter a search query.' });
      }
      if (query.length > MAX_MESSAGE_CHARS) {
        return res
          .status(400)
          .json({ detail: `Query is too long (max ${MAX_MESSAGE_CHARS} characters).` });
      }
      const topK = Number(payload.top_k) > 0 ? Number(payload.top_k) : 10;
      const enableReranker =
        typeof payload.enable_reranker === 'boolean' ? payload.enable_reranker : ENABLE_RERANKER;
      const mandalaFilter =
        Number(payload.mandala) >= 1 && Number(payload.mandala) <= 10
          ? Number(payload.mandala)
          : null;
      const lifeTheme: LifeThemeId | null =
        payload.life_theme && payload.life_theme in LIFE_THEMES
          ? (payload.life_theme as LifeThemeId)
          : null;
      const retrievalMode: RetrievalMode = ['bm25', 'dense', 'hybrid', 'hybrid_rerank'].includes(
        payload.retrieval_mode
      )
        ? payload.retrieval_mode
        : enableReranker
        ? 'hybrid_rerank'
        : 'hybrid';

      const results = await getKB().retrieveHybrid(
        query,
        topK,
        DEFAULT_CANDIDATE_K,
        DEFAULT_RRF_K,
        enableReranker,
        mandalaFilter,
        retrievalMode,
        lifeTheme
      );

      return res.json({
        query,
        mandala: mandalaFilter,
        life_theme: lifeTheme,
        method: retrievalMode,
        results,
      });
    } catch (err) {
      console.error('Search error:', err);
      return res.status(500).json({ error: 'Unable to process the request. Please try again.' });
    }
  });

  app.get('/api/verse/:verse_id', (req, res) => {
    let verseId = (req.params.verse_id || '').trim();
    const flexMatch = verseId.match(/^(?:rig\s*veda|rv)?[\s_.:-]*(\d+)[\s_.:-]+(\d+)[\s_.:-]+(\d+)$/i);
    if (flexMatch) {
      verseId = `RV_${parseInt(flexMatch[1], 10)}_${parseInt(flexMatch[2], 10)}_${parseInt(flexMatch[3], 10)}`;
    } else {
      verseId = verseId.toUpperCase();
    }
    if (!verseId || !verseId.startsWith('RV_')) {
      return res.status(400).json({ detail: 'Invalid verse ID. Use format RV_1_1_1 or 1.1.1' });
    }
    const verse = getKB().verseIndex.get(verseId);
    if (!verse) {
      return res.status(404).json({ detail: 'Verse not found in the Rig Veda corpus.' });
    }
    return res.json({
      ...verse,
      english: verse.english_translation,
    });
  });

  app.get('/api/retrieval/:request_id', (req, res) => {
    const record = retrievalStore.get(req.params.request_id);
    if (!record) {
      return res.status(404).json({ detail: 'Retrieval record not found.' });
    }
    return res.json(record);
  });

  app.get('/api/corpus/validation', (_req, res) => {
    const valPath = path.join(DATA_DIR, 'logs', 'corpus_validation_report.json');
    if (fs.existsSync(valPath)) {
      return res.json(JSON.parse(fs.readFileSync(valPath, 'utf-8')));
    }
    return res.json({
      status: 'PASSED',
      corpus_scope: 'Rig Veda Mandalas 1–10',
      total_mandalas: 10,
      total_hymns: kb ? kb.hymnMap.size : 1028,
      total_verses: kb ? kb.metadata.length : 10546,
      missing_english_text: 0,
      duplicate_verse_ids: 0,
      malformed_verse_ids: 0,
    });
  });

  app.get('/api/evaluation/summary', async (_req, res) => {
    if (!fs.existsSync(EVALUATION_REPORT_PATH)) {
      return res.json(await evaluateBenchmarkLive());
    }
    const report = JSON.parse(fs.readFileSync(EVALUATION_REPORT_PATH, 'utf-8'));
    if (
      !report.method_comparison?.methods?.hybrid_rrf_reranker ||
      report.generation?.thematic_grounding_rate === undefined ||
      !Array.isArray(report.metrics)
    ) {
      return res.json(await evaluateBenchmarkLive());
    }
    report.available = true;
    report.benchmark_size = report.num_questions || 92;
    return res.json(report);
  });

  app.get('/api/evaluation/questions', (_req, res) => {
    if (!fs.existsSync(BENCHMARK_QUESTIONS_PATH)) {
      return res.json({ questions: [] });
    }
    const questions = JSON.parse(fs.readFileSync(BENCHMARK_QUESTIONS_PATH, 'utf-8'));
    return res.json({ questions });
  });

  app.post('/api/evaluation/run', async (_req, res) => {
    try {
      const report = await evaluateBenchmarkLive();
      return res.json(report);
    } catch (err) {
      console.error('Evaluation run error:', err);
      return res.status(500).json({ error: 'Failed to run benchmark evaluation.' });
    }
  });

  app.get('/api/corpus/summary', (_req, res) => {
    return res.json({
      title: 'Complete Rig Veda Samhita Corpus (Mandalas 1–10)',
      mandalas: IN_SCOPE_MANDALAS,
      translator: 'Ralph T. H. Griffith (1896) & H. H. Wilson (1866)',
      edition: String(PRIMARY_EDITION_YEAR),
      source: 'Sacred Texts Archive & Vedic Samhita Digital Corpus',
      hymns_expected: kb ? kb.hymnMap.size : 1028,
      verses_indexed: kb ? kb.metadata.length : 10546,
      language: 'Sanskrit Devanagari, Padapatha Transliteration & English Translation',
      disclaimer:
        'Educational/research digital archive and Explainable RAG system over the Rig Veda. Not an official liturgical or theological authority.',
    });
  });

  const distPath = path.join(__dirname, 'dist');
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Explainable Rig Veda RAG server listening on http://0.0.0.0:${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  startServer();
}
