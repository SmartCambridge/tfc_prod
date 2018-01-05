"use strict";
// ***************************************************************************
// *******************  Page and map code ************************************
// ***************************************************************************
// Constants

var VERSION = '3.08a';

var RTMONITOR_URI = 'http://tfc-app2.cl.cam.ac.uk/rtmonitor/sirivm';

var LOG_TRUNCATE = 200; // we'll limit the log to this many messages

var MAP_CENTER = [52.218, -0.0666];//[52.205, 0.119];
var MAP_SCALE = 15;//13;

var OLD_TIMER_INTERVAL = 30; // watchdog timer interval (s) checking for old data records
var OLD_DATA_RECORD = 60; // time (s) threshold where a data record is considered 'old'

var SVGNS = 'http://www.w3.org/2000/svg';

var DRAW_PROGRESS_LEFT_MARGIN = 5;
var DRAW_PROGRESS_RIGHT_MARGIN = 5;
var DRAW_PROGRESS_TOP_MARGIN = 20;
var DRAW_PROGRESS_BOTTOM_MARGIN = 10;

// ******************
// ANALYSIS CONSTANTS
//
// Weight applied to the SEGMENT DISTANCE segment probabilities
var SEGMENT_DISTANCE_WEIGHT = 1.0;

// Weight applied to the PROGRESS segment probabilities
var SEGMENT_PROGRESS_WEIGHT = 0.5; // progress_vector 0..1 mapped to WEIGHT..1+WEIGHT

// Weight applied to the TIMETABLE segment probabilities
var SEGMENT_TIMETABLE_WEIGHT = 1.0;

// Adjustments to the segment distance -> probability algorithm
// If bus is in the 'passed' semicircle beyond the segment, the distance is adjusted times
// this amount plus the segment distance adjust, i.e. segment probability will be lower.
var SEGMENT_BEYOND_ADJUST = 0.5;
// Similarly adjust the probability down if BEFORE the segment
var SEGMENT_BEFORE_ADJUST = 0.5;
// Distances are adjusted by this amount to stop very short distances like 2m dominating.
var SEGMENT_DISTANCE_ADJUST = 50;

// The probabilties suggesting BACKWARDS movement (i.e. negative progress_delta) need to
// be reduced compared to a simple probability distribution around the expected distance.
// 3.07 var PROGRESS_BACKWARD_ADJUST = 0.2; // adjustment to progress probability if it is backwards

// We can skew the distribution to favor distances LESS than the expected distance rather
// the further than the expected distance (i.e. buses are more likely to be slower than
// expected than faster). We do this by adjusting progress probabilities upwards (towards 1.0)
// by this proportion.
// 3.07 var PROGRESS_SLOW_ADJUST = 0.5; // e.g. 0.2 becomes 0.2 + (1-0.2)*PROGRESS_SLOW_ADJUST = 0.6;

// (m) The progress probability algorithm assigns probabilties to a *distance* profile and
// then maps that to segments. This would mean very short segments get very low probabilities.
// We compensate for this by using a 'minimum' segment length (this can be thought of as each
// stop being equivalent to half of this distance).
var PROGRESS_MIN_SEGMENT_LENGTH = 150;

// *************************************************************
// *************************************************************
// Globals
// *************************************************************
// *************************************************************
var map;       // Leaflet map
var map_tiles; // map tiles layer

var urlparams = new URLSearchParams(window.location.search);
var debug = urlparams.has('debug');
var mapbounds;

var clock_time; // the JS Date 'current time', either now() or replay_time
var clock_timer; // the intervaltimer to update the clock in real time (not during replay)

var log_div; // page div element containing the log

var page_progress = {}; // All the 'progress' page elements and page-related global vars
//    .div -- page div element to hold progress visualization
//    .svg -- svg element within div for drawn elements
//    .annotations -- array with element for each route segment derived from data segment_index annotations
//       .box -- the svg rect
//    .route_profile -- the route_profile currently being displayed
//
var progress_update_elements = []; // these are the SVG elements we delete and create each update

var PROGRESS_X_START; // pixel dimensions of progress visual route draw area
var PROGRESS_X_FINISH;
var PROGRESS_Y_START;
var PROGRESS_Y_FINISH;

var log_record_odd = true; // binary toggle for alternate log background colors

var log_append = false;

var log_data = false;

// *********************************************************
// RTRoutes globals

// Sensor data - dictionary of sensors by sensor_id
var sensors = {};
// Where each sensor:
// sensor
//    .msg              - the most recent data message received for this sensor
//    .state
//        .route        - array of stop records
//        .segment_index  - the index of the NEXT STOP in the ROUTE
//        .segment_progress - 0..1 proportion of segment travelled so far
//        .segment_vector - probability vector for bus on each route segment
//        .route_profile - [ {time_secs (s), distance (m), turn(deg)},...]

// Local dictionary of STOPS keyed on stop_id
// Sample stop record in rtroute_stops:
// { stop_id:'0500CCITY055', lat:52.2114061236, lng:0.10481260687, common_name:'Storey\'s Way'},
// becomes
// stops['0500CCITY055'] = {this stop record}
var stops = {};

// Local dictionary of JOURNEYS keyed on vehicle_journey_id
// Sample journey data record in rtroutes_journeys:
// {vehicle_journey_id:'20-4-_-y08-1-98-T2',order:1,time:'11:22:00',stop_id:'0500SCAMB011'},
// becomes:
// journeys['20-4-_-y08-1-98-T2'] = { route: [ ... {above record} ] }
var journeys = {};
var journey_start_times = {}; // holds lists of journeys by start time
var current_journey_id = 0; // holds 'vehicle_journey_id' of route currently being analyzed

// Trip data (from rtroutes_trip.js)
//  { "Delay": "PT0S",
//    "acp_id": "SCCM-19611",
//    "acp_ts": 1511156152,
//    "Bearing": "0",
//    "InPanic": "0",
//    "LineRef": "4",
//    "acp_lat": 52.230381,
//    "acp_lng": 0.159207,
//    "Latitude": "52.2303810",
//    "Longitude": "0.1592070",
//    "Monitored": "true",
//    "OriginRef": "0500SCAMB011",
//    "OriginName": "De La Warr Way",
//    "VehicleRef": "SCCM-19611",
//    "OperatorRef": "SCCM",
//    "DataFrameRef": "1",
//    "DirectionRef": "INBOUND",
//    "DestinationRef": "0500CCITY484",
//    "RecordedAtTime": "2017-11-20T05:35:52+00:00",
//    "ValidUntilTime": "2017-11-20T05:35:52+00:00",
//    "DestinationName": "Drummer Str Stop D3",
//    "PublishedLineName": "4",
//    "VehicleMonitoringRef": "SCCM-19611",
//    "DatedVehicleJourneyRef": "2",
//    "OriginAimedDepartureTime": "2017-11-20T06:02:00+00:00"
//    },

// Data recording
var recorded_records = [];
var recording_on = false;

// Replay
var replay_time; // holds JS Date, current time of replay
var replay_timer; // the JS interval timer for the replay function
var replay_on = false; // Replay mode on|off
var replay_interval = 1; // Replay step interval (seconds)
var replay_speedup = 10; // relative speed of replay time to real time
var replay_index = 0; // current index into replay data
var replay_errors = 0; // simple count of errors during replay

// Segment analysis
var analyze = false;

// Batch replay
var batch = false;

// Annotate (i.e. the user adds the 'correct' segments to the data)
var annotate_auto = false;
var annotate_manual = false;

// *********************************************************
// Display options

var breadcrumbs = false; // location 'breadcrumbs' will be dropped as things move

var map_only = false; // page is in "only display map" mode

// Here we define the 'data record format' of the incoming websocket feed
var RECORD_INDEX = 'VehicleRef';  // data record property that is primary key
var RECORDS_ARRAY = 'request_data'; // incoming socket data property containing data records
var RECORD_TS = 'RecordedAtTime'; // data record property containing timestamp
var RECORD_TS_FORMAT = 'ISO8601'; // data record timestamp format
                                  // 'ISO8601' = iso-format string
var RECORD_LAT = 'Latitude';      // name of property containing latitude
var RECORD_LNG = 'Longitude';     // name of property containing longitude

// *****************
// Map globals
var ICON_URL = '/static/images/bus-logo.png';

var ICON_IMAGE = new Image();
ICON_IMAGE.src = ICON_URL;

var crumbs = []; // array to hold breadcrumbs as they are drawn

var icon_size = 'L';

var oldsensorIcon = L.icon({
    iconUrl: ICON_URL,
    iconSize: [20, 20]
});

// *************************
// **** Routes stuff

var bus_stop_icon = L.icon({
    iconUrl: '/static/images/bus_stop.png',
    iconSize: [15,40],
    iconAnchor: [3,40]
});

// ************************
// User 'draw polygon' global vars
var poly_draw = false; // true when user is drawing polygon
var poly_start; // first marker of drawn polygon
var poly_markers = [];
var poly_line; // open line around polygon
var poly_close; // line between poly last point and start, closing polygon

// *********************************************************************************
// *********************************************************************************
// ********************  INIT RUN ON PAGE LOAD  ************************************
// *********************************************************************************
// *********************************************************************************
function init()
{
    document.title = document.title + ' ' + VERSION;

    // initialize log 'console'
    log_div = document.getElementById('log_div');

    // initialize progress div
    page_progress.div = document.getElementById('progress_div');

    page_progress.svg = document.createElementNS(SVGNS, 'svg');
    page_progress.svg.setAttribute('width',page_progress.div.clientWidth);
    page_progress.svg.setAttribute('height',page_progress.div.clientHeight);

    page_progress.div.appendChild(page_progress.svg);
    PROGRESS_X_START = DRAW_PROGRESS_LEFT_MARGIN;
    PROGRESS_X_FINISH = page_progress.div.clientWidth - DRAW_PROGRESS_RIGHT_MARGIN;
    PROGRESS_Y_START = DRAW_PROGRESS_TOP_MARGIN;
    PROGRESS_Y_FINISH = page_progress.div.clientHeight - DRAW_PROGRESS_BOTTOM_MARGIN;


    // initialize map

    var map_options = { preferCanvas: true };

    map = L.map('map', map_options)
            .setView(MAP_CENTER, MAP_SCALE);

    map.on('click',click_map);

    map_tiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

    mapbounds = map.getBounds();

    // initialize clock

    update_clock(new Date());
    clock_timer = setInterval(function () { update_clock(new Date()); }, 1000);

    // initialize UI checkboxes

    document.getElementById('log_append').checked = false;
    document.getElementById('breadcrumbs').checked = false;

    // watchdog timer checking for 'old' data records

    setInterval(check_old_records, OLD_TIMER_INTERVAL*1000);

    // listener to detect ESC 'keydown' while in map_only mode to escape back to normal
    document.onkeydown = function(evt) {
            evt = evt || window.event;
            if (map_only && evt.keyCode == 27) // ESC to escape from map-only view
            {
                page_normal();
            }
            else if (evt.keyCode == 9) // TAB for replay_step
            {
                evt.preventDefault();
                replay_step();
            }
    };

    // RTROUTE STUFF

    // build stops dictionary keyed on stop_id
    load_stops();

    // build journeys dictionary keyed on vehicle_journey_id
    load_journeys();

    draw_stops();

    draw_progress_init();

    load_tests();

} // end init()

// *********************************************************************************
// ************* RTRoute code      ***************************************************
// *********************************************************************************

// Load the rtroute_stops array (from rtroute_stops.js) into stops dictionary
function load_stops()
{
    for (var i=0; i<rtroute_stops.length; i++)
    {
        stops[rtroute_stops[i].stop_id] = rtroute_stops[i];
    }
}

