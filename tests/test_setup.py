"""Tests for project setup - Task 01."""

import subprocess
import sys


def test_package_import():
    """Verify package can be imported without errors."""
    import web_research_mcp
    assert web_research_mcp is not None


def test_version_defined():
    """Verify version is defined."""
    import web_research_mcp
    assert hasattr(web_research_mcp, "__version__")
    assert isinstance(web_research_mcp.__version__, str)
    assert len(web_research_mcp.__version__) > 0


def test_no_llm_dependencies():
    """Verify no LLM dependencies are installed."""
    result = subprocess.run(
        [sys.executable, "-m", "pip", "list"],
        capture_output=True,
        text=True,
    )
    installed = result.stdout.lower()
    
    # These should NOT be present
    forbidden = ["boto3", "anthropic", "openai", "langchain"]
    for dep in forbidden:
        assert dep not in installed, f"Forbidden dependency found: {dep}"


def test_required_dependencies():
    """Verify required dependencies are installed."""
    result = subprocess.run(
        [sys.executable, "-m", "pip", "list"],
        capture_output=True,
        text=True,
    )
    installed = result.stdout.lower()
    
    # These MUST be present
    required = ["mcp", "duckduckgo-search", "requests", "beautifulsoup4"]
    for dep in required:
        # Handle package name variations
        dep_check = dep.replace("-", "").replace("_", "")
        assert any(
            dep_check in line.replace("-", "").replace("_", "")
            for line in installed.split("\n")
        ), f"Required dependency missing: {dep}"
