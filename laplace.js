var width   = 800,
    height  = 500,
    colors  = d3.scale.linear()
    .domain([-1,0,1])
    .range(["red", "white", "blue"]);

var svg = d3.select('#canvas')
    .append('svg')
    .attr('width', width)
    .attr('height', height)

var nodes = [{'id': 0, 'd': -1}, {'id': 1, 'd': -1}, {'id': 2, 'd': -1}, 
	     {'id': 3, 'd': -1}, {'id': 4, 'd': -1}, {'id': 5, 'd': -1}, 
	     {'id': 6, 'd': -1}], 
    lastNodeId = 6,
    links = [{'source': 0, 'target': 1, 'd': 0},
	     {'source': 0, 'target': 2, 'd': 0},
	     {'source': 0, 'target': 3, 'd': 0},
	     {'source': 0, 'target': 4, 'd': 0},
	     {'source': 1, 'target': 5, 'd': 0},
	     {'source': 2, 'target': 5, 'd': 0},
	     {'source': 3, 'target': 6, 'd': 0},
	     {'source': 4, 'target': 6, 'd': 0}];

// D3 zoom
var zoom = d3.behavior.zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", zoomHandler);

function zoomHandler() {
    svg.attr("transform", 
	     "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
}
zoom(svg);

// init D3 force layout
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', tick)

// handles to link and node element groups
var path = svg.append('svg:g').selectAll('path'),
    circle = svg.append('svg:g').selectAll('g');

// mouse event vars
var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

function resetMouseVars() {
    mousedown_node = null;
    mouseup_node = null;
    mousedown_link = null;
}

var EVs   = [],
    evidx = 0;

function setEV() {
    if(EVs.length < 1 || nodes.length != EVs[evidx].length) return;

    for(i=0; i<nodes.length; i++) {
	nodes[i].d = EVs[evidx][nodes[i].id];
    }
};

function graphlaplacian() {
    // dense array
    var D = [];
    for(i = 0; i<nodes.length; i++) {
	D[i] = [];
	for(j = 0; j<nodes.length; j++) { 
	    D[i][j] = 0; 
	}
    }

    for(link in links) {
	e = links[link];

	// D diagonal has degrees
	D[e.source.id][e.source.id] += 1;
	D[e.target.id][e.target.id] += 1;

	// D off-diagonal has negative adjacency
	D[e.source.id][e.target.id] = -1;
	D[e.target.id][e.source.id] = -1;
    }

    EVs = numeric.eig(D).E.x;
    setEV();
    restart();
}

function nextEV() {
    evidx += 1;
    evidx = (evidx % nodes.length);
    setEV();
    restart();
}

function prevEV() {
    evidx -= 1;
    evidx = ((evidx+nodes.length) % nodes.length);
    setEV();
    restart();
}

// update force layout (called automatically each iteration)
function tick() {
    // draw directed edges with proper padding from node centers
    path.attr('d', function(d) {
	var deltaX = d.target.x - d.source.x,
            deltaY = d.target.y - d.source.y,
            dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
            normX = deltaX / dist,
            normY = deltaY / dist,
            sourcePadding = d.left ? 17 : 12,
            targetPadding = d.right ? 17 : 12,
            sourceX = d.source.x + (sourcePadding * normX),
            sourceY = d.source.y + (sourcePadding * normY),
            targetX = d.target.x - (targetPadding * normX),
            targetY = d.target.y - (targetPadding * normY);
	return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
    });

    circle.attr('transform', function(d) {
	return 'translate(' + d.x + ',' + d.y + ')';
    });
}

// update graph (called when needed)
function restart() {
    // path (link) group
    path = path.data(links);

    // update existing links
    path.classed('selected', function(d) { return d === selected_link; });

    // add new links
    path.enter().append('svg:path')
	.attr('class', 'link')
	.classed('selected', function(d) { return d === selected_link; })
	.on('mousedown', function(d) {
	    // select link
	    mousedown_link = d;
	    if(mousedown_link === selected_link) selected_link = null;
	    else selected_link = mousedown_link;
	    selected_node = null;
	    restart();
	});

    // remove old links
    path.exit().remove();

    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    circle = circle.data(nodes, function(d) { return d.id; });

    // update existing nodes (reflexive & selected visual states)
    circle.selectAll('circle')
	.style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.d)).brighter().toString() : colors(d.d); });

    // add new nodes
    var g = circle.enter().append('svg:g');
    
    g.append('svg:circle')
	.attr('class', 'node')
	.attr('r', 12)
	.style('fill', function(d) { 
	    return (d === selected_node) ? 
		d3.rgb(colors(d.d)).brighter().toString() : 
		colors(d.d); })
	.style('stroke', 'black')
	.on('mouseover', function(d) {
	    if(!mousedown_node || d === mousedown_node) return;
	    // enlarge target node
	    d3.select(this).attr('transform', 'scale(1.1)');
	})
	.on('mouseout', function(d) {
	    if(!mousedown_node || d === mousedown_node) return;
	    // unenlarge target node
	    d3.select(this).attr('transform', '');
	})
	.on('mousedown', function(d) {
	    if(d3.event.shiftKey) return;
	    
	    // select node
	    mousedown_node = d;
	    if(mousedown_node === selected_node) selected_node = null;
	    else selected_node = mousedown_node;
	    selected_link = null;
	    
	    restart();
	})
	.on('mouseup', function(d) {
	    if(!mousedown_node) return;
	    
	    // check for drag-to-self
	    mouseup_node = d;
	    if(mouseup_node === mousedown_node) { resetMouseVars(); return; }
	    
	    // unenlarge target node
	    d3.select(this).attr('transform', '');
	    
	    // add link to graph (update if exists)
	    // NB: links are strictly source < target; arrows separately specified by booleans
	    var source, target;
	    if(mousedown_node.id < mouseup_node.id) {
		source = mousedown_node;
		target = mouseup_node;
	    } else {
		source = mouseup_node;
		target = mousedown_node;
	    }
	    
	    var link;
	    link = links.filter(function(l) {
		return (l.source === source && l.target === target);
	    })[0];

	    if(!link) {
		link = {source: source, target: target};
		links.push(link);
	    }

	    // select new link
	    selected_link = link;
	    selected_node = null;
	    restart();
	});
    
    circle.exit().remove();

    force.start();
}

