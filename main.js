// basic setup stuff
const margin = { top: 50, right: 30, bottom: 60, left: 70 };
const width = 900 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select("#lineChart1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// load the data
// had to add timestamp cuz browser was caching an old csv file and only showing 2 cities
d3.csv("weather.csv?v=" + new Date().getTime()).then(data => {
    // clean da data
    data.forEach(d => {
        d.date = new Date(d.date);
        d.actual_mean_temp = +d.actual_mean_temp;
    });
    
    const groupedData = d3.group(data, d => d.city);
    
    const cityData = Array.from(groupedData, ([city, values]) => ({
        city,
        values: values.sort((a, b) => a.date - b.date)
    }));

    // set up scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.actual_mean_temp) + 5])
        .range([height, 0]);

    const colorScale = d3.scaleOrdinal()
        .domain(cityData.map(d => d.city))
        .range(d3.schemeCategory10);

    // line drawing
    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.actual_mean_temp));

    // create tooltip div
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

    // draw the lines for each city
    const lines = svg.selectAll("path")
        .data(cityData)
        .enter()
        .append("path")
        .attr("d", d => line(d.values))
        .style("stroke", d => colorScale(d.city))
        .style("fill", "none")
        .style("stroke-width", 2)
        .attr("class", "temperature-line")
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`<strong>${d.city}</strong><br/>
                         Temperature: ${d3.format(".1f")(d.values[0].actual_mean_temp)}°F<br/>
                         Date: ${d.values[0].date.toLocaleDateString()}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .call(d3.axisLeft(yScale));

    // labels!
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .text("Date");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .text("Temperature (°F)");

    // legend
    const legend = svg.selectAll(".legend")
        .data(cityData)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${width - 120}, ${i * 15 - 80})`);

    legend.append("rect")
        .attr("x", 10)
        .attr("width", 8)
        .attr("height", 8)
        .style("fill", d => colorScale(d.city));

    legend.append("text")
        .attr("x", 25)
        .attr("y", 8)
        .attr("text-anchor", "start")
        .style("alignment-baseline", "middle")
        .style("font-size", "12px")
        .text(d => d.city);

    // calculates trendline for a city
    function calculateTrendline(cityValues) {
        // instead of calculating a linear regression im use a moving average
        // to smooth out the data so the shapes are a little more similar
        const windowSize = 30; //using 30 for less detail so there's a little less nuance in the shape
        const smoothedData = [];
        
        for (let i = 0; i < cityValues.length; i++) {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(cityValues.length, i + Math.floor(windowSize / 2) + 1);
            const window = cityValues.slice(start, end);
            
            const avgTemp = d3.mean(window, d => d.actual_mean_temp);
            smoothedData.push({
                date: cityValues[i].date,
                actual_mean_temp: avgTemp
            });
        }
        
        return smoothedData;
    }

    function drawTrendlines() {
        svg.selectAll(".trendline").remove();
        
        cityData.forEach(city => {
            const trendlineData = calculateTrendline(city.values);
            
            // curve interpolation
            const trendline = d3.line()
                .x(d => xScale(d.date))
                .y(d => yScale(d.actual_mean_temp))
                .curve(d3.curveBasis);
            
            svg.append("path")
                .datum(trendlineData)
                .attr("class", "trendline")
                .attr("d", trendline)
                .style("stroke", colorScale(city.city))
                .style("stroke-width", 1.5)
                .style("stroke-dasharray", "5,5")
                .style("fill", "none")
                .on("mouseover", function(event) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(`<strong>${city.city} Trend</strong><br/>
                                Average Temperature: ${d3.format(".1f")(d3.mean(trendlineData, d => d.actual_mean_temp))}°F`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mousemove", function(event) {
                    tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        });
    }

    function calculateAverageTrendline() {
        const allDates = Array.from(new Set(data.map(d => d.date.getTime())))
            .map(t => new Date(t))
            .sort((a, b) => a - b);
        
        const avgData = allDates.map(date => {
            const tempsOnDate = data.filter(d => d.date.getTime() === date.getTime())
                .map(d => d.actual_mean_temp);
            return {
                date: date,
                actual_mean_temp: d3.mean(tempsOnDate)
            };
        });
        
        // apply the same smoothing as individual trendlines
        const windowSize = 30;
        const smoothedData = [];
        
        for (let i = 0; i < avgData.length; i++) {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(avgData.length, i + Math.floor(windowSize / 2) + 1);
            const window = avgData.slice(start, end);
            
            const avgTemp = d3.mean(window, d => d.actual_mean_temp);
            smoothedData.push({
                date: avgData[i].date,
                actual_mean_temp: avgTemp
            });
        }
        
        return smoothedData;
    }

    function drawAverageTrendline() {
        svg.selectAll(".avg-trendline").remove();
        
        const avgTrendlineData = calculateAverageTrendline();
        
        const avgTrendline = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.actual_mean_temp))
            .curve(d3.curveBasis);
        
        svg.append("path")
            .datum(avgTrendlineData)
            .attr("class", "avg-trendline")
            .attr("d", avgTrendline)
            .style("stroke", "#FFD700")
            .style("stroke-width", 4)
            .style("stroke-dasharray", "5,5")
            .style("fill", "none")
            .style("filter", "drop-shadow(0px 0px 2px rgba(0,0,0,0.3))")
            .on("mouseover", function(event) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`<strong>Overall Average Trend</strong><br/>
                            Average Temperature: ${d3.format(".1f")(d3.mean(avgTrendlineData, d => d.actual_mean_temp))}°F`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }

    d3.select("#trendline-toggle").on("change", function() {
        const isChecked = d3.select(this).property("checked");
        if (isChecked) {
            drawTrendlines();
        } else {
            svg.selectAll(".trendline").remove();
        }
    });

    d3.select("#lines-toggle").on("change", function() {
        const isChecked = d3.select(this).property("checked");
        svg.selectAll(".temperature-line")
            .style("opacity", isChecked ? 1 : 0);
    });

    d3.select("#avg-trendline-toggle").on("change", function() {
        const isChecked = d3.select(this).property("checked");
        if (isChecked) {
            drawAverageTrendline();
        } else {
            svg.selectAll(".avg-trendline").remove();
        }
    });

}).catch(error => {
    console.error("Error loading data:", error);
});
