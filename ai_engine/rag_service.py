import re
import json
import os
import uuid
import google.generativeai as genai
import chromadb
from sentence_transformers import SentenceTransformer

# ══════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_storage")

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
COLLECTION_NAME = "iqra_knowledge"
GEMINI_API_KEY  = "AIzaSyDRAiw-NmLinPDgEUDGxQQYtKxYPfPb7WI"

# ══════════════════════════════════════════
# INIT
# ══════════════════════════════════════════

embedder = SentenceTransformer(EMBEDDING_MODEL)
chroma   = chromadb.PersistentClient(path=CHROMA_DIR)

# ── Collection principale (cours + exos BAC) ─────────────────
collection = chroma.get_collection(COLLECTION_NAME)

# ── FIX BUG 1 : initialisation sécurisée des collections spécialisées ──
# Ces collections sont créées par ingest.py — elles peuvent ne pas encore
# exister au premier lancement. On dégrade gracieusement avec None.
try:
    collection_study_habits = chroma.get_collection("study_habits_knowledge")
except Exception:
    collection_study_habits = None   # dégradation gracieuse — F1 study plan

try:
    collection_career = chroma.get_collection("career_knowledge")
except Exception:
    collection_career = None         # dégradation gracieuse — F3 orientation

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-3-flash-preview")

# NOTE : run_manim_pipeline est importé UNIQUEMENT dans _generate_video()
# pour éviter un crash au démarrage si Manim n'est pas installé.

# ══════════════════════════════════════════
# HELPER — Filières avec sous-dossiers COURS/EXO
# ══════════════════════════════════════════

FILIERES_AVEC_TYPE = ["2BAC SM A", "2BAC SPC", "2BAC SVT"]


def build_where_filter(niveau, matiere, type_doc=None):
    """
    Construit un filtre ChromaDB valide.
    FIX BUG 2 : type_doc=None est ignoré pour éviter un filtre invalide.
    """
    conditions = [
        {"niveau":  {"$eq": niveau}},
        {"matiere": {"$eq": matiere}},
    ]
    if type_doc is not None:                    # ← FIX : on n'ajoute le filtre que si type_doc est défini
        conditions.append({"type_doc": {"$eq": type_doc}})
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def get_type_exo(niveau):
    return "EXO" if niveau in FILIERES_AVEC_TYPE else None


def get_type_cours(niveau):
    return "COURS" if niveau in FILIERES_AVEC_TYPE else None


# ══════════════════════════════════════════
# HELPER — Parsing JSON sécurisé depuis Gemini
# ══════════════════════════════════════════

def _parse_gemini_json(raw_text: str):
    """
    Nettoie et parse le JSON retourné par Gemini.
    Lève json.JSONDecodeError si le parsing échoue.
    """
    cleaned = re.sub(r"```json|```", "", raw_text.strip()).strip()
    return json.loads(cleaned)


# ══════════════════════════════════════════
# DÉTECTION LANGUE — v1 (F1 + state machine)
# ══════════════════════════════════════════

_DARIJA_MARKERS_V1 = [
    "واش", "بحال", "مافهمتش", "خليني", "علاش", "كيفاش",
    "دابا", "هادشي", "مزيان", "بغيت", "خاصني", "ماشي",
    "wach", "bach", "mafhemtch", "kifach", "daba", "mzyan",
    "chno", "fin", "3lach", "bghit", "kayn", "khasni",
    "khoya", "sahbi", "aji", "safi", "bzzaf", "zwina",
]

_AR_MARKERS = [
    "لا أفهم", "أريد", "كيف", "لماذا", "ما هو", "شرح",
    "المسألة", "الحل", "يرجى", "أستطيع", "يجب", "هل",
]

_FR_MARKERS = [
    "je", "tu", "il", "nous", "vous", "ils", "est", "sont",
    "avec", "pour", "dans", "sur", "pas", "une", "les",
    "je ne comprends pas", "j'ai besoin", "comment",
]


def detect_language_v1(text: str) -> str:
    """Détection simple — utilisée par ask_rag / generate_quiz / generate_study_plan / state-machine."""
    if not text or not text.strip():
        return "fr"
    text_low = text.lower()
    darija_score = sum(1 for m in _DARIJA_MARKERS_V1 if m.lower() in text_low)
    ar_score     = sum(1 for m in _AR_MARKERS if m in text)
    fr_score     = sum(1 for m in _FR_MARKERS if m in text_low)
    has_arabic_chars = any('\u0600' <= c <= '\u06ff' for c in text)
    if darija_score > 0:
        return "darija"
    if ar_score > 0 or (has_arabic_chars and fr_score == 0):
        return "ar"
    return "fr"


def get_language_instruction_v1(language: str) -> str:
    """Directive de langue STRICTE pour Gemini — v1 (F1, quiz, plan)."""
    instructions = {
        "fr": (
            "══ LANGUE OBLIGATOIRE : FRANÇAIS ══\n"
            "Toute ta réponse doit être intégralement en français.\n"
            "Zéro mot en arabe, zéro mot en darija, zéro mélange.\n"
            "Si un terme technique n'a pas d'équivalent français parfait,\n"
            "mets le terme original entre parenthèses, mais la phrase reste française.\n"
            "Exception : pour les matières arabe/histoire-géo marocaine,\n"
            "tu peux utiliser les termes officiels arabes entre guillemets si indispensable."
        ),
        "ar": (
            "══ اللغة الإلزامية : العربية الفصحى ══\n"
            "يجب أن تكتب إجابتك كاملةً باللغة العربية الفصحى.\n"
            "لا فرنسية، لا دارجة، لا خلط نهائياً.\n"
            "إذا كان المصطلح التقني بالفرنسية، اكتبه بين قوسين مع الإبقاء على الجملة بالعربية.\n"
            "استخدم لغة واضحة ومناسبة لطالب في المرحلة الثانوية المغربية."
        ),
        "darija": (
            "══ اللغة الإلزامية : الدارجة المغربية ══\n"
            "خاصك تكتب جميع جواباتك بالدارجة المغربية الطبيعية — كيما كيتكلم الناس فالمغرب.\n"
            "مثال على الدارجة المزيانة : 'واش فهمتي ؟', 'مزيان', 'خليك معايا', 'دابا نشوفو مع بعضياتنا'\n"
            "مثال على المحظور : الفرنسية أو العربية الفصحى أو الخلط العشوائي.\n"
            "الدارجة المغربية ≠ العربية الفصحى. لا تكتب بالفصحى أبداً.\n"
            "يمكنك استخدام كلمات فرنسية مندمجة في الدارجة كما يفعل المغاربة :\n"
            "مثل 'l'équation', 'le calcul', 'la formule' — لكن الجملة تبقى بالدارجة.\n"
            "ما تترجمش بطريقة Google Translate — تكلم بشكل حقيقي وطبيعي."
        ),
    }
    return instructions.get(language, instructions["fr"])


# ══════════════════════════════════════════
# DÉTECTION LANGUE — v7 enrichie (F2 + F3)
# ══════════════════════════════════════════

_DARIJA_LATIN = frozenset([
    "mafhemtch", "ma3raftch", "makaintch", "mabghitch", "makaynch",
    "makaynach", "mazaltch", "manqderch", "mawjoudch",
    "bghit", "kan3rf", "kanbghi", "kayn3rf", "fhmt", "fhemna",
    "3raft", "3andi", "3endek", "3endo", "3endna",
    "writ", "mchit", "jit", "dert", "derna", "ndir", "ndirou", "ndiru",
    "jarrab", "jarrabna", "kajarrab",
    "kharej", "dakhal", "khrej", "dkhal",
    "bda", "nbda", "nbdaw", "bdit",
    "nta", "nti", "ntoma", "hiya", "howa", "homa",
    "daba", "dyal", "dial", "dyali", "dyalek",
    "wach", "wash", "ach", "ash",
    "kif", "kifach", "kfach",
    "fach", "mnin", "lach", "3lach",
    "bach", "hta", "wella", "wla",
    "ghadi", "ghir", "rak", "rani",
    "had", "dak", "lhisab", "lmath",
    "lkitab", "lmessala", "lmosala", "lhaja",
    "bzaf", "bezzaf", "chwiya", "shwiya", "bhal",
    "mzyan", "mzien", "zwina", "zwine",
    "wakha", "wakhali", "yallah", "yala",
    "3yant", "3yanit", "3yit", "dayekh", "dayekha",
    "khaif", "khaifa", "khayef", "khayfa",
    "3la", "ela",
    "waw", "waww", "ahh",
    "mafhemtch", "khasni", "nfahem", "chrehli",
    "3tini", "sahl", "sa3ib", "s3ib", "s3iba",
    "kanjri", "kanhel", "kandiru", "kansawel", "kanbda",
    "nkun", "nkoun", "nwaqef", "nsolve",
])

_DARIJA_AR = frozenset([
    "ماشي", "واش", "كيفاش", "علاش", "فاش", "داك", "داكشي",
    "كاين", "كاينة", "مكاينش", "مبغيتش", "مافهمتش",
    "بغيت", "غادي", "راك", "راني", "دابا",
    "بزاف", "شوية", "ديال", "ديالي", "ديالك",
    "مزيان", "مليح", "زوين",
    "خاصني", "خاصك", "يلا", "واخا",
    "آه", "لا مشكل", "مشكل", "صعيب", "سهل",
])


def detect_language(text: str) -> str:
    """
    Détection enrichie v7 — utilisée par F2 (tuteur image) et F3 (orientation).
    Retourne : "ar" | "darija" | "fr"
    """
    if not text or not text.strip():
        return "fr"
    cleaned = text.strip()
    lower   = cleaned.lower()
    words   = re.findall(r"\b[a-zA-Z0-9']+\b", lower)
    darija_latin_hits = sum(1 for w in words if w in _DARIJA_LATIN)
    has_arabic_numeral_pattern = bool(re.search(r"\b[a-z]*[3789][a-z]*\b", lower))
    if darija_latin_hits >= 1 or has_arabic_numeral_pattern:
        return "darija"
    arabic_chars = sum(1 for c in cleaned if "\u0600" <= c <= "\u06FF")
    latin_chars  = sum(1 for c in cleaned if c.isalpha() and ord(c) < 128)
    total_alpha  = arabic_chars + latin_chars
    if total_alpha == 0:
        return "fr"
    arabic_ratio = arabic_chars / total_alpha
    if arabic_ratio > 0.15:
        darija_ar_hits = sum(1 for m in _DARIJA_AR if m in cleaned)
        if darija_ar_hits >= 1 or (arabic_ratio < 0.85 and latin_chars >= 3):
            return "darija"
        return "ar"
    return "fr"


