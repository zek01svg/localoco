<?php
require_once 'common.php';
require_once 'functions.php';

if ($_SERVER['REQUEST_METHOD'] == "POST") {
    
    $role = $_POST['role'];
    $mode = $_POST['mode'];

    if ($mode == 'login') { 

        if ($role == 'user') {

            // var_dump($_POST);
            // get user input
            $email = $_POST['email'];
            $password = $_POST['password'];

            $user = $userDAO->getUserByEmail($email); // fetch user data using the provided email
            
            if ($user != null) { // if found, verify password
                var_dump($user);
                $hashedPW = $user->getPassword();
                $passwordCorrect = password_verify($password, $hashedPW); // check whether password is correct

                if ($passwordCorrect === true) { // if pw correct, store role in session and redirect immediately
                    $_SESSION['role'] = $role;
                    $_SESSION['firstName'] = $user->getFirstname();
                    header('Location: ../../index.php'); // redirect to main page
                    exit;
                }
                else { // in case pw is incorrect, store error message in session
                    $_SESSION['errors'] = ["Wrong password. Please enter the correct password.", $_POST, password_verify($password, $hashedPW)];
                }
            }
            else { // if the email isnt found in the db, store error message in session
                $_SESSION['errors'] = 'The email you entered is not associated with an account.';
            }

            // auto redirect
            header('Location: ../../frontend/login.php');
            exit;
        }
        elseif ($role == 'business') {

            // get user input
            $uen = $_POST['uen'];
            $password = $_POST['password'];

            $business = $businessDAO->getBusinessByUEN($uen); // fetch business data using the provided uen
        
            if ($business != null) { // if found, verify password
                $hashedPW = $business->getPassword();
                $passwordCorrect = password_verify($password, $hashedPW); // check whether password is correct

                if ($passwordCorrect) { // if pw correct, store role in session and redirect 
                    
                    $_SESSION['role'] = $role; 
                    header('Location: ../../index.php'); // redirect to main page
                    exit;
                    
                }
                else { // in case pw is incorrect, store error message in session
                    $_SESSION['errors'] = "Wrong password. Please enter the correct password.";
                }
            }
            else { // if the email isnt found in the db, store error message in session
                $_SESSION['errors'] = 'The UEN you entered is not associated with an account.';
            }

            // auto redirect
            header('Location: ../../frontend/login.php');
            exit;
        }
        
    }
    elseif ($mode == 'signup') { 
        $errors = [];

        if ($role == 'user') { // this is for new individual signups

            // these inputs dont need validation
            $firstName = $_POST['firstName'];
            $lastName = $_POST['lastName'];

            // validate email 
            if (filter_var($_POST['email'], FILTER_VALIDATE_EMAIL) == $_POST['email']) { /// check whether the email passed in is valid 
                $email = $_POST['email'];
            }
            else {
                $errors[] = "The email you entered is invalid. Please try again."; 
            }

            // validate password
            if ($_POST['passwordSignup'] === $_POST['confirmPW']) { 
                
                $passwordVerified = validatePassword($_POST['passwordSignup']); // verify pw using helper function in utils
                if ($passwordVerified === true) {
                    $hashedPW = password_hash($_POST['passwordSignup'], PASSWORD_DEFAULT);
                }
                else {
                    $errors[]  = $passwordVerified;
                }
            }
            else {
                $errors[] = 'The passwords you entered do not match.';
            }
            
            // EXECUTES REGISTRATION ONLY IF ALL USER INPUTS ARE VALID
            if (empty($errors)) {
                $result = $userDAO->registerUser($firstName, $lastName, $email, $hashedPW, $role);

                if ($result === true) {
                    $_SESSION['registerSuccess'] = "<p>You have been successfully registered!</p>";
                } 
                else {
                    $_SESSION['errors'] = "The email you entered is already associated with an account.";
                }
            }
            // if there are errors, the user is redirected back to register.php and the errors are displayed
            else {
                $_SESSION['errors'] = $errors;
            }

            header('Location: ../../frontend/login.php');
            exit;
        }
        elseif ($role == 'business') { // this is for new business signups

            // these user inputs dont need validation
            $businessCategory = $_POST['businessCategory'];
            $description = $_POST['description'];
            $address = $_POST['address'];
            $offersDelivery = isset($_POST['offersDelivery']);
            $offersPickup = isset($_POST['offersPickup']);   
            $email = $_POST['email'] ?? '';
            $phoneNumber = $_POST['phoneNumber']?? '';
            $dateOfCreation = (new DateTime())->format('Y-m-d'); // date of registration (current date)
            $priceTier = $_POST['priceTier'];
            $paymentOptions = $_POST['paymentOptions'];

            // check uen using the uen verification helper function in utils
            if (!validateUEN($_POST['uen'], $_POST['businessName'])) { 
                $errors[] = "The UEN/Business name you entered is invalid";
            }
            else {
                $uen = $_POST['uen'];
                $businessName = $_POST['businessName'];
            }

            // check whether business is open 24/7
            if (isset($_POST['open247'])) {
                $open247 = true;
            }
            else {
                $open247 = false;
                $openingHours = $_POST['hours'];
            }
            
            // validate website link using helper function
            if (!empty($_POST['websiteLink'])) { 
                $linkIsSafe = validateLink($_POST['websiteLink']); 

                if ($linkIsSafe) {
                    $websiteLink = $_POST['websiteLink'];
                }
                else {
                    $errors[] = 'The website link you entered is invalid.';
                }
            }

            // validate social media link using helper function
            if (!empty($_POST['socialMediaLink'])) { 
                $linkIsSafe = validateLink($_POST['socialMediaLink']); 

                if ($linkIsSafe) {
                    $socialMediaLink = $_POST['socialMediaLink'];
                }
                else {
                    $errors[] = 'The social media link you entered is invalid.';
                }
            }

            // validate image and handle the image upload
            $wallpaper = null;
            if (isset($_FILES['wallpaper']) && $_FILES['wallpaper']['error'] !== UPLOAD_ERR_NO_FILE) {
                $uploadResult = validateImage($_FILES['wallpaper'], $uen, 5242880, 'business_wallpapers');
                
                if ($uploadResult['success']) {
                    $wallpaper = $uploadResult['filename'];
                } else {
                    $errors = array_merge($errors, $uploadResult['errors']);
                }
            }

            // validate password
            if ($_POST['passwordSignup'] === $_POST['confirmPW']) {
                $password = $_POST['passwordSignup'];
                
                $passwordVerified = validatePassword($password); // verify pw using helper function in utils
                if ($passwordVerified === true) {
                    $hashedPW = password_hash($password, PASSWORD_DEFAULT);
                }
                else {
                    $errors[]  = $passwordVerified;
                }
            }
            else {
                $errors[] = 'The passwords you entered do not match.';
            }
            
            // validate email
            if (filter_var($email, FILTER_VALIDATE_EMAIL) != $email) {
                $errors[] = "The email you entered is invalid.";
            }

            // EXECUTES REGISTRATION ONLY IF ALL USER INPUTS ARE VALID
            if (empty($errors)) {
                $registrationSuccessful = $businessDAO->registerBusiness(
                $uen, $hashedPW, $businessName, $businessCategory, $description, $address,$open247,
                $openingHours, $email, $phoneNumber, $websiteLink, $socialMediaLink, $wallpaper,
                $dateOfCreation, $priceTier, $offersDelivery, $offersPickup, $paymentOptions);
                
                if ($registrationSuccessful) {
                    $_SESSION['registerSuccess'] = "<p>Your business has been successfully registered!</p>";
                }
                else {
                    $_SESSION['errors'] = $registrationSuccessful; // because the registration function returns a list of errors
                }
            }
            // if there are errors, the user is redirected back to the registration page and the errors are displayed
            else {
                $_SESSION['errors'] = $errors;
            }

            header('Location: ../../frontend/login.php');
            exit;
        }
    }
}
?>