"""
OpenRouter HTTP client.

Reads OPENROUTER_API_KEY and OPENROUTER_MODEL from environment via settings.
The API key is NEVER exposed in responses, logs, or frontend code.
"""

import httpx
from typing import List, Dict

from app.core.config import settings


# ── Custom exceptions ────────────────────────────────────────────────────────


class OpenRouterConfigError(Exception):
    """Raised when OPENROUTER_API_KEY is missing or obviously invalid."""


class OpenRouterRateLimitError(Exception):
    """Raised on HTTP 429 — caller should retry later."""


class OpenRouterServiceError(Exception):
    """Raised on 5xx errors from the OpenRouter API."""


class OpenRouterAuthError(Exception):
    """Raised when the API key is rejected (HTTP 401/403)."""


class OpenRouterTimeoutError(Exception):
    """Raised when the request times out."""


class OpenRouterResponseError(Exception):
    """Raised when the response cannot be parsed into the expected structure."""


# ── Client ───────────────────────────────────────────────────────────────────


class OpenRouterClient:
    """
    Thin async HTTP wrapper around the OpenRouter chat completions endpoint.
    Reads credentials from settings (which read from .env) — never from args.
    """

    _API_URL = "https://openrouter.ai/api/v1/chat/completions"
    _TIMEOUT_SECONDS = 60.0

    def __init__(self) -> None:
        if not settings.OPENROUTER_API_KEY:
            raise OpenRouterConfigError(
                "OPENROUTER_API_KEY is not set. "
                "Add it to your backend/.env file and restart the server."
            )
        self._model = settings.OPENROUTER_MODEL

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_chat_completion(
        self,
        messages: List[Dict[str, str]],
    ) -> str:
        """
        Send a chat completion request to OpenRouter and return the raw
        text content of the first choice message.

        Args:
            messages: List of {"role": "system"|"user"|"assistant", "content": str}

        Returns:
            The AI-generated text string (to be JSON-parsed by the caller).

        Raises:
            OpenRouterConfigError    – missing API key
            OpenRouterAuthError      – 401 / 403
            OpenRouterRateLimitError – 429
            OpenRouterServiceError   – 5xx
            OpenRouterTimeoutError   – request timed out
            OpenRouterResponseError  – unexpected response shape
        """
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/strivox/strivox",
            "X-Title": "STRIVOX Security Investigation Assistant",
        }

        payload = {
            "model": self._model,
            "messages": messages,
            # Request JSON output — supported by most modern models.
            "response_format": {"type": "json_object"},
            # Keep responses consistent and deterministic for security analysis.
            "temperature": 0.1,
            "max_tokens": 2500,
        }

        try:
            async with httpx.AsyncClient(timeout=self._TIMEOUT_SECONDS) as client:
                response = await client.post(self._API_URL, headers=headers, json=payload)

            return self._handle_response(response)

        except httpx.TimeoutException as exc:
            raise OpenRouterTimeoutError(
                f"OpenRouter did not respond within {self._TIMEOUT_SECONDS}s."
            ) from exc
        except httpx.RequestError as exc:
            raise OpenRouterServiceError(
                f"Network error contacting OpenRouter: {exc}"
            ) from exc

    # ── Private helpers ───────────────────────────────────────────────────────

    def _handle_response(self, response: httpx.Response) -> str:
        status = response.status_code

        if status == 401 or status == 403:
            raise OpenRouterAuthError(
                "OpenRouter rejected the API key (HTTP %d). "
                "Check OPENROUTER_API_KEY in backend/.env." % status
            )

        if status == 429:
            raise OpenRouterRateLimitError(
                "OpenRouter rate limit reached (HTTP 429). "
                "Please wait a moment before retrying."
            )

        if status >= 500:
            raise OpenRouterServiceError(
                f"OpenRouter server error (HTTP {status}). "
                "The service may be temporarily unavailable."
            )

        # Treat any other non-2xx as a service error
        if status >= 400:
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            raise OpenRouterServiceError(
                f"OpenRouter returned HTTP {status}: {detail}"
            )

        try:
            data = response.json()
        except Exception as exc:
            raise OpenRouterResponseError(
                "OpenRouter response is not valid JSON."
            ) from exc

        # Check for an application-level error inside a 200 response
        if "error" in data:
            raise OpenRouterServiceError(
                f"OpenRouter application error: {data['error']}"
            )

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise OpenRouterResponseError(
                f"Unexpected OpenRouter response shape — missing choices[0].message.content: {exc}"
            ) from exc

        if not isinstance(content, str) or not content.strip():
            raise OpenRouterResponseError(
                "OpenRouter returned an empty content string."
            )

        return content
