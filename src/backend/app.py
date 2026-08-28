"""
Content Generation Solution Accelerator - Main Application Entry Point.

This is the main Quart application that provides the REST API for the
Intelligent Content Generation Accelerator.
"""

import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

from quart import Quart, request, jsonify, Response
from quart_cors import cors
from opentelemetry import trace

from settings import app_settings
from models import CreativeBrief, Product
from orchestrator import get_orchestrator
from services.cosmos_service import get_cosmos_service
from services.blob_service import get_blob_service
from services.title_service import get_title_service
from services.routing_service import get_routing_service, Intent, ConversationState
from api.admin import admin_bp
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry.instrumentation.asgi import OpenTelemetryMiddleware
from event_utils import track_event_if_configured

# In-memory task storage for generation tasks
# In production, this should be replaced with Redis or similar
_generation_tasks: Dict[str, Dict[str, Any]] = {}

_active_regenerations: Dict[str, Dict[str, Any]] = {}

logging_settings = app_settings.logging
# Configure logging based on environment variables
logging.basicConfig(
    level=logging_settings.get_basic_log_level(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    force=True
)
azure_log_level = logging_settings.get_package_log_level()
for logger_name in logging_settings.logging_packages or []:
    logging.getLogger(logger_name).setLevel(azure_log_level)
logging.info(
    f"Logging configured - Basic: {logging_settings.basic_logging_level}, "
    f"Azure packages: {logging_settings.package_logging_level}, "
    f"Packages: {logging_settings.logging_packages}"
)

logger = logging.getLogger(__name__)

# Create Quart app
app = Quart(__name__)
app = cors(app, allow_origin="*")

# Check if the Application Insights connection string is set in the environment variables
appinsights_connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
if appinsights_connection_string:
    # Configure Application Insights if the connection string is found
    configure_azure_monitor(
        connection_string=appinsights_connection_string,
        enable_live_metrics=False,
        enable_performance_counters=False,
    )
    # Suppress verbose Azure SDK INFO logs from App Insights
    # WARNING/ERROR/CRITICAL from these loggers still come through
    logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
    logging.getLogger("azure.monitor.opentelemetry.exporter").setLevel(logging.WARNING)
    logging.getLogger("azure.identity").setLevel(logging.WARNING)
    logging.getLogger("azure.cosmos").setLevel(logging.WARNING)
    logging.getLogger("api.admin").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    # Apply ASGI middleware for request tracing (Quart is not auto-instrumented by configure_azure_monitor)
    # Exclude health probes, post-deploy admin calls, and polling endpoints from telemetry
    app.asgi_app = OpenTelemetryMiddleware(
        app.asgi_app,
        exclude_spans=["receive", "send"],
        excluded_urls="health,api/admin,api/generate/status",
    )
    logger.info("Application Insights configured with the provided connection string")
else:
    # Log a warning if the connection string is not found
    logger.warning("No Application Insights connection string found. Skipping configuration")

# Register blueprints
app.register_blueprint(admin_bp)


@app.before_request
async def set_conversation_context():
    """Attach conversation_id and user_id to the current OTel span for App Insights."""
    conversation_id = ""
    user_id = ""

    # 1. Extract from JSON body (POST requests)
    if request.content_type and "json" in request.content_type:
        data = await request.get_json(silent=True)
        if data and isinstance(data, dict):
            conversation_id = data.get("conversation_id", "")
            user_id = data.get("user_id", "")

    # 2. Extract from URL path parameters (e.g. /api/conversations/<conversation_id>)
    if not conversation_id and request.view_args:
        conversation_id = request.view_args.get("conversation_id", "")

    # 3. Extract from query parameters (e.g. ?conversation_id=xxx)
    if not conversation_id:
        conversation_id = request.args.get("conversation_id", "")

    if not user_id:
        user_id = request.args.get("user_id", "") or request.headers.get("X-Ms-Client-Principal-Id", "anonymous")

    span = trace.get_current_span()
    if span.is_recording():
        span.set_attribute("conversation_id", conversation_id)
        span.set_attribute("user_id", user_id)


# ==================== Authentication Helper ====================

def get_authenticated_user():
    """
    Get the authenticated user from EasyAuth headers.

    In production (with App Service Auth), the X-Ms-Client-Principal-Id header
    contains the user's ID. In development mode, returns "anonymous".
    """
    user_principal_id = request.headers.get("X-Ms-Client-Principal-Id", "")
    user_name = request.headers.get("X-Ms-Client-Principal-Name", "")
    auth_provider = request.headers.get("X-Ms-Client-Principal-Idp", "")

    return {
        "user_principal_id": user_principal_id or "anonymous",
        "user_name": user_name or "",
        "auth_provider": auth_provider or "",
        "is_authenticated": bool(user_principal_id)
    }


# ==================== Health Check ====================

@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
async def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    })


# ==================== Unified Message Endpoint ====================

