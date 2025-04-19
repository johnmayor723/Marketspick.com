const express = require("express");
const router = express.Router();
const axios = require("axios");
const nodemailer = require('nodemailer');

 const mailer = nodemailer.createTransport({
     host: "smtp.zoho.com",
     port: 465,
     secure: "true",
     auth: {
      user: "support@marketspick.com",
      pass: "#@T1onal_Mayor",
    },
});

const ID = "328728614931-3ksi7t8cv8pt1t0d1us8d9opeg6rsnvr.apps.googleusercontent.com";
const SECRET = "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";

const API_URL = "https://api.foodliie.com/api/products";

const AUTH_API_URL = "https://api.foodliie.com/api/auth";

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

// get categories

router.get("/products/categories/:category", async (req, res) => {
    console.log("reached category route")
  try {
    const category = req.params.category; // Get the category from the URL
    const { data: products } = await axios.get(API_URL); // Fetch all products

    // Filter products based on category
    const filteredProducts = products.filter(product => 
      product.category.toLowerCase().replace(/[\s&]/g, '-') === category
    );
     console.log(filteredProducts);
    res.render("categories", { 
      title: category.replace(/-/g, ' ').toUpperCase(), // Format category for display
      products: filteredProducts 
    });

  } catch (err) {
    res.status(500).send("Error loading category products");
  }
});

// Auth routes
router.get("/profile", async (req, res) => {
  try {
    // Extract userId from session
    const userId = req.session?.currentUser?.userId;

    if (!userId) {
      req.flash("error_msg", "User not logged in.");
      return res.redirect("/login");
    }

    // Send request to fetch profile data
    const response = await axios.post("https://api.foodliie.com/api/auth/profile", { userId }, {
      headers: { "Content-Type": "application/json" },
    });

    // Save response data as userData
    const userData = response.data;

    // Render profile.ejs with userData
    res.render("profile", { userData , title: "Profile Page"});
  } catch (error) {
    console.error("Error fetching user profile:", error.response?.data || error.message);
    req.flash("error_msg", "Failed to load profile.");
    res.redirect("/");
  }
});
router.get("/token-error", (req, res) => {
  res.render("token-error", {
    title: "Email Verification Failed"
  });
});

/*router.get("/profile", function(req, res){
    res.render("profile", {title: "Profile Page"})
})*/

router.get("/signup2", function(req, res){
    res.render("signup-1",  {title: "Login Page"})
})
router.get("/signin2", function(req, res){
    res.render("signin-1",  {title: "Login Page"})
})

router.get("/phone-auth", function(req, res){
    res.render("phone-auth",  {title: "Login Page"})
})
router.get("/confirm-otp", function(req, res){
    res.render("send-otp",  {title: "Login Page"})
})
// Route for successful password reset
router.get('/success-password-reset', (req, res) => {
  req.flash('success_msg', 'Your password has been reset successfully. You can now log in.');
  res.redirect('/login');
});

// Route for password reset errors
router.get('/error-password-reset', (req, res) => {
  req.flash('error_msg', 'There was an error resetting your password. Please try again.');
  res.render('login', { title: 'Login Page' });
});
// Separate route to render login page and display messages
router.get("/login", (req, res) => {
  res.render("login", { title: "Login Page" });
});

router.get("/register", (req, res) => {
  res.render("register", { title: "Login Page" });
});



// phone auth route

router.post("/send-otp", async (req, res) => {
  const { name, phoneNumber } = req.body;

  try {
    await axios.post("https://api.foodliie.com/api/auth/send-otp", { name, phoneNumber });
    res.render("send-otp", { phoneNumber, title: "" });
  } catch (error) {
    res.status(500).send("Error sending OTP");
  }
});

// 🟢 **Step 2: Confirm OTP, Authenticate, and Save Session**
router.post("/confirm-otp", async (req, res) => {
  const { phoneNumber, otp } = req.body;
   console.log(req.body);
  try {
    const response = await axios.post("https://api.foodliie.com/api/auth/confirm-otp", {
      phoneNumber,
      otp,
    });

    if (response.data.success) {
      req.session.currentUser = response.data.user;
      res.redirect("/");
    } else {
      res.send("Invalid OTP");
    }
  } catch (error) {
    res.send("Error verifying OTP");
  }
});


//google auth route

