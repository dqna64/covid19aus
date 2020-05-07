// const port = process.env.PORT || 4000;

const timeSeriesUrls = {
  // local: {
  //   confirmed: `http://localhost:${port}/local/aus-confirmed-csse.csv`,
  //   recovered: `http://localhost:${port}/local/aus-recovered-csse.csv`,
  //   deaths: `http://localhost:${port}/local/aus-deaths-csse.csv`,
  // },
  web: {
    confirmed:
      "https://api.github.com/repos/CSSEGISandData/COVID-19/git/blobs/aa91fa13746217847ed0a327c31f017346fd5d8d",
    recovered:
      "https://api.github.com/repos/CSSEGISandData/COVID-19/git/blobs/05ea017929c40d5f0a0a6419c7ca35d317d4dceb",
    deaths:
      "https://api.github.com/repos/CSSEGISandData/COVID-19/git/blobs/0ad32ef0e7a4b79fdec70aed5d95cc8e6b03b301",
    tests:
      "https://data.nsw.gov.au/data/api/3/action/datastore_search?resource_id=c1f81a21-caa3-4b88-81d1-60ce6e678cec&limit=29000000",
  },
};

const caseColumnsUrls = {
  web: {
    geo:
      "https://data.nsw.gov.au/data/api/3/action/datastore_search?resource_id=21304414-1ff1-4243-a5d2-f52778048b29&limit=29000000",
    age:
      "https://data.nsw.gov.au/data/api/3/action/datastore_search?resource_id=24b34cb5-8b01-4008-9d93-d14cf5518aec&limit=29000000",
    sou:
      "https://data.nsw.gov.au/data/api/3/action/datastore_search?resource_id=2f1ba0f3-8c21-4a86-acaf-444be4401a6d&limit=29000000",
  },
  // local: {
  //   geo: `http://localhost:${port}/db/nsw-geoData-partial.csv`,
  //   age: `http://localhost:${port}/db/nsw-ageData-partial.csv`,
  // },
};

// const express = require("express");
const fetch = require("node-fetch");
const mongoose = require("mongoose");
require("dotenv/config");
const csv = require("jquery-csv");
const { getFlightData } = require("./flight-data-scraper");

const { TimeSerie } = require("./models/TimeSerie");
const { CaseColumn } = require("./models/CaseColumn");
const { DomesticEntry, InternationalEntry } = require("./models/FlightEntry");

// Connect to database (cluster0)
// mongoose.connect(
//   process.env.DB_CONNECTION,
//   { useUnifiedTopology: true, useNewUrlParser: true },
//   () => console.log("Connected to mongoDB!")
// );

//// Program

async function updateSpecified(
  timeSeriesToUpdate,
  caseColumnsToUpdate,
  flightEntriesToUpdate
) {
  await updateTimeSeries("web", timeSeriesToUpdate);
  await updateCaseColumns(caseColumnsToUpdate, 590);
  await updateFlightEntries(flightEntriesToUpdate);
  console.log("Specified updates complete.");
}

//// Update database functions

// Update timeSeries
async function updateTimeSeries(source, miniAttributes) {
  for (let miniAttribute of miniAttributes) {
    const timeSerieCouple = await getTimeSerieCouple(
      source,
      timeSeriesUrls[source][miniAttribute],
      miniAttribute
    ); // e.g. {totalConfirmedData, newConfirmedData}

    for (let actualAttribute in timeSerieCouple) {
      let timeSerie = await TimeSerie.findOne({ attribute: actualAttribute });
      if (timeSerie === null) {
        timeSerie = new TimeSerie({
          attribute: actualAttribute,
          dates: [],
          regions: {},
        });
        await caseColumn.save();
      }
      const currentSize = timeSerie.dates.length;
      console.log(
        `Updating timeSerie ${actualAttribute} (currentSize: ${currentSize})...`
      );
      try {
        // This update technique basically replaces document with an entire new one
        timeSerie.dates = timeSerieCouple[actualAttribute].dates; // An array of strings
        timeSerie.regions = timeSerieCouple[actualAttribute].regions; // A mixed-map/object
        await timeSerie.save();
        console.log(
          `Successfully updated timeSerie ${actualAttribute}. Updated timeSerie size: ${timeSerieCouple[actualAttribute].dates.length}`
        );
      } catch (err) {
        console.error(err);
        console.log(`Failed to update timeSerie ${actualAttribute}`);
      }
    }
  }
}

