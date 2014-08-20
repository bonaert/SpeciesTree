/*jslint browser: true, devel: true, nomen: true, sloppy: true */
var buttonRadius = 30;
var rootCircleCenterXPos = 5;
var rootBottom = 80;

var verticalBarOffset = 100;
var verticalMargin = 30;

var horizontalOffset = 20;
var verticalBarXPos = rootCircleCenterXPos + buttonRadius + horizontalOffset;

var barWidth = 20;

// Distance between two children
var heightBetweenChildren = 100;


function getName(data) {
    return data.vernacularName || data.canonicalName || data.scientificName;
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


function SpeciesGraph(tree) {
    var self = this;
    this.tree = tree;
    this.height = 500;
    var speciesContainerSelection,
        svgSelection,
        childrenSelection;

    this.setUp = function (page) {
        self.page = page;
        self.speciesContainerSelection = d3.select("#speciesContainer");

        var width = Math.min(1000, $(window).width());

        self.svgSelection = self.speciesContainerSelection.append("svg")
            .attr('width', width)
            .attr('height', self.height);

    };

    this.resizeSvg = function (numChildren) {
        self.resizeSvgHeight(numChildren);
    };

    this.resizeSvgHeight = function (numChildren) {
        // Distance between two children
        var contentHeight = Math.max(2 * buttonRadius, (numChildren - 1) * heightBetweenChildren);
        var marginHeight = 2 * verticalMargin + verticalBarOffset;

        self.height = contentHeight + marginHeight;
        self.svgSelection.attr('height', self.height);
    };

    this.clearSvg = function () {
        self.svgSelection.selectAll('g').remove();
        self.svgSelection.selectAll('circle').remove();
        self.svgSelection.selectAll('image').remove();
        self.svgSelection.selectAll('line').remove();
    };


    this.addVerticalLine = function () {
        var height = self.svgSelection.attr('height');

        self.svgSelection.append('line')
            .attr('x1', verticalBarXPos)
            .attr('y1', rootBottom)
            .attr('x2', verticalBarXPos)
            .attr('y2', height - verticalMargin)
            .attr('stroke-width', 5)
            .attr('stroke', 'black');
    };

    this.addRoot = function () {
        self.clearSvg();
        self.clearButtons();
        self.addRootCircle();
        self.putChildrenLoader();
    };

    this.clearButtons = function () {
        d3.selectAll('.textButton').remove();
        d3.select('#rootButton').remove();
    };

    this.addRootCircle = function () {
        var rootCircleDivSelection = self.createRootCircleDiv();
        var buttonSelection = self.createRootButton(rootCircleDivSelection);

        if (self.tree.isAtKingdomLevel()) {
            buttonSelection.attr('class', 'active big ui red button').text('Life');
        } else {
            var name = getName(self.tree.root);
            buttonSelection.attr('class', 'big ui red icon button').text(name);
            buttonSelection.append('i').attr('class', 'level up icon');

            self.createRootInformationButton(rootCircleDivSelection);
        }
    };

    this.createRootCircleDiv = function () {
        return self.speciesContainerSelection
            .append('div')
            .style('position', 'absolute')
            .style("left", rootCircleCenterXPos.toString() + 'px')
            .style("top", verticalMargin.toString() + 'px')
            .attr('id', 'rootButton');
    };

    this.createRootButton = function (rootCircleDivSelection, data) {
        return rootCircleDivSelection
            .append('div')
            .on("click", function () {
                var parent = self.tree.getParent();
                self.page.showChildren(parent);
            });
    };

    this.createRootInformationButton = function (rootCircleDivSelection) {
        return rootCircleDivSelection.append('div')
            .attr('class', 'big ui green icon button')
            .on("click", function () {
                self.page.showInformation(self.tree.root, true);
            })
            .append('i')
            .attr('class', 'icon info letter');

    };

    this.putChildrenLoader = function () {
        var xPos = verticalBarXPos + barWidth;
        var yPos = verticalBarOffset + 100;

        self.speciesContainerSelection.append('div')
            .attr('class', 'ui active large inline loader')
            .style('position', 'absolute')
            .style('left', xPos.toString() + 'px')
            .style('top', yPos.toString() + 'px')
            .attr('id', 'graphLoader')
    };

    this.removeChildrenLoader = function () {
        d3.select('#graphLoader').remove();
    };

    this.addChildren = function (children) {
        self.removeChildrenLoader();
        self.resizeSvg(children.length);
        self.addVerticalLine();
        self.addChildrenToSvg(children);
    };

    this.addChildrenToSvg = function (childrenData) {
        self.childrenSelection = self.svgSelection.append('g').attr('id', 'childrenGroup');
        var numChildren = childrenData.length;

        if (numChildren === 0) {
            self.addNoInformationAvailableText();
        } else {
            childrenData = self.sortByNumberDescendants(childrenData);
            self.addHorizontalBars(numChildren);
            self.addChildrenTextButton(childrenData);
        }
    };

    this.addNoInformationAvailableText = function () {
        var text;
        if (self.tree.isAtSubSpeciesLevel) {
            text = "No subspecies found";
        } else {
            text = "No available information";
        }

        self.childrenSelection.append('text')
            .attr('x', verticalBarXPos + 10)
            .attr('y', verticalMargin + verticalBarOffset + 35)
            .text(text)
            .attr('font-family', 'sans-serif')
            .attr('font-size', '20px')
            .attr('fill', 'rgb(83, 83, 83)')
    };

    this.sortByNumberDescendants = function (childrenData) {
        return childrenData.sort(function (a, b) {
            var keyA = a.numDescendants || 0,
                keyB = b.numDescendants || 0;
            // Compare the 2 dates
            if (keyA > keyB) return -1;
            if (keyA < keyB) return 1;
            return 0;
        });
    };

    this.addHorizontalBars = function (numChildren) {
        for (var i = 0; i < numChildren; i++) {
            var height = i * heightBetweenChildren;
            var yPos = verticalMargin + verticalBarOffset + height;


            self.childrenSelection.append('line')
                .attr('x1', verticalBarXPos)
                .attr('y1', yPos)
                .attr('x2', verticalBarXPos + barWidth)
                .attr('y2', yPos)
                .attr('stroke-width', 5)
                .attr('stroke', 'black');
        }
    };

    this.addChildrenTextButton = function (childrenData) {
        var buttons = self.speciesContainerSelection.selectAll('.textButton')
            .data(childrenData)
            .enter()
            .append('div');

        var xPos = verticalBarXPos + barWidth;
        buttons.style('position', 'absolute')
            .style('left', xPos.toString() + 'px')
            .style('top', function (data, index) {
                var height = index * heightBetweenChildren + verticalBarOffset + 8;
                return height.toString() + 'px';
            })
            .attr('class', 'textButton');


        var width = $(window).width();
        var size;
        if (width > 1000) {
            size = "";
        } else {
            size = "small"
        }
        self.addTextToButtons(buttons, size);
        self.addIconToButtons(buttons, size);
    };

    this.addTextToButtons = function (buttons, size) {
        var isAtSubSpeciesLevel = self.tree.isAtSubSpeciesLevel();

        var button = buttons.append('div');
        if (isAtSubSpeciesLevel) {
            button.attr('class', 'ui active blue ' + size + ' button');
        } else {
            button.attr('class', 'ui blue labeled icon ' + size + ' button');
            button.on('click', function (data) {
                self.page.showChildren(data, self.svgSelection, self.tree);
            });
        }


        button.text(function (data) {
            var text = getName(data);
            return toTitleCase(text);
        }).style('width', function (data) {
            var text = getName(data);
            var width = Math.max(200, text.length * 12 + 100);
            return width.toString() + 'px';
        });

        if (!isAtSubSpeciesLevel) {
            button.append('i').attr('class', 'level down icon');
        }
    };

    this.addIconToButtons = function (buttons, size) {
        buttons.append('div')
            .attr('class', 'ui green icon ' + size + ' button')
            .on("click", function (data) {
                self.page.showInformation(data, true);
            })
            .append('i')
            .attr('class', 'icon info letter');
    };

};

function InformationPane() {
    var self = this;
    this.wiki = new Wikipedia();

    var paneSelection,
        speciesInformationSelection,
        sidebarExists;

    this.MAX_IMAGE_SIZE = 5000000;
    this.MIN_IMAGE_SIZE = 40000;

    var wikipediaImages = ['logo', 'red pencil', 'wikibooks', 'feature', 'star', 'symbol', 'vote', 'icon', 'question_book', 'disamb', 'edit', 'ambox', 'wiki_letter', 'speakerlink', 'padlock'];
    var portalImages = ['caribou from wagon trails', 'rose amber', 'france loiret', 'Leaf_1_web', 'Martinique.web', 'Tiger_in_the_water'];
    var unwantedImages = ['map'];
    this.filterList = _.union(wikipediaImages, portalImages, unwantedImages);

    this.setUp = function (page) {
        self.page = page;

        var windowWidth = $(window).width();
        if (windowWidth > 1000) {
            self.addSidebar();
            self.addSpeciesDataContainer();
            self.sidebarExists = true;

            self.page.adjustHeaderWidth(windowWidth);
        } else {
            self.addSegment();
        }
    };

    this.resetInformationPanel = function () {
        self.removeInformationPanelContent();
        self.addRemoveIconToInformationPanel();
        self.addSpeciesDataContainer();

        if (self.sidebarExists) {
            self.showSidebar();
        }
    };

    this.collapseInformationPanel = function () {
        self.setInformationPaneDatum([0, false]);
        self.removeInformationPanelContent();
        if (self.sidebarExists) {
            self.hideSidebar();
        } else {
            self.page.scrollToTop();
        }
    };

    this.removeInformationPanelContent = function () {
        d3.selectAll('#speciesData').remove();
        d3.selectAll('#removeIcon').remove();

        self.speciesInformationSelection = undefined;
    };

    this.addRemoveIconToInformationPanel = function () {
        self.paneSelection.append('div')
            .attr('class', 'ui black icon button')
            .attr('id', 'removeIcon')
            .style('margin-top', '20px')
            .style('margin-left', '10px')
            .on('click', self.collapseInformationPanel)
            .append('i')
            .attr('class', 'remove icon');
    };

    this.addSpeciesDataContainer = function () {
        self.speciesInformationSelection = self.paneSelection.append('div').attr('id', 'speciesData');
    };

    this.addSidebar = function () {
        self.paneSelection = d3.select('#contentDiv')
            .insert('div', '#speciesContainer')
            .attr('id', 'infoContainer')
            .attr('class', 'ui right very wide sidebar verticalLine')
            .attr('style', 'margin-top: 58px !important;');
    };

    this.addSegment = function () {
        self.paneSelection = d3.select('#contentDiv')
            .insert('div', '.ui.segment')
            .attr('id', 'infoContainer');
    };

    this.showInformation = function (data, scrollToInformationPanel) {
        // Do not show information for life
        // Todo: why not?
        if (data.id === 0) {
            return;
        }

        self.resetInformationPanel();
        self.showWikipediaInformation(data, scrollToInformationPanel);
    };

    this.showWikipediaInformation = function (nodeData, scrollToInformationPanel) {
        self.putWikipediaInfoLoader();

        var speciesName = getScientificName(nodeData);
        var commonName = getCommonName(nodeData);
        var ID = nodeData.id;

        self.wiki.article(commonName, speciesName, function (wikiData) {
            self.removeWikipediaInfoLoader();

            if (wikiData) {
                // Todo: what is this? can we improve it
                self.setInformationPaneDatum([ID, true]);


                self.addWikipediaTextToSelection(nodeData, wikiData);
                if (!self.sidebarExists && scrollToInformationPanel) {
                    self.scrollToInformationPane();
                }

                self.addWikipediaImage(wikiData.rank, commonName, speciesName);
            } else {
                // Todo: what is this? can we improve it
                self.setInformationPaneDatum([ID, false]);


                self.addNoAvailableInformationText();
            }
        });
    };

    // The info panel can be a sidebar if the window width is large enough
    // If it is, we use some animations.
    this.scrollToInformationPane = function () {
        var informationPane = $('#infoContainer');
        $('html,body').animate({
            scrollTop: informationPane.offset().top
        });
    };

    this.addWikipediaImage = function (rank, commonName, speciesName) {
        self.wiki.image(commonName, speciesName, function (imagesData) {
            var url = self.chooseImage(imagesData || []);
            if (url) {
                self.addWikipediaImageToSelection(commonName, speciesName, rank, url);
            }
        });
    };

    this.addWikipediaImageToSelection = function (commonName, speciesName, rank, url) {
        self.speciesInformationSelection.insert('img', '#content')
            .attr('src', url)
            .attr('alt', commonName + ' - ' + speciesName + ' (' + rank + ')')
            .attr('class', 'ui huge image');
    };

    this.addWikipediaTextToSelection = function (nodeData, wikiData) {
        var title = wikiData.title;
        var raw_content = wikiData.extract;
        var content = self.removeWikiCruft(raw_content);

        // Add title
        var titleText = title + " (" + nodeData.rank + ')';
        self.speciesInformationSelection.append('h1')
            .attr('class', 'header')
            .text(titleText);

        // Add content
        self.speciesInformationSelection.append('div')
            .attr('id', 'content')
            .style('padding-left', '10px')
            .html(content);
    };

    this.addNoAvailableInformationText = function (divSelection) {
        self.speciesInformationSelection.append('h1').text('No available information');
    };

    this.removeWikiCruft = function (text) {
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
    };


    this.chooseImage = function (imagesData) {
        for (var i = 0; i < imagesData.length; i++) {
            var image = imagesData[i];

            var title = image.title;

            var info = image.imageinfo[0];
            var mime = info.mime;
            var url = info.url;
            var size = info.size;

            // For unwanted images, such as wikipedia icons, portal images and some maps
            if (containsAny(title, self.filterList) || containsAny(url, self.filterList)) {
                continue;
            } else if (mime.indexOf('application') !== -1 || mime.indexOf('tif') !== -1) {
                continue;
            }

            // Giant image or icon
            if (size >= self.MAX_IMAGE_SIZE || size <= self.MIN_IMAGE_SIZE) {
                continue;
            }

            return url;
        }
    };

    this.putWikipediaInfoLoader = function () {
        var div = self.speciesInformationSelection
            .append('div')
            .attr('id', 'infoLoader')
            .style('width', '50%')
            .style('margin', '0 auto');

        div.append('div').attr('class', 'ui large active inline loader');
        div.append('b').style('margin-left', '20px').text('Fetching information...');
    };

    this.removeWikipediaInfoLoader = function () {
        d3.select('#infoLoader').remove();
    };

    this.showSidebar = function () {
        $('.sidebar').sidebar('show');
    };

    this.hideSidebar = function () {
        $('.sidebar').sidebar('hide');
    };

    this.setInformationPaneDatum = function (value) {
        // Binds data to the information pane. The data is [id, has_wikipedia_content]. This allows us
        // to avoid reloading data when we go into sublevel if information pane has already the correct data.
        self.paneSelection.datum(value);
    };

    this.getInformationPaneDatum = function () {
        return self.paneSelection.datum() || [-1, false];
    };
}

function SearchZone() {
    var self = this;

    var searchResults,
        resultList;

    this.searchInput = d3.select('#searchInput');
    this.searchIcon = d3.select('#searchIcon');

    this.setUp = function (page) {
        self.page = page;
        self.searchResults = d3.select('#searchResults');

        self.searchIcon.on('click', function () {
            var searchText = self.searchInput.property('value');
            if (searchText) {
                self.search(searchText);
            }
        });

        self.searchIcon.on('touchstart', function () {
            var searchText = self.searchInput.property('value');
            if (searchText) {
                self.search(searchText);
            }
        });

        self.searchInput.on('keydown', function () {
            var keyCode = d3.event.which || d3.event.keyCode;
            if (keyCode !== 13) {
                return;
            }
            var searchText = self.searchInput.property('value');
            if (searchText) {
                self.search(searchText);
            }
        })
    };

    this.search = function (text) {
        var url = encodeURI('getData?name=' + text);
        self.clearPreviousResults();
        self.putSearchLoader();
        $.getJSON(url, function (data) {
            if (data.length > 0) {
                self.processSearch(data);
            } else {
                self.processSearch(undefined);
            }
        });
    };

    this.processSearch = function (results) {
        self.removeSearchLoader();
        if (results) {
            results = self.fixRanks(results);
            var sortedResults = self.sortSearchResults(results);
            self.addNewResults(sortedResults);
        } else {
            self.addNoResultFoundText();
        }
    };

    this.sortSearchResults = function (results) {
        return results.sort(function (a, b) {
            var aID = self.getRankID(a),
                bID = self.getRankID(b);
            if (aID > bID) return 1;
            else if (aID < bID) return -1;
            else return 0
        });
    };

    this.putSearchLoader = function () {
        var div = self.searchResults
            .append('div')
            .attr('id', 'searchLoader')
            .style('margin-top', '20px');

        div.append('div').attr('class', 'ui large active inline loader');
        div.append('b').style('margin-left', '20px').text('Fetching information...');
    };

    this.removeSearchLoader = function () {
        d3.select('#searchLoader').remove();
    };

    this.getRank = function (result) {
        if (result.rank) {
            return result.rank.toLowerCase()
        } else {
            var levels = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];
            for (var i = levels.length - 1; i >= 0; i--) {
                if (_.has(result, levels[i])) {
                    return levels[i];
                }
            }

            return 'unknown'
        }
    };

    this.getRankID = function (result) {
        var levels = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];
        if (result.rank) {
            return levels.indexOf(result.rank.toLowerCase()) + 1;
        } else {
            for (var i = levels.length - 1; i >= 0; i--) {
                if (_.has(result, levels[i])) {
                    return i + 1;
                }
            }

            throw new Error('Cannot find id');
        }
    };

    this.clearPreviousResults = function () {
        if (self.resultList) {
            self.resultList.remove();
        }
    };

    this.fixRanks = function (results) {
        _.each(results, function (result) {
            result.rank = self.getRank(result);
        });

        return results;
    };

    this.addNewResults = function (results) {
        self.resultList = self.searchResults
            .append('ul')
            .attr('id', 'resultsList');

        self.resultList.selectAll('li')
            .data(results)
            .enter()
            .append('li')
            .append('a')
            .on('click', function (data) {
                self.clearPreviousResults();
                self.page.showChildren(data)
            })
            .text(function (result) {
                var name = result.vernacularName || result.canonicalName;
                return toTitleCase(name) + ' (' + result.rank + ')';
            });
    };

    this.addNoResultFoundText = function () {
        self.resultList = self.searchResults
            .append('ul')
            .attr('id', 'resultsList');

        self.resultList.append('li')
            .text('No results');
    };
}