@app.route("/api/chat", methods=["POST"])
async def handle_chat():
    """Unified chat endpoint - routes messages to appropriate handlers based on intent."""
    data = await request.get_json()

    if not data:
        return jsonify({
            "action_type": "error",
            "message": "Request body is required",
            "data": {},
            "conversation_id": ""
        }), 400

    # Extract request fields
    conversation_id = data.get("conversation_id") or str(uuid.uuid4())
    user_id = data.get("user_id") or "anonymous"
    message = data.get("message", "")
    action = data.get("action")
    payload = data.get("payload", {})

    # Validate that message content is not empty when no action is specified
    if not action and not message.strip():
        return jsonify({
            "action_type": "error",
            "message": "Message content must not be empty",
            "data": {},
            "conversation_id": conversation_id
        }), 400

    selected_products = data.get("selected_products", [])
    brief_data = data.get("brief", {})

    track_event_if_configured("Chat_Request_Received", {"conversation_id": conversation_id, "user_id": user_id})

    # Get services
    routing_service = get_routing_service()
    orchestrator = get_orchestrator()

    # Get conversation state if available
    conversation = None
    state = ConversationState()
    try:
        cosmos_service = await get_cosmos_service()
        conversation = await cosmos_service.get_conversation(conversation_id, user_id)
        if conversation:
            state = routing_service.derive_state_from_conversation(conversation)
    except Exception as e:
        logger.exception(f"Failed to get conversation state: {e}")

    has_generated_content_flag = data.get("has_generated_content", False)
    if has_generated_content_flag:
        state.has_generated_content = True
        state.has_brief = True
        state.brief_confirmed = True
        state.current_phase = "complete"
        logger.info("State updated from request: has_generated_content=True (frontend flag)")

    # Classify intent
    result = routing_service.classify_intent(
        message=message,
        action=action,
        payload=payload,
        state=state
    )

    logger.info(f"Message routed: intent={result.intent.value}, confidence={result.confidence:.2f}, action={action}")

    # Route to appropriate handler based on intent
    try:
        if result.intent == Intent.PARSE_BRIEF:
            return await _handle_parse_brief(
                message=message,
                conversation_id=conversation_id,
                user_id=user_id,
                orchestrator=orchestrator
            )

        elif result.intent == Intent.CONFIRM_BRIEF:
            return await _handle_confirm_brief(
                brief_data=brief_data or payload.get("brief", {}),
                conversation_id=conversation_id,
                user_id=user_id
            )

        elif result.intent == Intent.REFINE_BRIEF:
            return await _handle_refine_brief(
                message=message,
                conversation_id=conversation_id,
                user_id=user_id,
                conversation=conversation,
                orchestrator=orchestrator
            )

        elif result.intent == Intent.SEARCH_PRODUCTS:
            return await _handle_search_products(
                message=message,
                current_products=payload.get("current_products", []),
                conversation_id=conversation_id,
                user_id=user_id,
                orchestrator=orchestrator
            )

        elif result.intent == Intent.GENERATE_CONTENT:
            return await _handle_generate_content(
                brief_data=payload.get("brief", {}),
                products=payload.get("products", []),
                generate_images=payload.get("generate_images", True),
                conversation_id=conversation_id,
                user_id=user_id
            )

        elif result.intent == Intent.MODIFY_IMAGE:
            return await _handle_modify_image(
                message=message,
                conversation_id=conversation_id,
                user_id=user_id,
                conversation=conversation,
                orchestrator=orchestrator,
                selected_products=selected_products
            )

        elif result.intent == Intent.START_OVER:
            return await _handle_start_over(
                conversation_id=conversation_id,
                user_id=user_id
            )

        elif result.intent == Intent.CLARIFICATION_RESPONSE:
            # Treat clarification responses as brief refinement
            return await _handle_refine_brief(
                message=message,
                conversation_id=conversation_id,
                user_id=user_id,
                conversation=conversation,
                orchestrator=orchestrator
            )

        else:
            # General chat - fall through to orchestrator
            return await _handle_general_chat(
                message=message,
                conversation_id=conversation_id,
                user_id=user_id,
                orchestrator=orchestrator
            )

    except Exception as e:
        logger.exception(f"Error handling message: {e}")
        track_event_if_configured("Error_Chat_Handler", {"conversation_id": conversation_id, "user_id": user_id, "error": str(e)})
        return jsonify({
            "action_type": "error",
            "message": f"An error occurred: {str(e)}",
            "data": {},
            "conversation_id": conversation_id
        }), 500


# ==================== Message Handler Functions ====================

async def _handle_parse_brief(
    message: str,
    conversation_id: str,
    user_id: str,
    orchestrator
) -> Response:
    """Handle parsing a new brief from user message."""

    track_event_if_configured("Brief_Parse_Request", {"conversation_id": conversation_id, "user_id": user_id})

    generated_title = None

    # Save user message
    try:
        cosmos_service = await get_cosmos_service()

        existing_conversation = await cosmos_service.get_conversation(conversation_id, user_id)
        existing_metadata = existing_conversation.get("metadata", {}) if existing_conversation else {}
        has_existing_title = bool(existing_metadata.get("custom_title") or existing_metadata.get("generated_title"))

        if not has_existing_title:
            title_service = get_title_service()
            generated_title = await title_service.generate_title(message, user_id=user_id, conversation_id=conversation_id)

        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "user",
                "content": message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            generated_title=generated_title
        )
    except Exception as e:
        logger.exception(f"Failed to save message to CosmosDB: {e}")

    # Parse the brief
    brief, questions, blocked = await orchestrator.parse_brief(message, user_id=user_id, conversation_id=conversation_id)

    if blocked:
        track_event_if_configured("Error_RAI_Check_Failed", {"conversation_id": conversation_id, "user_id": user_id, "status": "Brief parse blocked by RAI"})
        # Content was blocked by RAI - save refusal as assistant response
        try:
            cosmos_service = await get_cosmos_service()
            await cosmos_service.add_message_to_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                message={
                    "role": "assistant",
                    "content": questions,  # This is the refusal message
                    "agent": "ContentSafety",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        except Exception as e:
            logger.exception(f"Failed to save RAI response to CosmosDB: {e}")

        return jsonify({
            "action_type": "rai_blocked",
            "message": questions,
            "data": {
                "rai_blocked": True,
                "generated_title": generated_title
            },
            "conversation_id": conversation_id
        })

    if questions:
        # Need clarification
        try:
            cosmos_service = await get_cosmos_service()
            await cosmos_service.add_message_to_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                message={
                    "role": "assistant",
                    "content": questions,
                    "agent": "PlanningAgent",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        except Exception as e:
            logger.exception(f"Failed to save clarification to CosmosDB: {e}")

        # Save partial brief to conversation so it can be confirmed later
        try:
            cosmos_service = await get_cosmos_service()
            await cosmos_service.save_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                messages=(await cosmos_service.get_conversation(conversation_id, user_id) or {}).get("messages", []),
                brief=brief
            )
        except Exception as e:
            logger.exception(f"Failed to save partial brief: {e}")

        return jsonify({
            "action_type": "clarification_needed",
            "message": questions,
            "data": {
                "brief": brief.model_dump() if brief else {},
                "clarifying_questions": questions,
                "generated_title": generated_title
            },
            "conversation_id": conversation_id
        })

    # Brief parsed successfully
    try:
        cosmos_service = await get_cosmos_service()
        await cosmos_service.save_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            messages=(await cosmos_service.get_conversation(conversation_id, user_id) or {}).get("messages", []),
            brief=brief
        )

        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "assistant",
                "content": "I've parsed your creative brief. Please review and confirm the details before we proceed.",
                "agent": "PlanningAgent",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.exception(f"Failed to save brief to CosmosDB: {e}")

    return jsonify({
        "action_type": "brief_parsed",
        "message": "Please review and confirm the parsed creative brief",
        "data": {
            "brief": brief.model_dump(),
            "generated_title": generated_title
        },
        "conversation_id": conversation_id
    })


