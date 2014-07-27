/*jslint browser: true, devel: true, nomen: true, sloppy: true */
var wikipediaImages = ['logo', 'red pencil', 'wikibooks', 'feature', 'star', 'symbol', 'vote', 'icon', 'question_book', 'disamb', 'edit', 'ambox', 'wiki_letter', 'speakerlink'];
var portalImages = ['caribou from wagon trails', 'rose amber', 'france loiret', 'Leaf_1_web', 'Martinique.web'];
var unwantedImages = ['map'];
var filterList = _.union(wikipediaImages, portalImages, unwantedImages);

var width = 1000;
var height = 500;

var rootCircleRadius = 30;
var rootCircleCenterXPos = 30;

var verticalBarLength = 100;
var verticalMargin = 30;

var horizontalOffset = 150;
var verticalBarXPos = rootCircleCenterXPos + rootCircleRadius + horizontalOffset;

var barWidth = 100;

// Distance between two children
var heightBetweenChildren = 100;


function getName(data) {
    return data.vernacularName || data.canonicalName || data.scientificName || "Error: could not find name";
}

function getScientificName(data) {
    var name = data.scientificName;

    // Used when name has date and scientist attached
    if (data.authorship) {
        var index = name.indexOf(data.authorship);
        if (index !== -1) {
            // remove the space before the name too
            return name.substring(0, index - 1);
        }
    }

    return name;
}

function getCommonName(data) {
    return data.vernacularName || data.canonicalName;
}


// Data stuff

function setSidebarDatum(value) {
    // Binds data to the sidebar. The data is [id, has_wikipedia_content]. This allows us
    // to not reload data when we go into sublevel if sidebar has already the correct data
    d3.select('#infoContainer').datum(value);
};

function getSidebarDatum() {
    return d3.select('#infoContainer').datum() || [-1, false];
}

function showInformation(data, tree) {
    setUpSidebar();
    showWikipediaInformation(data, tree);
}


function showWikipediaInformation(data, tree) {
    putWikipediaInfoLoader();

    var speciesName = getScientificName(data);
    var commonName = getCommonName(data);
    var ID = data.id;

    var wiki = new Wikipedia();
    wiki.article(commonName, speciesName, function (data) {
        removeWikipediaInfoLoader();

        var divSelection = d3.select('#speciesData');

        if (data) {
            setSidebarDatum([ID, true]);
            addWikipediaTextToSelection(data, tree, divSelection);
            addWikipediaImage(wiki, commonName, speciesName, divSelection);
        } else {
            setSidebarDatum([ID, false]);
            addNoAvailableInformationText(divSelection);
        }
    });
}

function addWikipediaImage(wiki, commonName, speciesName, divSelection) {
    wiki.image(commonName, speciesName, function (imagesData) {
        var url = chooseImage(imagesData || []);
        if (url) {
            addWikipediaImageToSelection(divSelection, url);
        }
    });
}

function addWikipediaImageToSelection(divSelection, url) {
    divSelection.insert('img', '#content')
        .attr('src', url)
        .attr('alt', 'image')
        .attr('class', 'ui huge image');
}

function addWikipediaTextToSelection(data, tree, divSelection) {
    var title = data.title;
    var raw_content = data.extract;
    var content = removeWikiCruft(raw_content);

    var titleText = title + " (" + tree.getTaxon() + ')';
    divSelection.append('h1').attr('class', 'header').text(titleText);
    divSelection.append('div').attr('id', 'content').html(content);
}

function addNoAvailableInformationText(divSelection) {
    //makeSidebarSmall();
    divSelection.append('h1').text('No available information');
}

function removeWikiCruft(text) {
    var lowercaseText = text.toLowerCase();

    var index = lowercaseText.indexOf('see also');
    if (index !== -1) {
        return text.substring(0, index);
    }

    var index = lowercaseText.indexOf('references');
    if (index !== -1) {
        return text.substring(0, index);
    }

    var index = lowercaseText.indexOf('bibliography');
    if (index !== -1) {
        return text.substring(0, index);
    }

    return text;
}



function chooseImage(imagesData) {
    for (var i = 0; i < imagesData.length; i++) {
        var image = imagesData[i];

        var title = image.title;

        var info = image.imageinfo[0];
        var mime = info.mime;
        var url = info.url;
        var size = info.size;

        // For unwanted images, such as wikipedia icons, portal images and some maps
        if (containsAny(title, filterList) || containsAny(url, filterList)) {
            continue;
        } else if (mime.indexOf('application') !== -1 || mime.indexOf('tif') !== -1) {
            continue;
        }

        // Giant image or icon
        if (size >= 5000000 || size <= 40000) {
            continue;
        }

        return url;
    }
}

function expandSuperTree(svgContainer, tree) {
    if (tree.isAtKingdomLevel()) {
        console.info("Reached kingdom level. Can't go up.");
        return;
    }

    removeSidebarContent();
    hideSidebar();
    scrollToTop();

    tree.setRootToParent();

    addRoot(svgContainer, tree);

    tree.fetchBasicChildrenInformation(function (children) {
        addChildren(svgContainer, tree, children);
    });
}

