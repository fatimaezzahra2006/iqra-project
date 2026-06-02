"""
manim_runner.py — IQRA Visual Learning v2
"""

from __future__ import annotations
import os, re, shutil, logging, subprocess, tempfile, sys

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════
# CONSTANTES
# ══════════════════════════════════════════

SCENE_CLASS   = "ExplicationIQRA"
MANIM_QUALITY = "-ql"
MANIM_TIMEOUT = 180

# Cherche manim.exe avec toutes les casses possibles
def _find_manim_exe() -> str:
    # 1. shutil.which (cherche dans PATH)
    found = shutil.which("manim")
    if found:
        return found
    # 2. Chemins connus Windows
    candidates = [
        r"C:\Users\CHERIF\AppData\Local\Programs\Python\Python313\Scripts\manim.exe",
        r"C:\Users\CHERIF\AppData\Local\Programs\Python\Python313\Scripts\manim.EXE",
        r"C:\Python313\Scripts\manim.exe",
        r"C:\Python311\Scripts\manim.exe",
        r"C:\Python310\Scripts\manim.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    # 3. Utiliser python -m manim comme fallback
    return None

MANIM_EXE = _find_manim_exe()
PYTHON_EXE = sys.executable  # chemin Python actuel, toujours valide


# ══════════════════════════════════════════
# HELPERS CODE
# ══════════════════════════════════════════

def _strip_md(code: str) -> str:
    if "```python" in code:
        return code.split("```python")[1].split("```")[0].strip()
    if "```" in code:
        return code.split("```")[1].split("```")[0].strip()
    return code.strip()


def _ensure_class_name(code: str) -> str:
    """Nettoie le code et renomme la classe en ExplicationIQRA."""

    # ── Nettoyage des erreurs courantes ───────────────────
    # DASHED sous toutes ses formes
    code = re.sub(r'\bls\s*=\s*DASHED\b', '', code)
    code = re.sub(r',?\s*dash_style\s*=\s*DASHED\b', '', code)
    code = re.sub(r',?\s*stroke_style\s*=\s*DASHED\b', '', code)
    code = re.sub(r',\s*DASHED\b', '', code)
    code = re.sub(r'\bDASHED\b', '', code)

    # math.xxx → injecter import math si nécessaire
    if 'math.' in code and 'import math' not in code:
        code = 'import math\n' + code

    # np.xxx → injecter import numpy si nécessaire
    if 'np.' in code and 'import numpy' not in code:
        code = 'import numpy as np\n' + code

    # ── Renommage de la classe ────────────────────────────
    if f"class {SCENE_CLASS}" in code:
        return code

    pattern = r'class\s+(\w+)\s*\(\s*\w*Scene\w*\s*\)'
    match = re.search(pattern, code)
    if match:
        old_name = match.group(1)
        code = re.sub(r'\b' + re.escape(old_name) + r'\b', SCENE_CLASS, code)
    else:
        code = code.rstrip() + f"""

class {SCENE_CLASS}(Scene):
    def construct(self):
        msg = Text("Explication non disponible", font_size=36, color=WHITE)
        self.play(Write(msg))
        self.wait(2)
"""
    return code


def _syntax_ok(code: str) -> tuple:
    try:
        compile(code, "<manim_generated>", "exec")
        return True, None
    except SyntaxError as e:
        return False, f"Ligne {e.lineno}: {e.msg}"
    except Exception as e:
        return False, str(e)


def _write_tmp(code: str) -> str:
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False,
        encoding="utf-8", prefix="iqra_manim_"
    ) as f:
        f.write(code)
        return f.name


def _cleanup_tmp(py_path: str) -> None:
    try:
        if py_path and os.path.exists(py_path):
            os.remove(py_path)
    except Exception:
        pass
    if py_path:
        media_dir = os.path.join(os.path.dirname(py_path), "media")
        if os.path.exists(media_dir):
            shutil.rmtree(media_dir, ignore_errors=True)


# ══════════════════════════════════════════
# EXÉCUTION MANIM
# ══════════════════════════════════════════

