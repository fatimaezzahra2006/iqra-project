# iqra_backend/api/views.py
# Version 7 — Intègre les nouvelles fonctions F1 v2 :
#   - generate_motivation_questions  → POST /api/motivation-questions/
#   - generate_progressive_quiz      → POST /api/progressive-quiz/
#   - analyze_psycho_profile         → POST /api/psycho-profile/
#   - generate_study_plan v2         → POST /api/study-plan/ (étendu avec psycho_profile, scores_progressifs, reponses_motivation)

import os
import sys
import json
import uuid

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

# ── Ajouter ai_engine au path SANS importer maintenant ──
AI_ENGINE_PATH = os.path.join(settings.BASE_DIR.parent.parent, 'ai_engine')
if AI_ENGINE_PATH not in sys.path:
    sys.path.insert(0, AI_ENGINE_PATH)


# ══════════════════════════════════════════
# HELPER — import lazy UNIQUE de rag_service
# ══════════════════════════════════════════

def get_rag():
    """
    Import lazy de toutes les fonctions de rag_service.
    Évite le circular import au démarrage Django.
    """
    from rag_service import (
        ask_rag,
        generate_quiz,
        generate_study_plan,
        generate_visual_explanation,
        generate_orientation_questions,
        analyze_orientation,
        generate_orientation_suggestion,
        # ── NOUVELLES FONCTIONS F1 v2 ──
        generate_motivation_questions,
        generate_progressive_quiz,
        analyze_psycho_profile,
    )
    return (
        ask_rag,
        generate_quiz,
        generate_study_plan,
        generate_visual_explanation,
        generate_orientation_questions,
        analyze_orientation,
        generate_orientation_suggestion,
        generate_motivation_questions,
        generate_progressive_quiz,
        analyze_psycho_profile,
    )


# ══════════════════════════════════════════
# HELPER — validation langue
# ══════════════════════════════════════════

SUPPORTED_LANGUAGES = {"fr", "ar", "darija"}

def resolve_language(data) -> str:
    lang = data.get("language", "fr")
    if lang not in SUPPORTED_LANGUAGES:
        lang = "fr"
    return lang


# ══════════════════════════════════════════
# PING
# GET /api/ping/
# ══════════════════════════════════════════

@api_view(['GET'])
def ping(request):
    return Response({
        "status":  "success",
        "message": "Django fonctionne !"
    })


# ══════════════════════════════════════════
# CHAT — RAG général
# POST /api/chat/
# ══════════════════════════════════════════

