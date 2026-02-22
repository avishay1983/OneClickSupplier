"""
JsonStore — Generic JSON-based CRUD engine.
Replaces Supabase's PostgREST client with the same API,
so backend routers need minimal code changes.

Usage:
    db = JsonStore("./data")
    # Same API as supabase.table():
    result = db.table("vendor_requests").select("*").eq("status", "pending").execute()
    db.table("vendor_requests").insert({"id": "...", "vendor_name": "..."}).execute()
    db.table("vendor_requests").update({"status": "approved"}).eq("id", "123").execute()
    db.table("vendor_requests").delete().eq("id", "123").execute()

Each JSON file is a list of dicts (rows), e.g.:
    vendor_requests.json = [{"id": "...", "vendor_name": "...", ...}, ...]

When Bituach Yashir provides a real DB, replace this module with a
SQL-backed implementation that exposes the same `.table()` API.
"""

import json
import os
import uuid
import threading
import re
from datetime import datetime, timezone
from typing import Any, Optional
from copy import deepcopy


class QueryResult:
    """Mimics Supabase's APIResponse."""
    def __init__(self, data: Any = None, count: Optional[int] = None):
        self.data = data
        self.count = count


class TableQuery:
    """
    Chainable query builder that mimics Supabase PostgREST API.
    Supports: select, insert, update, upsert, delete, eq, neq, gt, gte, lt, lte,
              in_, ilike, or_, is_, order, limit, range_, maybe_single, single, execute.
    """

    def __init__(self, store: 'JsonStore', table_name: str):
        self._store = store
        self._table_name = table_name
        self._operation = None  # 'select' | 'insert' | 'update' | 'upsert' | 'delete'
        self._columns = "*"
        self._filters: list = []
        self._or_filters: list = []
        self._order_by: list = []
        self._limit_n: Optional[int] = None
        self._range_start: Optional[int] = None
        self._range_end: Optional[int] = None
        self._data: Any = None
        self._single = False
        self._maybe_single = False
        self._count_mode: Optional[str] = None  # 'exact' | None
        self._head = False  # True = count only, no data

    # --- Operation methods ---

    def select(self, columns: str = "*", count: Optional[str] = None, head: bool = False) -> 'TableQuery':
        self._operation = "select"
        self._columns = columns
        self._count_mode = count
        self._head = head
        return self

    def insert(self, data: Any) -> 'TableQuery':
        self._operation = "insert"
        self._data = data if isinstance(data, list) else [data]
        return self

    def update(self, data: dict) -> 'TableQuery':
        self._operation = "update"
        self._data = data
        return self

    def upsert(self, data: Any) -> 'TableQuery':
        self._operation = "upsert"
        self._data = data if isinstance(data, list) else [data]
        return self

    def delete(self) -> 'TableQuery':
        self._operation = "delete"
        return self

    # --- Filter methods ---

    def eq(self, column: str, value: Any) -> 'TableQuery':
        self._filters.append(("eq", column, value))
        return self

    def neq(self, column: str, value: Any) -> 'TableQuery':
        self._filters.append(("neq", column, value))
        return self

    def gt(self, column: str, value: Any) -> 'TableQuery':
        self._filters.append(("gt", column, value))
        return self

    def gte(self, column: str, value: Any) -> 'TableQuery':
        self._filters.append(("gte", column, value))
        return self

    def lt(self, column: str, value: Any) -> 'TableQuery':
        self._filters.append(("lt", column, value))
        return self

    def lte(self, column: str, value: Any) -> 'TableQuery':
        self._filters.append(("lte", column, value))
        return self

    def in_(self, column: str, values: list) -> 'TableQuery':
        self._filters.append(("in", column, values))
        return self

    def is_(self, column: str, value: Any) -> 'TableQuery':
        """Filter for null/not-null: .is_("col", None) or .is_("col", "null")"""
        self._filters.append(("is", column, value))
        return self

    def ilike(self, column: str, pattern: str) -> 'TableQuery':
        self._filters.append(("ilike", column, pattern))
        return self

    def not_is_(self, column: str, value: Any) -> 'TableQuery':
        """Filter for NOT NULL: .not_is_("col", "null") means col IS NOT NULL"""
        self._filters.append(("not_is", column, value))
        return self

    def filter(self, column: str, operator: str, value: Any) -> 'TableQuery':
        """
        Supabase-compatible .filter() method.
        Maps to internal filter types.
        """
        op_map = {"eq": "eq", "neq": "neq", "gt": "gt", "gte": "gte",
                  "lt": "lt", "lte": "lte", "is": "is", "ilike": "ilike"}
        internal_op = op_map.get(operator, operator)
        if internal_op == "is" and (value == "null" or value is None):
            self._filters.append(("is", column, None))
        else:
            self._filters.append((internal_op, column, value))
        return self

    def or_(self, filter_string: str) -> 'TableQuery':
        """
        Supabase-style OR filter string, e.g.:
        .or_("vendor_name.ilike.%search%,vendor_email.ilike.%search%")
        """
        self._or_filters.append(filter_string)
        return self

    # --- Modifiers ---

    def order(self, column: str, desc: bool = False) -> 'TableQuery':
        self._order_by.append((column, desc))
        return self

    def limit(self, n: int) -> 'TableQuery':
        self._limit_n = n
        return self

    def range_(self, start: int, end: int) -> 'TableQuery':
        self._range_start = start
        self._range_end = end
        return self

    def single(self) -> 'TableQuery':
        self._single = True
        return self

    def maybe_single(self) -> 'TableQuery':
        self._maybe_single = True
        return self

    # --- Execute ---

    def execute(self) -> QueryResult:
        if self._operation == "select":
            return self._exec_select()
        elif self._operation == "insert":
            return self._exec_insert()
        elif self._operation == "update":
            return self._exec_update()
        elif self._operation == "upsert":
            return self._exec_upsert()
        elif self._operation == "delete":
            return self._exec_delete()
        else:
            raise ValueError(f"No operation specified. Call select/insert/update/delete before execute.")

    # --- Internal execution ---

    def _apply_filters(self, rows: list) -> list:
        """Apply AND filters."""
        result = rows
        for op, col, val in self._filters:
            if op == "eq":
                result = [r for r in result if r.get(col) == val]
            elif op == "neq":
                result = [r for r in result if r.get(col) != val]
            elif op == "gt":
                result = [r for r in result if r.get(col) is not None and r.get(col) > val]
            elif op == "gte":
                result = [r for r in result if r.get(col) is not None and r.get(col) >= val]
            elif op == "lt":
                result = [r for r in result if r.get(col) is not None and r.get(col) < val]
            elif op == "lte":
                result = [r for r in result if r.get(col) is not None and r.get(col) <= val]
            elif op == "in":
                result = [r for r in result if r.get(col) in val]
            elif op == "is":
                if val is None or val == "null":
                    result = [r for r in result if r.get(col) is None]
                else:
                    result = [r for r in result if r.get(col) is not None]
            elif op == "not_is":
                if val is None or val == "null":
                    result = [r for r in result if r.get(col) is not None]
                else:
                    result = [r for r in result if r.get(col) is None]
            elif op == "ilike":
                pattern = val.replace("%", ".*")
                regex = re.compile(pattern, re.IGNORECASE)
                result = [r for r in result if r.get(col) and regex.search(str(r.get(col)))]
        return result

    def _apply_or_filters(self, rows: list) -> list:
        """Apply OR filter strings (Supabase format)."""
        for or_str in self._or_filters:
            parts = or_str.split(",")
            matching = set()
            for part in parts:
                # Parse "column.operator.value" format
                segments = part.strip().split(".", 2)
                if len(segments) == 3:
                    col, op, val = segments
                    for i, r in enumerate(rows):
                        if op == "ilike":
                            pattern = val.replace("%", ".*")
                            if r.get(col) and re.search(pattern, str(r.get(col)), re.IGNORECASE):
                                matching.add(i)
                        elif op == "eq":
                            if str(r.get(col)) == val:
                                matching.add(i)
            rows = [rows[i] for i in sorted(matching)]
        return rows

    def _apply_ordering(self, rows: list) -> list:
        for col, desc in reversed(self._order_by):
            rows = sorted(rows, key=lambda r: (r.get(col) is None, r.get(col) or ""), reverse=desc)
        return rows

    def _apply_limits(self, rows: list) -> list:
        if self._range_start is not None and self._range_end is not None:
            rows = rows[self._range_start:self._range_end + 1]
        elif self._limit_n is not None:
            rows = rows[:self._limit_n]
        return rows

    def _select_columns(self, rows: list) -> list:
        """Handle column selection including relation joins (simplified)."""
        if self._columns == "*":
            return rows

        # Parse column spec — handle "col1, col2, relation(col1, col2)"
        cols = []
        relation_pattern = re.compile(r'(\w+)\(([^)]+)\)')
        
        # Extract relations first
        relations = {}
        clean_cols = self._columns
        for match in relation_pattern.finditer(self._columns):
            rel_name = match.group(1)
            rel_cols = [c.strip() for c in match.group(2).split(",")]
            relations[rel_name] = rel_cols
            clean_cols = clean_cols.replace(match.group(0), "")
        
        # Parse remaining columns
        cols = [c.strip() for c in clean_cols.split(",") if c.strip()]

        if not cols and not relations:
            return rows

        result = []
        for row in rows:
            new_row = {}
            for col in cols:
                if col == "*":
                    new_row.update(row)
                elif col in row:
                    new_row[col] = row[col]
            
            # Handle relations (simplified — looks up in related table by foreign key)
            for rel_name, rel_cols in relations.items():
                fk_col = f"{rel_name[:-1]}_id" if rel_name.endswith("s") else f"{rel_name}_id"
                # Try common FK patterns
                for possible_fk in [fk_col, f"{rel_name}_id", "vendor_request_id"]:
                    if possible_fk in row:
                        related = self._store._load_table(rel_name)
                        matched = [r for r in related if r.get("id") == row[possible_fk]]
                        if matched:
                            rel_data = {c: matched[0].get(c) for c in rel_cols}
                            new_row[rel_name] = rel_data
                        else:
                            new_row[rel_name] = None
                        break
            
            result.append(new_row)
        return result

    def _exec_select(self) -> QueryResult:
        rows = self._store._load_table(self._table_name)
        rows = deepcopy(rows)

        # Apply filters
        rows = self._apply_filters(rows)
        rows = self._apply_or_filters(rows)

        total_count = len(rows) if self._count_mode == "exact" else None

        # Apply ordering
        rows = self._apply_ordering(rows)

        # Apply limits
        rows = self._apply_limits(rows)

        # Select columns
        rows = self._select_columns(rows)

        # Head mode — count only
        if self._head:
            return QueryResult(data=[], count=total_count)

        # Single/maybe_single
        if self._single:
            if len(rows) != 1:
                raise ValueError(f"Expected exactly 1 row, got {len(rows)}")
            return QueryResult(data=rows[0], count=total_count)
        elif self._maybe_single:
            return QueryResult(data=rows[0] if rows else None, count=total_count)

        return QueryResult(data=rows, count=total_count)

    def _exec_insert(self) -> QueryResult:
        rows = self._store._load_table(self._table_name)
        now = datetime.now(timezone.utc).isoformat()

        inserted = []
        for item in self._data:
            new_item = dict(item)
            if "id" not in new_item:
                new_item["id"] = str(uuid.uuid4())
            if "created_at" not in new_item:
                new_item["created_at"] = now
            if "updated_at" not in new_item:
                new_item["updated_at"] = now
            rows.append(new_item)
            inserted.append(new_item)

        self._store._save_table(self._table_name, rows)
        # Always return list to match Supabase PostgREST behavior
        return QueryResult(data=inserted)

    def _exec_update(self) -> QueryResult:
        rows = self._store._load_table(self._table_name)
        filtered = self._apply_filters(rows)
        filtered = self._apply_or_filters(filtered)

        now = datetime.now(timezone.utc).isoformat()
        updated_ids = {r.get("id") for r in filtered}
        updated = []

        for row in rows:
            if row.get("id") in updated_ids:
                row.update(self._data)
                row["updated_at"] = now
                updated.append(deepcopy(row))

        self._store._save_table(self._table_name, rows)
        
        if self._single:
            return QueryResult(data=updated[0] if updated else None)
        elif self._maybe_single:
            return QueryResult(data=updated[0] if updated else None)
        return QueryResult(data=updated)

    def _exec_upsert(self) -> QueryResult:
        rows = self._store._load_table(self._table_name)
        now = datetime.now(timezone.utc).isoformat()

        result = []
        for item in self._data:
            item_id = item.get("id")
            existing = None
            if item_id:
                existing = next((r for r in rows if r.get("id") == item_id), None)

            if existing:
                existing.update(item)
                existing["updated_at"] = now
                result.append(deepcopy(existing))
            else:
                new_item = dict(item)
                if "id" not in new_item:
                    new_item["id"] = str(uuid.uuid4())
                if "created_at" not in new_item:
                    new_item["created_at"] = now
                new_item["updated_at"] = now
                rows.append(new_item)
                result.append(new_item)

        self._store._save_table(self._table_name, rows)
        # Always return list to match Supabase PostgREST behavior
        return QueryResult(data=result)

    def _exec_delete(self) -> QueryResult:
        rows = self._store._load_table(self._table_name)
        filtered = self._apply_filters(rows)
        filtered = self._apply_or_filters(filtered)

        deleted_ids = {r.get("id") for r in filtered}
        remaining = [r for r in rows if r.get("id") not in deleted_ids]
        deleted = [r for r in rows if r.get("id") in deleted_ids]

        self._store._save_table(self._table_name, remaining)
        return QueryResult(data=deleted)


