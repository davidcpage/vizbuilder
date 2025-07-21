from functools import partial
from typing import Union, List, Any, Optional
from dataclasses import dataclass, asdict, field
from abc import ABC, abstractmethod
from importlib import resources
import html
import warnings

def prettify_html(html_string):
    try:
        from bs4 import BeautifulSoup, Tag
        import cssbeautifier
        import jsbeautifier
        
        soup = BeautifulSoup(html_string, 'html.parser')

        for style in soup.find_all('style'):
            if isinstance(style, Tag) and style.string:
                style.string = cssbeautifier.beautify(style.string)
        
        for script in soup.find_all('script'):
            if isinstance(script, Tag) and script.string:
                script.string = jsbeautifier.beautify(script.string)

        return str(soup.prettify(formatter='html5'))

    except ImportError as e:
        warnings.warn("prettify_html requires installing bs4, cssbeautifier and jsbeautifier.")
        return html_string


class HTMLElement:
    """
    A class for building HTML elements programmatically.
    
    Supports method chaining and automatic attribute name conversion (class_ -> class).
    """
    
    def __init__(self, tag: str, *children, **attributes):
        """
        Initialize an HTML element.
        
        Args:
            tag: HTML tag name
            *children: Child elements or text content
            **attributes: HTML attributes (trailing underscores removed)
        """
        self.tag = tag.lower()
        self.children = [child for child in children if child is not None]
        self.attributes = attributes
    
    def __getitem__(self, item: Union[Any, List[Any]]) -> 'HTMLElement':
        """
        Add children to the element using bracket notation.
        
        Args:
            item: Single child or list/tuple of children
            
        Returns:
            Self for method chaining
        """
        if isinstance(item, (list, tuple)):
            self.children.extend(item)
        else:
            self.children.append(item)
        return self

    def to_html_string(self, pretty=False) -> str:
        """
        Convert the element to an HTML string.
        
        Returns:
            HTML string representation
        """
        # Build attributes string
        attr_str = ''
        if self.attributes:
            # Handle special cases like 'class_' -> 'class'
            strip_ = lambda k: k.rstrip('_')
            # Use html.escape for proper attribute escaping
            attr_str = ' ' + ' '.join(
                f'{strip_(k)}="{html.escape(str(v))}"' 
                for k, v in self.attributes.items()
            )

        VOID_ELEMENTS = {
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
            'link', 'meta', 'param', 'source', 'track', 'wbr'
        }

        # Generate HTML
        if self.tag in VOID_ELEMENTS:
            html_string = f'<{self.tag}{attr_str} />'
        else:
            content = ''.join(
                child.to_html_string() if hasattr(child, 'to_html_string') 
                else str(child) 
                for child in self.children
            )
            html_string = f'<{self.tag}{attr_str}>{content}</{self.tag}>'

        if pretty:
            html_string = prettify_html(html_string)

        return html_string

    def __str__(self) -> str:
        """Return prettified HTML string."""
        return self.to_html_string(pretty=True)
    
    def _repr_html_(self) -> str:
        """IPython/Jupyter display representation."""
        return self.to_html_string()

class HTMLBuilderMeta(type):
    """Metaclass to enable __getattr__ on the Html class."""
    
    def __getattr__(cls, tag_name: str) -> partial:
        return partial(HTMLElement, tag_name.lower())

class Html(metaclass=HTMLBuilderMeta):
    """
    HTML builder with clean syntax for creating elements.
    
    Usage:
        div = Html.div(id='my-div')['Hello World']
        p = Html.p(class_='text')['Some text']
    """
    pass