async def _handle_confirm_brief(
    brief_data: dict,
    conversation_id: str,
    user_id: str
) -> Response:
    """Handle brief confirmation."""

    try:
        brief = CreativeBrief(**brief_data)
    except Exception as e:
        track_event_if_configured("Error_Brief_Invalid_Format", {"conversation_id": conversation_id, "user_id": user_id, "error": str(e)})
        return jsonify({"error": f"Invalid brief format: {str(e)}"}), 400

    track_event_if_configured("Brief_Confirmed", {"conversation_id": conversation_id, "user_id": user_id})

    try:
        cosmos_service = await get_cosmos_service()

        # Get existing conversation to preserve messages
        existing = await cosmos_service.get_conversation(conversation_id, user_id)
        existing_messages = existing.get("messages", []) if existing else []

        # Add confirmation message
        existing_messages.append({
            "role": "assistant",
            "content": "Great! Your creative brief has been confirmed. Here are the available products for your campaign. Select the ones you'd like to feature, or tell me what you're looking for.",
            "agent": "TriageAgent",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        await cosmos_service.save_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            messages=existing_messages,
            brief=brief,
            metadata={"status": "brief_confirmed", "brief_confirmed": True}
        )
    except Exception as e:
        logger.exception(f"Failed to save confirmed brief: {e}")

    return jsonify({
        "action_type": "brief_confirmed",
        "message": "Great! Your creative brief has been confirmed. Here are the available products for your campaign. Select the ones you'd like to feature, or tell me what you're looking for.",
        "data": {
            "brief": brief.model_dump()
        },
        "conversation_id": conversation_id
    })


async def _handle_refine_brief(
    message: str,
    conversation_id: str,
    user_id: str,
    conversation: dict,
    orchestrator
) -> Response:
    """Handle brief refinement based on user feedback."""

    track_event_if_configured("Brief_Refine_Request", {"conversation_id": conversation_id, "user_id": user_id})

    # Get existing brief if available
    existing_brief = conversation.get("brief") if conversation else None

    # Save user message
    try:
        cosmos_service = await get_cosmos_service()
        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "user",
                "content": message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.exception(f"Failed to save refinement message: {e}")

    # Use orchestrator to refine the brief
    brief, questions, blocked = await orchestrator.parse_brief(message, user_id=user_id, conversation_id=conversation_id)

    if blocked:
        track_event_if_configured("Error_RAI_Check_Failed", {"conversation_id": conversation_id, "user_id": user_id, "status": "Brief refinement blocked by RAI"})
        return jsonify({
            "action_type": "rai_blocked",
            "message": questions,
            "data": {
                "rai_blocked": True
            },
            "conversation_id": conversation_id
        })

    if questions:
        try:
            cosmos_service = await get_cosmos_service()
            await cosmos_service.add_message_to_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                message={
                    "role": "assistant",
                    "content": questions,
                    "agent": "PlanningAgent",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        except Exception as e:
            logger.exception(f"Failed to save clarification: {e}")

        # Merge partial brief with existing brief for confirmation option
        merged_brief = brief.model_dump() if brief else {}
        if existing_brief:
            base = existing_brief.copy() if isinstance(existing_brief, dict) else existing_brief
            for key, value in merged_brief.items():
                if value:
                    base[key] = value
            merged_brief = base

        # Save merged brief so it can be confirmed
        try:
            cosmos_service = await get_cosmos_service()
            await cosmos_service.save_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                messages=(await cosmos_service.get_conversation(conversation_id, user_id) or {}).get("messages", []),
                brief=CreativeBrief(**merged_brief) if merged_brief else None
            )
        except Exception as e:
            logger.exception(f"Failed to save merged brief: {e}")

        return jsonify({
            "action_type": "clarification_needed",
            "message": questions,
            "data": {
                "brief": merged_brief,
                "clarifying_questions": questions
            },
            "conversation_id": conversation_id
        })

    # Merge with existing brief if available
    if existing_brief and brief:
        # Use new brief values, falling back to existing where new is empty
        merged_dict = existing_brief.copy() if isinstance(existing_brief, dict) else existing_brief
        new_dict = brief.model_dump()
        for key, value in new_dict.items():
            if value:  # Only override if new value is non-empty
                merged_dict[key] = value
        brief = CreativeBrief(**merged_dict)

    # Save refined brief
    try:
        cosmos_service = await get_cosmos_service()
        await cosmos_service.save_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            messages=(await cosmos_service.get_conversation(conversation_id, user_id) or {}).get("messages", []),
            brief=brief
        )

        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "assistant",
                "content": "I've updated the brief based on your feedback. Please review.",
                "agent": "PlanningAgent",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.exception(f"Failed to save refined brief: {e}")

    return jsonify({
        "action_type": "brief_parsed",
        "message": "I've updated the brief based on your feedback. Please review.",
        "data": {
            "brief": brief.model_dump() if brief else existing_brief
        },
        "conversation_id": conversation_id
    })


async def _handle_search_products(
    message: str,
    current_products: list,
    conversation_id: str,
    user_id: str,
    orchestrator
) -> Response:
    """Handle product search/selection via natural language."""

    track_event_if_configured("Product_Selection_Request", {"conversation_id": conversation_id, "user_id": user_id})

    # Save user message
    try:
        cosmos_service = await get_cosmos_service()
        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "user",
                "content": message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.exception(f"Failed to save search message: {e}")

    # Get available products from catalog
    try:
        cosmos_service = await get_cosmos_service()
        all_products = await cosmos_service.get_all_products(limit=50)
        # Use mode='json' to ensure datetime objects are serialized to strings
        available_products = [p.model_dump(mode='json') for p in all_products]

        # Convert blob URLs to proxy URLs
        for p in available_products:
            if p.get("image_url"):
                original_url = p["image_url"]
                filename = original_url.split("/")[-1] if "/" in original_url else original_url
                p["image_url"] = f"/api/product-images/{filename}"
    except Exception as e:
        logger.exception(f"Failed to get products from CosmosDB: {e}")
        available_products = []

    # Use orchestrator to process the selection request
    result = await orchestrator.select_products(
        request_text=message,
        current_products=current_products,
        available_products=available_products,
        user_id=user_id,
        conversation_id=conversation_id
    )

    # Save assistant response
    try:
        cosmos_service = await get_cosmos_service()
        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "assistant",
                "content": result.get("message", "Products updated."),
                "agent": "ProductAgent",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.exception(f"Failed to save search response: {e}")

    return jsonify({
        "action_type": "products_found",
        "message": result.get("message", "Products selected."),
        "data": {
            "products": result.get("products", []),
            "action": result.get("action", "search"),
            "search_results": result.get("products", [])
        },
        "conversation_id": conversation_id
    })


