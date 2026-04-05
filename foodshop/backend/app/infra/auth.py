from __future__ import annotations

from typing import Optional

from fastapi import Header, HTTPException, status

from infra.settings import settings


def verify_token(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing token")
    token = authorization.split(" ", 1)[1].strip()
    if token not in settings.allowed_tokens:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
    return token
