var currentUrl;

var currentRootUrl;
var contentUrl;

var activatedNodes = new Array();


var findComponents = function (cps, path, depth, obj, data) {
    var i = 0;
    depth++;
    for (var k in data) {
        var title = k;
        if (typeof (data[k]) == 'object') {
            obj[i] = {
                title: title
            };
            obj[i].children = [];
            path[depth] = k;
            findComponents(cps, path, depth, obj[i].children, data[k]);
            i++;
        } else if (k == 'sling:resourceType') {
            var spath = '';
            for (var ll = 0; ll < depth; ll++) {
                spath += '/' + path[ll];
            }
            cps.push({path: spath, title: path[depth - 1]});
        }
    }
};

var populate = function (obj, data) {

    var i = 0;
    for (var k in data) {
        var title = k;
        if (typeof (data[k]) != 'object') {
            className = 'title';
            if (title.indexOf(':') > -1) {
                className = title.split(':')[0];
            }
            obj[i] = {
                title: title,
                isFolder: true,
                icon: 'prop.png',
                addClass: className
            };
            obj[i].children = [];
            obj[i].children[0] = {
                title: data[k],
                isFolder: false
            };
        } else {
            obj[i] = {
                title: title,
                isFolder: true,
                icon: 'comp.png'
            };
            obj[i].children = [];
            populate(obj[i].children, data[k]);
        }
        i++;
    }
};

var buildComponentUrl = function (n, s) {

    if (n.data.title != null) {
        s = '/' + n.data.title + s;
    }

    if (n.getParent() == null)
        return s;
    else
        return buildComponentUrl(n.getParent(), s);

};

var isProperty = function (node) {
    return node.getChildren() == null;
};

var isComponent = function (node) {
    return node.getChildren() != null && node.getChildren()[0].getChildren() != null;
};

var findNode = function (nodeRoot, nodeToFind) {
    if (nodeToFind == null) {
        console.log('nodeToFind is null');
        return false;
    } else {
        console.log('looking for:' + nodeToFind);
    }
    var n = new Array();
    n.push(nodeRoot);

    for (var i = 0; i < n.length; i++) {
        if (n[i].isEqualNode(nodeToFind))
            return n[i];

        var c = n[i].childNodes;
        var t = nodeToFind.childNodes;

        var equal = c.length > 1;

        for (var j = 0; j < c.length; j++) {
            equal = equal && c.length == t.length && c[j].isEqualNode(t[j]);
            n.push(c[j]);
        }

        if (equal)
            return n[i];
    }

    return null;
};

function editNode(node, url) {
    var prevTitle = node.data.title;
    tree = node.tree;
    // Disable dynatree mouse- and key handling
    tree.$widget.unbind();
    // Replace node with <input>
    $(".dynatree-title", node.span).html("<input id='editNode' value='" + prevTitle + "'>");
    // Focus <input> and bind keyboard handler
    $("input#editNode").focus().keydown(function (event) {
        switch (event.which) {
            case 27: // [esc]
                // discard changes on [esc]
                $("input#editNode").val(prevTitle);
                $(this).blur();
                break;
            case 13: // [enter]
                // simulate blur to accept new value
                $(this).blur();
                break;
        }
    }).blur(function (event) {
        // Accept new value, when user leaves <input>
        var title = $("input#editNode").val();
        node.setTitle(title);
        // Re-enable mouse and keyboard handlling
        tree.$widget.bind();
        node.focus();
        updateProp(url, node.getParent().data.title, title);
    });

};

var updateProp = function (url, propname, propvalue) {
    console.log('updating:' + url + ':' + propname + ':' + propvalue);
    var values = {};
    values[propname] = propvalue;

    $.ajax({
        url: url,
        type: 'POST',
        data: values
    });

};

var getActiveNodes = function () {
    if (localStorage["activatedNodes"] != null && localStorage["activatedNodes"] != '') {
        return JSON.parse(localStorage["activatedNodes"]);
    }
    return new Array();
};

var saveActiveNodes = function (activatedNodes) {

    console.log('save:' + activatedNodes);
    localStorage["activatedNodes"] = JSON.stringify(jQuery.unique(activatedNodes));

};

var removeActivatedNode = function (node) {
    activatedNodes.splice(activatedNodes.indexOf(getPathKey(node)), 1);
    saveActiveNodes(activatedNodes);
};

var addActivatedNode = function (node) {
    activatedNodes.push(getPathKey(node));
    saveActiveNodes(activatedNodes);
};

var isActivatedNode = function (node) {
    return activatedNodes.indexOf(getPathKey(node)) > -1;
};

var getPathKey = function (node) {
    return buildComponentUrl(node, '');
};