def get_language_instruction(language: str) -> str:
    """Directive de langue v7 — utilisée par F2 et F3."""
    instructions = {
        "fr": (
            "LANGUE OBLIGATOIRE : français uniquement.\n"
            "Aucun mot arabe, aucune translittération darija.\n"
            "Si le sujet est scientifique, utilise les termes français officiels du programme marocain."
        ),
        "ar": (
            "اللغة الإلزامية : العربية الفصحى البسيطة والواضحة فقط.\n"
            "لا كلمات فرنسية إلا للمصطلحات العلمية التي ليس لها بديل عربي شائع.\n"
            "أسلوب بسيط ومباشر يناسب طالباً مغربياً — ليس أسلوباً أدبياً رسمياً."
        ),
        "darija": (
            "اللغة الإلزامية : الدارجة المغربية الطبيعية فقط.\n"
            "استعمل أسلوب الشباب المغربي الحقيقي : مزيج عربي + فرنسي مغربي، خفيف ومباشر.\n"
            "أمثلة صحيحة :\n"
            "  • 'هاد الخطوة هي اللي كتعيق بزاف د الطلبة، دير هكذا...'\n"
            "  • 'واش فهمتي الفكرة؟ قول لي فين بالضبط كتبلوك'\n"
            "  • 'مزيان، دابا جرب تحل هاد الجزء'\n"
            "ممنوع الفصحى الرسمية الكاملة.\n"
            "ممنوع الفرنسية الكاملة.\n"
            "ممنوع الإنجليزية."
        ),
    }
    return instructions.get(language, instructions["fr"])


# ══════════════════════════════════════════
# STATE MACHINE — pédagogique v1 (F1 chatbot tuteur)
# ══════════════════════════════════════════

_LOST_SIGNALS = [
    "je sais pas", "je ne sais pas", "je comprends pas", "je ne comprends pas",
    "je suis perdu", "j'ai rien compris", "aucune idée", "je bloque",
    "mafhemtch", "mafahemtch", "ma3raftch", "khoya mafhemtch",
    "ana dayekh", "ghalast", "ma3reftch",
    "لا أفهم", "ما فهمت", "لا أعرف", "مافهمتش",
]

_ATTEMPT_SIGNALS = [
    "je pense que", "je crois que", "donc", "alors", "résultat",
    "j'ai trouvé", "j'obtiens", "ça donne", "=", "->",
    "نتيجة", "إذن", "وجدت", "حسبت",
]

_DONE_SIGNALS = [
    "j'ai compris", "je comprends maintenant", "c'est bon", "merci",
    "فهمت", "واضح", "شكراً",
    "fhmt", "wach", "mzyan chokran",
]


def infer_next_stage(current_stage, user_message, help_level, turn_count):
    msg = user_message.lower().strip() if user_message else ""
    is_lost    = any(sig in msg for sig in _LOST_SIGNALS)
    is_attempt = any(sig in msg for sig in _ATTEMPT_SIGNALS) or (
        any(c.isdigit() for c in msg) and len(msg) > 5
    )
    is_done = any(sig in msg for sig in _DONE_SIGNALS)

    if current_stage == "diagnostic":
        if is_lost:
            return ("diagnostic", min(help_level + 1, 4))
        if msg and len(msg) > 10 and not is_lost:
            return ("guided_explanation", help_level)
        return ("diagnostic", help_level)
    if current_stage == "guided_explanation":
        if is_lost:
            return ("guided_explanation", min(help_level + 1, 4))
        if is_attempt:
            return ("student_attempt", help_level)
        if turn_count >= 2:
            return ("student_attempt", help_level)
        return ("guided_explanation", help_level)
    if current_stage == "student_attempt":
        if is_attempt or len(msg) > 15:
            return ("correction", help_level)
        if is_lost:
            return ("guided_explanation", min(help_level + 1, 4))
        return ("student_attempt", help_level)
    if current_stage == "correction":
        if is_done:
            return ("mastery_check", 0)
        if is_lost or is_attempt:
            return ("retry", help_level)
        return ("mastery_check", help_level)
    if current_stage == "retry":
        if is_attempt or len(msg) > 15:
            return ("correction", help_level)
        return ("guided_explanation", min(help_level + 1, 4))
    if current_stage == "mastery_check":
        if is_done or (is_attempt and not is_lost):
            return ("completed", 0)
        return ("guided_explanation", help_level)
    if current_stage == "completed":
        return ("diagnostic", 0)
    return ("diagnostic", help_level)


def get_scaffold_directive(help_level, language="fr"):
    directives = {
        1: {
            "fr":     "Donne UN SEUL petit indice — une question qui oriente sans révéler. Pas plus.",
            "ar":     "أعطِ تلميحاً واحداً فقط — سؤالاً يوجّه دون أن يكشف الإجابة. لا تعطِ أكثر من ذلك.",
            "darija": "عطيه غير إشارة صغيرة واحدة — سؤال يوجهو بلا ما تعطيه الجواب. خاص تبقى هاكدا.",
        },
        2: {
            "fr":     "Pose une question guidée qui mène l'élève à découvrir lui-même l'étape suivante. Pas de solution.",
            "ar":     "اطرح سؤالاً موجَّهاً يقود الطالب ليكتشف الخطوة التالية بنفسه. لا حل مباشر.",
            "darija": "سول سؤال يوجهو باش يلقى الخطوة الجاية بوحدو. بلا ما تعطيه الحل مباشرة.",
        },
        3: {
            "fr":     "Donne une aide partielle : explique UNE étape complète seulement, pas tout. Demande à l'élève de compléter.",
            "ar":     "أعطِ مساعدة جزئية : اشرح خطوة واحدة فقط، ثم اطلب من الطالب الإكمال.",
            "darija": "عطيه مساعدة نص نص : شرح خطوة واحدة غير، وسوله يكمل هو الباقي.",
        },
        4: {
            "fr":     "L'élève a vraiment besoin d'aide. Donne la solution complète MAIS explique chaque étape clairement avec le POURQUOI.",
            "ar":     "الطالب يحتاج مساعدة حقيقية. أعطِ الحل الكامل لكن اشرح كل خطوة مع سبب وجودها.",
            "darija": "الطالب محتاج مساعدة حقيقية. عطيه الحل الكامل، لكن شرح كل خطوة وقول ليه كاين.",
        },
    }
    level_dir = directives.get(help_level, directives[1])
    return level_dir.get(language, level_dir["fr"])


def get_stage_directive(stage, help_level, language, turn_in_stage=0):
    scaffold = get_scaffold_directive(help_level, language)
    directives = {
        "diagnostic": f"""
════ STAGE : DIAGNOSTIC ════
Ton rôle : identifier EXACTEMENT où l'élève est bloqué.
Tu NE dois PAS expliquer encore. Tu dois d'abord comprendre.
Instructions :
1. Nomme brièvement le sujet détecté (1 phrase max).
2. Pose UNE question diagnostique précise pour identifier le vrai blocage.
3. NE commence PAS l'explication — attends la réponse de l'élève.
4. Ton chaleureux, décontracté, humain. Jamais formel.
Si l'élève semble perdu (help_level={help_level}) :
{scaffold}
""",
        "guided_explanation": f"""
════ STAGE : EXPLICATION GUIDÉE ════
1. Donne UNIQUEMENT la prochaine micro-étape utile. PAS la solution complète.
2. Maximum 2-3 phrases par message.
3. Utilise des analogies simples et concrètes.
4. Termine TOUJOURS par : "Dis-moi ce que tu comprends jusqu'ici".
Niveau d'aide actuel (help_level={help_level}) :
{scaffold}
""",
        "student_attempt": f"""
════ STAGE : À TOI D'ESSAYER ════
1. Message très court et motivant (2-3 lignes max).
2. Rappelle UNE chose clé en 1 ligne.
3. Invite-le à écrire sa tentative : "Vas-y, dis-moi ce que tu trouves 👍"
4. N'explique PAS davantage. Attends sa réponse.
""",
        "correction": f"""
════ STAGE : CORRECTION BIENVEILLANTE ════
1. COMMENCE TOUJOURS par ce qui est CORRECT.
2. Identifie l'erreur PRÉCISE.
3. Explique POURQUOI cette erreur se produit.
4. JAMAIS "c'est faux" / "non" / "mauvais". Toujours bienveillant.
""",
        "retry": f"""
════ STAGE : RÉESSAI ════
1. Message très court et encourageant.
2. Rappelle l'erreur corrigée en 1 ligne seulement.
3. Invite à retenter.
Niveau d'aide : {scaffold}
""",
        "mastery_check": f"""
════ STAGE : VÉRIFICATION FINALE ════
1. Pose UNE question de vérification différente de l'exercice original.
2. Si l'élève répond correctement → COMPLETED.
3. Ton : fier et encourageant.
""",
        "completed": f"""
════ STAGE : MAÎTRISE ATTEINTE ════
1. Message court et chaleureux de félicitations.
2. Fais une synthèse ultra-rapide.
3. Propose la prochaine étape naturellement via IQRA.
""",
    }
    return directives.get(stage, directives["diagnostic"])


# ══════════════════════════════════════════
# FONCTION — ask_rag()
# ══════════════════════════════════════════

def ask_rag(question, niveau=None, matiere=None, type_doc=None, n_results=5, language="fr"):
    question_vector = embedder.encode(question).tolist()
    conditions = []
    if niveau:
        conditions.append({"niveau":  {"$eq": niveau}})
    if matiere:
        conditions.append({"matiere": {"$eq": matiere}})
    if type_doc:
        conditions.append({"type_doc": {"$eq": type_doc}})

    where_filter = None if not conditions else conditions[0] if len(conditions) == 1 else {"$and": conditions}

    query_params = {
        "query_embeddings": [question_vector],
        "n_results": n_results,
        "include": ["documents", "metadatas", "distances"]
    }
    if where_filter:
        query_params["where"] = where_filter

    results = collection.query(**query_params)
    chunks  = results["documents"][0]

    if not chunks:
        no_result = {
            "fr":     "Je n'ai pas trouvé d'informations sur ce sujet dans les cours disponibles.",
            "ar":     "لم أجد معلومات حول هذا الموضوع في الدروس المتاحة.",
            "darija": "ما لقيتش معلومات على هاد الموضوع فالدروس اللي عندنا.",
        }
        return no_result.get(language, no_result["fr"])

    context = "\n\n---\n\n".join(chunks)
    lang_instruction = get_language_instruction_v1(language)

    prompt = f"""
Tu es un assistant pédagogique pour la plateforme IQRA,
spécialisé dans le programme scolaire marocain.

══════════════════════════════════════════
{lang_instruction}
══════════════════════════════════════════

Contexte extrait des cours :
{context}

Question de l'élève :
{question}

Réponse :
"""
    response = model.generate_content(prompt)
    return response.text


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS RAG — collections spécialisées
#
# Règle de routage :
#   collection              → iqra_knowledge     (cours + exos BAC)    → F1 quiz, F2, chatbot
#   collection_study_habits → study_habits_knowledge (procrastination,
#                             stress, méthodes d'étude)                → F1 study plan UNIQUEMENT
#   collection_career       → career_knowledge   (psyco + écoles)      → F3 career advisor UNIQUEMENT
# ══════════════════════════════════════════════════════════════════════════════


