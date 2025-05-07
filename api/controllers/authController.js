const User = require('../models/User');
const UserEmail = require('../models/UserEmail');

const Coupon = require('../models/Coupon');
const CouponCode = require('../models/CouponCode')
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

const jwtSecret = "%^^__64sffyyyuuyrrrewe32e";
const client = new OAuth2Client("328728614931-3ksi7t8cv8pt1t0d1us8d9opeg6rsnvr.apps.googleusercontent.com");

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body; // Get the Google token from the frontend

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "328728614931-3ksi7t8cv8pt1t0d1us8d9opeg6rsnvr.apps.googleusercontent.com",
    });

    const { name, email, picture, sub } = ticket.getPayload(); // Extract user info

    let user = await User.findOne({ email });

    if (!user) {
      // Register new user if they don't exist
      user = new User({ name, email, password: sub }); // Use Google 'sub' as a dummy password
      await user.save();
    }

    // Generate JWT token for session
    const jwtToken = jwt.sign({ userId: user._id },jwtSecret , {
      expiresIn: '7d',
    });

    res.json({ token: jwtToken, user });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};



exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    await UserEmail.deleteOne({ email });

    const token = crypto.randomBytes(32).toString("hex");

    const pendingUser = new UserEmail({ name, email, password, token });
    await pendingUser.save();

    const verificationUrl = `https://api.marketspick.com/api/auth/verify-email/${token}`;

    const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">

    <!-- Header -->
    <div style="text-align: center; padding: 10px;">
      <img src="https://firebasestorage.googleapis.com/v0/b/videohub-a1679.appspot.com/o/mmm12%20(1).png?alt=media&token=223e4e08-a842-482b-80d6-cba61213389f" 
           alt="Marketpicks Logo" 
           style="height: 50px;" />
    </div>

    <hr style="border: 0; border-top: 1px solid #ccc;">

    <!-- Body -->
    <div style="padding: 20px;">
      <p>Hi ${name},</p>
      <p>Thank you for registering with <strong>Marketpicks</strong>. Please click the button below to verify your email address:</p>
      <a href="${verificationUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        margin: 10px 0;
        background-color: #4CAF50;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
      ">Verify Email</a>
      <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">${verificationUrl}</p>
    </div>

    <hr style="border: 0; border-top: 1px solid #ccc;">

    <!-- Footer -->
    <div style="text-align: center; padding: 10px; font-size: 14px; color: #555;">
      <p><strong>www.marketspick.com</strong></p>
      <p>Email: info@marketspick.com | Phone: 09123907060</p>
    </div>

  </div>
`;
    await sendEmail(email, "Verify Your Email", htmlContent);

    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Updated sendEmail function
const sendEmail = async (to, subject, html) => {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'marketpicks723@gmail.com',
      pass: 'yvbqttivjtmvlbhp'
    }
  });

  await transporter.sendMail({
    from: '"Market Picks" <marketpicks723@gmail.com>',
    to,
    subject,
    html
  });
};

/*exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already used by an active user
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    // Remove any pending unverified user with same email
    await UserEmail.deleteOne({ email });

    const token = crypto.randomBytes(32).toString("hex");

    const pendingUser = new UserEmail({ name, email, password, token });
    await pendingUser.save();

    const verificationUrl = `https://api.foodliie.com/api/auth/verify-email/${token}`;
    await sendEmail(email, "Verify Your Email", `Click to verify: ${verificationUrl}`);

    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};*/

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user.' });
  }
};

exports.deleteUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const deletedUser = await User.findOneAndDelete({ email });

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};