var evaluateLoadingTime = function (componentPath, index, callback) {
    var ajaxTime = new Date().getTime();
    $.ajax({
        url: currentRootUrl + contentUrl + componentPath + ".html",
        // url, type, dataType, etc
        beforeSend: function (xhr) {
            ajaxTime = new Date();
        },
        complete: function (xhr, state) {
            var latency = new Date().getTime()- ajaxTime;
            console.log('latency:' + latency);

            callback(latency, index);

        }
    });
};
var retrieveInfo = function (tab, data) {
    $(function () {
        $("#tabs").tabs({
            activate: function (event, ui) {
                var active = $('#tabs').tabs('option', 'active');
                if (active == 1) {

                    /*
                     var urlRootContent = getUrlRootContent(retrieveRealUrl(tab.url));
                     currentRootUrl = urlRootContent[1];
                     */
                    getSource();

                    var cps = [];
                    findComponents(cps, [], -1, [], data);

                    $("#tabs-2").html('');
                    for (var i = 1; i < cps.length; i++) {
                        $("#tabs-2").append(cps[i].title + " <div id=\"bar-" + i + "\" style=\"width:200px; height:20px\"></div>\n");
                    }
                    evaluateLoadingTime(cps[0].path, 0, function (totalLatency, index0) {
                        for (var i = 1; i < cps.length; i++) {
                            evaluateLoadingTime(cps[i].path, i, function (componentLatency, index) {
                                var porcnt = parseInt(componentLatency * 100 / totalLatency);
                                console.log("id:" + index);
                                $("#bar-" + index).progressbar({
                                    value: porcnt
                                });
                            })
                        }
                    });
                }
            }
        });
    });


    /*    $(function () {
     $("#perf").dynatree({})
     });*/


    $(function () {
        $("#tree").dynatree({
            onDblClick: function (node, event) {
                if (isProperty(node)) {
                    var cmpUrl = currentUrl + buildComponentUrl(node.getParent().getParent(), '');
                    editNode(node, cmpUrl);
                    return false;
                }
            },
            onExpand: function (flag, node) {

                if (flag) {
                    addActivatedNode(node);
                } else {
                    removeActivatedNode(node);
                }

            },
            onClick: function (node, event) {
                if (event.altKey && isComponent(node)) {
                    var cmpUrl = currentUrl + buildComponentUrl(node, '') + '.html';
                    chrome.tabs.create({
                        'url': cmpUrl,
                        'selected': true
                    });
                } else if (event.metaKey && isComponent(node)) {
                    var cmpUrl = currentRootUrl + '/crx/de/index.jsp#' + encodeURIComponent(contentUrl + buildComponentUrl(node, '')).replace(/%2F/gi, '/');
                    ;
                    chrome.tabs.create({
                        'url': cmpUrl,
                        'selected': true
                    });
                }

            }

        });
    });

    var obj = [];
    populate(obj, data);
    $("#tree").dynatree("getRoot").addChild(obj);

    $("#tree").dynatree("getRoot").visit(function (node) {
        if (isActivatedNode(node)) {
            node.expand(true);
        }
    });


};

var getUrlRootContent = function (realUrl) {
    var urlRootContent = new RegExp('^(http[s]?[:]//[^/]+)([^\.]+)\.(.+)').exec(realUrl);
    return urlRootContent;
};

chrome.tabs.getSelected(null, function (tab) {
    var rePattern = new RegExp('^(http[s]?[:]//[^/]+[^\.]+)\.(.+)');

    var realUrl = retrieveRealUrl(tab.url);

    var grps = rePattern.exec(realUrl);
    chrome.pageAction.setIcon({
        path: "icon19-grey.png",
        tabId: tab.id
    });

    if (grps.length > 0) {
        var urlRootContent = getUrlRootContent(realUrl);
        currentRootUrl = urlRootContent[1];
        contentUrl = urlRootContent[2];
        var jsonUrl = grps[1] + '.tidy.-1.json';
        console.log('jsonUrl:' + jsonUrl);
        currentUrl = grps[1];
        activatedNodes = getActiveNodes();
        console.log(jsonUrl);

        $.ajax({
            url: jsonUrl,
            async: true,
            type: 'GET',
            timeout: 10000,
            dataType: "json",
            statusCode: {
                200: function (data, status, request) {
                    var ct = request.getResponseHeader("content-type") || "";
                    if ((ct.indexOf('json') > -1)) {
                        chrome.pageAction.setIcon({
                            path: "icon19.png",
                            tabId: tab.id
                        });
                        retrieveInfo(tab, data);
                    } else {
                        chrome.pageAction.setIcon({
                            path: "icon19-error.png",
                            tabId: tab.id
                        });
                    }
                }
            },
            success: function (data, status, request) {
            },
            error: function (xhr, ajaxOptions, thrownError) {
                chrome.pageAction.setIcon({
                    path: "icon19-error.png",
                    tabId: tab.id
                });
            }
        });
    }
});

function retrieveRealUrl(url) {
    return url.replace('editor.html/', '').replace('cf#/', '');
}

chrome.extension.onMessage.addListener(function(request, sender) {
    if (request.action == "getSource") {
        console.log('source:' + request.source);
    }
});

function getSource(callback) {

    chrome.tabs.executeScript(null, {
        file: "getPagesSource.js"
    }, function() {
        // If you try and inject into an extensions page or the webstore/NTP you'll get an error
        if (chrome.extension.lastError) {

        }
    }, callback);
}