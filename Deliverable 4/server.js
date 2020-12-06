const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const flash = require("connect-flash");

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

// Connecting to online database
mongoose.connect('mongodb+srv://admin-runyao:Test-123@cluster0.ikufz.mongodb.net/auntieDB?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});
// Connecting to local database
// mongoose.connect('mongodb://localhost:27017/auntieDB', {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.set("useCreateIndex", true);

// create the user database collection
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  userType: String
});

// create the vendor database collection
const vendorSchema = new mongoose.Schema({
  _id: String,
  storeName: String,
  storeInfo: String,
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
  lastJob: String,
  firstName: String,
  lastName: String,
  address: String,
  address2: String,
  countryOfResidence: String
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
  storeName: String,
  dish1Name: String,
  dish1Amount: Number,
  dish1Price: Number,
  dish1Total: Number,
  dish2Name: String,
  dish2Amount: Number,
  dish2Price: Number,
  dish2Total: Number,
  dish3Name: String,
  dish3Amount: Number,
  dish3Price: Number,
  dish3Total: Number,
  total: Number,
  orderStatus: String,
  orderTime: String
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
        if (userType == "Vendor") { // if user registers as a vendor, redirect the user to menu creation page
          User.updateOne({_id: req.user._id}, {userType: "Vendor"}, function(err) {
            if (err) {
              console.log(err);
            } else {
              res.redirect("/menucreation/" + req.user._id);
            }
          });
        } else {
          User.updateOne({_id: req.user._id}, {userType: "Customer"}, function(err) {
            if (err) {
              console.log(err);
            } else {
              res.redirect("/vendorlist/" + req.user._id);
            }
          });
        }
      });
    }
  });
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      passport.authenticate("local")(req, res, function() {

        Vendor.exists({_id: req.user._id}, function(err, result) {
          if (err) {
            console.log(err);
          } else {
            if (result) { // if the user is a vendor who has created menu, redirect to message centre
              return res.redirect("/messagecentre/" + req.user._id);
            } else {
              User.findOne({_id: req.user._id}, function(err, foundUser) {
                if (foundUser.userType == "Vendor") { // if the user is a vendor who has yet to create the menu, redirect to menu creation page
                  return res.redirect("/menucreation/" + req.user._id);
                } else {
                  Order.find({customerId: req.user._id, orderStatus: "Waiting for customer's confirmation"}, function(err, foundOrders) {
                    if (foundOrders.length == 0) {
                      return res.redirect("/vendorlist/" + req.user._id); // if the user is a customer without orders waiting for confirmation, redirect to vendor list
                    } else {
                      return res.redirect("/checkout/" + foundOrders[0]._id + "/" + req.user._id); // if the user is a customer with an order waiting for confirmation, redirect to checkout page
                    }
                  });
                }
              });
            }
          }
        });
      });
    });
  })(req, res, next);
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get("/aboutus", function(req, res) {
  res.render("aboutus");
});

// direct vendor to menu creation page after registration
app.get("/menucreation/:_id", function(req, res) {
  res.render("menucreation", {_id: req.params._id});
});

// when a vendor submits the menu
app.post("/menucreation/:_id", function(req, res) {
  const vendor = new Vendor({
    _id: req.params._id,
    storeName: req.body.storeName,
    storeInfo: req.body.storeInfo,
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
    lastJob: req.body.lastJob,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    address: req.body.address,
    address2: req.body.address2,
    countryOfResidence: req.body.countryOfResidence
  });
  vendor.save();

  res.redirect("/messagecentre/" + req.params._id);
});

// display all orders for a vendor after login
app.get("/messagecentre/:_id", function(req, res) {
  Order.find({vendorId: req.params._id}, function(err, foundOrders) {
    let foundNewOrders = [];
    let foundPendingOrders = [];
    let foundPastOrders = [];
    foundOrders.forEach(function(order) {
      if (order.orderStatus == "Waiting for vendor's confirmation") {
        foundNewOrders.push(order);
      } else if (order.orderStatus == "Pending") {
        foundPendingOrders.push(order);
      } else if (order.orderStatus == "Finished" || order.orderStatus == "Declined"){
        foundPastOrders.push(order);
      }
    });
    res.render("messagecentre", {foundNewOrders: foundNewOrders, foundPendingOrders: foundPendingOrders, foundPastOrders: foundPastOrders});
  });
});

