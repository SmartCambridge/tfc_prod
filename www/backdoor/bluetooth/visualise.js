// Javascript functions for displaying Bluetruth data

/* eslint no-console: "warn", max-lines-per-function: "off" */
/*global $, L, LOCATIONS_URL, JOURNEYS_URL, MB_ACCESS_TOKEN, TF_API_KEY */

// m/sec to mph
var TO_MPH = 2.23694;

// Style options for markers and lines
var SITE_OPTIONS = {
    color: 'black',
    fillColor: 'green',
    fill: true,
    fillOpacity: 0.8,
    radius: 7,
    pane: 'markerPane'
};

var NORMAL_LINE = { weight: 5, offset: -3 };
var HIGHLIGHT_LINE = { weight: 10, offset: -6 };

var NORMAL_COLOUR = '#3388ff';
var VERY_SLOW_COLOUR = '#9a111a';
var SLOW_COLOUR = '#e00018';
var MEDIUM_COLOUR = '#eb7F1b';
var FAST_COLOUR = '#85cd50';
var BROKEN_COLOUR = '#b0b0b0';

var DEFAULT_SPEED_DISPLAY = 'actual';
var DEFAULT_BASELAYER = 'MapBox';

// Script state globals
var map,                            // The Leaflet map object itself
    sites_layer,                    // layer containing the sensor sites
    links_layer,                    // Layer containing the point to point links
    compound_routes_layer,          // Layer containing the compound routes
    layer_control,                  // The layer control
    zoom_control,                   // The zoom control
    clock,                          // The clock control
    legend,                         // The legend
    highlighted_line_id = null,     // Id of the currently highlighted link or route
    speed_display,                  // Line colour mode - 'actual', 'normal' or 'relative'
    map_moved = false,              // Has the map been moved from its default
    base_layers,                    // Mapping of names to available base layers
    overlay_layers,                 // Mapping of names to available overlay layers
    interactive = true,             // Include interactive controls?
    line_map = {};                  // Lookup link/route id to displayed polyline

// Initialise
$(document).ready(function () {

    init();
    load_data();

    //  (Re-)set program state based on URL query parameters
    window.addEventListener('popstate', set_state);

});

// Synchronous environment setup
function init() {

    // Various feature layers
    sites_layer = L.featureGroup();
    links_layer = L.featureGroup();
    compound_routes_layer = L.featureGroup();

    // Various map providers
    var osm = L.tileLayer.provider('OpenStreetMap.Mapnik');
    var mb = L.tileLayer.provider('MapBox', {
        id: 'mapbox.streets',
        accessToken: MB_ACCESS_TOKEN
    });
    var tf = L.tileLayer.provider('Thunderforest.Neighbourhood', {
        apikey: TF_API_KEY
    });

    map = L.map('map', {zoomControl: false});

    // Map legend
    legend = get_legend().addTo(map);

    // Layer control
    base_layers = {'MapBox': mb, 'ThunderForest': tf, 'OSM': osm };
    overlay_layers = {'Sites': sites_layer, 'All links': links_layer};
    layer_control = L.control.layers(base_layers, overlay_layers, {collapsed: true}).addTo(map);

    //  Zoom control (with non-default position)
    zoom_control = L.control.zoom({position: 'topright'}).addTo(map);

    // Clock
    clock = get_clock().addTo(map);

    // Initialise program state based on URL query parameters
    set_state();

    map.addLayer(sites_layer).addLayer(links_layer);

    // Handler to clear any highlighting caused by clicking lines
    map.on('click', clear_line_highlight);

    // Handler to track movement
    map.on('moveend', move_handler);

    // Handlers to manage changes to layers
    map.on('baselayerchange', baselayerchange_handler);
    //map.on('overlayadd', overlayadd_handler);
    //map.on('overlayremove', overlayremove_handler);

}

function baselayerchange_handler() {
    save_state();
}


// Clear any highlighted line
function clear_line_highlight() {
    highlight_line(null);
}


// Record map movement
function move_handler() {
    map_moved = true;
    save_state();
}


