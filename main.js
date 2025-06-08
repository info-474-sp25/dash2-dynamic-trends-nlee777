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

    svg.selectAll("path")
        .data(cityData)
        .enter()
        .append("path")
        .attr("d", d => line(d.values))
        .style("stroke", d => colorScale(d.city))
        .style("fill", "none")
        .style("stroke-width", 2);

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
}).catch(error => {
    console.error("Error loading data:", error);
});
