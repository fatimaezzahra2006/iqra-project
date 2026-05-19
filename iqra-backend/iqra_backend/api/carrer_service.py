# ══════════════════════════════════════════
# CAREER SERVICE — F3 Conseiller d'Orientation
# ══════════════════════════════════════════

# Filières disponibles avec leurs matières clés
FILIERES = {
    "Sciences Mathématiques": {
        "description": "Filière axée sur les mathématiques avancées, physique et informatique.",
        "matieres_cles": ["math", "physique", "informatique"],
        "debouches": ["Ingénierie", "Médecine", "Architecture", "Informatique"],
        "coefficient": {
            "math": 0.35,
            "physique": 0.25,
            "logique": 0.20,
            "curiosite": 0.10,
            "rigueur": 0.10
        }
    },
    "Sciences Expérimentales": {
        "description": "Filière axée sur la biologie, chimie et sciences naturelles.",
        "matieres_cles": ["svt", "chimie", "physique"],
        "debouches": ["Médecine", "Pharmacie", "Agronomie", "Biologie"],
        "coefficient": {
            "svt": 0.35,
            "chimie": 0.25,
            "physique": 0.20,
            "curiosite": 0.10,
            "rigueur": 0.10
        }
    },
    "Sciences Economiques": {
        "description": "Filière axée sur l'économie, gestion et sciences sociales.",
        "matieres_cles": ["economie", "math", "histoire"],
        "debouches": ["Commerce", "Finance", "Droit", "Management"],
        "coefficient": {
            "economie": 0.35,
            "math": 0.20,
            "communication": 0.20,
            "organisation": 0.15,
            "curiosite": 0.10
        }
    },
    "Lettres et Sciences Humaines": {
        "description": "Filière axée sur les langues, histoire et philosophie.",
        "matieres_cles": ["francais", "arabe", "histoire"],
        "debouches": ["Journalisme", "Droit", "Enseignement", "Traduction"],
        "coefficient": {
            "langues": 0.35,
            "communication": 0.25,
            "histoire": 0.20,
            "creativite": 0.20
        }
    },
    "Sciences et Technologies Electriques": {
        "description": "Filière axée sur l'électricité, électronique et automatisme.",
        "matieres_cles": ["physique", "math", "technologie"],
        "debouches": ["Électrotechnique", "Automatisme", "Énergie", "Télécoms"],
        "coefficient": {
            "physique": 0.30,
            "math": 0.25,
            "technologie": 0.25,
            "logique": 0.20
        }
    }
}

# ══════════════════════════════════════════
# MAPPING QUESTIONS → COMPÉTENCES
# ══════════════════════════════════════════

def map_reponses_to_competences(reponses):
    """
    Convertit les réponses du questionnaire en scores de compétences.
    
    reponses = {
        "q1": "A",   # Matière préférée
        "q2": "B",   # Style de travail
        ...
        "q12": "C"
    }
    """
    competences = {
        "math": 0,
        "physique": 0,
        "svt": 0,
        "chimie": 0,
        "economie": 0,
        "langues": 0,
        "histoire": 0,
        "technologie": 0,
        "logique": 0,
        "creativite": 0,
        "communication": 0,
        "organisation": 0,
        "curiosite": 0,
        "rigueur": 0
    }

    # Q1 — Matière préférée
    q1 = reponses.get("q1", "")
    if q1 == "A":   competences["math"] += 3
    elif q1 == "B": competences["svt"] += 3
    elif q1 == "C": competences["langues"] += 3
    elif q1 == "D": competences["economie"] += 3

    # Q2 — Deuxième matière forte
    q2 = reponses.get("q2", "")
    if q2 == "A":   competences["physique"] += 3
    elif q2 == "B": competences["chimie"] += 3
    elif q2 == "C": competences["histoire"] += 3
    elif q2 == "D": competences["technologie"] += 3

    # Q3 — Style de travail préféré
    q3 = reponses.get("q3", "")
    if q3 == "A":   competences["logique"] += 2; competences["rigueur"] += 2
    elif q3 == "B": competences["creativite"] += 2; competences["curiosite"] += 2
    elif q3 == "C": competences["communication"] += 2; competences["organisation"] += 2
    elif q3 == "D": competences["technologie"] += 2; competences["logique"] += 2

    # Q4 — Activité préférée hors école
    q4 = reponses.get("q4", "")
    if q4 == "A":   competences["creativite"] += 2; competences["langues"] += 1
    elif q4 == "B": competences["logique"] += 2; competences["math"] += 1
    elif q4 == "C": competences["curiosite"] += 2; competences["svt"] += 1
    elif q4 == "D": competences["organisation"] += 2; competences["economie"] += 1

    # Q5 — Type de problème à résoudre
    q5 = reponses.get("q5", "")
    if q5 == "A":   competences["math"] += 2; competences["logique"] += 2
    elif q5 == "B": competences["communication"] += 2; competences["langues"] += 2
    elif q5 == "C": competences["svt"] += 2; competences["curiosite"] += 2
    elif q5 == "D": competences["economie"] += 2; competences["organisation"] += 2

    # Q6 — Métier de rêve
    q6 = reponses.get("q6", "")
    if q6 == "A":   competences["math"] += 3; competences["physique"] += 2
    elif q6 == "B": competences["svt"] += 3; competences["chimie"] += 2
    elif q6 == "C": competences["langues"] += 3; competences["communication"] += 2
    elif q6 == "D": competences["economie"] += 3; competences["organisation"] += 2

    # Q7 — Force principale
    q7 = reponses.get("q7", "")
    if q7 == "A":   competences["logique"] += 2; competences["rigueur"] += 2
    elif q7 == "B": competences["creativite"] += 2; competences["communication"] += 2
    elif q7 == "C": competences["organisation"] += 2; competences["economie"] += 1
    elif q7 == "D": competences["curiosite"] += 2; competences["svt"] += 1

    # Q8 — Préférence de travail
    q8 = reponses.get("q8", "")
    if q8 == "A":   competences["rigueur"] += 2; competences["logique"] += 1
    elif q8 == "B": competences["communication"] += 2; competences["organisation"] += 1
    elif q8 == "C": competences["creativite"] += 2; competences["curiosite"] += 1
    elif q8 == "D": competences["technologie"] += 2; competences["logique"] += 1

    # Q9 — Intérêt pour les sciences
    q9 = reponses.get("q9", "")
    if q9 == "A":   competences["physique"] += 2; competences["math"] += 1
    elif q9 == "B": competences["svt"] += 2; competences["chimie"] += 1
    elif q9 == "C": competences["histoire"] += 2; competences["langues"] += 1
    elif q9 == "D": competences["economie"] += 2; competences["organisation"] += 1

    # Q10 — Vision du futur
    q10 = reponses.get("q10", "")
    if q10 == "A":  competences["technologie"] += 2; competences["logique"] += 2
    elif q10 == "B": competences["communication"] += 2; competences["creativite"] += 2
    elif q10 == "C": competences["svt"] += 2; competences["curiosite"] += 2
    elif q10 == "D": competences["economie"] += 2; competences["organisation"] += 2

    # Q11 — Matière la plus difficile (inverser)
    q11 = reponses.get("q11", "")
    if q11 == "A":  competences["math"] -= 1
    elif q11 == "B": competences["langues"] -= 1
    elif q11 == "C": competences["svt"] -= 1
    elif q11 == "D": competences["economie"] -= 1

    # Q12 — Objectif après le bac
    q12 = reponses.get("q12", "")
    if q12 == "A":  competences["math"] += 2; competences["physique"] += 2
    elif q12 == "B": competences["svt"] += 2; competences["chimie"] += 2
    elif q12 == "C": competences["langues"] += 2; competences["communication"] += 2
    elif q12 == "D": competences["economie"] += 2; competences["organisation"] += 2

    return competences


