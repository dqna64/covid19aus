const mongoose = require("mongoose");

// Set up a Schema for posts: A mongoose Schema describes what a 'post' looks like
const UpdateLogSchema = mongoose.Schema({
  attribute: {
    type: String,
    unique: true,
  },
  times: [String],
});

exports.UpdateLogSch = mongoose.model("updateLogs", UpdateLogSchema); // "updateLogs" will be the name of the collection that shows up in DB
// If you assigned module.exports to something then you cannot use exports.YOUR_FUNCTION
