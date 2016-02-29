/*global $, MashupPlatform, MockMP, OperatorOpenstackAuth, beforeAll, afterAll, beforeEach*/
(function () {
    "use strict";

    jasmine.getFixtures().fixturesPath = 'src/test/fixtures/';

    var dependencyList = [
        'script',
        'div',
    ];

    var clearDocument = function clearDocument() {
        $('body > *:not(' + dependencyList.join(', ') + ')').remove();
    };

    var okTokenf = function okTokenf(body) {
        var tok = "TOKEN";
        var bodyJ = JSON.parse(body);

        if (bodyJ && bodyJ.auth && bodyJ.auth.scope && bodyJ.auth.scope.project) {
            tok = "TOKENPROJ";
        }
        return {
            getHeader: function(x) {
                return tok;
            },
            response: {
                token: {
                    catalog: ["CATALOG"]
                }
            },
            responseText: JSON.stringify({
                token: {
                    catalog: ["CATALOG"]
                }
            })
        };
    };

    var okRole = {
        role_assignments: [{
            scope: {
                project: {
                    id: "projectID"
                }
            }
        }]
    };

    var error403 = {
        responseText: JSON.stringify({
            error: {
                code: 403,
                title: "No auth",
                message: "Error uthenticating"
            }
        })
    };

    describe("Test OperatorOpenstackAuth", function () {
        var widget;
        beforeAll(function () {
            window.MashupPlatform = new MockMP({
                type: "operator",
		outputs: ["authentication"],
		prefs: {
		    cloudurl: "/cloud",
		    idmurl: "/idm"
		},
                context: {
                    username: "test"
                }
	    });
        });

        beforeEach(function () {
            MashupPlatform.reset();

	    MashupPlatform.http.addAnswer("POST", "/cloud/keystone/v3/auth/tokens", 200, "", okTokenf);
            MashupPlatform.http.addAnswer("GET", "/cloud/keystone/v3/role_assignments?user.id=test", 200, {
                response: okRole,
                responseText: JSON.stringify(okRole)
            });
            MashupPlatform.http.addAnswer("GET", "/cloud/keystone/v3/projects/projectID", 200, {responseText: JSON.stringify({
                project: {
                    is_cloud_project: true
                }
            })});

            widget = new OperatorOpenstackAuth();
        });

	it("Preferences", function() {
	    expect(widget.CLOUD_URL).toEqual("/cloud");
	    expect(widget.IDM_URL).toEqual("/idm");
	});

        it('should change preferences', function() {
            MashupPlatform.prefs.simulate({});

            expect(widget.CLOUD_URL).toEqual("/cloud");
            expect(widget.IDM_URL).toEqual("/idm");

            MashupPlatform.prefs.simulate({
                cloudurl: "/newcloud",
                idmurl: "/newidm"
            });

            expect(widget.CLOUD_URL).toEqual("/newcloud");
            expect(widget.IDM_URL).toEqual("/newidm");

            MashupPlatform.prefs.resetData();

            MashupPlatform.prefs.simulate({
                cloudurl: "/cloud",
                idmurl: "/idm"
            });

        });

	it("Wait", function(done) {
	    setTimeout(function() {
                expect(MashupPlatform.wiring.pushEvent).toHaveBeenCalled();
                done();
            }, 0); // Trick to release the process and let the background process (Promises) work
	});

        it('should test', function(done) {
            MashupPlatform.reset();
            MashupPlatform.http.addAnswer("POST", "/cloud/keystone/v3/auth/tokens", 403, error403);

            widget = new OperatorOpenstackAuth();

            setTimeout(function() {
                expect(MashupPlatform.operator.log).toHaveBeenCalledWith("Error authenticating: 403 No auth Error uthenticating");
                done();
            }, 0);
        });

    });
})();
