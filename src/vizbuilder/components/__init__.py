from pathlib import Path
from functools import cached_property
import json
import base64



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

    # Cached data URIs for efficient loading
    @cached_property
    def rectangles_data_uri(self):
        return f"data:text/javascript;base64,{base64.b64encode(self.rectangles.encode()).decode()}"

    @cached_property
    def gantt_chart_data_uri(self):
        return f"data:text/javascript;base64,{base64.b64encode(self.gantt_chart.encode()).decode()}"

    @cached_property
    def data_display_data_uri(self):
        return f"data:text/javascript;base64,{base64.b64encode(self.data_display.encode()).decode()}"

    def clear_cache(self):
        """Clear all cached properties to force reloading from disk."""
        # Clear cached_property cache by deleting the cached values
        for attr_name in ['gantt_chart', 'rectangles', 'data_display',
                         'rectangles_data_uri', 'gantt_chart_data_uri', 'data_display_data_uri']:
            if hasattr(self, attr_name):
                delattr(self, attr_name)


_loader = _ComponentLoader()

gantt_chart = _loader.gantt_chart
rectangles = _loader.rectangles
data_display = _loader.data_display


def require(modules=None, config=None, user_code="", clear_cache=False,
                    requirejs_cdn="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"):
    """
    Generate JavaScript code that ensures RequireJS is available and then executes user code.

    Args:
        modules: List of module names to load (None = all modules from config)
        config: RequireJS configuration object
        user_code: User's JavaScript code to execute
        clear_cache: If True, clear both Python and RequireJS caches to force reload
        requirejs_cdn: CDN URL for RequireJS fallback
    """
    # Clear Python cache if requested
    if clear_cache:
        _loader.clear_cache()

    if config is None:
        config = {
            "paths": {
                "d3": "https://d3js.org/d3.v7.min",
                "rough": "https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.min",
                # Local components as cached data URIs - using camelCase names
                "drawRectangles": _loader.rectangles_data_uri,
                "ganttChart": _loader.gantt_chart_data_uri,
                "dataDisplay": _loader.data_display_data_uri,
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

    # If no modules specified, load all modules from config
    if modules is None:
        modules = list(config["paths"].keys())

    return f"""
(function() {{
    function executeWithRequire() {{
        {'// Clear RequireJS cache for local modules when cache clearing is requested' if clear_cache else ''}
        {f'''if (typeof require.undef === 'function') {{
            const localModules = ['drawRectangles', 'ganttChart', 'dataDisplay'];
            localModules.forEach(function(moduleName) {{
                if (require.s.contexts._.defined && require.s.contexts._.defined[moduleName]) {{
                    require.undef(moduleName);
                }}
            }});
        }}''' if clear_cache else ''}

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
