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

    var currentHour=6;

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

    var projection = d3.geo.albersUsa()
                           .scale(1000);
                           //.translate( [0, 0]);

    var path = d3.geo.path().projection(projection);

    map.selectAll('path')
        .data(geo_data.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class','states');

    var hour_interval; //used to play 24h

    function populate_map(flight_data) {
        //filters to continental US plus alasaka and hawaii
        var flight_data_on_map=flight_data.filter(function(d){
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

            //add flight paths event



            //add path drawing click event
            svg.select('.bars')
                .selectAll('rect.'+name+'_bar')
                .on('click', function(clicked_bar){
                    var previous_paths = d3.selectAll('.flight_paths.' + name + '.' + clicked_bar.key);
                    //if paths are not already drawn
                    if(previous_paths[0].length===0){
                        draw_flight_paths(flight_data_on_map, isOrigin, clicked_bar.key, hour)
                    //if paths are already drawn
                    } else {
                        previous_paths.remove()
                    }

                });
                //.on("mouseover", mapMouseOver)
                //.on("mouseout", mapMouseOut);


        }

        function draw_flight_paths(flight_data, isOrigin, airport_code, hour){
            //draws flight paths
            function linkArc(d) {
                var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
                if(dx>0){
                    var sweep_flag=1;
                }else{
                    var sweep_flag=0;
                }
                return "M" + d.source.x + "," + d.source.y + "A" + dr*2 + "," + dr*2 + " 0 0,"+sweep_flag + d.target.x + "," + d.target.y;
            }

            //departures
            if (isOrigin){
                var name='origin';
                var adj=-3;
                var ease='sin-out';
                var flight_path_data=flight_data.filter(function(d){
                    return (d.DepHour == hour &&
                        d.Origin == airport_code);
                });
            } else { //arrivals
                var name='dest';
                var adj=3;
                var ease='sin-in';
                var flight_path_data=flight_data.filter(function(d){
                    return (d.ArrHour == hour &&
                        d.Dest == airport_code);
                });
            }
            var flight_arcs = [];

            flight_path_data.forEach(function(d){
                var source_coord=projection([d.OrigLong, d.OrigLat]);
                var target_coord=projection([d.DestLong, d.DestLat]);

                var arc_def= {
                    "source":{
                        "x":source_coord[0]+adj,
                        "y":source_coord[1]
                    },
                    "target":{
                        "x":target_coord[0]+adj,
                        "y":target_coord[1]
                    },
                    "n": d.n
                };
                flight_arcs.push(arc_def);
            });

            var flight_paths=svg.append('g')
                .attr('class','flight_paths ' + name + ' ' + airport_code);

            var paths = flight_paths.selectAll('path')
                .data(flight_arcs)
                .enter()
                .append('path')
                .attr('class', name + '_path')
                .attr('d', linkArc)
                .each(function(d){
                    d.totalLength=this.getTotalLength();
                })
                .attr("stroke-dasharray", function(d) { return d.totalLength + " " + d.totalLength; })
                .attr("stroke-dashoffset", function(d) { return d.totalLength; })
                .attr("stroke-width",function(d){return flight_path_scale(d.n);})
                .transition()
                .duration(1000)
                .ease(ease)
                .attr('stroke-dashoffset', 0)
                .each('start', function(d){
                    var this_path=this;
                    var circles=flight_paths.append('circle')
                    .attr('class', name + '_marker')
                    .attr('r',flight_marker_scale(d.n))
                    .attr("transform", function () {
                        return"translate(" + d.source.x + "," + d.source.y + ")";
                    })

                    if(isOrigin==false){
                        flight_paths.append('circle')
                        .attr('class', name + '_marker')
                        .attr('r',flight_marker_scale(d.n))
                        .attr("transform", function () {
                            return"translate(" + d.source.x + "," + d.source.y + ")";
                        });

                        circles.transition()
                            .ease(ease)
                            .duration(1000)
                            .style('opacity',.01)
                            .attrTween("transform", translateAlong(this_path))
                            .each('end',function(){d3.select(this).remove();});
                    } else {
                        circles.transition()
                            .ease(ease)
                            .duration(1000)
                            .attrTween("transform", translateAlong(this_path));
                    }
                });

                function translateAlong(path) {
                    var l = path.getTotalLength();
                    return function(d, i, a) {
                        return function(t) {
                            var p = path.getPointAtLength(t * l);
                            return "translate(" + p.x + "," + p.y + ")";
                        };
                    };
                }
        }

        function update_existing_flight_paths(hour){
            var existing_paths=d3.selectAll('.flight_paths')[0];
            if (existing_paths.length!=0){
                existing_paths.forEach(function(existing_path){
                    var path_classes=existing_path.classList;
                    d3.selectAll('.flight_paths.' + path_classes[1] + '.' + path_classes[2]).remove();
                    draw_flight_paths(flight_data_on_map, path_classes[1]=='origin', path_classes[2], hour)
                });
            }
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
                    .entries(flight_data_on_map);

        var dest_airports_by_hour = d3.nest()
                    .key(function (d) {
                        return d.ArrHour;
                    })
                    .key(function(d) {
                        return d.Dest;
                    })
                    .rollup(groupby_dest)
                    .entries(flight_data_on_map);

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

        var flight_path_ns=[];
        flight_data_on_map.forEach(function(d){
            flight_path_ns.push(d.n);
        });
        var flight_path_extent=d3.extent(flight_path_ns);
        var flight_path_scale= d3.scale.linear()
                                    .range([.05,.8])
                                    .domain(flight_path_extent);
        var flight_marker_scale=d3.scale.linear()
                                    .range([.5,5])
                                    .domain(flight_path_extent);

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
            update_existing_flight_paths(new_hour);
            currentHour=new_hour;
        }

        function play24(){
            var hours_idx=0;
            populate_hours(currentHour,24);
            hour_interval=setInterval(function() {
                currentHour=hours[hours_idx];
                change_hour(0);
                hours_idx++;
                if(hours_idx >= hours.length) {
                    clearInterval(hour_interval);
                    d3.select('.play24').text('Play 24h');
                }
            },1500);
        }
    header.insert('button', 'svg')
        .attr('class', 'button play24')
        .style('width','100px')
        .text('Play 24h')
        .on('click', function(){
            var myButton=d3.select(this);
            if(myButton.text()==='Stop'){
                clearInterval(hour_interval);
                myButton.text('Play 24h');
            } else {
                myButton.text('Stop');
                play24();
            }
        });

    header.insert('button', 'svg')
        .attr('class', 'button button-down')
        .text('<-')
        .on('click', function(){
            change_hour(-1);
        });

    header.insert('button', 'svg')
        .attr('class', 'button button-up')
        .text('->')
        .on('click', function(){
            change_hour(1);
        });
    change_hour(0);
    }

    d3.csv("flight_data.csv", populate_map);
}