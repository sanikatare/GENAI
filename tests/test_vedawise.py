"""
Automated verification tests for VedaWise:
- Corpus integrity across Rig Veda Mandalas 1–10
- Life-theme detection (9 themes)
- BM25, Dense, and Hybrid RRF retrieval with rank metadata
- 4-layer epistemic separation (Textual Evidence, Theme, Contemporary Connection, Unsupported Claim)
- Direct / Thematic / Interpretive / Unsupported claim attribution
- Conversational context resolution ("What about the next verse?")
- Medical / scientific epistemic boundary abstention
"""

from vedawise.pipeline import VedaWiseEngine, LIFE_THEMES, detect_life_themes, check_epistemic_boundary


def test_corpus_mandalas_1_to_10():
    engine = VedaWiseEngine()
    assert len(engine.verses) == 10546
    assert engine.faiss_ntotal == 10546
    assert engine.embedding_dim == 384
    mandalas = {v["mandala"] for v in engine.verses}
    assert mandalas == set(range(1, 11))
    dense_hits = engine.search_dense("I laud Agni, the chosen Priest, God, minister of sacrifice.", top_k=5)
    assert len(dense_hits) == 5
    assert dense_hits[0]["verse_id"] == "RV_1_1_1"
    assert dense_hits[0]["dense_score"] > 0.85


def test_life_theme_detection():
    themes = detect_life_themes("How does the Rig Veda describe overcoming adversity and peril?")
    assert "adversity_resilience" in themes
    assert len(LIFE_THEMES) == 9


def test_hybrid_retrieval_and_4_layer_answer():
    engine = VedaWiseEngine()
    res = engine.answer_question(
        "What does the Rig Veda say about cooperation and unity?",
        mode="hybrid_rerank",
        life_theme="cooperation",
    )
    assert res["abstained"] is False
    assert "RV_10_191_2" in res["cited_verses"] or "RV_10_191_3" in res["cited_verses"]
    layers = res["epistemic_layers"]
    assert layers["textual_evidence"]
    assert layers["theme"]
    assert layers["contemporary_connection"]
    assert layers["unsupported_claim"]
    support_types = {c["support_type"] for c in res["claims"]}
    assert {"Direct", "Thematic", "Interpretive", "Unsupported"}.issubset(support_types)


def test_conversational_followup_resolution():
    engine = VedaWiseEngine()
    turn1 = engine.answer_question("What does the text say about adversity?", life_theme="adversity_resilience")
    turn2 = engine.answer_question("What about the next verse?", history=[turn1])
    assert turn2["resolution_note"] is not None
    assert "RV_" in turn2["resolved_query"]


def test_medical_and_scientific_abstention():
    engine = VedaWiseEngine()
    med = engine.answer_question("Which Rig Veda mantra cures clinical depression or diabetes?")
    assert med["abstained"] is True
    assert med["claims"][0]["support_type"] == "Unsupported"

    sci = check_epistemic_boundary("Where does the Rig Veda prove quantum computing and DNA?")
    assert sci["is_boundary"] is True


def test_explainable_ai_invariants_and_ask_vedawise_questions():
    engine = VedaWiseEngine()
    corpus_ids = set(engine.verse_by_id.keys())

    questions = [
        "What does the Rig Veda say about leadership in daily life?",
        "What does it say about cooperation?",
        "How can a verse relate to handling adversity?",
        "What does it say about discipline?",
        "What can the verses teach us about learning?",
    ]
    history = []
    for q in questions:
        res = engine.answer_question(q, mode="hybrid")
        assert res["abstained"] is False
        retrieved_ids = {v["verse_id"] for v in res["retrieved_verses"]}
        for cite in res["cited_verses"]:
            assert cite in corpus_ids, f"Citation {cite} must exist in corpus"
            assert cite in retrieved_ids, f"Citation {cite} must be retrieved"
        layers = res["epistemic_layers"]
        distinct_layers = {
            layers["textual_evidence"].strip(),
            layers["theme"].strip(),
            layers["contemporary_connection"].strip(),
            layers["unsupported_claim"].strip(),
        }
        assert len(distinct_layers) == 4, "Four epistemic layers must remain distinct"
        direct_claims = [c for c in res["claims"] if c["support_type"] == "Direct"]
        assert len(direct_claims) > 0 and all(len(c["supporting_verses"]) > 0 for c in direct_claims)
        history.append(res)

    # 6. Follow-up question preserves citation/context grounding
    followup = engine.answer_question("What about the next verse?", history=history)
    assert followup["abstained"] is False
    assert followup["resolution_note"] is not None
    assert all(c in corpus_ids for c in followup["cited_verses"])

    # 7. Medical/scientific validation abstention
    diabetes = engine.answer_question("Which Rig Veda verse scientifically proves that it cures diabetes?")
    assert diabetes["abstained"] is True
    assert diabetes["retrieved_verses"] == []

