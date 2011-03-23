/*
 * This file is part of the RDFauthor project.
 * http://code.google.com/p/rdfauthor
 * Author: Norman Heino <norman.heino@gmail.com>
 */

var MAX_TITLE_LENGTH = 50;
var resourceWidget;

// click events
$('.facet-items li').live('click', function(){
    var input = $(this).data('input');
    var result = input.data('result');
    var faceturi = $(this).data('uri');
    var subjects = $(this).data('subjects');
    input.next('.alida').find('.facet-values').empty();
    $(subjects).each(function(i){
        result.subjects[subjects[i]].getValues(faceturi, function(fvalues) {
            $(fvalues).each(function(j){
                var exists = false;
                var facetValueLabel = fvalues[j].label;
                var facetValue = fvalues[j].value;
                var facetValueType = fvalues[j].type;
                input.next('.alida').find('.facet-values li').each(function(i){
                    if($(this).html()==facetValueLabel && facetValueLabel != undefined) {
                        exists = true;
                    }
                });
                if(exists == false && facetValueLabel != undefined) {
                    input.next('.alida').find('.facet-values').append('<li>'+facetValueLabel+'</li>');
                    input.next('.alida').find('.facet-values li:last').data('faceturi',faceturi);
                    input.next('.alida').find('.facet-values li:last').data('value',facetValue);
                    input.next('.alida').find('.facet-values li:last').data('type',facetValueType);
                    input.next('.alida').find('.facet-values li:last').data('label',facetValue);
                    input.next('.alida').find('.facet-values li:last').data('input',input);
                }
            });
        });
    });
});


$('.facet-values li').live('click',function(){
    var input = $(this).data('input');
    var searchTerm = input.data('searchTerm');
    var responseCallback = input.data('responseCallback');
    var facetUri = $(this).data('faceturi');
    var facetValue = $(this).data('value');
    var facetValueType = $(this).data('type');
    switch(facetValueType){
        case 'uri':
            input.data('optquery').push("?s <" + facetUri + "> <" + facetValue + ">. ");
            break;
        case 'literal':
            input.data('optquery').push("?s <" + facetUri + "> \"" + facetValue + "\". ");
            break;
        default:
            window.console.error('error while creating optQuery');
            break;
    }
    input.focus();
    resourceWidget.performSearch(input, searchTerm, responseCallback, input.data('optquery'));
});

