const mongoose = require("mongoose");

// Set up a Schema for posts: A mongoose Schema describes what a 'post' looks like
const TimeSerieSchema = mongoose.Schema({
  attribute: {
    type: String,
    unique: true,
  },
  dates: [String],
  regions: mongoose.Mixed,
});

exports.TimeSerie = mongoose.model("timeSeries", TimeSerieSchema); // "timeSeries" will be the name of the collection that shows up in DB
// If you assigned module.exports to something then you cannot use exports.YOUR_FUNCTION
