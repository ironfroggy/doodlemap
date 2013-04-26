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

        var q = [];
        var b = $('body');
        var s = $('.saving');
        this.db.saveStroke = function(from, to) {
            DoodleModule.saving += 1;
            b.css({background: 'rgb(100, 0, 0)'});
            q.push({key: (new Date), value: {from:from, to:to, color: 'black'}});
        };

        this.db.commitStrokes = function() {
            this.stores.strokes.putmany(q).then(function(){
                b.css({background: 'white'});
            });
            q = [];
        };

        this.db.on('opensuccess', function() {
            root.$broadcast('dataReady', this);
        });

        var root = angular.element(document.querySelector('[ng-app]')).scope();
    }

    app.controller('PlayStrokes', function($scope) {

        var root = angular.element(document.querySelector('[ng-app]')).scope();
        root.$on('dataReady', function(root, db) {
            $scope.db = db;
            console.log(db);
            $scope.redraw();
        });

        $scope.redraw = function() {
            this.blank();
            this.db.stores.strokes.walk()
                .on('each', function(record) {
                    $scope.drawStrokes([
                        record.value.from,
                        record.value.to
                    ]);
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
                app.db.saveStroke(last_pos, pos);
            }
        };

        $scope.doneDrawing = function() {
            app.db.commitStrokes();
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
