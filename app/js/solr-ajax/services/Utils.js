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