// Update caseColumns (fetch only avalaible for web)
async function updateCaseColumns(miniAttributes, batchSizeMax) {
  for (let miniAttribute of miniAttributes) {
    const actualAttribute = `${miniAttribute}Data`;
    let upToDate = false;
    while (!upToDate) {
      let caseColumn = await CaseColumn.findOne({
        attribute: actualAttribute,
      });
      if (caseColumn === null) {
        caseColumn = new CaseColumn({
          attribute: actualAttribute,
          cases: [],
          summaries: {},
        });
        await caseColumn.save();
      }
      const currentSize = caseColumn.cases.length;
      const caseColumnUpdates = await getCaseColumnUpdates(
        caseColumnsUrls.web[miniAttribute.slice(0, 3)], // First three letters of miniAttribute which contains version
        miniAttribute,
        currentSize,
        batchSizeMax
      ); // Returns {newCases, newLabels, newValues}
      // newCases is array of cases [{}, {}, ...]
      // newLabels and newValues are arrays
      const newCases = caseColumnUpdates.newCases;
      const newSummaries = caseColumnUpdates.newSummaries;
      // console.log("New cases:");
      // console.log(newCases);
      // console.log("New summaries:");
      // console.log(newSummaries);

      let safetyButton = true;
      if (newCases.length != 0 && safetyButton) {
        // Only update document if there are new updates
        console.log(
          `Updating caseColumn ${actualAttribute} (currentSize: ${currentSize})...`
        );
        try {
          caseColumn.cases.push(...newCases);
          await caseColumn.save();

          let caseColumnSummaries = { ...caseColumn.summaries };
          for (let key in newSummaries) {
            if (key in caseColumnSummaries) {
              caseColumnSummaries[key] += newSummaries[key]; // Add to existing
            } else {
              caseColumnSummaries[key] = newSummaries[key]; // Initialise
            }
          }
          await caseColumn.updateOne({ summaries: caseColumnSummaries });
          console.log(
            `Successfully updated caseColumn ${actualAttribute} with batch of size ${
              newCases.length
            }. Updated caseColumn size: ${currentSize + newCases.length}`
          );
        } catch (err) {
          console.error(err);
          console.log(`Failed to update caseColumn ${actualAttribute}`);
          upToDate = true; // Escape loop, no use trying to update again
        }
        if (newCases.length < batchSizeMax) {
          // If newRecords not full then I can assume there won't be any new records next round
          upToDate = true; // Exit while loop
        } // Else get more updates
      } else {
        console.log(`No new updates for caseColumn ${actualAttribute}`);
        upToDate = true; // Exit while loop
      }
    }
  }
}

async function updateFlightEntries(documentsToUpdate) {
  const data = await getFlightData();
  for (let name of documentsToUpdate) {
    let currentSize = 0;
    let actualAttribute = `${name}Entries`;
    if (name === "domestic") {
      allTimeFlightEntries = data.domesticEntries;
      currentSize = await DomesticEntry.countDocuments();
    } else if (name === "international") {
      allTimeFlightEntries = data.internationalEntries;
      currentSize = await InternationalEntry.countDocuments();
    }
    let flightEntriesUpdates = allTimeFlightEntries.slice(currentSize);
    console.log(
      `Updating ${actualAttribute} collection (currentSize: ${currentSize}, new updates: ${flightEntriesUpdates.length})...`
    );
    for (let i = 0; i < flightEntriesUpdates.length; i++) {
      try {
        let entry;
        if (name === "domestic") {
          entry = new DomesticEntry(flightEntriesUpdates[i]);
        } else if (name === "international") {
          entry = new InternationalEntry(flightEntriesUpdates[i]);
        }
        await entry.save();
        currentSize++;
        console.log(
          `Successfully uploaded new ${actualAttribute}. Updated collection size: ${currentSize}.`
        );
      } catch (err) {
        console.error(err);
        console.log(`Failed to upload new ${actualAttribute}`);
      }
    }
  }
}

//// Get all time series

