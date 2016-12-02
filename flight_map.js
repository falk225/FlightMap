function draw_map(geo_data) {
    "use strict";
    var margin = 75,
        width = 1100 - margin,
        height = 600 - margin;

    var body =d3.select("body");

    body.append('h2')
        .attr('class', 'map_title')
        .attr('align', 'center')
        .text('Flight Map 1987');

    var svg = body.append("svg")
        .attr("width", width + margin)
        .attr("height", height + margin);

    var map= svg.append('g')
        .attr('class', 'map');

    var projection = d3.geo.albersUsa()
                           .scale(1000);
                           //.translate( [0, 0]);

    var path = d3.geo.path().projection(projection);

    map.selectAll('path')
        .data(geo_data.features)
        .enter()
        .append('path')
        .attr('d', path)
        .style('fill', 'lightBlue')
        .style('stroke', 'black')
        .style('stroke-width', 0.5);

    function plot_airports(flight_data) {
        //restricts to continental US
        var filtered = flight_data.filter(function(d) {
                        return (d.OrigLong>-126 &&
                            d.OrigLong <-63 &&
                            d.OrigLat>24 &&
                            d.OrigLat<50);
                    });

        svg.append('g')
            .attr('class','airports')
            .selectAll('circle')
            .data(filtered)
            .enter()
            .append('circle')
            .attr('r',5)
            .attr('cx', function(d){
                return projection([d.OrigLong, d.OrigLat])[0]
            })
            .attr('cy', function(d){
                return projection([d.OrigLong, d.OrigLat])[1]
            });
    }

    d3.csv("flight_data.csv", plot_airports);
}