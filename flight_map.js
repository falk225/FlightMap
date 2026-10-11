function draw_map(geo_data) {
    "use strict";
    var width = 1100,
        height = 600;

    //set hour the map starts with (0-23)
    var currentHour=5;

    var reduce_motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fmt = d3.format(',');

    function timeMsg(hour){
    //Input: integer 0-24
    //Output: formatted time string e.g. 6:00 AM - 7:00 AM
        function write_time(hour){
            if (hour==12) {return "12 Noon";}
            if (hour==0 || hour==24) {return "Midnight";}
            if (hour>12) {return hour-12 +":00 PM";
            } else {
                return hour + ":00 AM";
            }
        }
        return write_time(hour) + " - " +write_time(hour+1);
    }

    //short forms: 12a/3p for axis labels, 8–9 AM for the card, "6 AM" in sentences
    function hour12(hour){ return hour % 12 === 0 ? 12 : hour % 12; }
    function ampm(hour){ return hour % 24 < 12 ? 'AM' : 'PM'; }
    function axis_label(hour){ return hour12(hour) + (hour < 12 ? 'a' : 'p'); }
    function hour_name(hour){
        if (hour === 0) {return 'midnight';}
        if (hour === 12) {return 'noon';}
        return hour12(hour) + ' ' + ampm(hour);
    }
    function short_range(hour){
        var next = (hour + 1) % 24;
        if (ampm(hour) === ampm(next)) {return hour12(hour) + '–' + hour12(next) + ' ' + ampm(hour);}
        return hour12(hour) + ' ' + ampm(hour) + '–' + hour12(next) + ' ' + ampm(next);
    }

    //---- day/night colors ----
    //the page blends between these three palettes as the clock moves
    var PALETTE = {
        night: {'bg':'#070B18', 'panel':'#0F1630', 'chip':'#1C2647', 'map':'#0B1226', 'land':'#18213D',
                'dep':'#5AB8FF', 'arr':'#FFC24D', 'dot':'#DCF0FF',
                'card':'#F4F6FB', 'card-dep':'#1A5FB4', 'card-arr':'#9A5B00'},
        twilight: {'bg':'#2A2550', 'panel':'#38316A', 'chip':'#4A4282', 'map':'#332C61', 'land':'#4B437E',
                'dep':'#7CCBFF', 'arr':'#FFB46B', 'dot':'#FFFFFF',
                'card':'#F7F2FB', 'card-dep':'#1A5FB4', 'card-arr':'#9A5B00'},
        day: {'bg':'#EAF1F8', 'panel':'#FFFFFF', 'chip':'#DCE6F2', 'map':'#D3E2F1', 'land':'#F9FBFE',
                'dep':'#1D5BD8', 'arr':'#D9720B', 'dot':'#0E3A8F',
                'card':'#0F1630', 'card-dep':'#7CC2FF', 'card-arr':'#FFC24D'}
    };
    //text flips between light and dark rather than blending, so it stays readable
    var INK = {
        on_dark: {'text':'#E7EAF3', 'muted':'#A9B1CB',
                'card-text':'#0B1226', 'card-muted':'#46506B', 'card-rule':'#DDE2EE'},
        on_light: {'text':'#0B1226', 'muted':'#46506B',
                'card-text':'#E7EAF3', 'card-muted':'#A9B1CB', 'card-rule':'#2A3558'}
    };

    //0 at night (9 PM - 4 AM), 1 in the day (9 AM - 4 PM), ramping through dawn and dusk
    function daylight(hour){
        if (hour >= 9 && hour <= 16) {return 1;}
        if (hour >= 21 || hour <= 4) {return 0;}
        return hour < 9 ? (hour - 4) / 5 : (21 - hour) / 5;
    }

    //night -> twilight blends over 4-7 AM (and back over 6-9 PM), then twilight -> day is a
    //single step: a half-way mix of twilight and day is a mid-tone that no text color reads well on
    function theme_for(hour){
        var t = daylight(hour), from, to, u;
        if (t <= 0.6) {
            from = PALETTE.night; to = PALETTE.twilight; u = Math.min(1, t / 0.5);
        } else {
            from = PALETTE.twilight; to = PALETTE.day; u = Math.min(1, (t - 0.6) / 0.2);
        }
        /** @type {Object<string, string>} */
        var vars = {};
        Object.keys(from).forEach(function(k){
            vars[k] = d3.interpolateRgb(from[k], to[k])(u);
        });
        var light = t >= 0.8;
        var ink = light ? INK.on_light : INK.on_dark;
        Object.keys(ink).forEach(function(k){ vars[k] = ink[k]; });
        return {vars: vars, light: light};
    }

    function apply_theme(hour){
        var th = theme_for(hour);
        var root = document.documentElement;
        Object.keys(th.vars).forEach(function(k){
            root.style.setProperty('--' + k, th.vars[k]);
        });
        root.setAttribute('data-sky', th.light ? 'day' : 'night');
    }

    function show_clock(hour){
        d3.select('.time-main').text(hour12(hour) + ':00');
        d3.select('.time-ampm').text(ampm(hour));
        d3.select('.time-range').text(timeMsg(hour));
    }

    apply_theme(currentHour);
    show_clock(currentHour);

    var wrap = d3.select('.map-wrap');

    var svg = wrap.insert("svg", ':first-child')
        .attr('class','svg-map')
        .attr("viewBox", [0, 0, width, height].join(' '))
        .attr('role', 'img')
        .attr('aria-label', 'Map of US airports. Bars show departures and arrivals at each airport for the selected hour.');

    //container for state paths
    var map= svg.append('g')
        .attr('class', 'map');

    var projection = d3.geoAlbersUsa()
                           .scale(1300)
                           .translate([width/2, height/2]);

    var path = d3.geoPath().projection(projection);

    //draw states
    map.selectAll('path')
        .data(geo_data.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('class','states');

    var hour_interval = null; //used to play 24h

    function populate_map(flight_data, airport_info) {
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
                .attr('class','airports');

        svg.append('g')
                .attr('class','bars');

        //declared here so available to hover, pin and hour changes
        var grow_factor=4;
        var ease_style= reduce_motion ? d3.easeLinear : d3.easeElasticOut.period(0.65);
        var dur= reduce_motion ? 0 : 500;

        function projLongLat(d){
            return projection([d.values.long, d.values.lat]);
        }

        //projected position of every airport, for labels and the card
        /** @type {Object<string, [number, number]>} */
        var airport_pos = {};
        flight_data_on_map.forEach(function(d){
            if (!airport_pos[d.Origin]) {airport_pos[d.Origin] = projection([d.OrigLong, d.OrigLat]);}
            if (!airport_pos[d.Dest]) {airport_pos[d.Dest] = projection([d.DestLong, d.DestLat]);}
        });

        //---- hover, pin and focus ----
        var hovered = null; //airport under the mouse
        var pinned = null;  //airport whose card stays open after a click or tap
        var grown = new Set();

        function resize_airport(airport_code, big){
            var f = big ? grow_factor : 1;

            d3.select('.airport.' + airport_code)
                .transition()
                .duration(dur)
                .ease(ease_style)
                .attr('rx',6*f)
                .attr('ry',2*f);

            d3.select('.origin_bar.'+airport_code)
                .transition()
                .duration(dur)
                .ease(ease_style)
                .attr('x',function(d){
                    return (-5.5*f) + projLongLat(d)[0];
                })
                .attr('width', 5*f)
                .attr('height', function(d){
                    return bar_scale(d.values.n)*f;
                })
                .attr('y', function(d){
                    return projLongLat(d)[1] - (bar_scale(d.values.n)*f);
                });

            d3.select('.dest_bar.'+airport_code)
                .transition()
                .duration(dur)
                .ease(ease_style)
                .attr('x',function(d){
                    return (.5*f) + projLongLat(d)[0];
                })
                .attr('width', 5*f)
                .attr('height', function(d){
                    return bar_scale(d.values.n)*f;
                })
                .attr('y', function(d){
                    return projLongLat(d)[1] - (bar_scale(d.values.n)*f);
                });
        }

        //grows the hovered and pinned airports and fades the rest back
        function refresh_focus(regrow){
            var want = new Set([hovered, pinned].filter(Boolean));
            grown.forEach(function(code){
                if (!want.has(code)) {resize_airport(code, false);}
            });
            want.forEach(function(code){
                if (regrow || !grown.has(code)) {resize_airport(code, true);}
            });
            grown = want;
            var bars_g = svg.select('.bars');
            bars_g.classed('has-focus', want.size > 0);
            bars_g.selectAll('rect').classed('focus', function(d){
                return want.has(/** @type {any} */ (d).key);
            });
        }

        function hover(event, airport_code){
            if (event.pointerType !== 'mouse') {return;}
            hovered = airport_code;
            mark_hint('hover');
            render_card();
            refresh_focus(false);
        }

        function unhover(event, airport_code){
            if (event.pointerType !== 'mouse' || hovered !== airport_code) {return;}
            hovered = null;
            render_card();
            refresh_focus(false);
        }

        function pin(airport_code){
            pinned = airport_code;
            render_card();
            refresh_focus(false);
        }

        function unpin(){
            if (pinned === null) {return;}
            pinned = null;
            render_card();
            refresh_focus(false);
        }

        //---- airport card ----
        var card = d3.select('.card');

        function n_at(lookup, hour, airport_code){
            return lookup.get(hour).get(airport_code) || 0;
        }

        function paths_shown(isOrigin, airport_code){
            return !d3.selectAll('.flight_paths.' + (isOrigin ? 'origin' : 'dest') + '.' + airport_code).empty();
        }

        function fill_card(airport_code){
            var info = airport_info[airport_code];
            card.select('.card-code').text(airport_code);
            card.select('.card-city')
                .text(info ? info.city + ', ' + info.state : '')
                .attr('title', info ? info.name : null);
            card.select('.card-hour').text(short_range(currentHour));
            card.select('.card-dep').text(fmt(n_at(dep_lookup, currentHour, airport_code)));
            card.select('.card-arr').text(fmt(n_at(arr_lookup, currentHour, airport_code)));

            //the airport's whole day, current hour highlighted
            var series = d3.range(24).map(function(h){
                return {d: n_at(dep_lookup, h, airport_code), a: n_at(arr_lookup, h, airport_code)};
            });
            var top = d3.max(series, function(s){ return Math.max(s.d, s.a); }) || 1;
            var cols = card.select('.card-chart').selectAll('div')
                .data(series)
                .join(function(enter){
                    var col = enter.append('div');
                    col.append('span').attr('class', 'd');
                    col.append('span').attr('class', 'a');
                    return col;
                })
                .classed('now', function(s, i){ return i === currentHour; });
            cols.select('.d').style('height', function(s){ return (s.d / top * 100) + '%'; });
            cols.select('.a').style('height', function(s){ return (s.a / top * 100) + '%'; });

            card.select('.route-btn.origin').attr('aria-pressed', String(paths_shown(true, airport_code)));
            card.select('.route-btn.dest').attr('aria-pressed', String(paths_shown(false, airport_code)));
        }

        //beside the airport, flipped left near the right edge, kept inside the map
        function position_card(airport_code){
            var pos = airport_pos[airport_code];
            var wrap_node = /** @type {HTMLElement} */ (wrap.node());
            var card_node = /** @type {HTMLElement} */ (card.node());
            var map_box = /** @type {SVGSVGElement} */ (svg.node()).getBoundingClientRect();
            var wrap_box = wrap_node.getBoundingClientRect();
            var scale = map_box.width / width;
            var px = pos[0] * scale + (map_box.left - wrap_box.left);
            var py = pos[1] * scale + (map_box.top - wrap_box.top);
            var cw = card_node.offsetWidth, ch = card_node.offsetHeight;
            var left = px + 28;
            if (left + cw > wrap_box.width - 8) {left = px - 28 - cw;}
            left = Math.max(8, left);
            var top = Math.max(8, Math.min(py - ch / 2, map_box.height - ch - 8));
            card.style('left', left + 'px').style('top', top + 'px');
        }

        function render_card(){
            var shown = pinned || hovered;
            card.classed('pinned', pinned !== null);
            if (!shown) {
                card.classed('visible', false);
                return;
            }
            fill_card(shown);
            position_card(shown);
            card.classed('visible', true);
        }

        card.select('.card-close').on('click', unpin);
        card.select('.route-btn.origin').on('click', function(){ toggle_paths(true, pinned); });
        card.select('.route-btn.dest').on('click', function(){ toggle_paths(false, pinned); });
        window.addEventListener('resize', render_card);

        //tapping empty map closes a pinned card
        svg.on('click', function(event){
            var target = /** @type {Element} */ (event.target);
            if (target === svg.node() || target.classList.contains('states')) {unpin();}
        });

        function update_airports(airport_data) {
            //plots ellipse to mark each airport

            var airports= svg.select('.airports')
                .selectAll('ellipse')
                .data(airport_data, function key_func(d){
                    return d.key;
                });

            //adds circle as a hitbox to make it easier to mouseover
            var airport_hitbox=svg.select('.airports')
                .selectAll('circle')
                .data(airport_data, function key_func(d){
                    return d.key;
                });

            //adds mouseover events to hitbox
            airport_hitbox.enter()
                .append('circle')
                .attr('r',10)
                .style('opacity',0)
                .attr('cx', function(d){
                    return projection([d.long, d.lat])[0];
                })
                .attr('cy', function(d){
                    return projection([d.long, d.lat])[1] - 1;
                })
                .on("pointerenter", function(event, d) {
                    hover(event, d.key);
                })
                .on("pointerleave", function(event, d) {
                    unhover(event, d.key);
                })
                .on("click", function(event, d) {
                    if (pinned === d.key) {unpin();} else {pin(d.key);}
                });

            airport_hitbox.exit()
                .remove();

            //draws ellipse
            airports.enter()
                .append('ellipse')
                .attr('class', function(d) {return 'airport ' + d.key;})
                .on("pointerenter", function(event, d) {
                    hover(event, d.key);
                })
                .on("pointerleave", function(event, d) {
                    unhover(event, d.key);
                })
                .on("click", function(event, d) {
                    if (pinned === d.key) {unpin();} else {pin(d.key);}
                })
                .attr('rx',0)
                .attr('ry',0)
                .attr('cx', function(d){
                    return projection([d.long, d.lat])[0];
                })
                .attr('cy', function(d){
                    return projection([d.long, d.lat])[1] - 1;
                })
                .transition()
                .duration(dur)
                .ease(d3.easeLinear)
                .attr('rx',6)
                .attr('ry',2);


            //removes ellipses for airports with no data for this hour
            airports.exit()
                .transition()
                    .duration(dur)
                    .ease(d3.easeLinear)
                    .attr('rx',0)
                    .attr('ry',0)
                    .on("end", function() {
                        d3.select(this).remove();
                    });
        };

        function update_bars(bar_data, isOrigin, hour){

            var bar_data_filtered= bar_data.find(function(d){
                return d.key==hour;
            });

            //used to set differnt positions and class names for origin and dest bars
            if (isOrigin) {
                var name='origin';
                var adj= -5.5;
            } else {
                var name='dest';
                var adj= .5;
            };

            var bars= svg.select('.bars')
                .selectAll('rect.'+name+'_bar')
                .data(bar_data_filtered.values, function key_func(d){
                    return name+d.key;
                });

            //resize current bars
            bars.transition()
                .ease(d3.easeLinear)
                .duration(dur)
                .attr('height', function(d){
                    return bar_scale(d.values.n);
                })
                .attr('y', function(d){
                    return projLongLat(d)[1] - bar_scale(d.values.n);
                });

            //add new bars
            bars.enter()
                .append('rect')
                .attr('class', function(d) {return name+'_bar ' + d.key;})
                .attr('rx', 1.2)
                .on("pointerenter", function(event, d) {
                    hover(event, d.key);
                })
                .on("pointerleave", function(event, d) {
                    unhover(event, d.key);
                })
                .attr('x',function(d){
                    return adj + projLongLat(d)[0];
                })
                .attr('width', 5)
                .attr('y', function(d){
                    return projLongLat(d)[1];
                })
                .attr('height',0)
                .transition()
                    .duration(dur)
                    .ease(d3.easeLinear)
                    .attr('height', function(d){
                        return bar_scale(d.values.n);
                    })
                    .attr('y', function(d){
                        return projLongLat(d)[1] - bar_scale(d.values.n);
                    });

            //remove bars without any data this hour
            bars.exit()
                .transition()
                    .duration(dur)
                    .ease(d3.easeLinear)
                    .attr('y', function(d){
                        return projLongLat(d)[1];
                    })
                    .attr('height',0)
                .on("end", function() {
                    d3.select(this).remove();
                });

            //click event draws paths if not already displayed
            //removes paths if already drawn
            svg.select('.bars')
                .selectAll('rect.'+name+'_bar')
                .on('click', function(event, clicked_bar){
                    mark_hint('click');
                    toggle_paths(isOrigin, clicked_bar.key);
                    if (paths_shown(true, clicked_bar.key) || paths_shown(false, clicked_bar.key)) {
                        pin(clicked_bar.key);
                    } else if (pinned === clicked_bar.key) {
                        unpin();
                    }
                });
        }

        function toggle_paths(isOrigin, airport_code){
            var previous_paths = d3.selectAll('.flight_paths.' + (isOrigin ? 'origin' : 'dest') + '.' + airport_code);
            //if paths are not already drawn
            if(previous_paths.empty()){
                draw_flight_paths(flight_data_on_map, isOrigin, airport_code, currentHour);
            //if paths are already drawn
            } else {
                previous_paths.remove();
            }
            render_card();
        }

        function draw_flight_paths(flight_data, isOrigin, airport_code, hour){

            //creates instructions for drawing arc
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

            //departures paths settings
            if (isOrigin){
                var name='origin';
                var adj=-3;
                var ease=d3.easeSinOut;
                var flight_path_data=flight_data.filter(function(d){
                    return (d.DepHour == hour &&
                        d.Origin == airport_code);
                });
            } else { //arrivals paths setting
                var name='dest';
                var adj=3;
                var ease=d3.easeSinIn;
                var flight_path_data=flight_data.filter(function(d){
                    return (d.ArrHour == hour &&
                        d.Dest == airport_code);
                });
            }
            var path_dur = reduce_motion ? 0 : 1000;
            var flight_arcs = [];

            //populate array of arc paths
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

            //draw arcs
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
                .duration(path_dur)
                .ease(ease)
                .attr('stroke-dashoffset', 0)
                .on('start', function(d){
                    //adds and animates marker along path
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
                            .duration(path_dur)
                            .style('opacity',.01)
                            .attrTween("transform", translateAlong(this_path))
                            .on('end',function(){d3.select(this).remove();});
                    } else {
                        circles.transition()
                            .ease(ease)
                            .duration(path_dur)
                            .attrTween("transform", translateAlong(this_path));
                    }
                })
                .on('end', function(d){
                    add_dot(flight_paths, this, d);
                });

                //used by tween to move marker along arc
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

        //a dot that keeps flying the route once it's drawn
        function add_dot(group, path_node, d){
            if (reduce_motion) {return;}
            var seconds = Math.max(1.5, Math.min(6, d.totalLength / 80));
            group.append('circle')
                .attr('class', 'flight_dot')
                .attr('r', 1.6)
                .append('animateMotion')
                    .attr('dur', seconds.toFixed(2) + 's')
                    .attr('begin', (-Math.random() * seconds).toFixed(2) + 's')
                    .attr('repeatCount', 'indefinite')
                    .attr('path', path_node.getAttribute('d'));
        }

        function update_existing_flight_paths(hour){
            //redraw new paths for shown selections when hour changes
            var existing_paths=/** @type {Element[]} */ (d3.selectAll('.flight_paths').nodes());
            if (existing_paths.length!=0){
                existing_paths.forEach(function(existing_path){
                    var path_classes=existing_path.classList;
                    d3.selectAll('.flight_paths.' + path_classes[1] + '.' + path_classes[2]).remove();
                    draw_flight_paths(flight_data_on_map, path_classes[1]=='origin', path_classes[2], hour)
                });
            }
        }

        //aggregation functions
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

        //same {key, values} shape d3.nest().entries() produced
        function nest_entries(data, key1, key2, rollup){
            return d3.rollups(data, rollup, key1, key2).map(function(outer){
                return {key: String(outer[0]),
                        values: outer[1].map(function(inner){
                            return {key: String(inner[0]), values: inner[1]};
                        })};
            });
        }

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

        //this data has number of flights summed as n and is
        //grouped by departure hour and origin airport
        var orig_airports_by_hour = nest_entries(flight_data_on_map,
                    function(d) {
                        return d.DepHour;
                    },
                    function(d) {
                        return d.Origin;
                    },
                    groupby_orig);

        //this data has number of flights summed as n and is
        //grouped by arrival hour and destination airport
        var dest_airports_by_hour = nest_entries(flight_data_on_map,
                    function (d) {
                        return d.ArrHour;
                    },
                    function(d) {
                        return d.Dest;
                    },
                    groupby_dest);

        //hour -> airport -> n, for the card and the totals
        function to_lookup(by_hour){
            var lookup = new Map();
            d3.range(24).forEach(function(h){ lookup.set(h, new Map()); });
            by_hour.forEach(function(hour_entry){
                hour_entry.values.forEach(function(airport){
                    lookup.get(+hour_entry.key).set(airport.key, airport.values.n);
                });
            });
            return lookup;
        }
        var dep_lookup = to_lookup(orig_airports_by_hour);
        var arr_lookup = to_lookup(dest_airports_by_hour);
        var dep_totals = d3.range(24).map(function(h){ return d3.sum(dep_lookup.get(h).values()); });
        var arr_totals = d3.range(24).map(function(h){ return d3.sum(arr_lookup.get(h).values()); });

        //create scale for bars
        var n_values=[]
        var comb_airports_by_hour=[orig_airports_by_hour,dest_airports_by_hour]
        comb_airports_by_hour.forEach(function(dataset){
            dataset.forEach(function(airports_hour){
                airports_hour.values.forEach(function(airport){
                    n_values.push(airport.values.n);
                });
            });
        })

        var bar_extent = d3.extent(n_values);
        var bar_scale = d3.scaleLinear()
                            .range([1,50])
                            .domain(bar_extent);

        //combines all values into one array for flight path and marker scales
        var flight_path_ns=[];
        flight_data_on_map.forEach(function(d){
            flight_path_ns.push(d.n);
        });
        var flight_path_extent=d3.extent(flight_path_ns);
        var flight_path_scale= d3.scaleLinear()
                                    .range([.05,1])
                                    .domain(flight_path_extent);
        var flight_marker_scale=d3.scaleSqrt()
                                    .range([.5,10])
                                    .domain(flight_path_extent);

        //---- labels for the busiest airports ----
        /** @type {Map<string, number>} */
        var volume = new Map();
        flight_data_on_map.forEach(function(d){
            volume.set(d.Origin, (volume.get(d.Origin) || 0) + d.n);
            volume.set(d.Dest, (volume.get(d.Dest) || 0) + d.n);
        });
        var hubs = Array.from(volume).sort(function(a, b){ return b[1] - a[1]; })
            .slice(0, 12).map(function(e){ return e[0]; });
        //neighbors that would collide get nudged: [dx, dy, anchor]
        var label_offsets = {LGA: [9, -8, 'start'], EWR: [-9, 14, 'end'], DTW: [-9, 2, 'end']};
        function label_offset(code){ return label_offsets[code] || [9, 13, 'start']; }
        svg.append('g')
            .attr('class', 'labels')
            .attr('aria-hidden', 'true')
            .selectAll('text')
            .data(hubs)
            .join('text')
            .attr('x', function(code){ return airport_pos[code][0] + label_offset(code)[0]; })
            .attr('y', function(code){ return airport_pos[code][1] + label_offset(code)[1]; })
            .attr('text-anchor', function(code){ return label_offset(code)[2]; })
            .text(function(code){ return code; });

        //---- counts in the header ----
        function set_count(selector, value){
            var sel = d3.select(selector);
            var node = /** @type {HTMLElement} */ (sel.node());
            var from = +(node.dataset.value || 0);
            node.dataset.value = String(value);
            if (reduce_motion) {
                sel.text(fmt(value));
                return;
            }
            sel.transition()
                .duration(600)
                .ease(d3.easeCubicOut)
                .textTween(function(){
                    var i = d3.interpolateRound(from, value);
                    return function(t){ return fmt(i(t)); };
                });
        }

        function update_counts(hour){
            set_count('.count-dep', dep_totals[hour]);
            set_count('.count-arr', arr_totals[hour]);
        }

        //---- chapter captions ----
        var quietest = d3.minIndex(dep_totals);
        var busy_hours = d3.range(9, 22);
        var busy_min = d3.min(busy_hours, function(h){ return dep_totals[h]; });
        var chapters = [
            {hours: [1, 2, 3, 4, 5], title: 'Zzz Zzz Zzz', range: '1 AM – 6 AM',
                fact: 'Only ' + fmt(dep_totals[quietest]) + ' departures at ' + hour_name(quietest) + ', the quietest hour of the day.'},
            {hours: [6, 7, 8], title: 'Waking up!', range: '6 AM – 9 AM',
                fact: 'Departures jump from ' + fmt(dep_totals[5]) + ' at 5 AM to ' + fmt(dep_totals[6]) + ' at 6 AM.'},
            {hours: busy_hours, title: 'Work all day.', range: '9 AM – 10 PM',
                fact: 'At least ' + fmt(busy_min) + ' departures every hour until 10 PM.'},
            {hours: [22, 23, 0], title: 'Slowing down...', range: '10 PM – 1 AM',
                fact: 'Departures fall from ' + fmt(dep_totals[21]) + ' at 9 PM to ' + fmt(dep_totals[0]) + ' at midnight.'}
        ];
        var shown_chapter = -1;
        var caption = d3.select('.caption');

        function update_caption(hour){
            var idx = chapters.findIndex(function(c){ return c.hours.indexOf(hour) !== -1; });
            if (idx === shown_chapter) {return;}
            var first = shown_chapter === -1;
            shown_chapter = idx;
            function fill(){
                var c = chapters[idx];
                caption.select('.caption-range').text(c.range);
                caption.select('.caption-title').text(c.title);
                caption.select('.caption-fact').text(c.fact);
                caption.selectAll('.caption-progress span').classed('on', function(s, i){ return i === idx; });
            }
            if (reduce_motion) {
                fill();
                caption.style('opacity', 1);
                return;
            }
            caption.transition()
                .duration(first ? 0 : 250)
                .ease(d3.easeSinIn)
                .style('opacity', 0)
                .on('end', function(){
                    fill();
                    caption.style('transform', 'translateY(8px)')
                        .transition()
                        .duration(600)
                        .ease(d3.easeSinOut)
                        .style('opacity', 1)
                        .style('transform', 'translateY(0px)');
                });
        }

        //---- timeline ----
        var max_total = d3.max(dep_totals.concat(arr_totals)) || 1;
        var hour_buttons = d3.select('.hours').selectAll('button')
            .data(d3.range(24))
            .join('button')
            .attr('type', 'button')
            .attr('class', 'hour')
            .attr('aria-label', function(h){
                return timeMsg(h) + ': ' + fmt(dep_totals[h]) + ' departures, ' + fmt(arr_totals[h]) + ' arrivals';
            })
            .on('click', function(event, h){
                stop_playback();
                go_to_hour(h);
            });
        var hour_bars = hour_buttons.append('span').attr('class', 'hour-bars');
        hour_bars.append('span').attr('class', 'd')
            .style('height', function(h){ return (dep_totals[h] / max_total * 100) + '%'; });
        hour_bars.append('span').attr('class', 'a')
            .style('height', function(h){ return (arr_totals[h] / max_total * 100) + '%'; });
        hour_buttons.append('span').attr('class', 'hour-label');

        function update_timeline(hour){
            hour_buttons
                .classed('current', function(h){ return h === hour; })
                .classed('later', function(h){ return h > hour; })
                .attr('aria-current', function(h){ return h === hour ? 'true' : null; });
            hour_buttons.select('.hour-label')
                .text(function(h){ return (h % 3 === 0 || h === hour) ? axis_label(h) : ''; });
        }

        //---- hints ----
        //once the first playthrough ends the hints bounce to say "your turn"
        var hints_shown = false;
        function show_descr(){
            if (hints_shown) {return;}
            hints_shown = true;
            d3.select('#description')
                .classed('nudged', true)
                .style('transform', 'translateY(-8px)')
                .transition()
                .duration(reduce_motion ? 0 : 1000)
                .ease(ease_style)
                .style('transform', 'translateY(0px)');
        }

        function mark_hint(name){
            d3.select('.hints li[data-hint="' + name + '"]').classed('used', true);
        }

        function change_hour(increment){
            //updates everything for a new hour that is increment hours from current
            var new_hour = (currentHour + increment + 24) % 24;
            currentHour = new_hour;
            apply_theme(new_hour);
            show_clock(new_hour);
            update_caption(new_hour);
            update_counts(new_hour);
            update_timeline(new_hour);
            update_bars(orig_airports_by_hour, true, new_hour);
            update_bars(dest_airports_by_hour, false, new_hour);
            populate_all_airports_by_hour(new_hour);
            update_airports(all_airports_by_hour);
            update_existing_flight_paths(new_hour);
            refresh_focus(true);
            render_card();
        }

        function go_to_hour(hour){
            change_hour(hour - currentHour);
        }

        //---- playback ----
        var play_button = d3.select('.play24');

        //steps forward one hour at a time, 1.25 s per hour
        function play(steps){
            var remaining = steps;
            play_button.classed('playing', true).attr('aria-label', 'Pause');
            hour_interval = setInterval(function() {
                change_hour(1);
                remaining--;
                if (remaining <= 0) {
                    stop_playback();
                }
            }, 1250);
        }

        function stop_playback(){
            if (hour_interval === null) {return;}
            clearInterval(hour_interval);
            hour_interval = null;
            play_button.classed('playing', false).attr('aria-label', 'Play 24 hours');
            show_descr();
        }

        function toggle_playback(){
            if (hour_interval !== null) {
                stop_playback();
            } else {
                mark_hint('play');
                play(24);
            }
        }

        play_button.on('click', toggle_playback);

        document.addEventListener('keydown', function(event){
            if (event.altKey || event.ctrlKey || event.metaKey) {return;}
            var target = /** @type {Element} */ (event.target);
            if (event.key === 'Escape') {
                unpin();
                return;
            }
            if (target.closest && target.closest('input, textarea, select')) {return;}
            if (event.key === ' ') {
                if (target.closest && target.closest('button, a')) {return;} //space already presses those
                event.preventDefault();
                toggle_playback();
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                stop_playback();
                change_hour(event.key === 'ArrowRight' ? 1 : -1);
            }
        });

        wrap.attr('aria-busy', 'false');

        //begins by showing the first hour and playing through the rest of the day, then lets them explore
        change_hour(0);
        play(23);
    }

    function parse_row(d){
        ['DepHour','OrigLong','OrigLat','ArrHour','DestLong','DestLat','n'].forEach(function(col){
            d[col] = +d[col];
        });
        return d;
    }

    //parses data from csv to run function populate_map; airport names are optional extras
    Promise.all([
        d3.csv("flight_data.csv", parse_row),
        d3.json("airports.json").catch(function(){ return {}; })
    ]).then(function(loaded){
        populate_map(loaded[0], loaded[1]);
    }).catch(function(){
        d3.select('.loading').text("Couldn't load the flight data.");
    });
}