function mousedown() {
    // prevent I-bar on drag
    //d3.event.preventDefault();
    
    // because :active only works in WebKit?
    svg.classed('active', true);

    if(d3.event.shiftKey || mousedown_node || mousedown_link) return;

    // insert new node at point
    var point = d3.mouse(this),
	node = {id: ++lastNodeId};
    node.x = point[0];
    node.y = point[1];
    nodes.push(node);

    restart();
}

function mouseup() {
    // because :active only works in WebKit?
    svg.classed('active', false);

    // clear mouse event vars
    resetMouseVars();
}

function spliceLinksForNode(node) {
    var toSplice = links.filter(function(l) {
	return (l.source === node || l.target === node);
    });
    toSplice.map(function(l) {
	links.splice(links.indexOf(l), 1);
    });
}

// only respond once per keydown
var lastKeyDown = -1;

function keydown() {
    d3.event.preventDefault();
    
    if(lastKeyDown !== -1) { return; }
    lastKeyDown = d3.event.keyCode;

    console.log(lastKeyDown);

    // ctrl
    if(d3.event.keyCode === 16) {
	circle.call(force.drag);
	svg.classed('ctrl', true);
    }


    if(!selected_node && !selected_link) return;
    switch(d3.event.keyCode) {
    case 8: // backspace
    case 46: // delete
	if(selected_node) {
            nodes.splice(nodes.indexOf(selected_node), 1);
            spliceLinksForNode(selected_node);
	} else if(selected_link) {
            links.splice(links.indexOf(selected_link), 1);
	}
	selected_link = null;
	selected_node = null;
	restart();
	break;
    case 76: // L
	graphlaplacian();
	restart();
	break;
    case 80: // P
	prevEV();
	restart();
	break;
    case 79: // N
	nextEV();
	restart();
	break;
    }
}

function keyup() {
    lastKeyDown = -1;

    // ctrl
    if(d3.event.keyCode === 16) {
	circle
	    .on('mousedown.drag', null)
	    .on('touchstart.drag', null);
	svg.classed('ctrl', false);
    }
}

// app starts here
svg.on('mousedown', mousedown)
    .on('mouseup', mouseup);
d3.select(window)
    .on('keydown', keydown)
    .on('keyup', keyup);
restart();
