# ai_engine/rag_service.py
# Version fusionnée — toutes les fonctionnalités v1 + GAP ANALYZER v7 (analyze_exercise_image)

import re
import json
import os
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
GEMINI_API_KEY  = "AIzaSyCNToHBwRSAO0NxL6JvOntNBgGfF7jy52s"

# ══════════════════════════════════════════
# INIT
# ══════════════════════════════════════════

embedder   = SentenceTransformer(EMBEDDING_MODEL)
chroma     = chromadb.PersistentClient(path=CHROMA_DIR)
collection = chroma.get_collection(COLLECTION_NAME)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-3-flash-preview")

# ══════════════════════════════════════════
# HELPER — Filières avec sous-dossiers COURS/EXO
# ══════════════════════════════════════════

FILIERES_AVEC_TYPE = ["2BAC SM A", "2BAC SPC", "2BAC SVT"]


def build_where_filter(niveau, matiere, type_doc=None):
    conditions = [
        {"niveau":  {"$eq": niveau}},
        {"matiere": {"$eq": matiere}},
    ]
    if type_doc:
        conditions.append({"type_doc": {"$eq": type_doc}})
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def get_type_exo(niveau):
    return "EXO" if niveau in FILIERES_AVEC_TYPE else None


def get_type_cours(niveau):
    return "COURS" if niveau in FILIERES_AVEC_TYPE else None


# ══════════════════════════════════════════
# SERVICE LANGUE — détection + instruction  (version v1 — utilisée par ask_rag,
# generate_quiz, generate_study_plan et les state-machine helpers)
# ══════════════════════════════════════════

# Marqueurs darija marocaine (phonétique + alphabet)
_DARIJA_MARKERS = [
    "واش", "بحال", "مافهمتش", "خليني", "علاش", "كيفاش",
    "دابا", "هادشي", "مزيان", "بغيت", "خاصني", "ماشي",
    "wach", "bach", "mafhemtch", "kifach", "daba", "mzyan",
    "chno", "fin", "3lach", "bghit", "kayn", "khasni",
    "khoya", "sahbi", "aji", "safi", "bzzaf", "zwina",
]

# Marqueurs arabe classique (absents de la darija)
_AR_MARKERS = [
    "لا أفهم", "أريد", "كيف", "لماذا", "ما هو", "شرح",
    "المسألة", "الحل", "يرجى", "أستطيع", "يجب", "هل",
]

# Marqueurs français explicites
_FR_MARKERS = [
    "je", "tu", "il", "nous", "vous", "ils", "est", "sont",
    "avec", "pour", "dans", "sur", "pas", "une", "les",
    "je ne comprends pas", "j'ai besoin", "comment",
]


def detect_language_v1(text: str) -> str:
    """
    Détecte la langue — version simple utilisée par ask_rag / generate_quiz /
    generate_study_plan / state-machine.
    Retourne : "fr" | "ar" | "darija"
    """
    if not text or not text.strip():
        return "fr"

    text_low = text.lower()

    darija_score = sum(1 for m in _DARIJA_MARKERS if m.lower() in text_low)
    ar_score     = sum(1 for m in _AR_MARKERS if m in text)
    fr_score     = sum(1 for m in _FR_MARKERS if m in text_low)
    has_arabic_chars = any('\u0600' <= c <= '\u06ff' for c in text)

    if darija_score > 0:
        return "darija"
    if ar_score > 0 or (has_arabic_chars and fr_score == 0):
        return "ar"
    return "fr"


def get_language_instruction_v1(language: str) -> str:
    """
    Retourne une directive de langue STRICTE pour Gemini (version v1).
    Utilisée par ask_rag, generate_quiz, generate_study_plan.
    """
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
# STATE MACHINE — inférence du prochain stage
# (conservée intacte depuis v1 — utilisée si besoin en dehors du tuteur image)
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


def infer_next_stage(
    current_stage: str,
    user_message: str,
    help_level: int,
    turn_count: int,
) -> tuple:
    """
    State machine pédagogique (v1).
    Retourne (next_stage, new_help_level).
    """
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


# ══════════════════════════════════════════
# SCAFFOLD POLICY — directive selon help_level (v1)
# ══════════════════════════════════════════

def get_scaffold_directive(help_level: int, language: str = "fr") -> str:
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


# ══════════════════════════════════════════
# STAGE DIRECTIVES — prompt par stage (v1)
# ══════════════════════════════════════════

def get_stage_directive(
    stage: str,
    help_level: int,
    language: str,
    turn_in_stage: int = 0,
) -> str:
    scaffold = get_scaffold_directive(help_level, language)

    directives = {

        "diagnostic": f"""
════ STAGE : DIAGNOSTIC ════
Ton rôle : identifier EXACTEMENT où l'élève est bloqué.
Tu NE dois PAS expliquer encore. Tu dois d'abord comprendre.

Instructions :
1. Nomme brièvement le sujet détecté (1 phrase max).
2. Pose UNE question diagnostique précise pour identifier le vrai blocage :
   "Tu bloques sur : la compréhension de l'énoncé ? la méthode ? le calcul ? la formule ? la rédaction ?"
3. NE commence PAS l'explication — attends la réponse de l'élève.
4. Ton chaleureux, décontracté, humain. Jamais formel.

Si l'élève semble perdu (help_level={help_level}) :
{scaffold}

Intégration IQRA : si pertinent, glisse naturellement :
"Ce type d'exercice revient souvent — IQRA a justement des fiches mémo pour ça."
""",

        "guided_explanation": f"""
════ STAGE : EXPLICATION GUIDÉE ════
Tu as identifié le vrai blocage. Maintenant tu expliques — mais PROGRESSIVEMENT.

Instructions ABSOLUES :
1. Donne UNIQUEMENT la prochaine micro-étape utile. PAS la solution complète.
2. Maximum 2-3 phrases par message. Chaque bulle = une idée.
3. Utilise des analogies simples et concrètes.
4. Termine TOUJOURS par : "Dis-moi ce que tu comprends jusqu'ici" ou équivalent.
5. JAMAIS de grands paragraphes. JAMAIS de listes numérotées formelles.

Niveau d'aide actuel (help_level={help_level}) :
{scaffold}

Intégration IQRA (1 fois max dans cette réponse) :
"IQRA insiste beaucoup sur cette méthode — c'est souvent ce qui fait la différence au BAC."
OU : "Les exercices progressifs IQRA aident justement sur ce type de blocage."
""",

        "student_attempt": f"""
════ STAGE : À TOI D'ESSAYER ════
L'élève vient de recevoir une explication. IL FAUT QU'IL ESSAIE MAINTENANT.

Instructions :
1. Message très court et motivant (2-3 lignes max).
2. Rappelle UNE chose clé en 1 ligne.
3. Invite-le à écrire sa tentative : "Vas-y, dis-moi ce que tu trouves 👍"
4. N'explique PAS davantage. Attends sa réponse.
5. Ton : coach sportif encourageant — pas professeur académique.
""",

        "correction": f"""
════ STAGE : CORRECTION BIENVEILLANTE ════
L'élève vient d'essayer. Tu analyses sa tentative.

Instructions ABSOLUES :
1. COMMENCE TOUJOURS par ce qui est CORRECT. Même si c'est peu.
2. Identifie l'erreur PRÉCISE — pas vague.
3. Explique POURQUOI cette erreur se produit (pas juste quoi corriger).
4. JAMAIS "c'est faux" / "non" / "mauvais". Toujours bienveillant.
5. Si tout est correct → célèbre sincèrement + passe au mastery_check.

Intégration IQRA :
"Ce type d'erreur est fréquent — c'est pour ça qu'IQRA découpe les exercices étape par étape."
""",

        "retry": f"""
════ STAGE : RÉESSAI ════
L'élève doit réessayer après correction. Donne-lui confiance.

Instructions :
1. Message très court et encourageant.
2. Rappelle l'erreur corrigée en 1 ligne seulement.
3. Invite à retenter : "Maintenant réessaie avec ça en tête."
4. Niveau d'aide : {scaffold}
""",

        "mastery_check": f"""
════ STAGE : VÉRIFICATION FINALE ════
L'exercice est presque maîtrisé. Vérifie la compréhension réelle.

Instructions :
1. Pose UNE question de vérification différente de l'exercice original.
2. Si l'élève répond correctement → COMPLETED.
3. Ton : fier et encourageant.

Intégration IQRA :
"Pour consolider ça, les exercices similaires sur IQRA vont vraiment t'aider."
""",

        "completed": f"""
════ STAGE : MAÎTRISE ATTEINTE ════
L'élève a compris et maîtrisé l'exercice. Célèbre sincèrement.

Instructions :
1. Message court et chaleureux de félicitations (pas excessif).
2. Fais une synthèse ultra-rapide : "Tu as compris que..."
3. Propose la prochaine étape naturellement via IQRA.
4. Ton : fier et motivant.

Intégration IQRA :
"Pour aller encore plus loin, IQRA a des exercices similaires avec niveaux progressifs.
Chaque exercice réussi = points et récompenses — ça vaut le coup !"
""",
    }

    return directives.get(stage, directives["diagnostic"])


# ══════════════════════════════════════════
# FONCTION PRINCIPALE — ask_rag()
# ══════════════════════════════════════════

