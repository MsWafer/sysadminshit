const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { check, validationResult } = require("express-validator");
const auth = require("../middleware/auth");
const manauth = require("../middleware/manauth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/usr/src/app/public/avatars");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + "-" + path.extname(file.originalname)
    );
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Разрешенны только .jpg, .png, .jpeg"));
    }
  },
});

const User = require("../models/User");
const Project = require("../models/Project");
const Sprint = require("../models/Sprint");
const Merc = require("../models/Merc");


//new user-merc
router.post("/new", manauth, async (req, res) => {
  try {
    let { name, lastname, partition, email, phone } = req.body;
    let fullname = lastname + " " + name;
    let merc = true;
    let newMerc = new User({
      name,
      lastname,
      fullname,
      email,
      phone,
      partition,
      merc,
    });
    await newMerc.save();
    return res.json({ msg: "Новый субподрядчик добавлен", merc: newMerc });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ err: "server error" });
  }
});

//get all merc new
router.get("/search", auth, async (req, res) => {
  try {
    let merc;
    if (req.query.name == "all") {
      merc = await User.find({ merc: true });
    } else {
      merc = await User.findOne({ fullname: req.query.name });
    }
    if (!merc) {
      return res.status(404).json({ err: "Субподрядчик не найден" });
    }
    return res.json(merc);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ err: "server error" });
  }
});

//edit merc new
router.put("/new/edit/:id", manauth, async (req, res) => {
  try {
    let merc = await User.findOne({ _id: req.params.id });
    if (!merc) {
      return res.status(404).json({ err: "Субподрядчик не найден" });
    }
    merc.name = req.body.name;
    merc.lastname = req.body.lastname;
    merc.fullname = req.body.lastname + " " + req.body.name;
    merc.email = req.body.email;
    merc.phone = req.body.phone;
    merc.partition = req.body.partition;
    await merc.save();
    return res.json(merc);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ err: "server error" });
  }
});

//delete merc new
router.delete("/:id", manauth, async (req, res) => {
  try {
    await User.findOneAndRemove({ _id: req.params.id });
    await Project.updateMany(
      { projects: req.params.id },
      { $pull: req.params.id }
    );
    return res.json({ msg: "Субподрядчик удален" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ err: "server error" });
  }
});

//////////OLD/////////////////

//new merc
router.post("/", async (req, res) => {
  if (!req.body.name || !req.body.lastname) {
    return res.json({ err: "Заполните все поля" });
  }
  let { name, lastname, contacts, job, partitions } = req.body;
  let fullname = req.body.lastname + " " + req.body.name;

  try {
    let merc = await Merc.findOne({ fullname });
    if (merc) {
      return res
        .status(400)
        .json({ err: "Субподрядчик с указанным именем уже существует" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ err: "server error" });
  }

  try {
    merc = new Merc({
      name,
      lastname,
      fullname,
      contacts,
      job,
      partitions,
    });

    await merc.save();
    return res.json({ msg: `Субподрядчик ${fullname} добавлен`, merc: merc });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("server error");
  }
});

//delete merc
router.delete("/", manauth, async (req, res) => {
  try {
    let merc = await Merc.findOne({ fullname: req.body.fullname });
    if (!merc) {
      return res.status(404).json({ err: "Субподрядчик не найден" });
    }
    await merc.remove();
    return res.json({ msg: "Субподрядчик удален" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ err: "server error" });
  }
});

//edit merc
router.put("/edit/:id", manauth, async (req, res) => {
  try {
    let merc = await Merc.findOne({ _id: req.params.id });
    if (!merc) {
      return res.status(404).json({ err: "Субподрядчик не найден" });
    }
    merc.name = req.body.name;
    merc.lastname = req.body.lastname;
    merc.fullname = req.body.lastname + " " + req.body.name;
    merc.contacts.phone = req.body.phone;
    merc.contacts.email = req.body.email;
    merc.partitions = req.body.partitions;
    await merc.save();
    return res.json(merc);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ err: "server error" });
  }
});

//add contact
router.put("/contact/:id", manauth, async (req, res) => {
  try {
    let merc = await Merc.findOne({ _id: req.params.id });
    if (!merc) {
      return res.status(404).json({ err: "Субподрядчик не найден" });
    }
    merc.contacts[req.body.property] = req.body.value;
    await merc.save();
    return res.json(merc);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ err: "server error" });
  }
});

//get mercs
router.get("/find", async (req, res) => {
  try {
    let merc;
    if (req.query.name == "all") {
      merc = await Merc.find();
    } else {
      merc = await Merc.findOne({ fullname: req.query.name });
    }
    if (!merc) {
      return res.status(404).json({ err: "Субподрядчик не найден" });
    }
    return res.json(merc);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ err: "server error" });
  }
});

module.exports = router;
