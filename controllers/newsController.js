const News = require("../models/News");

exports.createNews = async (req, res) => {
  try {
    const news = await News.create(req.body);
    res.status(201).json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getAllNews = async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getNewsByTag = async (req, res) => {
  try {
    const tag = req.params.tag;

    const news = await News.find({
      tags: { $in: [tag] }
    }).sort({ createdAt: -1 });

    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getSingleNews = async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    res.json(article);
  } catch (err) {
    res.status(404).json({ error: "Article not found" });
  }
};