def _get_study_habits_context(query: str, n_results: int = 4, topic: str = None) -> str:
    """
    Interroge UNIQUEMENT collection_study_habits.
    Source : data_files/procrastination , stress and study habits/
    Utilisée par : generate_motivation_questions, analyze_psycho_profile,
                   generate_study_plan (F1 Study Plan).

    topic (optionnel) — filtre metadata["topic"] :
      "procrastination" | "stress" | "time_management" | "study_habits" | "memory" | "general"
    """
    if collection_study_habits is None:
        return ""   # ingest.py pas encore lancé — dégradation gracieuse

    question_vector = embedder.encode(query).tolist()

    # Avec filtre topic si fourni
    if topic:
        try:
            results = collection_study_habits.query(
                query_embeddings=[question_vector],
                n_results=n_results,
                where={"topic": {"$eq": topic}},
                include=["documents"],
            )
            chunks = results["documents"][0]
            if chunks:
                return "\n\n".join(chunks)
        except Exception:
            pass   # filtre raté → fallback sans filtre

    # Sans filtre — tous les documents study_habits
    try:
        results = collection_study_habits.query(
            query_embeddings=[question_vector],
            n_results=n_results,
            include=["documents"],
        )
        return "\n\n".join(results["documents"][0])
    except Exception:
        return ""


def _get_career_context(query: str, n_results: int = 4, category: str = None) -> str:
    """
    Interroge UNIQUEMENT collection_career.
    Source : data_files/career/psyco/ + data_files/career/ecole/
    Utilisée EXCLUSIVEMENT par F3 Career Advisor.

    category (optionnel) — filtre metadata["category"] :
      "psyco" | "ecole"
    """
    if collection_career is None:
        return ""

    question_vector = embedder.encode(query).tolist()

    if category:
        try:
            results = collection_career.query(
                query_embeddings=[question_vector],
                n_results=n_results,
                where={"category": {"$eq": category}},
                include=["documents"],
            )
            chunks = results["documents"][0]
            if chunks:
                return "\n\n".join(chunks)
        except Exception:
            pass

    try:
        results = collection_career.query(
            query_embeddings=[question_vector],
            n_results=n_results,
            include=["documents"],
        )
        return "\n\n".join(results["documents"][0])
    except Exception:
        return ""


# ══════════════════════════════════════════════════════════════════════════════
# FONCTION 1 — generate_motivation_questions()
# Phase 1 : Questions motivationnelles AVANT le quiz
# ══════════════════════════════════════════════════════════════════════════════

def generate_motivation_questions(
    niveau: str,
    matiere: str,
    chapitres: list,
    facteurs_psycho: list = None,
    langue_parlée: str = "",
    language: str = "fr",
) -> str:
    """
    Génère 3 questions motivationnelles personnalisées avant le quiz.

    Objectifs :
    - Comprendre pourquoi l'élève veut réussir (ancrage émotionnel)
    - Identifier ce qui le bloque réellement
    - Augmenter son engagement envers le plan avant même de le voir
    - Détecter des patterns psychologiques (confiance, peur, procrastination…)

    Retourne un JSON :
    [
      { "id": "M1", "question": "...", "type": "motivation|obstacle|engagement|confiance" },
      ...
    ]
    """
    if facteurs_psycho is None:
        facteurs_psycho = []

    lang_instruction = get_language_instruction_v1(language)

    psycho_ctx = _get_study_habits_context(
        f"motivation étudiant blocage procrastination confiance {matiere} {' '.join(chapitres)}",
        n_results=3,
    )

    facteurs_str = ", ".join(facteurs_psycho) if facteurs_psycho else "aucun obstacle déclaré"
    langue_hint  = f"L'élève a choisi la langue : {language}." if language else ""

    prompt = f"""
Tu es un psychologue scolaire bienveillant et un coach pédagogique qui travaille pour IQRA.

{lang_instruction}

════════════════════════════════════════════════
CONTEXTE DE L'ÉLÈVE
════════════════════════════════════════════════
Filière : {niveau}
Matière : {matiere}
Chapitres concernés : {', '.join(chapitres)}
Obstacles déclarés : {facteurs_str}
{langue_hint}

════════════════════════════════════════════════
FRAMEWORKS PSYCHOLOGIQUES (base RAG IQRA)
════════════════════════════════════════════════
{psycho_ctx if psycho_ctx else "→ Utilise tes connaissances en psychologie de l'apprentissage."}

════════════════════════════════════════════════
MISSION
════════════════════════════════════════════════
Génère exactement 3 questions motivationnelles pour cet élève AVANT qu'il passe le quiz.

Objectif de chaque question :
• M1 (motivation) — Pourquoi est-ce important pour lui de maîtriser ce chapitre ?
  → Ancre émotionnelle : rêve, objectif, famille, fierté personnelle.
  → Doit être spécifique à {matiere} et {niveau}, pas générique.

• M2 (obstacle) — Qu'est-ce qui lui a rendu ce chapitre difficile jusqu'ici ?
  → Détecte si le blocage est conceptuel, émotionnel, organisationnel ou contextuel.
  → Si {facteurs_str} contient un facteur, la question doit l'effleurer sans le nommer directement.

• M3 (engagement) — S'il maîtrisait parfaitement ces chapitres dans 3 semaines, qu'est-ce qui changerait pour lui ?
  → Crée une vision positive concrète.
  → Connecte au plan qu'il va recevoir.

CONTRAINTES ABSOLUES :
✗ Jamais de questions abstraites ("Quel est ton talent ?", "Quelles sont tes forces ?")
✗ Jamais de QCM — uniquement questions ouvertes avec réponse texte libre
✗ Ton chaleureux, humain, non-jugeant
✓ Chaque question doit partir d'une situation CONCRÈTE et VÉCUE
✓ Les questions doivent varier selon le profil ({niveau} ≠ même questions pour tout le monde)
✓ Maximum 1-2 phrases par question

FORMAT JSON OBLIGATOIRE — sans texte avant ou après, sans markdown :
[
  {{"id": "M1", "question": "...", "type": "motivation"}},
  {{"id": "M2", "question": "...", "type": "obstacle"}},
  {{"id": "M3", "question": "...", "type": "engagement"}}
]
"""
    response = model.generate_content(prompt)
    return response.text


# ══════════════════════════════════════════════════════════════════════════════
# FONCTION 2 — generate_progressive_quiz()
# Phase 3 : Quiz progressif 3 niveaux
# ══════════════════════════════════════════════════════════════════════════════

# Seuils de déverrouillage du niveau suivant
QUIZ_UNLOCK_THRESHOLDS = {
    "basic_to_medium": 4,   # score Basic ≥ 4/7 pour débloquer Medium
    "medium_to_high":  3,   # score Medium ≥ 3/4 pour débloquer High
}

# Nombre de questions par niveau
QUIZ_CONFIG = {
    "basic":  {"n": 7, "label": "Fondamentaux"},
    "medium": {"n": 4, "label": "Application"},
    "high":   {"n": 4, "label": "Maîtrise BAC"},
}


def generate_progressive_quiz(
    niveau: str,
    matiere: str,
    chapitres: list,
    quiz_level: str = "basic",
    language: str = "fr",
) -> str:
    """
    Génère un quiz progressif à 3 niveaux.

    quiz_level : "basic" | "medium" | "high"
    """
    if quiz_level not in QUIZ_CONFIG:
        quiz_level = "basic"

    cfg = QUIZ_CONFIG[quiz_level]
    n_questions = cfg["n"]

    # RAG — exercices pour ce niveau/matière
    query = f"{matiere} {' '.join(chapitres)} exercice application"
    question_vector = embedder.encode(query).tolist()

    # FIX BUG 2 : get_type_exo retourne None pour les filières sans type_doc
    # build_where_filter gère maintenant correctement type_doc=None
    type_exo     = get_type_exo(niveau)
    where_filter = build_where_filter(niveau, matiere, type_doc=type_exo)

    results = collection.query(
        query_embeddings=[question_vector],
        n_results=6,
        where=where_filter,
        include=["documents"],
    )
    chunks  = results["documents"][0]
    context = "\n\n".join(chunks) if chunks else ""

    lang_instruction = get_language_instruction_v1(language)

    level_directives = {
        "basic": f"""
NIVEAU BASIC — {n_questions} QUESTIONS
Objectif : vérifier que l'élève comprend les CONCEPTS DE BASE, pas les calculs.

Règles STRICTES pour ce niveau :
✓ Questions sur la définition, la propriété, l'identification du type de problème
✓ Aucun calcul complexe — au plus des calculs à 1 étape simple
✓ Options de réponse claires, sans piège sophistiqué
✓ Le mauvais choix doit être une erreur de COMPRÉHENSION courante, pas une erreur de calcul
✓ Chaque question cible UN concept clé différent parmi : {', '.join(chapitres)}

Exemples : "Quelle est la définition de X ?", "Parmi ces cas, lequel est un exemple de Y ?",
"Quelle propriété utilise-t-on pour Z ?", "Quel est le premier réflexe face à ce type d'énoncé ?"
""",
        "medium": f"""
NIVEAU MEDIUM — {n_questions} QUESTIONS
Objectif : tester l'APPLICATION des concepts dans des cas directs.

Règles STRICTES pour ce niveau :
✓ Questions d'application directe — l'élève doit utiliser une formule ou méthode
✓ Calculs à 2-3 étapes maximum
✓ Un résultat numérique ou une expression peut être attendu
✓ Les erreurs classiques dans les options doivent correspondre aux fautes typiques de {niveau}
✓ Contexte réaliste tiré du programme marocain

Exemples : résoudre une équation simple, appliquer un théorème, calculer une valeur.
""",
        "high": f"""
NIVEAU HIGH — {n_questions} QUESTIONS (style BAC)
Objectif : simuler le raisonnement attendu à l'examen national.

Règles STRICTES pour ce niveau :
✓ Questions composites : enchaîner 2-3 méthodes différentes
✓ Raisonnement logique nécessaire, pas seulement application mécanique
✓ Pièges subtils dans les options (erreurs de raisonnement, pas seulement de calcul)
✓ Formulations proches du style BAC marocain
✓ Niveau de difficulté : 60-75% des élèves de {niveau} devraient trouver ça difficile

Exemples : démonstration partielle, interprétation d'un résultat, question à plusieurs parties liées.
""",
    }

    unlock_thresholds = {
        "basic":  QUIZ_UNLOCK_THRESHOLDS["basic_to_medium"],
        "medium": QUIZ_UNLOCK_THRESHOLDS["medium_to_high"],
        "high":   0,
    }

    prompt = f"""
Tu es un examinateur expert du programme scolaire marocain pour {niveau} en {matiere}.

{lang_instruction}

{level_directives[quiz_level]}

════════════════════════════════════════════════
CONTENU DES COURS / EXERCICES IQRA (base RAG)
════════════════════════════════════════════════
{context if context else "→ Génère des questions représentatives du programme officiel marocain."}

════════════════════════════════════════════════
CHAPITRES CIBLÉS
════════════════════════════════════════════════
{', '.join(chapitres)}

IMPORTANT — CHAMP "explication" :
Pour chaque question, inclure une explication courte (1-2 phrases) qui explique POURQUOI
la bonne réponse est correcte — utilisée après que l'élève répond pour l'aider à comprendre.

FORMAT JSON OBLIGATOIRE — sans texte avant ou après, sans markdown :
{{
  "level": "{quiz_level}",
  "level_label": "{cfg['label']}",
  "n_questions": {n_questions},
  "unlock_threshold": {unlock_thresholds[quiz_level]},
  "questions": [
    {{
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "A",
      "explication": "...",
      "concept": "nom du concept testé"
    }}
  ]
}}
"""
    response = model.generate_content(prompt)
    return response.text