def ask_rag(question, niveau=None, matiere=None, type_doc=None, n_results=5, language="fr"):
    """
    Pose une question au RAG.
    - language : "fr" | "ar" | "darija" — contrôle strict la langue de réponse
    """
    question_vector = embedder.encode(question).tolist()

    conditions = []
    if niveau:
        conditions.append({"niveau":  {"$eq": niveau}})
    if matiere:
        conditions.append({"matiere": {"$eq": matiere}})
    if type_doc:
        conditions.append({"type_doc": {"$eq": type_doc}})

    if len(conditions) == 0:
        where_filter = None
    elif len(conditions) == 1:
        where_filter = conditions[0]
    else:
        where_filter = {"$and": conditions}

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


# ══════════════════════════════════════════
# FONCTION — generate_quiz()
# ══════════════════════════════════════════

def generate_quiz(niveau, matiere, chapitre, n_questions=5, language="fr"):
    """
    Génère des questions QCM basées sur le contenu RAG.
    - language : "fr" | "ar" | "darija"
    """
    question_vector = embedder.encode(chapitre).tolist()

    type_exo     = get_type_exo(niveau)
    where_filter = build_where_filter(niveau, matiere, type_doc=type_exo)

    results = collection.query(
        query_embeddings=[question_vector],
        n_results=5,
        where=where_filter,
        include=["documents"]
    )

    chunks  = results["documents"][0]
    context = "\n\n".join(chunks) if chunks else ""

    lang_instruction = get_language_instruction_v1(language)

    prompt = f"""
Tu es un professeur du système scolaire marocain (programme officiel).

══════════════════════════════════════════
{lang_instruction}
══════════════════════════════════════════

Génère exactement {n_questions} questions QCM sur le chapitre "{chapitre}"
pour un élève de {niveau} en {matiere}.

Les questions, les options de réponse et toutes les explications
doivent être entièrement rédigées dans la langue imposée ci-dessus.
Aucune exception.

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


# ══════════════════════════════════════════
# FONCTION — generate_study_plan()
# ══════════════════════════════════════════

def generate_study_plan(niveau, matiere, chapitres, temps_disponible, score_quiz,
                        profil_plan="normal", niveau_auto="niveau1",
                        facteurs_psycho=None, language="fr"):
    """
    Génère un plan de rattrapage personnalisé — version coaching humain.

    Paramètres :
    - profil_plan    : urgence / rapide / normal / expert
    - niveau_auto    : niveau0 / niveau1 / niveau2 / niveau3
    - facteurs_psycho: liste (procrastination, reseaux, panique, motivation, rien)
    - language       : "fr" | "ar" | "darija"
    """
    if facteurs_psycho is None:
        facteurs_psycho = []

    lang_instruction = get_language_instruction_v1(language)

    # ── ÉTAPE 1 — RAG : contexte du cours ──
    query           = f"{matiere} {' '.join(chapitres)} révision"
    question_vector = embedder.encode(query).tolist()
    where_filter    = build_where_filter(niveau, matiere, type_doc=None)

    results = collection.query(
        query_embeddings=[question_vector],
        n_results=6,
        where=where_filter,
        include=["documents", "metadatas"]
    )
    chunks  = results["documents"][0]
    context = "\n\n".join(chunks) if chunks else ""

    # ── ÉTAPE 2 — Structure du plan (Python décide) ──
    profils = {
        "urgence": {
            "label":         "🚨 Urgence absolue",
            "nb_sessions":   1,
            "max_activites": 4,
            "duree_max_min": temps_disponible * 60,
            "contexte_plan": (
                "L'élève est en situation d'urgence extrême. "
                "Le plan doit aller droit au but : notions clés uniquement, "
                "exercices types les plus probables à l'examen, zéro superflu."
            ),
        },
        "rapide": {
            "label":         "⚡ Rattrapage rapide",
            "nb_sessions":   min(len(chapitres), 3),
            "max_activites": 4,
            "duree_max_min": temps_disponible * 60,
            "contexte_plan": (
                "L'élève a peu de temps. Le plan doit être dense mais efficace."
            ),
        },
        "normal": {
            "label":         "📚 Rattrapage normal",
            "nb_sessions":   max(len(chapitres), 2),
            "max_activites": 5,
            "duree_max_min": temps_disponible * 60,
            "contexte_plan": (
                "L'élève a un temps raisonnable. Le plan équilibre compréhension et pratique."
            ),
        },
        "expert": {
            "label":         "🎯 Perfectionnement",
            "nb_sessions":   max(len(chapitres) * 2, 4),
            "max_activites": 6,
            "duree_max_min": temps_disponible * 60,
            "contexte_plan": (
                "L'élève a du temps pour viser l'excellence."
            ),
        },
    }
    profil = profils.get(profil_plan, profils["normal"])

    # ── ÉTAPE 3 — Profil pédagogique ──
    niveaux_auto = {
        "niveau0": {
            "label":       "Débutant total",
            "etat_reel":   "L'élève ne comprend vraiment rien encore à ce chapitre.",
            "approche":    (
                "Commence TOUJOURS par une vidéo explicative très simple avant tout exercice."
            ),
            "ratio_types": {"video": 3, "exercice": 1, "chatbot": 1},
            "ton_gemini":  "Parle à l'élève avec beaucoup de douceur et de patience.",
        },
        "niveau1": {
            "label":       "Intermédiaire",
            "etat_reel":   "L'élève comprend un peu mais bloque souvent.",
            "approche":    "Alterner vidéo de rappel et exercice d'application.",
            "ratio_types": {"video": 2, "exercice": 2, "chatbot": 1},
            "ton_gemini":  "Parle à l'élève avec confiance.",
        },
        "niveau2": {
            "label":       "Comprend mais bloque aux exercices",
            "etat_reel":   "L'élève comprend la théorie mais échoue en pratique.",
            "approche":    "Privilégier les exercices guidés étape par étape.",
            "ratio_types": {"video": 1, "exercice": 3, "chatbot": 1},
            "ton_gemini":  "Explique à l'élève que comprendre la théorie c'est 30% du travail.",
        },
        "niveau3": {
            "label":       "Bonne compréhension, manque de pratique",
            "etat_reel":   "L'élève maîtrise bien mais manque d'entraînement.",
            "approche":    "Quasi uniquement des exercices variés et difficiles.",
            "ratio_types": {"video": 1, "exercice": 4, "chatbot": 1},
            "ton_gemini":  "Traite l'élève comme quelqu'un de capable.",
        },
    }
    auto = niveaux_auto.get(niveau_auto, niveaux_auto["niveau1"])

    # ── ÉTAPE 4 — Facteurs psycho ──
    directives_psycho = []

    if "procrastination" in facteurs_psycho:
        directives_psycho.append(
            "PROCRASTINATION DÉTECTÉE → Dans chaque activité, inclure une astuce Pomodoro."
        )
    if "reseaux" in facteurs_psycho:
        directives_psycho.append(
            "DISTRACTION RÉSEAUX DÉTECTÉE → Suggérer de poser le téléphone face retournée."
        )
    if "panique" in facteurs_psycho:
        directives_psycho.append(
            "PANIQUE/ANXIÉTÉ DÉTECTÉE → Ton extrêmement rassurant. Commencer par l'activité la plus facile."
        )
    if "motivation" in facteurs_psycho:
        directives_psycho.append(
            "MANQUE DE MOTIVATION DÉTECTÉ → Chaque activité doit avoir une motivation percutante."
        )

    bloc_directives_psycho = (
        "\n\n".join(f"→ {d}" for d in directives_psycho)
        if directives_psycho
        else "→ Aucun facteur psychologique particulier. Ton professionnel et encourageant standard."
    )

    # ── ÉTAPE 5 — Score quiz ──
    score_labels = {
        0: "Score 0/5 : l'élève n'a pas les bases.",
        1: "Score 1/5 : très faible. Des notions de base existent mais sont très fragiles.",
        2: "Score 2/5 : quelques acquis mais lacunes importantes.",
        3: "Score 3/5 : niveau moyen.",
        4: "Score 4/5 : bon niveau.",
        5: "Score 5/5 : excellent.",
    }
    diagnostic_score = score_labels.get(score_quiz, score_labels[2])

    # ── ÉTAPE 6 — Paramètres plan ──
    nb_sessions   = profil["nb_sessions"]
    max_act       = profil["max_activites"]
    ratio         = auto["ratio_types"]
    duree_max_min = profil["duree_max_min"]

    exemple_activite = """{
        "type": "video | exercice | chatbot",
        "titre": "Titre précis et concret de l'activité",
        "duree": "X min",
        "moment": "Moment de la journée SANS heure précise",
        "pourquoi": "Explication humaine et pédagogique",
        "astuce": "Conseil pratique concret",
        "motivation": "Message court, percutant, personnalisé"
      }"""

    prompt = f"""
Tu es à la fois un professeur expert du programme scolaire marocain, un coach pédagogique
et un psychologue scolaire bienveillant. Tu travailles pour la plateforme IQRA.

Tu parles DIRECTEMENT à l'élève (utilise "tu", pas "l'élève").

══════════════════════════════════════════════════════
INSTRUCTION DE LANGUE — PRIORITÉ ABSOLUE
══════════════════════════════════════════════════════
{lang_instruction}

══════════════════════════════════════════════════════
CE QUE TU SAIS SUR CET ÉLÈVE
══════════════════════════════════════════════════════
Filière : {niveau}
Matière : {matiere}
Chapitres en retard : {', '.join(chapitres)}
Temps disponible : {temps_disponible}h par semaine
Diagnostic du mini-défi : {diagnostic_score}
Niveau auto-déclaré : {auto['label']} — {auto['etat_reel']}
Approche pédagogique recommandée : {auto['approche']}
Ton à adopter avec cet élève : {auto['ton_gemini']}

