const mongoose = require("mongoose");

const WorkforceSchema = new mongoose.Schema({
  round: String,
  stayed: Number,
  newStaff: Number,
  external: Number,
  leftStaff: Number
});

const IndicatorSchema = new mongoose.Schema({
  round: String,
  workload: Number,
  motivation: Number,
  education: Number
});

const StaffSchema = new mongoose.Schema({
  round: { type: String, required: true },

  summary: {
    totalStaff: Number,
    motivation: Number,
    education: Number,
    workload: Number
  },

  workforceData: [WorkforceSchema],

  indicatorsData: [IndicatorSchema]
});

module.exports = mongoose.model("Staff", StaffSchema);