async def _handle_generate_content(
    brief_data: dict,
    products: list,
    generate_images: bool,
    conversation_id: str,
    user_id: str
) -> Response:
    """Handle content generation - starts async task and returns task ID."""

    try:
        brief = CreativeBrief(**brief_data)
    except Exception as e:
        track_event_if_configured("Error_Generation_Invalid_Brief", {"conversation_id": conversation_id, "user_id": user_id, "error": str(e)})
        return jsonify({
            "action_type": "error",
            "message": f"Invalid brief format: {str(e)}",
            "data": {},
            "conversation_id": conversation_id
        }), 400

    # Create task ID
    task_id = str(uuid.uuid4())

    # Initialize task state
    _generation_tasks[task_id] = {
        "status": "pending",
        "conversation_id": conversation_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "result": None,
        "error": None
    }

    track_event_if_configured("Generation_Started", {"task_id": task_id, "conversation_id": conversation_id, "user_id": user_id, "generate_images": str(generate_images)})

    # Save user request
    try:
        cosmos_service = await get_cosmos_service()
        product_names = [p.get("product_name", "product") for p in products[:3]]
        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "user",
                "content": f"Generate content for: {', '.join(product_names) if product_names else 'the campaign'}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.exception(f"Failed to save generation request: {e}")

    # Start background task
    asyncio.create_task(_run_generation_task(
        task_id=task_id,
        brief=brief,
        products_data=products,
        generate_images=generate_images,
        conversation_id=conversation_id,
        user_id=user_id
    ))

    logger.info(f"Started generation task {task_id} for conversation {conversation_id}")

    return jsonify({
        "action_type": "generation_started",
        "message": "Content generation started. Use the task_id to poll for status.",
        "data": {
            "task_id": task_id,
            "status": "pending",
            "poll_url": f"/api/generate/status/{task_id}"
        },
        "conversation_id": conversation_id
    })


async def _handle_modify_image(
    message: str,
    conversation_id: str,
    user_id: str,
    conversation: dict,
    orchestrator,
    selected_products: list = None
) -> Response:
    """Handle image modification requests."""

    track_event_if_configured("Regeneration_Request", {"conversation_id": conversation_id, "user_id": user_id})

    # Get products from frontend (frontend handles product detection)
    # This matches the original implementation where frontend detected product changes
    frontend_products = selected_products or []
    if frontend_products:
        logger.info(f"Using products from frontend: {[p.get('product_name') for p in frontend_products]}")

    # Fetch fresh conversation data from CosmosDB
    try:
        cosmos_service = await get_cosmos_service()
        fresh_conversation = await cosmos_service.get_conversation(conversation_id, user_id)
        if fresh_conversation:
            conversation = fresh_conversation
            logger.info(f"Fetched fresh conversation data for {conversation_id}")
    except Exception as e:
        logger.exception(f"Failed to fetch fresh conversation, using stale data: {e}")

    # Save user message
    try:
        cosmos_service = await get_cosmos_service()
        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "user",
                "content": message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.exception(f"Failed to save image modification request: {e}")

    # Get existing generated content
    generated_content = conversation.get("generated_content") if conversation else None

    if not generated_content:
        track_event_if_configured("Error_Regeneration_No_Content", {"conversation_id": conversation_id, "user_id": user_id})
        return jsonify({
            "action_type": "error",
            "message": "No generated content found. Please generate content first.",
            "data": {},
            "conversation_id": conversation_id
        }), 400

    # Get brief and products from conversation
    brief_data = conversation.get("brief", {})
    metadata = conversation.get("metadata", {})

    if frontend_products:
        products_data = frontend_products
        logger.info(f"Using products from frontend payload: {[p.get('product_name') for p in products_data]}")
    elif generated_content and generated_content.get("selected_products"):
        products_data = generated_content.get("selected_products", [])
        logger.info(f"Using products from generated_content: {[p.get('product_name') for p in products_data]}")
    else:
        products_data = metadata.get("selected_products", [])
        logger.info(f"Using products from metadata: {[p.get('product_name') for p in products_data]}")

    try:
        brief = CreativeBrief(**brief_data) if brief_data else None
    except Exception:
        brief = None

    if not brief:
        track_event_if_configured("Error_Regeneration_No_Brief", {"conversation_id": conversation_id, "user_id": user_id})
        return jsonify({
            "action_type": "error",
            "message": "No brief found. Please create and confirm a brief first.",
            "data": {},
            "conversation_id": conversation_id
        }), 400

    # Get previous image prompt for context
    previous_image_prompt = generated_content.get("image_prompt") if generated_content else None

    # Create task ID for tracking
    task_id = str(uuid.uuid4())

    # Initialize task state
    _generation_tasks[task_id] = {
        "status": "pending",
        "conversation_id": conversation_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "result": None,
        "error": None
    }

    _active_regenerations[conversation_id] = {
        "task_id": task_id,
        "products": products_data
    }
    logger.info(f"Marked active regeneration for {conversation_id} with products: {[p.get('product_name') for p in products_data]}")

    # Start background task for image regeneration
    asyncio.create_task(_run_regeneration_task(
        task_id=task_id,
        modification_request=message,
        brief=brief,
        products_data=products_data,
        previous_image_prompt=previous_image_prompt,
        conversation_id=conversation_id,
        user_id=user_id
    ))

    logger.info(f"Started image regeneration task {task_id} for conversation {conversation_id}")

    return jsonify({
        "action_type": "regeneration_started",
        "message": f"Regenerating image with your requested changes: {message}",
        "data": {
            "task_id": task_id,
            "status": "pending",
            "poll_url": f"/api/generate/status/{task_id}"
        },
        "conversation_id": conversation_id
    })


