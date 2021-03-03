const mongoose = require("mongoose");

// Set up a Schema for geoCase: A mongoose Schema describes what a 'geoCase' looks like
const FlightEntrySchema = mongoose.Schema({
  Flight: String,
  Airline: String,
  Origin: String,
  Destination: String,
  "Date of departure": String,
  "Date of arrival": String,
  "Close contact rows": String,
});

// exports.FlightEntry = mongoose.model("flightEntries", FlightEntrySchema); // Creates a new model 'domesticEntries which consists of documents of the Schema 'FlightEntrySchema'

exports.DomesticEntry = mongoose.model("domesticEntries", FlightEntrySchema); // Creates a new model 'domesticEntries which consists of documents of the Schema 'FlightEntrySchema'
exports.InternationalEntry = mongoose.model(
  "internationalEntries",
  FlightEntrySchema
);
