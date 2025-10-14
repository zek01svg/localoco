<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- axios -->
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

    <style>

        .card {
            transition: 0.2s;
        }
        .card:hover {
            transform: scale(1.03);
        }
        img {
            width: 100%;
            height: 2in;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .info-card, .hours-card {
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .info-card p, .hours-card li {
            margin-bottom: 10px;
        }
        .hours-card h3 {
            margin-bottom: 15px;
        }
        #display_details {
            display: none;
        }
    </style>

    <?php
        require 'backend/utils/functions.php';
        require 'backend/utils/common.php';

        $role = $_SESSION['role'] ?? 'guest';

    ?>
    <title>LocaLoco</title>
</head>
<body>
    
    <!-- THIS IS THE NAVBAR  -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <a class="navbar-brand" href="#">LocaLoco</a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarSupportedContent" >
            <ul class="navbar-nav ms-auto">
            <li class="nav-item">
                <a class="nav-link" href="frontend/login.php">Login/Sign Up</a>
            </li>
            
        </div>
    </nav>
    <!-- END OF NAVBAR  -->

    <!-- FOR THE FILTERS -->
    <div class="container" id="filtering_bar">
        <div class="d-flex flex-wrap align-items-center gap-3">
            <!-- Search Query -->
            <div class="flex-grow-1">
                <input type="text" name="search_query" id="search_query" class="form-control" placeholder="Search for businesses">
            </div>

            <!-- Business Category -->
            <div>
                <select name="business_category" class="form-select" id="business_category">
                    <option value="">Select a category</option>
                    <option value="fnb">F&B</option>
                    <option value="retail">Retail</option>
                    <option value="services">Services</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="health_wellness">Health/Wellness</option>
                    <option value="professional_services">Professional Services</option>
                    <option value="home_living">Home and Living</option>
                </select>
            </div>

            <!-- Price Tier -->
            <div>
                <select name="price_tier" class="form-select" id="price_tier">
                    <option value="" selected>Price Tier</option>
                    <option value="low">$</option>
                    <option value="medium">$$</option>
                    <option value="high">$$$</option>
                </select>
            </div>

            <!-- Checkboxes in 2x2 grid -->
            <div class="d-grid" style="grid-template-columns: repeat(2, 1fr); gap: 5px;">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="newly_added" value="newly_added">
                    <label class="form-check-label" for="newly_added">Newly Added</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="open247" value="open247">
                    <label class="form-check-label" for="open247">Open 24/7</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="offers_delivery" value="offers_delivery">
                    <label class="form-check-label" for="offers_delivery">Offers Delivery</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="offers_pickup" value="offers_pickup">
                    <label class="form-check-label" for="offers_pickup">Offers Pickup</label>
                </div>
            </div>
        </div>
    </div>
    <!-- END OF FILTERS  -->
    
    <!-- THIS IS THE DISPLAY DETAILS CONTAINER -->
    <div class="container my-5" id="display_details">
        <!-- Back Button -->
        <div class="mb-4">
            <button onclick="closeDetails()" class="btn btn-dark">← Back</button>
        </div>

        <div class="row">
            <!-- Image Section -->
            <div class="col-12 text-center mb-4">
                <img src="" class="img-fluid" id="display_details_image" alt="Detail Image">
            </div>

            <!-- About / Info Section -->
            <div class="col-md-6 mb-4">
                <div class="info-card bg-light p-3 rounded shadow-sm">
                    <h3>About</h3>
                    <p id="description"></p>
                    <p id="address"></p>
                    <p id="phone"></p>
                    <p id="website_link"></p>
                    <p id="social_media_link"></p>
                </div>
            </div>

            <!-- Opening Hours Section -->
            <div class="col-md-6 mb-4">
                <div class="hours-card bg-light p-3 rounded shadow-sm">
                    <h3>Opening Hours</h3>
                    <p id="isOpen247"></p>
                    <ul class="list-unstyled" id="opening_hours"></ul>
                </div>
            </div>
        </div>
    </div>
    <!-- END OF DISPLAY DETAILS CONTAINER -->
    
    
    <!-- THIS IS THE MAIN CONTAINER  -->
    <div class="container my-5">
        <div class="row" id="cardContainer">
            
        </div>
    </div>
    <!-- END OF MAIN CONTAINER  -->
    
    <script src="frontend/utils/functions.js"></script>
    <script>
        // BLOCK 1: THIS BLOCK IS FOR RBAC PURPOSES
        const role = "<?php echo $role; ?>";

        if(role === 'user'){
            document.getElementById('user-role').innerText = 'rbac implemented: user logged in';
        } else if(role === 'business'){
            document.getElementById('user-role').innerText = 'rbac implemented: business logged in';
        }
        // END OF BLOCK 1

        // BLOCK 2: THIS BLOCK IS FOR FETCHING ALL BUSINESSES AND FILTERING
        var filters = {}; // initialize an object to contain the filters (using an obj instead of arr prevents dupllicates)

        var search_query = document.getElementById('search_query');
        search_query.addEventListener('keyup', () => {
            if (search_query.value) {
                filters['search_query'] = search_query.value;
            } else {
                delete filters['search_query']; 
            }
            displayAndFilterBusinessses()
        });

        var business_category = document.getElementById('business_category');
        business_category.addEventListener('change', () => {
            if (business_category.value) {
                filters['business_category'] = business_category.value;
            } else {
                delete filters['business_category'];
            }
            displayAndFilterBusinessses()
        });

        var price_tier = document.getElementById('price_tier');
        price_tier.addEventListener('change', () => {
            if (price_tier.value) {
                filters['price_tier'] = price_tier.value;
            } else {
                delete filters['price_tier'];
            }
            displayAndFilterBusinessses()
        });

        var newly_added = document.getElementById('newly_added');
        newly_added.addEventListener('change', () => {
            if (newly_added.checked) {
                filters['newly_added'] = true;
            } else {
                delete filters['newly_added'];
            }
            displayAndFilterBusinessses()
        });

        var open247 = document.getElementById('open247');
        open247.addEventListener('change', () => {
            if (open247.checked) {
                filters['open247'] = true;
            } else {
                delete filters['open247'];
            }
            displayAndFilterBusinessses()
        });

        var offers_delivery = document.getElementById('offers_delivery');
        offers_delivery.addEventListener('change', () => {
            if (offers_delivery.checked) {
                filters['offers_delivery'] = true;
            } else {
                delete filters['offers_delivery'];
            }
            displayAndFilterBusinessses()
        });

        var offers_pickup = document.getElementById('offers_pickup');
        offers_pickup.addEventListener('change', () => {
            if (offers_pickup.checked) {
                filters['offers_pickup'] = true;
            } else {
                delete filters['offers_pickup'];
            }
            displayAndFilterBusinessses()
        });

        const cardContainer = document.getElementById('cardContainer')
        const url = 'backend/api/filter.php';

        displayAndFilterBusinessses()
                
        // END OF BLOCK 2
    </script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>