function Page() {
    var self = this;

    this.tree = new Tree();
    this.speciesGraph = new SpeciesGraph(this.tree);
    this.search = new SearchZone();
    this.informationPane = new InformationPane();

    this.setUp = function () {
        self.speciesGraph.setUp(this);
        self.search.setUp(this);
        self.informationPane.setUp(this);

        var windowWidth = $(window).width();
        if (windowWidth > 1000) {
            self.adjustPadding();
        }


    };

    this.adjustPadding = function () {
        d3.select('#contentDiv').style('padding', '2em 2em 8em !important')
            .style('margin-left', '20px');
    };

    this.start = function () {
        self.updateState({
            id: 0
        }, 0);
        self.speciesGraph.addRoot();
        self.tree.fetchBasicChildrenInformation(function (children) {
            self.speciesGraph.addChildren(children);
            showTour();
        });

        // Bind to StateChange Event
        History.Adapter.bind(window, 'statechange', function () { // Note: We are using statechange instead of popstate
            var state = History.getState(); // Note: We are using History.getState() instead of event.state
            var data = state.data;


            // When we are at the root, we should go to the previous page, exiting our website
            if (_.isUndefined(data.id)) {
                History.back();
                return;
            }

            // When we change with button, we don't want to repeat the ShowChildren method
            // When we use the back button, this will active, otherwise not, because the tree
            // ID will already be correct and there is no need to update the children
            if (data.id !== self.tree.rootID) {
                self.showChildren(data);
            }
        });
    };

    this.showInformation = function (data, scrollToInformationPanel) {
        self.informationPane.showInformation(data, scrollToInformationPanel)
    };

    this.updateState = function (data, ID) {
        var name = getName(data);
        var title;
        if (_.isUndefined(name)) {
            title = "Specio - Explore the tree of life";
        } else {
            title = "Specio - " + toTitleCase(getName(data));
        }

        var previousState = self.getPreviousState();
        if (previousState.data.id === ID) {
            History.back();
        } else {
            History.pushState(data, title, "?id=" + ID.toString());
        }

    };

    this.adjustHistory = function (data, ID) {
        var state = History.getState();
        var isCorrectState = state.data.id === self.tree.rootID;
        if (!isCorrectState) {
            self.updateState(data, ID);
        }
    };

    this.getPreviousState = function () {
        var currentIndex = History.getCurrentIndex();
        return History.getStateByIndex(currentIndex - 1);
    };


    this.showChildren = function (data) {
        var ID = data.id;
        console.log(History.getCurrentIndex());

        if (self.tree.isParent(ID)) {
            self.expandSuperTree(data, ID);
            return;
        }

        if (self.tree.isChild(ID)) {
            self.tree.setRootToChild(ID);
        } else {
            self.tree.setRoot(ID, data);
        }

        // History state should always be updated after correcting the root
        self.updateState(data, ID);


        var informationPaneDatum = self.informationPane.getInformationPaneDatum();
        var currentSpeciesID = informationPaneDatum && informationPaneDatum[0],
            wikipediaHasInformation = informationPaneDatum[1];
        if (currentSpeciesID !== ID || !wikipediaHasInformation) {
            self.scrollToTop();
            self.informationPane.hideSidebar();
        }

        self.speciesGraph.addRoot();

        self.tree.fetchBasicChildrenInformation(function (children) {
            self.speciesGraph.addChildren(children);
            self.informationPane.showInformation(data, false);
        });
    };

    this.expandSuperTree = function (data, ID) {
        if (self.tree.isAtKingdomLevel()) {
            console.info("Reached kingdom level. Can't go up.");
            return;
        }

        self.informationPane.removeInformationPanelContent();
        self.informationPane.hideSidebar();
        self.scrollToTop();

        self.tree.setRootToParent();

        // History state should always be updated after correcting the root
        self.adjustHistory(data, ID);


        self.speciesGraph.addRoot();

        self.tree.fetchBasicChildrenInformation(function (children) {
            self.speciesGraph.addChildren(children);
        });
    };

    this.adjustHeaderWidth = function (windowWidth) {
        // This is called by the information pane when creating a sidebar
        // I chose to put it here because it seems to be more about the page
        // than the information pane.
        d3.select('#headerMenu')
            .attr('style', 'width: ' + windowWidth.toString() + 'px !important;');
    };

    this.scrollToTop = function () {
        $('html, body').animate({
            scrollTop: 0
        }, 'fast');
    }
}

