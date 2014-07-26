/*jslint browser: true, devel: true, nomen: true, sloppy: true */
var wikipediaImages = ['logo', 'red pencil', 'wikibooks', 'feature', 'star', 'symbol', 'vote', 'icon', 'question_book', 'disamb', 'edit', 'ambox', 'wiki_letter', 'speakerlink'];
var portalImages = ['caribou from wagon trails', 'rose amber', 'france loiret', 'Leaf_1_web', 'Martinique.web'];
var unwantedImages = ['map'];
var filterList = _.union(wikipediaImages, portalImages, unwantedImages);

var width = 1000;
var height = 500;

var rootCircleRadius = 30;
var rootCircleCenterXPos = 30;

var childCircleRadius = 20;

var verticalMargin = 30;

var horizontalOffset = 100;
var verticalBarXPos = rootCircleCenterXPos + rootCircleRadius + horizontalOffset;

var barTextOffset = 10;
var barWidth = 100;

// Distance between two children
var heightBetweenChildren = 100;


function getName(data) {
    return data.vernacularName || data.canonicalName || data.scientificName || "Error: could not find name";
}

function getScientificName(data) {
    var name = data.scientificName;

    // Used when name has date and scientist attached
    if (_.isDefined(data.authorship) && data.authorship !== "") {
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

function showInformation(data, tree) {
    // Remove existing data, if it exists
    d3.select('#speciesData').remove();

    setUpSidebar();

    var infoSelection = d3.select('#infoContainer');
    var divSelection = infoSelection.append('div').attr('id', 'speciesData').attr('class', 'verticalLine');

    showWikipediaInformation(data, tree);
}



function showWikipediaInformation(data, tree) {
    var divSelection = d3.select('#speciesData');
    putLoader(divSelection);

    var wiki = new Wikipedia();
    var speciesName = getScientificName(data);
    var commonName = getCommonName(data);
    wiki.article(commonName, speciesName, function (data) {
        removeLoader(divSelection);
        if (_.isUndefined(data)) {
            divSelection.append('h1').text('No available information');
            return;
        }

        var title = data.title;
        var raw_content = data.extract;
        var content = removeWikiCruft(raw_content);

        var titleText = title + " (" + tree.getTaxon() + ')';
        divSelection.append('h1').attr('class', 'header').text(titleText);
        divSelection.append('div').attr('id', 'content').html(content);

        wiki.image(commonName, speciesName, function (imagesData) {
            var url = chooseImage(imagesData || []);
            if (url) {
                divSelection.insert('img', '#content')
                    .attr('src', url)
                    .attr('alt', 'image')
                    .attr('class', 'ui huge image');
            }
        });
    });
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
        var mime = image.imageinfo[0].mime;
        var url = image.imageinfo[0].url;
        var size = image.imageinfo[0].size;

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

function expandSuperTree(data, svgContainer, tree) {
    if (tree.isAtKingdomLevel()) {
        console.info("Reached kingdom level. Can't go up.");
        return;
    }

    hideSidebar();

    tree.setRootToParent();
    tree.fetchBasicChildrenInformation(function (children) {
        addChildren(svgContainer, tree, children);
    });
}

function showChildren(data, svgContainer, tree) {
    if (tree.isSpeciesLevel()) {
        console.info("Reached species level. Can't go down.");
        return;
    }

    hideSidebar();

    tree.setRootToChild(data.id);
    tree.fetchBasicChildrenInformation(function (children) {
        addChildren(svgContainer, tree, children);
    });
}



// UI Stuff


// Sidebar
function removeSidebarContent() {
    d3.selectAll('#speciesData').remove();
    d3.selectAll('#removeIcon').remove();
}

function showSidebar() {
    $('.sidebar').sidebar('show');
}

function hideSidebar() {
    removeSidebarContent();
    $('.sidebar').sidebar('hide');
}

function addRemoveIconToSidebar() {
    d3.select('.sidebar').append('i')
        .attr('class', 'huge remove icon')
        .attr('id', 'removeIcon')
        .on('click', function () {
            hideSidebar();
        });
}

function setUpSidebar() {
    removeSidebarContent();
    addRemoveIconToSidebar();
    d3.select('#infoContainer').append('div').attr('id', 'speciesData');
    showSidebar();
}


// Loader
function putLoader(divSelection) {
    divSelection.append('div').attr('class', 'ui active inline loader').attr('id', 'loader');
}

function removeLoader(divSelection) {
    divSelection.select('#loader').remove();
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
}

function resizeSvg(svgContainer, children) {
    resizeSvgHeight(svgContainer, children);
}

function resizeSvgHeight(svgContainer, children) {
    // Distance between two children
    var contentHeight = Math.max(2 * rootCircleRadius, (children.length - 1) * heightBetweenChildren);
    var marginHeight = 2 * verticalMargin;

    height = contentHeight + marginHeight;
    svgContainer.attr('height', height);
}


// Graph UI
function addNoInformationAvailableText(childrenSelection) {
    childrenSelection.append('text')
        .attr('x', verticalBarXPos + textOffset)
        .attr('y', verticalMargin + 35)
        .text('No available information')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '20px')
        .attr('fill', 'rgb(83, 83, 83)')

}

function addRootCircle(svgContainer, tree) {
    var height = svgContainer.attr('height');

    svgSelection.append('circle')
        .attr("cx", rootCircleCenterXPos)
        .attr("cy", verticalMargin + rootCircleRadius)
        .attr("r", rootCircleRadius)
        .style("fill", "green")
        .on("click", function (data) {
            expandSuperTree(data, svgContainer, tree);
        });
}

function addHorizontalLineFromCircle(svgContainer) {
    var height = svgContainer.attr('height');

    svgSelection.append('line')
        .attr('x1', rootCircleCenterXPos + rootCircleRadius)
        .attr('y1', verticalMargin + rootCircleRadius)
        .attr('x2', verticalBarXPos)
        .attr('y2', verticalMargin + rootCircleRadius)
        .attr('stroke-width', 5)
        .attr('stroke', 'black');
}

function addVerticalLine(svgContainer) {
    var height = svgContainer.attr('height');

    svgSelection.append('line')
        .attr('x1', verticalBarXPos)
        .attr('y1', verticalMargin)
        .attr('x2', verticalBarXPos)
        .attr('y2', height - verticalMargin)
        .attr('stroke-width', 5)
        .attr('stroke', 'black');
}

function addHorizontalBars(childrenSelection, numChildren) {
    for (var i = 0; i < numChildren; i++) {
        var height = i * heightBetweenChildren;
        var yPos = height + verticalMargin;


        childrenSelection.append('line')
            .attr('x1', verticalBarXPos)
            .attr('y1', yPos)
            .attr('x2', verticalBarXPos + barWidth)
            .attr('y2', yPos)
            .attr('stroke-width', 5)
            .attr('stroke', 'black');
    }
}

function addChildrenTextButton(childrenSelection, svgContainer, childrenData, tree) {
    var selection = d3.select("#speciesContainer");
    var buttons = selection.selectAll('.textButton')
        .data(childrenData)
        .enter()
        .append('div');

    buttons.style('position', 'absolute')
        .style('left', function (data) {
            var xPos = verticalBarXPos + barWidth;
            return xPos.toString() + 'px';
        }).style('top', function (data, index) {
            var height = index * heightBetweenChildren;
            var yPos = height + 8;
            return yPos.toString() + 'px';
        })
        .attr('class', 'textButton');

    addTextToButtons(buttons, svgContainer, tree);
    addIconToButtons(buttons, tree);
}

function addTextToButtons(buttons, svgContainer, tree) {
    var isAtSpeciesLevel = tree.isSpeciesLevel();

    var button = buttons.append('div')
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
        var width = Math.max(200, text.length * 15 + 20);
        return width.toString() + 'px';
    })

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
    console.log(childrenData);

    if (numChildren === 0) {
        addNoInformationAvailableText(childrenSelection);
    } else {
        childrenData = sortByNumberDescendants(childrenData);
        addHorizontalBars(childrenSelection, numChildren);
        addChildrenTextButton(childrenSelection, svgContainer, childrenData, tree);
    }
}

function addChildren(svgContainer, tree, children) {
    clearSvg(svgContainer);
    clearButtons();
    resizeSvg(svgContainer, children);
    addRootCircle(svgContainer, tree);
    addHorizontalLineFromCircle(svgContainer);
    addVerticalLine(svgContainer);
    addChildrenToSvg(svgContainer, tree, children);
}

var selection = d3.select("#speciesContainer");
var svgSelection = selection.append("svg")
    .attr('width', width)
    .attr('height', height);

var tree = new Tree();
tree.fetchBasicChildrenInformation(function (children) {
    addChildren(svgSelection, tree, children);
});
