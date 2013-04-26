var DoodleModule = new function() {
    appname = "doodlemap";

    app = this.app = angular.module('DoodleApp', []);

    app.initialize = function(plasmid) {
        this.plasmid = plasmid;

        this.db = new plasmid.Database({
            name: appname,
            schema: {
                version: 2,
                stores: {
                    doodles: {
                        sync: false,
                    },
                    strokes: {
                        sync: false,
                    }
                }
            },
        });

        this.db.on('opensuccess', function() {
            root.$broadcast('dataReady', this);
        });
        var root = angular.element(document.querySelector('[ng-app]')).scope();
    }

    app.factory('Doodles', function() {
        var Doodles = [
        ];

        return Doodles;
    });

    app.controller('DoodleListCtrl', function($scope, Doodles) {
        var root = angular.element(document.querySelector('[ng-app]')).scope();
        $scope.doodles = Doodles;

        root.$on('dataReady', function(root, db) {
            db.stores.doodles.walk()
            .on('each', function(doodle) {
                $scope.doodles.push(doodle);
            }).then(function(){
                if ($scope.doodles.length === 0) {
                    var doodle = {
                        created: new Date()
                    };
                    $scope.doodles.push(doodles);
                    db.stores.doodles.put(1, doodle);
                }

                $scope.$apply();
            });
        });

        root.$on('newDoodle', function(s, newid) {
            $scope.doodles.push(
                {key: newid, value: {}});
            $scope.$apply();
        })
    });
    app.directive('selectdoodle', function() {
        return function($scope, element, attrs) {
            element.on('click', function() {
                var root = angular.element(document.querySelector('[ng-app]')).scope();
                root.$emit('selectDoodle', parseInt(attrs.selectdoodle));
            });
        }
    });
    app.directive('newdoodle', function() {
        return function($scope, element, attrs) {
            element.on('click', function() {
                var root = angular.element(document.querySelector('[ng-app]')).scope();
                var newid = $('[selectdoodle]').length + 1;
                root.$emit('newDoodle', newid);
                root.$emit('selectDoodle', newid);
            });
        }
    });

    app.controller('PlayStrokes', function($scope) {

        var root = angular.element(document.querySelector('[ng-app]')).scope();
        root.$on('dataReady', function(root, db) {
            $scope.db = db;
            $scope.redraw();
        });

        $scope.doodle_id = 1;
        root.$on('selectDoodle', function(root, id) {
            $scope.doodle_id = id;
            $scope.redraw();
            $scope.db.stores.doodles.put(id, {});
        });

        $scope.redraw = function() {
            this.blank();
            this.db.stores.strokes.walk()
                .on('each', function(record) {
                    if (record.value.doodle === $scope.doodle_id) {
                        $scope.drawStrokes([
                            record.value.from,
                            record.value.to
                        ]);
                    }
                })
            ;
        };

        $scope.blank = function() {
            var ctx = $scope.ctx
            ,   width = $scope.width
            ,   height = $scope.height
            ;
            ctx.fillStyle = 'lightgrey';
            ctx.fillRect(0, 0, width, height);
        }

        $scope.drawStrokes = function(strokes) {
            var ctx = $scope.ctx;

            if (strokes.length >= 2) {
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.moveTo(strokes[0].x, strokes[0].y);
                for (var i=1; i < strokes.length; i++) {
                    ctx.lineTo(strokes[i].x, strokes[i].y);
                }
                ctx.stroke();
            }
        };

        $scope.recordStroke = function(pos) {
            var last_pos = this.last_pos;
            this.last_pos = pos;
            if (last_pos && pos) {
                this.drawStrokes([
                    last_pos,
                    pos
                ]);
                this.saveStroke($scope.doodle_id, last_pos, pos);
            }
        };

        $scope.drawingStrokes = [];
        $scope.saveStroke = function(doodle, from, to) {
            this.drawingStrokes.push({
                key: (new Date),
                value: {
                    from: from,
                    to: to,
                    color: 'black',
                    doodle: doodle,
                }
            });
        };
        $scope.doneDrawing = function() {
            this.db.stores.strokes.putmany(this.drawingStrokes)
            .then(function(){
            });
        };

    });

    function getContext(el) {
        if (!el.ctx) {
            el.ctx = el[0].getContext('2d');
        }
        return el.ctx;
    }

    app.directive('display', function() {
        return function($scope, element, attrs) {
            var width = window.innerWidth
            ,   height = window.innerHeight
            ,   padding = parseInt($('body').css('padding-left'))
            ;

            height -= $('.navbar').height();
            width -= padding * 2;
            height -= padding * 2

            element.attr({ width: width, height: height });
            var ctx = getContext(element);

            $scope.ctx = ctx;
            $scope.width = width;
            $scope.height = height;
        }
    });

    app.directive('draw', function() {
        return function($scope, element, attrs) {
            var ctx = getContext(element);
            $scope.drawing = false;

            function pos(e) {
                var offset = element.offset();
                return {
                    x: e.pageX - offset.left,
                    y: e.pageY - offset.top
                }
            }

            element.on('mousemove', function(e) {
                if ($scope.drawing) {
                    $scope.recordStroke(pos(e));
                }
            });

            element.on('mousedown', function(e) {
                $scope.drawing = true;
            });

            element.on('mouseup mouseleave', function(e) {
                $scope.drawing = false;
                $scope.last_pos = null;
                $scope.doneDrawing();
            });
        }
    });
}
