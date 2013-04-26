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

        DoodleModule.saving = 0;
        var b = $('body');
        var s = $('.saving');
        this.db.saveStroke = function(from, to) {
            DoodleModule.saving += 1;
            b.css({background: 'rgb(100, 0, 0)'});
            this.stores.strokes.put((new Date), {
                from: from,
                to: to,
                color: 'black',
            }).then(function(){
                DoodleModule.saving -= 1;
                s.text(DoodleModule.saving);
                if (DoodleModule.saving === 0) {
                    b.css({background: 'white'});
                }
            });
        };

        this.db.on('opensuccess', function() {
            DoodleModule.app.db.stores.strokes.walk()
                .on('each', function(record) {
                    app.scope.drawStrokes([
                        record.value.from,
                        record.value.to
                    ]);
                })
            ;
        });
    }

    app.factory('Strokes', function() {
        app.data = new function() {
            this.background = 'lightgrey';
        };
        return app.data;
    });

    app.controller('PlayStrokes', function($scope, Strokes) {
        app.scope = $scope;

        $scope.redraw = function() {
            var ctx = $scope.ctx
            ,   width = $scope.width
            ,   height = $scope.height
            ;
            ctx.fillStyle = Strokes.background;
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
            
            $scope.redraw();
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
            });
        }
    });
}