// Get csv string
async function getTimeSerieCsvFromLocal(local_url) {
  let csvStr;
  try {
    const response = await fetch(local_url);
    const csvStr = await response.text();
  } catch (err) {
    console.error(err);
    csvStr = "";
  }
  return csvStr;
}
async function getTimeSerieCsvFromWeb(miniAttribute) {
  let csvStr;
  try {
    const url =
      "https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_time_series";
    const response = await fetch(url); // An object with file paths
    const files = await response.json();
    const targetFile = files.find(
      (element) =>
        element.name === `time_series_covid19_${miniAttribute}_global.csv`
    );

    const response2 = await fetch(targetFile.git_url);
    const result = await response2.json();
    // csvStr = atob(result.content); // Native to client-side js but not included in node
    csvStr = Buffer.from(result.content, "base64").toString(); // Decode from base64
  } catch (err) {
    console.error(err);
    csvStr = "";
  }
  return csvStr;
}

async function getTotals(source, miniAttribute) {
  let csvStr;
  if (source === "local") {
    csvStr = await getTimeSerieCsvFromLocal(miniAttribute);
  } else if (source === "web") {
    csvStr = await getTimeSerieCsvFromWeb(miniAttribute);
  }
  const rows = csvStr.split("\n");
  const dates = rows[0].split(",").slice(4);
  const regions = {};
  rows.slice(1).forEach((row) => {
    // For each state
    const rowArray = row.split(",");
    const state = translateNameToCode(rowArray[0]);
    const stateValues = rowArray.slice(4).map((num) => parseInt(num));
    regions[state] = stateValues;
  });
  let nationalValues = [];
  for (let i = 0; i < dates.length; i++) {
    // number of days
    let dailyTotal = 0;
    for (let j = 0; j < statesOrder.length; j++) {
      // 8 states
      dailyTotal += regions[statesOrder[j]][i];
    }
    nationalValues.push(dailyTotal);
  }
  regions["AUS"] = nationalValues;
  return { dates, regions };
}
function getNews(totalsData) {
  let dates = [...totalsData.dates];
  let regions = {};
  for (let i = 0; i < regionsOrder.length; i++) {
    let regionTotals = [...totalsData.regions[regionsOrder[i]]]; // BECAREFUL the unshift modifies array inplace, make deep copy
    let regionNews = [];
    regionTotals.unshift(0); // Assume day 0 had no cases total
    for (let j = 1; j < regionTotals.length; j++) {
      // Start with day1Totals - day0Totals
      regionNews.push(regionTotals[j] - regionTotals[j - 1]);
    }
    regions[regionsOrder[i]] = regionNews;
  }

  return { dates, regions };
}
async function getNewTestsData(source, url) {
  if (source === "web") {
    let records;
    try {
      const response = await fetch(url);
      const rawData = await response.json();
      records = rawData.result.records; // An array of objects that look like: { test_date: '2020-03-09', result: 'Case - Confirmed' }
    } catch (err) {
      console.error(err);
      records = [];
    }
    let newTestsObject = {};
    for (let i = 0; i < records.length; i++) {
      const date = records[i].test_date;
      if (date in newTestsObject) {
        newTestsObject[date] += 1;
      } else {
        newTestsObject[date] = 1;
      }
      console.log(`${i + 1}/${records.length}`);
    }
    let dates = [];
    let regions = {};
    for (let region of regionsOrder) {
      regions[region] = [];
    }
    for (let date in newTestsObject) {
      // Tests data only for NSW
      dates.push(date);
      regions.NSW.push(newTestsObject[date]);
    }
    return { dates, regions };
  }
}
function getTotalTestsData(newTestsData) {
  const dates = [...newTestsData.dates];
  let regions = {};
  for (let region of regionsOrder) {
    regions[region] = [];
    let regionTotal = 0;
    for (let i = 0; i < newTestsData.regions[region].length; i++) {
      regionTotal += newTestsData.regions[region][i];
      regions[region].push(regionTotal);
    }
  }
  return { dates, regions };
}
async function getTimeSerieCouple(source, url, miniAttribute) {
  if (
    miniAttribute === "confirmed" ||
    miniAttribute === "recovered" ||
    miniAttribute === "deaths"
  ) {
    const actualTotalsAttribute = `total${
      miniAttribute[0].toUpperCase() + miniAttribute.slice(1)
    }Data`;
    const actualNewsAttribute = `new${
      miniAttribute[0].toUpperCase() + miniAttribute.slice(1)
    }Data`;
    let records = {};
    records[actualTotalsAttribute] = await getTotals(source, miniAttribute);
    records[actualNewsAttribute] = getNews(records[actualTotalsAttribute]);
    return records;
  } else if (miniAttribute === "active") {
    const totalConfirmedResults = await TimeSerie.find({
      attribute: "totalConfirmedData",
    });
    const totalConfirmedData = totalConfirmedResults[0]; // Should find only one time serie bc 'attribute' is defined as a unique field
    const totalRecoveredResults = await TimeSerie.find({
      attribute: "totalRecoveredData",
    });
    const totalRecoveredData = totalRecoveredResults[0]; // Should find only one time serie bc 'attribute' is defined as a unique field
    const totalDeathsResults = await TimeSerie.find({
      attribute: "totalDeathsData",
    });
    const totalDeathsData = totalDeathsResults[0]; // Should find only one time serie bc 'attribute' is defined as a unique field
    const totalActiveData = calculateActiveCasesData(
      totalConfirmedData.dates,
      totalConfirmedData.regions,
      totalRecoveredData.regions,
      totalDeathsData.regions
    );
    const newActiveData = getNews(totalActiveData);
    return { totalActiveData, newActiveData };
  } else if (miniAttribute === "tests") {
    const newTestsData = await getNewTestsData(source, url);
    const totalTestsData = getTotalTestsData(newTestsData);
    return { totalTestsData, newTestsData };
  }
}

