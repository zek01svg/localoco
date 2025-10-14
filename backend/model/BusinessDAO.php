<?php
spl_autoload_register(
    function ($class) {
        require_once "$class.php";
    }
);

class BusinessDAO {

    // Register a new business: THIS FUNCTION TAKES IN VALIDATED FORM INPUTS AND RETURNS TRUE IF SUCCESSFUL
    public function registerBusiness(
        $uen, $password, $businessName, $businessCategory, $description, $address,$open247,
        $openingHours, $email, $phoneNumber, $websiteLink, $socialMediaLink, $wallpaper,
        $dateOfCreation, $priceTier, $offersDelivery, $offersPickup, $paymentOptions ) {
        
        $connMgr = new ConnectionManager();
        $pdo = $connMgr->connect();

        try {
            $pdo->beginTransaction(); // use begin transaction to ensure we can cancel it if there are any errors

            // insert into the businesses table
            $sql = 'INSERT INTO businesses
                    (uen, password, business_name, business_category, description, address, open247,
                    email, phone_number, website_link, social_media_link, wallpaper,
                    date_of_creation, price_tier, offers_delivery, offers_pickup)
                    VALUES
                    (:uen, :password, :businessName, :businessCategory, :description, :address, :open247,
                    :email, :phoneNumber, :websiteLink, :socialMediaLink, :wallpaper,
                    :dateOfCreation, :priceTier, :offersDelivery, :offersPickup)';

            $stmt = $pdo->prepare($sql);
            $stmt->bindParam(':uen', $uen, PDO::PARAM_STR);
            $stmt->bindParam(':password', $password, PDO::PARAM_STR);
            $stmt->bindParam(':businessName', $businessName, PDO::PARAM_STR);
            $stmt->bindParam(':businessCategory', $businessCategory, PDO::PARAM_STR);
            $stmt->bindParam(':description', $description, PDO::PARAM_STR);
            $stmt->bindParam(':address', $address, PDO::PARAM_STR);
            $stmt->bindParam(':open247', $open247, PDO::PARAM_BOOL);
            $stmt->bindParam(':email', $email, PDO::PARAM_STR);
            $stmt->bindParam(':phoneNumber', $phoneNumber, PDO::PARAM_STR);
            $stmt->bindParam(':websiteLink', $websiteLink, PDO::PARAM_STR);
            $stmt->bindParam(':socialMediaLink', $socialMediaLink, PDO::PARAM_STR);
            $stmt->bindParam(':wallpaper', $wallpaper, PDO::PARAM_STR);
            $stmt->bindParam(':dateOfCreation', $dateOfCreation, PDO::PARAM_STR);
            $stmt->bindParam(':priceTier', $priceTier, PDO::PARAM_STR);
            $stmt->bindParam(':offersDelivery', $offersDelivery, PDO::PARAM_BOOL);
            $stmt->bindParam(':offersPickup', $offersPickup, PDO::PARAM_BOOL);
            
            $result = $stmt->execute();

            // insert the payment options into another table
            if ($result && is_array($paymentOptions)) {
                $sqlPayment = 'INSERT INTO business_payment_options (uen, payment_option)
                            VALUES (:uen, :payment_option)';
                $stmtPayment = $pdo->prepare($sqlPayment);

                foreach ($paymentOptions as $option) {
                    $stmtPayment->bindParam(':uen', $uen, PDO::PARAM_STR);
                    $stmtPayment->bindParam(':payment_option', $option, PDO::PARAM_STR);
                    $stmtPayment->execute();
                }
            }

            // if business is not open 24/7, insert the opening hours for each day
            if (!$open247 && is_array($openingHours)) {
                $sqlHours = 'INSERT INTO business_opening_hours (uen, day_of_week, open_time, close_time)
                            VALUES (:uen, :day_of_week, :open_time, :close_time)';
                $stmtHours = $pdo->prepare($sqlHours);

                foreach ($openingHours as $day => $times) {

                    $formattedDay = ucfirst(strtolower($day));

                    $stmtHours->bindParam(':uen', $uen, PDO::PARAM_STR);
                    $stmtHours->bindParam(':day_of_week', $formattedDay, PDO::PARAM_STR);
                    $stmtHours->bindParam(':open_time', $times['open'], PDO::PARAM_STR);
                    $stmtHours->bindParam(':close_time', $times['close'], PDO::PARAM_STR);
                    $stmtHours->execute();

                }
            }
            
            $pdo->commit(); // commit transaction if only all inserts succeed
            return true; 

        } 
        catch (Exception $e) {
            echo "Error: " . $e->getMessage(); // show the error
            $pdo->rollBack(); // if any errors, cancel all insertions
            return false;
        } 
    }