══════════════════════════════════════════════════════
PROFIL DU PLAN
══════════════════════════════════════════════════════
Profil : {profil['label']}
Contexte : {profil['contexte_plan']}
Nombre de sessions : EXACTEMENT {nb_sessions}
Activités max par session : {max_act}
Durée totale max par session : {duree_max_min} minutes
Ratio : {ratio['video']} vidéo(s) / {ratio['exercice']} exercice(s) / {ratio['chatbot']} chatbot(s)

══════════════════════════════════════════════════════
DIRECTIVES PSYCHO-COACHING
══════════════════════════════════════════════════════
{bloc_directives_psycho}

══════════════════════════════════════════════════════
CONTRAINTES STRICTES SUR LES DURÉES
══════════════════════════════════════════════════════
- video    : entre 15 et 25 min
- exercice : entre 20 et 40 min
- chatbot  : entre 10 et 15 min
- La SOMME ≤ {duree_max_min} min

══════════════════════════════════════════════════════
CONTENU DES COURS IQRA (base RAG)
══════════════════════════════════════════════════════
{context}

══════════════════════════════════════════════════════
FORMAT JSON OBLIGATOIRE — EXACTEMENT {nb_sessions} session(s)
══════════════════════════════════════════════════════
{{
  "duree_totale": "X semaine(s)",
  "temps_par_semaine": "{temps_disponible}h",
  "profil": "{profil['label']}",
  "message_intro": "Message d'introduction court (2-3 phrases)",
  "sessions": [
    {{
      "semaine": 1,
      "objectif": "Objectif précis et motivant",
      "message_session": "Message court d'encouragement",
      "activites": [
        {exemple_activite}
      ]
    }}
  ],
  "conseils_finaux": [
    "Conseil 1",
    "Conseil 2",
    "Conseil 3"
  ],
  "message_cloture": "Message final court et chaleureux"
}}

Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après, sans markdown.
"""
    response = model.generate_content(prompt)
    return response.text


# ══════════════════════════════════════════════════════════════════════════════
# ██████████████████████████████████████████████████████████████████████████████
# GAP ANALYZER v7 — TUTEUR PÉDAGOGIQUE ADAPTATIF
# Remplace entièrement analyze_exercise_image et tous ses helpers depuis la v5.
#
# Fonctions ajoutées / remplacées :
#   1. detect_language()          ← version enrichie (scoring multi-langue)
#   2. get_language_instruction() ← version stricte et nuancée
#   3. profile_student()          ← profiling dynamique complet
#   4. select_pedagogical_mode()  ← sans stage forcé
#   5. build_mode_directive()     ← instruction Gemini détaillée
#   6. build_iqra_context()       ← branding naturel contextuel
#   7. analyze_exercise_image()   ← fonction principale v7
# ██████████████████████████████████████████████████████████████████████████████
# ══════════════════════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════════════════════
# 1. DÉTECTION LANGUE (v7 — enrichie)
# ══════════════════════════════════════════════════════════════════════════════

# Mots latins darija — liste étendue couvrant les patterns réels
_DARIJA_LATIN = frozenset([
    # Négations
    "mafhemtch", "ma3raftch", "makaintch", "mabghitch", "makaynch",
    "makaynach", "mazaltch", "manqderch", "mawjoudch",
    # Verbes courants translittérés
    "bghit", "kan3rf", "kanbghi", "kayn3rf", "fhmt", "fhemna",
    "3raft", "3andi", "3endek", "3endo", "3endna",
    "writ", "mchit", "jit", "dert", "derna", "ndir", "ndirou", "ndiru",
    "jarrab", "jarrabna", "kajarrab",
    "kharej", "dakhal", "khrej", "dkhal",
    "bda", "nbda", "nbdaw", "bdit",
    # Pronoms / particules
    "nta", "nti", "ntoma", "hiya", "howa", "homa",
    "daba", "dyal", "dial", "dyali", "dyalek",
    "wach", "wash", "ach", "ash",
    "kif", "kifach", "kfach",
    "fach", "mnin", "lach", "3lach",
    "bach", "hta", "wella", "wla",
    "ghadi", "ghir", "rak", "rani",
    # Articles / prépositions darija latin
    "had", "dak", "dyal", "lhisab", "lmath",
    "lkitab", "lmessala", "lmosala", "lhaja",
    "f", "fl", "mn", "bla", "hit",
    # Adverbes / interjections
    "bzaf", "bezzaf", "chwiya", "shwiya", "bhal",
    "mzyan", "mzien", "zwina", "zwine",
    "lblouka", "mbloka", "bloka",
    "wakha", "wakhali", "yallah", "yala",
    "3yant", "3yanit", "3yit", "dayekh", "dayekha",
    "khaif", "khaifa", "khayef", "khayfa",
    "3la", "ela",
    # Waw / ah typique darija
    "waw", "waww", "ahh",
    # Expressions apprentissage
    "mafhemtch", "khasni", "nfahem", "chrehli",
    "3tini", "indice", "sahl", "sa3ib", "s3ib", "s3iba",
    # Darija-latin caractéristique : verbes avec préfixe k/n
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
    Détecte la langue réelle d'un message élève (v7 — enrichie).
    Retourne : "ar" | "darija" | "fr"

    Priorité :
    1. Signal fort darija latin → darija
    2. Proportion caractères arabes + marqueurs darija arabe → darija
    3. Proportion caractères arabes élevée → ar
    4. Défaut → fr
    """
    if not text or not text.strip():
        return "fr"

    cleaned = text.strip()
    lower   = cleaned.lower()

    # ── Signal darija latin ──
    words = re.findall(r"\b[a-zA-Z0-9']+\b", lower)
    darija_latin_hits = sum(1 for w in words if w in _DARIJA_LATIN)
    has_arabic_numeral_pattern = bool(re.search(r"\b[a-z]*[3789][a-z]*\b", lower))

    if darija_latin_hits >= 1 or has_arabic_numeral_pattern:
        return "darija"

    # ── Comptage caractères ──
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


# ══════════════════════════════════════════════════════════════════════════════
# 2. INSTRUCTION LANGUE POUR GEMINI (v7)
# ══════════════════════════════════════════════════════════════════════════════

def get_language_instruction(language: str) -> str:
    """
    Retourne l'instruction de langue pour Gemini (v7 — utilisée par le tuteur image).
    """
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


# ══════════════════════════════════════════════════════════════════════════════
# 3. PROFILING DYNAMIQUE ÉLÈVE (v7)
# ══════════════════════════════════════════════════════════════════════════════

