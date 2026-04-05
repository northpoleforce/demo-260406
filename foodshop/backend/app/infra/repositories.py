from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any, Optional


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class OrderRepository:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    def ensure_seed(self) -> None:
        count = self.conn.execute("SELECT COUNT(1) FROM orders").fetchone()[0]
        if count > 0:
            return
        now = _utc_now()
        seed_orders = [
            ("ORD-0001", "A1", now, now, "queued", 1, 0, 0),
            ("ORD-0002", "B2", now, now, "cooking", 1, 0, 0),
        ]
        self.conn.executemany(
            """INSERT INTO orders(order_id, table_id, created_at, updated_at, current_state, version, urge_requested, urge_count)
               VALUES(?,?,?,?,?,?,?,?)""",
            seed_orders,
        )
        self.conn.executemany(
            """INSERT INTO order_items(item_id, order_id, dish_name, qty, item_state) VALUES(?,?,?,?,?)""",
            [
                ("I-1", "ORD-0001", "宫保鸡丁", 1, "queued"),
                ("I-2", "ORD-0001", "米饭", 1, "queued"),
                ("I-3", "ORD-0002", "鱼香肉丝", 1, "cooking"),
            ],
        )
        self.conn.commit()

    def get_order(self, order_id: str) -> Optional[dict[str, Any]]:
        row = self.conn.execute("SELECT * FROM orders WHERE order_id = ?", (order_id,)).fetchone()
        if not row:
            return None
        items = self.conn.execute(
            "SELECT item_id, order_id, dish_name, qty, item_state FROM order_items WHERE order_id = ?",
            (order_id,),
        ).fetchall()
        order = dict(row)
        order["urge_requested"] = bool(order["urge_requested"])
        order["items"] = [dict(i) for i in items]
        return order

    def list_orders(self, since: Optional[str] = None) -> list[dict[str, Any]]:
        if since:
            rows = self.conn.execute("SELECT * FROM orders WHERE updated_at >= ? ORDER BY created_at", (since,)).fetchall()
        else:
            rows = self.conn.execute("SELECT * FROM orders ORDER BY created_at").fetchall()
        result: list[dict[str, Any]] = []
        for row in rows:
            order = self.get_order(row["order_id"])
            if order:
                result.append(order)
        return result

    def update_order_state(self, order_id: str, target_state: str, expected_version: int) -> Optional[dict[str, Any]]:
        now = _utc_now()
        cursor = self.conn.execute(
            """UPDATE orders
               SET current_state = ?, version = version + 1, updated_at = ?
               WHERE order_id = ? AND version = ?""",
            (target_state, now, order_id, expected_version),
        )
        if cursor.rowcount == 0:
            return None
        self.conn.commit()
        return self.get_order(order_id)

    def mark_urge(self, order_id: str) -> Optional[dict[str, Any]]:
        now = _utc_now()
        cursor = self.conn.execute(
            """UPDATE orders
               SET urge_requested = 1, urge_count = urge_count + 1, updated_at = ?
               WHERE order_id = ?""",
            (now, order_id),
        )
        if cursor.rowcount == 0:
            return None
        self.conn.commit()
        return self.get_order(order_id)

    def insert_urge_event(
        self,
        order_id: str,
        table_id: str,
        source: str,
        request_id: str,
        confidence: Optional[float] = None,
    ) -> dict[str, Any]:
        event_id = f"urge-{uuid.uuid4().hex[:16]}"
        payload = {
            "event_id": event_id,
            "order_id": order_id,
            "table_id": table_id,
            "source": source,
            "confidence": confidence,
            "request_id": request_id,
            "created_at": _utc_now(),
        }
        self.conn.execute(
            """INSERT INTO urge_events(event_id, order_id, table_id, source, confidence, request_id, created_at)
               VALUES(:event_id,:order_id,:table_id,:source,:confidence,:request_id,:created_at)""",
            payload,
        )
        self.conn.commit()
        return payload

    def insert_audit_log(self, actor: str, action: str, payload: dict[str, Any]) -> None:
        self.conn.execute(
            "INSERT INTO audit_logs(log_id, actor, action, payload, created_at) VALUES(?,?,?,?,?)",
            (f"log-{uuid.uuid4().hex[:16]}", actor, action, json.dumps(payload, ensure_ascii=False), _utc_now()),
        )
        self.conn.commit()

    def create_order(self, table_id: str, items: list[dict[str, Any]]) -> dict[str, Any]:
        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        now = _utc_now()
        self.conn.execute(
            """INSERT INTO orders(order_id, table_id, created_at, updated_at, current_state, version, urge_requested, urge_count)
               VALUES(?,?,?,?,?,?,?,?)""",
            (order_id, table_id, now, now, "queued", 1, 0, 0),
        )
        item_rows = []
        for item in items:
            item_rows.append(
                (
                    f"I-{uuid.uuid4().hex[:10]}",
                    order_id,
                    item["dish_name"],
                    int(item["qty"]),
                    "queued",
                )
            )
        self.conn.executemany(
            "INSERT INTO order_items(item_id, order_id, dish_name, qty, item_state) VALUES(?,?,?,?,?)",
            item_rows,
        )
        self.conn.commit()
        return self.get_order(order_id)  # type: ignore[return-value]

    def update_order_item_state(self, order_id: str, item_id: str, target_state: str) -> Optional[dict[str, Any]]:
        row = self.conn.execute(
            "SELECT item_state FROM order_items WHERE order_id = ? AND item_id = ?",
            (order_id, item_id),
        ).fetchone()
        if not row:
            return None

        current_state = row["item_state"]
        next_state = {
            "queued": "cooking",
            "cooking": "ready",
            "ready": "served",
            "served": None,
        }
        if next_state.get(current_state) != target_state:
            raise ValueError(f"invalid transition: {current_state} -> {target_state}")

        self.conn.execute(
            "UPDATE order_items SET item_state = ? WHERE order_id = ? AND item_id = ?",
            (target_state, order_id, item_id),
        )

        items = self.conn.execute(
            "SELECT item_state FROM order_items WHERE order_id = ?",
            (order_id,),
        ).fetchall()
        item_states = [r["item_state"] for r in items]

        # 桌内排序优先级：制作中 > 排队中 > 派送中(ready) > 已送达
        if "cooking" in item_states:
            order_state = "cooking"
        elif "queued" in item_states:
            order_state = "queued"
        elif "ready" in item_states:
            order_state = "ready"
        else:
            order_state = "served"

        self.conn.execute(
            "UPDATE orders SET current_state = ?, updated_at = ?, version = version + 1 WHERE order_id = ?",
            (order_state, _utc_now(), order_id),
        )
        self.conn.commit()
        return self.get_order(order_id)
