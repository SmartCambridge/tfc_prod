"use strict"
/* JS Socket code to access RTMonitor real-time sirivm data */
//
function RTMonitorAPI(client_data) {

    // client_data will passed to rt_monitor at connect time
    // to help identify/validate the client.
    // client_data = { rt_client_id: <unique id for this client>
    //                 rt_client_name: <some descriptive name, e.g. display name>
    //                 rt_client_url: <location.href of this connecting web page client>
    //                 rt_token: <token to be passed to rt_monitor in the connection to validate>
    //               }

    this.RTMONITOR_URI = 'https://smartcambridge.org/rtmonitor/sirivm';
    //this.RTMONITOR_URI = 'https://tfc-app2.cl.cam.ac.uk/rtmonitor/sirivm';
    //this.RTMONITOR_URI = 'http://tfc-app2.cl.cam.ac.uk/test/rtmonitor/sirivm';

    var self = this;

    this.VERSION = '2.30';
    // 2.30     Tidy up unnecessary use of 'this' and 'self' for object globals

    var sock = {}; // the page's WebSocket

    var sock_timer = {}; // intervalTimer we use for retries if socket has failed

    var sock_keepalive = true; // boolean whether we want to auto-reconnect on close

    var connect_callbacks = []; // client callback functions for 'connect' method

    var disconnect_callbacks = []; // client callback functions for 'disconnect' method

    var request_callbacks = {}; // dictionary of request_id -> callback_function for requests and subscriptions

    if (client_data)
    {
        self.client_data = client_data;
    }
    else
    {
        self.client_data = {};
        self.client_data.rt_client_id = 'unknown';
        self.client_data.rt_token = 'unknown';
        self.client_data.rt_client_name = 'rtmonitor_api.js V'+this.VERSION;
    }
    self.client_data.rt_client_url = location.href;

    console.log('RTMonitorAPI V'+this.VERSION+' instantiation',client_data);

    // listener to detect ESC 'keydown' while in map_only mode to escape back to normal
    document.onkeydown = function(evt) {
        evt = evt || window.event;
        if (evt.keyCode == 27) // ESC to escape from map-only view
        {
            self.disconnect();
            clearInterval(self.progress_timer);
        }
    }; // end onkeydown

    this.init = function()
    {
        log('RTMonitorAPI init()');

        self.connect();
    };

// ***************************************************************************
// *******************  WebSocket code    ************************************
// ***************************************************************************
// sock_connect() will be called on startup (i.e. in init())
// It will connect socket, when successful will
// send { 'msg_type': 'rt_connect'} message, and should receive { 'msg_type': 'rt_connect_ok' }, then
// send { 'msg_type': 'rt_subscribe', 'request_id' : 'A' } which subsribes to ALL records.
this.connect = function()
{
    log('connect()');

    sock = new SockJS(this.RTMONITOR_URI);

    sock.onopen = function() {
                log('** socket open');
                clearInterval(sock_timer); // delete reconnect timer if it's running
                sock_keepalive = true;

                var msg_obj = { msg_type: 'rt_connect',
                                client_data: self.client_data
                              };

                self.sock_send_str(JSON.stringify(msg_obj));
    };

    sock.onmessage = function(e) {
                var msg = JSON.parse(e.data);
                if (msg.msg_type != null && msg.msg_type == "rt_nok")
                {
                    log('rt_nok error return from RTMonitor '+e.data);
                    return;
                }
                if (msg.msg_type != null && msg.msg_type == "rt_connect_ok")
                {
                    log('RTMonitor connected OK ('+connect_callbacks.length+' clients)');
                    for (var i=0; i<connect_callbacks.length; i++)
                    {
                        var caller = connect_callbacks[i]; // { caller: xx, callback: yy }
                        caller.callback();
                    }
                    return;
                }

                if (msg.request_id)
                {
                    log('RTMonitor websocket message received for '+msg.request_id);
                    //log(e.data);

                    var caller = request_callbacks[msg.request_id];

                    caller.callback(msg);
                }
                else
                {
                    log('RTMonitor websocket message returned with no request_id'+e.data);
                }

    };

    sock.onclose = function() {
                log('socket closed');

                request_callbacks = {};

                for (var i=0; i<disconnect_callbacks.length; i++)
                {
                    disconnect_callbacks[i].callback.call(disconnect_callbacks[i].caller)
                }

                clearInterval(sock_timer);

                if (sock_keepalive)
                {
                    // start interval timer trying to reconnect
                    log('starting reconnect timer');
                    sock_timer = setInterval(function (rt) { return function () { rt.reconnect(); } }(self), 10000);
                }
    };
};

this.ondisconnect = function (callback)
{
    disconnect_callbacks.push({ callback: callback });
    log('ondisconnect() callbacks called for '+disconnect_callbacks.length + ' client(s)');
};

this.onconnect = function(callback)
{
    connect_callbacks.push({ callback: callback });
    log('onconnect() callbacks called for '+connect_callbacks.length + ' client(s)');
};

this.reconnect = function()
{
    log('reconnect() trying to connect');
    self.connect();
};

this.connected = function()
{
    log('connected()');
};

this.disconnect = function()
{
    log('disconnect() ** closing socket...');
    sock_keepalive = false;
    sock.close();
};

// Caller has issued a 'raw' request for sensor data, including 'msg_type' and 'request_id'
// In this case it is the CALLER's responsibility to ensure the msg.requset_id is unique
this.raw_request = function(msg, request_callback)
{
    log('raw_request() '+msg.request_id);

    request_callbacks[msg.request_id] = { callback: request_callback } ;

    return this.sock_send_str(JSON.stringify(msg));
};

// Caller has issued a request for one-time return of sensor data
this.request = function(caller_id, request_id, msg, request_callback)
{
    var caller_request_id = caller_id+'_'+request_id;
    msg.msg_type = 'rt_request';
    msg.request_id = caller_request_id;

    log('request() '+caller_request_id);

    return this.raw_request(msg, request_callback);
};

// Caller has issued subscription for regular real-time return of sensor data
this.subscribe = function(caller_id, request_id, msg, request_callback)
{
    // Note that RTMonitorAPI builds the actual unique request_id that goes to the server
    // as a concatenation of the caller_id and the request_id given by the caller.
    var caller_request_id = caller_id+'_'+request_id;
    msg.msg_type = 'rt_subscribe';
    msg.request_id = caller_request_id;

    log('subscribe()'+caller_request_id);

    return this.raw_request(msg, request_callback);
};

this.unsubscribe = function(caller_id, request_id)
{
    // Note that RTMonitorAPI builds the actual unique request_id that goes to the server
    // as a concatenation of the caller_id and the request_id given by the caller.
    var caller_request_id = caller_id+'_'+request_id;

    log('unsubscribe() '+caller_request_id);

    this.sock_send_str( '{ "msg_type": "rt_unsubscribe", "request_id": "'+caller_request_id+'" }' );
};

this.sock_send_str = function(msg)
{
    if (sock == null)
    {
	    log('<span style="color: red;">Socket not yet connected</span>');
	    return { status: 'rt_nok', reason: 'socket not connected' };
    }
    if (sock.readyState == SockJS.CONNECTING)
    {
	    log('<span style="color: red;">Socket connecting...</span>');
	    return { status: 'rt_nok', reason: 'socket still connecting' };
    }
    if (sock.readyState == SockJS.CLOSING)
    {
	    log('<span style="color: red;">Socket closing...</span>');
	    return { status: 'rt_nok', reason: 'socket closing' };
    }
    if (sock.readyState == SockJS.CLOSED)
    {
	    log('<span style="color: red;">Socket closed</span>');
	    return { status: 'rt_nok', reason: 'socket closed' };
    }

    log('sending: '+msg);

    sock.send(msg);

	return { status: 'rt_ok', reason: 'sent message' };
};

function log(str)
{
    if ((typeof DEBUG !== 'undefined') && DEBUG.indexOf('rtmonitor_api_log') >= 0)
    {
        console.log('RTMonitorAPI',str);
    }
};

// END of 'class' RTMonitorAPI
}