def profile_student(
    description: str,
    history: list,
    student_state: dict,
    exercise_info: dict,
) -> dict:
    """
    Analyse le message élève + historique + contexte exercice
    pour produire un profil pédagogique dynamique complet.
    """
    text  = (description or "").strip()
    lower = text.lower()
    turns = len([h for h in history if isinstance(h, dict)])

    # ── A. ÉTAT ÉMOTIONNEL ──
    STRESS_MARKERS = [
        "stress", "stressé", "stressée", "paniqu", "j'ai peur", "j'ai pas le temps",
        "examen demain", "contrôle demain", "demain matin", "dans une heure",
        "خايف", "خايفة", "khaif", "khaifa", "khayef", "khayfa",
        "peur", "paniqué", "paniquée", "طايح", "انزعجت",
        "plus le temps", "trop tard", "je vais rater",
    ]
    FATIGUE_MARKERS = [
        "fatigué", "fatiguée", "épuisé", "épuisée", "j'en peux plus",
        "تعبت", "تعبات", "3yant", "3yanit", "3yit", "ma3adch",
        "plus d'énergie", "je dors", "je m'endors",
    ]
    DECOURAGEMENT_MARKERS = [
        "comprends rien", "je comprends rien", "rien du tout", "nul", "nulle",
        "je suis nul", "je suis nulle", "c'est impossible", "j'abandonne",
        "ça sert à rien", "je n'y arrive pas", "j'arrive pas",
        "مافهمتش", "mafhemtch", "dayekh", "dayekha",
        "perdu", "je suis perdu", "je suis perdue",
        "ما فهمتش والو", "mafhemtch walo", "zero compris",
        "ma3raftch", "ما عرفتش", "makainch", "impossible de",
    ]
    MOTIVATION_MARKERS = [
        "j'ai compris", "je comprends maintenant", "je commence à comprendre",
        "ok merci", "super", "maintenant je vois", "ça marche",
        "fhmt", "فهمت", "waw", "merci beaucoup", "c'est clair",
        "je vois", "ah oui", "ah d'accord",
    ]
    FRUSTRATION_MARKERS = [
        "j'ai déjà essayé", "ça marche pas", "toujours pas", "encore faux",
        "je comprends pas pourquoi c'est faux",
        "مازال غلط", "mazal", "encore une fois",
        "j'ai fait comme tu as dit mais", "j'ai suivi les étapes mais",
    ]

    emotional_state = "neutre"
    if any(m in lower for m in STRESS_MARKERS):
        emotional_state = "stress"
    elif any(m in lower for m in FATIGUE_MARKERS):
        emotional_state = "fatigue"
    elif any(m in lower for m in DECOURAGEMENT_MARKERS):
        emotional_state = "decouragement"
    elif any(m in lower for m in FRUSTRATION_MARKERS):
        emotional_state = "frustration"
    elif any(m in lower for m in MOTIVATION_MARKERS):
        emotional_state = "motivation"

    # ── Pression examen ──
    EXAM_MARKERS = [
        "examen", "exam", "contrôle", "bac", "ds", "devoir",
        "demain", "ce soir", "dans 2 jours", "dans 3 jours",
        "امتحان", "الباك", "غداً", "الغد",
    ]
    exam_pressure = any(m in lower for m in EXAM_MARKERS)

    # ── B. INTENTION ──
    FOUNDATION_MARKERS = [
        "je connais pas", "je sais pas ce que c'est", "première fois que je vois",
        "jamais vu ça", "c'est quoi exactement", "ما عرفتش", "ma3raftch",
        "je connais pas la formule", "j'ai pas vu ça en cours",
        "on n'a pas fait ça", "khasni nfahem lkida mn lbda",
    ]
    ANSWER_MARKERS = [
        "la réponse", "donne-moi la solution", "donne moi la solution",
        "c'est quoi la réponse", "dis-moi la réponse", "dis moi la réponse",
        "جاوبني", "الجواب", "الحل", "solution directe", "directement",
        "جيب لي الجواب", "3tini ljawab", "résous pour moi",
    ]
    CHECK_MARKERS = [
        "c'est juste", "c'est correct", "j'ai fait", "voilà ma réponse",
        "est-ce que c'est correct", "j'ai trouvé", "vérif",
        "هل صح", "wach had ljawab mzyan", "wach howa sah",
        "j'ai calculé", "j'ai obtenu", "j'ai trouvé que",
        "ma réponse est", "ma réponse c'est",
    ]
    HINT_MARKERS = [
        "indice", "aide", "donne-moi une piste", "par où commencer",
        "comment commencer", "par où je commence",
        "تلميح", "من فين نبدا", "3tini indice", "3atini",
        "juste un coup de pouce", "un petit indice",
    ]
    EXPLAIN_MARKERS = [
        "expliqu", "je comprends pas", "c'est quoi", "comment ça marche",
        "pourquoi", "علاش", "كيفاش", "chno howa", "ما فهمتش", "شرح",
        "je vois pas", "j'arrive pas à comprendre", "explique-moi",
    ]
    SHOW_WORK_MARKERS = [
        "voilà ce que j'ai fait", "j'ai essayé", "ma tentative",
        "j'ai posé", "j'ai écrit", "هاك ما درت", "dert haka",
    ]

    intent = "explain_me"
    if any(m in lower for m in FOUNDATION_MARKERS):
        intent = "ask_foundation"
    elif any(m in lower for m in ANSWER_MARKERS):
        intent = "give_answer"
    elif any(m in lower for m in CHECK_MARKERS) or any(m in lower for m in SHOW_WORK_MARKERS):
        intent = "check_me"
    elif any(m in lower for m in HINT_MARKERS):
        intent = "give_hint"
    elif any(m in lower for m in EXPLAIN_MARKERS):
        intent = "explain_me"
    elif not text:
        intent = "image_only"

    # ── C. NIVEAU DE CONFUSION ──
    TOTAL_CONFUSION = [
        "comprends rien", "rien du tout", "zero", "mafhemtch walo",
        "مافهمتش والو", "dayekh bzaf", "complètement perdu",
        "tout est flou", "je sais rien", "je sais pas du tout",
    ]
    HIGH_CONFUSION = [
        "je bloque", "je comprends pas", "ça rentre pas",
        "ma3raftch", "مافهمتش", "khasni nfahem",
        "je vois pas où", "je sais pas comment",
    ]
    LOW_CONFUSION = [
        "je comprends un peu", "j'ai presque", "juste cette partie",
        "fhmt ghir", "cette étape seulement", "sauf cette partie",
        "à part ça", "juste ce point",
    ]

    confusion_level = "medium"
    if emotional_state == "decouragement" or any(m in lower for m in TOTAL_CONFUSION):
        confusion_level = "total"
    elif any(m in lower for m in HIGH_CONFUSION):
        confusion_level = "high"
    elif any(m in lower for m in LOW_CONFUSION) or intent == "give_hint":
        confusion_level = "low"
    elif intent in ("check_me", "give_answer") and emotional_state not in ("decouragement", "frustration"):
        confusion_level = "none"

    # ── D. AUTONOMIE (0-4) ──
    autonomy_map = {
        "ask_foundation": 0,
        "image_only":     1,
        "explain_me":     1,
        "give_hint":      2,
        "check_me":       3,
        "give_answer":    1,
    }
    base_autonomy = autonomy_map.get(intent, 1)
    turn_bonus    = min(turns // 4, 2)
    autonomy_level = min(base_autonomy + turn_bonus, 4)

    if confusion_level == "total" or emotional_state == "decouragement":
        autonomy_level = min(autonomy_level, 1)
    if emotional_state == "motivation":
        autonomy_level = min(autonomy_level + 1, 4)

    # ── E. FLAGS DÉRIVÉS ──
    missing_foundations = (
        intent == "ask_foundation"
        or (confusion_level == "total" and turns <= 2)
    )

    readiness_to_attempt = (
        autonomy_level >= 2
        and confusion_level in ("none", "low", "medium")
        and intent not in ("ask_foundation", "image_only")
        and emotional_state not in ("stress", "decouragement", "fatigue")
    )

    needs_encouragement = (
        emotional_state in ("stress", "fatigue", "decouragement", "frustration")
        or (confusion_level in ("total", "high") and turns >= 3)
    )

    # ── Langue des tours précédents ──
    previous_language = None
    for h in reversed(history):
        if isinstance(h, dict) and h.get("response_language"):
            previous_language = h["response_language"]
            break
        return {
            "emotional_state":      emotional_state,
            "confusion_level":      confusion_level,
            "intent":               intent,
            "autonomy_level":       autonomy_level,
            "readiness_to_attempt": readiness_to_attempt,
            "missing_foundations":  missing_foundations,
            "needs_encouragement":  needs_encouragement,
            "exam_pressure":        exam_pressure,
            "turn_count":           turns,
            "previous_language":    previous_language,
        }


# ══════════════════════════════════════════════════════════════════════════════
# 4. SÉLECTION DU MODE PÉDAGOGIQUE (v7)
# ══════════════════════════════════════════════════════════════════════════════

PEDAGOGICAL_MODES = frozenset([
    "initial_diagnosis",
    "foundation_rebuild",
    "concept_explanation",
    "methodology_training",
    "step_by_step",
    "micro_hint",
    "guided_thinking",
    "student_attempt",
    "answer_correction",
    "fast_answer",
    "simplification",
    "confidence_boost",
    "emotional_reassurance",
    "exam_panic_support",
    "motivation_boost",
])


def select_pedagogical_mode(profile: dict, is_initial: bool) -> str:
    """
    Choisit le mode pédagogique optimal (v7).
    Logique en cascade — aucun stage forcé, chaque décision part du profil frais.
    """
    intent        = profile["intent"]
    confusion     = profile["confusion_level"]
    autonomy      = profile["autonomy_level"]
    emotion       = profile["emotional_state"]
    readiness     = profile["readiness_to_attempt"]
    foundations   = profile["missing_foundations"]
    encouragement = profile["needs_encouragement"]
    exam          = profile["exam_pressure"]
    turns         = profile["turn_count"]

    if is_initial:
        return "initial_diagnosis"

    if exam and emotion == "stress":
        return "exam_panic_support"

    if emotion in ("decouragement",) and turns == 0:
        return "emotional_reassurance"

    if emotion in ("decouragement", "fatigue") and encouragement:
        return "confidence_boost"

    if emotion == "frustration":
        if intent == "check_me":
            return "answer_correction"
        return "step_by_step"

    if foundations:
        return "foundation_rebuild"

    if intent == "give_answer":
        if autonomy <= 1 and confusion in ("high", "total"):
            return "step_by_step"
        return "fast_answer"

    if intent == "check_me":
        return "answer_correction"

    if intent == "give_hint":
        if readiness:
            return "micro_hint"
        return "step_by_step"

    if intent == "ask_foundation":
        return "foundation_rebuild"

    if intent == "image_only":
        return "initial_diagnosis" if turns <= 1 else "guided_thinking"

    if confusion == "total":
        return "simplification"

    if confusion == "high":
        if autonomy <= 1:
            return "concept_explanation"
        return "methodology_training"

    if confusion == "medium":
        if autonomy <= 1:
            return "concept_explanation"
        if autonomy == 2:
            return "step_by_step"
        if readiness:
            return "guided_thinking"
        return "micro_hint"

    if confusion in ("low", "none"):
        if intent == "explain_me":
            return "concept_explanation"
        if readiness and autonomy >= 3:
            return "student_attempt"
        if autonomy >= 3:
            return "guided_thinking"
        return "micro_hint"

    if emotion == "motivation":
        if readiness and autonomy >= 3:
            return "student_attempt"
        return "motivation_boost"

    return "concept_explanation"


# ══════════════════════════════════════════════════════════════════════════════
# 5. DIRECTIVE DE MODE (v7)
# ══════════════════════════════════════════════════════════════════════════════

def build_mode_directive(mode: str, profile: dict, language: str) -> str:
    """
    Traduit un mode pédagogique en instruction Gemini complète (v7).
    """
    emotion   = profile["emotional_state"]
    confusion = profile["confusion_level"]
    autonomy  = profile["autonomy_level"]
    exam      = profile["exam_pressure"]
    turns     = profile["turn_count"]

    DIRECTIVES = {

        "initial_diagnosis": """
MODE ACTIF : DIAGNOSTIC INITIAL
Une image d'exercice vient d'être envoyée. C'est le premier contact.

Comportement attendu :
• Accueil chaleureux (1 phrase max, humain, pas robotique).
• Identifie le sujet, le chapitre et ce que l'exercice demande.
• Détecte le TYPE de blocage probable : conceptuel ? méthodologique ? calcul ? énoncé incompris ?
• Pose UNE seule question ciblée et ouverte pour comprendre où exactement l'élève bloque.
• NE donne PAS la solution. NE commence PAS une explication non demandée.
• Si l'élève a accompagné l'image d'un texte, utilise-le pour affiner ta question.

Longueur : 2 messages max. Court et ouvert.
""",

        "foundation_rebuild": """
MODE ACTIF : RECONSTRUCTION DES BASES
L'élève n'a pas les prérequis pour aborder cet exercice directement.

Comportement attendu :
• NE commence PAS par l'exercice original.
• Identifie le concept fondamental MANQUANT et commence par là.
• Explique ce concept en partant de zéro avec un exemple ULTRA-SIMPLE, différent de l'exercice.
• Utilise une analogie concrète ou du quotidien si possible.
• Structure : [Concept de base] → [Exemple simple résolu] → [Question de vérification].
• Ton : enseignant patient. Jamais "c'est simple". Toujours "c'est normal de ne pas l'avoir vu encore".

Longueur : 3-4 messages progressifs.
""",

        "concept_explanation": """
MODE ACTIF : EXPLICATION DE CONCEPT
L'élève comprend mal le concept central lié à cet exercice.

Comportement attendu :
• Identifie LE concept clé qui débloquerait cet exercice.
• Explique-le en 2-3 idées simples et logiques.
• Donne UN exemple concret résolu (différent de l'exercice original).
• Connecte explicitement à l'exercice.
• Fin : "Tu vois la logique ? Dis-moi si quelque chose reste flou."
• Style conversationnel — pas une liste formelle, pas de titres.

Longueur : 3 messages max.
""",

        "methodology_training": """
MODE ACTIF : ENTRAÎNEMENT MÉTHODOLOGIQUE
L'élève a les bases mais ne sait pas appliquer la méthode de résolution.

Comportement attendu :
• Explique LA MÉTHODE générale pour ce type d'exercice, étape par étape.
• Formule la méthode comme un processus réutilisable.
• Applique partiellement la méthode à l'exercice — laisse une étape à faire.
• Invite à finir : "Maintenant applique ça à ton exercice, dis-moi ce que tu trouves."

Longueur : 3-4 messages.
""",

        "step_by_step": """
MODE ACTIF : GUIDAGE PAS À PAS
L'élève est bloqué à une étape précise.

Comportement attendu :
• NE donne PAS la réponse finale ni toute la résolution.
• Identifie L'ÉTAPE SUIVANTE logique et guide vers elle uniquement.
• Explique pourquoi cette étape est nécessaire.
• Formule une invitation active : "Essaie cette partie, dis-moi ce que tu trouves."

Longueur : 2 messages max. Ciblé et actionnable.
""",

        "micro_hint": """
MODE ACTIF : MINI-INDICE
L'élève est presque là — un seul coup de pouce suffit.

Comportement attendu :
• Donne UN seul indice, précis, court. Un seul. Pas deux.
• Ne révèle pas la méthode complète.
• Puis silence — laisse l'élève tenter.

Longueur : 1-2 messages.
""",

        "guided_thinking": """
MODE ACTIF : PENSÉE GUIDÉE (Socratique)
L'élève a les capacités — aide-le/la à trouver par lui/elle-même.

Comportement attendu :
• NE réponds PAS directement. Pose des questions qui guident la réflexion.
• Maximum 2 questions par message. Jamais 3.
• Ton : encourageant, "tu es sur la bonne voie".

Longueur : 1-2 messages.
""",

        "student_attempt": """
MODE ACTIF : INVITATION À TENTER
L'élève est prêt(e) — encourage-le/la à tenter par lui/elle-même.

Comportement attendu :
• Formule clairement l'invitation à tenter.
• Donne éventuellement UNE piste de départ très courte.
• "Vas-y, écris ta tentative — tu n'as rien à perdre."

Longueur : 1-2 messages max.
""",

        "answer_correction": """
MODE ACTIF : CORRECTION BIENVEILLANTE
L'élève a soumis une tentative.

Comportement attendu :
• Commence TOUJOURS par identifier CE QUI EST CORRECT.
• Identifie L'ERREUR PRÉCISE — jamais "c'est faux" direct.
• Montre la correction pas à pas.
• Fin : "Tu vois la différence ?"
• Jamais de jugement.

Longueur : 3-4 messages progressifs.
""",

        "fast_answer": """
MODE ACTIF : RÉPONSE DIRECTE
L'élève demande explicitement la solution — respecte sa demande.

Comportement attendu :
• Donne la solution COMPLÈTE, expliquée étape par étape.
• Ne cache pas la réponse.
• Explique le POURQUOI de chaque étape.
• Fin : "Tu veux que j'explique pourquoi on a fait [étape X] ?"

Longueur : 3-4 messages clairs et complets.
""",

        "simplification": """
MODE ACTIF : SIMPLIFICATION MAXIMALE
L'élève est totalement perdu(e) — repartons de zéro ensemble.

Comportement attendu :
• Commence par : "Ok, on repart de zéro ensemble — pas de pression du tout."
• OUBLIE l'exercice original temporairement.
• Réduis à 1 seul concept fondamental, 1 seul exemple ultra-simple.
• Ne surcharge jamais — maximum 1 idée par message.

Longueur : 3 messages max.
""",

        "confidence_boost": """
MODE ACTIF : RENFORCEMENT DE CONFIANCE
L'élève est découragé(e), fatigué(e) ou perd confiance.

Comportement attendu :
• Commence par reconnaître l'état émotionnel — sincèrement, en 1 phrase courte.
• Valorise le fait qu'il/elle cherche de l'aide.
• Propose UNE micro-tâche très accessible pour redonner confiance.
• Jamais : "c'est pourtant simple", "c'est facile".

Longueur : 2-3 messages max.
""",

        "emotional_reassurance": """
MODE ACTIF : RÉASSURANCE ÉMOTIONNELLE
Urgence émotionnelle — l'élève est en détresse avant même de poser sa question.

Comportement attendu :
• Premier message : uniquement émotionnel. Reconnaître. Valider. Aucune pédagogie encore.
• Deuxième message : proposer de commencer ENSEMBLE par le plus petit pas possible.
• NE commence PAS à expliquer l'exercice dans ce mode.

Longueur : 2 messages maximum.
""",

        "exam_panic_support": """
MODE ACTIF : SUPPORT URGENCE EXAMEN
L'élève panique car l'examen est imminent.

Comportement attendu :
• Message 1 : UNE phrase de régulation émotionnelle (calme, honnête).
• Message 2 : priorise les 2-3 points les plus probables à l'examen.
• Message 3 : donne la méthode express pour CE type d'exercice.
• Ton : calme mais efficace. Honnête.

Longueur : 3-4 messages courts et actionnables.
""",

        "motivation_boost": """
MODE ACTIF : BOOST DE MOTIVATION
L'élève progresse — maintiens et amplifie l'élan.

Comportement attendu :
• Célèbre le progrès sincèrement — connecte à l'effort fourni, pas à une capacité innée.
• Propose la prochaine étape logique avec enthousiasme mesuré.
• Donne un mini-défi légèrement plus avancé si approprié.

Longueur : 2 messages.
""",
    }

    base = DIRECTIVES.get(mode, DIRECTIVES["concept_explanation"])

    # ── Ajustements contextuels ──
    addons = []

    if emotion == "stress" and mode not in ("exam_panic_support", "emotional_reassurance"):
        addons.append(
            "⚠️ STRESS DÉTECTÉ : chaque message doit commencer par une note calme. "
            "Raccourcis les explications. Évite toute formulation qui ajoute de la pression."
        )
    if emotion == "fatigue" and mode not in ("confidence_boost", "emotional_reassurance"):
        addons.append(
            "⚠️ FATIGUE DÉTECTÉE : messages très courts, maximum 2 lignes chacun."
        )
    if confusion == "total" and mode not in ("simplification", "foundation_rebuild", "confidence_boost", "emotional_reassurance"):
        addons.append(
            "⚠️ CONFUSION TOTALE : simplifie au maximum même dans ce mode. 1 idée par message."
        )
    if autonomy >= 3 and mode in ("concept_explanation", "methodology_training", "step_by_step"):
        addons.append(
            "⚠️ ÉLÈVE AUTONOME : guide plutôt qu'enseigne — questions plutôt que cours magistral."
        )
    if exam and mode not in ("exam_panic_support",):
        addons.append(
            "⚠️ EXAMEN PROCHE : priorise l'essentiel et ce qui est fréquemment demandé."
        )

    if addons:
        base += "\n\nAJUSTEMENTS CONTEXTUELS OBLIGATOIRES :\n" + "\n".join(addons)

    return base


# ══════════════════════════════════════════════════════════════════════════════
# 6. BRANDING IQRA CONTEXTUEL (v7)
# ══════════════════════════════════════════════════════════════════════════════

def build_iqra_context(mode: str, profile: dict, exercise_info: dict) -> str:
    """
    Génère l'instruction de branding IQRA adaptée au contexte (v7).
    """
    emotion  = profile["emotional_state"]
    exam     = profile["exam_pressure"]
    autonomy = profile["autonomy_level"]
    sujet    = exercise_info.get("sujet", "")
    chapitre = exercise_info.get("chapitre", "")

    if emotion in ("decouragement", "fatigue"):
        iqra_angle = (
            "angle émotionnel : IQRA comme compagnon qui ne juge pas. "
            "Ex : 'Beaucoup d'élèves sur IQRA passent par exactement ce moment — "
            "c'est pour ça que la plateforme est pensée pour avancer à ton rythme.'"
        )
    elif emotion == "stress" or exam:
        iqra_angle = (
            "angle urgence : IQRA comme ressource express. "
            f"Ex : 'Pour {chapitre or 'ce chapitre'}, IQRA a des vidéos de moins de 5 min "
            "qui vont direct à l'essentiel — parfait pour ce soir.'"
        )
    elif mode in ("foundation_rebuild", "concept_explanation"):
        iqra_angle = (
            "angle pédagogique : IQRA comme continuation naturelle. "
            f"Ex : 'Ce type de confusion sur {sujet or 'ce point'} est très courant — "
            "c'est exactement pour ça qu'IQRA découpe ça en micro-étapes.'"
        )
    elif mode in ("student_attempt", "motivation_boost"):
        iqra_angle = (
            "angle progression : IQRA comme espace d'entraînement. "
            "Ex : 'Si tu veux t'entraîner davantage, IQRA a des séries progressives avec correction automatique.'"
        )
    elif autonomy >= 3:
        iqra_angle = (
            "angle excellence : IQRA pour aller plus loin. "
            "Ex : 'Vu ton niveau, les exercices avancés IQRA sur ce chapitre seraient un bon défi.'"
        )
    else:
        iqra_angle = (
            "angle général bienveillant : mentionner naturellement que IQRA "
            "accompagne beaucoup d'élèves sur ce type de problème, sans forcer."
        )

    return f"""RÈGLES IQRA — BRANDING CONTEXTUEL NATUREL
Maximum 1 mention IQRA par réponse, EN DERNIER dans "messages", UNIQUEMENT si elle apporte une vraie valeur ajoutée.
Si le contexte ne s'y prête pas naturellement, ne mentionne pas IQRA du tout.

Angle à utiliser : {iqra_angle}

✅ Exemples de formulations acceptables :
   "Beaucoup d'élèves sur IQRA bloquent exactement ici au début — tu n'es pas seul(e)."
   "Ce genre de confusion, c'est pour ça qu'IQRA a des vidéos courtes sur ce chapitre précis."
   "Si tu veux t'entraîner après, IQRA a des exercices progressifs sur ce point."

❌ INTERDIT :
   "IQRA est la meilleure plateforme"
   "Rejoins IQRA maintenant"
   Toute formulation publicitaire ou générique
   Mentions répétées dans la même session si non pertinent"""


# ══════════════════════════════════════════════════════════════════════════════
# 7. FONCTION PRINCIPALE — TUTEUR ADAPTATIF v7
# ══════════════════════════════════════════════════════════════════════════════

def analyze_exercise_image(
    images_data,
    niveau,
    matiere,
    description="",
    history=None,
    analysis_count=0,
    language="fr",
    student_state=None,
    # Paramètres legacy conservés pour compatibilité Django views.py
    conversation_stage=None,
    help_level=1,
    turn_in_stage=0,
):
    """
    Tuteur pédagogique adaptatif v7.

    Architecture :
        detect_language()          → langue réelle du message
        profile_student()          → profil dynamique complet
        select_pedagogical_mode()  → mode optimal sans stage forcé
        build_mode_directive()     → instruction Gemini pour ce mode
        build_iqra_context()       → branding naturel contextuel
        Gemini Vision (si images)  → analyse visuelle de l'exercice
        RAG ChromaDB               → contexte pédagogique pertinent
        Prompt final               → réponse multi-messages naturelle

    Paramètres :
        images_data    : list[str] base64 | [] pour chat pur
        niveau         : niveau scolaire de l'élève
        matiere        : matière concernée
        description    : message texte de l'élève (peut être vide)
        history        : list[dict] — historique de session
        analysis_count : index du tour courant (0 = premier)
        language       : préférence langue (overridée par détection réelle)
        student_state  : dict persistant entre les tours

    Retourne : str — JSON valide avec "messages", "suggestions", et métadonnées
    """
    import PIL.Image
    import io
    import base64

    # ── Normalisation des entrées ──
    if history is None:
        history = []
    if student_state is None:
        student_state = {}
    images_data = images_data or []
    description = (description or "").strip()
    niveau      = (niveau or "").strip()
    matiere     = (matiere or "").strip()

    # ══════════════════════════════════════════
    # ÉTAPE 1 — DÉTECTION LANGUE RÉELLE
    # Priorité : message élève > historique > paramètre language
    # ══════════════════════════════════════════
    if description and len(description) > 4:
        response_language = detect_language(description)
    elif student_state.get("response_language"):
        response_language = student_state["response_language"]
    else:
        for h in reversed(history):
            if isinstance(h, dict) and h.get("response_language"):
                response_language = h["response_language"]
                break
        else:
            response_language = language or "fr"

    lang_instruction = get_language_instruction(response_language)

    # ══════════════════════════════════════════
    # ÉTAPE 2 — ANALYSE VISUELLE (si images fournies)
    # ══════════════════════════════════════════
    exercise_info = student_state.get("exercise_info") or {}
    pil_images    = []
    is_initial    = len(images_data) > 0 and analysis_count == 0

    if images_data:
        for img_b64 in images_data:
            try:
                img_bytes = base64.b64decode(img_b64)
                pil_images.append(PIL.Image.open(io.BytesIO(img_bytes)))
            except Exception:
                continue

        if pil_images:
            vision_prompt = (
                "Analyse ces images d'exercice scolaire marocain.\n"
                "Réponds UNIQUEMENT en JSON avec des valeurs en français :\n"
                "{\n"
                '  "sujet": "sujet précis de l\'exercice",\n'
                '  "chapitre": "chapitre du programme marocain officiel",\n'
                '  "difficulte": "facile | moyen | difficile",\n'
                '  "langue_exercice": "fr | ar | fr_ar",\n'
                '  "type_blocage_probable": "conceptuel | calcul | methodologie | enonce | inconnue",\n'
                '  "elements_cles": "formules, données, schémas visibles — 1 ligne",\n'
                '  "prerequis": "prérequis indispensables pour résoudre — 1 ligne"\n'
                "}\n"
                "JSON uniquement, sans markdown, sans texte autour."
            )

            try:
                vision_response = model.generate_content([vision_prompt] + pil_images)
                vision_raw = vision_response.text.strip()

                if vision_raw.startswith("```"):
                    parts = vision_raw.split("```")
                    vision_raw = parts[1] if len(parts) > 1 else vision_raw
                    if vision_raw.startswith("json"):
                        vision_raw = vision_raw[4:]
                vision_raw = vision_raw.strip()

                exercise_info = json.loads(vision_raw)
            except Exception:
                exercise_info = {
                    "sujet": matiere or "Exercice",
                    "chapitre": "",
                    "difficulte": "moyen",
                    "langue_exercice": "fr",
                    "type_blocage_probable": "inconnue",
                    "elements_cles": "",
                    "prerequis": "",
                }

            if not description and exercise_info.get("langue_exercice") == "ar":
                response_language = "ar"
                lang_instruction  = get_language_instruction("ar")

    else:
        if not exercise_info:
            for h in history:
                if isinstance(h, dict) and h.get("exercise_info"):
                    exercise_info = h["exercise_info"]
                    break
            if not exercise_info:
                exercise_info = {
                    "sujet": matiere or "exercice",
                    "chapitre": "",
                    "difficulte": "moyen",
                    "langue_exercice": "fr",
                    "type_blocage_probable": "inconnue",
                    "elements_cles": "",
                    "prerequis": "",
                }

    # ══════════════════════════════════════════
    # ÉTAPE 3 — RAG — contexte pédagogique
    # ══════════════════════════════════════════
    query_parts = [matiere]
    if exercise_info.get("chapitre"):
        query_parts.append(exercise_info["chapitre"])
    if exercise_info.get("sujet"):
        query_parts.append(exercise_info["sujet"])
    if exercise_info.get("prerequis"):
        query_parts.append(exercise_info["prerequis"])
    if description:
        words = [w for w in description.split() if len(w) > 3][:10]
        query_parts.extend(words)

    query_text      = " ".join(query_parts)[:300]
    question_vector = embedder.encode(query_text).tolist()

    conditions = []
    if niveau and niveau not in ("Autre", ""):
        conditions.append({"niveau": {"$eq": niveau}})
    if matiere:
        conditions.append({"matiere": {"$eq": matiere}})

    if not conditions:
        where_filter = None
    elif len(conditions) == 1:
        where_filter = conditions[0]
    else:
        where_filter = {"$and": conditions}

    query_params = {
        "query_embeddings": [question_vector],
        "n_results": 4,
        "include": ["documents"],
    }
    if where_filter:
        query_params["where"] = where_filter

    try:
        rag_results = collection.query(**query_params)
        rag_chunks  = rag_results["documents"][0]
        rag_context = "\n\n".join(c for c in rag_chunks if c.strip())
    except Exception:
        rag_context = ""

    # ══════════════════════════════════════════
    # ÉTAPE 4 — PROFILING ÉLÈVE
    # ══════════════════════════════════════════
    student_profile = profile_student(
        description=description,
        history=history,
        student_state=student_state,
        exercise_info=exercise_info,
    )

    # ══════════════════════════════════════════
    # ÉTAPE 5 — MODE PÉDAGOGIQUE
    # ══════════════════════════════════════════
    pedagogical_mode = select_pedagogical_mode(student_profile, is_initial=is_initial)
    mode_directive   = build_mode_directive(pedagogical_mode, student_profile, response_language)
    iqra_context     = build_iqra_context(pedagogical_mode, student_profile, exercise_info)

    # ══════════════════════════════════════════
    # ÉTAPE 6 — HISTORIQUE (8 derniers tours)
    # ══════════════════════════════════════════
    history_lines = []
    for h in history[-8:]:
        if not isinstance(h, dict):
            continue
        if h.get("description"):
            history_lines.append(f"Élève : {h['description']}")
        if h.get("reply_preview"):
            history_lines.append(f"Tuteur : {h['reply_preview']}")
    history_text = "\n".join(history_lines) if history_lines else "Première interaction de la session."

    # ══════════════════════════════════════════
    # ÉTAPE 7 — VARIABLES LOCALES POUR LE PROMPT
    # (évite les f-string complexes avec .get() imbriqués → SyntaxError Python 3.11+)
    # ══════════════════════════════════════════
    ex_sujet      = exercise_info.get("sujet")      or matiere or "exercice"
    ex_chapitre   = exercise_info.get("chapitre")   or "non détecté"
    ex_difficulte = exercise_info.get("difficulte") or "moyen"
    ex_blocage    = exercise_info.get("type_blocage_probable") or "inconnue"
    ex_elements   = exercise_info.get("elements_cles") or ""
    ex_prerequis  = exercise_info.get("prerequis")  or ""

    profil_emotion    = student_profile["emotional_state"]
    profil_confusion  = student_profile["confusion_level"]
    profil_intent     = student_profile["intent"]
    profil_autonomy   = student_profile["autonomy_level"]
    profil_readiness  = "oui" if student_profile["readiness_to_attempt"] else "non"
    profil_foundations = "oui" if student_profile["missing_foundations"] else "non"
    profil_encourage  = "oui" if student_profile["needs_encouragement"] else "non"
    profil_exam       = "oui" if student_profile["exam_pressure"] else "non"
    profil_turns      = student_profile["turn_count"] + 1

    description_display = description if description else "(image envoyée sans texte)"
    rag_display  = rag_context[:1800] if rag_context else "(aucun cours trouvé pour ce niveau/matière)"
    context_note = "Utilise ce contexte pour des explications précises et référencées." if rag_context else "Base-toi sur le programme marocain officiel."

    # ══════════════════════════════════════════
    # PROMPT FINAL
    # ══════════════════════════════════════════
    prompt = f"""Tu es le tuteur pédagogique IA de IQRA — plateforme éducative marocaine moderne.
Tu parles directement à un élève de {niveau} en {matiere}.

Tu n'es PAS ChatGPT. Tu n'es PAS une encyclopédie.
Tu es un vrai coach humain : tu t'adaptes, tu ressens, tu accompagnes.
Tu ne suis AUCUN workflow prédéfini — tu réagis à ce que l'élève a vraiment besoin maintenant.

════════════════════════════════════════════
LANGUE — RÈGLE ABSOLUE — AUCUNE EXCEPTION
════════════════════════════════════════════
{lang_instruction}

Chaque string dans le tableau "messages" et dans "suggestions" doit être
ENTIÈREMENT dans cette langue. Zéro mélange. Zéro exception.

════════════════════════════════════════════
RÈGLES DE FORMAT — NON NÉGOCIABLES
════════════════════════════════════════════
1. Ta réponse = plusieurs messages COURTS dans un tableau JSON "messages".
2. Chaque message = 1 seule idée. Maximum 3 lignes par message.
3. JAMAIS de longs paragraphes dans un message.
4. JAMAIS de listes numérotées formelles (1. 2. 3.) dans un message.
5. JAMAIS de titres en gras (**Titre**) dans les messages.
6. Style naturel, conversationnel — pas un cours scolaire, pas un rapport.
7. Utilise "tu" — ton chaleureux, humain, coach.
8. Maximum 4 messages par réponse. Minimum 1.
9. Si IQRA est mentionné, ce message est TOUJOURS le dernier.

════════════════════════════════════════════
CONTEXTE EXERCICE
════════════════════════════════════════════
Matière      : {matiere}
Niveau       : {niveau}
Sujet        : {ex_sujet}
Chapitre     : {ex_chapitre}
Difficulté   : {ex_difficulte}
Type blocage : {ex_blocage}
Éléments clés : {ex_elements}
Prérequis    : {ex_prerequis}
Message élève : {description_display}

════════════════════════════════════════════
PROFIL DYNAMIQUE DE L'ÉLÈVE
════════════════════════════════════════════
État émotionnel       : {profil_emotion}
Niveau de confusion   : {profil_confusion}
Intention détectée    : {profil_intent}
Autonomie (0-4)       : {profil_autonomy}
Prêt(e) à tenter      : {profil_readiness}
Bases manquantes      : {profil_foundations}
Besoin encouragement  : {profil_encourage}
Pression examen       : {profil_exam}
Tour numéro           : {profil_turns}

════════════════════════════════════════════
MODE PÉDAGOGIQUE ACTIF : {pedagogical_mode.upper()}
════════════════════════════════════════════
{mode_directive}

════════════════════════════════════════════
BASE DE COURS IQRA (RAG)
════════════════════════════════════════════
{context_note}
{rag_display}

════════════════════════════════════════════
HISTORIQUE CONVERSATION
════════════════════════════════════════════
{history_text}

════════════════════════════════════════════
{iqra_context}

════════════════════════════════════════════
SUGGESTIONS DE SUIVI
════════════════════════════════════════════
Génère 3 suggestions courtes, cliquables, dans la langue imposée.
Adapte-les au mode pédagogique et à ce que l'élève pourrait vouloir dire ensuite.
Exemples selon mode :
- guided_thinking → "Je pense que c'est X, c'est juste ?"
- micro_hint → "Donne-moi un autre indice"
- student_attempt → "Voilà ma tentative : ..."
- answer_correction → "Je comprends l'erreur, je réessaie"
- foundation_rebuild → "Ok, j'ai compris, on revient à l'exercice ?"

════════════════════════════════════════════
FORMAT JSON — OBLIGATOIRE ET STRICT
Réponds UNIQUEMENT avec ce JSON valide.
Sans markdown. Sans texte avant. Sans texte après.
════════════════════════════════════════════
{{
  "messages": [
    "Message 1 — une seule idée, dans la langue imposée",
    "Message 2 — si nécessaire (max 3 lignes)",
    "Message 3 — si nécessaire",
    "Message 4 — si IQRA mentionné, toujours en dernier"
  ],
  "suggestions": [
    "Suggestion 1 — courte, dans la langue imposée",
    "Suggestion 2 — courte, dans la langue imposée",
    "Suggestion 3 — courte, dans la langue imposée"
  ],
  "pedagogical_mode": "{pedagogical_mode}",
  "emotional_state": "{profil_emotion}",
  "autonomy_level": {profil_autonomy},
  "readiness_to_attempt": {str(student_profile["readiness_to_attempt"]).lower()},
  "response_language": "{response_language}",
  "exercise_info": {{
    "sujet": "{ex_sujet}",
    "chapitre": "{ex_chapitre}",
    "difficulte": "{ex_difficulte}",
    "type_blocage": "{ex_blocage}"
  }}
}}"""

    # ══════════════════════════════════════════
    # GÉNÉRATION
    # ══════════════════════════════════════════
    if pil_images:
        response = model.generate_content([prompt] + pil_images)
    else:
        response = model.generate_content(prompt)

    raw = response.text.strip()

    # ── Nettoyage markdown si Gemini l'ajoute ──
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1] if len(parts) > 1 else raw
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    # ── Validation JSON + fallback sécurisé ──
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed.get("messages"), list) or not parsed["messages"]:
            parsed["messages"] = ["Je suis là, dis-moi comment je peux t'aider."]
        if not isinstance(parsed.get("suggestions"), list):
            parsed["suggestions"] = []
        if "response_language" not in parsed:
            parsed["response_language"] = response_language
        if "exercise_info" not in parsed:
            parsed["exercise_info"] = {
                "sujet": ex_sujet,
                "chapitre": ex_chapitre,
                "difficulte": ex_difficulte,
                "type_blocage": ex_blocage,
            }
        return json.dumps(parsed, ensure_ascii=False)

    except json.JSONDecodeError:
        fallback = {
            "messages": [raw[:500] if raw else "Je suis là, dis-moi comment je peux t'aider."],
            "suggestions": [],
            "pedagogical_mode": pedagogical_mode,
            "emotional_state": profil_emotion,
            "autonomy_level": profil_autonomy,
            "readiness_to_attempt": student_profile["readiness_to_attempt"],
            "response_language": response_language,
            "exercise_info": {
                "sujet": ex_sujet,
                "chapitre": ex_chapitre,
                "difficulte": ex_difficulte,
                "type_blocage": ex_blocage,
            },
        }
        return json.dumps(fallback, ensure_ascii=False)