/* Send email function
const sendEmail = async (to, subject, text) => {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
  auth: {
    user: 'marketpicks723@gmail.com',
    pass: 'yvbqttivjtmvlbhp' // App password (no spaces)
  }
});
 

  await transporter.sendMail({
    from: '"Market Picks" <MS_5jbt07@test-86org8e2x8egew13.mlsender.net>',
    to,
    subject,
    text,
  });
};
*/

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
  res.json({ token });
};
/*
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ verificationToken: token });

    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.redirect("https://marketspick.com/signin2");
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};*/

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const pendingUser = await UserEmail.findOne({ token });

    if (!pendingUser) return res.redirect("https://marketspick.com/token-error");

    const { name, email, password } = pendingUser;

    // Create the actual user
    const user = new User({ name, email, password });
    await user.save();

    // Clean up the pending record
    await UserEmail.deleteOne({ email });

    res.redirect("https://marketspick.com/signin2");
  } catch (error) {
    console.error("Email verification failed:", error);
    res.redirect("https://marketspick.com/token-error");
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate reset token and expiration
    user.resetPasswordToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const resetUrl = `https://marketspick.com/api/auth/reset-password/${user.resetPasswordToken}`;

    const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">

    <!-- Header -->
    <div style="text-align: center; padding: 10px;">
      <img src="https://firebasestorage.googleapis.com/v0/b/videohub-a1679.appspot.com/o/mmm12%20(1).png?alt=media&token=223e4e08-a842-482b-80d6-cba61213389f" 
           alt="Marketpicks Logo" 
           style="height: 50px;" />
    </div>

    <hr style="border: 0; border-top: 1px solid #ccc;">

    <!-- Body -->
    <div style="padding: 20px;">
      <p>Hi ${user.name || "there"},</p>
      <p>You requested to reset your password. Click the button below to proceed:</p>
      <a href="${resetUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        margin: 10px 0;
        background-color: #f44336;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
      ">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p style="word-break: break-all;">${resetUrl}</p>
    </div>

    <hr style="border: 0; border-top: 1px solid #ccc;">

    <!-- Footer -->
    <div style="text-align: center; padding: 10px; font-size: 14px; color: #555;">
      <p><strong>www.marketspick.com</strong></p>
      <p>Email: info@marketspick.com | Phone: 09123907060</p>
    </div>

  </div>
`;
    await sendEmail(user.email, "Password Reset Request", htmlContent);

    res.json({ message: "Password reset link sent to email." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

/*
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate reset token
    user.resetPasswordToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration

    await user.save();

    // Send reset email
    const resetUrl = `https://marketspick.com/api/auth/reset-password/${user.resetPasswordToken}`;
    sendEmail(user.email, "Password Reset", `Click here to reset your password: ${resetUrl}`);

    res.json({ message: "Password reset link sent to email." });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
*/
// reset password route..
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    console.log("Received reset request with token:", token);

    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) {
      console.log("Invalid or expired token.");
      return res.redirect("https://marketspick.com/error-password-reset");
    }

    console.log("User found:", user.email); // Log email instead of hashed password for security

    console.log("Before password update, hashed password:", user.password);
    user.password = newPassword;
    console.log("After password update, hashed password:", user.password);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    console.log("User successfully saved with updated password.");

    res.redirect("https://marketspick.com/success-password-reset");
  } catch (error) {
    console.error("Error resetting password:", error);
    res.redirect("https://marketspick.com/error-password-reset");
  }
};

// mobile apps password reset routes

//request otp

exports.mobileRequestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.mobileOtp = otp;
    user.mobileOtpExpires = Date.now() + 3600000; // 1 hour expiration

    await user.save();

    // Send OTP via email
    sendEmail(user.email, "Password Reset OTP", `Your OTP for password reset is: ${otp}`);

    res.json({ message: "Password reset OTP sent to email." });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// verify otp and reset password

