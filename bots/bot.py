import os
import tempfile
from dotenv import load_dotenv
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputMediaPhoto,
    WebAppInfo,
    InputFile,
    MenuButtonWebApp,
)
from io import BytesIO
import httpx
import json
import time
import asyncio
from telegram.error import RetryAfter
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler, filters


# Charger variables depuis .env local puis environnement
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))
load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
# Supprimer le concept de propriétaire: uniquement des administrateurs
OWNER_ID = 0
# Admins chargés depuis config.json au démarrage (main()). Fallback si config vide.
_DEFAULT_ADMINS = [7970178747, 8297042141]
ADMIN_IDS = list(_DEFAULT_ADMINS)
def _is_admin(user_id: int) -> bool:
    try:
        return bool(user_id) and (user_id in ADMIN_IDS)
    except Exception:
        return False
WELCOME_IMAGE_PATH = os.getenv("WELCOME_IMAGE_PATH", "IMG.jpg")
# Par défaut, ouvrir la mini‑app en WebApp dans Telegram si elle est configurée via /admin
MINIAPP_OPEN_MODE = os.getenv("MINIAPP_OPEN_MODE", "webapp").lower()  # "url" ou "webapp"
WELCOME_CAPTION_TEXT = os.getenv("WELCOME_CAPTION_TEXT", """BIENVENUE SUR ALLFARMZ 🚜

⚠️ Le bot et nos canaux Telegram peuvent être désactivés à tout moment ! 🚫⏳

➡️ Rejoignez notre canal sur Potato 🥔 pour ne jamais nous perdre; En cas de bannissement, un nouveau lien sera publié sur Potato.

Retrouvez nos canaux et contactez-nous via les boutons ci-dessous 👇""")

# Liens du clavier d'accueil (/start) sont désormais gérés via config.json modifiable dans /admin

# Définition des catégories affichées sous forme de boutons
CATEGORIES = [
    ("Informations", "infos"),
    ("Contact", "contact"),
    ("LGDF 🥇 Mini-app", "miniapp"),
]


# Stockage simple des utilisateurs (chat_ids) qui ont utilisé le bot
_BASE_DIR = os.path.dirname(__file__)
_USERS_PATH = os.path.join(_BASE_DIR, "users.json")
_CONFIG_PATH = os.path.join(_BASE_DIR, "config.json")
_BANS_PATH = os.path.join(_BASE_DIR, "bans.json")
_USERNAMES_PATH = os.path.join(_BASE_DIR, "usernames.json")

# Journal des messages envoyés par le bot pour suppression globale
_SENT_LOG_PATH = os.path.join(_BASE_DIR, "sent_log.json")

# Verrou pour la purge globale en tâche de fond
_PURGE_BG_RUNNING = False
# Throttle des purges pour éviter les flood waits globaux
_PURGE_OPS_PAUSE = 0.35  # secondes entre opérations
_PURGE_USER_PAUSE = 3.0  # pause entre utilisateurs (purge globale)
_PURGE_LOCAL_RUNNING_CHATS: set[int] = set()

