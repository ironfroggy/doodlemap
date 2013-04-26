"use strict";

require.config({
    paths: {
        Plasmid: 'plasmid'
    },
    priority: [
        'Plasmid'
    ],
});

require([
    'Plasmid',
], function(plasmid) {
    DoodleModule.app.initialize(plasmid);
});