// Load the rtroute_journeys array (from rtroute_journeys.js) into journeys dictionary
// journey
//   .route = [
//      {vehicle_journey_id:'20-4-_-y08-1-98-T2',order:1,time:'11:22:00',stop_id:'0500SCAMB011'},
//      ...
//      ]
function load_journeys()
{
    journeys = {};
    journey_start_times = {};

    var journeys_count = 0;

    // Iterate through all the vehicle_journey_id/stop_id/time/order... records
    for (var i=0; i<rtroute_journeys.length; i++)
    {
        var journey_stop = rtroute_journeys[i];
        var stop_index = journey_stop.order - 1; // order goes 1..n, stop_index starts at 0
        var vehicle_journey_id = journey_stop.vehicle_journey_id;
        var stop = stops[journey_stop.stop_id];

        // For a given row of that data, either create a new journey or add to existing
        if (journeys.hasOwnProperty(vehicle_journey_id))
        {
            var journey = journeys[vehicle_journey_id];

            // Add an arrow from previous stop to this stop
            if (stop_index > 0)
            {
                var prev_stop = stops[journey.route[stop_index - 1].stop_id];
                var diffLat = stop.lat - prev_stop.lat;
                var diffLng = stop.lng - prev_stop.lng;
                var center = [prev_stop.lat + diffLat/2, prev_stop.lng + diffLng/2];
                var angle = (get_bearing(prev_stop, stop)- 90 + 360) % 360;
                journey.route[stop_index - 1].arrow = new L.marker(
                    center,
                    { icon: new L.divIcon({
                                  className : 'arrow_icon',
                                  iconSize: new L.Point(30,30),
                                  iconAnchor: new L.Point(15,15),
                                  html : '<div style = "font-size: 20px;'+
                                      '-webkit-transform: rotate('+ angle +'deg)">&#10152;</div>'
                                  })
                    }
                );
            }
            // Add this journey row to an existing journey in dictionary
            journey.route[stop_index] = journey_stop;
        }
        else
        {
            //console.log('Starting new journey with '+JSON.stringify(journey_stop));

            // Create a new journey entry with this vehicle_journey_id
            // Start with route of just this current stop
            var new_route = [];
            new_route[stop_index] = journey_stop;

            var journey_id = journey_stop.vehicle_journey_id;

            // Add this route to a new journeys entry
            journeys[journey_id] = {route: new_route};

            journeys_count++; // keep track of total number of journeys

            // Add this journey to the journey_start_time dictionary
            //
            var journey_start_time = journey_stop.time;

            if (journey_start_times.hasOwnProperty(journey_start_time))
            {
                //console.log('Additional journey '+journey_id+' at start time '+journey_start_time);

                // Existing start time, so append this vehicle_journey_id
                journey_start_times[journey_start_time].push(journey_id);
            }
            else
            {
                // New start time, so create entry with list of just this journey_id
                journey_start_times[journey_start_time] = [ journey_id ];
            }
        }
    }
    log(journeys_count + ' journeys created');

    print_timetable(journey_start_times);
}

// Development tool print journey start times
function print_timetable(journey_start_times)
{
    // For development see how many journeys are exact duplicates
    //
    var unique_journeys = 0;

    console.log('Checking for duplicate journeys in '+
                Object.keys(journey_start_times).length+' start times');

    var print_lines = []; // accumulate start time debug messages to sort and print

    // Iterate through all start times
    for (var start_time in journey_start_times)
    {
        if (journey_start_times.hasOwnProperty(start_time))
        {
            var unique_this_start_time;
            var journey_ids = journey_start_times[start_time][0];

            if (journey_start_times[start_time].length == 1)
            {
                unique_journeys++;
                unique_this_start_time = 1;
            }
            else
            {
                unique_this_start_time = 1;
                unique_journeys++; // for the first journey at this start time
                // For this start time, iterate through additional journeys
                for (var j=1; j<journey_start_times[start_time].length; j++)
                {
                    journey_ids += ' '+journey_start_times[start_time][j];

                    if (unique_journey(journey_start_times[start_time],j))
                    {
                        unique_journeys++;
                        unique_this_start_time++;
                        // If this jounrney different than others at this start time then print
                        //console.log(start_time+' '+
                        //            journey_to_string(journey_start_times[start_time][j]));
                    }
                }
            }
            // If multiple different journeys at this start time then print the first
            //if (unique_this_start_time>1)
            //{
            //    console.log(start_time+' '+
            //                journey_to_string(journey_start_times[start_time][0]));
            //}

            print_lines.push('Start '+start_time+
                        ' ('+unique_this_start_time+' unique) '+
                        journey_ids
                       );
        }
    }
    console.log('Total unique journeys: '+unique_journeys);
    console.log(print_lines.sort().join('\n'));

}

// return true if journey_ids[index] is unique journey compared to journey_ids[0..index-1]
function unique_journey(journey_ids, index)
{
    for (var i=0; i<index; i++)
    {
        if (same_journey(journey_ids[i],journey_ids[index]))
        {
            return false;
        }
    }
    return true;
}

// return true if journey_id_a and journey_id_b represent the same route
function same_journey(journey_id_a, journey_id_b)
{
    var route_a = journeys[journey_id_a].route;
    var route_b = journeys[journey_id_b].route;

    if (route_a.length != route_b.length)
    {
        return false;
    }

    for (var i=0; i<route_a.length; i++)
    {
        if (route_a[i].time != route_b[i].time)
        {
            return false;
        }

        if (route_a[i].stop_id != route_b[i].stop_id)
        {
            return false;
        }
    }

    //console.log('Identical journeys '+journeys[journey_id_a].route[0].time+
    //            ' '+journey_id_a+
    //            ' '+journey_id_b);
    return true;
}

function journey_to_string(journey_id)
{
    var route = journeys[journey_id].route;
    var str = journey_id;
    for (var i=0; i<route.length; i++)
    {
        str += ' { '+route[i].time+', '+route[i].stop_id+'}';
    }
    return str;
}

// Create the control pane 'test buttons'
function load_tests()
{
    // get DIV to add buttons to
    var test_buttons = document.getElementById('test_buttons');

    for (var test_name in test_data)
    {
        if (test_data.hasOwnProperty(test_name))
        {
            var test_button = document.createElement('input');
            test_button.setAttribute('type', 'button');
            test_button.setAttribute('class', 'test_button');
            test_button.setAttribute('value', test_name);
            test_button.onclick = (function (x)
                                   {
                                       return function () { load_test_data(x); };
                                   }
                                  )(test_name);

            test_buttons.appendChild(test_button);
        }
    }
}

// ************************************************************************************
// ************************    TIMETABLE API SHIM    **********************************
// ************************************************************************************
//debug Given a sirivm msg, return the vehicle journey_id
function sirivm_to_vehicle_journey_id(msg)
{
    switch (msg['OriginAimedDepartureTime'])
    {
        case '2017-11-20T06:02:00+00:00':
            return '20-4-_-y08-1-51-T0';

        case '2017-11-20T06:22:00+00:00':
            return '20-4-_-y08-1-1-T0';

        case '2017-11-20T06:42:00+00:00':
            return '20-4-_-y08-1-2-T0';

        case '2017-11-20T07:22:00+00:00':
            return '20-4-_-y08-1-4-T0';

        case '2017-11-20T07:42:00+00:00':
            return '20-4-_-y08-1-5-T0';

        default:
            //log('<span style="color: red">Vehicle departure time not recognized</span>');

    }

    return 0;
}

function vehicle_journey_id_to_journey(vehicle_journey_id)
{
    return journeys[vehicle_journey_id];
}

function vehicle_journey_id_to_route(vehicle_journey_id)
{
    if (!journeys.hasOwnProperty(vehicle_journey_id))
    {
        return null;
    }
    return journeys[vehicle_journey_id].route;
}

// ************************************************************************************
// ************************************************************************************
// ************************************************************************************
// ************************************************************************************
// ************* Sensor update code ***************************************************
// ************************************************************************************
// ************************************************************************************

// We maintain the 'state' of a sensor as we progress:
//
// sensor
//    .msg              - the most recent data message received for this sensor
//    .state
//        .route        - array of stop records
//        .segment_index  - the index of the NEXT STOP in the ROUTE
//        .segment_progress - 0..1 proportion of segment travelled so far
//        .segment_vector - probability vector for bus on each route segment
//        .route_profile - [ {time_secs (s), distance (m), turn(deg)},...]
//        .progress_vector - latest calculated segment probabilties based on expected progress
//        .distance_vector - latest calculated segment probabilties based on segment proximity
//        .timetable_vector - latest calculated segment probabilities based on timetable
//

// We have received a new data message from an existing sensor, so analyze and update state
function update_sensor(msg, clock_time)
{
		// existing sensor data record has arrived

        var sensor_id = msg[RECORD_INDEX];

		if (get_msg_date(msg).getTime() != get_msg_date(sensors[sensor_id].msg).getTime())
        {
            // move marker
            var pos = get_msg_point(msg);
            var marker = sensors[sensor_id].marker;
		    marker.moveTo([pos.lat, pos.lng], [1000] );
		    marker.resume();

            // update tooltip and popup
		    marker.setTooltipContent(tooltip_content(msg));
		    marker.setPopupContent(popup_content(msg));

            // store as latest msg
            // moving current msg to prev_msg
            sensors[sensor_id].prev_msg = sensors[sensor_id].msg;
		    sensors[sensor_id].msg = msg; // update entry for this msg
            add_breadcrumb(pos);

            var sensor = sensors[sensor_id];

            update_state(sensor, clock_time);
		}
}

// We have received data from a previously unseen sensor, so initialize
function create_sensor(msg, clock_time)
{
    // new sensor, create marker
    log(' ** New '+msg[RECORD_INDEX]);

    var sensor_id = msg[RECORD_INDEX];

    var sensor = { sensor_id: sensor_id,
                   msg: msg
                 };

    var marker_icon = create_sensor_icon(msg);

    sensor['marker'] = L.Marker.movingMarker([[msg[RECORD_LAT], msg[RECORD_LNG]],
                                                   [msg[RECORD_LAT], msg[RECORD_LNG]]],
                                                  [1000],
                                                  {icon: marker_icon});
    sensor['marker']
        .addTo(map)
        .bindPopup(popup_content(msg), { className: "sensor-popup"})
        .bindTooltip(tooltip_content(msg), {
                            // permanent: true,
                            className: "sensor-tooltip",
                            interactive: true
                          })
        .on('click', function()
                {
                  //console.log("marker click handler");
                })
        .start();

    sensors[sensor_id] = sensor;

    init_state(sensor, clock_time);
}

// Initialize sensor state (e.g. for bus, vehicle_journey_id, segment_index)
function init_state(sensor, clock_time)
{
    //log('Initializing '+sensor.sensor_id);

    sensor.state = {};

    if (!sensor.msg['OriginRef'])
    {
        return;
    }

    sensor.state.vehicle_journey_id = sirivm_to_vehicle_journey_id(sensor.msg);

    sensor.state.route = vehicle_journey_id_to_route(sensor.state.vehicle_journey_id);

    //debug detect when route not found

    sensor.state.segment_index = 0;

    // flag if this record is OLD or NEW
    init_old_status(sensor, clock_time);

    // We have a user checkbox to control bus<->segment tracking
    if (analyze)
    {
        init_route_analysis(sensor);

        draw_progress_init(sensor); // add full route

        draw_progress_update(sensor); // add moving markers

        log_analysis(sensor);
    }

    // Auto Annotation - we add calculated segment index to the msg, so we
    // can subsequently save these records and use as annotated data.
    if (annotate_auto)
    {
        sensor.msg.segment_index = [ sensor.state.segment_index ];
    }
}

// Write messages to in-page log when segment-probability errors occur
function log_analysis(sensor)
{
    var annotated_segment_index = sensor.msg.segment_index; // array of 'correct' segment_index values

    if (annotated_segment_index == null)
    {
        log(hh_mm_ss(get_msg_date(sensor.msg))+' segment_index '+sensor.state.segment_index);
    }
    else
    {
        if (!annotated_segment_index.includes(sensor.state.segment_index))
        {
            log('<span style="color: red">'+
                hh_mm_ss(get_msg_date(sensor.msg))+
                ' wrong segment_index '+sensor.state.segment_index+
                ' should be '+annotated_segment_index.toString()+
                '</span>');
            // update the global replay 'error' count
            replay_errors++;
        }
    }
}

// Update sensor state

function update_state(sensor, clock_time)
{
    //log('Updating '+sensor.sensor_id);

    // flag if this record is OLD or NEW
    update_old_status(sensor, clock_time);

    // We have a user checkbox to control bus<->segment tracking
    if (analyze)
    {
        update_route_analysis(sensor);

        draw_progress_update(sensor);

        log_analysis(sensor);
    }

    // Auto Annotation - we add calculated segment index to the msg, so we
    // can subsequently save these records and use as annotated data.
    if (annotate_auto)
    {
        sensor.msg.segment_index = [ sensor.state.segment_index ];
    }

}

// Given a data record, update '.old' property t|f and reset marker icon
// Note that 'current time' is the JS date value in global 'clock_time'
// so that this function works equally well during replay of old data.
//
function init_old_status(sensor, clock_time)
{
    update_old_status(sensor, clock_time);
}