# ============================================================
# FONCTIONNALITÉ 3 — Career Advisor — Génération des questions
# ============================================================

def generate_orientation_questions(niveau: str, filiere: str = "", description: str = "") -> list:
    """
    Génère 12 questions d'orientation complètes via RAG (base psycho) + Gemini.
    Toutes les questions sont dynamiques — aucune n'est codée en dur.
    Retourne une liste de dicts : [{ "id": "Q1", "texte": "..." }, ...]
    """
    import google.generativeai as genai
    import os, json, re

    genai.configure(api_key=GEMINI_API_KEY) 
    # --- 1. RAG : rechercher les dimensions psycho adaptées au profil ---
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    context_psycho = ""
    try:
        collection_psycho = client.get_collection("psycho")
        query_text = f"questions orientation élève {niveau} {filiere} blocages estime de soi peur échec forces cachées"
        results = collection_psycho.query(query_texts=[query_text], n_results=6)
        docs = results.get("documents", [[]])[0]
        context_psycho = "\n\n".join(docs)
    except Exception as e:
        print(f"[RAG psycho] collection introuvable ou vide : {e}")
        context_psycho = """
        Dimensions psychologiques clés pour l'orientation :
        - Flow et intérêts profonds (perte de notion du temps dans une activité)
        - Estime de soi et comparaison sociale avec les pairs
        - Peur de l'échec vs capacité réelle (blocages émotionnels)
        - Forces perçues par l'entourage vs auto-perception de l'élève
        - Croyances limitantes liées au système scolaire marocain
        - Pression familiale et attentes sociales
        - Style d'apprentissage et environnement de travail préféré
        - Compétences pratiques autodidactes non reconnues scolairement
        - Motivation intrinsèque vs motivation externe
        - Gestion de l'échec et résilience
        """

    # --- 2. Construire le prompt Gemini ---
    profil_desc = f"""
Profil de l'élève :
- Niveau scolaire : {niveau}
- Filière : {filiere if filiere else "non précisée"}
- Description libre : {description if description else "non fournie"}
"""

    prompt = f"""
Tu es un conseiller d'orientation expert en psychologie de l'adolescent et en système éducatif marocain.

{profil_desc}

Connaissances psychologiques de référence (issues de notre base documentaire) :
{context_psycho}

Ta mission : générer exactement 12 questions d'orientation personnalisées pour cet élève.

Ces 12 questions doivent couvrir ces thématiques dans cet ordre :
1. Matières scolaires : dans lesquelles il se sent à l'aise, lesquelles lui donnent envie d'abandonner
2. Style d'apprentissage : comment il préfère apprendre (lire, voir, pratiquer, discuter)
3. Projet personnel ou scolaire volontaire : quelque chose fait sans obligation
4. Avenir et pression : idées sur l'avenir, leur origine (lui-même, famille, entourage)
5. Compétences pratiques autodidactes : hors cours, ce qu'il sait faire seul
6. Environnement de travail idéal : seul, en équipe, cadre précis ou exploration libre
7. Contraintes réelles : ville, budget, famille, langue d'enseignement
8. Flow et absorption profonde : moment où il perd la notion du temps dans une activité
9. Estime de soi et comparaison sociale : comment il se perçoit par rapport aux autres
10. Forces perçues vs auto-perception : ce que son entourage dit de lui vs ce qu'il pense
11. Blocages émotionnels : peur, croyances limitantes, ce qui l'empêche d'avancer
12. Message libre : ce qu'il voudrait que le conseiller sache sur lui

RÈGLES ABSOLUES :
- Chaque question doit partir d'une SITUATION CONCRÈTE VÉCUE, jamais abstraite
- Ton chaleureux, bienveillant, non-jugeant, psychologiquement sécurisant
- JAMAIS de QCM — uniquement des questions ouvertes (réponses textarea)
- JAMAIS de question abstraite comme "Quel est ton talent ?"
- Adapter le vocabulaire et les exemples au niveau "{niveau}" et à la filière "{filiere if filiere else 'générale'}"
- Si la description contient des signaux (auto-dépréciation, peur, timidité), adapter certaines questions pour y répondre avec bienveillance
- La question 12 est toujours une invitation à un message libre

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après.
Format exact :
{{
  "questions": [
    {{"id": "Q1", "texte": "..."}},
    {{"id": "Q2", "texte": "..."}},
    {{"id": "Q3", "texte": "..."}},
    {{"id": "Q4", "texte": "..."}},
    {{"id": "Q5", "texte": "..."}},
    {{"id": "Q6", "texte": "..."}},
    {{"id": "Q7", "texte": "..."}},
    {{"id": "Q8", "texte": "..."}},
    {{"id": "Q9", "texte": "..."}},
    {{"id": "Q10", "texte": "..."}},
    {{"id": "Q11", "texte": "..."}},
    {{"id": "Q12", "texte": "..."}}
  ]
}}
"""

    # --- 3. Appel Gemini ---
    model = genai.GenerativeModel("gemini-3-flash-preview")
    response = model.generate_content(prompt)
    raw = response.text.strip()

    # --- 4. Nettoyage et parsing JSON ---
    raw = re.sub(r"```json", "", raw)
    raw = re.sub(r"```", "", raw)
    raw = raw.strip()

    parsed = json.loads(raw)
    questions = parsed.get("questions", [])

    # Vérification minimale : on doit avoir 12 questions
    if len(questions) < 12:
        raise ValueError(f"Gemini a retourné seulement {len(questions)} questions au lieu de 12")

    return questions


