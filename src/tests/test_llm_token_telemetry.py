"""Focused unit tests for the token-usage telemetry helpers.

Covers the supported usage response shapes (framework ``usage_details``,
aggregated message ``contents`` usage, raw OpenAI ``usage`` fallback, streaming
chunk metadata, and realtime/voice sub-counts) plus ``TokenUsage`` arithmetic,
``TokenUsageScope`` accumulation, and ``TokenUsageEmitter`` behaviour
(user_id hashing, pricing, and the disabled no-op path).

These guard against regressions as the Agent Framework / OpenAI SDK usage
shapes evolve.
"""
from types import SimpleNamespace

import pytest

from llm_token_telemetry import (
    EVENT_AGENT,
    EVENT_MODEL,
    EVENT_SUMMARY,
    TokenUsage,
    TokenUsageEmitter,
    TokenUsageScope,
    extract_realtime_usage,
    extract_usage,
    extract_usage_from_dict,
    extract_usage_from_stream_chunk,
)


def test_extract_usage_from_usage_details_attr():
    """Framework result exposing ``usage_details`` with *_token_count keys."""
    result = SimpleNamespace(
        usage_details=SimpleNamespace(
            input_token_count=120, output_token_count=30, total_token_count=150
        )
    )
    usage = extract_usage(result)
    assert usage == TokenUsage(input_tokens=120, output_tokens=30, total_tokens=150)


def test_extract_usage_from_raw_openai_usage():
    """OpenAI ChatCompletion shape via ``raw_representation.usage``."""
    result = SimpleNamespace(
        raw_representation=SimpleNamespace(
            usage={"prompt_tokens": 10, "completion_tokens": 5}
        )
    )
    usage = extract_usage(result)
    assert usage == TokenUsage(input_tokens=10, output_tokens=5, total_tokens=15)


def test_extract_usage_aggregates_message_contents():
    """Usage spread across ``messages[*].contents[*].usage_details`` is summed."""
    msg = SimpleNamespace(
        contents=[
            SimpleNamespace(usage_details={"input_tokens": 4, "output_tokens": 1}),
            SimpleNamespace(usage_details={"input_tokens": 6, "output_tokens": 2}),
        ]
    )
    result = SimpleNamespace(messages=[msg])
    usage = extract_usage(result)
    assert usage == TokenUsage(input_tokens=10, output_tokens=3, total_tokens=13)


def test_extract_usage_returns_none_for_unknown_shape():
    assert extract_usage(None) is None
    assert extract_usage(SimpleNamespace(foo="bar")) is None


def test_extract_usage_from_dict_fallback():
    usage = extract_usage_from_dict({"prompt_tokens": 7, "completion_tokens": 3})
    assert usage == TokenUsage(input_tokens=7, output_tokens=3, total_tokens=10)
    assert extract_usage_from_dict({}) is None


def test_extract_usage_from_stream_chunk_metadata():
    chunk = SimpleNamespace(metadata={"usage": {"input_tokens": 2, "output_tokens": 8}})
    usage = extract_usage_from_stream_chunk(chunk)
    assert usage == TokenUsage(input_tokens=2, output_tokens=8, total_tokens=10)


def test_extract_realtime_usage_omits_absent_subcounts():
    """When the provider does not report sub-counts they stay ``None`` so the
    event props omit them (rather than emitting a misleading ``0``)."""
    response = {"usage": {"input_tokens": 100, "output_tokens": 20}}
    usage = extract_realtime_usage(response)
    assert usage.input_tokens == 100
    assert usage.output_tokens == 20
    assert usage.input_audio_tokens is None
    assert usage.output_text_tokens is None
    props = usage.to_event_props()
    assert "input_audio_tokens" not in props
    assert "output_text_tokens" not in props


def test_extract_realtime_usage_includes_present_subcounts():
    response = {
        "usage": {
            "input_tokens": 100,
            "output_tokens": 20,
            "input_token_details": {"audio_tokens": 80, "cached_tokens": 0},
            "output_token_details": {"text_tokens": 20},
        }
    }
    usage = extract_realtime_usage(response)
    assert usage.input_audio_tokens == 80
    assert usage.input_cached_tokens == 0
    assert usage.output_text_tokens == 20
    props = usage.to_event_props()
    assert props["input_audio_tokens"] == "80"
    assert props["input_cached_tokens"] == "0"


