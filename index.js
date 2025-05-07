const express = require('express');
const session = require('express-session'); 
const path = require('path');
const MongoStore = require('connect-mongo');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const flash = require('connect-flash');

const app = express();
const couponCronJob =require('./api/config/cron');
//Importing routes
const indexRouter = require("./routes/index");
const cartRouter = require("./routes/cart");
const paymentRouter = require("./routes/payment");

// Importing api routes

const authRoutes = require("./api/routes/auth");
const productRoutes = require("./api/routes/productRoutes");
const orderRoutes = require("./api/routes/orderRoutes");
const cartRoutes = require("./api/routes/cartRoutes");
const categoryRoutes = require("./api/routes/categoryRoutes");
const agentRoutes = require("./api/routes/agentRoutes");


// MongoDB Connection URL
const DBURL = "mongodb+srv://Pantryhubadmin:pantryhub123@cluster0.qjbxk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Use express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layout');

// Setting app middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'mysupersecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: DBURL }),
  cookie: { secure: false }
}));
app.use(flash());

// Middleware to pass session data and flash message to views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Initialize cart in session
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = {
            items: [],
            totalQty: 0,
            totalAmount: 0
        };
    }
    next();
});

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Connect to MongoDB using Mongoose
mongoose.connect(DBURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
//Start cron job
couponCronJob()



// Define routes after establishing connection

//api route
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/agents', agentRoutes);

// client routes
app.use("/", indexRouter);
app.use("/cart", cartRouter);
app.use("/payments", paymentRouter); 


// Start the server
const PORT = process.env.PORT || 3010;
app.listen(PORT,"0.0.0.0", () => {
      console.log(`Server is running on https://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
 });
