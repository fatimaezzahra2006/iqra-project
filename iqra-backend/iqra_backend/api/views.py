# iqra_backend/api/views.py
# Version 4 — Language-aware propagation

import os
import sys
import json
import uuid

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


# ── Ajouter ai_engine au path SANS importer maintenant ──
AI_ENGINE_PATH = os.path.join(settings.BASE_DIR.parent.parent, 'ai_engine')
if AI_ENGINE_PATH not in sys.path:
    sys.path.insert(0, AI_ENGINE_PATH)


# ══════════════════════════════════════════
# HELPER — import lazy de rag_service
# (évite le circular import au démarrage Django)
# ══════════════════════════════════════════

def get_rag():
    from rag_service import ask_rag, generate_quiz, generate_study_plan, analyze_exercise_image
    return ask_rag, generate_quiz, generate_study_plan, analyze_exercise_image


# ══════════════════════════════════════════
# HELPER — validation langue
# Valeurs acceptées : "fr" | "ar" | "darija"
# Fallback vers "fr" si valeur inconnue
# ══════════════════════════════════════════

SUPPORTED_LANGUAGES = {"fr", "ar", "darija"}

def resolve_language(data) -> str:
    """
    Extrait et valide le paramètre 'language' du request.data.
    Retourne toujours une valeur dans SUPPORTED_LANGUAGES.
    """
    lang = data.get("language", "fr")
    if lang not in SUPPORTED_LANGUAGES:
        lang = "fr"
    return lang


# ══════════════════════════════════════════
# PING
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
# Nouveau champ attendu : language (optionnel, défaut "fr")
# ══════════════════════════════════════════

@api_view(['POST'])
def chat(request):
    try:
        ask_rag, _, _, _ = get_rag()

        data     = request.data
        question = data.get('question', None)
        niveau   = data.get('niveau', None)
        matiere  = data.get('matiere', None)
        type_doc = data.get('type_doc', None)
        language = resolve_language(data)      # ← nouveau

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
            language=language,                 # ← propagé
        )

        return Response({
            "question": question,
            "response": response,
            "niveau":   niveau,
            "matiere":  matiere,
            "language": language,
        })

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ══════════════════════════════════════════
# QUIZ — F1 Étape 1
# POST /api/quiz/
# Nouveau champ attendu : language (optionnel, défaut "fr")
# ══════════════════════════════════════════