# ══════════════════════════════════════════════════════════════════════════════
# FONCTION 3 — analyze_psycho_profile()
# Phase 2 : Profiling psychologique via RAG + réponses motivationnelles
# ══════════════════════════════════════════════════════════════════════════════

def analyze_psycho_profile(
    reponses_motivation: list,
    facteurs_declares: list = None,
    niveau: str = "",
    matiere: str = "",
    language: str = "fr",
) -> str:
    """
    Analyse les réponses aux questions motivationnelles + facteurs déclarés
    pour produire un profil psychologique structuré.

    Retourne JSON :
    {
      "profil_dominant": "anxieux|procrastinateur|peu_confiant|motivé|perfectionniste|découragé|neutre",
      "facteurs_detectes": [...],
      "intensite": { "stress": 0-100, "confiance": 0-100, "motivation": 0-100, "discipline": 0-100 },
      "signaux_positifs": [...],
      "signaux_attention": [...],
      "recommandations_plan": [...],
      "message_personnalise": "..."
    }
    """
    if facteurs_declares is None:
        facteurs_declares = []

    lang_instruction = get_language_instruction_v1(language)

    query      = "profil psychologique élève stress confiance procrastination motivation apprentissage"
    psycho_ctx = _get_study_habits_context(query, n_results=5)

    reponses_str = "\n".join(
        f'[{r.get("id", "?")}] Question : {r.get("question", "")}\n    Réponse : {r.get("reponse", "(pas de réponse)")}'
        for r in reponses_motivation
    )

    facteurs_str = ", ".join(facteurs_declares) if facteurs_declares else "aucun"

    prompt = f"""
Tu es un psychologue scolaire expert et un analyste de comportements d'apprentissage.
Tu travailles pour IQRA et tu dois analyser le profil psychologique d'un élève.

{lang_instruction}

════════════════════════════════════════════════
CONTEXTE DE L'ÉLÈVE
════════════════════════════════════════════════
Filière : {niveau}
Matière : {matiere}
Obstacles déclarés explicitement : {facteurs_str}

════════════════════════════════════════════════
RÉPONSES AUX QUESTIONS MOTIVATIONNELLES
════════════════════════════════════════════════
{reponses_str if reponses_str else "→ Aucune réponse fournie — utilise les facteurs déclarés."}

════════════════════════════════════════════════
FRAMEWORKS PSYCHOLOGIQUES (base RAG IQRA)
════════════════════════════════════════════════
{psycho_ctx if psycho_ctx else "→ Utilise tes connaissances en psychologie de l'apprentissage scolaire."}

════════════════════════════════════════════════
MISSION D'ANALYSE
════════════════════════════════════════════════
Analyse en profondeur les patterns dans les réponses et détermine :

1. Le profil dominant (choisis le plus représentatif) :
   • "anxieux"         — peur de l'échec, stress fort, paralysie face aux difficultés
   • "procrastinateur" — évitement, difficulté à démarrer, consciencieux mais inactif
   • "peu_confiant"    — compétences réelles mais image de soi défavorable
   • "motivé"          — élan fort, engagement, confiance globalement saine
   • "perfectionniste" — exigence excessive, blocage sur les détails, peur de l'erreur
   • "découragé"       — tentatives passées sans résultat, fatigue, désinvestissement
   • "neutre"          — profil équilibré, pas de signal fort

2. Intensité sur 4 dimensions (0-100) :
   • stress      : niveau de tension/anxiété détecté
   • confiance   : estime de soi scolaire
   • motivation  : élan intrinsèque
   • discipline  : capacité à s'organiser et persévérer

3. Recommandations concrètes pour adapter le plan d'étude.

CONTRAINTES :
✗ Ne pas projeter si l'information n'est pas dans les réponses
✓ Le message_personnalise doit être chaleureux, honnête, et adressé directement à l'élève

FORMAT JSON OBLIGATOIRE — sans texte avant ou après, sans markdown :
{{
  "profil_dominant": "...",
  "facteurs_detectes": ["..."],
  "intensite": {{
    "stress": 0,
    "confiance": 0,
    "motivation": 0,
    "discipline": 0
  }},
  "signaux_positifs": ["...", "..."],
  "signaux_attention": ["...", "..."],
  "recommandations_plan": ["...", "...", "..."],
  "message_personnalise": "..."
}}
"""
    response = model.generate_content(prompt)
    return response.text


# ══════════════════════════════════════════════════════════════════════════════
# FONCTION 4 — generate_quiz() — VERSION LEGACY (5 questions)
# Conservée pour compatibilité avec l'endpoint /api/quiz/ existant
# ══════════════════════════════════════════════════════════════════════════════

def generate_quiz(niveau, matiere, chapitre, n_questions=5, language="fr"):
    """
    Version originale — 5 questions QCM homogènes.
    Conservée pour compatibilité. Pour les nouvelles intégrations, utiliser
    generate_progressive_quiz() à la place.
    """
    question_vector = embedder.encode(chapitre).tolist()
    type_exo     = get_type_exo(niveau)
    where_filter = build_where_filter(niveau, matiere, type_doc=type_exo)

    results = collection.query(
        query_embeddings=[question_vector],
        n_results=5,
        where=where_filter,
        include=["documents"],
    )
    chunks  = results["documents"][0]
    context = "\n\n".join(chunks) if chunks else ""
    lang_instruction = get_language_instruction_v1(language)

    prompt = f"""
Tu es un professeur du système scolaire marocain (programme officiel).
{lang_instruction}
Génère exactement {n_questions} questions QCM sur le chapitre "{chapitre}"
pour un élève de {niveau} en {matiere}.
Les questions, les options de réponse et toutes les explications
doivent être entièrement rédigées dans la langue imposée ci-dessus.
Contexte des exercices du cours :
{context}
Format de réponse OBLIGATOIRE en JSON :
[
  {{
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A"
  }}
]
Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après, sans markdown.
"""
    response = model.generate_content(prompt)
    return response.text


# ══════════════════════════════════════════════════════════════════════════════
# FONCTION 5 — generate_study_plan() — VERSION AMÉLIORÉE v2
# Phase 4 & 5 : Plan adaptatif + structure progression 3 niveaux
# ══════════════════════════════════════════════════════════════════════════════

