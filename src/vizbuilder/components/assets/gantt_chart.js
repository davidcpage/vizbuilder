define(['d3'], function(d3) {
    // ========================================================================
    // Helper Functions (Module-level utilities)
    // ========================================================================

    /**
     * Loads a custom font from a URL (CSS file or direct font file)
     * @param {string} fontUrl - URL to font file (.woff2) or CSS file (Google Fonts)
     * @param {string} fontFamily - Font family name (e.g., "Virgil", "Kalam")
     * @returns {void}
     */
    function loadCustomFont(fontUrl, fontFamily) {
        if (!fontUrl || !fontFamily) return;

        // Check if font is already loaded
        const fontId = `font-${fontFamily.replace(/\s+/g, '-')}`;
        if (document.getElementById(fontId)) return;

        // Check if fontUrl is a CSS file (like Google Fonts) or a direct font file
        if (fontUrl.includes('.css') || fontUrl.includes('fonts.googleapis.com')) {
            // Load CSS file (e.g., Google Fonts)
            const link = document.createElement('link');
            link.id = fontId;
            link.rel = 'stylesheet';
            link.href = fontUrl;
            document.head.appendChild(link);
        } else {
            // Direct font file (e.g., .woff2)
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

    /**
     * Creates X-axis scale based on data range
     * @param {Array} data - Chart data
     * @param {number} innerWidth - Available width for chart
     * @returns {d3.Scale} Linear scale for X-axis
     */
    function createXScale(data, innerWidth) {
        const xMax = d3.max(data, d => d.start + d.duration);
        return d3.scaleLinear()
            .domain([-xMax * 0.01, xMax * 1.01])
            .range([0, innerWidth]);
    }

    /**
     * Renders the X-axis with support for custom fonts
     * @param {d3.Selection} group - SVG group for axis
     * @param {d3.Scale} xScale - X-axis scale
     * @param {number} innerHeight - Chart inner height
     * @param {Object} config - Configuration object with { numXTicks, axisFontSize, fontFamily }
     * @returns {void}
     */
    function renderXAxis(group, xScale, innerHeight, { numXTicks, axisFontSize, fontFamily }) {
        const xAxisBottom = d3.axisBottom(xScale)
            .tickSize(0)
            .ticks(numXTicks);

        group.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(xAxisBottom)
            .call(g => g.selectAll(".domain").remove())
            .call(g => {
                g.selectAll("text").style("font-size", `${axisFontSize}px`);
                if (fontFamily) {
                    g.selectAll("text").style("font-family", fontFamily);
                }
            });
    }

    /**
     * Creates appropriate y-axis scale(s) based on data structure
     * @param {Array} data - Chart data
     * @param {number} innerHeight - Available height for chart
     * @returns {Object} { yScale, categoryScale, subcategoryScales }
     */
    function createYScale(data, innerHeight) {
        // Extract unique categories from data
        const categories = Array.from(new Set(data.map(d => d.category)));

        // Check if data has subcategories
        const hasSubcategories = data.some(d => d.subcategory !== undefined);

        if (hasSubcategories) {
            // Create nested scales for categories and subcategories

            // Group data by category to find subcategories for each
            const categoryGroups = d3.group(data, d => d.category);
            const subcategoriesPerCategory = new Map();
            categoryGroups.forEach((items, category) => {
                const subcats = Array.from(new Set(items.map(d => d.subcategory)));
                subcategoriesPerCategory.set(category, subcats);
            });

            // Create category scale (outer scale)
            const categoryScale = d3.scaleBand()
                .domain(categories)
                .range([innerHeight, 0]);

            // Create subcategory scales (inner scales) for each category
            const subcategoryScales = new Map();
            categories.forEach(category => {
                const subcats = subcategoriesPerCategory.get(category);
                const scale = d3.scaleBand()
                    .domain(subcats)
                    .range([categoryScale.bandwidth(), 0])
                    .padding(0.1);
                subcategoryScales.set(category, scale);
            });

            // Create combined yScale function for positioning bars
            const yScale = function(d) {
                const categoryY = categoryScale(d.category);
                const subcategoryY = subcategoryScales.get(d.category)(d.subcategory);
                return categoryY + subcategoryY;
            };
            yScale.bandwidth = function(d) {
                return subcategoryScales.get(d.category).bandwidth();
            };

            return { yScale, categoryScale, subcategoryScales };
        } else {
            // Single-level scale
            const categoryScale = d3.scaleBand()
                .domain(categories)
                .range([innerHeight, 0])
                .padding(0.2);

            return { yScale: categoryScale, categoryScale, subcategoryScales: null };
        }
    }

/**
     * Adds grid lines to the chart
     * @param {d3.Selection} group - SVG group to add grid to
     * @param {d3.Scale} xScale - X-axis scale
     * @param {number} innerHeight - Chart inner height
     * @param {Object} config - Configuration object with { numXTicks }
     * @returns {void}
     */
    function addGridLines(group, xScale, innerHeight, { numXTicks }) {
        const xGrid = d3.axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat("")
            .ticks(numXTicks)
            .tickSizeOuter(0);

        group.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(xGrid)
            .call(g => g.selectAll(".domain").remove())
            .selectAll("line")
            .attr("class", "grid-line")
            .attr("stroke", "white")
            .attr("stroke-width", 3);
    }

    /**
     * Adds alternating background rectangles for category groups
     * @param {d3.Selection} group - SVG group to add backgrounds to
     * @param {d3.Scale} categoryScale - Category scale
     * @param {number} innerWidth - Chart inner width
     * @param {Object} config - Configuration object with { categoryBackgroundOpacity }
     * @returns {void}
     */
    function addCategoryBackgrounds(group, categoryScale, innerWidth, { categoryBackgroundOpacity }) {
        const opacities = categoryBackgroundOpacity;
        const categoryBackgrounds = group.append("g")
            .attr("class", "category-backgrounds");

        categoryBackgrounds.selectAll(".category-bg")
            .data(categoryScale.domain())
            .enter()
            .append("rect")
            .attr("class", "category-bg")
            .attr("x", 0)
            .attr("y", d => categoryScale(d))
            .attr("width", innerWidth)
            .attr("height", d => categoryScale.bandwidth())
            .attr("fill", (d, i) => i % 2 === 0 ?
                `rgba(255, 255, 255, ${opacities[0]})` :
                `rgba(0, 0, 0, ${opacities[1]})`)
            .attr("stroke", "none");
    }

    /**
     * Renders the Y-axis with support for simple or nested categories
     * @param {d3.Selection} group - SVG group for axis
     * @param {Object} scaleInfo - Object containing yScale, categoryScale, subcategoryScales
     * @param {Object} config - Configuration object with { axisFontSize, fontFamily, centerCategoryLabels }
     * @returns {void}
     */
    function renderYAxis(group, scaleInfo, { axisFontSize, fontFamily, centerCategoryLabels }) {
        const { yScale, categoryScale, subcategoryScales } = scaleInfo;
        const hasSubcategories = subcategoryScales !== null;

        if (hasSubcategories) {
            // Custom y-axis with centered category labels
            const yAxis = group.append("g")
                .attr("class", "axis");

            yAxis.selectAll(".tick")
                .data(categoryScale.domain())
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
                .style("font-family", fontFamily || null)
                .text(d => d);
        } else {
            // Original y-axis for non-subcategory data
            const yAxisLeft = d3.axisLeft(yScale)
                .tickSize(0);

            group.append("g")
                .attr("class", "axis")
                .call(yAxisLeft)
                .call(g => g.selectAll(".domain").remove())
                .call(g => {
                    const textElements = g.selectAll("text")
                        .style("font-size", `${axisFontSize}px`)
                        .attr("x", centerCategoryLabels ? -20 : null)
                        .style("text-anchor", centerCategoryLabels ? "middle" : null);
                    if (fontFamily) {
                        textElements.style("font-family", fontFamily);
                    }
                });
        }
    }

    /**
     * Creates a function to determine bar colors
     * @param {Array|null} colorScheme - Array of colors or null to use data colors
     * @param {d3.Scale} categoryScale - Category scale (used to get category order)
     * @returns {Function} Function that takes data point and returns color
     */
    function createColorMapper(colorScheme, categoryScale) {
        if (colorScheme !== null) {
            // Map categories to colors from the scheme
            const categoryToColorIndex = new Map();
            categoryScale.domain().forEach((cat, i) => {
                categoryToColorIndex.set(cat, i % colorScheme.length);
            });
            return d => colorScheme[categoryToColorIndex.get(d.category)];
        } else {
            // Use colors from data
            return d => d.color;
        }
    }


    /**
     * Creates and configures a tooltip element
     * @param {d3.Selection} container - D3 selection of container element
     * @returns {d3.Selection} Configured tooltip selection
     */
    function createTooltip(container) {
        return container.append("div")
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
    }

    /**
     * Positions tooltip within container bounds
     * @param {Object} mousePos - {x, y} mouse position
     * @param {DOMRect} tooltipRect - Tooltip bounding rect
     * @param {number} containerWidth - Container width
     * @param {number} containerHeight - Container height
     * @returns {Object} {x, y} position for tooltip
     */
    function positionTooltip(mousePos, tooltipRect, containerWidth, containerHeight) {
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

    /**
     * Generates HTML content for tooltip
     * @param {Object} d - Data point
     * @param {Function} getBarColor - Function to get bar color
     * @returns {string} HTML string for tooltip content
     */
    function generateTooltipContent(d, getBarColor) {
        const barColor = getBarColor(d);
        return `
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
    }

        /**
     * Checks if timeline entry intersects with scrubber position
     * @param {Object} d - Data point with start and duration
     * @param {number} scrubberPosition - Scrubber position in pixels
     * @param {d3.Scale} xScale - X-axis scale
     * @returns {boolean} True if intersected
     */
    function checkScrubberIntersection(d, scrubberPosition, xScale) {
        const entryStart = xScale(d.start);
        const entryEnd = xScale(d.start + d.duration);
        return scrubberPosition >= entryStart && scrubberPosition <= entryEnd;
    }

    /**
     * Updates bar opacity and emits scrubber events based on position
     * @param {d3.Selection} bars - Selection of bar elements
     * @param {number} scrubberPosition - Scrubber position in pixels
     * @param {d3.Scale} xScale - X-axis scale
     * @param {Array} data - Chart data
     * @param {d3.Dispatch} dispatch - Event dispatcher
     * @returns {Array} Array of intersected data points
     */
    function updateScrubberState(bars, scrubberPosition, xScale, data, dispatch) {
        const intersectedData = [];

        // Update bar opacity based on intersection
        bars.transition("scrubber")
            .duration(50)
            .attr("opacity", function(d) {
                const isIntersected = checkScrubberIntersection(d, scrubberPosition, xScale);
                if (isIntersected) {
                    intersectedData.push(d);
                    return 1.0;
                }
                return 0.3;
            });

        // Emit event with intersected data
        const scrubberValue = xScale.invert(scrubberPosition);
        dispatch.call("scrubberMove", null, {
            position: scrubberValue,
            intersectedData: intersectedData
        });

        return intersectedData;
    }

    /**
     * Adds axis labels to the chart
     * @param {d3.Selection} group - SVG group for labels
     * @param {number} containerWidth - Container width
     * @param {number} containerHeight - Container height
     * @param {Object} config - Configuration object with { xAxisLabel, yAxisLabel, axisFontSize, fontFamily }
     * @returns {void}
     */
    function addAxisLabels(group, containerWidth, containerHeight, { xAxisLabel, yAxisLabel, axisFontSize, fontFamily }) {

        if (yAxisLabel !== null) {
            const yLabel = group.append("text")
                .attr("class", "axis-label")
                .attr("transform", "rotate(-90)")
                .attr("y", 20)
                .attr("x", -containerHeight / 2)
                .style("text-anchor", "middle")
                .style("font-size", `${axisFontSize}px`)
                .text(yAxisLabel);
            if (fontFamily) {
                yLabel.style("font-family", fontFamily);
            }
        }

        if (xAxisLabel !== null) {
            const xLabel = group.append("text")
                .attr("class", "axis-label")
                .attr("x", containerWidth / 2)
                .attr("y", containerHeight - 10)
                .style("text-anchor", "middle")
                .style("font-size", `${axisFontSize}px`)
                .text(xAxisLabel);
            if (fontFamily) {
                xLabel.style("font-family", fontFamily);
            }
        }
    }

    /**
     * Creates interactive scrubber with drag behavior
     * @param {d3.Selection} scrubberGroup - SVG group for scrubber elements
     * @param {d3.Selection} bars - Selection of bar elements
     * @param {d3.Scale} xScale - X-axis scale
     * @param {number} innerWidth - Chart inner width
     * @param {number} innerHeight - Chart inner height
     * @param {Array} data - Chart data
     * @param {d3.Dispatch} dispatch - Event dispatcher
     * @param {number} initialPosition - Initial scrubber position (0-1)
     * @returns {Object} { scrubberLine, scrubberHandle, scrubberLabel, scrubberLabelBg, currentX }
     */
    function createScrubber(scrubberGroup, bars, xScale, innerWidth, innerHeight, data, dispatch, initialPosition) {
        let currentScrubberX = innerWidth * initialPosition;

        // Scrubber line
        const scrubberLine = scrubberGroup.append("line")
            .attr("class", "scrubber-line")
            .attr("x1", currentScrubberX)
            .attr("x2", currentScrubberX)
            .attr("y1", 0)
            .attr("y2", innerHeight)
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
                currentScrubberX = Math.max(0, Math.min(innerWidth, event.x));

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
                updateScrubberState(bars, currentScrubberX, xScale, data, dispatch);
            });

        // Apply drag behavior to both line and handle
        scrubberLine.call(drag);
        scrubberHandle.call(drag);

        // Initialize scrubber state
        updateScrubberState(bars, currentScrubberX, xScale, data, dispatch);

        return { scrubberLine, scrubberHandle, scrubberLabel, scrubberLabelBg, currentX: currentScrubberX };
    }

    /**
     * Sets up zoom behavior for interactive chart navigation
     * @param {d3.Selection} svg - SVG element
     * @param {Object} targetGroups - { barsGroup, scrubberGroup } to be transformed
     * @param {Object} margin - Margin configuration
     * @param {boolean} interactiveMode - Whether to enable zoom
     * @returns {void}
     */
    function setupZoomBehavior(svg, targetGroups, margin, interactiveMode) {
        const { barsGroup, scrubberGroup } = targetGroups;

        if (interactiveMode) {
            const zoom = d3.zoom()
                .scaleExtent([0.1, 10])
                .on("zoom", function(event) {
                    barsGroup.attr("transform", event.transform);
                    scrubberGroup.attr("transform", event.transform);
                });

            svg.call(zoom)
                .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));
        } else {
            barsGroup.attr("transform", `translate(${margin.left},${margin.top})`);
            scrubberGroup.attr("transform", `translate(${margin.left},${margin.top})`);
        }
    }

    /**
     * Renders timeline bars
     * @param {d3.Selection} group - SVG group for bars
     * @param {Array} data - Chart data
     * @param {d3.Scale} xScale - X-axis scale
     * @param {Object} scaleInfo - { yScale, subcategoryScales }
     * @param {Function} getBarColor - Function to get bar color
     * @returns {d3.Selection} Selection of bar elements
     */
    function renderBars(group, data, xScale, scaleInfo, getBarColor) {
        const { yScale, subcategoryScales } = scaleInfo;
        const hasSubcategories = subcategoryScales !== null;
    
        // Add text labels on bars
        //group.selectAll(".bar-text")
        //    .data(data.filter(d => d.text !== ""))
        //    .enter()
        //    .append("text")
        //    .attr("class", "bar-text")
        //    .attr("x", d => xScale(d.start + d.duration / 2))
        //    .attr("y", d => yScale(d.category) + yScale.bandwidth() / 2)
        //    .attr("text-anchor", "middle")
        //   .attr("dominant-baseline", "middle")
        //    .text(d => d.text);

        return group.selectAll(".bar")
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
    }

    /**
     * Renders chart title
     * @param {d3.Selection} group - SVG group for title
     * @param {number} containerWidth - Container width for centering
     * @param {Object} config - Configuration object with { title, titleFontSize, fontFamily }
     * @returns {void}
     */
    function renderTitle(group, containerWidth, { title, titleFontSize, fontFamily }) {

        if (title !== null) {
            const titleElement = group.append("text")
                .attr("class", "title")
                .attr("x", containerWidth / 2)
                .attr("y", 25)
                .attr("text-anchor", "middle")
                .style("font-size", `${titleFontSize}px`)
                .text(title);

            if (fontFamily) {
                titleElement.style("font-family", fontFamily);
            }
        }
    }

    /**
     * Adds hover interactions and tooltips to bars
     * @param {d3.Selection} bars - Selection of bar elements
     * @param {d3.Selection} tooltip - Tooltip element
     * @param {Function} getBarColor - Function to get bar color
     * @param {boolean} scrubberEnabled - Whether scrubber is enabled
     * @param {number} currentScrubberX - Current scrubber position
     * @param {d3.Scale} xScale - X-axis scale
     * @param {Object} containerDimensions - { width, height }
     * @param {Function} getRelativeMousePosition - Function to get mouse position
     * @returns {void}
     */
    function addBarInteractivity(bars, tooltip, getBarColor, scrubberEnabled, currentScrubberX, xScale, containerDimensions, getRelativeMousePosition) {
        bars.on("mouseover", function(event, d) {
            d3.select(this)
                .interrupt("scrubber")  // Cancel scrubber transitions
                .interrupt("hover")     // Cancel any existing hover transitions
                .attr("opacity", 0.8)
                .attr("stroke", "#333")
                .attr("stroke-width", 2);

            // Create enhanced tooltip content
            const tooltipContent = generateTooltipContent(d, getBarColor);
            tooltip.html(tooltipContent);

            // Position tooltip
            const mousePos = getRelativeMousePosition(event);
            const tooltipPos = positionTooltip(mousePos, tooltip.node().getBoundingClientRect(), containerDimensions.width, containerDimensions.height);

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
            const tooltipPos = positionTooltip(mousePos, tooltip.node().getBoundingClientRect(), containerDimensions.width, containerDimensions.height);

            tooltip
                .style("left", tooltipPos.x + "px")
                .style("top", tooltipPos.y + "px");
        })
        .on("mouseout", function(event, d) {
            // Reset to scrubber-determined opacity
            const isIntersected = scrubberEnabled ? checkScrubberIntersection(d, currentScrubberX, xScale) : true;
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

    // ========================================================================
    // Main Component Factory
    // ========================================================================

    function ganttChart() {
        // Default configuration
        const margin = {top: 60, right: 40, bottom: 60, left: 60};

        // Event dispatcher for component communication
        const dispatch = d3.dispatch("scrubberMove", "scrubberStart", "scrubberEnd");

        // Configuration object with default values
        const config = {
        width: null,
        height: 300,
        padding: 0.2,
        scrubberEnabled: true,
        axisFontSize: 12,
        titleFontSize: 15,
        title: "timeline",
        xAxisLabel: "x-axis",
        yAxisLabel: "y-axis",
        numXTicks: 8, // Number of ticks on X-axis
        showGridLines: true,
        categoryBackgroundOpacity: [0.3, 0.05], // [even, odd] indices
        interactiveMode: true,
        colorScheme: null, // Can be an array of colors or null to use data colors
        centerCategoryLabels: false, // If true, category labels are centered horizontally
        fontFamily: null, // Font family for all text (e.g., "Virgil, sans-serif", "Kalam, cursive")
        fontUrl: null // URL to load custom font - CSS file (Google Fonts) or direct .woff2 file
    };

    function chart(selection) {
        console.log("** Rendering Again **");

        // Load custom font if specified (once per chart call, not per element)
        if (config.fontUrl && config.fontFamily) {
            const fontFamily = config.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
            loadCustomFont(config.fontUrl, fontFamily);
        }

        selection.each(function(data) {
            // Clear existing content
            const container = d3.select(this);
            container.selectAll('*').remove();

            const containerRect = container.node().getBoundingClientRect();
            const containerWidth = config.width || containerRect.width;
            const containerHeight = config.height;
            const inner_width = Math.max(100, containerWidth - margin.left - margin.right);
            const inner_height = Math.max(100, containerHeight - margin.top - margin.bottom);

            // Scales
            const xScale = createXScale(data, inner_width);

            // Create Y scale(s)
            const { yScale, categoryScale, subcategoryScales } = createYScale(data, inner_height);

            // Create tooltip within the container with relative positioning
            const tooltip = createTooltip(container);

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

            // Setup zoom behavior
            setupZoomBehavior(svg, { barsGroup, scrubberGroup }, margin, config.interactiveMode);

            // Add plot area background
            barsGroup.append("rect")
                .attr("class", "plot-area")
                .attr("width", inner_width)
                .attr("height", inner_height)
                .attr("fill", "#f0f1fa");

            // Add alternating background rectangles for category groups (if subcategories exist)
            if (subcategoryScales !== null) {
                addCategoryBackgrounds(barsGroup, categoryScale, inner_width, config);
            }

            // Add grid lines
            if (config.showGridLines) {
                addGridLines(barsGroup, xScale, inner_height, config);
            }

            // Add X axis
            renderXAxis(barsGroup, xScale, inner_height, config);

            // Add Y axis
            const scaleInfo = { yScale, categoryScale, subcategoryScales };
            renderYAxis(barsGroup, scaleInfo, config);

            // Add bars
            const getBarColor = createColorMapper(config.colorScheme, categoryScale);
            const scaleInfoForBars = { yScale, subcategoryScales };
            const bars = renderBars(barsGroup, data, xScale, scaleInfoForBars, getBarColor);

            // Add title to middle layer
            renderTitle(titleGroup, containerWidth, config);

            // Store current scrubber position for bar interactivity
            let currentScrubberX = inner_width * 0.3;

            // Add horizontal scrubber
            // Scrubber requires interactiveMode to be enabled
            if (config.scrubberEnabled && config.interactiveMode) {
                const scrubberResult = createScrubber(scrubberGroup, bars, xScale, inner_width, inner_height, data, dispatch, 0.3);
                currentScrubberX = scrubberResult.currentX;
            } else {
                // Even without scrubber, emit initial data for linked components
                dispatch.call("scrubberMove", null, {
                    position: null,
                    intersectedData: data  // All data when no scrubber
                });
            }
            

            // Add axis labels to middle layer
            addAxisLabels(titleGroup, containerWidth, containerHeight, config);
            
            // Helper function to get mouse position relative to container
            function getRelativeMousePosition(event) {
                const containerRect = container.node().getBoundingClientRect();
                return {
                    x: event.clientX - containerRect.left,
                    y: event.clientY - containerRect.top
                };
            }

            // Add interactivity with tooltips
            if (config.interactiveMode) {
                addBarInteractivity(
                    barsGroup.selectAll(".bar"),
                    tooltip,
                    getBarColor,
                    config.scrubberEnabled,
                    currentScrubberX,
                    xScale,
                    { width: containerWidth, height: containerHeight },
                    getRelativeMousePosition
                );
            }
        });
    }

    /**
     * Creates a getter/setter method for a configuration property
     * @param {string} property - Property name
     * @returns {void}
     */
    function createAccessor(property) {
        chart[property] = function(_) {
            return arguments.length ? (config[property] = _, chart) : config[property];
        };
    }

    // Create getter/setter methods for all config properties
    Object.keys(config).forEach(createAccessor);

    // Expose event dispatcher for external components
    chart.on = function(type, callback) {
        return dispatch.on(type, callback);
    };

    return chart;
    }

    // Return the ganttChart function
    return ganttChart;
});