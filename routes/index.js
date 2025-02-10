const express = require("express");
const router = express.Router();
const axios = require("axios");
const nodemailer = require('nodemailer');

 const mailer = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'fooddeck3@gmail.com',
        pass: 'xyca sbvx hifi amzs',
      },
});


const API_URL = "http://api.foodliie.com/api/products";

const AUTH_API_URL = "http://api.fooddeckliie.com/api/auth";

// Homepage route
router.get("/", async (req, res) => {
  try {
    const { data: products } = await axios.get(API_URL);
    const suggestedProducts = products.sort(() => 0.5 - Math.random()).slice(0, 8);
    res.render("Homepage", { products, title: "Home" ,
        suggestedProducts
    });
  } catch (err) {
    res.status(500).send("Error loading products");
  }
});

// Auth routes

router.get("/profile", function(req, res){
    res.render("profile", {title: "Profile Page"})
})
router.get("/login", function(req, res){
    res.render("login",  {title: "Login Page"})
})
router.get("/register", function(req, res){
    res.render("register", {title: "Signup Page"})
})

router.get("/logout", function(req, res){
    req.session.currentUser = null
    res.redirect("/")
})



// Register route
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const response = await axios.post(`${AUTH_API_URL}/register`, {
      name,
      email,
      password,
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Something went wrong during registration.",
    });
  }
});
router.post("/login", async (req, res) => {
  const { password, email } = req.body;
  try {
    const response = await axios.post(`${AUTH_API_URL}/login`, {
      
      email,
      password
    });

    const { user } = response.data;
    console.log("user data", user)
    req.session.currentUser = { userId:user.id, name:user.name, email }; // Add current user to session

    // Log user data
    const logged = req.session.currentUser
    console.log("User logged in:", {logged});

    res.redirect("/");
  } catch (error) {
    // Log the error details
    console.error("Login error:", error.response?.data || error.message);

    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Something went wrong during login.",
    });
  }
});

// Add To Wishlist

router.post("/addToWishlist", async (req, res) => {
  const { productId } = req.body;

  try {
    const response = await axios.post("http://localhost:5000/api/auth/addToWishlist", { productId });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error adding to wishlist:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: "Failed to add product to wishlist." });
  }
});

// Add to recently viewed

router.post("/addToRecentlyViewed", async (req, res) => {
  const { productId } = req.body;

  try {
    const response = await axios.post("http://localhost:5000/api/auth/addToRecentlyViewed", { productId });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error adding to recently viewed:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: "Failed to add product to recently viewed." });
  }
});

//Update Address

router.post("/updateAddress", async (req, res) => {
  const { hnumber, street, city, state } = req.body;

  try {
    const response = await axios.post("http://localhost:5000/api/auth/updateAddress", {
      hnumber,
      street,
      city,
      state,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error updating address:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: "Failed to update address." });
  }
});

// Get user Profile

router.post("/getUserProfile", async (req, res) => {
  const { userId } = req.body;

  try {
    const response = await axios.post("http://localhost:5000/api/auth/getUserProfile", { userId });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error fetching user profile:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: "Failed to fetch user profile." });
  }
});


// Product detail route
router.get("/products/:id", async (req, res) => {
  try {
    const { data: product } = await axios.get(`${API_URL}/${req.params.id}`);
    const { data: allProducts } = await axios.get(API_URL);

   
    // Extract measurement data from the product
    // measurements
    const measurements = product.measurements || []; 

    const suggestedProducts = allProducts.sort(() => 0.5 - Math.random()).slice(0, 8);

    res.render("shop-detail", {
      product,
      products: suggestedProducts,
      measurements,  // Pass measurement object to the view
      title: "Product Detail"
    });
  } catch (err) {
    res.status(500).send("Error loading product details");
  }
});

