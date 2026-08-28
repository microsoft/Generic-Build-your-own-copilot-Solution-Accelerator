"""
Title Generation Service - Generates concise conversation titles using AI.

This service provides a dedicated agent for generating meaningful,
short titles for chat conversations based on the user's first message.
"""

import logging
import re
from typing import Optional

from agent_framework import Agent
from agent_framework.openai import OpenAIChatCompletionClient
from azure.identity import DefaultAzureCredential

from settings import app_settings
from telemetry import token_emitter
from llm_token_telemetry import TokenUsageScope

logger = logging.getLogger(__name__)

# Title generation instructions (from MS reference accelerator)
TITLE_INSTRUCTIONS = """Summarize the conversation so far into a 4-word or less title.
Do not use any quotation marks or punctuation.
Do not include any other commentary or description."""


class TitleService:
    """Service for generating conversation titles using AI."""

    def __init__(self):
        self._agent = None
        self._initialized = False
        self._credential = None

    def initialize(self) -> None:
        """Initialize the title generation agent."""
        if self._initialized:
            return

        try:
            self._credential = DefaultAzureCredential()
            use_foundry = app_settings.ai_foundry.use_foundry

            if use_foundry:
                # Azure AI Foundry mode
                endpoint = app_settings.azure_openai.endpoint
                deployment = app_settings.ai_foundry.model_deployment or app_settings.azure_openai.gpt_model
            else:
                # Azure OpenAI Direct mode
                endpoint = app_settings.azure_openai.endpoint
                deployment = app_settings.azure_openai.gpt_model

            if not endpoint:
                logger.warning("Title service: Azure OpenAI endpoint not configured, title generation disabled")
                return

            api_version = app_settings.azure_openai.api_version

            chat_client = OpenAIChatCompletionClient(
                azure_endpoint=endpoint,
                model=deployment,
                api_version=api_version,
                credential=self._credential,
            )

            self._agent = Agent(
                client=chat_client,
                name="title_agent",
                instructions=TITLE_INSTRUCTIONS,
            )

            self._initialized = True

        except Exception as e:
            logger.exception(f"Failed to initialize title service: {e}")
            self._agent = None

    @staticmethod
    def _fallback_title(message: str) -> str:
        """Generate a fallback title using first 4 words of the message."""
        if not message or not message.strip():
            return "New Conversation"
        words = message.strip().split()[:4]
        return " ".join(words) if words else "New Conversation"

    async def generate_title(
        self,
        first_user_message: str,
        *,
        user_id: str = "",
        conversation_id: str = "",
    ) -> str:
        """
        Generate a concise conversation title from the first user message.

        Args:
            first_user_message: The user's first message in the conversation

        Returns:
            A short, meaningful title (max 4 words)
        """
        if not first_user_message or not first_user_message.strip():
            return "New Conversation"

        if not self._initialized:
            self.initialize()

        if self._agent is None:
            logger.warning("Title generation: agent not available, using fallback")
            return self._fallback_title(first_user_message)

        prompt = (
            "Create a concise chat title for this user request.\n"
            "Respond with title only.\n\n"
            f"User request: {first_user_message.strip()}"
        )

        try:
            deployment = (
                (app_settings.ai_foundry.model_deployment or app_settings.azure_openai.gpt_model)
                if app_settings.ai_foundry.use_foundry
                else app_settings.azure_openai.gpt_model
            ) or ""
            with TokenUsageScope(
                token_emitter,
                agent_name="title_agent",
                model_deployment_name=deployment,
                user_id=user_id,
                conversation_id=conversation_id,
            ) as scope:
                response = await self._agent.run(prompt)
                scope.add(response)

            # Clean up the response
            title = str(response).strip().splitlines()[0].strip()
            title = re.sub(r"\s+", " ", title)
            title = re.sub(r"[\"'`]+", "", title)
            title = re.sub(r"[.,!?;:]+", "", title).strip()

            if not title:
                logger.warning("Title generation: agent returned empty, using fallback")
                return self._fallback_title(first_user_message)

            final_title = " ".join(title.split()[:4])
            return final_title

        except Exception as exc:
            logger.exception("Failed to generate conversation title: %s", exc)
            return self._fallback_title(first_user_message)


# Singleton instance
_title_service: Optional[TitleService] = None


def get_title_service() -> TitleService:
    """Get or create the singleton title service instance."""
    global _title_service
    if _title_service is None:
        _title_service = TitleService()
        _title_service.initialize()
    return _title_service
