# Corpus Scope & System Architecture — VedaWise: Explainable Conversational RAG for the Rig Veda

This document defines the exact corpus scope, data schema, hybrid retrieval architecture, four-layer epistemic generation framework, claim-to-verse attribution, and principled abstention mechanisms implemented in **VedaWise**.

---

## 1. Corpus Scope (Mandalas 1–10)

VedaWise operates over the complete ten-book (*Maṇḍala*) canon of the **Rig Veda Saṁhitā**:

- **Mandalas Covered:** Mandalas **1 through 10** (`[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`)
- **Total Hymns (*Sūktas*):** **1,028** hymns
- **Total Indexed Verses (*Ṛcas*):** **10,546** verse records
- **Canonical Storage:** `data/knowledge_base/complete_rigveda_corpus.json` and `data/knowledge_base/metadata.json`

### Per-Mandala Breakdown

| Mandala | Traditional Designation | Hymns (*Sūktas*) | Verses (*Ṛcas*) | Sanskrit / Translit | English Translation |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Mandala 1** | *Śatarcins* (Book of the Hundred-Verse Seers) | 191 | 2,003 | 2,003 | 2,003 |
| **Mandala 2** | Gṛtsamada Śaunahotra Lineage | 43 | 429 | 429 | 429 |
| **Mandala 3** | Viśvāmitra Gāthina Lineage | 62 | 617 | 617 | 617 |
| **Mandala 4** | Vāmadeva Gautama Lineage | 58 | 599 | 589 | 599 |
| **Mandala 5** | Atri Bhauma Lineage | 87 | 727 | 716 | 727 |
| **Mandala 6** | Bharadvāja Bārhaspatya Lineage | 75 | 761 | 761 | 761 |
| **Mandala 7** | Vasiṣṭha Maitrāvaruṇi Lineage | 104 | 841 | 825 | 841 |
| **Mandala 8** | Kaṇva & Āṅgirasa Seers (with Vālakhilya) | 103 | 1,716 | 1,702 | 1,716 |
| **Mandala 9** | Book of *Soma Pavamāna* | 114 | 1,100 | 1,043 | 1,100 |
| **Mandala 10** | Cosmogonic, Ritual & Philosophical Hymns | 191 | 1,753 | 1,719 | 1,753 |
| **Total** | **Complete Rig Veda Saṁhitā (Mandalas 1–10)** | **1,028** | **10,546** | **10,404** | **10,546** |

---

## 2. Verse-Level Data Fields & Provenance

Retrieval and citation operate strictly at **verse granularity** using the canonical identifier format `RV_<mandala>_<sukta>_<verse>` (e.g., `RV_1_1_1`, `RV_3_62_10`, `RV_10_191_2`).

Each of the 10,546 verse records contains:

- **`verse_id`**: Canonical verse identifier (`RV_M_S_V`) aligned 1-to-1 with its embedding index position (`0` to `10545`).
- **`mandala`**, **`sukta`**, **`verse`**: Numerical coordinates within the Rig Veda.
- **`sanskrit`**: Original Sanskrit text in Devanagari script (*Saṁhitā*).
- **`transliteration`**: Romanized Sanskrit transliteration (*Padapāṭha* / IAST).
- **`english_translation`**: Primary scholarly English translation used for indexing, retrieval, and grounded synthesis (Ralph T. H. Griffith, 1896 edition, with H. H. Wilson 1866 alignment where applicable).
- **`deity`**, **`hymn_title`**, **`anukramani`**: Liturgical and traditional attribution metadata.
- **`translator`**, **`edition`**, **`source`**, **`source_file`**: Full bibliographic provenance.

---

## 3. Verse-Level Hybrid Retrieval Architecture (BM25 + Dense FAISS + RRF)

VedaWise implements a multi-channel hybrid retrieval pipeline over all 10,546 verses:

1. **Sparse Lexical Retrieval (BM25 Okapi):**
   - Tokenizes and normalizes English verse translations, deity names, and hymn metadata.
   - Computes exact lexical BM25 scores ($k_1 = 1.5, b = 0.75$) to capture direct verse lookups, deity names, and exact textual phrases.

2. **Genuine Dense Vector Retrieval (Sentence Transformers + FAISS):**
   - **Embedding Model:** Configurable via `EMBEDDING_MODEL` (default: `sentence-transformers/all-MiniLM-L6-v2` / `Xenova/all-MiniLM-L6-v2`).
   - **Vector Dimensionality:** **384** dimensions, L2-normalized (`float32`).
   - **Index Storage:** `data/knowledge_base/embeddings.npy` ($10546 \times 384$) and `data/knowledge_base/faiss.index` (FAISS `IndexFlatIP` inner-product / cosine similarity index containing all 10,546 vectors in exact corpus order).
   - **Query Encoding:** Incoming queries are encoded at runtime into a 384-dimensional L2-normalized vector using the same Sentence Transformer model and scored via exact inner-product similarity against all 10,546 verse vectors.
   - **Reproducible Indexing:** The complete index can be regenerated reproducibly via `npm run build:index` (`scripts/build_dense_index.ts`).

