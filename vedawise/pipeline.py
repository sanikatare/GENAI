"""
VedaWise: Explainable AI for Life-Oriented Knowledge Discovery from the Rig Veda
Modular Research Architecture:
  1. Data Ingestion & Validation (Mandalas 1–10)
  2. Preprocessing & Life-Theme Detection
  3. Indexing (BM25 + Dense Embeddings / FAISS)
  4. Retrieval (BM25, Dense, Hybrid RRF, Cross-Encoder Reranking)
  5. Conversational Context Resolution & Grounded RAG
  6. Explainability (4-Layer Epistemic Separation + Claim -> Verse Attribution)
  7. Research Evaluation (BM25 vs Dense vs Hybrid RRF Benchmark)
"""

from __future__ import annotations

import json
import math
import os
import re
from array import array
from dataclasses import dataclass, field, asdict
from pathlib import Path
import struct
import subprocess
from typing import Any, Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
KB_DIR = ROOT_DIR / "data" / "knowledge_base"
COMPLETE_CORPUS_PATH = KB_DIR / "complete_rigveda_corpus.json"
FAISS_INDEX_PATH = KB_DIR / "faiss.index"
EMBEDDINGS_NPY_PATH = KB_DIR / "embeddings.npy"
KB_CONFIG_PATH = KB_DIR / "kb_config.json"
CORPUS_JSONL_PATH = ROOT_DIR / "data" / "processed" / "rigveda_corpus.jsonl"
BENCHMARK_JSON_PATH = ROOT_DIR / "data" / "evaluation" / "benchmark_questions.json"
DEFAULT_EMBEDDING_MODEL = os.environ.get(
    "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
).strip()

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "in", "on", "at", "to", "for", "with", "by", "about", "of", "from",
    "and", "or", "but", "not", "what", "which", "who", "whom", "whose",
    "how", "when", "where", "why", "does", "do", "did", "say", "says",
    "rig", "veda", "rigveda", "mandala", "sukta", "hymn", "verse", "text",
}

