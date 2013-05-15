/*jshint asi:true, laxcomma:true */
angular.module('bcycle', ['firebase'])
  .controller('MainCtrl', ['$scope', 'angularFireCollection',
    function MainCtrl($scope, angularFireCollection) {
        var state = 'co';
        var markerLayer;
        var map = L.map('map').setView([51.505, -0.09], 1);
        map.locate({setView: true, maxZoom: 16});
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        navigator.geolocation.getCurrentPosition(function(position) {

            var url = 'https://bcycle.firebaseio.com/stations/' + state
            $scope.stations = angularFireCollection(url, function(stations) {
                $scope.setupMarkers(stations)
                stations.ref().on('child_changed', function(val) {
                    var newStation = val.val()
                    var oldStation = _.detect($scope.stations, function(_station) {
                      return newStation.id === _station.id
                    })

                    console.log(newStation.bikesAvailable - oldStation.bikesAvailable)
                    $scope.setupMarkers(stations)
                });
            });

            $scope.maxDistance = function(station) {
                return $scope.distance(station) <= 20.0
            }

            $scope.setupMarkers = function(stations) {
                var markers = [];
                var stationsObj = stations.val();
                for (var key in stationsObj) {
                    if (stationsObj[key].active === true) {
                        if (typeof markerLayer !== "undefined") { map.removeLayer(markerLayer); }
                        if (typeof stationsObj[key].location !== "undefined") {
                            var location = stationsObj[key].location;
                            var bikeIcon = L.divIcon({
                                html: stationsObj[key].bikesAvailable
                            });
                            var marker = new L.Marker([location.lat, location.lon], {
                                icon: bikeIcon
                            });
                            markers.push(marker);
                        }
                    }
                    
                }
                markerLayer = L.layerGroup(markers).addTo(map);
            }


            $scope.distance = function(station) {
                    var stationLocation = station.location;
                    var userLocation = position.coords;

                    var lat1, lon1, lat2, lon2, dlat, dlon, a, c, dm;

                    lat1 = deg2rad(userLocation.latitude);
                    lon1 = deg2rad(userLocation.longitude);
                    lat2 = deg2rad(stationLocation.lat);
                    lon2 = deg2rad(stationLocation.lon);


                    dlat = lat2 - lat1;
                    dlon = lon2 - lon1;

                    a = Math.pow(Math.sin(dlat/2),2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon/2),2);
                    c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

                    return Math.round(c * 3961.0 * 1000)/1000;
            }

            function deg2rad(deg) {
                return deg * Math.PI/180;
            }
    });

    }
]);
