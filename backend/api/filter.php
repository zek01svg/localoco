<?php
ob_start();
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../utils/common.php';
require_once __DIR__ . '/../utils/functions.php';

header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    
    // if there are filters
    if (isset($_GET['filters'])) {
        $filters = json_decode($_GET['filters'], true);
        $businesses = $businessDAO->FilterAndSearch($filters);
    }
    else {
        $businesses = $businessDAO->getAllBusinesses();
    }

    echo json_encode($businesses);
    exit;   
}
?>