async function getAllTimeSeries(source, urls) {
  let totalConfirmedData = await getTotals(source, urls[source]["confirmed"]);
  let newConfirmedData = getNews(totalConfirmedData);
  let totalRecoveredData = await getTotals(source, urls[source]["recovered"]);
  let newRecoveredData = getNews(totalRecoveredData);
  let totalDeathsData = await getTotals(source, urls[source]["deaths"]);
  let newDeathsData = getNews(totalDeathsData);
  let totalActiveData = calculateActiveCasesData(
    totalConfirmedData.dates,
    totalConfirmedData.regions,
    totalRecoveredData.regions,
    totalDeathsData.regions
  );
  let newActiveData = getNews(totalActiveData);
  let newTestsData = getNewTests(source, urls[source]["tests"]);
  let totalTestsData = getTotalTestsData(newTestsData);
  return {
    totalConfirmedData,
    newConfirmedData,
    totalRecoveredData,
    newRecoveredData,
    totalDeathsData,
    newDeathsData,
    totalActiveData,
    newActiveData,
    totalTestsData,
    newTestsData,
  };
}

//// Get all case columns

// Get csv string
async function getCaseColumnCsvFromLocal(local_url) {
  const response = await fetch(local_url);
  const csvStr = await response.text();
  return csvStr;
}
async function getCaseColumnCsvFromWeb(web_url) {
  // No need, Data.NSW returns json :D
}

async function getCaseColumn(source, url, specs) {
  if (source === "local") {
    const csvStr = await getCaseColumnCsvFromLocal(url);
    // const records = [];
    // const rows = csvStr.split("\n");
    // const labels = rows[0].split(","); // An array of labels e.g. ["notification_date,postcode", "likely_source_of_infection", "lhd_2010_code"]
    // const data = rows.splice(1); // An array of comma-delimited strings e.g ["2020-01-22,2134,Overseas,X700,Sydney,11300,Burwood (A)", "2020-01-24,2121,Overseas,X760,Northern Sydney,16260,Parramatta (C)"]
    // for (let row of data) {
    //   if (row === "") {
    //     // Be careful of sneaky empty lines
    //   } else {
    //     console.log(row);
    //     let values = row.split(",");
    //     let aCase = {};
    //     for (let i = 0; i < labels.length; i++) {
    //       aCase[labels[i]] = values[i];
    //     }
    //     records.push(aCase);
    //   }
    // }
    const records = csv.toObjects(csvStr); // An array of several thousand 'case' objects
    if (specs === "geo") {
      for (let i = 0; i < records.length; i++) {
        records[i]["coords"] = await findCoords(
          records[i].lga_name19,
          records[i].lhd_2010_name,
          records[i].postcode
        );
        console.log(`${i + 1}/${records.length}`);
        console.log(records[i]);
      }
    } else if (specs === "age") {
    }
    return records;
  } else if (source === "web") {
    let records;
    try {
      const response = await fetch(url);
      const rawData = await response.json();
      records = rawData.result.records; // An array of several thousand objects
    } catch (err) {
      console.error(err);
      records = [];
    }
    if (specs === "geo") {
      for (let i = 0; i < records.length; i++) {
        records[i]["coords"] = await findCoords(
          records[i].lga_name19,
          records[i].lhd_2010_name,
          records[i].postcode
        );
        console.log(`${i + 1}/${records.length}`);
        console.log(records[i]);
      }
    } else if (specs === "age") {
    }
    return records;
  }
}

