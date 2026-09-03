const clientOnly = (req, res, next) => {
  if (req.user && req.user.role === "client") {
    next();
  } else {
    res.status(403).json({ message: "Client access only" });
  }
};

module.exports = clientOnly;
