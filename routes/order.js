const express = require('express'); 
const axios = require('axios'); 
const { v4: uuidv4 } = require('uuid');
const router = express.Router(); 
const API_BASE_URL = 'https://api.foodliie.com';

// Create order route

router.post('/create-order', async (req, res) => { try { const { name, email, shippingAddress, totalAmount, couponCode: code, paymentReference } = req.body;

const newOrder = {
        name,
        email,
        shippingAddress,
        totalAmount,
        code,
        paymentReference,
        status: 'processing',
        uniqueId: uuidv4(),
    };

    const response = await axios.post(`${API_BASE_URL}/api/orders/create-order`, newOrder, {
        headers: {
            'Content-Type': 'application/json'
        }
    });

    res.status(response.status).json(response.data);
} catch (error) {
    console.error('Error creating order:', error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({
        message: 'Failed to create order',
        error: error.response?.data || error.message
    });
}

});

// Update order route

router.patch('/update-order/:orderId', async (req, res) => { try { const { orderId } = req.params; const { status, discountCode: couponCode, finalAmount: amount } = req.body;

const response = await axios.patch(`${API_BASE_URL}/api/orders/${orderId}`, { status }, {
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (status === 'paid') {
        await axios.patch(`${API_BASE_URL}/api/agent`, {
            couponCode,
            amount,
        });
    }

    res.status(response.status).json(response.data);
} catch (error) {
    console.error('Error updating order:', error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({
        message: 'Failed to update order',
        error: error.response?.data || error.message
    });
}

});

module.exports = router;