def analyze_orientation(contexte_amorce: dict, reponses: list) -> dict:
    """
    Analyse psycho-pédagogique complète + scoring filières.
    Retourne un dict structuré prêt pour le frontend.
    """



    niveau      = contexte_amorce.get("niveau", "")
    filiere     = contexte_amorce.get("filiere", "")
    description = contexte_amorce.get("description", "")

    # --- 1. RAG : contexte psycho + filières marocaines ---
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    context_psycho = ""
    context_ecole  = ""

    try:
        col = client.get_collection("career_knowledge")

        res_p = col.query(
            query_texts=[f"profil psychologique orientation forces blocages estime de soi {niveau}"],
            n_results=5,
            where={"category": "psyco"}
        )
        context_psycho = "\n\n".join(res_p.get("documents", [[]])[0])

        res_e = col.query(
            query_texts=[f"filières études supérieures Maroc universités établissements {niveau} {filiere}"],
            n_results=5,
            where={"category": "ecole"}
        )
        context_ecole = "\n\n".join(res_e.get("documents", [[]])[0])

    except Exception as e:
        print(f"[RAG analyze_orientation] erreur : {e}")
        context_psycho = "Curiosité intellectuelle, résilience, estime de soi, motivation intrinsèque, peur de l'échec."
        context_ecole  = "CPGE, Médecine, ENSA, ENCG, Faculté des Sciences, FSJES, Faculté des Lettres, IUT, écoles privées."

    # --- 2. Construire le texte des réponses ---
    reponses_text = ""
    for r in reponses:
        reponses_text += f"\n[{r.get('question_id','?')}] {r.get('question','')}\n→ {r.get('reponse','(vide)')}\n"

    # --- 3. Prompt Gemini ---
    prompt = f"""
Tu es un conseiller d'orientation expert en psychologie adolescente et en système éducatif marocain.

PROFIL DE L'ÉLÈVE :
- Niveau : {niveau}
- Filière actuelle : {filiere if filiere else "non précisée"}
- Description libre : {description if description else "non fournie"}

RÉPONSES AU QUESTIONNAIRE :
{reponses_text}

CONNAISSANCES PSYCHOLOGIQUES (base documentaire IQRA) :
{context_psycho}

RÉALITÉS DES FILIÈRES AU MAROC (base documentaire IQRA) :
{context_ecole}

INSTRUCTIONS :
1. Analyse profondément les réponses — cherche les forces cachées même si l'élève ne les voit pas
2. Identifie les croyances limitantes avec bienveillance (jamais de jugement)
3. Sépare toujours la PEUR de la CAPACITÉ RÉELLE
4. Génère exactement 3 filières dans top_filieres avec des explications concrètes et des réalités marocaines précises
5. Dans scores_radar, inclure entre 5 et 8 filières (pas seulement les top 3)
6. Dans dimensions_psycho, inclure entre 5 et 8 dimensions avec des scores entre 0 et 100
7. Les messages doivent être personnalisés, chaleureux, jamais génériques

FILIÈRES À CONSIDÉRER selon le profil :
- Scientifiques : CPGE Maths/PC/Bio, Médecine/Pharmacie/Dentaire, ENSA, ENSAM, Faculté des Sciences, ENCG
- Littéraires : Faculté des Lettres, Sciences de l'Éducation, Journalisme/Communication, Droit, Sciences Humaines
- Économiques/Gestion : ENCG, FSJES, ISCAE, HEM, Écoles de commerce, Finance/Comptabilité
- Général : IUT, Formations professionnelles, Écoles privées spécialisées

RÈGLES ABSOLUES :
- Ne jamais écrire "Tu peux tout faire si tu le veux"
- Toujours expliquer le POURQUOI de chaque recommandation
- Les réalités_maroc doivent mentionner : concours, durée études, débouchés concrets
- Si l'élève se minimise mais montre des compétences → les nommer explicitement dans forces_cachees
- peur_echec dans dimensions_psycho doit être en orange (c'est un signal d'attention, pas un atout)

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après.
Format exact :
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
      "defi_personnel": "..."
    }},
    {{
      "filiere": "...",
      "score": 72,
      "pourquoi": "...",
      "realites_maroc": "...",
      "defi_personnel": "..."
    }},
    {{
      "filiere": "...",
      "score": 65,
      "pourquoi": "...",
      "realites_maroc": "...",
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
    "creativite": 70,
    "peur_echec": 60
  }},
  "message_cloture": "..."
}}
"""

    model = genai.GenerativeModel("gemini-3-flash-preview")
    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Nettoyage JSON
    raw = re.sub(r"```json", "", raw)
    raw = re.sub(r"```", "", raw)
    raw = raw.strip()

    result = json.loads(raw)
    return result