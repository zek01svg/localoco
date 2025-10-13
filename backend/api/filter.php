<?php
require_once '../utils/common.php';
require_once '../utils/functions.php';

header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    
    $businesses = $businessDAO->getAllBusinesses();

    // if there are filters
    if (isset($_GET['filters'])) {
        $filters = json_decode($_GET['filters'], true);
        $businesses = $businessDAO->FilterAndSearch($filters);
    }

    echo json_encode($businesses);
    exit;   
}
?>