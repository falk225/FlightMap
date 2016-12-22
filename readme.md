# Data Visualization Project
## Evan Falkenstine

# When do Airports Sleep?

### Summary
US Domestic flight frequency has been plotted as arrivals and departures by airport on a map of the USA. Moving through the hours of the day shows heavy traffic during the day and little to not traffic at night. Clicking on an airports arrival or departure bar reveals the where the flights making up that bar were traveling to and from.

### Design
To show flights for the US a dot plot of a map of the states was a natural choice. The AlbersUSA composite projection nicely displays all 50 states without wasting too much space.

The latitude and longitude of each airport is encoded by the location of an ellipse on the map. Location on the screen helps viewer readily interpret coordinates. The ellipse provides a base for bars to grow from and links the departure and arrivals bars together as a pair.

The number of flights per hour is encoded as two bars, arrivals and departures, at each airport. Bars make comparing arrivals and departures easy for each airport and also allows comparison between airports.

Departures and arrivals are differentiated using color. Using color allowed me to show the bar at the airport, the total bar in the legend, the flight paths, and the flight path circle all in the same color. This helps link all elements regarding departures and all elements regarding arrivals together.

When a bar is clicked for a detailed view, the flight paths show the other airports involved in each flight. I thought it would add depth to the visualization to be able to see where flights were going to and where they were coming from. An arc was chosen because it gives the impression of taking off and landing. Animating the drawing of the arc makes it clear when flights are arriving or departing an airport.

A marker, whose size represents the number of flights, uses motion to show the flight path. The motion of the marker reminds the viewer of planes flying. The increase in size helps to increase the feeling that a path is heavily trafficked.

Annotations were added to bring the viewers attention to the pattern of flight traffic increasing in the morning, remaining steady all day, decreasing in the evening, and almost disappearing at night. The annotations on laid over the map to make sure the viewer doesn't miss them, but disappear quickly to allow the user to focus on the bars again.
### Feedback
#### Feedback 1: (feedback given prior to commit titled Version 1)
Blue background color for states is unattractive.

Total number of arrivals and departures is interesting, but would prefer to be able to see where departures are flying to and where arrivals are coming from.

#### Updates 1:
Changed map background to a more neutral gray so it doesn't clash with the blue and red of the bars.

Added ability to click on a bar and expand it out into paths and markers indicating the number of flights and where to/from.

#### Feedback 2: (See GitHub commit titled: Version 1)
Selecting small bars is too hard.

No legend explaining what blue and red bars mean.

What airport is what?

#### Updates 2:
Added invisible hit box around each airport to make activation of mouseover event easier.

Added mouseover event that shows a tool tip identifying the airport and the data for that hour behind that the bars represent.

Added mouseover event that causes bars and ellipse to grow. This makes it obvious which markers the tooltip is referring to and also makes clicking on small data bars easier. It also makes it more fun to explore the map.

#### Feedback 3: (See GitHub commit titled: Version 2)
Needs a description in header and title is too vauge.

Needs a legend identifying what the blue bars and red bars mean.

#### Updates 3:
Changed title, added subtitle and instructions for use.

Added legend identifying blue as departures and red as arrivals.

#### Feedback 4: (See GitHub commit titled: Version3.1)
The visualization needs to center on a specific, clear findign in the data.

Explaing reasoning behind design decisions.

#### Updates 4:
Changed title to "When do Airports sleep?" to focus on the difference in flight traffic during the day vs the night. Visualization has annotations and plays through 24 hours when loaded. After showing the user all 24 hours, instructions appear to help the user explore on their own. The legend was also updated to have bars that reflect the total amount of departures and arrivals to gauge a general activity level. These bars clearly go up during the day and down at night.

More detail added to Design section in Readme.

### Resources
Help on drawing arcs:
    http://stackoverflow.com/questions/17156283/d3-js-drawing-arcs-between-two-points-on-map-from-file
Example of animating path drawing:
    http://bl.ocks.org/duopixel/4063326
Example showing how to move a marker along a path:
    https://bl.ocks.org/mbostock/1705868
Example for making mouseover tooltips:
    http://bl.ocks.org/d3noob/a22c42db65eb00d4e369
HTML help for legend
    http://stackoverflow.com/questions/15374918/how-to-put-two-div-boxes-side-by-side
Move object to front or back
    http://bl.ocks.org/eesur/4e0a69d57d3bfc8a82c2