def generate_study_plan(
    niveau,
    matiere,
    chapitres,
    temps_disponible,
    score_quiz,
    profil_plan="normal",
    niveau_auto="niveau1",
    facteurs_psycho=None,
    language="fr",
    # ── NOUVEAUX PARAMÈTRES v2 ──
    psycho_profile=None,        # dict retourné par analyze_psycho_profile()
    scores_progressifs=None,    # dict { "basic": {"score": N, "total": N}, ... }
    reponses_motivation=None,   # liste des réponses motivationnelles
):
    """
    Génère un plan de rattrapage personnalisé — version améliorée v2.
    """
    if facteurs_psycho is None:
        facteurs_psycho = []
    if scores_progressifs is None:
        scores_progressifs = {}
    if reponses_motivation is None:
        reponses_motivation = []

    lang_instruction = get_language_instruction_v1(language)

    # ── RAG 1 : contenu académique ──
    query           = f"{matiere} {' '.join(chapitres)} révision méthode"
    question_vector = embedder.encode(query).tolist()
    where_filter    = build_where_filter(niveau, matiere, type_doc=None)

    results = collection.query(
        query_embeddings=[question_vector],
        n_results=6,
        where=where_filter,
        include=["documents", "metadatas"],
    )
    chunks_acad  = results["documents"][0]
    context_acad = "\n\n".join(chunks_acad) if chunks_acad else ""

    # ── FIX BUG 4 : profil_dominant initialisé AVANT les blocs conditionnels ──
    # Valeur par défaut "neutre" garantie dans tous les cas (psycho_profile ou non).
    profil_dominant   = "neutre"
    intensite         = {}
    recomm_psycho     = []
    signaux_positifs  = []
    msg_perso         = ""
    facteurs_detectes = list(facteurs_psycho)   # copie défensive

    if psycho_profile:
        profil_dominant   = psycho_profile.get("profil_dominant", "neutre")
        intensite         = psycho_profile.get("intensite", {})
        recomm_psycho     = psycho_profile.get("recommandations_plan", [])
        signaux_positifs  = psycho_profile.get("signaux_positifs", [])
        msg_perso         = psycho_profile.get("message_personnalise", "")
        facteurs_detectes = psycho_profile.get("facteurs_detectes", facteurs_psycho)

    # ── RAG 2 : study habits ciblés selon le profil dominant ──
    _topic_map = {
        "anxieux":          "stress",
        "procrastinateur":  "procrastination",
        "peu_confiant":     "study_habits",
        "motivé":           "study_habits",
        "perfectionniste":  "stress",
        "découragé":        "study_habits",
        "neutre":           None,
    }
    _target_topic  = _topic_map.get(profil_dominant)
    psycho_query   = f"conseils {profil_dominant} procrastination gestion stress organisation étude"
    context_psycho = _get_study_habits_context(psycho_query, n_results=4, topic=_target_topic)

    # ══════════════════════════════════════════════════════
    # CALCUL DU NIVEAU RÉEL (pondéré quiz progressif)
    # ══════════════════════════════════════════════════════
    score_basic  = scores_progressifs.get("basic",  {}).get("score", score_quiz)
    n_basic      = scores_progressifs.get("basic",  {}).get("total", 5)
    score_medium = scores_progressifs.get("medium", {}).get("score", 0)
    n_medium     = scores_progressifs.get("medium", {}).get("total", 4)
    score_high   = scores_progressifs.get("high",   {}).get("score", 0)
    n_high       = scores_progressifs.get("high",   {}).get("total", 4)

    pct_basic  = score_basic  / n_basic  if n_basic  > 0 else 0
    pct_medium = score_medium / n_medium if n_medium > 0 else 0
    pct_high   = score_high   / n_high   if n_high   > 0 else 0

    if pct_basic < 0.50:
        niveau_reel  = "débutant"
        phase_depart = "PHASE 1 — Fondations uniquement"
    elif pct_basic < 0.75 or pct_medium < 0.50:
        niveau_reel  = "intermédiaire"
        phase_depart = "PHASE 1 → PHASE 2"
    elif pct_medium >= 0.75 and pct_high < 0.50:
        niveau_reel  = "avancé"
        phase_depart = "PHASE 2 → PHASE 3"
    else:
        niveau_reel  = "expert"
        phase_depart = "PHASE 3 uniquement"

    diagnostic_reel = f"""
Score Basic  : {score_basic}/{n_basic} ({round(pct_basic*100)}%)
Score Medium : {score_medium}/{n_medium} ({round(pct_medium*100)}%) {"[non passé]" if n_medium == 4 and score_medium == 0 and score_basic < QUIZ_UNLOCK_THRESHOLDS["basic_to_medium"] else ""}
Score High   : {score_high}/{n_high} ({round(pct_high*100)}%) {"[non débloqué]" if score_medium < QUIZ_UNLOCK_THRESHOLDS["medium_to_high"] else ""}
→ Niveau réel estimé : {niveau_reel}
→ Phase de départ recommandée : {phase_depart}
""".strip()

    # ══════════════════════════════════════════════════════
    # FIX BUG 3 : mapping profil_plan unifié
    # Le contexte projet envoie "perfectionnement" mais le dict avait "expert".
    # On accepte maintenant les deux alias.
    # ══════════════════════════════════════════════════════
    profils = {
        "urgence": {
            "label":         "🚨 Urgence absolue",
            "contexte_plan": "Situation d'urgence extrême. Aller droit au but : notions clés uniquement, exercices types les plus probables, zéro superflu.",
            "max_sessions":  1,
            "max_act":       3,
        },
        "rapide": {
            "label":         "⚡ Rattrapage rapide",
            "contexte_plan": "Peu de temps. Plan dense mais efficace. Pas de perfectionnisme.",
            "max_sessions":  min(len(chapitres), 3),
            "max_act":       4,
        },
        "normal": {
            "label":         "📚 Rattrapage structuré",
            "contexte_plan": "Temps raisonnable. Équilibre compréhension et pratique. Progression par phases.",
            "max_sessions":  max(len(chapitres), 3),
            "max_act":       5,
        },
        # "expert" et "perfectionnement" sont deux alias pour le même profil
        "expert": {
            "label":         "🎯 Perfectionnement",
            "contexte_plan": "Temps suffisant pour viser l'excellence. Progression complète 3 phases.",
            "max_sessions":  max(len(chapitres) * 2, 4),
            "max_act":       6,
        },
        "perfectionnement": {
            "label":         "🎯 Perfectionnement",
            "contexte_plan": "Temps suffisant pour viser l'excellence. Progression complète 3 phases.",
            "max_sessions":  max(len(chapitres) * 2, 4),
            "max_act":       6,
        },
    }
    profil = profils.get(profil_plan, profils["normal"])

    stress     = intensite.get("stress",     50)
    confiance  = intensite.get("confiance",  50)
    motivation = intensite.get("motivation", 50)
    discipline = intensite.get("discipline", 50)

    # ── Directives adaptatives basées sur le profil réel ──
    directives_adaptatives = []

    if stress > 70 or "panique" in facteurs_detectes:
        directives_adaptatives.append(
            "⚠️ STRESS ÉLEVÉ DÉTECTÉ → Sessions MAX 30 min. Commencer par la tâche la PLUS FACILE du chapitre. "
            "Inclure 1 message de réassurance au début de chaque session. "
            "Jamais plus d'une notion difficile par session."
        )
    if discipline < 40 or "procrastination" in facteurs_detectes:
        directives_adaptatives.append(
            "⚠️ PROCRASTINATION DÉTECTÉE → ANTI-PLAN IRRÉALISTE : zéro session > 45 min. "
            "Première activité de chaque session = max 10 min pour créer l'élan. "
            "Chaque activité doit avoir un résultat visible. "
            "Technique Pomodoro intégrée dans le conseil de chaque activité."
        )
    if confiance < 40 or profil_dominant == "peu_confiant":
        directives_adaptatives.append(
            "⚠️ MANQUE DE CONFIANCE DÉTECTÉ → Progresser OBLIGATOIREMENT du plus simple au plus complexe. "
            "Mettre en avant les réussites précédentes. "
            "Formuler les objectifs en 'tu vas y arriver parce que...' pas 'il faut que tu...'."
        )
    if motivation < 40 or "motivation" in facteurs_detectes:
        directives_adaptatives.append(
            "⚠️ MOTIVATION FAIBLE → Chaque activité doit avoir 1 phrase 'motivation' percutante et SPÉCIFIQUE. "
            "Connecter chaque session à l'objectif final de l'élève si connu. "
            "Sessions courtes avec résultats rapides pour créer des victoires immédiates."
        )
    if "reseaux" in facteurs_detectes:
        directives_adaptatives.append(
            "⚠️ DISTRACTION NUMÉRIQUE → Dans le conseil de chaque activité, suggérer de poser "
            "le téléphone face retournée ou en mode avion pendant la session."
        )

    if not directives_adaptatives:
        directives_adaptatives.append(
            "→ Profil équilibré. Ton professionnel et encourageant. Plan standard progressif."
        )

    recomm_rag_str = "\n".join(f"• {r}" for r in recomm_psycho) if recomm_psycho else "→ Appliquer les bonnes pratiques générales."
    positifs_str   = "\n".join(f"✓ {s}" for s in signaux_positifs) if signaux_positifs else ""

    # ── Profil pédagogique (niveau_auto) ──
    niveaux_auto = {
        "niveau0": {"label": "Débutant total",                   "ratio": {"video": 3, "exercice": 1, "chatbot": 1}, "ton": "Beaucoup de douceur. Commencer par une vidéo simple AVANT tout exercice."},
        "niveau1": {"label": "Intermédiaire",                    "ratio": {"video": 2, "exercice": 2, "chatbot": 1}, "ton": "Confiance encouragée. Alterner vidéo et exercice."},
        "niveau2": {"label": "Comprend mais bloque aux exercices","ratio": {"video": 1, "exercice": 3, "chatbot": 1}, "ton": "Exercices guidés pas à pas. La théorie est acquise — travailler la pratique."},
        "niveau3": {"label": "Bonne compréhension",              "ratio": {"video": 1, "exercice": 4, "chatbot": 1}, "ton": "Traiter l'élève comme capable. Exercices variés et difficiles."},
    }
    auto  = niveaux_auto.get(niveau_auto, niveaux_auto["niveau1"])
    ratio = auto["ratio"]

    # ── Structure 3 phases ──
    phases_description = f"""
STRUCTURE OBLIGATOIRE EN 3 PHASES DE PROGRESSION :

PHASE 1 — Fondations ({chapitres[0] if chapitres else 'chapitre 1'} et notions de base)
→ Objectif : s'assurer que les concepts fondamentaux sont solides
→ Activités : majorité vidéo + exercices simples de reconnaissance
→ Critère de passage : être capable d'expliquer le concept sans regarder le cours
→ Cette phase NE PEUT PAS être skippée si niveau_reel = "débutant"

PHASE 2 — Application (exercices types)
→ Objectif : maîtriser les méthodes de résolution standard
→ Activités : exercices progressifs + chatbot pour les blocages
→ Critère de passage : résoudre 3 exercices types sans aide
→ Débloquée automatiquement si pct_basic ≥ 0.60

PHASE 3 — Maîtrise BAC (exercices difficiles + consolidation)
→ Objectif : préparer l'examen réel
→ Activités : exercices style BAC + révision ciblée des points faibles
→ Critère de passage : confiance sur l'ensemble du chapitre
→ Débloquée si pct_medium ≥ 0.60

Phase de départ recommandée pour cet élève : {phase_depart}
"""

    anti_irrealiste = f"""
CONTRAINTES ANTI-PLANS IRRÉALISTES — OBLIGATOIRES :
• JAMAIS de session > {60 if stress > 60 else 90} min pour cet élève
• JAMAIS plus de {2 if discipline < 50 else 3} chapitres dans une même session
• Les durées d'activités doivent être RÉALISTES :
  - video    : 15-25 min
  - exercice : 20-{35 if stress > 60 else 45} min
  - chatbot  : 10-15 min
• Le "moment" ne doit PAS être "5h du matin" ou des horaires irréalistes
• Décrire le moment comme : "début de soirée", "après-midi", "matin si dispo", etc.
• Si temps_disponible < 2h/semaine, concentrer sur {chapitres[0] if chapitres else "le chapitre le plus urgent"} uniquement
• La somme totale des durées par session ≤ {temps_disponible * 60 // max(profil["max_sessions"], 1)} min
"""

    nb_sessions = profil["max_sessions"]
    max_act     = profil["max_act"]

    exemple_activite = """{
      "type": "video | exercice | chatbot",
      "titre": "Titre précis et concret",
      "duree": "X min",
      "moment": "Ex : début de soirée, après-midi calme",
      "pourquoi": "Explication pédagogique humaine",
      "astuce": "Conseil pratique concret issu du profil de l'élève",
      "motivation": "Message court et personnalisé",
      "phase": "1 | 2 | 3"
    }"""

    prompt = f"""
Tu es à la fois un professeur expert du programme scolaire marocain, un coach pédagogique
et un psychologue scolaire bienveillant. Tu travailles pour IQRA.
Tu parles DIRECTEMENT à l'élève (utilise "tu", pas "l'élève").

{lang_instruction}

══════════════════════════════════════════════════════
CE QUE TU SAIS SUR CET ÉLÈVE
══════════════════════════════════════════════════════
Filière       : {niveau}
Matière       : {matiere}
Chapitres en retard : {', '.join(chapitres)}
Temps disponible    : {temps_disponible}h par semaine
Profil psychologique dominant : {profil_dominant}
Niveau auto-déclaré : {auto['label']}
Ton pédagogique recommandé : {auto['ton']}

{f"Message personnalisé pour cet élève : {msg_perso}" if msg_perso else ""}
{f"Ce qui est positif chez cet élève :{positifs_str}" if positifs_str else ""}

══════════════════════════════════════════════════════
DIAGNOSTIC QUIZ PROGRESSIF
══════════════════════════════════════════════════════
{diagnostic_reel}

══════════════════════════════════════════════════════
PROFIL DU PLAN
══════════════════════════════════════════════════════
Type : {profil['label']}
Contexte : {profil['contexte_plan']}
Nombre de sessions : EXACTEMENT {nb_sessions}
Activités max par session : {max_act}
Ratio recommandé : {ratio['video']} vidéo(s) / {ratio['exercice']} exercice(s) / {ratio['chatbot']} chatbot(s)

══════════════════════════════════════════════════════
{phases_description}
══════════════════════════════════════════════════════

══════════════════════════════════════════════════════
DIRECTIVES PSYCHO-ADAPTATIVES (basées sur le profil réel)
══════════════════════════════════════════════════════
{chr(10).join(directives_adaptatives)}

Recommandations RAG psycho IQRA :
{recomm_rag_str}

══════════════════════════════════════════════════════
{anti_irrealiste}
══════════════════════════════════════════════════════

══════════════════════════════════════════════════════
CONTENU ACADÉMIQUE (base RAG IQRA)
══════════════════════════════════════════════════════
{context_acad if context_acad else "→ Utilise le programme officiel marocain pour ce niveau."}

══════════════════════════════════════════════════════
RESSOURCES PSYCHO (base RAG IQRA)
══════════════════════════════════════════════════════
{context_psycho if context_psycho else "→ Intègre les bonnes pratiques d'apprentissage autonome."}

══════════════════════════════════════════════════════
RÈGLES IQRA — BRANDING NATUREL
══════════════════════════════════════════════════════
Maximum 2 mentions IQRA dans tout le plan.
Formuler naturellement : "Les vidéos IQRA sur ce chapitre..." ou "Le chatbot IQRA peut t'aider ici..."
JAMAIS de slogan. JAMAIS de publicité forcée.

══════════════════════════════════════════════════════
FORMAT JSON OBLIGATOIRE — EXACTEMENT {nb_sessions} session(s)
══════════════════════════════════════════════════════
{{
  "duree_totale": "X semaine(s)",
  "temps_par_semaine": "{temps_disponible}h",
  "profil": "{profil['label']}",
  "niveau_reel": "{niveau_reel}",
  "phase_depart": "{phase_depart}",
  "message_intro": "Message d'introduction personnalisé (2-3 phrases, adressé directement à l'élève)",
  "sessions": [
    {{
      "semaine": 1,
      "phase": 1,
      "objectif": "Objectif précis, mesurable et motivant",
      "message_session": "Message d'encouragement court et spécifique à cette session",
      "activites": [
        {exemple_activite}
      ]
    }}
  ],
  "conseils_finaux": [
    "Conseil 1 (issu du profil psychologique et du RAG)",
    "Conseil 2",
    "Conseil 3"
  ],
  "message_cloture": "Message final chaleureux, personnel et motivant"
}}

Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après, sans markdown.
"""
    response = model.generate_content(prompt)
    return response.text


