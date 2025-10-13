<?php
/**
 * Validates the strength of a given password based on standard security rules.
 *
 * This function checks if the password meets five common security requirements:
 * - Contains at least one lowercase letter
 * - Contains at least one uppercase letter
 * - Contains at least one number
 * - Contains at least one special character
 * - Has a minimum length of 8 characters
 *
 * If all conditions are met, the function returns true. Otherwise, it returns
 * an array of error messages describing which rules were not satisfied.
 *
 * @param string $password The password string to validate.
 *
 * @return bool|array Returns:
 *                    - true → if the password passes all validation checks.
 *                    - array → a list of error messages if validation fails.
 *
 * @example
 * ```php
 * $result = validatePassword('Hello123!');
 *
 * if ($result === true) {
 *     echo "Password is valid!";
 * } else {
 *     echo implode('<br>', $result); // Displays validation errors
 * }
 * ```
 */function validatePassword ($password) {

        $errors = [];

        $hasLowercase = preg_match('/[a-z]/', $password);
        $hasUppercase = preg_match('/[A-Z]/', $password);
        $hasNumber    = preg_match('/[0-9]/', $password);
        $hasSymbol    = preg_match('/[^a-zA-Z0-9]/', $password);
        $has8OrMoreChars = strlen($password) >= 8;

        if (!$hasLowercase) {
            $errors[] = 'Your password must contain a lowercase character'; 
        }
        if (!$hasUppercase) {
            $errors[] = 'Your password must contain an uppercase character'; 
        }
        if (!$hasNumber) {
            $errors[] = 'Your password must contain a number'; 
        }
        if (!$hasSymbol) {
            $errors[] = 'Your password must contain a symbol'; 
        }
        if (!$has8OrMoreChars) {
            $errors[] = 'Your password must contain 8 or more characters'; 
        }

        if (empty($errors)) {
            return true;
        }
        else {
            return $errors;
        }
}

// TODO: THIS FUNCTION TAKES IN A GIVEN UEN AND BUSINESS NAME AND CHECKS IT WITH ACRA RECORDS TO VALIDATE; RETURNS TRUE IF VALID AND FALSE IF NOT
function validateUEN ($uen, $businessName) {
    
    if ($uen) {
        // check whether uen exists AND if uen matches given business name
        return true;
    }
    else {
        return false;
    }
}

/**
 * Validates whether a given URL is safe using the Google Safe Browsing API.
 *
 * This function sends the provided URL to the Google Safe Browsing API and checks it
 * against lists of known malicious, phishing, or harmful websites. If the link is flagged
 * by the API, the function returns false; otherwise, it returns true.
 *
 * @param string $link The URL to be validated.
 *
 * @return bool Returns:
 *              - true  → if the link is safe and not found in any threat list.
 *              - false → if the link is unsafe, invalid, or if an error occurs.
 */
