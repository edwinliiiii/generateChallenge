const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    address: {
        type: Object,
        required: true,
    },
    borough: {
        type: String,
        required: true,
    },
    cuisine: {
        type: String,
        required: true,
    },
    grades: {
        type: Array,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    restaurant_id: {
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('Restaurant', restaurantSchema, 'restaurants'); 
                                                                // 'restaurants' is the collection name.