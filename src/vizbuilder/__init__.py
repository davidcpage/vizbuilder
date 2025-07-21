"""
Vizbuilder: Web-based visualizations with Jupyter integration
"""

__version__ = "0.1.0"
__author__ = "David Page"

from .core.html_builder import Html
from .components import require_d3


__all__ = [
    "Html",
    'require_d3',
    # Add other components or utilities here as needed
]