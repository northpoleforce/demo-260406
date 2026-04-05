from fastapi.testclient import TestClient

from main import app


AUTH = {"Authorization": "Bearer kitchen-tablet-001"}


def test_health_endpoint_returns_ok() -> None:
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"


def test_snapshot_requires_token() -> None:
    with TestClient(app) as client:
        res = client.get("/api/v1/snapshot")
        assert res.status_code == 401


def test_state_flow_updates_order() -> None:
    with TestClient(app) as client:
        snap = client.get("/api/v1/snapshot", headers=AUTH)
        assert snap.status_code == 200
        orders = snap.json()["orders"]
        order = next((o for o in orders if o["current_state"] != "served"), None)
        assert order is not None

        current = order["current_state"]
        if current == "queued":
            target = "cooking"
        elif current == "cooking":
            target = "ready"
        else:
            target = "served"

        res = client.post(
            f"/api/v1/orders/{order['order_id']}/state",
            headers=AUTH,
            json={"target_state": target, "operator": "tester", "version": order["version"]},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["current_state"] == target
        assert body["version"] == order["version"] + 1


def test_create_order_endpoint_creates_new_order() -> None:
    with TestClient(app) as client:
        payload = {
            "table_id": "T9",
            "items": [
                {"dish_name": "麻婆豆腐", "qty": 1},
                {"dish_name": "米饭", "qty": 2},
            ],
        }
        res = client.post("/api/v1/orders", headers=AUTH, json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["table_id"] == "T9"
        assert body["current_state"] == "queued"
        assert len(body["items"]) == 2


def test_update_order_item_state_moves_item_and_order_state() -> None:
    with TestClient(app) as client:
        create_payload = {
            "table_id": "T10",
            "items": [{"dish_name": "回锅肉", "qty": 1}],
        }
        created = client.post("/api/v1/orders", headers=AUTH, json=create_payload)
        assert created.status_code == 200
        order = created.json()
        item = order["items"][0]

        res = client.post(
            f"/api/v1/orders/{order['order_id']}/items/{item['item_id']}/state",
            headers=AUTH,
            json={"target_state": "cooking", "operator": "kitchen"},
        )
        assert res.status_code == 200
        updated = res.json()
        assert updated["items"][0]["item_state"] == "cooking"
        assert updated["current_state"] == "cooking"