async def _run_regeneration_task(
    task_id: str,
    modification_request: str,
    brief: CreativeBrief,
    products_data: list,
    previous_image_prompt: str,
    conversation_id: str,
    user_id: str
):
    """Background task for image regeneration."""
    updated_brief_dict = None

    try:
        _generation_tasks[task_id]["status"] = "in_progress"

        orchestrator = get_orchestrator()

        # Call the orchestrator to regenerate the image
        response = await orchestrator.regenerate_image(
            modification_request=modification_request,
            brief=brief,
            products=products_data,
            previous_image_prompt=previous_image_prompt,
            user_id=user_id,
            conversation_id=conversation_id
        )

        # Check for RAI block
        if response.get("rai_blocked"):
            track_event_if_configured("Error_RAI_Check_Failed", {"conversation_id": conversation_id, "user_id": user_id, "status": "Regeneration blocked by RAI"})
            _generation_tasks[task_id]["status"] = "failed"
            _generation_tasks[task_id]["error"] = response.get("error", "Request blocked by content safety")
            return

        # Handle image URL from orchestrator's blob save
        if response.get("image_blob_url"):
            blob_url = response["image_blob_url"]
            parts = blob_url.split("/")
            filename = parts[-1]
            conv_folder = parts[-2]
            response["image_url"] = f"/api/images/{conv_folder}/{filename}"
            del response["image_blob_url"]
        elif response.get("image_base64"):
            # Save to blob storage
            try:
                blob_service = await get_blob_service()
                blob_url = await blob_service.save_generated_image(
                    conversation_id=conversation_id,
                    image_base64=response["image_base64"]
                )
                if blob_url:
                    parts = blob_url.split("/")
                    filename = parts[-1]
                    response["image_url"] = f"/api/images/{conversation_id}/{filename}"
                    del response["image_base64"]
            except Exception as e:
                logger.exception(f"Failed to save regenerated image to blob: {e}")

        # Save assistant response
        existing_content = {}
        existing_text = None
        try:
            cosmos_service = await get_cosmos_service()
            await cosmos_service.add_message_to_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                message={
                    "role": "assistant",
                    "content": response.get("message", "Image regenerated based on your request."),
                    "agent": "ImageAgent",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )

            # Update persisted generated_content
            existing_conversation = await cosmos_service.get_conversation(conversation_id, user_id)
            raw_content = (existing_conversation or {}).get("generated_content")
            existing_content = raw_content if isinstance(raw_content, dict) else {}
            old_image_url = existing_content.get("image_url")

            new_image_url = response.get("image_url")
            new_image_prompt = response.get("image_prompt")
            new_image_revised_prompt = response.get("image_revised_prompt")

            # Replace old product name in text_content when product changes
            old_products = existing_content.get("selected_products", [])
            old_name = old_products[0].get("product_name", "") if old_products else ""
            new_name = products_data[0].get("product_name", "") if products_data else ""
            existing_text = existing_content.get("text_content")

            if existing_text and old_name and new_name and old_name != new_name:
                pat = re.compile(re.escape(old_name), re.IGNORECASE)
                if isinstance(existing_text, dict):
                    existing_text = {
                        k: pat.sub(lambda _m: new_name, v) if isinstance(v, str) else v
                        for k, v in existing_text.items()
                    }
                elif isinstance(existing_text, str):
                    existing_text = pat.sub(lambda _m: new_name, existing_text)
                logger.info(f"Updated text_content: replaced '{old_name}' with '{new_name}'")

            updated_content = {
                **existing_content,
                "image_url": new_image_url if new_image_url else old_image_url,
                "image_prompt": new_image_prompt if new_image_prompt else existing_content.get("image_prompt"),
                "image_revised_prompt": new_image_revised_prompt if new_image_revised_prompt else existing_content.get("image_revised_prompt"),
                "selected_products": products_data if products_data else existing_content.get("selected_products", []),
                **(({"text_content": existing_text} if existing_text is not None else {})),
            }

            await cosmos_service.save_generated_content(
                conversation_id=conversation_id,
                user_id=user_id,
                generated_content=updated_content
            )
            logger.info(f"Saved regeneration content with products: {[p.get('product_name') for p in updated_content.get('selected_products', [])]}")

            # Update brief's visual_guidelines to include the modification
            current_visual_guidelines = brief.visual_guidelines or ""
            modification_suffix = f". User modification: {modification_request}"

            if modification_request not in current_visual_guidelines:
                new_visual_guidelines = current_visual_guidelines + modification_suffix

                # Create updated brief
                updated_brief_dict = brief.model_dump()
                updated_brief_dict["visual_guidelines"] = new_visual_guidelines

                # Save updated brief to CosmosDB
                await cosmos_service.save_conversation(
                    conversation_id=conversation_id,
                    user_id=user_id,
                    messages=existing_conversation.get("messages", []) if existing_conversation else [],
                    brief=CreativeBrief(**updated_brief_dict),
                    metadata=existing_conversation.get("metadata") if existing_conversation else None,
                    generated_content=updated_content
                )
                logger.info(f"Updated brief visual_guidelines with modification: {modification_request}")
        except Exception as e:
            logger.exception(f"Failed to save regeneration response to CosmosDB: {e}")

        # Store result (use updated text_content if we replaced product name)
        _generation_tasks[task_id]["status"] = "completed"
        _generation_tasks[task_id]["result"] = {
            "image_url": response.get("image_url"),
            "image_prompt": response.get("image_prompt"),
            "image_revised_prompt": response.get("image_revised_prompt"),
            "message": response.get("message", "Image regenerated based on your request."),
            "text_content": existing_text if existing_text is not None else (existing_content.get("text_content") if existing_content else None),
            "selected_products": products_data,
            "updated_brief": updated_brief_dict,  # Include updated brief for frontend
        }
        track_event_if_configured("Regeneration_Completed", {"task_id": task_id, "conversation_id": conversation_id, "user_id": user_id})

        # Clear active regeneration marker (only if it's still our task)
        active_info = _active_regenerations.get(conversation_id, {})
        if active_info.get("task_id") == task_id:
            del _active_regenerations[conversation_id]
            logger.info(f"Cleared active regeneration for {conversation_id}")

    except Exception as e:
        logger.exception(f"Error in regeneration task {task_id}: {e}")
        _generation_tasks[task_id]["status"] = "failed"
        _generation_tasks[task_id]["error"] = str(e)
        track_event_if_configured("Error_Regeneration_Failed", {"task_id": task_id, "conversation_id": conversation_id, "user_id": user_id, "error": str(e)})
        # Clear active regeneration marker on error too
        active_info = _active_regenerations.get(conversation_id, {})
        if active_info.get("task_id") == task_id:
            del _active_regenerations[conversation_id]


async def _handle_start_over(
    conversation_id: str,
    user_id: str
) -> Response:
    """Handle start over request - clears the current session."""

    track_event_if_configured("Session_Reset", {"conversation_id": conversation_id, "user_id": user_id})

    # For start over, we create a new conversation
    new_conversation_id = str(uuid.uuid4())

    return jsonify({
        "action_type": "session_reset",
        "message": "Let's start fresh! What kind of content would you like to create?",
        "data": {
            "new_conversation_id": new_conversation_id
        },
        "conversation_id": new_conversation_id
    })