class JsonStore:
    """
    JSON-based data store that mimics the Supabase client API.
    
    Usage:
        db = JsonStore("/path/to/data/")
        result = db.table("vendor_requests").select("*").eq("status", "pending").execute()
    
    Each table is stored as a JSON file: <data_dir>/<table_name>.json
    Thread-safe with file-level locking.
    """

    def __init__(self, data_dir: str):
        self.data_dir = os.path.abspath(data_dir)
        os.makedirs(self.data_dir, exist_ok=True)
        self._locks: dict[str, threading.Lock] = {}
        self._global_lock = threading.Lock()

    def _get_lock(self, table_name: str) -> threading.Lock:
        with self._global_lock:
            if table_name not in self._locks:
                self._locks[table_name] = threading.Lock()
            return self._locks[table_name]

    def _table_path(self, table_name: str) -> str:
        return os.path.join(self.data_dir, f"{table_name}.json")

    def _load_table(self, table_name: str) -> list:
        path = self._table_path(table_name)
        lock = self._get_lock(table_name)
        with lock:
            if not os.path.exists(path):
                return []
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data if isinstance(data, list) else []
            except (json.JSONDecodeError, IOError):
                return []

    def _save_table(self, table_name: str, data: list):
        path = self._table_path(table_name)
        lock = self._get_lock(table_name)
        with lock:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def table(self, table_name: str) -> TableQuery:
        """Start a query on a table. Same API as supabase.table()."""
        return TableQuery(self, table_name)