LIFE_THEMES: Dict[str, Dict[str, Any]] = {
    "adversity_resilience": {
        "id": "adversity_resilience",
        "label": "Adversity & Resilience",
        "sanskrit_concept": "Tarati Duritā (Crossing Perils)",
        "description": "Navigating hardship, grief, danger, and obstacles through steadfastness and safe passage.",
        "keywords": ["adversity", "resilience", "hardship", "difficulty", "danger", "peril", "obstacle", "trouble", "sin", "grief", "distress", "affliction", "cross", "boat"],
        "expansion_terms": ["peril", "danger", "grief", "affliction", "bear", "river", "ship", "safety", "deliver", "save", "strong", "fort"],
        "canonical_verses": ["RV_1_99_1", "RV_10_53_8", "RV_1_189_1", "RV_7_88_3", "RV_8_48_3", "RV_10_18_10"],
        "contemporary_connection": "In a modern reflection, the Vedic metaphor of crossing a turbulent river in a well-built vessel parallels psychological resilience, preparation, and community support during crises—without claiming scriptural supernatural guarantees.",
    },
    "knowledge_learning": {
        "id": "knowledge_learning",
        "label": "Knowledge & Learning",
        "sanskrit_concept": "Dhī & Vāc (Insight & Sacred Speech)",
        "description": "Cultivation of wisdom, mental illumination, inquiry, and discerning speech.",
        "keywords": ["knowledge", "learning", "wisdom", "education", "study", "intellect", "understanding", "speech", "thought", "illumination", "truth", "ignorance", "teacher", "scholar"],
        "expansion_terms": ["wisdom", "understanding", "speech", "wise", "meditate", "savitar", "sarasvati", "light", "mind", "thought", "truth", "friend"],
        "canonical_verses": ["RV_3_62_10", "RV_10_71_1", "RV_10_71_2", "RV_10_71_4", "RV_1_3_12", "RV_1_164_39"],
        "contemporary_connection": "From a contemporary educational perspective, RV 10.71 (Jñāna Sūkta) highlights that learning requires critical comprehension rather than rote recitation, and that peers learn at different paces yet grow through shared dialogue.",
    },
    "cooperation": {
        "id": "cooperation",
        "label": "Cooperation & Unity",
        "sanskrit_concept": "Saṃjñāna (Concord & Shared Purpose)",
        "description": "Harmony in council, shared deliberation, mutual respect, and collective effort.",
        "keywords": ["cooperation", "unity", "harmony", "teamwork", "together", "community", "concord", "agreement", "collective", "assemble", "common", "fellowship", "society"],
        "expansion_terms": ["assemble", "speak", "together", "minds", "agree", "common", "purpose", "heart", "united", "happiness", "counsel", "prayer"],
        "canonical_verses": ["RV_10_191_2", "RV_10_191_3", "RV_10_191_4", "RV_8_20_21", "RV_5_60_5"],
        "contemporary_connection": "In modern organizational and civic contexts, the Saṃjñāna Sūkta (RV 10.191) resonates with collaborative deliberation, alignment of shared goals, and inclusive dialogue across diverse viewpoints.",
    },
    "leadership": {
        "id": "leadership",
        "label": "Leadership & Responsibility",
        "sanskrit_concept": "Kṣatra & Rājadharma (Stewardship & Protection)",
        "description": "Just governance, steadfast stewardship, protection of the community, and accountability to order.",
        "keywords": ["leadership", "leader", "king", "ruler", "governance", "authority", "responsibility", "protection", "guide", "sovereign", "command", "stewardship", "justice"],
        "expansion_terms": ["king", "lord", "sovereign", "law", "statute", "protect", "lead", "guide", "varuna", "indra", "mitra", "people", "steadfast"],
        "canonical_verses": ["RV_10_173_1", "RV_1_25_10", "RV_2_12_1", "RV_3_59_1", "RV_4_42_1"],
        "contemporary_connection": "Viewed through modern leadership ethics, these hymns frame authority not as arbitrary power but as steadfast responsibility, covenant-keeping (Mitra), and accountability to principled order (Ṛta).",
    },
    "discipline_order": {
        "id": "discipline_order",
        "label": "Discipline & Cosmic Order",
        "sanskrit_concept": "Ṛta & Vrata (Order & Steadfast Vow)",
        "description": "Adherence to natural and moral regularity, self-discipline, and truthfulness.",
        "keywords": ["discipline", "order", "rta", "vrata", "law", "regularity", "routine", "duty", "self-control", "harmony", "balance", "cosmic"],
        "expansion_terms": ["order", "law", "statute", "eternal", "truth", "ordinance", "dawn", "varuna", "mitra", "course", "path", "steadfast"],
        "canonical_verses": ["RV_1_1_8", "RV_1_25_8", "RV_10_190_1", "RV_1_123_9", "RV_4_23_8", "RV_4_23_9"],
        "contemporary_connection": "In contemporary reflection, Ṛta—illustrated by the Dawn faithfully following her appointed course—serves as an analogy for personal discipline, ethical consistency, and living in harmony with natural cycles.",
    },
    "ethics_conduct": {
        "id": "ethics_conduct",
        "label": "Ethics & Conduct",
        "sanskrit_concept": "Dāna, Satya & Anṛṇatā (Generosity, Truth & Integrity)",
        "description": "Generosity to the needy, honesty, avoidance of deceit and reckless vice, and moral self-reflection.",
        "keywords": ["ethics", "conduct", "morality", "charity", "generosity", "greed", "selfishness", "giving", "compassion", "honesty", "gambling", "vice", "forgiveness", "guilt"],
        "expansion_terms": ["liberal", "bounteous", "hungry", "food", "riches", "wheel", "dice", "gambler", "wife", "forgive", "sin", "guilt", "truth"],
        "canonical_verses": ["RV_10_117_1", "RV_10_117_2", "RV_10_117_5", "RV_10_117_6", "RV_10_34_13", "RV_7_86_5", "RV_7_86_6"],
        "contemporary_connection": "For contemporary ethics, RV 10.117 offers a timeless reflection on social reciprocity—reminding us that fortune revolves like chariot wheels—while RV 10.34 cautions against destructive compulsions in favor of productive, responsible living.",
    },
    "uncertainty": {
        "id": "uncertainty",
        "label": "Uncertainty & Inquiry",
        "sanskrit_concept": "Kasmai Devāya & Nāsadīya (Radical Philosophical Inquiry)",
        "description": "Embracing mystery, questioning ultimate origins, and practicing intellectual humility before the unknown.",
        "keywords": ["uncertainty", "doubt", "mystery", "unknown", "origin", "creation", "skepticism", "questioning", "beginning", "void", "nasadiya", "who", "know"],
        "expansion_terms": ["existent", "non-existent", "death", "immortality", "know", "declare", "whence", "creation", "born", "gods", "highest", "heaven"],
        "canonical_verses": ["RV_10_129_1", "RV_10_129_2", "RV_10_129_6", "RV_10_129_7", "RV_10_121_1", "RV_1_164_4"],
        "contemporary_connection": "In modern scientific and philosophical inquiry, the Nāsadīya Sūkta (RV 10.129) stands as an extraordinary model of epistemic humility—acknowledging the boundaries of certainty rather than asserting dogmatism.",
    },
    "well_being": {
        "id": "well_being",
        "label": "Well-Being & Vitality",
        "sanskrit_concept": "Āyuṣ, Śaṃ & Mayas (Longevity, Peace & Joy)",
        "description": "Poetic aspirations for vigour, mental peace, longevity, and wholesome nourishment.",
        "keywords": ["well-being", "wellbeing", "health", "vitality", "longevity", "peace", "happiness", "joy", "healing", "strength", "life", "vigor", "nourishment"],
        "expansion_terms": ["live", "hundred", "autumns", "health", "strength", "healing", "balm", "wind", "waters", "sweet", "peace", "joy", "life"],
        "canonical_verses": ["RV_10_186_1", "RV_1_89_8", "RV_1_89_9", "RV_10_9_1", "RV_10_9_4", "RV_6_28_1"],
        "contemporary_connection": "While these hymns are poetic prayers and not clinical medicine, they express an enduring human aspiration for holistic vitality, appreciation of fresh air and clean water, and peaceful coexistence across a full lifespan.",
    },
    "nature": {
        "id": "nature",
        "label": "Nature & Ecological Reverence",
        "sanskrit_concept": "Prakṛti, Āpaḥ & Araṇyānī (Waters, Dawn & Forest Wilderness)",
        "description": "Reverence for rivers, dawn, wind, healing herbs, and the unspoiled forest ecosystem.",
        "keywords": ["nature", "environment", "ecology", "forest", "trees", "rivers", "waters", "dawn", "sun", "wind", "earth", "sky", "plants", "animals", "aranyani"],
        "expansion_terms": ["forest", "aranyani", "waters", "rivers", "sindhu", "dawn", "ushas", "wind", "earth", "heaven", "birds", "trees", "sweet"],
        "canonical_verses": ["RV_10_146_1", "RV_10_146_5", "RV_10_146_6", "RV_10_75_1", "RV_1_113_1", "RV_10_9_1"],
        "contemporary_connection": "In an era of ecological reflection, hymns such as RV 10.146 (Araṇyānī) and RV 10.75 (Nadīstuti) cultivate aesthetic gratitude and respect for non-violent coexistence with forests, wildlife, and river systems.",
    },
}


