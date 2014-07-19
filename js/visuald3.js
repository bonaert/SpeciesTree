var width = 1000;
var height = 500;

var rootCircleRadius = 30;
var rootCircleCenterXPos = 30;

var childCircleRadius = 20;

var verticalMargin = 30;

var horizontalOffset = 100;
var verticalBarXPos = rootCircleCenterXPos + rootCircleRadius + horizontalOffset;

var textOffset = 30;
var barWidth = 100;

// Distance between two children
var heightBetweenChildren = 100;

function capitalise(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getName(data) {
    return data.vernacularName || data.canonicalName || data.scientificName || "Error: could not find name";
}

function getScientificName(data) {
    var name = data.scientificName;

    // Used when name has date and scientist attached
    if (typeof data.authorship !== "undefined") {
        if (data.authorship === "") {
            return name;
        }

        var index = name.indexOf(data.authorship);
        if (index !== -1) {
            // remove the space before the name too
            return name.substring(0, index - 1);
        }
    }

    return name;
}


function showInformation(data) {
    adjustInfoContainerWidth();

    // Remove existing data, if it exists
    d3.select('#speciesData').remove();

    var infoSelection = d3.select('#infoContainer');
    var divSelection = infoSelection.append('div').attr('id', 'speciesData').attr('class', 'verticalLine');

    showWikipediaInformation(data);

}

function putLoader(divSelection) {
    divSelection.append('div').attr('class', 'ui active inline loader').attr('id', 'loader');
}

function removeLoader(divSelection) {
    divSelection.select('#loader').remove();
}

function adjustInfoContainerWidth() {
    var speciesContainer = d3.select('#speciesContainer');
    var infoSelection = d3.select('#infoContainer');

    // Resize both to occupy half of the page
    speciesContainer.style('width', '400px');
    infoSelection.style('width', 'calc(100% - 500px)');
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

function showWikipediaInformation(data) {
    var divSelection = d3.select('#speciesData');
    putLoader(divSelection);

    var wiki = new Wikipedia();
    var name = getScientificName(data);
    wiki.article(name, function (data) {
        var title = data.title;
        var content = data.extract;
        var content = removeWikiCruft(content);

        removeLoader(divSelection);
        divSelection.append('h1').attr('class', 'header').text(title);
        divSelection.append('div').attr('id', 'content').html(content);

        wiki.image(name, function (imagesData) {
            var url = chooseImage(imagesData);
            divSelection.insert('img', '#content').attr('src', url).attr('alt', 'image').attr('class', 'ui huge image');
        });
    });
}

function chooseImage(imagesData) {
    for (var i = 0; i < imagesData.length; i++) {
        var image = imagesData[i];
        var title = image.title;

        if (title.indexOf("logo") !== -1) {
            continue;
        } else if (title.indexOf("Red Pencil") !== -1) {
            continue;
        } else if (title.indexOf("Wikibooks") !== -1) {
            continue;
        }

        var url = image.imageinfo[0].url;
        return url;
    }
}

function showChildren(data, svgContainer, tree) {
    console.log(data);

    var speciesContainer = d3.select('#speciesContainer');
    var infoSelection = d3.select('#infoContainer');
    d3.select('#speciesData').remove();

    // Resize both to occupy half of the page
    speciesContainer.style('width', 'calc(100%)');
    infoSelection.style('width', '0px');

    tree.setRootToChild(data.id);
    tree.fetchBasicChildrenInformation(function (children) {
        addChildren(svgContainer, tree, children);
    });
}

function clearSvg(svgContainer) {
    svgContainer.selectAll('g').remove();
    svgContainer.selectAll('circle').remove();
    svgContainer.selectAll('image').remove();
    svgContainer.selectAll('line').remove();
}

function resizeSvg(svgContainer, children) {
    resizeSvgHeight(svgContainer, children);
}

function resizeSvgHeight(svgContainer, children) {

    // Distance between two children
    console.log((children.length - 1) * heightBetweenChildren);
    var contentHeight = Math.max(500, (children.length - 1) * heightBetweenChildren);
    var marginHeight = 2 * verticalMargin;
    height = contentHeight + marginHeight;
    svgContainer.attr('height', height);
}

function addRootCircle(svgContainer) {
    var height = svgContainer.attr('height');

    svgSelection.append('circle')
        .attr("cx", rootCircleCenterXPos)
        .attr("cy", height / 2)
        .attr("r", rootCircleRadius)
        .style("fill", "green");
}

function addHorizontalLineFromCircle(svgContainer) {
    var height = svgContainer.attr('height');

    svgSelection.append('line')
        .attr('x1', rootCircleCenterXPos + rootCircleRadius)
        .attr('y1', height / 2)
        .attr('x2', verticalBarXPos)
        .attr('y2', height / 2)
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

function addCircles(childrenSelection, childrenData, tree) {
    var circles = childrenSelection.selectAll('image')
        .data(childrenData)
        .enter()
        .append('image');

    var num = 0;
    var remainingSpace = height - 2 * verticalMargin;

    var circleAttributes = circles
        .attr('x', verticalBarXPos + barWidth - 10)
        .attr('y', function (data, index) {
            var height = index * heightBetweenChildren;
            var yPos = height + verticalMargin - 15;
            return yPos;
        })
        .attr('height', 30)
        .attr('width', 30)
        .attr('xlink:href', 'image/info.png')
        .on("click", showInformation);
}

function addText(svgContainer, tree, childrenSelection, childrenData) {
    var text = childrenSelection.selectAll("text")
        .data(childrenData)
        .enter()
        .append("text");

    var textAttributes = text
        .attr('x', verticalBarXPos + barWidth + textOffset)
        .attr('y', function (data, index) {
            var height = index * heightBetweenChildren;
            var textAdjustment = 6;
            var yPos = height + verticalMargin + textAdjustment;
            return yPos;
        })
        .text(function (data) {
            return capitalise(getName(data));
        })
        .attr('font-family', 'sans-serif')
        .attr('font-size', '20px')
        .attr('fill', 'rgb(83, 83, 83)')
        .on('click', function (data) {
            showChildren(data, svgContainer, tree);
        });;
}

function addChildrenToSvg(svgContainer, tree, childrenData) {
    var childrenSelection = svgContainer.append('g').attr('id', 'childrenGroup');
    var numChildren = childrenData.length;

    addHorizontalBars(childrenSelection, numChildren);
    addCircles(childrenSelection, childrenData, tree);
    addText(svgContainer, tree, childrenSelection, childrenData);
}

function addChildren(svgContainer, tree, children) {
    clearSvg(svgContainer)
    resizeSvg(svgContainer, children);
    addRootCircle(svgContainer);
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
