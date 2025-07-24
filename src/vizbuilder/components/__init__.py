from pathlib import Path
from functools import cached_property
import json


class _ComponentLoader:
    def __init__(self):
        self._assets_dir = Path(__file__).parent / 'assets'
    
    @cached_property
    def gantt_chart(self):
        return (self._assets_dir / 'gantt_chart.js').read_text()
    

_loader = _ComponentLoader()

gantt_chart = _loader.gantt_chart

def require(modules=["d3"], config=None, user_code=""):
    if config is None:
        config = {
            "paths": {
                "d3": "https://d3js.org/d3.v7.min"
            },
            "shim": {
                "d3": {
                    "exports": "d3"
                }
            }
        }

    return f"""
    require.config({json.dumps(config)});
    require({json.dumps(modules)}, function({", ".join(modules)}) {{
        {user_code}
    }});
    """

__all__ = ['require', 'gantt_chart']