function update_old_status(sensor, clock_time)
{
    var data_timestamp = get_msg_date(sensor.msg); // will hold Date from sensor

    // get current value of sensor.state.old flag (default false)
    var current_old_flag = !(sensor.state.old == null) || sensor.state.old;

    // calculate age of sensor (in seconds)
    var age = (clock_time - data_timestamp) / 1000;

    if (age > OLD_DATA_RECORD)
    {
        // data record is OLD
        // skip if this data record is already flagged as old
        if (sensor.state.old != null && sensor.state.old)
        {
            return;
        }
        // set the 'old' flag on this record and update icon
        sensor.state.old = true;
        sensor.marker.setIcon(oldsensorIcon);
    }
    else
    {
        // data record is NOT OLD
        // skip if this data record is already NOT OLD
        if (sensor.state.old != null && !sensor.state.old)
        {
            return;
        }
        // reset the 'old' flag on this data record and update icon
        sensor.state.old = false;
        sensor.marker.setIcon(create_sensor_icon(sensor.msg));
    }
}

//debug hardcoded to 0
function init_route_analysis(sensor)
{
    // segment_index is the index of the current route segment, also index of NEXT STOP in route
    sensor.state.segment_index = 0;
    // segment_progress is estimate of progress along current route segment 0..1
    sensor.state.segment_progress = 0;

    // Create array of { time: (seconds), distance: (meters) } for route, with start at {0,0}
    sensor.state.route_profile = create_route_profile(sensor.state.route);

    // Highlight the current route segment for this bus
    draw_route_segment(sensor);
}

// *****************************************************************
// Update sensor.state.segment_index and sensor.state.segment_vector
//
// This is the key function that calculates the position of the bus
// along its route.
//
// The basic approach is to call sub-functions update_progress_vector(sensor)
// and update_distance_vector(sensor), each of which returns a
// probability vector of the route segment probabilities, and then we
// combine those to pruduce the final 'segment_vector'.
//
function update_route_analysis(sensor)
{
    // shuffle current segment_index to prev_segment_index (previous)
    sensor.state.prev_segment_index = sensor.state.segment_index;

    // If sensor doesn't have a vehicle_journey_id then
    // there's nothing we can do, so return
    if (!sensor.state.vehicle_journey_id)
    {
        return;
    }

    // Get PROGRESS vector
    var progress_vector = update_progress_vector(sensor);
    // Add progress vector to state
    sensor.state.progress_vector = progress_vector;

    // Get SEGMENT DISTANCE vector
    var distance_vector = update_distance_vector(sensor);
    // Add distance_vector to state
    sensor.state.distance_vector = distance_vector;

    // Get TIMETABLE vector
    var timetable_vector = update_timetable_vector(sensor);
    // Add timetable_vector to state
    sensor.state.timetable_vector = timetable_vector;

    // Combine vectors into overall SEGMENT PROBABILITY VECTOR (segment_vector)
    var segment_sum = [];

    for (var i=0; i < progress_vector.length; i++)
    {
        segment_sum.push( SEGMENT_DISTANCE_WEIGHT * distance_vector[i] +
                          SEGMENT_PROGRESS_WEIGHT * progress_vector[i] +
                          SEGMENT_TIMETABLE_WEIGHT * timetable_vector[i]
                        );
    }
    //console.log('          product :'+vector_to_string(segment_sum));

    var segment_vector = linear_adjust(segment_sum);

    sensor.state.segment_vector = segment_vector;

    // Set sensor.state.segment_index to segment with highest probability
    sensor.state.segment_index = max_index(segment_vector);

    console.log(hh_mm_ss(get_msg_date(sensor.msg))+
                ' progress :'+vector_to_string(progress_vector,' ','('));

    console.log('         distance :'+vector_to_string(distance_vector,' ','('));

    console.log('        timetable :'+vector_to_string(timetable_vector,' ','('));

    console.log('         RESULT '+
                (' '+sensor.state.segment_index).slice(-2)+
                ':'+vector_to_string(segment_vector,'-','<','{',sensor.msg.segment_index));
    console.log('');

    // segment_progress is 0..1 along current segment (segment_index)
    sensor.state.segment_progress = get_segment_progress(sensor);

    draw_route_segment(sensor);
}

// Return index of vector element containing highest value
function max_index(vector)
{
    var max_value = vector[0];
    var max_index = 0;

    for (var i=0; i<vector.length; i++)
    {
        if (vector[i] > max_value)
        {
            max_index = i;
            max_value = vector[i];
        }
    }

    return max_index;
}

// ******************************************************************************
// ******************************************************************************
// DISTANCE VECTOR ANALYSIS
// Calculate segment probability vector based on DISTANCE FROM SEGMENTS
// Route segment distance -> segment probability vector
// ******************************************************************************
// Given a sensor, return an array of distances of sensor from each route segment
// where the segment is route[segment_index-1]..route[segment_index]

// Calculate an INITIAL probability vector for segments given a bus
//debug hardcoded to first segment
function init_segment_distance_vector(sensor)
{
    var route = sensor.state.route;

    var segments = route.length + 1;

    var segment_probability_vector = new Array(segments);

    segment_probability_vector[0] = 1;

    for (var i=1; i<segments; i++)
    {
        segment_probability_vector[i] = 0;
    }

    return segment_probability_vector;
}

// Calculate the segment probability vector for an existing bus
function update_distance_vector(sensor)
{
    // How many nearest segments to consider (zero out others)
    var NEAREST_COUNT = 5;

    var P = get_msg_point(sensor.msg);

    var route = sensor.state.route;

    var route_profile = sensor.state.route_profile;

    var segments = route.length + 1;

    // Create distance_vector array of { segment_index:, distance: }
    var distance_vector = [];

    // Add distance to first stop as distance_vector[0]

    distance_vector.push( { segment_index: 0, distance: get_distance(P, stops[route[0].stop_id]) } );

    // Now add the distances for route segments
    for (var segment_index=1; segment_index<segments-1; segment_index++)
    {
        //debug use route_profile
        var prev_stop = stops[route[segment_index-1].stop_id];
        var next_stop = stops[route[segment_index].stop_id];
        var dist = get_distance_from_line(P, [prev_stop,next_stop]);

        distance_vector.push({ segment_index: segment_index, distance: dist });
    }

    // And for the 'finished' segment[segments-1] add distance from last stop

    //debug use route_profile
    // Add distance to last stop (for 'finished' segment)
    distance_vector.push({ segment_index: segments - 1,
                           distance: get_distance(P, stops[route[route.length-1].stop_id]) });

    // Create sorted nearest_segments array of NEAREST_COUNT
    // { segment_index:, distance: } elements
    var nearest_segments = distance_vector
                                .slice() // create copy
                                .sort((a,b) => Math.floor(a.distance - b.distance))
                                .slice(0,NEAREST_COUNT);

    //console.log('nearest : '+nearest_segments.map( x => JSON.stringify(x) ));

    // Create array[NEAREST_COUNT] containing segment probabilities 0..1, summing to 1
    //var nearest_probs = linear_adjust(
    //                        nearest_segments.map( x =>
    //                                              SEGMENT_DISTANCE_ADJUST /
    //                                              ( x.distance/2 + SEGMENT_DISTANCE_ADJUST)));
    var nearest_probs = segment_distances_to_probs(P, route_profile, nearest_segments);

    // Initialize final result segment_vector with zeros
    // and then insert the weights of the nearest segments
    var segment_probability_vector = new Array(segments);

    // Initialize entire vector to 0
    for (var i=0; i<segments; i++)
    {
        segment_probability_vector[i] = 0;
    }
    // Insert in the calculations for nearest segments
    for (var j=0; j<nearest_segments.length; j++)
    {
        segment_probability_vector[nearest_segments[j].segment_index] = nearest_probs[j];
    }

    return segment_probability_vector;
}

// Convert Point, [ {segment_index, distance},... ] to probabilties in same order
function segment_distances_to_probs(P, route_profile, nearest_segments)
{
    var probs = new Array(nearest_segments.length);

    // debug print the 'nearest segments' array to console
    var debug_str = '';
    for (var i=0; i<nearest_segments.length; i++)
    {
        debug_str += JSON.stringify(nearest_segments[i]);
    }
    console.log(debug_str);
    debug_str = '';

    for (var i=0; i<nearest_segments.length; i++)
    {
        var segment_index = nearest_segments[i].segment_index;

        var segment_distance = nearest_segments[i].distance;

        //var prob; // probability bus is on this segment
        probs[i] = segment_distance_to_prob(P, route_profile, segment_index, segment_distance);
    }
    console.log(debug_str);
    return linear_adjust(probs);
}

// Convert a segment_index + segment_distance to probability
function segment_distance_to_prob(P, route_profile, segment_index, segment_distance)
{
    var prob;

    if (segment_index < route_profile.length)
    {

        // First of all we'll see if the bus is BEYOND the end stop of the segment
        //
        // bearing_out is the bearing of the next route segment
        var bearing_out;

        if (segment_index < route_profile.length - 1)
        {
            bearing_out = route_profile[segment_index+1].bearing_in;
        }
        else
        {
            bearing_out = route_profile[segment_index].bearing_in;
        }
        // bisector_out is the outer angle bisector of this segment and the next
        var bisector_out = route_profile[segment_index].bisector;
        // turn_out is the degrees turned from this segment to the next (clockwise)
        var turn_out = route_profile[segment_index].turn;
        // end_bearing_to_bus is the bearing of the bus from the end bus-stop
        var end_bearing_to_bus = Math.floor(get_bearing(route_profile[segment_index], P));

        var beyond = test_beyond_segment(end_bearing_to_bus, turn_out, bearing_out, bisector_out);

        if (!beyond)
        {
                // We believe the bus is probably NOT beyond the segment
                //
                // We can now test if it is BEFORE the start stop of the segment
                //
                if (segment_index == 0) // can't be before the 'not yet started' segment 0
                {
                    prob = SEGMENT_DISTANCE_ADJUST /
                           ( segment_distance / 2 +
                             SEGMENT_DISTANCE_ADJUST);
                }
                else
                {
                    // route bearing on the run-up towards the segment start bus-stop
                    var bearing_before = route_profile[segment_index-1].bearing_in;
                    // outer angle bisector bearing at the segment start bus-stop
                    var bisector_before = route_profile[segment_index-1].bisector;
                    // turn at start bus-stop (degrees clockwise, i.e. turn left 10 degrees is 350)
                    var turn_before = route_profile[segment_index-1].turn;
                    // bearing of bus from start bus-stop
                    var start_bearing_to_bus = Math.floor(get_bearing(route_profile[segment_index-1],P));

                    var before = test_before_segment(start_bearing_to_bus,
                                                     turn_before,
                                                     bearing_before,
                                                     bisector_before);

                    if (!before)
                    {
                        // Here we are neither BEFORE or BEYOND, so use default probability
                        prob = SEGMENT_DISTANCE_ADJUST /
                               ( segment_distance / 2 +
                                 SEGMENT_DISTANCE_ADJUST);
                    }
                    else
                    {
                        // We believe we are BEFORE the segment, so adjust the probability
                        prob = ( SEGMENT_DISTANCE_ADJUST /
                                 ( segment_distance / 2 +
                                   SEGMENT_DISTANCE_ADJUST)) * SEGMENT_BEFORE_ADJUST ;
                    }

                }
        }
        else
        {
                // We believe the bus is probably BEYOND the segment
                prob = ( SEGMENT_DISTANCE_ADJUST /
                         ( segment_distance / 2 +
                           SEGMENT_DISTANCE_ADJUST)
                       ) * SEGMENT_BEYOND_ADJUST;
        }

        console.log( '{ segment '+segment_index+
                     ',out='+bearing_out+
                     ',turn='+turn_out+
                     ',bus='+end_bearing_to_bus+
                     ',bi='+bisector_out+
                     ',dist='+Math.floor(segment_distance)+
                     ',prob='+(Math.floor(100*prob)/100)+'}'+
                     ' '+(before ? 'BEFORE' : 'NOT BEFORE')+'/'+
                     (beyond ? 'BEYOND' : 'NOT BEYOND')
                     );
    }
    else // on 'finished' segment
    {
        prob = SEGMENT_DISTANCE_ADJUST /
               ( segment_distance / 2 +
                     SEGMENT_DISTANCE_ADJUST);
    }
    return prob;
}

