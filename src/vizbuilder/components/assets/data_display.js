define(['d3'], function(d3) {
    function dataDisplay() {
    // Default configuration
    const margin = {top: 20, right: 20, bottom: 20, left: 20};
    let width = null;
    let height = 200;
    let title = "Intersected Timeline Entries";
    
    function component(selection) {
        selection.each(function(data) {
            // Clear existing content
            const container = d3.select(this);
            container.selectAll('*').remove();
            
            const containerRect = container.node().getBoundingClientRect();
            const containerWidth = width || containerRect.width;
            const containerHeight = height;
            const inner_width = Math.max(100, containerWidth - margin.left - margin.right);
            const inner_height = Math.max(100, containerHeight - margin.top - margin.bottom);
            
            // Create main container div
            const mainDiv = container
                .append("div")
                .style("width", containerWidth + "px")
                .style("height", containerHeight + "px")
                .style("border", "2px solid #e0e0e0")
                .style("border-radius", "8px")
                .style("background", "#fafafa")
                .style("padding", "15px")
                .style("box-sizing", "border-box")
                .style("font-family", "Arial, sans-serif")
                .style("overflow-y", "auto");
            
            // Add title
            mainDiv.append("h3")
                .style("margin", "0 0 15px 0")
                .style("color", "#333")
                .style("font-size", "16px")
                .style("border-bottom", "2px solid #ff6b35")
                .style("padding-bottom", "8px")
                .text(title);
            
            // Data container
            const dataContainer = mainDiv.append("div")
                .attr("class", "data-container");
            
            // Update function to refresh displayed data
            function updateData(intersectedData) {
                // Clear existing data
                dataContainer.selectAll("*").remove();
                
                if (!intersectedData || intersectedData.length === 0) {
                    dataContainer.append("div")
                        .style("color", "#888")
                        .style("font-style", "italic")
                        .style("text-align", "center")
                        .style("padding", "20px")
                        .text("No timeline entries intersected");
                    return;
                }
                
                // Create cards for each intersected entry
                const cards = dataContainer.selectAll(".data-card")
                    .data(intersectedData)
                    .enter()
                    .append("div")
                    .attr("class", "data-card")
                    .style("background", "white")
                    .style("border", "1px solid #ddd")
                    .style("border-radius", "6px")
                    .style("padding", "12px")
                    .style("margin-bottom", "10px")
                    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
                    .style("transition", "all 0.2s ease");
                
                // Add hover effects
                cards.on("mouseenter", function() {
                        d3.select(this)
                            .style("transform", "translateY(-2px)")
                            .style("box-shadow", "0 4px 8px rgba(0,0,0,0.15)");
                    })
                    .on("mouseleave", function() {
                        d3.select(this)
                            .style("transform", "translateY(0px)")
                            .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");
                    });
                
                // Add content to each card
                cards.each(function(d) {
                    const card = d3.select(this);
                    
                    // Header with category and color indicator
                    const header = card.append("div")
                        .style("display", "flex")
                        .style("align-items", "center")
                        .style("margin-bottom", "8px");
                    
                    header.append("div")
                        .style("width", "12px")
                        .style("height", "12px")
                        .style("background-color", d.color)
                        .style("border-radius", "3px")
                        .style("margin-right", "8px");
                    
                    header.append("strong")
                        .style("font-size", "14px")
                        .style("color", "#333")
                        .text(d.category);
                    
                    // Details grid
                    const details = card.append("div")
                        .style("display", "grid")
                        .style("grid-template-columns", "auto 1fr")
                        .style("gap", "6px 12px")
                        .style("font-size", "12px")
                        .style("color", "#666");
                    
                    // Add detail rows
                    const detailRows = [
                        {label: "Start:", value: Math.round(d.start).toLocaleString()},
                        {label: "Duration:", value: Math.round(d.duration).toLocaleString()},
                        {label: "End:", value: Math.round(d.start + d.duration).toLocaleString()}
                    ];
                    
                    detailRows.forEach(row => {
                        details.append("span").text(row.label);
                        details.append("span")
                            .style("font-weight", "500")
                            .style("color", "#333")
                            .text(row.value);
                    });
                    
                    // Add text if available
                    if (d.text && d.text.trim() !== "") {
                        card.append("div")
                            .style("margin-top", "8px")
                            .style("padding-top", "8px")
                            .style("border-top", "1px solid #eee")
                            .style("font-size", "12px")
                            .style("color", "#555")
                            .style("font-style", "italic")
                            .text(d.text);
                    }
                });
            }
            
            // Store the update function for external access
            container.node().updateData = updateData;
            
            // Initialize with empty data
            updateData([]);
        });
    }
    
    // Getter/setter methods for configuration
    component.width = function(_) {
        return arguments.length ? (width = _, component) : width;
    };
    
    component.height = function(_) {
        return arguments.length ? (height = _, component) : height;
    };
    
    component.title = function(_) {
        return arguments.length ? (title = _, component) : title;
    };

    return component;
    }

    // Return the dataDisplay function
    return dataDisplay;
});