// **Step 1: Redirect to Google OAuth**
router.get("/auth/google", (req, res) => {
    const redirectUri = "https://marketspick.com/auth/google/callback"; // Web app redirect
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${ID}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile`;

    res.redirect(authUrl); // Redirect user to Google
});

// **Step 2: Handle Google OAuth Callback**
router.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;

    if (!code) {
        console.error("Google OAuth Error: No authorization code provided");
        return res.status(400).send("No authorization code provided");
    }

    console.log("Authorization Code received:", code);

    try {
        // Exchange code for access token
        console.log("Requesting Access Token...");
        const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
            client_id: ID,
            client_secret: SECRET,
            code,
            redirect_uri: "https://marketspick.com/auth/google/callback",
            grant_type: "authorization_code",
        });

        console.log("Access Token Response:", tokenResponse.data);
        const { access_token } = tokenResponse.data;

        if (!access_token) {
            throw new Error("Access token missing in response");
        }

        // Fetch user profile from Google
        console.log("Fetching Google User Info...");
        const userResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        console.log("Google User Data:", userResponse.data);
        const googleUser = userResponse.data;

        if (!googleUser.email) {
            throw new Error("Google user data missing email");
        }

        // Send User to API for Registration/Login
        console.log("Sending user data to API:", googleUser);
        const apiResponse = await axios.post("https://api.foodliie.com/api/auth/google", {
            email: googleUser.email,
            name: googleUser.name,
            googleId: googleUser.id, // Prevent duplicate registration
        });

        console.log("API Response:", apiResponse.data);
        const { user, token } = apiResponse.data;

        // Save in Session
        req.session.currentUser = user;

        console.log("User successfully authenticated, redirecting...");
        res.redirect("/");
    } catch (error) {
        console.error("Google OAuth Error:", error.response?.data || error.message);
        res.status(500).send(`Authentication failed: ${error.response?.data?.error || error.message}`);
    }
});

// Register route
// Register route
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  console.log("Register route reached");

  try {
    console.log("➡ Sending request to API with data:", { name, email, password });

    const response = await axios.post("https://api.foodliie.com/api/auth/register", {
      name,
      email,
      password,
    });

    console.log("✅ Response received:", response.status, response.data);

    const { message } = response.data;

    if ([200, 201].includes(response.status) && message) {
      if (message.toLowerCase().includes("email already registered")) {
        console.log("⚠ Email already registered. Rendering signup3...");
        return res.render("signup3", { email, title:"Sign Up" });
      }

      console.log("✅ User registered successfully. Redirecting to login...");
      req.flash("success_msg", message);
      return res.redirect("/signup2");
    }

    console.log("⚠ Unexpected response format:", response.data);
    req.flash("error_msg", "Unexpected response from server.");
    return res.redirect("/register");

  } catch (error) {
    console.error("❌ Registration error:", error.message);

    if (error.response) {
      console.error("❌ Error Status Code:", error.response.status);
      console.error("❌ Full Error Response:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("❌ No response received. Possible network error.");
    }

    const errorMessage = error.response?.data?.error || "Registration failed. Please try again.";

    if (errorMessage.toLowerCase().includes("email already registered")) {
      return res.render("signup3", { email });
    }

    req.flash("error_msg", errorMessage);
    return res.redirect("/register");
  }
});
//login route

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const response = await axios.post(`${AUTH_API_URL}/login`, {
      email,
      password
    });

    const { user } = response.data;
    console.log("User data:", user);

    req.session.currentUser = { userId: user.id, name: user.name, email }; // Add current user to session

    console.log("User logged in:", req.session.currentUser);

    req.flash("success_msg", "Login successful.");
    return res.redirect("/");

  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);

    req.flash("error_msg", error.response?.data?.error || "Invalid credentials. Please try again.");
    return res.redirect("/login");
  }
});

router.get("/logout", (req, res) => {
  // Remove only the currentUser property from the session
  delete req.session.currentUser;

  req.flash("success_msg", "You have been logged out successfully.");
  res.redirect("/login");
});
// order Success
// Success page route
router.get("/order-success", (req, res) => {
  res.render("order-success"); // Make sure you have success.ejs in your views folder
});

// Success page route
router.get("/success", (req, res) => {
  res.render("success"); // Make sure you have success.ejs in your views folder
});

router.post("/request-password-reset", async (req, res) => {
    const { email } = req.body;

    try {
        // Make request to Foodliie's API
        const response = await axios.post("https://api.foodliie.com/api/auth/request-password-reset", { email });

        // Redirect to a confirmation page (or show a success message)
        req.flash("success_msg", response.data.message)
        res.redirect("/reset-password")
    } catch (error) {
        res.status(500).json({
            error: "Failed to request password reset",
            details: error.response?.data || error.message,
        });
    }
});
router.get("/reset-password",(req, res)=>{
 res.render("request-password-reset", {title:"Reset Password"})
})

 // Route to render the password reset form
router.get("/api/auth/reset-password/:token", (req, res) => {
    const { token } = req.params;
    res.render("reset-password", { token, title:"" });
});
// Route to reset password
 router.post("/reset-password", async (req, res) => {
    const { token, password, password2 } = req.body;

    // Validate passwords match
    if (password !== password2) {
        return res.status(400).json({ error: "Passwords do not match" });
    }

    try {
        // API expects token in both request parameter and payload
        const response = await axios.post(`https://api.foodliie.com/api/auth/reset-password/${token}`, {
            token, // Token also included in the request body
            newPassword:password,
        });
         req.flash("success_msg", response.data.message);
        res.redirect("/login");
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: "Failed to reset password",
            details: error.response?.data || error.message,
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