async def _handle_general_chat(
    message: str,
    conversation_id: str,
    user_id: str,
    orchestrator
) -> Response:
    """Handle general chat messages."""

    track_event_if_configured("General_Chat_Request", {"conversation_id": conversation_id, "user_id": user_id})

    # Save user message
    try:
        cosmos_service = await get_cosmos_service()

        generated_title = None
        existing_conversation = await cosmos_service.get_conversation(conversation_id, user_id)
        existing_metadata = existing_conversation.get("metadata", {}) if existing_conversation else {}
        has_existing_title = bool(existing_metadata.get("custom_title") or existing_metadata.get("generated_title"))

        if not has_existing_title:
            title_service = get_title_service()
            generated_title = await title_service.generate_title(message, user_id=user_id, conversation_id=conversation_id)

        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "user",
                "content": message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            generated_title=generated_title
        )
    except Exception as e:
        logger.exception(f"Failed to save message: {e}")

    # For non-streaming response, collect orchestrator output
    response_content = ""
    async for response in orchestrator.process_message(
        message=message,
        conversation_id=conversation_id,
        user_id=user_id
    ):
        if response.get("content"):
            response_content += response.get("content", "")

        if response.get("is_final"):
            break

    # Save assistant response
    try:
        cosmos_service = await get_cosmos_service()
        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "assistant",
                "content": response_content,
                "agent": "ChatAgent",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.exception(f"Failed to save response: {e}")

    return jsonify({
        "action_type": "chat_response",
        "message": response_content,
        "data": {},
        "conversation_id": conversation_id
    })


# ==================== Content Generation Endpoints ====================

