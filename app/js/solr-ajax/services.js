/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */

'use strict';

/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Maintains a selection set and notifies listeners when changes occur to the
 * set.
 * @param $scope Controller scope
 * @param $rootScope Root scope
 * @todo consider having a default and named selection sets
 */
angular.module('Services',[]).factory('SelectionSetService', ['$rootScope', function ($rootScope) {

    // parameters
    var svc = {};
    svc.documents = {};             // selected documents list
    svc.multipleSelection = false;  // allow multiple selection

    ///////////////////////////////////////////////////////////////////////////

    // Array Remove - By John Resig (MIT Licensed)
    Array.prototype.remove = function(from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add document to the selection list.
     * @param Key Document identifier
     * @param Doc Optional document
     */
    svc.add = function(Key,Doc) {
        if (!svc.multipleSelection) {
            svc.documents = {};
        }
        svc.documents[Key] = (Doc);
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Clear the selection list.
     */
    svc.clear = function() {
        svc.documents = {};
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Get the document identified by the key.
     * @param Key Document identifier
     * @return {*}
     */
    svc.get = function(Key) {
        return svc.documents[Key];
    };

    /**
     * Get the selection set.
     * @return {*}
     */
    svc.getSelectionSet = function() {
        return svc.documents;
    };

    /**
     * Remove the document from the selection list.
     * @param Key Document identifier
     */
    svc.remove = function(Key) {
        delete svc.documents[Key];
        $rootScope.$broadcast("selectionSetUpdate");
    };

    // return the service instance
    return svc;

}]);
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/*---------------------------------------------------------------------------*/
/* Classes                                                                   */

/**
 * Solr search facet.
 * @class Solr search facet
 * @param Field Field name
 * @param Value Field value
 * @see http://wiki.apache.org/solr/SimpleFacetParameters#rangefaceting
 */
function SolrFacet(Field, Value) {

    var self = this;

    // basic faceting
    self.field = Field;     // field name
    self.value = Value;     // field value
    self.options = {};      // additional filtering options
    //this.options['f'+this.field+'facet.mincount'] = 1;  // minimum item count required for result listing

    /**
     * Get option value.
     * @param Name Option name
     */
    self.getOption = function(Name) {
        if (Name == 'q') {

        } else if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the query Url fragment for this facet.
     */
    self.getUrlFragment = function() {
        // this is used to delimit the start of the facet query in the URL and aid parsing
        var query = '&&'; // delimiter should come from the CONSTANTS field
        query += '&fq=' + self.field + ':(' + self.replaceSpaces(self.value) + ")";
        for (var option in self.options) {
            if (self.options.hasOwnProperty(option)) {
                query = query + "&" + option + "=" + self.options[option];
            }
        }
        return query;
    };

    /**
     * Replace all spaces in the facet value with *.
     * @param Str
     */
    self.replaceSpaces  = function(Str) {
        return Str.replace(' ','?');
    };

    /**
     * Set option.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        self.options[Name] = Value;
    };

    /**
     * Set facet properties from Uri parameters.
     * @param Query
     */
    self.setOptionsFromQuery = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                if (name == 'fq') {
                    if (parts.length == 2) {
                        var subparts = parts[1].split(':');
                        self.field = subparts[0];
                        self.value = subparts[1];
                    }
                } else {
                    (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
                }
            }
        }
    };

} // end SolrFacet

/**
 * A Solr search query. The query is composed of four parts: the user query,
 * the query parameters, the result options, and the facet parameters. Each
 * part of the query can be managed individually.
 * @param Url URL to Solr host
 * @param Core Name of Solr core
 */
function SolrQuery(Url, Core) {

    var self = this;

    self.facets = {};               // query facets
    self.facet_counts = {};         // facet counts
    self.highlighting = {};         // query response highlighting
    self.options = {};              // query options
    self.response = {};             // query response
    self.responseHeader = {};       // response header
    self.query = "*:*";             // the user query
    self.queryParameters = {};      // query parameters
    self.url = Url + "/" + Core + "/select?";   // URL for the Solr core

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add facet constraint.
     * @param Name
     * @param Facet
     */
    self.addFacet = function(Name, Facet) {
        self.facets[Name] = Facet;
    };

    /**
     * Get the facet counts.
     * @returns {Int} Solr facet counts.
     */
    self.getFacetCounts = function() {
        return self.facet_counts;
    };

    /**
     * Get the list of facets.
     * @returns {Array} List of facets.
     */
    self.getFacets = function() {
        var facets = [];
        for (var facet in self.facets) {
            facets.push(self.facets[facet]);
        }
        return facets;
    };

    /**
     * Get facets as dictionary.
     * @returns {object}
     */
    self.getFacetsAsDictionary = function() {
        return self.facets;
    };

    /**
     * Get the hash portion of the query URL. We UrlEncode the search terms
     * rather than the entire fragment because it comes out in a much more
     * readable form and is still valid.
     * @returns {String} Hash portion of URL
     */
    self.getHash = function() {
        var query = '';
        // append query
        query += "q=" + self.query;
        for (var key in self.queryParameters) {
            query += self.queryParameters[key];
        }
        // append options
        for (var key in self.options) {
            var val = self.options[key];
            query += "&" + key + "=" + val;
        }
        // append faceting parameters
        for (var key in self.facets) {
            var facet = self.facets[key];
            query += facet.getUrlFragment();
        }
        // return results
        return query;
    };

    /**
     * Get option value.
     * @param Name Option name
     * @return {String} undefined value or undefined if not found.
     */
    self.getOption = function(Name) {
        if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the fully specified Solr query URL.
     */
    self.getUrl = function() {
        return self.url + encodeURI(self.getHash());
    };

    /**
     * Get the primary user query value.
     */
    self.getUserQuery = function() {
        return self.query;
    };

    /**
     * Get the user query parameters.
     */
    self.getUserQueryParameters = function() {
        return self.queryParameters;
    };

    /**
     * Remove facet constraint.
     * @param Name Facet name
     */
    self.removeFacet = function(Name) {
        for (var key in self.facets) {
            var facet = self.facets[key];
            if (facet.field == Name) {
                delete self.facets[key];
                return;
            }
        }
    };

    /**
     * Remove a query option by name,
     * @param Name
     */
    self.removeOption = function(Name) {
        delete self.options[Name];
    };

    /**
     * Set the facet counts field value.
     * @param FacetCounts
     */
    self.setFacetCounts = function(FacetCounts) {
        self.facet_counts = FacetCounts;
    };

    /**
     * Set the highlighting field value.
     * @param Highlighting
     */
    self.setHighlighting = function(Highlighting) {
        self.highlighting = Highlighting;
    };

    /**
     * Set option. User queries should be set using the setUserQuery() and setUserQueryOption() functions.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        // query option
        if (Name === "fq") {
            var fq = self.getOption(Name);
            if (fq != undefined && fq == "") {
                self.options[Name] = fq + " +" + Value;
            } else {
                self.options[Name] = "+" + Value;
            }
        } else {
            self.options[Name] = Value;
        }
    };

    /**
     * Set the primary user query.
     * @param Query User query
     */
    self.setQuery = function(Query) {
        self.query = Query;
    };

    /**
     * Build a SolrQuery from the hash portion of the current window location.
     * @param Query Query or hash portion of the window location
     * @todo this function is completely out of date and needs to be fixed
     */
    self.setQueryFromHash = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
            }
        }
    };

    /**
     * Set the user query parameters.
     * @param Parameter Dictionary of parameters.
     */
    self.setQueryParameter = function(Name, Parameter) {
        self.queryParameters[Name] = Parameter;
    };

    /**
     * Set the user query parameters.
     * @param Parameters Dictionary of parameters.
     */
    self.setQueryParameters = function(Parameters) {
        self.queryParameters = Parameters;
    };

    /**
     * Set the response field value.
     * @param Response
     */
    self.setResponse = function(Response) {
        self.response = Response;
    };

    /**
     * Set the response field value.
     * @param Header
     */
    self.setResponseHeader = function(Header) {
        self.responseHeader = Header;
    };

} // end SolrQuery


/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Executes a document search against an Apache Solr/Lucence search index.
 * Provides shared search configuration for multiple controllers in the form
 * of named queries, and a subscriber service to listen for changes on the
 * named query.
 * @param $rootScope Application root scope
 * @param $http HTTP service
 * @param $location Location service
 * @param CONSTANTS Application constants
 */
angular.module('Services',[]).
    factory('SolrSearchService',['$rootScope', '$http', '$location', 'CONSTANTS', function ($rootScope, $http, $location, CONSTANTS) {

        // parameters
        var defaultQueryName = "defaultQuery";  // the name of the default query
        var svc = {};                           // the service instance
        svc.error = undefined;                  // error message
        svc.message = undefined;                // info or warning message to user
        svc.queries = {};                       // named search queries

        ///////////////////////////////////////////////////////////////////////////

        /**
         * Create a new facet.
         * @param FieldName
         * @param Value
         * @return {Facet}
         */
        svc.createFacet = function(FieldName,Value) {
            return new SolrFacet(FieldName,Value);
        };

        /**
         * Build a default query object.
         */
        svc.createQuery = function () {
            var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
            query.setOption("rows", CONSTANTS.ITEMS_PER_PAGE);
            query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
            query.setOption("wt", "json");
            query.setQuery(CONSTANTS.DEFAULT_QUERY);
            return query;
        };

        /**
         * Parse the current query URL to determine the initial view, search query and
         * facet parameters. Valid view values are list, map, graph.
         * @param Url Current window location
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody&abc=xyz&zyx=abc&&fq=something:value&abc=xyz=xyz=abc
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody
         * http://example.com/#/[view]/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json
         */
        svc.getCurrentQuery = function (Url) {
            // get the query portion of the path
            var i = Url.indexOf(CONSTANTS.QUERY_DELIMITER); // @todo not sure if this is correct anymore
            if (i != -1) {
                // get the view component of the URL fragment
                var view = Url.substring(1, i);
                view = view.replace(new RegExp('/', 'g'), '');
                // get the query component of the URL fragment
                var frag = Url.substring(i + 1);
                var elements = frag.split(CONSTANTS.FACET_DELIMITER);
                if (elements.length > 0) {
                    // the first element is the query
                    var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
                    query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
                    query.setOption("hl.fl", svc.highlightingParameters);
                    query.setOption("indent", "on");
                    query.setOption("rows", svc.itemsPerPage);
                    query.setOption("start", 0);
                    query.setOption("version", CONSTANTS.SOLR_VERSION);
                    query.setOption("wt", "json");
                    query.setQueryFromHash(elements[0]);
                    query.setQuery("q", CONSTANTS.DEFAULT_QUERY);
                    // subsequent elements are facets
                    for (var j = 1; j < elements.length; j++) {
                        var q = elements[j];
                        var facet = new SolrFacet();
                        facet.setOptionsFromQuery(q);
                        // add facet
                        query.facets.push(facet);
                    }
                }
                // return query
                return query;
            }
        };

        /**
         * Get the query object. Where a name is not provided, the default query is returned.
         * @param Name Query name
         * @return The query object or undefined if not found.
         */
        svc.getQuery = function(Name) {
            if (Name) {
                return svc.queries[Name];
            } else {
                return svc.queries[defaultQueryName];
            }
        };

        /**
         * Get the query response.
         * @param Name Query name
         */
        svc.getResponse = function (Name) {
            if (Name) {
                return svc.queries[Name].response;
            } else {
                return svc.queries[defaultQueryName].response;
            }
        };

        /**
         * Initialize the controller. If there is a search query specified in the
         * URL when the controller initializes then use that as the initial query,
         * otherwise use the default.
         */
        svc.init = function (CONSTANTS, $http, $rootScope) {
            if (svc.windowLocationHasQuery(window.location.hash, CONSTANTS.QUERY_DELIMITER)) {
                svc.queries[defaultQueryName] = svc.getCurrentQuery($scope, window.location.hash, CONSTANTS);
            } else {
                svc.queries[defaultQueryName] = svc.createQuery(CONSTANTS, $http, $rootScope);
            }
        };

        /**
         * Determine if the query string is valid.
         * @param Val
         * @todo Develop this further
         */
        svc.isValidQuery = function (Val) {
            for (var i = 0; i < Val.length; i++) {
                if (Val[i] != null && Val[i] != ' ') {
                    return true;
                }
            }
            return false;
        };

        /**
         * Set the starting document in the named query.
         * @param Start The index of the starting document.
         * @param Query Query name
         */
        svc.setPage = function (Start,Query) {
            if (Query) {
                svc.queries[Query].setOption("start",Start);
            } else {
                svc.queries[defaultQueryName].setOption("start",Start);
            }
        };

        /**
         * Set the named query. If a name is not specified, the default query is set.
         * @param Query Query object
         * @param Name Query name
         */
        svc.setQuery = function (Query, Name) {
            if (Name) {
                svc.queries[Name] = Query;
            } else {
                svc.queries[defaultQueryName] = Query;
            }
        };

        /**
         * Set the fragment portion of the window location to reflect the current search query.
         * @param Location
         * @param Scope
         * @param QueryDelimiter
         * @todo this function looks like it been botched somehow in a refactoring
         */
        svc.setWindowLocation = function (Location, Scope, QueryDelimiter) {
            var url = "";
            if (Scope.view) {
                url = Scope.view;
            }
            if (Scope.query) {
                url = url + "/" + QueryDelimiter + Scope.query.getHash();
            }
            // set the hash
            console.log("Setting hash as: " + url);
            window.location.hash = url;
            // var loc = location.hash(url);
        };

        /**
         * Update the search results for all queries.
         */
        svc.handleFacetListUpdate = function () {
            // reset messages
            svc.error = null;
            svc.message = null;
            // update queries
            for (var key in svc.queries) {
                if (svc.queries.hasOwnProperty(key)) {
                    svc.updateQuery(key);
                }
            }
        };

        /**
         * Update the named query.
         * @param Name Query name
         */
        svc.updateQuery = function (Name) {
            // reset messages
            svc.error = null;
            svc.message = null;
            // get the named query
            var query = svc.queries[Name];
            if (query) {
                // fetch the search results
                var url = query.getUrl();
                console.log("GET " + Name + ": " + url);
                $http.get(url).
                    success(function (data) {
                        query.setHighlighting(data.highlighting);
                        if (data.hasOwnProperty('facet_counts')) {
                            query.setFacetCounts(data.facet_counts);
                        }
                        query.setResponse(data.response);
                        query.setResponseHeader(data.responseHeader);
                        $rootScope.$broadcast(Name);
                    }).error(function (data, status, headers, config) {
                        svc.error = "Could not get search results from server. Server responded with status code " + status + ".";
                        var response = {};
                        response['numFound'] = 0;
                        response['start'] = 0;
                        response['docs'] = [];
                        query.setFacetCounts([]);
                        query.setHighlighting({});
                        query.setResponse(response);
                        query.setResponseHeader({});
                        $rootScope.$broadcast(Name);
                    });
            }
        };

        /**
         * Determine if the current location URL has a query.
         * @param Url Fragment portion of url
         * @param Delimiter Query delimiter
         */
        svc.windowLocationHasQuery = function (Url, Delimiter) {
            var i = Url.indexOf(Delimiter);
            return i != -1;
        };

        ///////////////////////////////////////////////////////////////////////

        // initialize
        svc.init(CONSTANTS, $http, $rootScope);

        // return the service instance
        return svc;

    }]).value('version','0.1'); // SolrSearchService
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Utility functions used across the application.
 */
