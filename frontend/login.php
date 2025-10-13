<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="page-title">Authentication</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <style>
        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            background-color: #f8f9fa;
        }
        .auth-card {
            max-width: 650px;
            width: 100%;
        }
        .form-container {
            display: none;
        }
        .form-container.active {
            display: block;
        }
        .day-selection {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        .hours-row {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 8px;
            display: none;
        }
        .hours-row.show {
            display: block;
        }
    </style>
</head>
<body>

<?php
    require_once '../backend/utils/common.php';

    // Display session messages
    if (isset($_SESSION['errors'])) {
        echo '<div class="alert alert-danger">';
        var_dump($_SESSION['errors']); 
        echo '</div>';
        unset($_SESSION['errors']);
    }
    
    if (isset($_SESSION['registerSuccess'])) {
        echo '<div class="alert alert-success">' . $_SESSION['registerSuccess'] . '</div>';
        unset($_SESSION['registerSuccess']);
    }
?>

<div class="container d-flex justify-content-center align-items-center">
    <div class="card shadow-sm p-4 auth-card">
        
        <!-- Form Type Selector -->
        <div class="mb-4">
            <div class="btn-group w-100" role="group">
                <button type="button" class="btn btn-outline-primary" id="btn-user-login">User Login</button>
                <button type="button" class="btn btn-outline-primary" id="btn-business-login">Business Login</button>
                <button type="button" class="btn btn-outline-success" id="btn-user-signup">User Signup</button>
                <button type="button" class="btn btn-outline-success" id="btn-business-signup">Business Signup</button>
            </div>
        </div>

        <!-- FORM 1: USER LOGIN -->
        <div class="form-container active" id="user-login-form">
            <h2 class="text-center mb-4">User Login</h2>
            <form method="POST" action="../backend/utils/processLogin.php">
                <input type="hidden" name="mode" value="login">
                <input type="hidden" name="role" value="user">
                
                <div class="mb-3">
                    <input type="email" name="email" class="form-control" placeholder="Email" required>
                </div>
                <div class="mb-3">
                    <input type="password" name="password" class="form-control" placeholder="Password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Login</button>
            </form>
        </div>

        <!-- FORM 2: BUSINESS LOGIN -->
        <div class="form-container" id="business-login-form">
            <h2 class="text-center mb-4">Business Login</h2>
            <form method="POST" action="../backend/utils/processLogin.php">
                <input type="hidden" name="mode" value="login">
                <input type="hidden" name="role" value="business">
                
                <div class="mb-3">
                    <input type="text" name="uen" class="form-control" placeholder="UEN" required>
                </div>
                <div class="mb-3">
                    <input type="password" name="password" class="form-control" placeholder="Password" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">Login</button>
            </form>
        </div>

        <!-- FORM 3: USER SIGNUP -->
        <div class="form-container" id="user-signup-form">
            <h2 class="text-center mb-4">User Signup</h2>
            <form method="POST" action="../backend/utils/processLogin.php">
                <input type="hidden" name="mode" value="signup">
                <input type="hidden" name="role" value="user">
                
                <div class="mb-3">
                    <input type="email" name="email" class="form-control" placeholder="Email" required>
                </div>
                <div class="mb-3">
                    <input type="text" name="firstName" class="form-control" placeholder="First Name" required>
                </div>
                <div class="mb-3">
                    <input type="text" name="lastName" class="form-control" placeholder="Last Name" required>
                </div>
                <div class="mb-3">
                    <input type="password" name="passwordSignup" class="form-control" placeholder="Password" required>
                </div>
                <div class="mb-3">
                    <input type="password" name="confirmPW" class="form-control" placeholder="Confirm Password" required>
                </div>
                <button type="submit" class="btn btn-success w-100">Sign Up</button>
            </form>
        </div>

        <!-- FORM 4: BUSINESS SIGNUP -->
        <div class="form-container" id="business-signup-form">
            <h2 class="text-center mb-4">Business Signup</h2>
            <form method="POST" action="../backend/utils/processLogin.php" enctype="multipart/form-data" id="business-signup-form-element">
                <input type="hidden" name="mode" value="signup">
                <input type="hidden" name="role" value="business">
                
                <div class="mb-3">
                    <input type="text" name="uen" class="form-control" placeholder="UEN" required>
                </div>
                <div class="mb-3">
                    <input type="text" name="businessName" class="form-control" placeholder="Business Name" required>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3">
                        <label class="form-label">Please enter your postal code</label>
                        <input type="text" class="form-control" placeholder="Postal Code" id="postalCode">
                    </div>
                    <div class="col-md-9 mt-5">
                        <input type="text" name="address" class="form-control" placeholder="Address" id="address" readonly>
                    </div>
                    
                </div>
                <div class="mb-3">
                    <label class="form-label">Business Category</label>
                    <select name="businessCategory" class="form-select">
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
                <div class="mb-3">
                    <textarea name="description" class="form-control" placeholder="Description" rows="3"></textarea>
                </div>

                <!-- Opening Hours Section -->
                <div class="mb-3">
                    <label class="form-label d-block">Opening Hours</label>
                    
                    <!-- 24/7 Checkbox -->
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" name="open247" id="open-247" value="1">
                        <label class="form-check-label" for="open-247">
                            <strong>Open 24/7</strong>
                        </label>
                    </div>

                    <!-- Day Selection -->
                    <div id="day-selection-container">
                        <label class="form-label">Which days of the week is your business open?</label>
                        <div class="day-selection mb-3">
                            <div class="form-check">
                                <input class="form-check-input day-checkbox" type="checkbox" value="monday" id="day-monday" data-day="monday">
                                <label class="form-check-label" for="day-monday">Monday</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input day-checkbox" type="checkbox" value="tuesday" id="day-tuesday" data-day="tuesday">
                                <label class="form-check-label" for="day-tuesday">Tuesday</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input day-checkbox" type="checkbox" value="wednesday" id="day-wednesday" data-day="wednesday">
                                <label class="form-check-label" for="day-wednesday">Wednesday</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input day-checkbox" type="checkbox" value="thursday" id="day-thursday" data-day="thursday">
                                <label class="form-check-label" for="day-thursday">Thursday</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input day-checkbox" type="checkbox" value="friday" id="day-friday" data-day="friday">
                                <label class="form-check-label" for="day-friday">Friday</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input day-checkbox" type="checkbox" value="saturday" id="day-saturday" data-day="saturday">
                                <label class="form-check-label" for="day-saturday">Saturday</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input day-checkbox" type="checkbox" value="sunday" id="day-sunday" data-day="sunday">
                                <label class="form-check-label" for="day-sunday">Sunday</label>
                            </div>
                        </div>

                        <!-- Hours Input Fields -->
                        <div id="hours-container">
                            <div class="hours-row" id="hours-monday">
                                <div class="row align-items-center">
                                    <div class="col-3"><strong>Monday</strong></div>
                                    <div class="col-4"><input type="time" data-day="monday" data-type="open" class="form-control form-control-sm hours-input"></div>
                                    <div class="col-1 text-center">to</div>
                                    <div class="col-4"><input type="time" data-day="monday" data-type="close" class="form-control form-control-sm hours-input"></div>
                                </div>
                            </div>
                            <div class="hours-row" id="hours-tuesday">
                                <div class="row align-items-center">
                                    <div class="col-3"><strong>Tuesday</strong></div>
                                    <div class="col-4"><input type="time" data-day="tuesday" data-type="open" class="form-control form-control-sm hours-input"></div>
                                    <div class="col-1 text-center">to</div>
                                    <div class="col-4"><input type="time" data-day="tuesday" data-type="close" class="form-control form-control-sm hours-input"></div>
                                </div>
                            </div>
                            <div class="hours-row" id="hours-wednesday">
                                <div class="row align-items-center">
                                    <div class="col-3"><strong>Wednesday</strong></div>
                                    <div class="col-4"><input type="time" data-day="wednesday" data-type="open" class="form-control form-control-sm hours-input"></div>
                                    <div class="col-1 text-center">to</div>
                                    <div class="col-4"><input type="time" data-day="wednesday" data-type="close" class="form-control form-control-sm hours-input"></div>
                                </div>
                            </div>
                            <div class="hours-row" id="hours-thursday">
                                <div class="row align-items-center">
                                    <div class="col-3"><strong>Thursday</strong></div>
                                    <div class="col-4"><input type="time" data-day="thursday" data-type="open" class="form-control form-control-sm hours-input"></div>
                                    <div class="col-1 text-center">to</div>
                                    <div class="col-4"><input type="time" data-day="thursday" data-type="close" class="form-control form-control-sm hours-input"></div>
                                </div>
                            </div>
                            <div class="hours-row" id="hours-friday">
                                <div class="row align-items-center">
                                    <div class="col-3"><strong>Friday</strong></div>
                                    <div class="col-4"><input type="time" data-day="friday" data-type="open" class="form-control form-control-sm hours-input"></div>
                                    <div class="col-1 text-center">to</div>
                                    <div class="col-4"><input type="time" data-day="friday" data-type="close" class="form-control form-control-sm hours-input"></div>
                                </div>
                            </div>
                            <div class="hours-row" id="hours-saturday">
                                <div class="row align-items-center">
                                    <div class="col-3"><strong>Saturday</strong></div>
                                    <div class="col-4"><input type="time" data-day="saturday" data-type="open" class="form-control form-control-sm hours-input"></div>
                                    <div class="col-1 text-center">to</div>
                                    <div class="col-4"><input type="time" data-day="saturday" data-type="close" class="form-control form-control-sm hours-input"></div>
                                </div>
                            </div>
                            <div class="hours-row" id="hours-sunday">
                                <div class="row align-items-center">
                                    <div class="col-3"><strong>Sunday</strong></div>
                                    <div class="col-4"><input type="time" data-day="sunday" data-type="open" class="form-control form-control-sm hours-input"></div>
                                    <div class="col-1 text-center">to</div>
                                    <div class="col-4"><input type="time" data-day="sunday" data-type="close" class="form-control form-control-sm hours-input"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mb-3">
                    <input type="email" name="email" class="form-control" placeholder="Business Email" required>
                </div>
                <div class="mb-3">
                    <input type="tel" name="phoneNumber" class="form-control" placeholder="Phone Number">
                </div>
                <div class="mb-3">
                    <input type="url" name="websiteLink" class="form-control" placeholder="Website Link (https://)">
                </div>
                <div class="mb-3">
                    <input type="url" name="socialMediaLink" class="form-control" placeholder="Social Media Link">
                </div>
                <div class="mb-3">
                    <label class="form-label">Business Wallpaper</label>
                    <input type="file" name="wallpaper" class="form-control" accept="image/*">
                </div>
                <div class="mb-3">
                    <label class="form-label">Price Tier</label>
                    <select name="priceTier" class="form-select" required>
                        <option value="">Select price tier</option>
                        <option value="low">$ (Budget-friendly)</option>
                        <option value="medium">$$ (Moderate)</option>
                        <option value="high">$$$ (Premium)</option>
                    </select>
                </div>
                <div class="mb-3 form-check">
                    <input type="checkbox" name="offersDelivery" class="form-check-input" value="1">
                    <label class="form-check-label">Offers Delivery</label>
                </div>
                <div class="mb-3 form-check">
                    <input type="checkbox" name="offersPickup" class="form-check-input" value="1">
                    <label class="form-check-label">Offers Pickup</label>
                </div>
                <div class="mb-3">
                    <label class="form-label">Payment Options</label>
                    <select name="paymentOptions[]" class="form-select" multiple size="4" required>
                        <option value="cash">Cash</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="paynow">PayNow</option>
                        <option value="digital_wallets">Digital Wallets (Apple/Google/Samsung/GrabPay)</option>
                    </select>
                    <small class="form-text text-muted">Hold Ctrl (Cmd on Mac) to select multiple options.</small>
                </div>
                <div class="mb-3">
                    <input type="password" name="passwordSignup" class="form-control" placeholder="Password" required>
                </div>
                <div class="mb-3">
                    <input type="password" name="confirmPW" class="form-control" placeholder="Confirm Password" required>
                </div>
                <button type="submit" class="btn btn-success w-100">Sign Up</button>
            </form>
        </div>

    </div>
</div>

<script>
    // Form switching logic
    const formContainers = document.querySelectorAll('.form-container');
    const buttons = {
        userLogin: document.getElementById('btn-user-login'),
        businessLogin: document.getElementById('btn-business-login'),
        userSignup: document.getElementById('btn-user-signup'),
        businessSignup: document.getElementById('btn-business-signup')
    };

    function showForm(formId) {
        // Hide all forms
        formContainers.forEach(container => container.classList.remove('active'));
        
        // Remove active state from all buttons
        Object.values(buttons).forEach(btn => btn.classList.remove('active'));
        
        // Show selected form
        document.getElementById(formId).classList.add('active');
    }

    // Button click handlers
    buttons.userLogin.addEventListener('click', function() {
        showForm('user-login-form');
        this.classList.add('active');
    });

    buttons.businessLogin.addEventListener('click', function() {
        showForm('business-login-form');
        this.classList.add('active');
    });

    buttons.userSignup.addEventListener('click', function() {
        showForm('user-signup-form');
        this.classList.add('active');
    });

    buttons.businessSignup.addEventListener('click', function() {
        showForm('business-signup-form');
        this.classList.add('active');
    });

    // Set initial active button
    buttons.userLogin.classList.add('active');

    // Opening hours functionality (for business signup form)
    const open247Checkbox = document.getElementById('open-247');
    const daySelectionContainer = document.getElementById('day-selection-container');
    const dayCheckboxes = document.querySelectorAll('.day-checkbox');
    const businessSignupFormElement = document.getElementById('business-signup-form-element');

    open247Checkbox.addEventListener('change', function() {
        if (this.checked) {
            daySelectionContainer.style.display = 'none';
            dayCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                const day = checkbox.getAttribute('data-day');
                const hoursRow = document.getElementById(`hours-${day}`);
                hoursRow.classList.remove('show');
            });
        } else {
            daySelectionContainer.style.display = 'block';
        }
    });

    dayCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const day = this.getAttribute('data-day');
            const hoursRow = document.getElementById(`hours-${day}`);
            
            if (this.checked) {
                hoursRow.classList.add('show');
            } else {
                hoursRow.classList.remove('show');
                // Clear time inputs
                const inputs = hoursRow.querySelectorAll('.hours-input');
                inputs.forEach(input => input.value = '');
            }
        });
    });

    // Handle form submission to create hours array
    businessSignupFormElement.addEventListener('submit', function(e) {
        // Remove any existing hours inputs
        const existingHoursInputs = this.querySelectorAll('input[name^="hours["]');
        existingHoursInputs.forEach(input => input.remove());

        // Get all checked days and their hours
        dayCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const day = checkbox.getAttribute('data-day');
                const hoursRow = document.getElementById(`hours-${day}`);
                const openInput = hoursRow.querySelector('[data-type="open"]');
                const closeInput = hoursRow.querySelector('[data-type="close"]');

                if (openInput && closeInput && openInput.value && closeInput.value) {
                    // Create hidden inputs for the array structure
                    const hiddenOpen = document.createElement('input');
                    hiddenOpen.type = 'hidden';
                    hiddenOpen.name = `hours[${day}][open]`;
                    hiddenOpen.value = openInput.value;
                    this.appendChild(hiddenOpen);

                    const hiddenClose = document.createElement('input');
                    hiddenClose.type = 'hidden';
                    hiddenClose.name = `hours[${day}][close]`;
                    hiddenClose.value = closeInput.value;
                    this.appendChild(hiddenClose);
                }
            }
        });
    });

    async function getAddress() {
        
        // get the postal code
        const postalCode = document.getElementById('postalCode')
        const address = document.getElementById('address')
        const url = 'https://www.onemap.gov.sg/api/common/elastic/search'
        const authToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5MzgzLCJmb3JldmVyIjpmYWxzZSwiaXNzIjoiT25lTWFwIiwiaWF0IjoxNzYwMDE2ODI5LCJuYmYiOjE3NjAwMTY4MjksImV4cCI6MTc2MDI3NjAyOSwianRpIjoiMmRjMTNhMDctMjhmOC00OTI3LTk2ZmQtMjg5ZDRiMzA2N2IwIn0.MvdcK-sHL2mopoz6rE0hKp4PQ903DnqdhlubocXuWAfDO0yjx8ovoQYlRYpBX_BPk2EQvDi4KCZ_J5rtmXFTf8WyPWwwz9sxfvhLHSagzBYs0lmkK6egzDNSvqoOQbTWWOLbkXp8h6-9xzfdOHLqJvwYJSm3vak1KaPC5Op6DG7ZPYvL1SdXkdI5NrdFaM8ULBUePh_NnPRXZ4quTaixDSLXPEfWfvx9_p6S1_E_TRlgYtEgL9ZV7ejYQQeYyMseXH_9zYh0wQ3wV-nIlQ5Q-B5_IPLzfZHKoh0d3zM8T33bJwcnWd9siY-1b9Kk_mAb5ZQjfGLMdA54sfEO-rxehw' // this token is expiring on OCTOBER 12, 2025

        // only trigger ajax if there are six valid digits
        if (postalCode.value.length == 6 && !isNaN(postalCode.value)) {
            try {
                const response = await axios.get(url, {
                                    params: {
                                        'searchVal': postalCode.value,
                                        'returnGeom': 'N' ,
                                        'getAddrDetails': 'Y'

                                    },
                                    headers: {
                                        'Authorization': `${authToken}`
                                    }})
                console.log(response.data)
                address.value = response.data.results[0].ADDRESS
            }
            catch (error){
                // catch errors here
                console.log(`something went wrong: ${error}`)
            }
        }
        else { // in the case of invalid input/less than six digits, clear the address
            address.value = ''
        }   
    }

    const postalCode = document.getElementById('postalCode');
    postalCode.addEventListener('keyup', () => {
        getAddress();
    });

</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

</body>
</html>