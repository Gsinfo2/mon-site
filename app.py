import json
import os
import secrets
import sqlite3
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, send_from_directory, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DATABASE = DATA_DIR / "catalog.db"
ADMIN_CONFIG = DATA_DIR / "admin.json"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize():
    with get_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'ARTICLE',
                price TEXT NOT NULL DEFAULT '',
                condition TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                photo TEXT NOT NULL DEFAULT '',
                available INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        if db.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
            db.executemany(
                """
                INSERT INTO products
                    (name, category, price, condition, description, photo, available)
                VALUES (?, ?, ?, ?, ?, ?, 1)
                """,
                [
                    ("ASUS X Series", "PC portable", "650 DT", "Batterie HS",
                     "Ordinateur portable en bon état général.", "asus-x-series.png"),
                    ("MacBook Pro 2011", "PC portable", "450 DT", "Batterie en bon état",
                     "MacBook Pro avec batterie en bon état.", "macbook-pro-2011.jpg"),
                ],
            )
        db.commit()

    if not ADMIN_CONFIG.exists():
        password = os.environ.get("GSINFO_ADMIN_PASSWORD")
        if not password:
            password = secrets.token_urlsafe(12)
            print(f"[GSINFO] Mot de passe administrateur initial : {password}")
        ADMIN_CONFIG.write_text(
            json.dumps({
                "password_hash": generate_password_hash(password),
                "secret_key": secrets.token_hex(32),
            }),
            encoding="utf-8",
        )
    config = json.loads(ADMIN_CONFIG.read_text(encoding="utf-8"))
    app.config["SECRET_KEY"] = os.environ.get("GSINFO_SECRET_KEY", config["secret_key"])


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_authenticated"):
            return redirect(url_for("admin_login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def product_dict(row):
    product = dict(row)
    product["available"] = bool(product["available"])
    if product["photo"]:
        if "/" in product["photo"]:
            product["photo"] = f"/{product['photo'].lstrip('/')}"
        elif product["photo"] in ("asus-x-series.png", "macbook-pro-2011.jpg"):
            product["photo"] = f"/{product['photo']}"
        else:
            product["photo"] = f"/uploads/{product['photo']}"
    return product


initialize()


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/style.css")
def stylesheet():
    return send_from_directory(BASE_DIR, "style.css")


@app.route("/script.js")
def script():
    return send_from_directory(BASE_DIR, "script.js")


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/api/products")
def api_products():
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM products WHERE available = 1 ORDER BY id DESC"
        ).fetchall()
    return jsonify([product_dict(row) for row in rows])


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    error = None
    if request.method == "POST":
        password = request.form.get("password", "")
        config = json.loads(ADMIN_CONFIG.read_text(encoding="utf-8"))
        if check_password_hash(config["password_hash"], password):
            session.clear()
            session["admin_authenticated"] = True
            return redirect(url_for("admin"))
        error = "Mot de passe incorrect."
    return render_template("login.html", error=error)


@app.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/admin")
@admin_required
def admin():
    with get_db() as db:
        products = [product_dict(row) for row in db.execute(
            "SELECT * FROM products ORDER BY id DESC"
        ).fetchall()]
    return render_template("admin.html", products=products)


@app.route("/admin/products", methods=["POST"])
@admin_required
def add_product():
    name = request.form.get("name", "").strip()
    price = request.form.get("price", "").strip()
    if not name or not price:
        return "Le nom et le prix sont obligatoires.", 400

    photo = request.files.get("photo")
    photo_name = ""
    if photo and photo.filename:
        if not allowed_file(photo.filename):
            return "Format de photo invalide.", 400
        photo_name = f"{secrets.token_hex(12)}_{secure_filename(photo.filename)}"
        photo.save(UPLOAD_DIR / photo_name)

    with get_db() as db:
        db.execute(
            """
            INSERT INTO products
                (name, category, price, condition, description, photo, available)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                request.form["name"].strip(),
                request.form.get("category", "").strip() or "ARTICLE",
                request.form["price"].strip(),
                request.form.get("condition", "").strip(),
                request.form.get("description", "").strip(),
                photo_name,
                1 if request.form.get("available") == "on" else 0,
            ),
        )
        db.commit()
    return redirect(url_for("admin"))


@app.route("/admin/products/<int:product_id>/delete", methods=["POST"])
@admin_required
def delete_product(product_id):
    with get_db() as db:
        row = db.execute("SELECT photo FROM products WHERE id = ?", (product_id,)).fetchone()
        if row and row["photo"]:
            photo_path = UPLOAD_DIR / row["photo"]
            if photo_path.exists():
                photo_path.unlink()
        db.execute("DELETE FROM products WHERE id = ?", (product_id,))
        db.commit()
    return redirect(url_for("admin"))


@app.route("/admin/products/<int:product_id>/availability", methods=["POST"])
@admin_required
def toggle_availability(product_id):
    with get_db() as db:
        db.execute(
            "UPDATE products SET available = CASE available WHEN 1 THEN 0 ELSE 1 END WHERE id = ?",
            (product_id,),
        )
        db.commit()
    return redirect(url_for("admin"))


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", host="0.0.0.0", port=5000)
