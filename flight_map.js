function draw_map(geo_data) {
    "use strict";
    var margin = 75,
        width = 1100 - margin,
        height = 600 - margin;

    var body =d3.select("body");

    body.append('h1')
        .attr('class', 'map_title')
        .attr('align', 'center')
        .text('Flight Map 1987');

    body.append('h2')
        .attr('class', 'time')
        .attr('align','center');

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
        //filters to continental US plus alasaka and hawaii
        var flight_data_filtered=flight_data.filter(function(d){
            return(d.OrigLong > -172 &&
                    d.OrigLong < -63 &&
                    d.OrigLat > 19 &&
                    d.OrigLat < 72 &&
                    d.DestLong > -172 &&
                    d.DestLong < -63 &&
                    d.DestLat > 19 &&
                    d.DestLat < 72);
        });

        function plot_airports(airport_data) {
            svg.append('g')
                .attr('class','airports')
                .selectAll('ellipse')
                .data(airport_data)
                .enter()
                .append('ellipse')
                .attr('rx',6)
                .attr('ry',2)
                .attr('cx', function(d){
                    return projection([d.long, d.lat])[0];
                })
                .attr('cy', function(d){
                    return projection([d.long, d.lat])[1];
                });

            svg.append('g')
                .attr('class','bars');
        };

        function update_bars(bar_data, isOrigin, hour){

            var bar_data_filtered= bar_data.find(function(d){
                return d.key==hour;
            });
            if (isOrigin) {
                var name='origin';
                var adj= -5;
            } else {
                var name='dest';
                var adj= 1;
            };
            var time_msg=""

            if (hour>12) {
                time_msg = hour-12 +":00 PM";
            } else {
                time_msg=  hour + ":00 AM";
            };

            d3.select('.time')
                .transition()
                .duration(500)
                .text(time_msg);

            var bars= svg.select('.bars')
                .selectAll('rect.'+name+'_bar')
                .data(bar_data_filtered.values, function key_func(d){
                    return name+d.key;
                });

            bars.attr('height', function(d){
                    return bar_scale(d.values.n);
                })
                .attr('y', function(d){
                    return projection([d.values.long, d.values.lat])[1] - bar_scale(d.values.n);
                });

            bars.enter()
                .append('rect')
                .transition()
                .duration(1000)
                .attr('class', name+'_bar')
                .attr('x',function(d){
                    return adj + projection([d.values.long, d.values.lat])[0];
                })
                .attr('y', function(d){
                    return projection([d.values.long, d.values.lat])[1] - bar_scale(d.values.n);
                })
                .attr('width', 5)
                .attr('height', function(d){
                    return bar_scale(d.values.n);
                });

            bars.exit()
                .transition()
                .duration(1000)
                .remove();

            /*bars.update()
                .transition()
                .duration(1000)
                .attr('height', function(d){
                    return bar_scale(d.values.n);
                });*/



        }

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

        var all_airports=[];

        function add_airport(airport_code, long, lat){
            if(all_airports.find(function(d){return d.key==airport_code;})===undefined){
                all_airports.push({key : airport_code,
                                    long : long,
                                    lat : lat});
            };
        }

        flight_data_filtered.forEach(function(d){
            add_airport(d.Origin, d.OrigLong, d.OrigLat);
            add_airport(d.Dest, d.DestLong, d.DestLat);
        });

        var orig_airports_by_hour = d3.nest()
                    .key(function(d) {
                        return d.DepHour;
                    })
                    .key(function(d) {
                        return d.Origin;
                    })
                    .rollup(groupby_orig)
                    .entries(flight_data_filtered);

        var dest_airports_by_hour = d3.nest()
                    .key(function (d) {
                        return d.ArrHour;
                    })
                    .key(function(d) {
                        return d.Dest;
                    })
                    .rollup(groupby_dest)
                    .entries(flight_data_filtered);

        var n_values=[]
        orig_airports_by_hour.forEach(function(airports_hour){
            airports_hour.values.forEach(function(airport){
                n_values.push(airport.values.n);
            });
        });
        /*
        dest_airports_by_hour.forEach(function(d){
            d.forEach(function(d){
                n_values.push(d.values.n);
            });
        });
        */
        var bar_extent = d3.extent(n_values);

        var bar_scale = d3.scale.linear()
                            .range([2,50])
                            .domain(bar_extent);

        var hours = [];

        function populate_hours(start, n_steps){
            hours=[]
            var current=start;
            for (var i=0; i <n_steps; i++ ){
                if (current<=23) {
                    hours.push(current);
                    current++;
                } else {
                    hours.push(0);
                    current=1;
                };
            };
        }

        plot_airports(all_airports);

        var hours_idx=0;
        populate_hours(4,24);
        var hour_interval=setInterval(function() {
            update_bars(orig_airports_by_hour, true,hours[hours_idx]);
            update_bars(dest_airports_by_hour, false,hours[hours_idx]);
            hours_idx++;
            if(hours_idx >= hours.length) {
                clearInterval(hour_interval);
            };
        },1000);


        //update_bars(orig_airports_by_hour, true, 12);
        //update_bars(dest_airports_by_hour, false, 12);
    }

    d3.csv("flight_data.csv", populate_map);
}