// facilitate order status changes initiated by vendor
app.post("/changeorderstatus/:change/:vendorId/:orderId", function(req, res) {
  if (req.params.change == "accept") {
    if (req.body.button == "Accept") {
      Order.updateOne({_id: req.params.orderId}, {orderStatus: "Pending"}, function(err) {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/messagecentre/" + req.params.vendorId);
        }
      });
    } else {
      Order.updateOne({_id: req.params.orderId}, {orderStatus: "Declined"}, function(err) {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/messagecentre/" + req.params.vendorId);
        }
      });
    }
  } else {
    Order.updateOne({_id: req.params.orderId}, {orderStatus: "Finished"}, function(err) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/messagecentre/" + req.params.vendorId);
      }
    });
  }
});

// when a customer logs in to see all the available vendors
app.get("/vendorlist/:_id", function(req, res) {
  Vendor.find({}, function(err, foundVendors) {
    res.render("vendorlist", {vendorList: foundVendors, customerId: req.params._id});
  });
});

// when a customer navigates to a particular vendor's menu
app.get("/vendormenu/:customerId/:vendorId", function(req, res) {
  Vendor.findOne({_id: req.params.vendorId}, function(err, foundVendor) {
    if (err) {
      console.log(err);
    } else {
      res.render("vendormenu", {foundVendor: foundVendor, customerId: req.params.customerId});
    }
  })
});

// when a customer clicks checkout on vendor menu page, store the order into the Order collection in database
app.post("/vendormenu/:customerId/:vendorId", function(req, res) {

  Vendor.findOne({_id: req.params.vendorId}, function(err, foundVendor) {
    if (err) {
      console.log(err);
    } else {

      const order = new Order({
        customerId: req.params.customerId,
        vendorId: req.params.vendorId,
        storeName: foundVendor.storeName,
        dish1Name: foundVendor.dish1Name,
        dish1Amount: req.body.dish1Amount,
        dish1Price: foundVendor.dish1Price,
        dish1Total: Number(req.body.dish1Amount) * foundVendor.dish1Price,
        dish2Name: foundVendor.dish2Name,
        dish2Amount: req.body.dish2Amount,
        dish2Price: foundVendor.dish2Price,
        dish2Total: Number(req.body.dish2Amount) * foundVendor.dish2Price,
        dish3Name: foundVendor.dish3Name,
        dish3Amount: req.body.dish3Amount,
        dish3Price: foundVendor.dish3Price,
        dish3Total: Number(req.body.dish3Amount) * foundVendor.dish3Price,
        total: (Number(req.body.dish1Amount) * foundVendor.dish1Price + Number(req.body.dish2Amount) * foundVendor.dish2Price + Number(req.body.dish3Amount) * foundVendor.dish3Price).toFixed(2),
        orderStatus: "Waiting for customer's confirmation",
        orderTime: new Date().toLocaleString("en-GB")
      });

      order.save(function(err) {
        res.redirect("/checkout/" + order._id + "/" + req.params.customerId);
      });
    }
  });
});

// when a customer clicks checkout on vendor menu page and the new order is stored in database
app.get("/checkout/:orderId/:customerId", function(req, res) {
  Order.findOne({_id: req.params.orderId}, function(err, foundOrder) {
    if (err) {
      console.log(err);
    } else {
      res.render("checkout", {foundOrder: foundOrder, customerId: req.params.customerId});
    }
  });
});

// when a customer confirms an order on checkout page
app.post("/checkout/:orderId/:customerId", function(req, res) {
  Order.updateOne({_id: req.params.orderId}, {orderStatus: "Waiting for vendor's confirmation"}, function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/ordersuccess/" + req.params.customerId);
    }
  });
});

// when a customer decides to cancel order at the checkout page
app.post("/deleteorder/:orderId/:customerId", function(req, res) {
  Order.deleteOne({_id: req.params.orderId}, function(err) {
    res.redirect("/vendorlist/" + req.params.customerId);
  });
});

// when an order is successfully placed
app.get("/ordersuccess/:customerId", function(req, res) {
  res.render("ordersuccess", {customerId: req.params.customerId});
});

// when a customer wishes to see all his/her orders
app.get("/myorders/:customerId", function(req, res) {
  Order.find({customerId: req.params.customerId}, function(err, foundOrders) {
    if (err) {
      console.log(err);
    } else {
      res.render("myorders", {orderList: foundOrders});
    }
  });
});

// set up the port
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started successfully");
});