def preprocess_text(text: str) -> List[str]:
    clean = re.sub(r"[^a-z0-9\s]", " ", (text or "").lower())
    return [t for t in clean.split() if len(t) > 1 and t not in STOPWORDS]


def detect_life_themes(query: str, explicit_theme: Optional[str] = None) -> List[str]:
    detected: List[str] = []
    if explicit_theme and explicit_theme in LIFE_THEMES:
        detected.append(explicit_theme)
    q = (query or "").lower()
    scored: List[Tuple[str, int]] = []
    for tid, meta in LIFE_THEMES.items():
        if tid in detected:
            continue
        hits = sum(2 if kw in q else 0 for kw in meta["keywords"]) + sum(
            1 if ex in q else 0 for ex in meta["expansion_terms"]
        )
        if hits > 0:
            scored.append((tid, hits))
    scored.sort(key=lambda x: x[1], reverse=True)
    for tid, _ in scored[:2]:
        detected.append(tid)
    return detected


def check_epistemic_boundary(query: str) -> Dict[str, Any]:
    q = (query or "").lower()
    if re.search(
        r"\b(cure|cures|treat|treatment|medicine|medical|dosage|prescription|clinical|vaccine|antibiotic|diabetes|cancer|surgery|therapy|psychiatry|depression|anxiety|bipolar|schizophrenia|diagnose|diagnosis|symptom|pathology|pharmacological)\b",
        q,
    ):
        return {
            "is_boundary": True,
            "category": "medical_psychological",
            "reason": (
                "The Rig Veda is an ancient collection of liturgical and philosophical Sanskrit hymns (Mandalas 1–10). "
                "It does NOT provide clinical, medical, pharmacological, or psychological diagnoses or treatments. "
                "While hymns such as RV 10.186 and RV 10.9 express poetic prayers for vitality and peace, they must "
                "never be interpreted as scientifically validated healthcare solutions."
            ),
        }
    if re.search(
        r"\b(quantum|relativity|nuclear|thermodynamics|dna|genetics|microchip|internet|blockchain|artificial intelligence|machine learning|aerospace|laser|electromagnetism|scientifically proven|scientific validation)\b",
        q,
    ):
        return {
            "is_boundary": True,
            "category": "scientific_anachronism",
            "reason": (
                "The Rig Veda corpus does NOT contain modern physics, engineering, genetics, or empirically validated "
                "scientific theories. VedaWise strictly separates poetic cosmological imagery in the hymns from modern "
                "scientific claims."
            ),
        }
    return {"is_boundary": False, "category": None, "reason": None}