    // Get business by UEN: THIS FUNCTION TAKES IN A GIVEN UEN AND RETURNS A BUSINESS OBJECT IF EXISTS
    public function getBusinessByUEN($uen) {
        $connMgr = new ConnectionManager();
        $pdo = $connMgr->connect();

        // 1️⃣ Get main business details
        $sql = 'SELECT * FROM businesses WHERE uen = :uen';
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':uen', $uen, PDO::PARAM_STR);
        $stmt->execute();
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $row = $stmt->fetch();

        if (!$row) {
            return null; // No business found
        }

        // 2️⃣ Get payment options
        $sqlPayment = 'SELECT payment_option FROM business_payment_options WHERE uen = :uen';
        $stmtPayment = $pdo->prepare($sqlPayment);
        $stmtPayment->bindParam(':uen', $uen, PDO::PARAM_STR);
        $stmtPayment->execute();
        $paymentOptions = $stmtPayment->fetchAll(PDO::FETCH_COLUMN);

        // 3️⃣ Get opening hours (if not 24/7)
        $openingHours = [];
        if (!$row['open247']) {
            $sqlHours = 'SELECT day_of_week, open_time, close_time 
                        FROM business_opening_hours 
                        WHERE uen = :uen';
            $stmtHours = $pdo->prepare($sqlHours);
            $stmtHours->bindParam(':uen', $uen, PDO::PARAM_STR);
            $stmtHours->execute();
            $hours = $stmtHours->fetchAll(PDO::FETCH_ASSOC);

            foreach ($hours as $h) {
                $day = strtolower($h['day_of_week']);
                $openingHours[$day] = [
                    'open' => $h['open_time'],
                    'close' => $h['close_time']
                ];
            }
        }

        // 4️⃣ Convert to associative array 
            $business = [
                'uen' => $row['uen'],
                'password' => $row['password'],
                'business_name' => $row['business_name'],
                'business_category' => $row['business_category'],
                'description' => $row['description'],
                'address' => $row['address'],
                'open247' => $row['open247'],
                'opening_hours' => $openingHours,
                'email' => $row['email'],
                'phone_number' => $row['phone_number'],
                'website_link' => $row['website_link'],
                'social_media_link' => $row['social_media_link'],
                'wallpaper' => $row['wallpaper'],
                'date_of_creation' => $row['date_of_creation'],
                'price_tier' => $row['price_tier'],
                'offers_delivery' => $row['offers_delivery'],
                'offers_pickup' => $row['offers_pickup'],
                'payment_options' => $paymentOptions
            ];
        