function validateLink($link) {
    if (!$link) return false;

    $apiKey = 'AIzaSyAQSWKhEDHcKaIgd7VrgTTuNwGLtJnrqeA';
    $url = "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" . $apiKey;

    // clean link
    $link = trim($link);
    if (!preg_match('/^https?:\/\//', $link)) {
        $link = "https://" . $link;
    }

    $postData = [
        "client" => [
            "clientId" => "LocaLoco",
            "clientVersion" => "1.0"
        ],
        "threatInfo" => [
            "threatTypes" => ["MALWARE","SOCIAL_ENGINEERING","UNWANTED_SOFTWARE","POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes" => ["ANY_PLATFORM"],
            "threatEntryTypes" => ["URL"],
            "threatEntries" => [["url" => $link]]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // just in case

    $response = curl_exec($ch);

    if(curl_errno($ch)){
        error_log("CURL ERROR: " . curl_error($ch));
        curl_close($ch);
        return false;
    }

    curl_close($ch);
    error_log("validateLink() link: $link");
    error_log("validateLink() response: $response");

    $data = json_decode($response, true);

    if($data === null) {
        error_log("JSON decode error: " . json_last_error_msg());
        return false;
    }

    if (isset($data['matches']) && count($data['matches']) > 0) {
        return false;
    }

    return true;
}


/**
 * Validates and uploads an image file to the uploads directory.
 *
 * This function checks if an image was uploaded, verifies it is a valid image file,
 * ensures the file size does not exceed the allowed limit, and confirms the MIME type
 * is one of the accepted formats (JPG, PNG, WEBP). If validation passes, the image
 * is renamed with a unique identifier and safely moved to the uploads folder.
 *
 * @param array  $image      The uploaded image file from the $_FILES superglobal.
 * @param string $identifier (Optional) A string prefix used in the generated filename.
 * @param int    $maxSize    (Optional) The maximum allowed file size in bytes. Default is 5MB (5242880 bytes).
 *
 * @return array Returns an associative array with:
 *               - 'success' (bool): Indicates if the upload succeeded.
 *               - 'filename' (string): The new file name (only if successful).
 *               - 'errors' (array): A list of error messages (only if failed).
 *
 * Example successful return:
 * ```php
 * ['success' => true, 'filename' => 'user_652abf3b7e.jpg']
 * ```
 *
 * Example failed return:
 * ```php
 * ['success' => false, 'errors' => ['The uploaded file is not a valid image.']]
 * ```
 */
function validateImage($image, $identifier = '', $maxSize = 5242880) {
    $errors = [];
    
    // Check if file was uploaded
    if (!isset($image) || $image['error'] === UPLOAD_ERR_NO_FILE) {
        return ['success' => false, 'errors' => ['No image file was uploaded.']];
    }
    
    // Check for upload errors
    if ($image['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'The uploaded file exceeds the server upload limit.',
            UPLOAD_ERR_FORM_SIZE => 'The uploaded file exceeds the form upload limit.',
            UPLOAD_ERR_PARTIAL => 'The file was only partially uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload.'
        ];
        
        $errorMsg = $errorMessages[$image['error']] ?? 'Unknown upload error occurred.';
        return ['success' => false, 'errors' => [$errorMsg]];
    }
    
    $fileTmpPath = $image['tmp_name'];
    $fileSize = $image['size'];
    
    // Validate file size
    if ($fileSize > $maxSize) {
        $maxSizeMB = round($maxSize / 1048576, 2);
        $errors[] = "The image must be less than {$maxSizeMB}MB.";
    }
    
    // Validate file is actually an image using getimagesize (more secure than extension check)
    $imageInfo = getimagesize($fileTmpPath);
    
    if ($imageInfo === false) {
        $errors[] = 'The uploaded file is not a valid image.';
    } else {
        // Whitelist allowed MIME types
        $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        
        if (!in_array($imageInfo['mime'], $allowedMimeTypes)) {
            $errors[] = 'Only JPG, PNG, and WebP images are allowed.';
        }
    }
    
    // Return errors if validation failed
    if (!empty($errors)) {
        return ['success' => false, 'errors' => $errors];
    }
    
    // Set upload directory
    $uploadDir = '../uploads/';
    
    // Generate secure unique filename
    $fileExtension = match($imageInfo['mime']) {
        'image/jpeg', 'image/jpg' => '.jpg',
        'image/png' => '.png',
        'image/webp' => '.webp',
        default => ''
    };
    
    // Create unique filename with identifier and timestamp
    $prefix = !empty($identifier) ? $identifier . '_' : '';
    $newFileName = uniqid($prefix, true) . $fileExtension;
    $destination = $uploadDir . $newFileName;
    
    // Move uploaded file to destination
    if (move_uploaded_file($fileTmpPath, $destination)) {
        return ['success' => true, 'filename' => $newFileName];
    } else {
        return ['success' => false, 'errors' => ['Failed to save the uploaded image.']];
    }
}
?>