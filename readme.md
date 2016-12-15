# Data Visualisation Project
## Evan Falkenstine

### 1987: Trends in Flight Frequency by Time of Day

#### Summary
US Domestic flight frequency has been plotted as arrivals and departures by airport on a map of the USA. Moving through the hours of the day shows when flight traffic was heavy and light. Clicking on an airports arrival or departure bar reveals the where the flights making up that bar were traveling to and from. Trends in the 1.3 million recorded flights from 1987 can be found in seconds.

#### Design
Looking at trying to show flights for the US a dot plot of a map of the states was a natural choice. The AlbersUSA composite projection nicely displays all 50 states without wasting too much space. The latitude and longitude of each airport is encoded by the location of an ellipse on the map. The number of flights per hour is encoded as two bars, arrivals and departures, at each airport. Departures and arrivals are differentiated using color. When a bar is clicked for a detailed view the flight paths show other airport involved in the flight. A marker, whose size represents the number of flights, uses motion to show the flight path.
#### Feedback
1. Selecting small bars is too hard.
Needs a legend
what airport is what?
circles on wrong scale DONE
zoom

add big circle with ellipse
    add mouse over event that makes ellipse and bars growsw
#### Resources
Help on drawing arcs:
    http://stackoverflow.com/questions/17156283/d3-js-drawing-arcs-between-two-points-on-map-from-file
Example of animating path drawing:
    http://bl.ocks.org/duopixel/4063326
Example showing how to move a marker along a path:
    https://bl.ocks.org/mbostock/1705868