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

    describe("Test OperatorOpenstackAuth", function () {
        var widget;
        beforeAll(function () {
            window.MashupPlatform = new MockMP.MockMP();
        });

        beforeEach(function () {
            MashupPlatform.reset();
            widget = new OperatorOpenstackAuth();
        });

        it("Dummy test", function () {
            expect(true).toBeTruthy();
        });

    });
})();