// Async load locations, annotate with auto-refreshing journey times
function load_data() {

    $.get(LOCATIONS_URL)
        .done(function(locations) {

            // Sites
            add_sites(locations.sites);

            // Links and Compound routes
            add_lines(locations.links, locations.sites, links_layer);
            add_lines(locations.compoundRoutes, locations.sites, compound_routes_layer);

            // Scale map to fit without saving the result assuming it
            // hasn't already been moved
            if (!map_moved) {
                map.off('moveend', move_handler);
                map.off('baselayerchange', baselayerchange_handler);
                var region = sites_layer.getBounds().extend(links_layer);
                map.fitBounds(region);
                map.on('baselayerchange', baselayerchange_handler);
                map.on('moveend', move_handler);
            }

            // Load (and schedule for reload) journey times
            load_journey_times();

        });

}


// Helper function to draw  sites
function add_sites(sites) {

    for (var i = 0; i < sites.length; ++i) {
        var site = sites[i];
        var marker = L.circleMarker([site.location.lat, site.location.lng], SITE_OPTIONS)
            .bindPopup(site_popup, {maxWidth: 500})
            .addTo(sites_layer);
        marker.properties = { 'site': site };

    }
}


// Helper function to draw links and compound routes
function add_lines(lines, sites, layer) {

    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        // Accumulate points
        var points = [];
        for (var j = 0; j < line.sites.length; ++j) {
            var site = find_object(sites, line.sites[j]);
            if (site) {
                points.push([site.location.lat, site.location.lng]);
            }
        }

        var polyline = L.polyline(points, NORMAL_LINE)
            .setStyle({color: NORMAL_COLOUR})
            .bindPopup(line_popup, {maxWidth: 500})
            .on('click', highlight_line_handler)
            .addTo(layer);
        polyline.properties = { 'line': line };

        // Update styling if this line is highlighted, which may
        // have already happened based on URL parameters
        if (line.id === highlighted_line_id) {
            polyline.setStyle(HIGHLIGHT_LINE)
                .setOffset(HIGHLIGHT_LINE.offset);
        }

        // Remember the polyline for the future
        line_map[line.id] = polyline;

        // Add compound routes to the map individually, because they can overlap each other
        if (layer === compound_routes_layer) {
            layer_control.addOverlay(polyline, `Route: ${line.name}`);
        }

    }

}

// Handle line click
function highlight_line_handler(e) {

    var polyline = e.target;
    highlight_line(polyline.properties.line.id);

}


// Load journey times, annotate links and compound routes, and schedule to re-run
function load_journey_times() {

    $.get(JOURNEYS_URL)
        .done(function(journeys){

            for (var i = 0; i < journeys.length; ++i) {
                var journey = journeys[i];
                // get corresponding (poly)line
                var line = line_map[journey.id];
                line.properties['journey'] = journey;
            }

            // Refresh the line colours
            update_line_colours();

            // Reset the clock
            clock.update();

            // Re-schedule for a minute in the future
            setTimeout(load_journey_times, 60000);

        });

}


// Set line's colour based on corresponding journey's travelTime and
// normalTravelTime
function update_line_colours() {

    for (var id in line_map) {
        if (line_map.hasOwnProperty(id)) {
            var line = line_map[id];
            if (speed_display === 'relative') {
                update_relative_speed(line);
            }
            else {
                update_actual_normal_speed(line);
            }
        }
    }
}


// Set line colour based on travel time (aka speed) compared to normal
function update_relative_speed(polyline) {

    var journey = polyline.properties.journey;
    var choice;
    // Missing
    if (!journey.travelTime) {
        choice = BROKEN_COLOUR;
    }
    // Worse than normal
    else if (journey.travelTime > 1.2*journey.normalTravelTime) {
        choice = SLOW_COLOUR;
    }
    // Better then normal
    else if (journey.travelTime < 0.8*journey.normalTravelTime) {
        choice = FAST_COLOUR;
    }
    // Normal(ish)
    else {
        choice = NORMAL_COLOUR;
    }
    polyline.setStyle({color: choice});

}

// Set line colour based on actual or expected speed
function update_actual_normal_speed(polyline) {

    var journey = polyline.properties.journey;
    var line = polyline.properties.line;
    var time = speed_display === 'actual' ? journey.travelTime : journey.normalTravelTime;
    var speed = (line.length / time) * TO_MPH;
    var choice;
    if (time === null) {
        choice = BROKEN_COLOUR;
    }
    else if (speed < 5) {
        choice = VERY_SLOW_COLOUR;
    }
    else if (speed < 10) {
        choice = SLOW_COLOUR;
    }
    else if (speed < 20) {
        choice = MEDIUM_COLOUR;
    }
    else {
        choice = FAST_COLOUR;
    }
    polyline.setStyle({color: choice});
}


