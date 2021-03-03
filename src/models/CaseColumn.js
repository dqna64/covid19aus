const mongoose = require("mongoose");

// Set up a Schema for geoCase: A mongoose Schema describes what a 'geoCase' looks like
const CaseColumnSchema = mongoose.Schema({
  attribute: {
    type: String,
    unique: true,
  },
  cases: [],
  summaries: mongoose.Mixed,
});

exports.CaseColumn = mongoose.model("caseColumn", CaseColumnSchema); // "caseColumn" will be the name of the collection that shows up in DB
