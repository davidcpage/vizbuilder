from pathlib import Path
from functools import cached_property

def require_d3(user_code):  
    return f"""
    require.config({{
        paths: {{
            d3: "https://d3js.org/d3.v7.min"
        }},
        shim: {{
            d3: {{
                exports: "d3"
            }}
        }}
    }});
    require(["d3"], function(d3) {{
        {user_code}
    }});
    """


class _ComponentLoader:
    def __init__(self):
        self._assets_dir = Path(__file__).parent / 'assets'
    
    @cached_property
    def gantt_chart(self):
        return (self._assets_dir / 'gantt_chart.js').read_text()
    

_loader = _ComponentLoader()

gantt_chart = _loader.gantt_chart

__all__ = ['require_d3', 'gantt_chart']