// Highlight the line identified by id. Save the resulting state if
// do_save isn't explicitly false
function highlight_line(id, do_save) {

    // If anything actually needs to be done
    if (id !== highlighted_line_id) {
        // Clear existing
        if (highlighted_line_id) {
            var polyline = line_map[highlighted_line_id];
            polyline.setStyle(NORMAL_LINE)
                .setOffset(NORMAL_LINE.offset);
        }
        // Set new (if it exists)
        if (id && line_map.hasOwnProperty(id)) {
            line_map[id].setStyle(HIGHLIGHT_LINE)
                .setOffset(HIGHLIGHT_LINE.offset);
        }
        highlighted_line_id = id;
        if (do_save !== false) {
            save_state();
        }
    }
}


// Handle site popups
function site_popup(marker) {

    var site = marker.properties.site;

    return '<table>' +
           `<tr><th>Name</th><td>${site.name}</td></tr>` +
           `<tr><th>Description</th><td>${site.description}</td></tr>` +
           `<tr><th>Id</th><td>${site.id}</td></tr>` +
           '</table>';

}


// Handle line popups
function line_popup(polyline) {

    var line = polyline.properties.line;
    var journey = polyline.properties.journey;

    var message = '<table>' +
                  `<tr><th>Name</th><td>${line.name}</td></tr>` +
                  `<tr><th>Description</th><tr>${line.description}</td></tr>` +
                  `<tr><th>Id</th><td>${line.id}</td></tr>` +
                  `<tr><th>Length</th><td>${line.length} m</td></tr>`;

    if (journey) {
        message += `<tr><th>Time</th><td>${journey.time} </dt></tr>` +
                   `<tr><th>Period</th><td>${journey.period} s</td></tr>`;
        if (journey.travelTime) {
            var speed = (line.length / journey.travelTime) * TO_MPH;
            message += `<tr><th>Travel Time</th><td>${journey.travelTime.toFixed(0)}s (${speed.toFixed(1)} mph)</td></tr>`;
        }
        if (journey.normalTravelTime) {
            var normal_speed = (line.length / journey.normalTravelTime) * TO_MPH;
            message += `<tr><th>Normal Travel Time</th><td>${journey.normalTravelTime.toFixed(0)}s (${normal_speed.toFixed(1)} mph)</td></tr>`;
        }
    }

    message += '</table>';

    return message;

}

function get_clock() {
    var control = L.control({position: 'bottomleft'});
    control.onAdd = function () {
        var div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded clock');
        div.innerHTML = '--:--:--';
        return div;
    };
    control.update = function() {
        var datetime = new Date();
        var hh = ('0'+datetime.getHours()).slice(-2);
        var mm = ('0'+datetime.getMinutes()).slice(-2);
        var ss = ('0'+datetime.getSeconds()).slice(-2);
        control.getContainer().innerHTML = hh+':'+mm+':'+ss;
    };
    return control;
}

// Legend management
function get_legend() {
    var l = L.control({position: 'topleft'});
    l.onAdd = function () {
        var div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded legend');
        add_button(div, 'actual', 'Actual speed');
        add_button(div, 'normal', 'Normal speed');
        add_button(div, 'relative', 'Speed relative to normal');
        L.DomUtil.create('div', 'legend-key', div);
        return div;
    };
    return l;
}

function add_button(parent, value, html) {
    var label = L.DomUtil.create('label', 'legend-label', parent);
    var button = L.DomUtil.create('input', 'legend-button', label);
    button.type = 'radio';
    button.name = 'display_type';
    button.value = value;
    var span = L.DomUtil.create('span', 'legend-button-text', label);
    span.innerHTML = html;
    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.on(button, 'click', display_select,  button);
}

function display_select() {
    speed_display = this.value;
    set_legend();
    update_line_colours();
    save_state();
}

