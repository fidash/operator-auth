var OStackAuth = (function () {
    "use strict";
    var CLOUD_URL = "https://cloud.lab.fiware.org";
    var IDM_URL = "https://account.lab.fiware.org";
    var SYNC_URL = "http://private-anon-7cf62f491-glancesync.apiary-mock.com";

    // buildOps("POST", {token: "token"})
    var buildOps = function buildOps(method, reqops) {
        "use strict";
        var ops = {
            method: method
        };

        if (reqops.token) {
            ops.requestHeaders = {
                "X-Auth-Token": reqops.token,
                "Accept": "application/json"
            };
        }

        if (reqops.fiware) {
            ops.requestHeaders = {
                "X-FI-WARE-OAuth-Token": "true",
                "X-FI-WARE-OAuth-Token-Body-Pattern": reqops.fiware,
                "Accept": "application/json"
            };
        }

        if (reqops.body) {
            ops.contentType = "application/json";
            ops.postBody = JSON.stringify(reqops.body);
        }

        return ops;
    };

    // Need Promise
    var requestPromise = function requestPromise(url, options) {
        options = options || {};
        return new Promise(function (resolve, reject) {
            options.onSuccess = resolve;
            options.onFailure = reject;
            MashupPlatform.http.makeRequest(url, options);
        });
    };

    // Cloud URL
    var getOpenStackToken = function getOpenStackToken(url) {
        "use strict";
        var postBody = {
            auth: {
                identity: {
                    methods: ["oauth2"],
                    oauth2: {
                        "access_token_id": "%fiware_token%"
                    }
                }
            }
        };

        var options = buildOps("POST", { fiware: "%fiware_token%", body: postBody });

        return requestPromise(url + "/keystone/v3/auth/tokens", options);
    };

    var getOpenStackProjectToken = function getOpenStackProjectToken(url, projectId) {
        "use strict";
        var postBody = {
            auth: {
                identity: {
                    methods: ["oauth2"],
                    oauth2: {
                        "access_token_id": "%fiware_token%"
                    }
                },
                scope: {
                    project: {
                        id: projectId
                    }
                }
            }
        };

        var options = buildOps("POST", { fiware: "%fiware_token%", body: postBody });

        return requestPromise(url + "/keystone/v3/auth/tokens", options);
    };

    var isAdmin = function isAdmin(roles) {
        return roles.filter(function (x) {
            return x.name === "InfrastructureOwner";
        }).length > 0;
    };

    // IDM URL
    var getAdminRegions = function getAdminRegions(url) {
        "use strict";
        var options = buildOps("GET", { fiware: "access_token" });

        return requestPromise(url + "/user", options).then(function (response) {
            return JSON.parse(response.responseText).organizations.filter(function (x) {
                return isAdmin(x.roles);
            }).map(function (x) {
                return x.replace("FIDASH", "").trim();
            });
        });
    };

    // Segundo paso de Auth?
    var getProjects = function getProjects(url, response) {
        "use strict";
        var generalToken = response.getHeader('x-subject-token');
        var username = MashupPlatform.context.get('username');
        var options = buildOps("GET", { token: generalToken });

        return requestPromise(url + "/keystone/v3/role_assignments?user.id=" + username, options).then(function (resp) {
            var responseBody = JSON.parse(resp.responseText);

            return Promise.all(responseBody.role_assignments.map(function (role) {
                if (role.scope.project) {
                    return getProjectPermissions(url, role.scope.project.id, generalToken).then(function (p) {
                        return { ok: true, data: p };
                    });
                }
                return Promise.resolve({ ok: false });
            })).then(function (l) {
                return l.filter(function (x) {
                    return x.ok && x.data !== "";
                }).map(function (x) {
                    return x.data;
                });
            });
        });
    };

    // Cloud URL
    var getProjectPermissions = function getProjectPermissions(url, project, token) {
        "use strict";
        var options = buildOps("GET", { token: token });

        return requestPromise(url + "/keystone/v3/projects/" + project, options).then(function (resp) {
            var responseBody = JSON.parse(resp.responseText);
            if (responseBody.project.is_cloud_project) {
                return getOpenStackProjectToken(url, project).then(function (token) {
                    return { token: token.getHeader('x-subject-token'), response: token };
                });
            } else {
                return Promise.resolve("");
            }
        });
    };

    // Cloud URL
    var getImagesRegion = function getImagesRegion(url, region, token) {
        "use strict";
        return $.ajax({
            url: url + "/" + region + "/image/v1/images/detail",
            headers: {
                "X-Auth-Token": token,
                "Accept": "application/json"
            }
        }).promise();

        // const options = buildOps("GET", {token: token});

        // return requestPromise(`${url}/${region}/image/v1/images/detail`, options);
    };

    // Sync URL
    var sync = function sync(url, region, token) {
        "use strict";
        var options = buildOps("POST", { token: token });

        return requestPromise(url + "/regions/" + region, options);
    };

    // Nova
    // CLOUD URL

    var getProject = function getProject(url) {
        return getOpenStackToken(url).then(asJSON).then(function (jreq) {
            return jreq.token.project;
        });
    };

    var getFlavorList = function getFlavorList(url, region, projectid, token, detailed) {
        var detailS = detailed ? "/detail" : "";
        var options = buildOps("GET", { token: token });

        return requestPromise(url + "/" + region + "/compute/v2/" + projectid + "/flavors" + detailS, options);
    };

    // Neutron

    var getNetworksList = function getNetworksList(url, region, token) {
        var options = buildOps("GET", { token: token });

        return requestPromise(url + "/" + region + "/network/v2.0/networks", options);
    };

    var createServer = function createServer(url, region, projectid, token, ops) {
        var data = {
            "server": {
                "name": ops.name,
                "imageRef": ops.imageRef,
                "flavorRef": ops.flavorRef
                //"nics": nics
            }
        };

        if (ops.metadata) {
            data.server.metadata = ops.metadata;
        }

        var urlPost = ops.block_device_mapping !== undefined ? "/os-volumes_boot" : "/servers";

        if (ops.key_name !== undefined) {
            data.server.key_name = ops.key_name;
        }

        if (ops.user_data !== undefined) {
            data.server.user_data = btoa(ops.user_data);
        }

        if (ops.block_device_mapping !== undefined) {
            data.server.block_device_mapping = ops.block_device_mapping;
        }

        if (ops.security_groups !== undefined) {
            var i, groups;
            for (i in ops.security_groups) {
                if (ops.security_groups[i] !== undefined) {
                    var group = {
                        "name": ops.security_groups[i]
                    };
                    groups.push(group);
                }
            }

            data.server.security_groups = groups;
        }

        if (ops.min_count === undefined) {
            ops.min_count = 1;
        }

        data.server.min_count = ops.min_count;

        if (ops.max_count === undefined) {
            ops.max_count = 1;
        }

        data.server.max_count = ops.max_count;

        if (ops.availability_zone !== undefined) {
            data.server.availability_zone = btoa(ops.availability_zone);
        }

        if (ops.networks !== undefined) {
            data.server.networks = ops.networks;
        }

        var options = buildOps("POST", { token: token, body: data });

        return requestPromise(url + "/" + region + "/image/v1", options);
    };

    var asJSON = function asJSON(req) {
        return JSON.parse(req.response);
    };

    var delay = function delay(ms) {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, ms);
        });
    };

    var getTokenAndParams = function getTokenAndParams(url) {
        return getOpenStackToken(url) // Get initial token
            .then(function (responseR) {
                return getProjects(url, responseR).then(function (x) {
                    return x.length > 0 ? Promise.resolve(x[0]) : Promise.reject("No token");
                });
            });
    };

    var getTokenAllSteps = function getTokenAllSteps() {
        return getOpenStackToken(CLOUD_URL) // Get initial token
            .then(getProjects.bind(null, CLOUD_URL)) // Then get projects token
            .then(function (x) {
                return x.filter(function (y) {
                    return y !== "";
                });
            }).then(function (x) {
                return x.length > 0 ? Promise.resolve(x[0]) : Promise.reject("No token");
            });
    };

    return {
        CLOUD_URL: CLOUD_URL,
        SYNC_URL: SYNC_URL,
        IDM_URL: IDM_URL,
        asJSON: asJSON,
        getOpenStackToken: getOpenStackToken,
        getOpenStackProjectToken: getOpenStackProjectToken,
        getAdminRegions: getAdminRegions,
        getProject: getProject,
        getFlavorList: getFlavorList,
        getProjects: getProjects,
        getProjectPermissions: getProjectPermissions,
        getImagesRegion: getImagesRegion,
        getNetworksList: getNetworksList,
        createServer: createServer,
        sync: sync,
        getTokenAndParams: getTokenAndParams,
        getTokenAllSteps: getTokenAllSteps,
        delay: delay
    };
})();

// // Get token?
// getTokenAllSteps().then(x => console.log(x)) // TOKEN!
//     .catch(e => {
//         console.log("ERROR:", e);
//     });
