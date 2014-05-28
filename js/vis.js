/*jslint browser: true*/
/*jslint nomen: true*/
/*global $, jQuery, L*/

(function () {
    "use strict";

    var hsv2rgb, getColor, timeString, // Helper functions, found at the bottom of the file.
        ATTRIBUTION = "Map data &copy;<a href='http://openstreetmap.org'>OpenStreetMap</a> contributors, Imagery &copy;<a href='http://stamen.com'>Stamen</a>",
        TILE_URL = "http://tile.stamen.com/toner-lite/{z}/{x}/{y}.png";

    function Map(availability, stations) {
        this.data = stations;
        this.availability = availability;
        this.startTime = 300;
        this.endTime = 1320;
        this.interval = 5;
        this.currentTime = 480;

        // Set the availability value to appear as red 
        this.minimumValue = 0.8;

        this.map = L.map('map', { minZoom: 12, maxZoom: 16 }).setView([38.895111, -77.036667], 12);
        L.tileLayer(TILE_URL, {
            maxZoom: 18,
            attribution: ATTRIBUTION
        }).addTo(this.map);

        this.stations = L.layerGroup().addTo(this.map);

        var sliderHTML = '<div class="bikeshare-control-slider leaflet-bar leaflet-control"><div id="selected-time">' + timeString(this.currentTime) + '</div><input id="time-slider" type="range" min="' + this.startTime + '" max="' + this.endTime + '" step="' + this.interval + '" value="' + this.currentTime + '" /><button id="toggle-advanced">Options</button><div id="advanced"><button id="animate">Animate</button><select class="data-selector" id="type"><option value="bikes" selected>Bikes</option><option value="spaces">Spaces</option></select><select class="data-selector" id="day"><option value="all">All Days</option><option value="weekday" selected>Weekdays</option><option value="weekend">Weekends</option></select><select class="data-selector" id="season"><option value="all">All Seasons</option><option value="summer">Summer</option><option value="winter">Winter</option><option value="not-winter" selected>Not Winter</option></select></div></div>',
            sliderUpdate = function (e) {
                var delegate = e.data.delegate;
                $('#selected-time').html(timeString(this.value));
                delegate.currentTime = this.value;
                delegate.update();
            },
            that = this,
            animateFrame = function () {
                setTimeout(function() {
                    if (that.animation) { that.animation = requestAnimationFrame(animateFrame); }

                    var $timeSlider = $('#time-slider'),
                        currentVal = parseInt($timeSlider.val(), 10);
                    if (currentVal < that.endTime) {
                        $timeSlider.val(currentVal + that.interval);
                    } else {
                        $timeSlider.val(that.startTime);
                    }
                    $timeSlider.trigger('change');
                }, 1000 / 12);
            },
            startAnimation = function () {
                that.animation = requestAnimationFrame(animateFrame);
            },
            stopAnimation = function () {
                that.animation = false;
            },
            getNewData = function () {
                var type = $('#type').children(':selected').attr('value'),
                    day = $('#day').children(':selected').attr('value'),
                    season = $('#season').children(':selected').attr('value'),
                    path = 'data/' + type + '%3Fday%3D' + day + '%26season%3D' + season +'.json';
                $.ajax(path).done(function (availability) { that.availability = availability; that.add_stations(that.data.stations); });
            };
        $('#map .leaflet-control-container div.leaflet-top.leaflet-left').append(sliderHTML);
        $('#toggle-advanced').on('click', function () { $('#advanced').slideToggle(); });
        $('#animate').on('click', function () {if (that.animation) { stopAnimation(); } else { startAnimation(); } });
        $('.bikeshare-control-slider').on('mousedown touchstart click', function (e) { e.stopPropagation(); });
        $('#time-slider').on('input change', { delegate: this }, sliderUpdate);
        $('.data-selector').on('change', function () { getNewData(); });

        this.add_stations(this.data.stations);
    }

    Map.prototype.add_stations = function (stations) {
        var that = this;
        this.stations.clearLayers();
        $.each(stations, function () {
            if (that.availability[this.id]) {
                var newStation = L.circleMarker([this.lat, this.long], {
                    radius: 6,
                    fillOpacity: 0.5,
                    availability: that.availability[this.id],
                    popupTemplate: '<strong>' + this.name + '</strong><br />Capacity: ' + this.capacity + ' bikes<br />Your Odds: '
                })
                    .addTo(that.stations)
                    .bindPopup();
            }
        });
        this.update();
    };

    Map.prototype.update = function () {
        var minimumValue = this.minimumValue,
            index = ("0" + Math.floor(this.currentTime / 60)).slice(-2) + ":" + ("0" + this.currentTime % 60).slice(-2);
        $.each(this.stations._layers, function () {
            var val = this.options.availability[index],
                color = getColor(val, minimumValue),
                popup = this.options.popupTemplate + Math.round(val * 100) + '%';
            this.setStyle({ color: color });
            this._popup.setContent(popup);
        });
    };

    $(function () {
        $.when(
            $.ajax('data/bikes%3Fday%3Dweekday%26season%3Dnot-winter.json'),
            $.ajax('data/bikeshare-stations.json'))
        .done( function (availability, stations) {
            if (availability[1] === "success" && stations[1] === "success") {
                window.map = new Map(availability[0], stations[0]);
            } else {
                $('body').css('background-image', 'none');
                $('body').append('<div class="error"><h1>Oops...</h1><p>We ran into a problem while retrieving your data. ' + error.statusText + '.</p></div>');
            }
        } );
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
        if (hour === 0) { hour = 12; }
        minutes = minutes % 60;
        string = hour + ':' + ("0" + minutes).slice(-2) + (pm ? 'pm' : 'am');
        return string;
    };
}());