async function getCaseColumnUpdates(
  url,
  miniAttribute,
  currentSize,
  batchSizeMax
) {
  let allCases;
  try {
    const response = await fetch(url); // Must be the web URL, not local
    const rawData = await response.json();
    allCases = rawData.result.records; // An array of several thousand objects
    // console.log(allCases);
  } catch (err) {
    console.error(err);
    allCases = [];
  }
  console.log(
    `${
      allCases.slice(currentSize).length
    } new cases found for caseColumn ${miniAttribute}`
  );
  const newCases = allCases.slice(currentSize, currentSize + batchSizeMax); // Limit to *batchSize* number of new items
  let newSummaries = {};
  if (miniAttribute.includes("geo")) {
    // Add 'coords' field to each case
    for (let i = 0; i < newCases.length; i++) {
      newCases[i]["coords"] = await findCoords(
        newCases[i].lga_name19,
        newCases[i].lhd_2010_name,
        newCases[i].postcode
      );
      console.log(`${i + 1}/${newCases.length}`);
      console.log(newCases[i]);
    }

    // newSummaries = {"2057": 582, "2093": 642, ...}
    for (let i = 0; i < newCases.length; i++) {
      let location = newCases[i].postcode;
      if (location in newSummaries) {
        newSummaries[location]++;
      } else {
        newSummaries[location] = 1;
      }
    }
  } else if (miniAttribute.includes("source")) {
    // newSummaries {"Overseas": 582, "Interstate": 642, ...}
    for (let i = 0; i < newCases.length; i++) {
      let source = newCases[i].likely_source_of_infection;
      if (source in newSummaries) {
        newSummaries[source]++;
      } else {
        newSummaries[source] = 1;
      }
    }
  } else if (miniAttribute.includes("age")) {
    // newSummaries = {"AgeGroup_25-29": 582, "AgeGroup_40-44": 642, ...}
    for (let i = 0; i < newCases.length; i++) {
      let ageGroup = newCases[i].age_group.slice(9); // 'AgeGroup_30-34' -> '30-34'
      if (ageGroup in newSummaries) {
        newSummaries[ageGroup]++;
      } else {
        newSummaries[ageGroup] = 1;
      }
    }
  }
  return { newCases, newSummaries };
}

//// Vars & Helpers

function calculateActiveCasesData(
  dates,
  confirmedRegionsValues,
  recoveredRegionsValues,
  deathsRegionsValues
) {
  let regions = {};
  for (let i = 0; i < regionsOrder.length; i++) {
    // 9 regions
    let regionActive = []; // Values for a single state over time
    for (let j = 0; j < dates.length; j++) {
      // Each date
      let totalActive =
        confirmedRegionsValues[regionsOrder[i]][j] -
        recoveredRegionsValues[regionsOrder[i]][j] -
        deathsRegionsValues[regionsOrder[i]][j];
      regionActive.push(totalActive);
    }
    regions[regionsOrder[i]] = regionActive; // Push this particular regions's active values over time to the array of all regions
  }
  return { dates, regions };
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

async function findCoords(lga, lhd, postcode) {
  // const url = `https://nominatim.openstreetmap.org/search?postalcode=${postcode}&state=NSW&country=Australia&format=json`;
  const url = `https://nominatim.openstreetmap.org/search?q=NSW,${postcode},Australia&format=json&limit=1`;
  let coords;
  try {
    const response = await fetch(url);
    const results = await response.json();
    coords = { lat: results[0].lat, lon: results[0].lon };
  } catch (err) {
    console.error(err);
    coords = { lat: NaN, lon: NaN }; // Will return as NaN's
  }
  let validLat = -45 < coords.lat && coords.lat < -8;
  let validLon = 112 < coords.lon && coords.lon < 155;
  if (validLat && validLon) {
    return coords;
  } else {
    return { lat: NaN, lon: NaN }; // Catch and neutralise bad search results from nomatim
  }
}

exports.updateDatabase = updateSpecified;