# ══════════════════════════════════════════
# CALCUL SCORING PAR FILIÈRE
# ══════════════════════════════════════════

def calculate_scores(competences):
    """Calcule le score de compatibilité pour chaque filière."""
    scores = {}

    for filiere, info in FILIERES.items():
        score = 0
        total_coef = sum(info["coefficient"].values())

        for competence, coef in info["coefficient"].items():
            valeur = competences.get(competence, 0)
            # Normaliser entre 0 et 10
            valeur_norm = max(0, min(10, valeur))
            score += valeur_norm * coef

        # Score final sur 100
        scores[filiere] = round((score / total_coef) * 10, 1)

    return scores


# ══════════════════════════════════════════
# GÉNÉRATION RECOMMANDATIONS
# ══════════════════════════════════════════

def generate_recommendations(scores, competences):
    """Génère les recommandations personnalisées."""

    # Trier les filières par score
    sorted_filieres = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_filiere = sorted_filieres[0][0]
    top_score   = sorted_filieres[0][1]

    recommendations = []

    # Recommandation principale
    recommendations.append({
        "type": "principale",
        "filiere": top_filiere,
        "score": top_score,
        "message": f"Tu es très compatible avec la filière {top_filiere} avec un score de {top_score}/10 !",
        "description": FILIERES[top_filiere]["description"],
        "debouches": FILIERES[top_filiere]["debouches"]
    })

    # Deuxième recommandation
    if len(sorted_filieres) > 1:
        second_filiere = sorted_filieres[1][0]
        second_score   = sorted_filieres[1][1]
        recommendations.append({
            "type": "alternative",
            "filiere": second_filiere,
            "score": second_score,
            "message": f"La filière {second_filiere} est aussi une bonne option pour toi.",
            "description": FILIERES[second_filiere]["description"],
            "debouches": FILIERES[second_filiere]["debouches"]
        })

    return recommendations


# ══════════════════════════════════════════
# FONCTION PRINCIPALE
# ══════════════════════════════════════════

def calculate_orientation(reponses):
    """
    Fonction principale appelée depuis views.py
    
    Input  : reponses = {"q1": "A", "q2": "B", ...}
    Output : résultats complets avec scores + recommandations
    """

    # 1. Mapper les réponses en compétences
    competences = map_reponses_to_competences(reponses)

    # 2. Calculer les scores par filière
    scores = calculate_scores(competences)

    # 3. Générer les recommandations
    recommendations = generate_recommendations(scores, competences)

    # 4. Préparer les données pour Chart.js
    chart_data = {
        "labels": list(scores.keys()),
        "scores": list(scores.values()),
        "competences": {
            "labels": list(competences.keys()),
            "values": list(competences.values())
        }
    }

    return {
        "scores": scores,
        "recommendations": recommendations,
        "chart_data": chart_data,
        "competences": competences,
        "iqra_help": {
            "message": "IQRA peut t'aider à préparer ta filière choisie !",
            "ressources": [
                {"type": "video", "titre": "Cours de mathématiques avancées"},
                {"type": "exercice", "titre": "Exercices de préparation au bac"},
                {"type": "chatbot", "titre": "Pose tes questions à notre assistant IA"}
            ]
        }
    }