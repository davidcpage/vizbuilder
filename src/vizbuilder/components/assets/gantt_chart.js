define(['d3'], function(d3) {
    function ganttChart() {
    // Default configuration
    const margin = {top: 60, right: 40, bottom: 60, left: 60};
    let width = null;
    let height = 300;
    let padding = 0.2;
    let scrubberEnabled = true;

    // Presentation/styling options
    let axisFontSize = 12;
    let titleFontSize = 15;
    let titleText = "timeline";
    let xAxisLabel = "x-axis";
    let yAxisLabel = "y-axis";
    let showGridLines = true;
    let categoryBackgroundOpacity = [0.3, 0.05]; // [even, odd] indices
    let interactiveMode = true;
    let colorScheme = null; // Can be an array of colors or null to use data colors
    let centerCategoryLabels = false; // If true, category labels are centered horizontally
    let titleFontFamily = null; // Font family for title (e.g., "Virgil, sans-serif")
    let axisFontFamily = null; // Font family for axis labels and ticks (e.g., "Virgil, sans-serif")
    let fontUrl = null; // URL to load custom font (e.g., "https://excalidraw.com/Virgil.woff2")

    // Event dispatcher for component communication
    const dispatch = d3.dispatch("scrubberMove", "scrubberStart", "scrubberEnd");

    function chart(selection) {
        console.log("** Rendering Again **");
        selection.each(function(data) {
            // Clear existing content
            const container = d3.select(this);
            container.selectAll('*').remove();

            // Load custom font if specified
            if (fontUrl) {
                // Extract font family name from titleFontFamily or axisFontFamily
                const fontFamily = (titleFontFamily || axisFontFamily || "").split(',')[0].trim().replace(/['"]/g, '');

                // Check if font is already loaded
                const fontId = `font-${fontFamily.replace(/\s+/g, '-')}`;
                if (!document.getElementById(fontId)) {
                    const style = document.createElement('style');
                    style.id = fontId;
                    style.textContent = `
                        @font-face {
                            font-family: "${fontFamily}";
                            src: url("${fontUrl}") format("woff2");
                            font-weight: normal;
                            font-style: normal;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
            
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

            // Check if data has subcategories
            const hasSubcategories = data.some(d => d.subcategory !== undefined);

            // Get unique categories
            const categories = Array.from(new Set(data.map(d => d.category)));

            let yScale, categoryScale, subcategoryScales;

            if (hasSubcategories) {
                // Create nested scales for categories and subcategories

                // Group data by category to find subcategories for each
                const categoryGroups = d3.group(data, d => d.category);
                const subcategoriesPerCategory = new Map();
                categoryGroups.forEach((items, category) => {
                    const subcats = Array.from(new Set(items.map(d => d.subcategory)));
                    subcategoriesPerCategory.set(category, subcats);
                });

                // Calculate total rows needed
                const totalRows = Array.from(subcategoriesPerCategory.values())
                    .reduce((sum, subcats) => sum + subcats.length, 0);

                // Create category scale (outer scale)
                categoryScale = d3.scaleBand()
                    .domain(categories)
                    .range([inner_height, 0]);
                  //  .paddingOuter(0.1)
                  //  .paddingInner(0.2);

                // Create subcategory scales (inner scales) for each category
                subcategoryScales = new Map();
                categories.forEach(category => {
                    const subcats = subcategoriesPerCategory.get(category);
                    const scale = d3.scaleBand()
                        .domain(subcats)
                        .range([categoryScale.bandwidth(), 0])
                        .padding(0.1);
                    subcategoryScales.set(category, scale);
                });

                // Create combined yScale function for positioning bars
                yScale = function(d) {
                    const categoryY = categoryScale(d.category);
                    const subcategoryY = subcategoryScales.get(d.category)(d.subcategory);
                    return categoryY + subcategoryY;
                };
                yScale.bandwidth = function(d) {
                    return subcategoryScales.get(d.category).bandwidth();
                };
            } else {
                // Original single-level scale
                yScale = d3.scaleBand()
                    .domain(categories)
                    .range([inner_height, 0])
                    .padding(0.2);
            }

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
   

            // Create layered groups for proper z-ordering
            const barsGroup = svg.append("g").attr("class", "bars-layer");
            const titleGroup = svg.append("g").attr("class", "title-layer");
            const scrubberGroup = svg.append("g").attr("class", "scrubber-layer");

            // Create zoom behavior that affects both bars and scrubber layers
            if (interactiveMode) {
                const zoom = d3.zoom()
                    .scaleExtent([0.1, 10])  // Set zoom scale limits
                    .on("zoom", function(event) {
                        barsGroup.attr("transform", event.transform);
                        scrubberGroup.attr("transform", event.transform);
                    });

                // Apply zoom behavior to the SVG and set initial zoom
                svg.call(zoom)
                .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top)); // Set initial transform
            } else {
                // No zoom, just apply initial transform
                barsGroup.attr("transform", `translate(${margin.left},${margin.top})`);
                scrubberGroup.attr("transform", `translate(${margin.left},${margin.top})`);
            }

            // Add plot area background
            barsGroup.append("rect")
                .attr("class", "plot-area")
                .attr("width", inner_width)
                .attr("height", inner_height)
                .attr("fill", "#f0f1fa");

            // Add alternating background rectangles for category groups (if subcategories exist)
            if (hasSubcategories) {
                const categoryBackgrounds = barsGroup.append("g")
                    .attr("class", "category-backgrounds");

                categoryBackgrounds.selectAll(".category-bg")
                    .data(categories)
                    .enter()
                    .append("rect")
                    .attr("class", "category-bg")
                    .attr("x", 0)
                    .attr("y", d => categoryScale(d))
                    .attr("width", inner_width)
                    .attr("height", d => categoryScale.bandwidth())
                    .attr("fill", (d, i) => i % 2 === 0 ?
                        `rgba(255, 255, 255, ${categoryBackgroundOpacity[0]})` :
                        `rgba(0, 0, 0, ${categoryBackgroundOpacity[1]})`)
                    .attr("stroke", "none");
            }

            // Add grid lines
            if (showGridLines) {
                const xGrid = d3.axisBottom(xScale)
                    .tickSize(-inner_height)
                    .tickFormat("")
                    .ticks(num_ticks)
                    .tickSizeOuter(0);

                barsGroup.append("g")
                    .attr("class", "grid")
                    .attr("transform", `translate(0,${inner_height})`)
                    .call(xGrid)
                    .call(g => g.selectAll(".domain").remove())
                    .selectAll("line")
                    .attr("class", "grid-line")
                    .attr("stroke", "white")
                    .attr("stroke-width", 3);
            }

            // Create axes
            const xAxisBottom = d3.axisBottom(xScale)
                .tickSize(0)
                .ticks(num_ticks);

            // Add X axis
            barsGroup.append("g")
                .attr("class", "axis")
                .attr("transform", `translate(0,${inner_height})`)
                .call(xAxisBottom)
                .call(g => g.selectAll(".domain").remove())
                .call(g => {
                    g.selectAll("text").style("font-size", `${axisFontSize}px`);
                    if (axisFontFamily) {
                        g.selectAll("text").style("font-family", axisFontFamily);
                    }
                });

            // Add Y axis
            if (hasSubcategories) {
                // Custom y-axis with centered category labels
                const yAxis = barsGroup.append("g")
                    .attr("class", "axis");

                yAxis.selectAll(".tick")
                    .data(categories)
                    .enter()
                    .append("g")
                    .attr("class", "tick")
                    .attr("transform", d => {
                        // Center label in the middle of the category group
                        const categoryY = categoryScale(d);
                        const categoryHeight = categoryScale.bandwidth();
                        return `translate(0,${categoryY + categoryHeight / 2})`;
                    })
                    .append("text")
                    .attr("x", centerCategoryLabels ? -75 : -9)
                    .attr("dy", "0.32em")
                    .style("text-anchor", centerCategoryLabels ? "middle" : "end")
                    .style("font-size", `${axisFontSize}px`)
                    .style("font-family", axisFontFamily || null)
                    .text(d => d);
            } else {
                // Original y-axis for non-subcategory data
                const yAxisLeft = d3.axisLeft(yScale)
                    .tickSize(0);

                barsGroup.append("g")
                    .attr("class", "axis")
                    .call(yAxisLeft)
                    .call(g => g.selectAll(".domain").remove())
                    .call(g => {
                        const textElements = g.selectAll("text")
                            .style("font-size", `${axisFontSize}px`)
                            .attr("x", centerCategoryLabels ? -20 : null)
                            .style("text-anchor", centerCategoryLabels ? "middle" : null);
                        if (axisFontFamily) {
                            textElements.style("font-family", axisFontFamily);
                        }
                    });
            }

            // Add bars
            // Apply color scheme if specified
            let getBarColor;
            if (colorScheme !== null) {
                // Map categories to colors from the scheme
                const categoryToColorIndex = new Map();
                categories.forEach((cat, i) => {
                    categoryToColorIndex.set(cat, i % colorScheme.length);
                });
                getBarColor = d => colorScheme[categoryToColorIndex.get(d.category)];
            } else {
                // Use colors from data
                getBarColor = d => d.color;
            }

            const bars = barsGroup.selectAll(".bar")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => xScale(d.start))
                .attr("y", d => hasSubcategories ? yScale(d) : yScale(d.category))
                .attr("width", d => xScale(d.start + d.duration*0.99) - xScale(d.start))
                .attr("height", d => hasSubcategories ? yScale.bandwidth(d) : yScale.bandwidth())
                .attr("fill", getBarColor)
                .attr("stroke", "none");
            
            // Add title to middle layer
            if (titleText !== null) {
                const titleElement = titleGroup.append("text")
                    .attr("class", "title")
                    .attr("x", containerWidth / 2)
                    .attr("y", 25)
                    .attr("text-anchor", "middle")
                    .style("font-size", `${titleFontSize}px`)
                    .text(titleText);

                if (titleFontFamily) {
                    titleElement.style("font-family", titleFontFamily);
                }
            }

            // Store current scrubber position
            let currentScrubberX = inner_width * 0.3;

            // Helper function to check if a timeline entry intersects with scrubber position
            function checkIntersection(d, scrubberPosition) {
                const entryStart = xScale(d.start);
                const entryEnd = xScale(d.start + d.duration);
                return scrubberPosition >= entryStart && scrubberPosition <= entryEnd;
            }
            
            // Helper function to update visual feedback and emit events
            function updateScrubberState(scrubberPosition) {
                const intersectedData = [];

                // Update bar opacity based on intersection
                bars.transition("scrubber")
                    .duration(50)
                    .attr("opacity", function(d) {
                        const isIntersected = checkIntersection(d, scrubberPosition);
                        if (isIntersected) {
                            intersectedData.push(d);
                            return 1.0;
                        }
                        return 0.3;
                    });

                // Store current scrubber position
                currentScrubberX = scrubberPosition;

                // Emit event with intersected data
                const scrubberValue = xScale.invert(scrubberPosition);
                dispatch.call("scrubberMove", null, {
                    position: scrubberValue,
                    intersectedData: intersectedData
                });
            }

            // Add horizontal scrubber
            // Scrubber requires interactiveMode to be enabled
            if (scrubberEnabled && interactiveMode) {
                
                // Use the front layer scrubber group
                
                // Scrubber line
                const scrubberLine = scrubberGroup.append("line")
                    .attr("class", "scrubber-line")
                    .attr("x1", currentScrubberX)
                    .attr("x2", currentScrubberX)
                    .attr("y1", 0)
                    .attr("y2", inner_height)
                    .attr("stroke", "#ff6b35")
                    .attr("stroke-width", 3)
                    .attr("opacity", 0.8)
                    .style("cursor", "ew-resize");
                
                // Scrubber handle (circle at top)
                const scrubberHandle = scrubberGroup.append("circle")
                    .attr("class", "scrubber-handle")
                    .attr("cx", currentScrubberX)
                    .attr("cy", 0)
                    .attr("r", 8)
                    .attr("fill", "#ff6b35")
                    .attr("stroke", "white")
                    .attr("stroke-width", 2)
                    .style("cursor", "ew-resize");
                
                // Scrubber value label background
                const scrubberLabelBg = scrubberGroup.append("rect")
                    .attr("class", "scrubber-label-bg")
                    .attr("fill", "rgba(255, 255, 255, 0.9)")
                    .attr("stroke", "#ff6b35")
                    .attr("stroke-width", 1)
                    .attr("rx", 3)
                    .attr("ry", 3);

                // Scrubber value label
                const scrubberLabel = scrubberGroup.append("text")
                    .attr("class", "scrubber-label")
                    .attr("x", currentScrubberX)
                    .attr("y", -15)
                    .attr("text-anchor", "middle")
                    .attr("fill", "#ff6b35")
                    .attr("font-size", "12px")
                    .attr("font-weight", "bold")
                    .text(Math.round(xScale.invert(currentScrubberX)));

                // Position background after text is rendered
                const labelBBox = scrubberLabel.node().getBBox();
                scrubberLabelBg
                    .attr("x", labelBBox.x - 4)
                    .attr("y", labelBBox.y - 2)
                    .attr("width", labelBBox.width + 8)
                    .attr("height", labelBBox.height + 4);
                
                // Drag behavior
                const drag = d3.drag()
                    .on("drag", function(event) {
                        // Constrain scrubber to chart bounds
                        currentScrubberX = Math.max(0, Math.min(inner_width, event.x));

                        // Update scrubber position
                        scrubberLine
                            .attr("x1", currentScrubberX)
                            .attr("x2", currentScrubberX);

                        scrubberHandle.attr("cx", currentScrubberX);

                        scrubberLabel
                            .attr("x", currentScrubberX)
                            .text(Math.round(xScale.invert(currentScrubberX)));

                        // Update background x position only
                        const labelBBox = scrubberLabel.node().getBBox();
                        scrubberLabelBg.attr("x", labelBBox.x - 4);

                        // Update intersections and emit events
                        updateScrubberState(currentScrubberX);
                    });
                
                // Apply drag behavior to both line and handle
                scrubberLine.call(drag);
                scrubberHandle.call(drag);

                // Initialize scrubber state
                updateScrubberState(currentScrubberX);
            } else {
                // Even without scrubber, emit initial data for linked components
                dispatch.call("scrubberMove", null, {
                    position: null,
                    intersectedData: data  // All data when no scrubber
                });
            }
            
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
            
            
            // Add axis labels to middle layer
            if (yAxisLabel !== null) {
                const yLabel = titleGroup.append("text")
                    .attr("class", "axis-label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 20)
                    .attr("x", -containerHeight / 2)
                    .style("text-anchor", "middle")
                    .style("font-size", `${axisFontSize}px`)
                    .text(yAxisLabel);
                if (axisFontFamily) {
                    yLabel.style("font-family", axisFontFamily);
                }
            }

            if (xAxisLabel !== null) {
                const xLabel = titleGroup.append("text")
                    .attr("class", "axis-label")
                    .attr("x", containerWidth / 2)
                    .attr("y", containerHeight - 10)
                    .style("text-anchor", "middle")
                    .style("font-size", `${axisFontSize}px`)
                    .text(xAxisLabel);
                if (axisFontFamily) {
                    xLabel.style("font-family", axisFontFamily);
                }
            }
            
            // Helper function to get mouse position relative to container
            function getRelativeMousePosition(event) {
                const containerRect = container.node().getBoundingClientRect();
                
                return {
                    x: event.clientX - containerRect.left,
                    y: event.clientY - containerRect.top
                };
            }
            
            // Helper function to position tooltip within bounds
            function positionTooltip(mousePos, tooltipNode) {
                const tooltipRect = tooltipNode.getBoundingClientRect();
                
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
            if (interactiveMode) {
                barsGroup.selectAll(".bar")
                    .on("mouseover", function(event, d) {
                    d3.select(this)
                        .interrupt("scrubber")  // Cancel scrubber transitions
                        .interrupt("hover")     // Cancel any existing hover transitions
                        .attr("opacity", 0.8)
                        .attr("stroke", "#333")
                        .attr("stroke-width", 2);
                    
                    // Create enhanced tooltip content
                    const barColor = getBarColor(d);
                    const tooltipContent = `
                        <div style="border-left: 4px solid ${barColor}; padding-left: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                <div style="width: 12px; height: 12px; background-color: ${barColor}; border-radius: 2px;"></div>
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
                        .duration(100)
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
                    // Reset to scrubber-determined opacity
                    const isIntersected = scrubberEnabled ? checkIntersection(d, currentScrubberX) : true;
                    const targetOpacity = isIntersected ? 1.0 : 0.3;

                    d3.select(this)
                        .transition()
                        .duration(100)
                        .attr("opacity", scrubberEnabled ? targetOpacity : 1.0)
                        .attr("stroke", "none");

                    // Hide tooltip
                    tooltip.transition()
                        .duration(150)
                        .style("opacity", 0);
                    });
            }
        });
    }
    
    // Getter/setter methods for configuration
    chart.width = function(_) {
        return arguments.length ? (width = _, chart) : width;
    };
    
    chart.scrubberEnabled = function(_) {
        return arguments.length ? (scrubberEnabled = _, chart) : scrubberEnabled;
    };
    
    // Expose event dispatcher for external components
    chart.on = function(type, callback) {
        return dispatch.on(type, callback);
    };
    
    chart.padding = function(_) {
        return arguments.length ? (padding = _, chart) : padding;
    };
    
    chart.height = function(_) {
        return arguments.length ? (height = _, chart) : height;
    };

    // Presentation/styling configuration methods
    chart.axisFontSize = function(_) {
        return arguments.length ? (axisFontSize = _, chart) : axisFontSize;
    };

    chart.titleFontSize = function(_) {
        return arguments.length ? (titleFontSize = _, chart) : titleFontSize;
    };

    chart.title = function(_) {
        return arguments.length ? (titleText = _, chart) : titleText;
    };

    chart.xAxisLabel = function(_) {
        return arguments.length ? (xAxisLabel = _, chart) : xAxisLabel;
    };

    chart.yAxisLabel = function(_) {
        return arguments.length ? (yAxisLabel = _, chart) : yAxisLabel;
    };

    chart.showGridLines = function(_) {
        return arguments.length ? (showGridLines = _, chart) : showGridLines;
    };

    chart.categoryBackgroundOpacity = function(even, odd) {
        return arguments.length ? (categoryBackgroundOpacity = [even, odd], chart) : categoryBackgroundOpacity;
    };

    chart.interactiveMode = function(_) {
        return arguments.length ? (interactiveMode = _, chart) : interactiveMode;
    };

    chart.colorScheme = function(_) {
        return arguments.length ? (colorScheme = _, chart) : colorScheme;
    };

    chart.centerCategoryLabels = function(_) {
        return arguments.length ? (centerCategoryLabels = _, chart) : centerCategoryLabels;
    };

    chart.titleFontFamily = function(_) {
        return arguments.length ? (titleFontFamily = _, chart) : titleFontFamily;
    };

    chart.axisFontFamily = function(_) {
        return arguments.length ? (axisFontFamily = _, chart) : axisFontFamily;
    };

    chart.fontUrl = function(_) {
        return arguments.length ? (fontUrl = _, chart) : fontUrl;
    };

    return chart;
    }

    // Return the ganttChart function
    return ganttChart;
});