@api_view(['POST'])
def quiz(request):
    try:
        _, generate_quiz, _, _ = get_rag()

        data      = request.data
        niveau    = data.get('niveau', '')
        matiere   = data.get('matiere', '')
        chapitres = data.get('chapitres', [])
        language  = resolve_language(data)     # ← nouveau

        if not niveau or not matiere or not chapitres:
            return Response(
                {"error": "niveau, matiere et chapitres sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST
            )

        quiz_raw = generate_quiz(
            niveau=niveau,
            matiere=matiere,
            chapitre=chapitres[0],
            language=language,                 # ← propagé
        )

        quiz_clean = quiz_raw.strip()
        if quiz_clean.startswith("```"):
            quiz_clean = quiz_clean.split("```")[1]
            if quiz_clean.startswith("json"):
                quiz_clean = quiz_clean[4:]
        quiz_clean = quiz_clean.strip()

        quiz_data = json.loads(quiz_clean)

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
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ══════════════════════════════════════════
# STUDY PLAN — F1 Étape 2
# POST /api/study-plan/
# Nouveau champ attendu : language (optionnel, défaut "fr")
# ══════════════════════════════════════════

@api_view(['POST'])
def study_plan(request):
    try:
        _, _, generate_study_plan, _ = get_rag()

        data             = request.data
        niveau           = data.get('niveau', '')
        matiere          = data.get('matiere', '')
        chapitres        = data.get('chapitres', [])
        temps_disponible = data.get('temps_disponible', 5)
        score_quiz       = data.get('score_quiz', 0)
        profil_plan      = data.get('profil_plan', 'normal')
        niveau_auto      = data.get('niveau_auto', 'niveau1')
        facteurs_psycho  = data.get('facteurs_psycho', [])
        language         = resolve_language(data)              # ← nouveau

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
            language=language,                                 # ← propagé
        )

        plan_clean = plan_raw.strip()
        if plan_clean.startswith("```"):
            plan_clean = plan_clean.split("```")[1]
            if plan_clean.startswith("json"):
                plan_clean = plan_clean[4:]
        plan_clean = plan_clean.strip()

        plan_data = json.loads(plan_clean)

        return Response({
            "plan":            plan_data,
            "score_quiz":      score_quiz,
            "niveau":          niveau,
            "matiere":         matiere,
            "profil_plan":     profil_plan,
            "niveau_auto":     niveau_auto,
            "facteurs_psycho": facteurs_psycho,
            "language":        language,
        })

    except json.JSONDecodeError as e:
        return Response(
            {"error": f"Erreur parsing JSON Gemini (plan) : {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


SESSION_STORE = {}
 
MAX_SESSIONS = 300   # nettoyage auto au-delà
 
 
def _cleanup_sessions():
    """Supprime les sessions les plus anciennes si trop nombreuses."""
    if len(SESSION_STORE) > MAX_SESSIONS:
        n_to_remove = len(SESSION_STORE) - MAX_SESSIONS + 20
        oldest_keys = list(SESSION_STORE.keys())[:n_to_remove]
        for k in oldest_keys:
            del SESSION_STORE[k]
 
 
# ══════════════════════════════════════════
# ENDPOINT — POST /api/analyze-image/
# ══════════════════════════════════════════
 
@api_view(['POST'])
def analyze_image(request):
    """
    Tuteur pédagogique conversationnel v5.
 
    Champs attendus :
        niveau             str   — niveau scolaire
        matiere            str   — matière
        description        str   — message texte de l'élève (optionnel)
        images             list  — liste de base64 (1-3 images, vide si chat continu)
        session_id         str   — ID de session (None = nouvelle session)
        analysis_count     int   — compteur côté frontend
        language           str   — "fr" | "ar" | "darija" (choix initial)
        conversation_stage str   — stage courant (frontend suit next_stage)
        help_level         int   — niveau de scaffolding actuel
        turn_in_stage      int   — tours dans le stage actuel
    """
    try:
        _, _, _, analyze_exercise_image = get_rag()
 
        data = request.data
 
        # ── Lecture des champs ──
        niveau             = data.get("niveau", "")
        matiere            = data.get("matiere", "")
        description        = data.get("description", "")
        images             = data.get("images", [])
        session_id         = data.get("session_id", None)
        analysis_count     = int(data.get("analysis_count", 0))
        language           = resolve_language(data)
        conversation_stage = data.get("conversation_stage", "diagnostic")
        help_level         = int(data.get("help_level", 1))
        turn_in_stage      = int(data.get("turn_in_stage", 0))
 
        # ── Validations ──
        is_initial = bool(images)
 
        if not images and (not session_id or session_id not in SESSION_STORE):
            return Response(
                {"error": "Une image est requise pour démarrer une session."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        if images and len(images) > 3:
            return Response(
                {"error": "Maximum 3 images autorisées."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        if not niveau or not matiere:
            return Response(
                {"error": "niveau et matiere sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        # ── Gestion session ──
        if session_id is None or session_id not in SESSION_STORE:
            session_id = str(uuid.uuid4())
            SESSION_STORE[session_id] = {
                "history":            [],
                "count":              0,
                "language":           language,
                "conversation_stage": "diagnostic",
                "help_level":         1,
                "turn_in_stage":      0,
                "student_state": {
                    "emotion":       "neutre",
                    "exercise_info": {},
                },
            }
 
        session = SESSION_STORE[session_id]
 
        # Pour le chat continu, lire les valeurs persistées dans la session
        # (le frontend envoie aussi ces valeurs mais la session fait foi)
        effective_stage      = conversation_stage if is_initial else session["conversation_stage"]
        effective_help_level = help_level if is_initial else session["help_level"]
        effective_turn       = turn_in_stage if is_initial else session["turn_in_stage"]
        effective_language   = language  # le frontend envoie la langue choisie
 
        # ── Appel RAG v5 ──
        result_raw = analyze_exercise_image(
            images_data=images,
            niveau=niveau,
            matiere=matiere,
            description=description,
            history=session["history"],
            analysis_count=analysis_count,
            language=effective_language,
            student_state=session["student_state"],
            conversation_stage=effective_stage,
            help_level=effective_help_level,
            turn_in_stage=effective_turn,
        )
 
        # ── Parse JSON Gemini ──
        result_clean = result_raw.strip()
        if result_clean.startswith("```"):
            result_clean = result_clean.split("```")[1]
            if result_clean.startswith("json"):
                result_clean = result_clean[4:]
        result_clean = result_clean.strip()
 
        result_data = json.loads(result_clean)
 
        # ── Mise à jour session ──
        returned_stage      = result_data.get("next_stage", "guided_explanation")
        returned_help_level = int(result_data.get("help_level", effective_help_level))
        returned_emotion    = result_data.get("emotion_detected", "neutre")
        returned_ex_info    = result_data.get("exercise_info", {})
        returned_messages   = result_data.get("messages", [])
 
        # turn_in_stage : reset si on change de stage, sinon +1
        if returned_stage != effective_stage:
            new_turn = 0
        else:
            new_turn = effective_turn + 1
 
        session["conversation_stage"] = returned_stage
        session["help_level"]         = returned_help_level
        session["turn_in_stage"]      = new_turn
        session["student_state"]["emotion"] = returned_emotion
        if returned_ex_info:
            session["student_state"]["exercise_info"] = returned_ex_info
 
        # Aperçu pour l'historique
        preview = " | ".join(returned_messages[:2])[:120] if returned_messages else ""
 
        session["history"].append({
            "round":         session["count"] + 1,
            "niveau":        niveau,
            "matiere":       matiere,
            "description":   description,
            "nb_images":     len(images),
            "reply_preview": preview,
            "exercise_info": returned_ex_info,
            "stage":         effective_stage,
        })
        session["count"] += 1
 
        _cleanup_sessions()
 
        # ── Réponse ──
        return Response({
            # Contenu conversationnel
            "messages":          returned_messages,
            "suggestions":       result_data.get("suggestions", []),
 
            # État pédagogique — le frontend doit les persister
            "next_stage":        returned_stage,
            "help_level":        returned_help_level,
            "turn_in_stage":     new_turn,
            "emotion_detected":  returned_emotion,
            "exercise_info":     returned_ex_info,
 
            # Session
            "session_id":        session_id,
            "analysis_count":    session["count"],
            "is_initial":        is_initial,
 
            # Langue utilisée réellement (peut différer si détectée auto)
            "language_used":     effective_language,
        })
 
    except json.JSONDecodeError as e:
        return Response(
            {"error": f"Erreur parsing réponse IA : {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
def orientation_generate_questions_view(request):
    def get_rag_local():
        import sys, os
        ai_engine_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "ai_engine"
        )
        if ai_engine_path not in sys.path:
            sys.path.insert(0, ai_engine_path)
        from rag_service import generate_orientation_questions
        return generate_orientation_questions

    data        = request.data
    niveau      = data.get("niveau", "").strip()
    filiere     = data.get("filiere", "").strip()
    description = data.get("description", "").strip()

    print(f"[DEBUG] niveau={niveau} filiere={filiere} description={description}")

    if not niveau:
        return Response({"error": "Le champ 'niveau' est requis."}, status=400)

    try:
        generate_orientation_questions = get_rag_local()
        print("[DEBUG] fonction importée OK")
        questions = generate_orientation_questions(niveau, filiere, description)
        print(f"[DEBUG] {len(questions)} questions générées")
        return Response({"questions": questions}, status=200)
    except ValueError as ve:
        print(f"[DEBUG ValueError] {ve}")
        return Response({"error": str(ve)}, status=500)
    except Exception as e:
        import traceback
        print(f"[DEBUG Exception] {e}")
        traceback.print_exc()   # ← affiche le traceback COMPLET dans le terminal
        return Response({"error": str(e)}, status=500)



        
@api_view(["POST"])
def orientation_view(request):
    """
    POST /api/orientation/
    Analyse complète psycho-pédagogique + scoring filières.
    Body : { "contexte_amorce": {...}, "reponses": [...] }
    """
    def get_analyze():
        import sys, os
        ai_engine_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "ai_engine"
        )
        if ai_engine_path not in sys.path:
            sys.path.insert(0, ai_engine_path)
        from rag_service import analyze_orientation
        return analyze_orientation

    data            = request.data
    contexte_amorce = data.get("contexte_amorce", {})
    reponses        = data.get("reponses", [])

    if not contexte_amorce.get("niveau"):
        return Response({"error": "Le champ 'niveau' est requis dans contexte_amorce."}, status=400)

    if not reponses:
        return Response({"error": "Les réponses sont vides."}, status=400)

    try:
        analyze_orientation = get_analyze()
        result = analyze_orientation(contexte_amorce, reponses)
        return Response(result, status=200)
    except Exception as e:
        return Response({"error": f"Erreur analyse orientation : {str(e)}"}, status=500)