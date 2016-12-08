function draw_map(geo_data) {
    "use strict";
    var margin = 75,
        width = 1100 - margin,
        height = 600 - margin;

    var body =d3.select("body");
    var header = body.append('div')
    header.append('h1')
        .attr('class', 'map_title')
        .attr('align', 'center')
        .text('Flight Map 1987');

    var currentHour=1;

    function timeMsg(hour){
        if (hour>12) {
            var time_msg = hour-12 +":00 PM";
        } else {
            var time_msg=  hour + ":00 AM";
        };
        return time_msg;
    }

    header.append('h2')
        .attr('class', 'time')
        .attr('align','center')
        .text(timeMsg(currentHour))
        .style('opacity',0);

    var svg = body.append("svg")
        .attr("width", width + margin)
        .attr("height", height + margin);

    var map= svg.append('g')
        .attr('class', 'map');

    header.insert('button', 'svg')
        .attr('class', 'button button-down')
        .text('<-')
        .style('opacity',0);

    header.insert('button', 'svg')
        .attr('class', 'button button-up')
        .text('->')
        .style('opacity',0);


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

        svg.append('g')
                .attr('class','airports')

        svg.append('g')
                .attr('class','bars');

        function update_airports(airport_data) {
            var airports= svg.select('.airports')
                .selectAll('ellipse')
                .data(airport_data, function key_func(d){
                    return d.key;
                });

            airports.enter()
                .append('ellipse')
                .attr('rx',0)
                .attr('ry',0)
                .attr('cx', function(d){
                    return projection([d.long, d.lat])[0];
                })
                .attr('cy', function(d){
                    return projection([d.long, d.lat])[1] - 1;
                })
                .transition()
                .duration(500)
                .ease('linear')
                .attr('rx',6)
                .attr('ry',2);

            airports.exit()
                .transition()
                    .duration(500)
                    .ease('linear')
                    .attr('rx',0)
                    .attr('ry',0)
                    .each("end", function() {
                        d3.select(this).remove();
                    });


        };

        function update_bars(bar_data, isOrigin, hour){

            var bar_data_filtered= bar_data.find(function(d){
                return d.key==hour;
            });
            if (isOrigin) {
                var name='origin';
                var adj= -5.5;
            } else {
                var name='dest';
                var adj= .5;
            };

            d3.select('.time')
                .style('opacity',1)
                .text(timeMsg(hour));

            function projLongLat(d){
                return projection([d.values.long, d.values.lat]);
            }

            var bars= svg.select('.bars')
                .selectAll('rect.'+name+'_bar')
                .data(bar_data_filtered.values, function key_func(d){
                    return name+d.key;
                });

            bars.transition()
                .ease('linear')
                .duration(500)
                .attr('height', function(d){
                    return bar_scale(d.values.n);
                })
                .attr('y', function(d){
                    return projLongLat(d)[1] - bar_scale(d.values.n);
                });

            bars.enter()
                .append('rect')
                .attr('class', name+'_bar')
                .attr('x',function(d){
                    return adj + projLongLat(d)[0];
                })
                .attr('width', 5)
                .attr('y', function(d){
                    return projLongLat(d)[1];
                })
                .attr('height',0)
                .transition()
                    .duration(500)
                    .ease('linear')
                    .attr('height', function(d){
                        return bar_scale(d.values.n);
                    })
                    .attr('y', function(d){
                        return projLongLat(d)[1] - bar_scale(d.values.n);
                    });

            bars.exit()
                .transition()
                    .duration(500)
                    .ease('linear')
                    .attr('y', function(d){
                        return projLongLat(d)[1];
                    })
                    .attr('height',0)
                .each("end", function() {
                    d3.select(this).remove();
                });
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

        var all_airports_by_hour=[];

        function add_airport(airport_code, long, lat){
            if(all_airports_by_hour.find(function(d){return d.key==airport_code;})===undefined){
                all_airports_by_hour.push({key : airport_code,
                                    long : long,
                                    lat : lat});
            };
        }

        function populate_all_airports_by_hour(hour){
            all_airports_by_hour=[];

            orig_airports_by_hour.find(function(d){
                return d.key==hour;
            }).values.forEach(function(d){
                add_airport(d.key, d.values.long, d.values.lat);
            });

            dest_airports_by_hour.find(function(d){
                return d.key==hour;
            }).values.forEach(function(d){
                add_airport(d.key, d.values.long, d.values.lat);
            });
        }

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

        dest_airports_by_hour.forEach(function(airports_hour){
            airports_hour.values.forEach(function(airport){
                n_values.push(airport.values.n);
            });
        });

        var bar_extent = d3.extent(n_values);

        var bar_scale = d3.scale.linear()
                            .range([1,50])
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

        function change_hour(increment){
            var new_hour = currentHour+increment;
            if (new_hour>23){
                new_hour=new_hour-24;
            } else if (new_hour<0){
                new_hour=new_hour+24;
            }
            update_bars(orig_airports_by_hour, true, new_hour);
            update_bars(dest_airports_by_hour, false, new_hour);
            populate_all_airports_by_hour(new_hour);
            update_airports(all_airports_by_hour);
            currentHour=new_hour;
        }

        var hours_idx=0;
        populate_hours(12,1);
        var hour_interval=setInterval(function() {
            currentHour=hours[hours_idx];
            change_hour(0);
            hours_idx++;
            if(hours_idx >= hours.length) {
                clearInterval(hour_interval);

                d3.select('.button-up')
                    .on('click', function(){
                        change_hour(1);
                    })
                    .transition()
                    .duration(500)
                    .ease('linear')
                    .style('opacity',1);

                d3.select('.button-down')
                    .on('click', function(){
                        change_hour(-1);
                    })
                    .transition()
                    .duration(500)
                    .ease('linear')
                    .style('opacity',1);

                //select origin bars
                d3.selectAll('.origin_bar')
                    .on('click', function(clicked_bar){
                        var flight_path_data=flight_data_filtered.filter(function(d){
                            return (d.DepHour == currentHour &&
                                d.Origin == clicked_bar.key);
                        });

                        var flight_path_json = [];
                        flight_path_data.forEach(function(d){
                            var linestring= {
                                "type": "LineString",
                                "coordinates":[
                                    [d.OrigLong, d.OrigLat],
                                    [d.DestLong, d.DestLat]
                                ]
                            };
                            flight_path_json.push(linestring);
                        });

                        var flight_paths=svg.append('g')
                            .attr('class','flight_paths');

                        flight_paths.selectAll('path')
                            .data(flight_path_json)
                            .enter()
                            .append('path')
                            .attr('class', 'origin_path')
                            .transition()
                                .duration(500)
                                .ease('linear')
                                .attr('d', d3.geo.path().projection(projection););
                    });
                //add on click event
                //filter to data set by hour and origin airport code
                //plot paths
            }
        },1000);
    }

    d3.csv("flight_data.csv", populate_map);
}