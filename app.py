"""
VedaWise Streamlit Interface (`streamlit run app.py`)
Explainable AI for Life-Oriented Knowledge Discovery from the Rig Veda (Mandalas 1–10)
"""

import streamlit as st
from vedawise.pipeline import VedaWiseEngine, LIFE_THEMES

st.set_page_config(
    page_title="VedaWise: Explainable Rig Veda RAG",
    page_icon="🕉️",
    layout="wide",
)


@st.cache_resource
def get_engine() -> VedaWiseEngine:
    return VedaWiseEngine()


def main() -> None:
    engine = get_engine()

    st.title("VedaWise: Explainable AI for Life-Oriented Knowledge Discovery from the Rig Veda")
    st.caption(
        "Conversational Hybrid RAG (BM25 + Dense + RRF) over Rig Veda Mandalas 1–10 with "
        "4-Layer Epistemic Separation (Textual Evidence, Theme, Contemporary Connection, Unsupported Claim)."
    )

    with st.sidebar:
        st.header("Retrieval & Epistemic Controls")
        theme_options = ["Auto-detect from question"] + list(LIFE_THEMES.keys())
        selected_theme = st.selectbox(
            "Life-Oriented Theme",
            options=theme_options,
            format_func=lambda k: k if k == "Auto-detect from question" else LIFE_THEMES[k]["label"],
        )
        mandala_choice = st.selectbox(
            "Mandala Filter",
            options=["All Mandalas (1–10)"] + [f"Mandala {m}" for m in range(1, 11)],
        )
        retrieval_mode = st.selectbox(
            "Retrieval Pipeline Mode",
            options=["hybrid_rerank", "hybrid", "bm25", "dense"],
            format_func=lambda m: {
                "hybrid_rerank": "Hybrid RRF + Reranker",
                "hybrid": "Hybrid RRF (BM25 + Dense)",
                "bm25": "BM25 Lexical Only",
                "dense": "Dense Vector Only",
            }[m],
        )
        top_k = st.slider("Top-K Supporting Verses", min_value=3, max_value=8, value=5)
        show_debug = st.checkbox("Show RAG Pipeline Debug View", value=True)

        if st.button("Clear Conversation"):
            st.session_state["history"] = []
            st.rerun()

    if "history" not in st.session_state:
        st.session_state["history"] = []

    mandala_filter = (
        None
        if mandala_choice == "All Mandalas (1–10)"
        else int(mandala_choice.replace("Mandala ", ""))
    )
    life_theme = None if selected_theme == "Auto-detect from question" else selected_theme

    for turn in st.session_state["history"]:
        with st.chat_message("user"):
            st.markdown(turn["question"])
        with st.chat_message("assistant"):
            render_response(turn, show_debug)

    prompt = st.chat_input(
        "Ask about adversity, knowledge, cooperation, leadership, discipline, ethics, uncertainty, well-being, or nature..."
    )
    if prompt:
        with st.chat_message("user"):
            st.markdown(prompt)
        result = engine.answer_question(
            question=prompt,
            history=st.session_state["history"],
            mode=retrieval_mode,
            top_k=top_k,
            mandala_filter=mandala_filter,
            life_theme=life_theme,
        )
        st.session_state["history"].append(result)
        with st.chat_message("assistant"):
            render_response(result, show_debug)


def render_response(res: dict, show_debug: bool) -> None:
    if res.get("resolution_note"):
        st.info(f"Context Resolution: {res['resolution_note']}")

    layers = res.get("epistemic_layers", {})
    c1, c2 = st.columns(2)
    with c1:
        st.success(f"**1. Textual Evidence (Direct Scriptural Fact)**\n\n{layers.get('textual_evidence', '')}")
        st.info(f"**3. Contemporary Connection (Reflective Interpretation)**\n\n{layers.get('contemporary_connection', '')}")
    with c2:
        st.warning(f"**2. Theme (Life-Oriented Motif)**\n\n{layers.get('theme', '')}")
        st.error(f"**4. Unsupported Claim / Epistemic Boundary**\n\n{layers.get('unsupported_claim', '')}")

    with st.expander("Claim -> Supporting Verse -> Support Type Attribution", expanded=True):
        for claim in res.get("claims", []):
            st.markdown(
                f"- **[{claim['support_type']}]** {claim['claim']} "
                f"*(Verses: {', '.join(claim['supporting_verses']) or 'Epistemic Boundary'})*"
            )

    with st.expander(f"Supporting Rig Veda Verses ({len(res.get('retrieved_verses', []))})", expanded=True):
        for v in res.get("retrieved_verses", []):
            st.markdown(
                f"**#{v.get('final_rank')} · {v['verse_id']}** — *{v.get('title', '')}* (Deity: {v.get('deity', '')})\n\n"
                f"- **Sanskrit:** {v.get('sanskrit', '')}\n"
                f"- **Transliteration:** *{v.get('transliteration', '')}*\n"
                f"- **English:** \"{v.get('english', '')}\"\n"
                f"- **Retrieval Metadata:** `{v.get('why_retrieved', '')}`"
            )
            st.divider()

    if show_debug:
        with st.expander("RAG Pipeline Debug View", expanded=False):
            st.json(
                {
                    "resolved_query": res.get("resolved_query"),
                    "detected_themes": res.get("detected_themes"),
                    "confidence": res.get("confidence"),
                    "abstained": res.get("abstained"),
                }
            )


if __name__ == "__main__":
    main()