function showChildren(data, svgContainer, tree) {
    if (tree.isAtSpeciesLevel()) {
        console.info("Reached species level. Can't go down.");
        return;
    }

    var ID = data.id;
    var sidebarDatum = getSidebarDatum();
    var sidebarSpeciesID = sidebarDatum && sidebarDatum[0],
        wikipediaHasInformation = sidebarDatum[1];
    if (sidebarSpeciesID !== ID || !wikipediaHasInformation) {
        scrollToTop();
        hideSidebar();
    }

    tree.setRootToChild(ID);

    addRoot(svgContainer, tree);

    tree.fetchBasicChildrenInformation(function (children) {
        addChildren(svgContainer, tree, children);
        if (sidebarSpeciesID !== ID) {
            showInformation(data, tree);
        }
    });
}



// UI Stuff
function scrollToTop() {
    $('html, body').animate({
        scrollTop: 0
    }, 'fast');
}

// Sidebar
function getSidebar() {
    return d3.select('#infoContainer');
}

function sidebarIsSmall() {
    return getSidebar().attr('class').indexOf('very wide') === -1;
}

function removeSidebarContent() {
    d3.selectAll('#speciesData').remove();
    d3.selectAll('#removeIcon').remove();
}

function showSidebar() {
    $('.sidebar').sidebar('show');
}

function hideSidebar() {
    $('.sidebar').sidebar('hide');
}

function collapseSidebar() {
    setSidebarDatum([0, false]);
    removeSidebarContent();
    hideSidebar();
}

function addRemoveIconToSidebar() {
    getSidebar()
        .append('div')
        .attr('class', 'ui black icon button')
        .attr('id', 'removeIcon')
        .style('margin-top', '20px')
        .on('click', collapseSidebar)
        .append('i')
        .attr('class', 'remove icon');
}

function addSpeciesDataContainer() {
    getSidebar().append('div').attr('id', 'speciesData');
}


function setUpSidebar() {
    removeSidebarContent();
    addRemoveIconToSidebar();
    addSpeciesDataContainer();
    showSidebar();
}


// Loader
function putWikipediaInfoLoader() {
    var div = d3.select('#speciesData')
        .append('div')
        .attr('id', 'infoLoader')
        .style('width', '50%')
        .style('margin', '0 auto')

    div.append('div').attr('class', 'ui large active inline loader')
    div.append('b').style('margin-left', '20px').text('Fetching information...');

};


function removeWikipediaInfoLoader() {
    d3.select('#speciesData').select('#infoLoader').remove();
}

function putChildrenLoader() {
    var selection = d3.select('#speciesContainer');

    var xPos = verticalBarXPos + barWidth;
    var yPos = verticalBarLength + 100;

    selection.append('div')
        .attr('class', 'ui active large inline loader')
        .style('position', 'absolute')
        .style('left', xPos.toString() + 'px')
        .style('top', yPos.toString() + 'px')
        .attr('id', 'graphLoader')
}

function removeChildrenLoader() {
    d3.select('#graphLoader').remove();
}

// Svg
function clearSvg(svgContainer) {
    svgContainer.selectAll('g').remove();
    svgContainer.selectAll('circle').remove();
    svgContainer.selectAll('image').remove();
    svgContainer.selectAll('line').remove();
}

function clearButtons() {
    d3.selectAll('.textButton').remove();
    d3.select('#rootButton').remove();
}

function resizeSvg(svgContainer, children) {
    resizeSvgHeight(svgContainer, children);
}

function resizeSvgHeight(svgContainer, children) {
    // Distance between two children
    var contentHeight = Math.max(2 * rootCircleRadius, (children.length - 1) * heightBetweenChildren);
    var marginHeight = 2 * verticalMargin + verticalBarLength;

    height = contentHeight + marginHeight;
    svgContainer.attr('height', height);
}

// Graph UI
function addNoInformationAvailableText(childrenSelection) {
    childrenSelection.append('text')
        .attr('x', verticalBarXPos + 10)
        .attr('y', verticalMargin + verticalBarLength + 35)
        .text('No available information')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '20px')
        .attr('fill', 'rgb(83, 83, 83)')
}

function addRootCircle(svgContainer, tree) {
    var selection = createRootDiv();
    var button = createRootButton(selection, svgContainer);

    if (tree.isAtKingdomLevel()) {
        button.attr('class', 'active big ui red button').text('Life');
    } else {
        var name = getName(tree.root);
        button.attr('class', 'big ui red icon button').text(name);
        button.append('i').attr('class', 'level up icon');

        createRootInformationButton(selection, tree);
    }
}

function createRootDiv() {
    return d3.select("#speciesContainer")
        .append('div')
        .style('position', 'absolute')
        .style("left", rootCircleCenterXPos.toString() + 'px')
        .style("top", verticalMargin.toString() + 'px')
        .attr('id', 'rootButton');
}

function createRootButton(selection, svgContainer) {
    return selection
        .append('div')
        .on("click", function (data) {
            expandSuperTree(svgContainer, tree);
        });
}

