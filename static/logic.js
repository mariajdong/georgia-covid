function find_avg(array) {
    var sum = 0;
    for (var x = 0; x < array.length; x++) {
        sum += array[x];
    }

    var avg = Math.round(sum / array.length);
    return avg;
}

// set a minimum date (1/22/2020) to accept; use moment.js for date parsing/formatting
var first_date = moment.unix(1579737600);

// define url for georgia COVID data
var ga_url = `https://api.covidtracking.com/v1/states/GA/daily.json`;

// begin API call
d3.json(ga_url).then((response) => {

    // format date; yyyy-mm-dd for plotting, yyyymmdd for API calls; adding/subtracting for chart debugging
    var first_chart_date = first_date.add(1, 'days').format('YYYY-MM-DD');

    // define blank arrays to push data into
    var date_array = [];
    var case_array = [];
    var death_array = [];

    // blank arrays for transparency & color settings for plotting
    var alphas = [];
    var bar_colors = [];
    var line_colors = [];

    for (var x = 0; x < response.length; x++) {
        var test_date = moment(response[x].date, 'YYYY-MM-DD')
        var date = test_date.format('M/DD/YY');
        var cases = response[x].positive;
        var deaths = response[x].death;

        // push dates, total case values, colors to respective arrays
        date_array.push(date);
        case_array.push(cases);
        death_array.push(deaths);

        alphas.push(1.0);
        bar_colors.push(am4core.color('#F0B27A'));
        line_colors.push(am4core.color('#1A5276'));
    }

    console.log (case_array);

    // create arrays for daily increases in cases/deaths; start w/ 0 to keep array length the same
    var new_cases = [0];
    // var new_deaths = [0];

    // loop through cases, calculate case increases
    for (var x = (case_array.length - 2); x > -1; x--) {
        var case_inc = case_array[x] - case_array[x + 1];
        // var death_inc = death_array[x] - death_array[x + 1];

        new_cases.push(case_inc);
        // new_deaths.push (death_inc);
    }

    // create arrays for 7d moving avg for cases/deaths
    var new_cases_avg = [];
    // var new_deaths_avg = [];

    var reverse_new_cases = new_cases.reverse();
    
    // manually replace incorrect value d/t bug
    reverse_new_cases.splice(107, 1, 1866);

    for (var x = (reverse_new_cases.length - 1); x > -1; x--) {
        // create moving mini-array of 7 values (or less if 7 are unavailable)
        var avg_array = [];

        if (x > (reverse_new_cases.length - 8)) {
            avg_array.push(reverse_new_cases[x]); // they all equal 0, so downstream avg calcs are moot
        }
        else {
            for (var y = 0; y < 7; y++) {
                avg_array.push(reverse_new_cases[x + y]);
            }
        }

        // call "find_avg" fxn to determine average of each mini-array
        var avg = find_avg(avg_array);

        new_cases_avg.push(avg);
    }

    console.log (new_cases);

    // zip data together for plotting via backwards loop
    var ga_data = [];

    for (var x = date_array.length - 1; x > -1; x--) {
        ga_data.push({
            'date': date_array[x],
            'new_cases': new_cases[x],
            'avg_new_cases': new_cases_avg[date_array.length - x - 1],
            'alpha': alphas[x],
            'bar_color': bar_colors[x],
            'line_color': line_colors[x],
        });
    }

    // begin plotting bar/line chart
    am4core.ready(function () {

        // amcore theme for animation; removed d/t loading
        am4core.useTheme(am4themes_animated);

        // create XY chart
        var chart = am4core.create("plot", am4charts.XYChart);

        // add data
        chart.data = ga_data;

        // create axes
        var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        // dateAxis.title.text = "date";
        dateAxis.renderer.minGridDistance = 50;
        dateAxis.renderer.fullWidthTooltip = true;
        dateAxis.renderer.grid.template.disabled = true;

        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.title.text = "# of cases";
        valueAxis.cursorTooltipEnabled = false;

        // create columns for daily new cases
        var case_series = chart.series.push(new am4charts.ColumnSeries());
        case_series.dataFields.valueY = "new_cases";
        case_series.dataFields.dateX = "date";
        case_series.yAxis = valueAxis;
        case_series.columns.template.propertyFields.fill = 'bar_color';
        case_series.columns.template.strokeOpacity = 0;
        case_series.tooltipText = "new cases: {valueY}"
        case_series.strokeWidth = 2;
        case_series.columns.template.propertyFields.fillOpacity = "alpha";
        case_series.name = "daily new cases";
        case_series.showOnInit = true;
        case_series.tooltip.pointerOrientation = 'right';
        case_series.columns.template.tooltipY = am4core.percent(50);
        // case_series.tooltip.dy = 10;

        // create line for rolling 7-day avg of new cases
        var avg_series = chart.series.push(new am4charts.LineSeries());
        avg_series.dataFields.valueY = "avg_new_cases";
        avg_series.dataFields.dateX = "date";
        avg_series.yAxis = valueAxis;
        avg_series.zIndex = 5;
        avg_series.tooltipText = "7-day moving avg: {valueY}"
        avg_series.strokeWidth = 3;
        avg_series.propertyFields.stroke = "line_color";
        avg_series.propertyFields.fill = "line_color";
        avg_series.name = "7-day moving average";
        avg_series.showOnInit = true;
        avg_series.tooltip.pointerOrientation = 'right';
        // avg_series.tooltip.dy = -50;

        // create line for selected dates
        var range = dateAxis.axisRanges.create();
        range.date = new Date(first_chart_date);
        range.grid.stroke = am4core.color("#5B5B5B");
        range.grid.strokeWidth = 2;
        range.grid.strokeOpacity = 1;
        range.grid.strokeDasharray = 8;

        // add cursor for spikeline & zooming in on bars
        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.disabled = true;
        chart.cursor.behavior = 'zoomX';

        // dateAxis.keepSelection = true;
        // chart.legend = new am4charts.Legend();

    });

})