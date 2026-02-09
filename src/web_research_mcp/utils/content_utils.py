"""Content extraction utilities."""

import re
from typing import Optional

from bs4 import BeautifulSoup

# Tags to remove entirely (including their content)
REMOVE_TAGS = {
    "script", "style", "nav", "footer", "header", "aside",
    "noscript", "iframe", "svg", "form", "button",
}

# Tags that typically contain boilerplate
BOILERPLATE_CLASSES = {
    "nav", "navbar", "navigation", "menu", "sidebar",
    "footer", "header", "advertisement", "ad", "ads",
    "social", "share", "comment", "comments", "related",
}


def extract_content(html: str, max_chars: int = 15000) -> str:
    """
    Extract clean text content from HTML.
    
    Args:
        html: Raw HTML string
        max_chars: Maximum characters to return
        
    Returns:
        Cleaned text content, truncated to max_chars
    """
    if not html:
        return ""
    
    try:
        soup = BeautifulSoup(html, "html.parser")
        
        # Remove unwanted tags entirely
        for tag in REMOVE_TAGS:
            for element in soup.find_all(tag):
                element.decompose()
        
        # Remove elements with boilerplate class names
        for element in soup.find_all(class_=lambda c: c and any(
            bp in c.lower() for bp in BOILERPLATE_CLASSES
        )):
            element.decompose()
        
        # Remove elements with boilerplate IDs
        for element in soup.find_all(id=lambda i: i and any(
            bp in i.lower() for bp in BOILERPLATE_CLASSES
        )):
            element.decompose()
        
        # Get text content
        text = soup.get_text(separator="\n", strip=True)
        
        # Clean up whitespace
        text = clean_whitespace(text)
        
        # Truncate if needed
        if len(text) > max_chars:
            text = truncate_at_boundary(text, max_chars)
        
        return text
        
    except Exception:
        # If parsing fails, return empty string
        return ""


def clean_whitespace(text: str) -> str:
    """
    Clean up excessive whitespace in text.
    
    Args:
        text: Input text
        
    Returns:
        Text with normalized whitespace
    """
    # Replace multiple newlines with double newline
    text = re.sub(r"\n{3,}", "\n\n", text)
    
    # Replace multiple spaces with single space
    text = re.sub(r" {2,}", " ", text)
    
    # Remove leading/trailing whitespace from lines
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)
    
    return text.strip()


def truncate_at_boundary(text: str, max_chars: int) -> str:
    """
    Truncate text at a sentence or paragraph boundary.
    
    Args:
        text: Input text
        max_chars: Maximum characters
        
    Returns:
        Truncated text ending at a natural boundary
    """
    if len(text) <= max_chars:
        return text
    
    # Try to find a paragraph boundary
    truncated = text[:max_chars]
    last_para = truncated.rfind("\n\n")
    if last_para > max_chars * 0.7:  # At least 70% of content
        return truncated[:last_para].strip() + "\n\n[Content truncated...]"
    
    # Try to find a sentence boundary
    last_sentence = max(
        truncated.rfind(". "),
        truncated.rfind("! "),
        truncated.rfind("? "),
    )
    if last_sentence > max_chars * 0.7:
        return truncated[:last_sentence + 1].strip() + "\n\n[Content truncated...]"
    
    # Fall back to word boundary
    last_space = truncated.rfind(" ")
    if last_space > max_chars * 0.8:
        return truncated[:last_space].strip() + "...\n\n[Content truncated...]"
    
    # Last resort: hard truncate
    return truncated.strip() + "...\n\n[Content truncated...]"


def extract_title(html: str) -> Optional[str]:
    """
    Extract page title from HTML.
    
    Args:
        html: Raw HTML string
        
    Returns:
        Page title or None
    """
    try:
        soup = BeautifulSoup(html, "html.parser")
        
        # Try <title> tag first
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            return title_tag.string.strip()
        
        # Try <h1> tag
        h1_tag = soup.find("h1")
        if h1_tag:
            return h1_tag.get_text(strip=True)
        
        # Try og:title meta tag
        og_title = soup.find("meta", property="og:title")
        if og_title:
            content_attr = og_title.get("content")
            if content_attr and isinstance(content_attr, str):
                return content_attr.strip()
        
        return None
        
    except Exception:
        return None
