var bodySelection = d3.select("body");

var width = 1000;
var height = 500;

var rootCircleRadius = 30;
var rootCircleCenterXPos = 30;

var childCircleRadius = 20;

var verticalMargin = 30;

var horizontalOffset = 100;
var horizontalPos = rootCircleCenterXPos + rootCircleRadius + horizontalOffset;

var textOffset = 30;


var svgSelection = bodySelection.append("svg")
    .attr('width', width)
    .attr('height', height);

svgSelection.append('circle')
    .attr("cx", rootCircleCenterXPos)
    .attr("cy", height / 2)
    .attr("r", rootCircleRadius)
    .style("fill", "green");


svgSelection.append('line')
    .attr('x1', rootCircleCenterXPos + rootCircleRadius)
    .attr('y1', height / 2)
    .attr('x2', horizontalPos)
    .attr('y2', height / 2)
    .attr('stroke-width', 5)
    .attr('stroke', 'black');

svgSelection.append('line')
    .attr('x1', horizontalPos)
    .attr('y1', verticalMargin)
    .attr('x2', horizontalPos)
    .attr('y2', height - verticalMargin)
    .attr('stroke-width', 5)
    .attr('stroke', 'black');

function addChildren(svgContainer, children) {
    var numChildren = children.length;

    var circlesGroup = svgContainer.append('g');

    var circles = circlesGroup.selectAll('circle')
        .data(children)
        .enter()
        .append('circle');

    var num = 0;
    var remainingSpace = height - 2 * verticalMargin;

    var circleAttributes = circles
        .attr('cx', horizontalPos)
        .attr('cy', function (d) {
            console.log(d);
            var yOffset = num * (remainingSpace / (numChildren - 1));
            var yPos = verticalMargin + yOffset;
            num = num + 1;
            return yPos;
        })
        .attr('r', 20)
        .style('fill', 'green');

    //Add the SVG Text Element to the svgContainer
    var text = svgContainer.selectAll("text")
        .data(children)
        .enter()
        .append("text");

    var num = 0;
    var textLabels = text
        .attr('x', horizontalPos + textOffset)
        .attr('y', function (d) {
            console.log(d);
            var yOffset = num * (remainingSpace / (numChildren - 1));
            var yPos = verticalMargin + yOffset;
            num = num + 1;
            return yPos;
        })
        .text(function (d) {
            return d.key.toString() + ' : ' + d.scientificName;
        })
        .attr('font-family', 'sans-serif')
        .attr('font-size', '20px')
        .attr('fill', 'red');

}

//tree.fetchChildren(addChildren);
var data = [{
    'key': 10,
    'scientificName': 'Bob'
}, {
    'key': 20,
    'scientificName': 'Joe'
}, {
    'key': 30,
    'scientificName': 'Jim'
}, {
    'key': 40,
    'scientificName': 'What the hell is this? You should do something else, Gregory!'
}];

var tree = new Tree();
tree.fetchChildren(function (children) {
    addChildren(svgSelection, children);
});
//addChildren(svgSelection, data);
