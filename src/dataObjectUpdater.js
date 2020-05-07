const csv = require("jquery-csv");
const fetch = require("node-fetch");

const { TimeSerie } = require("./models/TimeSerie");
const { CaseColumn } = require("./models/CaseColumn");
const { DomesticEntry, InternationalEntry } = require("./models/FlightEntry");

// Update the data object
async function updateDataObject(source, attributes) {
  let dataObject = null;
  if (source === "mongoDb") {
    dataObject = await getAllDataFromMongoDb(attributes); // Update global 'data' object
    console.log("Data object updated from mongoDB database.");
  } else if (source === "localDb") {
    // !!! DEPRECATED
    dataObject = await getAllDataFromLocalDb(attributes);
    console.log("Data object updated from localDB database.");
  }
  return dataObject;
}

//// Get data from local database

async function getTimeSerieFromLocalDb(attribute) {
  const response = await fetch(timeSeriesUrls.local[attribute]);
  const csvStr = await response.text();
  const records = csv.toObjects(csvStr);
  return records;
}

async function getCaseColumnFromLocalDb(attribute) {
  const response = await fetch(caseColumnsUrls.local[attribute]);
  const csvStr = await response.text();
  const records = csv.toObjects(csvStr); // An array of several thousand 'case' objects
  return records;
}

async function getAllDataFromLocalDb(attributes) {
  let totalConfirmedData = await getTimeSerieFromLocalDb("totalConfirmedData");
  let newConfirmedData = await getTimeSerieFromLocalDb("newConfirmedData");
  let totalRecoveredData = await getTimeSerieFromLocalDb("totalRecoveredData");
  let newRecoveredData = await getTimeSerieFromLocalDb("newRecoveredData");
  let totalDeathsData = await getTimeSerieFromLocalDb("totalDeathsData");
  let newDeathsData = await getTimeSerieFromLocalDb("newDeathsData");
  let totalActiveData = await getTimeSerieFromLocalDb("totalActiveData");
  let newActiveData = await getTimeSerieFromLocalDb("newActiveData");
  let totalTestsData = await getTimeSerieFromLocalDb("totalTestsData");
  let newTestsData = await getTimeSerieFromLocalDb("newTestsData");
  let geoData = await getCaseColumnFromLocalDb("geoData");
  geoData["attribute"] = "geoData"; // Adhering to mongoDB CaseColumn Schema
  let ageData = await getCaseColumnFromLocalDb("ageData");
  ageData["attribute"] = "ageData";
  return {
    totalConfirmedData,
    newConfirmedData,
    totalRecoveredData,
    newRecoveredData,
    totalDeathsData,
    newDeathsData,
    totalActiveData,
    newActiveData,
    // totalTestsData,
    // newTestsData,
    geoData,
    ageData,
  };
}

//// Get data from mongoDB database

async function getAllDataFromMongoDb(attributes) {
  let totalConfirmedData = await TimeSerie.findOne({
    attribute: attributes.totalConfirmedData,
  });
  let newConfirmedData = await TimeSerie.findOne({
    attribute: attributes.newConfirmedData,
  });
  let totalRecoveredData = await TimeSerie.findOne({
    attribute: attributes.totalRecoveredData,
  });
  let newRecoveredData = await TimeSerie.findOne({
    attribute: attributes.newRecoveredData,
  });
  let totalDeathsData = await TimeSerie.findOne({
    attribute: attributes.totalDeathsData,
  });
  let newDeathsData = await TimeSerie.findOne({
    attribute: attributes.newDeathsData,
  });
  let totalActiveData = await TimeSerie.findOne({
    attribute: attributes.totalActiveData,
  });
  let newActiveData = await TimeSerie.findOne({
    attribute: attributes.newActiveData,
  });
  let totalTestsData = await TimeSerie.findOne({
    attribute: attributes.totalTestsData,
  });
  let newTestsData = await TimeSerie.findOne({
    attribute: attributes.newTestsData,
  });
  let geoData = await CaseColumn.findOne({
    attribute: attributes.geoData,
  });
  let ageData = await CaseColumn.findOne({
    attribute: attributes.ageData,
  });
  let sourceData = await CaseColumn.findOne({
    attribute: attributes.sourceData,
  });

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
    geoData,
    ageData,
    sourceData,
  };
}

exports.updateDataObject = updateDataObject;
