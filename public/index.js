let GeoSearchControl = window.GeoSearch.GeoSearchControl;
let OpenStreetMapProvider = window.GeoSearch.OpenStreetMapProvider;

const monthIdx = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const caseCategories = ["confirmed", "active", "recovered", "deaths"];

const statesOrder = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const regionsOrder = [
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
  "AUS",
];

const colors = {
  confirmed: "rgba(188, 223, 245, 1)",
  confirmedAlpha: "rgba(188, 223, 245, 0.7)",
  active: "rgba(188, 223, 245, 1)",
  activeAlpha: "rgba(188, 223, 245, 0.7)",
  recovered: "rgba(188, 245, 224, 1)",
  recoveredAlpha: "rgba(188, 245, 224, 0.7)",
  deaths: "rgba(245, 188, 188, 1)",
  deathsAlpha: "rgba(245, 188, 188, 0.7)",
};

function isFloat(n) {
  return Number(n) === n && n % 1 !== 0;
}

function lastItem(array) {
  return array[array.length - 1];
}

function translateCodeToName(codeName) {
  if (codeName === "ACT") {
    return "Australian Capital Territory";
  } else if (codeName === "NSW") {
    return "New South Wales";
  } else if (codeName === "NT") {
    return "Northern Territory";
  } else if (codeName === "QLD") {
    return "Queensland";
  } else if (codeName === "SA") {
    return "South Australia";
  } else if (codeName === "TAS") {
    return "Tasmania";
  } else if (codeName === "VIC") {
    return "Victoria";
  } else if (codeName === "WA") {
    return "Western Australia";
  } else if (codeName === "AUS") {
    return "Australia";
  }
}

function translateNameToCode(fullStateName) {
  if (fullStateName === "Australian Capital Territory") {
    return "ACT";
  } else if (fullStateName === "New South Wales") {
    return "NSW";
  } else if (fullStateName === "Northern Territory") {
    return "NT";
  } else if (fullStateName === "Queensland") {
    return "QLD";
  } else if (fullStateName === "South Australia") {
    return "SA";
  } else if (fullStateName === "Tasmania") {
    return "TAS";
  } else if (fullStateName === "Victoria") {
    return "VIC";
  } else if (fullStateName === "Western Australia") {
    return "WA";
  } else if (fullStateName === "Australia") {
    return "AUS";
  }
}

// Convert "4/1/20" to "1 Apr 2020"
function formatDateForDisplay(date) {
  let dateArray = date.split("/");
  const month = monthIdx[parseInt(dateArray[0]) - 1];
  return dateArray[1] + " " + month + " " + "20" + dateArray[2]; // e.g. "25 Jan 2020"
}
function formatDatesForDisplay(rawDates) {
  let datesFormatted = [];
  for (let i = 0; i < rawDates.length; i++) {
    let dateArray = rawDates[i].split("/");
    const month = monthIdx[parseInt(dateArray[0]) - 1];
    datesFormatted.push(dateArray[1] + " " + month + " " + "20" + dateArray[2]); // e.g. "Jan 25 2020"
  }
  return datesFormatted;
}

// Convert "1 Apr 2020" to itself and "2 Apr 2020" to ""
function formatDateForGraph(date) {
  let dateArray = date.split(" ");
  if (dateArray[0] == "1") {
    // If date is 1st of the month
    return date;
  } else {
    return "";
  }
}

// Update stats, make charts and tables

function updateStats(totalFields, newFields) {
  for (let i = 0; i < caseCategories.length; i++) {
    $(`#total-${caseCategories[i]}-num`).text(totalFields[caseCategories[i]]);
    let sign = "+"; // newActive can be negative
    if (newFields[caseCategories[i]] < 0) {
      sign = "";
    }
    $(`#new-${caseCategories[i]}-sentence`).text(
      `(${sign}${newFields[caseCategories[i]]} today)`
    );
  }
}

function makeChart0(totalFields) {
  const totalLabels = caseCategories
    .slice(1)
    .map((word) => word[0].toUpperCase() + word.slice(1)); // Capitalise => "Active", "Recovered", "Deaths"

  let totalValues = [
    totalFields.active,
    totalFields.recovered,
    totalFields.deaths,
  ];

  let data = {
    labels: totalLabels,
    datasets: [
      {
        data: totalValues,
        borderColor: "rgba(230, 230, 230,1)",
        backgroundColor: [
          colors.confirmedAlpha,
          colors.recoveredAlpha,
          colors.deathsAlpha,
        ],
      },
    ],
  };
  let options = {
    legend: {
      labels: {
        fontColor: "rgba(217, 217, 217,1)",
      },
      position: "top",
    },
  };

  const pie_chart_current_stats = document
    .getElementById("pie-chart-current-stats")
    .getContext("2d");
  const chart0 = new Chart(pie_chart_current_stats, {
    type: "doughnut",
    data: data,
    options: options,
  });
}

