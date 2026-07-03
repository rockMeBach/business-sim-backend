const TeamProfile = require("../models/TeamProfile");

// Create Team Profile
exports.createTeamProfile = async (req, res) => {
  try {
    const { companyName, teamMembers } = req.body;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: "Company name is required"
      });
    }

    if (!teamMembers || teamMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one team member is required"
      });
    }

    const newProfile = await TeamProfile.create({
      companyName,
      teamMembers
    });

    res.status(201).json({
      success: true,
      message: "Team profile created successfully",
      data: newProfile
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
