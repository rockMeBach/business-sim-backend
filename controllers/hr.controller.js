const HRConfig = require("../models/HRConfig");
const Employee = require("../models/Employee");

exports. getHRData = async (req, res) => {
  const topManagement = await Employee.find({ isTopManagement: true });
  const employees = await Employee.find({ isTopManagement: false });

  res.json({ topManagement, employees });
};

exports. saveHRConfig = async (req, res) => {
  const {
    selectedEmployees,
    trainingBudgetPerEmployee,
    bonusPerEmployee
  } = req.body;

  const employees = await Employee.find({
    _id: { $in: selectedEmployees }
  });

  const totalSalary = employees.reduce(
    (sum, emp) => sum + emp.salaryPerMonth,
    0
  );

  const config = await HRConfig.create({
    selectedEmployees,
    trainingBudgetPerEmployee,
    bonusPerEmployee
  });

  res.json({
    message: "HR config saved successfully",
    summary: {
      totalEmployees: employees.length,
      totalSalary,
      totalTrainingBudget:
        trainingBudgetPerEmployee * employees.length,
      totalBonus:
        bonusPerEmployee * employees.length
    },
    configId: config._id
  });
};