// Product categories route
router.get("/products/categories/:categoryName", async (req, res) => {
    const category = req.params.categoryName;
    console.log(category)

    try {
        // Make a GET request to the external API to fetch products
        const response = await axios.get(`http://api.foodliie.com/api/categories/${category}`);
        

        // Log the response data (for debugging purposes)
        console.log("data is:", response.data);

        // Retrieve the products data from response
        const products = response.data;
        const { data: allProducts } = await axios.get(API_URL);
        const suggestedProducts = allProducts.sort(() => 0.5 - Math.random()).slice(0, 8);

        // Check if no products are found for the category
        if (!products || products.length === 0) {
            // Set flash message
            req.flash('error_msg', `No products found for the category: ${category}`);
            // Redirect to homepage
            return res.redirect('/');
        }

        // Send the category data and products to the EJS template
        res.render('category', {
            title: category.toUpperCase(),
        bestSellerProducts:suggestedProducts,
            products: products 
        });
    } catch (error) {
        // Handle any errors that might occur during the request
        //console.error(error);
        req.flash('error', 'An error occurred while fetching the products.');
        console.log(error)
        res.redirect("/")
    }
});

// Contact page route
router.get("/contact", (req, res) => {
  const title = 'Contact Us'
  res.render("contact", {title});
});

// About page route
router.get("/about", (req, res) => {
  res.render("about");
});
// Return policy page route
router.get("/return-policy", (req, res) => {
  res.render("return-policy", {title: "Return Policy"});
});
// privacy policy page route
router.get("/privacy-policy", (req, res) => {
  res.render("privacy-policy", {title: "Privacy Policy"});
});
// privacy policy page route
router.get("/faqs", (req, res) => {
  res.render("faqs", {title: "FAQ"});
});
// paystack callback route
router.get("/callback", (req, res) => {
  res.render("success", {title: "FAQ"});
});

// privacy policy page route

router.post('/enquiries', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields (name, email, message) are required.' });
  }

  try {
    // Send email to admin
    const adminMailOptions = {
      from: '"FoodDeck Contact Form" <no-reply@fooddeckpro.com.ng>',
      to: 'fooddeck3@gmail.com',
      subject: 'New Contact Form Submission',
      html: `
        <h3>New Message from Contact Form</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    };

    // Acknowledge sender with a styled HTML email
    const userMailOptions = {
      from: '"FoodDeck Support" <no-reply@fooddeckpro.com.ng>',
      to: email,
      subject: 'Thanks for Contacting FoodDeck!',
      html: `
        <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://firebasestorage.googleapis.com/v0/b/fooddeck-fc840.appspot.com/o/Logo12.png?alt=media&token=56208343-49c1-4664-853f-68e904b1eb7c" alt="FoodDeck Logo" style="max-width: 200px;">
          </div>
          <div>
            <h2 style="color: #2D7B30;">Hello, ${name}!</h2>
            <p style="font-size: 16px; color: #333;">Thank you for reaching out to FoodDeck. We’ve received your message and will get back to you as soon as possible.</p>
            <p style="font-size: 16px; color: #333;">Your Message:</p>
            <blockquote style="font-size: 14px; font-style: italic; background: #f9f9f9; padding: 10px; border-left: 4px solid #2D7B30; margin: 20px 0;">${message}</blockquote>
          </div>
          <footer style="text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 14px; color: #666;">
            <p>FoodDeck</p>
            <p>The City Mall, Onikan, Lagos</p>
            <p>Email: info@fooddeckpro.com.ng | Phone: +234 912 390 7060</p>
            <p>Website: <a href="https://www.fooddeckpro.com.ng" style="color: #2D7B30;">www.fooddeckpro.com.ng</a></p>
          </footer>
        </div>
      `,
    };

    // Assuming `mailer` is your configured mailing service
    await mailer.sendMail(adminMailOptions);
    await mailer.sendMail(userMailOptions);

    res.status(200).json({ success: 'Message sent successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while sending the message.' });
  }
});
router.get("/helpcenter", (req, res) => {
  res.render("helpcenter", {title: "FAQ"});
});





module.exports = router;
