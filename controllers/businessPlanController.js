// const BusinessPlan = require("../models/BusinessPlan");
// const SavedBusinessPlan = require("../models/SavedBusinessPlan");

// // GET SECTION DATA (from BusinessPlan - manual/template data)
// exports.getSection = async (req, res) => {
//   try {
//     const { section } = req.params;

//     const result = await BusinessPlan.findOne({ section });

//     if (!result) {
//       return res.status(404).json({ message: "Section not found" });
//     }

//     res.json(result.data);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };


// // SAVE SECTION (gets data from BusinessPlan and saves to SavedBusinessPlan)
// exports.saveSection = async (req, res) => {
//   try {
//     const { section } = req.params;

//     // Get data from BusinessPlan (manually inserted data)
//     const businessPlanData = await BusinessPlan.findOne({ section });

//     if (!businessPlanData) {
//       return res.status(404).json({ message: "No data found to save" });
//     }

//     // Save to SavedBusinessPlan
//     const saved = await SavedBusinessPlan.create({
//       section,
//       data: businessPlanData.data,
//       savedAt: new Date()
//     });

//     res.json({ message: "Data saved successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
// controllers/businessPlanController.js
const BusinessPlan = require("../models/BusinessPlan");
const SavedBusinessPlan = require("../models/SavedBusinessPlan");

// GET SECTION (template/master)
exports.getSection = async (req, res) => {
  try {
    const { section } = req.params;
    const result = await BusinessPlan.findOne({ section });
    if (!result) return res.status(404).json({ message: "Section not found" });
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SAVE SECTION (create a new saved entry each time)
exports.saveSection = async (req, res) => {
  try {
    const { section } = req.params;
    const payload = req.body.data;

    if (!payload) return res.status(400).json({ message: "No data provided to save" });

    const doc = await SavedBusinessPlan.create({
      section,
      data: payload,
      savedAt: new Date()
    });

    res.json({ success: true, doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};  
