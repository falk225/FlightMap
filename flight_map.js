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

    //var projection= d3.geo.mercator()
    //                    .scale(100)
                        //.translate(1,1);
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

    function populate_map(flight_data) {

        function plot_airports(airport_data) {
            //filters to continental US plus alasaka and hawaii
            var filtered = airport_data.filter(function(d) {
                            return (d.values.long > -172 &&
                                d.values.long < -63 &&
                                d.values.lat > 19 &&
                                d.values.lat < 72);
            });

            svg.append('g')
                .attr('class','airports')
                .selectAll('ellipse')
                .data(filtered)
                //.data(flight_data)
                .enter()
                .append('ellipse')
                .attr('rx',5)
                .attr('ry',2)
                .attr('cx', function(d){
                    return projection([d.values.long, d.values.lat])[0];
                })
                .attr('cy', function(d){
                    return projection([d.values.long, d.values.lat])[1];
                });
        };

        function plot_bars(bar_data, isOrigin){

        }
        /*
        var ap_codes = [];
        var airports=[];

        flight_data.forEach(function(d) {
            if(ap_codes.includes(d.Origin)=== false){
                ap_codes.push(d.Origin);
                airports.push([d.Origin, d.OrigLong, d.OrigLat]);
            };
            if(ap_codes.includes(d.Dest)=== false){
                ap_codes.push(d.Dest);
                airports.push([d.Dest, d.DestLong, d.DestLat]);
            };
        });
*/
        function groupby_orig(data){
            var n = d3.sum(data,function(d){
                            return d['n'];
                        });
            var long = data[0].OrigLong;
            var lat = data[0].OrigLat;
            return {
                    'n' : n,
                    'long' : long,
                    'lat' : lat
                    };
        };

        function groupby_dest(data){
            var n = d3.sum(data,function(d){
                            return d['n'];
                        });
            var long = data[0].DestLong;
            var lat = data[0].DestLat;
            return {
                    'n' : n,
                    'long' : long,
                    'lat' : lat
                    };
        };

        var orig_airports = d3.nest()
                    .key(function(d) {
                        return d.Origin;
                    })
                    .rollup(groupby_orig)
                    .entries(flight_data);

        var dest_airports = d3.nest()
                    .key(function(d) {
                        return d.Dest;
                    })
                    .rollup(groupby_dest)
                    .entries(flight_data);


        plot_airports(dest_airports);
    }

    d3.csv("flight_data.csv", populate_map);
}