// return TRUE is bus is BEYOND segment
function test_beyond_segment(bearing_to_bus, turn, bearing_out, bisector)
{
    var beyond; // boolean true if bus is BEYOND segment

    // For a small turn, we use the perpendicular line to next segment either
    // side of current stop as boundary of considering this stop passed
    if (turn < 45 || turn > 315)
    {
        var angle1 = angle360(bearing_out-90);
        var angle2 = angle360(bearing_out+90);
        if (test_bearing_between(bearing_to_bus, angle1, angle2))
        {
            // We believe the bus is probably BEYOND the stop
            beyond = true;
            //console.log(' BEYOND <45 turn='+turn);
        }
        else
        {
            // We believe the bus is probably NOT BEYOND the stop
            beyond = false;
            //console.log(' NOT BEYOND <45 turn='+turn);
        }
    }
    else // For a larger turn we use the zone from bisector to bearing_out
    {
        if (turn < 180)
        {
            beyond = test_bearing_between(bearing_to_bus, bisector, bearing_out);
        }
        else
        {
            beyond = test_bearing_between(bearing_to_bus, bearing_out, bisector);
        }

        //console.log( (beyond ? ' BEYOND ' : ' NOT BEYOND ')+ ' >45 turn='+turn);
    }
    return beyond;
}

// return TRUE if bus is BEFORE segment
function test_before_segment(bearing_to_bus, turn, bearing_before, bisector)
{
    var before; // boolean true if bus is BEFORE segment

    // For a small turn, we use the perpendicular line to next segment either
    // side of current stop as boundary of considering this stop passed
    if (turn < 45 || turn > 315)
    {
        var angle1 = angle360(bearing_before+90);
        var angle2 = angle360(bearing_before-90);
        if (test_bearing_between(bearing_to_bus, angle1, angle2))
        {
            // We believe the bus is probably BEFORE the stop
            before = true;
            //console.log(' BEFORE <45 turn='+turn);
        }
        else
        {
            // We believe the bus is probably NOT BEFORE the stop
            before = false;
            //console.log(' NOT BEFORE <45 turn='+turn);
        }
    }
    else // For a larger turn we use the zone from bisector to bearing_out
    {
        var bearing_back = angle360(bearing_before+180);

        if (turn < 180)
        {
            before = test_bearing_between(bearing_to_bus, bearing_back, bisector);
        }
        else
        {
            before = test_bearing_between(bearing_to_bus, bisector, bearing_back);
        }

        //console.log( (before ? ' BEFORE ' : ' NOT BEFORE ')+ ' >45 turn='+turn);
    }
    return before;
}

// ******************************************************************************
// ******************************************************************************
// PROGRESS VECTOR ANALYSIS
// Calculate segment probability vector based on PROGRESS along route
// Projects bus position forwards using predicted speed and time between records
// ******************************************************************************

function update_progress_vector(sensor)
{
    // CONSTANTS used in the algorithm
    var PROGRESS_ERROR = 0.1; // General error to apply to all segments
                              // in case algorithm is completely wrong
                              // i.e. background probability is PROGRESS_ERROR/segments

    // 3.07 var PROGRESS_MAX = 1.5; // How far we will look ahead to calculate distance probabilities
                             // relative to progress_delta (i.e. estimated progress distance)
    var PROGRESS_MAX = 2; // 3.08

    var MIN_HOP_DISTANCE = 50; // (m) If bus has hopped less than this, then use hop_distance
                               // as progress_delta

    var MIN_SEGMENT_DISTANCE = 150; // (m), if route segment seems shorter then this, then use this.

    var PROGRESS_STEPS = 10; // We will model the progress probability distribution in 10 steps

    var PROGRESS_STOPPED_TIME = 15; // How long we assume bus is stopped at each stop (s)

    // Some core 'final' vars
    var route = sensor.state.route;
    var segment_index = sensor.state.segment_index;
    var route_profile = sensor.state.route_profile;
    var segment_progress = sensor.state.segment_progress;

    // Note for 'n' stops we have 'n+1' segments, including before start and after finish
    var segments = route.length + 1;

    //debug maybe only do this in timetable_vector
    // Exit early with segment=0 if time < route start
    var msg_date = get_msg_date(sensor.msg);
    if ((msg_date.getSeconds() + 60 * msg_date.getMinutes() + 3600 * msg_date.getHours()) <
        route_profile[0].time_secs)
    {
        var start_vector = new Array(segments);
        start_vector[0] = 0.9;
        start_vector[1] = 0.1;
        for (var i=2; i<segments; i++)
        {
            start_vector[i] = 0;
        }
        return start_vector;
    }

    // hop_time (s) is time delta since last data point
    var hop_time = sensor.prev_msg ? (get_msg_date(sensor.msg).getTime() -
                                      get_msg_date(sensor.prev_msg)
                                     ) / 1000 :
                                     0;
    hop_time = Math.floor(hop_time);

    // hop_distance (m) is how far bus has moved since last data point
    var hop_distance = sensor.prev_msg ? get_distance(get_msg_point(sensor.prev_msg),
                                                      get_msg_point(sensor.msg))
                                       : 0;
    hop_distance = Math.floor(hop_distance);

    // Here's how far the bus is along its route
    var segment_start_distance = segment_index > 0 ? route_profile[segment_index-1].distance : 0;

    var segment_end_distance = route_profile[segment_index].distance;

    var progress_distance = segment_start_distance +
                            segment_progress *
                            ( segment_end_distance - segment_start_distance);
    progress_distance = Math.floor(progress_distance);

    console.log(hh_mm_ss(get_msg_date(sensor.msg))+
                ' segment_index: '+segment_index+
                ' progress_distance: '+progress_distance+
                ' hop_time: '+hop_time+
                ' hop_distance: '+hop_distance);

    // *** *** ***
    // Estimate PROGRESS DELTA (the distance along route we estimate the bus has moved since last data record)

    var progress_delta = Math.floor(hop_distance); // The distance we are predicting the bus has moved along route
                                                   // (we will update this below)

    // 'spread' is the estimated standard deviation of the probability curve
    var spread = hop_time / 2; // 3.08

    var hop_max_progress = PROGRESS_MAX;

    var hop_stopped_time = PROGRESS_STOPPED_TIME;

    // If bus appears to have moved very little, we will use hop distance as the estimated progress_delta
    if (hop_distance < MIN_HOP_DISTANCE)
    {
        console.log('          SHORT HOP, (below min hop distance) progress_delta: '+progress_delta);
    }
    else
    {
        var bus_speed = progress_speed(segment_index, route_profile);

        // Estimate progress distance based on speed and time since last point
        // with upward adjustment to (hop_distance+5%) if that is larger. I.e.
        // progress_delta must be AT LEAST hop_distance (this occurs when bus is
        // unusually fast, typically on straight road so adjustment makes sense).
        progress_delta = Math.max(bus_speed * hop_time, hop_distance * 1.05);
        // print some development info
        if (progress_delta > bus_speed * hop_time)
        {
            console.log('         FAST HOP, using hop_distance+5% as progress_delta');
            hop_max_progress = 1.1;
            hop_stopped_time = 0;
        }
        // remove decimals for easy printing
        progress_delta = Math.floor(progress_delta);
        console.log('         bus_speed: '+(Math.floor(bus_speed*100)/100)+
                    ', progress_delta: '+progress_delta
                   );
    }

    // ****************************
    // Now we have:
    // progress_distance: distance along route BEFORE we got this latest data record.
    // progress_delta: estimate for how further along the route we have progressed in hop_time
    //
    // ****************************

    // *** *** ***
    // Build a probability curve in 'step_time' time increments, with the
    // maximum probability at the route distance we think most likely, i.e. cast forward
    // the bus_speed for the latest hop_time i.e. (previous) progress_distance plus
    // (current) progress_delta.
    // We're using a Gaussian curve (with a high standard deviation) to model probability.
    // we will put some proportionate values into array, which ultimately will be normalized
    var factors = new Array();

    // arbitrarily modelling distance and time in 10 steps
    var step_distance = progress_delta / PROGRESS_STEPS;

    var step_time = hop_time / PROGRESS_STEPS; // 3.08

    // Steps forwards 'hop_max_progress' times the hop_time
    for (var i=0; i<PROGRESS_STEPS * hop_max_progress; i++) // 3.08
    {
        // let's try a gaussian distribution around progress_delta (which we will skew below)
        var progress_time = i * step_time; // 3.08

        var factor = 1 / Math.pow(Math.E, Math.pow( hop_time - progress_time, 2) / (2 * spread * spread)); //3.08

        factors.push({time: progress_time, prob: factor}); // 3.08
    }

    // Print some development info to js console
    console.log('          Estimated progress distance: '+(progress_distance+progress_delta));
    var str = '';
    for (var i=0; i<factors.length; i++)
    {
        str += '{ time: '+Math.floor(factors[i].time*10)/10+ // 3.08
               ', prob: '+Math.floor(factors[i].prob*100)/100+'}';
    }
    console.log(str);

    // Ok, so now we have factors as array of {dist: x, prob: y} pairs
    // *** *** ***

    // *** *** ***
    // Next step is to apply those factors to the 'vector' array

    // Initialize final result segment_vector with default small values
    // and then insert the weights of the segments within range
    var vector = new Array(segments);

    // create 'background' error values
    for (var i=0; i<segments; i++)
    {
        vector[i] = PROGRESS_ERROR / segments;
    }

    var update_segment = Math.max(segment_index,1); // 3.08 The index of the current segment we are considering
    var update_factor = 0; // The index of the current factor we are considering
    var factor_start = progress_distance; // 3.08 The distance (since start of route) at which we are considering current factor

    // Here is the main part of this analysis.
    // The 'factors' calculated earlier are now apportioned to the relevant segments

    // We step forwards through BOTH the factors and the segments
    // and apportion the factors where the factors and segments overlap.
    while (update_factor < factors.length && update_segment < segments - 1)
    {
        // segment_start and segment_end are the route distance boundaries of current segment
        var segment_start = route_profile[update_segment-1].distance;
        var segment_end = route_profile[update_segment].distance;

        // factor_start and factor_end are the boundaries of the current probability factor
        var factor_end = factor_start + step_distance;

        //console.log('trying update factor '+update_factor+
        //            ' ('+factor_start+'..'+factor_end+') '+
        //            ' on segment '+update_segment+
        //            ' ('+segment_start+'..'+segment_end+')'
        //            );

        // Here we calculate the boundaries of the overlap between the segment and factor
        var overlap_start = Math.max(factor_start, segment_start);
        var overlap_end = Math.min(factor_end, segment_end);

        // factor_overlap_ratio is the proportion of the current factor assignable to the segment
        var factor_overlap_ratio = (overlap_end - overlap_start) / step_distance;

        if (factor_overlap_ratio > 0)
        {
            vector[update_segment] += factors[update_factor].prob *
                                            factor_overlap_ratio;
            console.log('MOVING segment '+update_segment+', factor '+update_factor+
                        ', factor_overlap_ratio is '+(Math.floor(factor_overlap_ratio*100)/100)+
                        ' added '+(Math.floor(factors[update_factor].prob * factor_overlap_ratio*100)/100)+
                        ', TOTAL = '+(Math.floor(vector[update_segment]*100)/100));
        }

        // Check if we have arrived at a bus stop, if so add additional factors based on TIME at stop (hop_stopped_time)
        // Note we ALWAYS increase either update_factor or update_segment, so loop is sure to terminate
        var factor_stopped_ratio; // the proportion of the current factor that has been applied as 'stopped' time
        if (factor_end > segment_end)
        {
            var factor_remaining_time = step_time * (1 - factor_overlap_ratio);
            var stop_remaining_time = hop_stopped_time; // remaining time (s) bus must be stopped during this update loop
            while (update_factor < factors.length && stop_remaining_time > 0)
            {
                var factor_stopped_time = Math.min(factor_remaining_time, stop_remaining_time);
                var factor_stopped_ratio = factor_stopped_time / step_time;
                stop_remaining_time -= factor_stopped_time;
                vector[update_segment] += factors[update_factor].prob * factor_stopped_ratio;
                console.log('STOPPED segment '+update_segment+', factor '+update_factor+
                            ', factor_stopped_ratio is '+(Math.floor(factor_stopped_ratio*100)/100)+
                            ' added '+(Math.floor(factors[update_factor].prob * factor_stopped_ratio * 100)/100)+
                            ' TOTAL = '+(Math.floor(vector[update_segment]*100)/100));
                if (stop_remaining_time > 0)
                {
                    update_factor++;
                    factor_remaining_time = step_time;
                }
                // adjust factor_start (distance) so factor stopped ratio is converted to distance
                factor_start = route_profile[update_segment].distance - step_distance * factor_stopped_ratio;
            }
            // We have accumulated the stop time, so now can move on to next segment (with partial current factor remaining)
            update_segment++;
        }
        else
        {
            update_factor++;
            factor_start += step_distance;
        }
    }

    // Linear adjust so max is 1 and sum is 1
    var segment_probability_vector = linear_adjust(vector);

    //console.log('            prog2 :'+segment_probability_vector,' ','(');

    return segment_probability_vector;
}

