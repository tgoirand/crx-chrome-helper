var currentUrl;

var activatedNodes = new Array();

var populate = function(obj, data) {

    var i = 0;
    for ( var k in data) {
        var title = k;
        if (typeof (data[k]) != 'object') {
            obj[i] = {
                title : title,
                isFolder : true,
                icon : 'prop.png',
                classNames: { }
            };
            obj[i].children = [];
            obj[i].children[0] = {
                title : data[k],
                isFolder : false
            };
        } else {
            obj[i] = {
                title : title,
                isFolder : true,
                icon : 'comp.png'
            };
            obj[i].children = [];
            populate(obj[i].children, data[k]);
        }
        i++;
    }
};

var buildComponentUrl = function(n, s) {

    if (n.data.title != null) {
        s = '/' + n.data.title + s;
    }

    if (n.getParent() == null)
        return s;
    else
        return buildComponentUrl(n.getParent(), s);

};

var isProperty = function(node) {
    return node.getChildren() == null;
};

var isComponent = function(node) {
    return node.getChildren() != null
        && node.getChildren()[0].getChildren() != null;
};

var findNode = function(nodeRoot, nodeToFind) {
    if (nodeToFind == null) {
        console.log('nodeToFind is null');
        return false;
    } else {
        console.log('looking for:' + nodeToFind);
    }
    var n = new Array();
    n.push(nodeRoot);

    for ( var i = 0; i < n.length; i++) {
        if (n[i].isEqualNode(nodeToFind))
            return n[i];

        var c = n[i].childNodes;
        var t = nodeToFind.childNodes;

        var equal = c.length > 1;

        for ( var j = 0; j < c.length; j++) {
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
    $(".dynatree-title", node.span).html(
        "<input id='editNode' value='" + prevTitle + "'>");
    // Focus <input> and bind keyboard handler
    $("input#editNode").focus().keydown(function(event) {
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
    }).blur(function(event) {
        // Accept new value, when user leaves <input>
        var title = $("input#editNode").val();
        node.setTitle(title);
        // Re-enable mouse and keyboard handlling
        tree.$widget.bind();
        node.focus();
        updateProp(url, node.getParent().data.title, title);
    });

};

var updateProp = function(url, propname, propvalue) {
    console.log('updating:' + url + ':' + propname + ':' + propvalue);
    var values = {};
    values[propname] = propvalue;

    $.ajax({
        url : url,
        type : 'POST',
        username : 'admin',
        password : 'admin',
        data : values
    });

};

var getActiveNodes = function() {
    if (localStorage["activatedNodes"] != null && localStorage["activatedNodes"] != '') {
        return JSON.parse(localStorage["activatedNodes"]);
    }
    return new Array();
};

var saveActiveNodes = function(activatedNodes) {

	console.log('save:' + activatedNodes);
    localStorage["activatedNodes"] = JSON.stringify(jQuery.unique(activatedNodes));

};

var removeActivatedNode = function(node) {
    activatedNodes.splice(activatedNodes.indexOf(getPathKey(node)), 1);
    saveActiveNodes(activatedNodes);
};

var addActivatedNode = function(node) {
    activatedNodes.push(getPathKey(node));
    saveActiveNodes(activatedNodes);
};

var isActivatedNode = function(node) {
    return activatedNodes.indexOf(getPathKey(node)) > -1;
};

var getPathKey = function(node) {
    return buildComponentUrl(node, '');
};

var retrieveInfo = function(tab, data) {
    $(function() {
        $("#tree").dynatree(
            {
                onDblClick : function(node, event) {
                    if (isProperty(node)) {
                        var cmpUrl = currentUrl + buildComponentUrl(node.getParent().getParent(), '');
                        editNode(node, cmpUrl);
                        return false;
                    }
                },
                onExpand : function(flag, node) {

                    if (flag) {
                        addActivatedNode(node);
                    } else {
                        removeActivatedNode(node);
                    }

                },
                onClick : function(node, event) {
                    if (isComponent(node)) {
                    }

                    if (event.altKey && isComponent(node)) {
                        var cmpUrl = currentUrl
                            + buildComponentUrl(node, '') + '.html';
                        chrome.tabs.create({
                            'url' : cmpUrl,
                            'selected' : true
                        });
                    } 
                }

            });
    });

    var obj = [];
    populate(obj, data);
    $("#tree").dynatree("getRoot").addChild(obj);

    $("#tree").dynatree("getRoot").visit(function(node) {
        if (isActivatedNode(node)) {
            node.expand(true);
        }
    });

};


chrome.tabs.getSelected(null, function(tab) {
    var rePattern = new RegExp('^(http[s]?[:]//[^/]+[^\.]+)\.(.+)');
    var grps = rePattern.exec(tab.url);
    chrome.pageAction.setIcon({path:"icon19-grey.png", tabId: tab.id});

    if (grps.length > 0) {

        var jsonUrl = grps[1] + '.tidy.-1.json';
        console.log('jsonUrl:' + jsonUrl);
        currentUrl = grps[1];
        activatedNodes = getActiveNodes();
        console.log(jsonUrl);

        $.ajax({
            url : jsonUrl,
            async : true,
            type : 'GET',
            timeout : 10000,
            dataType : "json",
            statusCode: {
                200: function(data, status, request) {
                    var ct = request.getResponseHeader("content-type") || "";
                    if ((ct.indexOf('json') > -1)) {
                        chrome.pageAction.setIcon({path:"icon19.png", tabId: tab.id});
                        retrieveInfo(tab, data);
                    } else {
                        chrome.pageAction.setIcon({path:"icon19-error.png", tabId: tab.id});
                    }
                }
            },
            success : function(data, status, request) {
            },
            error : function (xhr, ajaxOptions, thrownError) {
                chrome.pageAction.setIcon({path:"icon19-error.png", tabId: tab.id});
            }
        });
    }
});