def _load_sent_log():
    try:
        with open(_SENT_LOG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                res = []
                for x in data:
                    if isinstance(x, dict) and "chat_id" in x and "message_id" in x:
                        try:
                            res.append({"chat_id": int(x.get("chat_id")), "message_id": int(x.get("message_id"))})
                        except Exception:
                            pass
                return res
    except Exception:
        pass
    return []

def _save_sent_log(entries):
    try:
        with open(_SENT_LOG_PATH, "w", encoding="utf-8") as f:
            json.dump(entries, f)
    except Exception:
        pass

def _append_sent_log(chat_id: int, message_id: int):
    try:
        entries = _load_sent_log()
        key = (int(chat_id), int(message_id))
        existing = set((int(e.get("chat_id")), int(e.get("message_id"))) for e in entries if isinstance(e, dict))
        if key not in existing:
            entries.append({"chat_id": int(chat_id), "message_id": int(message_id)})
            _save_sent_log(entries)
    except Exception:
        pass

def _reset_sent_log():
    _save_sent_log([])

# Utilitaire: extraire la première URL http/https d'un texte
def _extract_first_url(text: str | None) -> str | None:
    if not text:
        return None
    try:
        import re
        m = re.search(r"https?://\S+", text)
        if m:
            return m.group(0)
    except Exception:
        pass
    return None

# Utilitaire: extraire le premier @username et renvoyer son lien t.me
def _extract_first_username_link(text: str | None) -> str | None:
    if not text:
        return None
    try:
        import re
        m = re.search(r"@([A-Za-z0-9_]{5,})", text)
        if m:
            return f"https://t.me/{m.group(1)}"
    except Exception:
        pass
    return None

# Utilitaire: formater un prix avec le signe euro
def _format_price(val) -> str:
    if val is None or val == "":
        return "N/A"
    s = str(val).strip()
    if not s:
        return "N/A"
    return s + "€" if not s.endswith("€") else s

# Utilitaire: formater les variantes d'un produit (5g 50€, 3g 30€)
def _format_product_prices(p: dict) -> str:
    variants = p.get("variants") or []
    if variants:
        parts = []
        for v in variants:
            name = v.get("name", "")
            price = v.get("price", "")
            vtype = (v.get("type") or "weight").lower()
            if name and price:
                suffix = "g " if vtype == "weight" else " "
                parts.append(f"{name}{suffix}{_format_price(price)}")
            elif price:
                parts.append(_format_price(price))
        if parts:
            return " • ".join(parts)
    bp = p.get("basePrice")
    return _format_price(bp) if bp else "N/A"

# Construire le menu d'ajout produit (tableau + boutons)
def _build_new_product_add_menu(product: dict) -> tuple[str, InlineKeyboardMarkup]:
    def _ok(val) -> str:
        return "✅" if val else "⬜"
    prices = product.get("prices") or []
    has_prices = bool(prices)
    lines = [
        "➕ Nouveau produit",
        "",
        "Remplissez chaque champ en appuyant sur le bouton correspondant:",
        "",
        f"{_ok(product.get('title'))} Titre: {str(product.get('title', ''))[:40] or '(vide)'}",
        f"{_ok(product.get('description'))} Description: {str(product.get('description', ''))[:40] or '(vide)'}",
        f"{_ok('tag' in product)} Tag: {str(product.get('tag', ''))[:30] or '(aucun)'}",
        f"{_ok(has_prices)} Prix: {' • '.join(p['name'] + 'g ' + _format_price(p['price']) for p in prices[:3]) or '(vide)'}{'...' if len(prices) > 3 else ''}",
        f"{_ok(product.get('categoryId') or product.get('categoryName'))} Catégorie: {product.get('categoryName') or '(aucune)'}",
        f"{_ok(product.get('image'))} Photo: {'(présente)' if product.get('image') else '(aucune)'}",
        f"{_ok(product.get('videoUrl'))} Vidéo: {'(présente)' if product.get('videoUrl') else '(aucune)'}",
        "",
    ]
    can_validate = bool(product.get("title")) and bool(product.get("description")) and has_prices
    kb_rows = [
        [InlineKeyboardButton("📝 Titre", callback_data="adm_prod_add_field:title"), InlineKeyboardButton("📄 Description", callback_data="adm_prod_add_field:description")],
        [InlineKeyboardButton("🏷 Tag", callback_data="adm_prod_add_field:tag"), InlineKeyboardButton("💰 Prix", callback_data="adm_prod_add_field:prices")],
        [InlineKeyboardButton("📁 Catégorie", callback_data="adm_prod_add_field:category")],
        [InlineKeyboardButton("🖼 Photo", callback_data="adm_prod_add_field:photo"), InlineKeyboardButton("🎬 Vidéo", callback_data="adm_prod_add_field:video")],
    ]
    if can_validate:
        kb_rows.append([InlineKeyboardButton("✅ Valider le produit", callback_data="adm_prod_add_validate")])
    kb_rows.append([InlineKeyboardButton("❌ Annuler", callback_data="adm_products")])
    return "\n".join(lines), InlineKeyboardMarkup(kb_rows)

# Parser une ligne de prix : "5g 50€", "3g 30€", "20g 60€"
def _parse_price_line(line: str) -> tuple[str, str] | None:
    import re
    line = (line or "").strip()
    if not line:
        return None
    m = re.match(r"^(\d+)\s*g\s*[:\s]*(\d+(?:[.,]\d+)?)\s*€?\s*$", line, re.I)
    if m:
        gram = m.group(1)
        price = m.group(2).replace(",", ".")
        return (gram, price)
    return None

# Mémoire locale: username -> id
def _load_usernames():
    try:
        with open(_USERNAMES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f) or {}
            if isinstance(data, dict):
                return {str(k): int(v) for k, v in data.items()}
    except Exception:
        pass
    return {}

def _save_usernames(mapping: dict[str, int]):
    try:
        with open(_USERNAMES_PATH, "w", encoding="utf-8") as f:
            json.dump({str(k): int(v) for k, v in mapping.items()}, f)
    except Exception:
        pass

def _remember_username(username: str | None, uid: int | None):
    try:
        if not username or not uid:
            return
        m = _load_usernames()
        m[username.lower()] = int(uid)
        _save_usernames(m)
    except Exception:
        pass

# Utilitaire: résoudre un pseudo/ID/mention vers un chat_id
async def _resolve_target_id(msg, context) -> int | None:
    try:
        # 1) Si on répond à un message: prendre l'expéditeur
        rt = getattr(msg, "reply_to_message", None)
        if rt:
            if getattr(rt, "from_user", None):
                return int(rt.from_user.id)
            if getattr(rt, "sender_chat", None):
                return int(rt.sender_chat.id)
        # 2) Si message transféré: prendre la source
        if getattr(msg, "forward_from", None):
            return int(msg.forward_from.id)
        if getattr(msg, "forward_from_chat", None):
            return int(msg.forward_from_chat.id)
    except Exception:
        pass
    raw = (getattr(msg, "text", None) or getattr(msg, "caption", None) or "").strip()
    if not raw:
        return None
    try:
        import re
        # 0) Entités du message: liens/mentions
        try:
            ents = getattr(msg, "entities", None) or getattr(msg, "caption_entities", None) or []
            for e in ents:
                et = getattr(e, "type", None)
                if et in ("mention", "text_link"):
                    if et == "mention":
                        uname = raw[e.offset:e.offset+e.length].lstrip("@")
                        if uname:
                            try:
                                chat = await context.bot.get_chat(f"@{uname}")
                                _remember_username(getattr(chat, "username", None), int(chat.id))
                                return int(chat.id)
                            except Exception:
                                pass
                    else:
                        url = getattr(e, "url", None)
                        if url:
                            m0 = re.search(r"(?:https?://)?t\.me/([A-Za-z0-9_]{5,})", url)
                            if m0:
                                uname = m0.group(1)
                                try:
                                    chat = await context.bot.get_chat(f"@{uname}")
                                    _remember_username(getattr(chat, "username", None), int(chat.id))
                                    return int(chat.id)
                                except Exception:
                                    pass
        except Exception:
            pass
        # 3) Lien t.me/username
        m = re.search(r"(?:https?://)?t\.me/([A-Za-z0-9_]{5,})", raw)
        if m:
            uname = m.group(1)
            try:
                chat = await context.bot.get_chat(f"@{uname}")
                _remember_username(getattr(chat, "username", None), int(chat.id))
                return int(chat.id)
            except Exception:
                pass
        # 4) @username ou username seul
        m2 = re.search(r"@?([A-Za-z0-9_]{5,})", raw)
        if m2 and not raw.isdigit():
            uname2 = m2.group(1)
            try:
                chat = await context.bot.get_chat(f"@{uname2}")
                _remember_username(getattr(chat, "username", None), int(chat.id))
                return int(chat.id)
            except Exception:
                # Essayer le cache local si le réseau refuse
                mcache = _load_usernames()
                cid = mcache.get(uname2.lower())
                if cid:
                    return int(cid)
                pass
        # 5) ID numérique (supporte négatif ex: -100xxxxx)
        mid = re.search(r"-?\d+", raw)
        if mid:
            return int(mid.group(0))
    except Exception:
        pass
    return None

def _load_users():
    try:
        with open(_USERS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return [int(x) for x in data]
    except Exception:
        pass
    return []

def _save_users(users):
    # Dédupliquer et sauvegarder
    uniq = sorted(set(int(x) for x in users))
    try:
        with open(_USERS_PATH, "w", encoding="utf-8") as f:
            json.dump(uniq, f)
    except Exception:
        pass

def _register_user(chat_id: int):
    users = _load_users()
    if chat_id not in users:
        users.append(chat_id)
        _save_users(users)


def _load_config():
    defaults = {
        "welcome_caption": WELCOME_CAPTION_TEXT,
        "infos_text": None,
        "contact_text": None,
        "order_link": "",
        "contact_link": "",
        "admin_ids": ADMIN_IDS,
        # miniapp_url configurable; pas de valeur par défaut pour éviter NameError
        "miniapp_url": "",
        # Liens configurables pour les boutons
        "instagram_url": "",
        "potato_url": "",
        "telegram_channel_url": "",
        "instagram_backup_url": "",
        "bots_url": "",
        "linktree_url": "",
        # Gestion dynamique des boutons
        "hidden_buttons": [],  # ex: ["infos", "contact", "miniapp", "instagram", "potato", "linktree", "tg", "ig_backup", "bots"]
        "custom_buttons": [],  # liste d'objets: {id, label, type: "url"|"message", value}
    }
    try:
        with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                defaults.update(data)
    except Exception:
        pass
    try:
        defaults["admin_ids"] = [int(x) for x in defaults.get("admin_ids", [])]
    except Exception:
        defaults["admin_ids"] = []
    return defaults

def _save_config(cfg: dict):
    try:
        with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def _load_bans():
    try:
        with open(_BANS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return [int(x) for x in data]
    except Exception:
        pass
    return []

def _save_bans(bans):
    try:
        uniq = sorted(set(int(x) for x in bans))
        with open(_BANS_PATH, "w", encoding="utf-8") as f:
            json.dump(uniq, f)
    except Exception:
        pass

def _is_banned(user_id: int) -> bool:
    try:
        return int(user_id) in _load_bans()
    except Exception:
        return False

# --------- Métriques d'usage ---------
_METRICS_PATH = os.path.join(_BASE_DIR, "metrics.json")

def _load_metrics():
    defaults = {"starts_total": 0, "clicks": {}, "created_at": int(time.time())}
    try:
        with open(_METRICS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                # Assurer la présence des clés nécessaires
                if "starts_total" not in data:
                    data["starts_total"] = 0
                if "clicks" not in data or not isinstance(data.get("clicks"), dict):
                    data["clicks"] = {}
                if "created_at" not in data:
                    data["created_at"] = int(time.time())
                return data
    except Exception:
        pass
    return defaults

def _save_metrics(metrics: dict):
    try:
        with open(_METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(metrics, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def _inc_metric(key: str, amount: int = 1):
    try:
        m = _load_metrics()
        m[key] = int(m.get(key, 0)) + int(amount)
        _save_metrics(m)
    except Exception:
        pass

def _inc_click(name: str, amount: int = 1):
    try:
        m = _load_metrics()
        clicks = m.get("clicks") or {}
        clicks[name] = int(clicks.get(name, 0)) + int(amount)
        m["clicks"] = clicks
        _save_metrics(m)
    except Exception:
        pass


async def _get_welcome_media():
    """Charge l'image locale IMG.jpg depuis le dossier du script; sinon télécharge depuis l'URL."""
    base_dir = os.path.dirname(__file__)
    # Gérer un chemin configuré via env; par défaut IMG.jpg
    local_path = (
        WELCOME_IMAGE_PATH if os.path.isabs(WELCOME_IMAGE_PATH) else os.path.join(base_dir, WELCOME_IMAGE_PATH)
    )
    if os.path.exists(local_path):
        try:
            return InputFile(open(local_path, "rb"), filename=os.path.basename(local_path))
        except Exception:
            pass
    # Aucun fallback distant: retourner None si l'image locale est introuvable
    return None


def _build_welcome_keyboard_layout(cfg, hidden=None, bot_username=None):
    """
    Clavier d'accueil :
    - Ligne 1 : [GhostLine13 MiniApp] (pleine largeur, web_app)
    - Ligne 2 : [Potato 🥔🚀] [Contact 📱]
    - Ligne 3 : [Telegram 📸] [WhatsApp 💚]
    """
    hidden = hidden or cfg.get("hidden_buttons", [])
    miniapp_label = cfg.get("miniapp_label", "GhostLine13 MiniApp")
    miniapp_url = cfg.get("miniapp_url")
    potato = cfg.get("potato_url")
    tg_channel = cfg.get("telegram_channel_url")
    whatsapp_url = cfg.get("whatsapp_url") or cfg.get("contact_link")
    contact_username = (cfg.get("contact_text") or "").strip()
    if not whatsapp_url and contact_username and (contact_username.startswith("@") or "wa.me" in contact_username or "whatsapp" in (contact_username or "").lower()):
        if contact_username.startswith("@"):
            whatsapp_url = f"https://t.me/{contact_username.lstrip('@')}"
        else:
            whatsapp_url = contact_username

    rows = []

    # Ligne 1 : Mini-App pleine largeur
    if "miniapp" not in hidden:
        if miniapp_url:
            if MINIAPP_OPEN_MODE == "webapp":
                rows.append([InlineKeyboardButton(miniapp_label, web_app=WebAppInfo(url=miniapp_url))])
            else:
                rows.append([InlineKeyboardButton(miniapp_label, url=miniapp_url)])
        else:
            rows.append([InlineKeyboardButton(miniapp_label, callback_data="miniapp")])

    # Ligne 2 : Potato | Contact (bouton contact à côté de Potato)
    row2 = []
    if "potato" not in hidden:
        row2.append(InlineKeyboardButton("Potato 🥔🚀", url=potato) if potato else InlineKeyboardButton("Potato 🥔🚀", callback_data="nolink_potato"))
    if "contact" not in hidden:
        contact_url = None
        if contact_username.startswith("@"):
            contact_url = f"https://t.me/{contact_username.lstrip('@')}"
        elif contact_username and (contact_username.startswith("http") or "wa.me" in contact_username):
            contact_url = contact_username
        contact_link_cfg = cfg.get("contact_link", "")
        if not contact_url and contact_link_cfg:
            contact_url = contact_link_cfg
        row2.append(InlineKeyboardButton("Contact 📱", url=contact_url) if contact_url else InlineKeyboardButton("Contact 📱", callback_data="contact"))
    if row2:
        rows.append(row2)

    # Ligne 3 : Telegram | WhatsApp (côte à côte comme Potato et Contact)
    row4 = []
    if "tg" not in hidden:
        row4.append(InlineKeyboardButton("Telegram 📸", url=tg_channel) if tg_channel else InlineKeyboardButton("Telegram 📸", callback_data="nolink_tg"))
    if "contact" not in hidden:
        row4.append(InlineKeyboardButton("WhatsApp 💚", url=whatsapp_url) if whatsapp_url else InlineKeyboardButton("WhatsApp 💚", callback_data="contact"))
    if row4:
        rows.append(row4)

    return InlineKeyboardMarkup(rows) if rows else InlineKeyboardMarkup([[]])


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Envoie l'image d'accueil et un clavier inline avec les catégories."""
    # Bloquer les utilisateurs bannis
    if update.effective_user and _is_banned(update.effective_user.id):
        try:
            m = await context.bot.send_message(chat_id=update.effective_chat.id, text="Accès refusé: utilisateur banni.")
            _append_sent_log(update.effective_chat.id, m.message_id)
        except Exception:
            pass
        return

    # Gestion de la liaison de compte (deep linking)
    if context.args and len(context.args) > 0:
        arg = context.args[0]
        if arg.startswith("link_"):
            user_id = arg.replace("link_", "").strip()
            try:
                cfg = _load_config()
                # API peut être sur une URL différente (BOT_API_BASE_URL ou miniapp_url)
                api_base = os.getenv("BOT_API_BASE_URL", "").rstrip("/") or cfg.get("miniapp_url", "").rstrip("/")
                api_key = os.getenv("BOT_API_KEY", "")
                
                if api_base and api_key:
                    headers = {"Content-Type": "application/json", "x-api-key": api_key}
                    payload = {
                        "userId": user_id,
                        "telegramId": str(update.effective_user.id),
                        "telegramUsername": getattr(update.effective_user, "username", None),
                        "telegramFirstName": getattr(update.effective_user, "first_name", None),
                    }
                    link_url = f"{api_base}/api/bot/link"
                    
                    async with httpx.AsyncClient() as client:
                        resp = await client.post(link_url, json=payload, headers=headers, timeout=15.0)
                        try:
                            resp_json = resp.json()
                        except Exception:
                            resp_json = {}
                        
                        if resp.status_code == 200:
                            await context.bot.send_message(
                                chat_id=update.effective_chat.id,
                                text="✅ Compte lié avec succès!\n\nVotre compte Telegram est maintenant lié à votre compte sur l'application.",
                                parse_mode="HTML"
                            )
                        elif resp.status_code == 409:
                            await context.bot.send_message(
                                chat_id=update.effective_chat.id,
                                text="⚠️ Compte déjà lié\n\nCe compte Telegram est déjà lié à un autre utilisateur.",
                                parse_mode="HTML"
                            )
                        elif resp.status_code == 404:
                            await context.bot.send_message(
                                chat_id=update.effective_chat.id,
                                text="❌ Compte introuvable\n\nAssurez-vous d'ouvrir le lien depuis l'application (bouton Lier mon compte).",
                                parse_mode="HTML"
                            )
                        else:
                            err_msg = resp_json.get("error", "Erreur inconnue")
                            print(f"[Liaison] API {resp.status_code}: {err_msg} | userId={user_id} | url={link_url}")
                            await context.bot.send_message(
                                chat_id=update.effective_chat.id,
                                text=f"❌ Erreur de liaison ({resp.status_code})\n\n{err_msg}\n\nVérifiez que BOT_API_KEY est identique entre le bot et l'app.",
                                parse_mode="HTML"
                            )
                else:
                    await context.bot.send_message(
                        chat_id=update.effective_chat.id,
                        text="❌ Configuration manquante\n\nLe bot n'est pas configuré pour la liaison (URL ou API Key manquante).",
                        parse_mode="HTML"
                    )
            except Exception as e:
                print(f"Erreur liaison: {e}")
                await context.bot.send_message(
                    chat_id=update.effective_chat.id,
                    text="❌ Erreur technique\n\nImpossible de lier le compte pour le moment.",
                    parse_mode="HTML"
                )
            # On continue pour afficher le menu d'accueil après la tentative de liaison
    
    # Enregistrer l'utilisateur qui démarre le bot
    try:
        _register_user(update.effective_chat.id)
        try:
            uname = getattr(update.effective_user, "username", None)
            _remember_username(uname, update.effective_user.id if update.effective_user else None)
        except Exception:
            pass
    except Exception:
        pass
    # Comptabiliser le démarrage du bot
    try:
        _inc_metric("starts_total", 1)
    except Exception:
        pass
    # Construire le clavier sur 2 lignes: [Informations | Contact], [LGDF ( Le Guide de France ) Mini-app]
    # Légende d'accueil: configurable via WELCOME_CAPTION_TEXT pour correspondre exactement au texte de l'image
    main_caption = WELCOME_CAPTION_TEXT
    # Surcharger via config.json si présent
    try:
        cfg = _load_config()
        if cfg.get("welcome_caption"):
            main_caption = cfg.get("welcome_caption")
    except Exception:
        pass
    # Clavier exactement comme l'image : 1 pleine largeur + 2x2
    try:
        cfg2 = _load_config()
    except Exception:
        cfg2 = {}
    reply_markup = _build_welcome_keyboard_layout(cfg2)
    caption = main_caption
    media = await _get_welcome_media()
    try:
        if media is not None:
            m = await context.bot.send_photo(chat_id=update.effective_chat.id, photo=media, caption=caption, reply_markup=reply_markup)
        else:
            m = await context.bot.send_message(chat_id=update.effective_chat.id, text=caption, reply_markup=reply_markup)
        try:
            _append_sent_log(update.effective_chat.id, m.message_id)
        except Exception:
            pass
    except Exception:
        pass
    return


async def handle_category(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Gère les clics sur les catégories et répond en conséquence."""
    query = update.callback_query
    # Répondre au clic rapidement, sans bloquer si le réseau est lent
    try:
        await query.answer()
    except Exception:
        # Ignorer les erreurs de réseau pour garder l'UX fluide
        pass

    data = query.data
    # Enregistrer un clic sur le bouton (y compris retour et nolink)
    try:
        _inc_click(str(data), 1)
    except Exception:
        pass
    # Si l'utilisateur clique sur un bouton sans lien configuré, afficher une alerte
    try:
        if str(data).startswith("nolink_"):
            await query.answer("Lien non configuré pour ce bouton. Configurez-le via /admin.", show_alert=True)
            return
    except Exception:
        pass
    # Enregistrer l'utilisateur lors d'une interaction
    try:
        _register_user(update.effective_chat.id)
    except Exception:
        pass

    # Boutons personnalisés: répondre avec le message configuré
    try:
        if str(data).startswith("custom:"):
            cid = str(data).split(":", 1)[1]
            cfg = _load_config()
            customs = cfg.get("custom_buttons", [])
            for c in customs:
                if str(c.get("id")) == str(cid):
                    if str(c.get("type")) == "message":
                        val = c.get("value") or ""
                        if val:
                            try:
                                m = await query.message.reply_text(val)
                                try:
                                    _append_sent_log(m.chat.id, m.message_id)
                                except Exception:
                                    pass
                            except Exception:
                                pass
                        return
                    # Si type=url, le bouton doit être créé avec url et ne passe pas par ici
                    break
    except Exception:
        pass

    responses = {
        "infos": ("- en attente du message -"),
        "contact": ("- en attente du message -"),
        "miniapp": (
            "🧩 GhostLine13 MiniApp\n\n"
            "Disponible via le bouton « MiniApp » ci-dessous."
        ),
    }

    # Gestion du retour: restaurer la légende et le clavier principal (même layout que /start)
    if data == "back":
        main_caption = WELCOME_CAPTION_TEXT
        try:
            cfg = _load_config()
            if cfg.get("welcome_caption"):
                main_caption = cfg.get("welcome_caption")
        except Exception:
            pass
        await query.edit_message_caption(caption=main_caption)
        try:
            cfg3 = _load_config()
        except Exception:
            cfg3 = {}
        reply_markup = _build_welcome_keyboard_layout(cfg3)
        await query.edit_message_reply_markup(reply_markup=reply_markup)
        return

    # Infos/Contact: ne plus afficher le texte ici; les boutons ouvrent des liens directs
    if data in ("infos", "contact"):
        back_btn = InlineKeyboardButton("⬅️ Retour", callback_data="back")
        reply_markup = InlineKeyboardMarkup([[back_btn]])
        await query.edit_message_reply_markup(reply_markup=reply_markup)
        return

    # Mini-app (ou autre): mettre le texte et ré-afficher le clavier principal
    text = responses.get(data, "Catégorie inconnue.")
    await query.edit_message_caption(caption=text)
    try:
        cfg4 = _load_config()
    except Exception:
        cfg4 = {}
    reply_markup = _build_welcome_keyboard_layout(cfg4)
    await query.edit_message_reply_markup(reply_markup=reply_markup)
    return




async def handle_category(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Gère les clics sur les catégories et répond en conséquence."""
    query = update.callback_query
    # Répondre au clic rapidement, sans bloquer si le réseau est lent
    try:
        await query.answer()
    except Exception:
        # Ignorer les erreurs de réseau pour garder l'UX fluide
        pass

    data = query.data
    # Enregistrer un clic sur le bouton (y compris retour et nolink)
    try:
        _inc_click(str(data), 1)
    except Exception:
        pass
    # Si l'utilisateur clique sur un bouton sans lien configuré, afficher une alerte
    try:
        if str(data).startswith("nolink_"):
            await query.answer("Lien non configuré pour ce bouton. Configurez-le via /admin.", show_alert=True)
            return
    except Exception:
        pass
    # Enregistrer l'utilisateur lors d'une interaction
    try:
        _register_user(update.effective_chat.id)
    except Exception:
        pass

    # Boutons personnalisés: répondre avec le message configuré
    try:
        if str(data).startswith("custom:"):
            cid = str(data).split(":", 1)[1]
            cfg = _load_config()
            customs = cfg.get("custom_buttons", [])
            for c in customs:
                if str(c.get("id")) == str(cid):
                    if str(c.get("type")) == "message":
                        val = c.get("value") or ""
                        if val:
                            try:
                                m = await query.message.reply_text(val)
                                try:
                                    _append_sent_log(m.chat.id, m.message_id)
                                except Exception:
                                    pass
                            except Exception:
                                pass
                        return
                    # Si type=url, le bouton doit être créé avec url et ne passe pas par ici
                    break
    except Exception:
        pass

    responses = {
        "infos": ("- en attente du message -"),
        "contact": ("- en attente du message -"),
        "miniapp": (
            "🧩 GhostLine13 MiniApp\n\n"
            "Disponible via le bouton « MiniApp » ci-dessous."
        ),
    }

    # Gestion du retour: restaurer la légende et le clavier (même layout que /start)
    if data == "back":
        main_caption = WELCOME_CAPTION_TEXT
        try:
            cfg = _load_config()
            if cfg.get("welcome_caption"):
                main_caption = cfg.get("welcome_caption")
        except Exception:
            pass
        await query.edit_message_caption(caption=main_caption)
        try:
            cfg3 = _load_config()
        except Exception:
            cfg3 = {}
        reply_markup = _build_welcome_keyboard_layout(cfg3)
        await query.edit_message_reply_markup(reply_markup=reply_markup)
        return

    # Infos/Contact: ne plus afficher le texte ici; les boutons ouvrent des liens directs
    if data in ("infos", "contact"):
        back_btn = InlineKeyboardButton("⬅️ Retour", callback_data="back")
        reply_markup = InlineKeyboardMarkup([[back_btn]])
        await query.edit_message_reply_markup(reply_markup=reply_markup)
        return

    # Mini-app (ou autre): mettre le texte et ré-afficher le clavier (même layout que /start)
    text = responses.get(data, "Catégorie inconnue.")
    await query.edit_message_caption(caption=text)
    try:
        cfg4 = _load_config()
    except Exception:
        cfg4 = {}
    reply_markup = _build_welcome_keyboard_layout(cfg4)
    await query.edit_message_reply_markup(reply_markup=reply_markup)


async def page_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Dans un canal, répond à /page en supprimant la commande et en postant l'accueil avec boutons."""
    # Supprimer le message de commande pour ne pas montrer que vous l'avez envoyé
    try:
        if update.effective_message:
            await context.bot.delete_message(chat_id=update.effective_chat.id, message_id=update.effective_message.message_id)
    except Exception:
        # Ignorer erreurs (permissions manquantes, bot non admin, etc.)
        pass
    # Construire le même clavier que /start
    main_caption = WELCOME_CAPTION_TEXT
    try:
        cfg = _load_config()
        if cfg.get("welcome_caption"):
            main_caption = cfg.get("welcome_caption")
    except Exception:
        pass
    # Même clavier que /start : layout comme l'image (Mini-App pleine largeur + grille 2x2)
    try:
        cfg2 = _load_config()
    except Exception:
        cfg2 = {}
    reply_markup = _build_welcome_keyboard_layout(
        cfg2, cfg2.get("hidden_buttons"), getattr(context.bot, "username", None)
    )

    # Envoyer l'accueil dans le canal avec journalisation
    media = await _get_welcome_media()
    caption = main_caption
    try:
        if media is not None:
            m = await context.bot.send_photo(chat_id=update.effective_chat.id, photo=media, caption=caption, reply_markup=reply_markup)
        else:
            m = await context.bot.send_message(chat_id=update.effective_chat.id, text=caption, reply_markup=reply_markup)
        try:
            _append_sent_log(update.effective_chat.id, m.message_id)
        except Exception:
            pass
    except Exception:
        pass

async def _purge_privates_background(context: ContextTypes.DEFAULT_TYPE, notify_chat_id: int) -> None:
    """Tâche de fond: purge globale des conversations privées pour tous les utilisateurs.
    Ne bloque pas les autres commandes. Envoie un message de fin dans le chat notify_chat_id.
    """
    global _PURGE_BG_RUNNING
    if _PURGE_BG_RUNNING:
        # Informer rapidement que la purge est déjà en cours
        try:
            m = await context.bot.send_message(chat_id=notify_chat_id, text="Purge globale déjà en cours…")
            try:
                await asyncio.sleep(4.0)
                await context.bot.delete_message(chat_id=m.chat.id, message_id=m.message_id)
            except Exception:
                pass
        except Exception:
            pass
        return
    _PURGE_BG_RUNNING = True
    global_deleted = 0
    global_edited = 0
    global_errors = 0
    try:
        try:
            users = _load_users()
        except Exception:
            users = []
        PURGE_ALL_WINDOW = 8000
        for u_chat_id in users:
            # Obtenir un dernier ID via un message temporaire
            tmp_msg = None
            try:
                tmp_msg = await context.bot.send_message(chat_id=u_chat_id, text="\u2060")
            except RetryAfter as e:
                try:
                    await asyncio.sleep(float(getattr(e, "retry_after", 1.0)) + 0.1)
                    tmp_msg = await context.bot.send_message(chat_id=u_chat_id, text="\u2060")
                except Exception:
                    tmp_msg = None
            except Exception:
                tmp_msg = None
            last_id = None
            try:
                if tmp_msg:
                    last_id = int(tmp_msg.message_id)
                    try:
                        await context.bot.delete_message(chat_id=u_chat_id, message_id=tmp_msg.message_id)
                    except Exception:
                        pass
            except Exception:
                last_id = None
            if not last_id:
                continue
            start_id = max(1, int(last_id) - PURGE_ALL_WINDOW)
            ops = 0
            for mid in range(int(last_id), start_id - 1, -1):
                try:
                    await context.bot.delete_message(chat_id=u_chat_id, message_id=mid)
                    global_deleted += 1
                    try:
                        await asyncio.sleep(_PURGE_OPS_PAUSE)
                    except Exception:
                        pass
                except RetryAfter as e:
                    # Attendre puis retenter, sinon fallback édition
                    try:
                        await asyncio.sleep(float(getattr(e, "retry_after", 1.0)) + 0.1)
                        await context.bot.delete_message(chat_id=u_chat_id, message_id=mid)
                        global_deleted += 1
                        ops += 1
                        try:
                            await asyncio.sleep(_PURGE_OPS_PAUSE)
                        except Exception:
                            pass
                        continue
                    except Exception:
                        pass
                    try:
                        await context.bot.edit_message_reply_markup(chat_id=u_chat_id, message_id=mid, reply_markup=None)
                    except Exception:
                        pass
                    edit_done = False
                    try:
                        await context.bot.edit_message_text(chat_id=u_chat_id, message_id=mid, text="\u2060")
                        global_edited += 1
                        edit_done = True
                    except Exception:
                        pass
                    if not edit_done:
                        try:
                            await context.bot.edit_message_caption(chat_id=u_chat_id, message_id=mid, caption="\u2060")
                            global_edited += 1
                            edit_done = True
                        except Exception:
                            pass
                    if not edit_done:
                        global_errors += 1
                    try:
                        await asyncio.sleep(_PURGE_OPS_PAUSE)
                    except Exception:
                        pass
                except Exception:
                    try:
                        await context.bot.edit_message_reply_markup(chat_id=u_chat_id, message_id=mid, reply_markup=None)
                    except Exception:
                        pass
                    edit_done = False
                    try:
                        await context.bot.edit_message_text(chat_id=u_chat_id, message_id=mid, text="\u2060")
                        global_edited += 1
                        edit_done = True
                    except Exception:
                        pass
                    if not edit_done:
                        try:
                            await context.bot.edit_message_caption(chat_id=u_chat_id, message_id=mid, caption="\u2060")
                            global_edited += 1
                            edit_done = True
                        except Exception:
                            pass
                    if not edit_done:
                        global_errors += 1
                ops += 1
            # Petite pause entre utilisateurs pour éviter saturation globale
            try:
                await asyncio.sleep(_PURGE_USER_PAUSE)
            except Exception:
                pass
    finally:
        _PURGE_BG_RUNNING = False
        # Message de fin
        try:
            done_text = (
                f"Purge globale privés terminée: {global_deleted} supprimé(s), {global_edited} édité(s), {global_errors} échec(s)."
            )
            m = await context.bot.send_message(chat_id=notify_chat_id, text=done_text)
            try:
                await asyncio.sleep(7.0)
                await context.bot.delete_message(chat_id=m.chat.id, message_id=m.message_id)
            except Exception:
                pass
        except Exception:
            pass


async def _purge_local_background(context: ContextTypes.DEFAULT_TYPE, chat_id: int, last_msg_id: int) -> None:
    """Tâche de fond: purge locale des derniers messages d'un chat donné.
    Utilise throttling et RetryAfter pour éviter de bloquer le bot.
    """
    # Éviter les purges concurrentes sur le même chat
    global _PURGE_LOCAL_RUNNING_CHATS
    if chat_id in _PURGE_LOCAL_RUNNING_CHATS:
        try:
            m = await context.bot.send_message(chat_id=chat_id, text="Purge locale déjà en cours…")
            try:
                await asyncio.sleep(4.0)
                await context.bot.delete_message(chat_id=m.chat.id, message_id=m.message_id)
            except Exception:
                pass
        except Exception:
            pass
        return
    _PURGE_LOCAL_RUNNING_CHATS.add(chat_id)
    try:
        # Déterminer le type de chat pour adapter la fenêtre
        PURGE_WINDOW = 1200
        try:
            chat = await context.bot.get_chat(chat_id)
            chat_type = getattr(chat, "type", "") or ""
            if chat_type == "private":
                PURGE_WINDOW = 8000
            elif chat_type in ("group", "supergroup"):
                PURGE_WINDOW = 3000
        except Exception:
            pass
        start_id = max(1, int(last_msg_id) - PURGE_WINDOW)
        deleted = 0
        edited = 0
        errors = 0
        for mid in range(int(last_msg_id), start_id - 1, -1):
            try:
                await context.bot.delete_message(chat_id=chat_id, message_id=mid)
                deleted += 1
                try:
                    await asyncio.sleep(_PURGE_OPS_PAUSE)
                except Exception:
                    pass
            except RetryAfter as e:
                try:
                    await asyncio.sleep(float(getattr(e, "retry_after", 1.0)) + 0.1)
                    await context.bot.delete_message(chat_id=chat_id, message_id=mid)
                    deleted += 1
                    try:
                        await asyncio.sleep(_PURGE_OPS_PAUSE)
                    except Exception:
                        pass
                    continue
                except Exception:
                    pass
                try:
                    await context.bot.edit_message_reply_markup(chat_id=chat_id, message_id=mid, reply_markup=None)
                except Exception:
                    pass
                edit_done = False
                try:
                    await context.bot.edit_message_text(chat_id=chat_id, message_id=mid, text="\u2060")
                    edited += 1
                    edit_done = True
                except Exception:
                    pass
                if not edit_done:
                    try:
                        await context.bot.edit_message_caption(chat_id=chat_id, message_id=mid, caption="\u2060")
                        edited += 1
                        edit_done = True
                    except Exception:
                        pass
                if not edit_done:
                    errors += 1
                try:
                    await asyncio.sleep(_PURGE_OPS_PAUSE)
                except Exception:
                    pass
            except Exception:
                try:
                    await context.bot.edit_message_reply_markup(chat_id=chat_id, message_id=mid, reply_markup=None)
                except Exception:
                    pass
                edit_done = False
                try:
                    await context.bot.edit_message_text(chat_id=chat_id, message_id=mid, text="\u2060")
                    edited += 1
                    edit_done = True
                except Exception:
                    pass
                if not edit_done:
                    try:
                        await context.bot.edit_message_caption(chat_id=chat_id, message_id=mid, caption="\u2060")
                        edited += 1
                        edit_done = True
                    except Exception:
                        pass
                if not edit_done:
                    errors += 1
                try:
                    await asyncio.sleep(_PURGE_OPS_PAUSE)
                except Exception:
                    pass
        # Message de fin local court
        try:
            done_text = (
                f"Purge locale terminée: {deleted} supprimé(s), {edited} édité(s), {errors} échec(s)."
            )
            m = await context.bot.send_message(chat_id=chat_id, text=done_text)
            try:
                await asyncio.sleep(6.0)
                await context.bot.delete_message(chat_id=m.chat.id, message_id=m.message_id)
            except Exception:
                pass
        except Exception:
            pass
    except Exception:
        pass
    finally:
        try:
            _PURGE_LOCAL_RUNNING_CHATS.discard(chat_id)
        except Exception:
            pass

async def handle_delete(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Callback pour suppression owner-only. Ici: delall pour supprimer chez tous."""
    query = update.callback_query
    try:
        await query.answer()
    except Exception:
        pass
    user_id = query.from_user.id if query.from_user else 0
    if not _is_admin(user_id):
        # Refuser si ce n'est pas le propriétaire
        try:
            await query.answer("Non autorisé", show_alert=True)
        except Exception:
            pass
        return

    data = query.data or ""

# --------- Panneau d'administration ---------
def _admin_panel_caption() -> str:
    """Texte affiché avec le panneau admin (sans emoji)."""
    return "Panneau d'administration du bot\nSélectionnez une option ci-dessous:"

# Strictement 2 boutons par ligne, libellés courts pour éviter la troncature
def _admin_keyboard():
    cfg = _load_config()
    base_url = (cfg.get("miniapp_url") or "").rstrip("/")
    # Utiliser /admin (route Next.js) + hash pour la page Produits - plus fiable que /administration/index.html
    admin_url = f"{base_url}/admin#/product" if base_url else ""
    rows = [
        [InlineKeyboardButton("📊 Statistiques", callback_data="adm_stats"), InlineKeyboardButton("💬 Utilisateurs", callback_data="adm_users")],
        [InlineKeyboardButton("💬 Message accueil", callback_data="adm_edit_welcome"), InlineKeyboardButton("☎️ Contact", callback_data="adm_edit_contact")],
        [InlineKeyboardButton("✏️ Nom MiniApp", callback_data="adm_edit_miniapp_label"), InlineKeyboardButton("🛒 @ Panier", callback_data="adm_edit_order_username")],
        [InlineKeyboardButton("🛠️ Liens boutons", callback_data="adm_links"), InlineKeyboardButton("🛒 Produits", callback_data="adm_products")],
        [InlineKeyboardButton("📂 Catégories", callback_data="adm_categories")],
        [InlineKeyboardButton("📝 Profil (textes)", callback_data="adm_profil_blocks"), InlineKeyboardButton("🚫 Bans", callback_data="adm_bans")],
        [InlineKeyboardButton("🖼️ Logo", callback_data="adm_change_logo"), InlineKeyboardButton("👑 Admins", callback_data="adm_admins")],
        [InlineKeyboardButton("❓ Aide", callback_data="adm_help")],
        [InlineKeyboardButton("⬅️ Retour accueil", callback_data="adm_retour_accueil")],
    ]
    # Bouton "Ouvrir l'admin site" si l'URL est configurée (Catégories + Profil dans l'admin web)
    if admin_url:
        rows.insert(-1, [InlineKeyboardButton("🖥 Ouvrir l'admin site", web_app=WebAppInfo(url=admin_url))])
    return InlineKeyboardMarkup(rows)

async def admin_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id if update.effective_user else 0
    if not _is_admin(user_id):
        await update.message.reply_text("Accès réservé aux administrateurs.")
        return
    # Réinitialiser la pile de navigation de l'admin pour cette session
    try:
        context.user_data["adm_nav_stack"] = []
    except Exception:
        pass
    # Afficher l'image du bot en tête du panneau admin si disponible
    caption = _admin_panel_caption()
    try:
        media = await _get_welcome_media()
    except Exception:
        media = None
    if media is not None:
        try:
            await update.message.reply_photo(photo=media, caption=caption, reply_markup=_admin_keyboard())
            return
        except Exception:
            pass
    # Fallback texte si l'image n'est pas disponible
    await update.message.reply_text(caption, reply_markup=_admin_keyboard())

async def handle_admin_action(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    try:
        await query.answer()
    except Exception:
        pass
    user_id = query.from_user.id if query.from_user else 0
    if not _is_admin(user_id):
        try:
            await query.answer("Non autorisé", show_alert=True)
        except Exception:
            pass
        return
    data = query.data
    # Helper pour éditer en conservant media/caption si nécessaire
    async def _admin_edit(text: str, reply_markup=None, store_prev: bool = True):
        try:
            msg = query.message
            if not msg:
                return
            # Empiler l'état précédent pour permettre un retour contextuel
            if store_prev:
                try:
                    prev_text = None
                    if msg.photo or msg.video or msg.animation:
                        prev_text = msg.caption
                    else:
                        prev_text = msg.text
                    prev_kb = getattr(msg, "reply_markup", None)
                    # Éviter d'empiler si l'état est identique
                    same_text = (str(prev_text or "").strip() == str(text or "").strip())
                    prev_kb_rows = getattr(prev_kb, "inline_keyboard", None)
                    next_kb_rows = getattr(reply_markup, "inline_keyboard", None)
                    same_kb = False
                    try:
                        same_kb = json.dumps(prev_kb_rows, ensure_ascii=False) == json.dumps(next_kb_rows, ensure_ascii=False)
                    except Exception:
                        same_kb = False
                    if not (same_text and same_kb):
                        stack = context.user_data.get("adm_nav_stack") or []
                        has_photo = bool(msg.photo or msg.video or msg.animation)
                        stack.append({"text": prev_text, "reply_markup": prev_kb, "has_photo": has_photo})
                        context.user_data["adm_nav_stack"] = stack
                except Exception:
                    pass
            if msg.photo or msg.video or msg.animation:
                # Remplacer uniquement la légende si média présent
                try:
                    await msg.edit_caption(caption=text, reply_markup=reply_markup)
                    return
                except Exception:
                    pass
            # Sinon éditer le texte du message
            await msg.edit_text(text=text, reply_markup=reply_markup)
        except Exception:
            pass
    # Helper pour ajouter systématiquement un bouton Retour
    def _with_back(kb: InlineKeyboardMarkup | None = None):
        try:
            rows = []
            if kb and getattr(kb, 'inline_keyboard', None):
                rows = list(kb.inline_keyboard)
            rows.append([InlineKeyboardButton("⬅️ Retour", callback_data="adm_back")])
            return InlineKeyboardMarkup(rows)
        except Exception:
            return InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Retour", callback_data="adm_back")]])
    # Stats
    if data == "adm_stats":
        users = _load_users()
        bans = _load_bans()
        m = _load_metrics()
        clicks = m.get("clicks", {})
        created_ts = int(m.get("created_at", int(time.time())))
        created_fmt = "inconnu"
        try:
            created_fmt = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(created_ts))
        except Exception:
            pass
        # Construire un aperçu des clics (limiter l'affichage pour éviter les messages trop longs)
        top_items = []
        try:
            for k, v in clicks.items():
                top_items.append(f"• {k}: {v}")
        except Exception:
            pass
        clicks_text = "\n".join(top_items) if top_items else "• Aucun clic enregistré pour le moment"
        txt = (
            f"📊 Statistiques du bot\n\n"
            f"🗓️ Créé le: {created_fmt}\n"
            f"👥 Total utilisateurs uniques: {len(users)}\n"
            f"🚀 Démarrages cumulés (/start): {int(m.get('starts_total', 0))}\n"
            f"👉 Clics par action:\n{clicks_text}\n\n"
            f"🚫 Utilisateurs bannis: {len(bans)}"
        )
        await _admin_edit(txt, reply_markup=_with_back(_admin_keyboard()))
        return
    # Users : afficher uniquement les infos (total, actifs, aujourd'hui), pas la liste
    if data == "adm_users":
        try:
            users = _load_users()
            total = len(users)
            m = _load_metrics()
            starts_today = m.get("starts_today", 0)  # optionnel si on enregistre /start par jour
            # Actifs et aujourd'hui non suivis pour l'instant
            txt = (
                f"💬 Utilisateurs\n\n"
                f"👥 Total : {total}\n"
                f"🟢 Actifs : —\n"
                f"📅 Aujourd'hui : —"
            )
            await _admin_edit(txt, reply_markup=_with_back(_admin_keyboard()))
        except Exception:
            pass
        return
    # Message accueil : supprimer le message actuel, envoyer photo + message actuel + bouton "Changer le message"
    if data == "adm_edit_welcome":
        try:
            await query.message.delete()
        except Exception:
            pass
        try:
            cfg = _load_config()
            current = (cfg.get("welcome_caption") or WELCOME_CAPTION_TEXT).strip()
            media = await _get_welcome_media()
            caption = f"💬 Message d'accueil actuel:\n\n----\n{current}\n----"
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton("Changer le message", callback_data="adm_welcome_ask_new")],
                [InlineKeyboardButton("⬅️ Retour", callback_data="adm_back")],
            ])
            if media:
                await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=caption, reply_markup=kb)
            else:
                await context.bot.send_message(chat_id=query.message.chat_id, text=caption, reply_markup=kb)
        except Exception:
            pass
        return
    # Clic sur "Changer le message" : supprimer la fenêtre, renvoyer photo + "Envoyez le nouveau texte de bienvenue"
    if data == "adm_welcome_ask_new":
        try:
            await query.message.delete()
        except Exception:
            pass
        context.user_data["await_action"] = "edit_welcome"
        try:
            media = await _get_welcome_media()
            prompt = "Envoyez le nouveau texte de bienvenue."
            kb = InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Retour", callback_data="adm_back")]])
            if media:
                await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=prompt, reply_markup=kb)
            else:
                await context.bot.send_message(chat_id=query.message.chat_id, text=prompt, reply_markup=kb)
        except Exception:
            pass
        return
    # Contact : même flux que Message accueil (photo + contact actuel avec ---- + Changer, puis "Entrez un nouveau @ de contact")
    if data == "adm_edit_contact":
        try:
            await query.message.delete()
        except Exception:
            pass
        try:
            cfg = _load_config()
            current = (cfg.get("contact_text") or "").strip() or "(vide)"
            media = await _get_welcome_media()
            caption = f"☎️ Contact actuel:\n\n----\n{current}\n----"
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton("Changer le contact", callback_data="adm_contact_ask_new")],
                [InlineKeyboardButton("⬅️ Retour", callback_data="adm_back")],
            ])
            if media:
                await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=caption, reply_markup=kb)
            else:
                await context.bot.send_message(chat_id=query.message.chat_id, text=caption, reply_markup=kb)
        except Exception:
            pass
        return
    if data == "adm_contact_ask_new":
        try:
            await query.message.delete()
        except Exception:
            pass
        context.user_data["await_action"] = "edit_contact"
        try:
            cfg = _load_config()
            current = (cfg.get("contact_text") or "").strip() or "(vide)"
            media = await _get_welcome_media()
            prompt = f"Entrez un nouveau @ de contact.\n\nContact actuel:\n----\n{current}\n----"
            kb = InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Retour", callback_data="adm_back")]])
            if media:
                await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=prompt, reply_markup=kb)
            else:
                await context.bot.send_message(chat_id=query.message.chat_id, text=prompt, reply_markup=kb)
        except Exception:
            pass
        return
    # Modifier le nom du bouton MiniApp
    if data == "adm_edit_miniapp_label":
        cfg = _load_config()
        current = cfg.get("miniapp_label", "GhostLine13 MiniApp")
        context.user_data["await_action"] = "edit_miniapp_label"
        await _admin_edit(f"✏️ Nom actuel du bouton MiniApp:\n----\n{current}\n----\n\nEnvoyez le nouveau nom (ex: GhostLine13).\nLe suffixe ' MiniApp' sera ajouté automatiquement.", reply_markup=_with_back(_admin_keyboard()))
        return
    # Modifier le @ du panier
    if data == "adm_edit_order_username":
        cfg = _load_config()
        current = cfg.get("order_telegram_username", "savpizz13")
        context.user_data["await_action"] = "edit_order_username"
        await _admin_edit(f"🛒 @ Panier actuel:\n----\n@{current}\n----\n\nEnvoyez le nouveau @ (ex: ghostline13 ou @ghostline13).", reply_markup=_with_back(_admin_keyboard()))
        return
    # Edit flows (autres)
    mapping = {
        "adm_change_logo": ("change_logo", "Envoyez une photo pour le nouveau logo."),
        "adm_add_admin": ("add_admin", "Envoyez l'ID ou @pseudo à ajouter en admin."),
    }
    if data in mapping:
        key, prompt = mapping[data]
        context.user_data["await_action"] = key
        await _admin_edit(prompt, reply_markup=_with_back(_admin_keyboard()))
        return
    # Admins submenu: gérer les admins (ajouter / retirer / lister)
    if data == "adm_admins":
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("➕ Ajouter admin", callback_data="adm_add_admin")],
            [InlineKeyboardButton("➖ Retirer admin", callback_data="adm_remove_admin")],
            [InlineKeyboardButton("📜 Liste des admins", callback_data="adm_list_admins")],
        ])
        await _admin_edit("👑 Gestion des administrateurs", reply_markup=_with_back(kb))
        return
    if data == "adm_list_admins":
        # Union config + ADMIN_IDS pour afficher TOUS les admins (mêmes privilèges)
        cfgv = _load_config()
        cfg_ids = [int(x) for x in cfgv.get("admin_ids", [])]
        all_ids = sorted(set(cfg_ids) | set(ADMIN_IDS))
        ids = all_ids
        lines = []
        for aid in ids:
            label = str(aid)
            try:
                chat = await context.bot.get_chat(int(aid))
                uname = getattr(chat, "username", None)
                if uname:
                    label = f"@{uname} ({int(aid)})"
                    _remember_username(uname, int(aid))
                else:
                    full_name = " ".join([x for x in [getattr(chat, "first_name", None), getattr(chat, "last_name", None)] if x])
                    if full_name:
                        label = f"{full_name} ({int(aid)})"
            except Exception:
                pass
            lines.append("• " + label)
        txt = "\n".join(lines) if lines else "aucun"
        await _admin_edit(f"📜 Administrateurs ({len(ids)}):\n{txt}", reply_markup=_with_back(_admin_keyboard()))
        return
    if data == "adm_remove_admin":
        context.user_data["await_action"] = "remove_admin"
        await _admin_edit("Envoyez l'ID ou @pseudo à retirer des admins.", reply_markup=_with_back(_admin_keyboard()))
        return
    # Bans submenu
    if data == "adm_bans":
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("📜 Liste bans", callback_data="adm_bans_list")],
            [InlineKeyboardButton("➕ Ajouter ban", callback_data="adm_bans_add")],
            [InlineKeyboardButton("➖ Supprimer ban", callback_data="adm_bans_remove")],
            [InlineKeyboardButton("⬅️ Retour", callback_data="adm_stats")],
        ])
        await _admin_edit("Gestion des bans", reply_markup=kb)
        return
    if data == "adm_bans_list":
        bans = _load_bans()
        display = []
        for bid in bans:
            label = str(bid)
            try:
                chat = await context.bot.get_chat(int(bid))
                uname = getattr(chat, "username", None)
                if uname:
                    label = f"@{uname} ({int(bid)})"
            except Exception:
                pass
            display.append(label)
        list_text = "\n".join(display) if display else "aucun"
        await _admin_edit("Bannis:\n" + list_text, reply_markup=_with_back(None))
        return
    # ========== CATÉGORIES & PROFIL (admin site) ==========
    if data == "adm_categories":
        cfg = _load_config()
        base = (cfg.get("miniapp_url") or "").rstrip("/")
        admin_url = base + "/admin#/categories" if base else ""
        if not (cfg.get("miniapp_url") or "").strip():
            await _admin_edit("❌ Configurez miniapp_url dans les liens pour ouvrir l'admin.", reply_markup=_with_back(_admin_keyboard()))
            return
        kb = InlineKeyboardMarkup([[InlineKeyboardButton("🖥 Ouvrir l'admin (Catégories)", web_app=WebAppInfo(url=admin_url))]])
        await _admin_edit("📂 Catégories du site\n\nOuvrez l'admin pour ajouter, modifier ou supprimer les catégories (nom, sous-titre, photo).", reply_markup=_with_back(kb))
        return
    if data == "adm_profil_blocks":
        cfg = _load_config()
        base = (cfg.get("miniapp_url") or "").rstrip("/")
        admin_url = base + "/admin#/profil" if base else ""
        if not (cfg.get("miniapp_url") or "").strip():
            await _admin_edit("❌ Configurez miniapp_url dans les liens pour ouvrir l'admin.", reply_markup=_with_back(_admin_keyboard()))
            return
        kb = InlineKeyboardMarkup([[InlineKeyboardButton("🖥 Ouvrir l'admin (Profil)", web_app=WebAppInfo(url=admin_url))]])
        await _admin_edit("📝 Textes de la page Profil\n\nOuvrez l'admin pour modifier les 2 blocs de texte (Bienvenue, Livraison, etc.).", reply_markup=_with_back(kb))
        return

    # ========== GESTION PANIER (PRODUITS) ==========
    if data == "adm_products":
        context.user_data.pop("new_product", None)
        context.user_data.pop("await_action", None)
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("➕ Ajouter", callback_data="adm_prod_add"), InlineKeyboardButton("📦 Liste", callback_data="adm_prod_list")],
            [InlineKeyboardButton("✏️ Modifier", callback_data="adm_prod_edit"), InlineKeyboardButton("🗑️ Supprimer", callback_data="adm_prod_delete")],
        ])
        await _admin_edit("🛒 Gestion Produits\n\nGérez les produits du site depuis Telegram.", reply_markup=_with_back(kb))
        return

    if data == "adm_prod_add":
        context.user_data["new_product"] = {}
        context.user_data.pop("await_action", None)
        _txt, _kb = _build_new_product_add_menu(context.user_data.get("new_product", {}))
        await _admin_edit(_txt, reply_markup=_with_back(_kb))
        return

    if data.startswith("adm_prod_add_field:"):
        field = data.split(":", 1)[1]
        product = context.user_data.get("new_product", {})
        field_prompts = {
            "title": ("📝 Titre", "Envoyez le titre du produit:"),
            "description": ("📄 Description", "Envoyez la description du produit:"),
            "tag": ("🏷 Tag", "Envoyez le tag (ex: la farm) ou /skip pour passer:"),
            "prices": ("💰 Prix", "Envoyez vos prix par ligne (ex: 5g 50€, 3g 30€):"),
            "category": ("📁 Catégorie", None),
            "photo": ("🖼 Photo", "Envoyez une photo ou /skip pour passer:"),
            "video": ("🎬 Vidéo", "Envoyez une vidéo ou /skip pour passer:"),
        }
        if field not in field_prompts:
            return
        label, prompt = field_prompts[field]
        context.user_data["await_action"] = f"prod_add_{field}"
        if field == "category":
            try:
                cfg = _load_config()
                api_url = cfg.get("miniapp_url", "").rstrip("/")
                api_key = os.getenv("BOT_API_KEY", "")
                headers = {"x-api-key": api_key} if api_key else {}
                if not api_url:
                    await _admin_edit("❌ URL de l'API non configurée.", reply_markup=_with_back(None))
                    return
                async with httpx.AsyncClient() as client:
                    resp = await client.get(f"{api_url}/api/categories?all=1", headers=headers, timeout=10.0)
                if resp.status_code != 200:
                    await _admin_edit(f"❌ Erreur chargement catégories: {resp.status_code}", reply_markup=_with_back(None))
                    return
                cats_raw = resp.json()
                flat = []
                parents = [c for c in (cats_raw or []) if not c.get("parentId")]
                for c in parents:
                    cid = c.get("id")
                    cname = c.get("name", "Sans nom")
                    if cid:
                        flat.append((cid, cname))
                    for sub in c.get("subcategories") or []:
                        sid = sub.get("id")
                        sname = sub.get("name", "Sans nom")
                        if sid:
                            flat.append((sid, f"{cname} > {sname}"))
                if not flat:
                    await _admin_edit("❌ Aucune catégorie trouvée.", reply_markup=_with_back(None))
                    return
                context.user_data["prod_add_categories"] = flat
                lines = ["📁 Choisissez la catégorie (envoyez le numéro):", ""]
                for i, (_, name) in enumerate(flat, 1):
                    lines.append(f"{i}. {name}")
                lines.append("")
                lines.append("Envoyez le numéro de la catégorie:")
                await _admin_edit("\n".join(lines), reply_markup=_with_back(None))
            except Exception as e:
                await _admin_edit(f"❌ Erreur: {str(e)}", reply_markup=_with_back(None))
            return
        if field == "photo":
            stack = context.user_data.get("adm_nav_stack") or []
            prev_text = query.message.text or (query.message.caption or "")
            prev_kb = getattr(query.message, "reply_markup", None)
            stack.append({"text": prev_text, "reply_markup": prev_kb, "has_photo": False})
            context.user_data["adm_nav_stack"] = stack
            try:
                await query.message.delete()
            except Exception:
                pass
            media = await _get_welcome_media()
            caption = f"➕ Ajout produit\n\n{prompt}"
            try:
                if media:
                    await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=caption, parse_mode="HTML", reply_markup=_with_back(None))
                else:
                    await context.bot.send_message(chat_id=query.message.chat_id, text=caption, parse_mode="HTML", reply_markup=_with_back(None))
            except Exception:
                await context.bot.send_message(chat_id=query.message.chat_id, text=caption, parse_mode="HTML", reply_markup=_with_back(None))
            return
        if field == "video":
            stack = context.user_data.get("adm_nav_stack") or []
            prev_text = query.message.text or (query.message.caption or "")
            prev_kb = getattr(query.message, "reply_markup", None)
            stack.append({"text": prev_text, "reply_markup": prev_kb, "has_photo": False})
            context.user_data["adm_nav_stack"] = stack
            try:
                await query.message.delete()
            except Exception:
                pass
            media = await _get_welcome_media()
            caption = f"➕ Ajout produit\n\n{prompt}"
            try:
                if media:
                    await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=caption, parse_mode="HTML", reply_markup=_with_back(None))
                else:
                    await context.bot.send_message(chat_id=query.message.chat_id, text=caption, parse_mode="HTML", reply_markup=_with_back(None))
            except Exception:
                await context.bot.send_message(chat_id=query.message.chat_id, text=caption, parse_mode="HTML", reply_markup=_with_back(None))
            return
        await _admin_edit(f"➕ Ajout produit\n\n{prompt}", reply_markup=_with_back(None))
        return

    if data == "adm_prod_add_validate":
        product = context.user_data.get("new_product", {})
        prices = product.get("prices") or []
        if not product.get("title") or not product.get("description") or not prices:
            missing = []
            if not product.get("title"):
                missing.append("Titre")
            if not product.get("description"):
                missing.append("Description")
            if not prices:
                missing.append("Prix")
            await _admin_edit(f"❌ Champs obligatoires manquants: {', '.join(missing)}", reply_markup=_with_back(None))
            return
        prices_display = "\n   ".join(f"{p['name']}g {_format_price(p['price'])}" for p in prices)
        recap = (
            f"📝 Récapitulatif du produit:\n\n"
            f"📌 Titre: {product.get('title', '')}\n"
            f"📄 Description: {product.get('description', '')}\n"
            f"📁 Catégorie: {product.get('categoryName') or '(aucune)'}\n"
            f"🏷 Tag: {product.get('tag') or '(aucun)'}\n"
            f"💰 Prix:\n   {prices_display}\n"
            f"🖼 Photo: {'(présente)' if product.get('image') else '(aucune)'}\n"
            f"🎬 Vidéo: {'(présente)' if product.get('videoUrl') else '(aucune)'}\n\n"
            f"Validez pour créer le produit."
        )
        context.user_data["await_action"] = "prod_add_confirm"
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("✅ Valider et créer", callback_data="adm_prod_add_do_create"), InlineKeyboardButton("❌ Annuler", callback_data="adm_prod_add")],
        ])
        await _admin_edit(recap, reply_markup=_with_back(kb))
        return

    if data == "adm_prod_add_do_create":
        product = context.user_data.get("new_product", {})
        prices = product.get("prices") or []
        if not product.get("title") or not product.get("description") or not prices:
            await _admin_edit("❌ Données incomplètes.", reply_markup=_with_back(None))
            return
        try:
            cfg = _load_config()
            api_url = cfg.get("miniapp_url", "").rstrip("/")
            api_key = os.getenv("BOT_API_KEY", "")
            headers = {"x-api-key": api_key} if api_key else {}
            if not api_url:
                await _admin_edit("❌ URL de l'API non configurée.", reply_markup=_with_back(None))
                return
            payload = {
                "title": product.get("title", ""),
                "description": product.get("description", ""),
                "basePrice": prices[0]["price"] if prices else None,
                "section": "DECOUVRIR",
                "categoryId": product.get("categoryId") or None,
                "tag": product.get("tag") or None,
                "image": product.get("image") or None,
                "videoUrl": product.get("videoUrl") or None,
                "variants": [{"name": p["name"], "type": "weight", "price": p["price"]} for p in prices],
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(f"{api_url}/api/products", json=payload, headers=headers, timeout=10.0)
            if resp.status_code in (200, 201):
                prices_txt = ", ".join(f"{p['name']}g {_format_price(p['price'])}" for p in prices)
                await _admin_edit(
                    f"✅ Produit ajouté avec succès!\n\nLe produit \"{product.get('title', '')}\" est maintenant disponible.\n\nPrix: {prices_txt}",
                    reply_markup=_with_back(_admin_keyboard())
                )
            else:
                err_body = resp.text[:200] if resp.text else str(resp.status_code)
                try:
                    err_body = resp.json().get("error", err_body)
                except Exception:
                    pass
                await _admin_edit(f"❌ Erreur: {resp.status_code}\n{err_body}", reply_markup=_with_back(None))
        except Exception as e:
            await _admin_edit(f"❌ Erreur: {str(e)}", reply_markup=_with_back(None))
        context.user_data.pop("await_action", None)
        context.user_data.pop("new_product", None)
        return

    if data == "adm_prod_list":
        try:
            cfg = _load_config()
            api_url = cfg.get("miniapp_url", "").rstrip("/")
            api_key = os.getenv("BOT_API_KEY", "")
            if not api_url:
                await _admin_edit("❌ URL de l'API non configurée. Configurez miniapp_url.", reply_markup=_with_back(None))
                return
            headers = {"x-api-key": api_key} if api_key else {}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{api_url}/api/products", headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    products = resp.json()
                    if not products:
                        await _admin_edit("📦 Aucun produit trouvé.", reply_markup=_with_back(None))
                        return
                    txt = "📦 Liste des produits:\n\n"
                    for i, p in enumerate(products[:15], 1):
                        prix_display = _format_product_prices(p)
                        txt += f"{i}. {p.get('title', 'Sans titre')}\n   💰 {prix_display}\n\n"
                    await _admin_edit(txt, reply_markup=_with_back(None))
                else:
                    await _admin_edit(f"❌ Erreur API: {resp.status_code}", reply_markup=_with_back(None))
        except Exception as e:
            await _admin_edit(f"❌ Erreur: {str(e)}", reply_markup=_with_back(None))
        return

    if data == "adm_prod_edit":
        try:
            cfg = _load_config()
            api_url = cfg.get("miniapp_url", "").rstrip("/")
            api_key = os.getenv("BOT_API_KEY", "")
            if not api_url:
                await _admin_edit("❌ URL de l'API non configurée.", reply_markup=_with_back(None))
                return
            headers = {"x-api-key": api_key} if api_key else {}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{api_url}/api/products", headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    products = resp.json()
                    if not products:
                        await _admin_edit("📦 Aucun produit à modifier.", reply_markup=_with_back(None))
                        return
                    kb_rows = []
                    for p in products[:10]:
                        pid = p.get("id", "")
                        title = p.get("title", "Sans titre")[:25]
                        kb_rows.append([InlineKeyboardButton(f"✏️ {title}", callback_data=f"adm_prod_sel_edit:{pid}")])
                    await _admin_edit("✏️ Sélectionnez un produit à modifier:", reply_markup=_with_back(InlineKeyboardMarkup(kb_rows)))
                else:
                    await _admin_edit(f"❌ Erreur API: {resp.status_code}", reply_markup=_with_back(None))
        except Exception as e:
            await _admin_edit(f"❌ Erreur: {str(e)}", reply_markup=_with_back(None))
        return

    if data.startswith("adm_prod_sel_edit:"):
        pid = data.split(":")[1]
        context.user_data["edit_product_id"] = pid
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("📝 Titre", callback_data=f"adm_prod_field:title"), InlineKeyboardButton("📄 Description", callback_data=f"adm_prod_field:description")],
            [InlineKeyboardButton("💰 Prix", callback_data=f"adm_prod_field:price"), InlineKeyboardButton("🏷️ Tag", callback_data=f"adm_prod_field:tag")],
            [InlineKeyboardButton("🖼 Photo", callback_data=f"adm_prod_field:image"), InlineKeyboardButton("🎬 Vidéo", callback_data=f"adm_prod_field:video")],
            [InlineKeyboardButton("✅ Terminé", callback_data="adm_products")],
        ])
        await _admin_edit(f"✏️ Modification du produit #{pid}\n\nSélectionnez le champ à modifier:", reply_markup=_with_back(kb))
        return

    if data.startswith("adm_prod_field:"):
        field = data.split(":")[1]
        context.user_data["await_action"] = f"prod_edit_{field}"
        field_labels = {"title": "titre", "description": "description", "price": "prix", "tag": "tag", "image": "photo", "video": "vidéo"}
        current_val = "(vide)"
        pid = context.user_data.get("edit_product_id")
        cfg = _load_config()
        api_url = cfg.get("miniapp_url", "").rstrip("/")
        api_key = os.getenv("BOT_API_KEY", "")
        headers = {"x-api-key": api_key} if api_key else {}
        p = None
        try:
            if pid and api_url:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(f"{api_url}/api/products/{pid}", headers=headers, timeout=10.0)
                    if resp.status_code == 200:
                        p = resp.json()
                        if field == "price":
                            current_val = _format_product_prices(p) if (p.get("variants") or p.get("basePrice")) else ""
                        elif field in ("image", "video"):
                            current_val = p.get("image" if field == "image" else "videoUrl") or ""
                            current_val = str(current_val).strip() if current_val else "(vide)"
                        else:
                            current_val = p.get(field) or ""
                            current_val = str(current_val).strip() if current_val else "(vide)"
        except Exception:
            pass

        # Photo : logo du bot uniquement, pas de preview de la photo produit
        if field == "image":
            stack = context.user_data.get("adm_nav_stack") or []
            prev_text = query.message.text
            prev_kb = getattr(query.message, "reply_markup", None)
            stack.append({"text": prev_text, "reply_markup": prev_kb, "has_photo": False})
            context.user_data["adm_nav_stack"] = stack
            try:
                await query.message.delete()
            except Exception:
                pass
            if (p.get("image") or "").strip():
                caption = "🖼 Envoyez une nouvelle photo pour remplacer ou /skip pour garder."
            else:
                caption = "🖼 Aucune photo actuelle.\n\nEnvoyez une photo pour ajouter ou /skip."
            try:
                media = await _get_welcome_media()
                if media:
                    await context.bot.send_photo(
                        chat_id=query.message.chat_id,
                        photo=media,
                        caption=caption,
                        parse_mode="HTML",
                        reply_markup=_with_back(None)
                    )
                else:
                    await context.bot.send_message(
                        chat_id=query.message.chat_id,
                        text=caption,
                        parse_mode="HTML",
                        reply_markup=_with_back(None)
                    )
            except Exception:
                await context.bot.send_message(
                    chat_id=query.message.chat_id,
                    text=caption,
                    parse_mode="HTML",
                    reply_markup=_with_back(None)
                )
            return

        # Vidéo : logo du bot uniquement, pas de preview de la vidéo
        if field == "video":
            stack = context.user_data.get("adm_nav_stack") or []
            prev_text = query.message.text
            prev_kb = getattr(query.message, "reply_markup", None)
            stack.append({"text": prev_text, "reply_markup": prev_kb, "has_photo": False})
            context.user_data["adm_nav_stack"] = stack
            try:
                await query.message.delete()
            except Exception:
                pass
            caption = "🎬 Envoyez une nouvelle vidéo pour remplacer ou /skip pour garder."
            if not (p.get("videoUrl") or "").strip():
                caption = "🎬 Aucune vidéo actuelle.\n\nEnvoyez une vidéo pour ajouter ou /skip."
            try:
                media = await _get_welcome_media()
                if media:
                    await context.bot.send_photo(
                        chat_id=query.message.chat_id,
                        photo=media,
                        caption=caption,
                        parse_mode="HTML",
                        reply_markup=_with_back(None)
                    )
                else:
                    await context.bot.send_message(
                        chat_id=query.message.chat_id,
                        text=caption,
                        parse_mode="HTML",
                        reply_markup=_with_back(None)
                    )
            except Exception:
                await context.bot.send_message(
                    chat_id=query.message.chat_id,
                    text=caption,
                    parse_mode="HTML",
                    reply_markup=_with_back(None)
                )
            return

        label = field_labels.get(field, field)
        label_display = {"title": "Titre", "description": "Description", "price": "Prix", "tag": "Tag"}.get(field, label.capitalize())
        prompt = f"Entrez le nouveau {label}.\n\n{label_display} actuel:\n----\n{current_val}\n----"
        await _admin_edit(prompt, reply_markup=_with_back(None))
        return

    if data == "adm_prod_delete":
        try:
            cfg = _load_config()
            api_url = cfg.get("miniapp_url", "").rstrip("/")
            api_key = os.getenv("BOT_API_KEY", "")
            if not api_url:
                await _admin_edit("❌ URL de l'API non configurée.", reply_markup=_with_back(None))
                return
            headers = {"x-api-key": api_key} if api_key else {}
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{api_url}/api/products", headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    products = resp.json()
                    if not products:
                        await _admin_edit("📦 Aucun produit à supprimer.", reply_markup=_with_back(None))
                        return
                    kb_rows = []
                    for p in products[:10]:
                        pid = p.get("id", "")
                        title = p.get("title", "Sans titre")[:25]
                        kb_rows.append([InlineKeyboardButton(f"🗑️ {title}", callback_data=f"adm_prod_confirm_del:{pid}")])
                    await _admin_edit("🗑️ Sélectionnez un produit à supprimer:", reply_markup=_with_back(InlineKeyboardMarkup(kb_rows)))
                else:
                    await _admin_edit(f"❌ Erreur API: {resp.status_code}", reply_markup=_with_back(None))
        except Exception as e:
            await _admin_edit(f"❌ Erreur: {str(e)}", reply_markup=_with_back(None))
        return

    if data.startswith("adm_prod_confirm_del:"):
        pid = data.split(":")[1]
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("✅ Oui, supprimer", callback_data=f"adm_prod_do_del:{pid}"), InlineKeyboardButton("❌ Non", callback_data="adm_products")],
        ])
        await _admin_edit(f"⚠️ Confirmer la suppression du produit #{pid}?", reply_markup=kb)
        return

    if data.startswith("adm_prod_do_del:"):
        pid = data.split(":")[1]
        try:
            cfg = _load_config()
            api_url = cfg.get("miniapp_url", "").rstrip("/")
            api_key = os.getenv("BOT_API_KEY", "")
            headers = {"x-api-key": api_key} if api_key else {}
            async with httpx.AsyncClient() as client:
                resp = await client.delete(f"{api_url}/api/products/{pid}", headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    await _admin_edit(f"✅ Produit #{pid} supprimé avec succès!", reply_markup=_with_back(_admin_keyboard()))
                else:
                    await _admin_edit(f"❌ Erreur suppression: {resp.status_code}", reply_markup=_with_back(None))
        except Exception as e:
            await _admin_edit(f"❌ Erreur: {str(e)}", reply_markup=_with_back(None))
        return

    # Manage buttons submenu
    if data == "adm_manage_buttons":
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("➕ Ajouter", callback_data="adm_btn_add"), InlineKeyboardButton("✏️ Modifier", callback_data="adm_btn_edit")],
            [InlineKeyboardButton("🙈 Masquer défaut", callback_data="adm_btn_hide"), InlineKeyboardButton("👀 Afficher défaut", callback_data="adm_btn_show")],
        ])
        await _admin_edit("Gérez les boutons: ajoutez/modifiez, et masquez/affichez les boutons par défaut.", reply_markup=_with_back(kb))
        return
    if data == "adm_btn_list":
        cfg = _load_config()
        hidden = cfg.get("hidden_buttons", [])
        customs = cfg.get("custom_buttons", [])
        lines = ["Boutons cachés (défaut): " + (", ".join(hidden) or "aucun")] 
        if customs:
            for c in customs:
                lines.append(f"• #{c.get('id','?')} {c.get('label','(sans)')} [{c.get('type','?')}] -> {c.get('value','')}")
        else:
            lines.append("Aucun bouton personnalisé")
        await _admin_edit("\n".join(lines), reply_markup=_with_back(None))
        return
    if data == "adm_btn_add":
        context.user_data["await_action"] = "btn_add_type"
        await _admin_edit("Envoyez le type de bouton à ajouter: URL ou Message", reply_markup=_with_back(None))
        return
    if data == "adm_btn_edit":
        # Sélectionner visuellement un bouton de l’accueil à modifier
        cfgv = _load_config()
        hidden = cfgv.get("hidden_buttons", [])
        kb_rows = []
        # Défaut visibles
        if "infos" not in hidden:
            kb_rows.append([InlineKeyboardButton("Informations ℹ️", callback_data="adm_pick_edit:def:infos")])
        if "contact" not in hidden:
            kb_rows.append([InlineKeyboardButton("Contact 📱", callback_data="adm_pick_edit:def:contact")])
        if "miniapp" not in hidden:
            kb_rows.append([InlineKeyboardButton("GhostLine13 MiniApp", callback_data="adm_pick_edit:def:miniapp")])
        if "instagram" not in hidden:
            kb_rows.append([InlineKeyboardButton("Instagram", callback_data="adm_pick_edit:def:instagram")])
        if "potato" not in hidden:
            kb_rows.append([InlineKeyboardButton("Canal potato 🥔", callback_data="adm_pick_edit:def:potato")])
        if "linktree" not in hidden:
            kb_rows.append([InlineKeyboardButton("Linktree", callback_data="adm_pick_edit:def:linktree")])
        if "tg" not in hidden:
            kb_rows.append([InlineKeyboardButton("Canal Telegram", callback_data="adm_pick_edit:def:tg")])
        if "ig_backup" not in hidden:
            kb_rows.append([InlineKeyboardButton("Instagram Backup", callback_data="adm_pick_edit:def:ig_backup")])
        if "bots" not in hidden:
            kb_rows.append([InlineKeyboardButton("Bots 🤖", callback_data="adm_pick_edit:def:bots")])
        # Personnalisés
        customs = cfgv.get("custom_buttons", [])
        for c in customs:
            label = c.get("label", "(sans)")
            cid = c.get("id")
            ctype = c.get("type", "message")
            kb_rows.append([InlineKeyboardButton(f"#{cid} {label} [{ctype}]", callback_data=f"adm_pick_edit:c:{cid}")])
        await _admin_edit("Sélectionnez un bouton à modifier:", reply_markup=_with_back(InlineKeyboardMarkup(kb_rows)))
        return
    if data.startswith("adm_pick_edit:"):
        _, kind, ident = data.split(":", 2)
        label = ident
        if kind == "def":
            label_map = {
                "infos": "Informations ℹ️",
                "contact": "Contact 📱",
                "miniapp": "GhostLine13 MiniApp",
                "instagram": "Instagram",
                "potato": "Canal potato 🥔",
                "linktree": "Linktree",
                "tg": "Canal Telegram",
                "ig_backup": "Instagram Backup",
                "bots": "Bots 🤖",
            }
            label = label_map.get(ident, ident)
        confirm_kb = InlineKeyboardMarkup([[InlineKeyboardButton("✅ Oui", callback_data=f"adm_confirm_edit:yes:{kind}:{ident}"), InlineKeyboardButton("❌ Non", callback_data="adm_manage_buttons")]])
        await _admin_edit(f"Voulez-vous modifier: {label} ?", reply_markup=_with_back(confirm_kb))
        return
    if data.startswith("adm_confirm_edit:"):
        parts = data.split(":")
        answer = parts[1]
        if answer == "no":
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton("📜 Liste boutons", callback_data="adm_btn_list")],
                [InlineKeyboardButton("➕ Ajouter", callback_data="adm_btn_add"), InlineKeyboardButton("✏️ Modifier", callback_data="adm_btn_edit")],
                [InlineKeyboardButton("🗑️ Supprimer", callback_data="adm_btn_delete")],
                [InlineKeyboardButton("🙈 Masquer défaut", callback_data="adm_btn_hide"), InlineKeyboardButton("👀 Afficher défaut", callback_data="adm_btn_show")],
            ])
            await _admin_edit("Gérez les boutons: ajoutez/modifiez/supprimez, ou masquez/affichez les boutons par défaut.", reply_markup=_with_back(kb))
            return
        kind = parts[2]
        ident = parts[3] if len(parts) > 3 else ""
        if kind == "c":
            context.user_data["await_action"] = "btn_edit_selected"
            try:
                context.user_data["selected_custom_id"] = int(ident)
            except Exception:
                context.user_data["selected_custom_id"] = ident
            await _admin_edit("Envoyez: label | type(url/message) | valeur", reply_markup=_with_back(None))
            return
        # défauts
        key_map = {
            "miniapp": "miniapp_url",
            "instagram": "instagram_url",
            "potato": "potato_url",
            "linktree": "linktree_url",
            "tg": "telegram_channel_url",
            "ig_backup": "instagram_backup_url",
            "bots": "bots_url",
        }
        if ident in ("infos", "contact"):
            context.user_data["await_action"] = "edit_infos" if ident == "infos" else "edit_contact"
            prompt = "Envoyez le nouveau texte pour Infos" if ident == "infos" else "Envoyez le nouveau texte pour Contact"
            await _admin_edit(prompt, reply_markup=_with_back(None))
            return
        edit_key = key_map.get(ident)
        if edit_key:
            context.user_data["adm_edit_key"] = edit_key
            await _admin_edit(f"Envoyez la nouvelle valeur pour: {edit_key} (URL)", reply_markup=_with_back(None))
            return
        await _admin_edit("Élément inconnu.", reply_markup=_with_back(_admin_keyboard()))
        return
    if data == "adm_btn_delete":
        # Sélectionner visuellement un bouton personnalisé à supprimer (les défauts ne sont pas supprimables)
        cfgv = _load_config()
        kb_rows = []
        customs = cfgv.get("custom_buttons", [])
        for c in customs:
            label = c.get("label", "(sans)")
            cid = c.get("id")
            ctype = c.get("type", "message")
            kb_rows.append([InlineKeyboardButton(f"Supprimer #{cid} {label} [{ctype}]", callback_data=f"adm_pick_delete:c:{cid}")])
        text = "Sélectionnez un bouton personnalisé à supprimer.\n\nAstuce: les boutons par défaut ne peuvent pas être supprimés, utilisez ‘🙈 Masquer défaut’."
        await _admin_edit(text, reply_markup=_with_back(InlineKeyboardMarkup(kb_rows) if kb_rows else None))
        return
    if data.startswith("adm_pick_delete:"):
        _, kind, ident = data.split(":", 2)
        if kind == "def":
            await _admin_edit("Ce bouton par défaut ne peut pas être supprimé. Utilisez '🙈 Masquer défaut' pour le retirer de l’accueil.", reply_markup=_with_back(None))
            return
        confirm_kb = InlineKeyboardMarkup([[InlineKeyboardButton("✅ Oui", callback_data=f"adm_confirm_delete:yes:{ident}"), InlineKeyboardButton("❌ Non", callback_data="adm_manage_buttons")]])
        await _admin_edit(f"Voulez-vous supprimer le bouton personnalisé #{ident} ?", reply_markup=_with_back(confirm_kb))
        return
    if data.startswith("adm_confirm_delete:"):
        parts = data.split(":")
        answer = parts[1]
        if answer == "no":
            kb = InlineKeyboardMarkup([
                [InlineKeyboardButton("📜 Liste boutons", callback_data="adm_btn_list")],
                [InlineKeyboardButton("➕ Ajouter", callback_data="adm_btn_add"), InlineKeyboardButton("✏️ Modifier", callback_data="adm_btn_edit")],
                [InlineKeyboardButton("🗑️ Supprimer", callback_data="adm_btn_delete")],
                [InlineKeyboardButton("🙈 Masquer défaut", callback_data="adm_btn_hide"), InlineKeyboardButton("👀 Afficher défaut", callback_data="adm_btn_show")],
            ])
            await _admin_edit("Gérez les boutons: ajoutez/modifiez/supprimez, ou masquez/affichez les boutons par défaut.", reply_markup=_with_back(kb))
            return
        ident = parts[2]
        cfgv = _load_config()
        customs = list(cfgv.get("custom_buttons", []))
        new_list = [c for c in customs if str(c.get("id")) != str(ident)]
        if len(new_list) == len(customs):
            await _admin_edit("Bouton introuvable.", reply_markup=_with_back(None))
            return
        cfgv["custom_buttons"] = new_list
        _save_config(cfgv)
        await _admin_edit(f"Bouton #{ident} supprimé.", reply_markup=_with_back(_admin_keyboard()))
        return
    if data == "adm_btn_hide":
        cfgv = _load_config()
        hidden = set(cfgv.get("hidden_buttons", []))
        label_map = {
            "infos": "Informations ℹ️",
            "contact": "Contact 📱",
            "miniapp": "GhostLine13 MiniApp",
            "instagram": "Instagram",
            "potato": "Canal potato 🥔",
            "linktree": "Linktree",
            "tg": "Canal Telegram",
            "ig_backup": "Instagram Backup",
            "bots": "Bots 🤖",
        }
        defaults = ["infos", "contact", "miniapp", "instagram", "potato", "linktree", "tg", "ig_backup", "bots"]
        kb_rows = []
        for key in defaults:
            if key not in hidden:
                kb_rows.append([InlineKeyboardButton(label_map.get(key, key), callback_data=f"adm_pick_hide:def:{key}")])
        if not kb_rows:
            await _admin_edit("Aucun bouton par défaut visible à masquer.", reply_markup=_with_back(None))
            return
        await _admin_edit("Sélectionnez les boutons par défaut à masquer:", reply_markup=_with_back(InlineKeyboardMarkup(kb_rows)))
        return
    if data == "adm_btn_show":
        cfgv = _load_config()
        hidden = list(cfgv.get("hidden_buttons", []))
        label_map = {
            "infos": "Informations ℹ️",
            "contact": "Contact 📱",
            "miniapp": "GhostLine13 MiniApp",
            "instagram": "Instagram",
            "potato": "Canal potato 🥔",
            "linktree": "Linktree",
            "tg": "Canal Telegram",
            "ig_backup": "Instagram Backup",
            "bots": "Bots 🤖",
        }
        kb_rows = []
        for key in hidden:
            kb_rows.append([InlineKeyboardButton(label_map.get(key, key), callback_data=f"adm_pick_show:def:{key}")])
        if not kb_rows:
            await _admin_edit("Aucun bouton par défaut masqué.", reply_markup=_with_back(None))
            return
        await _admin_edit("Sélectionnez les boutons par défaut à afficher:", reply_markup=_with_back(InlineKeyboardMarkup(kb_rows)))
        return
    if data.startswith("adm_pick_hide:"):
        _, kind, ident = data.split(":", 2)
        if kind != "def":
            await _admin_edit("Opération non prise en charge.", reply_markup=_with_back(_admin_keyboard()))
            return
        cfgv = _load_config()
        hidden = set(cfgv.get("hidden_buttons", []))
        hidden.add(ident)
        cfgv["hidden_buttons"] = sorted(hidden)
        _save_config(cfgv)
        await _admin_edit(f"Bouton par défaut masqué: {ident}.", reply_markup=_with_back(None))
        return
    if data.startswith("adm_pick_show:"):
        _, kind, ident = data.split(":", 2)
        if kind != "def":
            await _admin_edit("Opération non prise en charge.", reply_markup=_with_back(_admin_keyboard()))
            return
        cfgv = _load_config()
        hidden = list(cfgv.get("hidden_buttons", []))
        hidden = [k for k in hidden if k != ident]
        cfgv["hidden_buttons"] = hidden
        _save_config(cfgv)
        await _admin_edit(f"Bouton par défaut affiché: {ident}.", reply_markup=_with_back(None))
        return
    # Links submenu: uniquement les vrais boutons affichés à l'accueil
    if data == "adm_links":
        miniapp_label = _load_config().get("miniapp_label", "GhostLine13 MiniApp")
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton(f"{miniapp_label} (URL)", callback_data="adm_link_miniapp")],
            [InlineKeyboardButton("Potato 🥔🚀", callback_data="adm_link_potato"), InlineKeyboardButton("Contact 📱", callback_data="adm_link_contact")],
            [InlineKeyboardButton("Telegram 📸", callback_data="adm_link_tg"), InlineKeyboardButton("WhatsApp 💚", callback_data="adm_link_whatsapp")],
        ])
        await _admin_edit("Modifier les liens (boutons affichés à l'accueil)", reply_markup=_with_back(kb))
        return
    if data.startswith("adm_link_"):
        key_map = {
            "adm_link_miniapp": ("miniapp_url", "MiniApp (URL)"),
            "adm_link_potato": ("potato_url", "Potato"),
            "adm_link_contact": ("contact_text", "Contact"),
            "adm_link_tg": ("telegram_channel_url", "Telegram"),
            "adm_link_whatsapp": ("whatsapp_url", "WhatsApp"),
        }
        entry = key_map.get(data)
        if entry:
            config_key, label = entry
            try:
                context.user_data["adm_edit_key"] = config_key
            except Exception:
                pass
            cfg = _load_config()
            current = str(cfg.get(config_key) or "").strip() or "(vide)"
            prompt = f"Entrez le nouveau lien pour {label}.\n\nLien actuel:\n----\n{current}\n----"
            await _admin_edit(prompt, reply_markup=_with_back(None))
            return
    if data in ("adm_bans_add", "adm_bans_remove"):
        # Éviter tout conflit avec une édition de lien en cours
        try:
            context.user_data.pop("adm_edit_key", None)
        except Exception:
            pass
        context.user_data["await_action"] = "ban_add" if data.endswith("add") else "ban_remove"
        await _admin_edit("Envoyez l'ID utilisateur ou @pseudo à traiter.", reply_markup=_with_back(None))
        return
    # Aide: liste des commandes dans l'admin
    if data == "adm_help":
        help_text = (
            "📖 Commandes admin disponibles\n\n"
            "/page — Publier la page d'accueil dans un canal (auto-supprime la commande)."
        )
        await _admin_edit(help_text, reply_markup=_with_back(None))
        return

    # Bouton retour: revenir à l'étape précédente si la pile a des éléments, sinon panneau admin
    if data == "adm_back":
        stack = context.user_data.get("adm_nav_stack") or []
        try:
            await query.message.delete()
        except Exception:
            pass
        if stack:
            prev = stack.pop()
            context.user_data["adm_nav_stack"] = stack
            context.user_data.pop("await_action", None)
            prev_text = prev.get("text") or ""
            # Si on revient au menu création produit, le reconstruire avec les données à jour (avec photo)
            if "Nouveau produit" in prev_text or "Remplissez chaque champ" in prev_text or "Choisissez la catégorie" in prev_text:
                product = context.user_data.get("new_product") or {}
                _txt, _kb = _build_new_product_add_menu(product)
                try:
                    media = await _get_welcome_media()
                    if media:
                        await context.bot.send_photo(
                            chat_id=query.message.chat_id,
                            photo=media,
                            caption=_txt,
                            reply_markup=_with_back(_kb)
                        )
                    else:
                        await context.bot.send_message(
                            chat_id=query.message.chat_id,
                            text=_txt,
                            reply_markup=_with_back(_kb)
                        )
                except Exception:
                    pass
                return
            prev_kb = prev.get("reply_markup")
            prev_has_photo = prev.get("has_photo", False)
            try:
                if prev_has_photo and prev_text:
                    media = await _get_welcome_media()
                    if media:
                        await context.bot.send_photo(
                            chat_id=query.message.chat_id,
                            photo=media,
                            caption=prev_text,
                            reply_markup=prev_kb
                        )
                    else:
                        await context.bot.send_message(chat_id=query.message.chat_id, text=prev_text, reply_markup=prev_kb)
                elif prev_text:
                    await context.bot.send_message(
                        chat_id=query.message.chat_id,
                        text=prev_text,
                        reply_markup=prev_kb
                    )
                else:
                    media = await _get_welcome_media()
                    panel_caption = _admin_panel_caption()
                    if media:
                        await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
                    else:
                        await context.bot.send_message(chat_id=query.message.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
            except Exception:
                media = await _get_welcome_media()
                panel_caption = _admin_panel_caption()
                if media:
                    await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
                else:
                    await context.bot.send_message(chat_id=query.message.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
        else:
            try:
                context.user_data.pop("await_action", None)
            except Exception:
                pass
            try:
                media = await _get_welcome_media()
                panel_caption = _admin_panel_caption()
                if media:
                    await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
                else:
                    await context.bot.send_message(chat_id=query.message.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
            except Exception:
                pass
        return

    # Bouton Retour accueil: supprimer le message admin et afficher l'accueil du bot (comme /start)
    if data == "adm_retour_accueil":
        try:
            context.user_data.pop("await_action", None)
        except Exception:
            pass
        try:
            context.user_data["adm_nav_stack"] = []
        except Exception:
            pass
        try:
            await query.message.delete()
        except Exception:
            pass
        try:
            cfg = _load_config()
            main_caption = (cfg.get("welcome_caption") or WELCOME_CAPTION_TEXT).strip()
            reply_markup = _build_welcome_keyboard_layout(
                cfg, cfg.get("hidden_buttons"), getattr(context.bot, "username", None)
            )
            media = await _get_welcome_media()
            if media:
                await context.bot.send_photo(chat_id=query.message.chat_id, photo=media, caption=main_caption, reply_markup=reply_markup)
            else:
                await context.bot.send_message(chat_id=query.message.chat_id, text=main_caption, reply_markup=reply_markup)
        except Exception:
            pass
        return

async def handle_admin_input(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id if update.effective_user else 0
    if not _is_admin(user_id):
        return
    key = context.user_data.get("await_action")
    edit_key = context.user_data.get("adm_edit_key")
    if not key and not edit_key:
        return
    msg = update.message
    cfg = _load_config()
    
    # ========== GESTION PRODUITS (input handlers) ==========
    if key and str(key).startswith("prod_"):
        raw = (msg.text or msg.caption or "").strip()
        api_url = cfg.get("miniapp_url", "").rstrip("/")
        api_key = os.getenv("BOT_API_KEY", "")
        headers = {"x-api-key": api_key} if api_key else {}
        
        async def _send_product_menu(caption: str, kb: InlineKeyboardMarkup):
            kb_rows = list(kb.inline_keyboard) if kb else []
            kb_rows.append([InlineKeyboardButton("⬅️ Retour", callback_data="adm_back")])
            full_kb = InlineKeyboardMarkup(kb_rows)
            media = await _get_welcome_media()
            if media:
                await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=caption, reply_markup=full_kb)
            else:
                await msg.reply_text(caption, reply_markup=full_kb)

        # Ajout produit - Titre (retour au menu)
        if key == "prod_add_title":
            context.user_data["new_product"]["title"] = raw
            context.user_data.pop("await_action", None)
            _txt, _kb = _build_new_product_add_menu(context.user_data.get("new_product", {}))
            await _send_product_menu(f"✅ Titre enregistré.\n\n{_txt}", _kb)
            return

        # Ajout produit - Description (retour au menu)
        if key == "prod_add_description":
            context.user_data["new_product"]["description"] = raw
            context.user_data.pop("await_action", None)
            _txt, _kb = _build_new_product_add_menu(context.user_data.get("new_product", {}))
            await _send_product_menu(f"✅ Description enregistrée.\n\n{_txt}", _kb)
            return

        # Ajout produit - Tag (retour au menu)
        if key == "prod_add_tag":
            context.user_data["new_product"]["tag"] = raw.strip() if (raw or "").strip().lower() not in ("/skip", "skip") else ""
            context.user_data.pop("await_action", None)
            _txt, _kb = _build_new_product_add_menu(context.user_data.get("new_product", {}))
            await _send_product_menu(f"✅ Tag enregistré.\n\n{_txt}", _kb)
            return

        # Ajout produit - Catégorie (retour au menu)
        if key == "prod_add_category":
            flat = context.user_data.get("prod_add_categories") or []
            try:
                num = int((raw or "").strip())
                if 1 <= num <= len(flat):
                    cid, cname = flat[num - 1]
                    context.user_data["new_product"]["categoryId"] = cid
                    context.user_data["new_product"]["categoryName"] = cname
                else:
                    await msg.reply_text(f"❌ Numéro invalide. Choisissez entre 1 et {len(flat)}.")
                    return
            except ValueError:
                await msg.reply_text("❌ Envoyez un numéro (ex: 1, 2, 3).")
                return
            context.user_data.pop("await_action", None)
            context.user_data.pop("prod_add_categories", None)
            _txt, _kb = _build_new_product_add_menu(context.user_data.get("new_product", {}))
            await _send_product_menu(f"✅ Catégorie enregistrée.\n\n{_txt}", _kb)
            return

        # Ajout produit - Prix (retour au menu)
        if key == "prod_add_prices":
            lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
            prices = []
            invalid = []
            for ln in lines:
                parsed = _parse_price_line(ln)
                if parsed:
                    prices.append({"name": parsed[0], "price": parsed[1]})
                else:
                    invalid.append(ln)
            if not prices:
                await msg.reply_text(
                    "❌ Aucun prix valide. Utilisez le format Xg Y€ par ligne.\nExemple:\n5g 50€\n3g 30€"
                )
                return
            if invalid:
                await msg.reply_text(f"⚠️ {len(invalid)} ligne(s) ignorée(s).")
            context.user_data["new_product"]["prices"] = prices
            context.user_data.pop("await_action", None)
            _txt, _kb = _build_new_product_add_menu(context.user_data.get("new_product", {}))
            await _send_product_menu(f"✅ Prix enregistrés.\n\n{_txt}", _kb)
            return

        # Ajout produit - Photo (retour au menu)
        if key == "prod_add_photo":
            if msg.photo:
                try:
                    file_id = msg.photo[-1].file_id
                    tg_file = await context.bot.get_file(file_id)
                    ext = "jpg"
                    mime = "image/jpeg"
                    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
                        await tg_file.download_to_drive(tmp.name)
                        with open(tmp.name, "rb") as f:
                            file_data = f.read()
                        try:
                            os.unlink(tmp.name)
                        except Exception:
                            pass
                    files = {"file": (f"product.{ext}", file_data, mime)}
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        up = await client.post(f"{api_url}/api/upload", files=files, headers=headers)
                    if up.status_code == 200:
                        data = up.json()
                        url = (data.get("url") or data.get("fileName") or "").strip()
                        context.user_data["new_product"]["image"] = url if url.startswith("/") else f"/{url}" if url else ""
                    else:
                        context.user_data["new_product"]["image"] = ""
                except Exception as e:
                    await msg.reply_text(f"❌ Erreur upload photo: {str(e)}")
                    return
            elif (raw or "").strip().lower() in ("/skip", "skip"):
                context.user_data["new_product"]["image"] = ""
            else:
                await msg.reply_text("📷 Envoyez une photo ou <code>/skip</code> pour passer.", parse_mode="HTML")
                return
            context.user_data.pop("await_action", None)
            _txt, _kb = _build_new_product_add_menu(context.user_data.get("new_product", {}))
            await _send_product_menu(f"✅ Photo enregistrée.\n\n{_txt}", _kb)
            return

        # Ajout produit - Vidéo (retour au menu)
        if key == "prod_add_video":
            if msg.video or msg.video_note:
                try:
                    vid = msg.video or msg.video_note
                    file_id = vid.file_id
                    tg_file = await context.bot.get_file(file_id)
                    ext = "mp4"
                    mime = "video/mp4"
                    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
                        await tg_file.download_to_drive(tmp.name)
                        with open(tmp.name, "rb") as f:
                            file_data = f.read()
                        try:
                            os.unlink(tmp.name)
                        except Exception:
                            pass
                    files = {"file": (f"product.{ext}", file_data, mime)}
                    async with httpx.AsyncClient(timeout=180.0) as client:
                        up = await client.post(f"{api_url}/api/upload", files=files, headers=headers)
                    if up.status_code == 200:
                        data = up.json()
                        url = (data.get("url") or data.get("fileName") or "").strip()
                        context.user_data["new_product"]["videoUrl"] = url if url.startswith("/") else f"/{url}" if url else ""
                    else:
                        err_body = up.text[:200] if up.text else str(up.status_code)
                        try:
                            err_body = up.json().get("message", err_body)
                        except Exception:
                            pass
                        await msg.reply_text(f"⚠️ Upload vidéo échoué: {err_body}")
                        context.user_data["new_product"]["videoUrl"] = ""
                except Exception as e:
                    await msg.reply_text(f"❌ Erreur upload vidéo: {str(e)}")
                    return
            elif (raw or "").strip().lower() in ("/skip", "skip"):
                context.user_data["new_product"]["videoUrl"] = ""
            else:
                await msg.reply_text("🎬 Envoyez une vidéo ou <code>/skip</code> pour passer.", parse_mode="HTML")
                return
            context.user_data.pop("await_action", None)
            _txt, _kb = _build_new_product_add_menu(context.user_data.get("new_product", {}))
            await _send_product_menu(f"✅ Vidéo enregistrée.\n\n{_txt}", _kb)
            return

        # Ajout produit - Confirmation (OUI/NON en texte, alternative au bouton)
        if key == "prod_add_confirm":
            if (raw or "").strip().lower() == "oui":
                product = context.user_data.get("new_product", {})
                prices = product.get("prices") or []
                try:
                    payload = {
                        "title": product.get("title", ""),
                        "description": product.get("description", ""),
                        "basePrice": prices[0]["price"] if prices else None,
                        "section": "DECOUVRIR",
                        "tag": product.get("tag") or None,
                        "image": product.get("image") or None,
                        "videoUrl": product.get("videoUrl") or None,
                        "variants": [{"name": p["name"], "type": "weight", "price": p["price"]} for p in prices],
                    }
                    async with httpx.AsyncClient() as client:
                        resp = await client.post(f"{api_url}/api/products", json=payload, headers=headers, timeout=10.0)
                    if resp.status_code in (200, 201):
                        prices_txt = ", ".join(f"{p['name']}g {_format_price(p['price'])}" for p in prices)
                        await msg.reply_text(f"✅ Produit ajouté!\n\n\"{product.get('title', '')}\" - Prix: {prices_txt}", parse_mode="HTML")
                        try:
                            media = await _get_welcome_media()
                            panel_caption = _admin_panel_caption()
                            if media:
                                await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
                            else:
                                await context.bot.send_message(chat_id=msg.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
                        except Exception:
                            pass
                    else:
                        err_body = resp.text[:150] if resp.text else str(resp.status_code)
                        try:
                            err_body = resp.json().get("error", err_body)
                        except Exception:
                            pass
                        await msg.reply_text(f"❌ Erreur: {resp.status_code}\n{err_body}")
                except Exception as e:
                    await msg.reply_text(f"❌ Erreur: {str(e)}")
                context.user_data.pop("await_action", None)
                context.user_data.pop("new_product", None)
            elif (raw or "").strip().lower() == "non":
                context.user_data.pop("await_action", None)
                _txt, _kb = _build_new_product_add_menu(context.user_data.get("new_product", {}))
                await _send_product_menu("Annulé. Retour au menu:\n\n" + _txt, _kb)
            else:
                await msg.reply_text("Tapez OUI pour confirmer ou NON pour revenir au menu.")
            return
        
        # Modification produit - champs
        if key.startswith("prod_edit_"):
            field = key.replace("prod_edit_", "")
            pid = context.user_data.get("edit_product_id")
            if not pid:
                await msg.reply_text("❌ Aucun produit sélectionné.")
                context.user_data.pop("await_action", None)
                return

            # Modification photo
            if field == "image":
                if (raw or "").strip().lower() in ("/skip", "skip"):
                    context.user_data.pop("await_action", None)
                    try:
                        media = await _get_welcome_media()
                        panel_caption = _admin_panel_caption()
                        if media:
                            await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
                        else:
                            await context.bot.send_message(chat_id=msg.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
                    except Exception:
                        pass
                elif msg.photo:
                    try:
                        file_id = msg.photo[-1].file_id
                        tg_file = await context.bot.get_file(file_id)
                        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                            await tg_file.download_to_drive(tmp.name)
                            with open(tmp.name, "rb") as f:
                                file_data = f.read()
                            try:
                                os.unlink(tmp.name)
                            except Exception:
                                pass
                        files = {"file": ("product.jpg", file_data, "image/jpeg")}
                        async with httpx.AsyncClient(timeout=30.0) as client:
                            up = await client.post(f"{api_url}/api/upload", files=files, headers=headers)
                        if up.status_code == 200:
                            data = up.json()
                            url = (data.get("url") or data.get("fileName") or "").strip()
                            url = url if url.startswith("/") else f"/{url}" if url else ""
                            async with httpx.AsyncClient() as client:
                                resp = await client.patch(f"{api_url}/api/products/{pid}", json={"image": url}, headers=headers, timeout=10.0)
                            if resp.status_code == 200:
                                context.user_data.pop("await_action", None)
                                try:
                                    media = await _get_welcome_media()
                                    panel_caption = _admin_panel_caption()
                                    if media:
                                        await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
                                    else:
                                        await context.bot.send_message(chat_id=msg.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
                                except Exception:
                                    pass
                            else:
                                err_body = ""
                                try:
                                    err_body = resp.json().get("error", resp.text[:150])
                                except Exception:
                                    err_body = resp.text[:150] if resp.text else ""
                                await msg.reply_text(f"❌ Erreur mise à jour photo: {resp.status_code}\n{err_body}")
                        else:
                            await msg.reply_text("❌ Erreur lors de l'upload de la photo.")
                    except Exception as e:
                        await msg.reply_text(f"❌ Erreur: {str(e)}")
                else:
                    await msg.reply_text("🖼 Envoyez une photo pour remplacer ou /skip pour garder.", parse_mode="HTML")
                    return
                return

            # Modification vidéo
            if field == "video":
                if (raw or "").strip().lower() in ("/skip", "skip"):
                    context.user_data.pop("await_action", None)
                    try:
                        media = await _get_welcome_media()
                        panel_caption = _admin_panel_caption()
                        if media:
                            await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
                        else:
                            await context.bot.send_message(chat_id=msg.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
                    except Exception:
                        pass
                elif msg.video or msg.video_note:
                    try:
                        vid = msg.video or msg.video_note
                        file_id = vid.file_id
                        tg_file = await context.bot.get_file(file_id)
                        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                            await tg_file.download_to_drive(tmp.name)
                            with open(tmp.name, "rb") as f:
                                file_data = f.read()
                            try:
                                os.unlink(tmp.name)
                            except Exception:
                                pass
                        files = {"file": ("product.mp4", file_data, "video/mp4")}
                        async with httpx.AsyncClient(timeout=180.0) as client:
                            up = await client.post(f"{api_url}/api/upload", files=files, headers=headers)
                        if up.status_code == 200:
                            data = up.json()
                            url = (data.get("url") or data.get("fileName") or "").strip()
                            url = url if url.startswith("/") else f"/{url}" if url else ""
                            async with httpx.AsyncClient() as client:
                                resp = await client.patch(f"{api_url}/api/products/{pid}", json={"videoUrl": url}, headers=headers, timeout=10.0)
                            if resp.status_code == 200:
                                context.user_data.pop("await_action", None)
                                await msg.reply_text("✅ Vidéo mise à jour avec succès!")
                                try:
                                    media = await _get_welcome_media()
                                    panel_caption = _admin_panel_caption()
                                    if media:
                                        await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
                                    else:
                                        await context.bot.send_message(chat_id=msg.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
                                except Exception:
                                    pass
                            else:
                                err_body = ""
                                try:
                                    err_body = resp.json().get("error", resp.text[:200])
                                except Exception:
                                    err_body = resp.text[:200] if resp.text else str(resp.status_code)
                                await msg.reply_text(f"❌ Erreur mise à jour: {resp.status_code}\n{err_body}")
                        else:
                            err_body = ""
                            try:
                                err_body = up.json().get("message", up.text[:200])
                            except Exception:
                                err_body = up.text[:200] if up.text else str(up.status_code)
                            await msg.reply_text(f"❌ Erreur upload vidéo ({up.status_code}):\n{err_body}")
                    except Exception as e:
                        await msg.reply_text(f"❌ Erreur: {str(e)}")
                else:
                    await msg.reply_text("🎬 Envoyez une vidéo pour remplacer ou /skip pour garder.", parse_mode="HTML")
                    return
                return

            try:
                # L'API attend basePrice, pas price
                api_field = "basePrice" if field == "price" else field
                async with httpx.AsyncClient() as client:
                    resp = await client.patch(
                        f"{api_url}/api/products/{pid}",
                        json={api_field: raw},
                        headers=headers,
                        timeout=10.0
                    )
                    if resp.status_code == 200:
                        await msg.reply_text(f"✅ {field.capitalize()} mis à jour avec succès!")
                    else:
                        await msg.reply_text(f"❌ Erreur: {resp.status_code}")
            except Exception as e:
                await msg.reply_text(f"❌ Erreur: {str(e)}")
            context.user_data.pop("await_action", None)
            return
    # Modifier le nom du bouton MiniApp
    if key == "edit_miniapp_label":
        new_name = (msg.text or "").strip()
        if not new_name:
            await msg.reply_text("Nom invalide.")
            return
        # Ajouter " MiniApp" si pas déjà présent
        if not new_name.lower().endswith("miniapp"):
            new_name = f"{new_name} MiniApp"
        cfg["miniapp_label"] = new_name
        _save_config(cfg)
        try:
            context.user_data.pop("await_action", None)
        except Exception:
            pass
        await msg.reply_text(f"✅ Nom du bouton MiniApp mis à jour: {new_name}")
        try:
            media = await _get_welcome_media()
            panel_caption = _admin_panel_caption()
            if media:
                await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
            else:
                await context.bot.send_message(chat_id=msg.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
        except Exception:
            pass
        return
    # Modifier le @ du panier
    if key == "edit_order_username":
        new_val = (msg.text or "").strip()
        # Sanitize: remove @, keep alphanumeric + underscore
        new_val = new_val.lstrip("@").replace(" ", "").lower()
        new_val = "".join(c for c in new_val if c.isalnum() or c == "_") or "savpizz13"
        cfg["order_telegram_username"] = new_val
        _save_config(cfg)
        try:
            context.user_data.pop("await_action", None)
        except Exception:
            pass
        await msg.reply_text(f"✅ @ Panier mis à jour: @{new_val}")
        try:
            media = await _get_welcome_media()
            panel_caption = _admin_panel_caption()
            if media:
                await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
            else:
                await context.bot.send_message(chat_id=msg.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
        except Exception:
            pass
        return
    # Prioriser l'édition de texte si une action est en cours (éviter collision avec un edit_key résiduel)
    if key in ("edit_welcome", "edit_contact"):
        new_text = (msg.text or msg.caption or "").strip()
        if key == "edit_welcome":
            cfg["welcome_caption"] = new_text
            _save_config(cfg)
            try:
                context.user_data.pop("await_action", None)
            except Exception:
                pass
            await msg.reply_text("Sauvegardé avec succès.")
            try:
                media = await _get_welcome_media()
                panel_caption = _admin_panel_caption()
                if media:
                    await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
                else:
                    await context.bot.send_message(chat_id=msg.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
            except Exception:
                pass
            return
        # edit_contact
        cfg["contact_text"] = new_text
        _save_config(cfg)
        try:
            context.user_data.pop("await_action", None)
        except Exception:
            pass
        await msg.reply_text("Sauvegardé avec succès.")
        try:
            media = await _get_welcome_media()
            panel_caption = _admin_panel_caption()
            if media:
                await context.bot.send_photo(chat_id=msg.chat_id, photo=media, caption=panel_caption, reply_markup=_admin_keyboard())
            else:
                await context.bot.send_message(chat_id=msg.chat_id, text=panel_caption, reply_markup=_admin_keyboard())
        except Exception:
            pass
        return
    # Edition de liens depuis le sous-menu Liens
    if edit_key:
        new_val = (msg.text or "").strip()
        # Valider les URLs: doivent commencer par http:// ou https://
        if edit_key.endswith("_url") or edit_key in ("order_link", "contact_link"):
            nv = new_val.lower()
            if not (nv.startswith("http://") or nv.startswith("https://")):
                await msg.reply_text("URL invalide. Merci d'envoyer une adresse commençant par http:// ou https://")
                try:
                    context.user_data.pop("adm_edit_key", None)
                except Exception:
                    pass
                return
        if edit_key == "order_telegram_username":
            # Sanitize: remove @, keep alphanumeric + underscore
            new_val = new_val.lstrip("@").replace(" ", "").lower()
            new_val = "".join(c for c in new_val if c.isalnum() or c == "_") or "savpizz13"
        try:
            cfg[edit_key] = new_val
            _save_config(cfg)
        except Exception:
            pass
        # Mettre à jour le bouton de menu WebApp si la mini-app est modifiée
        if edit_key == "miniapp_url" and new_val:
            try:
                await context.bot.set_chat_menu_button(
                    menu_button=MenuButtonWebApp(
                        text="Menu",
                        web_app=WebAppInfo(url=new_val),
                    )
                )
            except Exception:
                pass
        # Confirmation
        await msg.reply_text("Mis à jour avec succès.")
        try:
            context.user_data.pop("adm_edit_key", None)
        except Exception:
            pass
        return
    # Gestion des boutons personnalisés et masquage/affichage
    if key and str(key).startswith("btn_"):
        raw = (msg.text or msg.caption or "").strip()
        customs = list(cfg.get("custom_buttons", []))
        hidden = list(cfg.get("hidden_buttons", []))
        allowed_defaults = {"infos", "contact", "miniapp", "instagram", "potato", "linktree", "tg", "ig_backup", "bots"}
        # Nouveau flux guidé d'ajout: type -> valeur -> label
        if key == "btn_add_type":
            ctype = raw.lower()
            if ctype not in ("url", "message"):
                await msg.reply_text("Type invalide. Répondez par 'URL' ou 'Message'.")
                return
            context.user_data["btn_add_selected_type"] = ctype
            context.user_data["await_action"] = "btn_add_value"
            prompt = "Entrez l'URL du bouton" if ctype == "url" else "Entrez votre message pour le bouton"
            await msg.reply_text(prompt)
            return
        if key == "btn_add_value":
            ctype = context.user_data.get("btn_add_selected_type")
            if not ctype:
                await msg.reply_text("Type non défini. Réappuyez sur « Ajouter ».")
                try:
                    context.user_data.pop("await_action", None)
                except Exception:
                    pass
                return
            value = raw
            if ctype == "url":
                nv = value.lower()
                if not (nv.startswith("http://") or nv.startswith("https://")):
                    await msg.reply_text("URL invalide. Merci d'envoyer une adresse commençant par http:// ou https://")
                    return
            context.user_data["btn_add_value"] = value
            context.user_data["await_action"] = "btn_add_label"
            await msg.reply_text("Entrez le nom du bouton (label).")
            return
        if key == "btn_add_label":
            label = raw
            ctype = context.user_data.get("btn_add_selected_type")
            value = context.user_data.get("btn_add_value")
            if not ctype or value is None:
                await msg.reply_text("Contexte d'ajout manquant. Recommencez avec « Ajouter ».")
                try:
                    context.user_data.pop("await_action", None)
                except Exception:
                    pass
                return
            max_id = 0
            for c in customs:
                try:
                    max_id = max(max_id, int(str(c.get("id", 0))))
                except Exception:
                    pass
            new_id = max_id + 1
            customs.append({"id": new_id, "label": label, "type": ctype, "value": value})
            cfg["custom_buttons"] = customs
            _save_config(cfg)
            await msg.reply_text(f"Bouton ajouté: #{new_id} {label} [{ctype}].")
            try:
                context.user_data.pop("await_action", None)
                context.user_data.pop("btn_add_selected_type", None)
                context.user_data.pop("btn_add_value", None)
            except Exception:
                pass
            return
        if key == "btn_add":
            parts = [p.strip() for p in raw.split("|")] if raw else []
            if len(parts) < 3:
                await msg.reply_text("Format invalide. Utilisez: label | type(url/message) | valeur")
                return
            label, ctype, value = parts[0], parts[1].lower(), "|".join(parts[2:]).strip()
            if ctype not in ("url", "message"):
                await msg.reply_text("Type invalide. Utilisez 'url' ou 'message'.")
                return
            if ctype == "url" and not (value.startswith("http://") or value.startswith("https://")):
                await msg.reply_text("URL invalide. Utilisez http(s)://...")
                return
            max_id = 0
            for c in customs:
                try:
                    max_id = max(max_id, int(str(c.get("id", 0))))
                except Exception:
                    pass
            new_id = max_id + 1
            customs.append({"id": new_id, "label": label, "type": ctype, "value": value})
            cfg["custom_buttons"] = customs
            _save_config(cfg)
            await msg.reply_text(f"Bouton ajouté: #{new_id} {label} [{ctype}].")
            context.user_data.pop("await_action", None)
            return
        if key == "btn_edit_selected":
            parts = [p.strip() for p in raw.split("|")] if raw else []
            if len(parts) < 3:
                await msg.reply_text("Format invalide. Utilisez: label | type(url/message) | valeur")
                return
            label, ctype, value = parts[0], parts[1].lower(), "|".join(parts[2:]).strip()
            if ctype not in ("url", "message"):
                await msg.reply_text("Type invalide. Utilisez 'url' ou 'message'.")
                return
            if ctype == "url" and not (value.startswith("http://") or value.startswith("https://")):
                await msg.reply_text("URL invalide. Utilisez http(s)://...")
                return
            sel_id = context.user_data.get("selected_custom_id")
            if sel_id is None:
                await msg.reply_text("Sélection invalide ou expirée. Recommencez.")
                return
            updated = False
            for c in customs:
                if str(c.get("id")) == str(sel_id):
                    c["label"] = label
                    c["type"] = ctype
                    c["value"] = value
                    updated = True
                    break
            if not updated:
                await msg.reply_text("Bouton introuvable.")
                return
            cfg["custom_buttons"] = customs
            _save_config(cfg)
            await msg.reply_text(f"Bouton #{sel_id} mis à jour.")
            try:
                context.user_data.pop("selected_custom_id", None)
                context.user_data.pop("await_action", None)
            except Exception:
                pass
            return
        if key == "btn_edit":
            parts = [p.strip() for p in raw.split("|")] if raw else []
            if len(parts) < 4:
                await msg.reply_text("Format invalide. Utilisez: id | label | type(url/message) | valeur")
                return
            bid_raw, label, ctype, value = parts[0], parts[1], parts[2].lower(), "|".join(parts[3:]).strip()
            try:
                bid = int(bid_raw)
            except Exception:
                await msg.reply_text("ID invalide.")
                return
            if ctype not in ("url", "message"):
                await msg.reply_text("Type invalide. Utilisez 'url' ou 'message'.")
                return
            if ctype == "url" and not (value.startswith("http://") or value.startswith("https://")):
                await msg.reply_text("URL invalide. Utilisez http(s)://...")
                return
            found = False
            for c in customs:
                if int(str(c.get("id", 0))) == bid:
                    c["label"] = label
                    c["type"] = ctype
                    c["value"] = value
                    found = True
                    break
            if not found:
                await msg.reply_text("Bouton introuvable.")
                return
            cfg["custom_buttons"] = customs
            _save_config(cfg)
            await msg.reply_text(f"Bouton #{bid} mis à jour.")
            context.user_data.pop("await_action", None)
            return
        if key == "btn_delete":
            try:
                bid = int(raw)
            except Exception:
                await msg.reply_text("ID invalide.")
                return
            new_list = [c for c in customs if int(str(c.get("id", 0))) != bid]
            if len(new_list) == len(customs):
                await msg.reply_text("Bouton introuvable.")
                return
            cfg["custom_buttons"] = new_list
            _save_config(cfg)
            await msg.reply_text(f"Bouton #{bid} supprimé.")
            context.user_data.pop("await_action", None)
            return
        if key == "btn_hide":
            keys = [k.strip() for k in raw.split(",") if k.strip()]
            if not keys:
                await msg.reply_text("Aucune clé fournie.")
                return
            for k in keys:
                if k not in allowed_defaults:
                    await msg.reply_text(f"Clé inconnue: {k}")
                    return
            for k in keys:
                if k not in hidden:
                    hidden.append(k)
            cfg["hidden_buttons"] = hidden
            _save_config(cfg)
            await msg.reply_text("Boutons par défaut masqués mis à jour.")
            context.user_data.pop("await_action", None)
            return
        if key == "btn_show":
            keys = [k.strip() for k in raw.split(",") if k.strip()]
            if not keys:
                await msg.reply_text("Aucune clé fournie.")
                return
            hidden = [k for k in hidden if k not in keys]
            cfg["hidden_buttons"] = hidden
            _save_config(cfg)
            await msg.reply_text("Boutons par défaut affichés mis à jour.")
            context.user_data.pop("await_action", None)
            return
    # Change logo
    if key == "change_logo":
        if msg.photo:
            try:
                file_id = msg.photo[-1].file_id
                f = await context.bot.get_file(file_id)
                local_path = os.path.join(_BASE_DIR, "IMG.jpg")
                await f.download_to_drive(local_path)
                await msg.reply_text("Logo mis à jour.")
            except Exception as e:
                await msg.reply_text(f"Échec mise à jour du logo: {e}")
        else:
            await msg.reply_text("Veuillez envoyer une photo.")
        context.user_data.pop("await_action", None)
        return
    # (bloc déplacé au-dessus)
    # Bans add/remove
    if key in ("ban_add", "ban_remove"):
        target_id = await _resolve_target_id(msg, context)
        if target_id is None:
            await msg.reply_text("Pseudo ou ID introuvable.")
            return
        bans = _load_bans()
        if key == "ban_add":
            bans.append(target_id)
            _save_bans(bans)
            await msg.reply_text("Utilisateur banni.")
        else:
            bans = [x for x in bans if int(x) != target_id]
            _save_bans(bans)
            await msg.reply_text("Utilisateur débanni.")
        context.user_data.pop("await_action", None)
        return
    # Add admin (support @pseudo ou ID)
    if key == "add_admin":
        new_admin = await _resolve_target_id(msg, context)
        if new_admin is None:
            await msg.reply_text("Pseudo ou ID introuvable.")
            return
        admins = set(cfg.get("admin_ids", []))
        admins.add(new_admin)
        cfg["admin_ids"] = sorted(admins)
        _save_config(cfg)
        # Mettre à jour ADMIN_IDS à chaud
        try:
            ADMIN_IDS.clear()
            ADMIN_IDS.extend(cfg["admin_ids"])  # type: ignore
        except Exception:
            pass
        await msg.reply_text(f"Administrateur ajouté: {new_admin}.")
        context.user_data.pop("await_action", None)
        return
    # Remove admin (support @pseudo ou ID)
    if key == "remove_admin":
        rem_admin = await _resolve_target_id(msg, context)
        if rem_admin is None:
            await msg.reply_text("Pseudo ou ID introuvable.")
            return
        admins = [int(x) for x in cfg.get("admin_ids", [])]
        if rem_admin not in admins:
            await msg.reply_text("Cet utilisateur n'est pas admin.")
            context.user_data.pop("await_action", None)
            return
        admins = [x for x in admins if x != rem_admin]
        cfg["admin_ids"] = admins
        _save_config(cfg)
        # Mettre à jour ADMIN_IDS à chaud
        try:
            ADMIN_IDS.clear()
            ADMIN_IDS.extend(cfg["admin_ids"])  # type: ignore
        except Exception:
            pass
        await msg.reply_text(f"Administrateur retiré: {rem_admin}.")
        context.user_data.pop("await_action", None)
        return

def main() -> None:
    # Charger les admins UNIQUEMENT depuis config.json (pas de fusion avec DEFAULT)
    try:
        cfg = _load_config()
        cfg_ids = cfg.get("admin_ids", [])
        if cfg_ids:
            ADMIN_IDS.clear()
            ADMIN_IDS.extend(sorted(int(a) for a in cfg_ids if a))
        # Sinon garder _DEFAULT_ADMINS
        print(f"Admins chargés: {ADMIN_IDS}")
    except Exception as e:
        print(f"Erreur chargement admins: {e}")

    if not TOKEN:
        raise RuntimeError("La variable d’environnement TELEGRAM_BOT_TOKEN n’est pas définie.")
    # Valider le token avant d’initialiser l’application (getMe)
    try:
        r = httpx.get(f"https://api.telegram.org/bot{TOKEN}/getMe", timeout=10)
        r.raise_for_status()
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(f"Token invalide: getMe ok=false: {data}")
        bot_username = data.get("result", {}).get("username")
        print(f"Bot connecté: @{bot_username}")
    except Exception as e:
        raise RuntimeError(f"Token rejeté par Telegram: {e}")
    async def _set_menu_button(app: Application):
        # Utiliser miniapp_url depuis config si présent; sinon ne rien définir
        try:
            cfg = _load_config()
        except Exception:
            cfg = {}
        url = (cfg.get("miniapp_url") or "").strip()
        if url:
            try:
                await app.bot.set_chat_menu_button(
                    menu_button=MenuButtonWebApp(
                        text="Menu",
                        web_app=WebAppInfo(url=url),
                    )
                )
            except Exception as e:
                print(f"Impossible de définir le bouton de menu WebApp: {e}")

    # Builder avec timeouts plus courts et pool plus large pour éviter les blocages
    application = (
        Application.builder()
        .token(TOKEN)
        .connection_pool_size(512)
        .connect_timeout(3.0)
        .read_timeout(3.0)
        .write_timeout(3.0)
        .pool_timeout(0.5)
        .post_init(_set_menu_button)
        .build()
    )

    # Handler global des erreurs pour logguer sans arrêter le bot
    async def on_error(update, context: ContextTypes.DEFAULT_TYPE):
        err = getattr(context, "error", None)
        try:
            print(f"[ERROR] {err}")
        except Exception:
            pass
    application.add_error_handler(on_error)

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("admin", admin_command))
    application.add_handler(CommandHandler("page", page_command))
    # Handler spécifique pour capter /page dans les posts de canal (texte brut)
    application.add_handler(
        MessageHandler(
            filters.ChatType.CHANNEL & filters.Regex(r"^/page(?:@[A-Za-z0-9_]+)?(?:\s|$)"),
            page_command,
        )
    )
    # Capter /page dans la légende d'un média publié dans le canal
    application.add_handler(
        MessageHandler(
            filters.ChatType.CHANNEL
            & (filters.PHOTO | filters.VIDEO | filters.ANIMATION | filters.Document.ALL)
            & filters.CaptionRegex(r"^/page(?:@[A-Za-z0-9_]+)?(?:\s|$)"),
            page_command,
        )
    )
    # Inputs d'admin (édition textes, bans, logo, etc.)
    allowed_ids = set(ADMIN_IDS)
    if allowed_ids:
        application.add_handler(
            MessageHandler(
                filters.User(list(allowed_ids))
                & (filters.TEXT | filters.PHOTO | filters.VIDEO | filters.ANIMATION | filters.Document.ALL),
                handle_admin_input,
            )
        )
    # Traiter d'abord le bouton de suppression globale (admin-only)
    application.add_handler(CallbackQueryHandler(handle_delete, pattern="^delall:"))
    # Panneau d'administration
    application.add_handler(CallbackQueryHandler(handle_admin_action, pattern="^adm_"))
    # Restreindre le handler de catégories aux clés prévues
    application.add_handler(CallbackQueryHandler(handle_category, pattern="^(infos|contact|miniapp|back|nolink_.*|custom:.*)$"))

    print("Bot démarré. Appuyez sur Ctrl+C pour arrêter.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
