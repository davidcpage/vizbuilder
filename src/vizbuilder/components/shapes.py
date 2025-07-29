from dataclasses import dataclass, asdict, replace
import json

@dataclass
class Rect:
    width: float
    height: float
    x: float = 0.0
    y: float = 0.0
    rx: float = 0.0
    ry: float = 0.
    color: str = "#000000"
    roughness: float = 0. 
    stroke_color: str = "black"
    stroke_dasharray: str = "none"  # e.g., "5,5" for dashed lines
    stroke_width: float = None
    text: str = ""
    font_size: str = ""
    text_color: str = "black" 
    text_orientation: str = "horizontal"  # "horizontal" or "vertical"     

    def __post_init__(self):
        if not self.font_size:
            estimated_text_size = max(0.6*len(self.text), 1)
            w, h = (self.width, self.height) if self.text_orientation == "horizontal" else (self.height, self.width)
            self.font_size = f"{min(0.9*(w / estimated_text_size), h * 0.3)}px"

    def to_dict(self):
        return asdict(self)
    
    def to_json(self):
        return json.dumps(asdict(self))
    
    def bounding_rect(self, **kw):
        return replace(self, **kw)
    
    def translate(self, dx: float, dy: float):
        """Translate the rectangle by dx and dy."""
        return replace(self, x=self.x + dx, y=self.y + dy)

    def shapes(self):
        """Return a list of shapes that this rectangle represents."""
        return [self]

@dataclass
class Rects:
    rects: list[Rect]

    def bounding_rect(self, **kw):
        if not self.rects:
            return Rect(0, 0)
        min_x = min(rect.x for rect in self.rects)
        min_y = min(rect.y for rect in self.rects)
        max_x = max(rect.x + rect.width for rect in self.rects)
        max_y = max(rect.y + rect.height for rect in self.rects)

        rect_kws = {"x": min_x, "y": min_y, "width": max_x - min_x, "height": max_y - min_y}
        return Rect(**dict(rect_kws, **kw))

    def translate(self, dx: float, dy: float):
        """Translate all rectangles by dx and dy."""
        return Rects([rect.translate(dx, dy) for rect in self.rects])
    
    def shapes(self):
        """Return a list of shapes that this Rects object represents."""
        return self.rects

    def to_json(self):
        """Convert all rectangles to JSON."""
        return json.dumps([rect.to_dict() for rect in self.rects])

def hstack(shapes, padding=0.0, center=False):
    if center:
        height = max(shape.bounding_rect().height for shape in shapes)
        shapes = [
            shape.translate(0, (height - shape.bounding_rect().height) / 2)
            for shape in shapes
        ]
    dx = 0.0
    stack = []
    for shape in shapes:
        shape = shape.translate(dx, 0)
        stack.extend(shape.shapes())
        dx += shape.bounding_rect().width + padding
    return Rects(stack)   

def vstack(shapes, padding=0.0, center=False):
    if center:
        width = max(shape.bounding_rect().width for shape in shapes)
        shapes = [
            shape.translate((width - shape.bounding_rect().width) / 2, 0)
            for shape in shapes
        ]
    dy = 0.0
    stack = []
    for shape in shapes:
        shape = shape.translate(0, dy)
        stack.extend(shape.shapes())
        dy += shape.bounding_rect().height + padding
    return Rects(stack)

def grid(shape, rows, cols, row_padding=0.0, col_padding=0.0):
    return vstack([hstack([shape] * cols, padding=col_padding)] * rows, padding=row_padding)

