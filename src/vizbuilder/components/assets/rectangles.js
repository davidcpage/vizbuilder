function initSVG(container, scale = 1.0, translateX = 0.0, translateY = 0.0) {
    const containerRect = container.node().parentElement.getBoundingClientRect();
    
    const svg = container
                .append("svg")
                .attr("width", containerRect.width)
                .attr("height", containerRect.height);

    // Create a group element for the zoomable content
    const g = svg.append("g");

    // Define zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1*scale, 10*scale])  // Set zoom scale limits
        .on("zoom", function(event) {
            g.attr("transform", event.transform);
        });
    
    // Apply zoom behavior to the SVG and set initial zoom
    svg.call(zoom)
       .call(zoom.transform, d3.zoomIdentity.scale(scale).translate(translateX / scale, translateY / scale)); // Set initial transform

    return {svg, g};
}

function drawRectangles(use_rough = false) {
    // Default configuration
    let scale = 1.0;
    let translateX = 0.0;
    let translateY = 0.0;

    function chart(selection) {
        selection.each(function(data) {
            // Clear existing content
            const container = d3.select(this);
            container.selectAll('*').remove();

            // Initialize SVG and group for zoomable content
            const { svg, g } = initSVG(container, scale, translateX, translateY);
            console.log(use_rough, "use_rough");
            if (use_rough) {
                console.log("Using RoughJS to draw rectangles");
                const rc = rough.svg(svg.node());
                // Draw rectangles using RoughJS
                data.forEach((d, i) => {
                // Create the rough rectangle
                    const roughRect = rc.rectangle(d.x, d.y, d.width, d.height, {
                        roughness: d.roughness,
                        fill: d.color,
                        stroke: d.stroke_color,
                        strokeWidth: d.stroke_width == null ? d.width*0.01 : d.stroke_width,
                        fillStyle: 'solid'
                    });

                    // Append the rough rectangle to the group
                    g.node().appendChild(roughRect);
                });
            } else {
                console.log("Using D3 to draw rectangles");
                // Draw rectangles
                g.selectAll(".rect")
                    .data(data)
                    .enter()
                    .append("rect")
                    .attr("class", "bar")
                    .attr("x", d => d.x)
                    .attr("y", d => d.y)
                    .attr("rx", d => d.rx)
                    .attr("ry", d => d.ry)
                    .attr("width", d => d.width)
                    .attr("height",  d => d.height)
                    .attr("fill", d => d.color)
                    .attr("stroke", d => d.stroke_color)
                    .attr("stroke-width", d => d.stroke_width == null ? d.width*0.01 : d.stroke_width);
            }
        
            // Draw text labels
            g.selectAll(".text")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "text")
                .attr("x", d => d.x + d.width / 2)
                .attr("y", d => d.y + d.height / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .text(d => d.text)
                .attr("fill", d => d.text_color)
                .attr("font-family", "Amatic SC")
                .attr("font-size", d => d.font_size)
                .attr("transform", 
                    d => d.text_orientation == "vertical" ? `rotate(90, ${d.x + d.width / 2}, ${d.y + d.height / 2})` : ""
                );
        });
    }
    // Getter/setter methods for configuration
    chart.translate = function(x, y) {
        return arguments.length ? (translateX = x, translateY = y, chart) : { x: translateX, y: translateY };
    };
    
    chart.scale = function(_) {
        return arguments.length ? (scale = _, chart) : scale;
    };

    
    return chart;
}


