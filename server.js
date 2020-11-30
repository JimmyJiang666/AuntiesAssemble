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

// create the user database collection
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

// create the vendor database collection
const vendorSchema = new mongoose.Schema({
  _id: String,
  storeName: String,
  dish1Name: String,
  dish1Des: String,
  dish1Price: Number,
  dish2Name: String,
  dish2Des: String,
  dish2Price: Number,
  dish3Name: String,
  dish3Des: String,
  dish3Price: Number,
  gender: String,
  nationality: String,
  lastJob: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Vendor = new mongoose.model("Vendor", vendorSchema);


passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const Order = mongoose.model('Order', {
  customerId: String,
  vendorId: String,
  dish1Name: String,
  dish1Amount: Number,
  dish2Name: String,
  dish2Amount: Number,
  dish3Name: String,
  dish3Amount: Number,
  total: Number,
  orderStatus: String
});

app.get("/", function(req, res) {
  res.render("index");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {

  const userType = req.body.userType;
  User.register({username: req.body.username}, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        if (userType == "Vendor") {
          res.redirect("/menucreation/" + req.user._id);
        } else {
          res.redirect("/vendorlist/" + req.user._id);
        }
      });
    }
  });
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        Vendor.exists({_id: req.user._id}, function(err, result) {
          if (err) {
            console.log(err);
          } else {
            if (result) {
              res.redirect("/messagecentre/" + req.user._id);
            } else {
              res.redirect("/vendorlist/" + req.user._id);
            }
          }
        });
      });
    }
  })
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get("/aboutus", function(req, res) {
  res.render("aboutus");
});

app.get("/menucreation/:_id", function(req, res) {
  res.render("menucreation", {_id: req.params._id});
});

app.post("/menucreation/:_id", function(req, res) {
  const vendor = new Vendor({
    _id: req.params._id,
    storeName: req.body.storeName,
    dish1Name: req.body.dish1Name,
    dish1Des: req.body.dish1Des,
    dish1Price: req.body.dish1Price,
    dish2Name: req.body.dish2Name,
    dish2Des: req.body.dish2Des,
    dish2Price: req.body.dish2Price,
    dish3Name: req.body.dish3Name,
    dish3Des: req.body.dish3Des,
    dish3Price: req.body.dish3Price,
    gender: req.body.gender,
    nationality: req.body.nationality,
    lastJob: req.body.lastJob
  });
  vendor.save();

  res.redirect("/messagecentre/" + req.params._id);
});

app.get("/messagecentre/:_id", function(req, res) {
  Order.find({vendorId: req.params._id}, function(err, foundOrders) {
    let foundNewOrders = [];
    let foundPastOrders = [];
    foundOrders.forEach(function(order) {
      if (order.orderStatus == "Pending") {
        foundNewOrders.push(order);
      } else {
        foundPastOrders.push(order);
      }
    });
    res.render("messagecentre", {foundNewOrders: foundNewOrders, foundPastOrders: foundPastOrders});
  });
});

app.post("/changeorderstatus/:vendorId/:orderId", function(req, res) {
  console.log("Reached changeorderstatus");
  console.log(req.body.button);
  console.log(req.params.orderId);
  if (req.body.button == "Accept") {
    Order.updateOne({_id: req.params.orderId}, {orderStatus: "Accepted"}, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully updated");
        res.redirect("/messagecentre/" + req.params.vendorId);
      }
    });
  } else {
    Order.updateOne({_id: req.params.orderId}, {orderStatus: "Declined"}, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully updated");
        res.redirect("/messagecentre/" + req.params.vendorId);
      }
    });
  }

});

app.get("/vendorlist/:_id", function(req, res) {
  Vendor.find({}, function(err, foundVendors) {
    res.render("vendorlist", {vendorList: foundVendors, customerId: req.params._id});
  });
});

app.get("/vendormenu/:customerId/:vendorId", function(req, res) {
  Vendor.findOne({_id: req.params.vendorId}, function(err, foundVendor) {
    if (err) {
      console.log(err);
    } else {
      res.render("vendormenu", {foundVendor: foundVendor, customerId: req.params.customerId});
    }
  })
});

app.post("/vendormenu/:customerId/:vendorId", function(req, res) {

  Vendor.findOne({_id: req.params.vendorId}, function(err, foundVendor) {
    if (err) {
      console.log(err);
    } else {
      const order = new Order({
        customerId: req.params.customerId,
        vendorId: req.params.vendorId,
        dish1Name: foundVendor.dish1Name,
        dish1Amount: req.body.dish1Amount,
        dish2Name: foundVendor.dish2Name,
        dish2Amount: req.body.dish2Amount,
        dish3Name: foundVendor.dish3Name,
        dish3Amount: req.body.dish3Amount,
        total: Number(req.body.dish1Amount) * foundVendor.dish1Price + Number(req.body.dish2Amount) * foundVendor.dish2Price + Number(req.body.dish3Amount) * foundVendor.dish3Price,
        orderStatus: "Pending"
      });

      order.save();
    }
  });
});

app.get("/myorders/:customerId", function(req, res) {
  Order.find({customerId: req.params.customerId}, function(err, foundOrders) {
    if (err) {
      console.log(err);
    } else {
      res.render("myorders", {orderList: foundOrders});
    }
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
