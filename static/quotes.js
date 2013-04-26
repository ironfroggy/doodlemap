define(function(require, exports, module) {
    plasmid = require('plasmid');
    Promise = plasmid.Promise;

    appname = "Quotes";
    plasmid_api = window.location.protocol + '//' + window.location.host + '/v1/';
    credentials = new plasmid.Credentials({api: plasmid_api});

    bootstrap_credentials = new plasmid.Credentials({
        access: "guest-creator",
        secret: "knock-knock"
    });

    quotedb = new plasmid.Database({
        name: appname,
        api: plasmid_api,
        schema: {
            version: 1,
            stores: {
                quotes: {sync: true},
            }
        },
        credentials: credentials
    });

    quotedb.countQuotes = function() {
        return this.stores.quotes.count();
    };

    quotedb.addQuote = function(quote, by) {
        this.stores.quotes.put(null, {
            quote: quote,
            by: by
        }).then(function(){
            quotedb.sync();
        });
    };

    quotedb.randomQuote = function() {
        var quotes = this.stores.quotes;
        var index, i=0;
        var promise = new Promise();
        this.countQuotes().then(set_index);
        return promise;

        function set_index(total) {
            index = parseInt(Math.random() * total);
            quotes.walk().on('each', function(item) {
                if (i === index) {
                    promise.ok(item.value);
                }
                i++;
            }).then(function(){
                quotedb.pull();
            });
        };
    };

    $pairing = $('#pairing');
    $pairing_inputs = $pairing.find('input');

    exports.pairing = $pairing;
    exports.cred = credentials;
    exports.bootcred = bootstrap_credentials;
    exports.db = quotedb;

    quotedb.on('opensuccess', function() {
        // Do we already have credentials?
        var self = this;
        this.meta.get('credentials').then(function(saved_cred){
            // Found existing credentials
            credentials.access = saved_cred.access;
            credentials.secret = saved_cred.secret;

            quotedb.setRemote(saved_cred.dbname);
            quotedb.trigger('credentialsready', credentials);
        }).on('missing', function(){
            // Use the bootstrap creds to create new tokens
            credentials.credentials = bootstrap_credentials;
            credentials.create('guest').then(function(data){
                self.meta.put('credentials', {
                    access: data.access,
                    secret: data.secret,
                    dbname: data.dbname,
                });
                quotedb.setRemote(data.dbname);
                quotedb.trigger('credentialsready', credentials);
            });
        });

        showRandomQuote();
    });

    quotedb.on('credentialsready', function(cred){
        var parts = [];
        parts.push(cred.access.slice(0, 4));
        parts.push(cred.access.slice(4, 8));
        parts.push(cred.secret.slice(0, 4));
        parts.push(cred.secret.slice(4, 8));
        
        for (var i=0; i < parts.length; i++) {
            $pairing.find('input').eq(i).val(parts[i]);
        }
    });

    $('#pairing-close').click(function() {
        $pairing.hide();
    });
    $('#pairing-clear-and-pair').click(function() {
        $pairing_inputs.val('');
        $pairing_inputs.eq(0).focus();
        $('#pairing-new-code').show();
    });
    $('#pairing-new-code').click(function() {
        var access = $pairing_inputs.eq(0).val() + $pairing_inputs.eq(1).val();
        var secret = $pairing_inputs.eq(2).val() + $pairing_inputs.eq(3).val();
        var remotename = 'guest_' + access;
        var resets = Promise.chain([
            quotedb.forgetPushed(),
            quotedb.meta.put('last_revision', 0),
            quotedb.meta.put('credentials', {
                access: access, secret: secret
            }),
            quotedb.setRemote(remotename)
        ]);
        resets.then(function(){
            quotedb.pull();
        });
    });

    function showRandomQuote() {
        quotedb.randomQuote().then(function(item){
            $('#show-quote .quote-text').text(item.quote);
            $('#show-quote .quote-by').text(item.by);
        });
    }

    $('#show-quote').click(showRandomQuote);
    $('#add-quote').click(function() {
        $('#enter-quote input').val('');
        $('#show-quote').hide();
        $('#enter-quote').show();
        $('#enter-quote .quote-text input').focus();
    });

    $('#enter-quote .quote-text input').keyup(function(ev) {
        var $el = $(this);
        if ($el.val() && ev.keyCode === 13) {
            $('#enter-quote .quote-by input').focus();
        }
    });
    $('#enter-quote .quote-by input').keyup(function(ev) {
        var $el = $(this);
        var quotetext = $('#enter-quote .quote-text input').val();
        var quoteby = $('#enter-quote .quote-by input').val();
        if ($el.val() && ev.keyCode === 13) {
            quotedb.addQuote(quotetext, quoteby);
            $('#enter-quote input').val('');
            $('#enter-quote').hide();
            $('#show-quote').show();
        }
    });
});
