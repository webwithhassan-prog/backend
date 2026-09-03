const EBook = require("../models/EBook");

// @desc Get all e-books (public)
const getPublicEbooks = async (req, res) => {
  try {
    const ebooks = await EBook.find();
    res.json(ebooks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get all e-books (admin)
const getEbooks = async (req, res) => {
  try {
    const ebooks = await EBook.find();
    res.json(ebooks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create an e-book
const createEbook = async (req, res) => {
  try {
    const ebook = await EBook.create(req.body);
    res.status(201).json(ebook);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update an e-book
const updateEbook = async (req, res) => {
  try {
    const ebook = await EBook.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ebook) return res.status(404).json({ message: "E-book not found" });
    res.json(ebook);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete an e-book
const deleteEbook = async (req, res) => {
  try {
    const ebook = await EBook.findByIdAndDelete(req.params.id);
    if (!ebook) return res.status(404).json({ message: "E-book not found" });
    res.json({ message: "E-book removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getPublicEbooks,
  getEbooks,
  createEbook,
  updateEbook,
  deleteEbook,
};
