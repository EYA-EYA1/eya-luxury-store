import os, sys, pytest
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["ADMIN_PASSWORD"] = "admin-test-pass"
from app import create_app

@pytest.fixture
def make(tmp_path):
    app = create_app(str(tmp_path / "t.db"))
    return app.test_client

def buy(c, pid=1, qty=2, **extra):
    c.post("/api/cart", json={"product_id": pid, "qty": qty, **extra})
    return c.post("/api/checkout", json={"name": "Sam", "email": "s@x.io", "address": "1 Test Street"})

def test_catalog_search_and_sort(make):
    c = make()
    assert len(c.get("/api/products").json) == 19
    assert [p["name"] for p in c.get("/api/products?q=sunglasses").json] == ["Classic Acetate Sunglasses"]
    prices = [p["price_cents"] for p in c.get("/api/products?sort=price_asc").json]
    assert prices == sorted(prices)

def test_total_ignores_browser_price(make):
    c = make()
    r = buy(c, 1, 2, price_cents=1)
    assert r.status_code == 201 and r.json["total_cents"] == 2 * 8900

def test_stock_decrements_and_blocks_oversell(make):
    c = make(); buy(c, 4, 8)
    assert next(p for p in c.get("/api/products").json if p["id"] == 4)["stock"] == 0
    assert buy(c, 4, 1).status_code == 409

def test_invalid_quantity_rejected(make):
    c = make()
    assert c.post("/api/cart", json={"product_id": 1, "qty": -3}).status_code == 400
    assert c.post("/api/cart", json={"product_id": 1, "qty": "5"}).status_code == 400

def test_empty_cart_rejected(make):
    assert make().post("/api/checkout", json={"name": "A", "email": "a@b.c", "address": "12345"}).status_code == 400

def test_customer_cannot_see_others_orders_or_admin(make):
    a, b = make(), make()
    a.post("/api/register", json={"email": "a@x.io", "name": "A", "password": "password1"}); buy(a)
    b.post("/api/register", json={"email": "b@x.io", "name": "B", "password": "password1"})
    assert len(a.get("/api/orders").json) == 1 and b.get("/api/orders").json == []
    assert b.get("/api/admin/orders").status_code == 403
    assert make().get("/api/admin/orders").status_code == 401

def test_admin_can_update_order_and_product(make):
    c, g = make(), make(); buy(g)
    c.post("/api/login", json={"email": "admin@aurelle.test", "password": "admin-test-pass"})
    assert c.patch("/api/admin/orders/1", json={"status": "shipped"}).status_code == 200
    assert c.patch("/api/admin/orders/1", json={"status": "bogus"}).status_code == 400
    assert c.patch("/api/admin/products/1", json={"price_cents": 9900, "stock": 5}).status_code == 200

def test_wrong_password_and_non_json(make):
    c = make()
    assert c.post("/api/login", json={"email": "admin@aurelle.test", "password": "nope"}).status_code == 401
    assert c.post("/api/login", data="x=1").status_code == 415

def test_every_product_has_an_existing_photo_and_translations(make):
    base = os.path.dirname(os.path.dirname(__file__))
    for p in make().get("/api/products").json:
        assert os.path.exists(os.path.join(base, "static", p["image"].lstrip("/").replace("img/", "img/", 1)))
        assert p["name_fr"] and p["name_ar"] and p["desc_fr"] and p["desc_ar"]