def test_extract_realtime_usage_returns_none_when_no_usage():
    assert extract_realtime_usage({}) is None


def test_token_usage_add_handles_none_subcounts():
    a = TokenUsage(input_tokens=1, output_tokens=1, total_tokens=2)
    b = TokenUsage(input_tokens=2, output_tokens=3, total_tokens=5, input_audio_tokens=4)
    combined = a + b
    assert combined.input_tokens == 3
    assert combined.output_tokens == 4
    assert combined.total_tokens == 7
    assert combined.input_audio_tokens == 4
    assert combined.output_text_tokens is None


def test_to_event_props_only_includes_set_subcounts():
    usage = TokenUsage(input_tokens=5, output_tokens=5, total_tokens=10, input_text_tokens=5)
    props = usage.to_event_props()
    assert props["input_text_tokens"] == "5"
    assert "input_audio_tokens" not in props


def _emitter_with_sink():
    """Return (emitter, events) where events captures (name, props) tuples."""
    events: list[tuple[str, dict]] = []
    emitter = TokenUsageEmitter(
        connection_string="InstrumentationKey=test",
        event_sink=lambda name, props: events.append((name, props)),
    )
    return emitter, events


def test_token_usage_scope_accumulates_and_emits():
    emitter, events = _emitter_with_sink()
    with TokenUsageScope(
        emitter,
        agent_name="title_agent",
        model_deployment_name="gpt-4o",
        conversation_id="conv-1",
    ) as scope:
        scope.add(SimpleNamespace(usage={"prompt_tokens": 10, "completion_tokens": 5}))
        scope.add(SimpleNamespace(usage={"prompt_tokens": 4, "completion_tokens": 1}))

    assert scope.usage == TokenUsage(input_tokens=14, output_tokens=6, total_tokens=20)
    names = {name for name, _ in events}
    assert EVENT_AGENT in names
    assert EVENT_MODEL in names
    assert EVENT_SUMMARY in names
    agent_props = next(p for n, p in events if n == EVENT_AGENT)
    assert agent_props["conversation_id"] == "conv-1"


def test_token_usage_scope_no_emit_when_no_usage():
    emitter, events = _emitter_with_sink()
    with TokenUsageScope(emitter, agent_name="a", model_deployment_name="m"):
        pass
    assert events == []


def test_emitter_hashes_user_id_before_emitting():
    events: list[tuple[str, dict]] = []
    emitter = TokenUsageEmitter(
        connection_string="InstrumentationKey=test",
        event_sink=lambda name, props: events.append((name, props)),
        user_id_hasher=lambda v: "HASHED",
    )
    emitter.emit_agent(
        agent_name="a",
        model_deployment_name="gpt-4o",
        usage=TokenUsage(input_tokens=1, output_tokens=1, total_tokens=2),
        user_id="alice@example.com",
    )
    assert events
    _, props = events[0]
    assert props["user_id"] == "HASHED"


def test_emitter_attaches_estimated_cost_when_pricing_configured():
    events: list[tuple[str, dict]] = []
    emitter = TokenUsageEmitter(
        connection_string="InstrumentationKey=test",
        event_sink=lambda name, props: events.append((name, props)),
        pricing={"gpt-4o": (0.0025, 0.01)},
    )
    emitter.emit_agent(
        agent_name="a",
        model_deployment_name="gpt-4o",
        usage=TokenUsage(input_tokens=1000, output_tokens=1000, total_tokens=2000),
    )
    _, props = events[0]
    assert props["estimated_cost_usd"] == "0.012500"


def test_disabled_emitter_is_a_noop():
    """No connection string -> emitter disabled -> sink never invoked."""
    events: list[tuple[str, dict]] = []
    emitter = TokenUsageEmitter(
        connection_string="",
        event_sink=lambda name, props: events.append((name, props)),
    )
    assert emitter.enabled is False
    emitter.emit_agent(
        agent_name="a",
        model_deployment_name="m",
        usage=TokenUsage(input_tokens=1, output_tokens=1, total_tokens=2),
    )
    assert events == []