// Return estimated forward speed (m/s) for bus on segment segment_index given a route_profile.
// We use the length of the nearby route segments to estimate probable speed, i.e. a section
// of the route with short segments will give a lower speed than if the segments were long.
function progress_speed(segment_index, route_profile)
{
    var MIN_EST_SPEED = 6.1; // (m/s) Minimum speed to use for estimated bus speed
    var MAX_EST_SPEED = 15;  // (m/s)

    // Estimate bus_speed
    // Calculate the local averate route segment distance, used for the speed estimate
    var avg_segment_distance;

    if (segment_index == 0)
    {
        avg_segment_distance = 100;
    }
    else if (segment_index <= route_profile.length - 3)
    {
        avg_segment_distance = (route_profile[segment_index+2].distance -
                                route_profile[segment_index-1].distance
                               ) / 3;
    }
    else if (segment_index <= route_profile.length - 2)
    {
        avg_segment_distance = (route_profile[segment_index+1].distance -
                                route_profile[segment_index-1].distance
                               ) / 2;
    }
    else
    {
        avg_segment_distance = route_profile[segment_index].distance -
                               route_profile[segment_index-1].distance;
    }

    avg_segment_distance = Math.floor(avg_segment_distance);

    // Estimate bus speed (m/s)
    return Math.min(MAX_EST_SPEED,
                    Math.max(MIN_EST_SPEED,
                             (avg_segment_distance - 240)/294 + MIN_EST_SPEED));
}

// ******************************************************************************
// Calculate segment probability vector based on TIMETABLE
// ******************************************************************************

function init_timetable_vector(sensor)
{
    return update_timetable_vector(sensor);
}

function update_timetable_vector(sensor)
{
    var segments = sensor.state.route_profile.length + 1;

    var route_profile = sensor.state.route_profile;

    // get JS date() of data record
    var msg_date = get_msg_date(sensor.msg);

    // convert to time-of-day in seconds since midnight (as in route_profile)
    var msg_secs = msg_date.getSeconds() + 60 * msg_date.getMinutes() + 3600 * msg_date.getHours();

    var before_start = msg_secs + 60 < route_profile[0].time_secs; // allow 60 seconds error

    var vector = new Array(segments);

    vector[0] = before_start ? 0.9 : 0;
    vector[1] = before_start ? 0.1 : 0;
    for (var i=2; i<segments; i++)
    {
        vector[i] = 0;
    }
    return vector;
}

// ******************************************************************************
// ******************************************************************************
// ******************************************************************************
// ******************************************************************************


// Return progress 0..1 along a route segment for a sensor.
// The current route for this sensor is in sensor.state.route
// and the current segment is between stops route[segment_index-1]..route[segment_index]
function get_segment_progress(sensor)
{
    var route = sensor.state.route;

    if ((sensor.state.segment_index == 0) || (sensor.state.segment_index == route.length))
    {
        return 0;
    }

    var pos = get_msg_point(sensor.msg);

    var segment_index = sensor.state.segment_index;

    var prev_stop = stops[route[segment_index - 1].stop_id];

    var next_stop = stops[route[segment_index].stop_id];

    var distance_to_prev_stop = get_distance(pos, prev_stop);

    var distance_to_next_stop = get_distance(pos, next_stop);

    return distance_to_prev_stop / (distance_to_prev_stop + distance_to_next_stop);
}

// ***************************************************************************************************
// Return array {time: (seconds), distance: (meters), turn: (degrees) } for route,
// starting at {starttime,0,0}
// where route is array of:
//   {vehicle_journey_id:'20-4-_-y08-1-98-T2',order:1,time:'06:02:00',stop_id:'0500SCAMB011'},...
// and returned route_profile is SAME SIZE array:
//   [{"time_secs":21720,"distance":0,"turn":0},
//    {"time_secs":21840, // timetabled time-of-day in seconds since midnight at this stop
//     "lat": 52.123,     // latitiude of stop
//     "lng": -0.1234,    // longitude of stop
//     "bearing_in": 138, // bearing of vector approaching this stop
//     "bisector": 68,    // bearing at mid-point of OUTER angle of turn
//     "distance":178,    // length (m) of route segment approaching this stop
//     "turn":39},...     // angle of turn in route from this stop to next (0..360) clockwise
function create_route_profile(route)
{
    var route_profile = [];

    // add first element for start stop at time=timetabled, distance=zero
    route_profile.push({ time_secs: get_seconds(route[0].time),
                         distance: 0,
                         lat: stops[route[0].stop_id].lat,
                         lng: stops[route[0].stop_id].lng,
                         turn: 0,
                         bearing_in: 0,
                         bisector: 0 });

    // iterate along route, creating a time/distance/turn value for each stop
    for (var i=1; i<route.length; i++)
    {
        var stop_info = {};

        stop_info.time_secs = get_seconds(route[i].time);

        stop_info.lat = stops[route[i].stop_id].lat;
        stop_info.lng = stops[route[i].stop_id].lng;

        var prev_stop = stops[route[i-1].stop_id];

        var this_stop = stops[route[i].stop_id];

        stop_info.bearing_in = Math.floor(get_bearing(prev_stop, this_stop));

        stop_info.distance = Math.floor(route_profile[i-1].distance + get_distance(prev_stop, this_stop));

        if (i==route.length-1)
        {
            stop_info.turn = 0;
            stop_info.bisector = angle360(stop_info.bearing_in + 90);
        }
        else
        {
            var next_stop = stops[route[i+1].stop_id];
            var bearing_out = get_bearing(this_stop, next_stop);
            stop_info.turn = Math.floor(angle360(bearing_out - stop_info.bearing_in));
            stop_info.bisector = Math.floor(get_bisector(prev_stop, this_stop, next_stop));
        }
        route_profile.push(stop_info);
    }

    // debug print route profile to console
    for (var i=0; i<route_profile.length; i++)
    {
        console.log(i+' '+JSON.stringify(route_profile[i]));
    }
    //console.log(JSON.stringify(route_profile));
    return route_profile;
}


// ******************************************************************************
// General state update useful functions
// ******************************************************************************

// Normalize an array to values 0..1, with sum 1.0 via exponential softmax function
function softmax(vector)
{
    // Each element x -> exp(x) / sum(all exp(x))
    var denominator =  vector.map(x => Math.exp(x)).reduce( (sum, x) => sum + x );
    return vector.map( x => Math.exp(x) / denominator);
}

// Normalize an array to values 0..1, with sum 1.0 via linear scaling function
function linear_adjust(vector)
{
    // Each element x -> x/ sum(all x)
    var denominator =  vector.reduce( (sum, x) => sum + x );
    return vector.map( x => x / denominator);
}

// Return printable version of probability vector (array with all elements 0..1)
// E.g. vector_to_string([0.1,0.2,0.0,0.3],'0','[','{',[1,2])
// where
// vector: [0.1,0.2,0.0,0.3] is the vector to draw
// zero_value: '0' is the zero value to use (to reduce the print clutter)
// max_flag: '[' is the flag to use to highlight the maximum unless correct
// correct_flag: '{' is the flag to use to highlight the correct maximum
// correct_cells: [1,2] are the cells that if maximum are considered correct
function vector_to_string(vector, zero_value, max_flag, correct_flag, correct_cells)
{
    if (!zero_value)
    {
        zero_value =  '-';
    }
    if (!max_flag)
    {
        max_flag = '[';
    }

    if (!correct_flag || !correct_cells)
    {
        correct_cells = [];
    }

    var str = '';
    // find index of largest element
    var max_value = 0;
    var max_index = 0;
    for (var i=0; i<vector.length; i++)
    {
        if (vector[i] > max_value)
        {
            max_value = vector[i];
            max_index = i;
        }
    }

    // Build print string
    for (var i=0; i<vector.length; i++)
    {
        // Compute leading spacer
        var spacer = ' ';

        if (correct_cells.includes(i))
        {
            spacer = correct_flag;
        }
        else if (i == max_index)
        {
            spacer = max_flag;
        }

        // Print the spacer + value
        //
        str += spacer;

        var n = vector[i];

        // Print zero or value
        if (n == 0)
        {
            str += ' '+zero_value+' ';
        }
        else if (n == 1)
        {
            str += '1.0';
        }
        else // Print value
        {
            var n3 = Math.floor(n*100)/100;
            if (n3==0)
            {
                str += '.00';
            }
            else
            {
                str += (''+Math.floor(n*100)/100+'00').slice(1,4);
            }
        }
    }
    return str;
}

// return decimals(34.567,2) as '34.57'
function decimals(n, d)
{
    var m = Math.pow(10,d);
    return ''+Math.round(n*m)/m;
}

// Convert hh:mm:ss to seconds
function get_seconds(time)
{
    return parseInt(time.slice(0,2))*3600 + parseInt(time.slice(3,5))*60 + parseInt(time.slice(6,8));
}

// Given a sensor.segment_index, draw a green line on route segment
// and delete the previous line if needed.
function draw_route_segment(sensor)
{
    // highlight line on map of next route segment
    //
    var segment_index = sensor.state.segment_index;

    if (segment_index != sensor.state.prev_segment_index)
    {
        // if prior map highlight exists, remove it
        if (sensor.state.route_highlight)
        {
            map.removeLayer(sensor.state.route_highlight);
        }
        // If pre-start of route, highlight first stop
        if (segment_index == 0)
        {
            var stop = sensor.state.route_profile[segment_index];
            sensor.state.route_highlight = draw_circle(stop, 40, 'green');
        }
        // If post-finish on route, highlight last stop
        else if (segment_index == sensor.state.route_profile.length)
        {
            var stop = sensor.state.route_profile[segment_index-1];
            sensor.state.route_highlight = draw_circle(stop, 40, 'green');
        }
        else
        {
            var prev_stop = sensor.state.route_profile[sensor.state.segment_index-1];
            var stop = sensor.state.route_profile[sensor.state.segment_index];
            sensor.state.route_highlight = draw_line(prev_stop, stop, 'green');
        }
    }
}

// return {lat:, lng:} from sensor message
function get_msg_point(msg)
{
    return { lat: msg[RECORD_LAT], lng: msg[RECORD_LNG] };
}

// return a JS Date() from sensor message
function get_msg_date(msg)
{
    switch (RECORD_TS_FORMAT)
    {
        case 'ISO8601':
            return new Date(msg[RECORD_TS]);
            break;

        default:
            break;
    }
    return null;
}

// ***********************************************************
// Pretty print an XML duration
// Convert '-PT1H2M33S' to '-1:02:33'
function xml_duration_to_string(xml)
{
    var seconds = xml_duration_to_seconds(xml);

    var sign = (seconds < 0) ? '-' : '+';

    seconds = Math.abs(seconds);

    if (seconds < 60)
    {
        return sign + seconds + 's';
    }

    var minutes = Math.floor(seconds / 60);

    var remainder_seconds = ('0' + (seconds - minutes * 60)).slice(-2);

    if (minutes < 60)
    {
        return sign + minutes + ':' + remainder_seconds;
    }

    var hours = Math.floor(minutes / 60);

    var remainder_minutes = ('0' + (minutes - hours * 60)).slice(-2);

    return sign + hours + ':' + remainder_minutes + ':' + remainder_seconds;
}

// Parse an XML duration like '-PT1H2M33S' (minus 1:02:33) into seconds
function xml_duration_to_seconds(xml)
{
    if (!xml || xml == '')
    {
        return 0;
    }
    var sign = 1;
    if (xml.slice(0,1) == '-')
    {
        sign = -1;
    }
    var hours = get_xml_digits(xml,'H');
    var minutes = get_xml_digits(xml,'M');
    var seconds = get_xml_digits(xml,'S');

    return sign * (hours * 3600 + minutes * 60 + seconds);
}

