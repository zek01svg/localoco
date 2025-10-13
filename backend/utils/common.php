<?php
session_start();
spl_autoload_register(
    function ($class) {
        require_once __DIR__ . "/../model/$class.php";
    }
); 
$userDAO = new UserDAO();
$businessDAO = new BusinessDAO();
?> 