exports.mobileResetPassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;

    console.log("Received OTP:", otp);  // Log received OTP
    console.log("Received new password:", newPassword);

    const user = await User.findOne({ mobileOtp: otp });

    if (!user) {
      console.log("Invalid OTP. User not found.");
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Convert OTPs to strings before comparison
    if (String(user.mobileOtp) !== String(otp)) {
      console.log(`OTP Mismatch: DB(${user.mobileOtp}) !== Request(${otp})`);
      return res.status(400).json({ error: "Invalid OTP" });
    }

    console.log("OTP Verified for user:", user.email);

    // Update password (no hashing since it's handled in the model)
    user.password = newPassword;
    user.mobileOtp = undefined; // Clear OTP after use

    await user.save();
    console.log("Password successfully updated for:", user.email);

    res.json({ message: "Password reset successful. You can now log in." });

  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// Activate Coupon for a User
exports.activateCoupon = async (req, res) => {
  try {
    // Fetch the authenticated user's ID from the session
    const {userId} = req.body;

    // Validate if the user ID exists in the session
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { couponCode } = req.body;

    // Fetch the user from the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user already has a valid coupon
    const existingValidCoupon = await Coupon.findOne({ userId, isValid: true });
    if (existingValidCoupon) {
      return res
        .status(400)
        .json({ message: 'You already have an active coupon' });
    }

    // Fetch the coupon code from the CouponCode model
    const validCouponCode = await CouponCode.findOne({ couponCode });
    if (!validCouponCode || !validCouponCode.isValid) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired coupon code' });
    }

    // Generate a unique ID for the activated coupon
    const couponId = uuidv4();

    // Save the activated coupon in the Coupon model
    const activatedCoupon = new Coupon({
      userId,
      couponId,
      couponCode: validCouponCode.couponCode,
      value: 50000, // Coupon value in Naira
      isValid: true, // Mark the coupon as valid
      activatedAt: new Date(),
    });

    await activatedCoupon.save();

    // Mark the coupon code as used in the CouponCode model
    //validCouponCode.isValid = false;
    await validCouponCode.save();

    res.status(200).json({
      message: 'Coupon activated successfully',
      coupon: {
        couponId,
        couponCode: validCouponCode.couponCode,
        value: 50000,
      },
    });
  } catch (error) {
    console.error('Error activating coupon:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



// Validate Active Coupon
exports.validateCoupon = async (req, res) => {
  try {
    // Fetch the authenticated user's ID from the session
    const {userId} = req.body;

    // Validate if the user ID exists in the session
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check the Coupon model for a valid coupon associated with the user
    const validCoupon = await Coupon.findOne({ userId, isValid: true });

    if (!validCoupon) {
      return res.status(200).json({
        message: 'No active coupon found for this user',
        coupon:null
      });
    }

    // Return the details of the valid coupon, including its current/remaining value
    res.status(200).json({
      message: 'Valid coupon found',
      coupon: {
        couponId: validCoupon.couponId,
        couponCode: validCoupon.couponCode,
        value: validCoupon.value, // Assuming `value` represents the remaining value
        activatedAt: validCoupon.activatedAt,
      },
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Coupon Value
exports.updateCouponValue = async (req, res) => {
  const { couponId, usedValue, userId } = req.body;

  try {
    // Validate if the user ID exists
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Find the user's coupon
    const coupon = await Coupon.findOne({ userId });

    // Handle cases where the coupon is not found or is invalid
    if (!coupon || coupon.value <= 0 ) {
      return res.status(200).json({
        message: 'No valid coupon found for this user',
        coupon: null,
      });
    }

    // Deduct the used value from the coupon
    coupon.value = Math.max(0, coupon.value - usedValue); // Ensure it doesn't go negative

    // Mark as invalid if fully used
    if (coupon.value === 0) {
      coupon.isValid = false;
    }

    // Save the updated coupon
    await coupon.save();

    res.status(200).json({
      message: 'Coupon value updated successfully',
      remainingValue: coupon.value,
      isValid: coupon.isValid,
    });
  } catch (error) {
    console.error('Error updating coupon value:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Add to Wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const user = req.user; // Assume req.user is populated from protect middleware
    const { productId } = req.body;

    if (!productId) return res.status(400).json({ message: "Product ID is required." });

    // Check if the product is already in the wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ message: "Product already in wishlist." });
    }

    // Add to the wishlist
    user.wishlist.push(productId);
    await user.save();

    res.status(200).json({ message: "Product added to wishlist.", wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Add to Recently Viewed
exports.addToRecentlyViewed = async (req, res) => {
  try {
    const user = req.user; // Assume req.user is populated from protect middleware
    const { productId } = req.body;

    if (!productId) return res.status(400).json({ message: "Product ID is required." });

    // Remove the product if it already exists in the recentlyViewed array
    user.recentlyViewed = user.recentlyViewed.filter((id) => id.toString() !== productId);

    // Add the product to the beginning of the array
    user.recentlyViewed.unshift(productId);

    // Ensure the array does not exceed 10 products
    if (user.recentlyViewed.length > 10) {
      user.recentlyViewed.pop();
    }

    await user.save();

    res.status(200).json({ message: "Product added to recently viewed.", recentlyViewed: user.recentlyViewed });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Update Order History
exports.updateOrderHistory = async (req, res) => {
  try {
    const user = req.user; // Assume req.user is populated from protect middleware
    const { orderId } = req.body;

    if (!orderId) return res.status(400).json({ message: "Order ID is required." });

    // Add the order to the user's purchase history
    user.purchaseHistory.push(orderId);
    await user.save();

    res.status(200).json({ message: "Order history updated.", purchaseHistory: user.purchaseHistory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Update Address
exports.updateAddress = async (req, res) => {
  try {
    const { userId, address } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }
    if (!address) {
      return res.status(400).json({ message: "Address is required." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { address },
      { new: true } // Removed runValidators
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ message: "Address updated.", address: updatedUser.address });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

  // Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.body; // Get userId from request body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId); // Find user by ID

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user }); // Return found user as JSON
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
