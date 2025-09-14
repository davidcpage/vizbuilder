from pathlib import Path
from functools import cached_property
import json



class _ComponentLoader:
    def __init__(self):
        self._assets_dir = Path(__file__).parent / 'assets'
    
    @cached_property
    def gantt_chart(self):
        return (self._assets_dir / 'gantt_chart.js').read_text()
    
    @cached_property
    def rectangles(self):
        return (self._assets_dir / 'rectangles.js').read_text()
    
    @cached_property
    def data_display(self):
        return (self._assets_dir / 'data_display.js').read_text()


_loader = _ComponentLoader()

gantt_chart = _loader.gantt_chart
rectangles = _loader.rectangles
data_display = _loader.data_display


def require(modules=["d3"], config=None, user_code="",
                    requirejs_cdn="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"):
    """
    Generate JavaScript code that ensures RequireJS is available and then executes user code.

    Args:
        modules: List of module names to load
        config: RequireJS configuration object
        user_code: User's JavaScript code to execute
        requirejs_cdn: CDN URL for RequireJS fallback
    """
    if config is None:
        config = {
            "paths": {
                "d3": "https://d3js.org/d3.v7.min",
                "rough": "https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.min",
            },
            "shim": {
                "d3": {
                    "exports": "d3"
                },
                "rough": {
                    "exports": "rough"
                }
            }
        }
    return f"""
(function() {{
    function executeWithRequire() {{
        require.config({json.dumps(config)});
        require({json.dumps(modules)}, function({", ".join(modules)}) {{
            {user_code}
        }});
    }}

    // Check if RequireJS is already available
    if (typeof require !== 'undefined' && typeof require.config === 'function') {{
        console.log('RequireJS is already loaded.');
        executeWithRequire();
    }} else {{
        // Load RequireJS from CDN
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = '{requirejs_cdn}';
        script.onload = executeWithRequire;
        script.onerror = function() {{
            console.error('Failed to load RequireJS from CDN. Check internet connection.');
        }};
        (document.head || document.getElementsByTagName('head')[0]).appendChild(script);
    }}
}})();
"""

__all__ = ['require', 'gantt_chart', 'rectangles', 'data_display']