var page = new Page();
page.setUp();
page.start();

function showTour() {
    if (!hasDoneTour()) {
        startTour();
        setTourDoneFlag();
    }
}

function startTour() {
    var introguide = introJs();

    introguide.setOptions({
        steps: [
            {
                //element: '#pageHeader',
                intro: 'This guided tour will explain the Specio interface.' +
                    '<br><br>Use the arrow keys for navigation or hit ESC to exit the tour immediately.',
                position: 'bottom'
            },
            {
                element: '.ui.green.icon',
                intro: 'Click here to see information about a group (e.g. See info about Animals).',
                position: 'left'
            },
            {
                element: '.ui.blue.labeled.icon',
                intro: "Click here to go to a subgroup (e.g. Go from the Life group to Animals group).",
                position: 'top'
            },
            {
                element: '#searchDiv',
                intro: 'You can also search for a specific species. Try Human!<br><br>' +
                    '<div style="color: lightcoral">The database is still incomplete, so there may be a lack of results.</div>',
                position: 'bottom'
            },
            {
                element: '.help.icon',
                intro: "To see the tour again, press this button.",
                position: 'bottom'
            },
            {
                //element: '#pageHeader',
                intro: "That's was it (it's very simple)! Enjoy the site.",
                position: 'bottom'
            }
        ]
    });

    introguide.start();
}

function hasDoneTour() {
    return localStorage.getItem('species-explorer-tour-is-done') === 'true';
}

function setTourDoneFlag() {
    localStorage.setItem('species-explorer-tour-is-done', 'true')
}
