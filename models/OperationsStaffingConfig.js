const mongoose = require("mongoose");

const rangeSchema = {
  min: Number,
  max: Number
};

const roleSchema = {
  min: Number,
  max: Number,
  salary: rangeSchema,
  boost: Number 
};

const operationsStaffingConfigSchema = new mongoose.Schema({
  darkStoreStaff: {
    storeManager: roleSchema,
    pickersPackers: roleSchema,
    inventoryStaff: roleSchema,
    qualityCheckers: roleSchema,
    cleaningStaff: roleSchema
  },

  deliveryStaff: {
    deliveryRiders: roleSchema,
    riderSupervisors: roleSchema
  },

  corporateTeam: {
    founders: roleSchema,
    categoryTeam: roleSchema,
    operationsTeam: roleSchema,
    techTeam: roleSchema,
    marketingTeam: roleSchema,
    supplyChainTeam: roleSchema,
    customerSupport: roleSchema
  }
}, { timestamps: true });

module.exports = mongoose.model(
  "OperationsStaffingConfig",
  operationsStaffingConfigSchema
);