# ══════════════════════════════════════════════════════════════════════════════
# F2 — VISUAL LEARNING (Manim)
# ══════════════════════════════════════════════════════════════════════════════

MANIM_STYLE_EXAMPLES = """
EXEMPLES DE CODE MANIM PÉDAGOGIQUE :
# Résolution d'équation
eq1 = MathTex(r"2x + 4 = 10", font_size=52)
self.play(Write(eq1)); self.wait(0.8)
eq2 = MathTex(r"2x = 6", font_size=52)
self.play(TransformMatchingTex(eq1, eq2)); self.wait(1)

# Graphe
axes = Axes(x_range=[-3, 3, 1], y_range=[-1, 9, 1])
courbe = axes.plot(lambda x: x**2, color=YELLOW)
self.play(Create(axes)); self.play(Create(courbe)); self.wait(1)
"""


def _generate_video(manim_code: str, notion: str, etapes: list) -> str | None:
    """
    Génère une vidéo Manim.
    L'import de run_manim_pipeline est LAZY pour éviter un crash si Manim n'est pas installé.
    """
    try:
        from manim_runner import run_manim_pipeline   # Import lazy

        video_dir = r"C:\Users\CHERIF\Projet_iqra\iqra-backend\media\visual_learning"
        os.makedirs(video_dir, exist_ok=True)
        video_name  = f"vl_{uuid.uuid4().hex[:10]}.mp4"
        output_path = os.path.join(video_dir, video_name)

        result = run_manim_pipeline(
            manim_code  = manim_code,
            output_path = output_path,
            model       = model,
            notion      = notion,
            etapes      = etapes,
        )
        return f"/media/visual_learning/{video_name}" if result["success"] else None
    except Exception as e:
        print(f"[_generate_video] Exception: {e}")
        return None


def _manim_fallback_code(matiere: str, niveau: str, numero: int) -> str:
    safe = matiere.replace('"', '').replace("'", '').replace('é', 'e').replace('è', 'e').replace('ê', 'e')[:25]
    return f'''from manim import *

class ExplicationIQRA(Scene):
    def construct(self):
        titre = Text("Etape {numero} - {safe}", font_size=36, color=BLUE)
        self.play(Write(titre))
        self.wait(1)
        msg = Text("Voir explication ci-dessous", font_size=26, color=WHITE)
        msg.next_to(titre, DOWN, buff=0.5)
        self.play(FadeIn(msg))
        self.wait(2)
'''


def generate_visual_explanation(
    question: str,
    niveau: str,
    matiere: str,
    image_b64: str = None,
    language: str = "fr",
) -> dict:
    """
    F2 — تعلم بالذكاء الاصطناعي
    Utilise detect_language() v7 (plus précise pour F2).
    """
    detected_lang    = detect_language(question) if question else language
    lang_instruction = get_language_instruction(detected_lang)

    # ── RAG académique ──
    rag_context = ""
    try:
        query_text = f"{matiere} {question[:200]}" if question else matiere
        query_vec  = embedder.encode(query_text).tolist()
        conditions = []
        if niveau and niveau not in ("", "Autre"):
            conditions.append({"niveau": {"$eq": niveau}})
        if matiere:
            conditions.append({"matiere": {"$eq": matiere}})
        where_filter = (
            None if not conditions
            else conditions[0] if len(conditions) == 1
            else {"$and": conditions}
        )
        query_params = {"query_embeddings": [query_vec], "n_results": 5, "include": ["documents"]}
        if where_filter:
            query_params["where"] = where_filter
        rag_results = collection.query(**query_params)
        rag_context = "\n\n".join(c for c in rag_results["documents"][0] if c.strip())
    except Exception as e:
        print(f"[generate_visual_explanation] RAG error: {e}")

    # ── Analyse image ──
    image_context = ""
    pil_image     = None
    if image_b64:
        try:
            import PIL.Image, io, base64
            img_bytes = base64.b64decode(image_b64)
            pil_image = PIL.Image.open(io.BytesIO(img_bytes))
            vision_prompt = (
                "Decris cet exercice scolaire en JSON :\n"
                '{"sujet":"...","donnees_visibles":"...","notion_principale":"..."}\n'
                "JSON uniquement, sans markdown."
            )
            vr = model.generate_content([vision_prompt, pil_image])
            vd = _parse_gemini_json(vr.text)
            image_context = f"Sujet: {vd.get('sujet','')} | Notion: {vd.get('notion_principale','')}"
        except Exception as e:
            print(f"[generate_visual_explanation] Vision error: {e}")
            image_context = "(image fournie mais non analysee)"

    question_display  = question if question else "(voir image)"
    image_ctx_display = f"\nContexte image : {image_context}" if image_context else ""
    rag_display       = rag_context[:2000] if rag_context else "(aucun cours trouve)"

    prompt = f"""
Tu es un professeur expert en pedagogie visuelle pour la plateforme IQRA (Maroc).
Tu expliques une notion a un eleve de {niveau} en {matiere}.

LANGUE OBLIGATOIRE :
{lang_instruction}

QUESTION DE L'ELEVE :
{question_display}
{image_ctx_display}

CONTEXTE DES COURS IQRA :
{rag_display}

EXEMPLES MANIM :
{MANIM_STYLE_EXAMPLES}

MISSION : Decomposer en etapes claires (min 3, max 7) avec code Manim pour chaque etape.

REGLES MANIM STRICTES :
- Classe EXACTEMENT "ExplicationIQRA" heritant de "Scene"
- Utilise : Text, MathTex, VGroup, Axes, FadeIn, FadeOut, Write, Create,
  TransformMatchingTex, LaggedStart, Arrow, NumberLine,
  Rectangle, Circle, Dot, Line, Square, Triangle
- INTERDIT : caracteres arabes/accentues dans Text() — utilise MathTex ou enleve les accents
- INTERDIT : SVGMobject, ImageMobject, ThreeDScene, CurvedArrow
- Duree 10-25 secondes par etape | Terminer par self.wait(2)

FORMAT JSON (sans markdown) :
{{
  "notion_cle": "...",
  "etapes": [
    {{
      "numero": 1,
      "titre": "...",
      "explication": "...",
      "manim_code": "from manim import *\\n\\nclass ExplicationIQRA(Scene):\\n    def construct(self):\\n        ..."
    }}
  ],
  "questions_comprehension": ["...", "...", "..."],
  "ressources_iqra": ["...", "..."]
}}
"""

    response = model.generate_content([prompt, pil_image] if pil_image else prompt)
    raw = re.sub(r"```json|```", "", response.text.strip()).strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "notion_cle": f"Explication de {matiere} pour {niveau}",
            "etapes": [{
                "numero": 1,
                "titre": "Explication",
                "explication": raw[:600] if raw else "Explication non disponible.",
                "manim_code": _manim_fallback_code(matiere, niveau, 1),
            }],
            "questions_comprehension": [],
            "ressources_iqra": [],
        }

    # ── Génération vidéo par étape ──
    etapes = result.get("etapes", [])
    notion = result.get("notion_cle", matiere)
    for etape in etapes:
        manim_code = etape.get("manim_code", "")
        if "ExplicationIQRA" not in manim_code:
            manim_code = _manim_fallback_code(matiere, niveau, etape.get("numero", 1))
        video_url = _generate_video(
            manim_code = manim_code,
            notion     = f"{notion} - Etape {etape.get('numero', '')}",
            etapes     = [etape.get("explication", "")],
        )
        etape["video_url"] = video_url
        etape.pop("manim_code", None)

    result["etapes"]           = etapes
    result["langue_detection"] = detected_lang
    return result


