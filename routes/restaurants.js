const express = require('express');
const router = express.Router();
const Restaurant = require('../schemas/restaurantSchema.js');

router.get('/', async (req, res) => {
    try {
        const restaurants = await Restaurant.find();
        console.log(restaurants);
        res.json(restaurants);
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
});

// restaurant name will be included in the req body since some restaurants
// have the same name. unique paths should use unique identifiers.
router.put('/inspect', async (req, res) => {
    if (req.body.restaurant_name === undefined || req.body.grade === undefined || req.body.score === undefined) {
        res.status(400).json( { message: 'inputs require restaurant_name, grade, and score in req body as JSON.'});
    }
    else if (typeof req.body.restaurant_name !== "string") {
        res.status(400).json( { message: 'restaurant_name must be a string'});
    }
    else if (!/[A-Z]/.test(req.body.grade) || req.body.grade.length !== 1) {
        res.status(400).json( { message: 'grade must be a singular capital letter'});
    }
    else if (typeof req.body.score !== "number") {
        res.status(400).json({ message: 'score must be a number' });
    }
    else {
        try {
            const inspectedRestaurant = (await Restaurant.find({ name: req.body.restaurant_name }));
            if (inspectedRestaurant.length === 0) {
                console.log(inspectedRestaurant);
                throw new Error(`Restaurant: '${req.body.restaurant_name}' Not Found`);
            };

            inspectedRestaurant[0].grades.unshift({
                date: new Date().toISOString(),
                grade: req.body.grade,
                score: req.body.score
            });
            const restaurantSchema = new Restaurant(inspectedRestaurant[0]);
            await restaurantSchema.save();
            res.json(restaurantSchema);
        } catch (err) {
            console.log(err);
            res.status(500).json( { message: err.message } );
        }
    }
});

router.get('/top', async (req, res) => {
    if (req.body.n === undefined) {
        res.status(400).json( { message: 'input n is required in the req body as JSON.'});
    }
    else if (typeof req.body.n !== 'number' || Math.floor(req.body.n) !== req.body.n || req.body.n < 0) {
        res.status(400).json( { message: 'n must be an integer >= 0'});
    }
    else {
        try {
            const restaurantAvgScores = await Restaurant.aggregate([
                { $match: { "grades.4": { $exists: true } } }, // if grades.4 exists, there is >= 5 reviews.
                { $unwind: '$grades' },
                { $group: { _id: {restaurant_id: '$restaurant_id', name: '$name'}, avgScore: { $avg: '$grades.score' }}},
                { $sort: { avgScore: -1 }} // -1 indicates descending order
            ]);

            const unformattedTopN = restaurantAvgScores.slice(0, req.body.n);
            console.log(unformattedTopN);
            const formattedTopN = [];
            unformattedTopN.forEach((restaurant) => {
                formattedTopN.push({
                    name: restaurant._id.name,
                    avgScore: restaurant.avgScore
                });
            });
            console.log(formattedTopN);
            res.send(formattedTopN);
        } catch (err) {
            res.status(500).json({"message": err.message });
        }
    }
});

// given n, b, and c, finds the n highest-rated restaurants in the given borough and of the given cuisine.
// sorted by highested rated.
router.get('/specific', async (req, res) => {
    if (req.body.n === undefined || req.body.b === undefined || req.body.c === undefined) {
        res.status(400).json( { message: 'inputs require n, b(borough), and c(cuisine) in req body as JSON.'});
    }
    else if (typeof req.body.n !== 'number' || Math.floor(req.body.n) !== req.body.n || req.body.n < 0) {
        res.status(400).json( { message: 'n must be an integer >= 0'});
    }
    else if (typeof req.body.b !== "string") {
        res.status(400).json( { message: 'b (bourough) must be a string'});
    }
    else if (typeof req.body.c !== "string") {
        res.status(400).json( { message: 'c (cuisine) must be a string'});
    }
    else {
        try {
            const nRestaurants = (await Restaurant.aggregate([
                { $match: { borough: req.body.b, cuisine: req.body.c } },
                { $unwind: '$grades' },
                { $group: { _id: {
                                restaurant_id: '$restaurant_id', 
                                name: '$name', 
                                borough: '$borough',
                                cuisine: '$cuisine'
                            },
                            avgScore: { $avg: '$grades.score' }}},
                { $sort: { avgScore: -1 }} // -1 indicates descending order
            ])).
            slice(0,req.body.n);
            console.log(nRestaurants);

            const names = [];
            const boroughs = [];
            const cuisines = [];
            nRestaurants.forEach((restaurant) => { // nRestaurants is sorted by avgScore
                names.push(restaurant._id.name);
                boroughs.push(restaurant._id.borough);
                cuisines.push(restaurant._id.cuisine);
            });

            res.json({ names: names, boroughs: boroughs, cuisines: cuisines });
        } catch (err) {
            console.log(err.message);
            res.status(500).json({ message: err.message });
        }
    }
})

module.exports = router;

/* unwind breaks down a restaurant with multiple grades into many objects with the same fields
and data, except for the grades.* fields. We group together these broken down objects by $name 
and calculate the averages across the multiple objects with aggregate.

Example:

{
        "_id": "64dc3ce2262416386ee1df25",
        "address": {
            "building": "214",
            "coord": [
                -73.9721672,
                40.7522029
            ],
            "street": "East 45 Street",
            "zipcode": "10017"
        },
        "borough": "Manhattan",
        "cuisine": "American",
        "grades": [
            {
                "date": "2014-12-24T00:00:00.000Z",
                "grade": "B",
                "score": 18
            },
            {
                "date": "2014-07-01T00:00:00.000Z",
                "grade": "A",
                "score": 13
            },
            {
                "date": "2013-12-20T00:00:00.000Z",
                "grade": "A",
                "score": 5
            },
            {
                "date": "2013-06-19T00:00:00.000Z",
                "grade": "B",
                "score": 25
            },
            {
                "date": "2013-01-24T00:00:00.000Z",
                "grade": "B",
                "score": 18
            },
            {
                "date": "2012-06-11T00:00:00.000Z",
                "grade": "A",
                "score": 0
            }
        ],
        "name": "The Comfort Diner",
        "restaurant_id": "41562415"
    }
    
becomes

{
    "_id": "64dc3ce2262416386ee1df25", ...other fields...
    "grades": {
        "date": "2014-12-24T00:00:00.000Z",
        "grade": "B",
        "score": 18
    }, ...other fields...
}

{
    "_id": "64dc3ce2262416386ee1df25", ...other fields...
    "grades": {
        "date": "2014-07-01T00:00:00.000Z",
        "grade": "A",
        "score": 13
    }, ...other fields...
}

{
    "_id": "64dc3ce2262416386ee1df25", ...other fields...
    "grades": {
        "date": "2013-12-20T00:00:00.000Z",
        "grade": "A",
        "score": 5
    }, ...other fields...
}

... and so on...

*/