# VedaWise: Explainable AI for Life-Oriented Knowledge Discovery from the Rig Veda

## 1. Core Research Question

> *Can an explainable hybrid RAG system reliably retrieve and contextualize life-oriented themes from the Rig Veda while minimizing hallucinations and unsupported interpretations?*

### Core Epistemic Principle

**VedaWise** strictly enforces the boundary between ancient liturgical poetry and modern empirical science:
- The system **never** claims that the Rig Veda provides medical, clinical, psychological, or scientifically validated solutions to modern problems.
- Every grounded teacher response follows the **5-part VedaWise structure** (`Answer`, `Explanation`, `Context`, `Textual basis`, `References`) and explicitly distinguishes between **Direct Meaning**, **Inferred Principle**, and **Contextual Application**.
- Every response is paired with **4 explicit epistemic layers** in the Explainable AI (XAI) panel:
  1. **Textual Evidence (`Direct`)** — What the retrieved Rig Veda verse actually says, with verbatim translation, Sanskrit, transliteration, and `[RV_M_S_V]` citations.
  2. **Theme (`Thematic`)** — The life-oriented Vedic motif present in the verse (e.g., *Saṃjñāna* for cooperation, *Tarati Duritā* for crossing adversity, *Ṛta* for cosmic/moral order).
  3. **Contemporary Connection (`Interpretive`)** — A clearly labeled modern philosophical or reflective analogy, never presented as direct scriptural fact.
  4. **Unsupported Claim / Epistemic Boundary (`Unsupported`)** — Explicit statement of what the Rig Veda corpus **cannot** establish (e.g., medical cures, clinical psychiatry, modern physics/engineering).

---

## 2. Technical Architecture & 14-Stage Pipeline

```text
User Question
  → 1. Conversation / Context Resolution (pronouns, "What about the next verse?" → RV_M_S_(V+1))
  → 2. Epistemic Boundary Guardrail (medical / clinical / scientific anachronism check)
  → 3. Life-Theme Detection (9 Life-Oriented Themes + Sanskrit/Vedic concept mapping)
  → 4. BM25 Lexical Retrieval (Okapi BM25 over Mandalas 1–10)
     +
  → 5. Dense Vector Retrieval (384-dim embeddings / FAISS inner-product index)
  → 6. Reciprocal Rank Fusion (RRF, k = 60)
  → 7. Cross-Encoder / Lexical-Semantic Reranking
  → 8. Evidence Filtering & Sufficiency Gate
  → 9. Grounded LLM Synthesis (4-Layer Epistemic Separation)
  → 10. Claim Extraction
  → 11. Claim → Verse Attribution (Direct | Thematic | Interpretive | Unsupported)
  → 12. Evidence Verification & Citation Audit
  → 13. Grounded Answer OR Principled Abstention
  → 14. Explainable UI & Research Benchmark Evaluation
```

---

## 3. Corpus Representation (Rig Veda Mandalas 1–10)

Every verse in `data/processed/rigveda_corpus.jsonl` and `data/knowledge_base/complete_rigveda_corpus.json` is stored as an independent, citable record:

```json
{
  "verse_id": "RV_10_191_2",
  "mandala": 10,
  "sukta": 191,
  "verse": 2,
  "english": "Assemble, speak together: let your minds be all of one accord...",
  "sanskrit": "सं गच्छध्वं सं वदध्वं सं वो मनांसि जानताम् ।...",
  "transliteration": "saṃ gacchadhvaṃ saṃ vadadhvaṃ saṃ vo manāṃsi jānatām |...",
  "translator": "Ralph T. H. Griffith",
  "edition": "1896",
  "source": "Sacred Texts / Complete Rig Veda Samhita (Mandalas 1–10)"
}
```

---

## 4. Nine Life-Oriented Themes

| Theme ID | Theme Label | Vedic / Sanskrit Concept | Representative Verses |
| :--- | :--- | :--- | :--- |
| `adversity_resilience` | **Adversity & Resilience** | *Tarati Duritā* (Crossing Perils) | `RV_1_99_1`, `RV_10_53_8`, `RV_1_189_1` |
| `knowledge_learning` | **Knowledge & Learning** | *Dhī & Vāc* (Insight & Sacred Speech) | `RV_3_62_10`, `RV_10_71_1`, `RV_10_71_2`, `RV_10_71_4` |
| `cooperation` | **Cooperation & Unity** | *Saṃjñāna* (Concord & Shared Purpose) | `RV_10_191_2`, `RV_10_191_3`, `RV_10_191_4` |
| `leadership` | **Leadership & Responsibility** | *Kṣatra & Rājadharma* (Stewardship) | `RV_10_173_1`, `RV_1_25_10`, `RV_3_59_1` |
| `discipline_order` | **Discipline & Cosmic Order** | *Ṛta & Vrata* (Order & Steadfast Vow) | `RV_1_1_8`, `RV_10_190_1`, `RV_1_123_9` |
| `ethics_conduct` | **Ethics & Conduct** | *Dāna & Satya* (Generosity & Integrity) | `RV_10_117_1`, `RV_10_117_5`, `RV_10_34_13`, `RV_7_86_5` |
| `uncertainty` | **Uncertainty & Inquiry** | *Nāsadīya & Kasmai Devāya* | `RV_10_129_1`, `RV_10_129_6`, `RV_10_129_7`, `RV_10_121_1` |
| `well_being` | **Well-Being & Vitality** | *Āyuṣ, Śaṃ & Mayas* | `RV_10_186_1`, `RV_1_89_8`, `RV_10_9_4` |
| `nature` | **Nature & Ecological Reverence** | *Prakṛti, Āpaḥ & Araṇyānī* | `RV_10_146_1`, `RV_10_75_1`, `RV_1_113_1` |

---

## 5. Research Evaluation Benchmark (`BM25 vs Dense vs Hybrid RRF`)

The benchmark suite in `data/evaluation/benchmark_questions.json` evaluates **46 research queries** (factual, thematic life-oriented, multi-turn follow-ups, and medical/scientific boundary traps) across four modes (`bm25`, `dense`, `hybrid`, `hybrid_rerank`) and measures:
- **Recall@1, Recall@3, Recall@5**
- **Mean Reciprocal Rank (MRR)**
- **Normalized Discounted Cumulative Gain (nDCG@5)**
- **Answer Correctness & Faithfulness**
- **Citation Precision & Citation Recall**
- **Unsupported Claim Rate**
- **Abstention Accuracy** (on unanswerable and clinical/scientific anachronism queries)
- **Thematic Grounding Rate**

---

## 6. Setup & Run Instructions

### A. Running the Full-Stack Web Application (Node.js / Express + React + Vite)

```bash
# 1. Install dependencies
npm install

# 2. Optional: configure Gemini API key in .env (falls back to deterministic grounded synthesis if unset)
cp .env.example .env

# 3. Start the server and UI on port 3000
npm run dev
```

### B. Running the Python / Streamlit Research Stack

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Launch the Streamlit Explainable RAG interface
streamlit run app.py

# 3. Run the automated verification test suite
pytest tests/test_vedawise.py
```