# ══════════════════════════════════════════════════════════════════════════════
# F3 — ORIENTATION
# ══════════════════════════════════════════════════════════════════════════════

def generate_orientation_questions(
    niveau: str,
    filiere: str = "",
    description: str = "",
    language: str = "fr",
) -> list:
    """
    Génère 12 questions d'orientation personnalisées (Q1–Q12).

    Retourne : list[dict] → [{ "id": "Q1", "texte": "..." }, ...]

    NOTE : la vue Django enveloppe cette liste dans {"questions_psycho": [...]}
    avant de la renvoyer au frontend — conforme à l'API spec du contexte projet.
    """
    # FIX BUG 5 : genai.configure() déjà appelé en tête de fichier — on ne le répète pas.
    # Le modèle global est réutilisé pour la cohérence.

    # ── RAG dans career_knowledge ──
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    context_psycho = ""
    try:
        col = client.get_collection("career_knowledge")
        query_text = (
            f"dimensions psychologiques orientation élève {niveau} {filiere} "
            f"blocages estime de soi peur échec flow forces cachées {description}"
        )
        res = col.query(
            query_texts=[query_text],
            n_results=6,
            where={"category": "psyco"},
        )
        docs = res.get("documents", [[]])[0]
        context_psycho = "\n\n".join(docs)
    except Exception as e:
        print(f"[generate_orientation_questions] RAG fallback : {e}")
        context_psycho = (
            "Dimensions : flow et intérêts profonds, estime de soi, peur vs capacité réelle, "
            "forces perçues par l'entourage vs auto-perception, croyances limitantes, "
            "pression familiale, style d'apprentissage, compétences autodidactes, "
            "motivation intrinsèque, résilience, comparaison sociale."
        )

    lang_instructions = {
        "fr": (
            "Génère les 12 questions entièrement en français. "
            "Ton chaleureux, bienveillant, non-jugeant."
        ),
        "ar": (
            "اكتب الأسئلة الـ12 باللغة العربية الفصحى البسيطة. "
            "أسلوب دافئ وغير حكمي على الإطلاق."
        ),
        "darija": (
            "كتب الـ12 سؤال بالدارجة المغربية الطبيعية. "
            "أسلوب دافئ ومباشر كيما كيتكلم الشباب المغربي."
        ),
    }
    lang_instr = lang_instructions.get(language, lang_instructions["fr"])

    profil_context = f"Niveau : {niveau}"
    if filiere:
        profil_context += f" | Filière : {filiere}"
    if description:
        profil_context += f"\nDescription libre de l'élève : « {description[:400]} »"

    autodepreciation_signal = any(
        kw in description.lower()
        for kw in ["pas assez", "pas intelligent", "nul", "rien", "moyen",
                   "faible", "doute", "confiance", "timide", "peur"]
    )
    autodepreciation_note = (
        "\n⚠️ SIGNAL : L'élève montre des signes d'auto-dépréciation dans sa description. "
        "Adapter les questions Q9 et Q11 avec encore plus de bienveillance et de reformulation positive."
        if autodepreciation_signal else ""
    )

    prompt = f"""
Tu es un psychologue scolaire expert en orientation pour les élèves marocains.
Tu dois concevoir un questionnaire d'orientation sur mesure pour UN élève précis.

══ PROFIL DE L'ÉLÈVE ═══════════════════════════════════════
{profil_context}
{autodepreciation_note}
══════════════════════════════════════════════════════════════

FRAMEWORKS PSYCHOLOGIQUES DISPONIBLES (RAG) :
{context_psycho}

INSTRUCTION LANGUE :
{lang_instr}

══ TON RÔLE ══════════════════════════════════════════════════
Tu n'appliques PAS un template.
Tu raisonnes : "Pour orienter CET élève et comprendre sa psychologie,
de quoi ai-je besoin de savoir ?"

Puis tu construis les 12 questions les plus pertinentes pour LUI.

══ CE QUE LE QUESTIONNAIRE DOIT COUVRIR (librement) ══════
Pour orienter un élève correctement, tu as besoin de comprendre :
- Ses points forts et ses difficultés scolaires RÉELS
- Comment il apprend et travaille naturellement
- Ce qui l'anime vraiment, même hors école
- La pression qu'il ressent (famille, société, lui-même)
- Ses compétences pratiques que l'école ne mesure pas
- Ses contraintes concrètes pour l'avenir
- Son état psychologique : estime de soi, peur, blocages, flow
- Ce que les autres voient en lui vs ce qu'il voit lui-même
- Ce qu'il veut dire et qu'on ne lui demande jamais

MAIS : si la description révèle déjà certaines de ces informations,
NE pose pas une question générique sur ce sujet —
pose plutôt une question qui APPROFONDIT ou RECONTEXTUALISE
ce qu'il a dit, ou qui explore une dimension connexe inconnue.

La dernière question (Q12) est TOUJOURS une invitation ouverte et chaleureuse
à dire ce que l'élève n'a pas pu exprimer dans les autres questions.

══ RÈGLES ABSOLUES ═══════════════════════════════════════════
- Exactement 12 questions
- Uniquement des questions ouvertes (pas de QCM, pas de cases à cocher)
- Chaque question part d'une SITUATION CONCRÈTE vécue, jamais abstraite
- Ton chaleureux, non-jugeant, psychologiquement sécurisant
- Adapter le vocabulaire et les références au niveau "{niveau}"

Réponds UNIQUEMENT avec un JSON valide, sans markdown ni commentaire :
[
  {{"id": "Q1",  "texte": "..."}},
  {{"id": "Q2",  "texte": "..."}},
  {{"id": "Q3",  "texte": "..."}},
  {{"id": "Q4",  "texte": "..."}},
  {{"id": "Q5",  "texte": "..."}},
  {{"id": "Q6",  "texte": "..."}},
  {{"id": "Q7",  "texte": "..."}},
  {{"id": "Q8",  "texte": "..."}},
  {{"id": "Q9",  "texte": "..."}},
  {{"id": "Q10", "texte": "..."}},
  {{"id": "Q11", "texte": "..."}},
  {{"id": "Q12", "texte": "..."}}
]
"""

    orientation_model = genai.GenerativeModel("gemini-3-flash-preview")
    response = orientation_model.generate_content(prompt)
    raw = re.sub(r"```json|```", "", response.text.strip()).strip()

    questions = json.loads(raw)

    if not isinstance(questions, list) or len(questions) != 12:
        raise ValueError(
            f"Gemini a retourné {len(questions) if isinstance(questions, list) else 'un non-list'} "
            "questions au lieu de 12."
        )

    return questions


# ════════════════════════════════════════════════════════════
# analyze_orientation
# ════════════════════════════════════════════════════════════

