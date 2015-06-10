var blessed = require('blessed'),
contrib = require('../dash/node_modules/blessed-contrib'),
_ = require('lodash'),
moment = require('moment');

var screen = blessed.screen();
var grid = new contrib.grid({rows: 12, cols: 12, screen: screen});

var usedGauge = grid.set(0, 6, 2, 2, contrib.gauge, {label: 'Free Percent', 'stroke': 'cyan','fill':'cyan'});
var totalOsd = grid.set(0, 8, 2, 2, contrib.lcd, {label: 'Total OSD', 'stroke': 'cyan','fill':'cyan'});
var upOsd = grid.set(0, 10, 2, 2, contrib.lcd, {label: 'Up OSD'});

var bytesIOLine = grid.set(0, 0, 7, 6, contrib.line, {
	showNthLabel: 5,
	maxY: 300,
	label: 'MegaBytes/s',
	showLegend: true,
	legend: {width: 10}
});

var IOPSLine = grid.set(7, 0, 5, 6, contrib.line, {
	showNthLabel: 5,
	maxY: 1000,
	label: 'IOPs',
	showLegend: true,
	legend: {width: 10}
});

var table =  grid.set(2, 6, 4, 6, contrib.table, {
	keys: true,
	fg: 'green',
	label: 'Active BackupSets',
	columnSpacing: 2,
	columnWidth: [16, 48]
});

var pgbar = grid.set(6, 6, 6, 6, contrib.bar, {
	label: 'Placement Group States',
	barWidth: 6,
	barSpacing: 6,
	xOffset: 0,
	maxHeight: 9
});

var clientWriteIO = {
	title: 'ClientWrite',
	style: {line: 'yellow'},
	x: [],
	y: []
};

var clientReadIO = {
	title: 'ClientRead',
	style: {line: 'red'},
	x: [],
	y: []
};

var recoveryWriteIO = {
	title: 'Recovery',
	style: {line: 'cyan'},
	x: [],
	y: []
};

var clientIO = {
	title: 'ClientTotal',
	style: {line: 'white'},
	x: [],
	y: []
};

var clientIops = {
	title: 'Client',
	style: {line: 'green'},
	x: [],
	y: []
};

var recoveryIops = {
	title: 'Recovery',
	style: {line: 'cyan'},
	x: [],
	y: []
};

function setIOData(pgstats){
	var now = moment().format('mm:ss');

	if (clientWriteIO.y.length > 40){
		clientWriteIO.x.shift();
		clientWriteIO.y.shift();
		clientReadIO.x.shift();
		clientReadIO.y.shift();
		recoveryWriteIO.x.shift();
		recoveryWriteIO.y.shift();
		clientIO.x.shift();
		clientIO.y.shift();
		recoveryIops.x.shift();
		recoveryIops.y.shift();
		clientIops.x.shift();
		clientIops.y.shift();
	}

	clientWriteIO.x.push(now);
	clientReadIO.x.push(now);
	recoveryWriteIO.x.push(now);
	clientIO.x.push(now);
	clientIops.x.push(now);
	recoveryIops.x.push(now);

	var read_bytes_sec_mb = parseFloat(pgstats.read_bytes_sec / (1024*1024)).toFixed(2);
	var write_bytes_sec_mb = parseFloat(pgstats.write_bytes_sec / (1024*1024)).toFixed(2);

	var recovery_bytes_sec_mb = 0;

	if (pgstats.recovering_bytes_per_sec)
		recovery_bytes_sec_mb = parseFloat(pgstats.recovering_bytes_per_sec / (1024*1024)).toFixed(2);

	clientWriteIO.y.push(write_bytes_sec_mb);
	clientReadIO.y.push(read_bytes_sec_mb);
	recoveryWriteIO.y.push(recovery_bytes_sec_mb);
	clientIO.y.push(parseInt(read_bytes_sec_mb) + parseInt(write_bytes_sec_mb));
	clientIops.y.push(pgstats.op_per_sec);
	if (pgstats.recovering_objects_per_sec)
		recoveryIops.y.push(pgstats.recovering_objects_per_sec);
	else
		recoveryIops.y.push(0);
	bytesIOLine.setData([clientWriteIO, clientReadIO, recoveryWriteIO, clientIO]);
	IOPSLine.setData([clientIops,recoveryIops]);
}

function truncateStateName(n){
	var name = "";
	_.each(n.split("+"), function(v, i){
		var plus = "";
		if (name.length > 0) plus = '+';
		name += v.split("")[0].toString().toUpperCase();
	});
	return name;
}

function updatePgStates(pgstats){
	var total = pgstats.num_pgs;
	var states = [];
	var titles = [];
	_.each(pgstats.pgs_by_state, function(v, i){
		states.push(v.count);
		titles.push(truncateStateName(v.state_name));
	});

	pgbar.setData({
		titles: titles,
		data: states
	});
}

function setAvailabilityData(pgstats){
	var totalGb = (pgstats.bytes_total / (1024*1024*1024)).toFixed(2);
	var usedGb = (pgstats.bytes_used / (1024*1024*1024)).toFixed(2);
	var availGb = (pgstats.bytes_avail / (1024*1024*1024)).toFixed(2);
	var usedPct = parseFloat(parseFloat(usedGb / totalGb).toFixed(2) * 100).toFixed(0);
	var availPct = parseFloat(parseFloat(availGb / totalGb).toFixed(2) * 100).toFixed(0);

	usedGauge.setStack([{percent: usedPct, stroke: 'red'},{percent:availPct, stroke: 'blue'}]);
}

function updatePgSummary(pgsummary){
	var u = _.map(pgsummary, function(v,i){
		return [v.severity, v.summary];
	});
	table.setData({headers: ['Severity', 'Summary'], data: u})
}

function updateTimerProgress(timerStats){
	var percent = parseFloat(parseFloat(timerStats.timers / timerStats.total).toFixed(2) * 100).toFixed(0);
	gauge.setPercent(percent);
}

function updateOSDs(o){
	totalOsd.setDisplay(o.osdmap.num_osds);
	if (o.osdmap.num_osds != o.osdmap.num_up_osds){
		upOsd.setOptions({color: 'red'});
	} else if (o.osdmap.num_osds != o.osdmap.num_in_osds){
		upOsd.setOptions({color: 'magenta'});
	} else {
		upOsd.setOptions({color: 'green'});
	}
	upOsd.setDisplay(o.osdmap.num_up_osds);
}

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

screen.render();

var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.json());
app.post('/', function(req, res, next){
	if (req.body.health){
		var pgstats = req.body.pgmap;
		setIOData(pgstats);
		updateOSDs(req.body.osdmap);
		// console.error(req.body);
		setAvailabilityData(pgstats);
		updatePgSummary(req.body.health.summary);
		updatePgStates(pgstats);
        screen.render();
    }
    res.send('');
});

app.listen('3004');