3. **Reciprocal Rank Fusion (RRF):**
   - Combines candidate rankings from BM25 ($r_{\text{bm25}}$) and Dense vector search ($r_{\text{dense}}$) using Reciprocal Rank Fusion with constant $k = 60$:
     $$\text{RRF}(v) = \frac{1}{k + r_{\text{bm25}}(v)} + \frac{1}{k + r_{\text{dense}}(v)}$$
   - Supports optional lexical/thematic cross-encoder reranking (`hybrid_rerank`) and explicit Mandala or Life-Theme filtering.

---

## 4. Four Epistemic Layers in Generation

To prevent conflating ancient liturgical poetry with modern prescription, every generated answer (via configurable Gemini structured JSON output, `process.env.LLM_MODEL || "gemini-2.5-flash"`, or deterministic grounded synthesis fallback) is structured into **four strict epistemic layers**:

1. **`textual_evidence` (Textual Evidence):**
   - States **only** what the retrieved Rig Veda English translation passages literally say.
   - Every textual claim must explicitly cite an actual retrieved `[RV_M_S_V]` verse ID.
2. **`theme` (Vedic & Life-Oriented Theme):**
   - Identifies the liturgical, poetic, or life-oriented motif (e.g., *Saṁjñāna* / Cooperation, *Duritā-taraṇa* / Resilience, *Ṛta* / Cosmic Order) supported by the retrieved verse(s), citing `[RV_M_S_V]`.
3. **`contemporary_connection` (Contemporary Connection):**
   - Offers a clearly labeled reflective or philosophical interpretation connecting the verse's motif to human experience, explicitly framed as non-prescriptive cultural reflection rather than scriptural fact.
4. **`unsupported_claim` (Unsupported Claim / Epistemic Boundary):**
   - Explicitly states what the retrieved Rig Veda evidence **cannot** establish (e.g., no clinical medical treatments, psychiatric interventions, empirically validated modern scientific theories, or unattested historical facts).

---

## 5. Claim-to-Verse Attribution & Verification

Every response undergoes automated post-generation validation and claim attribution:

- **Structured JSON & Citation Validation (`validateGeminiStructuredResponse` & `validateCitations`):**
  - Verifies that the LLM output is valid JSON containing strictly the four required string fields (`textual_evidence`, `theme`, `contemporary_connection`, `unsupported_claim`).
  - Verifies that every cited `RV_M_S_V` identifier exists in the retrieved evidence set (zero hallucinated verse IDs) and that every sentence in `textual_evidence` cites a retrieved verse.
  - Rejects any fabricated Sanskrit Devanagari text not supplied in the English prompt.
- **Claim Attribution (`attributeClaims`):**
  - Maps each statement to its supporting retrieved verse IDs and classifies support into four categories:
    - **`Direct`**: Direct quotation or close lexical grounding in a cited verse (`supported`).
    - **`Thematic`**: Thematic synthesis grounded in retrieved verses (`supported`).
    - **`Interpretive`**: Reflective contemporary analogy grounded in a retrieved verse (`partially_supported`).
    - **`Unsupported`**: Boundary declaration or unattested claim (`unsupported`).

---

## 6. Principled Abstention & Deterministic Fallback

VedaWise enforces strict abstention and fallback guardrails:

1. **Medical, Psychiatric & Scientific Validation Boundary:**
   - Queries asking for clinical diagnoses, psychiatric therapy protocols, pharmaceutical cures, or modern scientific/technological proof (e.g., quantum physics, microchips, DNA) immediately trigger principled abstention (`abstention_reason: "medical_or_scientific_validation_boundary"`).
2. **Out-of-Corpus & Insufficient Evidence Abstention:**
   - Queries referencing texts outside Rig Veda Mandalas 1–10 or queries whose retrieved candidates fail the lexical/semantic relevance threshold abstain with:
     > *"I could not find sufficient evidence in the selected English translation corpus to answer this reliably."*
3. **Deterministic Grounded Fallback:**
   - If the external Gemini API is unavailable, unconfigured, or returns malformed JSON / invalid citations, the pipeline automatically falls back to deterministic grounded synthesis (`buildEpistemicLayers`) built strictly from the retrieved verses.