// Given '-PT1H2M33S' and 'S', return 33
function get_xml_digits(xml, units)
{
    var end = xml.indexOf(units);
    if (end < 0)
    {
        return 0;
    }
    var start = end - 1;
    // slide 'start' backwards until it points to non-digit
    while (/[0-9]/.test(xml.slice(start, start+1)))
    {
        start--;
    }

    return Number(xml.slice(start+1,end));
}

// End of the XML duration pretty print code
// *************************************************************

// return a Leaflet Icon based on a real-time msg
function create_sensor_icon(msg)
{
    var line = '';

    if (msg.LineRef != null)
    {
        line = msg.LineRef;
    }

    var marker_html =  '<div class="marker_label_'+icon_size+'">'+line+'</div>';

    var marker_size = new L.Point(30,30);

    switch (icon_size)
    {
        case 'L':
            marker_size = new L.Point(45,45);
            break;

        default:
            break;
    }

    return L.divIcon({
        className: 'marker_sensor_'+icon_size,
        iconSize: marker_size,
        iconAnchor: L.point(23,38),
        html: marker_html
    });
}

function add_breadcrumb(pos)
{
    if (breadcrumbs)
    {
        var crumb = L.circleMarker([pos.lat, pos.lng], { color: 'blue', radius: 1 }).addTo(map);
        crumbs.push(crumb);
    }
}

function tooltip_content(msg)
{
    var time = get_msg_date(msg);
    var time_str = ("0" + time.getHours()).slice(-2)   + ":" +
                   ("0" + time.getMinutes()).slice(-2) + ":" +
                   ("0" + time.getSeconds()).slice(-2);
    return time_str +
            '<br/>' + msg[RECORD_INDEX] +
			'<br/>Line "' + msg['PublishedLineName'] +'"'+
            '<br/>Delay: ' + xml_duration_to_string(msg['Delay']);
}

function popup_content(msg)
{
    var time = get_msg_date(msg);
    var time_str = ("0" + time.getHours()).slice(-2)   + ":" +
                   ("0" + time.getMinutes()).slice(-2) + ":" +
                   ("0" + time.getSeconds()).slice(-2);
    var sensor_id = msg[RECORD_INDEX];
    return time_str +
        '<br/>' + sensor_id +
		'<br/>Line "' + msg['PublishedLineName'] +'"'+
        '<br/>Delay: ' + xml_duration_to_string(msg['Delay'])+
        '<br/><a href="#" onclick="click_journey('+"'"+sensor_id+"'"+')">journey</a>'+
        '<br/><a href="#" onclick="click_more('+"'"+sensor_id+"'"+')">more</a>';
}

// user has clicked on 'more' in the sensor popup
function more_content(sensor_id)
{
    var sensor = sensors[sensor_id];
    var content = JSON.stringify(sensor.msg).replace(/,/g,', ');
    content +=
        '<br/><a href="#" onclick="click_less('+"'"+sensor_id+"'"+')">less</a>';
    return content;
}

// Initialize the vertical progress visualization
function draw_progress_init(sensor)
{

    // Draw start and finish stop lines
    //
    var start_line = document.createElementNS(SVGNS, 'line');

    var x_start_finish = PROGRESS_X_START + (PROGRESS_X_FINISH - PROGRESS_X_START)*0.75;

    start_line.setAttribute('x1', x_start_finish);
    start_line.setAttribute('y1', PROGRESS_Y_START);
    start_line.setAttribute('x2', PROGRESS_X_FINISH);
    start_line.setAttribute('y2', PROGRESS_Y_START);
    start_line.setAttribute('stroke', 'black');

    page_progress.svg.appendChild(start_line);

    var finish_line = document.createElementNS(SVGNS, 'line');

    finish_line.setAttribute('x1', x_start_finish);
    finish_line.setAttribute('y1', PROGRESS_Y_FINISH);
    finish_line.setAttribute('x2', PROGRESS_X_FINISH);
    finish_line.setAttribute('y2', PROGRESS_Y_FINISH);
    finish_line.setAttribute('stroke', 'black');

    page_progress.svg.appendChild(finish_line);

    if (!sensor || !sensor.state.route)
    {
        return;
    }

    // Get basic route info from route_profile
    //
    var route_profile = sensor.state.route_profile;

    var route_distance = route_profile[route_profile.length-1].distance;

    // Draw the vertical route outline
    //
    var x1 = PROGRESS_X_START + (PROGRESS_X_FINISH - PROGRESS_X_START)*0.8;
    var x2 = PROGRESS_X_FINISH;
    var w = x2 - x1;

    for (var i=1; i<route_profile.length-1;i++)
    {
        var stop_distance = route_profile[i].distance;
        var y = Math.floor(stop_distance / route_distance
                            * (PROGRESS_Y_FINISH - PROGRESS_Y_START)
                            + PROGRESS_Y_START);

        var line = document.createElementNS(SVGNS,'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', 'black');
        page_progress.svg.appendChild(line);
    }

    // draw segment analysis boxes
    // create page_progress 'globals' needed for draw and update of page
    page_progress.annotations = new Array(route_profile.length+1);
    page_progress.route_profile = route_profile;

    for (var i=0; i<route_profile.length+1;i++)
    {
        add_annotation(i);
    }
}

// Update the visual progress visualization
function draw_progress_update(sensor)
{
    // Get basic route info from route_profile
    //
    var route_profile = sensor.state.route_profile;

    var route_distance = route_profile[route_profile.length-1].distance;

    var x1 = PROGRESS_X_START + (PROGRESS_X_FINISH - PROGRESS_X_START)*0.8;
    var x2 = PROGRESS_X_FINISH;
    var w = x2 - x1;

    // Remove previous update elements
    for (var i=0; i<progress_update_elements.length; i++)
    {
        page_progress.svg.removeChild(progress_update_elements[i]);
    }

    progress_update_elements = [];

    // Highlight the current route segment
    //
    var segment_index = sensor.state.segment_index;

    var segment_top;

    var segment_height = 0;

    var rect = document.createElementNS(SVGNS,'rect');

    rect.setAttributeNS(null, 'fill', '#88ff88');

    if (segment_index == 0) // not started route
    {
        segment_top = PROGRESS_Y_START - 10;

        rect.setAttributeNS(null, 'x', x1);
        rect.setAttributeNS(null, 'y', segment_top);
        rect.setAttributeNS(null, 'width', w);
        rect.setAttributeNS(null, 'height', 9);

        page_progress.svg.appendChild(rect);
    }
    else if (segment_index == route_profile.length+1) // finished route
    {
        segment_top = PROGRESS_Y_FINISH + 1;

        rect.setAttributeNS(null, 'x', x1);
        rect.setAttributeNS(null, 'y', segment_top);
        rect.setAttributeNS(null, 'width', w);
        rect.setAttributeNS(null, 'height', 9);

        page_progress.svg.appendChild(rect);
    }
    else
    {
        var stop_distance = route_profile[segment_index - 1].distance;
        segment_top = Math.floor(stop_distance / route_distance
                            * (PROGRESS_Y_FINISH - PROGRESS_Y_START)
                            + PROGRESS_Y_START);

        stop_distance = route_profile[segment_index].distance;
        var y1 = Math.floor(stop_distance / route_distance
                            * (PROGRESS_Y_FINISH - PROGRESS_Y_START)
                            + PROGRESS_Y_START);

        segment_height = y1 - segment_top;

        rect.setAttributeNS(null, 'x', x1);
        rect.setAttributeNS(null, 'y', segment_top);
        rect.setAttributeNS(null, 'width', w);
        rect.setAttributeNS(null, 'height', segment_height-1);

        page_progress.svg.appendChild(rect);
    }

    progress_update_elements.push(rect);

    // Draw segment progress line
    //
    var segment_progress_y = segment_top + sensor.state.segment_progress * segment_height;

    var segment_progress_x = PROGRESS_X_START + (PROGRESS_X_FINISH - PROGRESS_X_START)*0.65;

    var progress_line = document.createElementNS(SVGNS, 'line');

    progress_line.setAttribute('x1', segment_progress_x);
    progress_line.setAttribute('y1', segment_progress_y);
    progress_line.setAttribute('x2', PROGRESS_X_FINISH);
    progress_line.setAttribute('y2', segment_progress_y);
    progress_line.setAttribute('stroke', 'black');

    page_progress.svg.appendChild(progress_line);

    progress_update_elements.push(progress_line);

    var progress_icon = document.createElementNS(SVGNS, 'image');

    progress_icon.setAttributeNS('http://www.w3.org/1999/xlink','href', ICON_URL);
    progress_icon.setAttributeNS(null, 'x', segment_progress_x - 9);
    progress_icon.setAttributeNS(null, 'y', segment_progress_y - 9);
    progress_icon.setAttributeNS(null, 'width', 20);
    progress_icon.setAttributeNS(null, 'height', 20);

    page_progress.svg.appendChild(progress_icon);
    progress_update_elements.push(progress_icon);

    // update segment annotations
    update_annotations(sensor.msg);

    // Draw segment_index progress indicator next to annotation boxes
    update_annotation_pointer(sensor.msg, segment_index);
}

// color in the annotation boxes on the progress visualization
function update_annotations(msg)
{
    // we color the boxes green if they are in the 'annotated' segment_index of the msg
    for (var i=0; i<page_progress.annotations.length; i++)
    {
        if (msg.segment_index && msg.segment_index.includes(i))
        {
            page_progress.annotations[i].box.setAttributeNS(null,'fill','#88ff88');
        }
        else
        {
            page_progress.annotations[i].box.setAttributeNS(null,'fill','white');
        }
    }
}

// Add an 'annotation' box to the progress visualization
function add_annotation(segment_index)
{
    var x = DRAW_PROGRESS_LEFT_MARGIN + 10;
    var box_height = 10; // height of segment box (px)
    var box_width = 10;
    var box_top_margin = 3; // vertical space between boxes

    var y = DRAW_PROGRESS_TOP_MARGIN + segment_index*(box_height+box_top_margin);
    var box = document.createElementNS(SVGNS,'rect');
    box.setAttributeNS(null, 'x', x);
    box.setAttributeNS(null, 'y', y);
    box.setAttributeNS(null, 'height', box_height);
    box.setAttributeNS(null, 'width', box_width);
    box.setAttributeNS(null, 'stroke', 'black');
    box.setAttributeNS(null, 'fill', 'white');
    box.addEventListener('mouseover', function () { annotate_mouseover(segment_index); });
    box.addEventListener('mouseout', function () {annotate_mouseout(segment_index); });
    box.addEventListener('click', function () {annotate_click(segment_index); });
    page_progress.svg.appendChild(box);
    page_progress.annotations[segment_index] = { box: box };
}

// Draw the 'progress indicator' for current segment_index adjacent to
// the annotation boxes in the progress visualization
function update_annotation_pointer(msg, segment_index)
{
    var x = DRAW_PROGRESS_LEFT_MARGIN + 2;
    var box_height = 10; // height of segment box (px)
    var box_width = 10;
    var box_top_margin = 3; // vertical space between boxes
    var y = DRAW_PROGRESS_TOP_MARGIN + segment_index*(box_height+box_top_margin);

    // if there's an existing segment pointer, remove that one
    if (page_progress.annotation_pointer)
    {
        page_progress.svg.removeChild(page_progress.annotation_pointer);
    }
    // Create pointer triangle pointing at the segment annotation box
    page_progress.annotation_pointer = document.createElementNS(SVGNS,'polygon');
    var points = x+','+y+' ';
    points += x+','+(y+box_height)+' ';
    points += (x+8)+','+(y + box_height/2);
    page_progress.annotation_pointer.setAttributeNS(null, 'points', points);
    var pointer_color = 'yellow';
    if (msg.segment_index)
    {
        if (msg.segment_index.includes(segment_index))
        {
            pointer_color ='green';
        }
        else
        {
            pointer_color = 'red';
        }
    }
    page_progress.annotation_pointer.setAttributeNS(null, 'fill', pointer_color);
    page_progress.svg.appendChild(page_progress.annotation_pointer);
}

// User hovers mouse in/out of annotation box
function annotate_mouseover(segment_index)
{
    if (page_progress.highlight_segment)
    {
        map.removeLayer(page_progress.highlight_segment);
    }
    if (segment_index == 0)
    {
        page_progress.highlight_segment = draw_circle(page_progress.route_profile[segment_index],
                                                      40,
                                                      'yellow');
    } else if (segment_index == page_progress.route_profile.length)
    {
        page_progress.highlight_segment = draw_circle(page_progress.route_profile[segment_index-1],
                                                      40,
                                                      'yellow');
    }
    else
    {
        page_progress.highlight_segment = draw_line(page_progress.route_profile[segment_index-1],
                                                    page_progress.route_profile[segment_index],
                                                    'yellow');
    }
}

