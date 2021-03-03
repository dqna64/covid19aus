const port = process.env.PORT || 4000;

const express = require("express");
const fetch = require("node-fetch");
const mongoose = require("mongoose");
require("dotenv/config");

const { updateDataObject } = require("./src/dataObjectUpdater");
const { updateDatabase } = require("./src/databaseUpdater");

const app = express();
app.listen(port, () => console.log(`Listening at port ${port}...`));

// Middleware
app.use(express.static("public"));
app.use(express.json({ limit: "1mb" }));

// Connect to database (cluster0)
mongoose.connect(
  process.env.DB_CONNECTION,
  { useUnifiedTopology: true, useNewUrlParser: true },
  () => console.log("Connected to mongoDB!")
);

//// Init and update data object

let data; // Make instance of the database and store it the server for quick retrival upon GET request
const database = "mongoDb"; // ### 'localDb' deprecated: local database not complete, urls not specified
const attributes = {
  // account for versions
  totalConfirmedData: "totalConfirmedData",
  newConfirmedData: "newConfirmedData",
  totalRecoveredData: "totalRecoveredData",
  newRecoveredData: "newRecoveredData",
  totalDeathsData: "totalDeathsData",
  newDeathsData: "newDeathsData",
  totalActiveData: "totalActiveData",
  newActiveData: "newActiveData",
  totalTestsData: "totalTestsData",
  newTestsData: "newTestsData",
  geoData: "geoV2Data",
  ageData: "ageV2Data",
  sourceData: "sourceV2Data",
};

//// Update database

const timeSeriesToUpdate = []; // 'confirmed', 'recovered', 'deaths', 'active', 'tests'
// @@@ Updating 'active' depends on 'confirmed', 'recovered' and 'deaths' being updated and consistent
const caseColumnsToUpdate = []; // ### geoV2 not yet initialised! 'geoV2', 'ageV2', 'sourceV2'
// @@@ Don't forget to specify limit in the web api url
const flightEntriesToUpdate = []; // 'domestic', 'international'

//// Incoming Requests

// Request for the data object
app.get("/api/data", async (req, res) => {
  // Let's hope this is only evoked after the data object has been initialised (shouldn't take too long)
  console.log("A GET request for the data has been received!");
  try {
    console.log("Sending data.");
    res.json(data);
  } catch (err) {
    console.error(err);
    res.json({ message: "Error in sending data" });
  }
});

run();

async function run() {
  data = await updateDataObject(database, attributes);
  await updateDatabase(
    timeSeriesToUpdate,
    caseColumnsToUpdate,
    flightEntriesToUpdate
  ); // Update database on server launch

  setInterval(() => {
    data = updateDataObject(database, attributes);
  }, 3 * 60 * 60 * 1000); // Re-initialise data object every 3 hours rather than upon client request bc mongodb takes a while
  setInterval(() => {
    updateDatabase(
      timeSeriesToUpdate,
      caseColumnsToUpdate,
      flightEntriesToUpdate
    );
  }, 3 * 60 * 60 * 1000 + 60 * 1000); // Update database every 3hrs, offset by 1min
}