function set_legend() {
    var legend_container = legend.getContainer();
    legend_container.querySelectorAll('input[type=\'radio\']').forEach(function(el){
        if (el.value === speed_display) {
            el.checked = true;
        }
    });
    var key = legend_container.querySelector('div.legend-key');
    var colours;
    if (speed_display === 'relative') {
        colours =
            `<span style="color: ${FAST_COLOUR}">GREEN</span>: speed is at least 20% above normal<br>` +
            `<span style="color: ${NORMAL_COLOUR}">BLUE</span>: speed close to normal<br>` +
            `<span style="color: ${SLOW_COLOUR}">RED</span>: speed is at least 20% below normal<br>` +
            `<span style="color: ${BROKEN_COLOUR}">GREY</span>: no speed reported`;
    }
    else {
        colours =
            `<span style="color: ${FAST_COLOUR}">GREEN</span>: above 20 mph<br>` +
            `<span style="color: ${MEDIUM_COLOUR}">AMBER</span>: between 10 and 20 mph<br>` +
            `<span style="color: ${SLOW_COLOUR}">RED</span>: between 5 and 10 mph<br>` +
            `<span style="color: ${VERY_SLOW_COLOUR}">DARK RED</span>: below 5 mph <br>` +
            `<span style="color: ${BROKEN_COLOUR}">GREY</span>: no speed reported<br>`;
    }
    key.innerHTML = '<div class="legend-colours">' + colours + '</div>' +
        '<div class="legend-common">Traffic drives on the left. Updates every 60s.</div>';
}

// Save current state to the URL
function save_state() {

    console.log('Saving...');

    // Build a dict of non-default values
    var params = new URLSearchParams();

    // Speed display mode
    if (speed_display !== DEFAULT_SPEED_DISPLAY) {
        params.set('s', speed_display);
    }

    // Highlighted line
    if (highlighted_line_id) {
        params.set('h', highlighted_line_id);
    }

    // Position and zoom
    if (map_moved) {
        params.set('z', map.getZoom());
        var center = map.getCenter();
        params.set('la', center.lat.toFixed(5));
        params.set('ln', center.lng.toFixed(5));
    }

    // Baselayer
    var current_base;
    for (var layer_name in base_layers) {
        if (base_layers.hasOwnProperty(layer_name) && map.hasLayer(base_layers[layer_name])) {
            current_base = layer_name;
        }
    }
    if (current_base !== DEFAULT_BASELAYER) {
        params.set('b', current_base);
    }

    // Interaction
    if (!interactive) {
        params.set('i', 'no');
    }

    var params_string = params.toString();
    var uri = location.protocol + '//' + location.host + location.pathname;
    if (params_string) {
        uri += '?' + params_string;
    }
    window.history.pushState(null, '', uri);
}


// Change program state from URL parameters
function set_state() {

    console.log('Setting...');

    var params = new URLSearchParams(window.location.search);

    //speed display mode
    speed_display = params.has('s') ? params.get('s') : DEFAULT_SPEED_DISPLAY;
    set_legend();
    update_line_colours();

    // line highlight
    var id = params.has('h') ? params.get('h') : null;
    highlight_line(id, false);

    // Position - 'z', 'la' and 'ln' always set together
    if (params.has('z')) {
        map.setView([params.get('la'), params.get('ln')], params.get('z'));
        map_moved = true;
    }

    // Baselayer
    var base_name = params.has('b') ? params.get('b') : DEFAULT_BASELAYER;
    map.off('baselayerchange', baselayerchange_handler);
    for (var layer_name in base_layers) {
        if (base_layers.hasOwnProperty(layer_name)) {
            if (layer_name === base_name) {
                base_layers[layer_name].addTo(map);
            }
            else {
                base_layers[layer_name].removeFrom(map);
            }
        }
    }
    map.on('baselayerchange', baselayerchange_handler);

    // Interactive controls
    hide_interaction(params.has('i') && params.get('i') === 'no');

}


function hide_interaction(hide) {

    var legend_container = legend.getContainer();
    if (hide) {
        interactive = false;
        zoom_control.remove();
        layer_control.remove();
        legend_container.querySelectorAll('label').forEach(function(label){
            var button = label.querySelector('input[type=\'radio\']');
            var text = label.querySelector('span');
            button.hidden = true;
            if (button.value !== speed_display) {
                text.hidden = true;
            }
        });
    }
    else {
        interactive = true;
        layer_control.addTo(map);
        zoom_control.addTo(map);
        legend_container.querySelectorAll('label').forEach(function(label){
            var button = label.querySelector('input[type=\'radio\']');
            label.hidden = false;
            button.hidden = false;
        });
    }

}

// Find an object from a list of objects by matching each object's 'id'
// attribute with the supplied 'id'. Could build/use lookup tables instead?
function find_object(list, id) {

    for (var i = 0; i < list.length; ++i) {
        var object = list[i];
        if (object.id === id) {
            return object;
        }
    }
    return undefined;
}
