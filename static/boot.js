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
    DoodleApp.initialize(plasmid);
});
