const express = require("express");
const router = express.Router();
const axios = require("axios");
const nodemailer = require("nodemailer");
const { generateOrderEmailHTML } = require("../helpers");

const PAYSTACK_SECRET_KEY = "sk_test_d754fb2a648e8d822b09aa425d13fc62059ca08e";
const API_BASE_URL = "http://api.foodliie.com";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "fooddeck3@gmail.com",
    pass: "xyca sbvx hifi amzs", // Replace with actual password
  },
});

// Payment page route

router.post("/", async (req, res, next) => {
  const amount = req.body.amount;
  console.log("here now:", req.session.currentUser)

  if (!req.session.currentUser && req.session.cart) {
    return res.render("hompage", { cart: [], title: "Homepage" });
  }

  try {
    // Get the user ID from the session
    const userId = req.session.currentuser.userId;

    // Check if the user is authenticated
    if (!userId) {
      return res.status(401).render("login", { title: "Login Page", message: "Please log in to proceed to checkout." });
    }

    // Make the Axios call to validate coupon
    const { data } = await axios.post("https://api.foodliie.com/api/coupon/validate-coupon", {
      userId,
    });

    const couponValue = data.remainingValue || 0; // Get coupon value, default to 0 if none is returned

    // Render the checkout page with the coupon value
    res.render("checkout", {
      amount,
      couponValue,
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
/*
router.post("/", (req, res, next) => {
  const amount = req.body.amount;
  if (!req.session.cart) {
    return res.render("cart", { cart, title: "Shopping Cart" });
  }

  res.render("checkout",{
      amount ,
      couponValue : 20000,
    title: "Payment Page",
  });
});
*/
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

// Payment processing route
router.post("/process", async (req, res) => {
  console.log(req.body);
  const cart = req.session.cart;
  const { name, address, mobile, email, ordernotes, amount, paymentmethod, discountCode} = req.body;
  const userId = req.session.currentuser.userId;
  

  try {
    let discount = 0;
    let agentIdentifier = null;

    // Step 1: Validate Coupon
    if (couponCode) {
      const validateResponse = await axios.post(
        `${API_BASE_URL}/api/auth/validate-coupon`,
        { userId } // Assuming userId is the email
      );

      const activeCoupon = validateResponse.data.activeCoupon;

      if (activeCoupon) {
        discount = Math.min(amount * 0.2, activeCoupon.remainingValue);
        agentIdentifier = activeCoupon.agentIdentifier;
      } else {
        // Step 2: Activate Coupon
        const couponId = uuidv4(); // Generate a unique ID for couponId

        const activateResponse = await axios.post(`${API_BASE_URL}/api/auth/activate-coupon`, {
          userId,
          couponCode:discountCode,
          couponId
        });

        if (activateResponse.data.message === "Coupon activated successfully") {
          discount = Math.min(amount * 0.2, 50000); // Default maximum value
          agentIdentifier = activateResponse.data.coupon.agentIdentifier;
        }
      }
    }

    // Step 3: Update Coupon Value
    if (discount > 0) {
      await axios.post(`${API_BASE_URL}/api/auth/update-coupon`, {
        userId: email,
        discountAmount: discount,
      });
    }

    // Step 4: Update Agent Sales
    if (agentIdentifier) {
      await axios.post(`${API_BASE_URL}/api/agent/update-sales`, {
        agentIdentifier,
        saleAmount: amount - discount,
      });
    }

    // Final Amount After Discount
    const finalAmount = amount - discount;
  const orderPayload = {
    name,
    address,
    mobile,
    email,
    ordernotes,
    amount:finalAmount,
    paymentmethod,
    status: "processing", // Default order status
  };
    // Email Options
    const userEmailOptions = {
      from: '"FoodDeck" <fooddeck3@gmail.com>',
      to: email,
      subject: "Order Confirmation - FoodDeck",
      html: generateOrderEmailHTML(cart, { ...orderPayload, amount: finalAmount }),
    };

    const adminEmailOptions = {
      from: '"FoodDeck" <fooddeck3@gmail.com>',
      to: "fooddeck3@gmail.com",
      subject: "New Order Notification - FoodDeck",
      html: generateOrderEmailHTML(cart, { ...orderPayload, amount: finalAmount }, true),
    };

    // Step 5: Handle Cash on Delivery
    if (paymentmethod === "cashondelivery") {
      console.log('Order Successful: Payment method is "Cash on Delivery".');

      try {
        // Post order to external server
        const orderResponse = await axios.post(`${API_BASE_URL}/api/orders`, orderPayload);
        console.log(orderResponse.data);

        // Send emails
        await transporter.sendMail(userEmailOptions);
        await transporter.sendMail(adminEmailOptions);

        // Clear the cart and redirect to success page
        req.session.cart = null;
        req.flash("success_msg", "Order placed successfully with cash on delivery!");
        return res.redirect("/");
      } catch (error) {
        console.error("Error posting order to external server:", error);
        req.flash("error_msg", "Order processing failed. Please try again.");
        return res.redirect("/cart");
      }
    }

    // Step 6: Paystack Payment
    const paystackData = {
      email,
      amount: finalAmount * 100, // Amount in kobo
      callback_url: "http://api.fooddeckpro.com/payments/callback",
    };

    const response = await axios.post("https://api.paystack.co/transaction/initialize", paystackData, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    if (response.data.status) {
      const authorizationUrl = response.data.data.authorization_url;

      // Post order to external server
      const orderResponse = await axios.post(`${API_BASE_URL}/api/orders`, orderPayload);
      console.log(orderResponse.data);

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
});

module.exports = router;
