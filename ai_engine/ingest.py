# ai_engine/ingest.py

import os
import pdfplumber
import chromadb
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

# ══════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data_files")
CAREER_DIR = os.path.join(BASE_DIR, "data_files", "career")
STUDY_HABITS_DIR = os.path.join(BASE_DIR, "data_files", "procrastination , stress and study habits")
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_storage")

EMBEDDING_MODEL = "all-MiniLM-L6-v2"

COLLECTION_IQRA         = "iqra_knowledge"          # cours + exos BAC
COLLECTION_CAREER       = "career_knowledge"         # fichiers ecole/ + psyco/
COLLECTION_STUDY_HABITS = "study_habits_knowledge"   # procrastination + stress + study habits

# ══════════════════════════════════════════
# INIT MODÈLE + CHROMADB
# ══════════════════════════════════════════

print("⏳ Chargement du modèle d'embedding...")
embedder = SentenceTransformer(EMBEDDING_MODEL)

client = chromadb.PersistentClient(path=CHROMA_DIR)

# ── Recréer la collection IQRA ──
try:
    client.delete_collection(COLLECTION_IQRA)
    print(f"🗑️  Ancienne collection '{COLLECTION_IQRA}' supprimée.")
except:
    pass
collection_iqra = client.create_collection(COLLECTION_IQRA)
print(f"✅ Collection '{COLLECTION_IQRA}' créée.")

# ── Recréer la collection CAREER ──
try:
    client.delete_collection(COLLECTION_CAREER)
    print(f"🗑️  Ancienne collection '{COLLECTION_CAREER}' supprimée.")
except:
    pass
collection_career = client.create_collection(COLLECTION_CAREER)
print(f"✅ Collection '{COLLECTION_CAREER}' créée.")

# ── Recréer la collection STUDY HABITS ──
try:
    client.delete_collection(COLLECTION_STUDY_HABITS)
    print(f"🗑️  Ancienne collection '{COLLECTION_STUDY_HABITS}' supprimée.")
except:
    pass
collection_study_habits = client.create_collection(COLLECTION_STUDY_HABITS)
print(f"✅ Collection '{COLLECTION_STUDY_HABITS}' créée.")

# ══════════════════════════════════════════
# TEXT SPLITTER
# ══════════════════════════════════════════

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n\n", "\n\n", "\n", ". ", " "]
)

# ══════════════════════════════════════════
# EXTRACTION MÉTADONNÉES
# ══════════════════════════════════════════

def extract_metadata_iqra(filepath):
    """
    Extrait niveau, matière, type depuis le chemin du fichier IQRA.
    Exemple : data_files/2BAC SM A/MATH/COURS/fichier.pdf
    → niveau=2BAC SM A, matiere=MATH, type_doc=COURS
    """
    parts = filepath.replace("\\", "/").split("/")
    metadata = {
        "niveau": "inconnu",
        "matiere": "inconnu",
        "type_doc": "inconnu",
        "filename": os.path.basename(filepath)
    }
    try:
        idx = parts.index("data_files")
        if idx + 1 < len(parts):
            metadata["niveau"] = parts[idx + 1]
        if idx + 2 < len(parts):
            metadata["matiere"] = parts[idx + 2]
        if idx + 3 < len(parts):
            metadata["type_doc"] = parts[idx + 3]
    except ValueError:
        pass
    return metadata


def extract_metadata_career(filepath):
    """
    Extrait la catégorie depuis le chemin du fichier career.
    Exemple : data_files/career/psyco/fichier.pdf  → category=psyco
              data_files/career/ecole/fichier.pdf   → category=ecole
    """
    parts = filepath.replace("\\", "/").split("/")
    metadata = {
        "category": "inconnu",
        "filename": os.path.basename(filepath)
    }
    try:
        idx = parts.index("career")
        if idx + 1 < len(parts):
            metadata["category"] = parts[idx + 1]  # "psyco" ou "ecole"
    except ValueError:
        pass
    return metadata


def extract_metadata_study_habits(filepath):
    """
    Extrait les métadonnées depuis le chemin du fichier study habits.
    Tous les fichiers sont à plat dans le dossier → topic déduit du nom de fichier.
    """
    filename = os.path.basename(filepath)
    filename_lower = filename.lower()

    # Déduction du topic à partir du nom de fichier
    if "procrastin" in filename_lower:
        topic = "procrastination"
    elif "stress" in filename_lower or "anxiety" in filename_lower:
        topic = "stress"
    elif "time" in filename_lower:
        topic = "time_management"
    elif "study" in filename_lower or "habit" in filename_lower:
        topic = "study_habits"
    elif "memory" in filename_lower:
        topic = "memory"
    else:
        topic = "general"

    return {
        "topic": topic,
        "filename": filename
    }

# ══════════════════════════════════════════
# EXTRACTION TEXTE PDF
# ══════════════════════════════════════════

