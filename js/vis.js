/*jslint browser: true*/
/*jslint nomen: true*/
/*global $, jQuery, L*/

(function () {
    "use strict";

    var hsv2rgb, getColor, timeString, // Helper functions, found at the bottom of the file.
        TILE_URL = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/53124/256/{z}/{x}/{y}.png',
        ATTRIBUTION = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>';

    function Map(data) {
        this.data = data;
        this.stations = [];
        this.startTime = this.data.start_time;
        this.endTime = this.data.end_time;
        this.interval = this.data.interval;
        this.currentTime = this.startTime;

        // Set the availability value to appear as red 
        this.minimumValue = 0.7;

        this.map = L.map('map', { minZoom: 11, maxZoom: 14 }).setView([38.895111, -77.036667], 12);
        L.tileLayer(TILE_URL, {
            maxZoom: 18,
            attribution: ATTRIBUTION
        }).addTo(this.map);

        var sliderHTML = '<div class="bikeshare-control-slider leaflet-bar leaflet-control"><div id="selected-time">' + timeString(this.startTime) + '</div><input id="time-slider" type="range" min="' + this.startTime + '" max="' + this.endTime + '" step="' + this.interval + '" value="' + this.currentTime + '" /></div>',
            sliderUpdate = function (e) {
                var delegate = e.data.delegate;
                $('#selected-time').html(timeString(this.value));
                delegate.currentTime = this.value;
                delegate.update();
            };
        $('#map .leaflet-control-container div.leaflet-top.leaflet-left').append(sliderHTML);
        $('.bikeshare-control-slider').on('mousedown touchstart', function (e) { e.stopPropagation(); });
        $('#time-slider').on('change', { delegate: this }, sliderUpdate);

        this.add_stations(this.data.stations);
    }

    Map.prototype.add_stations = function (stations) {
        var that = this;
        $.each(stations, function () {
            var newStation = L.circleMarker([this.lat, this.long], {
                radius: 6,
                fillOpacity: 0.5,
                availability: this.availability,
                popupTemplate: '<strong>' + this.name + '</strong><br />Capacity: ' + this.capacity + ' bikes<br />Your Odds: '
            })
                .addTo(that.map)
                .bindPopup();
            that.stations.push(newStation);
        });
        this.update();
    };

    Map.prototype.update = function () {
        var minimumValue = this.minimumValue,
            index = (this.currentTime - this.startTime) / this.interval;
        $.each(this.stations, function () {
            var val = this.options.availability[index],
                color = getColor(val, minimumValue),
                popup = this.options.popupTemplate + Math.round(val * 100) + '%';
            this.setStyle({ color: color });
            this._popup.setContent(popup);
        });
    };

    $(function () {
        var render_vis = function (json) {
                var map = new Map(json);
            },
            problem = function (error) {
                $('body').css('background-image', 'none');
                $('body').append('<div class="error"><h1>Oops...</h1><p>We ran into a problem while retrieving your data. ' + error.statusText + '.</p></div>');
            };
        $.ajax({
            dataType: "json",
            url: "data/bikeshare-stations.json",
            data: {},
            async: false,
            success: render_vis,
            error: problem
        });
    });

    // Helper Functions

    hsv2rgb = function (h, s, v) {
        // adapted from http://schinckel.net/2012/01/10/hsv-to-rgb-in-javascript/
        var rgb, i, data = [];
        if (s === 0) {
            rgb = [v, v, v];
        } else {
            h = h / 60;
            i = Math.floor(h);
            data = [v * (1 - s), v * (1 - s * (h - i)), v * (1 - s * (1 - (h - i)))];
            switch (i) {
            case 0:
                rgb = [v, data[2], data[0]];
                break;
            case 1:
                rgb = [data[1], v, data[0]];
                break;
            case 2:
                rgb = [data[0], v, data[2]];
                break;
            case 3:
                rgb = [data[0], data[1], v];
                break;
            case 4:
                rgb = [data[2], data[0], v];
                break;
            default:
                rgb = [v, data[0], data[1]];
                break;
            }
        }
        return '#' + rgb.map(function (x) {
            return ("0" + Math.round(x * 255).toString(16)).slice(-2);
        }).join('');
    };

    getColor = function (val, min) {
        if (val < min) { val = min; }
        var h = Math.floor((val - min) * (1 / (1 - min)) * 120);
        return hsv2rgb(h, 1, 0.8);
    };

    timeString = function (minutes) {
        var pm = false,
            hour = Math.floor(minutes / 60),
            string = '';
        if (hour > 11) { pm = true; }
        if (hour > 12) { hour = hour - 12; }
        minutes = minutes % 60;
        string = hour + ':' + ("0" + minutes).slice(-2) + (pm ? 'pm' : 'am');
        return string;
    };
}());
