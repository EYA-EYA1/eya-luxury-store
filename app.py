"""EYA - Flask backend. Prices, totals, stock and roles are decided on the server only."""
import json, os, secrets, sqlite3
from flask import Flask, g, jsonify, request, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash

BASE = os.path.dirname(os.path.abspath(__file__))
STATUSES = ("pending", "paid", "shipped", "cancelled")
SCHEMA = """
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer');
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK(price_cents>=0), stock INTEGER NOT NULL CHECK(stock>=0),
  description TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#B08D57', image TEXT,
  name_fr TEXT, name_ar TEXT, desc_fr TEXT, desc_ar TEXT);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), name TEXT NOT NULL,
  email TEXT NOT NULL, address TEXT NOT NULL, total_cents INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id), name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL, qty INTEGER NOT NULL CHECK(qty>0));
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
"""

def create_app(db_path=None):
    app = Flask(__name__, static_folder=None)
    app.config.update(DB=db_path or os.environ.get("EYA_DB") or os.path.join(BASE, "eya.db"),
                      SECRET_KEY=os.environ.get("SECRET_KEY") or secrets.token_hex(32),
                      SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE="Lax")

    def db():
        if "db" not in g:
            g.db = sqlite3.connect(app.config["DB"], isolation_level=None)
            g.db.row_factory = sqlite3.Row
            g.db.execute("PRAGMA foreign_keys=ON")
        return g.db

    @app.teardown_appcontext
    def close(_):
        d = g.pop("db", None)
        if d: d.close()

    with app.app_context():
        c = db(); c.executescript(SCHEMA)
        if not c.execute("SELECT 1 FROM products").fetchone():
            with open(os.path.join(BASE, "catalog.json"), encoding="utf-8") as f:
                for p in json.load(f):
                    c.execute("INSERT INTO products(name,category,price_cents,stock,description,image,name_fr,name_ar,desc_fr,desc_ar) VALUES(?,?,?,?,?,?,?,?,?,?)",
                              (p["name"], p["category"], p["price_cents"], p["stock"], p["description"], p.get("image"),
                               p.get("fr", {}).get("name"), p.get("ar", {}).get("name"), p.get("fr", {}).get("description"), p.get("ar", {}).get("description")))
        if not c.execute("SELECT 1 FROM users WHERE role='admin'").fetchone():
            pw = os.environ.get("ADMIN_PASSWORD")
            if not pw:
                pw = secrets.token_urlsafe(9); print(f"[Aurelle] Generated admin password (shown once): {pw}")
            c.execute("INSERT INTO users(email,name,password_hash,role) VALUES(?,?,?,'admin')",
                      ("admin@aurelle.test", "Admin", generate_password_hash(pw)))

    def err(msg, code=400): return jsonify(error=msg), code
    def body(): return request.get_json(silent=True) or {}
    def me():
        uid = session.get("uid")
        return db().execute("SELECT id,email,name,role FROM users WHERE id=?", (uid,)).fetchone() if uid else None
    def as_int(v, lo, hi):
        if isinstance(v, bool) or not isinstance(v, int) or not lo <= v <= hi: return None
        return v

    @app.before_request
    def json_only():  # blocks simple cross-site form posts
        if request.method in ("POST", "PATCH", "PUT", "DELETE") and request.path.startswith("/api/") \
                and not request.is_json:
            return err("JSON body required", 415)

    @app.after_request
    def headers(r):
        r.headers["X-Content-Type-Options"] = "nosniff"
        r.headers["X-Frame-Options"] = "DENY"
        return r

    @app.get("/")
    def index(): return send_from_directory(os.path.join(BASE, "static"), "index.html")

    @app.get("/img/<path:name>")
    def img(name): return send_from_directory(os.path.join(BASE, "static", "img"), name)

    @app.get("/assets/<path:name>")
    def assets(name): return send_from_directory(os.path.join(BASE, "static", "assets"), name)

    # ---- catalog ----
    @app.get("/api/products")
    def products():
        sql, args = "SELECT * FROM products WHERE 1=1", []
        q, cat = request.args.get("q", "").strip(), request.args.get("category", "")
        if q: sql += " AND (name LIKE ? OR description LIKE ? OR name_fr LIKE ? OR name_ar LIKE ?)"; args += [f"%{q}%"] * 4
        if cat: sql += " AND category=?"; args.append(cat)
        order = {"price_asc": "price_cents ASC", "price_desc": "price_cents DESC", "name": "name ASC"}
        sql += " ORDER BY " + order.get(request.args.get("sort"), "id ASC")
        return jsonify([dict(r) for r in db().execute(sql, args)])

    # ---- cart (session, quantities only) ----
    def cart_view():
        items, total = [], 0
        for pid, qty in session.get("cart", {}).items():
            p = db().execute("SELECT * FROM products WHERE id=?", (int(pid),)).fetchone()
            if p:
                items.append(dict(product_id=p["id"], name=p["name"], qty=qty, unit_price_cents=p["price_cents"],
                                  stock=p["stock"], color=p["color"]))
                total += p["price_cents"] * qty
        return dict(items=items, total_cents=total)

    @app.get("/api/cart")
    def cart_get(): return jsonify(cart_view())

    @app.post("/api/cart")
    def cart_set():
        d = body(); pid, qty = as_int(d.get("product_id"), 1, 10**9), as_int(d.get("qty"), 0, 10)
        if pid is None or qty is None: return err("Invalid product or quantity (0-10).")
        if not db().execute("SELECT 1 FROM products WHERE id=?", (pid,)).fetchone(): return err("Unknown product.", 404)
        cart = dict(session.get("cart", {}))
        if qty: cart[str(pid)] = qty
        else: cart.pop(str(pid), None)
        session["cart"] = cart
        return jsonify(cart_view())

    # ---- auth ----
    @app.post("/api/register")
    def register():
        d = body(); email, name, pw = (str(d.get(k, "")).strip() for k in ("email", "name", "password"))
        if "@" not in email or not name or len(pw) < 8: return err("Valid email, name and a password of 8+ characters required.")
        try:
            cur = db().execute("INSERT INTO users(email,name,password_hash) VALUES(?,?,?)",
                               (email.lower(), name, generate_password_hash(pw)))
        except sqlite3.IntegrityError: return err("Email already registered.", 409)
        session["uid"] = cur.lastrowid
        return jsonify(dict(me()))

    @app.post("/api/login")
    def login():
        d = body(); u = db().execute("SELECT * FROM users WHERE email=?", (str(d.get("email", "")).lower(),)).fetchone()
        if not u or not check_password_hash(u["password_hash"], str(d.get("password", ""))): return err("Wrong email or password.", 401)
        cart = session.get("cart"); session.clear(); session["uid"] = u["id"]
        if cart: session["cart"] = cart
        return jsonify(dict(me()))

    @app.post("/api/logout")
    def logout(): session.clear(); return jsonify(ok=True)

    @app.get("/api/me")
    def whoami(): u = me(); return jsonify(dict(u) if u else None)

    # ---- orders ----
    @app.post("/api/checkout")
    def checkout():
        d = body(); name, email, addr = (str(d.get(k, "")).strip() for k in ("name", "email", "address"))
        if not name or "@" not in email or len(addr) < 5: return err("Name, valid email and address are required.")
        cart = session.get("cart", {})
        if not cart: return err("Your cart is empty.")
        c, u = db(), me()
        c.execute("BEGIN IMMEDIATE")
        try:
            lines, total = [], 0
            for pid, qty in cart.items():
                p = c.execute("SELECT * FROM products WHERE id=?", (int(pid),)).fetchone()
                ok = p and c.execute("UPDATE products SET stock=stock-? WHERE id=? AND stock>=?", (qty, p["id"], qty)).rowcount
                if not ok:
                    c.execute("ROLLBACK"); return err(f"Not enough stock for {p['name'] if p else 'a product'}.", 409)
                lines.append((p["id"], p["name"], p["price_cents"], qty)); total += p["price_cents"] * qty
            oid = c.execute("INSERT INTO orders(user_id,name,email,address,total_cents) VALUES(?,?,?,?,?)",
                            (u["id"] if u else None, name, email, addr, total)).lastrowid
            c.executemany("INSERT INTO order_items(order_id,product_id,name,unit_price_cents,qty) VALUES(?,?,?,?,?)",
                          [(oid, *l) for l in lines])
            c.execute("COMMIT")
        except Exception:
            c.execute("ROLLBACK"); raise
        session["cart"] = {}
        return jsonify(order_id=oid, total_cents=total), 201

    def order_rows(where, args):
        out = []
        for o in db().execute(f"SELECT * FROM orders {where} ORDER BY id DESC", args):
            o = dict(o); o["items"] = [dict(i) for i in db().execute("SELECT * FROM order_items WHERE order_id=?", (o["id"],))]
            out.append(o)
        return out

    @app.get("/api/orders")
    def my_orders():
        u = me()
        return jsonify(order_rows("WHERE user_id=?", (u["id"],))) if u else err("Log in first.", 401)

    # ---- admin ----
    def admin_only():
        u = me()
        if not u: return err("Log in first.", 401)
        if u["role"] != "admin": return err("Admins only.", 403)

    @app.get("/api/admin/orders")
    def admin_orders(): return admin_only() or jsonify(order_rows("", ()))

    @app.patch("/api/admin/orders/<int:oid>")
    def admin_order(oid):
        bad = admin_only()
        if bad: return bad
        s = body().get("status")
        if s not in STATUSES: return err("Invalid status.")
        if not db().execute("UPDATE orders SET status=? WHERE id=?", (s, oid)).rowcount: return err("Not found.", 404)
        return jsonify(ok=True)

    @app.patch("/api/admin/products/<int:pid>")
    def admin_product(pid):
        bad = admin_only()
        if bad: return bad
        d = body(); price, stock = as_int(d.get("price_cents"), 0, 10**8), as_int(d.get("stock"), 0, 10**6)
        if price is None or stock is None: return err("price_cents and stock must be non-negative integers.")
        if not db().execute("UPDATE products SET price_cents=?, stock=? WHERE id=?", (price, stock, pid)).rowcount: return err("Not found.", 404)
        return jsonify(ok=True)

    return app

if __name__ == "__main__":
    create_app().run(debug=os.environ.get("FLASK_DEBUG") == "1")
