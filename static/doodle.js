var DoodleApp = new function() {
    appname = "doodlemap";

    app = angular.module('DoodleApp', []);
    app.directive('doodlepad', function() {
        return function(scope, element, attrs) {
            console.log(element);
        }
    });

    this.initialize = function(plasmid) {
        this.plasmid = plasmid;

        this.db = new plasmid.Database({
            name: appname,
            schema: {
                version: 1,
                stores: {
                    doodles: {
                        sync: false,
                    }
                }
            },
        });
    }
}
