"""
Generic Data Router — serves /api/data/{table} for frontend supabase.from() queries.

This enables the frontend shim's QueryBuilder to work by providing a single endpoint
that supports select/insert/update/delete/upsert against the JsonStore.

The frontend sends a JSON payload like:
{
    "operation": "select",
    "columns": "*",
    "filters": [{"type": "eq", "column": "id", "value": "abc"}],
    "order_by": "created_at",
    "order_desc": true,
    "limit": 10,
    "single": false,
    "body": {...}  // for insert/update/upsert
}
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any, Optional
from db import get_db

router = APIRouter(prefix="/api/data", tags=["data"])


class DataQuery(BaseModel):
    operation: str = "select"  # select, insert, update, delete, upsert
    columns: str = "*"
    filters: list = []
    body: Any = None
    order_by: Optional[str] = None
    order_desc: bool = False
    limit: Optional[int] = None
    single: bool = False
    maybe_single: bool = False
    count: Optional[str] = None
    head: bool = False


@router.post("/{table}")
async def query_table(table: str, query: DataQuery):
    """Execute a query against a JSON table."""
    db = get_db()

    try:
        q = db.table(table)

        if query.operation == "select":
            q = q.select(query.columns)
        elif query.operation == "insert":
            q = q.insert(query.body)
        elif query.operation == "update":
            q = q.update(query.body)
        elif query.operation == "delete":
            q = q.delete()
        elif query.operation == "upsert":
            q = q.upsert(query.body)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown operation: {query.operation}")

        # Apply filters
        for f in query.filters:
            ftype = f.get("type", "eq")
            column = f.get("column", "")
            value = f.get("value")

            if ftype == "eq":
                q = q.eq(column, value)
            elif ftype == "neq":
                q = q.neq(column, value)
            elif ftype == "gt":
                q = q.gt(column, value)
            elif ftype == "gte":
                q = q.gte(column, value)
            elif ftype == "lt":
                q = q.lt(column, value)
            elif ftype == "lte":
                q = q.lte(column, value)
            elif ftype == "in":
                q = q.in_(column, value)
            elif ftype == "is":
                q = q.is_(column, value)
            elif ftype == "ilike":
                q = q.ilike(column, value)
            elif ftype == "or":
                q = q.or_(value)

        # Apply ordering
        if query.order_by:
            q = q.order(query.order_by, desc=query.order_desc)

        # Apply limit
        if query.limit is not None:
            q = q.limit(query.limit)

        # Apply single/maybe_single
        if query.single or query.maybe_single:
            q = q.maybe_single()

        # Execute
        result = q.execute()
        data = result.data

        # Handle count-only requests
        if query.head:
            return {"data": None, "count": len(data) if data else 0}

        # Handle count with data
        response: dict = {"data": data}
        if query.count:
            response["count"] = len(data) if data else 0

        return response

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Table '{table}' not found")
    except Exception as e:
        print(f"Error querying table {table}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
