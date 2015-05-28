function currentUser() {
    return currentEndpoint().match(/http[s]*:\/\/([^.]*).*/)[1];
}

function currentEndpoint() {
    return "http://simbiotica.cartodb.com/api/v1/map";
}


function main() {
    
    // Create map
    var map = new L.Map('map', {
        zoomControl: true,
        drawnControl: true,
        center: [6.489983332670651, 37.6171875],
        zoom: 5
    });

    // Add CartoDB basemaps
    L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '<a href="http://cartodb.com">CartoDB</a> © 2014',
        maxZoom: 18
    }).addTo(map);

    // L.tileLayer('http://{s}.tiles.mapbox.com/v3/enf.tourists/{z}/{x}/{y}.png', {
    //     attribution: '<a href="http://cartodb.com">CartoDB</a> © 2014',
    //     maxZoom: 18
    // }).addTo(map);

    //https://a.tiles.mapbox.com/v3/enf.locals,enf.tourists/12/2006/1544.png


    

     var resilience = 'https://simbiotica.cartodb.com/api/v2/viz/417896d4-0553-11e5-9307-0e4fddd5de28/viz.json';

    cartodb.createLayer(map, resilience)
    .addTo(map);
    console.log('layer 1');





    
    
    
    // Add drawn controls
    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    var drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
            polyline: false,// Turns off this drawing tool
            marker: false,
            
            /*
            polygon: {
                shapeOptions: {
                    color: '#bada55'
                },
                showArea: true
            },
            */
            polygon: false,
            
            rectangle: {
                shapeOptions: {
                    color: '#a63b55'
                },
                showArea: true
            },

            circle: {
                shapeOptions: {
                    color: '#662d91'
                },
                
                showArea: true
            }
            
            
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);
    
    
    // Handle draw actions
    map.on('draw:created', function (e) {
        var type = e.layerType,
            layer = e.layer;
        
        var pol_pgis = null;
        
        switch(type) {
                
            // Create a Rectangle geometry in PostGIS
            case 'rectangle':
                var coords = layer.getLatLngs();
                
                var southWest = L.latLng(coords[1].lat, coords[1].lng);
                var northEast = L.latLng(coords[3].lat, coords[3].lng);

                var pol_pgis = "st_transform(ST_SetSRID(ST_MakeBox2D(ST_Point(" + 
                    coords[1].lng + ", " + coords[1].lat  + "),ST_Point(" + 
                    coords[3].lng + "," + coords[3].lat + ")),4326), 3857)";
                
                break;
            
            // Create a circle geometry in PostGIS
            case 'circle':
                var center = layer.getLatLng();
                
                var pol_pgis = "st_transform(geometry(st_buffer(geography(st_setsrid(st_point(" +
                    center.lng + ", " + center.lat + "), 4326)), " + layer.getRadius() + ")),3857)";
                
                break;
                
            case 'polygon':
                console.log(layer.toGeoJSON());
                
        }
                
           
        if (pol_pgis) {
            
            q = "SELECT round(avg(dn)::numeric,2) as average from chirps_example_clipped where st_intersects(the_geom_webmercator, " + pol_pgis +") ";



                
            console.log("QUERY: " + q);

            var sql = new cartodb.SQL({user: 'simbiotica'});
            sql.execute(q)

            .done(function(data) {
                if (data.rows && data.rows.length > 0)
                    layer.bindPopup("Average % variation in annual precipitation value inside the " + type + ": " + data.rows[0].average );

                else
                    layer.bindPopup("Could not get value!");
            })

            .error(function(errors) {
                layer.bindPopup("Could not get value!");
            })
        }
        
        else {
            layer.bindPopup("Could not get value!");
        }
        
        drawnItems.addLayer(layer);
    });
}
    
    
    
 