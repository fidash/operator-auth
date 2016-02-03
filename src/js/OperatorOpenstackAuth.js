/*global MashupPlatform,OStackAuth*/
/*exported OperatorOpenstackAuth*/
var OperatorOpenstackAuth = (function () {
    "use strict";

    /*********************************************************
     ************************CONSTANTS*************************
     *********************************************************/

    /*********************************************************
     ************************VARIABLES*************************
     *********************************************************/

    /********************************************************/
    /**********************CONSTRUCTOR***********************/
    /********************************************************/

    var OperatorOpenstackAuth = function OperatorOpenstackAuth () {
        this.CLOUD_URL = MashupPlatform.prefs.get("cloudurl");
        this.IDM_URL = MashupPlatform.prefs.get("idmurl");

        MashupPlatform.prefs.registerCallback(function (new_preferences) {
            if ("cloudurl" in new_preferences) {
                this.CLOUD_URL = new_preferences.cloudurl;
            }
            if ("idmurl" in new_preferences) {
                this.IDM_URL = new_preferences.idmurl;
            }
        }.bind(this));

        authenticate(this.CLOUD_URL);
    };

    /*********************************************************
     **************************PRIVATE*************************
     *********************************************************/

    var STOP = false;

    var versionHigh = function versionHigh(arg) {
        return MashupPlatform.context.get("version") >= "0.8.0"; // Magic of JS types cohertion
    };

    var sendAuthData = function sendAuthData(data) {
        MashupPlatform.wiring.pushEvent("authentication", data);
    };

    var proxySendData = function proxySendData(data, register) {
        if (STOP) {
            STOP = false;
            return;
        }

        if (!!data) { // if data present
            sendAuthData(data);

            if (!versionHigh()) { // If the version is low, let's send the data every 10 seconds
                setTimeout(proxySendData.bind(this, data, register), 10000);
            } else if (register) { // if it's higher than 0.8 send the data only when the wiring changes
                MashupPlatform.wiring.registerStatusCallback(proxySendData.bind(this, data, false));
            }
        }
    };

    var OK = function OK(params) {
        var token = params.token;
        var response = params.response;
        var body = JSON.parse(response.responseText);
        // Temporal change to fix catalog name
        body.token.serviceCatalog = body.token.catalog;

        var sendJSON = {
            token: token,
            body: body
        };

        var data = JSON.stringify(sendJSON);
        // this.data = JSON.stringify(sendJSON);

        STOP = false;

        proxySendData(data, true);
    };

    var ERROR = function ERROR(url, response) {
        var error = JSON.parse(response.responseText).error;
        var message = error.code + " " + error.title + " " + error.message;
        MashupPlatform.operator.log("Error authenticating: " + message);

        STOP = true;

        setTimeout(authenticate.bind(this, url), 10000); // Let's wait 10 seconds if failed
    };

    var authenticate = function authenticate(url) {
        OStackAuth.getTokenAndParams(url)
            .then(OK)
            .catch(ERROR.bind(this, url)); // partially apply the URL
    };

    // var update = function update(url) {
    //     // How to do it?
    // };

    /****************************************/
    /************AUXILIAR FUNCTIONS**********/
    /****************************************/

    /* test-code */
    OperatorOpenstackAuth.prototype = {
    };

    /* end-test-code */

    return OperatorOpenstackAuth;

})();