// User mouse has moved out of annotation box so de-highlight segment
function annotate_mouseout(segment_index)
{
    if (page_progress.highlight_segment)
    {
        map.removeLayer(page_progress.highlight_segment);
    }
}

//User has clicked on annotation box, so update msg segment_index annotation (if annotate_manual)
function annotate_click(segment_index)
{
    if (annotate_manual)
    {
        var msg = recorded_records[replay_index-1];
        if (!msg.segment_index)
        {
            // if no segment_index property in data record then create [ segment_index ]
            msg.segment_index = [ segment_index ];
        }
        else if (!msg.segment_index.includes(segment_index))
        {
            // if existing segment_index array but not including this entry then add
            msg.segment_index.push(segment_index);
        }
        else
        {
            // if existing segment_index array including this entry then remove
            var segments = [];
            for (var i=0; i < msg.segment_index.length; i++)
            {
                if (msg.segment_index[i] != segment_index)
                {
                    segments.push(msg.segment_index[i]);
                }
            }
            msg.segment_index = segments;
        }
        update_annotations(msg);
    }
}

// ********************************************************************************
// ********************************************************************************
// ***********  Process the data records arrived from WebSocket or Replay *********
// ********************************************************************************
// ********************************************************************************

// Process websocket data
function handle_records(websock_data)
{
    var incoming_data = JSON.parse(websock_data);
    //console.log('handle_records'+json['request_data'].length);
    for (var i = 0; i < incoming_data[RECORDS_ARRAY].length; i++)
    {
	    handle_msg(incoming_data[RECORDS_ARRAY][i], new Date());
    }
} // end function handle_records

// Process replay data relevant to updated 'replay_time'
// 'replay_index' will be updated to point to NEXT record in recorded_records
function replay_timestep()
{
    // move replay_time forwards by the current timestep
    replay_time.setSeconds(replay_time.getSeconds() + replay_interval*replay_speedup);

    update_clock(replay_time);

    while ( replay_index < recorded_records.length &&
            get_msg_date(recorded_records[replay_index]) < replay_time)
    {
        var msg = recorded_records[replay_index];

        var time_str = hh_mm_ss(get_msg_date(msg));

        handle_msg(msg, replay_time);

        replay_index++;
    }

    if (replay_index == recorded_records.length)
    {
        log('Replay completed, errors: '+replay_errors);
        replay_stop();
    }
}

// User has clicked the 'step' button so jump forwards to the next record.
function replay_next_record()
{
    // do nothing if we've reached the end of recorded_records
    if (replay_index >= recorded_records.length)
    {
        log('Replay completed, errors: '+replay_errors);
        return;
    }

    var msg = recorded_records[replay_index++];

    replay_time = get_msg_date(msg);

    update_clock(replay_time);

    handle_msg(msg, replay_time);
}

// Replay ALL records in a single batch
function replay_batch()
{
    replay_index = 0;

    replay_errors = 0;

    while (replay_index < recorded_records.length)
    {
        var msg = recorded_records[replay_index++];
        replay_time = get_msg_date(msg);
        update_clock(replay_time);
        handle_msg(msg, replay_time);
    }

    log('Batch replay completed, errors: '+
        replay_errors+"/"+recorded_records.length+
        ' ('+Math.floor(1000*replay_errors/recorded_records.length)/10+'%)');
}

// process a single data record
function handle_msg(msg, clock_time)
{
    // add to recorded_data if recording is on

    if (recording_on)
    {
        recorded_records.push(JSON.stringify(msg));
    }

    var sensor_id = msg[RECORD_INDEX];

    // If an existing entry in 'sensors' has this key, then update
    // otherwise create new entry.
    if (sensors.hasOwnProperty(sensor_id))
    {
        update_sensor(msg, clock_time);
    }
    else
    {
        create_sensor(msg, clock_time);
    }
}

// update realtime clock on page
// called via intervalTimer in init()
function update_clock(time)
{
    clock_time = time;
    document.getElementById('clock').innerHTML = hh_mm_ss(time);
    check_old_records(time);
}

// watchdog function to flag 'old' data records
// records are stored in 'sensors' object
function check_old_records(clock_time)
{
    //console.log('checking for old data records..,');

    // do nothing if timestamp format not recognised
    switch (RECORD_TS_FORMAT)
    {
        case 'ISO8601':
            break;

        default:
            return;
    }

    for (var sensor_id in sensors)
    {
        update_old_status(sensors[sensor_id], clock_time);
    }
}

// return provided JS Date() as HH:MM:SS
function hh_mm_ss(datetime)
{
    var hh = ('0'+datetime.getHours()).slice(-2);
    var mm = ('0'+datetime.getMinutes()).slice(-2);
    var ss = ('0'+datetime.getSeconds()).slice(-2);
    return hh+':'+mm+':'+ss;
}

// ***************************************************************************
// *******************  Logging code      ************************************
// ***************************************************************************

function log(msg, format)
{
    if (!format)
    {
        format = 'console';
    }

    // create outermost log record element
    var new_log_record = document.createElement('div');

    if (format == 'console')
    {
        // create HH:MM:SS timestamp for this log record
        var ts = hh_mm_ss(new Date());

        // create timestamp element
        var ts_element = document.createElement('div');
        ts_element.classList.add('log_ts');
        ts_element.innerHTML = ts;
        new_log_record.appendChild(ts_element);
    }

    // create msg element
    var msg_element = document.createElement('div');
    msg_element.classList.add('log_msg');
    msg_element.innerHTML = msg;
    new_log_record.appendChild(msg_element);

    new_log_record.classList.add('log_record');
    // set the log background color and toggle odd/even flag
    new_log_record.classList.add(log_record_odd ? 'log_record_odd' : 'log_record_even');
    log_record_odd = !log_record_odd;

    // if log is full then drop the oldest msg
    if (log_div.childElementCount == LOG_TRUNCATE)
    {
        //console.log('log hit limit '+LOG_TRUNCATE);
        if (log_append)
        {
            //console.log('log removing firstChild');
            log_div.removeChild(log_div.firstChild);
        }
        else
        {
            //console.log('log removing lastChild '+log_div.lastChild.tagName);
            log_div.removeChild(log_div.lastChild);
        }
        //console.log('log record count after removeChild: '+log_div.childElementCount)
    }
    if (log_append)
    {
        log_div.appendChild(new_log_record);
    }
    else
    {
        log_div.insertBefore(new_log_record, log_div.firstChild);
    }
    //console.log('log record count: '+log_div.childElementCount)
}

// Empty the console log div
function log_clear()
{
    while (log_div.firstChild)
    {
            log_div.removeChild(log_div.firstChild);
    }
}

// reverse the order of the messages in the log
function log_reverse()
{
    for (var i=0;i<log_div.childNodes.length;i++)
      log_div.insertBefore(log_div.childNodes[i], log_div.firstChild);
}

// ***************************************************************************
// *******************  WebSocket code    ************************************
// ***************************************************************************

var sock; // the page's WebSocket

function sock_connect(method)
{
    // for testing (e.g. on laptop) we can us local port directly
    if (method=="port")
    {
        sock = new SockJS('http://localhost:8099/test/rtmonitor/sirivm');
    }
    else
    {
        sock = new SockJS(RTMONITOR_URI);
    }

    sock.onopen = function() {
                log('** socket open');
                sock_send_str('{ "msg_type": "rt_connect" }');
                };

    sock.onmessage = function(e) {
                var json_msg = JSON.parse(e.data);
                if (json_msg.msg_type != null && json_msg.msg_type == "rt_nok")
                {
                    log('<span class="log_error">** '+e.data+'</span>');
                    return;
                }
                if (json_msg.msg_type != null && json_msg.msg_type == "rt_connect_ok")
                {
                    log('Connected OK');
                    return;
                }
                if (log_data)
                {
                    log(e.data);
                }
                handle_records(e.data);
                };

    sock.onclose = function() {
                    log('** socket closed');
                };
}

function sock_close()
{
    log('** closing socket...');
    sock.close();
}

function sock_send(input_name)
{
    var msg = document.getElementById(input_name).value;

    sock_send_str(msg);
}

function sock_send_str(msg)
{
    if (sock == null)
    {
	    log('<span style="color: red;">Socket not yet connected</span>');
	    return;
    }
    if (sock.readyState == SockJS.CONNECTING)
    {
	    log('<span style="color: red;">Socket connecting...</span>');
  	    return;
    }
    if (sock.readyState == SockJS.CLOSING)
    {
	    log('<span style="color: red;">Socket closing...</span>');
	    return;
    }
    if (sock.readyState == SockJS.CLOSED)
    {
	    log('<span style="color: red;">Socket closed</span>');
	    return;
    }

    log('sending: '+msg);

    // write msg into scratchpad textarea
    document.getElementById('rt_scratchpad').value = msg;

    sock.send(msg);
}

// ****************************************************************************************
// *************** User interaction functions *********************************************
// ****************************************************************************************

// Draw the (test) stops on the map and provide a custom marker for each with a popup
function draw_stops()
{
    for (var stop_id in stops)
    {
        if (stops.hasOwnProperty(stop_id))
        {
            var stop = stops[stop_id];
            var bus_stop_marker = L.marker([stop.lat, stop.lng],
                                           {icon: bus_stop_icon})
                .addTo(map);
            var popup = L.popup({ closeOnClick: false,
                                  autoClose: false,
                                  offset: L.point(0,-25)})
                .setContent(stop.common_name);

            bus_stop_marker.bindPopup(popup);
            // store marker for future manipulation of popup
            stops[stop_id].marker = bus_stop_marker;
        }
    }
}

// Draw the straight lines between stops on the selected journey
// The journey stops data is stored in 'journeys' created at startup
function draw_journey(vehicle_journey_id)
{
    // if it's already drawn, remove it and redraw
    hide_journey(vehicle_journey_id);

    // Get journey route (sequence of stops).
    // For data structure see global 'journeys' declaration.
    // The 'stops' array is in journeys[vehicle_journey_id].route
    var journey = vehicle_journey_id_to_journey(vehicle_journey_id);

    var route = vehicle_journey_id_to_route(vehicle_journey_id);

    // And simply draw the polyline between the stops
    var poly_line = L.polyline([], {color: 'red'}).addTo(map);
    journey.poly_line = poly_line;
    log('Drawing journey '+vehicle_journey_id+', length '+journey.route.length);
    for (var i=0; i<route.length; i++)
    {
        if (route[i])
        {
            var route_stop = route[i];
            var stop_id = route_stop.stop_id;
            //console.log('draw_journey() ' +stop_id);
            var stop = stops[stop_id];
            //console.log('stops['+stop_id+']='+stop.stop_id+' lat,lng='+stop.lat+','+stop.lng);

            // update stop popup with time for this journey
            stop.marker.setPopupContent(stop.common_name+'</br>'+route_stop.time);

            // add journey segment to map
            var p = new L.LatLng(stop.lat, stop.lng);
            journey.poly_line.addLatLng(p);

            // add arrow
            if (route[i].arrow)
            {
                route[i].arrow.addTo(map);
            }
        }
    }
}

// User has un-checked 'Show Journey'
function hide_journey(vehicle_journey_id)
{
    if (!vehicle_journey_id)
    {
        return;
    }

    var journey = vehicle_journey_id_to_journey(vehicle_journey_id);
    if (journey.poly_line)
    {
        map.removeLayer(journey.poly_line);
        var route = journey.route;
        for (var i=0; i<route.length; i++)
        {
            if (route[i].arrow)
            {
                map.removeLayer(route[i].arrow);
            }
        }
    }
}

// draw a line between points A and B as {lat:, lng:}
function draw_line(A,B, color)
{
    if (!color) color = 'green';
    var line = L.polyline([[A.lat, A.lng],[B.lat,B.lng]], {color: color}).addTo(map);
    return line;
}

function draw_circle(A,radius,color)
{
    if (!color) color = 'green';
    var circle = L.circle([A.lat, A.lng],radius,{color: color}).addTo(map);
    return circle;
}

// toggle the 'breadcrumbs' function that draws a dot every time a sensor position is received
function click_breadcrumbs()
{
    breadcrumbs = document.getElementById("breadcrumbs").checked == true;
}