angular.module('Services',[]).factory('Utils', [function () {

    // the service
    var svc = {};

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Convert month index to common name.
     * @param Index
     */
    svc.convertMonthIndexToName = function(Index) {
        var months = {
            '01':"January",
            '02':"February",
            '03':"March",
            '04':"April",
            '05':"May",
            '06':"June",
            '07':"July",
            '08':"August",
            '09':"September",
            '10':"October",
            '11':"November",
            '12':"December"
        };
        return months[Index];
    };

    /**
     * Format date to convert it to the form MMM DD, YYYY.
     * @param Date
     */
    svc.formatDate = function(DateField) {
        if (DateField) {
            var i = DateField.indexOf("T");
            if (i) {
                var d = DateField.substring(0,i);
                var parts = d.split("-");
                var year = parts[0];
                var month = svc.convertMonthIndexToName(parts[1]);
                var day = svc.trimLeadingZero(parts[2]);
                // return month + " " + day + ", " + year;
                return month + ", " + year;

            }
        }
        return '';
    };

    /**
     * Determine if the string s1 starts with the string s2
     * @param s1 String 1
     * @param s2 String 2
     */
    svc.startsWith = function(s1,s2) {
        if (s1 && s2) {
            return s1.slice(0, s2.length) == s2;
        }
        return false;
    };

    /**
     * Trim starting and ending spaces from the string.
     * @param Val
     */
    svc.trim = function(Val) {
        return Val.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };

    /**
     * Remove leading zero from a string.
     * @param Val
     */
    svc.trimLeadingZero = function(Val) {
        if (Val && Val.length > 0) {
            if (Val.substring(0,1) == '0' && Val.length > 1) {
                Val = Val.substring(1,1);
            }
        }
        return Val;
    };

    /**
     * Truncate the field to the specified length.
     * @param Field
     * @param Length
     * @return {*}
     */
    svc.truncate = function(Field,Length) {
        if (Field && Length && Field.length > Length) {
            // remove start/end whitespace
            Field = svc.trim(Field);
            // truncate the document to the specified length
            Field = Field.substring(0,Math.min(Length,Field.length));
            // find the last word and truncate after that
            var i = Field.lastIndexOf(" ");
            if (i != -1) {
                Field = Field.substring(0,i) + " ...";
            }
        }
        return Field;
    };

    /**
     * Truncate the document field to the specified length.
     * @param Document Document
     * @param FieldName Field name to truncate
     * @param Length Maximum field length
     */
    svc.truncateField = function(Document,FieldName,Length) {
        if (Document && Document[FieldName]) {
            if (Document[FieldName] instanceof Array) {
                Document[FieldName] = Document[FieldName][0];
            }
            if (Document[FieldName].length > Length) {
                // remove start/end whitespace
                Document[FieldName] = svc.trim(Document[FieldName]);
                // truncate the document to the specified length
                Document[FieldName] = Document[FieldName].substring(0,Math.min(Length,Document[FieldName].length));
                // find the last word and truncate after that
                var i = Document[FieldName].lastIndexOf(" ");
                if (i != -1) {
                    Document[FieldName] = Document[FieldName].substring(0,i) + " ...";
                }
            }
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    // return the service instance
    return svc;

}]);/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */

'use strict';

/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Maintains a selection set and notifies listeners when changes occur to the
 * set.
 * @param $scope Controller scope
 * @param $rootScope Root scope
 * @todo consider having a default and named selection sets
 */
angular.module('SelectionSetService',[]).factory('SelectionSetService', ['$rootScope', function ($rootScope) {

    // parameters
    var svc = {};
    svc.documents = {};             // selected documents list
    svc.multipleSelection = false;  // allow multiple selection

    ///////////////////////////////////////////////////////////////////////////

    // Array Remove - By John Resig (MIT Licensed)
    Array.prototype.remove = function(from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add document to the selection list.
     * @param Key Document identifier
     * @param Doc Optional document
     */
    svc.add = function(Key,Doc) {
        if (!svc.multipleSelection) {
            svc.documents = {};
        }
        svc.documents[Key] = (Doc);
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Clear the selection list.
     */
    svc.clear = function() {
        svc.documents = {};
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Get the document identified by the key.
     * @param Key Document identifier
     * @return {*}
     */
    svc.get = function(Key) {
        return svc.documents[Key];
    };

    /**
     * Get the selection set.
     * @return {*}
     */
    svc.getSelectionSet = function() {
        return svc.documents;
    };

    /**
     * Remove the document from the selection list.
     * @param Key Document identifier
     */
    svc.remove = function(Key) {
        delete svc.documents[Key];
        $rootScope.$broadcast("selectionSetUpdate");
    };

    // return the service instance
    return svc;

}]);
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/*---------------------------------------------------------------------------*/
/* Classes                                                                   */

/**
 * Solr search facet.
 * @class Solr search facet
 * @param Field Field name
 * @param Value Field value
 * @see http://wiki.apache.org/solr/SimpleFacetParameters#rangefaceting
 */
function SolrFacet(Field, Value) {

    var self = this;

    // basic faceting
    self.field = Field;     // field name
    self.value = Value;     // field value
    self.options = {};      // additional filtering options
    //this.options['f'+this.field+'facet.mincount'] = 1;  // minimum item count required for result listing

    /**
     * Get option value.
     * @param Name Option name
     */
    self.getOption = function(Name) {
        if (Name == 'q') {

        } else if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the query Url fragment for this facet.
     */
    self.getUrlFragment = function() {
        // this is used to delimit the start of the facet query in the URL and aid parsing
        var query = '&&'; // delimiter should come from the CONSTANTS field
        query += '&fq=' + self.field + ':(' + self.replaceSpaces(self.value) + ")";
        for (var option in self.options) {
            if (self.options.hasOwnProperty(option)) {
                query = query + "&" + option + "=" + self.options[option];
            }
        }
        return query;
    };

    /**
     * Replace all spaces in the facet value with *.
     * @param Str
     */
    self.replaceSpaces  = function(Str) {
        return Str.replace(' ','?');
    };

    /**
     * Set option.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        self.options[Name] = Value;
    };

    /**
     * Set facet properties from Uri parameters.
     * @param Query
     */
    self.setOptionsFromQuery = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                if (name == 'fq') {
                    if (parts.length == 2) {
                        var subparts = parts[1].split(':');
                        self.field = subparts[0];
                        self.value = subparts[1];
                    }
                } else {
                    (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
                }
            }
        }
    };

} // end SolrFacet

/**
 * A Solr search query. The query is composed of four parts: the user query,
 * the query parameters, the result options, and the facet parameters. Each
 * part of the query can be managed individually.
 * @param Url URL to Solr host
 * @param Core Name of Solr core
 */
function SolrQuery(Url, Core) {

    var self = this;

    self.facets = {};               // query facets
    self.facet_counts = {};         // facet counts
    self.highlighting = {};         // query response highlighting
    self.options = {};              // query options
    self.response = {};             // query response
    self.responseHeader = {};       // response header
    self.query = "*:*";             // the user query
    self.queryParameters = {};      // query parameters
    self.url = Url + "/" + Core + "/select?";   // URL for the Solr core

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add facet constraint.
     * @param Name
     * @param Facet
     */
    self.addFacet = function(Name, Facet) {
        self.facets[Name] = Facet;
    };

    /**
     * Get the facet counts.
     * @returns {Int} Solr facet counts.
     */
    self.getFacetCounts = function() {
        return self.facet_counts;
    };

    /**
     * Get the list of facets.
     * @returns {Array} List of facets.
     */
    self.getFacets = function() {
        var facets = [];
        for (var facet in self.facets) {
            facets.push(self.facets[facet]);
        }
        return facets;
    };

    /**
     * Get facets as dictionary.
     * @returns {object}
     */
    self.getFacetsAsDictionary = function() {
        return self.facets;
    };

    /**
     * Get the hash portion of the query URL. We UrlEncode the search terms
     * rather than the entire fragment because it comes out in a much more
     * readable form and is still valid.
     * @returns {String} Hash portion of URL
     */
    self.getHash = function() {
        var query = '';
        // append query
        query += "q=" + self.query;
        for (var key in self.queryParameters) {
            query += self.queryParameters[key];
        }
        // append options
        for (var key in self.options) {
            var val = self.options[key];
            query += "&" + key + "=" + val;
        }
        // append faceting parameters
        for (var key in self.facets) {
            var facet = self.facets[key];
            query += facet.getUrlFragment();
        }
        // return results
        return query;
    };

    /**
     * Get option value.
     * @param Name Option name
     * @return {String} undefined value or undefined if not found.
     */
    self.getOption = function(Name) {
        if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the fully specified Solr query URL.
     */
    self.getUrl = function() {
        return self.url + encodeURI(self.getHash());
    };

    /**
     * Get the primary user query value.
     */
    self.getUserQuery = function() {
        return self.query;
    };

    /**
     * Get the user query parameters.
     */
    self.getUserQueryParameters = function() {
        return self.queryParameters;
    };

    /**
     * Remove facet constraint.
     * @param Name Facet name
     */
    self.removeFacet = function(Name) {
        for (var key in self.facets) {
            var facet = self.facets[key];
            if (facet.field == Name) {
                delete self.facets[key];
                return;
            }
        }
    };

    /**
     * Remove a query option by name,
     * @param Name
     */
    self.removeOption = function(Name) {
        delete self.options[Name];
    };

    /**
     * Set the facet counts field value.
     * @param FacetCounts
     */
    self.setFacetCounts = function(FacetCounts) {
        self.facet_counts = FacetCounts;
    };

    /**
     * Set the highlighting field value.
     * @param Highlighting
     */
    self.setHighlighting = function(Highlighting) {
        self.highlighting = Highlighting;
    };

    /**
     * Set option. User queries should be set using the setUserQuery() and setUserQueryOption() functions.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        // query option
        if (Name === "fq") {
            var fq = self.getOption(Name);
            if (fq != undefined && fq == "") {
                self.options[Name] = fq + " +" + Value;
            } else {
                self.options[Name] = "+" + Value;
            }
        } else {
            self.options[Name] = Value;
        }
    };

    /**
     * Set the primary user query.
     * @param Query User query
     */
    self.setQuery = function(Query) {
        self.query = Query;
    };

    /**
     * Build a SolrQuery from the hash portion of the current window location.
     * @param Query Query or hash portion of the window location
     * @todo this function is completely out of date and needs to be fixed
     */
    self.setQueryFromHash = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
            }
        }
    };

    /**
     * Set the user query parameters.
     * @param Parameter Dictionary of parameters.
     */
    self.setQueryParameter = function(Name, Parameter) {
        self.queryParameters[Name] = Parameter;
    };

    /**
     * Set the user query parameters.
     * @param Parameters Dictionary of parameters.
     */
    self.setQueryParameters = function(Parameters) {
        self.queryParameters = Parameters;
    };

    /**
     * Set the response field value.
     * @param Response
     */
    self.setResponse = function(Response) {
        self.response = Response;
    };

    /**
     * Set the response field value.
     * @param Header
     */
    self.setResponseHeader = function(Header) {
        self.responseHeader = Header;
    };

} // end SolrQuery


/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Executes a document search against an Apache Solr/Lucence search index.
 * Provides shared search configuration for multiple controllers in the form
 * of named queries, and a subscriber service to listen for changes on the
 * named query.
 * @param $rootScope Application root scope
 * @param $http HTTP service
 * @param $location Location service
 * @param CONSTANTS Application constants
 */
angular.module('SolrSearchService',[]).factory('SolrSearchService',['$rootScope','$http','$location','CONSTANTS', function($rootScope,$http,$location,CONSTANTS) {

        // parameters
        var defaultQueryName = "defaultQuery";  // the name of the default query
        var svc = {};                           // the service instance
        svc.error = undefined;                  // error message
        svc.message = undefined;                // info or warning message to user
        svc.queries = {};                       // named search queries

        ///////////////////////////////////////////////////////////////////////////

        /**
         * Create a new facet.
         * @param FieldName
         * @param Value
         * @return {Facet}
         */
        svc.createFacet = function(FieldName,Value) {
            return new SolrFacet(FieldName,Value);
        };

        /**
         * Build a default query object.
         */
        svc.createQuery = function () {
            var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
            query.setOption("rows", CONSTANTS.ITEMS_PER_PAGE);
            query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
            query.setOption("wt", "json");
            query.setQuery(CONSTANTS.DEFAULT_QUERY);
            return query;
        };

        /**
         * Parse the current query URL to determine the initial view, search query and
         * facet parameters. Valid view values are list, map, graph.
         * @param Url Current window location
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody&abc=xyz&zyx=abc&&fq=something:value&abc=xyz=xyz=abc
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody
         * http://example.com/#/[view]/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json
         */
        svc.getCurrentQuery = function (Url) {
            // get the query portion of the path
            var i = Url.indexOf(CONSTANTS.QUERY_DELIMITER); // @todo not sure if this is correct anymore
            if (i != -1) {
                // get the view component of the URL fragment
                var view = Url.substring(1, i);
                view = view.replace(new RegExp('/', 'g'), '');
                // get the query component of the URL fragment
                var frag = Url.substring(i + 1);
                var elements = frag.split(CONSTANTS.FACET_DELIMITER);
                if (elements.length > 0) {
                    // the first element is the query
                    var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
                    query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
                    query.setOption("hl.fl", svc.highlightingParameters);
                    query.setOption("indent", "on");
                    query.setOption("rows", svc.itemsPerPage);
                    query.setOption("start", 0);
                    query.setOption("version", CONSTANTS.SOLR_VERSION);
                    query.setOption("wt", "json");
                    query.setQueryFromHash(elements[0]);
                    query.setQuery("q", CONSTANTS.DEFAULT_QUERY);
                    // subsequent elements are facets
                    for (var j = 1; j < elements.length; j++) {
                        var q = elements[j];
                        var facet = new SolrFacet();
                        facet.setOptionsFromQuery(q);
                        // add facet
                        query.facets.push(facet);
                    }
                }
                // return query
                return query;
            }
        };

        /**
         * Get the query object. Where a name is not provided, the default query is returned.
         * @param Name Query name
         * @return The query object or undefined if not found.
         */
        svc.getQuery = function(Name) {
            if (Name) {
                return svc.queries[Name];
            } else {
                return svc.queries[defaultQueryName];
            }
        };

        /**
         * Get the query response.
         * @param Name Query name
         */
        svc.getResponse = function (Name) {
            if (Name) {
                return svc.queries[Name].response;
            } else {
                return svc.queries[defaultQueryName].response;
            }
        };

        /**
         * Initialize the controller. If there is a search query specified in the
         * URL when the controller initializes then use that as the initial query,
         * otherwise use the default.
         */
        svc.init = function (CONSTANTS, $http, $rootScope) {
            if (svc.windowLocationHasQuery(window.location.hash, CONSTANTS.QUERY_DELIMITER)) {
                svc.queries[defaultQueryName] = svc.getCurrentQuery($scope, window.location.hash, CONSTANTS);
            } else {
                svc.queries[defaultQueryName] = svc.createQuery(CONSTANTS, $http, $rootScope);
            }
        };

        /**
         * Determine if the query string is valid.
         * @param Val
         * @todo Develop this further
         */
        svc.isValidQuery = function (Val) {
            for (var i = 0; i < Val.length; i++) {
                if (Val[i] != null && Val[i] != ' ') {
                    return true;
                }
            }
            return false;
        };

        /**
         * Set the starting document in the named query.
         * @param Start The index of the starting document.
         * @param Query Query name
         */
        svc.setPage = function (Start,Query) {
            if (Query) {
                svc.queries[Query].setOption("start",Start);
            } else {
                svc.queries[defaultQueryName].setOption("start",Start);
            }
        };

        /**
         * Set the named query. If a name is not specified, the default query is set.
         * @param Query Query object
         * @param Name Query name
         */
        svc.setQuery = function (Query, Name) {
            if (Name) {
                svc.queries[Name] = Query;
            } else {
                svc.queries[defaultQueryName] = Query;
            }
        };

        /**
         * Set the fragment portion of the window location to reflect the current search query.
         * @param Location
         * @param Scope
         * @param QueryDelimiter
         * @todo this function looks like it been botched somehow in a refactoring
         */
        svc.setWindowLocation = function (Location, Scope, QueryDelimiter) {
            var url = "";
            if (Scope.view) {
                url = Scope.view;
            }
            if (Scope.query) {
                url = url + "/" + QueryDelimiter + Scope.query.getHash();
            }
            // set the hash
            console.log("Setting hash as: " + url);
            window.location.hash = url;
            // var loc = location.hash(url);
        };

        /**
         * Update the search results for all queries.
         */
        svc.handleFacetListUpdate = function () {
            // reset messages
            svc.error = null;
            svc.message = null;
            // update queries
            for (var key in svc.queries) {
                if (svc.queries.hasOwnProperty(key)) {
                    svc.updateQuery(key);
                }
            }
        };

        /**
         * Update the named query.
         * @param Name Query name
         */
        svc.updateQuery = function (Name) {
            // reset messages
            svc.error = null;
            svc.message = null;
            // get the named query
            var query = svc.queries[Name];
            if (query) {
                // fetch the search results
                var url = query.getUrl();
                console.log("GET " + Name + ": " + url);
                $http.get(url).
                    success(function (data) {
                        query.setHighlighting(data.highlighting);
                        if (data.hasOwnProperty('facet_counts')) {
                            query.setFacetCounts(data.facet_counts);
                        }
                        query.setResponse(data.response);
                        query.setResponseHeader(data.responseHeader);
                        $rootScope.$broadcast(Name);
                    }).error(function (data, status, headers, config) {
                        svc.error = "Could not get search results from server. Server responded with status code " + status + ".";
                        var response = {};
                        response['numFound'] = 0;
                        response['start'] = 0;
                        response['docs'] = [];
                        query.setFacetCounts([]);
                        query.setHighlighting({});
                        query.setResponse(response);
                        query.setResponseHeader({});
                        $rootScope.$broadcast(Name);
                    });
            }
        };

        /**
         * Determine if the current location URL has a query.
         * @param Url Fragment portion of url
         * @param Delimiter Query delimiter
         */
        svc.windowLocationHasQuery = function (Url, Delimiter) {
            var i = Url.indexOf(Delimiter);
            return i != -1;
        };

        ///////////////////////////////////////////////////////////////////////

        // initialize
        svc.init(CONSTANTS, $http, $rootScope);

        // return the service instance
        return svc;

    }]).value('version','0.1'); // SolrSearchService
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/**
 * Utility functions used across the application.
 */
angular.module('Utils',[]).factory('Utils',[function() {

    // the service
    var svc = {};

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Convert month index to common name.
     * @param Index
     */
    svc.convertMonthIndexToName = function(Index) {
        var months = {
            '01':"January",
            '02':"February",
            '03':"March",
            '04':"April",
            '05':"May",
            '06':"June",
            '07':"July",
            '08':"August",
            '09':"September",
            '10':"October",
            '11':"November",
            '12':"December"
        };
        return months[Index];
    };

    /**
     * Format date to convert it to the form MMM DD, YYYY.
     * @param Date
     */
    svc.formatDate = function(DateField) {
        if (DateField) {
            var i = DateField.indexOf("T");
            if (i) {
                var d = DateField.substring(0,i);
                var parts = d.split("-");
                var year = parts[0];
                var month = svc.convertMonthIndexToName(parts[1]);
                var day = svc.trimLeadingZero(parts[2]);
                // return month + " " + day + ", " + year;
                return month + ", " + year;

            }
        }
        return '';
    };

    /**
     * Determine if the string s1 starts with the string s2
     * @param s1 String 1
     * @param s2 String 2
     */
    svc.startsWith = function(s1,s2) {
        if (s1 && s2) {
            return s1.slice(0, s2.length) == s2;
        }
        return false;
    };

    /**
     * Trim starting and ending spaces from the string.
     * @param Val
     */
    svc.trim = function(Val) {
        return Val.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };

    /**
     * Remove leading zero from a string.
     * @param Val
     */
    svc.trimLeadingZero = function(Val) {
        if (Val && Val.length > 0) {
            if (Val.substring(0,1) == '0' && Val.length > 1) {
                Val = Val.substring(1,1);
            }
        }
        return Val;
    };

    /**
     * Truncate the field to the specified length.
     * @param Field
     * @param Length
     * @return {*}
     */
    svc.truncate = function(Field,Length) {
        if (Field && Length && Field.length > Length) {
            // remove start/end whitespace
            Field = svc.trim(Field);
            // truncate the document to the specified length
            Field = Field.substring(0,Math.min(Length,Field.length));
            // find the last word and truncate after that
            var i = Field.lastIndexOf(" ");
            if (i != -1) {
                Field = Field.substring(0,i) + " ...";
            }
        }
        return Field;
    };

    /**
     * Truncate the document field to the specified length.
     * @param Document Document
     * @param FieldName Field name to truncate
     * @param Length Maximum field length
     */
    svc.truncateField = function(Document,FieldName,Length) {
        if (Document && Document[FieldName]) {
            if (Document[FieldName] instanceof Array) {
                Document[FieldName] = Document[FieldName][0];
            }
            if (Document[FieldName].length > Length) {
                // remove start/end whitespace
                Document[FieldName] = svc.trim(Document[FieldName]);
                // truncate the document to the specified length
                Document[FieldName] = Document[FieldName].substring(0,Math.min(Length,Document[FieldName].length));
                // find the last word and truncate after that
                var i = Document[FieldName].lastIndexOf(" ");
                if (i != -1) {
                    Document[FieldName] = Document[FieldName].substring(0,i) + " ...";
                }
            }
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    // return the service instance
    return svc;

}]);/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */

'use strict';

/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Maintains a selection set and notifies listeners when changes occur to the
 * set.
 * @param $scope Controller scope
 * @param $rootScope Root scope
 * @todo consider having a default and named selection sets
 */
angular.module('SelectionSetService',[]).factory('SelectionSetService', ['$rootScope', function ($rootScope) {

    // parameters
    var svc = {};
    svc.documents = {};             // selected documents list
    svc.multipleSelection = false;  // allow multiple selection

    ///////////////////////////////////////////////////////////////////////////

    // Array Remove - By John Resig (MIT Licensed)
    Array.prototype.remove = function(from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add document to the selection list.
     * @param Key Document identifier
     * @param Doc Optional document
     */
    svc.add = function(Key,Doc) {
        if (!svc.multipleSelection) {
            svc.documents = {};
        }
        svc.documents[Key] = (Doc);
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Clear the selection list.
     */
    svc.clear = function() {
        svc.documents = {};
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Get the document identified by the key.
     * @param Key Document identifier
     * @return {*}
     */
    svc.get = function(Key) {
        return svc.documents[Key];
    };

    /**
     * Get the selection set.
     * @return {*}
     */
    svc.getSelectionSet = function() {
        return svc.documents;
    };

    /**
     * Remove the document from the selection list.
     * @param Key Document identifier
     */
    svc.remove = function(Key) {
        delete svc.documents[Key];
        $rootScope.$broadcast("selectionSetUpdate");
    };

    // return the service instance
    return svc;

}]);
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/*---------------------------------------------------------------------------*/
/* Classes                                                                   */

/**
 * Solr search facet.
 * @class Solr search facet
 * @param Field Field name
 * @param Value Field value
 * @see http://wiki.apache.org/solr/SimpleFacetParameters#rangefaceting
 */
function SolrFacet(Field, Value) {

    var self = this;

    // basic faceting
    self.field = Field;     // field name
    self.value = Value;     // field value
    self.options = {};      // additional filtering options
    //this.options['f'+this.field+'facet.mincount'] = 1;  // minimum item count required for result listing

    /**
     * Get option value.
     * @param Name Option name
     */
    self.getOption = function(Name) {
        if (Name == 'q') {

        } else if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the query Url fragment for this facet.
     */
    self.getUrlFragment = function() {
        // this is used to delimit the start of the facet query in the URL and aid parsing
        var query = '&&'; // delimiter should come from the CONSTANTS field
        query += '&fq=' + self.field + ':(' + self.replaceSpaces(self.value) + ")";
        for (var option in self.options) {
            if (self.options.hasOwnProperty(option)) {
                query = query + "&" + option + "=" + self.options[option];
            }
        }
        return query;
    };

    /**
     * Replace all spaces in the facet value with *.
     * @param Str
     */
    self.replaceSpaces  = function(Str) {
        return Str.replace(' ','?');
    };

    /**
     * Set option.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        self.options[Name] = Value;
    };

    /**
     * Set facet properties from Uri parameters.
     * @param Query
     */
    self.setOptionsFromQuery = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                if (name == 'fq') {
                    if (parts.length == 2) {
                        var subparts = parts[1].split(':');
                        self.field = subparts[0];
                        self.value = subparts[1];
                    }
                } else {
                    (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
                }
            }
        }
    };

} // end SolrFacet

/**
 * A Solr search query. The query is composed of four parts: the user query,
 * the query parameters, the result options, and the facet parameters. Each
 * part of the query can be managed individually.
 * @param Url URL to Solr host
 * @param Core Name of Solr core
 */
function SolrQuery(Url, Core) {

    var self = this;

    self.facets = {};               // query facets
    self.facet_counts = {};         // facet counts
    self.highlighting = {};         // query response highlighting
    self.options = {};              // query options
    self.response = {};             // query response
    self.responseHeader = {};       // response header
    self.query = "*:*";             // the user query
    self.queryParameters = {};      // query parameters
    self.url = Url + "/" + Core + "/select?";   // URL for the Solr core

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add facet constraint.
     * @param Name
     * @param Facet
     */
    self.addFacet = function(Name, Facet) {
        self.facets[Name] = Facet;
    };

    /**
     * Get the facet counts.
     * @returns {Int} Solr facet counts.
     */
    self.getFacetCounts = function() {
        return self.facet_counts;
    };

    /**
     * Get the list of facets.
     * @returns {Array} List of facets.
     */
    self.getFacets = function() {
        var facets = [];
        for (var facet in self.facets) {
            facets.push(self.facets[facet]);
        }
        return facets;
    };

    /**
     * Get facets as dictionary.
     * @returns {object}
     */
    self.getFacetsAsDictionary = function() {
        return self.facets;
    };

    /**
     * Get the hash portion of the query URL. We UrlEncode the search terms
     * rather than the entire fragment because it comes out in a much more
     * readable form and is still valid.
     * @returns {String} Hash portion of URL
     */
    self.getHash = function() {
        var query = '';
        // append query
        query += "q=" + self.query;
        for (var key in self.queryParameters) {
            query += self.queryParameters[key];
        }
        // append options
        for (var key in self.options) {
            var val = self.options[key];
            query += "&" + key + "=" + val;
        }
        // append faceting parameters
        for (var key in self.facets) {
            var facet = self.facets[key];
            query += facet.getUrlFragment();
        }
        // return results
        return query;
    };

    /**
     * Get option value.
     * @param Name Option name
     * @return {String} undefined value or undefined if not found.
     */
    self.getOption = function(Name) {
        if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the fully specified Solr query URL.
     */
    self.getUrl = function() {
        return self.url + encodeURI(self.getHash());
    };

    /**
     * Get the primary user query value.
     */
    self.getUserQuery = function() {
        return self.query;
    };

    /**
     * Get the user query parameters.
     */
    self.getUserQueryParameters = function() {
        return self.queryParameters;
    };

    /**
     * Remove facet constraint.
     * @param Name Facet name
     */
    self.removeFacet = function(Name) {
        for (var key in self.facets) {
            var facet = self.facets[key];
            if (facet.field == Name) {
                delete self.facets[key];
                return;
            }
        }
    };

    /**
     * Remove a query option by name,
     * @param Name
     */
    self.removeOption = function(Name) {
        delete self.options[Name];
    };

    /**
     * Set the facet counts field value.
     * @param FacetCounts
     */
    self.setFacetCounts = function(FacetCounts) {
        self.facet_counts = FacetCounts;
    };

    /**
     * Set the highlighting field value.
     * @param Highlighting
     */
    self.setHighlighting = function(Highlighting) {
        self.highlighting = Highlighting;
    };

    /**
     * Set option. User queries should be set using the setUserQuery() and setUserQueryOption() functions.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        // query option
        if (Name === "fq") {
            var fq = self.getOption(Name);
            if (fq != undefined && fq == "") {
                self.options[Name] = fq + " +" + Value;
            } else {
                self.options[Name] = "+" + Value;
            }
        } else {
            self.options[Name] = Value;
        }
    };

    /**
     * Set the primary user query.
     * @param Query User query
     */
    self.setQuery = function(Query) {
        self.query = Query;
    };

    /**
     * Build a SolrQuery from the hash portion of the current window location.
     * @param Query Query or hash portion of the window location
     * @todo this function is completely out of date and needs to be fixed
     */
    self.setQueryFromHash = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
            }
        }
    };

    /**
     * Set the user query parameters.
     * @param Parameter Dictionary of parameters.
     */
    self.setQueryParameter = function(Name, Parameter) {
        self.queryParameters[Name] = Parameter;
    };

    /**
     * Set the user query parameters.
     * @param Parameters Dictionary of parameters.
     */
    self.setQueryParameters = function(Parameters) {
        self.queryParameters = Parameters;
    };

    /**
     * Set the response field value.
     * @param Response
     */
    self.setResponse = function(Response) {
        self.response = Response;
    };

    /**
     * Set the response field value.
     * @param Header
     */
    self.setResponseHeader = function(Header) {
        self.responseHeader = Header;
    };

} // end SolrQuery


/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Executes a document search against an Apache Solr/Lucence search index.
 * Provides shared search configuration for multiple controllers in the form
 * of named queries, and a subscriber service to listen for changes on the
 * named query.
 * @param $rootScope Application root scope
 * @param $http HTTP service
 * @param $location Location service
 * @param CONSTANTS Application constants
 */
angular.module('SolrSearchService',[]).factory('SolrSearchService',['$rootScope','$http','$location','CONSTANTS', function($rootScope,$http,$location,CONSTANTS) {

        // parameters
        var defaultQueryName = "defaultQuery";  // the name of the default query
        var svc = {};                           // the service instance
        svc.error = undefined;                  // error message
        svc.message = undefined;                // info or warning message to user
        svc.queries = {};                       // named search queries

        ///////////////////////////////////////////////////////////////////////////

        /**
         * Create a new facet.
         * @param FieldName
         * @param Value
         * @return {Facet}
         */
        svc.createFacet = function(FieldName,Value) {
            return new SolrFacet(FieldName,Value);
        };

        /**
         * Build a default query object.
         */
        svc.createQuery = function () {
            var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
            query.setOption("rows", CONSTANTS.ITEMS_PER_PAGE);
            query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
            query.setOption("wt", "json");
            query.setQuery(CONSTANTS.DEFAULT_QUERY);
            return query;
        };

        /**
         * Parse the current query URL to determine the initial view, search query and
         * facet parameters. Valid view values are list, map, graph.
         * @param Url Current window location
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody&abc=xyz&zyx=abc&&fq=something:value&abc=xyz=xyz=abc
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody
         * http://example.com/#/[view]/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json
         */
        svc.getCurrentQuery = function (Url) {
            // get the query portion of the path
            var i = Url.indexOf(CONSTANTS.QUERY_DELIMITER); // @todo not sure if this is correct anymore
            if (i != -1) {
                // get the view component of the URL fragment
                var view = Url.substring(1, i);
                view = view.replace(new RegExp('/', 'g'), '');
                // get the query component of the URL fragment
                var frag = Url.substring(i + 1);
                var elements = frag.split(CONSTANTS.FACET_DELIMITER);
                if (elements.length > 0) {
                    // the first element is the query
                    var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
                    query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
                    query.setOption("hl.fl", svc.highlightingParameters);
                    query.setOption("indent", "on");
                    query.setOption("rows", svc.itemsPerPage);
                    query.setOption("start", 0);
                    query.setOption("version", CONSTANTS.SOLR_VERSION);
                    query.setOption("wt", "json");
                    query.setQueryFromHash(elements[0]);
                    query.setQuery("q", CONSTANTS.DEFAULT_QUERY);
                    // subsequent elements are facets
                    for (var j = 1; j < elements.length; j++) {
                        var q = elements[j];
                        var facet = new SolrFacet();
                        facet.setOptionsFromQuery(q);
                        // add facet
                        query.facets.push(facet);
                    }
                }
                // return query
                return query;
            }
        };

        /**
         * Get the query object. Where a name is not provided, the default query is returned.
         * @param Name Query name
         * @return The query object or undefined if not found.
         */
        svc.getQuery = function(Name) {
            if (Name) {
                return svc.queries[Name];
            } else {
                return svc.queries[defaultQueryName];
            }
        };

        /**
         * Get the query response.
         * @param Name Query name
         */
        svc.getResponse = function (Name) {
            if (Name) {
                return svc.queries[Name].response;
            } else {
                return svc.queries[defaultQueryName].response;
            }
        };

        /**
         * Initialize the controller. If there is a search query specified in the
         * URL when the controller initializes then use that as the initial query,
         * otherwise use the default.
         */
        svc.init = function (CONSTANTS, $http, $rootScope) {
            if (svc.windowLocationHasQuery(window.location.hash, CONSTANTS.QUERY_DELIMITER)) {
                svc.queries[defaultQueryName] = svc.getCurrentQuery($scope, window.location.hash, CONSTANTS);
            } else {
                svc.queries[defaultQueryName] = svc.createQuery(CONSTANTS, $http, $rootScope);
            }
        };

        /**
         * Determine if the query string is valid.
         * @param Val
         * @todo Develop this further
         */
        svc.isValidQuery = function (Val) {
            for (var i = 0; i < Val.length; i++) {
                if (Val[i] != null && Val[i] != ' ') {
                    return true;
                }
            }
            return false;
        };

        /**
         * Set the starting document in the named query.
         * @param Start The index of the starting document.
         * @param Query Query name
         */
        svc.setPage = function (Start,Query) {
            if (Query) {
                svc.queries[Query].setOption("start",Start);
            } else {
                svc.queries[defaultQueryName].setOption("start",Start);
            }
        };

        /**
         * Set the named query. If a name is not specified, the default query is set.
         * @param Query Query object
         * @param Name Query name
         */
        svc.setQuery = function (Query, Name) {
            if (Name) {
                svc.queries[Name] = Query;
            } else {
                svc.queries[defaultQueryName] = Query;
            }
        };

        /**
         * Set the fragment portion of the window location to reflect the current search query.
         * @param Location
         * @param Scope
         * @param QueryDelimiter
         * @todo this function looks like it been botched somehow in a refactoring
         */
        svc.setWindowLocation = function (Location, Scope, QueryDelimiter) {
            var url = "";
            if (Scope.view) {
                url = Scope.view;
            }
            if (Scope.query) {
                url = url + "/" + QueryDelimiter + Scope.query.getHash();
            }
            // set the hash
            console.log("Setting hash as: " + url);
            window.location.hash = url;
            // var loc = location.hash(url);
        };

        /**
         * Update the search results for all queries.
         */
        svc.handleFacetListUpdate = function () {
            // reset messages
            svc.error = null;
            svc.message = null;
            // update queries
            for (var key in svc.queries) {
                if (svc.queries.hasOwnProperty(key)) {
                    svc.updateQuery(key);
                }
            }
        };

        /**
         * Update the named query.
         * @param Name Query name
         */
        svc.updateQuery = function (Name) {
            // reset messages
            svc.error = null;
            svc.message = null;
            // get the named query
            var query = svc.queries[Name];
            if (query) {
                // fetch the search results
                var url = query.getUrl();
                console.log("GET " + Name + ": " + url);
                $http.get(url).
                    success(function (data) {
                        query.setHighlighting(data.highlighting);
                        if (data.hasOwnProperty('facet_counts')) {
                            query.setFacetCounts(data.facet_counts);
                        }
                        query.setResponse(data.response);
                        query.setResponseHeader(data.responseHeader);
                        $rootScope.$broadcast(Name);
                    }).error(function (data, status, headers, config) {
                        svc.error = "Could not get search results from server. Server responded with status code " + status + ".";
                        var response = {};
                        response['numFound'] = 0;
                        response['start'] = 0;
                        response['docs'] = [];
                        query.setFacetCounts([]);
                        query.setHighlighting({});
                        query.setResponse(response);
                        query.setResponseHeader({});
                        $rootScope.$broadcast(Name);
                    });
            }
        };

        /**
         * Determine if the current location URL has a query.
         * @param Url Fragment portion of url
         * @param Delimiter Query delimiter
         */
        svc.windowLocationHasQuery = function (Url, Delimiter) {
            var i = Url.indexOf(Delimiter);
            return i != -1;
        };

        ///////////////////////////////////////////////////////////////////////

        // initialize
        svc.init(CONSTANTS, $http, $rootScope);

        // return the service instance
        return svc;

    }]).value('version','0.1'); // SolrSearchService
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/**
 * Utility functions used across the application.
 */
angular.module('Utils',[]).factory('Utils',[function() {

    // the service
    var svc = {};

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Convert month index to common name.
     * @param Index
     */
    svc.convertMonthIndexToName = function(Index) {
        var months = {
            '01':"January",
            '02':"February",
            '03':"March",
            '04':"April",
            '05':"May",
            '06':"June",
            '07':"July",
            '08':"August",
            '09':"September",
            '10':"October",
            '11':"November",
            '12':"December"
        };
        return months[Index];
    };

    /**
     * Format date to convert it to the form MMM DD, YYYY.
     * @param Date
     */
    svc.formatDate = function(DateField) {
        if (DateField) {
            var i = DateField.indexOf("T");
            if (i) {
                var d = DateField.substring(0,i);
                var parts = d.split("-");
                var year = parts[0];
                var month = svc.convertMonthIndexToName(parts[1]);
                var day = svc.trimLeadingZero(parts[2]);
                // return month + " " + day + ", " + year;
                return month + ", " + year;

            }
        }
        return '';
    };

    /**
     * Determine if the string s1 starts with the string s2
     * @param s1 String 1
     * @param s2 String 2
     */
    svc.startsWith = function(s1,s2) {
        if (s1 && s2) {
            return s1.slice(0, s2.length) == s2;
        }
        return false;
    };

    /**
     * Trim starting and ending spaces from the string.
     * @param Val
     */
    svc.trim = function(Val) {
        return Val.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };

    /**
     * Remove leading zero from a string.
     * @param Val
     */
    svc.trimLeadingZero = function(Val) {
        if (Val && Val.length > 0) {
            if (Val.substring(0,1) == '0' && Val.length > 1) {
                Val = Val.substring(1,1);
            }
        }
        return Val;
    };

    /**
     * Truncate the field to the specified length.
     * @param Field
     * @param Length
     * @return {*}
     */
    svc.truncate = function(Field,Length) {
        if (Field && Length && Field.length > Length) {
            // remove start/end whitespace
            Field = svc.trim(Field);
            // truncate the document to the specified length
            Field = Field.substring(0,Math.min(Length,Field.length));
            // find the last word and truncate after that
            var i = Field.lastIndexOf(" ");
            if (i != -1) {
                Field = Field.substring(0,i) + " ...";
            }
        }
        return Field;
    };

    /**
     * Truncate the document field to the specified length.
     * @param Document Document
     * @param FieldName Field name to truncate
     * @param Length Maximum field length
     */
    svc.truncateField = function(Document,FieldName,Length) {
        if (Document && Document[FieldName]) {
            if (Document[FieldName] instanceof Array) {
                Document[FieldName] = Document[FieldName][0];
            }
            if (Document[FieldName].length > Length) {
                // remove start/end whitespace
                Document[FieldName] = svc.trim(Document[FieldName]);
                // truncate the document to the specified length
                Document[FieldName] = Document[FieldName].substring(0,Math.min(Length,Document[FieldName].length));
                // find the last word and truncate after that
                var i = Document[FieldName].lastIndexOf(" ");
                if (i != -1) {
                    Document[FieldName] = Document[FieldName].substring(0,i) + " ...";
                }
            }
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    // return the service instance
    return svc;

}]);/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */

'use strict';

/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Maintains a selection set and notifies listeners when changes occur to the
 * set.
 * @param $scope Controller scope
 * @param $rootScope Root scope
 * @todo consider having a default and named selection sets
 */
angular.module('SelectionSetService',[]).factory('SelectionSetService', ['$rootScope', function ($rootScope) {

    // parameters
    var svc = {};
    svc.documents = {};             // selected documents list
    svc.multipleSelection = false;  // allow multiple selection

    ///////////////////////////////////////////////////////////////////////////

    // Array Remove - By John Resig (MIT Licensed)
    Array.prototype.remove = function(from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add document to the selection list.
     * @param Key Document identifier
     * @param Doc Optional document
     */
    svc.add = function(Key,Doc) {
        if (!svc.multipleSelection) {
            svc.documents = {};
        }
        svc.documents[Key] = (Doc);
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Clear the selection list.
     */
    svc.clear = function() {
        svc.documents = {};
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Get the document identified by the key.
     * @param Key Document identifier
     * @return {*}
     */
    svc.get = function(Key) {
        return svc.documents[Key];
    };

    /**
     * Get the selection set.
     * @return {*}
     */
    svc.getSelectionSet = function() {
        return svc.documents;
    };

    /**
     * Remove the document from the selection list.
     * @param Key Document identifier
     */
    svc.remove = function(Key) {
        delete svc.documents[Key];
        $rootScope.$broadcast("selectionSetUpdate");
    };

    // return the service instance
    return svc;

}]);
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/*---------------------------------------------------------------------------*/
/* Classes                                                                   */

/**
 * Solr search facet.
 * @class Solr search facet
 * @param Field Field name
 * @param Value Field value
 * @see http://wiki.apache.org/solr/SimpleFacetParameters#rangefaceting
 */
function SolrFacet(Field, Value) {

    var self = this;

    // basic faceting
    self.field = Field;     // field name
    self.value = Value;     // field value
    self.options = {};      // additional filtering options
    //this.options['f'+this.field+'facet.mincount'] = 1;  // minimum item count required for result listing

    /**
     * Get option value.
     * @param Name Option name
     */
    self.getOption = function(Name) {
        if (Name == 'q') {

        } else if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the query Url fragment for this facet.
     */
    self.getUrlFragment = function() {
        // this is used to delimit the start of the facet query in the URL and aid parsing
        var query = '&&'; // delimiter should come from the CONSTANTS field
        query += '&fq=' + self.field + ':(' + self.replaceSpaces(self.value) + ")";
        for (var option in self.options) {
            if (self.options.hasOwnProperty(option)) {
                query = query + "&" + option + "=" + self.options[option];
            }
        }
        return query;
    };

    /**
     * Replace all spaces in the facet value with *.
     * @param Str
     */
    self.replaceSpaces  = function(Str) {
        return Str.replace(' ','?');
    };

    /**
     * Set option.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        self.options[Name] = Value;
    };

    /**
     * Set facet properties from Uri parameters.
     * @param Query
     */
    self.setOptionsFromQuery = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                if (name == 'fq') {
                    if (parts.length == 2) {
                        var subparts = parts[1].split(':');
                        self.field = subparts[0];
                        self.value = subparts[1];
                    }
                } else {
                    (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
                }
            }
        }
    };

} // end SolrFacet

/**
 * A Solr search query. The query is composed of four parts: the user query,
 * the query parameters, the result options, and the facet parameters. Each
 * part of the query can be managed individually.
 * @param Url URL to Solr host
 * @param Core Name of Solr core
 */
function SolrQuery(Url, Core) {

    var self = this;

    self.facets = {};               // query facets
    self.facet_counts = {};         // facet counts
    self.highlighting = {};         // query response highlighting
    self.options = {};              // query options
    self.response = {};             // query response
    self.responseHeader = {};       // response header
    self.query = "*:*";             // the user query
    self.queryParameters = {};      // query parameters
    self.url = Url + "/" + Core + "/select?";   // URL for the Solr core

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add facet constraint.
     * @param Name
     * @param Facet
     */
    self.addFacet = function(Name, Facet) {
        self.facets[Name] = Facet;
    };

    /**
     * Get the facet counts.
     * @returns {Int} Solr facet counts.
     */
    self.getFacetCounts = function() {
        return self.facet_counts;
    };

    /**
     * Get the list of facets.
     * @returns {Array} List of facets.
     */
    self.getFacets = function() {
        var facets = [];
        for (var facet in self.facets) {
            facets.push(self.facets[facet]);
        }
        return facets;
    };

    /**
     * Get facets as dictionary.
     * @returns {object}
     */
    self.getFacetsAsDictionary = function() {
        return self.facets;
    };

    /**
     * Get the hash portion of the query URL. We UrlEncode the search terms
     * rather than the entire fragment because it comes out in a much more
     * readable form and is still valid.
     * @returns {String} Hash portion of URL
     */
    self.getHash = function() {
        var query = '';
        // append query
        query += "q=" + self.query;
        for (var key in self.queryParameters) {
            query += self.queryParameters[key];
        }
        // append options
        for (var key in self.options) {
            var val = self.options[key];
            query += "&" + key + "=" + val;
        }
        // append faceting parameters
        for (var key in self.facets) {
            var facet = self.facets[key];
            query += facet.getUrlFragment();
        }
        // return results
        return query;
    };

    /**
     * Get option value.
     * @param Name Option name
     * @return {String} undefined value or undefined if not found.
     */
    self.getOption = function(Name) {
        if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the fully specified Solr query URL.
     */
    self.getUrl = function() {
        return self.url + encodeURI(self.getHash());
    };

    /**
     * Get the primary user query value.
     */
    self.getUserQuery = function() {
        return self.query;
    };

    /**
     * Get the user query parameters.
     */
    self.getUserQueryParameters = function() {
        return self.queryParameters;
    };

    /**
     * Remove facet constraint.
     * @param Name Facet name
     */
    self.removeFacet = function(Name) {
        for (var key in self.facets) {
            var facet = self.facets[key];
            if (facet.field == Name) {
                delete self.facets[key];
                return;
            }
        }
    };

    /**
     * Remove a query option by name,
     * @param Name
     */
    self.removeOption = function(Name) {
        delete self.options[Name];
    };

    /**
     * Set the facet counts field value.
     * @param FacetCounts
     */
    self.setFacetCounts = function(FacetCounts) {
        self.facet_counts = FacetCounts;
    };

    /**
     * Set the highlighting field value.
     * @param Highlighting
     */
    self.setHighlighting = function(Highlighting) {
        self.highlighting = Highlighting;
    };

    /**
     * Set option. User queries should be set using the setUserQuery() and setUserQueryOption() functions.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        // query option
        if (Name === "fq") {
            var fq = self.getOption(Name);
            if (fq != undefined && fq == "") {
                self.options[Name] = fq + " +" + Value;
            } else {
                self.options[Name] = "+" + Value;
            }
        } else {
            self.options[Name] = Value;
        }
    };

    /**
     * Set the primary user query.
     * @param Query User query
     */
    self.setQuery = function(Query) {
        self.query = Query;
    };

    /**
     * Build a SolrQuery from the hash portion of the current window location.
     * @param Query Query or hash portion of the window location
     * @todo this function is completely out of date and needs to be fixed
     */
    self.setQueryFromHash = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
            }
        }
    };

    /**
     * Set the user query parameters.
     * @param Parameter Dictionary of parameters.
     */
    self.setQueryParameter = function(Name, Parameter) {
        self.queryParameters[Name] = Parameter;
    };

    /**
     * Set the user query parameters.
     * @param Parameters Dictionary of parameters.
     */
    self.setQueryParameters = function(Parameters) {
        self.queryParameters = Parameters;
    };

    /**
     * Set the response field value.
     * @param Response
     */
    self.setResponse = function(Response) {
        self.response = Response;
    };

    /**
     * Set the response field value.
     * @param Header
     */
    self.setResponseHeader = function(Header) {
        self.responseHeader = Header;
    };

} // end SolrQuery


/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Executes a document search against an Apache Solr/Lucence search index.
 * Provides shared search configuration for multiple controllers in the form
 * of named queries, and a subscriber service to listen for changes on the
 * named query.
 * @param $rootScope Application root scope
 * @param $http HTTP service
 * @param $location Location service
 * @param CONSTANTS Application constants
 */
angular.module('SolrSearchService',[]).factory('SolrSearchService',['$rootScope','$http','$location','CONSTANTS', function($rootScope,$http,$location,CONSTANTS) {

        // parameters
        var defaultQueryName = "defaultQuery";  // the name of the default query
        var svc = {};                           // the service instance
        svc.error = undefined;                  // error message
        svc.message = undefined;                // info or warning message to user
        svc.queries = {};                       // named search queries

        ///////////////////////////////////////////////////////////////////////////

        /**
         * Create a new facet.
         * @param FieldName
         * @param Value
         * @return {Facet}
         */
        svc.createFacet = function(FieldName,Value) {
            return new SolrFacet(FieldName,Value);
        };

        /**
         * Build a default query object.
         */
        svc.createQuery = function () {
            var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
            query.setOption("rows", CONSTANTS.ITEMS_PER_PAGE);
            query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
            query.setOption("wt", "json");
            query.setQuery(CONSTANTS.DEFAULT_QUERY);
            return query;
        };

        /**
         * Parse the current query URL to determine the initial view, search query and
         * facet parameters. Valid view values are list, map, graph.
         * @param Url Current window location
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody&abc=xyz&zyx=abc&&fq=something:value&abc=xyz=xyz=abc
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody
         * http://example.com/#/[view]/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json
         */
        svc.getCurrentQuery = function (Url) {
            // get the query portion of the path
            var i = Url.indexOf(CONSTANTS.QUERY_DELIMITER); // @todo not sure if this is correct anymore
            if (i != -1) {
                // get the view component of the URL fragment
                var view = Url.substring(1, i);
                view = view.replace(new RegExp('/', 'g'), '');
                // get the query component of the URL fragment
                var frag = Url.substring(i + 1);
                var elements = frag.split(CONSTANTS.FACET_DELIMITER);
                if (elements.length > 0) {
                    // the first element is the query
                    var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
                    query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
                    query.setOption("hl.fl", svc.highlightingParameters);
                    query.setOption("indent", "on");
                    query.setOption("rows", svc.itemsPerPage);
                    query.setOption("start", 0);
                    query.setOption("version", CONSTANTS.SOLR_VERSION);
                    query.setOption("wt", "json");
                    query.setQueryFromHash(elements[0]);
                    query.setQuery("q", CONSTANTS.DEFAULT_QUERY);
                    // subsequent elements are facets
                    for (var j = 1; j < elements.length; j++) {
                        var q = elements[j];
                        var facet = new SolrFacet();
                        facet.setOptionsFromQuery(q);
                        // add facet
                        query.facets.push(facet);
                    }
                }
                // return query
                return query;
            }
        };

        /**
         * Get the query object. Where a name is not provided, the default query is returned.
         * @param Name Query name
         * @return The query object or undefined if not found.
         */
        svc.getQuery = function(Name) {
            if (Name) {
                return svc.queries[Name];
            } else {
                return svc.queries[defaultQueryName];
            }
        };

        /**
         * Get the query response.
         * @param Name Query name
         */
        svc.getResponse = function (Name) {
            if (Name) {
                return svc.queries[Name].response;
            } else {
                return svc.queries[defaultQueryName].response;
            }
        };

        /**
         * Initialize the controller. If there is a search query specified in the
         * URL when the controller initializes then use that as the initial query,
         * otherwise use the default.
         */
        svc.init = function (CONSTANTS, $http, $rootScope) {
            if (svc.windowLocationHasQuery(window.location.hash, CONSTANTS.QUERY_DELIMITER)) {
                svc.queries[defaultQueryName] = svc.getCurrentQuery($scope, window.location.hash, CONSTANTS);
            } else {
                svc.queries[defaultQueryName] = svc.createQuery(CONSTANTS, $http, $rootScope);
            }
        };

        /**
         * Determine if the query string is valid.
         * @param Val
         * @todo Develop this further
         */
        svc.isValidQuery = function (Val) {
            for (var i = 0; i < Val.length; i++) {
                if (Val[i] != null && Val[i] != ' ') {
                    return true;
                }
            }
            return false;
        };

        /**
         * Set the starting document in the named query.
         * @param Start The index of the starting document.
         * @param Query Query name
         */
        svc.setPage = function (Start,Query) {
            if (Query) {
                svc.queries[Query].setOption("start",Start);
            } else {
                svc.queries[defaultQueryName].setOption("start",Start);
            }
        };

        /**
         * Set the named query. If a name is not specified, the default query is set.
         * @param Query Query object
         * @param Name Query name
         */
        svc.setQuery = function (Query, Name) {
            if (Name) {
                svc.queries[Name] = Query;
            } else {
                svc.queries[defaultQueryName] = Query;
            }
        };

        /**
         * Set the fragment portion of the window location to reflect the current search query.
         * @param Location
         * @param Scope
         * @param QueryDelimiter
         * @todo this function looks like it been botched somehow in a refactoring
         */
        svc.setWindowLocation = function (Location, Scope, QueryDelimiter) {
            var url = "";
            if (Scope.view) {
                url = Scope.view;
            }
            if (Scope.query) {
                url = url + "/" + QueryDelimiter + Scope.query.getHash();
            }
            // set the hash
            console.log("Setting hash as: " + url);
            window.location.hash = url;
            // var loc = location.hash(url);
        };

        /**
         * Update the search results for all queries.
         */
        svc.handleFacetListUpdate = function () {
            // reset messages
            svc.error = null;
            svc.message = null;
            // update queries
            for (var key in svc.queries) {
                if (svc.queries.hasOwnProperty(key)) {
                    svc.updateQuery(key);
                }
            }
        };

        /**
         * Update the named query.
         * @param Name Query name
         */
        svc.updateQuery = function (Name) {
            // reset messages
            svc.error = null;
            svc.message = null;
            // get the named query
            var query = svc.queries[Name];
            if (query) {
                // fetch the search results
                var url = query.getUrl();
                console.log("GET " + Name + ": " + url);
                $http.get(url).
                    success(function (data) {
                        query.setHighlighting(data.highlighting);
                        if (data.hasOwnProperty('facet_counts')) {
                            query.setFacetCounts(data.facet_counts);
                        }
                        query.setResponse(data.response);
                        query.setResponseHeader(data.responseHeader);
                        $rootScope.$broadcast(Name);
                    }).error(function (data, status, headers, config) {
                        svc.error = "Could not get search results from server. Server responded with status code " + status + ".";
                        var response = {};
                        response['numFound'] = 0;
                        response['start'] = 0;
                        response['docs'] = [];
                        query.setFacetCounts([]);
                        query.setHighlighting({});
                        query.setResponse(response);
                        query.setResponseHeader({});
                        $rootScope.$broadcast(Name);
                    });
            }
        };

        /**
         * Determine if the current location URL has a query.
         * @param Url Fragment portion of url
         * @param Delimiter Query delimiter
         */
        svc.windowLocationHasQuery = function (Url, Delimiter) {
            var i = Url.indexOf(Delimiter);
            return i != -1;
        };

        ///////////////////////////////////////////////////////////////////////

        // initialize
        svc.init(CONSTANTS, $http, $rootScope);

        // return the service instance
        return svc;

    }]).value('version','0.1'); // SolrSearchService
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/**
 * Utility functions used across the application.
 */
angular.module('Utils',[]).factory('Utils',[function() {

    // the service
    var svc = {};

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Convert month index to common name.
     * @param Index
     */
    svc.convertMonthIndexToName = function(Index) {
        var months = {
            '01':"January",
            '02':"February",
            '03':"March",
            '04':"April",
            '05':"May",
            '06':"June",
            '07':"July",
            '08':"August",
            '09':"September",
            '10':"October",
            '11':"November",
            '12':"December"
        };
        return months[Index];
    };

    /**
     * Format date to convert it to the form MMM DD, YYYY.
     * @param Date
     */
    svc.formatDate = function(DateField) {
        if (DateField) {
            var i = DateField.indexOf("T");
            if (i) {
                var d = DateField.substring(0,i);
                var parts = d.split("-");
                var year = parts[0];
                var month = svc.convertMonthIndexToName(parts[1]);
                var day = svc.trimLeadingZero(parts[2]);
                // return month + " " + day + ", " + year;
                return month + ", " + year;

            }
        }
        return '';
    };

    /**
     * Determine if the string s1 starts with the string s2
     * @param s1 String 1
     * @param s2 String 2
     */
    svc.startsWith = function(s1,s2) {
        if (s1 && s2) {
            return s1.slice(0, s2.length) == s2;
        }
        return false;
    };

    /**
     * Trim starting and ending spaces from the string.
     * @param Val
     */
    svc.trim = function(Val) {
        return Val.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };

    /**
     * Remove leading zero from a string.
     * @param Val
     */
    svc.trimLeadingZero = function(Val) {
        if (Val && Val.length > 0) {
            if (Val.substring(0,1) == '0' && Val.length > 1) {
                Val = Val.substring(1,1);
            }
        }
        return Val;
    };

    /**
     * Truncate the field to the specified length.
     * @param Field
     * @param Length
     * @return {*}
     */
    svc.truncate = function(Field,Length) {
        if (Field && Length && Field.length > Length) {
            // remove start/end whitespace
            Field = svc.trim(Field);
            // truncate the document to the specified length
            Field = Field.substring(0,Math.min(Length,Field.length));
            // find the last word and truncate after that
            var i = Field.lastIndexOf(" ");
            if (i != -1) {
                Field = Field.substring(0,i) + " ...";
            }
        }
        return Field;
    };

    /**
     * Truncate the document field to the specified length.
     * @param Document Document
     * @param FieldName Field name to truncate
     * @param Length Maximum field length
     */
    svc.truncateField = function(Document,FieldName,Length) {
        if (Document && Document[FieldName]) {
            if (Document[FieldName] instanceof Array) {
                Document[FieldName] = Document[FieldName][0];
            }
            if (Document[FieldName].length > Length) {
                // remove start/end whitespace
                Document[FieldName] = svc.trim(Document[FieldName]);
                // truncate the document to the specified length
                Document[FieldName] = Document[FieldName].substring(0,Math.min(Length,Document[FieldName].length));
                // find the last word and truncate after that
                var i = Document[FieldName].lastIndexOf(" ");
                if (i != -1) {
                    Document[FieldName] = Document[FieldName].substring(0,i) + " ...";
                }
            }
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    // return the service instance
    return svc;

}]);/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */

'use strict';

/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Maintains a selection set and notifies listeners when changes occur to the
 * set.
 * @param $scope Controller scope
 * @param $rootScope Root scope
 * @todo consider having a default and named selection sets
 */
angular.module('SelectionSetService',[]).factory('SelectionSetService', ['$rootScope', function ($rootScope) {

    // parameters
    var svc = {};
    svc.documents = {};             // selected documents list
    svc.multipleSelection = false;  // allow multiple selection

    ///////////////////////////////////////////////////////////////////////////

    // Array Remove - By John Resig (MIT Licensed)
    Array.prototype.remove = function(from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add document to the selection list.
     * @param Key Document identifier
     * @param Doc Optional document
     */
    svc.add = function(Key,Doc) {
        if (!svc.multipleSelection) {
            svc.documents = {};
        }
        svc.documents[Key] = (Doc);
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Clear the selection list.
     */
    svc.clear = function() {
        svc.documents = {};
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Get the document identified by the key.
     * @param Key Document identifier
     * @return {*}
     */
    svc.get = function(Key) {
        return svc.documents[Key];
    };

    /**
     * Get the selection set.
     * @return {*}
     */
    svc.getSelectionSet = function() {
        return svc.documents;
    };

    /**
     * Remove the document from the selection list.
     * @param Key Document identifier
     */
    svc.remove = function(Key) {
        delete svc.documents[Key];
        $rootScope.$broadcast("selectionSetUpdate");
    };

    // return the service instance
    return svc;

}]);
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/*---------------------------------------------------------------------------*/
/* Classes                                                                   */

/**
 * Solr search facet.
 * @class Solr search facet
 * @param Field Field name
 * @param Value Field value
 * @see http://wiki.apache.org/solr/SimpleFacetParameters#rangefaceting
 */
function SolrFacet(Field, Value) {

    var self = this;

    // basic faceting
    self.field = Field;     // field name
    self.value = Value;     // field value
    self.options = {};      // additional filtering options
    //this.options['f'+this.field+'facet.mincount'] = 1;  // minimum item count required for result listing

    /**
     * Get option value.
     * @param Name Option name
     */
    self.getOption = function(Name) {
        if (Name == 'q') {

        } else if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the query Url fragment for this facet.
     */
    self.getUrlFragment = function() {
        // this is used to delimit the start of the facet query in the URL and aid parsing
        var query = '&&'; // delimiter should come from the CONSTANTS field
        query += '&fq=' + self.field + ':(' + self.replaceSpaces(self.value) + ")";
        for (var option in self.options) {
            if (self.options.hasOwnProperty(option)) {
                query = query + "&" + option + "=" + self.options[option];
            }
        }
        return query;
    };

    /**
     * Replace all spaces in the facet value with *.
     * @param Str
     */
    self.replaceSpaces  = function(Str) {
        return Str.replace(' ','?');
    };

    /**
     * Set option.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        self.options[Name] = Value;
    };

    /**
     * Set facet properties from Uri parameters.
     * @param Query
     */
    self.setOptionsFromQuery = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                if (name == 'fq') {
                    if (parts.length == 2) {
                        var subparts = parts[1].split(':');
                        self.field = subparts[0];
                        self.value = subparts[1];
                    }
                } else {
                    (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
                }
            }
        }
    };

} // end SolrFacet

/**
 * A Solr search query. The query is composed of four parts: the user query,
 * the query parameters, the result options, and the facet parameters. Each
 * part of the query can be managed individually.
 * @param Url URL to Solr host
 * @param Core Name of Solr core
 */
function SolrQuery(Url, Core) {

    var self = this;

    self.facets = {};               // query facets
    self.facet_counts = {};         // facet counts
    self.highlighting = {};         // query response highlighting
    self.options = {};              // query options
    self.response = {};             // query response
    self.responseHeader = {};       // response header
    self.query = "*:*";             // the user query
    self.queryParameters = {};      // query parameters
    self.url = Url + "/" + Core + "/select?";   // URL for the Solr core

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add facet constraint.
     * @param Name
     * @param Facet
     */
    self.addFacet = function(Name, Facet) {
        self.facets[Name] = Facet;
    };

    /**
     * Get the facet counts.
     * @returns {Int} Solr facet counts.
     */
    self.getFacetCounts = function() {
        return self.facet_counts;
    };

    /**
     * Get the list of facets.
     * @returns {Array} List of facets.
     */
    self.getFacets = function() {
        var facets = [];
        for (var facet in self.facets) {
            facets.push(self.facets[facet]);
        }
        return facets;
    };

    /**
     * Get facets as dictionary.
     * @returns {object}
     */
    self.getFacetsAsDictionary = function() {
        return self.facets;
    };

    /**
     * Get the hash portion of the query URL. We UrlEncode the search terms
     * rather than the entire fragment because it comes out in a much more
     * readable form and is still valid.
     * @returns {String} Hash portion of URL
     */
    self.getHash = function() {
        var query = '';
        // append query
        query += "q=" + self.query;
        for (var key in self.queryParameters) {
            query += self.queryParameters[key];
        }
        // append options
        for (var key in self.options) {
            var val = self.options[key];
            query += "&" + key + "=" + val;
        }
        // append faceting parameters
        for (var key in self.facets) {
            var facet = self.facets[key];
            query += facet.getUrlFragment();
        }
        // return results
        return query;
    };

    /**
     * Get option value.
     * @param Name Option name
     * @return {String} undefined value or undefined if not found.
     */
    self.getOption = function(Name) {
        if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the fully specified Solr query URL.
     */
    self.getUrl = function() {
        return self.url + encodeURI(self.getHash());
    };

    /**
     * Get the primary user query value.
     */
    self.getUserQuery = function() {
        return self.query;
    };

    /**
     * Get the user query parameters.
     */
    self.getUserQueryParameters = function() {
        return self.queryParameters;
    };

    /**
     * Remove facet constraint.
     * @param Name Facet name
     */
    self.removeFacet = function(Name) {
        for (var key in self.facets) {
            var facet = self.facets[key];
            if (facet.field == Name) {
                delete self.facets[key];
                return;
            }
        }
    };

    /**
     * Remove a query option by name,
     * @param Name
     */
    self.removeOption = function(Name) {
        delete self.options[Name];
    };

    /**
     * Set the facet counts field value.
     * @param FacetCounts
     */
    self.setFacetCounts = function(FacetCounts) {
        self.facet_counts = FacetCounts;
    };

    /**
     * Set the highlighting field value.
     * @param Highlighting
     */
    self.setHighlighting = function(Highlighting) {
        self.highlighting = Highlighting;
    };

    /**
     * Set option. User queries should be set using the setUserQuery() and setUserQueryOption() functions.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        // query option
        if (Name === "fq") {
            var fq = self.getOption(Name);
            if (fq != undefined && fq == "") {
                self.options[Name] = fq + " +" + Value;
            } else {
                self.options[Name] = "+" + Value;
            }
        } else {
            self.options[Name] = Value;
        }
    };

    /**
     * Set the primary user query.
     * @param Query User query
     */
    self.setQuery = function(Query) {
        self.query = Query;
    };

    /**
     * Build a SolrQuery from the hash portion of the current window location.
     * @param Query Query or hash portion of the window location
     * @todo this function is completely out of date and needs to be fixed
     */
    self.setQueryFromHash = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
            }
        }
    };

    /**
     * Set the user query parameters.
     * @param Parameter Dictionary of parameters.
     */
    self.setQueryParameter = function(Name, Parameter) {
        self.queryParameters[Name] = Parameter;
    };

    /**
     * Set the user query parameters.
     * @param Parameters Dictionary of parameters.
     */
    self.setQueryParameters = function(Parameters) {
        self.queryParameters = Parameters;
    };

    /**
     * Set the response field value.
     * @param Response
     */
    self.setResponse = function(Response) {
        self.response = Response;
    };

    /**
     * Set the response field value.
     * @param Header
     */
    self.setResponseHeader = function(Header) {
        self.responseHeader = Header;
    };

} // end SolrQuery


/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Executes a document search against an Apache Solr/Lucence search index.
 * Provides shared search configuration for multiple controllers in the form
 * of named queries, and a subscriber service to listen for changes on the
 * named query.
 * @param $rootScope Application root scope
 * @param $http HTTP service
 * @param $location Location service
 * @param CONSTANTS Application constants
 */
angular.module('SolrSearchService',[]).factory('SolrSearchService',['$rootScope','$http','$location','CONSTANTS', function($rootScope,$http,$location,CONSTANTS) {

        // parameters
        var defaultQueryName = "defaultQuery";  // the name of the default query
        var svc = {};                           // the service instance
        svc.error = undefined;                  // error message
        svc.message = undefined;                // info or warning message to user
        svc.queries = {};                       // named search queries

        ///////////////////////////////////////////////////////////////////////////

        /**
         * Create a new facet.
         * @param FieldName
         * @param Value
         * @return {Facet}
         */
        svc.createFacet = function(FieldName,Value) {
            return new SolrFacet(FieldName,Value);
        };

        /**
         * Build a default query object.
         */
        svc.createQuery = function () {
            var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
            query.setOption("rows", CONSTANTS.ITEMS_PER_PAGE);
            query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
            query.setOption("wt", "json");
            query.setQuery(CONSTANTS.DEFAULT_QUERY);
            return query;
        };

        /**
         * Parse the current query URL to determine the initial view, search query and
         * facet parameters. Valid view values are list, map, graph.
         * @param Url Current window location
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody&abc=xyz&zyx=abc&&fq=something:value&abc=xyz=xyz=abc
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody
         * http://example.com/#/[view]/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json
         */
        svc.getCurrentQuery = function (Url) {
            // get the query portion of the path
            var i = Url.indexOf(CONSTANTS.QUERY_DELIMITER); // @todo not sure if this is correct anymore
            if (i != -1) {
                // get the view component of the URL fragment
                var view = Url.substring(1, i);
                view = view.replace(new RegExp('/', 'g'), '');
                // get the query component of the URL fragment
                var frag = Url.substring(i + 1);
                var elements = frag.split(CONSTANTS.FACET_DELIMITER);
                if (elements.length > 0) {
                    // the first element is the query
                    var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
                    query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
                    query.setOption("hl.fl", svc.highlightingParameters);
                    query.setOption("indent", "on");
                    query.setOption("rows", svc.itemsPerPage);
                    query.setOption("start", 0);
                    query.setOption("version", CONSTANTS.SOLR_VERSION);
                    query.setOption("wt", "json");
                    query.setQueryFromHash(elements[0]);
                    query.setQuery("q", CONSTANTS.DEFAULT_QUERY);
                    // subsequent elements are facets
                    for (var j = 1; j < elements.length; j++) {
                        var q = elements[j];
                        var facet = new SolrFacet();
                        facet.setOptionsFromQuery(q);
                        // add facet
                        query.facets.push(facet);
                    }
                }
                // return query
                return query;
            }
        };

        /**
         * Get the query object. Where a name is not provided, the default query is returned.
         * @param Name Query name
         * @return The query object or undefined if not found.
         */
        svc.getQuery = function(Name) {
            if (Name) {
                return svc.queries[Name];
            } else {
                return svc.queries[defaultQueryName];
            }
        };

        /**
         * Get the query response.
         * @param Name Query name
         */
        svc.getResponse = function (Name) {
            if (Name) {
                return svc.queries[Name].response;
            } else {
                return svc.queries[defaultQueryName].response;
            }
        };

        /**
         * Initialize the controller. If there is a search query specified in the
         * URL when the controller initializes then use that as the initial query,
         * otherwise use the default.
         */
        svc.init = function (CONSTANTS, $http, $rootScope) {
            if (svc.windowLocationHasQuery(window.location.hash, CONSTANTS.QUERY_DELIMITER)) {
                svc.queries[defaultQueryName] = svc.getCurrentQuery($scope, window.location.hash, CONSTANTS);
            } else {
                svc.queries[defaultQueryName] = svc.createQuery(CONSTANTS, $http, $rootScope);
            }
        };

        /**
         * Determine if the query string is valid.
         * @param Val
         * @todo Develop this further
         */
        svc.isValidQuery = function (Val) {
            for (var i = 0; i < Val.length; i++) {
                if (Val[i] != null && Val[i] != ' ') {
                    return true;
                }
            }
            return false;
        };

        /**
         * Set the starting document in the named query.
         * @param Start The index of the starting document.
         * @param Query Query name
         */
        svc.setPage = function (Start,Query) {
            if (Query) {
                svc.queries[Query].setOption("start",Start);
            } else {
                svc.queries[defaultQueryName].setOption("start",Start);
            }
        };

        /**
         * Set the named query. If a name is not specified, the default query is set.
         * @param Query Query object
         * @param Name Query name
         */
        svc.setQuery = function (Query, Name) {
            if (Name) {
                svc.queries[Name] = Query;
            } else {
                svc.queries[defaultQueryName] = Query;
            }
        };

        /**
         * Set the fragment portion of the window location to reflect the current search query.
         * @param Location
         * @param Scope
         * @param QueryDelimiter
         * @todo this function looks like it been botched somehow in a refactoring
         */
        svc.setWindowLocation = function (Location, Scope, QueryDelimiter) {
            var url = "";
            if (Scope.view) {
                url = Scope.view;
            }
            if (Scope.query) {
                url = url + "/" + QueryDelimiter + Scope.query.getHash();
            }
            // set the hash
            console.log("Setting hash as: " + url);
            window.location.hash = url;
            // var loc = location.hash(url);
        };

        /**
         * Update the search results for all queries.
         */
        svc.handleFacetListUpdate = function () {
            // reset messages
            svc.error = null;
            svc.message = null;
            // update queries
            for (var key in svc.queries) {
                if (svc.queries.hasOwnProperty(key)) {
                    svc.updateQuery(key);
                }
            }
        };

        /**
         * Update the named query.
         * @param Name Query name
         */
        svc.updateQuery = function (Name) {
            // reset messages
            svc.error = null;
            svc.message = null;
            // get the named query
            var query = svc.queries[Name];
            if (query) {
                // fetch the search results
                var url = query.getUrl();
                console.log("GET " + Name + ": " + url);
                $http.get(url).
                    success(function (data) {
                        query.setHighlighting(data.highlighting);
                        if (data.hasOwnProperty('facet_counts')) {
                            query.setFacetCounts(data.facet_counts);
                        }
                        query.setResponse(data.response);
                        query.setResponseHeader(data.responseHeader);
                        $rootScope.$broadcast(Name);
                    }).error(function (data, status, headers, config) {
                        svc.error = "Could not get search results from server. Server responded with status code " + status + ".";
                        var response = {};
                        response['numFound'] = 0;
                        response['start'] = 0;
                        response['docs'] = [];
                        query.setFacetCounts([]);
                        query.setHighlighting({});
                        query.setResponse(response);
                        query.setResponseHeader({});
                        $rootScope.$broadcast(Name);
                    });
            }
        };

        /**
         * Determine if the current location URL has a query.
         * @param Url Fragment portion of url
         * @param Delimiter Query delimiter
         */
        svc.windowLocationHasQuery = function (Url, Delimiter) {
            var i = Url.indexOf(Delimiter);
            return i != -1;
        };

        ///////////////////////////////////////////////////////////////////////

        // initialize
        svc.init(CONSTANTS, $http, $rootScope);

        // return the service instance
        return svc;

    }]).value('version','0.1'); // SolrSearchService
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/**
 * Utility functions used across the application.
 */
angular.module('Utils',[]).factory('Utils',[function() {

    // the service
    var svc = {};

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Convert month index to common name.
     * @param Index
     */
    svc.convertMonthIndexToName = function(Index) {
        var months = {
            '01':"January",
            '02':"February",
            '03':"March",
            '04':"April",
            '05':"May",
            '06':"June",
            '07':"July",
            '08':"August",
            '09':"September",
            '10':"October",
            '11':"November",
            '12':"December"
        };
        return months[Index];
    };

    /**
     * Format date to convert it to the form MMM DD, YYYY.
     * @param Date
     */
    svc.formatDate = function(DateField) {
        if (DateField) {
            var i = DateField.indexOf("T");
            if (i) {
                var d = DateField.substring(0,i);
                var parts = d.split("-");
                var year = parts[0];
                var month = svc.convertMonthIndexToName(parts[1]);
                var day = svc.trimLeadingZero(parts[2]);
                // return month + " " + day + ", " + year;
                return month + ", " + year;

            }
        }
        return '';
    };

    /**
     * Determine if the string s1 starts with the string s2
     * @param s1 String 1
     * @param s2 String 2
     */
    svc.startsWith = function(s1,s2) {
        if (s1 && s2) {
            return s1.slice(0, s2.length) == s2;
        }
        return false;
    };

    /**
     * Trim starting and ending spaces from the string.
     * @param Val
     */
    svc.trim = function(Val) {
        return Val.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };

    /**
     * Remove leading zero from a string.
     * @param Val
     */
    svc.trimLeadingZero = function(Val) {
        if (Val && Val.length > 0) {
            if (Val.substring(0,1) == '0' && Val.length > 1) {
                Val = Val.substring(1,1);
            }
        }
        return Val;
    };

    /**
     * Truncate the field to the specified length.
     * @param Field
     * @param Length
     * @return {*}
     */
    svc.truncate = function(Field,Length) {
        if (Field && Length && Field.length > Length) {
            // remove start/end whitespace
            Field = svc.trim(Field);
            // truncate the document to the specified length
            Field = Field.substring(0,Math.min(Length,Field.length));
            // find the last word and truncate after that
            var i = Field.lastIndexOf(" ");
            if (i != -1) {
                Field = Field.substring(0,i) + " ...";
            }
        }
        return Field;
    };

    /**
     * Truncate the document field to the specified length.
     * @param Document Document
     * @param FieldName Field name to truncate
     * @param Length Maximum field length
     */
    svc.truncateField = function(Document,FieldName,Length) {
        if (Document && Document[FieldName]) {
            if (Document[FieldName] instanceof Array) {
                Document[FieldName] = Document[FieldName][0];
            }
            if (Document[FieldName].length > Length) {
                // remove start/end whitespace
                Document[FieldName] = svc.trim(Document[FieldName]);
                // truncate the document to the specified length
                Document[FieldName] = Document[FieldName].substring(0,Math.min(Length,Document[FieldName].length));
                // find the last word and truncate after that
                var i = Document[FieldName].lastIndexOf(" ");
                if (i != -1) {
                    Document[FieldName] = Document[FieldName].substring(0,i) + " ...";
                }
            }
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    // return the service instance
    return svc;

}]);/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */

'use strict';

/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Maintains a selection set and notifies listeners when changes occur to the
 * set.
 * @param $scope Controller scope
 * @param $rootScope Root scope
 * @todo consider having a default and named selection sets
 */
angular.module('SelectionSetService',[]).factory('SelectionSetService', ['$rootScope', function ($rootScope) {

    // parameters
    var svc = {};
    svc.documents = {};             // selected documents list
    svc.multipleSelection = false;  // allow multiple selection

    ///////////////////////////////////////////////////////////////////////////

    // Array Remove - By John Resig (MIT Licensed)
    Array.prototype.remove = function(from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add document to the selection list.
     * @param Key Document identifier
     * @param Doc Optional document
     */
    svc.add = function(Key,Doc) {
        if (!svc.multipleSelection) {
            svc.documents = {};
        }
        svc.documents[Key] = (Doc);
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Clear the selection list.
     */
    svc.clear = function() {
        svc.documents = {};
        $rootScope.$broadcast("selectionSetUpdate");
    };

    /**
     * Get the document identified by the key.
     * @param Key Document identifier
     * @return {*}
     */
    svc.get = function(Key) {
        return svc.documents[Key];
    };

    /**
     * Get the selection set.
     * @return {*}
     */
    svc.getSelectionSet = function() {
        return svc.documents;
    };

    /**
     * Remove the document from the selection list.
     * @param Key Document identifier
     */
    svc.remove = function(Key) {
        delete svc.documents[Key];
        $rootScope.$broadcast("selectionSetUpdate");
    };

    // return the service instance
    return svc;

}]);
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */

'use strict';

/*---------------------------------------------------------------------------*/
/* Classes                                                                   */

/**
 * Solr search facet.
 * @class Solr search facet
 * @param Field Field name
 * @param Value Field value
 * @see http://wiki.apache.org/solr/SimpleFacetParameters#rangefaceting
 */
function SolrFacet(Field, Value) {

    var self = this;

    self.field = Field;     // field name
    self.value = Value;     // field value
    self.options = {};      // additional filtering options
    //this.options['f'+this.field+'facet.mincount'] = 1;  // minimum item count required for result listing

    /**
     * Get option value.
     * @param Name Option name
     * @returns {String}
     */
    self.getOption = function(Name) {
        if (Name == 'q') {

        } else if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the query Url fragment for this facet.
     * @returns {String}
     */
    self.getUrlFragment = function() {
        // this is used to delimit the start of the facet query in the URL and aid parsing
        var query = '&&'; // delimiter should come from the CONSTANTS field
        query += '&fq=' + self.field + ':(' + self.replaceSpaces(self.value) + ")";
        for (var option in self.options) {
            if (self.options.hasOwnProperty(option)) {
                query = query + "&" + option + "=" + self.options[option];
            }
        }
        return query;
    };

    /**
     * Replace all spaces in the facet value with *.
     * @param Str
     */
    self.replaceSpaces  = function(Str) {
        return Str.replace(' ','?');
    };

    /**
     * Set option.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        self.options[Name] = Value;
    };

    /**
     * Set facet properties from Uri parameters.
     * @param Query
     */
    self.setOptionsFromQuery = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                if (name == 'fq') {
                    if (parts.length == 2) {
                        var subparts = parts[1].split(':');
                        self.field = subparts[0];
                        self.value = subparts[1];
                    }
                } else {
                    (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
                }
            }
        }
    };

} // end SolrFacet

/**
 * A Solr search query. The query is composed of four parts: user query, query
 * parameters, options, and facets. Each part of the query can be managed
 * individually.
 * @param Url URL to Solr host
 * @param Core Name of Solr core
 */
function SolrQuery(Url, Core) {

    var self = this;

    self.facets = {};               // query facets
    self.facet_counts = {};         // facet counts
    self.highlighting = {};         // query response highlighting
    self.options = {};              // query options
    self.response = {};             // query response
    self.responseHeader = {};       // response header
    self.query = "*:*";             // the user query
    self.queryParameters = {};      // query parameters
    self.url = Url + "/" + Core + "/select?";   // URL for the Solr core

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Add facet constraint.
     * @param Name
     * @param Facet
     */
    self.addFacet = function(Name, Facet) {
        self.facets[Name] = Facet;
    };

    /**
     * Get the facet counts.
     * @returns {Int} Solr facet counts.
     */
    self.getFacetCounts = function() {
        return self.facet_counts;
    };

    /**
     * Get the facet dictionary.
     * @returns {Array}
     */
    self.getFacets = function() {
        return self.facets;
    };

    /**
     * Get the hash portion of the query URL. We UrlEncode the search terms
     * rather than the entire fragment because it comes out in a much more
     * readable form but is still valid.
     * @returns {String} Hash portion of URL
     */
    self.getHash = function() {
        var query = '';
        // append query
        query += "q=" + self.query;
        for (var key in self.queryParameters) {
            query += self.queryParameters[key];
        }
        // append options
        for (var key in self.options) {
            var val = self.options[key];
            query += "&" + key + "=" + val;
        }
        // append faceting parameters
        for (var key in self.facets) {
            var facet = self.facets[key];
            query += facet.getUrlFragment();
        }
        // return results
        return query;
    };

    /**
     * Get option value.
     * @param Name Option name
     * @returns {String} undefined value or undefined if not found.
     */
    self.getOption = function(Name) {
        if (self.options[Name]) {
            return self.options[Name];
        }
        return undefined;
    };

    /**
     * Get the fully specified Solr query URL.
     */
    self.getUrl = function() {
        return self.url + encodeURI(self.getHash());
    };

    /**
     * Get the user query value.
     * @return {String}
     */
    self.getUserQuery = function() {
        return self.query;
    };

    /**
     * Get the user query parameters.
     * @return {Array}
     */
    self.getUserQueryParameters = function() {
        return self.queryParameters;
    };

    /**
     * Remove facet by key.
     * @param Key Facet key
     */
    self.removeFacet = function(Key) {
        delete self.facets[Key];
    };

    /**
     * Remove a query option by name,
     * @param Name
     */
    self.removeOption = function(Name) {
        delete self.options[Name];
    };

    /**
     * Set the facet counts field value.
     * @param FacetCounts
     */
    self.setFacetCounts = function(FacetCounts) {
        self.facet_counts = FacetCounts;
    };

    /**
     * Set the highlighting field value.
     * @param Highlighting
     */
    self.setHighlighting = function(Highlighting) {
        self.highlighting = Highlighting;
    };

    /**
     * Set option. User queries should be set using the setUserQuery() and setUserQueryOption() functions.
     * @param Name
     * @param Value
     */
    self.setOption = function(Name,Value) {
        // query option
        if (Name === "fq") {
            var fq = self.getOption(Name);
            if (fq != undefined && fq == "") {
                self.options[Name] = fq + " +" + Value;
            } else {
                self.options[Name] = "+" + Value;
            }
        } else {
            self.options[Name] = Value;
        }
    };

    /**
     * Build a SolrQuery from the hash portion of the current window location.
     * @param Query Query or hash portion of the window location
     * @todo this function is completely out of date and needs to be fixed
     */
    self.setQueryFromHash = function(Query) {
        var elements = Query.split('&');
        for (var i=0;i<elements.length;i++) {
            var element = elements[i];
            if (element != null && element != '') {
                var parts = element.split('=');
                var name = parts[0].replace('&','');
                (parts.length==2) ? self.setOption(name,decodeURI(parts[1])) : self.setOption(name,'');
            }
        }
    };

    /**
     * Set a query parameter.
     * @param Name
     * @param Val
     */
    self.setQueryParameter = function(Name, Val) {
        self.queryParameters[Name] = Val;
    };

    /**
     * Set the user query parameters.
     * @param Parameters Dictionary of parameters.
     */
    self.setQueryParameters = function(Parameters) {
        self.queryParameters = Parameters;
    };

    /**
     * Set the response field value.
     * @param Response
     */
    self.setResponse = function(Response) {
        self.response = Response;
    };

    /**
     * Set the response field value.
     * @param Header
     */
    self.setResponseHeader = function(Header) {
        self.responseHeader = Header;
    };

    /**
     * Set the user query.
     * @param Query User query
     */
    self.setUserQuery = function(Query) {
        self.query = Query;
    };

} // end SolrQuery


/*---------------------------------------------------------------------------*/
/* Service                                                                   */

/**
 * Executes a document search against an Apache Solr/Lucence search index.
 * Provides shared search configuration for multiple controllers in the form
 * of named queries, and a subscriber service to listen for changes on the
 * named query.
 * @param $rootScope Application root scope
 * @param $http HTTP service
 * @param $location Location service
 * @param CONSTANTS Application constants
 */
angular.module('SolrSearchService',[]).factory('SolrSearchService',['$rootScope','$http','$location','CONSTANTS', function($rootScope,$http,$location,CONSTANTS) {

        // parameters
        var defaultQueryName = "defaultQuery";  // the name of the default query
        var svc = {};                           // the service instance
        svc.error = undefined;                  // error message
        svc.message = undefined;                // info or warning message to user
        svc.queries = {};                       // named search queries

        ///////////////////////////////////////////////////////////////////////////

        /**
         * Create a new facet.
         * @param FieldName
         * @param Value
         * @return {Facet}
         */
        svc.createFacet = function(FieldName,Value) {
            return new SolrFacet(FieldName,Value);
        };

        /**
         * Build a default query object.
         */
        svc.createQuery = function () {
            var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
            query.setOption("rows", CONSTANTS.ITEMS_PER_PAGE);
            query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
            query.setOption("wt", "json");
            query.setUserQuery(CONSTANTS.DEFAULT_QUERY);
            return query;
        };

        /**
         * Parse the current query URL to determine the initial view, search query and
         * facet parameters. Valid view values are list, map, graph.
         * @param Url Current window location
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody&abc=xyz&zyx=abc&&fq=something:value&abc=xyz=xyz=abc
         * http://dev02.internal:8080/eac-search/#/view/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json&&fq=identity_entityType:corporateBody
         * http://example.com/#/[view]/?&explainOther=&fl=uri%2Ctitle%2Ctext&hl.fl=&indent=on&q=*%3A*&rows=10&start=0&version=2.2&wt=json
         */
        svc.getCurrentQuery = function (Url) {
            // get the query portion of the path
            var i = Url.indexOf(CONSTANTS.QUERY_DELIMITER); // @todo not sure if this is correct anymore
            if (i != -1) {
                // get the view component of the URL fragment
                var view = Url.substring(1, i);
                view = view.replace(new RegExp('/', 'g'), '');
                // get the query component of the URL fragment
                var frag = Url.substring(i + 1);
                var elements = frag.split(CONSTANTS.FACET_DELIMITER);
                if (elements.length > 0) {
                    // the first element is the query
                    var query = new SolrQuery(CONSTANTS.SOLR_BASE, CONSTANTS.SOLR_CORE);
                    query.setOption("fl", CONSTANTS.DEFAULT_FIELDS);
                    query.setOption("hl.fl", svc.highlightingParameters);
                    query.setOption("indent", "on");
                    query.setOption("rows", svc.itemsPerPage);
                    query.setOption("start", 0);
                    query.setOption("version", CONSTANTS.SOLR_VERSION);
                    query.setOption("wt", "json");
                    query.setQueryFromHash(elements[0]);
                    query.setQuery("q", CONSTANTS.DEFAULT_QUERY);
                    // subsequent elements are facets
                    for (var j = 1; j < elements.length; j++) {
                        var q = elements[j];
                        var facet = new SolrFacet();
                        facet.setOptionsFromQuery(q);
                        // add facet
                        query.facets.push(facet);
                    }
                }
                // return query
                return query;
            }
        };

        /**
         * Get the query object. Where a name is not provided, the default query is returned.
         * @param Name Query name
         * @return The query object or undefined if not found.
         */
        svc.getQuery = function(Name) {
            if (Name) {
                return svc.queries[Name];
            } else {
                return svc.queries[defaultQueryName];
            }
        };

        /**
         * Get the query response.
         * @param Name Query name
         */
        svc.getResponse = function(Name) {
            if (Name) {
                return svc.queries[Name].response;
            } else {
                return svc.queries[defaultQueryName].response;
            }
        };

        /**
         * Initialize the controller. If there is a search query specified in the
         * URL when the controller initializes then use that as the initial query,
         * otherwise use the default.
         */
        svc.init = function(CONSTANTS, $http, $rootScope) {
            if (svc.windowLocationHasQuery(window.location.hash, CONSTANTS.QUERY_DELIMITER)) {
                svc.queries[defaultQueryName] = svc.getCurrentQuery($scope, window.location.hash, CONSTANTS);
            } else {
                svc.queries[defaultQueryName] = svc.createQuery(CONSTANTS, $http, $rootScope);
            }
        };

        /**
         * Determine if the query string is valid.
         * @param Val
         * @todo Develop this further
         */
        svc.isValidQuery = function(Val) {
            for (var i = 0; i < Val.length; i++) {
                if (Val[i] != null && Val[i] != ' ') {
                    return true;
                }
            }
            return false;
        };

        /**
         * Set the starting document in the named query.
         * @param Start The index of the starting document.
         * @param Query Query name
         */
        svc.setPage = function(Start,Query) {
            if (Query) {
                svc.queries[Query].setOption("start",Start);
            } else {
                svc.queries[defaultQueryName].setOption("start",Start);
            }
        };

        /**
         * Set the named query. If a name is not specified, the default query is set.
         * @param Query Query object
         * @param Name Query name
         */
        svc.setQuery = function(Query, Name) {
            if (Name) {
                svc.queries[Name] = Query;
            } else {
                svc.queries[defaultQueryName] = Query;
            }
        };

        /**
         * Set the fragment portion of the window location to reflect the current search query.
         * @param Location
         * @param Scope
         * @param QueryDelimiter
         * @todo this function looks like it been botched somehow in a refactoring
         */
        svc.setWindowLocation = function(Location, Scope, QueryDelimiter) {
            var url = "";
            if (Scope.view) {
                url = Scope.view;
            }
            if (Scope.query) {
                url = url + "/" + QueryDelimiter + Scope.query.getHash();
            }
            // set the hash
            console.log("Setting hash as: " + url);
            window.location.hash = url;
            // var loc = location.hash(url);
        };

        /**
         * Update the search results for all queries.
         */
        svc.handleFacetListUpdate = function () {
            // reset messages
            svc.error = null;
            svc.message = null;
            // update queries
            for (var key in svc.queries) {
                if (svc.queries.hasOwnProperty(key)) {
                    svc.updateQuery(key);
                }
            }
        };

        /**
         * Update the named query.
         * @param Name Query name
         */
        svc.updateQuery = function(Name) {
            // reset messages
            svc.error = null;
            svc.message = null;
            // get the named query
            var query = svc.queries[Name];
            if (query) {
                // fetch the search results
                var url = query.getUrl();
                console.log("GET " + Name + ": " + url);
                $http.get(url).
                    success(function (data) {
                        query.setHighlighting(data.highlighting);
                        if (data.hasOwnProperty('facet_counts')) {
                            query.setFacetCounts(data.facet_counts);
                        }
                        query.setResponse(data.response);
                        query.setResponseHeader(data.responseHeader);
                        $rootScope.$broadcast(Name);
                    }).error(function (data, status, headers, config) {
                        svc.error = "Could not get search results from server. Server responded with status code " + status + ".";
                        var response = {};
                        response['numFound'] = 0;
                        response['start'] = 0;
                        response['docs'] = [];
                        query.setFacetCounts([]);
                        query.setHighlighting({});
                        query.setResponse(response);
                        query.setResponseHeader({});
                        $rootScope.$broadcast(Name);
                    });
            }
        };

        /**
         * Determine if the current location URL has a query.
         * @param Url Fragment portion of url
         * @param Delimiter Query delimiter
         */
        svc.windowLocationHasQuery = function(Url, Delimiter) {
            var i = Url.indexOf(Delimiter);
            return i != -1;
        };

        ///////////////////////////////////////////////////////////////////////

        // initialize
        svc.init(CONSTANTS, $http, $rootScope);

        // return the service instance
        return svc;

    }]).value('version','0.1'); // SolrSearchService
/**
 * This file is subject to the terms and conditions defined in the
 * 'LICENSE.txt' file, which is part of this source code package.
 */
'use strict';

/**
 * Utility functions used across the application.
 */
angular.module('Utils',[]).factory('Utils',[function() {

    // the service
    var svc = {};

    ///////////////////////////////////////////////////////////////////////////

    /**
     * Determine if two arrays are equal.
     * @param A Array
     * @param B Array
     * @return {Boolean} True if arrays are equal, False otherwise.
     */
    svc.arraysAreEqual = function(A, B) {
        return (A.join('') == B.join(''));
    };

    /**
     * Convert month index to common name.
     * @param Index
     */
    svc.convertMonthIndexToName = function(Index) {
        var months = {
            '01':"January",
            '02':"February",
            '03':"March",
            '04':"April",
            '05':"May",
            '06':"June",
            '07':"July",
            '08':"August",
            '09':"September",
            '10':"October",
            '11':"November",
            '12':"December"
        };
        return months[Index];
    };

    /**
     * Format date to convert it to the form MMM DD, YYYY.
     * @param Date
     */
    svc.formatDate = function(DateField) {
        if (DateField) {
            var i = DateField.indexOf("T");
            if (i) {
                var d = DateField.substring(0,i);
                var parts = d.split("-");
                var year = parts[0];
                var month = svc.convertMonthIndexToName(parts[1]);
                var day = svc.trimLeadingZero(parts[2]);
                // return month + " " + day + ", " + year;
                return month + ", " + year;

            }
        }
        return '';
    };

    /**
     * Determine if two objects are equal.
     * @param A Object
     * @param B Object
     * @return {Boolean}
     * @see http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
     */
    svc.objectsAreEqual = function(A, B) {
        // if both x and y are null or undefined and exactly the same
        if ( A === B ) return true;
        // if they are not strictly equal, they both need to be Objects
        if ( ! ( A instanceof Object ) || ! ( B instanceof Object ) ) return false;
        // they must have the exact same prototype chain, the closest we can do is
        // test there constructor.
        if ( A.constructor !== B.constructor ) return false;
        for ( var p in A ) {
            // other properties were tested using x.constructor === y.constructor
            if ( ! A.hasOwnProperty( p ) ) continue;
            // allows to compare x[ p ] and y[ p ] when set to undefined
            if ( ! B.hasOwnProperty( p ) ) return false;
            // if they have the same strict value or identity then they are equal
            if ( A[ p ] === B[ p ] ) continue;
            // Numbers, Strings, Functions, Booleans must be strictly equal
            if ( typeof( A[ p ] ) !== "object" ) return false;
            // Objects and Arrays must be tested recursively
            if ( ! Object.equals( A[ p ],  B[ p ] ) ) return false;
        }
        for ( p in B ) {
            // allows x[ p ] to be set to undefined
            if ( B.hasOwnProperty( p ) && ! A.hasOwnProperty( p ) ) return false;
        }
        return true;
    };

    /**
     * Determine if the string s1 starts with the string s2
     * @param s1 String 1
     * @param s2 String 2
     */
    svc.startsWith = function(s1,s2) {
        if (s1 && s2) {
            return s1.slice(0, s2.length) == s2;
        }
        return false;
    };

    /**
     * Trim starting and ending spaces from the string.
     * @param Val
     */
    svc.trim = function(Val) {
        return Val.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };

    /**
     * Remove leading zero from a string.
     * @param Val
     */
    svc.trimLeadingZero = function(Val) {
        if (Val && Val.length > 0) {
            if (Val.substring(0,1) == '0' && Val.length > 1) {
                Val = Val.substring(1,1);
            }
        }
        return Val;
    };

    /**
     * Truncate the field to the specified length.
     * @param Field
     * @param Length
     * @return {*}
     */
    svc.truncate = function(Field,Length) {
        if (Field && Length && Field.length > Length) {
            // remove start/end whitespace
            Field = svc.trim(Field);
            // truncate the document to the specified length
            Field = Field.substring(0,Math.min(Length,Field.length));
            // find the last word and truncate after that
            var i = Field.lastIndexOf(" ");
            if (i != -1) {
                Field = Field.substring(0,i) + " ...";
            }
        }
        return Field;
    };

    /**
     * Truncate the document field to the specified length.
     * @param Document Document
     * @param FieldName Field name to truncate
     * @param Length Maximum field length
     */
    svc.truncateField = function(Document,FieldName,Length) {
        if (Document && Document[FieldName]) {
            if (Document[FieldName] instanceof Array) {
                Document[FieldName] = Document[FieldName][0];
            }
            if (Document[FieldName].length > Length) {
                // remove start/end whitespace
                Document[FieldName] = svc.trim(Document[FieldName]);
                // truncate the document to the specified length
                Document[FieldName] = Document[FieldName].substring(0,Math.min(Length,Document[FieldName].length));
                // find the last word and truncate after that
                var i = Document[FieldName].lastIndexOf(" ");
                if (i != -1) {
                    Document[FieldName] = Document[FieldName].substring(0,i) + " ...";
                }
            }
        }
    };

    ///////////////////////////////////////////////////////////////////////////

    // return the service instance
    return svc;

}]);