def _run_manim(py_path: str, output_path: str) -> tuple:
    try:
        media_dir = os.path.join(os.path.dirname(py_path), "media")
        os.makedirs(media_dir, exist_ok=True)

        # Stratégie 1 : python -m manim (toujours disponible si manim installé)
        cmd = (
            f'"{PYTHON_EXE}" -m manim "{py_path}" {SCENE_CLASS} {MANIM_QUALITY} '
            f'--media_dir "{media_dir}" --disable_caching'
        )

        print(f"[DEBUG] CMD: {cmd}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=MANIM_TIMEOUT,
            encoding="utf-8",
            errors="replace",
            shell=True,
        )

        stdout = result.stdout
        stderr = result.stderr

        if result.returncode != 0:
            logger.error("[manim_runner] returncode=%d\nSTDERR:\n%s",
                         result.returncode, stderr[-2000:])
            return False, stdout, stderr

        if _find_and_copy_video(media_dir, output_path):
            return True, stdout, stderr

        logger.error("[manim_runner] Manim OK mais vidéo introuvable.")
        return False, stdout, stderr

    except subprocess.TimeoutExpired:
        logger.error("[manim_runner] Timeout (%ds)", MANIM_TIMEOUT)
        return False, "", "TimeoutExpired"
    except Exception as e:
        logger.error("[manim_runner] Exception subprocess: %s", e)
        return False, "", str(e)


def _find_and_copy_video(media_dir: str, output_path: str) -> bool:
    if not os.path.exists(media_dir):
        return False
    for root, _, files in os.walk(media_dir):
        for fname in files:
            if fname.endswith(".mp4"):
                src = os.path.join(root, fname)
                os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
                shutil.copy2(src, output_path)
                logger.info("[manim_runner] Vidéo copiée: %s -> %s", src, output_path)
                return True
    return False


# ══════════════════════════════════════════
# FIX GEMINI
# ══════════════════════════════════════════

def _fix_manim_code(broken_code: str, error_msg: str, model) -> str:
    fix_prompt = f"""
Tu es un expert Manim Community Edition (v0.17+).
Le code Python suivant produit une erreur lors de l'exécution manim.

ERREUR :
{error_msg[-1500:]}

CODE CASSÉ :
{broken_code[:3000]}

RÈGLES DE CORRECTION STRICTES :
1. La classe DOIT s'appeler exactement "{SCENE_CLASS}" et hériter de "Scene"
2. Utilise UNIQUEMENT : Text, MathTex, VGroup, Axes, FadeIn, FadeOut,
   Write, Create, TransformMatchingTex, LaggedStart, Arrow, NumberLine,
   Rectangle, Circle, Dot, Line, Square
3. N'utilise PAS : SVGMobject, ImageMobject, ThreeDScene, MovingCamera,
   CurvedArrow, DASHED, DashedLine, dash_style, stroke_style=DASHED, ls=DASHED
4. Si tu utilises math.exp() ou math.sin() etc : ajoute "import math" en haut
5. Si tu utilises np.array() etc : ajoute "import numpy as np" en haut
6. Pour les courbes sigmoid ou exponentielles : utilise lambda x: 1/(1+2.718**(-x))
   au lieu de math.exp() pour éviter l'import
7. Remplace tout texte arabe ou accentué dans Text() par du latin ou MathTex
8. Termine avec self.wait(2)
9. Réponds UNIQUEMENT avec le code Python, sans markdown

CODE CORRIGÉ :
"""
    try:
        response = model.generate_content(fix_prompt)
        fixed = _strip_md(response.text.strip())
        fixed = _ensure_class_name(fixed)
        return fixed
    except Exception as e:
        logger.error("[manim_runner] Fix Gemini échoué: %s", e)
        return None


# ══════════════════════════════════════════
# FALLBACK PIL
# ══════════════════════════════════════════