// switch the console log between newest msg on top vs newest on bottom
function click_log_append()
{
    var prev_log_append = log_append;
    log_append = document.getElementById("log_append").checked == true;
    if (prev_log_append != log_append)
    {
        log_reverse();
    }
}

function click_log_data()
{
    log_data = document.getElementById("log_data").checked == true;
}

// remove all markers from map and reset 'sensors' array
function clear_markers()
{
    //console.log('clear_markers');
    for (sensor_id in sensors)
    {
        if (sensors[sensor_id]['marker'])
        {
            map.removeLayer(sensors[sensor_id]['marker']);
        }
    }
    sensors = {};
}

// remove all crumbs from map
function clear_crumbs()
{
    for (var i=0; i<crumbs.length; i++)
    {
        map.removeLayer(crumbs[i]);
    }
    crumbs = [];
}

// empty textarea e.g. scratchpad
function clear_textarea(element_id)
{
    document.getElementById(element_id).value='';
}

function marker_to_pos(marker)
{
    var lat_lng = marker.getLatLng();
    return '{  "lat": '+lat_lng.lat+', "lng": '+lat_lng.lng+' }';
}

// issue a request to server for the latest message
function request_latest_msg()
{
    sock_send_str('{ "msg_type": "rt_request", "request_id": "A", "options": [ "latest_msg" ] }');
}

// issue a request to server for the latest records
function request_latest_records()
{
    sock_send_str('{ "msg_type": "rt_request", "request_id": "A", "options": [ "latest_records" ] }');
}

// issue a subscription to server for all records
function subscribe_all()
{
    sock_send_str('{ "msg_type": "rt_subscribe", "request_id": "A" }');
}

// User has clicked on map.
// If 'poly_draw' is true then draw a polygon on the map and
// update the realtime scratchpad with a matching 'inside' request
function click_map(e)
{
    if (poly_draw)
    {
        var marker = new L.marker(e.latlng);
        if (poly_markers.length == 0)
        {
            marker.addTo(map);
            poly_start = marker;
        }
        poly_line.addLatLng(marker.getLatLng());
        poly_markers.push(marker);
        var rt_string = '';
        rt_string += '{ "msg_type": "rt_request",\n';
        rt_string += '  "request_id": "A",\n';
        rt_string += '  "options": [ "latest_records" ],\n';
        if ( poly_markers.length > 2)
        {
            // add polygon closing line (and remove previous closing line)
            if (poly_close != null)
            {
                map.removeLayer(poly_close);
            }
            poly_close = L.polyline([], {dashArray: '10,5', color: 'red'}).addTo(map);
            poly_close.addLatLng(marker.getLatLng());
            poly_close.addLatLng(poly_markers[0].getLatLng());

            // update user scratchpad with filter text

            rt_string += '  "filters": [\n';
            rt_string += '     { "test": "inside",\n';
            rt_string += '       "lat_key": "Latitude",\n';
            rt_string += '       "lng_key": "Longitude",\n';
            rt_string += '       "points": [\n';
            for (var i=0; i<poly_markers.length; i++)
            {
                rt_string += marker_to_pos(poly_markers[i]);
                if (i < poly_markers.length - 1)
                    rt_string += ',\n';
            }
            rt_string += '                 ]\n';
            rt_string += '             } ]\n';
            rt_string += '}';
        }
        document.getElementById('rt_scratchpad').value = rt_string;
    }
}

// Draw a polygon for the 'inside' filter test
function draw_poly()
{
    var el = document.getElementById('draw_poly');
    poly_draw = !poly_draw;
    el.value = poly_draw ? "Clear Polygon" : "Draw Polygon";
    if (poly_draw)
    {
        poly_line = L.polyline([], {color: 'red'}).addTo(map);
    }
    else
    {
        if (poly_line != null)
        {
            map.removeLayer(poly_line);
        }

        if (poly_close != null)
        {
            map.removeLayer(poly_close);
        }

        for (var i=0; i<poly_markers.length; i++)
        {
            map.removeLayer(poly_markers[i]);
        }
        poly_markers = [];
    }
}

// user clicked on 'journey' in sensor popup
function click_journey(sensor_id)
{
    var vehicle_journey_id = sensors[sensor_id].state.vehicle_journey_id;
    if (!vehicle_journey_id)
    {
        log('<span style="{ color: red }">No journey available for sensor '+sensor_id+'</span>');
        return;
    }
    draw_journey(vehicle_journey_id);
}

// user clicked on 'more' in sensor popup
function click_more(sensor_id)
{
    var sensor = sensors[sensor_id];
    sensor.marker.setPopupContent(more_content(sensor_id));
}

// user clicked on 'less' in sensor popup
function click_less(sensor_id)
{
    var sensor = sensors[sensor_id];
    sensor.marker.setPopupContent(popup_content(sensor.msg));
}

// user has clicked to only show the map
function hide_control()
{
    map_only = true;
    document.getElementById('control_div').style.display = 'none';
    document.getElementById('progress_div').style.display = 'none';
    document.getElementById('map').style.width = '99%';
    document.getElementById('map').style.height = '99%';
    map.invalidateSize();
}

// User has 'escaped' from map_only mode
function page_normal()
{
    map_only = false;
    document.getElementById('control_div').style.display = '';
    document.getElementById('progress_div').style.display = '';
    document.getElementById('map').style.width = '61%';
    document.getElementById('map').style.height = '80%';
    map.invalidateSize();
}

// *************************************************************
// Recording buttons
// *************************************************************

function record_start()
{
    recording_on = true;
    document.getElementById('record_start').value = 'Recording';
}

function record_clear()
{
    recording_on = false;
    recorded_records = [];
    document.getElementById('record_start').value = 'Record';
}

function record_print()
{
    log('Printing '+recorded_records.length+' recorded records to console');
    var msgs = '[\n';
    for (var i=0; i<recorded_records.length; i++)
    {
        msgs += JSON.stringify(recorded_records[i]);
        if (i < recorded_records.length-1)
        {
            msgs += ',\n';
        }
        else
        {
            msgs += '\n]';
        }
    }
    console.log(msgs);
}

// ***********************
// Replay buttons

// User clicked 'Replay' button
// This launches an intervalTimer to step through the data records
function replay_start()
{
    // kill the real-time clock
    clearInterval(clock_timer);

    if (batch)
    {
        replay_batch();
        return;
    }

    // get start time from text box (js compatible)
    var start_time = new Date(document.getElementById('replay_start').value);
    if (!start_time)
    {
        log('<span style="color: red">'+
            'Bad replay start time format (try 2017-11-20T06:00:00Z)'+
            '</span>');
        return;
    }

    // if not paused, initialize the replay time to the chosen start time
    if (!replay_on)
    {
        replay_time = start_time;

        replay_index = 0;

        replay_errors = 0;

        // set 'replay mode' flag
        replay_on = true;

        log('Replay started '+replay_time);
    }
    // kick off regular timer
    replay_timer = setInterval(replay_timestep, replay_interval * 1000);
    log('Timer started '+replay_time);
}

// User has clicked the Replay Pause button
function click_replay_pause()
{
    clearInterval(replay_timer);
    log('Replay paused at '+replay_time);
}

// User has clicked the Replay Stop button
function replay_stop()
{
    clearInterval(replay_timer);
    // Reset 'replay mode' flag
    replay_on = false;
    if (replay_time)
    {
        log('Replay stopped at '+replay_time);
    }
}

// User has clicked the Replay Step button, so increment to next data record
function replay_step()
{
    clearInterval(replay_timer);
    // if not paused, initialize the replay time to the chosen start time
    if (!replay_on)
    {
        //replay_time = start_time;

        replay_index = 0;

        // set 'replay mode' flag
        replay_on = true;

        log('Step replay started ');//+replay_time);
    }
    replay_next_record();
}

// User has updated the Replay speedup value
function click_replay_speedup()
{
    replay_speedup = document.getElementById('replay_speedup').value;
    log('Changed replay speedup to '+replay_speedup);
}

// User has clicked on Show journey checkbox
function click_show_journey()
{
    var show_journey = document.getElementById("show_journey").checked;
    if (show_journey)
    {
        analyze = true;
        draw_journey(current_journey_id);
    }
    else
    {
        analyze = false;
        hide_journey(current_journey_id);
    }
    // set analyze checkbox appropriately
    document.getElementById('analyze').checked = analyze;
}

// Load the test data
function load_test_data(test_name)
{

    // kill the real-time clock in case it is running
    clearInterval(clock_timer);

    // kill the replay clock if it is running
    clearInterval(replay_timer);

    // Scrub all the sensor data
    sensors = {};

    var debug_str = 'rtroute '+VERSION+' test: '+test_name+' '+(new Date())+'\n';
    debug_str += 'SEGMENT_DISTANCE_WEIGHT='+SEGMENT_DISTANCE_WEIGHT;
    debug_str += ' SEGMENT_PROGRESS_WEIGHT='+SEGMENT_PROGRESS_WEIGHT;
    debug_str += ' SEGMENT_TIMETABLE_WEIGHT='+SEGMENT_TIMETABLE_WEIGHT;
    debug_str += ' SEGMENT_BEYOND_ADJUST='+SEGMENT_BEYOND_ADJUST;
    debug_str += ' SEGMENT_DISTANCE_ADJUST='+SEGMENT_DISTANCE_ADJUST;
    // 3.07 debug_str += ' PROGRESS_BACKWARD_ADJUST='+PROGRESS_BACKWARD_ADJUST;
    // 3.07 debug_str += ' PROGRESS_SLOW_ADJUST='+PROGRESS_SLOW_ADJUST;
    debug_str += ' PROGRESS_MIN_SEGMENT_LENGTH='+PROGRESS_MIN_SEGMENT_LENGTH;
    console.log(debug_str);

    // Load the relevant data records into the 'recorded_records' array for playback
    //debug we can replace this with a GET from the server, particularly when we have API
    var source_records = test_data[test_name];

    // transfer test records into 'recorded_records' store for replay
    recorded_records = [];
    for (var i=0; i<source_records.length; i++)
    {
        recorded_records.push(Object.assign({},source_records[i]));
    }

    replay_index = 0;

    log('Loaded test records '+test_name);

    // turn analyze on
    analyze = true;
    document.getElementById('analyze').checked = true;

    // show the test journey
    //
    // Remove the current journey if displayed
    hide_journey(current_journey_id);

    document.getElementById("show_journey").checked = true;

    current_journey_id = sirivm_to_vehicle_journey_id(recorded_records[0]);

    log('Current vehicle_journey_id now '+current_journey_id);

    draw_journey(current_journey_id);

    // start replay
    replay_stop(); // stop replay if it is already running

    // replay only the first record
    replay_next_record();
}

// User has clicked on the 'hide map' checkbox.
// The map layer will be hidden, so only the stops and route are shown with the buses
function click_hide_map()
{
    var hide_map = document.getElementById("hide_map").checked;
    if (hide_map)
    {
        map.removeLayer(map_tiles);
    }
    else
    {
        map.addLayer(map_tiles);
    }
}

// User has toggled "Analyze" checkbox, so set global boolean
// This will control whether the bus->segment tracking code operates
function click_analyze()
{
    analyze = document.getElementById("analyze").checked;
}

// user has toggled 'batch' checkbox which controls whether replay
// clock is 'per second' or just steps through data record
function click_batch()
{
    batch = document.getElementById("batch").checked;
}

// User has clicked an annotate option
//
// The sensor data can be 'annotated' with the correct segments, which will be
// added to the data record as a property "segment_index": [x,y,x] where x,y,x are
// the selected values.
//
// The annotation can be "automatic" or "manual", the modes of which are mutually exclusive.
//
// "Automatic" annotation uses the segment probability algorithm to generate the 'correct'
// segment_index (e.g. 7) and add it to the data record (i.e. segment_index: [7] ).  This
// is a good way to create an initial set of values that can then be hand-corrected if needed.
//
// "Manual" annotation expects the user to click on the segment boxes in the progress visualization
// to insert the correct data.
function click_annotate_auto()
{
    annotate_auto = document.getElementById("annotate_auto").checked;
    if (annotate_auto)
    {
        log('On replay, data records will be annotated with segment_index');
        annotate_manual = false;
        document.getElementById("annotate_manual").checked = false;
    }
}

function click_annotate_manual()
{
    annotate_manual = document.getElementById("annotate_manual").checked;
    if (annotate_manual)
    {
        log('On replay, you can click the annotation boxes to update the segment_index annotations');
        annotate_auto = false;
        document.getElementById("annotate_auto").checked = false;
    }
}