def analyze_orientation(
    contexte_amorce: dict,
    reponses: list,
    language: str = "fr",
    answer_lang_map: dict = None,
) -> dict:
    """
    Analyse psycho-pédagogique complète des 12 réponses.
    Retourne un profil riche avec filières détaillées (écoles, parcours, débouchés).
    """
    # FIX BUG 5 : pas de genai.configure() redondant ici non plus
    niveau      = contexte_amorce.get("niveau", "")
    filiere     = contexte_amorce.get("filiere", "")
    description = contexte_amorce.get("description", "")

    lang_map = answer_lang_map or {}
    lang_summary_lines = []
    if lang_map:
        counts = {}
        for qid, l in lang_map.items():
            counts[l] = counts.get(l, 0) + 1
        lang_summary_lines = [f"  - {l}: {n} réponse(s)" for l, n in counts.items()]
    lang_summary = "\n".join(lang_summary_lines) if lang_summary_lines else "  - non disponible"

    # ── RAG double : psycho + filières/écoles ──
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    context_psycho = ""
    context_ecole  = ""
    try:
        col = client.get_collection("career_knowledge")

        res_p = col.query(
            query_texts=[f"profil psychologique orientation forces blocages croyances limitantes {niveau} {filiere}"],
            n_results=5,
            where={"category": "psyco"},
        )
        context_psycho = "\n\n".join(res_p.get("documents", [[]])[0])

        res_e = col.query(
            query_texts=[f"filières études supérieures Maroc écoles universités grandes écoles CPGE {niveau} {filiere}"],
            n_results=6,
            where={"category": "ecole"},
        )
        context_ecole = "\n\n".join(res_e.get("documents", [[]])[0])
    except Exception as e:
        print(f"[RAG analyze_orientation] fallback : {e}")
        context_psycho = "Curiosité, résilience, estime de soi, motivation, peur de l'échec, flow, croyances limitantes."
        context_ecole  = (
            "CPGE (classes prépa : MPSI, PCSI, ECG...) → grandes écoles d'ingénieurs (ENSA, EMI, ENSAM...). "
            "Médecine : concours national, 7 ans minimum, FMPM/FMPR/FMPDC. "
            "ENCG, ISCAE, HEM pour management/commerce. "
            "ENSA/ENSIAS/FST pour informatique/ingénierie. "
            "Facultés des Sciences (FS) pour parcours académique scientifique. "
            "FSJES pour droit, économie, sciences sociales. "
            "Facultés des Lettres (FL) pour langues, histoire, géographie, philosophie. "
            "IUT/ESTC pour formations techniques courtes (2-3 ans). "
            "Instituts spécialisés : ISADAC (arts), ENSET (enseignement technique), ENAM (administration)."
        )

    lang_instructions = {
        "fr": (
            "Génère TOUTE ta réponse en français standard. "
            "Ton chaleureux, professionnel, bienveillant."
        ),
        "ar": (
            "اكتب كل إجاباتك باللغة العربية الفصحى البسيطة. "
            "أسلوب دافئ ومهني."
        ),
        "darija": (
            "كتب كل إجاباتك بالدارجة المغربية الطبيعية. "
            "أسلوب دافئ ومباشر."
        ),
    }
    lang_instr = lang_instructions.get(language, lang_instructions["fr"])

    reponses_text = ""
    for r in reponses:
        lang_used = r.get("lang_used", "") or lang_map.get(r.get("question_id", ""), "?")
        reponses_text += (
            f"\n[{r.get('question_id','?')}] (langue: {lang_used})\n"
            f"Question : {r.get('question','')}\n"
            f"Réponse  : {r.get('reponse','(vide)')}\n"
        )

    prompt = f"""
Tu es un conseiller d'orientation expert en psychologie adolescente et système éducatif marocain.

══ INSTRUCTION LANGUE ══════════════════════════════════════
{lang_instr}

Distribution des langues utilisées par l'élève :
{lang_summary}

Langue de sortie OBLIGATOIRE : **{language.upper()}**
══════════════════════════════════════════════════════════════

PROFIL : Niveau={niveau} | Filière={filiere or 'non précisée'} | Description={description or 'non fournie'}

RÉPONSES (12 questions) :
{reponses_text}

CONNAISSANCES PSYCHOLOGIQUES :
{context_psycho}

RÉALITÉS FILIÈRES ET ÉCOLES AU MAROC :
{context_ecole}

══ INSTRUCTIONS D'ANALYSE PSYCHOLOGIQUE ══════════════════
1. Cherche les forces cachées MÊME si l'élève ne les voit pas
2. Identifie les croyances limitantes avec bienveillance (jamais de jugement)
3. Sépare PEUR et CAPACITÉ RÉELLE de façon explicite
4. Détecte le style d'apprentissage dominant à partir des réponses Q2 et Q6
5. Si peur_echec > 65 → signal d'attention (le frontend affichera en orange)
6. Les messages doivent être personnalisés et faire référence aux réponses concrètes

══ INSTRUCTIONS FILIÈRES (TRÈS IMPORTANT) ═══════════════
Pour chaque filière dans top_filieres :

→ "pourquoi" : Expliquer en 2-3 phrases POURQUOI cette filière correspond
  à la PERSONNALITÉ et aux COMPÉTENCES détectées dans les réponses.

→ "realites_maroc" : Donner des informations CONCRÈTES et UTILES :
  * Les établissements marocains (noms exacts)
  * La durée des études
  * Le mode d'accès (concours national, dossier, bac direct)
  * Les débouchés professionnels concrets au Maroc
  * Le salaire de départ approximatif si connu

→ "defi_personnel" : Identifier UN défi psychologique spécifique à CET ÉLÈVE
  pour cette filière. Formuler avec bienveillance et courage.

→ "parcours_detaille" : Décrire le parcours étape par étape :
  * Conditions d'admission
  * Années d'études et contenu des premières années
  * Possibilités de spécialisation
  * Passerelles possibles

Retourne exactement 3 filières dans top_filieres.
5-8 filières dans scores_radar.
5-8 dimensions dans dimensions_psycho (scores 0-100).

Réponds UNIQUEMENT en JSON valide :
{{
  "message_intro": "...",
  "forces_cachees": ["...", "...", "..."],
  "croyances_limitantes": ["...", "..."],
  "style_apprentissage": "...",
  "top_filieres": [
    {{
      "filiere": "...",
      "score": 85,
      "pourquoi": "...",
      "realites_maroc": "...",
      "parcours_detaille": "...",
      "defi_personnel": "..."
    }},
    {{
      "filiere": "...",
      "score": 72,
      "pourquoi": "...",
      "realites_maroc": "...",
      "parcours_detaille": "...",
      "defi_personnel": "..."
    }},
    {{
      "filiere": "...",
      "score": 65,
      "pourquoi": "...",
      "realites_maroc": "...",
      "parcours_detaille": "...",
      "defi_personnel": "..."
    }}
  ],
  "scores_radar": {{
    "Filière A": 85,
    "Filière B": 72,
    "Filière C": 65,
    "Filière D": 55,
    "Filière E": 48
  }},
  "dimensions_psycho": {{
    "curiosite": 80,
    "resilience": 65,
    "estime_de_soi": 50,
    "motivation": 75,
    "peur_echec": 60
  }},
  "message_cloture": "..."
}}
"""

    orientation_model = genai.GenerativeModel("gemini-3-flash-preview")
    response = orientation_model.generate_content(prompt)
    raw = re.sub(r"```json|```", "", response.text.strip()).strip()
    return json.loads(raw)


# ════════════════════════════════════════════════════════════
# generate_orientation_suggestion
# ════════════════════════════════════════════════════════════

def generate_orientation_suggestion(
    question_id: str,
    question_text: str,
    current_answer: str,
    niveau: str = "",
    language: str = "fr",
) -> str | None:
    """
    Génère une suggestion contextuelle ("thought-starter") ancrée
    dans le texte EXACT de la question reçue dynamiquement.

    Appelée après 5s d'inactivité dans le textarea.
    Retourne une chaîne courte (1-2 phrases) ou None en cas d'erreur.
    """
    lang_instructions = {
        "fr": (
            "Réponds en français. Ton chaleureux, encourageant. "
            "1-2 phrases max, style 'pense à…', 'par exemple…', ou 'rappelle-toi…'."
        ),
        "ar": (
            "أجب بالعربية الفصحى البسيطة. أسلوب دافئ ومشجع. "
            "جملة أو جملتان، أسلوب 'فكر في…' أو 'تذكر…' أو 'مثلاً…'."
        ),
        "darija": (
            "جاوب بالدارجة المغربية. أسلوب دافئ ومشجع. "
            "جملة أو جوج، أسلوب 'فكر في…' أو 'تذكر واش…' أو 'مثلاً…'."
        ),
    }
    lang_instr = lang_instructions.get(language, lang_instructions["fr"])

    has_answer = current_answer.strip() != ""

    if has_answer:
        core_block = f"""
L'élève répond à cette question :
« {question_text} »

Il a écrit jusqu'ici :
« {current_answer.strip()[:400]} »

Ta mission : générer UNE suggestion courte (1-2 phrases) qui prolonge
EXACTEMENT ce qu'il vient d'écrire.

Règles strictes :
- Reste dans le même sujet, le même ton, la même direction que sa réponse
- Ne change pas de thème, ne fais pas de digression
- La suggestion doit sembler être la suite naturelle de SA phrase
- Formule avec "par exemple…", "ou peut-être…", "pense aussi à…"
"""
    else:
        core_block = f"""
L'élève doit répondre à cette question :
« {question_text} »

Il n'a encore rien écrit.

Ta mission : générer UNE suggestion courte (1-2 phrases) qui l'aide
à SE LANCER en lui proposant un angle concret, directement lié au sujet
de cette question.

Règles strictes :
- La suggestion doit coller exactement au sujet de la question
- Propose un souvenir précis, un moment vécu, une situation concrète
- Formule avec "pense à…", "rappelle-toi…", "par exemple…"
"""

    prompt = f"""
Tu aides un élève marocain (niveau : {niveau or 'non précisé'}).

{core_block}

INSTRUCTION LANGUE : {lang_instr}

Réponds UNIQUEMENT avec le texte de la suggestion (1-2 phrases). Rien d'autre.
"""
    try:
        suggestion_model = genai.GenerativeModel("gemini-3-flash-preview")
        response = suggestion_model.generate_content(prompt)
        text = response.text.strip().strip('"').strip("«»").strip()
        return text if len(text) > 5 else None
    except Exception as e:
        print(f"[generate_orientation_suggestion] error: {e}")
        return None


def generate_orientation_tags(
    question_id: str,
    question_text: str,
    current_answer: str = "",
    niveau: str = "",
    language: str = "fr",
    count: int = 5,
) -> list:
    """
    Génère N courtes amorces ("smart tags") contextuelles pour une question.

    Chaque tag est une expression de 3 à 7 mots que l'élève peut cliquer
    pour l'insérer dans son textarea et se débloquer.

    Retourne : list[str]
    """
    lang_instructions = {
        "fr": (
            "Génère les amorces en français. "
            "Ton naturel, comme si tu soufflais des idées à un ami."
        ),
        "ar": (
            "اكتب الأفكار بالعربية الفصحى البسيطة. "
            "أسلوب طبيعي ودافئ."
        ),
        "darija": (
            "كتب الأفكار بالدارجة المغربية الطبيعية. "
            "أسلوب دافئ ومباشر."
        ),
    }
    lang_instr = lang_instructions.get(language, lang_instructions["fr"])
    count      = min(count, 8)

    answer_block = (
        f'Il a déjà écrit : « {current_answer.strip()[:200]} »'
        if current_answer.strip()
        else "Il n'a encore rien écrit."
    )

    prompt = f"""
Tu aides un élève marocain (niveau : {niveau or "non précisé"}).

Il doit répondre à cette question :
« {question_text} »

{answer_block}

Ta mission : générer exactement {count} courtes amorces (3 à 7 mots chacune)
que l'élève peut cliquer pour insérer dans sa réponse et se débloquer.

Règles :
- Chaque amorce est directement liée au sujet de la question
- Les amorces partent de situations concrètes ou de moments vécus
- Elles sont variées — ne commencent pas toutes par le même mot
- Elles sont adaptées au niveau "{niveau}"
- Ton bienveillant, encourageant, jamais condescendant
- Si l'élève a déjà écrit quelque chose, les amorces prolongent sa réponse
  dans des directions différentes ; sinon elles l'aident à démarrer

{lang_instr}

Réponds UNIQUEMENT avec un JSON valide, sans markdown ni commentaire :
["amorce 1", "amorce 2", "amorce 3", "amorce 4", "amorce 5"]
"""

    try:
        tags_model = genai.GenerativeModel("gemini-3-flash-preview")
        response   = tags_model.generate_content(prompt)
        raw        = re.sub(r"```json|```", "", response.text.strip()).strip()
        tags       = json.loads(raw)

        if not isinstance(tags, list):
            return []

        return [str(t).strip()[:80] for t in tags if t][:count]

    except Exception as e:
        print(f"[generate_orientation_tags] error: {e}")
        return []