def extract_text_from_pdf(filepath):
    """Extrait tout le texte d'un PDF avec pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"  ⚠️  Erreur lecture {filepath} : {e}")
    return text.strip()

# ══════════════════════════════════════════
# INGESTION — IQRA (cours + exos BAC)
# ══════════════════════════════════════════

def ingest_iqra_pdfs():
    total_chunks = 0
    total_files = 0

    for root, dirs, files in os.walk(DATA_DIR):
        # Ignorer career/ et procrastination.../ entièrement
        root_normalized = root.replace("\\", "/")
        if "career" in root_normalized.split("/"):
            continue
        if "procrastination , stress and study habits" in root_normalized:
            continue

        for filename in files:
            if not filename.lower().endswith(".pdf"):
                continue

            filepath = os.path.join(root, filename)
            print(f"\n📄 [IQRA] {filepath}")

            metadata = extract_metadata_iqra(filepath)
            print(f"   🏷️  niveau={metadata['niveau']} | matiere={metadata['matiere']} | type={metadata['type_doc']}")

            text = extract_text_from_pdf(filepath)
            if not text:
                print("   ⚠️  Aucun texte extrait, fichier ignoré.")
                continue

            print(f"   📝 {len(text)} caractères extraits.")
            chunks = splitter.split_text(text)
            print(f"   ✂️  {len(chunks)} chunks créés.")

            for i, chunk in enumerate(chunks):
                chunk_id = f"iqra_{metadata['niveau']}_{metadata['matiere']}_{metadata['type_doc']}_{filename}_{i}"
                embedding = embedder.encode(chunk).tolist()
                collection_iqra.add(
                    ids=[chunk_id],
                    embeddings=[embedding],
                    documents=[chunk],
                    metadatas=[{
                        "niveau":      metadata["niveau"],
                        "matiere":     metadata["matiere"],
                        "type_doc":    metadata["type_doc"],
                        "filename":    metadata["filename"],
                        "chunk_index": i
                    }]
                )

            total_chunks += len(chunks)
            total_files += 1

    print(f"\n{'═'*50}")
    print(f"✅ IQRA TERMINÉ — {total_files} fichiers | {total_chunks} chunks")
    print(f"{'═'*50}\n")


# ══════════════════════════════════════════
# INGESTION — CAREER (ecole + psyco)
# ══════════════════════════════════════════

def ingest_career_pdfs():
    total_chunks = 0
    total_files = 0

    if not os.path.exists(CAREER_DIR):
        print(f"⚠️  Dossier career introuvable : {CAREER_DIR}")
        return

    for root, dirs, files in os.walk(CAREER_DIR):
        for filename in files:
            if not filename.lower().endswith(".pdf"):
                continue

            filepath = os.path.join(root, filename)
            print(f"\n📄 [CAREER] {filepath}")

            metadata = extract_metadata_career(filepath)
            print(f"   🏷️  category={metadata['category']}")

            text = extract_text_from_pdf(filepath)
            if not text:
                print("   ⚠️  Aucun texte extrait, fichier ignoré.")
                continue

            print(f"   📝 {len(text)} caractères extraits.")
            chunks = splitter.split_text(text)
            print(f"   ✂️  {len(chunks)} chunks créés.")

            for i, chunk in enumerate(chunks):
                chunk_id = f"career_{metadata['category']}_{filename}_{i}"
                embedding = embedder.encode(chunk).tolist()
                collection_career.add(
                    ids=[chunk_id],
                    embeddings=[embedding],
                    documents=[chunk],
                    metadatas=[{
                        "category":    metadata["category"],
                        "filename":    metadata["filename"],
                        "chunk_index": i
                    }]
                )

            total_chunks += len(chunks)
            total_files += 1

    print(f"\n{'═'*50}")
    print(f"✅ CAREER TERMINÉ — {total_files} fichiers | {total_chunks} chunks")
    print(f"{'═'*50}\n")


# ══════════════════════════════════════════
# INGESTION — STUDY HABITS (procrastination + stress)
# ══════════════════════════════════════════

def ingest_study_habits_pdfs():
    total_chunks = 0
    total_files = 0

    if not os.path.exists(STUDY_HABITS_DIR):
        print(f"⚠️  Dossier study habits introuvable : {STUDY_HABITS_DIR}")
        return

    for root, dirs, files in os.walk(STUDY_HABITS_DIR):
        for filename in files:
            if not filename.lower().endswith(".pdf"):
                continue

            filepath = os.path.join(root, filename)
            print(f"\n📄 [STUDY_HABITS] {filepath}")

            metadata = extract_metadata_study_habits(filepath)
            print(f"   🏷️  topic={metadata['topic']}")

            text = extract_text_from_pdf(filepath)
            if not text:
                print("   ⚠️  Aucun texte extrait, fichier ignoré.")
                continue

            print(f"   📝 {len(text)} caractères extraits.")
            chunks = splitter.split_text(text)
            print(f"   ✂️  {len(chunks)} chunks créés.")

            for i, chunk in enumerate(chunks):
                chunk_id = f"study_habits_{metadata['topic']}_{filename}_{i}"
                embedding = embedder.encode(chunk).tolist()
                collection_study_habits.add(
                    ids=[chunk_id],
                    embeddings=[embedding],
                    documents=[chunk],
                    metadatas=[{
                        "topic":       metadata["topic"],
                        "filename":    metadata["filename"],
                        "chunk_index": i
                    }]
                )

            total_chunks += len(chunks)
            total_files += 1

    print(f"\n{'═'*50}")
    print(f"✅ STUDY HABITS TERMINÉ — {total_files} fichiers | {total_chunks} chunks")
    print(f"{'═'*50}\n")


# ══════════════════════════════════════════
# LANCER
# ══════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "═"*50)
    print("🚀 DÉBUT INGESTION COMPLÈTE")
    print("═"*50 + "\n")

    ingest_iqra_pdfs()
    ingest_career_pdfs()
    ingest_study_habits_pdfs()

    print("═"*50)
    print("🎉 INGESTION TOTALE TERMINÉE")
    print(f"   💾 ChromaDB path : {CHROMA_DIR}")
    print(f"   📚 Collections : {COLLECTION_IQRA} | {COLLECTION_CAREER} | {COLLECTION_STUDY_HABITS}")
    print("═"*50 + "\n")