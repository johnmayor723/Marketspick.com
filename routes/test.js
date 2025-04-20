const express = require("express");
const router = express.Router();
const axios = require("axios");
const nodemailer = require("nodemailer");
const { generateOrderEmailHTML } = require("../helpers");

const PAYSTACK_SECRET_KEY = "sk_test_d754fb2a648e8d822b09aa425d13fc62059ca08e";
const API_BASE_URL = "https://api.foodliie.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "marketpicks723@gmail.com",
    pass: "yvbqttivjtmvlbhp", // Replace with actual password
  },
});

/*const transporter = nodemailer.createTransport({
  host: 'smtp.mailersend.net', // SMTP server
  port: 587, // Use port 587 for TLS connection
  secure: false, // Set to false for TLS connection
  auth: {
    user: 'MS_5jbt07@test-86org8e2x8egew13.mlsender.net', // Your SMTP username
    pass: 'mssp.1l7pSPW.3yxj6ljvwm1ldo2r.NmpWxBh', // Your SMTP password
  },
  tls: {
    rejectUnauthorized: false, // Disable certificate validation if needed
  },
});*/

// Payment function
async function processOrderPayment(req, res, finalAmount) {
  try {
    const { name, address, mobile, email, ordernotes, paymentmethod } = req.body;
    const cart = req.session.cart;
    const total = finalAmount + 3000;
    const amount = 0.2 * total;
    const orderPayload = {
      name,
      address,
      mobile,
      email,
      ordernotes,
      amount,
      paymentmethod,
      status: "processing", // Default order status
    };

    console.log("order payload:", orderPayload);

    // Address update function
    const updateAddress = async (id, dataMobile, dataAddress) => {
      try {
        const addressPayload = {
          userId: id,
         mobile: dataMobile,
            hnumber: 1,
            street: dataAddress,
            city: "Lagos",
            state: "Lagos",
          };
        
        console.log("address payload:", addressPayload);
        const response = await axios.put(
          "https://api.foodliie.com/api/auth/update-address",
          addressPayload,
          {
            headers: {
              "Content-Type": "application/json",
            }
          }
        );

        console.log("Address updated successfully:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error updating address:", error.response?.data || error.message);
        throw error;
      }
    };

    // Email Options
    const userEmailOptions = {
      from: '"Market Picks" <marketpicks723@gmail.com>',
      to: email,
      subject: "Order Confirmation -",
      html: generateOrderEmailHTML(cart, orderPayload),
    };

    const adminEmailOptions = {
      from: '"Market Picks" <marketpicks723@gmail.com>',
      to: "fooddeck3@gmail.com",
      subject: "New Order Notification - FoodDeck",
      html: generateOrderEmailHTML(cart, orderPayload, true),
    };

    // Step 1: Handle Cash on Delivery
    if (paymentmethod === "cashondelivery") {
      console.log('Order Successful: Payment method is "Cash on Delivery".');

      try {
        // Post order to external server
        const orderResponse = await axios.post(`${API_BASE_URL}/api/orders`, orderPayload);
        console.log(orderResponse.data);

        // Update user address
        await updateAddress(req.session.currentUser.userId, mobile, address);

        // Send emails
        await transporter.sendMail(userEmailOptions);
        await transporter.sendMail(adminEmailOptions);

        // Clear the cart and redirect to success page
        req.session.cart = null;
        req.flash("success_msg", "Order placed successfully. Please make payment  on delivery!");
        return res.redirect("/order-success");
      } catch (error) {
        console.error("Error posting order to external server:", error);
        req.flash("error_msg", "Order processing failed. Please try again.");
        return res.redirect("/cart");
      }
    }

    // Step 2: Handle Paystack Payment
    const paystackData = {
      email,
      amount: finalAmount * 100, // Amount in kobo
      callback_url: "https://api.foodliie.com/payments/callback",
    };

    const response = await axios.post("https://api.foodliie.com/api/orders/initialize", paystackData);

    if (response.data) {
      const authorizationUrl = response.data.authUrl;

      // Post order to external server
      const orderResponse = await axios.post(`${API_BASE_URL}/api/orders`, orderPayload);
      console.log(orderResponse.data);

      // Update user address
      await updateAddress(req.session.currentUser.userId, mobile, address);

      // Send emails
      await transporter.sendMail(userEmailOptions);
      await transporter.sendMail(adminEmailOptions);

      // Clear the cart and redirect user to Paystack payment page
      req.session.cart = null;
      return res.redirect(authorizationUrl);
    } else {
      req.flash("error_msg", "Payment initialization failed. Please try again.");
      return res.redirect("/cart");
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    req.flash("error_msg", "Payment processing failed. Please try again.");
    return res.redirect("/cart");
  }
}


// Payment page route

router.post("/", async (req, res, next) => {
  const amount = req.body.amount;
  console.log("here now:", req.session.currentUser)

  if (!req.session.currentUser && req.session.cart) {
    return res.render("homepage", { cart: [], title: "Homepage" });
  }

  try {
    // Get the user ID from the session
    const userId = req.session.currentUser.userId;

    // Check if the user is authenticated
    if (!userId) {
      return res.status(401).render("login", { title: "Login Page", message: "Please log in to proceed to checkout." });
    }
    console.log('making axios call to validare coupon')

    // Make the Axios call to validate coupon
    const { data } = await axios.post("https://api.foodliie.com/api/auth/validate-coupon", {
      userId,
    });
    
    const couponValue = data.coupon.value || 0; // Get coupon value, default to 0 if none is returned
console.log("coupon value:", couponValue);

// Determine the template to render
const template = couponValue > 0 ? "checkout2" : "checkout";

// Render the appropriate checkout page
res.render(template, {
  amount,
  couponValue,
  discount: amount*20/100,
  title: "Payment Page",
});


  } catch (error) {
    console.error("Error validating coupon:", error.message);

    // If an error occurs, render the checkout page without a coupon value
    res.render("checkout", {
      amount,
      couponValue: 0, // Default coupon value to 0 in case of error
      title: "Payment Page",
      error_msg: "Unable to validate coupon. Please try again later.",
    });
  }
});

// Callback route
router.get("/callback", async (req, res) => {
  try {
    const trxref = req.query.trxref;
    const ref = req.query.reference;

    if (trxref || ref) {
      console.log("Transaction reference (trxref):", trxref);
      console.log("Payment reference (reference):", ref);
      res.render("success", { title: "Successful Payment Page" });
    } else {
      console.log("No transaction data received");
      res.render("success", { title: "Successful Payment Page" });
    }
  } catch (error) {
    console.error("Error handling the callback:", error);
    res.status(500).json({
      message: "An error occurred while processing your order.",
      error: error.message,
    });
  }
});
router.post("/process", async (req, res) => {
  try {
    const { name, address, mobile, email, ordernotes, amount, paymentmethod, discountCode } = req.body;
    const userId = req.session.currentUser.userId;
    const cart = req.session.cart;

    let finalAmount = amount; // Initialize finalAmount

    console.log("Processing order for user:", userId);
    console.log("Initial amount:", amount);
    console.log("Discount code provided:", discountCode || "None");

    // Step 1: Check for active coupon
    const couponResponse = await axios.post('https://api.foodliie.com/api/auth/validate-coupon', { userId });
    console.log("Coupon validation response:", couponResponse.data);

    const activeCoupon = couponResponse.data?.coupon;

    if (!activeCoupon && !discountCode) {
      // Case 1: No active coupon and no discount code → Proceed with full payment
      console.log("No active coupon and no discount code. Proceeding with full payment.");
      return await processOrderPayment(req, res, finalAmount, userId);
    } 
    else if (activeCoupon) {
      // Case 2: User already has an active coupon → Apply discount
      console.log("Active coupon found:", activeCoupon);

      const maxDiscount = finalAmount * 0.2; // Max 20% discount
      const discountApplied = Math.min(activeCoupon.value, maxDiscount);
      finalAmount -= discountApplied;

      console.log(`Applying discount: ${discountApplied}, Final amount after discount: ${finalAmount}`);

      // Update coupon value
      const updatedValue = activeCoupon.value - discountApplied;
      const isValid = updatedValue > 0;

     /* await axios.put(`${API_BASE_URL}/api/auth/update-coupon`, {
        userId,
        couponId: activeCoupon.couponId,
        usedValue: discountApplied,
        
      });

      console.log("Coupon updated successfully.");

      // Update agent sales
      await axios.patch(`${API_BASE_URL}/api/agent`, {
        couponCode: activeCoupon.couponCode,
        amount: finalAmount,
      });*/

      return await processOrderPayment(req, res, finalAmount, userId);
    } 
    else {
      // Case 3: No active coupon, but discountCode is provided → Verify and activate
      console.log("No active coupon, verifying discount code:", discountCode);

      const verifyResponse = await axios.post("https://api.foodliie.com/api/agent/verify-couponCode", {
        couponCode: discountCode,
      });

      console.log("Discount code verification response:", verifyResponse.data);

      if (!verifyResponse.data?.couponCode) {
        console.log("Invalid discount code. Proceeding with full payment.");
        return await processOrderPayment(req, res, finalAmount, userId);
      }

      console.log("Valid discount code. Activating for user.");

      // Activate coupon for user
      const activateResponse = await axios.post(`${API_BASE_URL}/api/auth/activate-coupon`, {
        couponCode: discountCode,
        userId,
      });

      console.log("Coupon activation response:", activateResponse.data);

      if (!activateResponse.data?.coupon) {
        req.flash("error_msg", "Coupon activation failed.");
        return res.redirect("/cart");
      }

      const activatedCoupon = activateResponse.data.coupon;

      // Apply discount
      const maxDiscount = finalAmount * 0.2;
      const discountApplied = Math.min(activatedCoupon.value, maxDiscount);
      finalAmount -= discountApplied;

      console.log(`Activated coupon applied: ${discountApplied}, Final amount: ${finalAmount}`);

      // Update coupon value
      const updatedValue = activatedCoupon.value - discountApplied;
      const isValid = updatedValue > 0;

      await axios.put(`${API_BASE_URL}/api/auth/update-coupon`, {
        userId,
        couponId: activatedCoupon.couponId,
        usedValue: discountApplied,
        
      });

      console.log("Updated activated coupon value.");

  console.log(amount)
  console.log("final amount is", finalAmount)

     res.render("checkout2", {
        amount: finalAmount,
        couponValue:activatedCoupon.value,
        discount: amount*20/100,
        title: "Payment Page",
       });

    }

  } catch (error) {
    console.error("Error processing payment:", error);
    req.flash("error_msg", "Payment processing failed. Please try again.");
    return res.redirect("/cart");
  }
});

module.exports = router;