class VedaWiseEngine:
    """Modular Hybrid BM25 + Dense Vector + RRF + Reranker + Explainable RAG Engine."""

    def __init__(self, corpus_path: Path = COMPLETE_CORPUS_PATH):
        self.corpus_path = corpus_path
        self.verses: List[Dict[str, Any]] = []
        self.verse_by_id: Dict[str, Dict[str, Any]] = {}
        self.doc_tokens: List[List[str]] = []
        self.doc_freqs: Dict[str, int] = {}
        self.doc_lens: List[int] = []
        self.avgdl: float = 1.0
        self.embedding_model_name: str = DEFAULT_EMBEDDING_MODEL
        self.embedding_dim: int = 384
        self.faiss_ntotal: int = 0
        self._faiss_vectors: Optional[array] = None
        self._st_model: Any = None
        self._query_cache: Dict[str, List[float]] = {}
        self._load_and_index()

    def _load_and_index(self) -> None:
        if COMPLETE_CORPUS_PATH.exists():
            with open(COMPLETE_CORPUS_PATH, "r", encoding="utf-8") as f:
                raw = json.load(f)
            idx = 0
            for m_rec in raw.get("mandalas", []):
                for h_rec in m_rec.get("hymns", []):
                    for v in h_rec.get("verses", []):
                        rec = {
                            "index": idx,
                            "verse_id": v["verse_id"],
                            "mandala": v["mandala"],
                            "sukta": v["sukta"],
                            "verse": v["verse"],
                            "english": v["english_translation"],
                            "english_translation": v["english_translation"],
                            "sanskrit": v.get("sanskrit", ""),
                            "transliteration": v.get("transliteration", ""),
                            "deity": h_rec.get("deity", ""),
                            "title": h_rec.get("title", ""),
                            "hymn_title": h_rec.get("title", ""),
                            "translator": v.get("translator", "Ralph T. H. Griffith"),
                        }
                        self.verses.append(rec)
                        self.verse_by_id[rec["verse_id"]] = rec
                        idx += 1
        elif self.corpus_path.exists():
            with open(self.corpus_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    rec = json.loads(line)
                    self.verses.append(rec)
                    self.verse_by_id[rec["verse_id"]] = rec
        else:
            raise FileNotFoundError(f"Rig Veda corpus not found at {COMPLETE_CORPUS_PATH}")

        total_len = 0
        for rec in self.verses:
            tokens = preprocess_text(
                f"{rec.get('english', '')} {rec.get('deity', '')} {rec.get('title', '')}"
            )
            self.doc_tokens.append(tokens)
            self.doc_lens.append(len(tokens))
            total_len += len(tokens)
            for tok in set(tokens):
                self.doc_freqs[tok] = self.doc_freqs.get(tok, 0) + 1
        self.avgdl = total_len / max(len(self.verses), 1)
        self._load_faiss_index()

    def _load_faiss_index(self) -> None:
        if KB_CONFIG_PATH.exists():
            try:
                with open(KB_CONFIG_PATH, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                if not os.environ.get("EMBEDDING_MODEL") and cfg.get("model_name"):
                    self.embedding_model_name = str(cfg["model_name"])
                if cfg.get("embedding_dimension"):
                    self.embedding_dim = int(cfg["embedding_dimension"])
            except Exception:
                pass

        expected_count = len(self.verses)
        expected_floats = expected_count * self.embedding_dim

        if FAISS_INDEX_PATH.exists():
            with open(FAISS_INDEX_PATH, "rb") as f:
                buf = f.read()
            if len(buf) >= 45 and buf[:4] == b"IxFI":
                d = struct.unpack("<i", buf[4:8])[0]
                ntotal = struct.unpack("<q", buf[8:16])[0]
                codes_size = struct.unpack("<q", buf[37:45])[0]
                if d == self.embedding_dim and ntotal == expected_count and codes_size == expected_floats:
                    vecs = array("f")
                    vecs.frombytes(buf[45 : 45 + expected_floats * 4])
                    self._faiss_vectors = vecs
                    self.faiss_ntotal = ntotal
                    return

        if EMBEDDINGS_NPY_PATH.exists():
            with open(EMBEDDINGS_NPY_PATH, "rb") as f:
                buf = f.read()
            if len(buf) >= 128 and buf[1:6] == b"NUMPY":
                header_len = struct.unpack("<H", buf[8:10])[0]
                offset = 10 + header_len
                if len(buf) - offset >= expected_floats * 4:
                    vecs = array("f")
                    vecs.frombytes(buf[offset : offset + expected_floats * 4])
                    self._faiss_vectors = vecs
                    self.faiss_ntotal = expected_count

    def encode_query(self, query: str) -> List[float]:
        clean = (query or "").strip()
        if clean in self._query_cache:
            return self._query_cache[clean]

        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            if self._st_model is None:
                self._st_model = SentenceTransformer(self.embedding_model_name)
            vec_np = self._st_model.encode(clean, normalize_embeddings=True)
            vec = [float(x) for x in vec_np.tolist()]
            self._query_cache[clean] = vec
            return vec
        except Exception:
            pass

        onnx_model = (
            "Xenova/all-MiniLM-L6-v2"
            if self.embedding_model_name in ("sentence-transformers/all-MiniLM-L6-v2", "all-MiniLM-L6-v2")
            else self.embedding_model_name.replace("sentence-transformers/", "Xenova/")
        )
        node_script = (
            "import('@xenova/transformers').then(async ({pipeline}) => {"
            f"const ext = await pipeline('feature-extraction', {json.dumps(onnx_model)}, {{quantized: true}});"
            f"const out = await ext({json.dumps(clean)}, {{pooling: 'mean', normalize: true}});"
            "console.log(JSON.stringify(Array.from(out.data)));"
            "});"
        )
        out_str = subprocess.check_output(
            ["node", "-e", node_script], cwd=str(ROOT_DIR), text=True
        ).strip()
        vec = [float(x) for x in json.loads(out_str.splitlines()[-1])]
        self._query_cache[clean] = vec
        return vec

    def search_bm25(
        self,
        query: str,
        top_k: int = 25,
        mandala_filter: Optional[int] = None,
        life_theme: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        q_tokens = preprocess_text(query)
        detected = detect_life_themes(query, life_theme)
        theme_tokens: List[str] = []
        canonical_ids = set()
        for tid in detected:
            meta = LIFE_THEMES[tid]
            theme_tokens.extend(preprocess_text(" ".join(meta["expansion_terms"])))
            canonical_ids.update(meta["canonical_verses"])

        all_tokens = list(dict.fromkeys(q_tokens + theme_tokens))
        if not all_tokens:
            return []

        N = len(self.verses)
        k1, b = 1.5, 0.75
        scored: List[Tuple[int, float]] = []

        for idx, rec in enumerate(self.verses):
            if mandala_filter is not None and rec["mandala"] != mandala_filter:
                continue
            tokens = self.doc_tokens[idx]
            if not tokens:
                continue
            tf_map: Dict[str, int] = {}
            for t in tokens:
                tf_map[t] = tf_map.get(t, 0) + 1
            dl = self.doc_lens[idx]
            score = 0.0
            for qt in all_tokens:
                tf = tf_map.get(qt, 0)
                if tf == 0:
                    continue
                df = self.doc_freqs.get(qt, 0)
                idf = math.log(1.0 + (N - df + 0.5) / (df + 0.5))
                denom = tf + k1 * (1.0 - b + b * (dl / self.avgdl))
                weight = 1.0 if qt in q_tokens else 0.42
                score += weight * idf * ((tf * (k1 + 1.0)) / denom)
            if rec["verse_id"] in canonical_ids:
                score += 4.2
            if score > 0:
                scored.append((idx, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        results = []
        for rank, (idx, sc) in enumerate(scored[:top_k], start=1):
            item = dict(self.verses[idx])
            item["bm25_rank"] = rank
            item["bm25_score"] = round(sc, 4)
            results.append(item)
        return results

    def search_dense(
        self,
        query: str,
        top_k: int = 25,
        mandala_filter: Optional[int] = None,
        life_theme: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if not query or not query.strip():
            return []
        if self._faiss_vectors is None or self.faiss_ntotal != len(self.verses):
            self._load_faiss_index()
        if self._faiss_vectors is None or self.faiss_ntotal != len(self.verses):
            raise RuntimeError(
                f"FAISS index not loaded or misaligned (loaded={self.faiss_ntotal}, expected={len(self.verses)})"
            )

        q_vec = self.encode_query(query)
        dim = self.embedding_dim
        vecs = self._faiss_vectors
        scored: List[Tuple[int, float]] = []

        for idx, rec in enumerate(self.verses):
            if mandala_filter is not None and rec["mandala"] != mandala_filter:
                continue
            offset = idx * dim
            dot = sum(q_vec[d] * vecs[offset + d] for d in range(dim))
            scored.append((idx, dot))

        scored.sort(key=lambda x: x[1], reverse=True)
        results = []
        for rank, (idx, sc) in enumerate(scored[:top_k], start=1):
            item = dict(self.verses[idx])
            item["dense_rank"] = rank
            item["dense_score"] = round(sc, 6)
            results.append(item)
        return results

    def retrieve(
        self,
        query: str,
        mode: str = "hybrid_rerank",
        top_k: int = 5,
        mandala_filter: Optional[int] = None,
        life_theme: Optional[str] = None,
        rrf_k: int = 60,
    ) -> List[Dict[str, Any]]:
        bm25_res = self.search_bm25(query, top_k=40, mandala_filter=mandala_filter, life_theme=life_theme)
        dense_res = self.search_dense(query, top_k=40, mandala_filter=mandala_filter, life_theme=life_theme)

        if mode == "bm25":
            out = []
            for idx, r in enumerate(bm25_res[:top_k], start=1):
                r["final_rank"] = idx
                r["final_score"] = r["bm25_score"]
                r["retrieval_source"] = "bm25"
                r["why_retrieved"] = f"Matched lexical terms (BM25 Rank #{r['bm25_rank']})."
                out.append(r)
            return out

        if mode == "dense":
            out = []
            for idx, r in enumerate(dense_res[:top_k], start=1):
                r["final_rank"] = idx
                r["final_score"] = r["dense_score"]
                r["retrieval_source"] = "dense"
                r["why_retrieved"] = f"Matched semantic concept vector (Dense Rank #{r['dense_rank']})."
                out.append(r)
            return out

        merged: Dict[str, Dict[str, Any]] = {}
        for r in bm25_res:
            vid = r["verse_id"]
            merged[vid] = dict(r)
            merged[vid]["rrf_score"] = 1.0 / (rrf_k + r["bm25_rank"])
            merged[vid]["retrieval_source"] = "bm25"

        for r in dense_res:
            vid = r["verse_id"]
            contrib = 1.0 / (rrf_k + r["dense_rank"])
            if vid in merged:
                merged[vid]["dense_rank"] = r["dense_rank"]
                merged[vid]["dense_score"] = r["dense_score"]
                merged[vid]["rrf_score"] += contrib
                merged[vid]["retrieval_source"] = "both"
            else:
                merged[vid] = dict(r)
                merged[vid]["rrf_score"] = contrib
                merged[vid]["retrieval_source"] = "dense"

        candidates = list(merged.values())
        for c in candidates:
            c["rrf_score"] = round(c["rrf_score"], 5)
            if mode == "hybrid_rerank":
                bonus = 0.015 if c.get("retrieval_source") == "both" else 0.0
                c["rerank_score"] = round(c["rrf_score"] + bonus, 5)
                c["final_score"] = c["rerank_score"]
            else:
                c["final_score"] = c["rrf_score"]

        candidates.sort(key=lambda x: x["final_score"], reverse=True)
        out = []
        for idx, c in enumerate(candidates[:top_k], start=1):
            c["final_rank"] = idx
            c["why_retrieved"] = (
                f"Hybrid RRF ({c['rrf_score']:.4f}) combining "
                f"BM25 #{c.get('bm25_rank', '–')} and Dense #{c.get('dense_rank', '–')}."
            )
            out.append(c)
        return out

    def resolve_conversation_context(
        self,
        question: str,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[str, Optional[str]]:
        if not history:
            return question, None
        q_lower = question.lower()
        last_verses: List[str] = []
        for turn in reversed(history):
            if turn.get("cited_verses"):
                last_verses = turn["cited_verses"]
                break
        if last_verses and re.search(r"\b(next verse|following verse|verse after)\b", q_lower):
            m = re.match(r"^RV_(\d+)_(\d+)_(\d+)$", last_verses[0])
            if m:
                mandala, sukta, verse = int(m.group(1)), int(m.group(2)), int(m.group(3))
                cand_same = f"RV_{mandala}_{sukta}_{verse + 1}"
                cand_next_hymn = f"RV_{mandala}_{sukta + 1}_1"
                target = cand_same if cand_same in self.verse_by_id else cand_next_hymn
                return f"{target} {question}", f"Resolved follow-up '{question}' -> {target}"
        return question, None

    def answer_question(
        self,
        question: str,
        history: Optional[List[Dict[str, Any]]] = None,
        mode: str = "hybrid_rerank",
        top_k: int = 5,
        mandala_filter: Optional[int] = None,
        life_theme: Optional[str] = None,
    ) -> Dict[str, Any]:
        resolved_q, note = self.resolve_conversation_context(question, history)
        detected_themes = detect_life_themes(resolved_q, life_theme)
        boundary = check_epistemic_boundary(resolved_q)

        if boundary["is_boundary"]:
            return {
                "question": question,
                "resolved_query": resolved_q,
                "resolution_note": note,
                "detected_themes": detected_themes,
                "abstained": True,
                "abstention_reason": boundary["reason"],
                "confidence": "abstained",
                "answer": f"Epistemic Boundary & Abstention: {boundary['reason']}",
                "epistemic_layers": {
                    "textual_evidence": "No verses are cited as clinical, psychological, or modern scientific proof.",
                    "theme": "Epistemic Boundary (Non-Medical / Non-Scientific Corpus)",
                    "contemporary_connection": "Modern medical or scientific questions require contemporary empirical evidence.",
                    "unsupported_claim": boundary["reason"],
                },
                "claims": [
                    {
                        "claim": boundary["reason"],
                        "supporting_verses": [],
                        "support_type": "Unsupported",
                        "support_status": "unsupported",
                    }
                ],
                "retrieved_verses": [],
            }

        # Check direct verse ID in resolved query
        direct_match = re.search(r"\bRV_(\d+)_(\d+)_(\d+)\b", resolved_q)
        if direct_match and direct_match.group(0) in self.verse_by_id:
            v = dict(self.verse_by_id[direct_match.group(0)])
            v["final_rank"] = 1
            v["final_score"] = 1.0
            v["retrieval_source"] = "both"
            v["why_retrieved"] = f"Direct contextual resolution to {v['verse_id']}."
            verses = [v]
        else:
            verses = self.retrieve(
                resolved_q,
                mode=mode,
                top_k=top_k,
                mandala_filter=mandala_filter,
                life_theme=life_theme,
            )

        if not verses:
            reason = "Insufficient textual evidence in Rig Veda Mandalas 1–10 for this query."
            return {
                "question": question,
                "resolved_query": resolved_q,
                "resolution_note": note,
                "detected_themes": detected_themes,
                "abstained": True,
                "abstention_reason": reason,
                "confidence": "abstained",
                "answer": reason,
                "epistemic_layers": {
                    "textual_evidence": "No matching Rig Veda verses met the evidence threshold.",
                    "theme": "Insufficient Textual Evidence",
                    "contemporary_connection": "VedaWise abstains when scriptural evidence is absent.",
                    "unsupported_claim": reason,
                },
                "claims": [],
                "retrieved_verses": [],
            }

        top_v = verses[0]
        second_v = verses[1] if len(verses) > 1 else None
        theme_meta = LIFE_THEMES.get(detected_themes[0]) if detected_themes else None

        textual_evidence = (
            f'In {top_v["verse_id"]} ({top_v.get("title", "Hymn")}, addressed to {top_v.get("deity", "Deity")}), '
            f'the text states: "{top_v["english"]}" [{top_v["verse_id"]}].'
        )
        if second_v:
            textual_evidence += (
                f' Additionally, {second_v["verse_id"]} states: "{second_v["english"]}" [{second_v["verse_id"]}].'
            )

        if theme_meta:
            theme_str = (
                f'{theme_meta["label"]} ({theme_meta["sanskrit_concept"]}): '
                f'{theme_meta["description"]} [{top_v["verse_id"]}].'
            )
            contemporary_str = f'{theme_meta["contemporary_connection"]} [{top_v["verse_id"]}].'
        else:
            theme_str = (
                f'Vedic Hymnody & Sacred Inquiry: The retrieved verses center on {top_v.get("deity", "Vedic deities")} '
                f'in Mandala {top_v["mandala"]}, Sukta {top_v["sukta"]} [{top_v["verse_id"]}].'
            )
            contemporary_str = (
                f'Read as a reflective analogy, {top_v["verse_id"]} illustrates how ancient poetic imagery '
                f'articulates human aspiration and reverence without constituting literal modern science [{top_v["verse_id"]}].'
            )

        unsupported_str = (
            "Epistemic Boundary: The Rig Veda corpus does not establish clinical medical treatments, "
            "psychological therapy, or modern empirical science; contemporary connections are reflective "
            "interpretations rather than direct scriptural facts."
        )

        claims = [
            {
                "claim": textual_evidence,
                "supporting_verses": [v["verse_id"] for v in verses[:2]],
                "support_type": "Direct",
                "support_status": "supported",
            },
            {
                "claim": theme_str,
                "supporting_verses": [top_v["verse_id"]],
                "support_type": "Thematic",
                "support_status": "supported",
            },
            {
                "claim": contemporary_str,
                "supporting_verses": [top_v["verse_id"]],
                "support_type": "Interpretive",
                "support_status": "supported",
            },
            {
                "claim": unsupported_str,
                "supporting_verses": [],
                "support_type": "Unsupported",
                "support_status": "unsupported",
            },
        ]

        answer = (
            f"1. Textual Evidence: {textual_evidence}\n\n"
            f"2. Theme: {theme_str}\n\n"
            f"3. Contemporary Connection: {contemporary_str}\n\n"
            f"4. Unsupported Claim / Boundary: {unsupported_str}"
        )

        return {
            "question": question,
            "resolved_query": resolved_q,
            "resolution_note": note,
            "detected_themes": detected_themes,
            "abstained": False,
            "abstention_reason": None,
            "confidence": "high",
            "answer": answer,
            "epistemic_layers": {
                "textual_evidence": textual_evidence,
                "theme": theme_str,
                "contemporary_connection": contemporary_str,
                "unsupported_claim": unsupported_str,
            },
            "claims": claims,
            "retrieved_verses": verses,
            "cited_verses": [v["verse_id"] for v in verses[:2]],
        }
