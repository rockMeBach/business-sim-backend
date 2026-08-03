const { computeRoundScores } = require("../utils/scoringEngine");
const PlayerRoundResult = require("../models/PlayerRoundResult");
const User = require("../models/User");
const PricingDecision = require("../models/PricingDecision");

exports.calculateRound = async (req, res) => {
  try {
    const { simulationId, groupId, roundNumber } = req.body;

    if (!simulationId || !groupId || !roundNumber) {
      return res.status(400).json({ message: "simulationId, groupId, and roundNumber are required" });
    }

    const results = await computeRoundScores(simulationId, groupId, Number(roundNumber));

    const saved = await Promise.all(
      results.map((r) =>
        PlayerRoundResult.findOneAndUpdate(
          { simulationId, groupId, roundNumber: Number(roundNumber), userId: r.user._id },
          {
            userId: r.user._id,
            simulationId,
            groupId,
            roundNumber: Number(roundNumber),
            perCategory: r.perCategory,
            totalRevenue: r.totalRevenue,
            totalCogs: r.totalCogs,
            totalGrossProfit: r.totalGrossProfit,
            turnoverBonus: r.turnoverBonus,
            totalOperatingProfit: r.totalOperatingProfit,
            costBreakdown: r.costBreakdown,
            score: r.score,
            rank: r.rank,
            computedAt: new Date()
          },
          { upsert: true, new: true }
        )
      )
    );

    res.json({ message: "Round scored", results: saved });
  } catch (err) {
    console.error("SCORING CALCULATE ERROR:", err);
    res.status(500).json({ message: "Failed to calculate round scores", error: err.message });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { simulationId, groupId, roundNumber } = req.query;

    if (!simulationId || !groupId || !roundNumber) {
      return res.status(400).json({ message: "simulationId, groupId, and roundNumber are required" });
    }

    const round = Number(roundNumber);
    const users = await User.find({ simulationId: String(simulationId), groupId: String(groupId) });

    const rows = await Promise.all(
      users.map(async (user) => {
        const [pastResults, pricingDecision] = await Promise.all([
          PlayerRoundResult.find({ userId: user._id, simulationId, groupId, roundNumber: { $lte: round } }),
          // calculateRound creates a (possibly zero-score) PlayerRoundResult for every
          // user in the group regardless of whether they actually played this round —
          // so its existence can't signal "submitted". Pricing is the last of the 8
          // decision sections, so its presence for this exact round is the best proxy
          // for "this player actually completed this round".
          PricingDecision.findOne({ userId: user._id, simulationId, round })
        ]);

        const cumulativeScore = pastResults.reduce((sum, r) => sum + (r.score || 0), 0);
        const thisRoundResult = pastResults.find((r) => r.roundNumber === round);

        return {
          userId: user._id,
          username: user.username,
          roundScore: thisRoundResult?.score ?? null,
          hasSubmitted: !!pricingDecision,
          cumulativeScore
        };
      })
    );

    rows.sort((a, b) => b.cumulativeScore - a.cumulativeScore);
    rows.forEach((row, i) => { row.cumulativeRank = i + 1; });

    res.json({ roundNumber: round, players: rows });
  } catch (err) {
    console.error("SCORING LEADERBOARD ERROR:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard", error: err.message });
  }
};

const SEGMENTS = ["premium", "standard", "basic", "discount"];

// Excel's "Competitive Landscape" bar chart (row 157: base * finalMultiplier,
// pre-intensity) compares every enrolled player's raw weighted score for one
// category+segment. PlayerRoundResult.segments[segment].localScore is that
// same value (utils/scoringEngine/combine.js's segmentScore), so this just
// gathers it across every player in the group+round and anonymizes it —
// matching the frontend's existing "Competitor names hidden" messaging.
exports.getCompetitiveLandscape = async (req, res) => {
  try {
    const { simulationId, groupId, roundNumber, categoryId, segment, userId } = req.query;

    if (!simulationId || !groupId || !roundNumber || !categoryId || !segment) {
      return res.status(400).json({ message: "simulationId, groupId, roundNumber, categoryId, and segment are required" });
    }
    if (!SEGMENTS.includes(segment)) {
      return res.status(400).json({ message: "Invalid segment" });
    }

    const results = await PlayerRoundResult.find({ simulationId, groupId, roundNumber: Number(roundNumber) });

    const entries = results
      .map((r) => {
        const cat = r.perCategory.find((c) => String(c.categoryId) === String(categoryId));
        const seg = cat?.segments?.[segment];
        return seg ? { userId: String(r.userId), score: seg.localScore || 0 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const competitors = entries.map((e, i) => ({
      name: e.userId === String(userId) ? "You" : `Team ${String.fromCharCode(65 + i)}`,
      score: e.score,
      isYou: e.userId === String(userId)
    }));

    res.json({
      categoryId,
      segment,
      competitors,
      totalSegmentScore: entries.reduce((sum, e) => sum + e.score, 0)
    });
  } catch (err) {
    console.error("SCORING COMPETITIVE LANDSCAPE ERROR:", err);
    res.status(500).json({ message: "Failed to fetch competitive landscape", error: err.message });
  }
};

exports.getMyRoundResult = async (req, res) => {
  try {
    const { userId, simulationId, groupId, roundNumber } = req.query;

    if (!userId || !simulationId || !groupId || !roundNumber) {
      return res.status(400).json({ message: "userId, simulationId, groupId, and roundNumber are required" });
    }

    const result = await PlayerRoundResult.findOne({
      userId, simulationId, groupId, roundNumber: Number(roundNumber)
    });

    if (!result) {
      return res.status(404).json({ message: "Not yet computed for this round" });
    }

    res.json(result);
  } catch (err) {
    console.error("SCORING GET RESULT ERROR:", err);
    res.status(500).json({ message: "Failed to fetch round result", error: err.message });
  }
};