        return $business;
    }

    // Update an existing business
    public function updateBusiness(
        $uen, $password, $businessName, $businessCategory, $description, $address,
        $openingHours, $email, $phoneNumber, $websiteLink, $socialMediaLink, $wallpaper,
        $dateOfCreation, $priceTier, $offersDelivery, $offersPickup, $paymentOptions, $is247
    ) {
        $connMgr = new ConnectionManager();
        $pdo = $connMgr->connect();
        $pdo->beginTransaction();

        // 1️⃣ Update business info
        $sql = 'UPDATE businesses SET
                    password = :password,
                    business_name = :businessName,
                    business_category = :businessCategory,
                    description = :description,
                    address = :address,
                    email = :email,
                    phone_number = :phoneNumber,
                    website_link = :websiteLink,
                    social_media_link = :socialMediaLink,
                    wallpaper = :wallpaper,
                    date_of_creation = :dateOfCreation,
                    price_tier = :priceTier,
                    offers_delivery = :offersDelivery,
                    offers_pickup = :offersPickup,
                    is_24_7 = :is247
                WHERE uen = :uen';

        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':uen', $uen, PDO::PARAM_STR);
        $stmt->bindParam(':password', $password, PDO::PARAM_STR);
        $stmt->bindParam(':businessName', $businessName, PDO::PARAM_STR);
        $stmt->bindParam(':businessCategory', $businessCategory, PDO::PARAM_STR);
        $stmt->bindParam(':description', $description, PDO::PARAM_STR);
        $stmt->bindParam(':address', $address, PDO::PARAM_STR);
        $stmt->bindParam(':email', $email, PDO::PARAM_STR);
        $stmt->bindParam(':phoneNumber', $phoneNumber, PDO::PARAM_STR);
        $stmt->bindParam(':websiteLink', $websiteLink, PDO::PARAM_STR);
        $stmt->bindParam(':socialMediaLink', $socialMediaLink, PDO::PARAM_STR);
        $stmt->bindParam(':wallpaper', $wallpaper, PDO::PARAM_STR);
        $stmt->bindParam(':dateOfCreation', $dateOfCreation, PDO::PARAM_STR);
        $stmt->bindParam(':priceTier', $priceTier, PDO::PARAM_STR);
        $stmt->bindParam(':offersDelivery', $offersDelivery, PDO::PARAM_BOOL);
        $stmt->bindParam(':offersPickup', $offersPickup, PDO::PARAM_BOOL);
        $stmt->bindParam(':is247', $is247, PDO::PARAM_BOOL);

        if (!$stmt->execute()) {
            $pdo->rollBack();
            return false;
        }

        // 2️⃣ Replace payment options
        $deleteSql = 'DELETE FROM business_payment_options WHERE uen = :uen';
        $deleteStmt = $pdo->prepare($deleteSql);
        $deleteStmt->bindParam(':uen', $uen, PDO::PARAM_STR);
        $deleteStmt->execute();

        if (is_array($paymentOptions)) {
            $insertSql = 'INSERT INTO business_payment_options (uen, payment_option)
                        VALUES (:uen, :payment_option)';
            $insertStmt = $pdo->prepare($insertSql);

            foreach ($paymentOptions as $option) {
                $insertStmt->bindParam(':uen', $uen, PDO::PARAM_STR);
                $insertStmt->bindParam(':payment_option', $option, PDO::PARAM_STR);
                if (!$insertStmt->execute()) {
                    $pdo->rollBack();
                    return false;
                }
            }
        }

        // 3️⃣ Replace opening hours (only if not 24/7)
        $deleteHours = 'DELETE FROM business_opening_hours WHERE uen = :uen';
        $stmtDelHours = $pdo->prepare($deleteHours);
        $stmtDelHours->bindParam(':uen', $uen, PDO::PARAM_STR);
        $stmtDelHours->execute();

        if (!$is247 && is_array($openingHours)) {
            $insertHours = 'INSERT INTO business_opening_hours (uen, day_of_week, open_time, close_time)
                            VALUES (:uen, :day_of_week, :open_time, :close_time)';
            $stmtHours = $pdo->prepare($insertHours);

            foreach ($openingHours as $day => $times) {
                $formattedDay = ucfirst(strtolower($day));
                $stmtHours->bindParam(':uen', $uen, PDO::PARAM_STR);
                $stmtHours->bindParam(':day_of_week', $formattedDay, PDO::PARAM_STR);
                $stmtHours->bindParam(':open_time', $times['open'], PDO::PARAM_STR);
                $stmtHours->bindParam(':close_time', $times['close'], PDO::PARAM_STR);
                if (!$stmtHours->execute()) {
                    $pdo->rollBack();
                    return false;
                }
            }
        }

        // ✅ Commit all changes
        $pdo->commit();

        return true;
    }

    // Delete a business by UEN
    public function deleteBusiness($uen) {
        $connMgr = new ConnectionManager();
        $pdo = $connMgr->connect();
        $pdo->beginTransaction();
        
        // delete dependent records first before deleting the main table
        $sql1 = 'DELETE FROM business_opening_hours WHERE uen = :uen'; 
        $stmt1 = $pdo->prepare($sql1);
        $stmt1->bindParam(':uen', $uen, PDO::PARAM_STR);
        $stmt1->execute();

        $sql2 = 'DELETE FROM business_payment_options WHERE uen = :uen';
        $stmt2 = $pdo->prepare($sql2);
        $stmt2->bindParam(':uen', $uen, PDO::PARAM_STR);
        $stmt2->execute();

        $sql3 = 'DELETE FROM businesses WHERE uen = :uen';
        $stmt3 = $pdo->prepare($sql3);
        $stmt3->bindParam(':uen', $uen, PDO::PARAM_STR);
        $result = $stmt3->execute();

        if (!$result) {
            $pdo->rollBack();
            return false;
        }

        $pdo->commit();

        return true;
    }

    // Display Businesses: THIS FUNCTION FETCHES ALL THE BUSINESSES FROM THE DB AND RETURNS AN ASSOC ARRAY 
    public function getAllBusinesses() {
        $connMgr = new ConnectionManager();
        $pdo = $connMgr->connect();

        // 1️⃣ Get all the businesses first
        $sql = 'SELECT * FROM businesses';
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $rows = $stmt->fetchAll();

        $businesses = []; // initiialize an array to store 

        foreach ($rows as $row) { // for each business fetched, get the corresponding payment options and opening hours

            $uen = $row['uen'];

            // 2️⃣ Get payment options
            $sqlPayment = 'SELECT payment_option FROM business_payment_options WHERE uen = :uen';
            $stmtPayment = $pdo->prepare($sqlPayment);
            $stmtPayment->bindParam(':uen', $uen, PDO::PARAM_STR);
            $stmtPayment->execute();
            $paymentOptions = $stmtPayment->fetchAll(PDO::FETCH_COLUMN);

            // 3️⃣ Get opening hours (if not 24/7)
            $openingHours = [];
            if (!$row['open247']) {
                $sqlHours = 'SELECT day_of_week, open_time, close_time 
                            FROM business_opening_hours 
                            WHERE uen = :uen';
                $stmtHours = $pdo->prepare($sqlHours);
                $stmtHours->bindParam(':uen', $uen, PDO::PARAM_STR);
                $stmtHours->execute();
                $hours = $stmtHours->fetchAll(PDO::FETCH_ASSOC);

                foreach ($hours as $h) {
                    $day = $h['day_of_week'];
                    $openingHours[$day] = [
                        'open' => $h['open_time'],
                        'close' => $h['close_time']
                    ];
                }
            }

            // 4️⃣ Convert to associative array 
            $businesses[] = [
                'uen' => $row['uen'],
                'password' => $row['password'],
                'business_name' => $row['business_name'],
                'business_category' => $row['business_category'],
                'description' => $row['description'],
                'address' => $row['address'],
                'open247' => $row['open247'],
                'opening_hours' => $openingHours,
                'email' => $row['email'],
                'phone_number' => $row['phone_number'],
                'website_link' => $row['website_link'],
                'social_media_link' => $row['social_media_link'],
                'wallpaper' => $row['wallpaper'],
                'date_of_creation' => $row['date_of_creation'],
                'price_tier' => $row['price_tier'],
                'offers_delivery' => $row['offers_delivery'],
                'offers_pickup' => $row['offers_pickup'],
                'payment_options' => $paymentOptions
            ];
        }

        return $businesses; 
    }

    // TODO: Filter Businesses: THIS FUNCTION FETCHES BUSINESSES MATCHING THE USER'S CHOSEN FILTERS AND RETURNS AN ASSOC ARRAY
    public function FilterAndSearch($filters) {
    
        $connMgr = new ConnectionManager();
        $pdo = $connMgr->connect();

        // base sql statement
        $sql = "SELECT * FROM businesses";

        // map filter keys to conditions
        $stmtExtensions = [
            'search_query'      => "(business_name LIKE :search_query OR description LIKE :search_query)",
            'price_tier'        => "price_tier = :price_tier",
            'business_category' => "business_category = :business_category",
            'newly_added'       => "date_of_creation >= NOW() - INTERVAL 7 DAY",
            'open247'           => "open247 = 1",
            'offers_delivery'   => "offers_delivery = 1",
            'offers_pickup'     => "offers_pickup = 1"
        ];

        $conditions = [];
        $params = [];

        foreach ($filters as $key => $value) {
            if (!isset($stmtExtensions[$key])) continue;

            // for filters with user input, bind params
            if ($key == 'search_query') {
                $conditions[] = $stmtExtensions[$key];
                $params[':search_query'] = '%' . $value . '%';
            } elseif ($key == 'business_category') {
                $conditions[] = $stmtExtensions[$key];
                $params[':business_category'] = $value;
            } elseif ($key == 'price_tier') {
                $conditions[] = $stmtExtensions[$key];
                $params[':price_tier'] = $value;
            } else {
                // no params needed for boolean filters
                $conditions[] = $stmtExtensions[$key];
            }
        }

        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }


        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $stmt->setFetchMode(PDO::FETCH_ASSOC);
        $rows = $stmt->fetchAll();

        $businesses = []; // initialize a container for the cards

        // for each business, get the payment option/s and the opening hours 
        foreach ($rows as $row) { 
            $uen = $row['uen'];

            // Get payment options
            $sqlPayment = 'SELECT payment_option FROM business_payment_options WHERE uen = :uen';
            $stmtPayment = $pdo->prepare($sqlPayment);
            $stmtPayment->bindParam(':uen', $uen, PDO::PARAM_STR);
            $stmtPayment->execute();
            $paymentOptions = $stmtPayment->fetchAll(PDO::FETCH_COLUMN);

            // Get opening hours (if not 24/7)
            $openingHours = [];
            if (!$row['open247']) {
                $sqlHours = 'SELECT day_of_week, open_time, close_time 
                            FROM business_opening_hours 
                            WHERE uen = :uen';
                $stmtHours = $pdo->prepare($sqlHours);
                $stmtHours->bindParam(':uen', $uen, PDO::PARAM_STR);
                $stmtHours->execute();
                $hours = $stmtHours->fetchAll(PDO::FETCH_ASSOC);

                foreach ($hours as $h) {
                    $day = $h['day_of_week'];
                    $openingHours[$day] = [
                        'open' => $h['open_time'],
                        'close' => $h['close_time']
                    ];
                }
            }

            // 4️⃣ Convert to associative array 
            $businesses[] = [
                'uen' => $row['uen'],
                'password' => $row['password'],
                'business_name' => $row['business_name'],
                'business_category' => $row['business_category'],
                'description' => $row['description'],
                'address' => $row['address'],
                'open247' => $row['open247'],
                'opening_hours' => $openingHours,
                'email' => $row['email'],
                'phone_number' => $row['phone_number'],
                'website_link' => $row['website_link'],
                'social_media_link' => $row['social_media_link'],
                'wallpaper' => $row['wallpaper'],
                'date_of_creation' => $row['date_of_creation'],
                'price_tier' => $row['price_tier'],
                'offers_delivery' => $row['offers_delivery'],
                'offers_pickup' => $row['offers_pickup'],
                'payment_options' => $paymentOptions
            ];
        }

        return $businesses; 
    }
}
?>
