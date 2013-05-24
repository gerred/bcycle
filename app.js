/*jshint asi:true, laxcomma:true */
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , request = require('request')
  , async = require('async')
  , crc = require('crc')
  , S = require('string')
  , Firebase = require('firebase')
  , stationsRef = new Firebase('https://bcycle.firebaseIO.com/stations')
  , routesRef = new Firebase('https://bcycle.firebaseIO.com/routes');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('stylus').middleware(__dirname + "/public"));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/route', function(req, res) {
  var query = req.query
  var startRef = stationsRef.child(S(query.state).slugify().s).child(query.start)
  var endRef = stationsRef.child(S(query.state).slugify().s).child(query.end)
  var cachedRef = routesRef.child(S(query.state).slugify().s).child(query.start).child(query.end)

  cachedRef.on('value', function(cachedSnapshot) {
    if (cachedSnapshot.val()) {
      res.end(JSON.stringify(cachedSnapshot.val()))
    } else {
      startRef.on('value', function(startSnapshot) {
        endRef.on('value', function(endSnapshot) {
          var url = [
                      "https://maps.googleapis.com/maps/api/directions/json?origin="
                      , locationString(startSnapshot.val())
                      , "&destination="
                      , locationString(endSnapshot.val())
                      , "&sensor=false&mode=bicycling"
                    ].join("")
          request({url: url, json: true}, function(err, _res, body) {
            routesRef.child(S(query.state).slugify().s).child(query.start).child(query.end).set(body)
            res.end(JSON.stringify(body))
          })
        })
      })
    }
  })

})


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var checkBikes = function() {
    request({url: 'http://api.bcycle.com/Services/Mobile.svc/ListKiosks', json: true}, function(err, res, body) {
        body.d.list.map(function(stationJson) {
            var station = new Station(stationJson, crc.crc32(JSON.stringify(stationJson)))

            if (stationsRef.child(S(station.state).slugify().s).child(station.id).crc !== station.crc && typeof station.state !== undefined) {
                stationsRef.child(S(station.state).slugify().s).child(station.id).set(station.active ? station : null)
            }
        })

        setTimeout(checkBikes, 10 * 1000)
    })
}

checkBikes()

function Station(params, crc) {
    this.crc = crc
    this.city = params.Address.City
    this.state = params.Address.State
    this.name = params.Name.replace(/\s$/, "")
    this.location = {lat: params.Location.Latitude, lon: params.Location.Longitude}
    this.id = params.Id
    this.bikesAvailable = params.BikesAvailable
    this.docksAvailable = params.DocksAvailable
    this.totalDocks = params.TotalDocks
    this.active = params.Status === 'Active'
}

function locationString(station) {
  return [station.location.lat, station.location.lon].join(" ")
}
