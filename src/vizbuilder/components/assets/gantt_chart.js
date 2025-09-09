function ganttChart() {
    // Default configuration
    const margin = {top: 40, right: 40, bottom: 60, left: 60};
    let width = null; 
    let height = 300;
    let padding = 0.2;

    function chart(selection) {
        selection.each(function(data) {
            // Clear existing content
            const container = d3.select(this);
            container.selectAll('*').remove();
            
            const containerRect = container.node().getBoundingClientRect();
            const containerWidth = width || containerRect.width;
            const containerHeight = height;
            const inner_width = Math.max(100, containerWidth - margin.left - margin.right);
            const inner_height = Math.max(100, containerHeight - margin.top - margin.bottom);
            
            const num_ticks = 8;
            
            // Scales
            const xMax = d3.max(data, d => d.start + d.duration);
            const xScale = d3.scaleLinear()
                .domain([-xMax * 0.01, xMax * 1.01])
                .range([0, inner_width]);

            const categories = Array.from(new Set(data.map(d => d.category)));
            const yScale = d3.scaleBand()
                .domain(categories)
                .range([inner_height, 0])
                .padding(0.2);

            // Create tooltip within the container with relative positioning
            const tooltip = container.append("div")
                .attr("class", "gantt-tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0, 0, 0, 0.9)")
                .style("color", "white")
                .style("padding", "12px")
                .style("border-radius", "6px")
                .style("font-size", "12px")
                .style("pointer-events", "none")
                .style("opacity", 0)
                .style("z-index", 10000)
                .style("box-shadow", "0 4px 8px rgba(0,0,0,0.3)")
                .style("max-width", "250px")
                .style("word-wrap", "break-word");
            
            // Ensure the container has relative positioning for proper tooltip positioning
            container.style("position", "relative");
            
            // Create SVG 
            const svg = container
                .append("svg")
                .attr("width", containerWidth)
                .attr("height", containerHeight);

            // Create main group container
            const g = svg.append("g");
            const zoom = d3.zoom()
                .scaleExtent([0.1, 10])  // Set zoom scale limits
                .on("zoom", function(event) {
                    g.attr("transform", event.transform);
                });

            // Apply zoom behavior to the SVG and set initial zoom
            svg.call(zoom)
            .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top)); // Set initial transform



            // Add plot area background
            g.append("rect")
                .attr("class", "plot-area")
                .attr("width", inner_width)
                .attr("height", inner_height)
                .attr("fill", "#f0f1fa");

            // Add grid lines
            const xGrid = d3.axisBottom(xScale)
                .tickSize(-inner_height)
                .tickFormat("")
                .ticks(num_ticks)
                .tickSizeOuter(0);
            
            g.append("g")
                .attr("class", "grid")
                .attr("transform", `translate(0,${inner_height})`)
                .call(xGrid)
                .call(g => g.selectAll(".domain").remove())
                .selectAll("line")
                .attr("class", "grid-line")
                .attr("stroke", "white")
                .attr("stroke-width", 3);
            
            // Create axes
            const xAxisBottom = d3.axisBottom(xScale)
                .tickSize(0)
                .ticks(num_ticks);
            const yAxisLeft = d3.axisLeft(yScale)
                .tickSize(0);
            
            // Add X axis
            g.append("g")
                .attr("class", "axis")
                .attr("transform", `translate(0,${inner_height})`)
                .call(xAxisBottom)
                .call(g => g.selectAll(".domain").remove())
                .call(g => g.selectAll("text").style("font-size", "12px"));
            
            // Add Y axis
            g.append("g")
                .attr("class", "axis")
                .call(yAxisLeft)
                .call(g => g.selectAll(".domain").remove())
                .call(g => g.selectAll("text").style("font-size", "12px"));
        
            // Add bars
            g.selectAll(".bar")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => xScale(d.start))
                .attr("y", d => yScale(d.category))
                .attr("width", d => xScale(d.start + d.duration*0.99) - xScale(d.start))
                .attr("height", yScale.bandwidth())
                .attr("fill", d => d.color)
                .attr("stroke", "none");
            
            // Add text labels on bars
            //g.selectAll(".bar-text")
            //    .data(data.filter(d => d.text !== ""))
            //    .enter()
            //    .append("text")
            //    .attr("class", "bar-text")
            //    .attr("x", d => xScale(d.start + d.duration / 2))
            //    .attr("y", d => yScale(d.category) + yScale.bandwidth() / 2)
            //    .attr("text-anchor", "middle")
             //   .attr("dominant-baseline", "middle")
            //    .text(d => d.text);
            
            // Add title
            svg.append("text")
                .attr("class", "title")
                .attr("x", containerWidth / 2)
                .attr("y", 25)
                .attr("text-anchor", "middle")
                .style("font-size", "15px")
                .text("timeline");
            
            // Add axis labels
            svg.append("text")
                .attr("class", "axis-label")
                .attr("transform", "rotate(-90)")
                .attr("y", 20)
                .attr("x", -containerHeight / 2)
                .style("text-anchor", "middle")
                .text("y-axis");
            
            svg.append("text")
                .attr("class", "axis-label")
                .attr("x", containerWidth / 2)
                .attr("y", containerHeight - 10)
                .style("text-anchor", "middle")
                .text("x-axis");
            
            // Helper function to get mouse position relative to container
            function getRelativeMousePosition(event) {
                const svgRect = svg.node().getBoundingClientRect();
                const containerRect = container.node().getBoundingClientRect();
                
                return {
                    x: event.clientX - containerRect.left,
                    y: event.clientY - containerRect.top
                };
            }
            
            // Helper function to position tooltip within bounds
            function positionTooltip(mousePos, tooltipNode) {
                const tooltipRect = tooltipNode.getBoundingClientRect();
                const containerRect = container.node().getBoundingClientRect();
                
                let x = mousePos.x + 15; // Offset from cursor
                let y = mousePos.y - 10;
                
                // Keep tooltip within container bounds
                if (x + tooltipRect.width > containerWidth) {
                    x = mousePos.x - tooltipRect.width - 15;
                }
                if (y < 0) {
                    y = mousePos.y + 25;
                }
                if (y + tooltipRect.height > containerHeight) {
                    y = containerHeight - tooltipRect.height - 10;
                }
                
                // Ensure minimum distance from edges
                x = Math.max(5, Math.min(x, containerWidth - tooltipRect.width - 5));
                y = Math.max(5, Math.min(y, containerHeight - tooltipRect.height - 5));
                
                return { x, y };
            }

            // Add interactivity with tooltips
            g.selectAll(".bar")
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .attr("opacity", 0.8)
                        .attr("stroke", "#333")
                        .attr("stroke-width", 2);
                    
                    // Create enhanced tooltip content
                    const tooltipContent = `
                        <div style="border-left: 4px solid ${d.color}; padding-left: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <div style="width: 12px; height: 12px; background-color: ${d.color}; border-radius: 2px;"></div>
                                <div>
                                    <div style="font-weight: bold; font-size: 14px;">${d.category}</div>
                                    ${d.text ? `<div style="font-size: 12px; color: #ccc; font-style: italic;">${d.text}</div>` : ''}
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 12px;">
                                <span style="color: #ccc;">🕐 Start:</span>
                                <strong>${Math.round(d.start).toLocaleString()}</strong>
                                
                                <span style="color: #ccc;">🕐 Duration:</span>
                                <strong>${Math.round(d.duration).toLocaleString()}</strong>
                                
                                <span style="color: #ccc;">🕐 End:</span>
                                <strong>${Math.round(d.start + d.duration).toLocaleString()}</strong>
                            </div>
                        </div>
                    `;
                    
                    tooltip.html(tooltipContent);
                    
                    // Position tooltip
                    const mousePos = getRelativeMousePosition(event);
                    const tooltipPos = positionTooltip(mousePos, tooltip.node());
                    
                    tooltip
                        .style("left", tooltipPos.x + "px")
                        .style("top", tooltipPos.y + "px")
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                })
                .on("mousemove", function(event, d) {
                    // Update tooltip position as mouse moves
                    const mousePos = getRelativeMousePosition(event);
                    const tooltipPos = positionTooltip(mousePos, tooltip.node());
                    
                    tooltip
                        .style("left", tooltipPos.x + "px")
                        .style("top", tooltipPos.y + "px");
                })
                .on("mouseout", function(event, d) {
                    d3.select(this)
                        .attr("opacity", 1)
                        .attr("stroke", "none");
                    
                    // Hide tooltip
                    tooltip.transition()
                        .duration(300)
                        .style("opacity", 0);
                });
        });
    }
    
    // Getter/setter methods for configuration
    chart.width = function(_) {
        return arguments.length ? (width = _, chart) : width;
    };
    
    chart.padding = function(_) {
        return arguments.length ? (padding = _, chart) : padding;
    };
    
    chart.height = function(_) {
        return arguments.length ? (height = _, chart) : height;
    };
    
    return chart;
}