@api_view(['POST'])
def chat(request):
    try:
        ask_rag = get_rag()[0]

        data     = request.data
        question = data.get('question', None)
        niveau   = data.get('niveau', None)
        matiere  = data.get('matiere', None)
        type_doc = data.get('type_doc', None)
        language = resolve_language(data)

        if not question:
            return Response(
                {"error": "Le champ 'question' est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST
            )

        response = ask_rag(
            question=question,
            niveau=niveau,
            matiere=matiere,
            type_doc=type_doc,
            language=language,
        )

        return Response({
            "question": question,
            "response": response,
            "niveau":   niveau,
            "matiere":  matiere,
            "language": language,
        })

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ══════════════════════════════════════════
# QUIZ LEGACY — F1 (5 questions, compatibilité)
# POST /api/quiz/
# ══════════════════════════════════════════

@api_view(['POST'])
def quiz(request):
    try:
        generate_quiz = get_rag()[1]

        data      = request.data
        niveau    = data.get('niveau', '')
        matiere   = data.get('matiere', '')
        chapitres = data.get('chapitres', [])
        language  = resolve_language(data)

        if not niveau or not matiere or not chapitres:
            return Response(
                {"error": "niveau, matiere et chapitres sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST
            )

        quiz_raw   = generate_quiz(niveau=niveau, matiere=matiere, chapitre=chapitres[0], language=language)
        quiz_clean = quiz_raw.strip()
        if quiz_clean.startswith("```"):
            quiz_clean = quiz_clean.split("```")[1]
            if quiz_clean.startswith("json"):
                quiz_clean = quiz_clean[4:]
        quiz_data = json.loads(quiz_clean.strip())

        return Response({
            "quiz":      quiz_data,
            "niveau":    niveau,
            "matiere":   matiere,
            "chapitres": chapitres,
            "language":  language,
        })

    except json.JSONDecodeError as e:
        return Response(
            {"error": f"Erreur parsing JSON Gemini (quiz) : {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ══════════════════════════════════════════
# F1 v2 — MOTIVATION QUESTIONS
# POST /api/motivation-questions/
# ══════════════════════════════════════════

@api_view(['POST'])
def motivation_questions_view(request):
    """
    Phase 1 du nouveau flow F1 v2.
    Génère 3 questions motivationnelles personnalisées avant le quiz progressif.

    Payload :
      { niveau, matiere, chapitres, facteurs_psycho?, language? }

    Réponse :
      { questions: [{ id, question, type }] }
    """
    try:
        generate_motivation_questions = get_rag()[7]

        data            = request.data
        niveau          = data.get('niveau', '')
        matiere         = data.get('matiere', '')
        chapitres       = data.get('chapitres', [])
        facteurs_psycho = data.get('facteurs_psycho', [])
        language        = resolve_language(data)

        if not niveau or not matiere or not chapitres:
            return Response(
                {"error": "niveau, matiere et chapitres sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw     = generate_motivation_questions(
            niveau=niveau,
            matiere=matiere,
            chapitres=chapitres,
            facteurs_psycho=facteurs_psycho,
            language=language,
        )
        import re
        cleaned = re.sub(r"```json|```", "", raw.strip()).strip()
        questions = json.loads(cleaned)

        return Response({"questions": questions}, status=200)

    except json.JSONDecodeError as e:
        return Response({"error": f"Erreur parsing JSON (questions motivation) : {e}"}, status=500)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# ══════════════════════════════════════════
# F1 v2 — PROGRESSIVE QUIZ
# POST /api/progressive-quiz/
# ══════════════════════════════════════════

@api_view(['POST'])
def progressive_quiz_view(request):
    """
    Phase 3 du nouveau flow F1 v2.
    Génère un quiz à 3 niveaux (basic → medium → high) avec déverrouillage progressif.

    Payload :
      { niveau, matiere, chapitres, quiz_level ("basic"|"medium"|"high"), language? }

    Réponse :
      { level, level_label, n_questions, unlock_threshold, questions: [...] }
    """
    try:
        generate_progressive_quiz = get_rag()[8]

        data       = request.data
        niveau     = data.get('niveau', '')
        matiere    = data.get('matiere', '')
        chapitres  = data.get('chapitres', [])
        quiz_level = data.get('quiz_level', 'basic')
        language   = resolve_language(data)

        if not niveau or not matiere or not chapitres:
            return Response(
                {"error": "niveau, matiere et chapitres sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if quiz_level not in ('basic', 'medium', 'high'):
            quiz_level = 'basic'

        raw     = generate_progressive_quiz(
            niveau=niveau,
            matiere=matiere,
            chapitres=chapitres,
            quiz_level=quiz_level,
            language=language,
        )
        import re
        cleaned   = re.sub(r"```json|```", "", raw.strip()).strip()
        quiz_data = json.loads(cleaned)

        return Response(quiz_data, status=200)

    except json.JSONDecodeError as e:
        return Response({"error": f"Erreur parsing JSON (quiz progressif) : {e}"}, status=500)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# ══════════════════════════════════════════
# F1 v2 — PSYCHO PROFILE ANALYSIS
# POST /api/psycho-profile/
# ══════════════════════════════════════════

@api_view(['POST'])
def psycho_profile_view(request):
    """
    Phase 2 du nouveau flow F1 v2.
    Analyse les réponses motivationnelles + facteurs déclarés → profil psychologique structuré.

    Payload :
      {
        reponses_motivation: [{ id, question, reponse }],
        facteurs_declares: [],
        niveau: "",
        matiere: "",
        language?: ""
      }

    Réponse :
      {
        profil_dominant, facteurs_detectes, intensite,
        signaux_positifs, signaux_attention,
        recommandations_plan, message_personnalise
      }
    """
    try:
        analyze_psycho_profile = get_rag()[9]

        data                = request.data
        reponses_motivation = data.get('reponses_motivation', [])
        facteurs_declares   = data.get('facteurs_declares', [])
        niveau              = data.get('niveau', '')
        matiere             = data.get('matiere', '')
        language            = resolve_language(data)

        if not reponses_motivation and not facteurs_declares:
            return Response(
                {"error": "reponses_motivation ou facteurs_declares sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        raw     = analyze_psycho_profile(
            reponses_motivation=reponses_motivation,
            facteurs_declares=facteurs_declares,
            niveau=niveau,
            matiere=matiere,
            language=language,
        )
        import re
        cleaned  = re.sub(r"```json|```", "", raw.strip()).strip()
        profil   = json.loads(cleaned)

        return Response(profil, status=200)

    except json.JSONDecodeError as e:
        return Response({"error": f"Erreur parsing JSON (profil psycho) : {e}"}, status=500)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# ══════════════════════════════════════════
# STUDY PLAN — F1 v2 (étendu)
# POST /api/study-plan/
# ══════════════════════════════════════════

@api_view(['POST'])
def study_plan(request):
    """
    Génère le plan d'étude personnalisé — version v2 enrichie.

    Nouveaux paramètres optionnels (rétrocompatibles) :
      psycho_profile       — dict retourné par /api/psycho-profile/
      scores_progressifs   — { "basic": {"score": N, "total": N}, "medium": {...}, "high": {...} }
      reponses_motivation  — liste [{ id, question, reponse }]
    """
    try:
        generate_study_plan = get_rag()[2]

        data             = request.data
        niveau           = data.get('niveau', '')
        matiere          = data.get('matiere', '')
        chapitres        = data.get('chapitres', [])
        temps_disponible = data.get('temps_disponible', 5)
        score_quiz       = data.get('score_quiz', 0)
        profil_plan      = data.get('profil_plan', 'normal')
        niveau_auto      = data.get('niveau_auto', 'niveau1')
        facteurs_psycho  = data.get('facteurs_psycho', [])
        language         = resolve_language(data)

        # ── Nouveaux paramètres v2 (optionnels — rétrocompatibles) ──
        psycho_profile      = data.get('psycho_profile', None)       # dict ou None
        scores_progressifs  = data.get('scores_progressifs', {})     # dict ou {}
        reponses_motivation = data.get('reponses_motivation', [])     # liste ou []

        if not niveau or not matiere or not chapitres:
            return Response(
                {"error": "niveau, matiere et chapitres sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST
            )

        plan_raw = generate_study_plan(
            niveau=niveau,
            matiere=matiere,
            chapitres=chapitres,
            temps_disponible=temps_disponible,
            score_quiz=score_quiz,
            profil_plan=profil_plan,
            niveau_auto=niveau_auto,
            facteurs_psycho=facteurs_psycho,
            language=language,
            # v2 extras
            psycho_profile=psycho_profile,
            scores_progressifs=scores_progressifs,
            reponses_motivation=reponses_motivation,
        )

        plan_clean = plan_raw.strip()
        if plan_clean.startswith("```"):
            plan_clean = plan_clean.split("```")[1]
            if plan_clean.startswith("json"):
                plan_clean = plan_clean[4:]
        plan_data = json.loads(plan_clean.strip())

        return Response({
            "plan":                plan_data,
            "score_quiz":          score_quiz,
            "niveau":              niveau,
            "matiere":             matiere,
            "profil_plan":         profil_plan,
            "niveau_auto":         niveau_auto,
            "facteurs_psycho":     facteurs_psycho,
            "language":            language,
        })

    except json.JSONDecodeError as e:
        return Response(
            {"error": f"Erreur parsing JSON Gemini (plan) : {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ══════════════════════════════════════════
# SESSION STORE (in-memory)
# ══════════════════════════════════════════

SESSION_STORE = {}
MAX_SESSIONS  = 300

def _cleanup_sessions():
    if len(SESSION_STORE) > MAX_SESSIONS:
        n_to_remove = len(SESSION_STORE) - MAX_SESSIONS + 20
        oldest_keys = list(SESSION_STORE.keys())[:n_to_remove]
        for k in oldest_keys:
            del SESSION_STORE[k]


# ══════════════════════════════════════════
# F2 — VISUAL LEARNING
# POST /api/visual-learning/
# ══════════════════════════════════════════

@api_view(["POST"])
def visual_learning_view(request):
    try:
        generate_visual_explanation = get_rag()[3]

        data      = request.data
        question  = data.get("question", "").strip()
        niveau    = data.get("niveau", "").strip()
        matiere   = data.get("matiere", "").strip()
        language  = resolve_language(data)
        image_b64 = data.get("image", None)

        if not niveau or not matiere:
            return Response({"error": "niveau et matiere sont obligatoires"}, status=400)
        if not question and not image_b64:
            return Response({"error": "question ou image obligatoire"}, status=400)

        result = generate_visual_explanation(
            question=question, niveau=niveau, matiere=matiere,
            image_b64=image_b64, language=language,
        )
        return Response(result)

    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# ══════════════════════════════════════════
# F3 — ORIENTATION
# ══════════════════════════════════════════

@api_view(["POST"])
def orientation_generate_questions_view(request):
    try:
        generate_orientation_questions = get_rag()[4]

        data        = request.data
        niveau      = data.get("niveau", "").strip()
        filiere     = data.get("filiere", "").strip()
        description = data.get("description", "").strip()
        language    = resolve_language(data)

        if not niveau:
            return Response({"error": "Le champ 'niveau' est requis."}, status=400)

        questions = generate_orientation_questions(
            niveau=niveau, filiere=filiere, description=description, language=language,
        )
        return Response({"questions": questions}, status=200)

    except ValueError as ve:
        return Response({"error": str(ve)}, status=500)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def orientation_view(request):
    try:
        analyze_orientation = get_rag()[5]

        data            = request.data
        contexte_amorce = data.get("contexte_amorce", {})
        reponses        = data.get("reponses", [])
        answer_lang_map = data.get("answer_lang_map", {})
        language        = resolve_language(data)

        if not contexte_amorce.get("niveau"):
            return Response({"error": "Le champ 'niveau' dans contexte_amorce est requis."}, status=400)
        if not reponses:
            return Response({"error": "Les réponses sont vides."}, status=400)

        result = analyze_orientation(
            contexte_amorce=contexte_amorce, reponses=reponses,
            language=language, answer_lang_map=answer_lang_map,
        )
        return Response(result, status=200)

    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def orientation_suggestion_view(request):
    try:
        generate_orientation_suggestion = get_rag()[6]

        data           = request.data
        question_id    = data.get("question_id", "")
        question_text  = data.get("question_text", "")
        current_answer = data.get("current_answer", "")
        niveau         = data.get("niveau", "")
        language       = resolve_language(data)

        if not question_text:
            return Response({"suggestion": None}, status=200)

        suggestion = generate_orientation_suggestion(
            question_id=question_id, question_text=question_text,
            current_answer=current_answer, niveau=niveau, language=language,
        )
        return Response({"suggestion": suggestion}, status=200)

    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"suggestion": None}, status=200)


@api_view(["POST"])
def orientation_tags_view(request):
    try:
        data           = request.data
        question_id    = data.get("question_id", "")
        question_text  = data.get("question_text", "")
        current_answer = data.get("current_answer", "")
        niveau         = data.get("niveau", "")
        language       = resolve_language(data)
        count          = min(int(data.get("count", 5)), 8)

        if not question_text:
            return Response({"tags": []}, status=200)

        try:
            from rag_service import generate_orientation_tags
            tags = generate_orientation_tags(
                question_id=question_id, question_text=question_text,
                current_answer=current_answer, niveau=niveau,
                language=language, count=count,
            )
            return Response({"tags": tags}, status=200)
        except ImportError:
            pass

        # Fallback
        import google.generativeai as genai, re as _re
        lang_instructions = {
            "fr": "Réponds en français.",
            "ar": "أجب بالعربية الفصحى البسيطة.",
            "darija": "جاوب بالدارجة المغربية.",
        }
        prompt = f"""
Tu aides un élève marocain (niveau : {niveau or "non précisé"}).
Il doit répondre à : « {question_text} »
{f"Il a déjà écrit : « {current_answer[:200]} »" if current_answer.strip() else "Il n'a encore rien écrit."}
Génère exactement {count} courtes amorces (3 à 7 mots) cliquables.
{lang_instructions.get(language, "Réponds en français.")}
Réponds UNIQUEMENT en JSON valide : ["amorce 1", "amorce 2", ...]
"""
        m    = genai.GenerativeModel("gemini-3-flash-preview")
        resp = m.generate_content(prompt)
        raw  = _re.sub(r"```json|```", "", resp.text.strip()).strip()
        tags = json.loads(raw)
        tags = [str(t).strip()[:80] for t in tags if t][:count]
        return Response({"tags": tags}, status=200)

    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"tags": []}, status=200)