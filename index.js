var blessed = require('blessed'),
contrib = require('blessed-contrib'),
_ = require('lodash'),
moment = require('moment');

var screen = blessed.screen();

var grid = new contrib.grid({rows: 12, cols: 12, screen: screen});

var bytesIOLine = grid.set(0, 0, 7, 6, contrib.line, {
	showNthLabel: 5,
	// maxY: 300,
	label: 'MegaBytes/s',
	showLegend: true,
	legend: {width: 20}
});

var IOPSLine = grid.set(7, 0, 5, 6, contrib.line, {
	showNthLabel: 5,
	// maxY: 1000,
	label: 'IOPs / OBJs',
	showLegend: true,
	legend: {width: 20}
});

var usedGauge = grid.set(0, 6, 2, 2, contrib.gauge, {label: 'Free Percent', 'stroke': 'cyan','fill':'cyan'});
var totalOsd = grid.set(0, 8, 2, 2, contrib.lcd, {label: 'Total OSD'});
var upOsd = grid.set(0, 10, 2, 2, contrib.lcd, {label: 'Up OSD'});

var overallhealth = grid.set(2, 6, 2, 3, contrib.lcd, {label: 'Overall Health', elements: 4});
var actualData = grid.set(4, 6, 2, 3, contrib.lcd, {label: 'Actual Data', elements: 6});
var usedData = grid.set(2, 9, 2, 3, contrib.lcd, {label: 'Used Storage', elements: 6});
var availData = grid.set(4, 9, 2, 3, contrib.lcd, {label: 'Avail Storage', elements: 6});

var pgbar = grid.set(6, 6, 6, 3, contrib.bar, {
	label: 'Placement Group States',
	barWidth: 6,
	barSpacing: 6,
	xOffset: 0,
	maxHeight: 9
});

var table =  grid.set(6, 9, 6, 3, contrib.table, {
	keys: true,
	fg: 'green',
	label: 'PG Health',
	columnSpacing: 2,
	columnWidth: [16, 48]
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
	title: 'Client IOPs',
	style: {line: 'green'},
	x: [],
	y: []
};

var recoveryIops = {
	title: 'Recovery Obj/s',
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

	var read_bytes_sec_mb = parseFloat(pgstats.read_bytes_sec / (1024*1024)).toFixed(2) || 0;
	var write_bytes_sec_mb = parseFloat(pgstats.write_bytes_sec / (1024*1024)).toFixed(2) || 0;

	var recovery_bytes_sec_mb = 0;

	if (pgstats.recovering_bytes_per_sec)
		recovery_bytes_sec_mb = parseFloat(pgstats.recovering_bytes_per_sec / (1024*1024)).toFixed(2) || 0;

	if (!isNaN(write_bytes_sec_mb))
		clientWriteIO.y.push(write_bytes_sec_mb);
	else
		clientWriteIO.y.push(0);

	if (!isNaN(read_bytes_sec_mb))
		clientReadIO.y.push(read_bytes_sec_mb);
	else
		clientReadIO.y.push(0);

	if (!isNaN(read_bytes_sec_mb))
		recoveryWriteIO.y.push(read_bytes_sec_mb);
	else
		recoveryWriteIO.y.push(0);

	if (!isNaN((parseInt(read_bytes_sec_mb) + parseInt(write_bytes_sec_mb))))
		clientIO.y.push((parseInt(read_bytes_sec_mb) + parseInt(write_bytes_sec_mb)));
	else
		clientIO.y.push(0);

	if (!isNaN(pgstats.op_per_sec))
		clientIops.y.push(pgstats.op_per_sec);
	else
		clientIops.y.push(0);

	if (!isNaN(pgstats.recovering_objects_per_sec))
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
	var dataGb = (pgstats.data_bytes / (1024*1024*1024)).toFixed(2);

	var dataTb = parseFloat(dataGb / 1024).toFixed(1);
	var usedTb = parseFloat(usedGb / 1024).toFixed(1);
	var totalTb = parseFloat(totalGb / 1024).toFixed(1);

	actualData.setDisplay(dataTb + 'T');
	usedData.setDisplay(usedTb + 'T');
	availData.setDisplay(totalTb + 'T');
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

function updateHealth(h){

	var text = " OK "
	var color = "green";

	if (h.overall_status == 'HEALTH_WARN'){
		text = "WARN";
		color = "red";
	}

	overallhealth.setOptions({
		color: color,
		elements: 4
	});

	overallhealth.setDisplay(text);
}
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
	return process.exit(0);
});

screen.key(['d'], function(ch, key) {
	console.error(recoveryIops, clientIops, clientIO, recoveryWriteIO, clientReadIO, clientWriteIO);
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
		// console.error(req.body.health);
		setAvailabilityData(pgstats);
		updatePgSummary(req.body.health.summary);
		updatePgStates(pgstats);
		updateHealth(req.body.health);
        screen.render();
    }
    res.send('');
});

app.listen('3004');