function createRootInformationButton(selection, tree) {
    return selection.append('div')
        .attr('class', 'big ui green icon button')
        .on("click", function () {
            showInformation(tree.root, tree);
        })
        .append('i')
        .attr('class', 'icon info letter');

}

function addLinesFromRootToVerticalBar(svgContainer) {
    var height = svgContainer.attr('height');

    svgSelection.append('line')
        .attr('x1', rootCircleCenterXPos + 50)
        .attr('y1', verticalMargin + rootCircleRadius)
        .attr('x2', rootCircleCenterXPos + 50)
        .attr('y2', verticalMargin + rootCircleRadius + verticalBarLength)
        .attr('stroke-width', 5)
        .attr('stroke', 'black');

    svgSelection.append('line')
        .attr('x1', rootCircleCenterXPos + 50)
        .attr('y1', verticalMargin + rootCircleRadius + verticalBarLength)
        .attr('x2', verticalBarXPos)
        .attr('y2', verticalMargin + rootCircleRadius + verticalBarLength)
        .attr('stroke-width', 5)
        .attr('stroke', 'black');
}

function addVerticalLine(svgContainer) {
    var height = svgContainer.attr('height');

    svgSelection.append('line')
        .attr('x1', verticalBarXPos)
        .attr('y1', verticalMargin + verticalBarLength)
        .attr('x2', verticalBarXPos)
        .attr('y2', height - verticalMargin)
        .attr('stroke-width', 5)
        .attr('stroke', 'black');
}

function addHorizontalBars(childrenSelection, numChildren) {
    for (var i = 0; i < numChildren; i++) {
        var height = i * heightBetweenChildren;
        var yPos = height + verticalMargin + verticalBarLength;


        childrenSelection.append('line')
            .attr('x1', verticalBarXPos)
            .attr('y1', yPos)
            .attr('x2', verticalBarXPos + barWidth)
            .attr('y2', yPos)
            .attr('stroke-width', 5)
            .attr('stroke', 'black');
    }
}

function addChildrenTextButton(svgContainer, childrenData, tree) {
    var selection = d3.select("#speciesContainer");
    var buttons = selection.selectAll('.textButton')
        .data(childrenData)
        .enter()
        .append('div');

    var xPos = verticalBarXPos + barWidth;
    buttons.style('position', 'absolute')
        .style('left', xPos.toString() + 'px')
        .style('top', function (data, index) {
            var height = index * heightBetweenChildren + verticalBarLength + 8;
            return height.toString() + 'px';
        })
        .attr('class', 'textButton');

    addTextToButtons(buttons, svgContainer, tree);
    addIconToButtons(buttons, tree);
}

function addTextToButtons(buttons, svgContainer, tree) {
    var isAtSpeciesLevel = tree.isAtSpeciesLevel();

    var button = buttons.append('div');
    if (isAtSpeciesLevel) {
        button.attr('class', 'ui active blue button');
    } else {
        button.attr('class', 'ui blue labeled icon button');
        button.on('click', function (data) {
            showChildren(data, svgContainer, tree);
        });
    }



    button.text(function (data) {
        var text = getName(data);
        return capitalise(text);
    }).style('width', function (data) {
        var text = getName(data);
        var width = Math.max(200, text.length * 12 + 90);
        return width.toString() + 'px';
    });

    if (!isAtSpeciesLevel) {
        button.append('i').attr('class', 'level down icon');
    }
}

function addIconToButtons(buttons, tree) {

    buttons.append('div')
        .attr('class', 'ui green icon button')
        .on("click", function (data) {
            showInformation(data, tree);
        })
        .append('i')
        .attr('class', 'icon info letter');
}

function sortByNumberDescendants(childrenData) {
    return childrenData.sort(function (a, b) {
        var keyA = a.numDescendants || 0,
            keyB = b.numDescendants || 0;
        // Compare the 2 dates
        if (keyA > keyB) return -1;
        if (keyA < keyB) return 1;
        return 0;
    });
}

function addChildrenToSvg(svgContainer, tree, childrenData) {
    var childrenSelection = svgContainer.append('g').attr('id', 'childrenGroup');
    var numChildren = childrenData.length;

    if (numChildren === 0) {
        addNoInformationAvailableText(childrenSelection);
    } else {
        childrenData = sortByNumberDescendants(childrenData);
        addHorizontalBars(childrenSelection, numChildren);
        addChildrenTextButton(svgContainer, childrenData, tree);
    }
}

function addRoot(svgContainer, tree) {
    clearSvg(svgContainer);
    clearButtons();
    addRootCircle(svgContainer, tree);
    addLinesFromRootToVerticalBar(svgContainer);
    putChildrenLoader();
}

function addChildren(svgContainer, tree, children) {
    removeChildrenLoader();
    resizeSvg(svgContainer, children);
    addVerticalLine(svgContainer);
    addChildrenToSvg(svgContainer, tree, children);
}

var selection = d3.select("#speciesContainer");
var svgSelection = selection.append("svg")
    .attr('width', width)
    .attr('height', height);

var tree = new Tree();
addRoot(svgSelection, tree);
tree.fetchBasicChildrenInformation(function (children) {
    addChildren(svgSelection, tree, children);
});