def _pil_fallback(notion: str, etapes: list, output_path: str) -> bool:
    try:
        import imageio
        import numpy as np
        from PIL import Image, ImageDraw, ImageFont

        W, H, FPS = 864, 480, 20
        TOTAL  = FPS * max(len(etapes) * 4 + 5, 15)
        BG     = (15, 10, 35)
        VIOLET = (123, 47, 190)
        GOLD   = (245, 166, 35)
        WHITE  = (240, 240, 255)

        font_candidates = [
            r"C:\Windows\Fonts\arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        font_body_candidates = [
            r"C:\Windows\Fonts\arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
        font_title = font_small = font_body = None
        for p in font_candidates:
            if os.path.exists(p):
                try:
                    font_title = ImageFont.truetype(p, 22)
                    font_small = ImageFont.truetype(p, 13)
                    break
                except Exception:
                    pass
        for p in font_body_candidates:
            if os.path.exists(p):
                try:
                    font_body = ImageFont.truetype(p, 16)
                    break
                except Exception:
                    pass
        if not font_title:
            font_title = font_body = font_small = ImageFont.load_default()

        print(f"[PIL] Génération vidéo fallback -> {output_path}")
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

        with imageio.get_writer(
            output_path, fps=FPS, codec="libx264", quality=7, macro_block_size=16
        ) as writer:
            for f in range(TOTAL):
                t    = f / TOTAL
                img  = Image.new("RGB", (W, H), BG)
                draw = ImageDraw.Draw(img)

                draw.rectangle([0, 0, W, 58], fill=VIOLET)
                notion_short = (notion or "Explication IQRA")[:55]
                draw.text((20, 16), notion_short, font=font_title, fill=(255, 255, 255))

                nb_visible = max(1, int(t * (len(etapes) + 1.5)))
                y = 78
                for i, etape in enumerate(etapes[:nb_visible]):
                    if y > H - 55:
                        break
                    draw.ellipse([20, y, 38, y + 18], fill=GOLD)
                    draw.text((25, y + 1), str(i + 1), font=font_small, fill=(10, 5, 20))
                    words = etape[:140].split()
                    line, lines_out = "", []
                    for w in words:
                        test = (line + " " + w).strip()
                        if len(test) > 72:
                            lines_out.append(line)
                            line = w
                        else:
                            line = test
                    if line:
                        lines_out.append(line)
                    for li in lines_out[:3]:
                        draw.text((48, y), li, font=font_body, fill=WHITE)
                        y += 21
                    y += 8

                draw.rectangle([0, H - 10, W, H], fill=(25, 18, 55))
                draw.rectangle([0, H - 10, int(W * t), H], fill=VIOLET)
                draw.text((W - 85, H - 28), "IQRA AI", font=font_small, fill=GOLD)

                writer.append_data(np.array(img))

        print(f"[PIL] Vidéo générée avec succès -> {output_path}")
        logger.info("[manim_runner] Fallback PIL OK -> %s", output_path)
        return True

    except Exception as e:
        print(f"[PIL] ERREUR: {e}")
        import traceback
        traceback.print_exc()
        logger.error("[manim_runner] Fallback PIL FAILED: %s", e)
        return False


# ══════════════════════════════════════════
# API PUBLIQUE
# ══════════════════════════════════════════

def run_manim_pipeline(
    manim_code: str,
    output_path: str,
    model=None,
    notion: str = "",
    etapes: list = None,
) -> dict:
    etapes = etapes or []

    print(f"[PIPELINE] output_path = {output_path}")

    # 1. Préparation
    code = _strip_md(manim_code or "")
    code = _ensure_class_name(code)

    # 2. Vérification syntaxe
    ok, syn_err = _syntax_ok(code)
    if not ok:
        logger.warning("[manim_runner] Syntaxe invalide: %s", syn_err)
        if model:
            fixed = _fix_manim_code(code, f"SyntaxError: {syn_err}", model)
            if fixed:
                ok2, _ = _syntax_ok(fixed)
                if ok2:
                    code = fixed
                else:
                    return _do_fallback(notion, etapes, output_path, syn_err)
            else:
                return _do_fallback(notion, etapes, output_path, syn_err)
        else:
            return _do_fallback(notion, etapes, output_path, syn_err)

    # 3. Premier run manim
    py_path = _write_tmp(code)
    try:
        ok, stdout, stderr = _run_manim(py_path, output_path)
    finally:
        _cleanup_tmp(py_path)

    if ok:
        print(f"[PIPELINE] Manim succès!")
        return {"success": True, "fallback": False, "video_path": output_path, "error": None}

    # 4. Fix Gemini + retry
    if model:
        logger.info("[manim_runner] Fix Gemini en cours...")
        fixed = _fix_manim_code(code, stderr or stdout, model)
        if fixed:
            py_path2 = _write_tmp(fixed)
            try:
                ok2, _, stderr2 = _run_manim(py_path2, output_path)
            finally:
                _cleanup_tmp(py_path2)
            if ok2:
                print(f"[PIPELINE] Manim succès après fix!")
                return {"success": True, "fallback": False, "video_path": output_path, "error": None}
            logger.warning("[manim_runner] Toujours en échec: %s", stderr2[-200:])

    # 5. Fallback PIL
    return _do_fallback(notion, etapes, output_path, stderr)


def _do_fallback(notion, etapes, output_path, error=""):
    print(f"[FALLBACK] Démarrage PIL -> {output_path}")
    ok = _pil_fallback(notion, etapes, output_path)
    print(f"[FALLBACK] PIL ok={ok}, fichier existe={os.path.exists(output_path)}")
    return {
        "success": ok,
        "fallback": True,
        "video_path": output_path if ok else None,
        "error": (error or "")[:300],
    }