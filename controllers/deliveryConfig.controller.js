const DeliveryConfig = require("../models/DeliveryConfig");
const PlayerStepFour = require("../models/PlayerStepFour");

exports.getDeliveryConfig = async (req, res) => {
  try {
    const config = await DeliveryConfig.findOne();

    if (!config) {
      return res.status(404).json({
        message: "Delivery configuration not found"
      });
    }

    const allPlayerDecisions = await PlayerStepFour.find({
      "deliveryFleet.ownFleet": true
    });

    let totalRiders = 0;
    let totalBikers = 0;

    allPlayerDecisions.forEach(decision => {
      if (decision.deliveryFleet) {
        totalRiders += decision.deliveryFleet.ridersPerCity || 0;
        totalBikers += decision.deliveryFleet.bikesPerCity || 0;
      }
    });

    res.json({
      ...config.toObject(),
      currentTotals: {
        totalRiders,
        totalBikers,
        message: `The total number of riders currently are ${totalRiders}. The total number of bikers currently are ${totalBikers}.`
      }
    });
  } catch (err) {
    console.error("DELIVERY CONFIG ERROR:", err);
    res.status(500).json({
      message: "Internal server error"
    });
  }
};
