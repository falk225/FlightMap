# Data Visualization Project
## Evan Falkenstine

# 1987: Trends in Flight Frequency by Time of Day

### Summary
US Domestic flight frequency has been plotted as arrivals and departures by airport on a map of the USA. Moving through the hours of the day shows when flight traffic was heavy and light. Clicking on an airports arrival or departure bar reveals the where the flights making up that bar were traveling to and from. Trends in the 1.3 million recorded flights from 1987 can be found in seconds.

### Design
To show flights for the US a dot plot of a map of the states was a natural choice. The AlbersUSA composite projection nicely displays all 50 states without wasting too much space. The latitude and longitude of each airport is encoded by the location of an ellipse on the map. The number of flights per hour is encoded as two bars, arrivals and departures, at each airport. Departures and arrivals are differentiated using color. When a bar is clicked for a detailed view the flight paths show other airport involved in the flight. A marker, whose size represents the number of flights, uses motion to show the flight path.
### Feedback
#### Feedback 1:
Blue background color for states is unattractive.

Total number of arrivals and departures is interesting, but would prefer to be able to see where departures are flying to and where arrivals are coming from.

#### Updates 1:
Changed map background to a more neutral gray so it doesn't clash with the blue and red of the bars.

Added ability to click on a bar and expand it out into paths and markers indicating the number of flights and where to/from.

#### Feedback 2:
Selecting small bars is too hard.
No legend explaining what blue and red bars mean.
What airport is what?

#### Updates 2:
Added invisible hit box around each airport to make activation of mouseover event easier.
Added mouseover event that shows a tool tip identifying the airport and the data for that hour behind that the bars represent.
Added mouseover event that causes bars and ellipse to grow. This makes it obvious which markers the tooltip is referring to and also makes clicking on small data bars easier. It also makes it more fun to explore the map.

#### Feedback 3:
Needs a description in header and title is too vauge.

Needs a legend identifying what the blue bars and red bars mean.

#### Updates 3:
Changed title, added subtitle and instructions for use.

### Resources
Help on drawing arcs:
    http://stackoverflow.com/questions/17156283/d3-js-drawing-arcs-between-two-points-on-map-from-file
Example of animating path drawing:
    http://bl.ocks.org/duopixel/4063326
Example showing how to move a marker along a path:
    https://bl.ocks.org/mbostock/1705868
Example for making mouseover tooltips:
    http://bl.ocks.org/d3noob/a22c42db65eb00d4e369