function makeChart1(timeLabels, caseValues, newCaseValues) {
  let data = {
    labels: timeLabels,
    datasets: [
      {
        label: "Total Confirmed Cases",
        data: caseValues,
        yAxisID: "Total Confirmed Cases",
        order: 2,

        borderColor: "rgba(173, 237, 227, 1)",
        pointBackgroundColor: "rgba(68, 201, 201, 0.5)",
        pointBorderColor: "rgba(173, 237, 227, 1)",
        pointBorderWidth: 1,
        pointRadius: 3,
      },
      {
        label: "New Confirmed Cases",
        data: newCaseValues,
        type: "bar",
        yAxisID: "New Confirmed Cases",
        order: 1,

        backgroundColor: "rgba(173, 217, 237, 0.3)",
        borderColor: "rgba(173, 217, 237, 0.9)",
        borderWidth: 1,
        barPercentage: 1.0,
        categoryPercentage: 1.1,
      },
    ],
  };
  let options = {
    maintainAspectRatio: false,
    scales: {
      yAxes: [
        {
          id: "Total Confirmed Cases",
          // type: "linear",
          position: "left",
          ticks: {
            fontColor: "rgba(173, 237, 227, 1)",
          },
          scaleLabel: {
            display: true,
            labelString: "Total Confirmed Cases",
            fontColor: "rgba(173, 237, 227, 1)",
          },
        },
        {
          id: "New Confirmed Cases",
          // type: "bar",
          position: "right",
          ticks: {
            fontColor: "rgba(173, 217, 237,1)",
            suggestedMax: 700,
            min: 0,
          },
          gridLines: { color: "rgba(0,0,0,0)" },
          scaleLabel: {
            display: true,
            labelString: "New Confirmed Cases",
            fontColor: "rgba(173, 217, 237, 1)",
          },
        },
      ],
      xAxes: [
        {
          ticks: {
            autoSkip: false,
            fontColor: "rgba(217, 217, 217,1)",
            callback: (value, index, values) => {
              return formatDateForGraph(value);
            },
            min: "18 Feb 2020",
            minRotation: 0,
            maxRotation: 0,
          },
        },
      ],
    },
    legend: {
      labels: {
        fontColor: "rgba(217, 217, 217,1)",
      },
      reverse: true,
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    tooltips: {
      mode: "index",
      axis: "x",
    },
  };
  const time_series_total_confirmed = document
    .getElementById("time-series-total-confirmed")
    .getContext("2d");
  const chart1 = new Chart(time_series_total_confirmed, {
    type: "line",
    data: data,
    options: options,
  });
}

function makeChart2(
  timeLabels,
  activeCasesValues,
  recoveriesValues,
  deathsValues
) {
  let data = {
    labels: timeLabels,
    datasets: [
      {
        label: "Active",
        data: activeCasesValues,
        yAxisID: "Stack1",

        backgroundColor: colors.confirmedAlpha,
        borderColor: colors.confirmed,
        borderWidth: 1,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      },
      {
        label: "Recoveries",
        data: recoveriesValues,
        yAxisID: "Stack1",

        backgroundColor: colors.recoveredAlpha,
        borderColor: colors.recovered,
        borderWidth: 1,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      },
      {
        label: "Deaths",
        data: deathsValues,
        yAxisID: "Stack1",

        backgroundColor: colors.deathsAlpha,
        borderColor: colors.deaths,
        borderWidth: 1,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      },
    ],
  };
  let options = {
    maintainAspectRatio: false,
    scales: {
      yAxes: [
        {
          id: "Stack1",
          ticks: {
            fontColor: "rgba(173, 237, 227, 1)",
          },
          stacked: true,
        },
      ],
      xAxes: [
        {
          ticks: {
            autoSkip: false,
            fontColor: "rgba(217, 217, 217,1)",
            callback: (value, index, values) => {
              return formatDateForGraph(value);
            },
            min: "18 Feb 2020",
            minRotation: 0,
            maxRotation: 0,
          },
          stacked: true,
        },
      ],
    },
    legend: {
      labels: {
        fontColor: "rgba(217, 217, 217,1)",
      },
      reverse: false,
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    tooltips: {
      mode: "index",
      axis: "x",
    },
  };
  const time_series_split_stats = document
    .getElementById("time-series-split-stats")
    .getContext("2d");
  const chart1 = new Chart(time_series_split_stats, {
    type: "bar",
    data: data,
    options: options,
  });
}

function makeChart3(timeLabels, growthRateValues) {
  let data = {
    labels: timeLabels,
    datasets: [
      {
        label: "Growth Rate",
        data: growthRateValues,
        yAxisID: "growthRate",
        order: 2,

        borderColor: "rgba(173, 237, 227, 1)",
        pointBackgroundColor: "rgba(68, 201, 201, 0.3)",
        pointBorderColor: "rgba(173, 237, 227, 1)",
        pointBorderWidth: 1,
        pointRadius: 3,
      },
    ],
  };
  let options = {
    maintainAspectRatio: false,
    scales: {
      yAxes: [
        {
          id: "growthRate",
          // type: "linear",
          position: "left",
          ticks: {
            fontColor: "rgba(173, 237, 227, 1)",
          },
          scaleLabel: {
            display: false,
            labelString: "Growth Rate",
            fontColor: "rgba(173, 237, 227, 1)",
          },
        },
      ],
      xAxes: [
        {
          ticks: {
            autoSkip: false,
            fontColor: "rgba(217, 217, 217,1)",
            callback: (value, index, values) => {
              return formatDateForGraph(value);
            },
            min: "18 Feb 2020",
            minRotation: 0,
            maxRotation: 0,
          },
          gridLines: { color: "rgba(0,0,0,0)" },
        },
      ],
    },
    legend: {
      labels: {
        fontColor: "rgba(217, 217, 217,1)",
      },
      display: false,
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    tooltips: {
      mode: "index",
      axis: "x",
    },
  };
  const time_series_growth_factor = document
    .getElementById("time-series-growth-factor")
    .getContext("2d");
  const chart3 = new Chart(time_series_growth_factor, {
    type: "line",
    data: data,
    options: options,
  });
}

function makeTable1(data) {
  $("#table1-date-heading").text(
    formatDateForDisplay(lastItem(data.totalConfirmedData.dates))
  );
  for (let i = 0; i < regionsOrder.length; i++) {
    // 8 states
    for (let j = 0; j < caseCategories.length; j++) {
      const category = caseCategories[j];

      const cell_total = $("." + regionsOrder[i] + "-" + category + " .total"); // ".NSW-confirmed .total"
      const cell_new = $("." + regionsOrder[i] + "-" + category + " .new");

      let totalData;
      let newData;
      if (category === "confirmed") {
        totalData = data.totalConfirmedData;
        newData = data.newConfirmedData;
      } else if (category === "active") {
        totalData = data.totalActiveData;
        newData = data.newActiveData;
      } else if (category === "recovered") {
        totalData = data.totalRecoveredData;
        newData = data.newRecoveredData;
      } else if (category === "deaths") {
        totalData = data.totalDeathsData;
        newData = data.newDeathsData;
      }
      cell_total.text(lastItem(totalData.regions[regionsOrder[i]]).toString());
      let newValue = lastItem(newData.regions[regionsOrder[i]]);
      if (newValue === 0) {
        // don't put text in the element
      } else if (newValue < 0) {
        cell_new
          .text("(" + newValue.toString() + ")")
          .css("color", colors[category]);
      } else {
        cell_new
          .text("(" + "+" + newValue.toString() + ")")
          .css("color", colors[category]);
      }
    }
  }
}

async function makeMap1(geoData) {
  let geo_distribution_map = L.map("geo-distribution-map").setView(
    [-33.869, 151.209],
    6
  );
  L.tileLayer(
    "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}",
    {
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: "mapbox/streets-v11",
      tileSize: 512,
      zoomOffset: -1,
      accessToken:
        "pk.eyJ1IjoiZGFpbmFtaXEiLCJhIjoiY2s5amZubDlmMDBmZDNscGJ2YWwwNjhydyJ9.AK7aqFD3IQmV8XqgS0VmgA",
    }
  ).addTo(geo_distribution_map);

  //// Search bar
  const provider = new OpenStreetMapProvider();
  const searchControl = new GeoSearchControl({
    provider: provider,
  });
  geo_distribution_map.addControl(searchControl);

  let postcodes = {};
  for (let i = 0; i < geoData.cases.length; i++) {
    let postcode = geoData.cases[i].postcode;
    if (postcode in postcodes) {
      postcodes[postcode]++;
    } else {
      postcodes[postcode] = 1;
    }
    const coords = geoData.cases[i].coords;
    let offset = Math.random();
    let circle = L.circle([coords.lat, coords.lon], {
      color: "rgba(240, 65, 103, 0.5)",
      fillColor: "rgba(240, 65, 103, 0.3)",
      fillOpacity: 0.4,
      radius: 40 + 5 * postcodes[postcode],
    }).addTo(geo_distribution_map);
  }
}

function makeChart5(sourceData) {
  let labels = [];
  let values = [];
  Object.keys(sourceData.summaries)
    .sort()
    .forEach((key) => {
      labels.push(key);
      values.push(sourceData.summaries[key]);
    });
  labels[1] = "Locally acquired from unknown";
  labels[2] = "Locally acquired from confirmed";

  let data = {
    labels: labels,
    datasets: [
      {
        data: values,
        borderColor: "rgba(230, 230, 230,1)",
        backgroundColor: [
          "rgba(141, 235, 206, 0.8)",
          "rgba(230, 230, 230, 0.8)",
          "rgba(235, 141, 141, 0.8)",
          "rgba(149, 141, 235, 0.8)",
        ],
      },
    ],
  };
  let options = {
    maintainAspectRatio: false,
    legend: {
      labels: {
        fontColor: "rgba(217, 217, 217,1)",
      },
      position: "right",
    },
  };

  const source_of_infection_pie = document
    .getElementById("source-of-infection-pie")
    .getContext("2d");
  const chart5 = new Chart(source_of_infection_pie, {
    type: "doughnut",
    data: data,
    options: options,
  });
}

function makeChart6(ageData) {
  // Manual sort age groups in ascending order
  let labels = [];
  let values = [];
  Object.keys(ageData.summaries)
    .sort() // Get key array for sorting
    .forEach(function (key) {
      labels.push(key);
      values.push(ageData.summaries[key]);
    });
  labels = [].concat(
    labels.slice(1, 2),
    labels.slice(10, 11),
    labels.slice(2, 10),
    labels.slice(11, 16)
  ); // ['45-49', '50-55', ...]
  values = [].concat(
    values.slice(1, 2),
    values.slice(10, 11),
    values.slice(2, 10),
    values.slice(11, 16)
  ); // [324, 463, ...]

  let data = {
    labels: labels,
    datasets: [
      {
        label: "Number of patients",
        data: values,
        xAxisId: "numPatients",

        backgroundColor: "rgba(173, 217, 237, 0.3)",
        borderColor: "rgba(173, 217, 237, 0.9)",
        borderWidth: 1,
        barPercentage: 1.0,
        categoryPercentage: 0.8,
      },
    ],
  };

  let options = {
    maintainAspectRatio: false,
    scales: {
      xAxes: [
        {
          id: "numPatients",
          // type: "linear",
          position: "left",
          ticks: {
            fontColor: "rgba(173, 237, 227, 1)",
            suggestedMax: (Math.max(...values) * 1.7).toFixed(0),
          },
          scaleLabel: {
            display: true,
            labelString: "Number of patients",
            fontColor: "rgba(173, 237, 227, 1)",
          },
          gridLines: { color: "rgba(0,0,0,0.1)" },
        },
      ],

      yAxes: [
        {
          ticks: {
            autoSkip: false,
            fontColor: "rgba(173, 237, 227, 1)",
            // callback: (value, index, values) => {
            //   return formatDateForGraph(value);
            // },
            // min: "18 Feb 2020",
            minRotation: 0,
            maxRotation: 0,
          },
          scaleLabel: {
            display: true,
            labelString: "Age Group",
            fontColor: "rgba(173, 237, 227, 1)",
          },
          // gridLines: { color: "rgba(0,0,0,0)" },
        },
      ],
    },
    legend: {
      labels: {
        fontColor: "rgba(217, 217, 217,1)",
      },
      display: false,
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    },
    tooltips: {
      mode: "index",
      axis: "x",
    },
  };
  const age_distribution_bar = document
    .getElementById("age-distribution-bar")
    .getContext("2d");
  const chart6 = new Chart(age_distribution_bar, {
    type: "horizontalBar",
    data: data,
    options: options,
  });
}

async function run() {
  // All functions here run synchronously bc doesnt rlly matter which chart gets loaded first
  const response = await fetch("/api/data");
  const data = await response.json();
  console.log("Here is the data object:", data);
  let time = updateTime();
  console.log("The current date is:", time);

  const currentTotalFields = {
    confirmed: lastItem(data.totalConfirmedData.regions.AUS),
    active: lastItem(data.totalActiveData.regions.AUS),
    recovered: lastItem(data.totalRecoveredData.regions.AUS),
    deaths: lastItem(data.totalDeathsData.regions.AUS),
  };
  const currentNewFields = {
    confirmed: lastItem(data.newConfirmedData.regions.AUS),
    active: lastItem(data.newActiveData.regions.AUS),
    recovered: lastItem(data.newRecoveredData.regions.AUS),
    deaths: lastItem(data.newDeathsData.regions.AUS),
  };

  updateStats(currentTotalFields, currentNewFields);
  makeChart0(currentTotalFields);

  makeChart1(
    formatDatesForDisplay(data.totalConfirmedData.dates),
    data.totalConfirmedData.regions.AUS,
    data.newConfirmedData.regions.AUS
  );

  makeChart2(
    formatDatesForDisplay(data.totalConfirmedData.dates),
    data.totalActiveData.regions.AUS,
    data.totalRecoveredData.regions.AUS,
    data.totalDeathsData.regions.AUS
  );

  let newConfirmedFiveDayAvgs = [];
  for (let i = 5; i <= data.newConfirmedData.regions.AUS.length; i++) {
    // Take average of past five days including today
    let fiveDayAvg = data.newConfirmedData.regions.AUS.slice(i - 5, i).reduce(
      (a, b) => a + b,
      0
    );
    // First 5-day average given for the 5th day (first 4 days excluded)
    // Last 5-day average given for the last day (hence the <=)
    newConfirmedFiveDayAvgs.push(fiveDayAvg);
  }
  let growthRateValues = [];
  for (let i = 1; i < newConfirmedFiveDayAvgs.length; i++) {
    if (newConfirmedFiveDayAvgs[i - 1] === 0) {
      // Prevent division by 0
      growthRateValues.push(0);
    } else {
      let growthRate =
        newConfirmedFiveDayAvgs[i] / newConfirmedFiveDayAvgs[i - 1];
      growthRateValues.push(growthRate.toFixed(3));
    }
  }
  // First valid growth rate is given for the 6th day (first 5 days excluded, hence .slice(5) off dates)
  makeChart3(
    formatDatesForDisplay(data.totalConfirmedData.dates.slice(5)),
    growthRateValues
  );

  makeTable1(data);
  $("#currentTime").text(time);

  makeMap1(data.geoData);

  makeChart5(data.sourceData);

  makeChart6(data.ageData);

  setInterval(updateTime, 1000); // Update every 30 seconds
}

// Chart.defaults.global.tooltips = true;
run();

function updateTime() {
  let time = new Date();
  $(".date").text(time.toLocaleString());
  return time;
}

$(document).ready(function () {
  const scrollTime = 700;
  $("#overview-link").click(function () {
    $("html").animate(
      {
        scrollTop: $("#overview-container").offset().top,
      },
      scrollTime
    );
  });
  $("#timeline-link").click(function () {
    $("html").animate(
      {
        scrollTop: $("#timeline-container").offset().top - 55, // -55 to account for the fixed header
      },
      scrollTime
    );
  });
  $("#states-link").click(function () {
    $("html").animate(
      {
        scrollTop: $("#states-container").offset().top - 55,
      },
      scrollTime
    );
  });
  $("#origins-link").click(function () {
    $("html").animate(
      {
        scrollTop: $("#origins-container").offset().top - 55,
      },
      scrollTime
    );
  });
  $("#demographics-link").click(function () {
    $("html").animate(
      {
        scrollTop: $("#demographics-container").offset().top - 55,
      },
      scrollTime
    );
  });
});

// // Get the navbar
// let navbar = document.getElementById("nav-super-container");

// // Get the offset position of the navbar
// let sticky = navbar.offsetBottom;

// // Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
// function myFunction() {
//   if (window.pageYOffset >= sticky) {
//     navbar.classList.add("sticky");
//   } else {
//     navbar.classList.remove("sticky");
//   }
// }