async def _run_generation_task(task_id: str, brief: CreativeBrief, products_data: list,
                               generate_images: bool, conversation_id: str, user_id: str):
    """Background task to run content generation."""
    try:
        logger.info(f"Starting background generation task {task_id}")
        _generation_tasks[task_id]["status"] = "running"
        _generation_tasks[task_id]["started_at"] = datetime.now(timezone.utc).isoformat()

        orchestrator = get_orchestrator()
        response = await orchestrator.generate_content(
            brief=brief,
            products=products_data,
            generate_images=generate_images,
            user_id=user_id,
            conversation_id=conversation_id
        )

        logger.info(f"Generation task {task_id} completed. Response keys: {list(response.keys()) if response else 'None'}")

        # Handle image URL from orchestrator's blob save
        if response.get("image_blob_url"):
            blob_url = response["image_blob_url"]
            logger.info(f"Image already saved to blob by orchestrator: {blob_url}")
            parts = blob_url.split("/")
            filename = parts[-1]
            conv_folder = parts[-2]
            response["image_url"] = f"/api/images/{conv_folder}/{filename}"
            response["image_blob_url"] = blob_url  # Keep the original blob URL in response
            logger.info(f"Converted to proxy URL: {response['image_url']}")
        elif response.get("image_base64"):
            # Fallback: save to blob
            try:
                blob_service = await get_blob_service()
                blob_url = await blob_service.save_generated_image(
                    conversation_id=conversation_id,
                    image_base64=response["image_base64"]
                )
                if blob_url:
                    parts = blob_url.split("/")
                    filename = parts[-1]
                    response["image_url"] = f"/api/images/{conversation_id}/{filename}"
                    response["image_blob_url"] = blob_url  # Include the original blob URL
                    del response["image_base64"]
            except Exception as e:
                logger.exception(f"Failed to save image to blob: {e}")

        # Save to CosmosDB
        try:
            cosmos_service = await get_cosmos_service()

            await cosmos_service.add_message_to_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                message={
                    "role": "assistant",
                    "content": "Content generated successfully.",
                    "agent": "ContentAgent",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )

            generated_content_to_save = {
                "text_content": response.get("text_content"),
                "image_url": response.get("image_url"),
                "image_prompt": response.get("image_prompt"),
                "image_revised_prompt": response.get("image_revised_prompt"),
                "violations": response.get("violations", []),
                "requires_modification": response.get("requires_modification", False),
                "selected_products": products_data  # Save the selected products
            }
            await cosmos_service.save_generated_content(
                conversation_id=conversation_id,
                user_id=user_id,
                generated_content=generated_content_to_save
            )
        except Exception as e:
            logger.exception(f"Failed to save generated content to CosmosDB: {e}")

        _generation_tasks[task_id]["status"] = "completed"
        _generation_tasks[task_id]["result"] = response
        _generation_tasks[task_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        track_event_if_configured("Generation_Completed", {"task_id": task_id, "conversation_id": conversation_id, "user_id": user_id})
        logger.info(f"Task {task_id} marked as completed")

    except Exception as e:
        logger.exception(f"Generation task {task_id} failed: {e}")
        _generation_tasks[task_id]["status"] = "failed"
        _generation_tasks[task_id]["error"] = str(e)
        _generation_tasks[task_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        track_event_if_configured("Error_Generation_Failed", {"task_id": task_id, "conversation_id": conversation_id, "user_id": user_id, "error": str(e)})


@app.route("/api/generate/start", methods=["POST"])
async def start_generation():
    """
    Start content generation and return immediately with a task ID.
    Client should poll /api/generate/status/<task_id> for results.

    Request body:
    {
        "brief": { ... CreativeBrief fields ... },
        "products": [ ... Product list (optional) ... ],
        "generate_images": true/false,
        "conversation_id": "uuid"
    }

    Returns:
    {
        "task_id": "uuid",
        "status": "pending",
        "message": "Generation started"
    }
    """

    data = await request.get_json()

    brief_data = data.get("brief", {})
    products_data = data.get("products", [])
    generate_images = data.get("generate_images", True)
    conversation_id = data.get("conversation_id") or str(uuid.uuid4())
    user_id = data.get("user_id") or "anonymous"

    try:
        brief = CreativeBrief(**brief_data)
    except Exception as e:
        track_event_if_configured("Error_Generation_Invalid_Brief", {"conversation_id": conversation_id, "user_id": user_id, "error": str(e)})
        return jsonify({"error": f"Invalid brief format: {str(e)}"}), 400

    # Create task ID
    task_id = str(uuid.uuid4())

    # Initialize task state
    _generation_tasks[task_id] = {
        "status": "pending",
        "conversation_id": conversation_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "result": None,
        "error": None
    }

    # Save user request
    try:
        cosmos_service = await get_cosmos_service()
        product_names = [p.get("product_name", "product") for p in products_data[:3]]
        await cosmos_service.add_message_to_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            message={
                "role": "user",
                "content": f"Generate content for: {', '.join(product_names) if product_names else 'the campaign'}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception as e:
        logger.exception(f"Failed to save generation request to CosmosDB: {e}")

    # Start background task
    asyncio.create_task(_run_generation_task(
        task_id=task_id,
        brief=brief,
        products_data=products_data,
        generate_images=generate_images,
        conversation_id=conversation_id,
        user_id=user_id
    ))

    logger.info(f"Started generation task {task_id} for conversation {conversation_id}")

    track_event_if_configured("Generation_Started", {"task_id": task_id, "conversation_id": conversation_id, "user_id": user_id, "generate_images": str(generate_images)})

    return jsonify({
        "task_id": task_id,
        "status": "pending",
        "conversation_id": conversation_id,
        "message": "Generation started. Poll /api/generate/status/{task_id} for results."
    })


@app.route("/api/generate/status/<task_id>", methods=["GET"])
async def get_generation_status(task_id: str):
    """
    Get the status of a generation task.

    Returns:
    {
        "task_id": "uuid",
        "status": "pending" | "running" | "completed" | "failed",
        "result": { ... generated content ... } (if completed),
        "error": "error message" (if failed)
    }
    """

    if task_id not in _generation_tasks:
        return jsonify({"error": "Task not found"}), 404

    task = _generation_tasks[task_id]

    response = {
        "task_id": task_id,
        "status": task["status"],
        "conversation_id": task.get("conversation_id"),
        "created_at": task.get("created_at"),
    }

    if task["status"] == "completed":
        response["result"] = task["result"]
        response["completed_at"] = task.get("completed_at")
    elif task["status"] == "failed":
        response["error"] = task["error"]
        response["completed_at"] = task.get("completed_at")
    elif task["status"] == "running":
        response["started_at"] = task.get("started_at")
        response["message"] = "Generation in progress..."

    return jsonify(response)


# ==================== Image Proxy Endpoints ====================

@app.route("/api/images/<conversation_id>/<filename>", methods=["GET"])
async def proxy_generated_image(conversation_id: str, filename: str):
    """
    Proxy generated images from blob storage.
    This allows the frontend to access images without exposing blob storage credentials.
    """
    try:
        blob_service = await get_blob_service()
        await blob_service.initialize()

        blob_name = f"{conversation_id}/{filename}"
        blob_client = blob_service._generated_images_container.get_blob_client(blob_name)

        # Download the blob
        download = await blob_client.download_blob()
        image_data = await download.readall()

        # Determine content type from filename
        content_type = "image/png" if filename.endswith(".png") else "image/jpeg"

        return Response(
            image_data,
            mimetype=content_type,
            headers={
                "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
            }
        )
    except Exception as e:
        logger.exception(f"Error proxying image: {e}")
        return jsonify({"error": "Image not found"}), 404


@app.route("/api/product-images/<filename>", methods=["GET"])
async def proxy_product_image(filename: str):
    """
    Proxy product images from blob storage.
    This allows the frontend to access product images via private endpoint.
    The filename should match the blob name (e.g., SnowVeil.png).
    """
    try:
        blob_service = await get_blob_service()
        await blob_service.initialize()

        blob_client = blob_service._product_images_container.get_blob_client(filename)

        # Get blob properties for ETag/Last-Modified
        properties = await blob_client.get_blob_properties()
        etag = properties.etag.strip('"') if properties.etag else None
        last_modified = properties.last_modified

        # Check If-None-Match header for cache validation
        if_none_match = request.headers.get("If-None-Match")
        if if_none_match and etag and if_none_match.strip('"') == etag:
            return Response(status=304)  # Not Modified

        # Download the blob
        download = await blob_client.download_blob()
        image_data = await download.readall()

        # Determine content type from filename
        content_type = "image/png" if filename.endswith(".png") else "image/jpeg"

        headers = {
            "Cache-Control": "public, max-age=300, must-revalidate",  # Cache 5 min, revalidate
        }
        if etag:
            headers["ETag"] = f'"{etag}"'
        if last_modified:
            headers["Last-Modified"] = last_modified.strftime("%a, %d %b %Y %H:%M:%S GMT")

        return Response(
            image_data,
            mimetype=content_type,
            headers=headers
        )
    except Exception as e:
        logger.exception(f"Error proxying product image {filename}: {e}")
        return jsonify({"error": "Image not found"}), 404


# ==================== Product Endpoints ====================

@app.route("/api/products", methods=["GET"])
async def list_products():
    """
    List all products.

    Query params:
        category: Filter by category
        sub_category: Filter by sub-category
        search: Search term
        limit: Max number of results (default 20)
    """
    category = request.args.get("category")
    sub_category = request.args.get("sub_category")
    search = request.args.get("search")
    limit = int(request.args.get("limit", 20))

    cosmos_service = await get_cosmos_service()

    if search:
        products = await cosmos_service.search_products(search, limit)
    elif category:
        products = await cosmos_service.get_products_by_category(
            category, sub_category, limit
        )
    else:
        products = await cosmos_service.get_all_products(limit)

    # Convert blob URLs to proxy URLs for products with images
    product_list = []
    for p in products:
        product_dict = p.model_dump()
        # Convert direct blob URL to proxy URL
        if product_dict.get("image_url"):
            # Extract filename from URL like https://account.blob.../container/SnowVeil.png
            original_url = product_dict["image_url"]
            filename = original_url.split("/")[-1] if "/" in original_url else original_url
            product_dict["image_url"] = f"/api/product-images/{filename}"
        product_list.append(product_dict)

    return jsonify({
        "products": product_list,
        "count": len(product_list)
    })


@app.route("/api/products/<sku>", methods=["GET"])
async def get_product(sku: str):
    """Get a product by SKU."""
    cosmos_service = await get_cosmos_service()
    product = await cosmos_service.get_product_by_sku(sku)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    product_dict = product.model_dump()
    # Convert direct blob URL to proxy URL
    if product_dict.get("image_url"):
        original_url = product_dict["image_url"]
        filename = original_url.split("/")[-1] if "/" in original_url else original_url
        product_dict["image_url"] = f"/api/product-images/{filename}"

    return jsonify(product_dict)


@app.route("/api/products", methods=["POST"])
async def create_product():
    """
    Create or update a product.

    Request body:
    {
        "product_name": "...",
        "category": "...",
        "sub_category": "...",
        "marketing_description": "...",
        "detailed_spec_description": "...",
        "sku": "...",
        "model": "..."
    }
    """
    data = await request.get_json()

    try:
        product = Product(**data)
    except Exception as e:
        return jsonify({"error": f"Invalid product format: {str(e)}"}), 400

    cosmos_service = await get_cosmos_service()
    saved_product = await cosmos_service.upsert_product(product)

    return jsonify(saved_product.model_dump()), 201


@app.route("/api/products/<sku>/image", methods=["POST"])
async def upload_product_image(sku: str):
    """
    Upload an image for a product.

    The image will be stored and a description will be auto-generated
    using GPT-5 Vision.

    Request: multipart/form-data with 'image' file
    """
    cosmos_service = await get_cosmos_service()
    product = await cosmos_service.get_product_by_sku(sku)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    files = await request.files
    if "image" not in files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = files["image"]
    image_data = image_file.read()
    content_type = image_file.content_type or "image/jpeg"

    blob_service = await get_blob_service()
    image_url, description = await blob_service.upload_product_image(
        sku=sku,
        image_data=image_data,
        content_type=content_type
    )

    # Update product with image info
    product.image_url = image_url
    product.image_description = description
    await cosmos_service.upsert_product(product)

    return jsonify({
        "image_url": image_url,
        "image_description": description,
        "message": "Image uploaded and description generated"
    })


# ==================== Conversation Endpoints ====================

@app.route("/api/conversations", methods=["GET"])
async def list_conversations():
    """
    List conversations for a user.

    Uses authenticated user from EasyAuth headers. In development mode
    (when not authenticated), uses "anonymous" as user_id.

    Query params:
        limit: Max number of results (default 20)
    """
    auth_user = get_authenticated_user()
    user_id = auth_user["user_principal_id"]

    limit = int(request.args.get("limit", 20))

    cosmos_service = await get_cosmos_service()
    conversations = await cosmos_service.get_user_conversations(user_id, limit)

    return jsonify({
        "conversations": conversations,
        "count": len(conversations)
    })


@app.route("/api/conversations/<conversation_id>", methods=["GET"])
async def get_conversation(conversation_id: str):
    """
    Get a specific conversation.

    Uses authenticated user from EasyAuth headers.
    """
    auth_user = get_authenticated_user()
    user_id = auth_user["user_principal_id"]

    cosmos_service = await get_cosmos_service()
    conversation = await cosmos_service.get_conversation(conversation_id, user_id)

    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404

    return jsonify(conversation)


@app.route("/api/conversations/<conversation_id>", methods=["DELETE"])
async def delete_conversation(conversation_id: str):
    """
    Delete a specific conversation.

    Uses authenticated user from EasyAuth headers.
    """
    auth_user = get_authenticated_user()
    user_id = auth_user["user_principal_id"]

    try:
        cosmos_service = await get_cosmos_service()
        await cosmos_service.delete_conversation(conversation_id, user_id)
        track_event_if_configured("Conversation_Deleted", {"conversation_id": conversation_id, "user_id": user_id})
        return jsonify({"success": True, "message": "Conversation deleted"})
    except Exception as e:
        logger.exception(f"Failed to delete conversation: {e}")
        return jsonify({"error": "Failed to delete conversation"}), 500


@app.route("/api/conversations/<conversation_id>", methods=["PUT"])
async def update_conversation(conversation_id: str):
    """
    Update a conversation (rename).

    Uses authenticated user from EasyAuth headers.

    Request body:
    {
        "title": "New conversation title"
    }
    """
    auth_user = get_authenticated_user()
    user_id = auth_user["user_principal_id"]

    data = await request.get_json()
    new_title = data.get("title", "").strip()

    if not new_title:
        return jsonify({"error": "Title is required"}), 400

    try:
        cosmos_service = await get_cosmos_service()
        result = await cosmos_service.rename_conversation(conversation_id, user_id, new_title)
        if result:
            track_event_if_configured("Conversation_Renamed", {"conversation_id": conversation_id, "user_id": user_id})
            return jsonify({"success": True, "message": "Conversation renamed", "title": new_title})
        return jsonify({"error": "Conversation not found"}), 404
    except Exception as e:
        logger.exception(f"Failed to rename conversation: {e}")
        return jsonify({"error": "Failed to rename conversation"}), 500


@app.route("/api/conversations", methods=["DELETE"])
async def delete_all_conversations():
    """
    Delete all conversations for the current user.

    Uses authenticated user from EasyAuth headers.
    """
    auth_user = get_authenticated_user()
    user_id = auth_user["user_principal_id"]

    try:
        cosmos_service = await get_cosmos_service()
        deleted_count = await cosmos_service.delete_all_conversations(user_id)
        track_event_if_configured("Conversations_All_Deleted", {"user_id": user_id, "deleted_count": str(deleted_count)})
        return jsonify({
            "success": True,
            "message": f"Deleted {deleted_count} conversations",
            "deleted_count": deleted_count
        })
    except Exception as e:
        logger.exception(f"Failed to delete all conversations: {e}")
        return jsonify({"error": "Failed to delete conversations"}), 500


# ==================== Brand Guidelines Endpoints ====================

@app.route("/api/brand-guidelines", methods=["GET"])
async def get_brand_guidelines():
    """Get current brand guidelines configuration."""
    return jsonify({
        "tone": app_settings.brand_guidelines.tone,
        "voice": app_settings.brand_guidelines.voice,
        "primary_color": app_settings.brand_guidelines.primary_color,
        "secondary_color": app_settings.brand_guidelines.secondary_color,
        "prohibited_words": app_settings.brand_guidelines.prohibited_words,
        "required_disclosures": app_settings.brand_guidelines.required_disclosures,
        "max_headline_length": app_settings.brand_guidelines.max_headline_length,
        "max_body_length": app_settings.brand_guidelines.max_body_length,
        "require_cta": app_settings.brand_guidelines.require_cta
    })


# ==================== UI Configuration ====================

@app.route("/api/config", methods=["GET"])
async def get_ui_config():
    """Get UI configuration including feature flags."""
    return jsonify({
        "app_name": app_settings.ui.app_name,
        "show_brand_guidelines": True,
        "enable_image_generation": app_settings.azure_openai.image_generation_enabled,
        "image_model": app_settings.azure_openai.effective_image_model if app_settings.azure_openai.image_generation_enabled else None,
        "enable_compliance_check": True,
        "max_file_size_mb": 10
    })


# ==================== Application Lifecycle ====================

@app.before_serving
async def startup():
    """Initialize services on application startup."""
    logger.info("Starting Content Generation Solution Accelerator...")

    # Initialize orchestrator
    get_orchestrator()
    logger.info("Orchestrator initialized with Microsoft Agent Framework")

    # Try to initialize services - they may fail if CosmosDB/Blob storage is not accessible
    try:
        await get_cosmos_service()
        logger.info("CosmosDB service initialized")
    except Exception as e:
        logger.exception(f"CosmosDB service initialization failed (may be firewall): {e}")

    try:
        await get_blob_service()
        logger.info("Blob storage service initialized")
    except Exception as e:
        logger.exception(f"Blob storage service initialization failed: {e}")

    logger.info("Application startup complete")


@app.after_serving
async def shutdown():
    """Cleanup on application shutdown."""
    logger.info("Shutting down Content Generation Solution Accelerator...")

    cosmos_service = await get_cosmos_service()
    await cosmos_service.close()

    blob_service = await get_blob_service()
    await blob_service.close()

    logger.info("Application shutdown complete")


# ==================== Error Handlers ====================

@app.errorhandler(404)
async def not_found(error):
    """Handle 404 errors."""
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
async def server_error(error):
    """Handle 500 errors."""
    logger.exception(f"Server error: {error}")
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