RDFauthor.registerWidget({
    init: function () {
        this.selectedResource      = null;
        this.selectedResourceLabel = null;
        this.searchTerm            = '';
        this.ongoingSearches       = 0;
        this.searchResults         = [];
        
        this._domReady      = false;
        this._pluginLoaded  = false;
        this._pluginLoaded2 = false;
        this._initialized   = false;
        this._autocomplete  = null;
        
        this._namespaces = jQuery.extend({
            foaf: 'http://xmlns.com/foaf/0.1/', 
            dc:   'http://purl.org/dc/terms/', 
            owl:  'http://www.w3.org/2002/07/owl#', 
            rdf:  'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 
            rdfs: 'http://www.w3.org/2000/01/rdf-schema#', 
            skos: 'http://www.w3.org/2004/02/skos/core#', 
            geo:  'http://www.w3.org/2003/01/geo/wgs84_pos#', 
            dbp:  'http://dbpedia.org/property/',
            xsd:  'http://www.w3.org/2001/XMLSchema#', 
            sioc: 'http://rdfs.org/sioc/ns#'
        }, RDFauthor.namespaces());
        
        /* default options */
        this._options = jQuery.extend({
            // Autocomplete options:
            minChars:           3,      /* minmum chars needed to be typed before search starts */
            delay:              1000,   /* delay in ms before search starts */
            max:                9,      /* maximum number of results */
            maxResults:         3,      /* maximum number of results per source */
            // Source options:
            local:              false,  /* Local property cache */
            sparql:             true,   /* use SPARQL endpoint */
            alida:              true,   /* use alida api*/
            //sindice:           true,   /* use Sindice semantic search */
            uri:                true,   /* provide generated URI */
            // Filter options:
            filterRange:        true,   /* show only resources in the rdfs:range of the statement's property */
            filterDomain:       false,  /* show only properties whose domain matches the statement's subject */
            filterProperties:   false,  /* show only resources used as properties */
            // Callbacks
            selectionCallback:  null,   /* the function to be called when a new selection is made */
            selectOnReturn:     false   /* executes selection callback if the user hits return in the search field */
            
        }, this.options);
        
        
        // check conflicting and implied options
        if (this._options.filterRange) {
            this._options.filterDomain     = false;
            this._options.filterProperties = false;
        } else if (this._options.filterDomain) {
            this._options.filterRange      = false;
            this._options.filterProperties = true;
        }
        
        // search sources appearence config
        this.sources = {
            local:      {label: 'Local result',     color: '#efe',  border: '#e3ffe3',  rank: 0},
            sparql:     {label: 'Local result',         color: '#efe', border: '#e3ffe3', rank:  1}, 
            sparqlmm:   {label: 'Possible domain violation',      color: '#fee', border: '#ffe3e3', rank:  2},
            alida:      {label: 'Alida result', color: '#00bffF', border: '#e6e6Fa', rank: 3},
            sindice:    {lael: 'Sindice result',       color: '#eef', border: '#e3e3ff', rank:  6}, 
            uri:        {label: 'Auto-generated URI',   color: '#eee', border: '#e3e3e3', rank:  8}
        }
        
        var self = this;
        if (undefined === jQuery.ui.autocomplete) {
            RDFauthor.loadScript(RDFAUTHOR_BASE + 'libraries/jquery.ui.autocomplete.js', function () {
                self._pluginLoaded = true;
                self._initAutocomplete();
            });
        } else {
            self._pluginLoaded = true;
            self._initAutocomplete();
        }
        
        RDFauthor.loadScript(RDFAUTHOR_BASE + 'libraries/alida.js', function () {
            self._pluginLoaded2 = true;
            self._initAutocomplete();
        });
        
        // jQuery UI styles
        RDFauthor.loadStylesheet(RDFAUTHOR_BASE + 'libraries/jquery.ui.autocomplete.css');
        
        // load stylesheets
        RDFauthor.loadStylesheet(RDFAUTHOR_BASE + 'src/widget.resource.css');

        // load stylesheets
        RDFauthor.loadStylesheet(RDFAUTHOR_BASE + 'libraries/widget.alida.css');


    }, 
    
    ready: function () {
        this._domReady = true;
        this._initAutocomplete();
    },
    
    element: function () {
        return jQuery('#resource-input-' + this.ID);
    }, 
    
    markup: function () {
        var l = this.statement.objectLabel();
        var value = this.statement.objectLabel() 
                  ? this.statement.objectLabel() 
                  : (this.statement.hasObject() ? this.statement.objectValue() : '');
        var markup = '\
            <div class="container resource-value">\
                <input type="text" id="resource-input-' + this.ID + '" class="text resource-edit-input" \
                       value="' + value + '"/>\
            </div>';
        
        return markup;
    }, 
    
    submit: function () {
        if (this.shouldProcessSubmit()) {
            // get databank
            var databank   = RDFauthor.databankForGraph(this.statement.graphURI());
            var hasChanged = (
                this.statement.hasObject() 
                && this.statement.objectValue() !== this.value()
                && null !== this.value()
            );
            
            if (hasChanged || this.removeOnSubmit) {
                var rdfqTriple = this.statement.asRdfQueryTriple();
                if (rdfqTriple) {
                    databank.remove(String(rdfqTriple));
                }
            }
            
            if (!this.removeOnSubmit && this.value()) {
                var self = this;
                try {
                    var newStatement = this.statement.copyWithObject({
                        value: '<' + this.value() + '>', 
                        type: 'uri'
                    });
                    databank.add(newStatement.asRdfQueryTriple());
                } catch (e) {
                    var msg = e.message ? e.message : e;
                    alert('Could not save resource for the following reason: \n' + msg);
                    return false;
                }
            }
        }
        
        return true;
    }, 
    
    shouldProcessSubmit: function () {
        var t1 = !this.statement.hasObject();
        var t2 = null === this.value();
        var t3 = this.removeOnSubmit;
        
        return (!(t1 && t2) || t3);
    }, 
    
    value: function () {
        if (null !== this.selectedResource) {
            return this.selectedResource;
        }
        
        // var typedValue = this.element().val();
        // if ('' !== typedValue) {
        //     return typedValue;
        // }
        
        return null;
    }, 
    
    performSearch: function (input, searchTerm, responseCallback, optQuery) {
        this.searchResults = [];
        var self = this;
        resourceWidget = this;

        if (this._options.sparql) {
            // SPARQL endpoint    
            var prologue      = '\
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>';
            var uriPattern    = '?uri ?v1 ?literal .\n';
            var propertyPattern = '';
            var domainPattern = 'OPTIONAL {?uri rdfs:domain ?domain .}\n';
            var rangePattern  = '';
            var typePattern   = 'OPTIONAL {<' + self.statement.subjectURI() + '> a ?type . }'
            
            if (this._options.filterProperties) {
                propertyPattern = '{?v2 ?uri ?v3 .} UNION {?uri a rdf:Property .}';
            }
            
            if (this._options.filterRange) {
                var range = RDFauthor.infoForPredicate(self.statement.predicateURI(), 'range');
                if (range.length > 0) {
                    rangePattern = '?uri a <' + range.join('> .\n?uri a <') + '> .\n';
                }
            }
            
            var query = prologue + '\nSELECT DISTINCT ?uri ?literal ?domain ?type\
                FROM <' + this.statement.graphURI() + '>\
                WHERE {\
                    ' + uriPattern + '\
                    ' + propertyPattern + '\
                    ' + domainPattern + '\
                    ' + rangePattern + '\
                    ' + typePattern + '\
                    FILTER (\
                        isURI(?uri) \
                        && isLITERAL(?literal) \
                        && REGEX(?literal, "' + searchTerm + '", "i") \
                        && REGEX(?literal, "^.{1,' + MAX_TITLE_LENGTH + '}$"))\
                }\
                LIMIT ' + this._options.maxResults;
            
            // TODO: if domain is bound, check if current subject is an instance of it

            RDFauthor.queryGraph(this.statement.graphURI(), query, {
                callbackSuccess: function (data) {                
                    var sparqlResults = [];
                    if (data && data['results'] && data['results']['bindings']) {
                        var bindings  = data['results']['bindings'];
                        var resources = {};

                        for (var i = 0, max = bindings.length; i < max; i++) {
                            var binding = bindings[i];
                            if (binding['uri']) {
                                var current = binding['uri'];
                                if (current.type == 'uri') {
                                    var uri = current.value;
                                    var label;

                                    if (binding['literal']) {
                                        label = binding['literal']['value'];
                                    }
                                    
                                    if (undefined == resources[uri]) {
                                        resources[uri] = true;
                                        
                                        var domain = binding['domain'];
                                        var type   = binding['type'];
                                        
                                        if (domain && type) {
                                            if (domain['value'] != type['value']) {
                                                sparqlResults.push({
                                                    source: 'sparqlmm', 
                                                    value:  uri, 
                                                    label:  label
                                                });
                                            } else {
                                                sparqlResults.push({
                                                    source: 'sparql', 
                                                    value:  uri, 
                                                    label:  label
                                                });
                                            }
                                        } else {
                                            sparqlResults.push({
                                                source: 'sparql', 
                                                value:  uri, 
                                                label:  label
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    self.results(sparqlResults, responseCallback, 'sparql');
                }
            });
            this.ongoingSearches++;
        }
        
        // Sindice search
        if (this._options.sindice) {
            jQuery.ajax({
                timeout: 10, 
                dataType: 'json', 
                url: 'http://api.sindice.com/v2/search?callback=?', 
                data: {
                    qt: 'term', 
                    page: 1, 
                    format: 'json', 
                    q: encodeURIComponent(searchTerm)
                }, 
                error: function (request, status, error) {
                    self.results([], responseCallback);
                }, 
                success: function (data, status) {
                    var sindiceResults = [];
                    for (var i = 0; i < Math.min(data.entries.length, self._options.maxResults); ++i) {
                        var current = data.entries[i];
                        var title   = String(current.title);

                        if (title.length > MAX_TITLE_LENGTH) {
                            var searchPos = title.search(RegExp(self.searchTerm, 'i'));
                            if (searchPos > -1) {
                                var leftSplit  = Math.max(title.lastIndexOf(',', searchPos) + 1, 0);
                                var rightSplit = title.indexOf(',', searchPos);
                                title = title.substring(leftSplit, rightSplit > -1 ? rightSplit : title.length);
                            }
                        }

                        sindiceResults.push({
                            source: 'sindice', 
                            value: String(current.link), 
                            label: title
                        });
                    }

                    self.results(sindiceResults, responseCallback, 'sindice');
                }
            })
            this.ongoingSearches++;
        }
        
        // static URI
        if (this._options.uri) {
            this.ongoingSearches++;
            this.results([{
                source: 'uri', 
                value: this.generateURI(searchTerm, this.statement.graphURI()), 
                label: searchTerm
            }], responseCallback, 'uri');
        }
        
        // alida api
        if (this._options.alida) {
            var alidaResults = [];
            var endpoints = [];
            /** add endpoint */
            endpoints.push(RDFauthor.serviceURIForGraph(this.statement.graphURI()));
            /** perfom alida */
            Alida.query(searchTerm,endpoints, {
                'optQuery': optQuery,
                'onStart': function() {
                    input.next('.alida').find('ul').empty();
                    input.data('responseCallback',responseCallback);
                    input.data('searchTerm',searchTerm);
                    //input.removeData();
                },
                'onResult': function (result) {
                    input.data('result',result);
                    result.facets(function(){
                        for (var subjectURI in result.subjects) {
                            //facets
                            for (var f in result.subjects[subjectURI].facets) {
                                //check if distinct facet
                                var exists = false;
                                input.next('.alida').find('.facet-items li').each(function(i){
                                    if($(this).html()==f.trimURI()){
                                        exists=true;
                                        $(this).data('subjects').push(subjectURI)
                                    }
                                });
                                if (exists == false){
                                    input.next('.alida').find('.facet-items').append('<li>'+f.trimURI()+'</li>');
                                    input.next('.alida').find('.facet-items li:last').data('uri',f);
                                    input.next('.alida').find('.facet-items li:last').data('subjects',[subjectURI]);
                                    input.next('.alida').find('.facet-items li:last').data('input',input);
                                }
                            }
                            //create Alida results (subjects) for autocomplete
                            alidaResults.push({
                                source: 'alida',
                                value: result.subjects[subjectURI].URI,
                                label: result.subjects[subjectURI].label
                            });
                        }
                    });
                },
                'onStop': function (){
                    self.results(alidaResults, responseCallback, 'alida');
                }
            });
            this.ongoingSearches++;
        }
        
        if (this._options.local) {
            this.ongoingSearches++;
            var results = [], 
                searchResults = RDFauthor.searchCacheByLabel(searchTerm);
            for (var i = 0; i < searchResults.length; i++) {
                results.push({
                    source: 'local', 
                    value: searchResults[i]['uri'], 
                    label: searchResults[i]['label']
                });
            };
            // Add results to global callback
            this.results(results, responseCallback, 'local');
        };
    }, 

    results: function (partialResult, responseCallback, sourceKey) {
        var rank = this.sources[sourceKey].rank;
        if (partialResult.length) {
            this.searchResults[rank] = partialResult;
        }
        this.ongoingSearches--;
        
        if (this.ongoingSearches <= 0) {
            var combinedResults = [],
                uriDict = {};
            
            for (var i = 0; i < this.searchResults.length; i++) {
                var current = this.searchResults[i];
                if (undefined !== current) {
                    for (var j = 0; j < current.length; j++) {
                        if (!(current[j]['value'] in uriDict)) {
                            combinedResults.push(current[j]);
                            uriDict[current[j]['value']] = true;
                        }
                    }
                }
            }
            
            responseCallback(combinedResults);
        };
    }, 
    
    generateURI: function (item, prefix) {
        var lastChar = prefix.charAt(prefix.length - 1);
        if (!(lastChar == '/' || lastChar == '#')) {
            prefix += '/';
        }
        
        return prefix + item;
    }, 
    
    isURI: function (term) {
        // TODO: more advanced URI check
        return (/(https?:\/\/|mailto:|tel:)/.exec(term) !== null);
    }, 
    
    highlight: function (text, term) {
        var highlight = text.replace(RegExp(term, 'i'), '<em>$&</em>');
        return highlight;
    }, 
    
    localName: function (uri) {
        var s = String(uri);
        var l;
        if (s.lastIndexOf('#') > -1) {
            l = s.substr(s.lastIndexOf('#') + 1);
        } else {
            l = s.substr(s.lastIndexOf('/') + 1);
        }
        
        return (l !== '') ? l : s;
    }, 
    
    expandNamespace: function (prefixedName) {
        var splits = prefixedName.split(':', 2);
        if (splits.length >= 2) {
            if (splits[0] in this._namespaces) {
                return this._namespaces[splits[0]] + splits[1];
            }
        }
        
        return prefixedName;
    }, 
    
    _normalizeValue: function (value) {
        if (!this.selectedResource) {
            this.selectedResource      = this.expandNamespace(value);
            this.selectedResourceLabel = this.localName(value);
        }
    }, 
    
    _initAutocomplete: function () {
        var self = this;
        if (this._pluginLoaded && this._pluginLoaded2 && this._domReady && !this._initialized) {
            // must be URI
            if (this.statement.hasObject()) {
                this.element().addClass('resource-autocomplete-uri');
            }
            var self = this;
            var isFirst = true;
            var input = this.element();
            input.data('optquery',[]);
            this.element().after('<div class="alida"><ul class="facet-items"></ul>\
                                  <ul class="facet-values"></ul></div>');
            this.element().autocomplete({
                minLength: self._options.minChars,
                delay: self._options.delay,
                max: self._options.max, 
                search: function (event, ui) {
                    var value = self.element().val();
                    // cancel search if URI entered
                    if (self.isURI(value) || (String(value).indexOf(':') > -1)) {
                        self.element().addClass('resource-autocomplete-uri');
                        self.element().data('autocomplete').close();
                        
                        self._normalizeValue(value);

                        return false;
                    }

                    self.element().removeClass('resource-autocomplete-uri');
                    return true;
                }, 
                source: function (request, response) {
                    // keep for later
                    self.searchTerm = request.term;
                    input.data('optquery',[]);
                    // search
                    self.performSearch(input, request.term, response);
                }, 
                select: function (event, ui) {
                    self.selectedResource      = ui.item.value;
                    self.selectedResourceLabel = ui.item.label;
                    self.element().val(this.selectedResourceLabel);
                    
                    // callback
                    var originalEvent = event   /* autocompleteselected*/
                        .originalEvent          /* menuselected */
                        .originalEvent          /* actual DOM event */;
                    
                    if (!(originalEvent.type == 'keydown' && originalEvent.which == 13) && 
                        typeof self._options.selectionCallback == 'function') {
                        
                        self._options.selectionCallback(self.selectedResource, self.selectedResourceLabel);
                        return true;
                    }

                    // prevent jQuery UI default
                    return false;
                }, 
                focus: function (event, ui) {
                    self.element().val(ui.item.label)

                    // prevent jQuery UI default
                    return false;
                }
            })
            .keydown(function (e) {
                if ((e.which === 13) && self._options.selectOnReturn) {
                    self.element().data('autocomplete').destroy();
                    var val = jQuery(e.target).val();
                    self._normalizeValue(val);
                    
                    var splits = val.split(':', 2);
                    if (splits.length >= 2 && !self.isURI(val)) {
                        if (splits[0] in self._namespaces) {
                            self.selectedResource = self._namespaces[splits[0]] + splits[1];
                            self.selectedResourceLabel = splits[1];
                        }
                    }
                    
                    self._options.selectionCallback(self.selectedResource, self.selectedResourceLabel);
                    
                    // prevent newline in new widget field
                    e.preventDefault();
                } else if (e.which === 27) {
                    e.stopPropagation();
                }
                isFirst=true;
            })
            .data('autocomplete')._renderItem = function(ul, item) {
//                // Add facets
//                if (isFirst) {
//                    jQuery(ul)
//                        .append('<li class="facets"><div style="background-color: #F0F8ff;\
//                                border:1px solid //' + self.sources[item.source]['border'] + ';">\
//                            <span style="font-size:15px;">Facetten</span>\
//                        </div><ul class="facet-items" style="font-size:15px;background-color: #F0F8ff;border:1px solid rgb(230, 230, 250);"><li>test</li></ul></li>//')
//                        .css('width', self.element().innerWidth() - 4)
//                    isFirst = false;
//                }
                // TODO: item sometimes undefiend
                if (item) {
                    return jQuery('<li></li>')
                        .data('item.autocomplete', item)
                        .append('<a class="resource-edit-item" style="background-color: ' + self.sources[item.source]['color'] + ';\
                                border:1px solid ' + self.sources[item.source]['border'] + ';">\
                            <span class="resource-edit-source">' + self.sources[item.source]['label'] + '</span>\
                            <span class="resource-edit-label">' + self.highlight(item.label, self.searchTerm) + '</span>\
                            <span class="resource-edit-uri">' + self.highlight(item.value, self.searchTerm) + '</span>\
                        </a>')
                        .css('width', self.element().innerWidth() - 4)
                        .appendTo(ul);
                }
            };
            this._initialized  = true;
            this._autocomplete = this.element().data('autocomplete');
        }
    }
}, [{
        name: '__OBJECT__'
    }]
);
