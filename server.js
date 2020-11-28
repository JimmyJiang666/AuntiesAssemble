const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "AuntiesAssembleSecret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/auntieDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  userType: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// the Menu collection stores each vendor menu as an entry. Each menu contains information of 3 dishes
const Menu = mongoose.model('Menu', {
  storeName: String,
  dish1Name: String,
  dish1Des: String,
  dish1Price: Number,
  dish2Name: String,
  dish2Des: String,
  dish2Price: Number,
  dish3Name: String,
  dish3Des: String,
  dish3Price: Number
});

const Order = mongoose.model('Order', {
  customerName: String,
  storeName: String,
  dish1Name: String,
  dish1Amount: Number,
  dish2Name: String,
  dish2Amount: String,
  dish3Name: String,
  dish3Amount: String
});




app.get("/", function(req, res) {
  res.render("index");
});

app.get("/register", function(req, res) {
  res.render("register");
});

// app.post("/register", function(req, res) {
//   // if the user registers as a vendor, save user info and redirect to menu creation page
//   if (req.body.userType == "Vendor") {
//     res.
//   } else { // if the user registers as a customer, save user info and redirect to vendor list page
//
//   }
//
// });

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/aboutus", function(req, res) {
  res.render("aboutus");
});

app.get("/menucreation", function(req, res) {
  res.render("menucreation");
});

app.post("/menucreation", function(req, res) {
  const menu = new Menu({
    storeName: req.body.storeName,
    dish1Name: req.body.dish1Name,
    dish1Des: req.body.dish1Des,
    dish1Price: req.body.dish1Price,
    dish2Name: req.body.dish2Name,
    dish2Des: req.body.dish2Des,
    dish2Price: req.body.dish2Price,
    dish3Name: req.body.dish3Name,
    dish3Des: req.body.dish3Des,
    dish3Price: req.body.dish3Price
  });
  menu.save();
  // upon submission, direct the vendor to message centre page
  res.redirect("/messagecentre")
});

// app.get("/messagecentre", function(req, res) {
//   Order.find({storeName: }, function(err, foundVendors) {
//     res.render("vendorlist", {vendorList: foundVendors});
//   });
// });

app.get("/vendorlist", function(req, res) {
  Menu.find({}, function(err, foundVendors) {
    res.render("vendorlist", {vendorList: foundVendors});
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
