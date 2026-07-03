const Staff = require("../models/StaffModel");

exports.getStaffData = async (req, res) => {
  try {
    const round = req.query.round || "R5";

    const data = await Staff.findOne({ round });

    if (!data) {
      return res.status(404).json({ message: "Staff data not found" });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};